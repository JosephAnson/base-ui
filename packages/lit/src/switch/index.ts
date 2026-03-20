import { ReactiveElement } from 'lit';
import { BaseHTMLElement, ensureId } from '../utils/index.ts';

// ─── Constants ──────────────────────────────────────────────────────────────────

const STATE_CHANGE_EVENT = 'base-ui-switch-state-change';
const CONTEXT_ERROR =
  'Base UI: SwitchRootContext is missing. Switch parts must be placed within <switch-root>.';
const VISUALLY_HIDDEN_INPUT_STYLE =
  'position:absolute;clip-path:inset(50%);overflow:hidden;white-space:nowrap;border:0;padding:0;width:1px;height:1px;margin:-1px';
const VISUALLY_HIDDEN_STYLE =
  'position:fixed;top:0;left:0;clip-path:inset(50%);overflow:hidden;white-space:nowrap;border:0;padding:0;width:1px;height:1px;margin:-1px';

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface SwitchRootState {
  /**
   * Whether the switch is currently active.
   */
  checked: boolean;
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
  /**
   * Whether the user should be unable to activate or deactivate the switch.
   */
  readOnly: boolean;
  /**
   * Whether the user must activate the switch before submitting a form.
   */
  required: boolean;
}

export interface SwitchThumbState extends SwitchRootState {}

export interface SwitchRootChangeEventDetails {
  event: Event;
  cancel(): void;
  readonly isCanceled: boolean;
  reason: 'none';
}

// ─── SwitchRootElement ──────────────────────────────────────────────────────────

/**
 * Represents the switch itself.
 * Renders a `<switch-root>` custom element with a hidden `<input>` inside.
 *
 * Documentation: [Base UI Switch](https://base-ui.com/react/components/switch)
 */
export class SwitchRootElement extends ReactiveElement {
  static properties = {
    defaultChecked: { type: Boolean, attribute: 'default-checked' },
    disabled: { type: Boolean },
    readOnly: { type: Boolean, attribute: 'read-only' },
    required: { type: Boolean },
    name: { type: String },
    value: { type: String },
    uncheckedValue: { type: String, attribute: 'unchecked-value' },
  };

  private _checked: boolean | undefined;

  /** Whether the switch is currently active. When defined, switch is controlled. */
  get checked(): boolean | undefined {
    return this._checked;
  }

  set checked(val: boolean | undefined) {
    const old = this._checked;
    this._checked = val;
    if (old !== val) {
      this.requestUpdate();
    }
  }

  declare defaultChecked: boolean;
  declare disabled: boolean;
  declare readOnly: boolean;
  declare required: boolean;
  declare name: string | undefined;
  declare value: string | undefined;
  declare uncheckedValue: string | undefined;

  /** Callback fired when the switch is toggled. Set via `.onCheckedChange=${fn}`. */
  onCheckedChange:
    | ((checked: boolean, eventDetails: SwitchRootChangeEventDetails) => void)
    | undefined;

  private _internalChecked = false;
  private _initialized = false;
  private _input: HTMLInputElement | null = null;
  private _uncheckedInput: HTMLInputElement | null = null;

  constructor() {
    super();
    this.defaultChecked = false;
    this.disabled = false;
    this.readOnly = false;
    this.required = false;
  }

  override createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();

    if (!this._initialized) {
      this._initialized = true;
      this._internalChecked = this.checked ?? this.defaultChecked;
    }

    this._ensureHiddenInput();
    this.addEventListener('click', this._handleClick);
    this.addEventListener('keydown', this._handleKeyDown);
    this.addEventListener('keyup', this._handleKeyUp);
    this.syncAttributes();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('click', this._handleClick);
    this.removeEventListener('keydown', this._handleKeyDown);
    this.removeEventListener('keyup', this._handleKeyUp);
    this._input?.remove();
    this._input = null;
    this._uncheckedInput?.remove();
    this._uncheckedInput = null;
  }

  protected override updated() {
    this.syncAttributes();
  }

  getChecked(): boolean {
    return this.checked ?? this._internalChecked;
  }

  getState(): SwitchRootState {
    return {
      checked: this.getChecked(),
      disabled: this.disabled,
      readOnly: this.readOnly,
      required: this.required,
    };
  }

  private _ensureHiddenInput() {
    if (!this._input) {
      this._input = document.createElement('input');
      this._input.type = 'checkbox';
      this._input.tabIndex = -1;
      this._input.setAttribute('aria-hidden', 'true');
      this._input.addEventListener('change', this._handleInputChange);
      this._input.addEventListener('focus', () => this.focus());
      this.appendChild(this._input);
    }
  }

  private _syncHiddenInput() {
    if (!this._input) return;

    const isChecked = this.getChecked();
    this._input.checked = isChecked;
    this._input.disabled = this.disabled;
    this._input.required = this.required;

    if (this.name) {
      this._input.name = this.name;
      this._input.style.cssText = VISUALLY_HIDDEN_INPUT_STYLE;
    } else {
      this._input.removeAttribute('name');
      this._input.style.cssText = VISUALLY_HIDDEN_STYLE;
    }

    if (this.value !== undefined) {
      this._input.value = this.value;
    } else {
      this._input.removeAttribute('value');
    }

    // Manage unchecked hidden input
    if (!isChecked && this.name && this.uncheckedValue !== undefined) {
      if (!this._uncheckedInput) {
        this._uncheckedInput = document.createElement('input');
        this._uncheckedInput.type = 'hidden';
        this.appendChild(this._uncheckedInput);
      }
      this._uncheckedInput.name = this.name;
      this._uncheckedInput.value = this.uncheckedValue;
    } else if (this._uncheckedInput) {
      this._uncheckedInput.remove();
      this._uncheckedInput = null;
    }
  }

  private _syncAriaLabelledBy() {
    const control = this._input;
    if (!control || !('labels' in control)) {
      this.removeAttribute('aria-labelledby');
      return;
    }

    const labels = Array.from(control.labels ?? []);
    if (labels.length === 0) {
      this.removeAttribute('aria-labelledby');
      return;
    }

    const labelIds = labels
      .map((label) => ensureId(label, 'base-ui-switch-label'))
      .filter(Boolean);

    if (labelIds.length > 0) {
      this.setAttribute('aria-labelledby', labelIds.join(' '));
    } else {
      this.removeAttribute('aria-labelledby');
    }
  }

  private syncAttributes() {
    const isChecked = this.getChecked();

    // ARIA
    this.setAttribute('role', 'switch');
    this.setAttribute('aria-checked', isChecked ? 'true' : 'false');

    if (this.disabled) {
      this.setAttribute('aria-disabled', 'true');
      this.tabIndex = -1;
    } else {
      this.removeAttribute('aria-disabled');
      this.tabIndex = 0;
    }

    if (this.readOnly) {
      this.setAttribute('aria-readonly', 'true');
    } else {
      this.removeAttribute('aria-readonly');
    }

    if (this.required) {
      this.setAttribute('aria-required', 'true');
    } else {
      this.removeAttribute('aria-required');
    }

    // Data attributes
    this.toggleAttribute('data-checked', isChecked);
    this.toggleAttribute('data-unchecked', !isChecked);
    this.toggleAttribute('data-disabled', this.disabled);
    this.toggleAttribute('data-readonly', this.readOnly);
    this.toggleAttribute('data-required', this.required);

    this._syncHiddenInput();

    queueMicrotask(() => {
      this._syncAriaLabelledBy();
      this.dispatchEvent(new CustomEvent(STATE_CHANGE_EVENT, { bubbles: false }));
    });
  }

  private _toggle(event: Event) {
    if (this.disabled || this.readOnly) return;

    const nextChecked = !this.getChecked();
    const eventDetails = createChangeEventDetails(event);
    this.onCheckedChange?.(nextChecked, eventDetails);

    if (eventDetails.isCanceled) return;

    if (this.checked === undefined) {
      this._internalChecked = nextChecked;
    }

    this.syncAttributes();
    this.requestUpdate();
  }

  private _handleClick = (event: MouseEvent) => {
    if (this.disabled || this.readOnly) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    this._toggle(event);
  };

  private _handleKeyDown = (event: KeyboardEvent) => {
    if (this.disabled) return;
    if (event.target !== this) return;

    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
    }

    if (event.key === 'Enter') {
      this._toggle(event);
    }
  };

  private _handleKeyUp = (event: KeyboardEvent) => {
    if (this.disabled) return;
    if (event.target !== this) return;

    if (event.key === ' ') {
      this._toggle(event);
    }
  };

  private _handleInputChange = (event: Event) => {
    if (event.defaultPrevented) return;

    const input = event.currentTarget as HTMLInputElement;

    if (this.disabled || this.readOnly) {
      input.checked = this.getChecked();
      return;
    }

    const nextChecked = input.checked;
    const eventDetails = createChangeEventDetails(event);
    this.onCheckedChange?.(nextChecked, eventDetails);

    if (eventDetails.isCanceled) {
      input.checked = this.getChecked();
      return;
    }

    if (this.checked === undefined) {
      this._internalChecked = nextChecked;
    }

    this.syncAttributes();
    this.requestUpdate();
  };
}

if (!customElements.get('switch-root')) {
  customElements.define('switch-root', SwitchRootElement);
}

// ─── SwitchThumbElement ─────────────────────────────────────────────────────────

/**
 * The movable part of the switch that indicates whether the switch is on or off.
 * Renders a `<switch-thumb>` custom element.
 */
export class SwitchThumbElement extends BaseHTMLElement {
  private _root: SwitchRootElement | null = null;
  private _handler = () => this._syncAttributes();

  connectedCallback() {
    this._root = this.closest('switch-root') as SwitchRootElement | null;
    if (!this._root) {
      console.error(CONTEXT_ERROR);
      return;
    }

    this._root.addEventListener(STATE_CHANGE_EVENT, this._handler);
    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(STATE_CHANGE_EVENT, this._handler);
    this._root = null;
  }

  private _syncAttributes() {
    if (!this._root) return;
    const state = this._root.getState();

    this.toggleAttribute('data-checked', state.checked);
    this.toggleAttribute('data-unchecked', !state.checked);
    this.toggleAttribute('data-disabled', state.disabled);
    this.toggleAttribute('data-readonly', state.readOnly);
    this.toggleAttribute('data-required', state.required);
  }
}

if (!customElements.get('switch-thumb')) {
  customElements.define('switch-thumb', SwitchThumbElement);
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function createChangeEventDetails(event: Event): SwitchRootChangeEventDetails {
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
  };
}

// ─── Namespace exports ──────────────────────────────────────────────────────────

export namespace SwitchRoot {
  export type State = SwitchRootState;
  export type ChangeEventDetails = SwitchRootChangeEventDetails;
}

export namespace SwitchThumb {
  export type State = SwitchThumbState;
}

// ─── Global type declarations ───────────────────────────────────────────────────

declare global {
  interface HTMLElementTagNameMap {
    'switch-root': SwitchRootElement;
    'switch-thumb': SwitchThumbElement;
  }
}
