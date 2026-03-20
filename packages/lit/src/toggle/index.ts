import { html, type TemplateResult } from 'lit';
// eslint-disable-next-line import/extensions
import { AsyncDirective, directive } from 'lit/async-directive.js';
import { Button } from '../button/index.ts';
import type { BaseUIChangeEventDetails, ComponentRenderFn, HTMLProps } from '../types/index.ts';
import type { BaseUIEvent } from '../types/index.ts';
import { useRender } from '../use-render/index.ts';

type ToggleClickEvent = KeyboardEvent | MouseEvent;
type ToggleEventHandler<EventType extends Event> = (event: BaseUIEvent<EventType>) => void;

type ComponentPropsWithChildren<
  ElementType extends keyof HTMLElementTagNameMap,
  State,
  Children = unknown,
  RenderFunctionProps = HTMLProps,
> = Omit<useRender.ComponentProps<ElementType, State, RenderFunctionProps>, 'children'> & {
  children?: Children | undefined;
};

type ToggleRenderProps = Omit<
  HTMLProps<HTMLElement>,
  'children' | 'onClick' | 'onKeyDown' | 'onKeyUp' | 'onMouseDown' | 'onPointerDown'
> & {
  children?: unknown;
  onClick?: ToggleEventHandler<ToggleClickEvent> | undefined;
  onKeyDown?: ToggleEventHandler<KeyboardEvent> | undefined;
  onKeyUp?: ToggleEventHandler<KeyboardEvent> | undefined;
  onMouseDown?: ToggleEventHandler<MouseEvent> | undefined;
  onPointerDown?: ToggleEventHandler<PointerEvent> | undefined;
};

type ToggleRenderProp =
  | TemplateResult
  | ComponentRenderFn<ToggleRenderProps, ToggleState>
  | undefined;

class ToggleDirective extends AsyncDirective {
  private latestProps: ToggleProps<string> | null = null;
  private defaultPressed = false;
  private initialized = false;
  private root: HTMLElement | null = null;

  render(_componentProps: ToggleProps<string>) {
    return html``;
  }

  override update(
    _part: Parameters<AsyncDirective['update']>[0],
    [componentProps]: [ToggleProps<string>],
  ) {
    this.latestProps = componentProps;

    if (!this.initialized) {
      this.initialized = true;
      this.defaultPressed = Boolean(componentProps.defaultPressed);
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
      defaultPressed: _defaultPressed,
      disabled = false,
      form: _form,
      onPressedChange,
      pressed: pressedProp,
      render,
      type: _type,
      value: _value,
      ...elementProps
    } = this.latestProps;
    const externalRef = this.latestProps.ref as HTMLProps<HTMLElement>['ref'] | undefined;

    const pressed = pressedProp ?? this.defaultPressed;
    const state: ToggleState = {
      disabled,
      pressed,
    };

    return Button({
      ...elementProps,
      ref: this.createRootRef(externalRef),
      disabled,
      render: this.resolveRenderProp(render, state),
      'aria-pressed': pressed ? 'true' : 'false',
      'data-pressed': pressed ? '' : undefined,
      onClick: (event) => {
        const nextPressed = !pressed;
        const eventDetails = createChangeEventDetails(event, this.root ?? undefined);

        onPressedChange?.(nextPressed, eventDetails);

        if (eventDetails.isCanceled) {
          this.requestComponentUpdate();
          return;
        }

        if (pressedProp === undefined) {
          this.defaultPressed = nextPressed;
        }

        this.requestComponentUpdate();
      },
    });
  }

  private requestComponentUpdate() {
    this.setValue(this.renderCurrent());
  }

  private resolveRenderProp(render: ToggleRenderProp, state: ToggleState) {
    if (typeof render !== 'function') {
      return render;
    }

    return (props: ToggleRenderProps) => render(props, state);
  }

  private createRootRef(externalRef: HTMLProps<HTMLElement>['ref'] | undefined) {
    return (element: HTMLElement | null) => {
      this.root = element;
      assignRef(externalRef, element);
    };
  }
}

const toggleDirective = directive(ToggleDirective);

/**
 * A two-state button that can be on or off.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Toggle](https://base-ui.com/react/components/toggle)
 */
export function Toggle<TValue extends string = string>(
  componentProps: Toggle.Props<TValue>,
): TemplateResult {
  return html`${toggleDirective(componentProps)}`;
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

export interface ToggleState {
  /**
   * Whether the toggle is currently pressed.
   */
  pressed: boolean;
  /**
   * Whether the toggle should ignore user interaction.
   */
  disabled: boolean;
}

export interface ToggleProps<TValue extends string = string> extends Omit<
  ComponentPropsWithChildren<'button', ToggleState, unknown, ToggleRenderProps>,
  'children' | 'defaultPressed' | 'disabled' | 'form' | 'render' | 'type' | 'value'
> {
  children?: unknown;
  /**
   * Whether the toggle button is currently pressed.
   * This is the controlled counterpart of `defaultPressed`.
   */
  pressed?: boolean | undefined;
  /**
   * Whether the toggle button is initially pressed.
   * This is the uncontrolled counterpart of `pressed`.
   * @default false
   */
  defaultPressed?: boolean | undefined;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Whether the component renders a native `<button>` element when replacing it
   * via the `render` prop.
   * Set to `false` if the rendered element is not a button (e.g. `<div>`).
   * @default true
   */
  nativeButton?: boolean | undefined;
  /**
   * Callback fired when the pressed state changes.
   */
  onPressedChange?:
    | ((pressed: boolean, eventDetails: Toggle.ChangeEventDetails) => void)
    | undefined;
  /**
   * Allows you to replace the component's HTML element
   * with a different tag, or compose it with a template that has a single root element.
   */
  render?: ToggleRenderProp;
  /**
   * A unique string that identifies the toggle when used
   * inside a toggle group.
   */
  value?: TValue | undefined;
}

export type ToggleChangeEventReason = 'none';

export type ToggleChangeEventDetails = BaseUIChangeEventDetails<ToggleChangeEventReason>;

export namespace Toggle {
  export type Props<TValue extends string = string> = ToggleProps<TValue>;
  export type State = ToggleState;
  export type ChangeEventReason = ToggleChangeEventReason;
  export type ChangeEventDetails = ToggleChangeEventDetails;
}
