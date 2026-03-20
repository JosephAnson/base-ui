import type { BaseUIChangeEventDetails } from '../types/index.ts';

export const CHECKBOX_GROUP_ATTRIBUTE = 'data-base-ui-checkbox-group';
export const CHECKBOX_GROUP_STATE_CHANGE_EVENT = 'base-ui-checkbox-group-state-change';

const CHECKBOX_GROUP_RUNTIME_STATE = Symbol('base-ui-checkbox-group-runtime-state');

let generatedCheckboxGroupId = 0;

export interface CheckboxGroupRuntimeState {
  id: string;
  allValues: string[];
  value: string[];
  disabled: boolean;
  disabledStates: Map<string, boolean>;
  toggleChild: (
    value: string,
    checked: boolean,
    eventDetails: BaseUIChangeEventDetails<'none'>,
  ) => void;
  toggleParent: (eventDetails: BaseUIChangeEventDetails<'none'>) => void;
}

type CheckboxGroupElement = Element & {
  [CHECKBOX_GROUP_RUNTIME_STATE]?: CheckboxGroupRuntimeState | undefined;
};

export function createCheckboxGroupId() {
  generatedCheckboxGroupId += 1;
  return `base-ui-checkbox-group-${generatedCheckboxGroupId}`;
}

export function setCheckboxGroupRuntimeState(
  root: Element | null,
  state: CheckboxGroupRuntimeState | null,
) {
  if (root == null) {
    return;
  }

  const checkboxGroup = root as CheckboxGroupElement;

  if (state == null) {
    delete checkboxGroup[CHECKBOX_GROUP_RUNTIME_STATE];
    return;
  }

  checkboxGroup[CHECKBOX_GROUP_RUNTIME_STATE] = state;
}

export function getCheckboxGroupRuntimeState(root: Element | null) {
  if (root == null) {
    return null;
  }

  return (root as CheckboxGroupElement)[CHECKBOX_GROUP_RUNTIME_STATE] ?? null;
}

export function getClosestCheckboxGroupRoot(node: Node | null) {
  const parentElement = getParentElement(node);
  return parentElement?.closest(`[${CHECKBOX_GROUP_ATTRIBUTE}]`) ?? null;
}

function getParentElement(node: Node | null) {
  if (node == null) {
    return null;
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    return node as Element;
  }

  return node.parentElement;
}
