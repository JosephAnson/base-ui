import type { TemplateResult } from 'lit';
import { makeEventPreventable, mergeProps } from '../merge-props/index.ts';
import type { BaseUIEvent, ComponentRenderFn, HTMLProps } from '../types/index.ts';
import { useRender } from '../use-render/index.ts';

const devWarningMessages = new Set<string>();

type ButtonClickEvent = KeyboardEvent | MouseEvent;
type ButtonEventHandler<EventType extends Event> = (event: BaseUIEvent<EventType>) => void;
type ButtonClickEventHandler = ButtonEventHandler<ButtonClickEvent>;

type ComponentPropsWithChildren<
  ElementType extends keyof HTMLElementTagNameMap,
  State,
  Children = unknown,
  RenderFunctionProps = HTMLProps,
> = Omit<useRender.ComponentProps<ElementType, State, RenderFunctionProps>, 'children'> & {
  children?: Children | undefined;
};

type ButtonRenderProps = Omit<
  HTMLProps<HTMLElement>,
  'children' | 'onClick' | 'onKeyDown' | 'onKeyUp' | 'onMouseDown' | 'onPointerDown'
> & {
  children?: unknown;
  onClick?: ButtonClickEventHandler | undefined;
  onKeyDown?: ButtonEventHandler<KeyboardEvent> | undefined;
  onKeyUp?: ButtonEventHandler<KeyboardEvent> | undefined;
  onMouseDown?: ButtonEventHandler<MouseEvent> | undefined;
  onPointerDown?: ButtonEventHandler<PointerEvent> | undefined;
};
type ButtonRenderProp = TemplateResult | ComponentRenderFn<ButtonRenderProps, ButtonState>;
type ButtonMergePropsInput = Parameters<typeof mergeProps<HTMLElement>>[0];

/**
 * A button component that can be used to trigger actions.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Button](https://base-ui.com/react/components/button)
 */
export function Button(componentProps: Button.Props): TemplateResult {
  const {
    children,
    disabled = false,
    focusableWhenDisabled = false,
    nativeButton = true,
    render,
    onClick: externalOnClick,
    onMouseDown: externalOnMouseDown,
    onPointerDown: externalOnPointerDown,
    onKeyDown: externalOnKeyDown,
    onKeyUp: externalOnKeyUp,
    ...elementProps
  } = componentProps;

  const state: ButtonState = {
    disabled,
  };
  let focusableTabIndex = 0;

  if (!nativeButton && disabled) {
    focusableTabIndex = focusableWhenDisabled ? 0 : -1;
  }

  const resolvedProps = mergeProps<HTMLElement>(
    {
      type: nativeButton ? 'button' : undefined,
      onClick(event: MouseEvent) {
        if (disabled) {
          event.preventDefault();
          return;
        }

        externalOnClick?.(event as BaseUIEvent<MouseEvent>);
      },
      onMouseDown(event: MouseEvent) {
        if (disabled) {
          return;
        }

        externalOnMouseDown?.(event as BaseUIEvent<MouseEvent>);
      },
      onPointerDown(event: PointerEvent) {
        if (disabled) {
          event.preventDefault();
          return;
        }

        externalOnPointerDown?.(event as BaseUIEvent<PointerEvent>);
      },
      onKeyDown(event: KeyboardEvent) {
        if (disabled) {
          return;
        }

        const baseUIEvent = makeEventPreventable(event as BaseUIEvent<KeyboardEvent>);
        externalOnKeyDown?.(baseUIEvent);

        if (baseUIEvent.baseUIHandlerPrevented) {
          return;
        }

        const currentTarget = event.currentTarget;

        if (!(currentTarget instanceof HTMLElement) || event.target !== currentTarget) {
          return;
        }

        const isLink = !nativeButton && isValidLinkElement(currentTarget);
        const shouldClick = nativeButton ? isButtonElement(currentTarget) : !isLink;
        const isEnterKey = event.key === 'Enter';
        const isSpaceKey = event.key === ' ';

        if (shouldClick && !nativeButton && (isSpaceKey || isEnterKey)) {
          event.preventDefault();
        }

        if (shouldClick && !nativeButton && isEnterKey) {
          externalOnClick?.(baseUIEvent);
        }
      },
      onKeyUp(event: KeyboardEvent) {
        if (disabled) {
          return;
        }

        const baseUIEvent = makeEventPreventable(event as BaseUIEvent<KeyboardEvent>);
        externalOnKeyUp?.(baseUIEvent);

        if (baseUIEvent.baseUIHandlerPrevented) {
          return;
        }

        const currentTarget = event.currentTarget;

        if (
          event.target === currentTarget &&
          !nativeButton &&
          currentTarget instanceof HTMLElement &&
          event.key === ' '
        ) {
          externalOnClick?.(baseUIEvent);
        }
      },
    },
    !nativeButton ? { role: 'button' } : undefined,
    {
      onKeyDown(event: KeyboardEvent) {
        if (disabled && focusableWhenDisabled && event.key !== 'Tab') {
          event.preventDefault();
        }
      },
      tabIndex: focusableTabIndex,
      'aria-disabled':
        (nativeButton && focusableWhenDisabled) || (!nativeButton && disabled) ? 'true' : undefined,
      disabled: nativeButton && !focusableWhenDisabled ? disabled : undefined,
    },
    elementProps as ButtonMergePropsInput,
  );
  const validateRenderedElement = (element: HTMLElement | null) => {
    if (process.env.NODE_ENV === 'production' || element == null) {
      return;
    }

    const isButtonTag = isButtonElement(element);

    if (nativeButton && !isButtonTag) {
      warnOnce(
        'A component that acts as a button expected a native <button> because the ' +
          '`nativeButton` prop is true. Rendering a non-<button> removes native button ' +
          'semantics, which can impact forms and accessibility. Use a real <button> in the ' +
          '`render` prop, or set `nativeButton` to `false`.',
      );
    } else if (!nativeButton && isButtonTag) {
      warnOnce(
        'A component that acts as a button expected a non-<button> because the `nativeButton` ' +
          'prop is false. Rendering a <button> keeps native behavior while Base UI applies ' +
          'non-native attributes and handlers, which can add unintended extra attributes (such ' +
          'as `role` or `aria-disabled`). Use a non-<button> in the `render` prop, or set ' +
          '`nativeButton` to `true`.',
      );
    }
  };

  return useRender<ButtonState, HTMLElement>({
    defaultTagName: 'button',
    render,
    ref: validateRenderedElement,
    state,
    props: children === undefined ? resolvedProps : { ...resolvedProps, children },
  });
}

function isButtonElement(element: HTMLElement | null): element is HTMLButtonElement {
  return element?.tagName === 'BUTTON';
}

function isValidLinkElement(element: HTMLElement | null): element is HTMLAnchorElement {
  return element?.tagName === 'A' && (element as HTMLAnchorElement).href.length > 0;
}

function warnOnce(message: string) {
  if (devWarningMessages.has(message)) {
    return;
  }

  devWarningMessages.add(message);
  console.error(`Base UI: ${message}`);
}

export interface ButtonState {
  /**
   * Whether the button should ignore user interaction.
   */
  disabled: boolean;
}

export interface ButtonProps extends Omit<
  ComponentPropsWithChildren<'button', ButtonState, unknown, ButtonRenderProps>,
  | 'children'
  | 'disabled'
  | 'onClick'
  | 'onKeyDown'
  | 'onKeyUp'
  | 'onMouseDown'
  | 'onPointerDown'
  | 'render'
> {
  children?: unknown;
  disabled?: boolean | undefined;
  /**
   * Whether the button should be focusable when disabled.
   * @default false
   */
  focusableWhenDisabled?: boolean | undefined;
  /**
   * Whether the component renders a native `<button>` element when replacing it
   * via the `render` prop.
   * Set to `false` if the rendered element is not a button (e.g. `<div>`).
   * @default true
   */
  nativeButton?: boolean | undefined;
  onClick?: ButtonClickEventHandler | undefined;
  onKeyDown?: ButtonEventHandler<KeyboardEvent> | undefined;
  onKeyUp?: ButtonEventHandler<KeyboardEvent> | undefined;
  onMouseDown?: ButtonEventHandler<MouseEvent> | undefined;
  onPointerDown?: ButtonEventHandler<PointerEvent> | undefined;
  render?: ButtonRenderProp | undefined;
}

export namespace Button {
  export type Props = ButtonProps;
  export type State = ButtonState;
}
