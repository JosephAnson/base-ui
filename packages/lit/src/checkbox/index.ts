import { ReactiveElement } from 'lit';
import { BaseHTMLElement, ensureId } from '../utils/index.ts';
import {
  CHECKBOX_GROUP_ATTRIBUTE,
  CHECKBOX_GROUP_STATE_CHANGE_EVENT,
  getCheckboxGroupRuntimeState,
  type CheckboxGroupRuntimeState,
} from '../checkbox-group/shared.ts';

// ─── Constants ──────────────────────────────────────────────────────────────────

const STATE_CHANGE_EVENT = 'base-ui-checkbox-state-change';
const CONTEXT_ERROR =
  'Base UI: CheckboxRootContext is missing. Checkbox parts must be placed within <checkbox-root>.';
const VISUALLY_HIDDEN_INPUT_STYLE =
  'position:absolute;clip-path:inset(50%);overflow:hidden;white-space:nowrap;border:0;padding:0;width:1px;height:1px;margin:-1px';
const VISUALLY_HIDDEN_STYLE =
  'position:fixed;top:0;left:0;clip-path:inset(50%);overflow:hidden;white-space:nowrap;border:0;padding:0;width:1px;height:1px;margin:-1px';

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface CheckboxRootState {
  /**
   * Whether the checkbox is currently checked.
   */
  checked: boolean;
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
  /**
   * Whether the user should be unable to check or uncheck the checkbox.
   */
  readOnly: boolean;
  /**
   * Whether the user must check the checkbox before submitting a form.
   */
  required: boolean;
  /**
   * Whether the checkbox is in an indeterminate state.
   */
  indeterminate: boolean;
}

export interface CheckboxIndicatorState extends CheckboxRootState {}

export interface CheckboxRootChangeEventDetails {
  event: Event;
  cancel(): void;
  readonly isCanceled: boolean;
  reason: 'none';
}

// ─── CheckboxRootElement ────────────────────────────────────────────────────────

/**
 * Represents the checkbox itself.
 * Renders a `<checkbox-root>` custom element with a hidden `<input>` inside.
 *
 * Documentation: [Base UI Checkbox](https://base-ui.com/react/components/checkbox)
 */
export class CheckboxRootElement extends ReactiveElement {
  static properties = {
    defaultChecked: { type: Boolean, attribute: 'default-checked' },
    disabled: { type: Boolean },
    readOnly: { type: Boolean, attribute: 'read-only' },
    required: { type: Boolean },
    indeterminate: { type: Boolean },
    name: { type: String },
    value: { type: String },
    uncheckedValue: { type: String, attribute: 'unchecked-value' },
    parent: { type: Boolean },
  };

  private _checked: boolean | undefined;

  /** Whether the checkbox is checked. When defined, checkbox is controlled. */
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
  declare indeterminate: boolean;
  declare name: string | undefined;
  declare value: string;
  declare uncheckedValue: string | undefined;
  /** Whether this checkbox acts as a parent "select all" for the group. */
  declare parent: boolean;

  /** Callback fired when the checked state changes. Set via `.onCheckedChange=${fn}`. */
  onCheckedChange:
    | ((checked: boolean, eventDetails: CheckboxRootChangeEventDetails) => void)
    | undefined;

  private _internalChecked = false;
  private _initialized = false;
  private _input: HTMLInputElement | null = null;
  private _uncheckedInput: HTMLInputElement | null = null;
  private _groupRoot: Element | null = null;

  constructor() {
    super();
    this.defaultChecked = false;
    this.disabled = false;
    this.readOnly = false;
    this.required = false;
    this.indeterminate = false;
    this.value = 'on';
    this.parent = false;
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
    this._syncGroupRoot(
      this.closest(`[${CHECKBOX_GROUP_ATTRIBUTE}]`),
    );
    this._syncGroupDisabledState();
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

    this._cleanupGroupDisabledState();
    this._syncGroupRoot(null);

    this._input?.remove();
    this._input = null;
    this._uncheckedInput?.remove();
    this._uncheckedInput = null;
  }

  protected override updated() {
    this._syncGroupDisabledState();
    this.syncAttributes();
  }

  getChecked(): boolean {
    const group = this._getGroupState();

    // If in a group with parent support
    if (group && group.allValues.length > 0) {
      if (this.parent) {
        // Parent checkbox: checked if ALL values are checked
        return group.value.length === group.allValues.length;
      }
      // Child in a group: checked if value is in the group's value array
      return group.value.includes(this.value);
    }

    // If in a group without parent support (no allValues)
    if (group) {
      return group.value.includes(this.value);
    }

    // Standalone: use own controlled/uncontrolled state
    return this.checked ?? this._internalChecked;
  }

  getIndeterminate(): boolean {
    const group = this._getGroupState();

    // Parent checkbox shows indeterminate when some (but not all/none) are checked
    if (group && group.allValues.length > 0 && this.parent) {
      const checkedCount = group.value.length;
      return checkedCount > 0 && checkedCount < group.allValues.length;
    }

    return this.indeterminate;
  }

  getState(): CheckboxRootState {
    const group = this._getGroupState();
    return {
      checked: this.getChecked(),
      disabled: Boolean(group?.disabled) || this.disabled,
      readOnly: this.readOnly,
      required: this.required,
      indeterminate: this.getIndeterminate(),
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

    const state = this.getState();
    const isChecked = state.checked;

    this._input.checked = isChecked;
    this._input.disabled = state.disabled;
    this._input.required = state.required;
    this._input.indeterminate = state.indeterminate;

    // Parent checkboxes are excluded from form submission
    const effectiveName = this.parent ? undefined : this.name;

    if (effectiveName) {
      this._input.name = effectiveName;
      this._input.style.cssText = VISUALLY_HIDDEN_INPUT_STYLE;
    } else {
      this._input.removeAttribute('name');
      this._input.style.cssText = VISUALLY_HIDDEN_STYLE;
    }

    if (this.value !== undefined) {
      this._input.value = this.value;
    }

    // Manage unchecked hidden input (not for parent checkboxes)
    if (!isChecked && effectiveName && this.uncheckedValue !== undefined) {
      if (!this._uncheckedInput) {
        this._uncheckedInput = document.createElement('input');
        this._uncheckedInput.type = 'hidden';
        this.appendChild(this._uncheckedInput);
      }
      this._uncheckedInput.name = effectiveName;
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
      .map((label) => ensureId(label, 'base-ui-checkbox-label'))
      .filter(Boolean);

    if (labelIds.length > 0) {
      this.setAttribute('aria-labelledby', labelIds.join(' '));
    } else {
      this.removeAttribute('aria-labelledby');
    }
  }

  private syncAttributes() {
    const state = this.getState();
    const isChecked = state.checked;
    const isIndeterminate = state.indeterminate;

    // ARIA
    this.setAttribute('role', 'checkbox');
    this.setAttribute(
      'aria-checked',
      isIndeterminate ? 'mixed' : isChecked ? 'true' : 'false',
    );

    if (state.disabled) {
      this.setAttribute('aria-disabled', 'true');
      this.tabIndex = -1;
    } else {
      this.removeAttribute('aria-disabled');
      this.tabIndex = 0;
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

    // aria-controls for parent checkbox
    this._syncAriaControls();

    // Data attributes
    if (isIndeterminate) {
      this.setAttribute('data-indeterminate', '');
      this.removeAttribute('data-checked');
      this.removeAttribute('data-unchecked');
    } else if (isChecked) {
      this.setAttribute('data-checked', '');
      this.removeAttribute('data-unchecked');
      this.removeAttribute('data-indeterminate');
    } else {
      this.setAttribute('data-unchecked', '');
      this.removeAttribute('data-checked');
      this.removeAttribute('data-indeterminate');
    }

    this.toggleAttribute('data-disabled', state.disabled);
    this.toggleAttribute('data-readonly', state.readOnly);
    this.toggleAttribute('data-required', state.required);

    this._syncHiddenInput();

    queueMicrotask(() => {
      this._syncAriaLabelledBy();
      this.dispatchEvent(new CustomEvent(STATE_CHANGE_EVENT, { bubbles: false }));
    });
  }

  private _syncAriaControls() {
    const group = this._getGroupState();
    if (!this.parent || !group || group.allValues.length === 0) {
      this.removeAttribute('aria-controls');
      return;
    }

    const myId = ensureId(this, 'base-ui-checkbox-parent');
    const childIds = group.allValues.map((v) => `${myId}-${v}`).join(' ');
    this.setAttribute('aria-controls', childIds);
  }

  private _toggle(event: Event) {
    const state = this.getState();
    if (state.disabled || state.readOnly) return;

    const group = this._getGroupState();

    // Parent checkbox uses group's toggleParent
    if (group && this.parent) {
      const eventDetails = createChangeEventDetails(event);
      group.toggleParent(eventDetails);
      return;
    }

    // Child checkbox in a group uses group's toggleChild
    if (group) {
      const nextChecked = !this.getChecked();
      const eventDetails = createChangeEventDetails(event);
      group.toggleChild(this.value, nextChecked, eventDetails);
      return;
    }

    // Standalone checkbox
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
    if (event.target === this._input) return;
    const state = this.getState();
    if (state.disabled || state.readOnly) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    this._toggle(event);
  };

  private _handleKeyDown = (event: KeyboardEvent) => {
    if (this.getState().disabled) return;
    if (event.target !== this) return;

    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
    }

    if (event.key === 'Enter') {
      this._toggle(event);
    }
  };

  private _handleKeyUp = (event: KeyboardEvent) => {
    if (this.getState().disabled || this.readOnly) return;
    if (event.target !== this) return;

    if (event.key === ' ') {
      this._toggle(event);
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

    if (group && this.parent) {
      const eventDetails = createChangeEventDetails(event);
      group.toggleParent(eventDetails);
      input.checked = this.getChecked();
      return;
    }

    if (group) {
      const nextChecked = input.checked;
      const eventDetails = createChangeEventDetails(event);
      group.toggleChild(this.value, nextChecked, eventDetails);
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

  private _getGroupState(): CheckboxGroupRuntimeState | null {
    return getCheckboxGroupRuntimeState(this._groupRoot);
  }

  private _syncGroupRoot(root: Element | null) {
    if (this._groupRoot === root) return;

    this._groupRoot?.removeEventListener(
      CHECKBOX_GROUP_STATE_CHANGE_EVENT,
      this._handleGroupStateChange,
    );
    this._groupRoot = root;
    this._groupRoot?.addEventListener(
      CHECKBOX_GROUP_STATE_CHANGE_EVENT,
      this._handleGroupStateChange,
    );
  }

  private _syncGroupDisabledState() {
    const group = this._getGroupState();
    if (!group || this.parent || !this.value) return;

    group.disabledStates.set(this.value, this.disabled);
  }

  private _cleanupGroupDisabledState() {
    const group = this._getGroupState();
    if (!group || this.parent || !this.value) return;

    group.disabledStates.delete(this.value);
  }

  private _handleGroupStateChange = () => {
    this.syncAttributes();
  };
}

if (!customElements.get('checkbox-root')) {
  customElements.define('checkbox-root', CheckboxRootElement);
}

// ─── CheckboxIndicatorElement ───────────────────────────────────────────────────

/**
 * Indicates whether the checkbox is checked.
 * Renders a `<checkbox-indicator>` custom element.
 */
export class CheckboxIndicatorElement extends BaseHTMLElement {
  static get observedAttributes() {
    return ['keep-mounted'];
  }

  private _root: CheckboxRootElement | null = null;
  private _handler = () => this._syncVisibility();

  connectedCallback() {
    this._root = this.closest('checkbox-root') as CheckboxRootElement | null;
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
    const shouldShow = state.checked || state.indeterminate;

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

    if (state.indeterminate) {
      this.setAttribute('data-indeterminate', '');
      this.removeAttribute('data-checked');
      this.removeAttribute('data-unchecked');
    } else if (state.checked) {
      this.setAttribute('data-checked', '');
      this.removeAttribute('data-unchecked');
      this.removeAttribute('data-indeterminate');
    } else {
      this.setAttribute('data-unchecked', '');
      this.removeAttribute('data-checked');
      this.removeAttribute('data-indeterminate');
    }

    this.toggleAttribute('data-disabled', state.disabled);
    this.toggleAttribute('data-readonly', state.readOnly);
    this.toggleAttribute('data-required', state.required);
  }
}

if (!customElements.get('checkbox-indicator')) {
  customElements.define('checkbox-indicator', CheckboxIndicatorElement);
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function createChangeEventDetails(event: Event): CheckboxRootChangeEventDetails {
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

export namespace CheckboxRoot {
  export type State = CheckboxRootState;
  export type ChangeEventDetails = CheckboxRootChangeEventDetails;
}

export namespace CheckboxIndicator {
  export type State = CheckboxIndicatorState;
}

// ─── Global type declarations ───────────────────────────────────────────────────

declare global {
  interface HTMLElementTagNameMap {
    'checkbox-root': CheckboxRootElement;
    'checkbox-indicator': CheckboxIndicatorElement;
  }
}
