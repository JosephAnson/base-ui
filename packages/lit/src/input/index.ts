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
  readonly isCanceled: boolean;
  reason: 'none';
  trigger: Element | undefined;
}

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
  onValueChange:
    | ((value: string, eventDetails: InputChangeEventDetails) => void)
    | undefined;

  private _state: InputState = {
    disabled: false,
    touched: false,
    dirty: false,
    valid: null,
    filled: false,
    focused: false,
  };

  private _initialValue = '';
  private _initialized = false;
  private _controlledValue: string | number | readonly string[] | undefined;
  private _inputEl: HTMLInputElement | HTMLTextAreaElement | null = null;

  /** Controlled value. Set via `.value=${val}`. */
  get value(): string | number | readonly string[] | undefined {
    return this._controlledValue;
  }

  set value(val: string | number | readonly string[] | undefined) {
    this._controlledValue = val;
    if (this._inputEl && val !== undefined) {
      this._inputEl.value = stringifyInputValue(val);
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
    this._findInput();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this._detachInput();
  }

  protected override updated() {
    this._state = { ...this._state, disabled: this.disabled };
    this._syncDataAttributes();
  }

  getState(): InputState {
    return { ...this._state };
  }

  private _findInput() {
    const el = this.querySelector('input, textarea') as
      | HTMLInputElement
      | HTMLTextAreaElement
      | null;
    if (el) {
      this._attachInput(el);
    }
  }

  private _attachInput(el: HTMLInputElement | HTMLTextAreaElement) {
    this._inputEl = el;

    // Apply controlled value if set before input was found
    if (this._controlledValue !== undefined) {
      el.value = stringifyInputValue(this._controlledValue);
    }

    if (!this._initialized) {
      this._initialized = true;
      this._initialValue = el.value;
      this._state = {
        disabled: this.disabled,
        touched: false,
        dirty: false,
        valid: readValidityState(el),
        filled: el.value !== '',
        focused: false,
      };
    }

    el.addEventListener('input', this._handleInput);
    el.addEventListener('focus', this._handleFocus);
    el.addEventListener('blur', this._handleBlur);
    this._syncDataAttributes();
  }

  private _detachInput() {
    if (this._inputEl) {
      this._inputEl.removeEventListener('input', this._handleInput);
      this._inputEl.removeEventListener('focus', this._handleFocus);
      this._inputEl.removeEventListener('blur', this._handleBlur);
      this._inputEl = null;
    }
  }

  private _handleInput = (event: Event) => {
    const el = event.currentTarget as HTMLInputElement | HTMLTextAreaElement;
    const newValue = el.value;

    this.onValueChange?.(
      newValue,
      createChangeEventDetails(event, el),
    );

    // Restore controlled value
    if (this._controlledValue !== undefined) {
      el.value = stringifyInputValue(this._controlledValue);
    }

    this._updateState({
      dirty: (this._controlledValue !== undefined
        ? stringifyInputValue(this._controlledValue)
        : newValue) !== this._initialValue,
      filled: (this._controlledValue !== undefined
        ? stringifyInputValue(this._controlledValue)
        : newValue) !== '',
      valid: readValidityState(el),
    });
  };

  private _handleFocus = () => {
    this._updateState({ focused: true, valid: readValidityState(this._inputEl) });
  };

  private _handleBlur = () => {
    this._updateState({
      focused: false,
      touched: true,
      valid: readValidityState(this._inputEl),
    });
  };

  private _updateState(partial: Partial<InputState>) {
    const next: InputState = { ...this._state, ...partial };

    if (isEqualInputState(this._state, next)) return;

    this._state = next;
    this._syncDataAttributes();
  }

  private _syncDataAttributes() {
    const el = this._inputEl;
    if (!el) return;

    const s = this._state;
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

// ─── Helpers ────────────────────────────────────────────────────────────────────

function stringifyInputValue(value: string | number | readonly string[] | undefined): string {
  if (value == null) return '';
  if (Array.isArray(value)) return value.join(',');
  return String(value);
}

function readValidityState(
  element: HTMLInputElement | HTMLTextAreaElement | null,
): boolean | null {
  if (!element) return null;
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

  return {
    cancel() {
      isCanceled = true;
    },
    event,
    get isCanceled() {
      return isCanceled;
    },
    reason: 'none',
    trigger,
  };
}

// ─── Namespace exports ──────────────────────────────────────────────────────────

export namespace InputRoot {
  export type State = InputState;
  export type ChangeEventDetails = InputChangeEventDetails;
}

// ─── Global type declarations ───────────────────────────────────────────────────

declare global {
  interface HTMLElementTagNameMap {
    'input-root': InputRootElement;
  }
}
