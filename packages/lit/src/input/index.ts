import { ReactiveElement } from 'lit';

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface InputState {
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
  /**
   * Whether the field has been touched.
   */
  touched: boolean;
  /**
   * Whether the field value has changed from its initial value.
   */
  dirty: boolean;
  /**
   * Whether the field is valid.
   */
  valid: boolean | null;
  /**
   * Whether the field has a value.
   */
  filled: boolean;
  /**
   * Whether the field is focused.
   */
  focused: boolean;
}

export interface InputChangeEventDetails {
  event: Event;
  cancel(): void;
  allowPropagation(): void;
  readonly isCanceled: boolean;
  readonly isPropagationAllowed: boolean;
  reason: 'none';
  trigger: Element | undefined;
}

export type InputChangeEventReason = InputChangeEventDetails['reason'];

// ─── InputRootElement ───────────────────────────────────────────────────────────

/**
 * Wraps a native `<input>` or `<textarea>` and tracks its interaction state
 * via data attributes.
 * Renders an `<input-root>` custom element with `display: contents`.
 *
 * Documentation: [Base UI Input](https://base-ui.com/react/components/input)
 */
export class InputRootElement extends ReactiveElement {
  static properties = {
    disabled: { type: Boolean },
  };

  declare disabled: boolean;

  /** Callback fired when the value changes. Set via `.onValueChange=${fn}`. */
  onValueChange: ((value: string, eventDetails: InputChangeEventDetails) => void) | undefined;

  private stateData: InputState = {
    disabled: false,
    touched: false,
    dirty: false,
    valid: null,
    filled: false,
    focused: false,
  };

  private initialValue = '';
  private initialized = false;
  private controlledValue: string | number | readonly string[] | undefined;
  defaultValue: string | number | readonly string[] | undefined;
  private inputElement: HTMLInputElement | HTMLTextAreaElement | null = null;

  /** Controlled value. Set via `.value=${val}`. */
  get value(): string | number | readonly string[] | undefined {
    return this.controlledValue;
  }

  set value(val: string | number | readonly string[] | undefined) {
    this.controlledValue = val;
    if (this.inputElement && val !== undefined) {
      const stringValue = stringifyInputValue(val);
      this.inputElement.value = stringValue;
      this.updateState({
        dirty: stringValue !== this.initialValue,
        filled: stringValue !== '',
        valid: readValidityState(this.inputElement),
      });
    }
  }

  constructor() {
    super();
    this.disabled = false;
  }

  override createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();
    this.style.display = 'contents';
    this.findInput();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.detachInput();
  }

  protected override updated() {
    this.stateData = { ...this.stateData, disabled: this.disabled };
    this.syncDataAttributes();
  }

  getState(): InputState {
    return { ...this.stateData };
  }

  private findInput() {
    const el = this.querySelector('input, textarea') as
      | HTMLInputElement
      | HTMLTextAreaElement
      | null;
    if (el) {
      this.attachInput(el);
    }
  }

  private attachInput(el: HTMLInputElement | HTMLTextAreaElement) {
    this.inputElement = el;

    // Apply controlled value if set before input was found
    if (this.controlledValue !== undefined) {
      el.value = stringifyInputValue(this.controlledValue);
    } else if (!this.initialized && this.defaultValue !== undefined) {
      el.value = stringifyInputValue(this.defaultValue);
    }

    if (!this.initialized) {
      this.initialized = true;
      this.initialValue = el.value;
      this.stateData = {
        disabled: this.disabled,
        touched: false,
        dirty: false,
        valid: readValidityState(el),
        filled: el.value !== '',
        focused: false,
      };
    }

    el.addEventListener('input', this.handleInput);
    el.addEventListener('focus', this.handleFocus);
    el.addEventListener('blur', this.handleBlur);
    this.syncDataAttributes();
  }

  private detachInput() {
    if (this.inputElement) {
      this.inputElement.removeEventListener('input', this.handleInput);
      this.inputElement.removeEventListener('focus', this.handleFocus);
      this.inputElement.removeEventListener('blur', this.handleBlur);
      this.inputElement = null;
    }
  }

  private handleInput = (event: Event) => {
    const el = event.currentTarget as HTMLInputElement | HTMLTextAreaElement;
    const newValue = el.value;

    this.onValueChange?.(newValue, createChangeEventDetails(event, el));

    // Restore controlled value
    if (this.controlledValue !== undefined) {
      el.value = stringifyInputValue(this.controlledValue);
    }

    this.updateState({
      dirty:
        (this.controlledValue !== undefined
          ? stringifyInputValue(this.controlledValue)
          : newValue) !== this.initialValue,
      filled:
        (this.controlledValue !== undefined
          ? stringifyInputValue(this.controlledValue)
          : newValue) !== '',
      valid: readValidityState(el),
    });
  };

  private handleFocus = () => {
    this.updateState({ focused: true, valid: readValidityState(this.inputElement) });
  };

  private handleBlur = () => {
    this.updateState({
      focused: false,
      touched: true,
      valid: readValidityState(this.inputElement),
    });
  };

  private updateState(partial: Partial<InputState>) {
    const next: InputState = { ...this.stateData, ...partial };

    if (isEqualInputState(this.stateData, next)) {
      return;
    }

    this.stateData = next;
    this.syncDataAttributes();
  }

  private syncDataAttributes() {
    const el = this.inputElement;
    if (!el) {
      return;
    }

    const s = this.stateData;
    el.disabled = s.disabled;
    el.toggleAttribute('data-disabled', s.disabled);
    el.toggleAttribute('data-touched', s.touched);
    el.toggleAttribute('data-dirty', s.dirty);
    el.toggleAttribute('data-filled', s.filled);
    el.toggleAttribute('data-focused', s.focused);

    if (s.valid === true) {
      el.setAttribute('data-valid', '');
      el.removeAttribute('data-invalid');
    } else if (s.valid === false) {
      el.removeAttribute('data-valid');
      el.setAttribute('data-invalid', '');
    } else {
      el.removeAttribute('data-valid');
      el.removeAttribute('data-invalid');
    }
  }
}

if (!customElements.get('input-root')) {
  customElements.define('input-root', InputRootElement);
}

export const Input = InputRootElement;

// ─── Helpers ────────────────────────────────────────────────────────────────────

function stringifyInputValue(value: string | number | readonly string[] | undefined): string {
  if (value == null) {
    return '';
  }

  if (Array.isArray(value)) {
    return value.join(',');
  }

  return String(value);
}

function readValidityState(element: HTMLInputElement | HTMLTextAreaElement | null): boolean | null {
  if (!element) {
    return null;
  }

  return typeof element.validity?.valid === 'boolean' ? element.validity.valid : null;
}

function isEqualInputState(a: InputState, b: InputState): boolean {
  return (
    a.disabled === b.disabled &&
    a.touched === b.touched &&
    a.dirty === b.dirty &&
    a.valid === b.valid &&
    a.filled === b.filled &&
    a.focused === b.focused
  );
}

function createChangeEventDetails(
  event: Event,
  trigger: Element | undefined,
): InputChangeEventDetails {
  let isCanceled = false;
  let isPropagationAllowed = false;

  return {
    cancel() {
      isCanceled = true;
    },
    allowPropagation() {
      isPropagationAllowed = true;
    },
    event,
    get isCanceled() {
      return isCanceled;
    },
    get isPropagationAllowed() {
      return isPropagationAllowed;
    },
    reason: 'none',
    trigger,
  };
}

// ─── Namespace exports ──────────────────────────────────────────────────────────

export interface InputRootProps {
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Callback fired when the `value` changes. Use when controlled.
   */
  onValueChange?: ((value: string, eventDetails: InputChangeEventDetails) => void) | undefined;
  /**
   * The default value of the input. Use when uncontrolled.
   */
  defaultValue?: string | number | readonly string[] | undefined;
  /**
   * The value of the input. Use when controlled.
   */
  value?: string | number | readonly string[] | undefined;
}

export type InputProps = InputRootProps;

export namespace InputRoot {
  export type Props = InputRootProps;
  export type State = InputState;
  export type ChangeEventReason = InputChangeEventReason;
  export type ChangeEventDetails = InputChangeEventDetails;
}

// ─── Global type declarations ───────────────────────────────────────────────────

declare global {
  interface HTMLElementTagNameMap {
    'input-root': InputRootElement;
  }
}
