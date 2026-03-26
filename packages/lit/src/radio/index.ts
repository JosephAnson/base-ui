import { ReactiveElement } from 'lit';
import { BaseHTMLElement, ensureId } from '../utils';
import {
  RADIO_GROUP_ATTRIBUTE,
  RADIO_GROUP_STATE_CHANGE_EVENT,
  getRadioGroupRuntimeState,
  type RadioGroupRuntimeState,
} from '../radio-group/shared';

// ─── Constants ──────────────────────────────────────────────────────────────────

const STATE_CHANGE_EVENT = 'base-ui-radio-state-change';
const CONTEXT_ERROR =
  'Base UI: RadioRootContext is missing. Radio parts must be placed within <radio-root>.';
const VISUALLY_HIDDEN_INPUT_STYLE =
  'position:absolute;clip-path:inset(50%);overflow:hidden;white-space:nowrap;border:0;padding:0;width:1px;height:1px;margin:-1px';
const VISUALLY_HIDDEN_STYLE =
  'position:fixed;top:0;left:0;clip-path:inset(50%);overflow:hidden;white-space:nowrap;border:0;padding:0;width:1px;height:1px;margin:-1px';

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface RadioRootState {
  /**
   * Whether the radio is currently selected.
   */
  checked: boolean;
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
  /**
   * Whether the user should be unable to select the radio button.
   */
  readOnly: boolean;
  /**
   * Whether the user must choose a value before submitting a form.
   */
  required: boolean;
}

export interface RadioIndicatorState extends RadioRootState {}

export interface RadioRootChangeEventDetails {
  event: Event;
  cancel(): void;
  allowPropagation(): void;
  readonly isCanceled: boolean;
  readonly isPropagationAllowed: boolean;
  reason: 'none';
  trigger: Element | undefined;
}

export interface RadioRootProps {
  /**
   * The value that identifies this radio within a group.
   */
  value?: unknown | undefined;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Whether the user should be unable to select the radio button.
   * @default false
   */
  readOnly?: boolean | undefined;
  /**
   * Whether the user must choose a value before submitting a form.
   * @default false
   */
  required?: boolean | undefined;
}

export interface RadioIndicatorProps {
  /**
   * Whether the indicator should stay mounted when unchecked.
   * @default false
   */
  keepMounted?: boolean | undefined;
}

export type RadioRootChangeEventReason = RadioRootChangeEventDetails['reason'];

// ─── RadioRootElement ───────────────────────────────────────────────────────────

/**
 * Represents the radio button itself.
 * Renders a `<radio-root>` custom element with a hidden `<input>` inside.
 *
 * Documentation: [Base UI Radio](https://base-ui.com/react/components/radio)
 */
export class RadioRootElement extends ReactiveElement {
  static properties = {
    disabled: { type: Boolean },
    readOnly: { type: Boolean, attribute: 'read-only' },
    required: { type: Boolean },
  };

  private _value: unknown;

  /** The value that identifies this radio within a group. */
  get value(): unknown {
    return this._value;
  }

  set value(val: unknown) {
    const old = this._value;
    this._value = val;
    if (!Object.is(old, val)) {
      this._syncGroupRegistration();
      this.requestUpdate();
    }
  }

  declare disabled: boolean;
  declare readOnly: boolean;
  declare required: boolean;

  private _input: HTMLInputElement | null = null;
  private _groupRoot: Element | null = null;

  constructor() {
    super();
    this.disabled = false;
    this.readOnly = false;
    this.required = false;
  }

  override createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();

    this._ensureHiddenInput();
    this._syncGroupRoot(this.closest(`[${RADIO_GROUP_ATTRIBUTE}]`));
    this._syncGroupRegistration();

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

    this._cleanupGroupRegistration();
    this._syncGroupRoot(null);

    this._input?.remove();
    this._input = null;
  }

  protected override updated() {
    this._syncGroupRegistration();
    this.syncAttributes();
  }

  getChecked(): boolean {
    const group = this._getGroupState();
    if (group) {
      return Object.is(group.checkedValue, this._value);
    }
    // Standalone radio: checked when value is empty string (matches React behavior)
    return this._value === '';
  }

  getState(): RadioRootState {
    const group = this._getGroupState();
    return {
      checked: this.getChecked(),
      disabled: Boolean(group?.disabled) || this.disabled,
      readOnly: Boolean(group?.readOnly) || this.readOnly,
      required: Boolean(group?.required) || this.required,
    };
  }

  private _ensureHiddenInput() {
    if (!this._input) {
      this._input = document.createElement('input');
      this._input.type = 'radio';
      this._input.tabIndex = -1;
      this._input.setAttribute('aria-hidden', 'true');
      this._input.addEventListener('change', this._handleInputChange);
      this._input.addEventListener('focus', () => this.focus());
      this.appendChild(this._input);
    }
  }

  private _syncHiddenInput() {
    if (!this._input) return;

    const group = this._getGroupState();
    const state = this.getState();
    const isChecked = state.checked;

    this._input.checked = isChecked;
    this._input.disabled = state.disabled;
    this._input.required = state.required;

    if (group?.name) {
      this._input.name = group.name;
      this._input.style.cssText = VISUALLY_HIDDEN_INPUT_STYLE;
    } else {
      this._input.removeAttribute('name');
      this._input.style.cssText = VISUALLY_HIDDEN_STYLE;
    }

    if (this._value !== undefined) {
      this._input.value = serializeValue(this._value);
    }
  }

  private _syncAriaLabelledBy() {
    const control = this._input;
    if (!control || !('labels' in control)) {
      this.removeAttribute('aria-labelledby');
      return;
    }

    const labels = [...Array.from(control.labels ?? []), ...this._getExplicitLabels()];
    if (labels.length === 0) {
      this.removeAttribute('aria-labelledby');
      return;
    }

    const labelIds = labels.map((label) => ensureId(label, 'base-ui-radio-label')).filter(Boolean);

    if (labelIds.length > 0) {
      this.setAttribute('aria-labelledby', labelIds.join(' '));
    } else {
      this.removeAttribute('aria-labelledby');
    }
  }

  private _getExplicitLabels() {
    if (!this.id) {
      return [];
    }

    return Array.from(
      this.ownerDocument?.querySelectorAll<HTMLLabelElement>(
        `label[for="${CSS.escape(this.id)}"]`,
      ) ?? [],
    );
  }

  private syncAttributes() {
    const state = this.getState();
    const group = this._getGroupState();

    // ARIA
    this.setAttribute('role', 'radio');
    this.setAttribute('aria-checked', state.checked ? 'true' : 'false');

    if (state.disabled) {
      this.setAttribute('aria-disabled', 'true');
      this.tabIndex = -1;
    } else {
      this.removeAttribute('aria-disabled');
      // Use group's tabIndex management if available (roving tabindex)
      if (group) {
        this.tabIndex = group.getTabIndex(this._value, state.disabled);
      } else {
        this.tabIndex = 0;
      }
    }

    if (state.readOnly) {
      this.setAttribute('aria-readonly', 'true');
    } else {
      this.removeAttribute('aria-readonly');
    }

    if (state.required) {
      this.setAttribute('aria-required', 'true');
    } else {
      this.removeAttribute('aria-required');
    }

    // Data attributes
    this.toggleAttribute('data-checked', state.checked);
    this.toggleAttribute('data-unchecked', !state.checked);
    this.toggleAttribute('data-disabled', state.disabled);
    this.toggleAttribute('data-readonly', state.readOnly);
    this.toggleAttribute('data-required', state.required);

    this._syncHiddenInput();

    queueMicrotask(() => {
      this._syncAriaLabelledBy();
      this.dispatchEvent(new CustomEvent(STATE_CHANGE_EVENT, { bubbles: false }));
    });
  }

  private _select(event: Event) {
    const state = this.getState();
    if (state.disabled || state.readOnly) return;
    if (this.getChecked()) return; // Already checked, radio can't be unchecked

    const group = this._getGroupState();
    if (group) {
      const eventDetails = createChangeEventDetails(event);
      group.setCheckedValue(this._value, eventDetails);
      this.requestUpdate();
      return;
    }
  }

  private _handleClick = (event: MouseEvent) => {
    if (event.target === this._input) return;
    const state = this.getState();
    if (state.disabled || state.readOnly) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    this._select(event);
  };

  private _handleKeyDown = (event: KeyboardEvent) => {
    const state = this.getState();
    if (state.disabled) return;
    if (event.target !== this) return;

    // Arrow key navigation handled by group
    const group = this._getGroupState();
    if (group) {
      const moveResult = group.moveFocus(this, event.key, event);
      if (moveResult.handled) {
        event.preventDefault();
        if (!moveResult.selectionCommitted) {
          this._forceGroupSync();
        }
        return;
      }
    }

    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
    }

    if (event.key === 'Enter') {
      this._select(event);
    }
  };

  private _handleKeyUp = (event: KeyboardEvent) => {
    const state = this.getState();
    if (state.disabled || state.readOnly) return;
    if (event.target !== this) return;

    if (event.key === ' ') {
      this._select(event);
    }
  };

  private _handleInputChange = (event: Event) => {
    if (event.defaultPrevented) return;

    const input = event.currentTarget as HTMLInputElement;
    const state = this.getState();

    if (state.disabled || state.readOnly) {
      input.checked = this.getChecked();
      return;
    }

    const group = this._getGroupState();
    if (group) {
      const eventDetails = createChangeEventDetails(event);
      const committed = group.setCheckedValue(this._value, eventDetails);
      if (!committed) {
        input.checked = this.getChecked();
        this._forceGroupSync();
      }
      this.requestUpdate();
      return;
    }

    // Without a group, radio input change has no effect
    input.checked = this.getChecked();
  };

  private _getGroupState(): RadioGroupRuntimeState | null {
    return getRadioGroupRuntimeState(this._groupRoot);
  }

  private _syncGroupRoot(root: Element | null) {
    if (this._groupRoot === root) return;

    this._groupRoot?.removeEventListener(
      RADIO_GROUP_STATE_CHANGE_EVENT,
      this._handleGroupStateChange,
    );
    this._groupRoot = root;
    this._groupRoot?.addEventListener(RADIO_GROUP_STATE_CHANGE_EVENT, this._handleGroupStateChange);
  }

  private _syncGroupRegistration() {
    const group = this._getGroupState();
    if (!group) return;

    const disabled = Boolean(group.disabled) || this.disabled;

    group.registerControl(this, this._value, disabled);

    if (this._input) {
      group.registerInput(this._input, this._value, disabled);
    }
  }

  private _cleanupGroupRegistration() {
    const group = this._getGroupState();
    if (!group) return;

    group.unregisterControl(this);
    if (this._input) {
      group.unregisterInput(this._input);
    }
  }

  private _handleGroupStateChange = () => {
    this.syncAttributes();
  };

  private _forceGroupSync() {
    this._groupRoot?.dispatchEvent(new CustomEvent(RADIO_GROUP_STATE_CHANGE_EVENT));
  }
}

if (!customElements.get('radio-root')) {
  customElements.define('radio-root', RadioRootElement);
}

// ─── RadioIndicatorElement ──────────────────────────────────────────────────────

/**
 * Indicates whether the radio button is selected.
 * Renders a `<radio-indicator>` custom element.
 */
export class RadioIndicatorElement extends BaseHTMLElement {
  static get observedAttributes() {
    return ['keep-mounted'];
  }

  private _root: RadioRootElement | null = null;
  private _handler = () => this._syncVisibility();

  connectedCallback() {
    this._root = this.closest('radio-root') as RadioRootElement | null;
    if (!this._root) {
      console.error(CONTEXT_ERROR);
      return;
    }

    this._root.addEventListener(STATE_CHANGE_EVENT, this._handler);
    queueMicrotask(() => this._syncVisibility());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(STATE_CHANGE_EVENT, this._handler);
    this._root = null;
  }

  attributeChangedCallback() {
    this._syncVisibility();
  }

  get keepMounted(): boolean {
    return this.hasAttribute('keep-mounted');
  }

  set keepMounted(val: boolean) {
    this.toggleAttribute('keep-mounted', val);
  }

  private _syncVisibility() {
    if (!this._root) return;
    const state = this._root.getState();
    const shouldShow = state.checked;

    if (shouldShow) {
      this.removeAttribute('hidden');
      this.style.display = '';
    } else if (!this.keepMounted) {
      this.setAttribute('hidden', '');
      this.style.display = 'none';
    }

    this._syncDataAttributes();
  }

  private _syncDataAttributes() {
    if (!this._root) return;
    const state = this._root.getState();

    this.toggleAttribute('data-checked', state.checked);
    this.toggleAttribute('data-unchecked', !state.checked);
    this.toggleAttribute('data-disabled', state.disabled);
    this.toggleAttribute('data-readonly', state.readOnly);
    this.toggleAttribute('data-required', state.required);
  }
}

if (!customElements.get('radio-indicator')) {
  customElements.define('radio-indicator', RadioIndicatorElement);
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function serializeValue(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function createChangeEventDetails(event: Event): RadioRootChangeEventDetails {
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
    trigger: event.target instanceof Element ? event.target : undefined,
  };
}

// ─── Namespace exports ──────────────────────────────────────────────────────────

export const Radio = {
  Root: RadioRootElement,
  Indicator: RadioIndicatorElement,
} as const;

export namespace RadioRoot {
  export type Props = RadioRootProps;
  export type State = RadioRootState;
  export type ChangeEventReason = RadioRootChangeEventReason;
  export type ChangeEventDetails = RadioRootChangeEventDetails;
}

export namespace RadioIndicator {
  export type Props = RadioIndicatorProps;
  export type State = RadioIndicatorState;
}

// ─── Global type declarations ───────────────────────────────────────────────────

declare global {
  interface HTMLElementTagNameMap {
    'radio-root': RadioRootElement;
    'radio-indicator': RadioIndicatorElement;
  }
}
