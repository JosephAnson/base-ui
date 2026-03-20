import { html, noChange, nothing, type TemplateResult } from 'lit';
// eslint-disable-next-line import/extensions
import { AsyncDirective, directive } from 'lit/async-directive.js';
// eslint-disable-next-line import/extensions
import { mergeProps } from '../merge-props/index.ts';
import type {
  BaseUIChangeEventDetails,
  BaseUIEvent,
  ComponentRenderFn,
  HTMLProps,
  // eslint-disable-next-line import/extensions
} from '../types/index.ts';
// eslint-disable-next-line import/extensions
import { useRender } from '../use-render/index.ts';
import {
  RADIO_GROUP_STATE_CHANGE_EVENT,
  getClosestRadioGroupRoot,
  getRadioGroupRuntimeState,
  type RadioGroupRuntimeState,
  // eslint-disable-next-line import/extensions
} from '../radio-group/shared.ts';

const RADIO_ROOT_ATTRIBUTE = 'data-base-ui-radio-root';
const RADIO_ROOT_STATE = Symbol('base-ui-radio-root-state');
const RADIO_STATE_CHANGE_EVENT = 'base-ui-radio-state-change';
const RADIO_INDICATOR_ATTRIBUTE = 'data-base-ui-radio-indicator';
const RADIO_CONTEXT_ERROR =
  'Base UI: RadioRootContext is missing. Radio parts must be placed within <Radio.Root>.';
const STARTING_STYLE_ATTRIBUTE = 'data-starting-style';
const ENDING_STYLE_ATTRIBUTE = 'data-ending-style';

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

type Ref<T> = HTMLProps<T>['ref'];
type RadioClickEvent = KeyboardEvent | MouseEvent;
type RadioEventHandler<EventType extends Event> = (event: BaseUIEvent<EventType>) => void;
type TransitionStatus = 'starting' | 'ending' | undefined;

type ComponentPropsWithChildren<
  ElementType extends keyof HTMLElementTagNameMap,
  State,
  Children = unknown,
  RenderFunctionProps = HTMLProps,
> = Omit<useRender.ComponentProps<ElementType, State, RenderFunctionProps>, 'children'> & {
  children?: Children | undefined;
};

type RadioRootRenderProps = Omit<
  HTMLProps<HTMLElement>,
  'children' | 'onClick' | 'onKeyDown' | 'onKeyUp'
> & {
  children?: unknown;
  onClick?: RadioEventHandler<RadioClickEvent> | undefined;
  onKeyDown?: RadioEventHandler<KeyboardEvent> | undefined;
  onKeyUp?: RadioEventHandler<KeyboardEvent> | undefined;
};

type RadioRootRenderProp = TemplateResult | ComponentRenderFn<RadioRootRenderProps, RadioRootState>;
type RadioIndicatorRenderProp =
  | TemplateResult
  | ComponentRenderFn<HTMLProps<HTMLSpanElement>, RadioIndicatorState>;

class RadioRootDirective<Value> extends AsyncDirective {
  private latestProps: RadioRootProps<Value> | null = null;
  private root: HTMLElement | null = null;
  private input: HTMLInputElement | null = null;
  private groupRoot: Element | null = null;
  private initialized = false;
  private initialChecked = false;
  private syncQueued = false;
  private focused = false;
  private touched = false;
  private pendingChangeEventSource: Event | null = null;
  private pendingChangeTrigger: Element | null = null;
  private lastPublishedStateKey: string | null = null;
  private frameId: number | null = null;

  render(_componentProps: RadioRootProps<Value>) {
    return noChange;
  }

  override update(
    part: Parameters<AsyncDirective['update']>[0],
    [componentProps]: [RadioRootProps<Value>],
  ) {
    this.latestProps = componentProps;
    this.syncGroupRoot(
      getClosestRadioGroupRoot(
        (part as { parentNode?: Node | null | undefined }).parentNode ?? null,
      ),
    );

    if (!this.initialized) {
      this.initialized = true;
      this.initialChecked = this.computeChecked();
    }

    this.scheduleDomSync();

    return this.renderCurrent();
  }

  override disconnected() {
    this.cleanupGroupRegistration();
    this.syncGroupRoot(null);
    setRadioRootState(this.root, null);
    this.clearScheduledFrame();
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
      children,
      disabled: disabledProp = false,
      id,
      inputRef,
      nativeButton = false,
      readOnly: readOnlyProp = false,
      render,
      required: requiredProp = false,
      value,
      ...elementProps
    } = this.latestProps;

    const groupState = this.getGroupState();
    const checked = this.computeChecked();
    const disabled = Boolean(groupState?.disabled) || disabledProp;
    const readOnly = Boolean(groupState?.readOnly) || readOnlyProp;
    const required = Boolean(groupState?.required) || requiredProp;
    const hiddenInputId = nativeButton ? undefined : getStringAttribute(id);
    const rootId = nativeButton ? getStringAttribute(id) : undefined;
    const tabIndex = groupState?.getTabIndex(value, disabled) ?? getRadioTabIndex(disabled);
    const rootProps = mergeProps<HTMLElement>(
      {
        [RADIO_ROOT_ATTRIBUTE]: '',
        id: rootId,
        role: 'radio',
        tabIndex,
        'aria-checked': checked ? 'true' : 'false',
        'aria-disabled': disabled ? 'true' : undefined,
        'aria-readonly': readOnly ? 'true' : undefined,
        'aria-required': required ? 'true' : undefined,
        onClick: (event: BaseUIEvent<MouseEvent>) => {
          if (event.baseUIHandlerPrevented || disabled || readOnly) {
            return;
          }

          event.preventDefault();
          this.dispatchInputClick(event, event.currentTarget);
        },
        onKeyDown: (event: BaseUIEvent<KeyboardEvent>) => {
          if (event.baseUIHandlerPrevented || disabled) {
            return;
          }

          if (event.key === 'Enter') {
            event.preventDefault();

            if (!nativeButton && !readOnly) {
              this.dispatchInputClick(event, event.currentTarget);
            }

            return;
          }

          const moveResult = groupState?.moveFocus(
            event.currentTarget as HTMLElement,
            event.key,
            event,
          );

          if (moveResult?.handled) {
            event.preventDefault();

            if (!moveResult.selectionCommitted) {
              this.forceGroupSync();
            }

            return;
          }

          const isSpaceKey = event.key === ' ' || event.key === 'Spacebar';
          if (!nativeButton && isSpaceKey) {
            event.preventDefault();
          }
        },
        onKeyUp: (event: BaseUIEvent<KeyboardEvent>) => {
          if (event.baseUIHandlerPrevented || nativeButton || disabled || readOnly) {
            return;
          }

          const isSpaceKey = event.key === ' ' || event.key === 'Spacebar';

          if (!isSpaceKey) {
            return;
          }

          event.preventDefault();
          this.dispatchInputClick(event, event.currentTarget);
        },
        onFocus: () => {
          if (this.focused) {
            return;
          }

          this.focused = true;
          this.publishStateChange();
        },
        onBlur: () => {
          const didChange = this.focused || !this.touched;
          this.focused = false;
          this.touched = true;

          if (didChange) {
            this.publishStateChange();
          }
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
        name: groupState?.name,
        readOnly,
        required,
        style: groupState?.name ? visuallyHiddenInput : visuallyHidden,
        tabIndex: -1,
        type: 'radio',
        'aria-hidden': 'true',
        onChange: this.handleInputChange,
        onFocus: () => {
          this.root?.focus();
        },
      },
      value !== undefined ? { value: serializeValue(value) } : undefined,
    );

    const state = this.getState();

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const rootElement = useRender<RadioRootState, HTMLElement>({
      defaultTagName: 'span',
      render,
      ref: [this.handleRootRef],
      state,
      stateAttributesMapping: getRadioStateAttributesMapping(),
      props: rootProps,
    });
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const inputElement = useRender<Record<string, never>, HTMLInputElement>({
      defaultTagName: 'input',
      ref: [this.handleInputRef, inputRef],
      props: inputProps,
    });

    return html`${rootElement}${inputElement}`;
  }

  private computeChecked() {
    if (this.latestProps == null) {
      return false;
    }

    const groupState = this.getGroupState();

    if (groupState == null) {
      return this.latestProps.value === '';
    }

    return areEqual(groupState.checkedValue, this.latestProps.value);
  }

  private getState(): RadioRootState {
    const groupState = this.getGroupState();
    const checked = this.computeChecked();
    const disabled = Boolean(groupState?.disabled) || Boolean(this.latestProps?.disabled);
    const readOnly = Boolean(groupState?.readOnly) || Boolean(this.latestProps?.readOnly);
    const required = Boolean(groupState?.required) || Boolean(this.latestProps?.required);

    return {
      checked,
      disabled,
      dirty: checked !== this.initialChecked,
      filled: checked,
      focused: this.focused,
      readOnly,
      required,
      touched: this.touched,
      valid: null,
    };
  }

  private handleRootRef = (element: HTMLElement | null) => {
    if (this.root !== element) {
      this.cleanupGroupRegistration();
      setRadioRootState(this.root, null);
    }

    this.root = element;
    this.syncGroupRoot(this.root?.closest('[data-base-ui-radio-group]') ?? null);
    this.syncGroupRegistration();
    setRadioRootState(this.root, this.getState());
    this.scheduleDomSync();
  };

  private handleInputRef = (element: HTMLInputElement | null) => {
    if (this.input != null && this.input !== element) {
      this.getGroupState()?.unregisterInput(this.input);
    }

    this.input = element;
    this.syncGroupRegistration();
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

    const groupState = this.getGroupState();
    const disabled = Boolean(groupState?.disabled) || Boolean(this.latestProps.disabled);
    const readOnly = Boolean(groupState?.readOnly) || Boolean(this.latestProps.readOnly);

    if (disabled || readOnly) {
      this.pendingChangeEventSource = null;
      this.pendingChangeTrigger = null;
      currentTarget.checked = this.computeChecked();
      this.requestComponentUpdate();
      return;
    }

    if (groupState == null) {
      currentTarget.checked = this.computeChecked();
      this.requestComponentUpdate();
      return;
    }

    const eventDetails = createChangeEventDetails(
      this.pendingChangeEventSource ?? event,
      this.pendingChangeTrigger ?? this.root ?? currentTarget,
    );

    this.pendingChangeEventSource = null;
    this.pendingChangeTrigger = null;

    const selectionCommitted = groupState.setCheckedValue(this.latestProps.value, eventDetails);

    if (!selectionCommitted) {
      currentTarget.checked = this.computeChecked();
      this.forceGroupSync();
    }

    this.requestComponentUpdate();
  };

  private dispatchInputClick(event: MouseEvent | KeyboardEvent, rootTarget: EventTarget | null) {
    if (this.latestProps == null || this.computeChecked()) {
      return;
    }

    const root = rootTarget instanceof HTMLElement ? rootTarget : this.root;
    const groupState = this.getGroupState();

    if (groupState != null) {
      const eventDetails = createChangeEventDetails(
        event,
        root ?? this.root ?? this.input ?? undefined,
      );
      const selectionCommitted = groupState.setCheckedValue(this.latestProps.value, eventDetails);

      if (!selectionCommitted) {
        this.forceGroupSync();
      }

      this.requestComponentUpdate();
      return;
    }

    const adjacentInput = getAdjacentRadioInput(root);
    const input =
      this.input ??
      adjacentInput ??
      (root?.parentElement?.querySelector('input[type="radio"]') as HTMLInputElement | null);

    if (input == null || input.checked) {
      return;
    }

    this.input = input;
    this.pendingChangeEventSource = event;
    this.pendingChangeTrigger = root;

    input.checked = true;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  private requestComponentUpdate() {
    if (!this.isConnected) {
      return;
    }

    const shouldRestoreFocus =
      this.focused || (this.root != null && this.root === this.root.ownerDocument?.activeElement);

    try {
      this.setValue(this.renderCurrent());
    } catch (error) {
      if (isDetachedChildPartError(error)) {
        return;
      }

      throw error;
    }

    this.restoreFocusAfterUpdate(shouldRestoreFocus);
    this.scheduleDomSync();
  }

  private restoreFocusAfterUpdate(shouldRestoreFocus: boolean) {
    if (!shouldRestoreFocus) {
      return;
    }

    queueMicrotask(() => {
      const root = this.root;

      if (root == null || root === root.ownerDocument?.activeElement || !root.isConnected) {
        return;
      }

      root.focus({ preventScroll: true });
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

        this.syncGroupRegistration();

        if (this.syncGroupRenderState()) {
          return;
        }

        this.syncAriaLabelledBy();
        this.publishStateChange();
      });
    });
  }

  private syncGroupRenderState() {
    if (this.root == null || this.latestProps == null) {
      return false;
    }

    const groupState = this.getGroupState();

    if (groupState == null) {
      return false;
    }

    const disabled = Boolean(groupState.disabled) || Boolean(this.latestProps.disabled);
    const expectedTabIndex = groupState.getTabIndex(this.latestProps.value, disabled);
    const expectedChecked = this.computeChecked();
    const currentChecked = this.root.getAttribute('aria-checked') === 'true';
    const currentTabIndex = this.root.tabIndex;

    if (currentTabIndex === expectedTabIndex && currentChecked === expectedChecked) {
      return false;
    }

    this.requestComponentUpdate();
    return true;
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

    const labelIds = Array.from(getElementLabels(control, getStringAttribute(this.latestProps.id)))
      .map((label) => ensureElementId(label, 'base-ui-radio-label'))
      .filter((value): value is string => value != null);

    if (labelIds.length === 0) {
      this.root.removeAttribute('aria-labelledby');
      return;
    }

    this.root.setAttribute('aria-labelledby', labelIds.join(' '));
  }

  private publishStateChange() {
    if (this.root == null) {
      return;
    }

    const state = this.getState();
    setRadioRootState(this.root, state);
    const nextStateKey = JSON.stringify(state);

    if (nextStateKey === this.lastPublishedStateKey) {
      return;
    }

    this.lastPublishedStateKey = nextStateKey;
    this.root.dispatchEvent(new CustomEvent(RADIO_STATE_CHANGE_EVENT));
  }

  private getGroupState() {
    return getRadioGroupRuntimeState(this.groupRoot) as RadioGroupRuntimeState<Value> | null;
  }

  private syncGroupRoot(root: Element | null) {
    if (this.groupRoot === root) {
      return;
    }

    this.groupRoot?.removeEventListener(
      RADIO_GROUP_STATE_CHANGE_EVENT,
      this.handleGroupStateChange,
    );
    this.groupRoot = root;
    this.groupRoot?.addEventListener(RADIO_GROUP_STATE_CHANGE_EVENT, this.handleGroupStateChange);
  }

  private syncGroupRegistration() {
    const groupState = this.getGroupState();

    if (groupState == null || this.latestProps == null) {
      this.cleanupGroupRegistration();
      return;
    }

    const disabled = Boolean(groupState.disabled) || Boolean(this.latestProps.disabled);

    if (this.root != null) {
      groupState.registerControl(this.root, this.latestProps.value, disabled);
    }

    if (this.input != null) {
      groupState.registerInput(this.input, this.latestProps.value, disabled);
    }
  }

  private cleanupGroupRegistration() {
    const groupState = this.getGroupState();

    if (groupState == null) {
      return;
    }

    if (this.root != null) {
      groupState.unregisterControl(this.root);
    }

    if (this.input != null) {
      groupState.unregisterInput(this.input);
    }
  }

  private handleGroupStateChange = () => {
    if (!this.isConnected) {
      return;
    }

    this.requestComponentUpdate();
  };

  private forceGroupSync() {
    this.groupRoot?.dispatchEvent(new CustomEvent(RADIO_GROUP_STATE_CHANGE_EVENT));
  }

  private clearScheduledFrame() {
    if (this.frameId != null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
  }
}

class RadioIndicatorDirective extends AsyncDirective {
  private latestProps: RadioIndicatorProps | null = null;
  private root: Element | null = null;
  private indicator: HTMLSpanElement | null = null;
  private mounted = false;
  private transitionStatus: TransitionStatus = undefined;
  private frameId: number | null = null;
  private exitRunId = 0;

  render(_componentProps: RadioIndicatorProps) {
    return noChange;
  }

  override update(
    part: Parameters<AsyncDirective['update']>[0],
    [componentProps]: [RadioIndicatorProps],
  ) {
    this.latestProps = componentProps;
    this.syncRoot(getRadioRoot(part));

    return this.renderCurrent();
  }

  override disconnected() {
    this.clearScheduledFrame();
    this.syncRoot(null);
    this.indicator = null;
    this.transitionStatus = undefined;
  }

  override reconnected() {}

  private renderCurrent() {
    if (this.latestProps == null || this.root == null) {
      return nothing;
    }

    const { keepMounted = false, render, ...elementProps } = this.latestProps;
    const rootState = getRadioState(this.root);
    const rendered = rootState.checked;

    this.syncPresence(rendered);

    if (!keepMounted && !this.mounted) {
      return nothing;
    }

    const state: RadioIndicatorState = {
      ...rootState,
      transitionStatus: this.transitionStatus,
    };

    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useRender<RadioIndicatorState, HTMLSpanElement>({
      defaultTagName: 'span',
      render,
      ref: this.handleIndicatorRef,
      state,
      stateAttributesMapping: getRadioIndicatorStateAttributesMapping(),
      props: {
        [RADIO_INDICATOR_ATTRIBUTE]: '',
        ...elementProps,
      },
    });
  }

  private syncRoot(root: Element | null) {
    if (this.root === root) {
      return;
    }

    this.root?.removeEventListener(RADIO_STATE_CHANGE_EVENT, this.handleStateChange);
    this.root = root;
    this.root?.addEventListener(RADIO_STATE_CHANGE_EVENT, this.handleStateChange);
  }

  private syncPresence(rendered: boolean) {
    if (rendered) {
      this.exitRunId += 1;

      if (!this.mounted) {
        this.mounted = true;
        this.transitionStatus = 'starting';
        this.scheduleStartingStyleCleanup();
        return;
      }

      if (this.transitionStatus === 'ending') {
        this.transitionStatus = undefined;
      }

      return;
    }

    if (this.mounted && this.transitionStatus !== 'ending') {
      this.transitionStatus = 'ending';
      this.scheduleExitCleanup();
      return;
    }

    if (!this.mounted && this.transitionStatus === 'ending') {
      this.transitionStatus = undefined;
    }
  }

  private scheduleStartingStyleCleanup() {
    this.clearScheduledFrame();

    this.frameId = requestAnimationFrame(() => {
      this.frameId = null;

      if (
        this.root == null ||
        this.transitionStatus !== 'starting' ||
        !getRadioState(this.root).checked
      ) {
        return;
      }

      this.transitionStatus = undefined;
      this.requestComponentUpdate();
    });
  }

  private scheduleExitCleanup() {
    this.clearScheduledFrame();
    this.exitRunId += 1;
    const runId = this.exitRunId;

    this.frameId = requestAnimationFrame(() => {
      this.frameId = null;
      this.waitForExitAnimations(runId);
    });
  }

  private waitForExitAnimations(runId: number) {
    if (runId !== this.exitRunId) {
      return;
    }

    const indicator = this.indicator;

    if (
      indicator == null ||
      typeof indicator.getAnimations !== 'function' ||
      (
        globalThis as typeof globalThis & {
          BASE_UI_ANIMATIONS_DISABLED?: boolean | undefined;
        }
      ).BASE_UI_ANIMATIONS_DISABLED
    ) {
      this.finishExit(runId);
      return;
    }

    Promise.all(indicator.getAnimations().map((animation) => animation.finished))
      .then(() => {
        this.finishExit(runId);
      })
      .catch(() => {
        if (runId !== this.exitRunId || indicator == null) {
          return;
        }

        const activeAnimations = indicator.getAnimations();

        if (
          activeAnimations.length > 0 &&
          activeAnimations.some(
            (animation) => animation.pending || animation.playState !== 'finished',
          )
        ) {
          this.waitForExitAnimations(runId);
          return;
        }

        this.finishExit(runId);
      });
  }

  private finishExit(runId: number) {
    if (runId !== this.exitRunId) {
      return;
    }

    this.mounted = false;
    this.transitionStatus = undefined;
    this.requestComponentUpdate();
  }

  private requestComponentUpdate() {
    this.setValue(this.renderCurrent());
  }

  private clearScheduledFrame() {
    if (this.frameId != null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
  }

  private handleIndicatorRef = (element: HTMLSpanElement | null) => {
    this.indicator = element;
  };

  private handleStateChange = () => {
    this.requestComponentUpdate();
  };
}

const radioRootDirective = directive(RadioRootDirective);
const radioIndicatorDirective = directive(RadioIndicatorDirective);

/**
 * Represents the radio button itself.
 * Renders a `<span>` element and a hidden `<input>` beside.
 *
 * Documentation: [Base UI Radio](https://base-ui.com/react/components/radio)
 */
function RadioRoot<Value = any>(componentProps: RadioRootProps<Value>): TemplateResult {
  return html`${radioRootDirective(componentProps)}`;
}

/**
 * Indicates whether the radio button is selected.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Radio](https://base-ui.com/react/components/radio)
 */
function RadioIndicator(componentProps: RadioIndicatorProps): TemplateResult {
  return html`${radioIndicatorDirective(componentProps)}`;
}

function getRadioRoot(part: Parameters<AsyncDirective['update']>[0]) {
  const parentNode = (part as { parentNode?: Node | null | undefined }).parentNode ?? null;
  const parentElement = getParentElement(parentNode);
  const root = parentElement?.closest(`[${RADIO_ROOT_ATTRIBUTE}]`);

  if (root == null) {
    throw new Error(RADIO_CONTEXT_ERROR);
  }

  return root;
}

function getRadioState(root: Element): RadioRootState {
  const rootState = getRadioRootState(root);

  if (rootState != null) {
    return rootState;
  }

  let valid: boolean | null = null;

  if (root.hasAttribute('data-valid')) {
    valid = true;
  } else if (root.hasAttribute('data-invalid')) {
    valid = false;
  }

  return {
    checked: root.getAttribute('aria-checked') === 'true' || root.hasAttribute('data-checked'),
    disabled: root.getAttribute('aria-disabled') === 'true' || root.hasAttribute('data-disabled'),
    dirty: root.hasAttribute('data-dirty'),
    filled: root.hasAttribute('data-filled'),
    focused: root.hasAttribute('data-focused'),
    readOnly: root.getAttribute('aria-readonly') === 'true' || root.hasAttribute('data-readonly'),
    required: root.getAttribute('aria-required') === 'true' || root.hasAttribute('data-required'),
    touched: root.hasAttribute('data-touched'),
    valid,
  };
}

function getRadioStateAttributesMapping(): useRender.Parameters<
  RadioRootState,
  HTMLElement,
  undefined
>['stateAttributesMapping'] {
  return {
    checked(value) {
      return value ? createDataAttribute('data-checked') : createDataAttribute('data-unchecked');
    },
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
      if (value == null) {
        return null;
      }

      return value ? createDataAttribute('data-valid') : createDataAttribute('data-invalid');
    },
    touched(value) {
      return value ? createDataAttribute('data-touched') : null;
    },
    dirty(value) {
      return value ? createDataAttribute('data-dirty') : null;
    },
    filled(value) {
      return value ? createDataAttribute('data-filled') : null;
    },
    focused(value) {
      return value ? createDataAttribute('data-focused') : null;
    },
  };
}

function getRadioIndicatorStateAttributesMapping(): useRender.Parameters<
  RadioIndicatorState,
  HTMLSpanElement,
  undefined
>['stateAttributesMapping'] {
  return {
    ...getRadioStateAttributesMapping(),
    transitionStatus(value) {
      if (value === 'starting') {
        return createDataAttribute(STARTING_STYLE_ATTRIBUTE);
      }

      if (value === 'ending') {
        return createDataAttribute(ENDING_STYLE_ATTRIBUTE);
      }

      return null;
    },
  };
}

function createDataAttribute(name: string) {
  return { [name]: '' };
}

function setRadioRootState(root: Element | null, state: RadioRootState | null) {
  if (root == null) {
    return;
  }

  const radioRoot = root as RadioRootElement;

  if (state == null) {
    delete radioRoot[RADIO_ROOT_STATE];
    return;
  }

  radioRoot[RADIO_ROOT_STATE] = state;
}

function getRadioRootState(root: Element) {
  return (root as RadioRootElement)[RADIO_ROOT_STATE] ?? null;
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

function getElementLabels(element: Element | null, fallbackId?: string) {
  if (element == null) {
    return [] as HTMLLabelElement[];
  }

  const control = element as Partial<HTMLInputElement & HTMLButtonElement> & Element;
  const labels =
    'labels' in control
      ? Array.from((control as HTMLInputElement | HTMLButtonElement).labels ?? [])
      : [];
  const id = ('id' in control ? control.id : '') || fallbackId || '';

  if (id.length === 0) {
    return labels;
  }

  const explicitLabels = Array.from(control.ownerDocument?.querySelectorAll('label') ?? []).filter(
    (label): label is HTMLLabelElement => label.htmlFor === id,
  );

  return Array.from(new Set(labels.concat(explicitLabels)));
}

function createGeneratedId(prefix: string) {
  generatedElementId += 1;
  return `${prefix}-${generatedElementId}`;
}

function getStringAttribute(value: unknown) {
  return typeof value === 'string' ? value : undefined;
}

function serializeValue(value: unknown): string {
  if (value == null) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
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

function isDetachedChildPartError(error: unknown) {
  return (
    error instanceof Error &&
    error.message.includes('ChildPart') &&
    error.message.includes('no `parentNode`')
  );
}

function areEqual(a: unknown, b: unknown) {
  return Object.is(a, b);
}

function getRadioTabIndex(disabled: boolean) {
  return disabled ? -1 : 0;
}

function getAdjacentRadioInput(root: HTMLElement | null) {
  const nextElementSibling = root?.nextElementSibling;

  if (nextElementSibling instanceof HTMLInputElement && nextElementSibling.type === 'radio') {
    return nextElementSibling;
  }

  return null;
}

type RadioRootElement = Element & {
  [RADIO_ROOT_STATE]?: RadioRootState | undefined;
};

export interface RadioRootState {
  checked: boolean;
  disabled: boolean;
  readOnly: boolean;
  required: boolean;
  valid: boolean | null;
  touched: boolean;
  dirty: boolean;
  filled: boolean;
  focused: boolean;
}

export interface RadioRootProps<Value = any> extends ComponentPropsWithChildren<
  'span',
  RadioRootState,
  unknown,
  RadioRootRenderProps
> {
  disabled?: boolean | undefined;
  inputRef?: Ref<HTMLInputElement> | undefined;
  nativeButton?: boolean | undefined;
  readOnly?: boolean | undefined;
  render?: RadioRootRenderProp | undefined;
  required?: boolean | undefined;
  value: Value;
}

export interface RadioIndicatorState extends RadioRootState {
  transitionStatus: TransitionStatus;
}

export interface RadioIndicatorProps extends ComponentPropsWithChildren<
  'span',
  RadioIndicatorState,
  unknown,
  HTMLProps<HTMLSpanElement>
> {
  keepMounted?: boolean | undefined;
  render?: RadioIndicatorRenderProp | undefined;
}

export namespace RadioRoot {
  export type Props<TValue = any> = RadioRootProps<TValue>;
  export type State = RadioRootState;
}

export namespace RadioIndicator {
  export type Props = RadioIndicatorProps;
  export type State = RadioIndicatorState;
}

export const Radio = {
  Root: RadioRoot,
  Indicator: RadioIndicator,
} as const;
