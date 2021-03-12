interface HTMLMutationRecord {
  kind: 'html';
  selector: string;
  mutate: (val: string) => string;
  elements: Set<Element>;
}
interface ClassMutationRecord {
  kind: 'class';
  selector: string;
  mutate: (val: Set<string>) => void;
  elements: Set<Element>;
}
interface AttributeMutationRecord {
  kind: 'attribute';
  attribute: string;
  selector: string;
  mutate: (val: string) => string;
  elements: Set<Element>;
}
type AnyMutationRecord = StringMutationRecord | SetMutationRecord;

type StringMutationRecord = HTMLMutationRecord | AttributeMutationRecord;

type SetMutationRecord = ClassMutationRecord;

interface ElementAttributeRecord<T> {
  observer: MutationObserver;
  originalValue: string;
  virtualValue: string;
  isDirty: boolean;
  mutations: T[];
  el: Element;
  getCurrentValue: (el: Element) => string;
  setValue: (el: Element, value: string) => void;
  runMutations: (record: ElementAttributeRecord<T>) => void;
}
interface ElementRecord {
  el: Element;
  html?: ElementAttributeRecord<HTMLMutationRecord>;
  classes?: ElementAttributeRecord<ClassMutationRecord>;
  attributes: {
    [key: string]: ElementAttributeRecord<AttributeMutationRecord>;
  };
}
type MutationController = {
  revert: () => void;
};
