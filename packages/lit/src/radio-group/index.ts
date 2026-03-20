import { html, noChange, nothing, type TemplateResult } from 'lit';
// eslint-disable-next-line import/extensions
import { AsyncDirective, directive } from 'lit/async-directive.js';
import {
  FIELDSET_STATE_CHANGE_EVENT,
  getClosestFieldsetRoot,
  getFieldsetContextFromElement,
} from '../fieldset/shared.ts';
// eslint-disable-next-line import/extensions
import { mergeProps } from '../merge-props/index.ts';
// eslint-disable-next-line import/extensions
import type { BaseUIChangeEventDetails, ComponentRenderFn, HTMLProps } from '../types/index.ts';
// eslint-disable-next-line import/extensions
import { useRender } from '../use-render/index.ts';
import {
  RADIO_GROUP_ATTRIBUTE,
  RADIO_GROUP_STATE_CHANGE_EVENT,
  createRadioGroupId,
  setRadioGroupRuntimeState,
  type RadioGroupRuntimeState,
  // eslint-disable-next-line import/extensions
} from './shared.ts';

const RADIO_ROOT_ATTRIBUTE = 'data-base-ui-radio-root';
const NO_PENDING_FOCUS = Symbol('base-ui-radio-group-no-pending-focus');

type Ref<T> = HTMLProps<T>['ref'];

type ComponentPropsWithChildren<
  ElementType extends keyof HTMLElementTagNameMap,
  State,
  Children = unknown,
  RenderFunctionProps = HTMLProps,
> = Omit<useRender.ComponentProps<ElementType, State, RenderFunctionProps>, 'children'> & {
  children?: Children | undefined;
};

type RadioGroupRenderProps = HTMLProps<HTMLDivElement> & {
  children?: unknown;
};

type RadioGroupRenderProp =
  | TemplateResult
  | ComponentRenderFn<RadioGroupRenderProps, RadioGroupState>;

class RadioGroupDirective<Value> extends AsyncDirective {
  private latestProps: RadioGroupProps<Value> | null = null;
  private root: HTMLDivElement | null = null;
  private fieldsetRoot: Element | null = null;
  private initialized = false;
  private defaultValue: Value | undefined = undefined;
  private initialValue: Value | undefined = undefined;
  private syncQueued = false;
  private groupId = '';
  private lastPublishedRuntimeStateKey: string | null = null;
  private currentInputRef: HTMLInputElement | null = null;
  private currentInputRefProp: Ref<HTMLInputElement> | undefined = undefined;
  private currentInputRefCleanup: void | (() => void) | undefined = undefined;
  private controlEntries = new Map<HTMLElement, RadioEntry<Value>>();
  private inputEntries = new Map<HTMLInputElement, RadioInputEntry<Value>>();
  private pendingFocusValue: Value | typeof NO_PENDING_FOCUS = NO_PENDING_FOCUS;
  private focused = false;
  private touched = false;

  render(_componentProps: RadioGroupProps<Value>) {
    return noChange;
  }

  override update(
    _part: Parameters<AsyncDirective['update']>[0],
    [componentProps]: [RadioGroupProps<Value>],
  ) {
    this.latestProps = componentProps;

    if (!this.initialized) {
      this.initialized = true;
      this.defaultValue = componentProps.defaultValue;
      this.initialValue =
        componentProps.value !== undefined ? componentProps.value : componentProps.defaultValue;
      this.groupId = createRadioGroupId();
    }

    this.scheduleDomSync();

    return this.renderCurrent();
  }

  override disconnected() {
    this.applyInputRef(null);
    setRadioGroupRuntimeState(this.root, null);
    this.syncFieldsetRoot(null);
    this.root = null;
    this.controlEntries.clear();
    this.inputEntries.clear();
    this.lastPublishedRuntimeStateKey = null;
    this.pendingFocusValue = NO_PENDING_FOCUS;
    this.focused = false;
    this.touched = false;
  }

  override reconnected() {}

  private renderCurrent() {
    if (this.latestProps == null) {
      return nothing;
    }

    const {
      children,
      defaultValue: defaultValueProp,
      disabled: disabledProp = false,
      inputRef,
      name,
      onValueChange,
      readOnly = false,
      render,
      required = false,
      value,
      ...elementProps
    } = this.latestProps;
    void defaultValueProp;
    void inputRef;
    void name;
    void onValueChange;
    void value;

    const fieldsetContext = this.getFieldsetContext();
    const disabled = disabledProp || fieldsetContext?.disabled === true;
    const state = this.getState();
    const rootProps = mergeProps<HTMLDivElement>(
      {
        [RADIO_GROUP_ATTRIBUTE]: '',
        role: 'radiogroup',
        'aria-disabled': disabled ? 'true' : undefined,
        'aria-labelledby':
          (elementProps['aria-labelledby'] as string | undefined) ?? fieldsetContext?.legendId,
        'aria-readonly': readOnly ? 'true' : undefined,
        'aria-required': required ? 'true' : undefined,
        onFocusIn: () => {
          if (this.focused) {
            return;
          }

          this.focused = true;
          this.syncRootStateAttributes();
        },
        onFocusOut: (event: FocusEvent) => {
          if (this.root?.contains(event.relatedTarget as Node | null)) {
            return;
          }

          const didChange = this.focused || !this.touched;
          this.focused = false;
          this.touched = true;

          if (didChange) {
            this.syncRootStateAttributes();
          }
        },
      },
      (children === undefined ? elementProps : { ...elementProps, children }) as Parameters<
        typeof mergeProps<HTMLDivElement>
      >[0],
    );

    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useRender<RadioGroupState, HTMLDivElement>({
      defaultTagName: 'div',
      render,
      ref: this.handleRootRef,
      state,
      stateAttributesMapping: getRadioGroupStateAttributesMapping(),
      props: rootProps,
    });
  }

  private getValue() {
    return this.latestProps?.value !== undefined ? this.latestProps.value : this.defaultValue;
  }

  private getName() {
    return this.latestProps?.name;
  }

  private getState(): RadioGroupState {
    const disabled = Boolean(this.latestProps?.disabled) || this.getFieldsetContext()?.disabled === true;
    const readOnly = Boolean(this.latestProps?.readOnly);
    const required = Boolean(this.latestProps?.required);
    const value = this.getValue();

    return {
      disabled,
      dirty: !areEqual(this.initialValue, value),
      filled: value != null,
      focused: this.focused,
      readOnly,
      required,
      touched: this.touched,
      valid: getValidState(this.latestProps),
    };
  }

  private getRuntimeState(): RadioGroupRuntimeState<Value> {
    return {
      checkedValue: this.getValue(),
      disabled: Boolean(this.latestProps?.disabled),
      getTabIndex: (value, disabled) => {
        return this.getTabIndex(value, disabled);
      },
      id: this.groupId,
      moveFocus: (currentControl, key, event) => {
        return this.moveFocus(currentControl, key, event);
      },
      name: this.getName(),
      readOnly: Boolean(this.latestProps?.readOnly),
      registerControl: (element, value, disabled) => {
        this.controlEntries.set(element, { disabled, value });
        this.scheduleDomSync();
      },
      registerInput: (input, value, disabled) => {
        this.inputEntries.set(input, { disabled, value });
        this.scheduleDomSync();
      },
      required: Boolean(this.latestProps?.required),
      setCheckedValue: (value, eventDetails) => {
        return this.commitValue(value, eventDetails);
      },
      unregisterControl: (element) => {
        if (this.controlEntries.delete(element)) {
          this.scheduleDomSync();
        }
      },
      unregisterInput: (input) => {
        if (this.inputEntries.delete(input)) {
          this.scheduleDomSync();
        }
      },
    };
  }

  private commitValue(nextValue: Value, eventDetails: BaseUIChangeEventDetails<'none'>) {
    this.latestProps?.onValueChange?.(nextValue, eventDetails);

    if (eventDetails.isCanceled) {
      this.requestComponentUpdate();
      return false;
    }

    if (this.latestProps?.value === undefined) {
      this.defaultValue = nextValue;
    }

    this.requestComponentUpdate();
    return this.latestProps?.value === undefined || areEqual(this.latestProps.value, nextValue);
  }

  private getTabIndex(value: Value, disabled: boolean) {
    if (disabled) {
      return -1;
    }

    const entries = this.getOrderedControls().filter((entry) => !entry.disabled);

    if (entries.length === 0) {
      return -1;
    }

    const checkedEntry = entries.find((entry) => areEqual(entry.value, this.getValue()));

    if (checkedEntry != null) {
      return areEqual(checkedEntry.value, value) ? 0 : -1;
    }

    return areEqual(entries[0]?.value, value) ? 0 : -1;
  }

  private moveFocus(currentControl: HTMLElement, key: string, event: KeyboardEvent) {
    const direction = getMovementDirection(key, this.root);

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

    if (nextEntry == null) {
      return { handled: false, selectionCommitted: false };
    }

    this.focused = true;
    this.touched = true;
    this.syncRootStateAttributes();
    this.pendingFocusValue = nextEntry.value;
    nextEntry.control.focus({ preventScroll: true });

    if (!areEqual(nextEntry.value, this.getValue())) {
      return {
        handled: true,
        selectionCommitted: this.commitValue(
          nextEntry.value,
          createChangeEventDetails(event, nextEntry.control),
        ),
      };
    }

    this.pendingFocusValue = NO_PENDING_FOCUS;
    nextEntry.control.focus({ preventScroll: true });
    this.scheduleDomSync();

    return { handled: true, selectionCommitted: true };
  }

  private getOrderedControls() {
    if (this.root == null) {
      return [] as OrderedControlEntry<Value>[];
    }

    return Array.from(this.root.querySelectorAll<HTMLElement>(`[${RADIO_ROOT_ATTRIBUTE}]`))
      .map((control) => {
        const entry = this.controlEntries.get(control);

        if (entry == null) {
          return null;
        }

        return {
          control,
          disabled: entry.disabled,
          value: entry.value,
        };
      })
      .filter((entry): entry is OrderedControlEntry<Value> => entry != null);
  }

  private getOrderedInputs() {
    if (this.root == null) {
      return [] as OrderedInputEntry<Value>[];
    }

    return Array.from(this.root.querySelectorAll<HTMLInputElement>('input[type="radio"]'))
      .map((input) => {
        const entry = this.inputEntries.get(input);

        if (entry == null) {
          return null;
        }

        return {
          disabled: entry.disabled,
          input,
          value: entry.value,
        };
      })
      .filter((entry): entry is OrderedInputEntry<Value> => entry != null);
  }

  private handleRootRef = (element: HTMLDivElement | null) => {
    setRadioGroupRuntimeState(this.root, null);
    this.syncFieldsetRoot(null);
    this.root = element;
    const fieldsetRoot = getClosestFieldsetRoot(element);
    this.syncFieldsetRoot(fieldsetRoot);
    if (fieldsetRoot != null) {
      queueMicrotask(() => {
        this.requestComponentUpdate();
      });
    }
    this.scheduleDomSync();
  };

  private requestComponentUpdate() {
    if (!this.isConnected) {
      return;
    }

    try {
      this.setValue(this.renderCurrent());
    } catch (error) {
      if (isDetachedChildPartError(error)) {
        return;
      }

      throw error;
    }

    this.scheduleDomSync();
  }

  private restoreFocusAfterUpdate() {
    const focusValue = this.pendingFocusValue;

    if (focusValue === NO_PENDING_FOCUS) {
      return;
    }

    queueMicrotask(() => {
      queueMicrotask(() => {
        const root = this.root;

        if (root == null || !root.isConnected) {
          return;
        }

        this.pendingFocusValue = NO_PENDING_FOCUS;
        const focusedEntry = this.getOrderedControls().find((entry) => {
          return !entry.disabled && areEqual(entry.value, focusValue);
        });
        const control = focusedEntry?.control;

        if (
          control == null ||
          !control.isConnected ||
          control === control.ownerDocument?.activeElement
        ) {
          return;
        }

        control.focus({ preventScroll: true });
      });
    });
  }

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
    if (this.root == null) {
      return;
    }

    const runtimeState = this.getRuntimeState();
    setRadioGroupRuntimeState(this.root, runtimeState);
    this.applyInputRef(this.getPreferredInput(runtimeState.checkedValue));

    const nextRuntimeStateKey = JSON.stringify({
      checkedValue: serializeForKey(runtimeState.checkedValue),
      controls: this.getOrderedControls().map((entry) => ({
        disabled: entry.disabled,
        value: serializeForKey(entry.value),
      })),
      disabled: runtimeState.disabled,
      inputs: this.getOrderedInputs().map((entry) => ({
        disabled: entry.disabled,
        value: serializeForKey(entry.value),
      })),
      name: runtimeState.name,
      readOnly: runtimeState.readOnly,
      required: runtimeState.required,
    });

    if (nextRuntimeStateKey === this.lastPublishedRuntimeStateKey) {
      return;
    }

    this.lastPublishedRuntimeStateKey = nextRuntimeStateKey;
    this.root.dispatchEvent(new CustomEvent(RADIO_GROUP_STATE_CHANGE_EVENT));
    this.restoreFocusAfterUpdate();
  }

  private getPreferredInput(checkedValue: Value | undefined) {
    const checkedInput = this.root?.querySelector<HTMLInputElement>('input[type="radio"]:checked');

    if (checkedInput != null && !checkedInput.disabled) {
      return checkedInput;
    }

    const entries = this.getOrderedInputs().filter((entry) => !entry.disabled);
    const checkedEntry = entries.find((entry) => areEqual(entry.value, checkedValue));

    return checkedEntry?.input ?? entries[0]?.input ?? null;
  }

  private applyInputRef(input: HTMLInputElement | null) {
    const inputRef = this.latestProps?.inputRef;

    if (this.currentInputRef === input && this.currentInputRefProp === inputRef) {
      return;
    }

    this.clearInputRef();
    this.currentInputRef = input;
    this.currentInputRefProp = inputRef;

    if (inputRef == null) {
      return;
    }

    if (typeof inputRef === 'function') {
      this.currentInputRefCleanup = inputRef(input) ?? undefined;
      return;
    }

    (inputRef as { current: HTMLInputElement | null }).current = input;
  }

  private clearInputRef() {
    const previousInputRef = this.currentInputRefProp;

    if (typeof this.currentInputRefCleanup === 'function') {
      this.currentInputRefCleanup();
    } else if (typeof previousInputRef === 'function') {
      previousInputRef(null);
    } else if (previousInputRef != null) {
      previousInputRef.current = null;
    }

    this.currentInputRefCleanup = undefined;
    this.currentInputRefProp = undefined;
  }

  private getFieldsetContext() {
    if (this.fieldsetRoot == null) {
      return null;
    }

    return getFieldsetContextFromElement(this.fieldsetRoot);
  }

  private syncFieldsetRoot(element: Element | null) {
    if (this.fieldsetRoot === element) {
      return;
    }

    this.fieldsetRoot?.removeEventListener(
      FIELDSET_STATE_CHANGE_EVENT,
      this.handleFieldsetStateChange,
    );
    this.fieldsetRoot = element;
    this.fieldsetRoot?.addEventListener(FIELDSET_STATE_CHANGE_EVENT, this.handleFieldsetStateChange);
  }

  private handleFieldsetStateChange = () => {
    this.requestComponentUpdate();
  };

  private syncRootStateAttributes() {
    if (this.root == null) {
      return;
    }

    const state = this.getState();

    syncBooleanDataAttribute(this.root, 'data-dirty', state.dirty);
    syncBooleanDataAttribute(this.root, 'data-disabled', state.disabled);
    syncBooleanDataAttribute(this.root, 'data-filled', state.filled);
    syncBooleanDataAttribute(this.root, 'data-focused', state.focused);
    syncBooleanDataAttribute(this.root, 'data-readonly', state.readOnly);
    syncBooleanDataAttribute(this.root, 'data-required', state.required);
    syncBooleanDataAttribute(this.root, 'data-touched', state.touched);
    syncBooleanDataAttribute(this.root, 'data-valid', state.valid === true);
    syncBooleanDataAttribute(this.root, 'data-invalid', state.valid === false);
  }
}

const radioGroupDirective = directive(RadioGroupDirective);

/**
 * Provides a shared state to a series of radio buttons.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Radio Group](https://base-ui.com/react/components/radio)
 */
export function RadioGroup<Value = any>(componentProps: RadioGroupProps<Value>): TemplateResult {
  return html`${radioGroupDirective(componentProps as RadioGroupProps<unknown>)}`;
}

function getRadioGroupStateAttributesMapping(): useRender.Parameters<
  RadioGroupState,
  HTMLDivElement,
  undefined
>['stateAttributesMapping'] {
  return {
    disabled(value) {
      return value ? createDataAttribute('data-disabled') : null;
    },
    readOnly(value) {
      return value ? createDataAttribute('data-readonly') : null;
    },
    required(value) {
      return value ? createDataAttribute('data-required') : null;
    },
    valid(value) {
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

function createDataAttribute(name: string) {
  return { [name]: '' };
}

function syncBooleanDataAttribute(element: Element, name: string, enabled: boolean) {
  if (enabled) {
    element.setAttribute(name, '');
    return;
  }

  element.removeAttribute(name);
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

function getMovementDirection(key: string, root: HTMLElement | null) {
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

function getDirection(root: HTMLElement | null) {
  if (root == null) {
    return 'ltr';
  }

  const documentElement = root.ownerDocument?.documentElement;
  const dir = root.closest('[dir]')?.getAttribute('dir') ?? documentElement?.getAttribute('dir');

  return dir === 'rtl' ? 'rtl' : 'ltr';
}

function areEqual(a: unknown, b: unknown) {
  return Object.is(a, b);
}

function serializeForKey(value: unknown) {
  if (value === undefined) {
    return '__undefined__';
  }

  if (value === null) {
    return '__null__';
  }

  if (typeof value === 'string') {
    return `string:${value}`;
  }

  try {
    return `${typeof value}:${JSON.stringify(value)}`;
  } catch {
    return `${typeof value}:${String(value)}`;
  }
}

function getValidState(props: Record<string, unknown> | null) {
  if (props == null) {
    return null;
  }

  if (props['data-valid'] != null) {
    return true;
  }

  if (props['data-invalid'] != null) {
    return false;
  }

  const ariaInvalid = props['aria-invalid'];

  if (ariaInvalid == null || ariaInvalid === false || ariaInvalid === 'false') {
    return null;
  }

  return false;
}

function isDetachedChildPartError(error: unknown) {
  return (
    error instanceof Error &&
    error.message.includes('ChildPart') &&
    error.message.includes('no `parentNode`')
  );
}

interface RadioEntry<Value> {
  value: Value;
  disabled: boolean;
}

interface RadioInputEntry<Value> {
  value: Value;
  disabled: boolean;
}

interface OrderedControlEntry<Value> {
  control: HTMLElement;
  value: Value;
  disabled: boolean;
}

interface OrderedInputEntry<Value> {
  input: HTMLInputElement;
  value: Value;
  disabled: boolean;
}

export interface RadioGroupState {
  dirty: boolean;
  disabled: boolean;
  filled: boolean;
  focused: boolean;
  readOnly: boolean;
  required: boolean;
  touched: boolean;
  valid: boolean | null;
}

export interface RadioGroupProps<Value = any> extends ComponentPropsWithChildren<
  'div',
  RadioGroupState,
  unknown,
  HTMLProps<HTMLDivElement>
> {
  /**
   * Whether the user should be unable to interact with the radio group.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * The uncontrolled value of the radio button that should be initially selected.
   */
  defaultValue?: Value | undefined;
  /**
   * A ref to access the checked radio input, or the first enabled input when nothing is selected.
   */
  inputRef?: Ref<HTMLInputElement> | undefined;
  /**
   * The name of the radio inputs in the group.
   */
  name?: string | undefined;
  /**
   * Event handler called when the selected value changes.
   */
  onValueChange?: ((value: Value, eventDetails: RadioGroup.ChangeEventDetails) => void) | undefined;
  /**
   * Whether the user should be unable to change the selected value.
   * @default false
   */
  readOnly?: boolean | undefined;
  render?: RadioGroupRenderProp | undefined;
  /**
   * Whether the user must choose a value before submitting a form.
   * @default false
   */
  required?: boolean | undefined;
  /**
   * The controlled selected value.
   */
  value?: Value | undefined;
}

export type RadioGroupChangeEventReason = 'none';
export type RadioGroupChangeEventDetails = BaseUIChangeEventDetails<RadioGroup.ChangeEventReason>;

export namespace RadioGroup {
  export type Props<TValue = any> = RadioGroupProps<TValue>;
  export type State = RadioGroupState;
  export type ChangeEventReason = RadioGroupChangeEventReason;
  export type ChangeEventDetails = RadioGroupChangeEventDetails;
}
