export type MutationType =
  | 'addClass'
  | 'removeClass'
  | 'appendHTML'
  | 'setHTML'
  | 'setAttribute';

type MutationRecord = {
  selector: string;
  type: MutationType;
  value: string;
  elements: Set<Element>;
};
type Mutations = { [key: string]: MutationRecord };
type ElementAttributeRecord = {
  externalValue: string;
  lastValue: string;
  dirty?: boolean;
  observer: MutationObserver;
  mutations: string[];
};
type ElementAttributes = {
  [key: string]: ElementAttributeRecord;
};
type Elements = Map<Element, ElementAttributes>;

const mutations: Mutations = {};
const elements: Elements = new Map();
let mutationIdCounter = 1;

// attr="value" format
const setAttributeRegex = /^([a-zA-Z:_][a-zA-Z0-9:_.-]*)\s*=\s*"([^"]*)"/;

function getObserverInit(attr: string): MutationObserverInit {
  if (attr === 'html') {
    return {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    };
  }
  return {
    childList: false,
    subtree: false,
    attributes: true,
    attributeFilter: [attr],
  };
}

function getElementAttributeRecord(
  el: Element,
  attr: string
): ElementAttributeRecord {
  let element = elements.get(el);
  if (!element) {
    element = {};
    elements.set(el, element);
  }

  if (!element[attr]) {
    const elAttr: ElementAttributeRecord = {
      externalValue: getCurrentValue(el, attr),
      lastValue: '',
      observer: new MutationObserver(() => {
        const currentVal = getCurrentValue(el, attr);
        if (currentVal === elAttr.lastValue) return;
        elAttr.externalValue = currentVal;
        applyMutations(el, attr);
      }),
      mutations: [],
    };
    element[attr] = elAttr;
    elAttr.observer.observe(el, getObserverInit(attr));
  }

  return element[attr];
}
function deleteElementAttributeRecord(el: Element, attr: string) {
  const element = elements.get(el);
  /* istanbul ignore next */
  if (!element) return;
  element[attr] && element[attr].observer.disconnect();
  delete element[attr];
}

let transformContainer: HTMLDivElement;
function getTransformedHTML(html: string) {
  if (!transformContainer) {
    transformContainer = document.createElement('div');
  }
  transformContainer.innerHTML = html;
  return transformContainer.innerHTML;
}

function applyMutation(mutation: MutationRecord, value: string): string {
  if (mutation.type === 'addClass') {
    const existing = value.split(' ');
    const classes = mutation.value.split(' ');
    classes.forEach(c => {
      if (!existing.includes(c)) {
        existing.push(c);
      }
    });
    return existing.filter(Boolean).join(' ');
  } else if (mutation.type === 'removeClass') {
    const existing = value.split(' ');
    const classes = mutation.value.split(' ');
    return existing.filter(c => !classes.includes(c)).join(' ');
  } else if (mutation.type === 'setHTML') {
    return mutation.value;
  } else if (mutation.type === 'appendHTML') {
    return value + mutation.value;
  } else if (mutation.type === 'setAttribute') {
    /* istanbul ignore next */
    const match = setAttributeRegex.exec(mutation.value);
    /* istanbul ignore next */
    return match?.[2] || '';
  }

  /* istanbul ignore next */
  return value;
}

function getCurrentValue(el: Element, attr: string) {
  if (attr === 'html') {
    return el.innerHTML;
  } else if (attr === 'className') {
    return el.className;
  } else {
    return el.getAttribute(attr) || '';
  }
}
function setValue(el: Element, attr: string, value: string) {
  if (attr === 'html') {
    el.innerHTML = value;
  } else if (attr === 'className') {
    if (value) {
      el.className = value;
    } else {
      el.removeAttribute('class');
    }
  } else {
    if (value) {
      el.setAttribute(attr, value);
    } else {
      el.removeAttribute(attr);
    }
  }
}

let raf = false;
function setValues() {
  raf = false;
  elements.forEach((attrs, el) => {
    Object.keys(attrs).forEach(attr => {
      const elAttr = attrs[attr];
      if (elAttr.dirty) {
        elAttr.dirty = false;
        setValue(el, attr, elAttr.lastValue);

        // No more mutations for the element, remove the observer
        if (!elAttr.mutations.length) {
          deleteElementAttributeRecord(el, attr);
        }
      }
    });
  });
}
function queueDOMUpdates() {
  if (!raf) {
    raf = true;
    requestAnimationFrame(setValues);
  }
}

function applyMutations(el: Element, attr: string) {
  const elAttr = getElementAttributeRecord(el, attr);
  let val = elAttr.externalValue;
  elAttr.mutations.forEach(id => {
    const mutation = mutations[id];
    /* istanbul ignore next */
    if (!mutation) return;
    val = applyMutation(mutation, val);
  });

  const currentVal = getCurrentValue(el, attr);
  if (val !== currentVal) {
    elAttr.dirty = true;
    elAttr.lastValue = val;
    queueDOMUpdates();
  }
}

function getAttribute(type: MutationType, value: string): string {
  if (['addClass', 'removeClass'].includes(type)) {
    return 'className';
  } else if (['appendHTML', 'setHTML'].includes(type)) {
    return 'html';
  } else if (type === 'setAttribute') {
    const match = setAttributeRegex.exec(value);
    if (match?.[1]) {
      const attr = match[1];
      if (attr === 'class' || attr === 'classname') {
        return 'className';
      }
      return attr;
    }
  }

  return '';
}

function startMutating(id: string, el: Element) {
  const mutation = mutations[id];
  /* istanbul ignore next */
  if (!mutation) return;

  mutation.elements.add(el);
  const attr = getAttribute(mutation.type, mutation.value);
  const elAttr = getElementAttributeRecord(el, attr);
  elAttr.mutations.push(id);
  applyMutations(el, attr);
}

function stopMutating(id: string, el: Element) {
  const mutation = mutations[id];
  /* istanbul ignore next */
  if (!mutation) return;
  mutation.elements.delete(el);
  const attr = getAttribute(mutation.type, mutation.value);
  const elAttr = getElementAttributeRecord(el, attr);
  const index = elAttr.mutations.indexOf(id);
  /* istanbul ignore next */
  if (index !== -1) {
    elAttr.mutations.splice(index, 1);
  }
  applyMutations(el, attr);
}

function refreshElementsSet(id: string) {
  const mutation = mutations[id];
  /* istanbul ignore next */
  if (!mutation) return;

  const existingEls = new Set(mutation.elements);

  const newElements: Set<Element> = new Set();
  const nodes = document.body.querySelectorAll(mutation.selector);
  nodes.forEach(el => {
    newElements.add(el);
    if (!existingEls.has(el)) {
      startMutating(id, el);
    }
  });

  existingEls.forEach(el => {
    if (!newElements.has(el)) {
      stopMutating(id, el);
    }
  });
}

function newMutation(
  selector: string,
  type: MutationType,
  value: string
): string {
  // Fix invalid HTML values
  if (type === 'appendHTML' || type === 'setHTML') {
    value = getTransformedHTML(value);
  }

  const id = '' + mutationIdCounter++;
  mutations[id] = {
    selector,
    type,
    value,
    elements: new Set(),
  };
  refreshElementsSet(id);
  return id;
}

function revertMutation(id: string) {
  const mutation = mutations[id];
  /* istanbul ignore next */
  if (!mutation) return;

  const els = new Set(mutation.elements);
  els.forEach(el => {
    stopMutating(id, el);
  });
  mutations[id].elements.clear();
  delete mutations[id];
}

function refreshAllElementSets() {
  Object.keys(mutations).forEach(key => {
    refreshElementsSet(key);
  });
}

// Observer for elements that don't exist in the DOM yet
let observer: MutationObserver;
export function disconnectGlobalObserver() {
  observer && observer.disconnect();
}
export function connectGlobalObserver() {
  /* istanbul ignore next */
  if (typeof document === 'undefined') return;

  if (!observer) {
    observer = new MutationObserver(() => {
      refreshAllElementSets();
    });
  }

  refreshAllElementSets();
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false,
    characterData: false,
  });
}
connectGlobalObserver();

export default function mutate(
  selector: string,
  type: MutationType,
  value: string
): () => void {
  /* istanbul ignore next */
  if (typeof document === 'undefined') {
    // Not in a browser
    return () => {
      // do nothing
    };
  }

  // Invalid mutation
  const attr = getAttribute(type, value);
  if (!attr) {
    return () => {
      // do nothing
    };
  }

  const id = newMutation(selector, type, value);

  return () => {
    revertMutation(id);
  };
}
