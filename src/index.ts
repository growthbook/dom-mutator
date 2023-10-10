export const validAttributeName = /^[a-zA-Z:_][a-zA-Z0-9:_.-]*$/;
const nullController: MutationController = {
  revert: () => {},
};

const elements: Map<Element, ElementRecord> = new Map();
const mutations: Set<Mutation> = new Set();

function getObserverInit(attr: string): MutationObserverInit {
  return attr === 'html'
    ? {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true,
      }
    : {
        childList: false,
        subtree: false,
        attributes: true,
        attributeFilter: [attr],
      };
}

function getElementRecord(element: Element): ElementRecord {
  let record = elements.get(element);

  if (!record) {
    record = { element, attributes: {} };
    elements.set(element, record);
  }

  return record;
}

function createElementPropertyRecord(
  el: Element,
  attr: string,
  getCurrentValue: (el: Element) => any,
  setValue: (el: Element, val: any) => void,
  mutationRunner: (record: ElementPropertyRecord<any, any>) => void
) {
  const currentValue = getCurrentValue(el);
  const record: ElementPropertyRecord<any, any> = {
    isDirty: false,
    originalValue: currentValue,
    virtualValue: currentValue,
    mutations: [],
    el,
    observer: new MutationObserver(() => {
      const currentValue = getCurrentValue(el);
      if (currentValue === record.virtualValue) return;
      record.originalValue = currentValue;
      mutationRunner(record);
    }),
    mutationRunner,
    setValue,
    getCurrentValue,
  };
  record.observer.observe(el, getObserverInit(attr));
  return record;
}

function queueIfNeeded(
  val: string | null | ElementPositionWithDomNode,
  record: ElementPropertyRecord<any, any>
) {
  const currentVal = record.getCurrentValue(record.el);
  record.virtualValue = val;
  if (val && typeof val !== 'string') {
    if (
      !currentVal ||
      val.parentNode !== currentVal.parentNode ||
      val.insertBeforeNode !== currentVal.insertBeforeNode
    ) {
      record.isDirty = true;
      queueDOMUpdates();
    }
  } else if (val !== currentVal) {
    record.isDirty = true;
    queueDOMUpdates();
  }
}

function htmlMutationRunner(record: HTMLRecord) {
  let val = record.originalValue;
  record.mutations.forEach(m => (val = m.mutate(val)));
  queueIfNeeded(getTransformedHTML(val), record);
}
function classMutationRunner(record: ClassnameRecord) {
  const val = new Set(record.originalValue.split(/\s+/).filter(Boolean));
  record.mutations.forEach(m => m.mutate(val));
  queueIfNeeded(
    Array.from(val)
      .filter(Boolean)
      .join(' '),
    record
  );
}

function attrMutationRunner(record: AttributeRecord) {
  let val: string | null = record.originalValue;
  record.mutations.forEach(m => (val = m.mutate(val)));
  queueIfNeeded(val, record);
}

function _loadDOMNodes({
  parentSelector,
  insertBeforeSelector,
}: ElementPosition): ElementPositionWithDomNode | null {
  const parentNode = document.querySelector<HTMLElement>(parentSelector);
  if (!parentNode) return null;
  const insertBeforeNode = insertBeforeSelector
    ? document.querySelector<HTMLElement>(insertBeforeSelector)
    : null;
  if (insertBeforeSelector && !insertBeforeNode) return null;
  return {
    parentNode,
    insertBeforeNode,
  };
}

function positionMutationRunner(record: PositionRecord) {
  let val = record.originalValue;
  record.mutations.forEach(m => {
    const selectors = m.mutate();
    const newNodes = _loadDOMNodes(selectors);
    val = newNodes || val;
  });
  queueIfNeeded(val, record);
}

const getHTMLValue = (el: Element) => el.innerHTML;
const setHTMLValue = (el: Element, value: string) => (el.innerHTML = value);
function getElementHTMLRecord(element: Element): HTMLRecord {
  const elementRecord = getElementRecord(element);
  if (!elementRecord.html) {
    elementRecord.html = createElementPropertyRecord(
      element,
      'html',
      getHTMLValue,
      setHTMLValue,
      htmlMutationRunner
    );
  }
  return elementRecord.html;
}

const getElementPosition = (el: Element): ElementPositionWithDomNode => {
  return {
    parentNode: el.parentElement as HTMLElement,
    insertBeforeNode: el.nextElementSibling as HTMLElement | null,
  };
};
const setElementPosition = (el: Element, value: ElementPositionWithDomNode) => {
  console.log('setElementPosition');
  value.parentNode.insertBefore(el, value.insertBeforeNode);
};
function getElementPositionRecord(element: Element): PositionRecord {
  const elementRecord = getElementRecord(element);
  if (!elementRecord.position) {
    elementRecord.position = createElementPropertyRecord(
      element,
      'position',
      getElementPosition,
      setElementPosition,
      positionMutationRunner
    );
  }
  return elementRecord.position;
}

const setClassValue = (el: Element, val: string) =>
  val ? (el.className = val) : el.removeAttribute('class');
const getClassValue = (el: Element) => el.className;
function getElementClassRecord(el: Element): ClassnameRecord {
  const elementRecord = getElementRecord(el);
  if (!elementRecord.classes) {
    elementRecord.classes = createElementPropertyRecord(
      el,
      'class',
      getClassValue,
      setClassValue,
      classMutationRunner
    );
  }
  return elementRecord.classes;
}

const getAttrValue = (attrName: string) => (el: Element) =>
  el.getAttribute(attrName) ?? null;
const setAttrValue = (attrName: string) => (el: Element, val: string | null) =>
  val !== null ? el.setAttribute(attrName, val) : el.removeAttribute(attrName);
function getElementAttributeRecord(el: Element, attr: string): AttributeRecord {
  const elementRecord = getElementRecord(el);
  if (!elementRecord.attributes[attr]) {
    elementRecord.attributes[attr] = createElementPropertyRecord(
      el,
      attr,
      getAttrValue(attr),
      setAttrValue(attr),
      attrMutationRunner
    );
  }
  return elementRecord.attributes[attr];
}

function deleteElementPropertyRecord(el: Element, attr: string) {
  const element = elements.get(el);
  if (!element) return;
  if (attr === 'html') {
    element.html?.observer?.disconnect();
    delete element.html;
  } else if (attr === 'class') {
    element.classes?.observer?.disconnect();
    delete element.classes;
  } else if (attr === 'position') {
    element.position?.observer?.disconnect();
    delete element.position;
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

function setPropertyValue<T extends ElementPropertyRecord<any, any>>(
  el: Element,
  attr: string,
  m: T
) {
  if (!m.isDirty) return;
  m.isDirty = false;
  const val = m.virtualValue;
  if (!m.mutations.length) {
    deleteElementPropertyRecord(el, attr);
  }
  m.setValue(el, val);
}

let raf = false;

function setValue(m: ElementRecord, el: Element) {
  m.html && setPropertyValue<HTMLRecord>(el, 'html', m.html);
  m.classes && setPropertyValue<ClassnameRecord>(el, 'class', m.classes);
  m.position && setPropertyValue<PositionRecord>(el, 'position', m.position);
  Object.keys(m.attributes).forEach(attr => {
    setPropertyValue<AttributeRecord>(el, attr, m.attributes[attr]);
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

// find or create ElementPropertyRecord, add mutation to it, then run
function startMutating(mutation: Mutation, element: Element) {
  let record: ElementPropertyRecord<any, any> | null = null;
  if (mutation.kind === 'html') {
    record = getElementHTMLRecord(element);
  } else if (mutation.kind === 'class') {
    record = getElementClassRecord(element);
  } else if (mutation.kind === 'attribute') {
    record = getElementAttributeRecord(element, mutation.attribute);
  } else if (mutation.kind === 'position') {
    record = getElementPositionRecord(element);
  }
  if (!record) return;
  record.mutations.push(mutation);
  record.mutationRunner(record);
}

// get (existing) ElementPropertyRecord, remove mutation from it, then run
function stopMutating(mutation: Mutation, el: Element) {
  console.log('stopMutating');
  let record: ElementPropertyRecord<any, any> | null = null;
  if (mutation.kind === 'html') {
    record = getElementHTMLRecord(el);
  } else if (mutation.kind === 'class') {
    record = getElementClassRecord(el);
  } else if (mutation.kind === 'attribute') {
    record = getElementAttributeRecord(el, mutation.attribute);
  } else if (mutation.kind === 'position') {
    record = getElementPositionRecord(el);
  }
  if (!record) return;
  const index = record.mutations.indexOf(mutation);
  if (index !== -1) record.mutations.splice(index, 1);
  record.mutationRunner(record);
}

// maintain list of elements associated with mutation
function refreshElementsSet(mutation: Mutation) {
  console.log('refreshElementsSet', {
    mutation,
    elements: mutation.elements.size,
    shouldExitEarly: mutation.kind === 'position' && mutation.elements.size > 0,
  });

  if (mutation.kind === 'position' && mutation.elements.size > 0) {
    console.log('refreshElementsSet - returning early');
    return;
  } else {
    // debugger;
  }

  const existingElements = new Set(mutation.elements);
  // const newElements: Set<Element> = new Set();
  const matchingElements = document.querySelectorAll(mutation.selector);

  matchingElements.forEach(el => {
    // newElements.add(el);
    if (!existingElements.has(el)) {
      mutation.elements.add(el);
      console.log('startMutating', {
        mutation,
        el,
      });
      startMutating(mutation, el);
    }
  });

  // existingElements.forEach(el => {
  //   if (!newElements.has(el)) {
  //     mutation.elements.delete(el);
  //     stopMutating(mutation, el);
  //   }
  // });
}

function revertMutation(mutation: Mutation) {
  console.log('revertMutation');
  mutation.elements.forEach(el => stopMutating(mutation, el));
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
  if (typeof document === 'undefined') return;

  if (!observer) {
    observer = new MutationObserver(() => {
      console.log('global observer - refreshing');
      refreshAllElementSets();
    });
  }

  console.log('init - refreshElementsSets');
  refreshAllElementSets();
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: false,
    characterData: false,
  });
}

// run on init
connectGlobalObserver();

function newMutation(m: Mutation): MutationController {
  // Not in a browser
  if (typeof document === 'undefined') return nullController;
  // add to global index of mutations
  mutations.add(m);
  // run refresh on init to establish list of elements associated w/ mutation
  console.log('newMutation - refreshElementsSet');
  refreshElementsSet(m);
  return {
    revert: () => {
      revertMutation(m);
    },
  };
}

function html(
  selector: HTMLMutation['selector'],
  mutate: HTMLMutation['mutate']
) {
  return newMutation({
    kind: 'html',
    elements: new Set(),
    mutate,
    selector,
  });
}

function position(
  selector: PositionMutation['selector'],
  mutate: PositionMutation['mutate']
) {
  return newMutation({
    kind: 'position',
    elements: new Set(),
    mutate,
    selector,
  });
}

function classes(
  selector: ClassnameMutation['selector'],
  mutate: ClassnameMutation['mutate']
) {
  return newMutation({
    kind: 'class',
    elements: new Set(),
    mutate,
    selector,
  });
}

function attribute(
  selector: AttrMutation['selector'],
  attribute: AttrMutation['attribute'],
  mutate: AttrMutation['mutate']
) {
  if (!validAttributeName.test(attribute)) return nullController;

  if (attribute === 'class' || attribute === 'className') {
    return classes(selector, classnames => {
      const mutatedClassnames = mutate(Array.from(classnames).join(' '));
      classnames.clear();
      if (!mutatedClassnames) return;
      mutatedClassnames
        .split(/\s+/g)
        .filter(Boolean)
        .forEach(c => classnames.add(c));
    });
  }

  return newMutation({
    kind: 'attribute',
    attribute,
    elements: new Set(),
    mutate,
    selector,
  });
}

function declarative({
  selector,
  action,
  value,
  attribute: attr,
  parentSelector,
  insertBeforeSelector,
}: DeclarativeMutation): MutationController {
  if (attr === 'html') {
    if (action === 'append') {
      return html(selector, val => val + (value ?? ''));
    } else if (action === 'set') {
      return html(selector, () => value ?? '');
    }
  } else if (attr === 'class') {
    if (action === 'append') {
      return classes(selector, val => {
        if (value) val.add(value);
      });
    } else if (action === 'remove') {
      return classes(selector, val => {
        if (value) val.delete(value);
      });
    } else if (action === 'set') {
      return classes(selector, val => {
        val.clear();
        if (value) val.add(value);
      });
    }
  } else if (attr === 'position') {
    if (action === 'set' && parentSelector) {
      return position(selector, () => ({
        insertBeforeSelector,
        parentSelector,
      }));
    }
  } else {
    if (action === 'append') {
      return attribute(selector, attr, val =>
        val !== null ? val + (value ?? '') : value ?? ''
      );
    } else if (action === 'set') {
      return attribute(selector, attr, () => value ?? '');
    } else if (action === 'remove') {
      return attribute(selector, attr, () => null);
    }
  }
  return nullController;
}

export type MutationController = {
  revert: () => void;
};

export type DeclarativeMutation = {
  selector: string;
  attribute: string;
  action: 'append' | 'set' | 'remove';
  value?: string;
  parentSelector?: string;
  insertBeforeSelector?: string;
};

export default {
  html,
  classes,
  attribute,
  position,
  declarative,
};
