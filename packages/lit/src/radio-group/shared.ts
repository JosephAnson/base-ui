// eslint-disable-next-line import/extensions
import type { BaseUIChangeEventDetails } from '../types/index.ts';

export const RADIO_GROUP_ATTRIBUTE = 'data-base-ui-radio-group';
export const RADIO_GROUP_STATE_CHANGE_EVENT = 'base-ui-radio-group-state-change';

const RADIO_GROUP_RUNTIME_STATE = Symbol('base-ui-radio-group-runtime-state');

let generatedRadioGroupId = 0;

export interface RadioGroupRuntimeState<Value = any> {
  id: string;
  name: string | undefined;
  checkedValue: Value | undefined;
  disabled: boolean;
  readOnly: boolean;
  required: boolean;
  registerControl: (element: HTMLElement, value: Value, disabled: boolean) => void;
  unregisterControl: (element: HTMLElement) => void;
  registerInput: (input: HTMLInputElement, value: Value, disabled: boolean) => void;
  unregisterInput: (input: HTMLInputElement) => void;
  setCheckedValue: (value: Value, eventDetails: BaseUIChangeEventDetails<'none'>) => boolean;
  getTabIndex: (value: Value, disabled: boolean) => number;
  moveFocus: (
    currentControl: HTMLElement,
    key: string,
    event: KeyboardEvent,
  ) => RadioGroupMoveFocusResult;
}

export interface RadioGroupMoveFocusResult {
  handled: boolean;
  selectionCommitted: boolean;
}

type RadioGroupElement = Element & {
  [RADIO_GROUP_RUNTIME_STATE]?: RadioGroupRuntimeState | undefined;
};

export function createRadioGroupId() {
  generatedRadioGroupId += 1;
  return `base-ui-radio-group-${generatedRadioGroupId}`;
}

export function setRadioGroupRuntimeState(
  root: Element | null,
  state: RadioGroupRuntimeState | null,
) {
  if (root == null) {
    return;
  }

  const radioGroup = root as RadioGroupElement;

  if (state == null) {
    delete radioGroup[RADIO_GROUP_RUNTIME_STATE];
    return;
  }

  radioGroup[RADIO_GROUP_RUNTIME_STATE] = state;
}

export function getRadioGroupRuntimeState(root: Element | null) {
  if (root == null) {
    return null;
  }

  return (root as RadioGroupElement)[RADIO_GROUP_RUNTIME_STATE] ?? null;
}

export function getClosestRadioGroupRoot(node: Node | null) {
  const parentElement = getParentElement(node);
  return parentElement?.closest(`[${RADIO_GROUP_ATTRIBUTE}]`) ?? null;
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
