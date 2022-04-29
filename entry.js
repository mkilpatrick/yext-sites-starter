import { jsx as _jsx } from 'react/jsx-runtime';
import ReactDOM from 'react-dom';
import { createElement } from 'react';

import i18n from 'i18next';
import { I18nextProvider } from 'react-i18next';

export const App = ({ page, translations, locale }) => {
  const i18nOptions = {
    fallbackLng: 'en',
    lng: locale,
    resources: {
      [locale]: translations,
    },
    interpolation: {
      escapeValue: false // react is already safe from xss
    },
    debug: false,
  }
  i18n.init(i18nOptions);
  return createElement(
    I18nextProvider,
    { i18n },
    createElement(page?.component, page?.props)
  );
};

const hydrate = async () => {
  // Can't use string interpolation here so src/templates is hardcoded
  const templates = import.meta.glob('/src/templates/*.(jsx|tsx)');
  const routes = Object.keys(templates).map((path) => {
    return {
      // get the filename from the path and remove its extension, default to index
      name: path.split('/').pop()?.split('.')[0] || 'index',
      path: path,
      getComponent: templates[path],
    };
  });
  /**
   * Get the templateFilename from the template. See {@link ./ssr/serverRenderRoute.ts}.
   */
  const templateFilename = window._RSS_TEMPLATE_?.split('.')[0];

  const { default: component, render: renderComponent } = (await routes.find((route) => route.name === templateFilename)?.getComponent()) || {};

  ReactDOM.hydrate(
    _jsx(App, {
      page: {
        props: window._RSS_PROPS_,
        path: window.location.pathname,
        component: component,
      },
      translations: window._RSS_I18N_,
      locale: window._RSS_LOCALE_,
    }),
    document.getElementById('root'),
  );

  function makeid(length) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * 
  charactersLength));
   }
   return result;
  }
  
  function makeNumber(length) {
    var result           = '';
    var characters       = '123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * 
  charactersLength));
   }
   return Number(result);
  }

  function randomize(v) {
    if (typeof v === 'string') return makeid(12);
    if (typeof v === 'number') return makeNumber(12);
    if (Array.isArray(v)) return v.map(randomize)
    if (typeof v === 'object') return Object.keys(v).reduce((out, key) => ({...out, [key]: key === 'hours' ? v[key] : randomize(v[key])}), {})
  }

  // Returns a flattened object while preserving nested key names
  //  using '.' as a separator ex.
  //  {parent: {child: 'hello'}} => {parent.child: 'hello'}
  function flattenObj(input, parentKey="") {
    let flattened = {};
    Object.entries(input).forEach(([key, val]) => {
      if (typeof val === 'object') {
        flattened = {
          ...flattened,
          ...flattenObj(val, `${parentKey}${key}.`),
        }
      } else if (typeof val === 'array') {
         val.forEach((el, idx) => {
           flattened = {
             ...flattened,
             ...flattenObj(el, `${parentKey}${key}.${idx}.`),
           }
         })
      } else {
        flattened[`${parentKey}${key}`] = val;
      }
    });
    return flattened;
  }

  // Returns an array of sibling indicies from document root to the param `node`
  //  so I can use :nth-child selectors to uniquely identify any element
  function getDOMNodeAddress(node, address = []) {
    if (node.nodeType === Node.DOCUMENT_NODE) {
      return address;
    }

    // Find the index of this node among it's siblings
    const siblingIndex = Array.from(node.parentNode.children).indexOf(node);
    return getDOMNodeAddress(node.parentNode, [siblingIndex, ...address]);
  }

  // re-calculate the HTML string of the component with random props (no update to the visible page)
  const fakeProps = {
    document: {streamOutput: randomize(window._RSS_PROPS_.data.document.streamOutput)},
    __meta: { // throws error if this doesn't exist (?)
      manifest: { bundlerManifest: {}},
    },
  }
  const randomizedComponentString = renderComponent(fakeProps);
  const randomizedComponentDOMNode = new DOMParser().parseFromString(randomizedComponentString, 'text/html');
  const flatProps = flattenObj(fakeProps);

  // For each randomized prop, search the randomized DOM for where the random string occurs
  Object.entries(flatProps).forEach(([key, val]) => {

    // Create a filtered Node Iterator which will find locations in the DOM where the random string occurs
    const nodeIterator = document.createNodeIterator(randomizedComponentDOMNode.body, NodeFilter.SHOW_ALL, (node) => {
      // The string could be textContent for an element
      if (node.nodeType === Node.TEXT_NODE && node.textContent === val) {
        node.cfdUsage = 'textContent';
        return NodeFilter.FILTER_ACCEPT;

      // The string could be an attribute on an element
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const attrs = node.getAttributeNames();
        for (const attrName of attrs) {
          if (node.getAttribute(attrName) === val) {
            node.cfdUsage = `attribute_${attrName}`;
            return NodeFilter.FILTER_ACCEPT;
          }
        }
      }

      // We didn't find the random string in this node
      return NodeFilter.FILTER_REJECT;
    });

    // Use the iterator to modify the real DOM
    let nodeWithData;
    while (nodeWithData = nodeIterator.nextNode()) {
      // Build a querySelector for the real DOM based on the node we found in the randomized DOM
      let addressIndices = getDOMNodeAddress(nodeWithData);
      let selector = "html";
      // element at index 0 is always the `<html>` element, so shift() to ignore it
      addressIndices.shift();
      addressIndices.forEach(index => {
        // TextNodes will have a -1 at the end since a textNode is not considered a child
        //  :nth-child() is 1 indexed instead of 0 indexed
        if (index != -1) {
          selector = `${selector} > :nth-child(${index+1})`;
        }
      });

      const realDOMNode = document.querySelector(selector);
      realDOMNode.dataset.cfdTooltip = true;
      // We need to add a random suffix here so that if a div uses two different
      //  fields, there won't be namespace conflicts in the data-attributes
      const randKey = makeNumber(12);
      realDOMNode.dataset[`cfdSource_${randKey}`] = key;
      realDOMNode.dataset[`cfdUsageType_${randKey}`] = nodeWithData.cfdUsage;
    }
  });

  // Some code to render a basic hover tooltip UI element
  document.querySelectorAll('[data-cfd-tooltip]').forEach(el => {
    // Parse the data stored in the data-attributes cfdSource and cfdUsageType
    let cfdInfo = {};
    Object.entries(el.dataset).forEach(([key, val]) => {
      if (key.includes('cfdSource')) {
        const [_, id] = key.split('_');
        if (!cfdInfo[id]) { cfdInfo[id] = {}; }
        cfdInfo[id].source = el.dataset[key];
      } else if (key.includes('cfdUsageType')) {
        const [_, id] = key.split('_');
        if (!cfdInfo[id]) { cfdInfo[id] = {}; }
        cfdInfo[id].usage = el.dataset[key];
      }
    });

    // Create & render a new div when the element is hovered
    const toolTipEl = document.createElement('div');
    toolTipEl.classList.add('CFD-tooltip');
    let innerHTML = '';
    Object.entries(cfdInfo).forEach(([key, val]) => {
      innerHTML = innerHTML + `<div class="CFD-section"><span class="CFD-source">Data Field: ${val.source}</span><span class="CFD-usage">Usage: ${val.usage}</span></div>`;
    });
    toolTipEl.innerHTML = innerHTML;

    el.addEventListener('mouseenter', () => {
      const elRect = el.getBoundingClientRect();
      toolTipEl.style.top = `${elRect.bottom + window.scrollY}px`;
      toolTipEl.style.left = `${elRect.left}px`;
      document.body.appendChild(toolTipEl);
    });
    el.addEventListener('mouseleave', () => {
      document.body.removeChild(toolTipEl);
    });
  });
};
//@ts-ignore
if (!import.meta.env.SSR) hydrate();
