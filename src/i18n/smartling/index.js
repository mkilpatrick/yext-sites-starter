import { i18nextToPo, gettextToI18next } from 'i18next-conv';
import fs from 'fs';
import { SmartlingAPI } from './api.js';

const configFile = fs.readFileSync(relURL('./config.json'));
const i18nConfig = JSON.parse(configFile);

function relURL(path) {
  return new URL(path, import.meta.url);
}

async function main() {
  if (process.argv.length < 2) {
    throw new Error('Invalid args - Usage: node smartling.js [pull|push]');
  }
  const commandName = process.argv[2];

  const commands = {
    'pull': pull,
    'push': push,
  }

  // Check if command is valid
  if (!commands.hasOwnProperty(commandName)) {
    throw new Error('First arg invalid, must be [pull|push]');
  }

  // Check if config is valid
  //  NOOP if invalid config - that indicates this project is not using Smartling
  if (i18nConfig.userID === undefined || i18nConfig.userSecret === undefined || i18nConfig.projectID === undefined) {
    console.log(`'smartling ${commandName}: NOOP - initialize smartling integration by filling out 'i18n/smartling/config.json'`);
    return;
  }

  // Initialize the API
  const api = new SmartlingAPI(i18nConfig);
  await commands[commandName](api);
}

async function pull(api) {
  // Check config.locales exists
  if (i18nConfig.locales === undefined) {
    throw new Error('Error with smartling pull: must define locales in `i18n/smartling/config.json > locales`')
  }

  i18nConfig.locales.forEach(async locale => {
    // Check if the yext/smartling locale name is different
    let apiLocale = locale;
    const localeMap = i18nConfig.smartlingLocaleToYextLocaleMapping;
    if (localeMap !== null) {
      Object.entries(localeMap).forEach(([smartlingLocale, yextLocaleList]) => {
        if (yextLocaleList.includes(locale)) {
          apiLocale = smartlingLocale;
        }
      });
    }
    
    // Download the translations & write to filesystem
    const localeTranslations = await api.download('native.po', apiLocale);
    const options = {
      compatibilityJSON: 'v4',
    };
    gettextToI18next(apiLocale, localeTranslations, options).then(output => {
      // Check directory exists before writing to it
      const outDirPath = relURL(`../${locale}/`);
      try {
        fs.accessSync(outDirPath)
      } catch (err) {
        fs.mkdirSync(outDirPath, { recursive: true });
      }
      const outFilepath = new URL('translation.json', outDirPath);
      console.log('Writing to ' + outFilepath);
      fs.writeFileSync(outFilepath, output, {flag: 'w'});
    });
  });
}

async function push(api) {
  // Read missing translations JSON file
  let missingSource = "{}";
  try {
    missingSource = fs.readFileSync(relURL('../missing/missing.json'), 'utf-8');
  } catch (err) {
    console.log('couldn\'t find "missing.json" source file');
  }

  // Read `config.defaultLocale` translations (fallback to 'en' if this field is empty)
  let defaultSource = "{}";
  let defaultLocale = i18nConfig.defaultLocale || 'en';
  try {
    defaultSource = fs.readFileSync(relURL(`../${defaultLocale}/translation.json`), 'utf-8');
  } catch(err) {
    console.log(`couldn\'t find "translation.json" source file for ${defaultLocale}`);
  }

  // Merge missing & existing translations
  const source = {
    ...JSON.parse(defaultSource),
    ...JSON.parse(missingSource),
  }

  // convert file to .po format && write to filesystem
  // we need to convert JSON to .po because smartling doesn't support 
  //  i18next JSON's plural format
  const options = {
    compatibilityJSON: 'v4',
  };
  i18nextToPo('en', JSON.stringify(source), options).then((output) => {
    const outFilepath = relURL('./native.po');
    fs.writeFileSync(outFilepath, output, {flag: 'w'});
    console.log('Uploading native.po to smartling...');
    api.upload('native.po');
  });
}

await main();