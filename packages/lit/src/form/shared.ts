export const FORM_CONTEXT_ATTRIBUTE = 'data-base-ui-form-context';
export const FORM_STATE_CHANGE_EVENT = 'base-ui-form-state-change';
export const FORM_RUNTIME = Symbol('base-ui-form-runtime');

export type Errors = Record<string, string | string[]>;
export type FormValidationMode = 'onSubmit' | 'onBlur' | 'onChange';

export interface FormFieldEntry {
  name: string | undefined;
  getControl: () => HTMLElement | null;
  getValue: () => unknown;
  getValidityData: () => {
    state: {
      valid: boolean | null;
    };
  };
  validate: (submitAttempted?: boolean | undefined) => void;
}

export interface FormRuntime {
  clearErrors(name: string | undefined): void;
  getErrors(): Errors;
  getFormValues(): Record<string, unknown>;
  getValidationMode(): FormValidationMode;
  registerField(element: Element, entry: FormFieldEntry): void;
  unregisterField(element: Element): void;
}

export function setFormRuntime(element: Element | null, runtime: FormRuntime | null) {
  if (element == null) {
    return;
  }

  const target = element as Element & { [FORM_RUNTIME]?: FormRuntime | null };

  if (runtime == null) {
    delete target[FORM_RUNTIME];
    return;
  }

  target[FORM_RUNTIME] = runtime;
}

export function getFormRuntimeOrNull(element: Element | null) {
  if (element == null) {
    return null;
  }

  return (element as Element & { [FORM_RUNTIME]?: FormRuntime | null })[FORM_RUNTIME] ?? null;
}

export function getClosestFormRoot(element: Element | null) {
  return element?.closest(`[${FORM_CONTEXT_ATTRIBUTE}]`) ?? null;
}
