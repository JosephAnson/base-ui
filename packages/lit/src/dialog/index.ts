import { html, noChange, nothing, type TemplateResult } from 'lit';
// eslint-disable-next-line import/extensions
import { AsyncDirective, directive } from 'lit/async-directive.js';
// eslint-disable-next-line import/extensions
import { ref } from 'lit/directives/ref.js';
import {
  Popover,
  type PopoverBackdropProps,
  type PopoverBackdropState,
  type PopoverHandle,
  type PopoverPortalProps,
  type PopoverPopupProps,
  type PopoverPopupState,
  type PopoverRootChangeEventDetails,
  type PopoverRootProps,
  type PopoverRootActions,
  type PopoverTitleProps,
  type PopoverDescriptionProps,
  type PopoverTriggerProps,
  type PopoverTriggerState,
} from '../popover/index.ts';
import type { BaseUIChangeEventDetails, HTMLProps } from '../types/index.ts';
import { useRender, type StateAttributesMapping } from '../use-render/index.ts';

const POPOVER_RUNTIME_PROPERTY = '__baseUiPopoverRuntime';
const DIALOG_CONTROLLER_PROPERTY = '__baseUiDialogController';
const DIALOG_POPUP_ROLE_PROPERTY = '__baseUiDialogPopupRole';
const ROOT_ATTRIBUTE = 'data-base-ui-dialog-root';
const POPUP_NESTED_DIALOGS_CSS_VAR = '--nested-dialogs';
const DATA_OPEN = { 'data-open': '' };
const DATA_CLOSED = { 'data-closed': '' };
const DATA_STARTING_STYLE = { 'data-starting-style': '' };
const DATA_ENDING_STYLE = { 'data-ending-style': '' };
const DIALOG_HANDLE_BRAND = Symbol('base-ui-dialog-handle');
const MANUAL_TRIGGER_ID = '__base-ui-dialog-manual-trigger__';
const DIALOG_TRIGGER_CONTEXT_ERROR =
  'Base UI: <Dialog.Trigger> must be used within <Dialog.Root> or provided with a handle.';
const COMPOSITE_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End']);

type Modal = boolean | 'trap-focus';
type DialogPopupRole = 'dialog' | 'alertdialog';
type TransitionStatus = 'starting' | 'ending' | undefined;
type ChangeReason =
  | 'trigger-press'
  | 'outside-press'
  | 'escape-key'
  | 'close-press'
  | 'focus-out'
  | 'imperative-action'
  | 'none';
type InteractionType = 'mouse' | 'touch' | 'pen' | 'keyboard' | null;

type RefObject<T> = {
  current: T | null;
};

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

type RootRuntimeElement = HTMLElement & {
  [POPOVER_RUNTIME_PROPERTY]?: PopoverRuntime<any> | undefined;
  [DIALOG_CONTROLLER_PROPERTY]?: DialogController<any> | undefined;
};

interface PopoverRuntime<Payload = unknown> {
  subscribe(listener: () => void): () => void;
  getOpen(): boolean;
  isMounted(): boolean;
  getModal(): Modal;
  getOpenMethod(): InteractionType;
  getPayload(): Payload | undefined;
  getPopupId(): string;
  getTitleId(): string | undefined;
  getDescriptionId(): string | undefined;
  getTransitionStatus(): TransitionStatus;
  getPortalKeepMounted(): boolean;
  getActiveTriggerId(): string | null;
  openWithTrigger(
    triggerId: string | null,
    event: Event | undefined,
    reason: ChangeReason,
    sourceElement?: Element | undefined,
  ): void;
  close(event: Event | undefined, reason: ChangeReason, sourceElement?: Element | undefined): void;
  setBackdropElement(element: HTMLDivElement | null): void;
  setPositionerElement(element: HTMLElement | null): void;
  registerClosePart(): () => void;
}

const dialogControllersByRuntime = new WeakMap<PopoverRuntime<any>, DialogController<any>>();
const openDialogControllers: DialogController<any>[] = [];

interface SubscriptionOwner {
  onControllerChange(nextController: DialogController<any> | null): void;
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

function isDetachedChildPartError(error: unknown) {
  return (
    error instanceof Error &&
    error.message.includes('ChildPart') &&
    error.message.includes('no `parentNode`')
  );
}

function findPopoverRuntime(node: Node | null): PopoverRuntime<any> | null {
  let current: Node | null = node;

  while (current != null) {
    if (
      current instanceof HTMLElement &&
      (current as RootRuntimeElement)[POPOVER_RUNTIME_PROPERTY] != null
    ) {
      return (current as RootRuntimeElement)[POPOVER_RUNTIME_PROPERTY] ?? null;
    }

    current = getComposedParent(current);
  }

  return null;
}

function findDialogController(node: Node | null): DialogController<any> | null {
  let current: Node | null = node;

  while (current != null) {
    if (
      current instanceof HTMLElement &&
      (current as RootRuntimeElement)[DIALOG_CONTROLLER_PROPERTY] != null
    ) {
      return (current as RootRuntimeElement)[DIALOG_CONTROLLER_PROPERTY] ?? null;
    }

    const runtime = findPopoverRuntime(current);
    if (runtime != null) {
      return dialogControllersByRuntime.get(runtime) ?? null;
    }

    current = getComposedParent(current);
  }

  return null;
}

function addOpenDialogController(controller: DialogController<any>) {
  removeOpenDialogController(controller);
  openDialogControllers.push(controller);
}

function removeOpenDialogController(controller: DialogController<any>) {
  const index = openDialogControllers.indexOf(controller);
  if (index !== -1) {
    openDialogControllers.splice(index, 1);
  }
}

function getTopmostOpenDialogController() {
  return openDialogControllers.at(-1) ?? null;
}

function isDismissableOutsidePressEvent(event: Event | undefined) {
  if (event == null) {
    return true;
  }

  if ('button' in event && typeof event.button === 'number' && event.button !== 0) {
    return false;
  }

  if ('touches' in event) {
    const touchEvent = event as TouchEvent;
    if (touchEvent.touches.length !== 1) {
      return false;
    }
  }

  return true;
}

function composeStateAttributes(
  state: Record<string, unknown>,
  mapping: StateAttributesMapping<Record<string, unknown>>,
) {
  const attributes: Record<string, string> = {};

  Object.keys(mapping).forEach((key) => {
    const mapValue = mapping[key];
    if (mapValue == null) {
      return;
    }

    const value = mapValue(state[key]);
    if (value != null) {
      Object.assign(attributes, value);
    }
  });

  return attributes;
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

function chainHandlers<EventType extends Event>(
  first: ((event: EventType) => void) | ((event: EventType) => unknown) | undefined,
  second: ((event: EventType) => void) | undefined,
) {
  if (first == null && second == null) {
    return undefined;
  }

  return (event: EventType) => {
    first?.(event);
    second?.(event);
  };
}

const popupStateAttributes: StateAttributesMapping<Record<string, unknown>> = {
  open(value) {
    return value ? DATA_OPEN : DATA_CLOSED;
  },
  transitionStatus(value) {
    if (value === 'starting') {
      return DATA_STARTING_STYLE;
    }

    if (value === 'ending') {
      return DATA_ENDING_STYLE;
    }

    return null;
  },
};

const dialogPopupStateAttributes: StateAttributesMapping<Record<string, unknown>> = {
  ...popupStateAttributes,
  nested(value) {
    return value ? { 'data-nested': '' } : null;
  },
  nestedDialogOpen(value) {
    return value ? { 'data-nested-dialog-open': '' } : null;
  },
};

const closeStateAttributes: StateAttributesMapping<Record<string, unknown>> = {
  disabled(value) {
    return value ? { 'data-disabled': '' } : null;
  },
};

const triggerStateAttributes: StateAttributesMapping<Record<string, unknown>> = {
  open(value) {
    return value ? { 'data-popup-open': '' } : null;
  },
};

class DialogController<Payload = unknown> {
  private latestProps: DialogRootProps<Payload> | null = null;
  private listeners = new Set<() => void>();
  private runtime: PopoverRuntime<Payload> | null = null;
  private unsubscribeRuntime: (() => void) | null = null;
  private rootElement: HTMLElement | null = null;
  private parentController: DialogController<any> | null = null;
  private childSpans = new Map<DialogController<any>, number>();
  private descendantOpenCount = 0;
  private internalBackdropElement: HTMLDivElement | null = null;
  private userBackdropElement: HTMLDivElement | null = null;
  private viewportElement: HTMLElement | null = null;
  private popupProxyElement: HTMLElement | null = null;
  private hasManualPayload = false;
  private manualPayload: Payload | undefined = undefined;
  private pendingOpen = false;
  private pendingTriggerId: string | null = null;
  private trackedAsOpen = false;

  setLatestProps(props: DialogRootProps<Payload>) {
    this.latestProps = props;
    this.syncRuntimePopupRole();
    this.syncOpenStack();
    this.notify();
  }

  setRootElement(element: HTMLElement | null) {
    if (element == null && this.rootElement != null) {
      return;
    }

    if (this.rootElement === element) {
      return;
    }

    if (this.rootElement != null) {
      delete (this.rootElement as RootRuntimeElement)[DIALOG_CONTROLLER_PROPERTY];
    }

    this.rootElement = element;

    if (this.rootElement != null) {
      (this.rootElement as RootRuntimeElement)[DIALOG_CONTROLLER_PROPERTY] = this;
      this.setRuntime(findPopoverRuntime(this.rootElement));
    } else {
      this.setRuntime(null);
    }

    this.syncParentController();
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getRuntime() {
    return this.runtime;
  }

  getOpen() {
    return this.runtime?.getOpen() ?? (this.pendingOpen || Boolean(this.latestProps?.open));
  }

  isMounted() {
    return (
      this.runtime?.isMounted() ??
      (this.pendingOpen || Boolean(this.latestProps?.open ?? this.latestProps?.defaultOpen))
    );
  }

  getModal() {
    return this.latestProps?.modal ?? true;
  }

  getOpenMethod() {
    return this.runtime?.getOpenMethod() ?? null;
  }

  getTransitionStatus() {
    return this.runtime?.getTransitionStatus();
  }

  getPortalKeepMounted() {
    return this.runtime?.getPortalKeepMounted() ?? false;
  }

  getPopupRole(): DialogPopupRole {
    return (
      (this.latestProps as (DialogRootProps<Payload> & {
        [DIALOG_POPUP_ROLE_PROPERTY]?: DialogPopupRole | undefined;
      }) | null)?.[DIALOG_POPUP_ROLE_PROPERTY] ??
      (this.latestProps?.handle as
        | { [DIALOG_POPUP_ROLE_PROPERTY]?: DialogPopupRole | undefined }
        | undefined)?.[DIALOG_POPUP_ROLE_PROPERTY] ??
      'dialog'
    );
  }

  getPopupId() {
    return this.runtime?.getPopupId();
  }

  getTitleId() {
    return this.runtime?.getTitleId();
  }

  getDescriptionId() {
    return this.runtime?.getDescriptionId();
  }

  isNested() {
    return this.parentController != null;
  }

  getNestedOpenDialogCount() {
    return this.descendantOpenCount;
  }

  isTopmostOpenDialog() {
    return getTopmostOpenDialogController() === this;
  }

  getViewportElement() {
    return this.viewportElement;
  }

  resolvePayload(payload: Payload | undefined) {
    const activeTriggerId = this.runtime?.getActiveTriggerId() ?? null;

    if (activeTriggerId != null && activeTriggerId !== MANUAL_TRIGGER_ID) {
      this.hasManualPayload = false;
      this.manualPayload = undefined;
      return payload;
    }

    if (this.hasManualPayload) {
      return this.manualPayload;
    }

    if (payload !== undefined) {
      return payload;
    }

    return payload;
  }

  open(triggerId: string | null) {
    this.hasManualPayload = false;
    this.manualPayload = undefined;
    this.pendingOpen = true;
    this.pendingTriggerId = triggerId;
    this.syncOpenStack();
    this.notify();
  }

  openWithPayload(payload: Payload) {
    this.hasManualPayload = true;
    this.manualPayload = payload;
    this.pendingOpen = true;
    this.pendingTriggerId = null;
    this.syncOpenStack();
    this.notify();
  }

  close() {
    this.pendingOpen = false;
    this.pendingTriggerId = null;
    if (this.runtime != null) {
      this.runtime.close(undefined, 'imperative-action', undefined);
    }
    this.syncOpenStack();
    this.notify();
  }

  setInternalBackdropElement(element: HTMLDivElement | null) {
    this.internalBackdropElement = element;
    this.syncBackdropTarget();
  }

  setUserBackdropElement(element: HTMLDivElement | null) {
    this.userBackdropElement = element;
    this.syncBackdropTarget();
  }

  setViewportElement(element: HTMLElement | null) {
    this.viewportElement = element;
    this.syncPositionerTarget();
    this.notify();
  }

  setPopupProxyElement(element: HTMLElement | null) {
    this.popupProxyElement = element;
    this.syncPositionerTarget();
  }

  disconnect() {
    this.unsubscribeRuntime?.();
    this.unsubscribeRuntime = null;
    removeOpenDialogController(this);
    this.trackedAsOpen = false;

    if (this.runtime != null) {
      dialogControllersByRuntime.delete(this.runtime);
    }

    this.runtime = null;
    if (this.rootElement != null) {
      delete (this.rootElement as RootRuntimeElement)[DIALOG_CONTROLLER_PROPERTY];
      this.rootElement = null;
    }
    this.setParentController(null);
  }

  private setRuntime(nextRuntime: PopoverRuntime<Payload> | null) {
    if (this.runtime === nextRuntime) {
      return;
    }

    this.unsubscribeRuntime?.();
    this.unsubscribeRuntime = null;

    if (this.runtime != null) {
      dialogControllersByRuntime.delete(this.runtime);
    }

    this.runtime = nextRuntime;

    if (nextRuntime != null) {
      this.pendingOpen = nextRuntime.getOpen();
      this.syncRuntimePopupRole();
      dialogControllersByRuntime.set(nextRuntime, this);
      this.unsubscribeRuntime = nextRuntime.subscribe(() => {
        this.pendingOpen = nextRuntime.getOpen();
        this.syncOpenStack();
        this.syncParentSpan();
        this.notify();
      });
    }

    this.syncBackdropTarget();
    this.syncOpenStack();
    this.syncPositionerTarget();
    this.syncParentSpan();
    this.notify();
  }

  private syncRuntimePopupRole() {
    if (this.runtime == null) {
      return;
    }

    (
      this.runtime as PopoverRuntime<Payload> & {
        [DIALOG_POPUP_ROLE_PROPERTY]?: DialogPopupRole | undefined;
      }
    )[DIALOG_POPUP_ROLE_PROPERTY] = this.getPopupRole();
  }

  syncAcceptedOpenState(open: boolean) {
    this.pendingOpen = open;
    if (!open) {
      this.pendingTriggerId = null;
    }
    this.syncOpenStack();
  }

  private syncOpenStack() {
    const open = this.getOpen();

    if (open === this.trackedAsOpen) {
      return;
    }

    this.trackedAsOpen = open;

    if (open) {
      addOpenDialogController(this);
      return;
    }

    removeOpenDialogController(this);
  }

  private syncParentController() {
    let nextParent: DialogController<any> | null = null;
    let current = this.rootElement == null ? null : getComposedParent(this.rootElement);

    while (current != null) {
      if (
        current instanceof HTMLElement &&
        (current as RootRuntimeElement)[DIALOG_CONTROLLER_PROPERTY] != null
      ) {
        const candidate = (current as RootRuntimeElement)[DIALOG_CONTROLLER_PROPERTY] ?? null;
        if (candidate != null && candidate !== this) {
          nextParent = candidate;
          break;
        }
      }

      const runtime = findPopoverRuntime(current);
      const candidate = runtime == null ? null : (dialogControllersByRuntime.get(runtime) ?? null);
      if (candidate != null && candidate !== this) {
        nextParent = candidate;
        break;
      }

      current = getComposedParent(current);
    }

    this.setParentController(nextParent);
  }

  private setParentController(nextParent: DialogController<any> | null) {
    if (this.parentController === nextParent) {
      return;
    }

    if (this.parentController != null) {
      this.parentController.childSpans.delete(this);
      this.parentController.recalculateDescendantOpenCount();
    }

    this.parentController = nextParent;

    if (this.parentController != null) {
      this.parentController.childSpans.set(this, this.getOpenSpan());
      this.parentController.recalculateDescendantOpenCount();
    }

    this.notify();
  }

  private getOpenSpan() {
    return (this.getOpen() ? 1 : 0) + this.descendantOpenCount;
  }

  private syncParentSpan() {
    if (this.parentController == null) {
      return;
    }

    const nextSpan = this.getOpenSpan();
    if (nextSpan === 0) {
      this.parentController.childSpans.delete(this);
    } else {
      this.parentController.childSpans.set(this, nextSpan);
    }
    this.parentController.recalculateDescendantOpenCount();
  }

  private recalculateDescendantOpenCount() {
    const nextCount = Array.from(this.childSpans.values()).reduce((sum, value) => sum + value, 0);

    if (nextCount === this.descendantOpenCount) {
      return;
    }

    this.descendantOpenCount = nextCount;
    this.syncParentSpan();
    this.notify();
  }

  private syncBackdropTarget() {
    this.runtime?.setBackdropElement(this.userBackdropElement ?? this.internalBackdropElement);
  }

  private syncPositionerTarget() {
    this.runtime?.setPositionerElement(this.viewportElement ?? this.popupProxyElement);
  }

  private notify() {
    this.listeners.forEach((listener) => {
      listener();
    });
  }
}

export interface DialogHandle<Payload = unknown> {
  readonly [DIALOG_HANDLE_BRAND]: true;
  open(triggerId: string | null): void;
  openWithPayload(payload: Payload): void;
  close(): void;
  readonly isOpen: boolean;
}

class DialogHandleImpl<Payload = unknown> implements DialogHandle<Payload> {
  readonly [DIALOG_HANDLE_BRAND] = true as const;
  readonly popoverHandle: PopoverHandle<Payload>;
  private controller: DialogController<Payload> | null = null;
  private owners = new Set<SubscriptionOwner>();
  private popoverRuntime: PopoverRuntime<Payload> | null = null;
  private pendingOpen = false;
  private pendingTriggerId: string | null = null;
  private hasPendingPayload = false;
  private pendingPayload: Payload | undefined = undefined;

  constructor() {
    this.popoverHandle = Popover.createHandle<Payload>();
    this.popoverHandle.subscribeOwner({
      onRuntimeChange: (runtime) => {
        this.popoverRuntime = runtime;

        if (runtime == null || !this.pendingOpen) {
          return;
        }

        runtime.openWithTrigger(
          this.hasPendingPayload || this.pendingTriggerId == null
            ? MANUAL_TRIGGER_ID
            : this.pendingTriggerId,
          undefined,
          'imperative-action',
          undefined,
        );
      },
    });
  }

  setController(controller: DialogController<Payload> | null) {
    if (this.controller === controller) {
      return;
    }

    if (controller == null && this.controller != null) {
      this.pendingOpen = this.controller.getOpen();
    }

    this.controller = controller;
    this.owners.forEach((owner) => {
      owner.onControllerChange(controller);
    });

    if (controller == null) {
      return;
    }

    if (this.pendingOpen) {
      if (this.hasPendingPayload) {
        controller.openWithPayload(this.pendingPayload as Payload);
      } else {
        controller.open(this.pendingTriggerId);
      }
    }
  }

  subscribeOwner(owner: SubscriptionOwner) {
    this.owners.add(owner);
    owner.onControllerChange(this.controller);
    return () => {
      this.owners.delete(owner);
    };
  }

  open(triggerId: string | null) {
    const resolvedTriggerId =
      triggerId != null && this.popoverHandle.getTriggerEntry(triggerId) == null ? null : triggerId;

    if (process.env.NODE_ENV !== 'production' && triggerId != null && resolvedTriggerId == null) {
      console.warn(
        `Base UI: DialogHandle.open: No trigger found with id "${triggerId}". The dialog will open, but the trigger will not be associated with the dialog.`,
      );
    }

    this.pendingOpen = true;
    this.pendingTriggerId = resolvedTriggerId;
    this.hasPendingPayload = false;
    this.pendingPayload = undefined;

    if (this.controller != null) {
      this.controller.open(resolvedTriggerId);
    }

    if (resolvedTriggerId == null) {
      this.popoverRuntime?.openWithTrigger(
        MANUAL_TRIGGER_ID,
        undefined,
        'imperative-action',
        undefined,
      );
    } else {
      this.popoverHandle.open(resolvedTriggerId);
    }
  }

  openWithPayload(payload: Payload) {
    this.pendingOpen = true;
    this.pendingTriggerId = null;
    this.hasPendingPayload = true;
    this.pendingPayload = payload;
    this.controller?.openWithPayload(payload);
    this.popoverRuntime?.openWithTrigger(
      MANUAL_TRIGGER_ID,
      undefined,
      'imperative-action',
      undefined,
    );
  }

  close() {
    this.pendingOpen = false;
    this.pendingTriggerId = null;
    this.hasPendingPayload = false;
    this.pendingPayload = undefined;

    if (this.controller != null) {
      this.controller.close();
    }

    this.popoverHandle.close();
  }

  get isOpen() {
    return this.controller?.getOpen() ?? this.pendingOpen;
  }
}

function getDialogHandleInternal<Payload = unknown>(handle: DialogHandle<Payload> | undefined) {
  if (handle instanceof DialogHandleImpl) {
    return handle;
  }

  return null;
}

function createDialogHandle<Payload = unknown>(): DialogHandle<Payload> {
  return new DialogHandleImpl<Payload>();
}

class DialogRootDirective<Payload = unknown> extends AsyncDirective {
  private controller = new DialogController<Payload>();
  private latestProps: DialogRootProps<Payload> | null = null;

  render(_componentProps: DialogRootProps<Payload>) {
    return noChange;
  }

  override update(
    _part: Parameters<AsyncDirective['update']>[0],
    [componentProps]: [DialogRootProps<Payload>],
  ) {
    this.latestProps = componentProps;
    this.controller.setLatestProps(componentProps);
    getDialogHandleInternal(componentProps.handle)?.setController(this.controller);
    return this.renderCurrent();
  }

  override disconnected() {
    getDialogHandleInternal(this.latestProps?.handle)?.setController(null);
    this.controller.disconnect();
  }

  override reconnected() {}

  private renderCurrent() {
    const props = this.latestProps;
    if (props == null) {
      return nothing;
    }

    const {
      actionsRef,
      children,
      defaultOpen,
      defaultTriggerId,
      disablePointerDismissal,
      handle,
      modal = true,
      onOpenChange,
      onOpenChangeComplete,
      open,
      triggerId,
    } = props;
    const popupRole = (
      props as DialogRootProps<Payload> & {
        [DIALOG_POPUP_ROLE_PROPERTY]?: DialogPopupRole | undefined;
      }
    )[DIALOG_POPUP_ROLE_PROPERTY];

    return Popover.Root<Payload>(
      {
        [DIALOG_POPUP_ROLE_PROPERTY]: popupRole,
        actionsRef: actionsRef as RefObject<PopoverRootActions | null> | undefined,
        defaultOpen,
        defaultTriggerId,
        handle: getDialogHandleInternal(handle)?.popoverHandle,
        modal,
        onOpenChange: (nextOpen: boolean, details: PopoverRootChangeEventDetails) => {
          const nestedEventController =
            details.event?.target instanceof Node ? findDialogController(details.event.target) : null;
          const topmostOpenDialogController = getTopmostOpenDialogController();

          if (
            !nextOpen &&
            (details.reason === 'outside-press' ||
              details.reason === 'focus-out' ||
              details.reason === 'escape-key') &&
            topmostOpenDialogController != null &&
            topmostOpenDialogController !== this.controller
          ) {
            details.cancel();
          }

          if (
            !nextOpen &&
            nestedEventController != null &&
            nestedEventController !== this.controller
          ) {
            details.cancel();
          }

          if (
            !nextOpen &&
            this.controller.getNestedOpenDialogCount() > 0 &&
            (details.reason === 'outside-press' ||
              details.reason === 'focus-out' ||
              details.reason === 'escape-key')
          ) {
            details.cancel();
          }

          if (
            !nextOpen &&
            details.reason === 'outside-press' &&
            !isDismissableOutsidePressEvent(details.event)
          ) {
            details.cancel();
          }

          if (!nextOpen && disablePointerDismissal === true && details.reason === 'outside-press') {
            details.cancel();
          }

          if (!nextOpen && disablePointerDismissal === true && details.reason === 'focus-out') {
            details.cancel();
          }

          onOpenChange?.(nextOpen, details as DialogRootChangeEventDetails);

          if (!details.isCanceled && open === undefined) {
            this.controller.syncAcceptedOpenState(nextOpen);
          }
        },
        onOpenChangeComplete,
        open,
        triggerId,
        children: ({ payload }: { payload: Payload | undefined }) => {
          const resolvedPayload = this.controller.resolvePayload(payload);

          return html`<div
            ${ref((element) => {
              this.controller.setRootElement(element as HTMLElement | null);
            })}
            ${ROOT_ATTRIBUTE}=""
            style="display: contents;"
          >
            ${typeof children === 'function' ? children({ payload: resolvedPayload }) : children}
          </div>`;
        },
      } as unknown as PopoverRootProps<Payload>,
    );
  }
}

const dialogRootDirective = directive(DialogRootDirective);

abstract class DialogControllerDirective<Props, ElementType extends HTMLElement>
  extends AsyncDirective
  implements SubscriptionOwner
{
  protected latestProps: Props | null = null;
  protected controller: DialogController<any> | null = null;
  protected element: ElementType | null = null;
  private unsubscribeController: (() => void) | null = null;
  protected abstract renderCurrent(): unknown;

  protected connectController(node: Node | null) {
    this.setController(findDialogController(node));
  }

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

      throw error;
    }
  }

  protected setController(nextController: DialogController<any> | null) {
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
    queueMicrotask(() => {
      this.requestRender();
    });
  }

  onControllerChange(nextController: DialogController<any> | null) {
    this.setController(nextController);
  }

  override disconnected() {
    this.unsubscribeController?.();
    this.unsubscribeController = null;
    this.element = null;
  }

  override reconnected() {}
}

class DialogBackdropDirective extends DialogControllerDirective<
  DialogBackdropProps,
  HTMLDivElement
> {
  render(_componentProps: DialogBackdropProps) {
    return noChange;
  }

  override update(
    _part: Parameters<AsyncDirective['update']>[0],
    [componentProps]: [DialogBackdropProps],
  ) {
    this.latestProps = componentProps;
    return this.renderCurrent();
  }

  override disconnected() {
    this.controller?.setUserBackdropElement(null);
    super.disconnected();
  }

  protected renderCurrent() {
    const props = this.latestProps ?? {};
    const { forceRender = false, render, ...popoverBackdropProps } = props;

    if (this.controller?.isNested() && !forceRender) {
      return nothing;
    }

    return Popover.Backdrop({
      ...popoverBackdropProps,
      render: (popoverProps: HTMLProps<HTMLDivElement>, popoverState: PopoverBackdropState) => {
        const state = {
          open: popoverState.open,
          transitionStatus: popoverState.transitionStatus,
        } satisfies DialogBackdropState;

        const stateAttributes = composeStateAttributes(
          state as Record<string, unknown>,
          popupStateAttributes,
        );
        const onClick = popoverProps.onClick as ((event: MouseEvent) => void) | undefined;

        return useRender<DialogBackdropState, HTMLDivElement>({
          defaultTagName: 'div',
          render: render as Parameters<
            typeof useRender<DialogBackdropState, HTMLDivElement>
          >[0]['render'],
          ref: [
            (element) => {
              this.element = element;
              if (element != null) {
                this.connectController(element);
              }
              this.controller?.setUserBackdropElement(element);
            },
          ],
          state,
          props: {
            ...popoverProps,
            onClick: (event: MouseEvent) => {
              if (!isDismissableOutsidePressEvent(event)) {
                return;
              }

              onClick?.(event);
            },
            ...stateAttributes,
          },
        });
      },
    } satisfies PopoverBackdropProps);
  }
}

const dialogBackdropDirective = directive(DialogBackdropDirective);

class DialogPopupDirective extends DialogControllerDirective<DialogPopupProps, HTMLDivElement> {
  private unregisterSyntheticClosePart: (() => void) | null = null;
  private requestedRuntimeSync = false;

  render(_componentProps: DialogPopupProps) {
    return noChange;
  }

  override update(
    _part: Parameters<AsyncDirective['update']>[0],
    [componentProps]: [DialogPopupProps],
  ) {
    this.latestProps = componentProps;
    return this.renderCurrent();
  }

  override disconnected() {
    this.requestedRuntimeSync = false;
    this.unregisterSyntheticClosePart?.();
    this.unregisterSyntheticClosePart = null;
    this.controller?.setPopupProxyElement(null);
    super.disconnected();
  }

  protected renderCurrent() {
    const props = this.latestProps ?? {};
    const { finalFocus, initialFocus, render, ...popoverPopupProps } = props;
    const runtime =
      this.controller?.getRuntime() ??
      ((this.element == null
        ? null
        : findPopoverRuntime(this.element)) as PopoverRuntime<any> | null);
    const popupRole =
      (popoverPopupProps as { role?: DialogPopupRole | undefined }).role ??
      (runtime as
        | (PopoverRuntime<any> & {
            [DIALOG_POPUP_ROLE_PROPERTY]?: DialogPopupRole | undefined;
          })
        | null)?.[DIALOG_POPUP_ROLE_PROPERTY] ??
      this.controller?.getPopupRole() ??
      'dialog';

    if (runtime == null || this.controller?.getModal() === false) {
      this.unregisterSyntheticClosePart?.();
      this.unregisterSyntheticClosePart = null;
    } else if (this.unregisterSyntheticClosePart == null) {
      this.unregisterSyntheticClosePart = runtime.registerClosePart();
    }

    return Popover.Popup({
      ...popoverPopupProps,
      finalFocus,
      initialFocus,
      role: popupRole,
      render: (popoverProps: HTMLProps<HTMLDivElement>, popoverState: PopoverPopupState) => {
        const nestedDialogOpen = (this.controller?.getNestedOpenDialogCount() ?? 0) > 0;
        const state = {
          open: popoverState.open,
          transitionStatus: popoverState.transitionStatus,
          nested: this.controller?.isNested() ?? false,
          nestedDialogOpen,
        } satisfies DialogPopupState;

        const style = mergeStyle(popoverProps.style, {
          [POPUP_NESTED_DIALOGS_CSS_VAR]: String(this.controller?.getNestedOpenDialogCount() ?? 0),
        });

        return useRender<DialogPopupState, HTMLDivElement>({
          defaultTagName: 'div',
          render: render as Parameters<
            typeof useRender<DialogPopupState, HTMLDivElement>
          >[0]['render'],
          ref: [
            (element) => {
              this.element = element;
              if (element != null) {
                this.connectController(element);
                const runtimePopupRole = (
                  findPopoverRuntime(element) as
                    | (PopoverRuntime<any> & {
                        [DIALOG_POPUP_ROLE_PROPERTY]?: DialogPopupRole | undefined;
                      })
                    | null
                )?.[DIALOG_POPUP_ROLE_PROPERTY];

                if (
                  (popoverPopupProps as { role?: DialogPopupRole | undefined }).role == null &&
                  runtimePopupRole != null
                ) {
                  element.setAttribute('role', runtimePopupRole);
                }
              }

              this.controller?.setPopupProxyElement(element);
              if (element != null && this.controller == null && !this.requestedRuntimeSync) {
                this.requestedRuntimeSync = true;
                queueMicrotask(() => {
                  this.requestRender();
                });
              }

              if (element == null) {
                this.unregisterSyntheticClosePart?.();
                this.unregisterSyntheticClosePart = null;
              }
            },
          ],
          state,
          stateAttributesMapping: dialogPopupStateAttributes,
          props: {
            ...popoverProps,
            onKeyDown: chainHandlers(
              popoverProps.onKeyDown as ((event: KeyboardEvent) => void) | undefined,
              (event: KeyboardEvent) => {
                if (COMPOSITE_KEYS.has(event.key)) {
                  event.stopPropagation();
                }
              },
            ),
            style,
          },
        });
      },
    } satisfies PopoverPopupProps);
  }
}

const dialogPopupDirective = directive(DialogPopupDirective);

class DialogViewportDirective extends DialogControllerDirective<
  DialogViewportProps,
  HTMLDivElement
> {
  render(_componentProps: DialogViewportProps) {
    return noChange;
  }

  override update(
    _part: Parameters<AsyncDirective['update']>[0],
    [componentProps]: [DialogViewportProps],
  ) {
    this.latestProps = componentProps;
    return this.renderCurrent();
  }

  override disconnected() {
    this.controller?.setViewportElement(null);
    super.disconnected();
  }

  protected renderCurrent() {
    const props = this.latestProps ?? {};
    const { render, ...elementProps } = props;
    const controller = this.controller;
    const open = controller?.getOpen() ?? false;
    const mounted = controller?.isMounted() ?? false;
    const shouldRender = controller == null || controller.getPortalKeepMounted() || mounted;

    if (!shouldRender && controller != null) {
      return nothing;
    }

    const state = {
      open,
      transitionStatus: controller?.getTransitionStatus(),
      nested: controller?.isNested() ?? false,
      nestedDialogOpen: (controller?.getNestedOpenDialogCount() ?? 0) > 0,
    } satisfies DialogViewportState;

    return useRender<DialogViewportState, HTMLDivElement>({
      defaultTagName: 'div',
      render: render as Parameters<
        typeof useRender<DialogViewportState, HTMLDivElement>
      >[0]['render'],
      ref: [
        (element) => {
          this.element = element;
          if (element != null) {
            this.connectController(element);
          }

          this.controller?.setViewportElement(element);
        },
      ],
      state,
      stateAttributesMapping: dialogPopupStateAttributes,
      props: {
        role: 'presentation',
        hidden: !mounted,
        style: {
          pointerEvents: open ? undefined : 'none',
        },
        ...elementProps,
      },
    });
  }
}

const dialogViewportDirective = directive(DialogViewportDirective);

class DialogInternalBackdropDirective extends DialogControllerDirective<{}, HTMLDivElement> {
  render() {
    return noChange;
  }

  override update() {
    return this.renderCurrent();
  }

  override disconnected() {
    this.controller?.setInternalBackdropElement(null);
    super.disconnected();
  }

  protected renderCurrent() {
    const controller = this.controller;

    if (controller == null) {
      return html`<span
        hidden
        ${ref((element) => {
          this.connectController(element as HTMLElement | null);
        })}
      ></span>`;
    }

    if (!controller.isMounted() || controller.getModal() !== true) {
      controller.setInternalBackdropElement(null);
      return nothing;
    }

    return html`<div
      ${ref((element) => {
        this.element = element as HTMLDivElement | null;
        controller.setInternalBackdropElement(this.element);
      })}
      data-base-ui-dialog-internal-backdrop=""
      role="presentation"
      inert=${controller.getOpen() ? nothing : ''}
      style=${mergeStyle(undefined, {
        position: 'fixed',
        inset: '0',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        pointerEvents: controller.getOpen() ? undefined : 'none',
      })}
      @click=${(event: MouseEvent) => {
        if (!isDismissableOutsidePressEvent(event)) {
          return;
        }
        controller.getRuntime()?.close(event, 'outside-press', undefined);
      }}
    ></div>`;
  }
}

const dialogInternalBackdropDirective = directive(DialogInternalBackdropDirective);

export interface DialogRootState {}

export interface DialogRootActions {
  close(): void;
  unmount(): void;
}

export interface DialogRootProps<Payload = unknown> {
  open?: boolean | undefined;
  defaultOpen?: boolean | undefined;
  modal?: Modal | undefined;
  onOpenChange?: ((open: boolean, eventDetails: DialogRootChangeEventDetails) => void) | undefined;
  onOpenChangeComplete?: ((open: boolean) => void) | undefined;
  disablePointerDismissal?: boolean | undefined;
  actionsRef?: RefObject<DialogRootActions | null> | undefined;
  handle?: DialogHandle<Payload> | undefined;
  children?: RootChildren<Payload>;
  triggerId?: string | null | undefined;
  defaultTriggerId?: string | null | undefined;
}

export type DialogRootChangeEventReason = ChangeReason;
export type DialogRootChangeEventDetails = BaseUIChangeEventDetails<
  DialogRootChangeEventReason,
  { preventUnmountOnClose(): void }
>;

export namespace DialogRoot {
  export type State = DialogRootState;
  export type Props<Payload = unknown> = DialogRootProps<Payload>;
  export type Actions = DialogRootActions;
  export type ChangeEventReason = DialogRootChangeEventReason;
  export type ChangeEventDetails = DialogRootChangeEventDetails;
}

export type DialogTriggerProps<Payload = unknown> = ComponentPropsWithChildren<
  'button',
  DialogTriggerState
> & {
  nativeButton?: boolean | undefined;
  handle?: DialogHandle<Payload> | undefined;
  payload?: Payload | undefined;
  id?: string | undefined;
  disabled?: boolean | undefined;
};

export interface DialogTriggerState {
  disabled: boolean;
  open: boolean;
}

export namespace DialogTrigger {
  export type State = DialogTriggerState;
  export type Props<Payload = unknown> = DialogTriggerProps<Payload>;
}

export interface DialogPortalState {}

export interface DialogPortalProps {
  children?: unknown;
  container?: PopoverPortalProps['container'];
  keepMounted?: boolean | undefined;
}

export namespace DialogPortal {
  export type State = DialogPortalState;
  export type Props = DialogPortalProps;
}

export interface DialogPopupState {
  open: boolean;
  transitionStatus: TransitionStatus;
  nested: boolean;
  nestedDialogOpen: boolean;
}

export interface DialogPopupProps extends ComponentPropsWithChildren<'div', DialogPopupState> {
  initialFocus?: PopoverPopupProps['initialFocus'];
  finalFocus?: PopoverPopupProps['finalFocus'];
}

export namespace DialogPopup {
  export type State = DialogPopupState;
  export type Props = DialogPopupProps;
}

export interface DialogBackdropState {
  open: boolean;
  transitionStatus: TransitionStatus;
}

export interface DialogBackdropProps extends ComponentPropsWithChildren<
  'div',
  DialogBackdropState
> {
  forceRender?: boolean | undefined;
}

export namespace DialogBackdrop {
  export type State = DialogBackdropState;
  export type Props = DialogBackdropProps;
}

export interface DialogTitleState {}

export interface DialogTitleProps extends ComponentPropsWithChildren<
  'h2',
  DialogTitleState,
  unknown,
  HTMLProps<HTMLHeadingElement>
> {}

export namespace DialogTitle {
  export type State = DialogTitleState;
  export type Props = DialogTitleProps;
}

export interface DialogDescriptionState {}

export interface DialogDescriptionProps extends ComponentPropsWithChildren<
  'p',
  DialogDescriptionState
> {}

export namespace DialogDescription {
  export type State = DialogDescriptionState;
  export type Props = DialogDescriptionProps;
}

export interface DialogCloseState {
  disabled: boolean;
}

export interface DialogCloseProps extends ComponentPropsWithChildren<'button', DialogCloseState> {
  nativeButton?: boolean | undefined;
  disabled?: boolean | undefined;
}

export namespace DialogClose {
  export type State = DialogCloseState;
  export type Props = DialogCloseProps;
}

export interface DialogViewportState {
  open: boolean;
  transitionStatus: TransitionStatus;
  nested: boolean;
  nestedDialogOpen: boolean;
}

export interface DialogViewportProps extends ComponentPropsWithChildren<
  'div',
  DialogViewportState
> {}

export namespace DialogViewport {
  export type State = DialogViewportState;
  export type Props = DialogViewportProps;
}

function renderDialogRoot<Payload = unknown>(props: DialogRootProps<Payload>) {
  return html`${dialogRootDirective(props)}`;
}

function renderDialogTrigger<Payload = unknown>(props: DialogTriggerProps<Payload>) {
  const { handle, render, ...rest } = props;

  return Popover.Trigger({
    ...(rest as PopoverTriggerProps<Payload>),
    handle: getDialogHandleInternal(handle)?.popoverHandle,
    render: (popoverProps: HTMLProps<HTMLElement>, popoverState: PopoverTriggerState) => {
      const state: DialogTriggerState = {
        disabled: popoverState.disabled,
        open: popoverState.open,
      };

      return useRender<DialogTriggerState, HTMLElement>({
        defaultTagName: 'button',
        render: render as Parameters<typeof useRender<DialogTriggerState, HTMLElement>>[0]['render'],
        state,
        stateAttributesMapping: triggerStateAttributes,
        props: {
          ...popoverProps,
          onClick: chainHandlers(
            popoverProps.onClick as ((event: MouseEvent) => void) | undefined,
            (event: MouseEvent) => {
              if (
                handle == null &&
                event.currentTarget instanceof HTMLElement &&
                findPopoverRuntime(event.currentTarget) == null
              ) {
                throw new Error(DIALOG_TRIGGER_CONTEXT_ERROR);
              }
            },
          ),
        },
      });
    },
  });
}

function renderDialogPortal(props: DialogPortalProps) {
  const { children, container, keepMounted } = props;

  return Popover.Portal({
    children: [html`${dialogInternalBackdropDirective()}`, children],
    container,
    keepMounted,
  });
}

function renderDialogPopup(props: DialogPopupProps) {
  return html`${dialogPopupDirective(props)}`;
}

function renderDialogBackdrop(props: DialogBackdropProps) {
  return html`${dialogBackdropDirective(props)}`;
}

function renderDialogTitle(props: DialogTitleProps) {
  return Popover.Title(props as PopoverTitleProps);
}

function renderDialogDescription(props: DialogDescriptionProps) {
  return Popover.Description(props as PopoverDescriptionProps);
}

function renderDialogClose(props: DialogCloseProps) {
  const { disabled = false, nativeButton, render, ...closeProps } = props;

  return Popover.Close({
    ...(closeProps as Record<string, unknown>),
    disabled,
    nativeButton,
    render: (popoverProps: HTMLProps<HTMLButtonElement>) => {
      return useRender<DialogCloseState, HTMLButtonElement>({
        defaultTagName: 'button',
        render: render as Parameters<
          typeof useRender<DialogCloseState, HTMLButtonElement>
        >[0]['render'],
        state: { disabled },
        stateAttributesMapping: closeStateAttributes,
        props: popoverProps,
      });
    },
  });
}

function renderDialogViewport(props: DialogViewportProps) {
  return html`${dialogViewportDirective(props)}`;
}

export const Dialog = {
  Root: renderDialogRoot,
  Trigger: renderDialogTrigger,
  Portal: renderDialogPortal,
  Popup: renderDialogPopup,
  Backdrop: renderDialogBackdrop,
  Title: renderDialogTitle,
  Description: renderDialogDescription,
  Close: renderDialogClose,
  Viewport: renderDialogViewport,
  createHandle: createDialogHandle,
  Handle: DialogHandleImpl,
};
