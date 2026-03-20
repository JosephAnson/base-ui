import { html, noChange, nothing, type TemplateResult } from 'lit';
// eslint-disable-next-line import/extensions
import { AsyncDirective, directive } from 'lit/async-directive.js';
// eslint-disable-next-line import/extensions
import { ref } from 'lit/directives/ref.js';
// eslint-disable-next-line import/extensions
import { makeEventPreventable, mergeProps } from '../merge-props/index.ts';
import type {
  BaseUIChangeEventDetails,
  BaseUIEvent,
  ComponentRenderFn,
  HTMLProps,
  // eslint-disable-next-line import/extensions
} from '../types/index.ts';
// eslint-disable-next-line import/extensions
import { useRender, type StateAttributesMapping } from '../use-render/index.ts';

const ACCORDION_ROOT_ATTRIBUTE = 'data-base-ui-accordion-root';
const ACCORDION_ITEM_ATTRIBUTE = 'data-base-ui-accordion-item';
const ACCORDION_TRIGGER_ATTRIBUTE = 'data-base-ui-accordion-trigger';
const ACCORDION_PANEL_ATTRIBUTE = 'data-base-ui-accordion-panel';
const ACCORDION_ITEM_STATE_CHANGE_EVENT = 'base-ui-accordion-item-state-change';
const ACCORDION_PANEL_HEIGHT_VAR = '--accordion-panel-height';
const ACCORDION_PANEL_WIDTH_VAR = '--accordion-panel-width';
const STARTING_STYLE_ATTRIBUTE = 'data-starting-style';
const ENDING_STYLE_ATTRIBUTE = 'data-ending-style';
const OPEN_STATE_ATTRIBUTES = { 'data-open': '' };
const CLOSED_STATE_ATTRIBUTES = { 'data-closed': '' };
const PANEL_OPEN_STATE_ATTRIBUTES = { 'data-panel-open': '' };
const STARTING_STYLE_STATE_ATTRIBUTES = { [STARTING_STYLE_ATTRIBUTE]: '' };
const ENDING_STYLE_STATE_ATTRIBUTES = { [ENDING_STYLE_ATTRIBUTE]: '' };
const ACCORDION_ROOT_CONTEXT_ERROR =
  'Base UI: AccordionRootContext is missing. Accordion parts must be placed within <Accordion.Root>.';
const ACCORDION_ITEM_CONTEXT_ERROR =
  'Base UI: AccordionItemContext is missing. Accordion parts must be placed within <Accordion.Item>.';

const ACCORDION_ROOT_RUNTIME = Symbol('base-ui-accordion-root-runtime');
const ACCORDION_ITEM_RUNTIME = Symbol('base-ui-accordion-item-runtime');
const APPLIED_ELEMENT_PROPS = Symbol('base-ui-applied-element-props');
const ACCORDION_ROOT_CONTEXT_PROPERTY = '__baseUiAccordionRootContext';
const ACCORDION_ITEM_CONTEXT_PROPERTY = '__baseUiAccordionItemContext';
const SUPPORTED_TRIGGER_KEYS = new Set([
  'ArrowDown',
  'ArrowUp',
  'ArrowRight',
  'ArrowLeft',
  'Home',
  'End',
]);

let generatedAccordionItemId = 0;
let generatedTriggerId = 0;
let generatedPanelId = 0;

type Orientation = 'horizontal' | 'vertical';
type TransitionStatus = 'starting' | 'ending' | undefined;
type TriggerKeyEvent = KeyboardEvent | MouseEvent;
type AccordionTriggerEventHandler<EventType extends Event> = (
  event: BaseUIEvent<EventType>,
) => void;

type ComponentPropsWithChildren<
  ElementType extends keyof HTMLElementTagNameMap,
  State,
  Children = unknown,
  RenderFunctionProps = HTMLProps,
> = Omit<useRender.ComponentProps<ElementType, State, RenderFunctionProps>, 'children'> & {
  children?: Children | undefined;
};

type AccordionRootRenderProps = HTMLProps<HTMLDivElement> & {
  children?: unknown;
};

type AccordionItemRenderProps = HTMLProps<HTMLDivElement> & {
  children?: unknown;
};

type AccordionHeaderRenderProps = HTMLProps<HTMLHeadingElement> & {
  children?: unknown;
};

type AccordionPanelRenderProps = HTMLProps<HTMLDivElement> & {
  children?: unknown;
};

type AccordionTriggerRenderProps = Omit<
  HTMLProps<HTMLElement>,
  'children' | 'onClick' | 'onKeyDown' | 'onKeyUp'
> & {
  children?: unknown;
  onClick?: AccordionTriggerEventHandler<TriggerKeyEvent> | undefined;
  onKeyDown?: AccordionTriggerEventHandler<KeyboardEvent> | undefined;
  onKeyUp?: AccordionTriggerEventHandler<KeyboardEvent> | undefined;
};

type AccordionRootRenderProp =
  | TemplateResult
  | ComponentRenderFn<AccordionRootRenderProps, AccordionRootState>;
type AccordionItemRenderProp =
  | TemplateResult
  | ComponentRenderFn<AccordionItemRenderProps, AccordionItemState>;
type AccordionHeaderRenderProp =
  | TemplateResult
  | ComponentRenderFn<AccordionHeaderRenderProps, AccordionHeaderState>;
type AccordionTriggerRenderProp =
  | TemplateResult
  | ComponentRenderFn<AccordionTriggerRenderProps, AccordionTriggerState>;
type AccordionPanelRenderProp =
  | TemplateResult
  | ComponentRenderFn<AccordionPanelRenderProps, AccordionPanelState>;

type AccordionRootElement<Value> = HTMLElement & {
  [ACCORDION_ROOT_RUNTIME]?: AccordionRootRuntime<Value> | undefined;
  [ACCORDION_ROOT_CONTEXT_PROPERTY]?: AccordionRootContext<Value> | undefined;
};

type AccordionItemElement<Value> = HTMLElement & {
  [ACCORDION_ITEM_RUNTIME]?: AccordionItemRuntime<Value> | undefined;
  [ACCORDION_ITEM_CONTEXT_PROPERTY]?: AccordionItemContextSnapshot<Value> | undefined;
};

interface AccordionRootContext<Value = any> {
  disabled: boolean;
  hiddenUntilFound: boolean;
  keepMounted: boolean;
  loopFocus: boolean;
  multiple: boolean;
  orientation: Orientation;
  value: AccordionValue<Value>;
}

interface AccordionRootRuntime<Value = any> {
  getContext(): AccordionRootContext<Value>;
  handleValueChange: (
    newValue: Value,
    nextOpen: boolean,
    event: Event,
    trigger: Element | undefined,
  ) => boolean;
  requestUpdate(): void;
  root: HTMLElement | null;
}

interface AccordionItemRuntime<Value = any> {
  getRootRuntime(): AccordionRootRuntime<Value>;
  getState(): AccordionItemState<Value>;
  getTriggerId(): string;
  setTriggerId(id: string | undefined): void;
  getPanelId(): string;
  setPanelId(id: string | undefined): void;
  toggle(open: boolean, event: Event, reason: AccordionItemChangeEventReason): void;
  requestUpdate(): void;
}

interface AccordionItemContextSnapshot<Value = any> {
  state: AccordionItemState<Value>;
  panelId: string;
  triggerId: string;
}

class AccordionRootDirective<Value> extends AsyncDirective implements AccordionRootRuntime<Value> {
  private latestProps: AccordionRootProps<Value> | null = null;
  private rootElement: HTMLDivElement | null = null;
  private initialized = false;
  private bootstrapped = false;
  private defaultValue: AccordionValue<Value> = [];

  render(_componentProps: AccordionRootProps<Value>) {
    return noChange;
  }

  override update(
    _part: Parameters<AsyncDirective['update']>[0],
    [componentProps]: [AccordionRootProps<Value>],
  ) {
    this.latestProps = componentProps;

    if (!this.initialized) {
      this.initialized = true;
      this.defaultValue =
        componentProps.value === undefined ? [...(componentProps.defaultValue ?? [])] : [];
    }

    if (!this.bootstrapped) {
      this.bootstrapped = true;
      queueMicrotask(() => {
        this.requestUpdate();
      });
    }

    return this.renderCurrent();
  }

  override disconnected() {
    setAccordionRootRuntime(this.rootElement, null);
    this.rootElement = null;
    this.bootstrapped = false;
  }

  override reconnected() {}

  get root() {
    return this.rootElement;
  }

  getContext(): AccordionRootContext<Value> {
    return {
      disabled: Boolean(this.latestProps?.disabled),
      hiddenUntilFound: Boolean(this.latestProps?.hiddenUntilFound),
      keepMounted: Boolean(this.latestProps?.keepMounted),
      loopFocus: this.latestProps?.loopFocus ?? true,
      multiple: Boolean(this.latestProps?.multiple),
      orientation: this.latestProps?.orientation ?? 'vertical',
      value: this.getValue(),
    };
  }

  handleValueChange(
    newValue: Value,
    nextOpen: boolean,
    event: Event,
    trigger: Element | undefined,
  ) {
    const context = this.getContext();
    const currentValue = context.value;
    let nextValue: AccordionValue<Value>;

    if (!context.multiple) {
      nextValue = currentValue[0] === newValue ? [] : [newValue];
    } else if (nextOpen) {
      nextValue = [...currentValue, newValue];
    } else {
      nextValue = currentValue.filter((value) => !areEqual(value, newValue));
    }

    const eventDetails = createChangeEventDetails<AccordionRoot.ChangeEventReason>(
      'none',
      event,
      trigger,
    );

    this.latestProps?.onValueChange?.(nextValue, eventDetails);

    if (eventDetails.isCanceled) {
      this.requestUpdate();
      return false;
    }

    if (this.latestProps?.value === undefined) {
      this.defaultValue = nextValue;
    }

    this.requestUpdate();
    return true;
  }

  requestUpdate() {
    this.setValue(this.renderCurrent());
  }

  private getValue() {
    return this.latestProps?.value !== undefined ? this.latestProps.value : this.defaultValue;
  }

  private renderCurrent() {
    if (this.latestProps == null) {
      return nothing;
    }

    const {
      children,
      className,
      defaultValue: defaultValueProp,
      disabled = false,
      hiddenUntilFound: hiddenUntilFoundProp,
      keepMounted: keepMountedProp,
      loopFocus = true,
      multiple = false,
      onValueChange,
      orientation = 'vertical',
      render,
      value: valueProp,
      ...elementProps
    } = this.latestProps;
    void className;
    void defaultValueProp;
    void hiddenUntilFoundProp;
    void keepMountedProp;
    void loopFocus;
    void multiple;
    void onValueChange;
    void valueProp;

    const state: AccordionRootState<Value> = {
      value: this.getValue(),
      disabled,
      orientation,
    };
    const rootProps = {
      ...getStateProps(state, accordionRootStateAttributesMapping<Value>()),
      [ACCORDION_ROOT_ATTRIBUTE]: '',
      [ACCORDION_ROOT_CONTEXT_PROPERTY]: this.getContext(),
      role: 'region',
      ...elementProps,
    };

    if (render == null) {
      return html`<div
        ${ref((element) => {
          this.handleRootRef(element as HTMLDivElement | null);
          applyElementProps(element as HTMLElement | null, rootProps);
        })}
      >
        ${children ?? nothing}
      </div>`;
    }
    const resolvedRender = render ?? html`<div data-base-ui-accordion-root=""></div>`;

    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useRender<AccordionRootState<Value>, HTMLDivElement>({
      defaultTagName: 'div',
      render: resolvedRender,
      ref: this.handleRootRef,
      state,
      stateAttributesMapping: accordionRootStateAttributesMapping<Value>(),
      props:
        children === undefined
          ? {
              [ACCORDION_ROOT_ATTRIBUTE]: '',
              [ACCORDION_ROOT_CONTEXT_PROPERTY]: this.getContext(),
              role: 'region',
              ...elementProps,
            }
          : {
              [ACCORDION_ROOT_ATTRIBUTE]: '',
              [ACCORDION_ROOT_CONTEXT_PROPERTY]: this.getContext(),
              role: 'region',
              ...elementProps,
              children,
            },
    });
  }

  private handleRootRef = (element: HTMLDivElement | null) => {
    if (this.rootElement === element) {
      return;
    }

    setAccordionRootRuntime(this.rootElement, null);
    this.rootElement = element;
    setAccordionRootRuntime(element, this);
  };
}

class AccordionItemDirective<Value> extends AsyncDirective implements AccordionItemRuntime<Value> {
  private latestProps: AccordionItemProps | null = null;
  private root: HTMLElement | null = null;
  private item: HTMLDivElement | null = null;
  private generatedValue = `base-ui-accordion-item-${(generatedAccordionItemId += 1)}`;
  private generatedTriggerId = `base-ui-accordion-trigger-${(generatedTriggerId += 1)}`;
  private generatedPanelId = `base-ui-accordion-panel-${(generatedPanelId += 1)}`;
  private triggerIdOverride: string | undefined = undefined;
  private panelIdOverride: string | undefined = undefined;

  render(_componentProps: AccordionItemProps) {
    return noChange;
  }

  override update(
    part: Parameters<AsyncDirective['update']>[0],
    [componentProps]: [AccordionItemProps],
  ) {
    this.latestProps = componentProps;
    this.syncRoot(getAccordionRoot(part));
    return this.renderCurrent();
  }

  override disconnected() {
    setAccordionItemRuntime(this.item, null);
    this.root = null;
    this.item = null;
  }

  override reconnected() {}

  getRootRuntime(): AccordionRootRuntime<Value> {
    if (this.root == null) {
      throw new Error(ACCORDION_ROOT_CONTEXT_ERROR);
    }

    return getAccordionRootRuntime<Value>(this.root);
  }

  getState(): AccordionItemState<Value> {
    const rootContext = getAccordionRootContextFromElement<Value>(this.root);
    const itemValue = this.getItemValue();
    const disabled = Boolean(this.latestProps?.disabled) || rootContext.disabled;
    const index = this.getIndex();

    return {
      value: rootContext.value,
      disabled,
      index,
      open: rootContext.value.some((value) => areEqual(value, itemValue)),
      orientation: rootContext.orientation,
    };
  }

  getTriggerId() {
    return this.triggerIdOverride ?? this.generatedTriggerId;
  }

  setTriggerId(id: string | undefined) {
    if (this.triggerIdOverride === id) {
      return;
    }

    this.triggerIdOverride = id;
    this.publishStateChange();
  }

  getPanelId() {
    return this.panelIdOverride ?? this.generatedPanelId;
  }

  setPanelId(id: string | undefined) {
    if (this.panelIdOverride === id) {
      return;
    }

    this.panelIdOverride = id;
    this.publishStateChange();
  }

  toggle(open: boolean, event: Event, reason: AccordionItemChangeEventReason) {
    const eventDetails = createChangeEventDetails<AccordionItem.ChangeEventReason>(
      reason,
      event,
      this.getTriggerElement() ?? undefined,
    );

    this.latestProps?.onOpenChange?.(open, eventDetails);

    if (eventDetails.isCanceled) {
      this.requestUpdate();
      return;
    }

    this.getRootRuntime().handleValueChange(this.getItemValue(), open, event, eventDetails.trigger);
  }

  requestUpdate() {
    this.setValue(this.renderCurrent());
  }

  private renderCurrent() {
    if (this.latestProps == null || this.root == null) {
      return nothing;
    }

    const { children, className, disabled, onOpenChange, render, value, ...elementProps } =
      this.latestProps;
    void className;
    void disabled;
    void onOpenChange;
    void value;
    const state = this.getState();
    const itemProps = {
      ...getStateProps(state, accordionItemStateAttributesMapping<AccordionItemState<Value>>()),
      [ACCORDION_ITEM_ATTRIBUTE]: '',
      [ACCORDION_ITEM_CONTEXT_PROPERTY]: {
        state,
        panelId: this.getPanelId(),
        triggerId: this.getTriggerId(),
      },
      ...elementProps,
    };

    if (render == null) {
      return html`<div
        ${ref((element) => {
          this.handleItemRef(element as HTMLDivElement | null);
          applyElementProps(element as HTMLElement | null, itemProps);
        })}
      >
        ${children ?? nothing}
      </div>`;
    }
    const resolvedRender = render ?? html`<div data-base-ui-accordion-item=""></div>`;

    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useRender<AccordionItemState<Value>, HTMLDivElement>({
      defaultTagName: 'div',
      render: resolvedRender,
      ref: this.handleItemRef,
      state,
      stateAttributesMapping: accordionItemStateAttributesMapping<AccordionItemState<Value>>(),
      props:
        children === undefined
          ? {
              [ACCORDION_ITEM_ATTRIBUTE]: '',
              [ACCORDION_ITEM_CONTEXT_PROPERTY]: {
                state,
                panelId: this.getPanelId(),
                triggerId: this.getTriggerId(),
              },
              ...elementProps,
            }
          : {
              [ACCORDION_ITEM_ATTRIBUTE]: '',
              [ACCORDION_ITEM_CONTEXT_PROPERTY]: {
                state,
                panelId: this.getPanelId(),
                triggerId: this.getTriggerId(),
              },
              ...elementProps,
              children,
            },
    });
  }

  private syncRoot(root: HTMLElement | null) {
    if (this.root === root) {
      return;
    }

    this.root = root;
  }

  private handleItemRef = (element: HTMLDivElement | null) => {
    if (this.item === element) {
      return;
    }

    setAccordionItemRuntime(this.item, null);
    this.item = element;
    setAccordionItemRuntime(element, this);
    this.publishStateChange();
  };

  private getItemValue() {
    return (this.latestProps?.value ?? this.generatedValue) as Value;
  }

  private getIndex() {
    if (this.item == null || this.root == null) {
      return 0;
    }

    return Array.from(
      this.root.querySelectorAll<HTMLElement>(`[${ACCORDION_ITEM_ATTRIBUTE}]`),
    ).indexOf(this.item);
  }

  private getTriggerElement() {
    return this.item?.querySelector<HTMLElement>(`[${ACCORDION_TRIGGER_ATTRIBUTE}]`) ?? null;
  }

  private publishStateChange() {
    this.item?.dispatchEvent(new CustomEvent(ACCORDION_ITEM_STATE_CHANGE_EVENT));
  }
}

class AccordionHeaderDirective<Value> extends AsyncDirective {
  private latestProps: AccordionHeaderProps | null = null;
  private item: HTMLElement | null = null;

  render(_componentProps: AccordionHeaderProps) {
    return noChange;
  }

  override update(
    part: Parameters<AsyncDirective['update']>[0],
    [componentProps]: [AccordionHeaderProps],
  ) {
    this.latestProps = componentProps;
    this.syncItem(getAccordionItemRootOrNull(part));
    return this.renderCurrent();
  }

  override disconnected() {
    this.syncItem(null);
  }

  override reconnected() {}

  private renderCurrent() {
    if (this.latestProps == null || this.item == null) {
      return nothing;
    }

    const { children, className, render, ...elementProps } = this.latestProps;
    void className;
    const state = getAccordionItemContextFromElement<Value>(this.item).state;
    const headerProps = {
      ...getStateProps(state, accordionItemStateAttributesMapping<AccordionHeaderState<Value>>()),
      ...elementProps,
    };

    if (render == null) {
      return html`<h3
        ${ref((element) => applyElementProps(element as HTMLElement | null, headerProps))}
      >
        ${children ?? nothing}
      </h3>`;
    }

    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useRender<AccordionHeaderState<Value>, HTMLHeadingElement>({
      defaultTagName: 'h3',
      render,
      state,
      stateAttributesMapping: accordionItemStateAttributesMapping<AccordionHeaderState<Value>>(),
      props: children === undefined ? elementProps : { ...elementProps, children },
    });
  }

  private syncItem(item: HTMLElement | null) {
    if (this.item === item) {
      return;
    }

    this.item?.removeEventListener(ACCORDION_ITEM_STATE_CHANGE_EVENT, this.handleStateChange);
    this.item = item;
    this.item?.addEventListener(ACCORDION_ITEM_STATE_CHANGE_EVENT, this.handleStateChange);
  }

  private handleStateChange = () => {
    this.setValue(this.renderCurrent());
  };
}

class AccordionTriggerDirective<Value> extends AsyncDirective {
  private latestProps: AccordionTriggerProps | null = null;
  private item: HTMLElement | null = null;
  private ignoreNextKeyboardClick = false;

  render(_componentProps: AccordionTriggerProps) {
    return noChange;
  }

  override update(
    part: Parameters<AsyncDirective['update']>[0],
    [componentProps]: [AccordionTriggerProps],
  ) {
    this.latestProps = componentProps;
    this.syncItem(getAccordionItemRootOrNull(part));
    return this.renderCurrent();
  }

  override disconnected() {
    this.clearManualTriggerId();
    this.syncItem(null);
  }

  override reconnected() {}

  private renderCurrent() {
    if (this.latestProps == null || this.item == null) {
      return nothing;
    }

    const itemRuntime = getAccordionItemRuntime<Value>(this.item);
    const itemContext = getAccordionItemContextFromElement<Value>(this.item);
    const state = itemContext.state;
    const disabled = this.latestProps.disabled ?? state.disabled;
    const nativeButton = this.latestProps.nativeButton ?? true;
    const manualTriggerId =
      typeof this.latestProps.id === 'string' ? this.latestProps.id : undefined;
    const triggerId = manualTriggerId ?? itemContext.triggerId;
    const panelId = itemContext.panelId;

    itemRuntime.setTriggerId(manualTriggerId);

    const {
      children,
      className,
      id,
      nativeButton: nativeButtonProp,
      render,
      disabled: disabledProp,
      ...elementProps
    } = this.latestProps;
    void className;
    void id;
    void nativeButtonProp;
    void disabledProp;

    const internalProps = mergeProps<HTMLElement>(
      {
        [ACCORDION_TRIGGER_ATTRIBUTE]: '',
        type: nativeButton ? 'button' : undefined,
        role: nativeButton ? undefined : 'button',
        tabIndex: 0,
        id: triggerId,
        'aria-controls': state.open ? panelId : undefined,
        'aria-disabled': disabled ? 'true' : undefined,
        'aria-expanded': state.open ? 'true' : 'false',
        onClick: (event: MouseEvent) => {
          if (disabled) {
            event.preventDefault();
            return;
          }

          if (this.ignoreNextKeyboardClick && event.detail === 0) {
            this.ignoreNextKeyboardClick = false;
            event.preventDefault();
            return;
          }

          itemRuntime.toggle(!state.open, event, 'trigger-press');
        },
        onKeyDown: (event: KeyboardEvent) => {
          const baseUIEvent = makeEventPreventable(event as BaseUIEvent<KeyboardEvent>);

          if (baseUIEvent.baseUIHandlerPrevented || disabled) {
            return;
          }

          const currentTarget = event.currentTarget;

          if (!(currentTarget instanceof HTMLElement) || event.target !== currentTarget) {
            return;
          }

          const isSpaceKey = event.key === ' ' || event.key === 'Spacebar';
          const isEnterKey = event.key === 'Enter';

          if (isSpaceKey || isEnterKey) {
            event.preventDefault();
            this.ignoreNextKeyboardClick = nativeButton;
            itemRuntime.toggle(!state.open, event, 'trigger-press');
            return;
          }

          if (!SUPPORTED_TRIGGER_KEYS.has(event.key)) {
            return;
          }

          event.preventDefault();
          moveAccordionTriggerFocus(
            itemRuntime.getRootRuntime().root,
            currentTarget,
            event.key,
            state.orientation,
            itemRuntime.getRootRuntime().getContext().loopFocus,
          );
        },
        onKeyUp: (event: KeyboardEvent) => {
          if (disabled) {
            return;
          }

          if (event.key === ' ' || event.key === 'Spacebar') {
            event.preventDefault();
          }
        },
      },
      children === undefined
        ? (elementProps as Parameters<typeof mergeProps<HTMLElement>>[1])
        : ({ ...elementProps, children } as Parameters<typeof mergeProps<HTMLElement>>[1]),
    );
    const triggerProps = {
      ...getStateProps(
        state,
        accordionTriggerStateAttributesMapping<AccordionTriggerState<Value>>(),
      ),
      ...internalProps,
    };

    if (render == null) {
      if (nativeButton) {
        return html`<button
          ${ref((element) => {
            this.handleTriggerRef(element as HTMLElement | null);
            applyElementProps(element as HTMLElement | null, triggerProps);
          })}
        >
          ${children ?? nothing}
        </button>`;
      }

      return html`<span
        ${ref((element) => {
          this.handleTriggerRef(element as HTMLElement | null);
          applyElementProps(element as HTMLElement | null, triggerProps);
        })}
      >
        ${children ?? nothing}
      </span>`;
    }

    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useRender<AccordionTriggerState<Value>, HTMLElement>({
      defaultTagName: 'button',
      render: resolveRenderProp(render, state),
      ref: this.handleTriggerRef,
      state,
      stateAttributesMapping:
        accordionTriggerStateAttributesMapping<AccordionTriggerState<Value>>(),
      props: internalProps,
    });
  }

  private syncItem(item: HTMLElement | null) {
    if (this.item === item) {
      return;
    }

    this.clearManualTriggerId();
    this.item?.removeEventListener(ACCORDION_ITEM_STATE_CHANGE_EVENT, this.handleStateChange);
    this.item = item;
    this.item?.addEventListener(ACCORDION_ITEM_STATE_CHANGE_EVENT, this.handleStateChange);
  }

  private clearManualTriggerId() {
    if (this.item != null) {
      getAccordionItemRuntimeOrNull<Value>(this.item)?.setTriggerId(undefined);
    }
  }

  private handleStateChange = () => {
    this.setValue(this.renderCurrent());
  };

  private handleTriggerRef = (_element: HTMLElement | null) => {};
}

class AccordionPanelDirective<Value> extends AsyncDirective {
  private latestProps: AccordionPanelProps | null = null;
  private item: HTMLElement | null = null;
  private panel: HTMLDivElement | null = null;
  private mounted = false;
  private transitionStatus: TransitionStatus = undefined;
  private frameId: number | null = null;
  private exitRunId = 0;
  private beforeMatchCleanup: (() => void) | null = null;
  private lastOpen: boolean | null = null;
  private dimensions = {
    height: undefined as number | undefined,
    width: undefined as number | undefined,
  };

  render(_componentProps: AccordionPanelProps) {
    return noChange;
  }

  override update(
    part: Parameters<AsyncDirective['update']>[0],
    [componentProps]: [AccordionPanelProps],
  ) {
    this.latestProps = componentProps;
    this.syncItem(getAccordionItemRootOrNull(part));
    return this.renderCurrent();
  }

  override disconnected() {
    this.clearScheduledFrame();
    this.clearManualPanelId();
    this.syncPanel(null);
    this.syncItem(null);
    this.mounted = false;
    this.lastOpen = null;
    this.transitionStatus = undefined;
    this.dimensions = { height: undefined, width: undefined };
  }

  override reconnected() {}

  private renderCurrent() {
    if (this.latestProps == null || this.item == null) {
      return nothing;
    }

    const itemRuntime = getAccordionItemRuntime<Value>(this.item);
    const itemContext = getAccordionItemContextFromElement<Value>(this.item);
    const itemState = itemContext.state;
    const rootContext = getAccordionRootContextFromElement<Value>(
      this.item.closest(`[${ACCORDION_ROOT_ATTRIBUTE}]`) as HTMLElement | null,
    );
    const hiddenUntilFound = this.latestProps.hiddenUntilFound ?? rootContext.hiddenUntilFound;
    const keepMounted = this.latestProps.keepMounted ?? rootContext.keepMounted;
    const shouldStayMounted = keepMounted || hiddenUntilFound;
    const wasOpen = this.lastOpen;

    if (itemState.open) {
      this.exitRunId += 1;

      if (wasOpen !== true && !this.mounted) {
        this.mounted = true;
        this.transitionStatus = 'starting';
        this.scheduleStartingStyleCleanup();
      } else if (this.transitionStatus === 'ending') {
        this.transitionStatus = undefined;
      }
    } else if (wasOpen === true && this.mounted && this.transitionStatus !== 'ending') {
      this.transitionStatus = 'ending';
      this.scheduleExitCleanup(shouldStayMounted);
    } else if (!this.mounted && shouldStayMounted) {
      this.mounted = true;
    }

    this.lastOpen = itemState.open;

    const shouldRender = this.mounted || this.transitionStatus === 'ending' || shouldStayMounted;

    if (!shouldRender) {
      return nothing;
    }

    const manualPanelId = typeof this.latestProps.id === 'string' ? this.latestProps.id : undefined;
    itemRuntime.setPanelId(manualPanelId);

    const {
      children,
      className,
      hiddenUntilFound: hiddenUntilFoundProp,
      id,
      keepMounted: keepMountedProp,
      render,
      ...elementProps
    } = this.latestProps;
    void className;
    void hiddenUntilFoundProp;
    void id;
    void keepMountedProp;

    const panelState: AccordionPanelState<Value> = {
      ...itemState,
      transitionStatus: this.transitionStatus,
    };
    const hidden = !itemState.open && this.transitionStatus !== 'ending';
    const panelId = manualPanelId ?? itemRuntime.getPanelId();

    queueMicrotask(() => {
      this.syncHiddenAttribute(hiddenUntilFound, hidden);
      this.measurePanel();
    });
    const panelProps = {
      ...getStateProps(
        panelState,
        accordionPanelStateAttributesMapping<AccordionPanelState<Value>>(),
      ),
      [ACCORDION_PANEL_ATTRIBUTE]: '',
      'aria-labelledby': itemContext.triggerId,
      hidden: hiddenUntilFound ? undefined : hidden,
      id: panelId,
      role: 'region',
      style: {
        [ACCORDION_PANEL_HEIGHT_VAR]:
          this.dimensions.height === undefined ? 'auto' : `${this.dimensions.height}px`,
        [ACCORDION_PANEL_WIDTH_VAR]:
          this.dimensions.width === undefined ? 'auto' : `${this.dimensions.width}px`,
      },
      ...elementProps,
    };

    if (render == null) {
      return html`<div
        ${ref((element) => {
          this.handlePanelRef(element as HTMLDivElement | null);
          applyElementProps(element as HTMLElement | null, panelProps);
        })}
      >
        ${children ?? nothing}
      </div>`;
    }

    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useRender<AccordionPanelState<Value>, HTMLDivElement>({
      defaultTagName: 'div',
      render: resolveRenderProp(render, panelState),
      ref: this.handlePanelRef,
      state: panelState,
      stateAttributesMapping: accordionPanelStateAttributesMapping<AccordionPanelState<Value>>(),
      props:
        children === undefined
          ? {
              [ACCORDION_PANEL_ATTRIBUTE]: '',
              'aria-labelledby': itemContext.triggerId,
              hidden: hiddenUntilFound ? undefined : hidden,
              id: panelId,
              role: 'region',
              style: {
                [ACCORDION_PANEL_HEIGHT_VAR]:
                  this.dimensions.height === undefined ? 'auto' : `${this.dimensions.height}px`,
                [ACCORDION_PANEL_WIDTH_VAR]:
                  this.dimensions.width === undefined ? 'auto' : `${this.dimensions.width}px`,
              },
              ...elementProps,
            }
          : {
              [ACCORDION_PANEL_ATTRIBUTE]: '',
              'aria-labelledby': itemContext.triggerId,
              hidden: hiddenUntilFound ? undefined : hidden,
              id: panelId,
              role: 'region',
              style: {
                [ACCORDION_PANEL_HEIGHT_VAR]:
                  this.dimensions.height === undefined ? 'auto' : `${this.dimensions.height}px`,
                [ACCORDION_PANEL_WIDTH_VAR]:
                  this.dimensions.width === undefined ? 'auto' : `${this.dimensions.width}px`,
              },
              ...elementProps,
              children,
            },
    });
  }

  private syncItem(item: HTMLElement | null) {
    if (this.item === item) {
      return;
    }

    this.clearManualPanelId();
    this.item?.removeEventListener(ACCORDION_ITEM_STATE_CHANGE_EVENT, this.handleStateChange);
    this.item = item;
    this.item?.addEventListener(ACCORDION_ITEM_STATE_CHANGE_EVENT, this.handleStateChange);
  }

  private syncPanel(panel: HTMLDivElement | null) {
    if (this.panel === panel) {
      return;
    }

    this.beforeMatchCleanup?.();
    this.beforeMatchCleanup = null;
    this.panel = panel;

    if (panel != null) {
      const handleBeforeMatch = (event: Event) => {
        if (this.item == null) {
          return;
        }

        getAccordionItemRuntime<Value>(this.item).toggle(true, event, 'none');
      };

      panel.addEventListener('beforematch', handleBeforeMatch);
      this.beforeMatchCleanup = () => {
        panel.removeEventListener('beforematch', handleBeforeMatch);
      };
    }
  }

  private clearManualPanelId() {
    if (this.item != null) {
      getAccordionItemRuntimeOrNull<Value>(this.item)?.setPanelId(undefined);
    }
  }

  private handlePanelRef = (element: HTMLDivElement | null) => {
    this.syncPanel(element);
    this.measurePanel();
  };

  private handleStateChange = () => {
    this.setValue(this.renderCurrent());
  };

  private scheduleStartingStyleCleanup() {
    this.clearScheduledFrame();

    this.frameId = requestAnimationFrame(() => {
      this.frameId = null;

      if (this.item == null || this.transitionStatus !== 'starting') {
        return;
      }

      if (!getAccordionItemRuntime<Value>(this.item).getState().open) {
        return;
      }

      this.transitionStatus = undefined;
      this.requestComponentUpdate();
    });
  }

  private scheduleExitCleanup(keepMounted: boolean) {
    this.clearScheduledFrame();
    this.exitRunId += 1;
    const runId = this.exitRunId;

    this.frameId = requestAnimationFrame(() => {
      this.frameId = null;
      this.waitForExitAnimations(runId, keepMounted);
    });
  }

  private waitForExitAnimations(runId: number, keepMounted: boolean) {
    if (runId !== this.exitRunId) {
      return;
    }

    const panel = this.panel;

    if (
      panel == null ||
      typeof panel.getAnimations !== 'function' ||
      (
        globalThis as typeof globalThis & {
          BASE_UI_ANIMATIONS_DISABLED?: boolean | undefined;
        }
      ).BASE_UI_ANIMATIONS_DISABLED
    ) {
      this.finishExit(runId, keepMounted);
      return;
    }

    Promise.all(panel.getAnimations().map((animation) => animation.finished))
      .then(() => {
        this.finishExit(runId, keepMounted);
      })
      .catch(() => {
        if (runId !== this.exitRunId || this.panel == null) {
          return;
        }

        const activeAnimations = this.panel.getAnimations();

        if (
          activeAnimations.length > 0 &&
          activeAnimations.some(
            (animation) => animation.pending || animation.playState !== 'finished',
          )
        ) {
          this.waitForExitAnimations(runId, keepMounted);
          return;
        }

        this.finishExit(runId, keepMounted);
      });
  }

  private finishExit(runId: number, keepMounted: boolean) {
    if (runId !== this.exitRunId) {
      return;
    }

    this.mounted = keepMounted;
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

  private syncHiddenAttribute(hiddenUntilFound: boolean, hidden: boolean) {
    if (this.panel == null) {
      return;
    }

    if (hiddenUntilFound && hidden) {
      this.panel.setAttribute('hidden', 'until-found');
      return;
    }

    if (hidden) {
      this.panel.setAttribute('hidden', '');
      return;
    }

    this.panel.removeAttribute('hidden');
  }

  private measurePanel() {
    if (this.panel == null) {
      return;
    }

    this.dimensions = {
      height: this.panel.scrollHeight || undefined,
      width: this.panel.scrollWidth || undefined,
    };
  }
}

const accordionRootDirective = directive(AccordionRootDirective);
const accordionItemDirective = directive(AccordionItemDirective);
const accordionHeaderDirective = directive(AccordionHeaderDirective);
const accordionTriggerDirective = directive(AccordionTriggerDirective);
const accordionPanelDirective = directive(AccordionPanelDirective);

/**
 * Groups all parts of the accordion.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Accordion](https://base-ui.com/react/components/accordion)
 */
export function AccordionRoot<Value = any>(
  componentProps: AccordionRoot.Props<Value>,
): TemplateResult {
  return html`${accordionRootDirective(componentProps as AccordionRootProps<any>)}`;
}

/**
 * Groups an accordion header with the corresponding panel.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Accordion](https://base-ui.com/react/components/accordion)
 */
export function AccordionItem(componentProps: AccordionItem.Props): TemplateResult {
  return html`${accordionItemDirective(componentProps)}`;
}

/**
 * A heading that labels the corresponding panel.
 * Renders an `<h3>` element.
 *
 * Documentation: [Base UI Accordion](https://base-ui.com/react/components/accordion)
 */
export function AccordionHeader(componentProps: AccordionHeader.Props): TemplateResult {
  return html`${accordionHeaderDirective(componentProps)}`;
}

/**
 * A button that opens and closes the corresponding panel.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Accordion](https://base-ui.com/react/components/accordion)
 */
export function AccordionTrigger(componentProps: AccordionTrigger.Props): TemplateResult {
  return html`${accordionTriggerDirective(componentProps)}`;
}

/**
 * A collapsible panel with the accordion item contents.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Accordion](https://base-ui.com/react/components/accordion)
 */
export function AccordionPanel(componentProps: AccordionPanel.Props): TemplateResult {
  return html`${accordionPanelDirective(componentProps)}`;
}

function setAccordionRootRuntime<Value>(
  element: HTMLElement | null,
  runtime: AccordionRootRuntime<Value> | null,
) {
  if (element == null) {
    return;
  }

  const target = element as AccordionRootElement<Value>;

  if (runtime == null) {
    delete target[ACCORDION_ROOT_RUNTIME];
    return;
  }

  target[ACCORDION_ROOT_RUNTIME] = runtime;
}

function getAccordionRootRuntime<Value>(element: HTMLElement) {
  const runtime = (element as AccordionRootElement<Value>)[ACCORDION_ROOT_RUNTIME];

  if (runtime == null) {
    throw new Error(ACCORDION_ROOT_CONTEXT_ERROR);
  }

  return runtime;
}

function getAccordionRootRuntimeOrNull<Value>(element: HTMLElement | null) {
  if (element == null) {
    return null;
  }

  return (element as AccordionRootElement<Value>)[ACCORDION_ROOT_RUNTIME] ?? null;
}

function getAccordionRootContextFromElement<Value>(
  element: HTMLElement | null,
): AccordionRootContext<Value> {
  if (element == null) {
    return {
      disabled: false,
      hiddenUntilFound: false,
      keepMounted: false,
      loopFocus: true,
      multiple: false,
      orientation: 'vertical',
      value: [],
    };
  }

  const rootElement = element as AccordionRootElement<Value>;

  return (
    rootElement[ACCORDION_ROOT_CONTEXT_PROPERTY] ??
    getAccordionRootRuntimeOrNull<Value>(element)?.getContext() ?? {
      disabled: element.hasAttribute('data-disabled'),
      hiddenUntilFound: false,
      keepMounted: false,
      loopFocus: true,
      multiple: false,
      orientation:
        element.getAttribute('data-orientation') === 'horizontal' ? 'horizontal' : 'vertical',
      value: [],
    }
  );
}

function setAccordionItemRuntime<Value>(
  element: HTMLElement | null,
  runtime: AccordionItemRuntime<Value> | null,
) {
  if (element == null) {
    return;
  }

  const target = element as AccordionItemElement<Value>;

  if (runtime == null) {
    delete target[ACCORDION_ITEM_RUNTIME];
    return;
  }

  target[ACCORDION_ITEM_RUNTIME] = runtime;
}

function getAccordionItemRuntime<Value>(element: HTMLElement) {
  const runtime = (element as AccordionItemElement<Value>)[ACCORDION_ITEM_RUNTIME];

  if (runtime == null) {
    throw new Error(ACCORDION_ITEM_CONTEXT_ERROR);
  }

  return runtime;
}

function getAccordionItemRuntimeOrNull<Value>(element: HTMLElement | null) {
  if (element == null) {
    return null;
  }

  return (element as AccordionItemElement<Value>)[ACCORDION_ITEM_RUNTIME] ?? null;
}

function getAccordionItemContextFromElement<Value>(element: HTMLElement) {
  const itemElement = element as AccordionItemElement<Value>;
  const context =
    itemElement[ACCORDION_ITEM_CONTEXT_PROPERTY] ??
    (itemElement[ACCORDION_ITEM_RUNTIME] != null
      ? {
          state: itemElement[ACCORDION_ITEM_RUNTIME]!.getState(),
          panelId: itemElement[ACCORDION_ITEM_RUNTIME]!.getPanelId(),
          triggerId: itemElement[ACCORDION_ITEM_RUNTIME]!.getTriggerId(),
        }
      : null);

  if (context == null) {
    throw new Error(ACCORDION_ITEM_CONTEXT_ERROR);
  }

  return context as AccordionItemContextSnapshot<Value>;
}

function getAccordionRoot(part: Parameters<AsyncDirective['update']>[0]) {
  const parentNode = (part as { parentNode?: Node | null | undefined }).parentNode ?? null;
  const parentElement = getParentElement(parentNode);
  const root = parentElement?.closest<HTMLElement>(`[${ACCORDION_ROOT_ATTRIBUTE}]`) ?? null;

  if (root == null) {
    throw new Error(ACCORDION_ROOT_CONTEXT_ERROR);
  }

  return root;
}

function getAccordionItemRootOrNull(part: Parameters<AsyncDirective['update']>[0]) {
  const parentNode = (part as { parentNode?: Node | null | undefined }).parentNode ?? null;
  const parentElement = getParentElement(parentNode);
  return parentElement?.closest<HTMLElement>(`[${ACCORDION_ITEM_ATTRIBUTE}]`) ?? null;
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

function accordionRootStateAttributesMapping<Value>() {
  return {
    value: () => null,
  } satisfies StateAttributesMapping<AccordionRootState<Value>>;
}

function accordionItemStateAttributesMapping<
  State extends {
    index: number;
    open: boolean;
    value: unknown;
  },
>(): StateAttributesMapping<State> {
  return {
    index(value: number) {
      return Number.isInteger(value) ? { 'data-index': String(value) } : null;
    },
    open(value: boolean) {
      return value ? OPEN_STATE_ATTRIBUTES : CLOSED_STATE_ATTRIBUTES;
    },
    value: () => null,
  } as StateAttributesMapping<State>;
}

function accordionTriggerStateAttributesMapping<
  State extends { open: boolean },
>(): StateAttributesMapping<State & { value?: unknown }> {
  return {
    open(value: boolean) {
      return value ? PANEL_OPEN_STATE_ATTRIBUTES : null;
    },
    value: () => null,
  } as StateAttributesMapping<State & { value?: unknown }>;
}

function accordionPanelStateAttributesMapping<
  State extends {
    index: number;
    open: boolean;
    transitionStatus: TransitionStatus;
    value: unknown;
  },
>(): StateAttributesMapping<State> {
  return {
    ...accordionItemStateAttributesMapping<State>(),
    transitionStatus(value: TransitionStatus) {
      if (value === 'starting') {
        return STARTING_STYLE_STATE_ATTRIBUTES;
      }
      if (value === 'ending') {
        return ENDING_STYLE_STATE_ATTRIBUTES;
      }
      return null;
    },
  } as StateAttributesMapping<State>;
}

function resolveRenderProp<Props, State>(
  render: TemplateResult | ComponentRenderFn<Props, State> | undefined,
  state: State,
) {
  if (typeof render !== 'function') {
    return render;
  }

  return (props: Props) => render(props, state);
}

function getStateProps<State extends object>(
  state: State,
  mapping?: StateAttributesMapping<State>,
) {
  const props: Record<string, unknown> = {};
  const stateRecord = state as Record<string, unknown>;

  for (const key in stateRecord) {
    if (!Object.prototype.hasOwnProperty.call(stateRecord, key)) {
      continue;
    }

    const stateKey = key as keyof State;
    const value = stateRecord[key] as State[typeof stateKey];

    if (mapping != null && Object.prototype.hasOwnProperty.call(mapping, stateKey)) {
      const mappedProps = mapping[stateKey]?.(value);
      if (mappedProps != null) {
        Object.assign(props, mappedProps);
      }
      continue;
    }

    if (value === true) {
      props[`data-${key.toLowerCase()}`] = '';
    } else if (value) {
      props[`data-${key.toLowerCase()}`] = String(value);
    }
  }

  return props;
}

function applyElementProps(element: HTMLElement | null, props: Record<string, unknown>) {
  if (element == null) {
    return;
  }

  const previous = (
    element as HTMLElement & {
      [APPLIED_ELEMENT_PROPS]?:
        | {
            attributes: Set<string>;
            eventHandlers: Map<string, EventListener>;
            styleKeys: Set<string>;
          }
        | undefined;
    }
  )[APPLIED_ELEMENT_PROPS] ?? {
    attributes: new Set<string>(),
    eventHandlers: new Map<string, EventListener>(),
    styleKeys: new Set<string>(),
  };

  const nextAttributes = new Set<string>();
  const nextEventHandlers = new Map<string, EventListener>();
  const nextStyleKeys = new Set<string>();

  for (const [key, value] of Object.entries(props)) {
    if (key === 'children' || key === 'ref') {
      continue;
    }

    if (key === ACCORDION_ROOT_CONTEXT_PROPERTY || key === ACCORDION_ITEM_CONTEXT_PROPERTY) {
      (element as unknown as Record<string, unknown>)[key] = value;
      nextAttributes.add(key);
      continue;
    }

    if (key === 'className' || key === 'class') {
      if (value == null || value === false) {
        element.removeAttribute('class');
      } else {
        element.setAttribute('class', String(value));
        nextAttributes.add('class');
      }
      continue;
    }

    if (key === 'style' && value != null && typeof value === 'object') {
      const styleObject = value as Record<string, unknown>;
      for (const [styleKey, styleValue] of Object.entries(styleObject)) {
        if (styleValue == null || styleValue === false) {
          element.style.removeProperty(styleKey);
        } else {
          element.style.setProperty(styleKey, String(styleValue));
          nextStyleKeys.add(styleKey);
        }
      }
      continue;
    }

    if (key.startsWith('on') && typeof value === 'function') {
      const eventName = key.slice(2).toLowerCase();
      const listener = value as EventListener;
      const previousListener = previous.eventHandlers.get(eventName);

      if (previousListener != null && previousListener !== listener) {
        element.removeEventListener(eventName, previousListener);
      }
      if (previousListener !== listener) {
        element.addEventListener(eventName, listener);
      }

      nextEventHandlers.set(eventName, listener);
      continue;
    }

    if (value == null || value === false) {
      element.removeAttribute(key);
      continue;
    }

    if (value === true) {
      element.setAttribute(key, '');
      nextAttributes.add(key);
      continue;
    }

    if (key === 'hidden') {
      element.setAttribute('hidden', '');
      nextAttributes.add('hidden');
      continue;
    }

    if (key === 'tabIndex') {
      element.tabIndex = Number(value);
      nextAttributes.add('tabIndex');
      continue;
    }

    if (key === 'value' && 'value' in element) {
      (element as HTMLInputElement).value = String(value);
      nextAttributes.add(key);
      continue;
    }

    element.setAttribute(key, String(value));
    nextAttributes.add(key);
  }

  previous.attributes.forEach((key) => {
    if (nextAttributes.has(key)) {
      return;
    }

    if (key === ACCORDION_ROOT_CONTEXT_PROPERTY || key === ACCORDION_ITEM_CONTEXT_PROPERTY) {
      delete (element as unknown as Record<string, unknown>)[key];
      return;
    }

    if (key === 'tabIndex') {
      element.removeAttribute('tabindex');
      return;
    }

    element.removeAttribute(key);
  });

  previous.eventHandlers.forEach((listener, eventName) => {
    if (!nextEventHandlers.has(eventName)) {
      element.removeEventListener(eventName, listener);
    }
  });

  previous.styleKeys.forEach((styleKey) => {
    if (!nextStyleKeys.has(styleKey)) {
      element.style.removeProperty(styleKey);
    }
  });

  (
    element as HTMLElement & {
      [APPLIED_ELEMENT_PROPS]?:
        | {
            attributes: Set<string>;
            eventHandlers: Map<string, EventListener>;
            styleKeys: Set<string>;
          }
        | undefined;
    }
  )[APPLIED_ELEMENT_PROPS] = {
    attributes: nextAttributes,
    eventHandlers: nextEventHandlers,
    styleKeys: nextStyleKeys,
  };
}

function createChangeEventDetails<Reason extends string>(
  reason: Reason,
  event: Event,
  trigger: Element | undefined,
): BaseUIChangeEventDetails<Reason> {
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
    reason,
    trigger,
  } as BaseUIChangeEventDetails<Reason>;
}

function moveAccordionTriggerFocus(
  root: HTMLElement | null,
  currentTrigger: HTMLElement,
  key: string,
  orientation: Orientation,
  loopFocus: boolean,
) {
  if (root == null) {
    return;
  }

  const activeTriggers = Array.from(
    root.querySelectorAll<HTMLElement>(`[${ACCORDION_ITEM_ATTRIBUTE}]`),
  )
    .filter((item) => !isElementDisabled(item))
    .map((item) => item.querySelector<HTMLElement>(`[${ACCORDION_TRIGGER_ATTRIBUTE}]`))
    .filter((trigger): trigger is HTMLElement => trigger != null && !isElementDisabled(trigger));

  if (activeTriggers.length === 0) {
    return;
  }

  const currentIndex = activeTriggers.indexOf(currentTrigger);
  const lastIndex = activeTriggers.length - 1;
  let nextIndex = -1;

  const toNext = () => {
    if (loopFocus) {
      nextIndex = currentIndex + 1 > lastIndex ? 0 : currentIndex + 1;
      return;
    }

    nextIndex = Math.min(currentIndex + 1, lastIndex);
  };

  const toPrev = () => {
    if (loopFocus) {
      nextIndex = currentIndex <= 0 ? lastIndex : currentIndex - 1;
      return;
    }

    nextIndex = Math.max(currentIndex - 1, 0);
  };

  switch (key) {
    case 'ArrowDown':
      if (orientation === 'vertical') {
        toNext();
      }
      break;
    case 'ArrowUp':
      if (orientation === 'vertical') {
        toPrev();
      }
      break;
    case 'ArrowRight':
      if (orientation === 'horizontal') {
        if (getDirection(root) === 'rtl') {
          toPrev();
        } else {
          toNext();
        }
      }
      break;
    case 'ArrowLeft':
      if (orientation === 'horizontal') {
        if (getDirection(root) === 'rtl') {
          toNext();
        } else {
          toPrev();
        }
      }
      break;
    case 'Home':
      nextIndex = 0;
      break;
    case 'End':
      nextIndex = lastIndex;
      break;
    default:
      break;
  }

  if (nextIndex > -1) {
    activeTriggers[nextIndex]?.focus();
  }
}

function getDirection(root: HTMLElement | null) {
  if (root == null) {
    return 'ltr';
  }

  const documentElement = root.ownerDocument?.documentElement;
  const dir = root.closest('[dir]')?.getAttribute('dir') ?? documentElement?.getAttribute('dir');

  return dir === 'rtl' ? 'rtl' : 'ltr';
}

function isElementDisabled(element: HTMLElement | null) {
  if (element == null) {
    return true;
  }

  return (
    element.hasAttribute('data-disabled') ||
    element.getAttribute('aria-disabled') === 'true' ||
    ('disabled' in element && Boolean((element as HTMLButtonElement).disabled))
  );
}

function areEqual(a: unknown, b: unknown) {
  return Object.is(a, b);
}

export type AccordionValue<Value = any> = Value[];

export interface AccordionRootState<Value = any> {
  value: AccordionValue<Value>;
  disabled: boolean;
  orientation: Orientation;
}

export interface AccordionItemState<Value = any> extends AccordionRootState<Value> {
  index: number;
  open: boolean;
}

export interface AccordionHeaderState<Value = any> extends AccordionItemState<Value> {}

export interface AccordionTriggerState<Value = any> extends AccordionItemState<Value> {}

export interface AccordionPanelState<Value = any> extends AccordionItemState<Value> {
  transitionStatus: TransitionStatus;
}

export interface AccordionRootProps<Value = any> extends ComponentPropsWithChildren<
  'div',
  AccordionRootState<Value>,
  unknown,
  HTMLProps<HTMLDivElement>
> {
  value?: AccordionValue<Value> | undefined;
  defaultValue?: AccordionValue<Value> | undefined;
  disabled?: boolean | undefined;
  hiddenUntilFound?: boolean | undefined;
  keepMounted?: boolean | undefined;
  loopFocus?: boolean | undefined;
  onValueChange?:
    | ((value: AccordionValue<Value>, eventDetails: AccordionRoot.ChangeEventDetails) => void)
    | undefined;
  multiple?: boolean | undefined;
  orientation?: Orientation | undefined;
  render?: AccordionRootRenderProp | undefined;
}

export interface AccordionItemProps extends ComponentPropsWithChildren<
  'div',
  AccordionItemState,
  unknown,
  HTMLProps<HTMLDivElement>
> {
  disabled?: boolean | undefined;
  onOpenChange?:
    | ((open: boolean, eventDetails: AccordionItem.ChangeEventDetails) => void)
    | undefined;
  render?: AccordionItemRenderProp | undefined;
  value?: any;
}

export interface AccordionHeaderProps extends ComponentPropsWithChildren<
  'h3',
  AccordionHeaderState,
  unknown,
  HTMLProps<HTMLHeadingElement>
> {
  render?: AccordionHeaderRenderProp | undefined;
}

export interface AccordionTriggerProps extends ComponentPropsWithChildren<
  'button',
  AccordionTriggerState,
  unknown,
  AccordionTriggerRenderProps
> {
  disabled?: boolean | undefined;
  nativeButton?: boolean | undefined;
  render?: AccordionTriggerRenderProp | undefined;
}

export interface AccordionPanelProps extends ComponentPropsWithChildren<
  'div',
  AccordionPanelState,
  unknown,
  HTMLProps<HTMLDivElement>
> {
  hiddenUntilFound?: boolean | undefined;
  keepMounted?: boolean | undefined;
  render?: AccordionPanelRenderProp | undefined;
}

export type AccordionRootChangeEventReason = 'trigger-press' | 'none';
export type AccordionRootChangeEventDetails =
  BaseUIChangeEventDetails<AccordionRoot.ChangeEventReason>;
export type AccordionItemChangeEventReason = 'trigger-press' | 'none';
export type AccordionItemChangeEventDetails =
  BaseUIChangeEventDetails<AccordionItem.ChangeEventReason>;

export namespace AccordionRoot {
  export type Value<TValue = any> = AccordionValue<TValue>;
  export type State<TValue = any> = AccordionRootState<TValue>;
  export type Props<TValue = any> = AccordionRootProps<TValue>;
  export type ChangeEventReason = AccordionRootChangeEventReason;
  export type ChangeEventDetails = AccordionRootChangeEventDetails;
}

export namespace AccordionItem {
  export type State<TValue = any> = AccordionItemState<TValue>;
  export type Props = AccordionItemProps;
  export type ChangeEventReason = AccordionItemChangeEventReason;
  export type ChangeEventDetails = AccordionItemChangeEventDetails;
}

export namespace AccordionHeader {
  export type State<TValue = any> = AccordionHeaderState<TValue>;
  export type Props = AccordionHeaderProps;
}

export namespace AccordionTrigger {
  export type State<TValue = any> = AccordionTriggerState<TValue>;
  export type Props = AccordionTriggerProps;
}

export namespace AccordionPanel {
  export type State<TValue = any> = AccordionPanelState<TValue>;
  export type Props = AccordionPanelProps;
}

export const Accordion = {
  Root: AccordionRoot,
  Item: AccordionItem,
  Header: AccordionHeader,
  Trigger: AccordionTrigger,
  Panel: AccordionPanel,
} as const;
