import { ReactiveElement } from 'lit';
import { BaseHTMLElement, ensureId } from '../utils';

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
  allowPropagation(): void;
  readonly isCanceled: boolean;
  readonly isPropagationAllowed: boolean;
  reason: 'none';
}

export interface SwitchRootProps {
  /**
   * Whether the switch is currently active.
   * This is the controlled counterpart of `defaultChecked`.
   */
  checked?: boolean | undefined;
  /**
   * Whether the switch is initially active.
   * This is the uncontrolled counterpart of `checked`.
   * @default false
   */
  defaultChecked?: boolean | undefined;
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
   * Identifies the form that owns the hidden input.
   * Useful when the switch is rendered outside the form.
   */
  form?: string | undefined;
  /**
   * Event handler called when the switch is activated or deactivated.
   */
  onCheckedChange?:
    | ((checked: boolean, eventDetails: SwitchRootChangeEventDetails) => void)
    | undefined;
  /**
   * Whether the user should be unable to activate or deactivate the switch.
   * @default false
   */
  readOnly?: boolean | undefined;
  /**
   * Whether the user must activate the switch before submitting a form.
   * @default false
   */
  required?: boolean | undefined;
  /**
   * The value submitted with the form when the switch is on.
   * By default, switch submits the "on" value, matching native checkbox behavior.
   */
  value?: string | undefined;
  /**
   * The value submitted with the form when the switch is off.
   * By default, unchecked switches do not submit any value, matching native checkbox behavior.
   */
  uncheckedValue?: string | undefined;
}

export interface SwitchThumbProps {}

export type SwitchRootChangeEventReason = SwitchRootChangeEventDetails['reason'];

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
    form: { type: String },
    value: { type: String },
    uncheckedValue: { type: String, attribute: 'unchecked-value' },
  };

  private checkedValue: boolean | undefined;

  /** Whether the switch is currently active. When defined, switch is controlled. */
  get checked(): boolean | undefined {
    return this.checkedValue;
  }

  set checked(val: boolean | undefined) {
    const old = this.checkedValue;
    this.checkedValue = val;
    if (old !== val) {
      this.requestUpdate();
    }
  }

  declare defaultChecked: boolean;
  declare disabled: boolean;
  declare readOnly: boolean;
  declare required: boolean;
  declare name: string | undefined;
  declare form: string | undefined;
  declare value: string | undefined;
  declare uncheckedValue: string | undefined;

  /** Callback fired when the switch is toggled. Set via `.onCheckedChange=${fn}`. */
  onCheckedChange:
    | ((checked: boolean, eventDetails: SwitchRootChangeEventDetails) => void)
    | undefined;

  private internalChecked = false;
  private initialized = false;
  private inputElement: HTMLInputElement | null = null;
  private uncheckedInputElement: HTMLInputElement | null = null;
  private explicitLabels = new Set<HTMLLabelElement>();
  private idObserver: MutationObserver | null = null;

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

    if (!this.initialized) {
      this.initialized = true;
      this.internalChecked = this.checked ?? this.defaultChecked;
    }

    this.ensureHiddenInput();
    this.addEventListener('click', this.handleClick);
    this.addEventListener('keydown', this.handleKeyDown);
    this.addEventListener('keyup', this.handleKeyUp);
    this.idObserver = new MutationObserver(() => {
      this.syncAssociatedLabels();
      this.syncAriaLabelledBy();
    });
    this.idObserver.observe(this, { attributes: true, attributeFilter: ['id'] });
    this.syncAttributes();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('click', this.handleClick);
    this.removeEventListener('keydown', this.handleKeyDown);
    this.removeEventListener('keyup', this.handleKeyUp);
    this.idObserver?.disconnect();
    this.idObserver = null;
    this.cleanupAssociatedLabels();
    this.inputElement?.remove();
    this.inputElement = null;
    this.uncheckedInputElement?.remove();
    this.uncheckedInputElement = null;
  }

  protected override updated() {
    this.syncAttributes();
  }

  getChecked(): boolean {
    return this.checked ?? this.internalChecked;
  }

  getState(): SwitchRootState {
    return {
      checked: this.getChecked(),
      disabled: this.disabled,
      readOnly: this.readOnly,
      required: this.required,
    };
  }

  private ensureHiddenInput() {
    if (!this.inputElement) {
      this.inputElement = document.createElement('input');
      this.inputElement.type = 'checkbox';
      this.inputElement.tabIndex = -1;
      this.inputElement.setAttribute('aria-hidden', 'true');
      this.inputElement.addEventListener('change', this.handleInputChange);
      this.inputElement.addEventListener('focus', () => this.focus());
      this.inputElement.addEventListener('click', (event) => {
        if (this.disabled || this.readOnly) {
          event.preventDefault();
        }
      });
      this.appendChild(this.inputElement);
    }
  }

  private syncHiddenInput() {
    if (!this.inputElement) {
      return;
    }

    const isChecked = this.getChecked();
    this.inputElement.checked = isChecked;
    this.inputElement.disabled = this.disabled;
    this.inputElement.required = this.required;

    if (this.name) {
      this.inputElement.name = this.name;
      this.inputElement.style.cssText = VISUALLY_HIDDEN_INPUT_STYLE;
    } else {
      this.inputElement.removeAttribute('name');
      this.inputElement.style.cssText = VISUALLY_HIDDEN_STYLE;
    }

    if (this.form) {
      this.inputElement.setAttribute('form', this.form);
    } else {
      this.inputElement.removeAttribute('form');
    }

    if (this.value !== undefined) {
      this.inputElement.value = this.value;
    } else {
      this.inputElement.removeAttribute('value');
    }

    // Manage unchecked hidden input
    if (!isChecked && this.name && this.uncheckedValue !== undefined) {
      if (!this.uncheckedInputElement) {
        this.uncheckedInputElement = document.createElement('input');
        this.uncheckedInputElement.type = 'hidden';
        this.appendChild(this.uncheckedInputElement);
      }
      this.uncheckedInputElement.name = this.name;
      this.uncheckedInputElement.value = this.uncheckedValue;
      if (this.form) {
        this.uncheckedInputElement.setAttribute('form', this.form);
      } else {
        this.uncheckedInputElement.removeAttribute('form');
      }
    } else if (this.uncheckedInputElement) {
      this.uncheckedInputElement.remove();
      this.uncheckedInputElement = null;
    }
  }

  private syncAriaLabelledBy() {
    const control = this.inputElement;
    if (!control || !('labels' in control)) {
      this.removeAttribute('aria-labelledby');
      return;
    }

    const labels = [...Array.from(control.labels ?? []), ...this.getExplicitLabels()];
    if (labels.length === 0) {
      this.removeAttribute('aria-labelledby');
      return;
    }

    const labelIds = [...new Set(labels)]
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

    this.syncHiddenInput();
    this.syncAssociatedLabels();

    queueMicrotask(() => {
      this.syncAriaLabelledBy();
      this.dispatchEvent(new CustomEvent(STATE_CHANGE_EVENT, { bubbles: false }));
    });
  }

  private toggle(event: Event) {
    if (this.disabled || this.readOnly) {
      return;
    }

    const nextChecked = !this.getChecked();
    const eventDetails = createChangeEventDetails(event);
    this.onCheckedChange?.(nextChecked, eventDetails);

    if (eventDetails.isCanceled) {
      return;
    }

    if (this.checked === undefined) {
      this.internalChecked = nextChecked;
    }

    this.syncAttributes();
    this.requestUpdate();
  }

  private handleClick = (event: MouseEvent) => {
    if (event.target === this.inputElement) {
      return;
    }

    if (this.disabled) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }

    if (this.readOnly) {
      event.preventDefault();
      return;
    }

    event.preventDefault();
    this.toggle(event);
  };

  private handleKeyDown = (event: KeyboardEvent) => {
    if (this.disabled) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }

    if (event.target !== this) {
      return;
    }

    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
    }

    if (this.readOnly) {
      return;
    }

    if (event.key === 'Enter') {
      this.toggle(event);
    }
  };

  private handleKeyUp = (event: KeyboardEvent) => {
    if (this.disabled) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }

    if (event.target !== this) {
      return;
    }

    if (this.readOnly) {
      if (event.key === ' ') {
        event.preventDefault();
      }
      return;
    }

    if (event.key === ' ') {
      this.toggle(event);
    }
  };

  private handleInputChange = (event: Event) => {
    if (event.defaultPrevented) {
      return;
    }

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
      this.internalChecked = nextChecked;
    }

    this.syncAttributes();
    this.requestUpdate();
  };

  private getExplicitLabels(): HTMLLabelElement[] {
    if (!this.id) {
      return [];
    }

    const escapedId = globalThis.CSS?.escape?.(this.id) ?? this.id;
    return Array.from(
      this.ownerDocument.querySelectorAll<HTMLLabelElement>(`label[for="${escapedId}"]`),
    );
  }

  private syncAssociatedLabels() {
    const nextLabels = new Set(this.getExplicitLabels());

    this.explicitLabels.forEach((label) => {
      if (!nextLabels.has(label)) {
        label.removeEventListener('click', this.handleExplicitLabelClick);
      }
    });

    nextLabels.forEach((label) => {
      if (!this.explicitLabels.has(label)) {
        label.addEventListener('click', this.handleExplicitLabelClick);
      }
    });

    this.explicitLabels = nextLabels;
  }

  private cleanupAssociatedLabels() {
    this.explicitLabels.forEach((label) => {
      label.removeEventListener('click', this.handleExplicitLabelClick);
    });
    this.explicitLabels.clear();
  }

  private handleExplicitLabelClick = (event: MouseEvent) => {
    if (event.defaultPrevented) {
      return;
    }

    event.preventDefault();

    if (this.disabled || this.readOnly) {
      return;
    }

    this.toggle(event);
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
  private rootElement: SwitchRootElement | null = null;
  private stateHandler = () => this.syncAttributes();

  connectedCallback() {
    this.rootElement = this.closest('switch-root') as SwitchRootElement | null;
    if (!this.rootElement) {
      console.error(CONTEXT_ERROR);
      return;
    }

    this.rootElement.addEventListener(STATE_CHANGE_EVENT, this.stateHandler);
    queueMicrotask(() => this.syncAttributes());
  }

  disconnectedCallback() {
    this.rootElement?.removeEventListener(STATE_CHANGE_EVENT, this.stateHandler);
    this.rootElement = null;
  }

  private syncAttributes() {
    if (!this.rootElement) {
      return;
    }

    const state = this.rootElement.getState();

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

export const Switch = {
  Root: SwitchRootElement,
  Thumb: SwitchThumbElement,
} as const;

// ─── Helpers ────────────────────────────────────────────────────────────────────

function createChangeEventDetails(event: Event): SwitchRootChangeEventDetails {
  let isCanceled = false;
  let isPropagationAllowed = false;

  return {
    allowPropagation() {
      isPropagationAllowed = true;
    },
    cancel() {
      isCanceled = true;
    },
    event,
    get isCanceled() {
      return isCanceled;
    },
    get isPropagationAllowed() {
      return isPropagationAllowed;
    },
    reason: 'none',
  };
}

// ─── Namespace exports ──────────────────────────────────────────────────────────

export namespace SwitchRoot {
  export type Props = SwitchRootProps;
  export type State = SwitchRootState;
  export type ChangeEventReason = SwitchRootChangeEventReason;
  export type ChangeEventDetails = SwitchRootChangeEventDetails;
}

export namespace SwitchThumb {
  export type Props = SwitchThumbProps;
  export type State = SwitchThumbState;
}

// ─── Global type declarations ───────────────────────────────────────────────────

declare global {
  interface HTMLElementTagNameMap {
    'switch-root': SwitchRootElement;
    'switch-thumb': SwitchThumbElement;
  }
}
