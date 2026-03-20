import { html, type TemplateResult } from 'lit';
// eslint-disable-next-line import/extensions
import { AsyncDirective, directive } from 'lit/async-directive.js';
import { makeEventPreventable } from '../merge-props/index.ts';
import type {
  BaseUIChangeEventDetails,
  BaseUIEvent,
  ComponentRenderFn,
  HTMLProps,
} from '../types/index.ts';
import { useRender } from '../use-render/index.ts';

type InputValue = string | number | readonly string[];
type InputLikeElement = Element & { value: string };
type InputElement = HTMLInputElement | HTMLTextAreaElement;
type InputEventHandler<EventType extends Event> = (event: BaseUIEvent<EventType>) => void;

type InputRenderProps = Omit<
  HTMLProps<HTMLElement>,
  'defaultValue' | 'disabled' | 'onBlur' | 'onChange' | 'onFocus' | 'onInput' | 'value'
> & {
  defaultValue?: InputValue | undefined;
  disabled?: boolean | undefined;
  onBlur?: InputEventHandler<FocusEvent> | undefined;
  onChange?: InputEventHandler<InputEvent | Event> | undefined;
  onFocus?: InputEventHandler<FocusEvent> | undefined;
  onInput?: InputEventHandler<InputEvent | Event> | undefined;
  value?: InputValue | undefined;
};

type InputRenderProp = TemplateResult | ComponentRenderFn<InputRenderProps, InputState>;

class InputDirective extends AsyncDirective {
  private initialValue = '';
  private initialized = false;
  private latestProps: InputProps | null = null;
  private root: HTMLElement | null = null;
  private state: InputState = createInitialState(false, '');

  render(_componentProps: InputProps) {
    return html``;
  }

  override update(_part: Parameters<AsyncDirective['update']>[0], [componentProps]: [InputProps]) {
    this.latestProps = componentProps;

    const disabled = componentProps.disabled ?? false;
    const propValue = getCurrentPropValue(componentProps);

    if (!this.initialized) {
      this.initialized = true;
      this.initialValue = propValue;
      this.state = createInitialState(disabled, propValue);
    } else {
      this.state = {
        ...this.state,
        disabled,
        dirty: propValue !== this.initialValue,
        filled: propValue !== '',
      };
    }

    return this.renderCurrent();
  }

  override disconnected() {
    this.root = null;
  }

  override reconnected() {}

  private renderCurrent() {
    if (this.latestProps == null) {
      return html``;
    }

    const {
      defaultValue: _defaultValue,
      disabled = false,
      onBlur: externalOnBlur,
      onChange: externalOnChange,
      onFocus: externalOnFocus,
      onInput: externalOnInput,
      onValueChange,
      ref: _ref,
      render,
      value,
      ...elementProps
    } = this.latestProps;
    const externalRef = this.latestProps.ref as HTMLProps<HTMLElement>['ref'] | undefined;
    const isControlled = value !== undefined;
    const state = { ...this.state, disabled };
    const handleInputEvent = (event: InputEvent | Event) => {
      const baseUIEvent = makeEventPreventable(event as BaseUIEvent<InputEvent | Event>);

      externalOnInput?.(baseUIEvent);
      externalOnChange?.(baseUIEvent);

      if (baseUIEvent.baseUIHandlerPrevented) {
        return;
      }

      const currentTarget = event.currentTarget;

      if (hasInputValue(currentTarget) && currentTarget instanceof Element) {
        onValueChange?.(currentTarget.value, createChangeEventDetails(event, currentTarget));
      }

      if (isControlled && hasInputValue(currentTarget)) {
        currentTarget.value = stringifyInputValue(value);
      }

      if (hasInputElement(currentTarget)) {
        this.updateStateFromElement(currentTarget);
      } else {
        this.updateState({
          dirty:
            currentTarget != null && hasInputValue(currentTarget)
              ? currentTarget.value !== this.initialValue
              : this.state.dirty,
          filled:
            currentTarget != null && hasInputValue(currentTarget)
              ? currentTarget.value !== ''
              : this.state.filled,
        });
      }
    };
    const eventProps =
      typeof render === 'function'
        ? {
            onChange: handleInputEvent,
            onInput: handleInputEvent,
          }
        : {
            onInput: handleInputEvent,
          };

    return useRender<InputState, HTMLElement>({
      defaultTagName: 'input',
      render: this.resolveRenderProp(render, state),
      state,
      stateAttributesMapping: createInputStateAttributesMapping(),
      props: {
        disabled,
        ref: this.createRootRef(externalRef),
        ...(isControlled ? { value } : { defaultValue: this.initialValue }),
        onBlur: (event: FocusEvent) => {
          const baseUIEvent = makeEventPreventable(event as BaseUIEvent<FocusEvent>);

          externalOnBlur?.(baseUIEvent);

          if (baseUIEvent.baseUIHandlerPrevented) {
            return;
          }

          if (hasInputElement(event.currentTarget)) {
            this.updateStateFromElement(event.currentTarget, {
              focused: false,
              touched: true,
            });
          } else {
            this.updateState({
              focused: false,
              touched: true,
            });
          }
        },
        onFocus: (event: FocusEvent) => {
          const baseUIEvent = makeEventPreventable(event as BaseUIEvent<FocusEvent>);

          externalOnFocus?.(baseUIEvent);

          if (baseUIEvent.baseUIHandlerPrevented) {
            return;
          }

          if (hasInputElement(event.currentTarget)) {
            this.updateStateFromElement(event.currentTarget, { focused: true });
          } else {
            this.updateState({ focused: true });
          }
        },
        ...eventProps,
        ...elementProps,
      },
    });
  }

  private requestComponentUpdate() {
    this.setValue(this.renderCurrent());
  }

  private resolveRenderProp(render: InputRenderProp | undefined, state: InputState) {
    if (typeof render !== 'function') {
      return render;
    }

    return (props: InputRenderProps) => render(props, state);
  }

  private createRootRef(externalRef: HTMLProps<HTMLElement>['ref'] | undefined) {
    return (element: HTMLElement | null) => {
      this.root = element;
      assignRef(externalRef, element);

      if (hasInputElement(element)) {
        this.updateStateFromElement(element);
      }
    };
  }

  private updateStateFromElement(element: InputElement, partialState: Partial<InputState> = {}) {
    this.updateState({
      dirty: element.value !== this.initialValue,
      filled: element.value !== '',
      valid: readValidityState(element),
      ...partialState,
    });
  }

  private updateState(partialState: Partial<InputState>) {
    const nextState: InputState = {
      ...this.state,
      ...partialState,
    };

    if (isEqualInputState(this.state, nextState)) {
      return;
    }

    this.state = nextState;
    this.requestComponentUpdate();
  }
}

const inputDirective = directive(InputDirective);

/**
 * A native input element.
 * Renders an `<input>` element.
 */
export function Input(componentProps: Input.Props): TemplateResult {
  return html`${inputDirective(componentProps)}`;
}

function assignRef<T>(ref: HTMLProps<T>['ref'], value: T | null) {
  if (typeof ref === 'function') {
    ref(value);
    return;
  }

  if (ref != null && typeof ref === 'object') {
    ref.current = value;
  }
}

function createInitialState(disabled: boolean, value: string): InputState {
  return {
    disabled,
    dirty: false,
    filled: value !== '',
    focused: false,
    touched: false,
    valid: null,
  };
}

function getCurrentPropValue(componentProps: Pick<InputProps, 'defaultValue' | 'value'>) {
  if (componentProps.value !== undefined) {
    return stringifyInputValue(componentProps.value);
  }

  return stringifyInputValue(componentProps.defaultValue);
}

function hasInputElement(value: unknown): value is InputElement {
  return value instanceof HTMLInputElement || value instanceof HTMLTextAreaElement;
}

function hasInputValue(value: unknown): value is InputLikeElement {
  return value != null && typeof value === 'object' && 'value' in value;
}

function isEqualInputState(a: InputState, b: InputState) {
  return (
    a.disabled === b.disabled &&
    a.touched === b.touched &&
    a.dirty === b.dirty &&
    a.valid === b.valid &&
    a.filled === b.filled &&
    a.focused === b.focused
  );
}

function readValidityState(element: InputElement): boolean | null {
  return typeof element.validity?.valid === 'boolean' ? element.validity.valid : null;
}

function stringifyInputValue(value: InputValue | undefined) {
  if (value == null) {
    return '';
  }

  if (Array.isArray(value)) {
    return value.join(',');
  }

  return String(value);
}

function createChangeEventDetails(
  event: Event,
  trigger: Element | undefined,
): BaseUIChangeEventDetails<'none'> {
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
    trigger,
  };
}

function createDataAttribute(name: string): Record<string, string> {
  return { [name]: '' };
}

function createInputStateAttributesMapping() {
  return {
    dirty(value: boolean) {
      return value ? createDataAttribute('data-dirty') : null;
    },
    disabled(value: boolean) {
      return value ? createDataAttribute('data-disabled') : null;
    },
    filled(value: boolean) {
      return value ? createDataAttribute('data-filled') : null;
    },
    focused(value: boolean) {
      return value ? createDataAttribute('data-focused') : null;
    },
    touched(value: boolean) {
      return value ? createDataAttribute('data-touched') : null;
    },
    valid(value: boolean | null) {
      if (value === true) {
        return createDataAttribute('data-valid');
      }

      if (value === false) {
        return createDataAttribute('data-invalid');
      }

      return null;
    },
  };
}

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

export interface InputProps extends Omit<
  useRender.ComponentProps<'input', InputState, InputRenderProps>,
  | 'defaultValue'
  | 'disabled'
  | 'onBlur'
  | 'onChange'
  | 'onFocus'
  | 'onInput'
  | 'ref'
  | 'render'
  | 'value'
> {
  /**
   * The default value of the input. Use when uncontrolled.
   */
  defaultValue?: InputValue | undefined;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Callback fired when the input changes. Mirrors React's text-input `onChange`
   * semantics by subscribing to the native `input` event.
   */
  onChange?: InputEventHandler<InputEvent | Event> | undefined;
  onBlur?: InputEventHandler<FocusEvent> | undefined;
  onFocus?: InputEventHandler<FocusEvent> | undefined;
  onInput?: InputEventHandler<InputEvent | Event> | undefined;
  /**
   * Callback fired when the `value` changes. Use when controlled.
   */
  onValueChange?: ((value: string, eventDetails: Input.ChangeEventDetails) => void) | undefined;
  ref?: HTMLProps<HTMLElement>['ref'] | undefined;
  render?: InputRenderProp | undefined;
  /**
   * The value of the input. Use when controlled.
   */
  value?: InputValue | undefined;
}

export type InputChangeEventReason = 'none';
export type InputChangeEventDetails = BaseUIChangeEventDetails<Input.ChangeEventReason>;

export namespace Input {
  export type Props = InputProps;
  export type State = InputState;
  export type ChangeEventReason = InputChangeEventReason;
  export type ChangeEventDetails = InputChangeEventDetails;
}
