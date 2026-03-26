import type { BaseUIChangeEventDetails } from '../types';
import { BaseHTMLElement, ensureId } from '../utils';
import {
  FIELDSET_STATE_CHANGE_EVENT,
  getClosestFieldsetRoot,
  getFieldsetContextFromElement,
} from '../fieldset/shared';
import {
  FORM_STATE_CHANGE_EVENT,
  getFormRuntimeOrNull,
  type FormFieldEntry,
  type FormRuntime,
} from '../form/shared';

// ─── Constants ──────────────────────────────────────────────────────────────────

const FIELD_ROOT_ATTRIBUTE = 'data-base-ui-field-root';
const FIELD_STATE_CHANGE_EVENT = 'base-ui-field-state-change';
const FIELD_RUNTIME = Symbol('base-ui-field-runtime');

const DEFAULT_VALIDITY_STATE: ValidityStateObject = {
  badInput: false,
  customError: false,
  patternMismatch: false,
  rangeOverflow: false,
  rangeUnderflow: false,
  stepMismatch: false,
  tooLong: false,
  tooShort: false,
  typeMismatch: false,
  valid: null,
  valueMissing: false,
};

// ─── Types ──────────────────────────────────────────────────────────────────────

type TransitionStatus = 'starting' | 'ending' | undefined;
type InputLikeElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
type FieldValidationMode = 'onSubmit' | 'onBlur' | 'onChange';
type FieldValidate =
  | ((
      value: unknown,
      formValues: Record<string, unknown>,
    ) => string | string[] | null | Promise<string | string[] | null>)
  | undefined;

type ValidityStateObject = {
  badInput: boolean;
  customError: boolean;
  patternMismatch: boolean;
  rangeOverflow: boolean;
  rangeUnderflow: boolean;
  stepMismatch: boolean;
  tooLong: boolean;
  tooShort: boolean;
  typeMismatch: boolean;
  valid: boolean | null;
  valueMissing: boolean;
};

export interface FieldValidityData {
  state: ValidityStateObject;
  error: string;
  errors: string[];
  value: unknown;
  initialValue: unknown;
}

export interface FieldRootState {
  disabled: boolean;
  touched: boolean;
  dirty: boolean;
  valid: boolean | null;
  filled: boolean;
  focused: boolean;
}

export interface FieldValidityState extends Omit<FieldValidityData, 'state'> {
  validity: FieldValidityData['state'];
  transitionStatus: TransitionStatus;
}

export interface FieldLabelState extends FieldRootState {}
export interface FieldDescriptionState extends FieldRootState {}
export interface FieldErrorState extends FieldRootState {
  transitionStatus: TransitionStatus;
}
export interface FieldControlState extends FieldRootState {}
export interface FieldItemState extends FieldRootState {}

export interface FieldRootActions {
  validate: () => void;
}

export interface FieldRootProps {
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Identifies the field when a form is submitted.
   */
  name?: string | undefined;
  /**
   * A function for custom validation.
   */
  validate?: FieldValidate;
  /**
   * Determines when the field should be validated.
   * @default 'onSubmit'
   */
  validationMode?: FieldValidationMode | undefined;
  /**
   * How long to wait between validation callbacks in `onChange` mode.
   * Specified in milliseconds.
   * @default 0
   */
  validationDebounceTime?: number | undefined;
  /**
   * Whether the field is invalid.
   */
  invalid?: boolean | undefined;
  /**
   * Whether the field's value has changed from its initial value.
   */
  dirty?: boolean | undefined;
  /**
   * Whether the field has been touched.
   */
  touched?: boolean | undefined;
  /**
   * A ref to imperative actions.
   */
  actionsRef?: { current: FieldRootActions | null } | undefined;
}

export interface FieldLabelProps {}

export interface FieldDescriptionProps {}

export interface FieldErrorProps {}

export type FieldControlChangeEventReason = 'none';

export type FieldControlChangeEventDetails =
  BaseUIChangeEventDetails<FieldControlChangeEventReason>;

export interface FieldControlProps {
  /**
   * Callback fired when the `value` changes.
   */
  onValueChange?:
    | ((value: string, eventDetails: FieldControlChangeEventDetails) => void)
    | undefined;
  /**
   * The default value of the input.
   */
  defaultValue?: string | number | readonly string[] | undefined;
}

export interface FieldValidityProps {
  /**
   * Render function that receives validity state.
   */
  renderValidity?: ((state: FieldValidityState) => unknown) | undefined;
}

export interface FieldItemProps {
  /**
   * Whether interaction with the wrapped control should be blocked.
   * @default false
   */
  disabled?: boolean | undefined;
}

interface FieldRuntime {
  getFieldState(): FieldRootState;
  getValidityState(): FieldValidityState;
  getValidationData(): FieldValidityData;
  getFormError(): string | string[] | null;
  getControlTargets(): { focusTarget: HTMLElement | null; validityTarget: InputLikeElement | null };
  registerControl(element: HTMLElement | null): void;
  unregisterControl(element: HTMLElement | null): void;
  registerLabel(id: string): void;
  unregisterLabel(id: string): void;
  registerDescription(id: string): void;
  unregisterDescription(id: string): void;
  registerError(id: string, rendered: boolean): void;
  unregisterError(id: string): void;
  setErrorRendered(id: string, rendered: boolean): void;
  handleControlFocus(): void;
  handleControlBlur(element: InputLikeElement): void;
  handleControlInput(element: InputLikeElement, currentValue: unknown, nativeEvent: Event): void;
  syncAssociations(): void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function isInputLikeElement(element: Element | null): element is InputLikeElement {
  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  );
}

function readValidityState(element: InputLikeElement | null): ValidityStateObject {
  if (element == null) return { ...DEFAULT_VALIDITY_STATE };
  return {
    badInput: element.validity.badInput,
    customError: element.validity.customError,
    patternMismatch: element.validity.patternMismatch,
    rangeOverflow: element.validity.rangeOverflow,
    rangeUnderflow: element.validity.rangeUnderflow,
    stepMismatch: element.validity.stepMismatch,
    tooLong: element.validity.tooLong,
    tooShort: element.validity.tooShort,
    typeMismatch: element.validity.typeMismatch,
    valid: element.validity.valid,
    valueMissing: element.validity.valueMissing,
  };
}

function getElementValue(element: InputLikeElement | null): unknown {
  if (element == null) return null;
  if (element instanceof HTMLSelectElement && element.multiple) {
    return Array.from(element.selectedOptions).map((option) => option.value);
  }
  if (element instanceof HTMLInputElement) {
    if (element.type === 'checkbox' || element.type === 'radio') {
      return element.checked ? element.value || 'on' : '';
    }
  }
  return element.value;
}

function isElementFilled(element: InputLikeElement | null) {
  if (element == null) return false;
  if (element instanceof HTMLSelectElement && element.multiple) {
    return element.selectedOptions.length > 0;
  }
  if (element instanceof HTMLInputElement) {
    if (element.type === 'checkbox' || element.type === 'radio') {
      return element.checked;
    }
  }
  return element.value !== '';
}

function stringifyFieldControlValue(value: string | number | readonly string[]) {
  return Array.isArray(value) ? value.join(',') : String(value);
}

function syncFieldPartStateAttributes(element: HTMLElement, state: FieldRootState) {
  element.toggleAttribute('data-disabled', state.disabled);
  element.toggleAttribute('data-touched', state.touched);
  element.toggleAttribute('data-dirty', state.dirty);
  element.toggleAttribute('data-focused', state.focused);
  element.toggleAttribute('data-filled', state.filled);

  if (state.valid === true) {
    element.setAttribute('data-valid', '');
    element.removeAttribute('data-invalid');
  } else if (state.valid === false) {
    element.removeAttribute('data-valid');
    element.setAttribute('data-invalid', '');
  } else {
    element.removeAttribute('data-valid');
    element.removeAttribute('data-invalid');
  }
}

function createFieldControlChangeEventDetails(
  event: Event,
  trigger: Element | undefined,
): FieldControlChangeEventDetails {
  let canceled = false;
  let propagationAllowed = false;

  return {
    reason: 'none',
    event,
    trigger,
    cancel() {
      canceled = true;
    },
    allowPropagation() {
      propagationAllowed = true;
    },
    get isCanceled() {
      return canceled;
    },
    get isPropagationAllowed() {
      return propagationAllowed;
    },
  };
}

function hasOnlyValueMissing(state: ValidityStateObject) {
  if (state.valid || !state.valueMissing) return false;
  const keys = Object.keys(DEFAULT_VALIDITY_STATE) as Array<keyof ValidityStateObject>;
  for (const key of keys) {
    if (key === 'valid' || key === 'valueMissing') continue;
    if (state[key]) return false;
  }
  return true;
}

function setFieldRuntime(root: HTMLElement | null, runtime: FieldRuntime | null) {
  if (root == null) return;
  const rootWithRuntime = root as HTMLElement & { [FIELD_RUNTIME]?: FieldRuntime };
  if (runtime == null) {
    delete rootWithRuntime[FIELD_RUNTIME];
    return;
  }
  rootWithRuntime[FIELD_RUNTIME] = runtime;
}

function getFieldRuntime(root: Element | null): FieldRuntime | null {
  if (!(root instanceof HTMLElement)) return null;
  return (root as HTMLElement & { [FIELD_RUNTIME]?: FieldRuntime })[FIELD_RUNTIME] ?? null;
}

// ─── FieldRootElement ────────────────────────────────────────────────────────────

/**
 * Groups all parts of the field.
 * Renders a `<field-root>` custom element.
 *
 * Documentation: [Base UI Field](https://base-ui.com/react/components/field)
 */
export class FieldRootElement extends BaseHTMLElement implements FieldRuntime {
  static get observedAttributes() {
    return ['disabled', 'validation-mode'];
  }

  /** Whether the field is disabled. */
  disabled = false;

  /** Validation mode: 'onSubmit' (default), 'onBlur', 'onChange'. */
  validationMode: FieldValidationMode | undefined;

  /** Validation function. Set via `.validate=${fn}`. */
  validate: FieldValidate;

  /** Field name for form integration. */
  name: string | undefined;

  /** How long to wait between validation callbacks in `onChange` mode. */
  validationDebounceTime = 0;

  /** Whether the field is invalid. */
  invalid: boolean | undefined;

  /** Controlled dirty state. */
  dirty: boolean | undefined;

  /** Controlled touched state. */
  touched: boolean | undefined;

  private actionsRefValue: { current: FieldRootActions | null } | undefined;
  get actionsRef(): { current: FieldRootActions | null } | undefined {
    return this.actionsRefValue;
  }
  set actionsRef(value: { current: FieldRootActions | null } | undefined) {
    if (this.actionsRefValue != null && this.actionsRefValue.current === this.fieldActions) {
      this.actionsRefValue.current = null;
    }

    this.actionsRefValue = value;
    if (value != null) {
      value.current = this.fieldActions;
    }
  }

  private readonly fieldActions: FieldRootActions = {
    validate: () => this.validateCurrentControl(),
  };

  private _controlElement: HTMLElement | null = null;
  private _labelIds = new Set<string>();
  private _descriptionIds = new Set<string>();
  private _errorIds = new Map<string, boolean>();
  private _fieldsetRoot: Element | null = null;
  private _validityData: FieldValidityData = {
    state: { ...DEFAULT_VALIDITY_STATE },
    error: '',
    errors: [],
    value: null,
    initialValue: null,
  };
  private _touched = false;
  private _dirty = false;
  private _filled = false;
  private _focused = false;
  private _submitAttempted = false;
  private _markedDirty = false;
  private _lastPublishedStateKey: string | null = null;
  private _domSyncQueued = false;
  private _form: HTMLFormElement | null = null;
  private _formRuntime: FormRuntime | null = null;
  private _disabledCaptureCleanup: (() => void) | null = null;
  private _validationTimeoutId: number | null = null;

  connectedCallback() {
    this.setAttribute(FIELD_ROOT_ATTRIBUTE, '');
    setFieldRuntime(this, this);

    // Fieldset integration
    const fieldsetRoot = getClosestFieldsetRoot(this);
    this._syncFieldsetRoot(fieldsetRoot);

    // Form integration
    this._syncFormOwner();

    // Disabled capture
    this._syncDisabledCapture();

    // Event delegation for auto-detected controls
    this.addEventListener('focusin', this._handleFocusIn);
    this.addEventListener('focusout', this._handleFocusOut);
    this.addEventListener('input', this._handleInput);
    this.addEventListener('change', this._handleChange);
    this.addEventListener('keydown', this._handleKeyDown);

    this._scheduleDomSync();
  }

  disconnectedCallback() {
    this.removeEventListener('focusin', this._handleFocusIn);
    this.removeEventListener('focusout', this._handleFocusOut);
    this.removeEventListener('input', this._handleInput);
    this.removeEventListener('change', this._handleChange);
    this.removeEventListener('keydown', this._handleKeyDown);

    if (this.actionsRefValue != null) {
      this.actionsRefValue.current = null;
    }
    this._clearPendingValidation();
    this._detachForm();
    this._syncFieldsetRoot(null);
    this._disabledCaptureCleanup?.();
    this._disabledCaptureCleanup = null;
    setFieldRuntime(this, null);
    this._controlElement = null;
    this._labelIds.clear();
    this._descriptionIds.clear();
    this._errorIds.clear();
    this._lastPublishedStateKey = null;
  }

  attributeChangedCallback(name: string) {
    if (name === 'disabled') {
      this.disabled = this.hasAttribute('disabled');
      this._syncDisabledCapture();
      this._syncStateAttributes();
      this._publishStateChange();
    }
    if (name === 'validation-mode') {
      this.validationMode =
        (this.getAttribute('validation-mode') as FieldValidationMode | undefined) ?? undefined;
    }
  }

  // ─── FieldRuntime implementation ───────────────────────────────────────────

  getFieldState(): FieldRootState {
    const disabled = this.disabled || this._getFieldsetContext()?.disabled === true;
    const touched = this.touched ?? this._touched;
    const dirty = this.dirty ?? this._dirty;
    const valid = this.invalid === true ? false : this._validityData.state.valid;

    return {
      disabled,
      dirty,
      filled: this._filled,
      focused: this._focused,
      touched,
      valid,
    };
  }

  getValidityState(): FieldValidityState {
    return {
      ...this._validityData,
      validity: this._validityData.state,
      transitionStatus: undefined,
    };
  }

  getValidationData(): FieldValidityData {
    return this._validityData;
  }

  getFormError(): string | string[] | null {
    const name = this.name ?? this.getControlTargets().validityTarget?.name ?? undefined;
    if (name == null) return null;
    const errors = this._formRuntime?.getErrors();
    return errors != null && Object.hasOwn(errors, name) ? errors[name] : null;
  }

  getControlTargets() {
    if (this._controlElement != null && this.contains(this._controlElement)) {
      return {
        focusTarget: this._controlElement,
        validityTarget: isInputLikeElement(this._controlElement)
          ? this._controlElement
          : (this._controlElement.querySelector(
              'input, textarea, select',
            ) as InputLikeElement | null),
      };
    }

    // Auto-detect the first input-like element inside the root
    const input = this.querySelector(
      'input:not([type="hidden"]):not([type="submit"]):not([type="reset"]):not([type="button"]):not([aria-hidden="true"]), textarea, select',
    ) as InputLikeElement | null;

    return {
      focusTarget: input as HTMLElement | null,
      validityTarget: input,
    };
  }

  registerControl(element: HTMLElement | null) {
    if (element == null) return;
    this._controlElement = element;
    this._captureInitialValue();
    this._scheduleDomSync();
  }

  unregisterControl(element: HTMLElement | null) {
    if (this._controlElement === element) {
      this._controlElement = null;
      this._scheduleDomSync();
    }
  }

  registerLabel(id: string) {
    this._labelIds.add(id);
    this._scheduleDomSync();
  }

  unregisterLabel(id: string) {
    if (this._labelIds.delete(id)) {
      this._scheduleDomSync();
    }
  }

  registerDescription(id: string) {
    this._descriptionIds.add(id);
    this._scheduleDomSync();
  }

  unregisterDescription(id: string) {
    if (this._descriptionIds.delete(id)) {
      this._scheduleDomSync();
    }
  }

  registerError(id: string, rendered: boolean) {
    this._errorIds.set(id, rendered);
    this._scheduleDomSync();
  }

  unregisterError(id: string) {
    if (this._errorIds.delete(id)) {
      this._scheduleDomSync();
    }
  }

  setErrorRendered(id: string, rendered: boolean) {
    if (this._errorIds.get(id) === rendered) return;
    this._errorIds.set(id, rendered);
    this._scheduleDomSync();
  }

  handleControlFocus() {
    if (this._focused) return;
    this._focused = true;
    this._publishStateChange();
  }

  handleControlBlur(element: InputLikeElement) {
    this._clearPendingValidation();
    this._focused = false;
    this._touched = true;
    this._publishStateChange();

    if (this._getValidationMode() === 'onBlur') {
      void this._commit(getElementValue(element));
    }
  }

  handleControlInput(element: InputLikeElement, currentValue: unknown, _nativeEvent: Event) {
    this._captureInitialValue();
    this._updateFieldValueState(element, currentValue);
    this._formRuntime?.clearErrors(this.name);

    const shouldValidateOnChange = this._shouldValidateOnChange();

    if (!shouldValidateOnChange) {
      this._clearPendingValidation();
      if (this.getFieldState().valid === false) {
        void this._commit(currentValue, true);
      }
      return;
    }

    if (this.validationDebounceTime > 0) {
      this._scheduleValidationCommit(currentValue);
      return;
    }

    void this._commit(currentValue);
  }

  syncAssociations() {
    const { focusTarget } = this.getControlTargets();
    if (focusTarget == null) return;

    const messageIds = this._getMessageIds();
    if (messageIds.length > 0) {
      focusTarget.setAttribute('aria-describedby', messageIds.join(' '));
    } else {
      focusTarget.removeAttribute('aria-describedby');
    }

    // Ensure control has an ID for label association
    ensureId(focusTarget, 'base-ui-field-control');

    // Wire up label association
    for (const labelId of this._labelIds) {
      const labelEl = this.querySelector(`#${CSS.escape(labelId)}`);
      if (labelEl instanceof HTMLLabelElement) {
        labelEl.htmlFor = focusTarget.id;
      }
    }
  }

  // ─── Private methods ──────────────────────────────────────────────────────

  private _handleFocusIn = (event: FocusEvent) => {
    const { focusTarget } = this.getControlTargets();
    if (event.target === focusTarget && !this._focused) {
      this._focused = true;
      this._publishStateChange();
    }
  };

  private _handleFocusOut = (event: FocusEvent) => {
    if (this.contains(event.relatedTarget as Node | null)) return;

    const { focusTarget, validityTarget } = this.getControlTargets();
    if (event.target === focusTarget) {
      this._focused = false;
      this._touched = true;
      this._publishStateChange();

      if (validityTarget != null && this._getValidationMode() === 'onBlur') {
        void this._commit(getElementValue(validityTarget));
      }
    }
  };

  private _handleInput = (event: Event) => {
    const { validityTarget } = this.getControlTargets();
    if (event.target === validityTarget && validityTarget != null) {
      this.handleControlInput(validityTarget, getElementValue(validityTarget), event);
    }
  };

  private _handleChange = (event: Event) => {
    const { validityTarget } = this.getControlTargets();
    if (event.target === validityTarget && validityTarget != null) {
      this.handleControlInput(validityTarget, getElementValue(validityTarget), event);
    }
  };

  private _handleKeyDown = (event: KeyboardEvent) => {
    const { validityTarget } = this.getControlTargets();
    if (
      event.target === validityTarget &&
      validityTarget instanceof HTMLInputElement &&
      event.key === 'Enter'
    ) {
      this._touched = true;
      this._publishStateChange();
      void this._commit(getElementValue(validityTarget));
    }
  };

  private _getMessageIds() {
    return Array.from(this._descriptionIds).concat(
      Array.from(this._errorIds.entries())
        .filter(([, rendered]) => rendered)
        .map(([id]) => id),
    );
  }

  private _syncStateAttributes() {
    syncFieldPartStateAttributes(this, this.getFieldState());
  }

  private _publishStateChange() {
    this._syncStateAttributes();

    const nextStateKey = JSON.stringify({
      descriptions: Array.from(this._descriptionIds),
      errors: Array.from(this._errorIds.entries()),
      fieldState: this.getFieldState(),
      validity: this.getValidityState(),
    });

    if (nextStateKey === this._lastPublishedStateKey) return;

    this._lastPublishedStateKey = nextStateKey;
    this.dispatchEvent(new CustomEvent(FIELD_STATE_CHANGE_EVENT));
  }

  private _scheduleDomSync() {
    if (this._domSyncQueued) return;
    this._domSyncQueued = true;
    queueMicrotask(() => {
      this._domSyncQueued = false;
      this._syncFormOwner();
      this._syncFormRegistration();
      this.syncAssociations();
      this._publishStateChange();
    });
  }

  private _clearPendingValidation() {
    if (this._validationTimeoutId == null) {
      return;
    }

    clearTimeout(this._validationTimeoutId);
    this._validationTimeoutId = null;
  }

  private _scheduleValidationCommit(value: unknown) {
    this._clearPendingValidation();
    this._validationTimeoutId = window.setTimeout(() => {
      this._validationTimeoutId = null;
      void this._commit(value);
    }, this.validationDebounceTime);
  }

  private _captureInitialValue() {
    if (this._validityData.initialValue !== null) return;
    const { validityTarget } = this.getControlTargets();
    const initialValue = getElementValue(validityTarget);
    if (initialValue !== null) {
      this._validityData = { ...this._validityData, initialValue };
    }
  }

  private _updateFieldValueState(element: InputLikeElement, currentValue: unknown) {
    const initialValue = this._validityData.initialValue;
    this._dirty = currentValue !== initialValue;
    this._markedDirty = this._markedDirty || currentValue !== initialValue;
    this._filled = isElementFilled(element);
    this._validityData = {
      ...this._validityData,
      value: currentValue,
      state: readValidityState(element),
    };
    this._publishStateChange();
  }

  private _shouldValidateOnChange() {
    const mode = this._getValidationMode();
    return mode === 'onChange' || (mode === 'onSubmit' && this._submitAttempted);
  }

  private _getValidationMode() {
    return this.validationMode ?? this._formRuntime?.getValidationMode() ?? 'onSubmit';
  }

  private _getFieldsetContext() {
    if (this._fieldsetRoot == null) return null;
    return getFieldsetContextFromElement(this._fieldsetRoot);
  }

  private _syncFieldsetRoot(element: Element | null) {
    if (this._fieldsetRoot === element) return;
    this._fieldsetRoot?.removeEventListener(
      FIELDSET_STATE_CHANGE_EVENT,
      this._handleFieldsetStateChange,
    );
    this._fieldsetRoot = element;
    this._fieldsetRoot?.addEventListener(
      FIELDSET_STATE_CHANGE_EVENT,
      this._handleFieldsetStateChange,
    );
  }

  private _handleFieldsetStateChange = () => {
    this._syncDisabledCapture();
    this._syncStateAttributes();
    this._publishStateChange();
  };

  private _syncFormOwner() {
    const { validityTarget } = this.getControlTargets();
    const nextForm = validityTarget?.form ?? this.closest('form') ?? null;
    const nextFormRuntime = getFormRuntimeOrNull(nextForm);

    if (this._form === nextForm && this._formRuntime === nextFormRuntime) return;

    this._detachForm();
    this._form = nextForm;
    this._formRuntime = nextFormRuntime;

    if (this._formRuntime == null) {
      this._form?.addEventListener('submit', this._handleFormSubmit);
      return;
    }

    this._form?.addEventListener(FORM_STATE_CHANGE_EVENT, this._handleFormStateChange);
  }

  private _detachForm() {
    this._form?.removeEventListener('submit', this._handleFormSubmit);
    this._form?.removeEventListener(FORM_STATE_CHANGE_EVENT, this._handleFormStateChange);
    if (this._formRuntime != null) {
      this._formRuntime.unregisterField(this);
    }
    this._formRuntime = null;
    this._form = null;
  }

  private _handleFormSubmit = () => {
    this._clearPendingValidation();
    this._submitAttempted = true;
    this._markedDirty = true;
    const { validityTarget } = this.getControlTargets();
    void this._commit(getElementValue(validityTarget));
  };

  private _handleFormStateChange = () => {
    // Force re-publish so field-error can pick up changed form errors
    this._lastPublishedStateKey = null;
    this._publishStateChange();
  };

  private _syncFormRegistration() {
    if (this._formRuntime == null) return;

    const entry: FormFieldEntry = {
      name: this.name ?? this.getControlTargets().validityTarget?.name ?? undefined,
      getControl: () => this.getControlTargets().focusTarget,
      getValue: () => getElementValue(this.getControlTargets().validityTarget),
      getValidityData: () => this._validityData,
      validate: (submitAttempted = true) => this._validateCurrentControl(submitAttempted),
    };

    this._formRuntime.registerField(this, entry);
  }

  private _syncDisabledCapture() {
    this._disabledCaptureCleanup?.();
    this._disabledCaptureCleanup = null;

    if (!this.getFieldState().disabled) return;

    const stopInteraction = (event: Event) => {
      if (event.target === this) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      event.stopPropagation();
    };

    const events: Array<keyof HTMLElementEventMap> = [
      'click',
      'change',
      'input',
      'keydown',
      'keyup',
    ];
    events.forEach((eventName) => {
      this.addEventListener(eventName, stopInteraction, true);
    });

    this._disabledCaptureCleanup = () => {
      events.forEach((eventName) => {
        this.removeEventListener(eventName, stopInteraction, true);
      });
    };
  }

  private async _commit(value: unknown, revalidate = false) {
    const { validityTarget } = this.getControlTargets();
    if (validityTarget == null) return;

    if (revalidate && this.getFieldState().valid !== false) return;

    let nextState = readValidityState(validityTarget);

    if (revalidate) {
      if (!nextState.valueMissing) {
        validityTarget.setCustomValidity('');
        this._validityData = {
          value,
          state: { ...DEFAULT_VALIDITY_STATE, valid: true },
          error: '',
          errors: [],
          initialValue: this._validityData.initialValue,
        };
        this._publishStateChange();
        return;
      }
      if (!nextState.valid && !hasOnlyValueMissing(nextState)) return;
    }

    if (nextState.valueMissing && !this._markedDirty) {
      nextState = { ...nextState, valid: true, valueMissing: false };
    }

    let result: string | string[] | null = null;
    let validationErrors: string[] = [];
    let defaultValidationMessage = '';
    const validateOnChange = this._shouldValidateOnChange();

    if (validityTarget.validationMessage && !validateOnChange) {
      defaultValidationMessage = validityTarget.validationMessage;
      validationErrors = [validityTarget.validationMessage];
    } else {
      const validateFn = this.validate ?? (() => null);
      const formValues = this._getFormValues();
      const resultOrPromise = validateFn(value, formValues);

      result =
        typeof resultOrPromise === 'object' && resultOrPromise !== null && 'then' in resultOrPromise
          ? await resultOrPromise
          : resultOrPromise;

      if (result !== null) {
        nextState = { ...nextState, valid: false, customError: true };
        if (Array.isArray(result)) {
          validationErrors = result;
          validityTarget.setCustomValidity(result.join('\n'));
        } else if (result) {
          validationErrors = [result];
          validityTarget.setCustomValidity(result);
        }
      } else if (validateOnChange) {
        validityTarget.setCustomValidity('');
        nextState = { ...nextState, customError: false };
        if (validityTarget.validationMessage) {
          defaultValidationMessage = validityTarget.validationMessage;
          validationErrors = [validityTarget.validationMessage];
        } else if (validityTarget.validity.valid && nextState.valid === false) {
          nextState = { ...nextState, valid: true };
        }
      } else {
        validityTarget.setCustomValidity('');
      }
    }

    this._validityData = {
      value,
      state: nextState,
      error:
        defaultValidationMessage || (Array.isArray(result) ? (result[0] ?? '') : (result ?? '')),
      errors: validationErrors,
      initialValue: this._validityData.initialValue,
    };

    this._publishStateChange();
  }

  private _validateCurrentControl(submitAttempted = true) {
    this._clearPendingValidation();
    this._markedDirty = true;
    if (submitAttempted) this._submitAttempted = true;
    const { validityTarget } = this.getControlTargets();
    void this._commit(getElementValue(validityTarget));
  }

  private validateCurrentControl() {
    this._validateCurrentControl();
  }

  private _getFormValues(): Record<string, unknown> {
    if (this._formRuntime != null) return this._formRuntime.getFormValues();
    const form = this._form;
    if (form == null) return {};
    const formData = new FormData(form);
    const result: Record<string, unknown> = {};
    formData.forEach((value, key) => {
      if (Object.hasOwn(result, key)) {
        const currentValue = result[key];
        if (Array.isArray(currentValue)) {
          currentValue.push(value);
        } else {
          result[key] = [currentValue, value];
        }
      } else {
        result[key] = value;
      }
    });
    return result;
  }
}

if (!customElements.get('field-root')) {
  customElements.define('field-root', FieldRootElement);
}

// ─── FieldControlElement ─────────────────────────────────────────────────────────

/**
 * The form control for the field.
 * Renders a `<field-control>` custom element with an `<input>` inside.
 *
 * Documentation: [Base UI Field](https://base-ui.com/react/components/field)
 */
export class FieldControlElement extends BaseHTMLElement {
  private _root: FieldRootElement | null = null;
  private _input: HTMLInputElement | null = null;
  private _handler = () => this._syncAttributes();

  /** Callback fired when the `value` changes. Set via `.onValueChange=${fn}`. */
  onValueChange:
    | ((value: string, eventDetails: FieldControlChangeEventDetails) => void)
    | undefined;

  /** Default value for the generated input. */
  defaultValue: string | number | readonly string[] | undefined;

  connectedCallback() {
    this.style.display = 'contents';
    this._root = this.closest('field-root') as FieldRootElement | null;

    // Create input if not already present
    if (!this._input) {
      this._input = document.createElement('input');
      this._input.type = 'text';
      this.appendChild(this._input);
    }

    if (this.defaultValue !== undefined && this._input.value === '') {
      const defaultValue = stringifyFieldControlValue(this.defaultValue);
      this._input.defaultValue = defaultValue;
      this._input.value = defaultValue;
    }

    this._input.addEventListener('input', this._handleInput);

    if (this._root) {
      this._root.registerControl(this._input);
      this._root.addEventListener(FIELD_STATE_CHANGE_EVENT, this._handler);
    }

    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this._input?.removeEventListener('input', this._handleInput);
    if (this._root) {
      this._root.unregisterControl(this._input);
      this._root.removeEventListener(FIELD_STATE_CHANGE_EVENT, this._handler);
    }
    this._root = null;
  }

  private _handleInput = (event: Event) => {
    if (!this._input) {
      return;
    }

    this.onValueChange?.(
      this._input.value,
      createFieldControlChangeEventDetails(event, this._input),
    );
  };

  private _syncAttributes() {
    if (!this._root || !this._input) return;
    const state = this._root.getFieldState();

    this._input.disabled = state.disabled;
    syncFieldPartStateAttributes(this, state);
    syncFieldPartStateAttributes(this._input, state);

    if (state.valid === false) {
      this._input.setAttribute('aria-invalid', 'true');
    } else {
      this._input.removeAttribute('aria-invalid');
    }
  }
}

if (!customElements.get('field-control')) {
  customElements.define('field-control', FieldControlElement);
}

// ─── FieldLabelElement ───────────────────────────────────────────────────────────

/**
 * An accessible label that is automatically associated with the field control.
 * Renders a `<field-label>` custom element.
 *
 * Documentation: [Base UI Field](https://base-ui.com/react/components/field)
 */
export class FieldLabelElement extends BaseHTMLElement {
  private _root: FieldRootElement | null = null;
  private _handler = () => this._syncAttributes();

  connectedCallback() {
    this._root = this.closest('field-root') as FieldRootElement | null;

    ensureId(this, 'base-ui-field-label');

    if (this._root) {
      this._root.registerLabel(this.id);
      this._root.addEventListener(FIELD_STATE_CHANGE_EVENT, this._handler);
    }

    // Click handler: focus the control when label is clicked
    this.addEventListener('click', this._handleClick);

    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    if (this._root) {
      this._root.unregisterLabel(this.id);
      this._root.removeEventListener(FIELD_STATE_CHANGE_EVENT, this._handler);
    }
    this.removeEventListener('click', this._handleClick);
    this._root = null;
  }

  private _handleClick = () => {
    if (!this._root) return;
    const { focusTarget } = this._root.getControlTargets();
    focusTarget?.focus();
  };

  private _syncAttributes() {
    if (!this._root) return;
    syncFieldPartStateAttributes(this, this._root.getFieldState());
  }
}

if (!customElements.get('field-label')) {
  customElements.define('field-label', FieldLabelElement);
}

// ─── FieldDescriptionElement ─────────────────────────────────────────────────────

/**
 * A paragraph with additional information about the field.
 * Renders a `<field-description>` custom element.
 *
 * Documentation: [Base UI Field](https://base-ui.com/react/components/field)
 */
export class FieldDescriptionElement extends BaseHTMLElement {
  private _root: FieldRootElement | null = null;
  private _handler = () => this._syncAttributes();

  connectedCallback() {
    this._root = this.closest('field-root') as FieldRootElement | null;

    ensureId(this, 'base-ui-field-description');

    if (this._root) {
      this._root.registerDescription(this.id);
      this._root.addEventListener(FIELD_STATE_CHANGE_EVENT, this._handler);
    }

    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    if (this._root) {
      this._root.unregisterDescription(this.id);
      this._root.removeEventListener(FIELD_STATE_CHANGE_EVENT, this._handler);
    }
    this._root = null;
  }

  private _syncAttributes() {
    if (!this._root) {
      return;
    }

    syncFieldPartStateAttributes(this, this._root.getFieldState());
  }
}

if (!customElements.get('field-description')) {
  customElements.define('field-description', FieldDescriptionElement);
}

// ─── FieldErrorElement ───────────────────────────────────────────────────────────

/**
 * An error message displayed if the field control fails validation.
 * Renders a `<field-error>` custom element.
 *
 * Documentation: [Base UI Field](https://base-ui.com/react/components/field)
 */
export class FieldErrorElement extends BaseHTMLElement {
  private _root: FieldRootElement | null = null;
  private _handler = () => this._syncVisibility();
  private _syncing = false;

  connectedCallback() {
    this._root = this.closest('field-root') as FieldRootElement | null;

    ensureId(this, 'base-ui-field-error');

    if (this._root) {
      this._root.registerError(this.id, false);
      this._root.addEventListener(FIELD_STATE_CHANGE_EVENT, this._handler);
    }

    queueMicrotask(() => this._syncVisibility());
  }

  disconnectedCallback() {
    if (this._root) {
      this._root.unregisterError(this.id);
      this._root.removeEventListener(FIELD_STATE_CHANGE_EVENT, this._handler);
    }
    this._root = null;
  }

  private _syncVisibility() {
    if (!this._root || this._syncing) return;
    this._syncing = true;

    try {
      const validityData = this._root.getValidationData();
      const formError = this._root.getFormError();
      const fieldState = this._root.getFieldState();

      const shouldShow = formError != null || fieldState.valid === false;

      if (shouldShow) {
        this.removeAttribute('hidden');
        this.style.display = '';

        // Set content from error messages
        const content =
          formError != null
            ? Array.isArray(formError)
              ? formError.join(', ')
              : formError
            : validityData.errors.length > 0
              ? validityData.errors.join(', ')
              : validityData.error;

        if (content && !this.hasChildNodes()) {
          this.textContent = content;
        } else if (
          content &&
          this.childNodes.length === 1 &&
          this.firstChild?.nodeType === Node.TEXT_NODE
        ) {
          this.textContent = content;
        }

        this._root.setErrorRendered(this.id, true);
      } else {
        this.setAttribute('hidden', '');
        this.style.display = 'none';
        this._root.setErrorRendered(this.id, false);
      }

      syncFieldPartStateAttributes(this, fieldState);
    } finally {
      this._syncing = false;
    }
  }
}

if (!customElements.get('field-error')) {
  customElements.define('field-error', FieldErrorElement);
}

// ─── FieldValidityElement ────────────────────────────────────────────────────────

/**
 * Used to display a custom message based on the field's validity.
 * Renders a `<field-validity>` custom element.
 *
 * Documentation: [Base UI Field](https://base-ui.com/react/components/field)
 */
export class FieldValidityElement extends BaseHTMLElement {
  /** Render function that receives validity state. Set via `.renderValidity=${fn}`. */
  renderValidity: ((state: FieldValidityState) => unknown) | undefined;

  private _root: FieldRootElement | null = null;
  private _handler = () => this._sync();

  connectedCallback() {
    this._root = this.closest('field-root') as FieldRootElement | null;

    if (this._root) {
      this._root.addEventListener(FIELD_STATE_CHANGE_EVENT, this._handler);
    }

    queueMicrotask(() => this._sync());
  }

  disconnectedCallback() {
    if (this._root) {
      this._root.removeEventListener(FIELD_STATE_CHANGE_EVENT, this._handler);
    }
    this._root = null;
  }

  private _sync() {
    if (!this._root) {
      return;
    }

    syncFieldPartStateAttributes(this, this._root.getFieldState());
    if (!this.renderValidity) {
      return;
    }

    const validityState = this._root.getValidityState();
    this.renderValidity(validityState);
  }
}

if (!customElements.get('field-validity')) {
  customElements.define('field-validity', FieldValidityElement);
}

// ─── FieldItemElement ────────────────────────────────────────────────────────────

/**
 * Groups individual items in a checkbox group or radio group.
 * Renders a `<field-item>` custom element.
 *
 * Documentation: [Base UI Field](https://base-ui.com/react/components/field)
 */
export class FieldItemElement extends BaseHTMLElement {
  static get observedAttributes() {
    return ['disabled'];
  }

  disabled = false;

  private _captureCleanup: (() => void) | null = null;
  private _root: FieldRootElement | null = null;
  private _handler = () => this._syncAttributes();

  connectedCallback() {
    this.disabled = this.hasAttribute('disabled');
    this._root = this.closest('field-root') as FieldRootElement | null;
    this._root?.addEventListener(FIELD_STATE_CHANGE_EVENT, this._handler);
    this._syncDisabledCapture();
    this._syncAttributes();
  }

  disconnectedCallback() {
    this._captureCleanup?.();
    this._captureCleanup = null;
    this._root?.removeEventListener(FIELD_STATE_CHANGE_EVENT, this._handler);
    this._root = null;
  }

  attributeChangedCallback() {
    this.disabled = this.hasAttribute('disabled');
    this._syncDisabledCapture();
    this._syncAttributes();
  }

  private _syncDisabledCapture() {
    this._captureCleanup?.();
    this._captureCleanup = null;

    if (!this.disabled) return;

    const stopInteraction = (event: Event) => {
      if (event.target === this) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    };

    const events: Array<keyof HTMLElementEventMap> = [
      'click',
      'change',
      'input',
      'keydown',
      'keyup',
    ];
    events.forEach((eventName) => {
      this.addEventListener(eventName, stopInteraction, true);
    });

    this._captureCleanup = () => {
      events.forEach((eventName) => {
        this.removeEventListener(eventName, stopInteraction, true);
      });
    };
  }

  private _syncAttributes() {
    const state = this._root?.getFieldState() ?? {
      disabled: false,
      touched: false,
      dirty: false,
      valid: null,
      filled: false,
      focused: false,
    };

    syncFieldPartStateAttributes(this, {
      ...state,
      disabled: state.disabled || this.disabled,
    });
  }
}

if (!customElements.get('field-item')) {
  customElements.define('field-item', FieldItemElement);
}

// ─── Namespace exports ──────────────────────────────────────────────────────────

export const Field = {
  Root: FieldRootElement,
  Label: FieldLabelElement,
  Control: FieldControlElement,
  Description: FieldDescriptionElement,
  Error: FieldErrorElement,
  Validity: FieldValidityElement,
  Item: FieldItemElement,
} as const;

export namespace FieldRoot {
  export type Actions = FieldRootActions;
  export type Props = FieldRootProps;
  export type State = FieldRootState;
}

export namespace FieldLabel {
  export type Props = FieldLabelProps;
  export type State = FieldLabelState;
}

export namespace FieldDescription {
  export type Props = FieldDescriptionProps;
  export type State = FieldDescriptionState;
}

export namespace FieldError {
  export type Props = FieldErrorProps;
  export type State = FieldErrorState;
}

export namespace FieldControl {
  export type Props = FieldControlProps;
  export type State = FieldControlState;
  export type ChangeEventReason = FieldControlChangeEventReason;
  export type ChangeEventDetails = FieldControlChangeEventDetails;
}

export namespace FieldValidity {
  export type Props = FieldValidityProps;
  export type State = FieldValidityState;
}

export namespace FieldItem {
  export type Props = FieldItemProps;
  export type State = FieldItemState;
}

// ─── Global type declarations ───────────────────────────────────────────────────

declare global {
  interface HTMLElementTagNameMap {
    'field-root': FieldRootElement;
    'field-control': FieldControlElement;
    'field-label': FieldLabelElement;
    'field-description': FieldDescriptionElement;
    'field-error': FieldErrorElement;
    'field-validity': FieldValidityElement;
    'field-item': FieldItemElement;
  }
}
