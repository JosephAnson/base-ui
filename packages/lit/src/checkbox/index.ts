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
  CHECKBOX_GROUP_STATE_CHANGE_EVENT,
  getCheckboxGroupRuntimeState,
  getClosestCheckboxGroupRoot,
  type CheckboxGroupRuntimeState,
  // eslint-disable-next-line import/extensions
} from '../checkbox-group/shared.ts';

const CHECKBOX_ROOT_ATTRIBUTE = 'data-base-ui-checkbox-root';
const CHECKBOX_STATE_CHANGE_EVENT = 'base-ui-checkbox-state-change';
const CHECKBOX_INDICATOR_ATTRIBUTE = 'data-base-ui-checkbox-indicator';
const CHECKBOX_CONTEXT_ERROR =
  'Base UI: CheckboxRootContext is missing. Checkbox parts must be placed within <Checkbox.Root>.';
const CHECKBOX_ROOT_STATE = Symbol('base-ui-checkbox-root-state');
const PARENT_CHECKBOX_ATTRIBUTE = 'data-parent';
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

type CheckboxClickEvent = KeyboardEvent | MouseEvent;
type CheckboxEventHandler<EventType extends Event> = (event: BaseUIEvent<EventType>) => void;
type TransitionStatus = 'starting' | 'ending' | undefined;

type ComponentPropsWithChildren<
  ElementType extends keyof HTMLElementTagNameMap,
  State,
  Children = unknown,
  RenderFunctionProps = HTMLProps,
> = Omit<useRender.ComponentProps<ElementType, State, RenderFunctionProps>, 'children'> & {
  children?: Children | undefined;
};

type CheckboxRootRenderProps = Omit<
  HTMLProps<HTMLElement>,
  'children' | 'onClick' | 'onKeyDown' | 'onKeyUp'
> & {
  children?: unknown;
  onClick?: CheckboxEventHandler<CheckboxClickEvent> | undefined;
  onKeyDown?: CheckboxEventHandler<KeyboardEvent> | undefined;
  onKeyUp?: CheckboxEventHandler<KeyboardEvent> | undefined;
};

type CheckboxRootRenderProp =
  | TemplateResult
  | ComponentRenderFn<CheckboxRootRenderProps, CheckboxRootState>;
type CheckboxIndicatorRenderProp =
  | TemplateResult
  | ComponentRenderFn<HTMLProps<HTMLSpanElement>, CheckboxIndicatorState>;

class CheckboxRootDirective extends AsyncDirective {
  private latestProps: CheckboxRootProps | null = null;
  private root: HTMLElement | null = null;
  private input: HTMLInputElement | null = null;
  private groupRoot: Element | null = null;
  private defaultChecked = false;
  private initialChecked = false;
  private initialized = false;
  private syncQueued = false;
  private focused = false;
  private touched = false;
  private pendingChangeEventSource: Event | null = null;
  private pendingChangeTrigger: Element | null = null;
  private lastPublishedStateKey: string | null = null;
  private registeredGroupRoot: Element | null = null;
  private registeredGroupValue: string | null = null;

  render(_componentProps: CheckboxRootProps) {
    return noChange;
  }

  override update(
    part: Parameters<AsyncDirective['update']>[0],
    [componentProps]: [CheckboxRootProps],
  ) {
    this.latestProps = componentProps;

    if (!this.initialized) {
      this.initialized = true;
      this.defaultChecked = Boolean(componentProps.defaultChecked);
      this.initialChecked = componentProps.checked ?? Boolean(componentProps.defaultChecked);
    }

    this.syncGroupRoot(
      getClosestCheckboxGroupRoot(
        (part as { parentNode?: Node | null | undefined }).parentNode ?? null,
      ),
    );
    this.scheduleDomSync();

    return this.renderCurrent();
  }

  override disconnected() {
    this.cleanupGroupedDisabledState();
    this.syncGroupRoot(null);
    setCheckboxRootState(this.root, null);
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
      checked: checkedPropIgnored,
      defaultChecked: defaultCheckedProp,
      disabled: disabledPropIgnored,
      id: idPropIgnored,
      indeterminate: indeterminatePropIgnored,
      inputRef,
      name,
      nativeButton = false,
      onCheckedChange: onCheckedChangeProp,
      parent = false,
      readOnly = false,
      render,
      required = false,
      uncheckedValue,
      value,
      children,
      ...elementProps
    } = this.latestProps;
    void checkedPropIgnored;
    void defaultCheckedProp;
    void disabledPropIgnored;
    void idPropIgnored;
    void indeterminatePropIgnored;
    void onCheckedChangeProp;

    const resolved = this.getResolvedProps();

    if (resolved == null) {
      return nothing;
    }

    const {
      checked,
      disabled,
      groupIndeterminate,
      grouped,
      groupedWithParent,
      hiddenInputId,
      indeterminate,
      rootExtraProps,
      rootId,
    } = resolved;
    const ariaLabelledByProp = this.latestProps['aria-labelledby'];
    const ariaChecked = groupedWithParent ? groupIndeterminate : indeterminate;
    const state = this.getState();
    const tabIndex = nativeButton ? undefined : getCheckboxTabIndex(disabled);
    setCheckboxRootState(this.root, state);

    const rootProps = mergeProps<HTMLElement>(
      {
        [CHECKBOX_ROOT_ATTRIBUTE]: '',
        [PARENT_CHECKBOX_ATTRIBUTE]: parent ? '' : undefined,
        id: rootId,
        role: 'checkbox',
        tabIndex,
        'aria-checked': getAriaCheckedValue(ariaChecked, checked),
        'aria-disabled': disabled ? 'true' : undefined,
        'aria-readonly': readOnly ? 'true' : undefined,
        'aria-required': required ? 'true' : undefined,
        'aria-labelledby': ariaLabelledByProp,
        onClick: (event: BaseUIEvent<MouseEvent>) => {
          if (event.baseUIHandlerPrevented || readOnly || disabled) {
            return;
          }

          event.preventDefault();
          this.dispatchInputClick(event, event.currentTarget);
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

          if (isEnterKey && !readOnly) {
            this.dispatchInputClick(event, currentTarget);
          }
        },
        onKeyUp: (event: BaseUIEvent<KeyboardEvent>) => {
          if (event.baseUIHandlerPrevented || nativeButton || disabled || readOnly) {
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

          event.preventDefault();
          this.dispatchInputClick(event, currentTarget);
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
      rootExtraProps as Parameters<typeof mergeProps<HTMLElement>>[0],
    );

    const inputProps = mergeProps<HTMLInputElement>(
      {
        checked,
        disabled,
        id: hiddenInputId,
        name: parent ? undefined : name,
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

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const rootElement = useRender<CheckboxRootState, HTMLElement>({
      defaultTagName: 'span',
      render,
      ref: this.handleRootRef,
      state,
      stateAttributesMapping: getCheckboxStateAttributesMapping(state),
      props: rootProps,
    });
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const inputElement = useRender<Record<string, never>, HTMLInputElement>({
      defaultTagName: 'input',
      ref: [this.handleInputRef, inputRef],
      props: inputProps,
    });

    return html`${rootElement}
    ${!checked && !grouped && name && !parent && uncheckedValue !== undefined
      ? html`<input type="hidden" name=${name} value=${uncheckedValue} />`
      : nothing}
    ${inputElement}`;
  }

  private getChecked() {
    return this.getResolvedProps()?.checked ?? this.defaultChecked;
  }

  private getState(): CheckboxRootState {
    const resolved = this.getResolvedProps();
    const checked = resolved?.checked ?? this.defaultChecked;
    const disabled = resolved?.disabled ?? Boolean(this.latestProps?.disabled);
    const indeterminate = resolved?.indeterminate ?? Boolean(this.latestProps?.indeterminate);
    const readOnly = Boolean(this.latestProps?.readOnly);
    const required = Boolean(this.latestProps?.required);

    return {
      checked,
      disabled,
      readOnly,
      required,
      indeterminate,
      dirty: checked !== this.initialChecked,
      touched: this.touched,
      valid: null,
      filled: checked,
      focused: this.focused,
    };
  }

  private handleRootRef = (element: HTMLElement | null) => {
    setCheckboxRootState(this.root, null);
    this.root = element;
    this.syncGroupRoot(this.root?.closest('[data-base-ui-checkbox-group]') ?? null);
    setCheckboxRootState(this.root, this.getState());
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

    const resolved = this.getResolvedProps();

    if (resolved == null) {
      return;
    }

    if (this.latestProps.readOnly || resolved.disabled) {
      this.pendingChangeEventSource = null;
      this.pendingChangeTrigger = null;
      currentTarget.checked = this.getChecked();
      this.requestComponentUpdate();
      return;
    }

    const nextChecked = currentTarget.checked;
    const eventDetails = createChangeEventDetails(
      this.pendingChangeEventSource ?? event,
      this.pendingChangeTrigger ?? this.root ?? currentTarget,
    );
    this.pendingChangeEventSource = null;
    this.pendingChangeTrigger = null;

    if (resolved.groupState != null) {
      if (this.latestProps.parent && resolved.groupedWithParent) {
        resolved.groupState.toggleParent(eventDetails);
      } else if (!this.latestProps.parent && resolved.checkboxValue != null) {
        resolved.groupState.toggleChild(resolved.checkboxValue, nextChecked, eventDetails);
      }
    }

    this.latestProps.onCheckedChange?.(nextChecked, eventDetails);

    if (eventDetails.isCanceled) {
      this.requestComponentUpdate();
      return;
    }

    if (resolved.groupState == null && this.latestProps.checked === undefined) {
      this.defaultChecked = nextChecked;
    }

    this.requestComponentUpdate();
  };

  private dispatchInputClick(event: MouseEvent | KeyboardEvent, rootTarget: EventTarget | null) {
    const root = rootTarget instanceof HTMLElement ? rootTarget : this.root;
    const input =
      this.input ??
      (root?.parentElement?.querySelector('input[type="checkbox"]') as HTMLInputElement | null);

    if (input == null) {
      return;
    }

    this.input = input;
    this.pendingChangeEventSource = event;
    this.pendingChangeTrigger = root;
    input.checked = !input.checked;
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
      const resolved = this.getResolvedProps();

      if (
        root == null ||
        resolved?.disabled ||
        root === root.ownerDocument?.activeElement ||
        !root.isConnected
      ) {
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
        this.syncInputIndeterminate();
        this.syncGroupedDisabledState();
        this.syncAriaLabelledBy();
        this.publishStateChange();
      });
    });
  }

  private syncInputIndeterminate() {
    if (this.input == null) {
      return;
    }

    const resolved = this.getResolvedProps();

    if (resolved == null) {
      return;
    }

    this.input.indeterminate = resolved.groupedWithParent
      ? resolved.groupIndeterminate
      : resolved.indeterminate;
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
      .map((label) => ensureElementId(label, 'base-ui-checkbox-label'))
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
    setCheckboxRootState(this.root, state);
    const nextStateKey = JSON.stringify(state);

    if (nextStateKey === this.lastPublishedStateKey) {
      return;
    }

    this.lastPublishedStateKey = nextStateKey;
    this.root.dispatchEvent(new CustomEvent(CHECKBOX_STATE_CHANGE_EVENT));
  }

  private getResolvedProps(): ResolvedCheckboxRootProps | null {
    if (this.latestProps == null) {
      return null;
    }

    const {
      checked: checkedProp,
      disabled: disabledProp = false,
      id: idProp,
      indeterminate: indeterminateProp = false,
      name,
      nativeButton = false,
      parent = false,
      value: valueProp,
    } = this.latestProps;

    const groupState = this.getGroupState();
    const checkboxValue = valueProp ?? name;
    const grouped = groupState != null;
    const groupedWithParent = groupState != null && groupState.allValues.length > 0;
    let groupChecked: boolean | undefined;

    if (parent && groupedWithParent) {
      groupChecked = getParentChecked(groupState);
    } else if (checkboxValue != null) {
      groupChecked = groupState?.value.includes(checkboxValue);
    }
    const groupIndeterminate =
      parent && groupedWithParent ? getParentIndeterminate(groupState) : false;
    const checked = groupChecked ?? checkedProp ?? this.defaultChecked;
    const disabled = Boolean(groupState?.disabled) || disabledProp;
    const indeterminate = groupIndeterminate || indeterminateProp;
    let hiddenInputId = nativeButton ? undefined : idProp;
    let rootId = nativeButton ? idProp : undefined;
    let rootExtraProps: HTMLProps<HTMLElement> | undefined;

    if (groupedWithParent && groupState != null) {
      if (parent) {
        rootExtraProps = {
          id: groupState.id,
          'aria-controls': groupState.allValues
            .map((value) => `${groupState.id}-${value}`)
            .join(' '),
        };
        hiddenInputId = undefined;
        rootId = nativeButton ? groupState.id : undefined;
      } else if (checkboxValue != null) {
        const groupedId = `${groupState.id}-${checkboxValue}`;
        hiddenInputId = nativeButton ? undefined : groupedId;
        rootId = nativeButton ? groupedId : undefined;
      }
    }

    return {
      checked,
      checkboxValue,
      disabled,
      groupIndeterminate,
      groupState,
      grouped,
      groupedWithParent,
      hiddenInputId,
      indeterminate,
      rootExtraProps,
      rootId,
    };
  }

  private getGroupState() {
    return getCheckboxGroupRuntimeState(this.groupRoot);
  }

  private syncGroupRoot(root: Element | null) {
    if (this.groupRoot === root) {
      return;
    }

    this.groupRoot?.removeEventListener(
      CHECKBOX_GROUP_STATE_CHANGE_EVENT,
      this.handleGroupStateChange,
    );
    this.groupRoot = root;
    this.groupRoot?.addEventListener(
      CHECKBOX_GROUP_STATE_CHANGE_EVENT,
      this.handleGroupStateChange,
    );
  }

  private syncGroupedDisabledState() {
    const resolved = this.getResolvedProps();

    if (
      resolved?.groupState == null ||
      !resolved.groupedWithParent ||
      this.latestProps?.parent ||
      resolved.checkboxValue == null
    ) {
      this.cleanupGroupedDisabledState();
      return;
    }

    if (
      this.registeredGroupRoot !== this.groupRoot ||
      this.registeredGroupValue !== resolved.checkboxValue
    ) {
      this.cleanupGroupedDisabledState();
    }

    resolved.groupState.disabledStates.set(resolved.checkboxValue, resolved.disabled);
    this.registeredGroupRoot = this.groupRoot;
    this.registeredGroupValue = resolved.checkboxValue;
  }

  private cleanupGroupedDisabledState() {
    if (this.registeredGroupRoot == null || this.registeredGroupValue == null) {
      return;
    }

    getCheckboxGroupRuntimeState(this.registeredGroupRoot)?.disabledStates.delete(
      this.registeredGroupValue,
    );
    this.registeredGroupRoot = null;
    this.registeredGroupValue = null;
  }

  private handleGroupStateChange = () => {
    if (!this.isConnected) {
      return;
    }

    this.requestComponentUpdate();
  };
}

class CheckboxIndicatorDirective extends AsyncDirective {
  private latestProps: CheckboxIndicatorProps | null = null;
  private root: Element | null = null;
  private indicator: HTMLSpanElement | null = null;
  private mounted = false;
  private transitionStatus: TransitionStatus = undefined;
  private frameId: number | null = null;
  private exitRunId = 0;

  render(_componentProps: CheckboxIndicatorProps) {
    return noChange;
  }

  override update(
    part: Parameters<AsyncDirective['update']>[0],
    [componentProps]: [CheckboxIndicatorProps],
  ) {
    this.latestProps = componentProps;
    this.syncRoot(getCheckboxRoot(part));

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
    const rootState = getCheckboxState(this.root);
    const rendered = rootState.checked || rootState.indeterminate;

    this.syncPresence(rendered);

    if (!keepMounted && !this.mounted) {
      return nothing;
    }

    const state: CheckboxIndicatorState = {
      ...rootState,
      transitionStatus: this.transitionStatus,
    };

    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useRender<CheckboxIndicatorState, HTMLSpanElement>({
      defaultTagName: 'span',
      render,
      ref: this.handleIndicatorRef,
      state,
      stateAttributesMapping: getCheckboxIndicatorStateAttributesMapping(state),
      props: {
        [CHECKBOX_INDICATOR_ATTRIBUTE]: '',
        ...elementProps,
      },
    });
  }

  private syncRoot(root: Element | null) {
    if (this.root === root) {
      return;
    }

    this.root?.removeEventListener(CHECKBOX_STATE_CHANGE_EVENT, this.handleStateChange);
    this.root = root;
    this.root?.addEventListener(CHECKBOX_STATE_CHANGE_EVENT, this.handleStateChange);
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
        (!getCheckboxState(this.root).checked && !getCheckboxState(this.root).indeterminate)
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

const checkboxRootDirective = directive(CheckboxRootDirective);
const checkboxIndicatorDirective = directive(CheckboxIndicatorDirective);

/**
 * Represents the checkbox itself.
 * Renders a `<span>` element and a hidden `<input>` beside.
 *
 * Documentation: [Base UI Checkbox](https://base-ui.com/react/components/checkbox)
 */
function CheckboxRoot(componentProps: CheckboxRootProps): TemplateResult {
  return html`${checkboxRootDirective(componentProps)}`;
}

/**
 * Indicates whether the checkbox is ticked.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Checkbox](https://base-ui.com/react/components/checkbox)
 */
function CheckboxIndicator(componentProps: CheckboxIndicatorProps): TemplateResult {
  return html`${checkboxIndicatorDirective(componentProps)}`;
}

function getCheckboxRoot(part: Parameters<AsyncDirective['update']>[0]) {
  const parentNode = (part as { parentNode?: Node | null | undefined }).parentNode ?? null;
  const parentElement = getParentElement(parentNode);
  const root = parentElement?.closest(`[${CHECKBOX_ROOT_ATTRIBUTE}]`);

  if (root == null) {
    throw new Error(CHECKBOX_CONTEXT_ERROR);
  }

  return root;
}

function getCheckboxState(root: Element): CheckboxRootState {
  const rootState = getCheckboxRootState(root);

  if (rootState != null) {
    return rootState;
  }

  const ariaChecked = root.getAttribute('aria-checked');
  let valid: boolean | null = null;

  if (root.hasAttribute('data-valid')) {
    valid = true;
  } else if (root.hasAttribute('data-invalid')) {
    valid = false;
  }

  return {
    checked: ariaChecked === 'true' || root.hasAttribute('data-checked'),
    disabled: root.getAttribute('aria-disabled') === 'true' || root.hasAttribute('data-disabled'),
    readOnly: root.getAttribute('aria-readonly') === 'true' || root.hasAttribute('data-readonly'),
    required: root.getAttribute('aria-required') === 'true' || root.hasAttribute('data-required'),
    indeterminate: ariaChecked === 'mixed' || root.hasAttribute('data-indeterminate'),
    dirty: root.hasAttribute('data-dirty'),
    touched: root.hasAttribute('data-touched'),
    valid,
    filled: root.hasAttribute('data-filled'),
    focused: root.hasAttribute('data-focused'),
  };
}

function getCheckboxStateAttributesMapping(state: Pick<CheckboxRootState, 'indeterminate'>) {
  const mapping: useRender.Parameters<
    CheckboxRootState,
    HTMLElement,
    undefined
  >['stateAttributesMapping'] = {
    checked(value) {
      if (state.indeterminate) {
        return null;
      }

      return value ? createDataAttribute('data-checked') : createDataAttribute('data-unchecked');
    },
    indeterminate(value) {
      return value ? createDataAttribute('data-indeterminate') : null;
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

  return mapping;
}

function getCheckboxIndicatorStateAttributesMapping(
  state: CheckboxIndicatorState,
): useRender.Parameters<
  CheckboxIndicatorState,
  HTMLSpanElement,
  undefined
>['stateAttributesMapping'] {
  return {
    ...getCheckboxStateAttributesMapping(state),
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

function createDataAttribute(name: string): Record<string, string> {
  return { [name]: '' };
}

function setCheckboxRootState(root: Element | null, state: CheckboxRootState | null) {
  if (root == null) {
    return;
  }

  const checkboxRoot = root as CheckboxRootElement;

  if (state == null) {
    delete checkboxRoot[CHECKBOX_ROOT_STATE];
    return;
  }

  checkboxRoot[CHECKBOX_ROOT_STATE] = state;
}

function getCheckboxRootState(root: Element) {
  return (root as CheckboxRootElement)[CHECKBOX_ROOT_STATE] ?? null;
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

function isDetachedChildPartError(error: unknown) {
  return (
    error instanceof Error &&
    error.message.includes('ChildPart') &&
    error.message.includes('no `parentNode`')
  );
}

function getParentChecked(groupState: CheckboxGroupRuntimeState | null) {
  if (groupState == null) {
    return false;
  }

  return groupState.value.length === groupState.allValues.length;
}

function getParentIndeterminate(groupState: CheckboxGroupRuntimeState | null) {
  if (groupState == null) {
    return false;
  }

  return groupState.value.length !== groupState.allValues.length && groupState.value.length > 0;
}

function getAriaCheckedValue(indeterminate: boolean, checked: boolean) {
  if (indeterminate) {
    return 'mixed';
  }

  return checked ? 'true' : 'false';
}

function getCheckboxTabIndex(disabled: boolean) {
  return disabled ? -1 : 0;
}

type CheckboxRootElement = Element & {
  [CHECKBOX_ROOT_STATE]?: CheckboxRootState | undefined;
};

interface ResolvedCheckboxRootProps {
  checked: boolean;
  checkboxValue: string | undefined;
  disabled: boolean;
  groupIndeterminate: boolean;
  groupState: CheckboxGroupRuntimeState | null;
  grouped: boolean;
  groupedWithParent: boolean;
  hiddenInputId: string | undefined;
  indeterminate: boolean;
  rootExtraProps: HTMLProps<HTMLElement> | undefined;
  rootId: string | undefined;
}

export interface CheckboxRootState {
  /**
   * Whether the checkbox is currently ticked.
   */
  checked: boolean;
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
  /**
   * Whether the user should be unable to tick or untick the checkbox.
   */
  readOnly: boolean;
  /**
   * Whether the user must tick the checkbox before submitting a form.
   */
  required: boolean;
  /**
   * Whether the checkbox is in a mixed state: neither ticked, nor unticked.
   */
  indeterminate: boolean;
  /**
   * Whether the checkbox value has changed from its initial value.
   */
  dirty: boolean;
  /**
   * Whether the checkbox has been blurred at least once.
   */
  touched: boolean;
  /**
   * Whether the checkbox has a validation state.
   */
  valid: boolean | null;
  /**
   * Whether the checkbox is filled.
   */
  filled: boolean;
  /**
   * Whether the checkbox is currently focused.
   */
  focused: boolean;
}

export interface CheckboxIndicatorState extends CheckboxRootState {
  /**
   * The transition status of the component.
   */
  transitionStatus: TransitionStatus;
}

export interface CheckboxRootProps extends Omit<
  ComponentPropsWithChildren<'span', CheckboxRootState, unknown, CheckboxRootRenderProps>,
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
  checked?: boolean | undefined;
  defaultChecked?: boolean | undefined;
  disabled?: boolean | undefined;
  /**
   * The id of the input element.
   */
  id?: string | undefined;
  /**
   * Whether the checkbox is in a mixed state: neither ticked, nor unticked.
   * @default false
   */
  indeterminate?: boolean | undefined;
  /**
   * A ref to access the hidden `<input>` element.
   */
  inputRef?: HTMLProps<HTMLInputElement>['ref'] | undefined;
  /**
   * Identifies the field when a form is submitted.
   * @default undefined
   */
  name?: string | undefined;
  /**
   * Whether the component renders a native `<button>` element when replacing it
   * via the `render` prop.
   * @default false
   */
  nativeButton?: boolean | undefined;
  /**
   * Event handler called when the checkbox is ticked or unticked.
   */
  onCheckedChange?:
    | ((checked: boolean, eventDetails: CheckboxRoot.ChangeEventDetails) => void)
    | undefined;
  /**
   * Whether the checkbox controls a group of child checkboxes.
   * @default false
   */
  parent?: boolean | undefined;
  /**
   * Whether the user should be unable to tick or untick the checkbox.
   * @default false
   */
  readOnly?: boolean | undefined;
  /**
   * Whether the user must tick the checkbox before submitting a form.
   * @default false
   */
  required?: boolean | undefined;
  /**
   * Allows you to replace the component's HTML element
   * with a different tag, or compose it with a template that has a single root element.
   */
  render?: CheckboxRootRenderProp | undefined;
  /**
   * The value submitted with the form when the checkbox is unchecked.
   * By default, unchecked checkboxes do not submit any value, matching native checkbox behavior.
   */
  uncheckedValue?: string | undefined;
  /**
   * The value of the selected checkbox.
   */
  value?: string | undefined;
}

export interface CheckboxIndicatorProps extends ComponentPropsWithChildren<
  'span',
  CheckboxIndicatorState,
  unknown,
  HTMLProps<HTMLSpanElement>
> {
  /**
   * Whether to keep the element in the DOM when the checkbox is not checked.
   * @default false
   */
  keepMounted?: boolean | undefined;
  render?: CheckboxIndicatorRenderProp | undefined;
}

export type CheckboxRootChangeEventReason = 'none';
export type CheckboxRootChangeEventDetails =
  BaseUIChangeEventDetails<CheckboxRoot.ChangeEventReason>;

export namespace CheckboxRoot {
  export type Props = CheckboxRootProps;
  export type State = CheckboxRootState;
  export type ChangeEventReason = CheckboxRootChangeEventReason;
  export type ChangeEventDetails = CheckboxRootChangeEventDetails;
}

export namespace CheckboxIndicator {
  export type Props = CheckboxIndicatorProps;
  export type State = CheckboxIndicatorState;
}

export const Checkbox = {
  Root: CheckboxRoot,
  Indicator: CheckboxIndicator,
} as const;
