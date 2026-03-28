import { render as renderTemplate, type TemplateResult } from 'lit';
import type { ComponentRenderFn, HTMLProps } from '../types';
import { BaseHTMLElement } from '../utils';
import {
  FORM_CONTEXT_ATTRIBUTE,
  FORM_STATE_CHANGE_EVENT,
  type Errors,
  type FormFieldEntry,
  type FormRuntime,
  type FormValidationMode,
  setFormRuntime,
} from './shared';

// ─── Types ──────────────────────────────────────────────────────────────────────

export type FormSubmitEventReason = 'none';

export interface FormSubmitEventDetails {
  reason: FormSubmitEventReason;
  event: SubmitEvent;
}

export interface FormActions {
  validate: (fieldName?: string) => void;
}

export interface FormProps {
  /**
   * Whether native HTML validation should be disabled on the nested form.
   * @default true
   */
  noValidate?: boolean | undefined;
  /**
   * Determines when the form should be validated.
   * @default 'onSubmit'
   */
  validationMode?: FormValidationMode | undefined;
  /**
   * Validation errors returned externally, keyed by field name.
   */
  errors?: Errors | undefined;
  /**
   * Event handler called when the form is submitted with collected form values.
   */
  onFormSubmit?:
    | ((values: Record<string, unknown>, details: FormSubmitEventDetails) => void)
    | undefined;
  /**
   * A ref to imperative actions.
   */
  actionsRef?: { current: FormActions | null } | undefined;
  /**
   * Allows you to replace the component's HTML element with a different tag,
   * or compose it with a template that has a single root element.
   * Accepts a `TemplateResult` or a function that returns the template to render.
   */
  render?: FormRenderProp | undefined;
}

export interface FormState {}

type FormRenderProps = HTMLProps<HTMLElement>;
type FormRenderProp = TemplateResult | ComponentRenderFn<FormRenderProps, FormState>;

export { type FormValidationMode } from './shared';

// ─── FormRootElement ─────────────────────────────────────────────────────────────

/**
 * A form context provider that enhances a nested `<form>` element with
 * consolidated error handling and field validation.
 * Renders a `<form-root>` custom element (display:contents).
 *
 * Usage:
 * ```html
 * <form-root .onFormSubmit=${handler} .errors=${errors}>
 *   <form>
 *     <field-root>...</field-root>
 *     <button type="submit">Submit</button>
 *   </form>
 * </form-root>
 * ```
 *
 * Documentation: [Base UI Form](https://base-ui.com/react/components/form)
 */
export class FormRootElement extends BaseHTMLElement implements FormRuntime {
  // --- Properties (set via Lit property binding) ---

  /** External errors keyed by field name. */
  private errorsValue: Errors | undefined;
  get errors(): Errors | undefined {
    return this.errorsValue;
  }
  set errors(value: Errors | undefined) {
    this.syncExternalErrors(value);
  }

  /** Validation mode inherited by child fields. */
  validationMode: FormValidationMode | undefined;

  /** Whether native HTML validation should be disabled on the nested form. */
  private noValidateValue = true;
  get noValidate(): boolean {
    return this.noValidateValue;
  }
  set noValidate(value: boolean | undefined) {
    this.noValidateValue = value !== false;
    if (this.formElement != null) {
      this.formElement.noValidate = this.noValidateValue;
    }
  }

  /** Called on valid submit with collected form values. Prevents native submit. */
  onFormSubmit:
    | ((values: Record<string, unknown>, details: FormSubmitEventDetails) => void)
    | undefined;

  /** Native submit handler. Called after validation passes. */
  onSubmit: ((event: SubmitEvent) => void) | undefined;
  render: FormRenderProp | undefined;

  /** Ref object for imperative validation. */
  private actionsRefValue: { current: FormActions | null } | undefined;
  get actionsRef(): { current: FormActions | null } | undefined {
    return this.actionsRefValue;
  }
  set actionsRef(value: { current: FormActions | null } | undefined) {
    this.actionsRefValue = value;
    if (value != null) {
      value.current = { validate: (name) => this.validateFields(name) };
    }
  }

  // --- Internal state ---

  private formElement: HTMLFormElement | null = null;
  private internalErrors: Errors = {};
  private externalErrors: Errors | undefined;
  private fields = new Map<Element, FormFieldEntry>();
  private submitted = false;
  private pendingFocusInvalid = false;
  private pendingFocusQueued = false;
  private lastPublishedStateKey: string | null = null;
  private renderedElement: HTMLElement | null = null;

  constructor() {
    super();
    this.noValidate = true;
  }

  connectedCallback() {
    this.style.display = 'contents';
    this.setAttribute(FORM_CONTEXT_ATTRIBUTE, '');
    this.ensureRenderedElement();

    queueMicrotask(() => {
      this.attachForm();
    });
  }

  disconnectedCallback() {
    this.detachForm();
    if (this.actionsRefValue != null) {
      this.actionsRefValue.current = null;
    }
    this.fields.clear();
    this.lastPublishedStateKey = null;
    this.resetRenderedElement();
  }

  // --- FormRuntime implementation ---

  clearErrors(name: string | undefined) {
    if (name == null || !Object.hasOwn(this.internalErrors, name)) {
      return;
    }
    const next = { ...this.internalErrors };
    delete next[name];
    this.internalErrors = next;
    this.publishStateChange();
  }

  getErrors(): Errors {
    return this.internalErrors;
  }

  getFormValues(): Record<string, unknown> {
    return this.getConnectedFields().reduce(
      (values, field) => {
        if (field.name) {
          values[field.name] = field.getValue();
        }
        return values;
      },
      {} as Record<string, unknown>,
    );
  }

  getValidationMode(): FormValidationMode {
    return this.validationMode ?? 'onSubmit';
  }

  registerField(element: Element, entry: FormFieldEntry) {
    this.fields.set(element, entry);
    this.queueFocusInvalidField();
  }

  unregisterField(element: Element) {
    this.fields.delete(element);
  }

  // --- Private methods ---

  private attachForm() {
    this.ensureRenderedElement();
    const form = this.querySelector('form');
    if (!form || this.formElement === form) {
      return;
    }

    this.detachForm();
    this.formElement = form;
    form.noValidate = this.noValidate;
    setFormRuntime(form, this);
    form.addEventListener('submit', this.handleSubmit);
    this.publishStateChange();
  }

  private detachForm() {
    if (!this.formElement) {
      return;
    }
    this.formElement.removeEventListener('submit', this.handleSubmit);
    setFormRuntime(this.formElement, null);
    this.formElement = null;
  }

  private handleSubmit = (event: SubmitEvent) => {
    this.validateFields(undefined, true);

    const invalidField = this.getFirstInvalidField();
    if (invalidField) {
      event.preventDefault();
      this.focusControl(invalidField.getControl());
      return;
    }

    this.submitted = true;

    this.onSubmit?.(event);

    if (this.onFormSubmit) {
      event.preventDefault();
      this.onFormSubmit(this.getFormValues(), { reason: 'none', event });
    }
  };

  private syncExternalErrors(nextErrors: Errors | undefined) {
    if (this.externalErrors === nextErrors) {
      return;
    }
    this.externalErrors = nextErrors;
    this.errorsValue = nextErrors;
    this.internalErrors = nextErrors ?? {};
    this.publishStateChange();

    if (!this.submitted) {
      return;
    }
    this.submitted = false;
    queueMicrotask(() => {
      this.pendingFocusInvalid = true;
      this.queueFocusInvalidField();
    });
  }

  private publishStateChange() {
    if (this.formElement == null) {
      return;
    }

    const nextKey = JSON.stringify({
      errors: this.internalErrors,
      validationMode: this.getValidationMode(),
    });

    if (nextKey === this.lastPublishedStateKey) {
      return;
    }
    this.lastPublishedStateKey = nextKey;
    this.formElement.dispatchEvent(new CustomEvent(FORM_STATE_CHANGE_EVENT));
  }

  private validateFields(fieldName?: string, submitAttempted = false) {
    const fields = this.getConnectedFields();

    if (fieldName != null) {
      const namedField = fields.find((f) => f.name === fieldName);
      namedField?.validate(submitAttempted);
      return;
    }

    fields.forEach((f) => f.validate(submitAttempted));
  }

  private getFirstInvalidField() {
    return this.getConnectedFields().find((f) => f.getValidityData().state.valid === false);
  }

  private getConnectedFields() {
    const connected: FormFieldEntry[] = [];
    this.fields.forEach((field, element) => {
      if (!element.isConnected) {
        this.fields.delete(element);
        return;
      }
      connected.push(field);
    });
    return connected;
  }

  private queueFocusInvalidField() {
    if (!this.pendingFocusInvalid || this.pendingFocusQueued) {
      return;
    }
    this.pendingFocusQueued = true;
    queueMicrotask(() => {
      this.pendingFocusQueued = false;
      if (!this.pendingFocusInvalid) {
        return;
      }

      const invalidField = this.getFirstInvalidField();
      const control = invalidField?.getControl() ?? this.getFirstInvalidControlFromDom();
      if (!control) {
        return;
      }

      this.pendingFocusInvalid = false;
      this.focusControl(control);
    });
  }

  private getFirstInvalidControlFromDom() {
    return this.formElement?.querySelector<HTMLElement>('[aria-invalid="true"]') ?? null;
  }

  private focusControl(control: HTMLElement | null) {
    if (!control) {
      return;
    }
    control.focus();
    if (control instanceof HTMLInputElement) {
      control.select();
    }
  }

  private ensureRenderedElement(): HTMLElement {
    if (this.render == null) {
      this.resetRenderedElement();
      this.renderedElement = this;
      return this;
    }

    if (this.renderedElement && this.renderedElement !== this && this.contains(this.renderedElement)) {
      return this.renderedElement;
    }

    const contentNodes =
      this.renderedElement && this.renderedElement !== this
        ? Array.from(this.renderedElement.childNodes)
        : Array.from(this.childNodes).filter((node) => node !== this.renderedElement);
    const renderProps: FormRenderProps = {};
    const template =
      typeof this.render === 'function' ? this.render(renderProps, {}) : this.render;
    const nextRoot = materializeTemplateRoot(template);

    this.style.display = 'contents';
    if (nextRoot !== this) {
      this.replaceChildren(nextRoot);
      nextRoot.append(...contentNodes);
    } else {
      this.resetRenderedElement();
    }

    this.renderedElement = nextRoot;
    return nextRoot;
  }

  private resetRenderedElement() {
    if (this.renderedElement == null || this.renderedElement === this) {
      return;
    }

    const contentNodes = Array.from(this.renderedElement.childNodes);
    this.replaceChildren(...contentNodes);
    this.renderedElement = null;
  }
}

if (!customElements.get('form-root')) {
  customElements.define('form-root', FormRootElement);
}

export const Form = FormRootElement;

// ─── Namespace exports ──────────────────────────────────────────────────────────

export namespace FormRoot {
  export type Props = FormProps;
  export type Actions = FormActions;
  export type State = FormState;
  export type SubmitEventDetails = FormSubmitEventDetails;
  export type SubmitEventReason = FormSubmitEventReason;
  export type ValidationMode = FormValidationMode;
}

export namespace Form {
  export type Props = FormProps;
  export type Actions = FormActions;
  export type State = FormState;
  export type SubmitEventDetails = FormSubmitEventDetails;
  export type SubmitEventReason = FormSubmitEventReason;
  export type ValidationMode = FormValidationMode;
}

function materializeTemplateRoot(template: TemplateResult): HTMLElement {
  const container = document.createElement('div');
  renderTemplate(template, container);

  return (
    Array.from(container.children).find((child): child is HTMLElement => child instanceof HTMLElement) ??
    container
  );
}

// ─── Global type declarations ───────────────────────────────────────────────────

declare global {
  interface HTMLElementTagNameMap {
    'form-root': FormRootElement;
  }
}
