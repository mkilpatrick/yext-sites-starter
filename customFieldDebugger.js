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

function randomizeHours(hours) {
  return {
    sunday: {isClosed: false, openIntervals: [{start: '1:01', end: '1:02'}]},
    monday: {isClosed: false, openIntervals: [{start: '1:03', end: '1:04'}]},
    tuesday: {isClosed: false, openIntervals: [{start: '1:05', end: '1:06'}]},
    wednesday: {isClosed: false, openIntervals: [{start: '1:07', end: '1:08'}]},
    thursday: {isClosed: false, openIntervals: [{start: '1:09', end: '1:10'}]},
    friday: {isClosed: false, openIntervals: [{start: '1:11', end: '1:12'}]},
    saturday: {isClosed: false, openIntervals: [{start: '1:13', end: '1:14'}]},
  };
}

function randomize(v) {
  if (typeof v === 'string') return makeid(12);
  if (typeof v === 'number') return makeNumber(12);
  if (Array.isArray(v)) return v.map(randomize)
  if (typeof v === 'object') return Object.keys(v).reduce((out, key) => ({...out, [key]: key === 'hours' ? randomizeHours(v[key]) : randomize(v[key])}), {});
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

// Returns a CSS selector using :nth-child to uniquely identify any DOM node
function getDOMNodeAddress(node, addressIndices = []) {
  // Exit condition
  if (node.nodeType === Node.DOCUMENT_NODE) {
    // Convert the array of indices to a CSS selector first
    let selector = "html";
    // element at index 0 is always the `<html>` element, so shift() to ignore it
    addressIndices.shift();
    addressIndices.forEach(index => {
      // TextNodes will have a -1 at the end since a textNode is not considered a child
      // :nth-child() is 1 indexed instead of 0 indexed
      if (index != -1) {
        selector = `${selector} > :nth-child(${index+1})`;
      }
    });
    return selector;
  }

  // Find the index of this node among it's siblings and recurse
  const siblingIndex = Array.from(node.parentNode.children).indexOf(node);
  return getDOMNodeAddress(node.parentNode, [siblingIndex, ...addressIndices]);
}

// Set up a MutationObserver which will re-run the CFDebugger code if the DOM changes.
//  This will catch any React re-renders and make sure the newly rendered elements
//  have the appropriate markup.
// @param rerender: the React render function for the root React element
function enableWatchDOMForChanges(rerender) {
  const observerConfig = { attributes: true, childList: true, subtree: true };
  const observer = new MutationObserver((mutationsList, observer) => {
    mutationsList.forEach(mutation => {
      // Don't infinite loop if detecting attribute mutation & attribute is a CFD-attribute
      if (mutation.attributeName && mutation.attributeName.includes('cfd')) {
        return;
      }

      // No new nodes added, so we don't need to update anything
      if (mutation.addedNodes.length < 1) {
        return;
      }
      
      // Temporarily disable the observer to prevent infinite recursion with react re-renders
      observer.disconnect();

      // Remove any data-attributes or elements added by previous runs of the CFDebugger
      disableAndCleanupCFDebugger();

      // Re-render the React App with randomized props. This has to be done in the real 
      //  DOM to accurately track React State changes which have happened since page load.
      // If we try to clone the DOM & render in virtual DOM, the State is reset to default values.
      //  This breaks in the case where the State is causing DOM elements to be hidden/shown, like
      //  for example the FAQ component expand/collapse.
      const [fakeProps, flatProps] = generateRandomizedProps(window._RSS_PROPS_);
      rerender(fakeProps); // <- this visibly updates the page (its the only way to preserve the existing State?)
      const usageList = findFieldValueUsages(flatProps, document.body);

      // Fix the visible page by re-rendering with the real data
      rerender(window._RSS_PROPS_);

      // And re-enable all of the CFDebugger features
      addDataAttributeTags(usageList, document.body);
      enableTooltipVisualization();
      enableUsageVisualization();

      // Re-enable the observer to watch for any future changes
      observer.observe(document.querySelector('#root'), observerConfig);
    });
  });

  observer.observe(document.querySelector('#root'), observerConfig);
}

// Remove all created data attributes & DOM Nodes
function disableAndCleanupCFDebugger() {
  document.querySelectorAll('[data-cfd-tooltip]').forEach(el => {
    Object.entries(el.dataset).forEach(([key, _]) => {
      if (key.includes('cfdSource') || key.includes('cfdUsageType') || key.includes('cfdTooltip')) {
        delete el.dataset[key];
      }
    });
  });

  document.querySelectorAll('CFD-tooltip').forEach(el => el.remove());
  document.querySelectorAll('CFD-usagePanel').forEach(el => el.remove());
}

// Returns Array of two items:
//  1. `props` with random values for profile fields (in `props.data.document.streamOutput`)
//  2. Flattened list of profile fields
function generateRandomizedProps(props) {
  const randomizedProfile = randomize(props.data.document.streamOutput);
  const randomizedProps = {
    document: {streamOutput: randomizedProfile},
    __meta: { // throws error if this doesn't exist (?)
      manifest: { bundlerManifest: {}},
    },
  }

  return [{data: randomizedProps}, flattenObj(randomizedProfile)];
}

// Returns a list of `usage` objects which describe where and how a `fieldValue` is used
function findFieldValueUsages(fieldValues, sourceDOM) {
  const usageList = [];
  Object.entries(fieldValues).forEach(([key, fieldValue]) => {
    // Create a filtered Node Iterator which will find locations in `sourceDOM` where `fieldValue` occurs
    const nodeIterator = document.createNodeIterator(sourceDOM, NodeFilter.SHOW_ALL, node => {
      // The fieldValue could be textContent for a node
      if (node.nodeType === Node.TEXT_NODE && node.textContent.includes(fieldValue)) {
        node.cfdUsage = 'textContent';
        return NodeFilter.FILTER_ACCEPT;

      // The fieldValue could be an attribute on a node
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const attrs = node.getAttributeNames();
        for (const attrName of attrs) {
          if (node.getAttribute(attrName) === fieldValue) {
            node.cfdUsage = `attribute_${attrName}`;
            return NodeFilter.FILTER_ACCEPT;
          }
        }
      }

      // We didn't find the fieldValue in this node
      return NodeFilter.FILTER_REJECT;
    });

    // Use the iterator to construct `usageList`
    let nodeWithData;
    while (nodeWithData = nodeIterator.nextNode()) {
      // Build a selector for elements in `sourceDOM` using :nth-child selectors
      let addressSelector = getDOMNodeAddress(nodeWithData);

      usageList.push({
        selector: addressSelector,
        key: key,
        usageType: nodeWithData.cfdUsage,
      });
    }
  });

  return usageList;
}

// Using the param `usageList`, modify the `targetDOM` to add data-attributes
function addDataAttributeTags(usageList, targetDOM) {
  usageList.forEach(usageInfo => {
    let el = targetDOM.querySelector(usageInfo.selector);
    el.dataset.cfdTooltip = true;
    // We need to add a random suffix here so that if a div uses two different
    //  fields, there won't be namespace conflicts in the data-attributes
    const randKey = makeNumber(12);
    el.dataset[`cfdSource_${randKey}`] = usageInfo.key;
    el.dataset[`cfdUsageType_${randKey}`] = usageInfo.usageType;
  });
}

function initCFDebugger(renderFunction) {
  // Render the initial state of the page with random props in a Virtual DOM
  const [fakeProps, flatProps] = generateRandomizedProps(window._RSS_PROPS_);
  const VDOM = document.cloneNode(true);
  renderFunction(fakeProps, VDOM.querySelector('#root'));

  // Find and tag any field usages
  const usageList = findFieldValueUsages(flatProps, VDOM.body);
  addDataAttributeTags(usageList, document.body);

  // Render the UI
  enableTooltipVisualization();
  enableUsageVisualization();
  
  // Watch for updates
  enableWatchDOMForChanges(renderFunction);
}

function enableTooltipVisualization() {
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
      toolTipEl.remove();
    });
  });
}

function enableUsageVisualization() {
  const flatProfile = flattenObj(window._RSS_PROPS_.data.document.streamOutput);

  const cfEls = document.querySelectorAll('[data-cfd-tooltip]');
  const usageMap = {};

  Object.entries(flatProfile).forEach(([profileKey, _]) => {
    // Search the page to see if this custom field is in use by checking the 'data-cfd-source' attribute
    cfEls.forEach(el => {
      Object.entries(el.dataset).forEach(([_, tooltipVal]) => {
        if (profileKey === tooltipVal) {
          usageMap[profileKey] = [
            ...(usageMap[profileKey] ? usageMap[profileKey] : []),
            el
          ];
        }
      });
    });
  });

  let usagePanelEl = document.createElement('div');
  usagePanelEl.classList.add('CFD-usagePanel', 'CFDUsagePanel');
  let usagePanelScrollableEl = document.createElement('div');
  usagePanelScrollableEl.classList.add('CFDUsagePanel-scrollable');
  usagePanelEl.appendChild(usagePanelScrollableEl);


  function buildFieldSummaryHTML(key, val) {
    let shortKey = key;
    const prefix = 'document.streamOutput.';
    if (shortKey.startsWith(prefix)) {
      shortKey = shortKey.slice(prefix.length);
    }

    let shortVal = val;
    const maxStrLen = 40;
    if (typeof shortVal === 'string' && shortVal.length > maxStrLen) {
      shortVal = `${shortVal.slice(0, maxStrLen)}...`;
    }
    return `
      <span class="CFDUsagePanel-fieldSummary">
        <span class="CFDUsagePanel-fieldSummaryKey">${shortKey}</span>
        <span class="CFDUsagePanel-fieldSummaryVal">${shortVal}</span>
      </span>
    `;
  }

  Object.entries(flatProfile).forEach(([key, val]) => {
    // If the prop is used on the page, it will be in 'usageMap'
    if (usageMap[key]) {
      let usageDiv = document.createElement('div');
      usageDiv.classList.add('CFDUsagePanel-field', 'CFDUsagePanel-field--used');
      usageDiv.innerHTML = `<span class="CFDUsagePanel-fieldStatus">In Use</span>${buildFieldSummaryHTML(key, val)}`;
      usageDiv.addEventListener('click', () => {
        document.querySelectorAll('.CFD-isSelected').forEach(el => el.classList.remove('CFD-isSelected'));
        usageMap[key][0].classList.add('CFD-isSelected');
        window.scrollTo({top: usageMap[key][0].scrollTop, behavior: 'smooth'});
      });
      usagePanelScrollableEl.appendChild(usageDiv);
    } else {
      let usageDiv = document.createElement('div');
      usageDiv.classList.add('CFDUsagePanel-field', 'CFDUsagePanel-field--notUsed');
      usageDiv.innerHTML = `<span class="CFDUsagePanel-fieldStatus">Not Used</span>${buildFieldSummaryHTML(key, val)}`;
      usagePanelScrollableEl.appendChild(usageDiv);
    }
  });

  // Add a button to expand/collapse the UsagePanel
  const btn = document.createElement('button');
  btn.classList.add('CFD-usageBtn');
  btn.addEventListener('click', () => {
    usagePanelEl.classList.toggle('is-visible');
  });
  usagePanelEl.appendChild(btn);

  document.body.appendChild(usagePanelEl);
}

export {
  initCFDebugger,
}