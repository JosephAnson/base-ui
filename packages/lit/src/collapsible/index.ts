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

const COLLAPSIBLE_ROOT_ATTRIBUTE = 'data-base-ui-collapsible-root';
const COLLAPSIBLE_TRIGGER_ATTRIBUTE = 'data-base-ui-collapsible-trigger';
const COLLAPSIBLE_PANEL_ATTRIBUTE = 'data-base-ui-collapsible-panel';
const COLLAPSIBLE_ROOT_RUNTIME = Symbol('base-ui-collapsible-root-runtime');
const APPLIED_ELEMENT_PROPS = Symbol('base-ui-collapsible-applied-element-props');
const COLLAPSIBLE_ROOT_CONTEXT_PROPERTY = '__baseUiCollapsibleRootContext';
const COLLAPSIBLE_ROOT_STATE_CHANGE_EVENT = 'base-ui-collapsible-root-state-change';
const COLLAPSIBLE_PANEL_HEIGHT_VAR = '--collapsible-panel-height';
const COLLAPSIBLE_PANEL_WIDTH_VAR = '--collapsible-panel-width';
const STARTING_STYLE_ATTRIBUTE = 'data-starting-style';
const ENDING_STYLE_ATTRIBUTE = 'data-ending-style';
const OPEN_STATE_ATTRIBUTES = { 'data-open': '' };
const CLOSED_STATE_ATTRIBUTES = { 'data-closed': '' };
const PANEL_OPEN_STATE_ATTRIBUTES = { 'data-panel-open': '' };
const STARTING_STYLE_STATE_ATTRIBUTES = { [STARTING_STYLE_ATTRIBUTE]: '' };
const ENDING_STYLE_STATE_ATTRIBUTES = { [ENDING_STYLE_ATTRIBUTE]: '' };
const COLLAPSIBLE_ROOT_CONTEXT_ERROR =
  'Base UI: CollapsibleRootContext is missing. Collapsible parts must be placed within <Collapsible.Root>.';

let generatedPanelId = 0;

type TransitionStatus = 'starting' | 'ending' | undefined;
type CollapsibleTriggerEvent = KeyboardEvent | MouseEvent;
type CollapsibleTriggerEventHandler<EventType extends Event> = (
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

type CollapsibleRootRenderProps = HTMLProps<HTMLDivElement> & {
  children?: unknown;
};

type CollapsiblePanelRenderProps = HTMLProps<HTMLDivElement> & {
  children?: unknown;
};

type CollapsibleTriggerRenderProps = Omit<
  HTMLProps<HTMLElement>,
  'children' | 'onClick' | 'onKeyDown' | 'onKeyUp'
> & {
  children?: unknown;
  onClick?: CollapsibleTriggerEventHandler<CollapsibleTriggerEvent> | undefined;
  onKeyDown?: CollapsibleTriggerEventHandler<KeyboardEvent> | undefined;
  onKeyUp?: CollapsibleTriggerEventHandler<KeyboardEvent> | undefined;
};

type CollapsibleRootRenderProp =
  | TemplateResult
  | ComponentRenderFn<CollapsibleRootRenderProps, CollapsibleRootState>;
type CollapsibleTriggerRenderProp =
  | TemplateResult
  | ComponentRenderFn<CollapsibleTriggerRenderProps, CollapsibleTriggerState>;
type CollapsiblePanelRenderProp =
  | TemplateResult
  | ComponentRenderFn<CollapsiblePanelRenderProps, CollapsiblePanelState>;

type CollapsibleRootElement = HTMLElement & {
  [COLLAPSIBLE_ROOT_RUNTIME]?: CollapsibleRootRuntime | undefined;
  [COLLAPSIBLE_ROOT_CONTEXT_PROPERTY]?: CollapsibleRootContext | undefined;
};

interface CollapsibleRootContext {
  disabled: boolean;
  open: boolean;
  panelId: string;
  transitionStatus: TransitionStatus;
}

interface CollapsibleRootRuntime {
  getContext(): CollapsibleRootContext;
  getState(): CollapsibleRootState;
  getPanelId(): string;
  setPanelId(id: string | undefined): void;
  setTransitionStatus(status: TransitionStatus): void;
  toggle(open: boolean, event: Event, reason: CollapsibleRootChangeEventReason): void;
  requestUpdate(): void;
  root: HTMLElement | null;
}

class CollapsibleRootDirective extends AsyncDirective implements CollapsibleRootRuntime {
  private latestProps: CollapsibleRootProps | null = null;
  private rootElement: HTMLDivElement | null = null;
  private initialized = false;
  private bootstrapped = false;
  private defaultOpen = false;
  private generatedPanelId = `base-ui-collapsible-panel-${(generatedPanelId += 1)}`;
  private panelIdOverride: string | undefined = undefined;
  private transitionStatus: TransitionStatus = undefined;
  private lastPublishedStateKey: string | null = null;

  render(_componentProps: CollapsibleRootProps) {
    return noChange;
  }

  override update(
    _part: Parameters<AsyncDirective['update']>[0],
    [componentProps]: [CollapsibleRootProps],
  ) {
    this.latestProps = componentProps;

    if (!this.initialized) {
      this.initialized = true;
      this.defaultOpen = Boolean(componentProps.defaultOpen);
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
    setCollapsibleRootRuntime(this.rootElement, null);
    this.rootElement = null;
    this.bootstrapped = false;
    this.lastPublishedStateKey = null;
    this.transitionStatus = undefined;
    this.panelIdOverride = undefined;
  }

  override reconnected() {}

  get root() {
    return this.rootElement;
  }

  getContext(): CollapsibleRootContext {
    return {
      disabled: Boolean(this.latestProps?.disabled),
      open: this.getOpen(),
      panelId: this.getPanelId(),
      transitionStatus: this.transitionStatus,
    };
  }

  getState(): CollapsibleRootState {
    return {
      disabled: Boolean(this.latestProps?.disabled),
      open: this.getOpen(),
      transitionStatus: this.transitionStatus,
    };
  }

  getPanelId() {
    return this.panelIdOverride ?? this.generatedPanelId;
  }

  setPanelId(id: string | undefined) {
    if (this.panelIdOverride === id) {
      return;
    }

    this.panelIdOverride = id;
    this.requestUpdate();
  }

  setTransitionStatus(status: TransitionStatus) {
    if (this.transitionStatus === status) {
      return;
    }

    this.transitionStatus = status;
    this.requestUpdate();
  }

  toggle(open: boolean, event: Event, reason: CollapsibleRootChangeEventReason) {
    const eventDetails = createChangeEventDetails<CollapsibleRoot.ChangeEventReason>(
      reason,
      event,
      this.getTriggerElement() ?? undefined,
    );

    this.latestProps?.onOpenChange?.(open, eventDetails);

    if (eventDetails.isCanceled) {
      this.requestUpdate();
      return;
    }

    if (this.latestProps?.open === undefined) {
      this.defaultOpen = open;
    }

    this.requestUpdate();
  }

  requestUpdate() {
    this.setValue(this.renderCurrent());
  }

  private renderCurrent() {
    if (this.latestProps == null) {
      return nothing;
    }

    const {
      children,
      className,
      defaultOpen: defaultOpenProp,
      disabled,
      onOpenChange,
      open,
      render,
      ...elementProps
    } = this.latestProps;
    void className;
    void defaultOpenProp;
    void disabled;
    void onOpenChange;
    void open;
    const state = this.getState();
    const rootProps = {
      ...getStateProps(state, collapsibleRootStateAttributesMapping()),
      [COLLAPSIBLE_ROOT_ATTRIBUTE]: '',
      [COLLAPSIBLE_ROOT_CONTEXT_PROPERTY]: this.getContext(),
      ...elementProps,
    };

    queueMicrotask(() => {
      this.publishStateChange();
    });

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

    const resolvedRender = render ?? html`<div data-base-ui-collapsible-root=""></div>`;

    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useRender<CollapsibleRootState, HTMLDivElement>({
      defaultTagName: 'div',
      render: resolveRenderProp(resolvedRender, state),
      ref: this.handleRootRef,
      state,
      stateAttributesMapping: collapsibleRootStateAttributesMapping(),
      props: children === undefined ? rootProps : { ...rootProps, children },
    });
  }

  private getOpen() {
    return this.latestProps?.open ?? this.defaultOpen;
  }

  private handleRootRef = (element: HTMLDivElement | null) => {
    if (this.rootElement === element) {
      return;
    }

    setCollapsibleRootRuntime(this.rootElement, null);
    this.rootElement = element;
    setCollapsibleRootRuntime(element, this);
    queueMicrotask(() => {
      this.publishStateChange();
    });
  };

  private getTriggerElement() {
    return (
      this.rootElement?.querySelector<HTMLElement>(`[${COLLAPSIBLE_TRIGGER_ATTRIBUTE}]`) ?? null
    );
  }

  private publishStateChange() {
    const stateKey = [
      this.getOpen() ? 'open' : 'closed',
      this.latestProps?.disabled ? 'disabled' : 'enabled',
      this.transitionStatus ?? 'idle',
      this.getPanelId(),
    ].join('|');

    if (this.lastPublishedStateKey === stateKey) {
      return;
    }

    this.lastPublishedStateKey = stateKey;
    this.rootElement?.dispatchEvent(new CustomEvent(COLLAPSIBLE_ROOT_STATE_CHANGE_EVENT));
  }
}

class CollapsibleTriggerDirective extends AsyncDirective {
  private latestProps: CollapsibleTriggerProps | null = null;
  private root: HTMLElement | null = null;
  private ignoreNextKeyboardClick = false;

  render(_componentProps: CollapsibleTriggerProps) {
    return noChange;
  }

  override update(
    part: Parameters<AsyncDirective['update']>[0],
    [componentProps]: [CollapsibleTriggerProps],
  ) {
    this.latestProps = componentProps;
    this.syncRoot(getCollapsibleRoot(part));
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

    const rootRuntime = getCollapsibleRootRuntime(this.root);
    const state = rootRuntime.getState();
    const disabled = this.latestProps.disabled ?? state.disabled;
    const nativeButton = this.latestProps.nativeButton ?? true;
    const panelId = rootRuntime.getPanelId();

    const {
      children,
      className,
      disabled: disabledProp,
      nativeButton: nativeButtonProp,
      render,
      ...elementProps
    } = this.latestProps;
    void className;
    void disabledProp;
    void nativeButtonProp;

    const internalProps = mergeProps<HTMLElement>(
      {
        [COLLAPSIBLE_TRIGGER_ATTRIBUTE]: '',
        'aria-controls': state.open ? panelId : undefined,
        'aria-disabled': disabled ? 'true' : undefined,
        'aria-expanded': state.open ? 'true' : 'false',
        role: nativeButton ? undefined : 'button',
        tabIndex: 0,
        type: nativeButton ? 'button' : undefined,
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

          rootRuntime.toggle(!state.open, event, 'trigger-press');
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

          if (!isSpaceKey && !isEnterKey) {
            return;
          }

          event.preventDefault();
          this.ignoreNextKeyboardClick = nativeButton;
          rootRuntime.toggle(!state.open, event, 'trigger-press');
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
      ...getStateProps(state, collapsibleTriggerStateAttributesMapping()),
      ...internalProps,
    };

    if (render == null) {
      if (nativeButton) {
        return html`<button
          ${ref((element) => applyElementProps(element as HTMLElement | null, triggerProps))}
        >
          ${children ?? nothing}
        </button>`;
      }

      return html`<span
        ${ref((element) => applyElementProps(element as HTMLElement | null, triggerProps))}
      >
        ${children ?? nothing}
      </span>`;
    }

    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useRender<CollapsibleTriggerState, HTMLElement>({
      defaultTagName: 'button',
      render: resolveRenderProp(render, state),
      state,
      stateAttributesMapping: collapsibleTriggerStateAttributesMapping(),
      props: internalProps,
    });
  }

  private syncRoot(root: HTMLElement | null) {
    if (this.root === root) {
      return;
    }

    this.root?.removeEventListener(COLLAPSIBLE_ROOT_STATE_CHANGE_EVENT, this.handleStateChange);
    this.root = root;
    this.root?.addEventListener(COLLAPSIBLE_ROOT_STATE_CHANGE_EVENT, this.handleStateChange);
  }

  private handleStateChange = () => {
    this.setValue(this.renderCurrent());
  };
}

class CollapsiblePanelDirective extends AsyncDirective {
  private latestProps: CollapsiblePanelProps | null = null;
  private root: HTMLElement | null = null;
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

  render(_componentProps: CollapsiblePanelProps) {
    return noChange;
  }

  override update(
    part: Parameters<AsyncDirective['update']>[0],
    [componentProps]: [CollapsiblePanelProps],
  ) {
    this.latestProps = componentProps;
    this.syncRoot(getCollapsibleRoot(part));
    return this.renderCurrent();
  }

  override disconnected() {
    this.clearScheduledFrame();
    this.clearManualPanelId();
    this.syncPanel(null);
    getCollapsibleRootRuntimeOrNull(this.root)?.setTransitionStatus(undefined);
    this.syncRoot(null);
    this.mounted = false;
    this.lastOpen = null;
    this.transitionStatus = undefined;
    this.dimensions = { height: undefined, width: undefined };
  }

  override reconnected() {}

  private renderCurrent() {
    if (this.latestProps == null || this.root == null) {
      return nothing;
    }

    const rootRuntime = getCollapsibleRootRuntime(this.root);
    const rootState = rootRuntime.getState();
    const hiddenUntilFound = this.latestProps.hiddenUntilFound ?? false;
    const keepMounted = this.latestProps.keepMounted ?? false;
    const shouldStayMounted = keepMounted || hiddenUntilFound;
    const wasOpen = this.lastOpen;

    if (rootState.open) {
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

    this.lastOpen = rootState.open;

    const shouldRender = this.mounted || this.transitionStatus === 'ending' || shouldStayMounted;

    if (!shouldRender) {
      queueMicrotask(() => {
        rootRuntime.setTransitionStatus(undefined);
      });
      return nothing;
    }

    const manualPanelId = typeof this.latestProps.id === 'string' ? this.latestProps.id : undefined;
    rootRuntime.setPanelId(manualPanelId);

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

    const panelState: CollapsiblePanelState = {
      disabled: rootState.disabled,
      open: rootState.open,
      transitionStatus: this.transitionStatus,
    };
    const hidden = !rootState.open && this.transitionStatus !== 'ending';
    const panelId = manualPanelId ?? rootRuntime.getPanelId();

    queueMicrotask(() => {
      rootRuntime.setTransitionStatus(this.transitionStatus);
      this.syncHiddenAttribute(hiddenUntilFound, hidden);
      this.measurePanel();
    });

    const panelProps = {
      ...getStateProps(panelState, collapsiblePanelStateAttributesMapping()),
      [COLLAPSIBLE_PANEL_ATTRIBUTE]: '',
      hidden: hiddenUntilFound ? undefined : hidden,
      id: panelId,
      style: {
        [COLLAPSIBLE_PANEL_HEIGHT_VAR]:
          this.dimensions.height === undefined ? 'auto' : `${this.dimensions.height}px`,
        [COLLAPSIBLE_PANEL_WIDTH_VAR]:
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
    return useRender<CollapsiblePanelState, HTMLDivElement>({
      defaultTagName: 'div',
      render: resolveRenderProp(render, panelState),
      ref: this.handlePanelRef,
      state: panelState,
      stateAttributesMapping: collapsiblePanelStateAttributesMapping(),
      props: children === undefined ? panelProps : { ...panelProps, children },
    });
  }

  private syncRoot(root: HTMLElement | null) {
    if (this.root === root) {
      return;
    }

    this.clearManualPanelId();
    this.root?.removeEventListener(COLLAPSIBLE_ROOT_STATE_CHANGE_EVENT, this.handleStateChange);
    this.root = root;
    this.root?.addEventListener(COLLAPSIBLE_ROOT_STATE_CHANGE_EVENT, this.handleStateChange);
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
        if (this.root == null) {
          return;
        }

        getCollapsibleRootRuntime(this.root).toggle(true, event, 'none');
      };

      panel.addEventListener('beforematch', handleBeforeMatch);
      this.beforeMatchCleanup = () => {
        panel.removeEventListener('beforematch', handleBeforeMatch);
      };
    }
  }

  private clearManualPanelId() {
    if (this.root != null) {
      getCollapsibleRootRuntimeOrNull(this.root)?.setPanelId(undefined);
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

      if (this.root == null || this.transitionStatus !== 'starting') {
        return;
      }

      if (!getCollapsibleRootRuntime(this.root).getState().open) {
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

const collapsibleRootDirective = directive(CollapsibleRootDirective);
const collapsibleTriggerDirective = directive(CollapsibleTriggerDirective);
const collapsiblePanelDirective = directive(CollapsiblePanelDirective);

/**
 * Groups all parts of the collapsible.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Collapsible](https://base-ui.com/react/components/collapsible)
 */
export function CollapsibleRoot(componentProps: CollapsibleRoot.Props): TemplateResult {
  return html`${collapsibleRootDirective(componentProps)}`;
}

/**
 * A button that opens and closes the collapsible panel.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Collapsible](https://base-ui.com/react/components/collapsible)
 */
export function CollapsibleTrigger(componentProps: CollapsibleTrigger.Props): TemplateResult {
  return html`${collapsibleTriggerDirective(componentProps)}`;
}

/**
 * A panel with the collapsible contents.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Collapsible](https://base-ui.com/react/components/collapsible)
 */
export function CollapsiblePanel(componentProps: CollapsiblePanel.Props): TemplateResult {
  return html`${collapsiblePanelDirective(componentProps)}`;
}

function setCollapsibleRootRuntime(
  element: HTMLElement | null,
  runtime: CollapsibleRootRuntime | null,
) {
  if (element == null) {
    return;
  }

  const target = element as CollapsibleRootElement;

  if (runtime == null) {
    delete target[COLLAPSIBLE_ROOT_RUNTIME];
    return;
  }

  target[COLLAPSIBLE_ROOT_RUNTIME] = runtime;
}

function getCollapsibleRootRuntime(element: HTMLElement) {
  const runtime = (element as CollapsibleRootElement)[COLLAPSIBLE_ROOT_RUNTIME];

  if (runtime == null) {
    throw new Error(COLLAPSIBLE_ROOT_CONTEXT_ERROR);
  }

  return runtime;
}

function getCollapsibleRootRuntimeOrNull(element: HTMLElement | null) {
  if (element == null) {
    return null;
  }

  return (element as CollapsibleRootElement)[COLLAPSIBLE_ROOT_RUNTIME] ?? null;
}

function getCollapsibleRoot(part: Parameters<AsyncDirective['update']>[0]) {
  const parentNode = (part as { parentNode?: Node | null | undefined }).parentNode ?? null;
  const parentElement = getParentElement(parentNode);
  const root = parentElement?.closest<HTMLElement>(`[${COLLAPSIBLE_ROOT_ATTRIBUTE}]`) ?? null;

  if (root == null) {
    throw new Error(COLLAPSIBLE_ROOT_CONTEXT_ERROR);
  }

  return root;
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

function collapsibleRootStateAttributesMapping() {
  return {
    open(value: boolean) {
      return value ? OPEN_STATE_ATTRIBUTES : CLOSED_STATE_ATTRIBUTES;
    },
    transitionStatus(value: TransitionStatus) {
      if (value === 'starting') {
        return STARTING_STYLE_STATE_ATTRIBUTES;
      }
      if (value === 'ending') {
        return ENDING_STYLE_STATE_ATTRIBUTES;
      }
      return null;
    },
  } satisfies StateAttributesMapping<CollapsibleRootState>;
}

function collapsibleTriggerStateAttributesMapping() {
  return {
    open(value: boolean) {
      return value ? PANEL_OPEN_STATE_ATTRIBUTES : null;
    },
    transitionStatus(value: TransitionStatus) {
      if (value === 'starting') {
        return STARTING_STYLE_STATE_ATTRIBUTES;
      }
      if (value === 'ending') {
        return ENDING_STYLE_STATE_ATTRIBUTES;
      }
      return null;
    },
  } satisfies StateAttributesMapping<CollapsibleTriggerState>;
}

function collapsiblePanelStateAttributesMapping() {
  return {
    open(value: boolean) {
      return value ? OPEN_STATE_ATTRIBUTES : CLOSED_STATE_ATTRIBUTES;
    },
    transitionStatus(value: TransitionStatus) {
      if (value === 'starting') {
        return STARTING_STYLE_STATE_ATTRIBUTES;
      }
      if (value === 'ending') {
        return ENDING_STYLE_STATE_ATTRIBUTES;
      }
      return null;
    },
  } satisfies StateAttributesMapping<CollapsiblePanelState>;
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

    if (key === COLLAPSIBLE_ROOT_CONTEXT_PROPERTY) {
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

    element.setAttribute(key, String(value));
    nextAttributes.add(key);
  }

  previous.attributes.forEach((key) => {
    if (nextAttributes.has(key)) {
      return;
    }

    if (key === COLLAPSIBLE_ROOT_CONTEXT_PROPERTY) {
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

export interface CollapsibleRootState {
  disabled: boolean;
  open: boolean;
  transitionStatus: TransitionStatus;
}

export interface CollapsibleTriggerState extends CollapsibleRootState {}

export interface CollapsiblePanelState extends CollapsibleRootState {}

export interface CollapsibleRootProps extends ComponentPropsWithChildren<
  'div',
  CollapsibleRootState,
  unknown,
  HTMLProps<HTMLDivElement>
> {
  defaultOpen?: boolean | undefined;
  disabled?: boolean | undefined;
  onOpenChange?:
    | ((open: boolean, eventDetails: CollapsibleRoot.ChangeEventDetails) => void)
    | undefined;
  open?: boolean | undefined;
  render?: CollapsibleRootRenderProp | undefined;
}

export interface CollapsibleTriggerProps extends ComponentPropsWithChildren<
  'button',
  CollapsibleTriggerState,
  unknown,
  CollapsibleTriggerRenderProps
> {
  disabled?: boolean | undefined;
  nativeButton?: boolean | undefined;
  render?: CollapsibleTriggerRenderProp | undefined;
}

export interface CollapsiblePanelProps extends ComponentPropsWithChildren<
  'div',
  CollapsiblePanelState,
  unknown,
  HTMLProps<HTMLDivElement>
> {
  hiddenUntilFound?: boolean | undefined;
  keepMounted?: boolean | undefined;
  render?: CollapsiblePanelRenderProp | undefined;
}

export type CollapsibleRootChangeEventReason = 'trigger-press' | 'none';
export type CollapsibleRootChangeEventDetails =
  BaseUIChangeEventDetails<CollapsibleRoot.ChangeEventReason>;

export namespace CollapsibleRoot {
  export type State = CollapsibleRootState;
  export type Props = CollapsibleRootProps;
  export type ChangeEventReason = CollapsibleRootChangeEventReason;
  export type ChangeEventDetails = CollapsibleRootChangeEventDetails;
}

export namespace CollapsibleTrigger {
  export type State = CollapsibleTriggerState;
  export type Props = CollapsibleTriggerProps;
}

export namespace CollapsiblePanel {
  export type State = CollapsiblePanelState;
  export type Props = CollapsiblePanelProps;
}

export const Collapsible = {
  Root: CollapsibleRoot,
  Trigger: CollapsibleTrigger,
  Panel: CollapsiblePanel,
} as const;
