const validAttributeName = /^[a-zA-Z:_][a-zA-Z0-9:_.-]*$/;
const nullController: MutationController = {
  revert: () => {},
};

const elements: Map<Element, ElementRecord> = new Map();
const mutations: Set<AnyMutationRecord> = new Set();

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

function getElementRecord(el: Element): ElementRecord {
  let ret = elements.get(el);
  if (!ret) {
    ret = { el, attributes: {} };
    elements.set(el, ret);
  }
  return ret;
}

function newMutatedElementAttribute<T>(
  el: Element,
  attr: string,
  getCurrentValue: (el: Element) => string,
  setValue: (el: Element, val: string) => void,
  runMutations: (record: ElementAttributeRecord<T>) => void
): ElementAttributeRecord<T> {
  const currentValue = getCurrentValue(el);
  const ret: ElementAttributeRecord<T> = {
    isDirty: false,
    originalValue: currentValue,
    virtualValue: currentValue,
    mutations: [],
    el,
    observer: new MutationObserver(() => {
      const currentValue = getCurrentValue(el);
      if (currentValue === ret.virtualValue) return;
      ret.originalValue = currentValue;
      runMutations(ret);
    }),
    runMutations,
    setValue,
    getCurrentValue,
  };
  ret.observer.observe(el, getObserverInit(attr));
  return ret;
}

function stringRunner(record: {
  originalValue: string;
  mutations: { mutate: (v: string) => string }[];
}) {
  let val = record.originalValue;
  record.mutations.forEach(m => (val = m.mutate(val)));
  return val;
}
function setRunner(
  val: Set<string>,
  record: {
    mutations: { mutate: (v: Set<string>) => void }[];
  }
) {
  record.mutations.forEach(m => m.mutate(val));
  return val;
}
function queueIfNeeded(
  val: string,
  record: {
    el: Element;
    getCurrentValue: (el: Element) => string;
    virtualValue: string;
    isDirty: boolean;
  }
) {
  const currentVal = record.getCurrentValue(record.el);
  record.virtualValue = val;
  if (val !== currentVal) {
    record.isDirty = true;
    queueDOMUpdates();
  }
}

function HTMLMutationRunner(
  record: ElementAttributeRecord<HTMLMutationRecord>
) {
  queueIfNeeded(getTransformedHTML(stringRunner(record)), record);
}
function ClassMutationRunner(
  record: ElementAttributeRecord<ClassMutationRecord>
) {
  const val = setRunner(
    new Set(record.originalValue.split(/\s+/).filter(Boolean)),
    record
  );
  queueIfNeeded(
    Array.from(val)
      .filter(Boolean)
      .join(' '),
    record
  );
}
function AttributeMutationRunner(
  record: ElementAttributeRecord<AttributeMutationRecord>
) {
  queueIfNeeded(stringRunner(record), record);
}

const getHTMLValue = (el: Element) => el.innerHTML;
const setHTMLValue = (el: Element, value: string) => (el.innerHTML = value);
function getElementHTMLRecord(
  el: Element
): ElementAttributeRecord<HTMLMutationRecord> {
  const elementRecord = getElementRecord(el);
  if (!elementRecord.html) {
    elementRecord.html = newMutatedElementAttribute(
      el,
      'html',
      getHTMLValue,
      setHTMLValue,
      HTMLMutationRunner
    );
  }
  return elementRecord.html;
}

const setClassValue = (el: Element, val: string) =>
  val ? (el.className = val) : el.removeAttribute('class');
const getClassValue = (el: Element) => el.className;
function getElementClassRecord(
  el: Element
): ElementAttributeRecord<ClassMutationRecord> {
  const elementRecord = getElementRecord(el);
  if (!elementRecord.classes) {
    elementRecord.classes = newMutatedElementAttribute(
      el,
      'class',
      getClassValue,
      setClassValue,
      ClassMutationRunner
    );
  }
  return elementRecord.classes;
}

function getElementAttributeRecord(
  el: Element,
  attr: string
): ElementAttributeRecord<AttributeMutationRecord> {
  const elementRecord = getElementRecord(el);
  if (!elementRecord.attributes[attr]) {
    elementRecord.attributes[attr] = newMutatedElementAttribute(
      el,
      attr,
      el => el.getAttribute(attr) || '',
      (el, val) =>
        val ? el.setAttribute(attr, val) : el.removeAttribute(attr),
      AttributeMutationRunner
    );
  }
  return elementRecord.attributes[attr];
}

function deleteElementAttributeRecord(el: Element, attr: string) {
  const element = elements.get(el);
  /* istanbul ignore next */
  if (!element) return;
  if (attr === 'html') {
    element.html?.observer?.disconnect();
    delete element.html;
  } else if (attr === 'class') {
    element.classes?.observer?.disconnect();
    delete element.classes;
  } else {
    element.attributes?.[attr]?.observer?.disconnect();
    delete element.attributes[attr];
  }
}

let transformContainer: HTMLDivElement;
function getTransformedHTML(html: string) {
  if (!transformContainer) {
    transformContainer = document.createElement('div');
  }
  transformContainer.innerHTML = html;
  return transformContainer.innerHTML;
}

function setAttributeValue<T>(
  el: Element,
  attr: string,
  m: ElementAttributeRecord<T>
) {
  if (!m.isDirty) return;
  m.isDirty = false;
  const val = m.virtualValue;
  if (!m.mutations.length) {
    deleteElementAttributeRecord(el, attr);
  }
  m.setValue(el, val);
}

let raf = false;
function setValue(m: ElementRecord, el: Element) {
  m.html && setAttributeValue(el, 'html', m.html);
  m.classes && setAttributeValue(el, 'class', m.classes);
  Object.keys(m.attributes).forEach(attr => {
    setAttributeValue(el, attr, m.attributes[attr]);
  });
}
function setValues() {
  raf = false;
  elements.forEach(setValue);
}
function queueDOMUpdates() {
  if (!raf) {
    raf = true;
    requestAnimationFrame(setValues);
  }
}

function startMutating(mutation: AnyMutationRecord, el: Element) {
  mutation.elements.add(el);

  if (mutation.kind === 'html') {
    const record = getElementHTMLRecord(el);
    record.mutations.push(mutation);
    record.runMutations(record);
  } else if (mutation.kind === 'class') {
    const record = getElementClassRecord(el);
    record.mutations.push(mutation);
    record.runMutations(record);
  } else if (mutation.kind === 'attribute') {
    const record = getElementAttributeRecord(el, mutation.attribute);
    record.mutations.push(mutation);
    record.runMutations(record);
  }
}

function stopMutating(mutation: AnyMutationRecord, el: Element) {
  mutation.elements.delete(el);

  if (mutation.kind === 'html') {
    const record = getElementHTMLRecord(el);
    const index = record.mutations.indexOf(mutation);
    if (index !== -1) {
      record.mutations.splice(index, 1);
    }
    record.runMutations(record);
  } else if (mutation.kind === 'class') {
    const record = getElementClassRecord(el);
    const index = record.mutations.indexOf(mutation);
    if (index !== -1) {
      record.mutations.splice(index, 1);
    }
    record.runMutations(record);
  } else if (mutation.kind === 'attribute') {
    const record = getElementAttributeRecord(el, mutation.attribute);
    const index = record.mutations.indexOf(mutation);
    if (index !== -1) {
      record.mutations.splice(index, 1);
    }
    record.runMutations(record);
  }
}

function refreshElementsSet(mutation: AnyMutationRecord) {
  const existingEls = new Set(mutation.elements);

  const newElements: Set<Element> = new Set();
  const nodes = document.body.querySelectorAll(mutation.selector);
  nodes.forEach(el => {
    newElements.add(el);
    if (!existingEls.has(el)) {
      startMutating(mutation, el);
    }
  });

  existingEls.forEach(el => {
    if (!newElements.has(el)) {
      stopMutating(mutation, el);
    }
  });
}

function revertMutation(mutation: AnyMutationRecord) {
  const els = new Set(mutation.elements);
  els.forEach(el => {
    stopMutating(mutation, el);
  });
  mutation.elements.clear();
  mutations.delete(mutation);
}

function refreshAllElementSets() {
  mutations.forEach(refreshElementsSet);
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

function newMutationRecord(m: AnyMutationRecord): MutationController {
  /* istanbul ignore next */
  if (typeof document === 'undefined') {
    // Not in a browser
    return nullController;
  }

  mutations.add(m);
  refreshElementsSet(m);

  return {
    revert: () => {
      revertMutation(m);
    },
  };
}

function html(selector: string, mutate: (value: string) => string) {
  return newMutationRecord({
    kind: 'html',
    elements: new Set(),
    mutate,
    selector,
  });
}

function classes(
  selector: string,
  mutate: (classes: Set<string>) => void
) {
  return newMutationRecord({
    kind: 'class',
    elements: new Set(),
    mutate,
    selector,
  });
}
function attribute(
  selector: string,
  attribute: string,
  mutate: (value: string) => string
) {
  if (!validAttributeName.test(attribute)) {
    return nullController;
  }
  if (attribute === 'class' || attribute === 'className') {
    return newMutationRecord({
      kind: 'class',
      elements: new Set(),
      mutate: classes => {
        const val = mutate(Array.from(classes).join(' '));
        classes.clear();
        val
          .split(/\s+/g)
          .filter(Boolean)
          .forEach(c => {
            classes.add(c);
          });
      },
      selector,
    });
  }

  return newMutationRecord({
    kind: 'attribute',
    attribute,
    elements: new Set(),
    mutate,
    selector,
  });
}

export default {
  html,
  classes,
  attribute,
};
