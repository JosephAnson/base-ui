import { BaseHTMLElement } from '../utils/index.ts';
import {
  FORM_CONTEXT_ATTRIBUTE,
  FORM_STATE_CHANGE_EVENT,
  type Errors,
  type FormFieldEntry,
  type FormRuntime,
  type FormValidationMode,
  setFormRuntime,
} from './shared.ts';

// ─── Types ──────────────────────────────────────────────────────────────────────

export type FormSubmitEventReason = 'none';

export interface FormSubmitEventDetails {
  reason: FormSubmitEventReason;
  event: SubmitEvent;
}

export interface FormActions {
  validate: (fieldName?: string) => void;
}

export interface FormState {}

export { type FormValidationMode } from './shared.ts';

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
  private _errors: Errors | undefined;
  get errors(): Errors | undefined {
    return this._errors;
  }
  set errors(value: Errors | undefined) {
    this._syncExternalErrors(value);
  }

  /** Validation mode inherited by child fields. */
  validationMode: FormValidationMode | undefined;

  /** Called on valid submit with collected form values. Prevents native submit. */
  onFormSubmit:
    | ((values: Record<string, unknown>, details: FormSubmitEventDetails) => void)
    | undefined;

  /** Native submit handler. Called after validation passes. */
  onSubmit: ((event: SubmitEvent) => void) | undefined;

  /** Ref object for imperative validation. */
  private _actionsRef: { current: FormActions | null } | undefined;
  get actionsRef(): { current: FormActions | null } | undefined {
    return this._actionsRef;
  }
  set actionsRef(value: { current: FormActions | null } | undefined) {
    this._actionsRef = value;
    if (value != null) {
      value.current = { validate: (name) => this._validateFields(name) };
    }
  }

  // --- Internal state ---

  private _form: HTMLFormElement | null = null;
  private _internalErrors: Errors = {};
  private _externalErrors: Errors | undefined;
  private _fields = new Map<Element, FormFieldEntry>();
  private _submitted = false;
  private _pendingFocusInvalid = false;
  private _pendingFocusQueued = false;
  private _lastPublishedStateKey: string | null = null;

  connectedCallback() {
    this.style.display = 'contents';
    this.setAttribute(FORM_CONTEXT_ATTRIBUTE, '');

    queueMicrotask(() => {
      this._attachForm();
    });
  }

  disconnectedCallback() {
    this._detachForm();
    if (this._actionsRef != null) {
      this._actionsRef.current = null;
    }
    this._fields.clear();
    this._lastPublishedStateKey = null;
  }

  // --- FormRuntime implementation ---

  clearErrors(name: string | undefined) {
    if (name == null || !Object.hasOwn(this._internalErrors, name)) return;
    const next = { ...this._internalErrors };
    delete next[name];
    this._internalErrors = next;
    this._publishStateChange();
  }

  getErrors(): Errors {
    return this._internalErrors;
  }

  getFormValues(): Record<string, unknown> {
    return this._getConnectedFields().reduce(
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
    this._fields.set(element, entry);
    this._queueFocusInvalidField();
  }

  unregisterField(element: Element) {
    this._fields.delete(element);
  }

  // --- Private methods ---

  private _attachForm() {
    const form = this.querySelector('form');
    if (!form || this._form === form) return;

    this._detachForm();
    this._form = form;
    form.noValidate = true;
    setFormRuntime(form, this);
    form.addEventListener('submit', this._handleSubmit);
    this._publishStateChange();
  }

  private _detachForm() {
    if (!this._form) return;
    this._form.removeEventListener('submit', this._handleSubmit);
    setFormRuntime(this._form, null);
    this._form = null;
  }

  private _handleSubmit = (event: SubmitEvent) => {
    this._validateFields(undefined, true);

    const invalidField = this._getFirstInvalidField();
    if (invalidField) {
      event.preventDefault();
      this._focusControl(invalidField.getControl());
      return;
    }

    this._submitted = true;

    this.onSubmit?.(event);

    if (this.onFormSubmit) {
      event.preventDefault();
      this.onFormSubmit(this.getFormValues(), { reason: 'none', event });
    }
  };

  private _syncExternalErrors(nextErrors: Errors | undefined) {
    if (this._externalErrors === nextErrors) return;
    this._externalErrors = nextErrors;
    this._errors = nextErrors;
    this._internalErrors = nextErrors ?? {};
    this._publishStateChange();

    if (!this._submitted) return;
    this._submitted = false;
    queueMicrotask(() => {
      this._pendingFocusInvalid = true;
      this._queueFocusInvalidField();
    });
  }

  private _publishStateChange() {
    if (this._form == null) return;

    const nextKey = JSON.stringify({
      errors: this._internalErrors,
      validationMode: this.getValidationMode(),
    });

    if (nextKey === this._lastPublishedStateKey) return;
    this._lastPublishedStateKey = nextKey;
    this._form.dispatchEvent(new CustomEvent(FORM_STATE_CHANGE_EVENT));
  }

  private _validateFields(fieldName?: string, submitAttempted = false) {
    const fields = this._getConnectedFields();

    if (fieldName != null) {
      const namedField = fields.find((f) => f.name === fieldName);
      namedField?.validate(submitAttempted);
      return;
    }

    fields.forEach((f) => f.validate(submitAttempted));
  }

  private _getFirstInvalidField() {
    return this._getConnectedFields().find(
      (f) => f.getValidityData().state.valid === false,
    );
  }

  private _getConnectedFields() {
    const connected: FormFieldEntry[] = [];
    this._fields.forEach((field, element) => {
      if (!element.isConnected) {
        this._fields.delete(element);
        return;
      }
      connected.push(field);
    });
    return connected;
  }

  private _queueFocusInvalidField() {
    if (!this._pendingFocusInvalid || this._pendingFocusQueued) return;
    this._pendingFocusQueued = true;
    queueMicrotask(() => {
      this._pendingFocusQueued = false;
      if (!this._pendingFocusInvalid) return;

      const invalidField = this._getFirstInvalidField();
      const control =
        invalidField?.getControl() ?? this._getFirstInvalidControlFromDom();
      if (!control) return;

      this._pendingFocusInvalid = false;
      this._focusControl(control);
    });
  }

  private _getFirstInvalidControlFromDom() {
    return (
      this._form?.querySelector<HTMLElement>(
        '[aria-invalid="true"]',
      ) ?? null
    );
  }

  private _focusControl(control: HTMLElement | null) {
    if (!control) return;
    control.focus();
    if (control instanceof HTMLInputElement) {
      control.select();
    }
  }
}

if (!customElements.get('form-root')) {
  customElements.define('form-root', FormRootElement);
}

// ─── Namespace exports ──────────────────────────────────────────────────────────

export namespace FormRoot {
  export type Actions = FormActions;
  export type State = FormState;
  export type SubmitEventDetails = FormSubmitEventDetails;
  export type SubmitEventReason = FormSubmitEventReason;
  export type ValidationMode = FormValidationMode;
}

// ─── Global type declarations ───────────────────────────────────────────────────

declare global {
  interface HTMLElementTagNameMap {
    'form-root': FormRootElement;
  }
}
