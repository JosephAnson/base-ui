import { ReactiveElement } from 'lit';
import { useRender } from '../use-render';
import {
  RADIO_GROUP_ATTRIBUTE,
  RADIO_GROUP_STATE_CHANGE_EVENT,
  createRadioGroupId,
  setRadioGroupRuntimeState,
  type RadioGroupRuntimeState,
} from './shared';

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
  allowPropagation(): void;
  readonly isCanceled: boolean;
  readonly isPropagationAllowed: boolean;
  reason: 'none';
  trigger: Element | undefined;
}

export interface RadioGroupProps<Value = unknown> extends useRender.ComponentProps<
  'div',
  RadioGroupState
> {
  /**
   * Controlled selected value.
   */
  value?: Value | undefined;
  /**
   * Default selected value for uncontrolled mode.
   */
  defaultValue?: Value | undefined;
  /**
   * Whether the group is disabled.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Whether the group is read-only.
   * @default false
   */
  readOnly?: boolean | undefined;
  /**
   * Whether the group is required.
   * @default false
   */
  required?: boolean | undefined;
  /**
   * Shared input name for form submission.
   */
  name?: string | undefined;
  /**
   * Callback fired when the selected value changes.
   */
  onValueChange?: ((value: Value, eventDetails: RadioGroupChangeEventDetails) => void) | undefined;
}

export type RadioGroupChangeEventReason = RadioGroupChangeEventDetails['reason'];

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
  onValueChange: ((value: unknown, eventDetails: RadioGroupChangeEventDetails) => void) | undefined;

  private controlledValue: unknown = undefined;
  private isValueControlled = false;
  private internalValue: unknown = undefined;
  private initialValue: unknown = undefined;
  private initialized = false;
  private groupId = '';

  private controlEntries = new Map<HTMLElement, RadioEntry>();
  private inputEntries = new Map<HTMLInputElement, RadioEntry>();
  private pendingFocusValue: unknown = NO_PENDING_FOCUS;
  private focused = false;
  private touched = false;
  private syncQueued = false;
  private lastPublishedStateKey: string | null = null;

  /** Controlled value. When set, the group becomes controlled. */
  get value(): unknown {
    return this.isValueControlled ? this.controlledValue : this.internalValue;
  }

  set value(val: unknown) {
    this.isValueControlled = true;
    const old = this.controlledValue;
    this.controlledValue = val;
    if (!Object.is(old, val)) {
      this.requestUpdate();
    }
  }

  /** Default value for uncontrolled mode. */
  get defaultValue(): unknown {
    return this.internalValue;
  }

  set defaultValue(val: unknown) {
    if (!this.initialized) {
      this.internalValue = val;
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

    if (!this.initialized) {
      this.initialized = true;
      this.initialValue = this.isValueControlled ? this.controlledValue : this.internalValue;
      this.groupId = createRadioGroupId();
    }

    this.setAttribute(RADIO_GROUP_ATTRIBUTE, '');
    this.addEventListener('focusin', this.handleFocusIn);
    this.addEventListener('focusout', this.handleFocusOut);
    // Publish runtime state immediately so child radios can find it during their connectedCallback
    setRadioGroupRuntimeState(this, this.getRuntimeState());
    this.syncAttributes();
    this.scheduleDomSync();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('focusin', this.handleFocusIn);
    this.removeEventListener('focusout', this.handleFocusOut);
    setRadioGroupRuntimeState(this, null);
    this.controlEntries.clear();
    this.inputEntries.clear();
    this.pendingFocusValue = NO_PENDING_FOCUS;
    this.focused = false;
    this.touched = false;
  }

  protected override updated() {
    this.syncAttributes();
    this.scheduleDomSync();
  }

  getState(): RadioGroupState {
    const currentValue = this.getCurrentValue();
    return {
      disabled: this.disabled,
      dirty: !Object.is(this.initialValue, currentValue),
      filled: currentValue != null,
      focused: this.focused,
      readOnly: this.readOnly,
      required: this.required,
      touched: this.touched,
      valid: null,
    };
  }

  private getCurrentValue(): unknown {
    if (this.isValueControlled) {
      return this.controlledValue;
    }
    return this.internalValue;
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

    this.syncStateDataAttributes();
  }

  private syncStateDataAttributes() {
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

  private getRuntimeState(): RadioGroupRuntimeState {
    return {
      id: this.groupId,
      name: this.name,
      checkedValue: this.getCurrentValue(),
      disabled: this.disabled,
      readOnly: this.readOnly,
      required: this.required,
      registerControl: (element, value, disabled) => {
        const existing = this.controlEntries.get(element);
        if (existing && Object.is(existing.value, value) && existing.disabled === disabled) {
          return;
        }
        this.controlEntries.set(element, { value, disabled });
        this.scheduleDomSync();
      },
      unregisterControl: (element) => {
        if (this.controlEntries.delete(element)) {
          this.scheduleDomSync();
        }
      },
      registerInput: (input, value, disabled) => {
        const existing = this.inputEntries.get(input);
        if (existing && Object.is(existing.value, value) && existing.disabled === disabled) {
          return;
        }
        this.inputEntries.set(input, { value, disabled });
        this.scheduleDomSync();
      },
      unregisterInput: (input) => {
        if (this.inputEntries.delete(input)) {
          this.scheduleDomSync();
        }
      },
      setCheckedValue: (value, eventDetails) => {
        return this.commitValue(value, eventDetails);
      },
      getTabIndex: (value, disabled) => {
        return this.getTabIndex(value, disabled);
      },
      moveFocus: (currentControl, key, event) => {
        return this.moveFocus(currentControl, key, event);
      },
    };
  }

  private commitValue(nextValue: unknown, eventDetails: RadioGroupChangeEventDetails): boolean {
    this.onValueChange?.(nextValue, eventDetails);

    if (eventDetails.isCanceled) {
      return false;
    }

    // In uncontrolled mode, update internal value
    if (!this.isValueControlled) {
      this.internalValue = nextValue;
    }

    this.syncStateDataAttributes();
    this.scheduleDomSync();

    return !this.isValueControlled || Object.is(this.controlledValue, nextValue);
  }

  private getTabIndex(value: unknown, disabled: boolean): number {
    if (disabled) {
      return -1;
    }

    const entries = this.getOrderedControls().filter((entry) => !entry.disabled);
    if (entries.length === 0) {
      return -1;
    }

    const currentValue = this.getCurrentValue();
    const checkedEntry = entries.find((entry) => Object.is(entry.value, currentValue));

    if (checkedEntry) {
      return Object.is(checkedEntry.value, value) ? 0 : -1;
    }

    // No checked entry — first enabled gets tabindex 0
    return Object.is(entries[0]?.value, value) ? 0 : -1;
  }

  private moveFocus(
    currentControl: HTMLElement,
    key: string,
    event: KeyboardEvent,
  ): { handled: boolean; selectionCommitted: boolean } {
    const direction = getMovementDirection(key, this);
    if (direction === 0) {
      return { handled: false, selectionCommitted: false };
    }

    const entries = this.getOrderedControls().filter((entry) => !entry.disabled);
    if (entries.length === 0) {
      return { handled: false, selectionCommitted: false };
    }

    const currentIndex = entries.findIndex((entry) => entry.control === currentControl);
    const safeIndex = currentIndex === -1 ? 0 : currentIndex;
    const nextIndex = (safeIndex + direction + entries.length) % entries.length;
    const nextEntry = entries[nextIndex];

    if (!nextEntry) {
      return { handled: false, selectionCommitted: false };
    }

    this.focused = true;
    this.touched = true;
    this.syncStateDataAttributes();
    this.pendingFocusValue = nextEntry.value;
    nextEntry.control.focus({ preventScroll: true });

    const currentValue = this.getCurrentValue();
    if (!Object.is(nextEntry.value, currentValue)) {
      const eventDetails = createChangeEventDetails(event);
      const committed = this.commitValue(nextEntry.value, eventDetails);
      return { handled: true, selectionCommitted: committed };
    }

    this.pendingFocusValue = NO_PENDING_FOCUS;
    nextEntry.control.focus({ preventScroll: true });
    this.scheduleDomSync();

    return { handled: true, selectionCommitted: true };
  }

  private getOrderedControls(): OrderedControlEntry[] {
    const controls = Array.from(this.querySelectorAll<HTMLElement>('radio-root'));

    return controls
      .map((control) => {
        const entry = this.controlEntries.get(control);
        if (!entry) {
          return null;
        }
        return { control, value: entry.value, disabled: entry.disabled };
      })
      .filter((entry): entry is OrderedControlEntry => entry != null);
  }

  private handleFocusIn = () => {
    if (this.focused) {
      return;
    }
    this.focused = true;
    this.syncStateDataAttributes();
  };

  private handleFocusOut = (event: FocusEvent) => {
    if (this.contains(event.relatedTarget as Node | null)) {
      return;
    }

    const didChange = this.focused || !this.touched;
    this.focused = false;
    this.touched = true;

    if (didChange) {
      this.syncStateDataAttributes();
    }
  };

  private scheduleDomSync() {
    if (this.syncQueued) {
      return;
    }

    this.syncQueued = true;
    queueMicrotask(() => {
      queueMicrotask(() => {
        this.syncQueued = false;
        this.publishStateChange();
      });
    });
  }

  private publishStateChange() {
    const runtimeState = this.getRuntimeState();
    setRadioGroupRuntimeState(this, runtimeState);

    const stateKey = JSON.stringify({
      checkedValue: runtimeState.checkedValue,
      disabled: runtimeState.disabled,
      readOnly: runtimeState.readOnly,
      required: runtimeState.required,
      name: runtimeState.name,
      controls: this.controlEntries.size,
      inputs: this.inputEntries.size,
    });

    if (stateKey === this.lastPublishedStateKey) {
      return;
    }

    this.lastPublishedStateKey = stateKey;
    this.dispatchEvent(new CustomEvent(RADIO_GROUP_STATE_CHANGE_EVENT));
    this.restoreFocusAfterUpdate();
  }

  private restoreFocusAfterUpdate() {
    const focusValue = this.pendingFocusValue;
    if (focusValue === NO_PENDING_FOCUS) {
      return;
    }

    queueMicrotask(() => {
      queueMicrotask(() => {
        if (!this.isConnected) {
          return;
        }

        this.pendingFocusValue = NO_PENDING_FOCUS;
        const entry = this.getOrderedControls().find(
          (orderedEntry) => !orderedEntry.disabled && Object.is(orderedEntry.value, focusValue),
        );
        const control = entry?.control;

        if (!control || !control.isConnected || control === control.ownerDocument?.activeElement) {
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

/**
 * Provides a shared state to a series of radio buttons.
 * Renders a `<div>` element by default.
 *
 * Documentation: [Base UI Radio](https://base-ui.com/react/components/radio)
 */
export function RadioGroup<Value = unknown>(props: RadioGroup.Props<Value>) {
  const {
    defaultValue,
    disabled = false,
    name,
    onValueChange,
    readOnly = false,
    render,
    required = false,
    value,
    ...elementProps
  } = props;

  const state: RadioGroupState = {
    disabled,
    dirty: false,
    filled: value != null || defaultValue != null,
    focused: false,
    readOnly,
    required,
    touched: false,
    valid: null,
  };

  return useRender({
    defaultTagName: 'div',
    render,
    state,
    ref: createRadioGroupBehaviorRef({
      defaultValue,
      disabled,
      name,
      onValueChange,
      readOnly,
      required,
      value,
    }),
    props: {
      [RADIO_GROUP_ATTRIBUTE]: '',
      role: 'radiogroup',
      ...elementProps,
    },
  });
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
  if (key === 'ArrowDown') {
    return 1;
  }
  if (key === 'ArrowUp') {
    return -1;
  }

  const isRtl = getDirection(root) === 'rtl';
  if (key === 'ArrowRight') {
    return isRtl ? -1 : 1;
  }
  if (key === 'ArrowLeft') {
    return isRtl ? 1 : -1;
  }

  return 0;
}

function getDirection(root: HTMLElement | null): 'ltr' | 'rtl' {
  if (!root) {
    return 'ltr';
  }
  const documentElement = root.ownerDocument?.documentElement;
  const dir = root.closest('[dir]')?.getAttribute('dir') ?? documentElement?.getAttribute('dir');
  return dir === 'rtl' ? 'rtl' : 'ltr';
}

function createChangeEventDetails(event: Event): RadioGroupChangeEventDetails {
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

export namespace RadioGroup {
  export type Props<TValue = unknown> = RadioGroupProps<TValue>;
  export type State = RadioGroupState;
  export type ChangeEventReason = RadioGroupChangeEventReason;
  export type ChangeEventDetails = RadioGroupChangeEventDetails;
}

function createRadioGroupBehaviorRef<Value>(options: {
  defaultValue: Value | undefined;
  disabled: boolean;
  name: string | undefined;
  onValueChange: ((value: Value, eventDetails: RadioGroupChangeEventDetails) => void) | undefined;
  readOnly: boolean;
  required: boolean;
  value: Value | undefined;
}) {
  let element: HTMLElement | null = null;
  let internalValue = options.defaultValue;
  const initialValue = options.value ?? options.defaultValue;
  const groupId = createRadioGroupId();
  let controlEntries = new Map<HTMLElement, RadioEntry>();
  let inputEntries = new Map<HTMLInputElement, RadioEntry>();
  let pendingFocusValue: unknown = NO_PENDING_FOCUS;
  let focused = false;
  let touched = false;
  let lastPublishedStateKey: string | null = null;

  const getCurrentValue = () => (options.value !== undefined ? options.value : internalValue);

  const getState = (): RadioGroupState => {
    const currentValue = getCurrentValue();

    return {
      disabled: options.disabled,
      dirty: !Object.is(initialValue, currentValue),
      filled: currentValue != null,
      focused,
      readOnly: options.readOnly,
      required: options.required,
      touched,
      valid: null,
    };
  };

  const getOrderedControls = (): OrderedControlEntry[] => {
    if (element == null) {
      return [];
    }

    const controls = Array.from(
      element.querySelectorAll<HTMLElement>('[data-base-ui-radio-control], radio-root'),
    );

    return controls
      .map((control) => {
        const entry = controlEntries.get(control);
        if (!entry) {
          return null;
        }

        return { control, value: entry.value, disabled: entry.disabled };
      })
      .filter((entry): entry is OrderedControlEntry => entry != null);
  };

  function publishStateChange() {
    if (element == null) {
      return;
    }

    const runtimeState = getRuntimeState();
    setRadioGroupRuntimeState(element, runtimeState);

    const stateKey = JSON.stringify({
      checkedValue: runtimeState.checkedValue,
      disabled: runtimeState.disabled,
      readOnly: runtimeState.readOnly,
      required: runtimeState.required,
      name: runtimeState.name,
      controls: controlEntries.size,
      inputs: inputEntries.size,
    });

    if (stateKey === lastPublishedStateKey) {
      return;
    }

    lastPublishedStateKey = stateKey;
    element.dispatchEvent(new CustomEvent(RADIO_GROUP_STATE_CHANGE_EVENT));
    restoreFocusAfterUpdate();
  }

  const syncStateDataAttributes = () => {
    if (element == null) {
      return;
    }

    const state = getState();

    element.toggleAttribute('data-disabled', state.disabled);
    element.toggleAttribute('data-dirty', state.dirty);
    element.toggleAttribute('data-filled', state.filled);
    element.toggleAttribute('data-focused', state.focused);
    element.toggleAttribute('data-readonly', state.readOnly);
    element.toggleAttribute('data-required', state.required);
    element.toggleAttribute('data-touched', state.touched);

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
  };

  function getRuntimeState(): RadioGroupRuntimeState<Value> {
    return {
      id: groupId,
      name: options.name,
      checkedValue: getCurrentValue(),
      disabled: options.disabled,
      readOnly: options.readOnly,
      required: options.required,
      registerControl: (control, value, disabled) => {
        const existing = controlEntries.get(control);
        if (existing && Object.is(existing.value, value) && existing.disabled === disabled) {
          return;
        }

        controlEntries.set(control, { value, disabled });
        sync();
      },
      unregisterControl: (control) => {
        if (controlEntries.delete(control)) {
          sync();
        }
      },
      registerInput: (input, value, disabled) => {
        const existing = inputEntries.get(input);
        if (existing && Object.is(existing.value, value) && existing.disabled === disabled) {
          return;
        }

        inputEntries.set(input, { value, disabled });
        sync();
      },
      unregisterInput: (input) => {
        if (inputEntries.delete(input)) {
          sync();
        }
      },
      setCheckedValue: (nextValue, eventDetails) => commitValue(nextValue, eventDetails),
      getTabIndex: (value, disabled) => getTabIndex(value, disabled),
      moveFocus: (currentControl, key, event) => moveFocus(currentControl, key, event),
    };
  }

  function commitValue(nextValue: Value, eventDetails: RadioGroupChangeEventDetails) {
    options.onValueChange?.(nextValue, eventDetails);

    if (eventDetails.isCanceled) {
      return false;
    }

    if (options.value === undefined) {
      internalValue = nextValue;
    }

    sync();

    return options.value === undefined || Object.is(options.value, nextValue);
  }

  function getTabIndex(value: Value, disabled: boolean) {
    if (disabled) {
      return -1;
    }

    const entries = getOrderedControls().filter((entry) => !entry.disabled);
    if (entries.length === 0) {
      return -1;
    }

    const currentValue = getCurrentValue();
    const checkedEntry = entries.find((entry) => Object.is(entry.value, currentValue));

    if (checkedEntry) {
      return Object.is(checkedEntry.value, value) ? 0 : -1;
    }

    return Object.is(entries[0]?.value, value) ? 0 : -1;
  }

  function moveFocus(
    currentControl: HTMLElement,
    key: string,
    event: KeyboardEvent,
  ): RadioGroupMoveFocusResult {
    const direction = getMovementDirection(key, element);
    if (direction === 0) {
      return { handled: false, selectionCommitted: false };
    }

    const entries = getOrderedControls().filter((entry) => !entry.disabled);
    if (entries.length === 0) {
      return { handled: false, selectionCommitted: false };
    }

    const currentIndex = entries.findIndex((entry) => entry.control === currentControl);
    const safeIndex = currentIndex === -1 ? 0 : currentIndex;
    const nextIndex = (safeIndex + direction + entries.length) % entries.length;
    const nextEntry = entries[nextIndex];

    if (!nextEntry) {
      return { handled: false, selectionCommitted: false };
    }

    focused = true;
    touched = true;
    pendingFocusValue = nextEntry.value;
    syncStateDataAttributes();
    nextEntry.control.focus({ preventScroll: true });

    const currentValue = getCurrentValue();
    if (!Object.is(nextEntry.value, currentValue)) {
      const eventDetails = createChangeEventDetails(event);
      const committed = commitValue(nextEntry.value as Value, eventDetails);
      return { handled: true, selectionCommitted: committed };
    }

    pendingFocusValue = NO_PENDING_FOCUS;
    sync();

    return { handled: true, selectionCommitted: true };
  }

  function restoreFocusAfterUpdate() {
    const focusValue = pendingFocusValue;
    if (focusValue === NO_PENDING_FOCUS) {
      return;
    }

    queueMicrotask(() => {
      if (element == null || !element.isConnected) {
        return;
      }

      pendingFocusValue = NO_PENDING_FOCUS;
      const entry = getOrderedControls().find(
        (orderedEntry) => !orderedEntry.disabled && Object.is(orderedEntry.value, focusValue),
      );
      const control = entry?.control;

      if (!control || !control.isConnected || control === control.ownerDocument?.activeElement) {
        return;
      }

      control.focus({ preventScroll: true });
    });
  }

  const handleFocusIn = () => {
    if (focused) {
      return;
    }

    focused = true;
    syncStateDataAttributes();
  };

  const handleFocusOut = (event: FocusEvent) => {
    if (element?.contains(event.relatedTarget as Node | null)) {
      return;
    }

    const didChange = focused || !touched;
    focused = false;
    touched = true;

    if (didChange) {
      syncStateDataAttributes();
    }
  };

  function sync() {
    if (element == null) {
      return;
    }

    element.setAttribute(RADIO_GROUP_ATTRIBUTE, '');
    element.setAttribute('role', 'radiogroup');

    if (options.disabled) {
      element.setAttribute('aria-disabled', 'true');
    } else {
      element.removeAttribute('aria-disabled');
    }

    if (options.readOnly) {
      element.setAttribute('aria-readonly', 'true');
    } else {
      element.removeAttribute('aria-readonly');
    }

    if (options.required) {
      element.setAttribute('aria-required', 'true');
    } else {
      element.removeAttribute('aria-required');
    }

    syncStateDataAttributes();
    publishStateChange();
  }

  return (instance: HTMLElement | null) => {
    element?.removeEventListener('focusin', handleFocusIn);
    element?.removeEventListener('focusout', handleFocusOut);
    if (element != null) {
      setRadioGroupRuntimeState(element, null);
    }

    controlEntries = new Map();
    inputEntries = new Map();
    pendingFocusValue = NO_PENDING_FOCUS;
    focused = false;
    touched = false;
    lastPublishedStateKey = null;
    element = instance;

    if (element == null) {
      return;
    }

    element.addEventListener('focusin', handleFocusIn);
    element.addEventListener('focusout', handleFocusOut);
    sync();
  };
}

// ─── Re-export shared types for consumers ───────────────────────────────────────

export type { RadioGroupRuntimeState } from './shared';

// ─── Global type declarations ───────────────────────────────────────────────────

declare global {
  interface HTMLElementTagNameMap {
    'radio-group': RadioGroupElement;
  }
}
