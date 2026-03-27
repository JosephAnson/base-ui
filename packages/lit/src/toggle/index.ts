import { ReactiveElement } from 'lit';
import { error as logError } from '@base-ui/utils/error';
import type { BaseUIChangeEventDetails } from '../types';
import { useRender } from '../use-render';
import { applyButtonBehavior } from '../use-button';
import {
  TOGGLE_GROUP_ITEM_ATTRIBUTE,
  TOGGLE_GROUP_STATE_CHANGE_EVENT,
  type ToggleGroupRootElement,
} from '../toggle-group';

export interface ToggleRootProps {
  /**
   * Whether the toggle button is currently pressed.
   * This is the controlled counterpart of `defaultPressed`.
   */
  pressed?: boolean | undefined;
  /**
   * Whether the toggle button is currently pressed.
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
   * Callback fired when the pressed state is changed.
   */
  onPressedChange?:
    | ((pressed: boolean, eventDetails: ToggleChangeEventDetails) => void)
    | undefined;
  /**
   * A unique string that identifies the toggle when used
   * inside a toggle group.
   */
  value?: string | undefined;
}

export interface ToggleRootState {
  /**
   * Whether the toggle is currently pressed.
   */
  pressed: boolean;
  /**
   * Whether the toggle should ignore user interaction.
   */
  disabled: boolean;
}

export type ToggleState = ToggleRootState;

export type ToggleChangeEventReason = 'none';

export type ToggleChangeEventDetails = BaseUIChangeEventDetails<ToggleChangeEventReason>;

export interface ToggleProps<Value extends string = string>
  extends ToggleRootProps, useRender.ComponentProps<'button', ToggleState> {
  /**
   * A unique string that identifies the toggle when used
   * inside a toggle group.
   */
  value?: Value | undefined;
  /**
   * Whether the rendered element should be treated as a native `<button>`.
   * Set to `false` when replacing the default element with a non-button via `render`.
   * @default true
   */
  nativeButton?: boolean | undefined;
}

/**
 * A two-state button that can be on or off.
 * Renders a `<toggle-root>` custom element.
 *
 * When placed inside a `<toggle-group-root>`, the pressed state is managed
 * by the group and the `value` property is used as the toggle's identifier.
 *
 * Documentation: [Base UI Toggle](https://base-ui.com/react/components/toggle)
 */
export class ToggleRootElement extends ReactiveElement {
  static properties = {
    pressed: { type: Boolean, reflect: true },
    defaultPressed: { type: Boolean, attribute: 'default-pressed' },
    disabled: { type: Boolean, reflect: true },
    value: { type: String },
  };

  declare pressed: boolean | undefined;
  declare defaultPressed: boolean;
  declare disabled: boolean;
  declare value: string | undefined;

  /** Callback fired when the pressed state changes. Set via `.onPressedChange=${fn}`. */
  onPressedChange: ((pressed: boolean, eventDetails: ToggleChangeEventDetails) => void) | undefined;

  private internalPressed = false;
  private initialized = false;
  private group: ToggleGroupRootElement | null = null;
  private groupStateHandler = () => this.syncFromGroup();
  private generatedGroupValue = `base-ui-toggle-${Math.random().toString(36).slice(2)}`;

  constructor() {
    super();
    this.pressed = undefined;
    this.defaultPressed = false;
    this.disabled = false;
  }

  override createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();

    this.group = this.closest('toggle-group-root') as ToggleGroupRootElement | null;

    if (!this.initialized) {
      this.initialized = true;
      if (!this.group) {
        this.internalPressed = this.pressed ?? this.defaultPressed;
      }
    }

    if (this.group) {
      this.group.addEventListener(TOGGLE_GROUP_STATE_CHANGE_EVENT, this.groupStateHandler);
    }

    this.addEventListener('click', this.handleClick);
    this.addEventListener('keydown', this.handleKeyDown);
    this.addEventListener('keyup', this.handleKeyUp);
    this.warnIfMissingGroupValue();
    this.syncAttributes();

    if (this.group) {
      queueMicrotask(() => this.group?.syncTabIndices());
    }
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('click', this.handleClick);
    this.removeEventListener('keydown', this.handleKeyDown);
    this.removeEventListener('keyup', this.handleKeyUp);

    if (this.group) {
      this.group.removeEventListener(TOGGLE_GROUP_STATE_CHANGE_EVENT, this.groupStateHandler);
      this.group = null;
    }
  }

  protected override updated() {
    this.syncAttributes();
  }

  private isDisabled(): boolean {
    return this.disabled || (this.group?.disabled ?? false);
  }

  private getGroupValue(): string | undefined {
    if (!this.group) {
      return this.value;
    }

    if (this.value === '') {
      return this.generatedGroupValue;
    }

    return this.value ?? this.generatedGroupValue;
  }

  private warnIfMissingGroupValue() {
    if (this.group && this.value === undefined && this.group.isValueInitialized) {
      logError(
        'A `<Toggle>` component rendered in a `<ToggleGroup>` has no explicit `value` prop.',
        'This will cause issues between the Toggle Group and Toggle values.',
        'Provide the `<Toggle>` with a `value` prop matching the `<ToggleGroup>` values prop type.',
      );
    }
  }

  getPressed(): boolean {
    const groupValue = this.getGroupValue();
    if (this.group && groupValue !== undefined) {
      return this.group.isPressed(groupValue);
    }

    return this.pressed ?? this.internalPressed;
  }

  toggle(event?: Event) {
    if (this.isDisabled()) {
      return;
    }

    const nextPressed = !this.getPressed();
    const eventDetails = createChangeEventDetails(event ?? new Event('change'), this);
    const groupValue = this.getGroupValue();

    if (this.group && groupValue !== undefined) {
      this.onPressedChange?.(nextPressed, eventDetails);

      if (eventDetails.isCanceled) {
        return;
      }

      this.group.setGroupValue(groupValue, nextPressed, eventDetails.event);
      return;
    }

    this.onPressedChange?.(nextPressed, eventDetails);

    if (eventDetails.isCanceled) {
      return;
    }

    if (this.pressed === undefined) {
      this.internalPressed = nextPressed;
    }

    this.syncAttributes();
    this.requestUpdate();
  }

  private syncFromGroup() {
    this.syncAttributes();
    this.requestUpdate();
  }

  private syncAttributes() {
    const pressed = this.getPressed();
    const disabled = this.isDisabled();

    this.setAttribute('role', 'button');
    this.setAttribute('aria-pressed', pressed ? 'true' : 'false');
    this.setAttribute('aria-disabled', disabled ? 'true' : 'false');
    this.toggleAttribute('data-pressed', pressed);
    this.toggleAttribute('data-disabled', disabled);

    if (!this.group) {
      this.tabIndex = disabled ? -1 : 0;
    }
  }

  private handleClick = (event: MouseEvent) => {
    if (this.isDisabled()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }

    this.toggle(event);
  };

  private handleKeyDown = (event: KeyboardEvent) => {
    if (this.isDisabled()) {
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

    if (event.key === 'Enter') {
      this.toggle(event);
    }
  };

  private handleKeyUp = (event: KeyboardEvent) => {
    if (this.isDisabled()) {
      event.stopImmediatePropagation();
      return;
    }

    if (event.target !== this) {
      return;
    }

    if (event.key === ' ') {
      this.toggle(event);
    }
  };
}

if (!customElements.get('toggle-root')) {
  customElements.define('toggle-root', ToggleRootElement);
}

export namespace ToggleRoot {
  export type Props = ToggleRootProps;
  export type State = ToggleRootState;
  export type ChangeEventReason = ToggleChangeEventReason;
  export type ChangeEventDetails = ToggleChangeEventDetails;
}

/**
 * A two-state button that can be on or off.
 * Renders a `<button>` element by default.
 *
 * Documentation: [Base UI Toggle](https://base-ui.com/react/components/toggle)
 */
export function Toggle<Value extends string = string>(props: Toggle.Props<Value>) {
  const {
    defaultPressed = false,
    disabled = false,
    nativeButton = true,
    onPressedChange,
    pressed,
    render,
    value,
    ...elementProps
  } = props;

  const state: ToggleState = {
    pressed: pressed ?? defaultPressed,
    disabled,
  };

  return useRender({
    defaultTagName: 'button',
    render,
    state,
    ref: createToggleBehaviorRef({
      defaultPressed,
      disabled,
      nativeButton,
      onPressedChange,
      pressed,
      value,
    }),
    props: {
      'aria-pressed': state.pressed,
      tabIndex: value !== undefined ? 0 : undefined,
      ...elementProps,
    },
  });
}

export namespace Toggle {
  export type State = ToggleState;
  export type Props<TValue extends string = string> = ToggleProps<TValue>;
  export type ChangeEventReason = ToggleChangeEventReason;
  export type ChangeEventDetails = ToggleChangeEventDetails;
}

function createToggleBehaviorRef<Value extends string = string>(options: {
  defaultPressed: boolean;
  disabled: boolean;
  nativeButton: boolean;
  onPressedChange: ((pressed: boolean, eventDetails: ToggleChangeEventDetails) => void) | undefined;
  pressed: boolean | undefined;
  value: Value | undefined;
}) {
  let cleanupButtonBehavior: (() => void) | null = null;
  let cleanupGroupListener: (() => void) | null = null;
  let element: HTMLElement | null = null;
  let group: ToggleGroupRootElement | null = null;
  let internalPressed = options.defaultPressed;

  const sync = () => {
    if (element == null) {
      return;
    }

    const nextGroup = element.closest('toggle-group-root') as ToggleGroupRootElement | null;
    if (group !== nextGroup) {
      cleanupGroupListener?.();
      group = nextGroup;

      if (group) {
        const handleGroupStateChange = () => sync();
        group.addEventListener(TOGGLE_GROUP_STATE_CHANGE_EVENT, handleGroupStateChange);
        cleanupGroupListener = () => {
          group?.removeEventListener(TOGGLE_GROUP_STATE_CHANGE_EVENT, handleGroupStateChange);
        };
      } else {
        cleanupGroupListener = null;
      }
    }

    const pressed =
      group && options.value !== undefined
        ? group.isPressed(options.value)
        : (options.pressed ?? internalPressed);
    const disabled = options.disabled || (group?.disabled ?? false);

    cleanupButtonBehavior?.();
    cleanupButtonBehavior = applyButtonBehavior(element, {
      disabled,
      native: options.nativeButton,
      composite: group != null,
      onAction(event) {
        const nextPressed =
          group && options.value !== undefined
            ? !group.isPressed(options.value)
            : !(options.pressed ?? internalPressed);
        const eventDetails = createChangeEventDetails(event, element ?? undefined);

        options.onPressedChange?.(nextPressed, eventDetails);

        if (eventDetails.isCanceled) {
          return;
        }

        if (group && options.value !== undefined) {
          group.setGroupValue(options.value, nextPressed, event);
          return;
        }

        if (options.pressed === undefined) {
          internalPressed = nextPressed;
          sync();
        }
      },
    });

    element.setAttribute(TOGGLE_GROUP_ITEM_ATTRIBUTE, '');
    element.setAttribute('aria-pressed', String(pressed));
    element.toggleAttribute('data-pressed', pressed);
    element.toggleAttribute('data-disabled', disabled);

    if (group) {
      queueMicrotask(() => {
        group?.syncTabIndices();
      });
    }
  };

  return (instance: HTMLElement | null) => {
    cleanupButtonBehavior?.();
    cleanupButtonBehavior = null;
    cleanupGroupListener?.();
    cleanupGroupListener = null;
    element = instance;

    if (element == null) {
      group = null;
      return;
    }

    sync();
  };
}

function createChangeEventDetails(
  event: Event,
  trigger: Element | undefined,
): ToggleChangeEventDetails {
  let canceled = false;
  let propagationAllowed = false;

  return {
    event,
    trigger,
    allowPropagation() {
      propagationAllowed = true;
    },
    cancel() {
      canceled = true;
    },
    get isCanceled() {
      return canceled;
    },
    get isPropagationAllowed() {
      return propagationAllowed;
    },
    reason: 'none',
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'toggle-root': ToggleRootElement;
  }
}
