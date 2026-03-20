import { html, noChange, nothing, type TemplateResult } from 'lit';
// eslint-disable-next-line import/extensions
import { AsyncDirective, directive } from 'lit/async-directive.js';
// eslint-disable-next-line import/extensions
import { ref } from 'lit/directives/ref.js';
import type {
  PopoverArrowProps,
  PopoverPortalProps,
  PopoverPopupProps,
  PopoverPositionerProps,
  PopoverRootActions,
  PopoverRootProps,
  PopoverTriggerProps,
  PopoverViewportProps,
} from '../popover/index.ts';
import {
  Popover,
  PopoverHandle,
  type PopoverRootChangeEventDetails,
} from '../popover/index.ts';
import type { BaseUIChangeEventDetails, HTMLProps } from '../types/index.ts';
import { useRender } from '../use-render/index.ts';

const OPEN_DELAY = 600;
const POPOVER_RUNTIME_PROPERTY = '__baseUiPopoverRuntime';
const TOOLTIP_CONTROLLER_PROPERTY = '__baseUiTooltipController';
const TOOLTIP_PROVIDER_PROPERTY = '__baseUiTooltipProvider';
const ROOT_ATTRIBUTE = 'data-base-ui-tooltip-root';
const PROVIDER_ATTRIBUTE = 'data-base-ui-tooltip-provider';
const GENERATED_ID_PREFIX = 'base-ui-tooltip';
const DATA_OPEN = { 'data-open': '' };
const DATA_CLOSED = { 'data-closed': '' };
const DATA_STARTING_STYLE = { 'data-starting-style': '' };
const DATA_ENDING_STYLE = { 'data-ending-style': '' };

let generatedTooltipId = 0;

type Side = 'top' | 'right' | 'bottom' | 'left';
type Align = 'start' | 'center' | 'end';
type TransitionStatus = 'starting' | 'ending' | undefined;
type TooltipInstantType = 'delay' | 'dismiss' | 'focus' | undefined;
type TooltipPositionerInstant = TooltipInstantType | 'tracking-cursor' | undefined;
type TooltipChangeReason =
  | 'trigger-hover'
  | 'trigger-focus'
  | 'trigger-press'
  | 'outside-press'
  | 'escape-key'
  | 'disabled'
  | 'imperative-action'
  | 'none';

type RefObject<T> = {
  current: T | null;
};

type Ref<T> = ((instance: T | null) => void) | RefObject<T> | null | undefined;

type ComponentPropsWithChildren<
  ElementType extends keyof HTMLElementTagNameMap,
  State,
  Children = unknown,
  RenderFunctionProps = HTMLProps,
> = Omit<useRender.ComponentProps<ElementType, State, RenderFunctionProps>, 'children'> & {
  children?: Children | undefined;
};

type RootChildren<Payload> =
  | unknown
  | ((data: { payload: Payload | undefined }) => unknown)
  | undefined;

type TooltipRuntimeElement = HTMLElement & {
  [TOOLTIP_CONTROLLER_PROPERTY]?: TooltipRootController<any> | undefined;
};

type TooltipProviderElement = HTMLElement & {
  [TOOLTIP_PROVIDER_PROPERTY]?: TooltipProviderController | undefined;
};

type TooltipHandleInternal<Payload = unknown> = TooltipHandle<Payload> & {
  [TOOLTIP_CONTROLLER_PROPERTY]?: TooltipRootController<Payload> | undefined;
};

type TooltipPopoverRuntime<Payload = unknown> = {
  subscribe(listener: () => void): () => void;
  getOpen(): boolean;
  isMounted(): boolean;
  getOpenReason(): string | null;
  getTransitionStatus(): TransitionStatus;
  getPayload(): Payload | undefined;
  getPopupId(): string;
  getActiveTriggerId(): string | null;
  getActiveTriggerElement(): HTMLElement | null;
  getPositionState(): {
    align: Align;
    anchorHidden: boolean;
    arrowOffsetX: number | null;
    arrowOffsetY: number | null;
    arrowUncentered: boolean;
    side: Side;
    transformOrigin: string;
  };
  registerTrigger(entry: {
    id: string;
    element: HTMLElement | null;
    disabled: boolean;
    payload: Payload | undefined;
    openOnHover: boolean;
    delay: number;
    closeDelay: number;
  }): () => void;
  setPopupElement(element: HTMLElement | null): void;
  setPopupId(id: string | undefined): void;
  handle?: TooltipHandle<Payload> | undefined;
  root: HTMLElement | null;
  openWithTrigger(
    triggerId: string | null,
    event: Event | undefined,
    reason: string,
    sourceElement?: Element | undefined,
  ): void;
  close(event: Event | undefined, reason: string, sourceElement?: Element | undefined): void;
  scheduleHoverOpen(id: string, delay: number, event: MouseEvent): void;
  cancelHoverOpen(): void;
  enterHoverRegion(): void;
  leaveHoverRegion(event: MouseEvent | undefined, closeDelay: number): void;
};

interface SubscriptionOwner {
  onControllerChange(nextController: TooltipRootController<any> | null): void;
}

function getComposedParent(node: Node | null): Node | null {
  if (node == null) {
    return null;
  }

  if ((node as ShadowRoot).host != null) {
    return (node as ShadowRoot).host;
  }

  return node.parentNode;
}

function assignRef<T>(refToAssign: Ref<T>, value: T | null) {
  if (refToAssign == null) {
    return;
  }

  if (typeof refToAssign === 'function') {
    refToAssign(value);
    return;
  }

  refToAssign.current = value;
}

function isTooltipPopoverRuntime(value: unknown): value is TooltipPopoverRuntime<any> {
  return (
    typeof value === 'object' &&
    value != null &&
    'getOpen' in value &&
    'registerTrigger' in value &&
    'scheduleHoverOpen' in value
  );
}

function findPopoverRuntime(node: Node | null): TooltipPopoverRuntime<any> | null {
  let current: Node | null = node;

  while (current != null) {
    if (
      current instanceof HTMLElement &&
      isTooltipPopoverRuntime(
        (current as HTMLElement & { [POPOVER_RUNTIME_PROPERTY]?: unknown })[POPOVER_RUNTIME_PROPERTY],
      )
    ) {
      return (
        current as HTMLElement & {
          [POPOVER_RUNTIME_PROPERTY]?: TooltipPopoverRuntime<any> | undefined;
        }
      )[POPOVER_RUNTIME_PROPERTY] ?? null;
    }

    current = getComposedParent(current);
  }

  return null;
}

function findTooltipRootController(node: Node | null): TooltipRootController<any> | null {
  let current: Node | null = node;

  while (current != null) {
    if (
      current instanceof HTMLElement &&
      (current as TooltipRuntimeElement)[TOOLTIP_CONTROLLER_PROPERTY] != null
    ) {
      return (current as TooltipRuntimeElement)[TOOLTIP_CONTROLLER_PROPERTY] ?? null;
    }

    const runtime = findPopoverRuntime(current);
    const handle = runtime?.handle as TooltipHandleInternal<any> | undefined;
    if (handle?.[TOOLTIP_CONTROLLER_PROPERTY] != null) {
      return handle[TOOLTIP_CONTROLLER_PROPERTY] ?? null;
    }

    current = getComposedParent(current);
  }

  return null;
}

function findTooltipProviderController(node: Node | null): TooltipProviderController | null {
  let current: Node | null = node;

  while (current != null) {
    if (
      current instanceof HTMLElement &&
      (current as TooltipProviderElement)[TOOLTIP_PROVIDER_PROPERTY] != null
    ) {
      return (current as TooltipProviderElement)[TOOLTIP_PROVIDER_PROPERTY] ?? null;
    }

    current = getComposedParent(current);
  }

  return null;
}

function mergeStyle(
  baseStyle: unknown,
  extraStyle: Record<string, string | undefined>,
): string | Record<string, string | undefined> | undefined {
  if (typeof baseStyle === 'string') {
    const extra = Object.entries(extraStyle)
      .filter(([, value]) => value != null)
      .map(([name, value]) => `${name}: ${value}`)
      .join('; ');

    if (extra.length === 0) {
      return baseStyle;
    }

    return `${baseStyle}${baseStyle.trim().endsWith(';') ? ' ' : '; '}${extra}`;
  }

  if (baseStyle != null && typeof baseStyle === 'object') {
    return {
      ...(baseStyle as Record<string, string | undefined>),
      ...extraStyle,
    };
  }

  if (Object.keys(extraStyle).length === 0) {
    return undefined;
  }

  return extraStyle;
}

function rethrowIfStillConnected(error: unknown, isConnected: boolean) {
  if (isConnected) {
    throw error;
  }
}

function createTooltipChangeEventDetails(
  eventDetails: PopoverRootChangeEventDetails,
  reason: TooltipChangeReason,
): TooltipRootChangeEventDetails {
  return {
    get reason() {
      return reason;
    },
    get event() {
      return eventDetails.event;
    },
    get trigger() {
      return eventDetails.trigger;
    },
    cancel() {
      eventDetails.cancel();
    },
    allowPropagation() {
      eventDetails.allowPropagation();
    },
    get isCanceled() {
      return eventDetails.isCanceled;
    },
    get isPropagationAllowed() {
      return eventDetails.isPropagationAllowed;
    },
    preventUnmountOnClose() {
      eventDetails.preventUnmountOnClose();
    },
  } as TooltipRootChangeEventDetails;
}

function getTooltipReason(reason: string | null | undefined): TooltipChangeReason {
  switch (reason) {
    case 'trigger-hover':
    case 'trigger-focus':
    case 'trigger-press':
    case 'outside-press':
    case 'escape-key':
    case 'disabled':
    case 'imperative-action':
    case 'none':
      return reason;
    default:
      return 'none';
  }
}

class TooltipProviderController {
  private delay: number | undefined = undefined;
  private closeDelay: number | undefined = undefined;
  private timeout = 400;
  private instantUntil = 0;
  private openController: TooltipRootController<any> | null = null;

  updateProps(props: TooltipProviderProps) {
    this.delay = props.delay;
    this.closeDelay = props.closeDelay;
    this.timeout = props.timeout ?? 400;
  }

  isInstantPhase() {
    return Date.now() <= this.instantUntil;
  }

  resolveOpenDelay(triggerDelay: number | undefined) {
    if (this.isInstantPhase()) {
      return { delay: 0, instant: true };
    }

    return {
      delay: triggerDelay ?? this.delay ?? OPEN_DELAY,
      instant: false,
    };
  }

  resolveCloseDelay(triggerCloseDelay: number | undefined) {
    return triggerCloseDelay ?? this.closeDelay ?? 0;
  }

  notifyOpen(controller: TooltipRootController<any>) {
    if (this.openController != null && this.openController !== controller) {
      this.openController.closeForSibling();
    }

    this.openController = controller;
    this.instantUntil = 0;
  }

  notifyClose(controller: TooltipRootController<any>) {
    if (this.openController === controller) {
      this.openController = null;
    }

    this.instantUntil = Date.now() + this.timeout;
  }
}

class TooltipRootController<Payload = unknown> {
  private props: TooltipRootProps<Payload> = {};
  private rootElement: HTMLElement | null = null;
  private provider: TooltipProviderController | null = null;
  private popoverRuntime: TooltipPopoverRuntime<Payload> | null = null;
  private cursorAnchorElement: HTMLSpanElement | null = null;
  private listeners = new Set<() => void>();
  private unsubscribeHandleOwner: (() => void) | null = null;
  private readonly owner = {
    onRuntimeChange: (nextRuntime: TooltipPopoverRuntime<Payload> | null) => {
      this.popoverRuntime = nextRuntime;
      if (this.props.disabled && nextRuntime?.getOpen()) {
        this.handle.close();
      }
      this.notify();
    },
  };

  readonly internalHandle = new TooltipHandle<Payload>();
  handle: TooltipHandle<Payload> = this.internalHandle;
  instantType: TooltipInstantType = undefined;
  pendingOpenInstantType: TooltipInstantType = undefined;

  updateProps(props: TooltipRootProps<Payload>) {
    this.props = props;
    this.setHandle(props.handle ?? this.internalHandle);
    this.provider = findTooltipProviderController(this.rootElement);

    if (this.props.disabled && this.popoverRuntime?.getOpen()) {
      this.handle.close();
    }

    if (!this.popoverRuntime?.getOpen()) {
      this.clearCursorAnchor();
    }

    this.notify();
  }

  connectRoot(element: HTMLElement | null) {
    if (this.rootElement === element) {
      return;
    }

    if (this.rootElement != null) {
      delete (this.rootElement as TooltipRuntimeElement)[TOOLTIP_CONTROLLER_PROPERTY];
    }

    this.rootElement = element;
    this.provider = findTooltipProviderController(this.rootElement);

    if (this.rootElement != null) {
      (this.rootElement as TooltipRuntimeElement)[TOOLTIP_CONTROLLER_PROPERTY] = this;
    }
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getDisabled() {
    return Boolean(this.props.disabled);
  }

  getDisableHoverablePopup() {
    return Boolean(this.props.disableHoverablePopup);
  }

  getTrackCursorAxis() {
    return this.props.trackCursorAxis ?? 'none';
  }

  getPositionerInstant(): TooltipPositionerInstant {
    if (this.getTrackCursorAxis() !== 'none') {
      return 'tracking-cursor';
    }

    return this.instantType ?? this.pendingOpenInstantType;
  }

  getEffectiveInstantType() {
    return this.instantType ?? this.pendingOpenInstantType;
  }

  getPopoverRuntime() {
    return this.popoverRuntime;
  }

  resolveOpenDelay(triggerDelay: number | undefined) {
    this.provider ??= findTooltipProviderController(this.rootElement);
    const providerResolution = this.provider?.resolveOpenDelay(triggerDelay);
    if (providerResolution != null) {
      return providerResolution;
    }

    return {
      delay: triggerDelay ?? OPEN_DELAY,
      instant: false,
    };
  }

  resolveCloseDelay(triggerCloseDelay: number | undefined) {
    this.provider ??= findTooltipProviderController(this.rootElement);
    return this.provider?.resolveCloseDelay(triggerCloseDelay) ?? triggerCloseDelay ?? 0;
  }

  closeForSibling() {
    const runtime = this.popoverRuntime;
    if (runtime == null || !runtime.getOpen()) {
      return;
    }

    this.instantType = 'delay';
    runtime.close(undefined, 'none', runtime.getActiveTriggerElement() ?? undefined);
    this.notify();
  }

  updateCursorAnchor(event: MouseEvent, triggerElement: HTMLElement | null) {
    const axis = this.getTrackCursorAxis();
    if (axis === 'none') {
      return;
    }

    const ownerDocument = triggerElement?.ownerDocument ?? this.rootElement?.ownerDocument ?? document;
    const ownerWindow = ownerDocument.defaultView ?? window;

    if (this.cursorAnchorElement == null) {
      const anchor = ownerDocument.createElement('span');
      anchor.setAttribute('aria-hidden', 'true');
      anchor.style.position = 'fixed';
      anchor.style.width = '0px';
      anchor.style.height = '0px';
      anchor.style.pointerEvents = 'none';
      anchor.style.visibility = 'hidden';
      anchor.style.left = '0px';
      anchor.style.top = '0px';
      this.cursorAnchorElement = anchor;
      ownerDocument.body.append(anchor);
    } else if (this.cursorAnchorElement.parentNode == null) {
      ownerDocument.body.append(this.cursorAnchorElement);
    }

    const triggerRect = triggerElement?.getBoundingClientRect();
    const x =
      axis === 'x' || axis === 'both'
        ? event.clientX
        : (triggerRect?.left ?? 0) + (triggerRect?.width ?? 0) / 2;
    const y =
      axis === 'y' || axis === 'both'
        ? event.clientY
        : (triggerRect?.top ?? 0) + (triggerRect?.height ?? 0) / 2;

    this.cursorAnchorElement.style.left = `${Math.round(x)}px`;
    this.cursorAnchorElement.style.top = `${Math.round(y)}px`;

    if (ownerWindow.visualViewport != null) {
      this.cursorAnchorElement.style.transform = `translate(${ownerWindow.visualViewport.offsetLeft}px, ${ownerWindow.visualViewport.offsetTop}px)`;
    } else {
      this.cursorAnchorElement.style.transform = '';
    }
  }

  getCursorAnchorElement() {
    return this.getTrackCursorAxis() === 'none' ? undefined : this.cursorAnchorElement;
  }

  clearCursorAnchor() {
    this.cursorAnchorElement?.remove();
  }

  handleOpenChange(
    nextOpen: boolean,
    eventDetails: PopoverRootChangeEventDetails,
    userOnOpenChange:
      | ((open: boolean, details: TooltipRootChangeEventDetails) => void)
      | undefined,
  ) {
    const reason = getTooltipReason(eventDetails.reason);
    const details = createTooltipChangeEventDetails(eventDetails, reason);

    userOnOpenChange?.(nextOpen, details);

    if (eventDetails.isCanceled) {
      this.pendingOpenInstantType = undefined;
      this.notify();
      return;
    }

    if (nextOpen) {
      this.instantType =
        this.pendingOpenInstantType ?? (reason === 'trigger-focus' ? 'focus' : undefined);
      this.provider?.notifyOpen(this);
    } else {
      if (reason === 'trigger-press' || reason === 'escape-key') {
        this.instantType = 'dismiss';
      } else if (reason === 'none') {
        this.instantType = 'delay';
      } else {
        this.instantType = undefined;
      }

      this.provider?.notifyClose(this);
      this.clearCursorAnchor();
    }

    this.pendingOpenInstantType = undefined;
    this.notify();
  }

  disconnected() {
    this.unsubscribeHandleOwner?.();
    this.unsubscribeHandleOwner = null;
    this.clearCursorAnchor();
    delete (this.handle as TooltipHandleInternal<Payload>)[TOOLTIP_CONTROLLER_PROPERTY];
  }

  private setHandle(nextHandle: TooltipHandle<Payload>) {
    if (this.handle === nextHandle) {
      (this.handle as TooltipHandleInternal<Payload>)[TOOLTIP_CONTROLLER_PROPERTY] = this;
      return;
    }

    delete (this.handle as TooltipHandleInternal<Payload>)[TOOLTIP_CONTROLLER_PROPERTY];
    this.unsubscribeHandleOwner?.();
    this.unsubscribeHandleOwner = null;
    this.handle = nextHandle;
    (this.handle as TooltipHandleInternal<Payload>)[TOOLTIP_CONTROLLER_PROPERTY] = this;
    this.unsubscribeHandleOwner = this.handle.subscribeOwner(this.owner as never);
  }

  private notify() {
    this.listeners.forEach((listener) => {
      listener();
    });
  }
}

export class TooltipHandle<Payload = unknown> extends PopoverHandle<Payload> {
  override open(triggerId: string) {
    try {
      super.open(triggerId);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.startsWith('Base UI: PopoverHandle.open: No trigger found with id "')
      ) {
        throw new Error(
          error.message.replace('Base UI: PopoverHandle.open:', 'Base UI: TooltipHandle.open:'),
        );
      }

      throw error;
    }
  }
}

export function createTooltipHandle<Payload = unknown>() {
  return new TooltipHandle<Payload>();
}

class TooltipProviderDirective extends AsyncDirective {
  private latestProps: TooltipProviderProps | null = null;
  private readonly controller = new TooltipProviderController();

  render(_props: TooltipProviderProps) {
    return noChange;
  }

  override update(
    _part: Parameters<AsyncDirective['update']>[0],
    [props]: [TooltipProviderProps],
  ) {
    this.latestProps = props;
    this.controller.updateProps(props);
    return this.renderCurrent();
  }

  private renderCurrent() {
    const props = this.latestProps;
    if (props == null) {
      return nothing;
    }

    return html`<div
      ${ref((element) => {
        if (element instanceof HTMLElement) {
          (element as TooltipProviderElement)[TOOLTIP_PROVIDER_PROPERTY] = this.controller;
        }
      })}
      ${PROVIDER_ATTRIBUTE}=""
      style="display: contents;"
    >
      ${props.children ?? nothing}
    </div>`;
  }
}

const tooltipProviderDirective = directive(TooltipProviderDirective);

class TooltipRootDirective<Payload = unknown> extends AsyncDirective {
  private latestProps: TooltipRootProps<Payload> | null = null;
  private readonly controller = new TooltipRootController<Payload>();

  render(_props: TooltipRootProps<Payload>) {
    return noChange;
  }

  override update(
    _part: Parameters<AsyncDirective['update']>[0],
    [props]: [TooltipRootProps<Payload>],
  ) {
    this.latestProps = props;
    this.controller.updateProps(props);
    return this.renderCurrent();
  }

  override disconnected() {
    this.controller.disconnected();
    this.controller.connectRoot(null);
  }

  private renderCurrent() {
    const props = this.latestProps;
    if (props == null) {
      return nothing;
    }

    return html`<div
      ${ref((element) => {
        this.controller.connectRoot(element as HTMLElement | null);
      })}
      ${ROOT_ATTRIBUTE}=""
      style="display: contents;"
    >
      ${Popover.Root<Payload>({
        actionsRef: props.actionsRef as RefObject<PopoverRootActions | null> | undefined,
        defaultOpen: props.defaultOpen,
        defaultTriggerId: props.defaultTriggerId,
        handle: this.controller.handle,
        open: props.disabled ? false : props.open,
        onOpenChange: (open, eventDetails) => {
          this.controller.handleOpenChange(open, eventDetails, props.onOpenChange);
        },
        onOpenChangeComplete: props.onOpenChangeComplete,
        triggerId: props.triggerId,
        children: props.children as PopoverRootProps<Payload>['children'],
      })}
    </div>`;
  }
}

const tooltipRootDirective = directive(TooltipRootDirective);

abstract class TooltipPartDirective<Props, ElementType extends HTMLElement>
  extends AsyncDirective
  implements SubscriptionOwner
{
  protected latestProps: Props | null = null;
  protected controller: TooltipRootController<any> | null = null;
  protected element: ElementType | null = null;
  private unsubscribeController: (() => void) | null = null;

  abstract renderCurrent(): TemplateResult;

  override disconnected() {
    this.unsubscribeController?.();
    this.unsubscribeController = null;
    this.element = null;
  }

  override reconnected() {}

  protected requestRender() {
    if (!this.isConnected) {
      return;
    }

    try {
      this.setValue(this.renderCurrent());
    } catch (error) {
      // Let Lit recover on the next update if the part was detached mid-render.
      rethrowIfStillConnected(error, this.isConnected);
    }
  }

  onControllerChange(nextController: TooltipRootController<any> | null) {
    if (this.controller === nextController) {
      return;
    }

    this.unsubscribeController?.();
    this.unsubscribeController = null;
    this.controller = nextController;
    this.unsubscribeController =
      nextController?.subscribe(() => {
        this.requestRender();
      }) ?? null;
    this.requestRender();
  }

  protected setController(nextController: TooltipRootController<any> | null) {
    this.onControllerChange(nextController);
  }
}

class TooltipTriggerDirective<Payload = unknown>
  extends AsyncDirective
  implements SubscriptionOwner
{
  private latestProps: TooltipTriggerProps<Payload> | null = null;
  private handle: TooltipHandle<Payload> | undefined = undefined;
  private runtime: TooltipPopoverRuntime<Payload> | null = null;
  private controller: TooltipRootController<Payload> | null = null;
  private element: HTMLElement | null = null;
  private unregisterTrigger: (() => void) | null = null;
  private unsubscribeRuntime: (() => void) | null = null;
  private unsubscribeHandle: (() => void) | null = null;
  private generatedId = `${GENERATED_ID_PREFIX}-trigger-${(generatedTooltipId += 1)}`;

  render(_props: TooltipTriggerProps<Payload>) {
    return noChange;
  }

  override update(
    _part: Parameters<AsyncDirective['update']>[0],
    [props]: [TooltipTriggerProps<Payload>],
  ) {
    this.latestProps = props;
    this.syncHandle(props.handle);
    return this.renderCurrent();
  }

  override disconnected() {
    this.unregisterTrigger?.();
    this.unregisterTrigger = null;
    this.unsubscribeRuntime?.();
    this.unsubscribeRuntime = null;
    this.unsubscribeHandle?.();
    this.unsubscribeHandle = null;
    this.handle = undefined;
  }

  override reconnected() {}

  onControllerChange(_nextController: TooltipRootController<any> | null) {}

  private setRuntime(nextRuntime: TooltipPopoverRuntime<Payload> | null) {
    if (this.runtime === nextRuntime) {
      return;
    }

    this.unregisterTrigger?.();
    this.unregisterTrigger = null;
    this.unsubscribeRuntime?.();
    this.unsubscribeRuntime = null;
    this.runtime = nextRuntime;
    this.controller =
      (nextRuntime?.handle as TooltipHandleInternal<Payload> | undefined)?.[
        TOOLTIP_CONTROLLER_PROPERTY
      ] ?? this.controller;
    this.unsubscribeRuntime =
      nextRuntime?.subscribe(() => {
        this.requestRender();
      }) ?? null;
    this.registerTrigger();
    this.requestRender();
  }

  private requestRender() {
    if (!this.isConnected) {
      return;
    }

    try {
      this.setValue(this.renderCurrent());
    } catch (error) {
      // Ignore detached parts.
      rethrowIfStillConnected(error, this.isConnected);
    }
  }

  private syncHandle(handle: TooltipHandle<Payload> | undefined) {
    if (this.handle === handle) {
      return;
    }

    this.handle = handle;
    this.unsubscribeHandle?.();
    this.unsubscribeHandle = null;

    if (handle == null) {
      return;
    }

    this.controller = (handle as TooltipHandleInternal<Payload>)[TOOLTIP_CONTROLLER_PROPERTY] ?? null;
    this.unsubscribeHandle = handle.subscribeOwner({
      onRuntimeChange: (nextRuntime: TooltipPopoverRuntime<Payload> | null) => {
        this.controller =
          (handle as TooltipHandleInternal<Payload>)[TOOLTIP_CONTROLLER_PROPERTY] ?? null;
        this.setRuntime(nextRuntime);
      },
    } as never);
  }

  private getId() {
    return this.latestProps?.id ?? this.generatedId;
  }

  private registerTrigger() {
    this.unregisterTrigger?.();
    this.unregisterTrigger = null;

    if (this.runtime == null) {
      return;
    }

    this.unregisterTrigger = this.runtime.registerTrigger({
      id: this.getId(),
      element: this.element,
      disabled: Boolean(this.latestProps?.disabled ?? this.controller?.getDisabled()),
      payload: this.latestProps?.payload,
      openOnHover: true,
      delay: this.latestProps?.delay ?? OPEN_DELAY,
      closeDelay: this.latestProps?.closeDelay ?? 0,
    });
  }

  private renderCurrent() {
    const props = this.latestProps ?? {};
    const {
      children,
      closeDelay,
      closeOnClick = true,
      delay,
      disabled: disabledProp,
      handle: _handle,
      id: _id,
      payload: _payload,
      ref: forwardedRef,
      render,
      ...elementProps
    } = props as TooltipTriggerProps<Payload> & Record<string, unknown>;
    void _handle;
    void _id;
    void _payload;

    const runtime = this.runtime;
    const controller =
      this.controller ??
      ((runtime?.handle as TooltipHandleInternal<Payload> | undefined)?.[
        TOOLTIP_CONTROLLER_PROPERTY
      ] ?? null);
    this.controller = controller;
    const open = runtime?.getOpen() === true && runtime.getActiveTriggerId() === this.getId();
    const disabled = Boolean(disabledProp ?? controller?.getDisabled());

    if (runtime == null && props.handle == null && this.element != null) {
      this.setRuntime(findPopoverRuntime(this.element));
      this.controller = findTooltipRootController(this.element) as TooltipRootController<Payload> | null;
    }

    if (runtime == null && props.handle == null && this.element == null) {
      // Wait for the element ref callback to resolve runtime/controller.
    } else if (runtime == null && props.handle == null) {
      throw new Error(
        'Base UI: <Tooltip.Trigger> must be either used within a <Tooltip.Root> component or provided with a handle.',
      );
    }

    return useRender<TooltipTriggerState, HTMLElement>({
      defaultTagName: 'button',
      render: render as Parameters<typeof useRender<TooltipTriggerState, HTMLElement>>[0]['render'],
      ref: [
        (element) => {
          this.element = element;
          if (element != null && props.handle == null) {
            this.controller =
              findTooltipRootController(element) as TooltipRootController<Payload> | null;
            if (this.controller != null) {
              this.syncHandle(this.controller.handle);
            }
            this.setRuntime(findPopoverRuntime(element));
            if (this.runtime == null) {
              queueMicrotask(() => {
                if (this.element !== element || props.handle != null) {
                  return;
                }

                this.controller =
                  findTooltipRootController(element) as TooltipRootController<Payload> | null;
                if (this.controller != null) {
                  this.syncHandle(this.controller.handle);
                }
                this.setRuntime(findPopoverRuntime(element));
              });
            }
          }
          this.registerTrigger();
          assignRef(forwardedRef as Ref<HTMLElement>, element);
        },
      ],
      state: { open },
      props: {
        type: 'button',
        id: this.getId(),
        'data-popup-open': open ? '' : undefined,
        'data-trigger-disabled': disabled ? '' : undefined,
        'aria-describedby': open ? runtime?.getPopupId() : undefined,
        onClick: (event: MouseEvent) => {
          const currentRuntime = this.runtime;
          if (!disabled && closeOnClick) {
            currentRuntime?.cancelHoverOpen();
            if (open) {
              currentRuntime?.close(event, 'trigger-press', this.element ?? undefined);
            }
          }

          (elementProps.onClick as ((event: MouseEvent) => void) | undefined)?.(event);
        },
        onFocus: (event: FocusEvent) => {
          const currentRuntime = this.runtime;
          const currentController =
            this.controller ??
            ((currentRuntime?.handle as TooltipHandleInternal<Payload> | undefined)?.[
              TOOLTIP_CONTROLLER_PROPERTY
            ] ?? null);

          if (!disabled) {
            if (currentController != null) {
              currentController.pendingOpenInstantType = 'focus';
            }
            currentRuntime?.openWithTrigger(
              this.getId(),
              event,
              'trigger-focus',
              this.element ?? undefined,
            );
          }

          (elementProps.onFocus as ((event: FocusEvent) => void) | undefined)?.(event);
        },
        onBlur: (event: FocusEvent) => {
          const currentRuntime = this.runtime;
          if (open) {
            currentRuntime?.close(event, 'none', this.element ?? undefined);
          }

          (elementProps.onBlur as ((event: FocusEvent) => void) | undefined)?.(event);
        },
        onMouseEnter: (event: MouseEvent) => {
          const currentRuntime = this.runtime;
          const currentController =
            this.controller ??
            ((currentRuntime?.handle as TooltipHandleInternal<Payload> | undefined)?.[
              TOOLTIP_CONTROLLER_PROPERTY
            ] ?? null);

          if (!disabled) {
            const resolution = currentController?.resolveOpenDelay(delay);
            currentController?.updateCursorAnchor(event, this.element);
            if (currentController != null) {
              currentController.pendingOpenInstantType = resolution?.instant ? 'delay' : undefined;
            }
            currentRuntime?.enterHoverRegion();
            currentRuntime?.scheduleHoverOpen(
              this.getId(),
              resolution?.delay ?? delay ?? OPEN_DELAY,
              event,
            );
          }

          (elementProps.onMouseEnter as ((event: MouseEvent) => void) | undefined)?.(event);
        },
        onMouseMove: (event: MouseEvent) => {
          const currentRuntime = this.runtime;
          const currentController =
            this.controller ??
            ((currentRuntime?.handle as TooltipHandleInternal<Payload> | undefined)?.[
              TOOLTIP_CONTROLLER_PROPERTY
            ] ?? null);
          currentController?.updateCursorAnchor(event, this.element);
          (elementProps.onMouseMove as ((event: MouseEvent) => void) | undefined)?.(event);
        },
        onMouseLeave: (event: MouseEvent) => {
          const currentRuntime = this.runtime;
          const currentController =
            this.controller ??
            ((currentRuntime?.handle as TooltipHandleInternal<Payload> | undefined)?.[
              TOOLTIP_CONTROLLER_PROPERTY
            ] ?? null);
          currentRuntime?.leaveHoverRegion(
            event,
            currentController?.resolveCloseDelay(closeDelay) ?? 0,
          );
          (elementProps.onMouseLeave as ((event: MouseEvent) => void) | undefined)?.(event);
        },
        ...(children === undefined ? elementProps : { ...elementProps, children }),
      },
    });
  }
}

const tooltipTriggerDirective = directive(TooltipTriggerDirective);

class TooltipPositionerDirective extends TooltipPartDirective<
  TooltipPositionerProps,
  HTMLDivElement
> {
  render(_props: TooltipPositionerProps) {
    return noChange;
  }

  override update(
    _part: Parameters<AsyncDirective['update']>[0],
    [props]: [TooltipPositionerProps],
  ) {
    this.latestProps = props;
    return this.renderCurrent();
  }

  renderCurrent() {
    const props = this.latestProps ?? {};
    const controller = this.controller;
    const runtime = controller?.getPopoverRuntime();
    const open = runtime?.getOpen() ?? false;
    const pointerEventsDisabled =
      !open || controller?.getTrackCursorAxis() === 'both' || controller?.getDisableHoverablePopup();

    return Popover.Positioner({
      ...(props as PopoverPositionerProps),
      anchor: controller?.getCursorAnchorElement() ?? props.anchor,
      'data-instant': controller?.getPositionerInstant(),
      style: mergeStyle(props.style, {
        pointerEvents: pointerEventsDisabled ? 'none' : undefined,
      }),
      ref: [
        (element: HTMLDivElement | null) => {
          this.element = element;
          if (element != null) {
            this.setController(findTooltipRootController(element));
          }
          assignRef(props.ref as Ref<HTMLDivElement>, element);
        },
      ],
    });
  }
}

const tooltipPositionerDirective = directive(TooltipPositionerDirective);

class TooltipPopupDirective extends TooltipPartDirective<TooltipPopupProps, HTMLDivElement> {
  render(_props: TooltipPopupProps) {
    return noChange;
  }

  override update(
    _part: Parameters<AsyncDirective['update']>[0],
    [props]: [TooltipPopupProps],
  ) {
    this.latestProps = props;
    return this.renderCurrent();
  }

  renderCurrent() {
    const props = this.latestProps ?? {};

    return Popover.Popup({
      ...(props as PopoverPopupProps),
      initialFocus: false,
      role: 'tooltip',
      tabindex: undefined,
      'aria-labelledby': undefined,
      'aria-describedby': undefined,
      'data-instant': this.controller?.getEffectiveInstantType(),
      ref: [
        (element: HTMLDivElement | null) => {
          this.element = element;
          if (element != null) {
            this.setController(findTooltipRootController(element));
          }
          assignRef(props.ref as Ref<HTMLDivElement>, element);
        },
      ],
    });
  }
}

const tooltipPopupDirective = directive(TooltipPopupDirective);

class TooltipArrowDirective extends TooltipPartDirective<TooltipArrowProps, HTMLDivElement> {
  render(_props: TooltipArrowProps) {
    return noChange;
  }

  override update(
    _part: Parameters<AsyncDirective['update']>[0],
    [props]: [TooltipArrowProps],
  ) {
    this.latestProps = props;
    return this.renderCurrent();
  }

  renderCurrent() {
    const props = this.latestProps ?? {};

    return Popover.Arrow({
      ...(props as PopoverArrowProps),
      'data-instant': this.controller?.getEffectiveInstantType(),
      ref: [
        (element: HTMLDivElement | null) => {
          this.element = element;
          if (element != null) {
            this.setController(findTooltipRootController(element));
          }
          assignRef(props.ref as Ref<HTMLDivElement>, element);
        },
      ],
    });
  }
}

const tooltipArrowDirective = directive(TooltipArrowDirective);

class TooltipViewportDirective extends TooltipPartDirective<TooltipViewportProps, HTMLDivElement> {
  render(_props: TooltipViewportProps) {
    return noChange;
  }

  override update(
    _part: Parameters<AsyncDirective['update']>[0],
    [props]: [TooltipViewportProps],
  ) {
    this.latestProps = props;
    return this.renderCurrent();
  }

  renderCurrent() {
    const props = this.latestProps ?? {};

    return Popover.Viewport({
      ...(props as PopoverViewportProps),
      'data-instant': this.controller?.getEffectiveInstantType(),
      ref: [
        (element: HTMLDivElement | null) => {
          this.element = element;
          if (element != null) {
            this.setController(findTooltipRootController(element));
          }
          assignRef(props.ref as Ref<HTMLDivElement>, element);
        },
      ],
    });
  }
}

const tooltipViewportDirective = directive(TooltipViewportDirective);

export interface TooltipProviderState {}

export interface TooltipProviderProps {
  children?: unknown;
  delay?: number | undefined;
  closeDelay?: number | undefined;
  timeout?: number | undefined;
}

export namespace TooltipProvider {
  export type State = TooltipProviderState;
  export type Props = TooltipProviderProps;
}

export interface TooltipRootState {}

export interface TooltipRootProps<Payload = unknown> {
  defaultOpen?: boolean | undefined;
  open?: boolean | undefined;
  onOpenChange?:
    | ((open: boolean, eventDetails: TooltipRootChangeEventDetails) => void)
    | undefined;
  onOpenChangeComplete?: ((open: boolean) => void) | undefined;
  disableHoverablePopup?: boolean | undefined;
  trackCursorAxis?: 'none' | 'x' | 'y' | 'both' | undefined;
  actionsRef?: RefObject<TooltipRootActions | null> | undefined;
  disabled?: boolean | undefined;
  handle?: TooltipHandle<Payload> | undefined;
  children?: RootChildren<Payload>;
  triggerId?: string | null | undefined;
  defaultTriggerId?: string | null | undefined;
}

export type TooltipRootChangeEventReason = TooltipChangeReason;
export type TooltipRootChangeEventDetails = BaseUIChangeEventDetails<
  TooltipRootChangeEventReason,
  { preventUnmountOnClose(): void }
>;
export type TooltipRootActions = PopoverRootActions;

export namespace TooltipRoot {
  export type State = TooltipRootState;
  export type Props<Payload = unknown> = TooltipRootProps<Payload>;
  export type Actions = TooltipRootActions;
  export type ChangeEventReason = TooltipRootChangeEventReason;
  export type ChangeEventDetails = TooltipRootChangeEventDetails;
}

export interface TooltipTriggerState {
  open: boolean;
}

export type TooltipTriggerProps<Payload = unknown> = ComponentPropsWithChildren<
  'button',
  TooltipTriggerState
> & {
  handle?: TooltipHandle<Payload> | undefined;
  payload?: Payload | undefined;
  delay?: number | undefined;
  closeOnClick?: boolean | undefined;
  closeDelay?: number | undefined;
  disabled?: boolean | undefined;
  id?: string | undefined;
};

export namespace TooltipTrigger {
  export type State = TooltipTriggerState;
  export type Props<Payload = unknown> = TooltipTriggerProps<Payload>;
}

export interface TooltipPortalState {}

export type TooltipPortalProps = Omit<PopoverPortalProps, 'handle'>;

export namespace TooltipPortal {
  export type State = TooltipPortalState;
  export type Props = TooltipPortalProps;
}

export interface TooltipPositionerState {
  open: boolean;
  side: Side;
  align: Align;
  anchorHidden: boolean;
  instant: string | undefined;
}

export type TooltipPositionerProps = PopoverPositionerProps;

export namespace TooltipPositioner {
  export type State = TooltipPositionerState;
  export type Props = TooltipPositionerProps;
}

export interface TooltipPopupState {
  open: boolean;
  side: Side;
  align: Align;
  instant: TooltipInstantType;
  transitionStatus: TransitionStatus;
}

export type TooltipPopupProps = Omit<PopoverPopupProps, 'initialFocus' | 'finalFocus'>;

export namespace TooltipPopup {
  export type State = TooltipPopupState;
  export type Props = TooltipPopupProps;
}

export interface TooltipArrowState {
  open: boolean;
  side: Side;
  align: Align;
  uncentered: boolean;
  instant: TooltipInstantType;
}

export type TooltipArrowProps = PopoverArrowProps;

export namespace TooltipArrow {
  export type State = TooltipArrowState;
  export type Props = TooltipArrowProps;
}

export interface TooltipViewportState {
  activationDirection: string | undefined;
  transitioning: boolean;
  instant: TooltipInstantType;
}

export type TooltipViewportProps = PopoverViewportProps;

export namespace TooltipViewport {
  export type State = TooltipViewportState;
  export type Props = TooltipViewportProps;
}

export function TooltipProvider(props: TooltipProviderProps) {
  return html`${tooltipProviderDirective(props)}`;
}

export function TooltipRoot<Payload = unknown>(props: TooltipRootProps<Payload>) {
  return html`${tooltipRootDirective(props)}`;
}

export function TooltipTrigger<Payload = unknown>(props: TooltipTriggerProps<Payload>) {
  return html`${tooltipTriggerDirective(props)}`;
}

export function TooltipPortal(props: TooltipPortalProps) {
  return Popover.Portal(props);
}

export function TooltipPositioner(props: TooltipPositionerProps) {
  return html`${tooltipPositionerDirective(props)}`;
}

export function TooltipPopup(props: TooltipPopupProps) {
  return html`${tooltipPopupDirective(props)}`;
}

export function TooltipArrow(props: TooltipArrowProps) {
  return html`${tooltipArrowDirective(props)}`;
}

export function TooltipViewport(props: TooltipViewportProps) {
  return html`${tooltipViewportDirective(props)}`;
}

export const Tooltip = {
  Provider: TooltipProvider,
  Root: TooltipRoot,
  Trigger: TooltipTrigger,
  Portal: TooltipPortal,
  Positioner: TooltipPositioner,
  Popup: TooltipPopup,
  Arrow: TooltipArrow,
  Viewport: TooltipViewport,
  createHandle: createTooltipHandle,
  Handle: TooltipHandle,
};
