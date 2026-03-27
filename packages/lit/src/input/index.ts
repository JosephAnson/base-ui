import { ReactiveElement } from 'lit';
import type { BaseUIChangeEventDetails } from '../types';
import { useRender } from '../use-render';

type InputLikeElement = HTMLInputElement | HTMLTextAreaElement;
type InputValue = string | number | readonly string[] | undefined;

interface InputBehaviorOptions {
  disabled: boolean;
  defaultValue: InputValue;
  onValueChange: ((value: string, eventDetails: InputChangeEventDetails) => void) | undefined;
  value: InputValue;
}

interface InputBehaviorState {
  focused: boolean;
  initialValue: string;
  touched: boolean;
}

const inputBehaviorState = new WeakMap<InputLikeElement, InputBehaviorState>();

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

export type InputChangeEventDetails = BaseUIChangeEventDetails<'none'>;

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
  private controlledValue: InputValue;
  defaultValue: InputValue;
  private inputElement: InputLikeElement | null = null;

  /** Controlled value. Set via `.value=${val}`. */
  get value(): InputValue {
    return this.controlledValue;
  }

  set value(val: InputValue) {
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
    const element = this.querySelector('input, textarea') as InputLikeElement | null;
    if (element) {
      this.attachInput(element);
    }
  }

  private attachInput(element: InputLikeElement) {
    this.inputElement = element;

    if (this.controlledValue !== undefined) {
      element.value = stringifyInputValue(this.controlledValue);
    } else if (!this.initialized && this.defaultValue !== undefined) {
      element.value = stringifyInputValue(this.defaultValue);
    }

    if (!this.initialized) {
      this.initialized = true;
      this.initialValue = element.value;
      this.stateData = {
        disabled: this.disabled,
        touched: false,
        dirty: false,
        valid: readValidityState(element),
        filled: element.value !== '',
        focused: false,
      };
    }

    element.addEventListener('input', this.handleInput);
    element.addEventListener('focus', this.handleFocus);
    element.addEventListener('blur', this.handleBlur);
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
    const element = event.currentTarget as InputLikeElement;
    const nextValue = element.value;

    this.onValueChange?.(nextValue, createChangeEventDetails(event, element));

    if (this.controlledValue !== undefined) {
      element.value = stringifyInputValue(this.controlledValue);
    }

    this.updateState({
      dirty:
        (this.controlledValue !== undefined
          ? stringifyInputValue(this.controlledValue)
          : nextValue) !== this.initialValue,
      filled:
        (this.controlledValue !== undefined
          ? stringifyInputValue(this.controlledValue)
          : nextValue) !== '',
      valid: readValidityState(element),
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
    const nextState: InputState = { ...this.stateData, ...partial };

    if (isEqualInputState(this.stateData, nextState)) {
      return;
    }

    this.stateData = nextState;
    this.syncDataAttributes();
  }

  private syncDataAttributes() {
    const element = this.inputElement;
    if (!element) {
      return;
    }

    syncStateDataAttributes(element, this.stateData);
  }
}

if (!customElements.get('input-root')) {
  customElements.define('input-root', InputRootElement);
}

// ─── Input Helper ───────────────────────────────────────────────────────────────

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
  defaultValue?: InputValue;
  /**
   * The value of the input. Use when controlled.
   */
  value?: InputValue;
}

export interface InputProps extends InputRootProps, useRender.ComponentProps<'input', InputState> {}

/**
 * A native input element that automatically works with Base UI render props.
 * Renders an `<input>` element by default.
 *
 * Documentation: [Base UI Input](https://base-ui.com/react/components/input)
 */
export function Input(props: Input.Props) {
  const { defaultValue, disabled = false, onValueChange, render, value, ...elementProps } = props;

  return useRender({
    defaultTagName: 'input',
    render,
    ref: createInputBehaviorRef({
      defaultValue,
      disabled,
      onValueChange,
      value,
    }),
    props: {
      defaultValue:
        defaultValue === undefined || value !== undefined
          ? undefined
          : stringifyInputValue(defaultValue),
      disabled,
      value: value === undefined ? undefined : stringifyInputValue(value),
      ...elementProps,
    },
  });
}

export namespace InputRoot {
  export type Props = InputRootProps;
  export type State = InputState;
  export type ChangeEventReason = InputChangeEventReason;
  export type ChangeEventDetails = InputChangeEventDetails;
}

export namespace Input {
  export type Props = InputProps;
  export type State = InputState;
  export type ChangeEventReason = InputChangeEventReason;
  export type ChangeEventDetails = InputChangeEventDetails;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function createInputBehaviorRef(options: InputBehaviorOptions) {
  let cleanup: (() => void) | null = null;

  return (element: Element | null) => {
    cleanup?.();
    cleanup = null;

    if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) {
      return;
    }

    cleanup = applyInputBehavior(element, options);
  };
}

function applyInputBehavior(element: InputLikeElement, options: InputBehaviorOptions) {
  const state = getOrCreateInputBehaviorState(element, options);

  syncInputBehavior(element, state, options);

  const handleInput = (event: Event) => {
    const currentTarget = event.currentTarget as InputLikeElement;
    const nextValue = currentTarget.value;

    options.onValueChange?.(nextValue, createChangeEventDetails(event, currentTarget));

    if (options.value !== undefined) {
      currentTarget.value = stringifyInputValue(options.value);
    }

    syncInputBehavior(currentTarget, state, options);
  };

  const handleFocus = (event: FocusEvent) => {
    state.focused = true;
    syncInputBehavior(event.currentTarget as InputLikeElement, state, options);
  };

  const handleBlur = (event: FocusEvent) => {
    state.focused = false;
    state.touched = true;
    syncInputBehavior(event.currentTarget as InputLikeElement, state, options);
  };

  element.addEventListener('input', handleInput);
  element.addEventListener('focus', handleFocus);
  element.addEventListener('blur', handleBlur);

  return () => {
    element.removeEventListener('input', handleInput);
    element.removeEventListener('focus', handleFocus);
    element.removeEventListener('blur', handleBlur);
  };
}

function getOrCreateInputBehaviorState(
  element: InputLikeElement,
  options: InputBehaviorOptions,
): InputBehaviorState {
  let state = inputBehaviorState.get(element);

  if (state != null) {
    return state;
  }

  if (options.value !== undefined) {
    element.value = stringifyInputValue(options.value);
  } else if (options.defaultValue !== undefined) {
    element.value = stringifyInputValue(options.defaultValue);
  }

  state = {
    focused: element.ownerDocument.activeElement === element,
    initialValue: element.value,
    touched: false,
  };

  inputBehaviorState.set(element, state);
  return state;
}

function syncInputBehavior(
  element: InputLikeElement,
  state: InputBehaviorState,
  options: InputBehaviorOptions,
) {
  if (options.value !== undefined) {
    element.value = stringifyInputValue(options.value);
  }

  const currentValue =
    options.value !== undefined ? stringifyInputValue(options.value) : element.value;

  syncStateDataAttributes(element, {
    disabled: options.disabled,
    touched: state.touched,
    dirty: currentValue !== state.initialValue,
    valid: readValidityState(element),
    filled: currentValue !== '',
    focused: state.focused,
  });
}

function syncStateDataAttributes(element: InputLikeElement, state: InputState) {
  element.disabled = state.disabled;
  element.toggleAttribute('data-disabled', state.disabled);
  element.toggleAttribute('data-touched', state.touched);
  element.toggleAttribute('data-dirty', state.dirty);
  element.toggleAttribute('data-filled', state.filled);
  element.toggleAttribute('data-focused', state.focused);

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

function stringifyInputValue(value: InputValue): string {
  if (value == null) {
    return '';
  }

  if (Array.isArray(value)) {
    return value.join(',');
  }

  return String(value);
}

function readValidityState(element: InputLikeElement | null): boolean | null {
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

// ─── Global type declarations ───────────────────────────────────────────────────

declare global {
  interface HTMLElementTagNameMap {
    'input-root': InputRootElement;
  }
}
