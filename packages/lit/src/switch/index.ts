import { html, noChange, nothing, type TemplateResult } from 'lit';
// eslint-disable-next-line import/extensions
import { AsyncDirective, directive } from 'lit/async-directive.js';
import { mergeProps } from '../merge-props/index.ts';
import type {
  BaseUIChangeEventDetails,
  BaseUIEvent,
  ComponentRenderFn,
  HTMLProps,
} from '../types/index.ts';
import { useRender } from '../use-render/index.ts';

const SWITCH_ROOT_ATTRIBUTE = 'data-base-ui-switch-root';
const SWITCH_STATE_CHANGE_EVENT = 'base-ui-switch-state-change';
const SWITCH_THUMB_ATTRIBUTE = 'data-base-ui-switch-thumb';
const SWITCH_CONTEXT_ERROR =
  'Base UI: SwitchRootContext is missing. Switch parts must be placed within <Switch.Root>.';

const visuallyHiddenBase = {
  clipPath: 'inset(50%)',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  border: 0,
  padding: 0,
  width: 1,
  height: 1,
  margin: -1,
};

const visuallyHidden = {
  ...visuallyHiddenBase,
  position: 'fixed',
  top: 0,
  left: 0,
};

const visuallyHiddenInput = {
  ...visuallyHiddenBase,
  position: 'absolute',
};

let generatedElementId = 0;

type SwitchClickEvent = KeyboardEvent | MouseEvent;
type SwitchEventHandler<EventType extends Event> = (event: BaseUIEvent<EventType>) => void;

type ComponentPropsWithChildren<
  ElementType extends keyof HTMLElementTagNameMap,
  State,
  Children = unknown,
  RenderFunctionProps = HTMLProps,
> = Omit<useRender.ComponentProps<ElementType, State, RenderFunctionProps>, 'children'> & {
  children?: Children | undefined;
};

type SwitchRootRenderProps = Omit<
  HTMLProps<HTMLElement>,
  'children' | 'onClick' | 'onKeyDown' | 'onKeyUp'
> & {
  children?: unknown;
  onClick?: SwitchEventHandler<SwitchClickEvent> | undefined;
  onKeyDown?: SwitchEventHandler<KeyboardEvent> | undefined;
  onKeyUp?: SwitchEventHandler<KeyboardEvent> | undefined;
};

type SwitchRootRenderProp =
  | TemplateResult
  | ComponentRenderFn<SwitchRootRenderProps, SwitchRootState>;
type SwitchThumbRenderProp =
  | TemplateResult
  | ComponentRenderFn<HTMLProps<HTMLSpanElement>, SwitchThumbState>;

const switchStateAttributesMapping: useRender.Parameters<
  SwitchRootState,
  HTMLElement,
  undefined
>['stateAttributesMapping'] = {
  checked(value) {
    if (value) {
      const props: Record<string, string> = { 'data-checked': '' };
      return props;
    }

    const props: Record<string, string> = { 'data-unchecked': '' };
    return props;
  },
};

class SwitchRootDirective extends AsyncDirective {
  private latestProps: SwitchRootProps | null = null;
  private root: HTMLElement | null = null;
  private input: HTMLInputElement | null = null;
  private defaultChecked = false;
  private initialized = false;
  private syncQueued = false;
  private lastPublishedStateKey: string | null = null;

  render(_componentProps: SwitchRootProps) {
    return noChange;
  }

  override update(
    _part: Parameters<AsyncDirective['update']>[0],
    [componentProps]: [SwitchRootProps],
  ) {
    this.latestProps = componentProps;

    if (!this.initialized) {
      this.initialized = true;
      this.defaultChecked = Boolean(componentProps.defaultChecked);
    }

    this.scheduleDomSync();

    return this.renderCurrent();
  }

  override disconnected() {
    this.root = null;
    this.input = null;
    this.lastPublishedStateKey = null;
  }

  override reconnected() {}

  private renderCurrent() {
    if (this.latestProps == null) {
      return nothing;
    }

    const {
      checked: checkedProp,
      defaultChecked: _defaultChecked,
      disabled = false,
      id,
      inputRef,
      name,
      nativeButton = false,
      onCheckedChange: _onCheckedChange,
      readOnly = false,
      required = false,
      render,
      uncheckedValue,
      value,
      children,
      ...elementProps
    } = this.latestProps;

    const checked = checkedProp ?? this.defaultChecked;
    const ariaLabelledByProp = this.latestProps['aria-labelledby'];
    const hiddenInputId = nativeButton ? undefined : id;
    const rootId = nativeButton ? id : undefined;

    const rootProps = mergeProps<HTMLElement>(
      {
        [SWITCH_ROOT_ATTRIBUTE]: '',
        id: rootId,
        role: 'switch',
        tabIndex: nativeButton ? undefined : disabled ? -1 : 0,
        'aria-checked': checked ? 'true' : 'false',
        'aria-disabled': disabled ? 'true' : undefined,
        'aria-readonly': readOnly ? 'true' : undefined,
        'aria-required': required ? 'true' : undefined,
        'aria-labelledby': ariaLabelledByProp,
        onClick: (event: BaseUIEvent<MouseEvent>) => {
          if (event.baseUIHandlerPrevented || readOnly || disabled) {
            return;
          }

          event.preventDefault();
          this.toggleFromEvent(!checked, event);
        },
        onKeyDown: (event: BaseUIEvent<KeyboardEvent>) => {
          if (event.baseUIHandlerPrevented || nativeButton || disabled) {
            return;
          }

          const currentTarget = event.currentTarget;
          const isSpaceKey = event.key === ' ' || event.key === 'Spacebar';
          const isEnterKey = event.key === 'Enter';

          if (!(currentTarget instanceof HTMLElement) || event.target !== currentTarget) {
            return;
          }

          if (isEnterKey || isSpaceKey) {
            event.preventDefault();
          }

          if (isEnterKey) {
            this.toggleFromEvent(!checked, event);
          }
        },
        onKeyUp: (event: BaseUIEvent<KeyboardEvent>) => {
          if (event.baseUIHandlerPrevented || nativeButton || disabled) {
            return;
          }

          const currentTarget = event.currentTarget;
          const isSpaceKey = event.key === ' ' || event.key === 'Spacebar';

          if (
            !(currentTarget instanceof HTMLElement) ||
            event.target !== currentTarget ||
            !isSpaceKey
          ) {
            return;
          }

          this.toggleFromEvent(!checked, event);
        },
      },
      (children === undefined ? elementProps : { ...elementProps, children }) as Parameters<
        typeof mergeProps<HTMLElement>
      >[0],
    );

    const inputProps = mergeProps<HTMLInputElement>(
      {
        checked,
        disabled,
        id: hiddenInputId,
        name,
        required,
        style: name ? visuallyHiddenInput : visuallyHidden,
        tabIndex: -1,
        type: 'checkbox',
        'aria-hidden': 'true',
        onChange: this.handleInputChange,
        onFocus: () => {
          this.root?.focus();
        },
      },
      value !== undefined ? { value } : undefined,
    );

    const state: SwitchRootState = {
      checked,
      disabled,
      readOnly,
      required,
    };

    return html`${useRender<SwitchRootState, HTMLElement>({
      defaultTagName: 'span',
      render,
      ref: this.handleRootRef,
      state,
      stateAttributesMapping: switchStateAttributesMapping,
      props: rootProps,
    })}
    ${!checked && name && uncheckedValue !== undefined
      ? html`<input type="hidden" name=${name} value=${uncheckedValue} />`
      : nothing}
    ${useRender<Record<string, never>, HTMLInputElement>({
      defaultTagName: 'input',
      ref: [this.handleInputRef, inputRef],
      props: inputProps,
    })}`;
  }

  private handleRootRef = (element: HTMLElement | null) => {
    this.root = element;
    this.scheduleDomSync();
  };

  private handleInputRef = (element: HTMLInputElement | null) => {
    this.input = element;
    this.scheduleDomSync();
  };

  private handleInputChange = (event: Event) => {
    if (event.defaultPrevented || this.latestProps == null) {
      return;
    }

    const currentTarget = event.currentTarget;

    if (!(currentTarget instanceof HTMLInputElement)) {
      return;
    }

    if (this.latestProps.disabled || this.latestProps.readOnly) {
      currentTarget.checked = this.getChecked();
      this.requestComponentUpdate();
      return;
    }

    const nextChecked = currentTarget.checked;
    this.toggleFromEvent(nextChecked, event);
  };

  private requestComponentUpdate() {
    this.setValue(this.renderCurrent());
    this.scheduleDomSync();
  }

  private getChecked() {
    return this.latestProps?.checked ?? this.defaultChecked;
  }

  private toggleFromEvent(nextChecked: boolean, event: Event) {
    if (this.latestProps == null) {
      return;
    }

    const eventDetails = createChangeEventDetails(event, this.root ?? this.input ?? undefined);

    this.latestProps.onCheckedChange?.(nextChecked, eventDetails);

    if (eventDetails.isCanceled) {
      this.requestComponentUpdate();
      return;
    }

    if (this.latestProps.checked === undefined) {
      this.defaultChecked = nextChecked;
    }

    this.requestComponentUpdate();
  }

  private scheduleDomSync() {
    if (this.syncQueued) {
      return;
    }

    this.syncQueued = true;
    queueMicrotask(() => {
      queueMicrotask(() => {
        this.syncQueued = false;
        this.syncAriaLabelledBy();
        this.publishStateChange();
      });
    });
  }

  private syncAriaLabelledBy() {
    if (this.root == null || this.latestProps == null) {
      return;
    }

    const ariaLabelledBy = this.latestProps['aria-labelledby'];

    if (ariaLabelledBy != null) {
      this.root.setAttribute('aria-labelledby', String(ariaLabelledBy));
      return;
    }

    const control = this.latestProps.nativeButton ? this.root : this.input;

    if (control == null || !('labels' in control)) {
      this.root.removeAttribute('aria-labelledby');
      return;
    }

    const labelIds = Array.from(getElementLabels(control))
      .map((label) => ensureElementId(label, 'base-ui-switch-label'))
      .filter((value): value is string => value != null);

    if (labelIds.length === 0) {
      this.root.removeAttribute('aria-labelledby');
      return;
    }

    this.root.setAttribute('aria-labelledby', labelIds.join(' '));
  }

  private publishStateChange() {
    if (this.root == null || this.latestProps == null) {
      return;
    }

    const nextStateKey = JSON.stringify({
      checked: this.getChecked(),
      disabled: Boolean(this.latestProps.disabled),
      readOnly: Boolean(this.latestProps.readOnly),
      required: Boolean(this.latestProps.required),
    });

    if (nextStateKey === this.lastPublishedStateKey) {
      return;
    }

    this.lastPublishedStateKey = nextStateKey;
    this.root.dispatchEvent(new CustomEvent(SWITCH_STATE_CHANGE_EVENT));
  }
}

class SwitchThumbDirective extends AsyncDirective {
  private latestProps: SwitchThumbProps | null = null;
  private root: Element | null = null;

  render(_componentProps: SwitchThumbProps) {
    return noChange;
  }

  override update(
    part: Parameters<AsyncDirective['update']>[0],
    [componentProps]: [SwitchThumbProps],
  ) {
    this.latestProps = componentProps;
    this.syncRoot(getSwitchRoot(part));

    return this.renderCurrent();
  }

  override disconnected() {
    this.syncRoot(null);
  }

  override reconnected() {}

  private renderCurrent() {
    if (this.latestProps == null || this.root == null) {
      return nothing;
    }

    const { render, ...elementProps } = this.latestProps;

    return useRender<SwitchThumbState, HTMLSpanElement>({
      defaultTagName: 'span',
      render,
      state: getSwitchState(this.root),
      stateAttributesMapping: switchStateAttributesMapping,
      props: {
        [SWITCH_THUMB_ATTRIBUTE]: '',
        ...elementProps,
      },
    });
  }

  private syncRoot(root: Element | null) {
    if (this.root === root) {
      return;
    }

    this.root?.removeEventListener(SWITCH_STATE_CHANGE_EVENT, this.handleStateChange);
    this.root = root;
    this.root?.addEventListener(SWITCH_STATE_CHANGE_EVENT, this.handleStateChange);
  }

  private handleStateChange = () => {
    this.setValue(this.renderCurrent());
  };
}

const switchRootDirective = directive(SwitchRootDirective);
const switchThumbDirective = directive(SwitchThumbDirective);

/**
 * Represents the switch itself.
 * Renders a `<span>` element and a hidden `<input>` beside.
 *
 * Documentation: [Base UI Switch](https://base-ui.com/react/components/switch)
 */
function SwitchRoot(componentProps: SwitchRootProps): TemplateResult {
  return html`${switchRootDirective(componentProps)}`;
}

/**
 * The movable part of the switch that indicates whether the switch is on or off.
 * Renders a `<span>`.
 *
 * Documentation: [Base UI Switch](https://base-ui.com/react/components/switch)
 */
function SwitchThumb(componentProps: SwitchThumbProps): TemplateResult {
  return html`${switchThumbDirective(componentProps)}`;
}

function getSwitchRoot(part: Parameters<AsyncDirective['update']>[0]) {
  const parentNode = (part as { parentNode?: Node | null | undefined }).parentNode ?? null;
  const parentElement = getParentElement(parentNode);
  const root = parentElement?.closest(`[${SWITCH_ROOT_ATTRIBUTE}]`);

  if (root == null) {
    throw new Error(SWITCH_CONTEXT_ERROR);
  }

  return root;
}

function getSwitchState(root: Element): SwitchRootState {
  return {
    checked: root.getAttribute('aria-checked') === 'true' || root.hasAttribute('data-checked'),
    disabled: root.getAttribute('aria-disabled') === 'true' || root.hasAttribute('data-disabled'),
    readOnly: root.getAttribute('aria-readonly') === 'true' || root.hasAttribute('data-readonly'),
    required: root.getAttribute('aria-required') === 'true' || root.hasAttribute('data-required'),
  };
}

function getParentElement(node: Node | null) {
  if (node == null) {
    return null;
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    return node as Element;
  }

  return node.parentElement;
}

function ensureElementId(element: Element | null, prefix: string) {
  if (element == null) {
    return undefined;
  }

  if (element.id.length === 0) {
    element.id = createGeneratedId(prefix);
  }

  return element.id;
}

function getElementLabels(element: Element | null) {
  if (element == null || !('labels' in element)) {
    return [] as HTMLLabelElement[];
  }

  return Array.from((element as HTMLInputElement | HTMLButtonElement).labels ?? []);
}

function createGeneratedId(prefix: string) {
  generatedElementId += 1;
  return `${prefix}-${generatedElementId}`;
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

export interface SwitchRootState {
  /**
   * Whether the switch is currently active.
   */
  checked: boolean;
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
  /**
   * Whether the user should be unable to activate or deactivate the switch.
   */
  readOnly: boolean;
  /**
   * Whether the user must activate the switch before submitting a form.
   */
  required: boolean;
}

export interface SwitchRootProps extends Omit<
  ComponentPropsWithChildren<'span', SwitchRootState, unknown, SwitchRootRenderProps>,
  | 'checked'
  | 'children'
  | 'defaultChecked'
  | 'disabled'
  | 'id'
  | 'name'
  | 'render'
  | 'required'
  | 'value'
> {
  /**
   * Whether the switch is currently active.
   *
   * To render a controlled switch, use the `checked` prop instead.
   */
  checked?: boolean | undefined;
  /**
   * Whether the switch is initially active.
   *
   * To render a controlled switch, use the `checked` prop instead.
   * @default false
   */
  defaultChecked?: boolean | undefined;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * The id of the switch element.
   */
  id?: string | undefined;
  /**
   * A ref to access the hidden `<input>` element.
   */
  inputRef?: HTMLProps<HTMLInputElement>['ref'] | undefined;
  /**
   * Identifies the field when a form is submitted.
   */
  name?: string | undefined;
  /**
   * Whether the component renders a native `<button>` element when replacing it
   * via the `render` prop.
   * @default false
   */
  nativeButton?: boolean | undefined;
  /**
   * Event handler called when the switch is activated or deactivated.
   */
  onCheckedChange?:
    | ((checked: boolean, eventDetails: SwitchRoot.ChangeEventDetails) => void)
    | undefined;
  /**
   * Whether the user should be unable to activate or deactivate the switch.
   * @default false
   */
  readOnly?: boolean | undefined;
  /**
   * Whether the user must activate the switch before submitting a form.
   * @default false
   */
  required?: boolean | undefined;
  /**
   * Allows you to replace the component's HTML element
   * with a different tag, or compose it with a template that has a single root element.
   */
  render?: SwitchRootRenderProp | undefined;
  /**
   * The value submitted with the form when the switch is off.
   * By default, unchecked switches do not submit any value, matching native checkbox behavior.
   */
  uncheckedValue?: string | undefined;
  /**
   * The value submitted with the form when the switch is on.
   * By default, switch submits the "on" value, matching native checkbox behavior.
   */
  value?: string | undefined;
}

export interface SwitchThumbProps extends ComponentPropsWithChildren<
  'span',
  SwitchThumbState,
  unknown,
  HTMLProps<HTMLSpanElement>
> {
  render?: SwitchThumbRenderProp | undefined;
}

export interface SwitchThumbState extends SwitchRootState {}

export type SwitchRootChangeEventDetails = BaseUIChangeEventDetails<'none'>;

export namespace SwitchRoot {
  export type Props = SwitchRootProps;
  export type State = SwitchRootState;
  export type ChangeEventDetails = SwitchRootChangeEventDetails;
}

export namespace SwitchThumb {
  export type Props = SwitchThumbProps;
  export type State = SwitchThumbState;
}

export const Switch = {
  Root: SwitchRoot,
  Thumb: SwitchThumb,
} as const;
