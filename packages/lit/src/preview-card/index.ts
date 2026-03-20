import { html, noChange, nothing, type TemplateResult } from 'lit';
// eslint-disable-next-line import/extensions
import { AsyncDirective, directive } from 'lit/async-directive.js';
// eslint-disable-next-line import/extensions
import { ref } from 'lit/directives/ref.js';
import type {
  PopoverArrowProps,
  PopoverBackdropProps,
  PopoverPortalProps,
  PopoverPopupProps,
  PopoverPositionerProps,
  PopoverRootActions,
  PopoverRootChangeEventDetails,
  PopoverRootProps,
  PopoverViewportProps,
} from '../popover/index.ts';
import { Popover, PopoverHandle } from '../popover/index.ts';
import type { BaseUIChangeEventDetails, HTMLProps } from '../types/index.ts';
import { useRender } from '../use-render/index.ts';

const OPEN_DELAY = 600;
const CLOSE_DELAY = 300;
const POPOVER_RUNTIME_PROPERTY = '__baseUiPopoverRuntime';
const PREVIEW_CARD_CONTROLLER_PROPERTY = '__baseUiPreviewCardController';
const ROOT_ATTRIBUTE = 'data-base-ui-preview-card-root';
const GENERATED_ID_PREFIX = 'base-ui-preview-card';
const DATA_OPEN = { 'data-open': '' };
const DATA_CLOSED = { 'data-closed': '' };

let generatedPreviewCardId = 0;

type Side = 'top' | 'right' | 'bottom' | 'left';
type Align = 'start' | 'center' | 'end';
type TransitionStatus = 'starting' | 'ending' | undefined;
type PreviewCardInstantType = 'dismiss' | 'focus' | undefined;
type PreviewCardChangeReason =
  | 'trigger-hover'
  | 'trigger-focus'
  | 'trigger-press'
  | 'outside-press'
  | 'escape-key'
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

type PreviewCardRuntimeElement = HTMLElement & {
  [PREVIEW_CARD_CONTROLLER_PROPERTY]?: PreviewCardRootController<any> | undefined;
};

type PreviewCardHandleInternal<Payload = unknown> = PreviewCardHandle<Payload> & {
  [PREVIEW_CARD_CONTROLLER_PROPERTY]?: PreviewCardRootController<Payload> | undefined;
};

type PreviewCardPopoverRuntime<Payload = unknown> = {
  subscribe(listener: () => void): () => void;
  getOpen(): boolean;
  isMounted(): boolean;
  getOpenReason(): string | null;
  getTransitionStatus(): TransitionStatus;
  getPayload(): Payload | undefined;
  getPopupId(): string;
  getActiveTriggerId(): string | null;
  getActiveTriggerElement(): HTMLElement | null;
  getTriggerEntries(): {
    id: string;
    element: HTMLElement | null;
    disabled: boolean;
  }[];
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
  setArrowElement(element: HTMLElement | null): void;
  handle?: PreviewCardHandle<Payload> | undefined;
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
  popupElement: HTMLElement | null;
};

const TRIGGER_CONTEXT_ERROR =
  'Base UI: <PreviewCard.Trigger> must be either used within a <PreviewCard.Root> ' +
  'component or provided with a handle.';

interface SubscriptionOwner {
  onControllerChange(nextController: PreviewCardRootController<any> | null): void;
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

function isPreviewCardPopoverRuntime(value: unknown): value is PreviewCardPopoverRuntime<any> {
  return (
    typeof value === 'object' &&
    value != null &&
    'getOpen' in value &&
    'registerTrigger' in value &&
    'scheduleHoverOpen' in value
  );
}

function findPopoverRuntime(node: Node | null): PreviewCardPopoverRuntime<any> | null {
  let current: Node | null = node;

  while (current != null) {
    if (
      current instanceof HTMLElement &&
      isPreviewCardPopoverRuntime(
        (current as HTMLElement & { [POPOVER_RUNTIME_PROPERTY]?: unknown })[POPOVER_RUNTIME_PROPERTY],
      )
    ) {
      return (
        current as HTMLElement & {
          [POPOVER_RUNTIME_PROPERTY]?: PreviewCardPopoverRuntime<any> | undefined;
        }
      )[POPOVER_RUNTIME_PROPERTY] ?? null;
    }

    current = getComposedParent(current);
  }

  return null;
}

function findPreviewCardRootController(node: Node | null): PreviewCardRootController<any> | null {
  let current: Node | null = node;

  while (current != null) {
    if (
      current instanceof HTMLElement &&
      (current as PreviewCardRuntimeElement)[PREVIEW_CARD_CONTROLLER_PROPERTY] != null
    ) {
      return (current as PreviewCardRuntimeElement)[PREVIEW_CARD_CONTROLLER_PROPERTY] ?? null;
    }

    const runtime = findPopoverRuntime(current);
    const handle = runtime?.handle as PreviewCardHandleInternal<any> | undefined;
    if (handle?.[PREVIEW_CARD_CONTROLLER_PROPERTY] != null) {
      return handle[PREVIEW_CARD_CONTROLLER_PROPERTY] ?? null;
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

function isDetachedChildPartError(error: unknown) {
  return (
    error instanceof Error &&
    error.message.includes('ChildPart') &&
    error.message.includes('no `parentNode`')
  );
}

function createPreviewCardChangeEventDetails(
  eventDetails: PopoverRootChangeEventDetails,
  reason: PreviewCardChangeReason,
): PreviewCardRootChangeEventDetails {
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
  } as PreviewCardRootChangeEventDetails;
}

function getPreviewCardReason(reason: string | null | undefined): PreviewCardChangeReason {
  switch (reason) {
    case 'trigger-hover':
    case 'trigger-focus':
    case 'trigger-press':
    case 'outside-press':
    case 'escape-key':
    case 'imperative-action':
    case 'none':
      return reason;
    default:
      return 'none';
  }
}

function getDefaultView(element: HTMLElement | null) {
  return element?.ownerDocument.defaultView ?? window;
}

function isElement(value: unknown): value is Element {
  return value instanceof Element;
}

function isShadowRoot(value: unknown): value is ShadowRoot {
  return typeof ShadowRoot !== 'undefined' && value instanceof ShadowRoot;
}

function getActiveElement(doc: Document) {
  let element = doc.activeElement;

  while (element?.shadowRoot?.activeElement != null) {
    element = element.shadowRoot.activeElement;
  }

  return element;
}

function containsElement(parent?: Element | null, child?: Element | null) {
  if (parent == null || child == null) {
    return false;
  }

  if (parent.contains(child)) {
    return true;
  }

  const rootNode = child.getRootNode?.();
  if (rootNode != null && isShadowRoot(rootNode)) {
    let next: Element | null = child;
    while (next != null) {
      if (parent === next) {
        return true;
      }

      next = (next.parentNode as Element | null) ?? (next.getRootNode() as ShadowRoot).host;
    }
  }

  return false;
}

function isTargetInsideEnabledTrigger(
  target: EventTarget | null,
  triggers: PreviewCardPopoverRuntime['getTriggerEntries'] extends () => infer T ? T : never,
) {
  if (!isElement(target)) {
    return false;
  }

  return triggers.some((trigger) => {
    if (trigger.disabled || trigger.element == null) {
      return false;
    }

    return trigger.element === target || containsElement(trigger.element, target);
  });
}

function isHiddenPlaceholderElement(element: HTMLElement | null) {
  return element?.tagName === 'SPAN' && element.hidden;
}

class PreviewCardRootController<Payload = unknown> {
  private rootElement: HTMLElement | null = null;
  private popoverRuntime: PreviewCardPopoverRuntime<Payload> | null = null;
  private listeners = new Set<() => void>();
  private unsubscribeHandleOwner: (() => void) | null = null;
  private readonly owner = {
    onRuntimeChange: (nextRuntime: PreviewCardPopoverRuntime<Payload> | null) => {
      this.popoverRuntime = nextRuntime;
      this.notify();
    },
  };

  readonly internalHandle = new PreviewCardHandle<Payload>();
  handle: PreviewCardHandle<Payload> = this.internalHandle;
  instantType: PreviewCardInstantType = undefined;

  updateProps(props: PreviewCardRootProps<Payload>) {
    this.setHandle(props.handle ?? this.internalHandle);
    this.notify();
  }

  connectRoot(element: HTMLElement | null) {
    if (this.rootElement === element) {
      return;
    }

    if (this.rootElement != null) {
      delete (this.rootElement as PreviewCardRuntimeElement)[PREVIEW_CARD_CONTROLLER_PROPERTY];
    }

    this.rootElement = element;

    if (this.rootElement != null) {
      (this.rootElement as PreviewCardRuntimeElement)[PREVIEW_CARD_CONTROLLER_PROPERTY] = this;
    }
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getPopoverRuntime() {
    return this.popoverRuntime;
  }

  getInstantType() {
    return this.instantType;
  }

  handleOpenChange(
    nextOpen: boolean,
    eventDetails: PopoverRootChangeEventDetails,
    userOnOpenChange:
      | ((open: boolean, details: PreviewCardRootChangeEventDetails) => void)
      | undefined,
  ) {
    const reason = getPreviewCardReason(eventDetails.reason);
    const normalizedReason =
      !nextOpen && reason === 'none' && eventDetails.event instanceof FocusEvent && this.instantType === 'focus'
        ? 'trigger-focus'
        : reason;
    const details = createPreviewCardChangeEventDetails(eventDetails, normalizedReason);

    userOnOpenChange?.(nextOpen, details);

    if (eventDetails.isCanceled) {
      this.notify();
      return;
    }

    if (nextOpen) {
      this.instantType = normalizedReason === 'trigger-focus' ? 'focus' : undefined;
    } else {
      this.instantType =
        normalizedReason === 'trigger-press' || normalizedReason === 'escape-key'
          ? 'dismiss'
          : undefined;
    }

    this.notify();
  }

  disconnected() {
    this.unsubscribeHandleOwner?.();
    this.unsubscribeHandleOwner = null;
    delete (this.handle as PreviewCardHandleInternal<Payload>)[PREVIEW_CARD_CONTROLLER_PROPERTY];
  }

  private setHandle(nextHandle: PreviewCardHandle<Payload>) {
    if (this.handle === nextHandle) {
      (this.handle as PreviewCardHandleInternal<Payload>)[PREVIEW_CARD_CONTROLLER_PROPERTY] = this;
      this.unsubscribeHandleOwner ??= this.handle.subscribeOwner(this.owner as never);
      return;
    }

    delete (this.handle as PreviewCardHandleInternal<Payload>)[PREVIEW_CARD_CONTROLLER_PROPERTY];
    this.unsubscribeHandleOwner?.();
    this.unsubscribeHandleOwner = null;
    this.handle = nextHandle;
    (this.handle as PreviewCardHandleInternal<Payload>)[PREVIEW_CARD_CONTROLLER_PROPERTY] = this;
    this.unsubscribeHandleOwner = this.handle.subscribeOwner(this.owner as never);
  }

  private notify() {
    this.listeners.forEach((listener) => {
      listener();
    });
  }
}

export class PreviewCardHandle<Payload = unknown> extends PopoverHandle<Payload> {
  override open(triggerId: string) {
    try {
      super.open(triggerId);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.startsWith('Base UI: PopoverHandle.open: No trigger found with id "')
      ) {
        throw new Error(
          error.message.replace('Base UI: PopoverHandle.open:', 'Base UI: PreviewCardHandle.open:'),
        );
      }

      throw error;
    }
  }
}

export function createPreviewCardHandle<Payload = unknown>() {
  return new PreviewCardHandle<Payload>();
}

class PreviewCardRootDirective<Payload = unknown> extends AsyncDirective {
  private latestProps: PreviewCardRootProps<Payload> | null = null;
  private readonly controller = new PreviewCardRootController<Payload>();

  render(_props: PreviewCardRootProps<Payload>) {
    return noChange;
  }

  override update(
    _part: Parameters<AsyncDirective['update']>[0],
    [props]: [PreviewCardRootProps<Payload>],
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
        open: props.open,
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

const previewCardRootDirective = directive(PreviewCardRootDirective);

abstract class PreviewCardPartDirective<Props, ElementType extends HTMLElement>
  extends AsyncDirective
  implements SubscriptionOwner
{
  protected latestProps: Props | null = null;
  protected controller: PreviewCardRootController<any> | null = null;
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
      if (isDetachedChildPartError(error)) {
        return;
      }

      rethrowIfStillConnected(error, this.isConnected);
    }
  }

  onControllerChange(nextController: PreviewCardRootController<any> | null) {
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

  protected setController(nextController: PreviewCardRootController<any> | null) {
    this.onControllerChange(nextController);
  }
}

class PreviewCardTriggerDirective<Payload = unknown>
  extends AsyncDirective
  implements SubscriptionOwner
{
  private latestProps: PreviewCardTriggerProps<Payload> | null = null;
  private handle: PreviewCardHandle<Payload> | undefined = undefined;
  private runtime: PreviewCardPopoverRuntime<Payload> | null = null;
  private controller: PreviewCardRootController<Payload> | null = null;
  private element: HTMLElement | null = null;
  private unregisterTrigger: (() => void) | null = null;
  private unsubscribeRuntime: (() => void) | null = null;
  private unsubscribeHandle: (() => void) | null = null;
  private generatedId = `${GENERATED_ID_PREFIX}-trigger-${(generatedPreviewCardId += 1)}`;
  private focusOpenTimeout: number | null = null;
  private focusCloseTimeout: number | null = null;

  render(_props: PreviewCardTriggerProps<Payload>) {
    return noChange;
  }

  override update(
    _part: Parameters<AsyncDirective['update']>[0],
    [props]: [PreviewCardTriggerProps<Payload>],
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
    this.clearFocusOpenTimeout();
    this.clearFocusCloseTimeout();
  }

  override reconnected() {}

  onControllerChange(_nextController: PreviewCardRootController<any> | null) {}

  private setRuntime(nextRuntime: PreviewCardPopoverRuntime<Payload> | null) {
    if (this.runtime === nextRuntime) {
      return;
    }

    this.unregisterTrigger?.();
    this.unregisterTrigger = null;
    this.unsubscribeRuntime?.();
    this.unsubscribeRuntime = null;
    this.runtime = nextRuntime;
    this.controller =
      (nextRuntime?.handle as PreviewCardHandleInternal<Payload> | undefined)?.[
        PREVIEW_CARD_CONTROLLER_PROPERTY
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
      rethrowIfStillConnected(error, this.isConnected);
    }
  }

  private syncHandle(handle: PreviewCardHandle<Payload> | undefined) {
    if (this.handle === handle) {
      return;
    }

    this.handle = handle;
    this.unsubscribeHandle?.();
    this.unsubscribeHandle = null;

    if (handle == null) {
      return;
    }

    this.controller =
      (handle as PreviewCardHandleInternal<Payload>)[PREVIEW_CARD_CONTROLLER_PROPERTY] ?? null;
    this.unsubscribeHandle = handle.subscribeOwner({
      onRuntimeChange: (nextRuntime: PreviewCardPopoverRuntime<Payload> | null) => {
        this.controller =
          (handle as PreviewCardHandleInternal<Payload>)[PREVIEW_CARD_CONTROLLER_PROPERTY] ?? null;
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
      disabled: false,
      payload: this.latestProps?.payload,
      openOnHover: true,
      delay: this.latestProps?.delay ?? OPEN_DELAY,
      closeDelay: this.latestProps?.closeDelay ?? CLOSE_DELAY,
    });
  }

  private resolveRuntimeFromElement() {
    if (this.element == null) {
      return this.runtime;
    }

    this.controller =
      findPreviewCardRootController(this.element) as PreviewCardRootController<Payload> | null;

    if (this.controller != null) {
      this.syncHandle(this.controller.handle);
    }

    this.setRuntime(this.controller?.getPopoverRuntime() ?? findPopoverRuntime(this.element));
    return this.runtime ?? this.controller?.getPopoverRuntime() ?? findPopoverRuntime(this.element);
  }

  private scheduleFocusOpen(delay: number, event: FocusEvent) {
    this.clearFocusOpenTimeout();

    const runtime = this.runtime;
    const element = this.element;
    if (runtime == null || element == null) {
      return;
    }

    const open = () => {
      this.focusOpenTimeout = null;
      runtime.openWithTrigger(this.getId(), event, 'trigger-focus', element);
    };

    if (delay <= 0) {
      open();
      return;
    }

    this.focusOpenTimeout = getDefaultView(element).setTimeout(open, delay);
  }

  private scheduleFocusClose(event: FocusEvent) {
    this.clearFocusCloseTimeout();

    const runtime = this.runtime;
    const element = this.element;
    if (runtime == null || element == null) {
      return;
    }

    const close = () => {
      this.focusCloseTimeout = null;

      if (runtime.getActiveTriggerId() !== this.getId()) {
        return;
      }

      const activeElement = getActiveElement(element.ownerDocument);
      const nextFocusedElement = event.relatedTarget ?? activeElement;

      if (
        containsElement(runtime.popupElement, activeElement) ||
        containsElement(element, activeElement) ||
        isTargetInsideEnabledTrigger(nextFocusedElement, runtime.getTriggerEntries())
      ) {
        return;
      }

      runtime.close(event, 'trigger-focus', element);
    };

    this.focusCloseTimeout = getDefaultView(element).setTimeout(close, 0);
  }

  private clearFocusOpenTimeout() {
    if (this.focusOpenTimeout != null) {
      getDefaultView(this.element).clearTimeout(this.focusOpenTimeout);
      this.focusOpenTimeout = null;
    }
  }

  private clearFocusCloseTimeout() {
    if (this.focusCloseTimeout != null) {
      getDefaultView(this.element).clearTimeout(this.focusCloseTimeout);
      this.focusCloseTimeout = null;
    }
  }

  private renderCurrent() {
    const props = this.latestProps ?? {};
    const {
      children,
      closeDelay,
      delay,
      handle: _handle,
      id: _id,
      payload: _payload,
      ref: forwardedRef,
      render,
      ...elementProps
    } = props as PreviewCardTriggerProps<Payload> & Record<string, unknown>;
    void _handle;
    void _id;
    void _payload;

    if (props.handle == null && this.controller == null) {
      if (this.element != null) {
        this.controller =
          findPreviewCardRootController(this.element) as PreviewCardRootController<Payload> | null;

        if (this.controller != null) {
          this.syncHandle(this.controller.handle);
        } else if (isHiddenPlaceholderElement(this.element)) {
          throw new Error(TRIGGER_CONTEXT_ERROR);
        } else {
          return noChange;
        }
      }

      return html`<span
        hidden
        ${ref((element) => {
          this.element = element as HTMLElement | null;
          if (element != null) {
            this.controller =
              findPreviewCardRootController(element) as PreviewCardRootController<Payload> | null;
            if (this.controller == null) {
              queueMicrotask(() => {
                if (this.element !== element || this.controller != null) {
                  return;
                }

                this.controller =
                  findPreviewCardRootController(element) as PreviewCardRootController<Payload> | null;
                if (this.controller != null) {
                  this.syncHandle(this.controller.handle);
                }
                this.requestRender();
              });
            } else {
              this.syncHandle(this.controller.handle);
              this.requestRender();
            }
          }
        })}
      ></span>`;
    }

    if (props.handle == null && this.controller != null) {
      this.syncHandle(this.controller.handle);
    }

    const runtime = this.runtime;
    this.controller =
      this.controller ??
      ((runtime?.handle as PreviewCardHandleInternal<Payload> | undefined)?.[
        PREVIEW_CARD_CONTROLLER_PROPERTY
      ] ?? null);
    const open = runtime?.getOpen() === true && runtime.getActiveTriggerId() === this.getId();

    if (runtime == null && props.handle == null && this.element != null) {
      this.controller =
        findPreviewCardRootController(this.element) as PreviewCardRootController<Payload> | null;
      if (this.controller != null) {
        this.syncHandle(this.controller.handle);
      }
      this.setRuntime(findPopoverRuntime(this.element));
    }

    if (runtime == null && props.handle == null && this.element == null) {
      // Wait for the element ref callback to resolve runtime/controller.
    }

    return useRender<PreviewCardTriggerState, HTMLElement>({
      defaultTagName: 'a',
      render: render as Parameters<typeof useRender<PreviewCardTriggerState, HTMLElement>>[0]['render'],
      ref: [
        (element) => {
          this.element = element;
          if (element != null && props.handle == null && this.controller != null) {
            this.syncHandle(this.controller.handle);
          }
          this.registerTrigger();
          assignRef(forwardedRef as Ref<HTMLElement>, element);
        },
      ],
      state: { open },
      props: {
        id: this.getId(),
        'data-popup-open': open ? '' : undefined,
        onFocus: (event: FocusEvent) => {
          const currentRuntime = this.runtime ?? this.resolveRuntimeFromElement();
          this.clearFocusCloseTimeout();

          if (currentRuntime != null) {
            if (currentRuntime.getOpen() && currentRuntime.getActiveTriggerId() === this.getId()) {
              // Already active.
            } else if (
              currentRuntime.getOpen() &&
              currentRuntime.getActiveTriggerId() !== this.getId()
            ) {
              this.clearFocusOpenTimeout();
              currentRuntime.openWithTrigger(
                this.getId(),
                event,
                'trigger-focus',
                this.element ?? undefined,
              );
            } else {
              this.scheduleFocusOpen(delay ?? OPEN_DELAY, event);
            }
          }

          (elementProps.onFocus as ((event: FocusEvent) => void) | undefined)?.(event);
        },
        onBlur: (event: FocusEvent) => {
          this.resolveRuntimeFromElement();
          this.clearFocusOpenTimeout();
          this.scheduleFocusClose(event);
          (elementProps.onBlur as ((event: FocusEvent) => void) | undefined)?.(event);
        },
        onMouseEnter: (event: MouseEvent) => {
          const currentRuntime = this.runtime ?? this.resolveRuntimeFromElement();
          this.clearFocusCloseTimeout();
          this.clearFocusOpenTimeout();

          if (currentRuntime != null) {
            currentRuntime.enterHoverRegion();

            if (currentRuntime.getOpen() && currentRuntime.getActiveTriggerId() === this.getId()) {
              // Already active.
            } else if (
              currentRuntime.getOpen() &&
              currentRuntime.getActiveTriggerId() !== this.getId()
            ) {
              currentRuntime.cancelHoverOpen();
              currentRuntime.openWithTrigger(
                this.getId(),
                event,
                'trigger-hover',
                this.element ?? undefined,
              );
            } else {
              currentRuntime.scheduleHoverOpen(this.getId(), delay ?? OPEN_DELAY, event);
            }
          }

          (elementProps.onMouseEnter as ((event: MouseEvent) => void) | undefined)?.(event);
        },
        onMouseLeave: (event: MouseEvent) => {
          (this.runtime ?? this.resolveRuntimeFromElement())?.leaveHoverRegion(
            event,
            closeDelay ?? CLOSE_DELAY,
          );
          (elementProps.onMouseLeave as ((event: MouseEvent) => void) | undefined)?.(event);
        },
        ...(children === undefined ? elementProps : { ...elementProps, children }),
      },
    });
  }
}

const previewCardTriggerDirective = directive(PreviewCardTriggerDirective);

class PreviewCardPortalDirective extends PreviewCardPartDirective<PreviewCardPortalProps, HTMLSpanElement> {
  render(_props: PreviewCardPortalProps) {
    return noChange;
  }

  override update(
    _part: Parameters<AsyncDirective['update']>[0],
    [props]: [PreviewCardPortalProps],
  ) {
    this.latestProps = props;
    return this.renderCurrent();
  }

  renderCurrent() {
    const props = this.latestProps ?? {};

    if (this.controller == null) {
      return html`<span
        hidden
        ${ref((element) => {
          this.element = element as HTMLSpanElement | null;
          if (element != null) {
            this.setController(findPreviewCardRootController(element));
            if (this.controller == null) {
              queueMicrotask(() => {
                if (this.element !== element || this.controller != null) {
                  return;
                }

                this.setController(findPreviewCardRootController(element));
              });
            }
          }
        })}
      ></span>`;
    }

    return Popover.Portal({
      ...(props as PopoverPortalProps),
      handle: this.controller.handle,
    });
  }
}

const previewCardPortalDirective = directive(PreviewCardPortalDirective);

class PreviewCardPositionerDirective extends PreviewCardPartDirective<
  PreviewCardPositionerProps,
  HTMLDivElement
> {
  render(_props: PreviewCardPositionerProps) {
    return noChange;
  }

  override update(
    _part: Parameters<AsyncDirective['update']>[0],
    [props]: [PreviewCardPositionerProps],
  ) {
    this.latestProps = props;
    return this.renderCurrent();
  }

  renderCurrent() {
    const props = this.latestProps ?? {};

    return Popover.Positioner({
      ...(props as PopoverPositionerProps),
      'data-instant': this.controller?.getInstantType(),
      ref: [
        (element: HTMLDivElement | null) => {
          this.element = element;
          if (element != null) {
            this.setController(findPreviewCardRootController(element));
          }
          assignRef(props.ref as Ref<HTMLDivElement>, element);
        },
      ],
    });
  }
}

const previewCardPositionerDirective = directive(PreviewCardPositionerDirective);

class PreviewCardPopupDirective extends PreviewCardPartDirective<PreviewCardPopupProps, HTMLDivElement> {
  render(_props: PreviewCardPopupProps) {
    return noChange;
  }

  override update(
    _part: Parameters<AsyncDirective['update']>[0],
    [props]: [PreviewCardPopupProps],
  ) {
    this.latestProps = props;
    return this.renderCurrent();
  }

  renderCurrent() {
    const props = this.latestProps ?? {};
    const propsRecord = props as PreviewCardPopupProps & Record<string, unknown>;

    return Popover.Popup({
      ...(props as PopoverPopupProps),
      initialFocus: false,
      role: propsRecord.role as string | undefined,
      tabindex: propsRecord.tabindex as string | undefined,
      'aria-labelledby': propsRecord['aria-labelledby'] as string | undefined,
      'aria-describedby': propsRecord['aria-describedby'] as string | undefined,
      'data-instant': this.controller?.getInstantType(),
      ref: [
        (element: HTMLDivElement | null) => {
          this.element = element;
          if (element != null) {
            this.setController(findPreviewCardRootController(element));
          }
          assignRef(props.ref as Ref<HTMLDivElement>, element);
        },
      ],
    });
  }
}

const previewCardPopupDirective = directive(PreviewCardPopupDirective);

class PreviewCardArrowDirective extends PreviewCardPartDirective<PreviewCardArrowProps, HTMLDivElement> {
  render(_props: PreviewCardArrowProps) {
    return noChange;
  }

  override update(
    _part: Parameters<AsyncDirective['update']>[0],
    [props]: [PreviewCardArrowProps],
  ) {
    this.latestProps = props;
    return this.renderCurrent();
  }

  renderCurrent() {
    const props = this.latestProps ?? {};
    const {
      children,
      ref: forwardedRef,
      render,
      ...elementProps
    } = props as PreviewCardArrowProps & Record<string, unknown>;
    const runtime = this.controller?.getPopoverRuntime();
    if (runtime != null && this.element != null) {
      runtime.setArrowElement(this.element);
    }
    const position = runtime?.getPositionState();
    const state = {
      open: runtime?.getOpen() ?? false,
      side: position?.side ?? 'bottom',
      align: position?.align ?? 'center',
      uncentered: position?.arrowUncentered ?? false,
    } satisfies PreviewCardArrowState;

    return useRender<PreviewCardArrowState, HTMLDivElement>({
      defaultTagName: 'div',
      render: render as Parameters<typeof useRender<PreviewCardArrowState, HTMLDivElement>>[0]['render'],
      ref: [
        (element) => {
          this.element = element;
          if (element != null) {
            this.setController(findPreviewCardRootController(element));
            this.controller?.getPopoverRuntime()?.setArrowElement(element);
          }
          assignRef(forwardedRef as Ref<HTMLDivElement>, element);
        },
      ],
      state,
      props: {
        'aria-hidden': 'true',
        'data-open': state.open ? '' : undefined,
        'data-closed': state.open ? undefined : '',
        'data-side': state.side,
        'data-align': state.align,
        'data-uncentered': state.uncentered ? '' : undefined,
        ...(children === undefined ? elementProps : { ...elementProps, children }),
      },
    });
  }
}

const previewCardArrowDirective = directive(PreviewCardArrowDirective);

class PreviewCardViewportDirective extends PreviewCardPartDirective<
  PreviewCardViewportProps,
  HTMLDivElement
> {
  render(_props: PreviewCardViewportProps) {
    return noChange;
  }

  override update(
    _part: Parameters<AsyncDirective['update']>[0],
    [props]: [PreviewCardViewportProps],
  ) {
    this.latestProps = props;
    return this.renderCurrent();
  }

  renderCurrent() {
    const props = this.latestProps ?? {};

    return Popover.Viewport({
      ...(props as PopoverViewportProps),
      'data-instant': this.controller?.getInstantType(),
      ref: [
        (element: HTMLDivElement | null) => {
          this.element = element;
          if (element != null) {
            this.setController(findPreviewCardRootController(element));
          }
          assignRef(props.ref as Ref<HTMLDivElement>, element);
        },
      ],
    });
  }
}

const previewCardViewportDirective = directive(PreviewCardViewportDirective);

export interface PreviewCardRootState {}

export interface PreviewCardRootProps<Payload = unknown> {
  defaultOpen?: boolean | undefined;
  open?: boolean | undefined;
  onOpenChange?:
    | ((open: boolean, eventDetails: PreviewCardRootChangeEventDetails) => void)
    | undefined;
  onOpenChangeComplete?: ((open: boolean) => void) | undefined;
  actionsRef?: RefObject<PreviewCardRootActions | null> | undefined;
  handle?: PreviewCardHandle<Payload> | undefined;
  children?: RootChildren<Payload>;
  triggerId?: string | null | undefined;
  defaultTriggerId?: string | null | undefined;
}

export type PreviewCardRootChangeEventReason = PreviewCardChangeReason;
export type PreviewCardRootChangeEventDetails = BaseUIChangeEventDetails<
  PreviewCardRootChangeEventReason,
  { preventUnmountOnClose(): void }
>;
export type PreviewCardRootActions = PopoverRootActions;

export namespace PreviewCardRoot {
  export type State = PreviewCardRootState;
  export type Props<Payload = unknown> = PreviewCardRootProps<Payload>;
  export type Actions = PreviewCardRootActions;
  export type ChangeEventReason = PreviewCardRootChangeEventReason;
  export type ChangeEventDetails = PreviewCardRootChangeEventDetails;
}

export interface PreviewCardTriggerState {
  open: boolean;
}

export type PreviewCardTriggerProps<Payload = unknown> = ComponentPropsWithChildren<
  'a',
  PreviewCardTriggerState
> & {
  handle?: PreviewCardHandle<Payload> | undefined;
  payload?: Payload | undefined;
  delay?: number | undefined;
  closeDelay?: number | undefined;
  id?: string | undefined;
};

export namespace PreviewCardTrigger {
  export type State = PreviewCardTriggerState;
  export type Props<Payload = unknown> = PreviewCardTriggerProps<Payload>;
}

export interface PreviewCardPortalState {}

export type PreviewCardPortalProps = Omit<PopoverPortalProps, 'handle'>;

export namespace PreviewCardPortal {
  export type State = PreviewCardPortalState;
  export type Props = PreviewCardPortalProps;
}

export interface PreviewCardPositionerState {
  open: boolean;
  side: Side;
  align: Align;
  anchorHidden: boolean;
  instant: PreviewCardInstantType;
}

export type PreviewCardPositionerProps = PopoverPositionerProps;

export namespace PreviewCardPositioner {
  export type State = PreviewCardPositionerState;
  export type Props = PreviewCardPositionerProps;
}

export interface PreviewCardPopupState {
  open: boolean;
  side: Side;
  align: Align;
  instant: PreviewCardInstantType;
  transitionStatus: TransitionStatus;
}

export type PreviewCardPopupProps = Omit<PopoverPopupProps, 'initialFocus' | 'finalFocus'>;

export namespace PreviewCardPopup {
  export type State = PreviewCardPopupState;
  export type Props = PreviewCardPopupProps;
}

export interface PreviewCardArrowState {
  open: boolean;
  side: Side;
  align: Align;
  uncentered: boolean;
}

export type PreviewCardArrowProps = PopoverArrowProps;

export namespace PreviewCardArrow {
  export type State = PreviewCardArrowState;
  export type Props = PreviewCardArrowProps;
}

export interface PreviewCardBackdropState {
  open: boolean;
  transitionStatus: TransitionStatus;
}

export type PreviewCardBackdropProps = PopoverBackdropProps;

export namespace PreviewCardBackdrop {
  export type State = PreviewCardBackdropState;
  export type Props = PreviewCardBackdropProps;
}

export interface PreviewCardViewportState {
  activationDirection: string | undefined;
  transitioning: boolean;
  instant: PreviewCardInstantType;
}

export type PreviewCardViewportProps = PopoverViewportProps;

export namespace PreviewCardViewport {
  export type State = PreviewCardViewportState;
  export type Props = PreviewCardViewportProps;
}

export function PreviewCardRoot<Payload = unknown>(props: PreviewCardRootProps<Payload>) {
  return html`${previewCardRootDirective(props)}`;
}

export function PreviewCardTrigger<Payload = unknown>(props: PreviewCardTriggerProps<Payload>) {
  return html`${previewCardTriggerDirective(props)}`;
}

export function PreviewCardPortal(props: PreviewCardPortalProps) {
  return html`${previewCardPortalDirective(props)}`;
}

export function PreviewCardPositioner(props: PreviewCardPositionerProps) {
  return html`${previewCardPositionerDirective(props)}`;
}

export function PreviewCardPopup(props: PreviewCardPopupProps) {
  return html`${previewCardPopupDirective(props)}`;
}

export function PreviewCardArrow(props: PreviewCardArrowProps) {
  return html`${previewCardArrowDirective(props)}`;
}

export function PreviewCardBackdrop(props: PreviewCardBackdropProps) {
  return Popover.Backdrop({
    ...(props as PopoverBackdropProps),
    style: mergeStyle(props.style, {
      pointerEvents: 'none',
      userSelect: 'none',
      WebkitUserSelect: 'none',
    }),
  });
}

export function PreviewCardViewport(props: PreviewCardViewportProps) {
  return html`${previewCardViewportDirective(props)}`;
}

export const PreviewCard = {
  Root: PreviewCardRoot,
  Trigger: PreviewCardTrigger,
  Portal: PreviewCardPortal,
  Positioner: PreviewCardPositioner,
  Popup: PreviewCardPopup,
  Arrow: PreviewCardArrow,
  Backdrop: PreviewCardBackdrop,
  Viewport: PreviewCardViewport,
  createHandle: createPreviewCardHandle,
  Handle: PreviewCardHandle,
};
