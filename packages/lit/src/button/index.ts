import { ReactiveElement } from 'lit';
import { useRender } from '../use-render';
import { applyButtonBehavior } from '../use-button';

/**
 * A button component that can be used to trigger actions.
 * Renders a `<button-root>` custom element.
 *
 * Documentation: [Base UI Button](https://base-ui.com/react/components/button)
 */
export class ButtonRootElement extends ReactiveElement {
  static properties = {
    disabled: { type: Boolean, reflect: true },
    focusableWhenDisabled: { type: Boolean, attribute: 'focusable-when-disabled' },
  };

  declare disabled: boolean;
  declare focusableWhenDisabled: boolean;

  constructor() {
    super();
    this.disabled = false;
    this.focusableWhenDisabled = false;
  }

  override createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();
    this.addEventListener('click', this.handleClick);
    this.addEventListener('mousedown', this.handleMouseDown);
    this.addEventListener('keydown', this.handleKeyDown);
    this.addEventListener('keyup', this.handleKeyUp);
    this.addEventListener('pointerdown', this.handlePointerDown);
    this.syncAttributes();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('click', this.handleClick);
    this.removeEventListener('mousedown', this.handleMouseDown);
    this.removeEventListener('keydown', this.handleKeyDown);
    this.removeEventListener('keyup', this.handleKeyUp);
    this.removeEventListener('pointerdown', this.handlePointerDown);
  }

  protected override updated() {
    this.syncAttributes();
  }

  private isNativeButton(): boolean {
    return this.tagName === 'BUTTON';
  }

  private syncAttributes() {
    const isNative = this.isNativeButton();

    if (!isNative) {
      this.setAttribute('role', 'button');

      if (this.disabled) {
        this.setAttribute('aria-disabled', 'true');
        if (!this.focusableWhenDisabled) {
          this.tabIndex = -1;
        } else {
          this.tabIndex = 0;
        }
      } else {
        this.removeAttribute('aria-disabled');
        this.tabIndex = 0;
      }
    } else {
      // Native button
      if (this.focusableWhenDisabled) {
        this.setAttribute('aria-disabled', 'true');
        (this as unknown as HTMLButtonElement).disabled = false;
      } else {
        this.removeAttribute('aria-disabled');
        (this as unknown as HTMLButtonElement).disabled = this.disabled;
      }

      if (!(this as unknown as HTMLButtonElement).type) {
        (this as unknown as HTMLButtonElement).type = 'button';
      }
    }

    this.toggleAttribute('data-disabled', this.disabled);
  }

  private handleClick = (event: MouseEvent) => {
    if (this.disabled) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };

  private handleMouseDown = (event: MouseEvent) => {
    if (this.disabled) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };

  private handlePointerDown = (event: PointerEvent) => {
    if (this.disabled) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };

  private handleKeyDown = (event: KeyboardEvent) => {
    if (this.disabled) {
      if (this.focusableWhenDisabled && event.key !== 'Tab') {
        event.preventDefault();
      }
      event.stopImmediatePropagation();
      return;
    }

    if (event.target !== this) {
      return;
    }

    const isNative = this.isNativeButton();

    if (!isNative && (event.key === ' ' || event.key === 'Enter')) {
      event.preventDefault();
    }

    if (!isNative && event.key === 'Enter') {
      this.click();
    }
  };

  private handleKeyUp = (event: KeyboardEvent) => {
    if (this.disabled) {
      event.stopImmediatePropagation();
      return;
    }

    if (event.target !== this) {
      return;
    }

    const isNative = this.isNativeButton();

    if (!isNative && event.key === ' ') {
      this.click();
    }
  };
}

if (!customElements.get('button-root')) {
  customElements.define('button-root', ButtonRootElement);
}

export interface ButtonRootProps {
  /**
   * Whether the button should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Whether the button should be focusable when disabled.
   * @default false
   */
  focusableWhenDisabled?: boolean | undefined;
}

export interface ButtonRootState {
  /**
   * Whether the button should ignore user interaction.
   */
  disabled: boolean;
}

export namespace ButtonRoot {
  export type Props = ButtonRootProps;
  export type State = ButtonRootState;
}

type StatefulValue<TValue, TState> = TValue | ((state: TState) => TValue | undefined);

type StatefulStyleValue = Record<string, string | number | null | undefined> | undefined;

export interface ButtonProps extends useRender.ComponentProps<'button', ButtonState> {
  /**
   * Whether the button should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Whether the button should be focusable when disabled.
   * @default false
   */
  focusableWhenDisabled?: boolean | undefined;
  /**
   * Whether the rendered element should be treated as a native `<button>`.
   * Set to `false` when replacing the default element with a non-button via `render`.
   * @default true
   */
  nativeButton?: boolean | undefined;
  /**
   * CSS class applied to the element, or a function that returns a class based on the component state.
   */
  className?: StatefulValue<string, ButtonState> | undefined;
  /**
   * Inline styles applied to the element, or a function that returns styles based on the component state.
   */
  style?: StatefulValue<StatefulStyleValue, ButtonState> | undefined;
}

export interface ButtonState {
  /**
   * Whether the button should ignore user interaction.
   */
  disabled: boolean;
}

/**
 * A button component that can be used to trigger actions.
 * Renders a `<button>` element by default.
 *
 * Documentation: [Base UI Button](https://base-ui.com/react/components/button)
 */
export function Button(props: Button.Props) {
  const {
    disabled = false,
    focusableWhenDisabled = false,
    nativeButton = true,
    className,
    style,
    render,
    ...elementProps
  } = props;

  const state: ButtonState = { disabled };
  const behaviorRef = createButtonBehaviorRef({
    disabled,
    focusableWhenDisabled,
    nativeButton,
  });

  return useRender({
    defaultTagName: 'button',
    render,
    state,
    ref: behaviorRef,
    props: {
      className: resolveStatefulValue(className, state),
      style: resolveStatefulValue(style, state),
      ...elementProps,
    },
  });
}

export namespace Button {
  export type Props = ButtonProps;
  export type State = ButtonState;
}

function createButtonBehaviorRef(options: {
  disabled: boolean;
  focusableWhenDisabled: boolean;
  nativeButton: boolean;
}) {
  let cleanup: (() => void) | null = null;

  return (element: HTMLButtonElement | null) => {
    cleanup?.();
    cleanup = null;

    if (element == null) {
      return;
    }

    cleanup = applyButtonBehavior(element, {
      disabled: options.disabled,
      focusableWhenDisabled: options.focusableWhenDisabled,
      native: options.nativeButton,
    });
  };
}

function resolveStatefulValue<TValue, TState>(
  value: StatefulValue<TValue, TState> | undefined,
  state: TState,
) {
  return typeof value === 'function'
    ? (value as (nextState: TState) => TValue | undefined)(state)
    : value;
}

declare global {
  interface HTMLElementTagNameMap {
    'button-root': ButtonRootElement;
  }
}
