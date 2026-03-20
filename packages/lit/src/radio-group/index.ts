import { ReactiveElement } from 'lit';
import {
  RADIO_GROUP_ATTRIBUTE,
  RADIO_GROUP_STATE_CHANGE_EVENT,
  createRadioGroupId,
  setRadioGroupRuntimeState,
  type RadioGroupRuntimeState,
} from './shared.ts';

// ─── Constants ──────────────────────────────────────────────────────────────────

const NO_PENDING_FOCUS = Symbol('base-ui-radio-group-no-pending-focus');

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface RadioGroupState {
  disabled: boolean;
  dirty: boolean;
  filled: boolean;
  focused: boolean;
  readOnly: boolean;
  required: boolean;
  touched: boolean;
  valid: boolean | null;
}

export interface RadioGroupChangeEventDetails {
  event: Event;
  cancel(): void;
  readonly isCanceled: boolean;
  reason: 'none';
}

// ─── RadioGroupElement ──────────────────────────────────────────────────────────

/**
 * Provides a shared state to a series of radio buttons.
 * Renders a `<radio-group>` custom element.
 *
 * Documentation: [Base UI Radio Group](https://base-ui.com/react/components/radio)
 */
export class RadioGroupElement extends ReactiveElement {
  static properties = {
    disabled: { type: Boolean },
    readOnly: { type: Boolean, attribute: 'read-only' },
    required: { type: Boolean },
    name: { type: String },
  };

  declare disabled: boolean;
  declare readOnly: boolean;
  declare required: boolean;
  declare name: string | undefined;

  /** Callback fired when the selected value changes. Set via `.onValueChange=${fn}`. */
  onValueChange:
    | ((value: unknown, eventDetails: RadioGroupChangeEventDetails) => void)
    | undefined;

  private _value: unknown = undefined;
  private _valueIsControlled = false;
  private _internalValue: unknown = undefined;
  private _initialValue: unknown = undefined;
  private _initialized = false;
  private _groupId = '';

  private _controlEntries = new Map<HTMLElement, RadioEntry>();
  private _inputEntries = new Map<HTMLInputElement, RadioEntry>();
  private _pendingFocusValue: unknown = NO_PENDING_FOCUS;
  private _focused = false;
  private _touched = false;
  private _syncQueued = false;
  private _lastPublishedStateKey: string | null = null;

  /** Controlled value. When set, the group becomes controlled. */
  get value(): unknown {
    return this._valueIsControlled ? this._value : this._internalValue;
  }

  set value(val: unknown) {
    this._valueIsControlled = true;
    const old = this._value;
    this._value = val;
    if (!Object.is(old, val)) {
      this.requestUpdate();
    }
  }

  /** Default value for uncontrolled mode. */
  get defaultValue(): unknown {
    return this._internalValue;
  }

  set defaultValue(val: unknown) {
    if (!this._initialized) {
      this._internalValue = val;
    }
  }

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

    if (!this._initialized) {
      this._initialized = true;
      this._initialValue = this._valueIsControlled
        ? this._value
        : this._internalValue;
      this._groupId = createRadioGroupId();
    }

    this.setAttribute(RADIO_GROUP_ATTRIBUTE, '');
    this.addEventListener('focusin', this._handleFocusIn);
    this.addEventListener('focusout', this._handleFocusOut);
    // Publish runtime state immediately so child radios can find it during their connectedCallback
    setRadioGroupRuntimeState(this, this._getRuntimeState());
    this.syncAttributes();
    this._scheduleDomSync();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('focusin', this._handleFocusIn);
    this.removeEventListener('focusout', this._handleFocusOut);
    setRadioGroupRuntimeState(this, null);
    this._controlEntries.clear();
    this._inputEntries.clear();
    this._pendingFocusValue = NO_PENDING_FOCUS;
    this._focused = false;
    this._touched = false;
  }

  protected override updated() {
    this.syncAttributes();
    this._scheduleDomSync();
  }

  getState(): RadioGroupState {
    const currentValue = this._getCurrentValue();
    return {
      disabled: this.disabled,
      dirty: !Object.is(this._initialValue, currentValue),
      filled: currentValue != null,
      focused: this._focused,
      readOnly: this.readOnly,
      required: this.required,
      touched: this._touched,
      valid: null,
    };
  }

  private _getCurrentValue(): unknown {
    if (this._valueIsControlled) {
      return this._value;
    }
    return this._internalValue;
  }

  private syncAttributes() {
    // ARIA
    this.setAttribute('role', 'radiogroup');

    if (this.disabled) {
      this.setAttribute('aria-disabled', 'true');
    } else {
      this.removeAttribute('aria-disabled');
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

    this._syncStateDataAttributes();
  }

  private _syncStateDataAttributes() {
    const state = this.getState();

    this.toggleAttribute('data-disabled', state.disabled);
    this.toggleAttribute('data-dirty', state.dirty);
    this.toggleAttribute('data-filled', state.filled);
    this.toggleAttribute('data-focused', state.focused);
    this.toggleAttribute('data-readonly', state.readOnly);
    this.toggleAttribute('data-required', state.required);
    this.toggleAttribute('data-touched', state.touched);

    if (state.valid === true) {
      this.setAttribute('data-valid', '');
      this.removeAttribute('data-invalid');
    } else if (state.valid === false) {
      this.removeAttribute('data-valid');
      this.setAttribute('data-invalid', '');
    } else {
      this.removeAttribute('data-valid');
      this.removeAttribute('data-invalid');
    }
  }

  private _getRuntimeState(): RadioGroupRuntimeState {
    return {
      id: this._groupId,
      name: this.name,
      checkedValue: this._getCurrentValue(),
      disabled: this.disabled,
      readOnly: this.readOnly,
      required: this.required,
      registerControl: (element, value, disabled) => {
        const existing = this._controlEntries.get(element);
        if (existing && Object.is(existing.value, value) && existing.disabled === disabled) {
          return;
        }
        this._controlEntries.set(element, { value, disabled });
        this._scheduleDomSync();
      },
      unregisterControl: (element) => {
        if (this._controlEntries.delete(element)) {
          this._scheduleDomSync();
        }
      },
      registerInput: (input, value, disabled) => {
        const existing = this._inputEntries.get(input);
        if (existing && Object.is(existing.value, value) && existing.disabled === disabled) {
          return;
        }
        this._inputEntries.set(input, { value, disabled });
        this._scheduleDomSync();
      },
      unregisterInput: (input) => {
        if (this._inputEntries.delete(input)) {
          this._scheduleDomSync();
        }
      },
      setCheckedValue: (value, eventDetails) => {
        return this._commitValue(value, eventDetails);
      },
      getTabIndex: (value, disabled) => {
        return this._getTabIndex(value, disabled);
      },
      moveFocus: (currentControl, key, event) => {
        return this._moveFocus(currentControl, key, event);
      },
    };
  }

  private _commitValue(
    nextValue: unknown,
    eventDetails: RadioGroupChangeEventDetails,
  ): boolean {
    this.onValueChange?.(nextValue, eventDetails);

    if (eventDetails.isCanceled) {
      return false;
    }

    // In uncontrolled mode, update internal value
    if (!this._valueIsControlled) {
      this._internalValue = nextValue;
    }

    this._syncStateDataAttributes();
    this._scheduleDomSync();

    return !this._valueIsControlled || Object.is(this._value, nextValue);
  }

  private _getTabIndex(value: unknown, disabled: boolean): number {
    if (disabled) return -1;

    const entries = this._getOrderedControls().filter((e) => !e.disabled);
    if (entries.length === 0) return -1;

    const currentValue = this._getCurrentValue();
    const checkedEntry = entries.find((e) => Object.is(e.value, currentValue));

    if (checkedEntry) {
      return Object.is(checkedEntry.value, value) ? 0 : -1;
    }

    // No checked entry — first enabled gets tabindex 0
    return Object.is(entries[0]?.value, value) ? 0 : -1;
  }

  private _moveFocus(
    currentControl: HTMLElement,
    key: string,
    event: KeyboardEvent,
  ): { handled: boolean; selectionCommitted: boolean } {
    const direction = getMovementDirection(key, this);
    if (direction === 0) {
      return { handled: false, selectionCommitted: false };
    }

    const entries = this._getOrderedControls().filter((e) => !e.disabled);
    if (entries.length === 0) {
      return { handled: false, selectionCommitted: false };
    }

    const currentIndex = entries.findIndex((e) => e.control === currentControl);
    const safeIndex = currentIndex === -1 ? 0 : currentIndex;
    const nextIndex = (safeIndex + direction + entries.length) % entries.length;
    const nextEntry = entries[nextIndex];

    if (!nextEntry) {
      return { handled: false, selectionCommitted: false };
    }

    this._focused = true;
    this._touched = true;
    this._syncStateDataAttributes();
    this._pendingFocusValue = nextEntry.value;
    nextEntry.control.focus({ preventScroll: true });

    const currentValue = this._getCurrentValue();
    if (!Object.is(nextEntry.value, currentValue)) {
      const eventDetails = createChangeEventDetails(event);
      const committed = this._commitValue(nextEntry.value, eventDetails);
      return { handled: true, selectionCommitted: committed };
    }

    this._pendingFocusValue = NO_PENDING_FOCUS;
    nextEntry.control.focus({ preventScroll: true });
    this._scheduleDomSync();

    return { handled: true, selectionCommitted: true };
  }

  private _getOrderedControls(): OrderedControlEntry[] {
    const controls = Array.from(
      this.querySelectorAll<HTMLElement>('radio-root'),
    );

    return controls
      .map((control) => {
        const entry = this._controlEntries.get(control);
        if (!entry) return null;
        return { control, value: entry.value, disabled: entry.disabled };
      })
      .filter((e): e is OrderedControlEntry => e != null);
  }

  private _handleFocusIn = () => {
    if (this._focused) return;
    this._focused = true;
    this._syncStateDataAttributes();
  };

  private _handleFocusOut = (event: FocusEvent) => {
    if (this.contains(event.relatedTarget as Node | null)) return;

    const didChange = this._focused || !this._touched;
    this._focused = false;
    this._touched = true;

    if (didChange) {
      this._syncStateDataAttributes();
    }
  };

  private _scheduleDomSync() {
    if (this._syncQueued) return;

    this._syncQueued = true;
    queueMicrotask(() => {
      queueMicrotask(() => {
        this._syncQueued = false;
        this._publishStateChange();
      });
    });
  }

  private _publishStateChange() {
    const runtimeState = this._getRuntimeState();
    setRadioGroupRuntimeState(this, runtimeState);

    const stateKey = JSON.stringify({
      checkedValue: runtimeState.checkedValue,
      disabled: runtimeState.disabled,
      readOnly: runtimeState.readOnly,
      required: runtimeState.required,
      name: runtimeState.name,
      controls: this._controlEntries.size,
      inputs: this._inputEntries.size,
    });

    if (stateKey === this._lastPublishedStateKey) return;

    this._lastPublishedStateKey = stateKey;
    this.dispatchEvent(new CustomEvent(RADIO_GROUP_STATE_CHANGE_EVENT));
    this._restoreFocusAfterUpdate();
  }

  private _restoreFocusAfterUpdate() {
    const focusValue = this._pendingFocusValue;
    if (focusValue === NO_PENDING_FOCUS) return;

    queueMicrotask(() => {
      queueMicrotask(() => {
        if (!this.isConnected) return;

        this._pendingFocusValue = NO_PENDING_FOCUS;
        const entry = this._getOrderedControls().find(
          (e) => !e.disabled && Object.is(e.value, focusValue),
        );
        const control = entry?.control;

        if (
          !control ||
          !control.isConnected ||
          control === control.ownerDocument?.activeElement
        ) {
          return;
        }

        control.focus({ preventScroll: true });
      });
    });
  }
}

if (!customElements.get('radio-group')) {
  customElements.define('radio-group', RadioGroupElement);
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

interface RadioEntry {
  value: unknown;
  disabled: boolean;
}

interface OrderedControlEntry {
  control: HTMLElement;
  value: unknown;
  disabled: boolean;
}

function getMovementDirection(key: string, root: HTMLElement | null): number {
  if (key === 'ArrowDown') return 1;
  if (key === 'ArrowUp') return -1;

  const isRtl = getDirection(root) === 'rtl';
  if (key === 'ArrowRight') return isRtl ? -1 : 1;
  if (key === 'ArrowLeft') return isRtl ? 1 : -1;

  return 0;
}

function getDirection(root: HTMLElement | null): 'ltr' | 'rtl' {
  if (!root) return 'ltr';
  const documentElement = root.ownerDocument?.documentElement;
  const dir =
    root.closest('[dir]')?.getAttribute('dir') ??
    documentElement?.getAttribute('dir');
  return dir === 'rtl' ? 'rtl' : 'ltr';
}

function createChangeEventDetails(
  event: Event,
): RadioGroupChangeEventDetails {
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

export namespace RadioGroup {
  export type State = RadioGroupState;
  export type ChangeEventDetails = RadioGroupChangeEventDetails;
}

// ─── Re-export shared types for consumers ───────────────────────────────────────

export type { RadioGroupRuntimeState } from './shared.ts';

// ─── Global type declarations ───────────────────────────────────────────────────

declare global {
  interface HTMLElementTagNameMap {
    'radio-group': RadioGroupElement;
  }
}
