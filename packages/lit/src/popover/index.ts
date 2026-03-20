import { html, noChange, nothing, render as renderTemplate, type TemplateResult } from 'lit';
// eslint-disable-next-line import/extensions
import { AsyncDirective, directive } from 'lit/async-directive.js';
// eslint-disable-next-line import/extensions
import { ref } from 'lit/directives/ref.js';
// eslint-disable-next-line import/extensions
import { keyed } from 'lit/directives/keyed.js';
// eslint-disable-next-line import/extensions
import { styleMap } from 'lit/directives/style-map.js';
import {
  arrow as floatingArrow,
  autoUpdate,
  type Boundary,
  computePosition,
  flip,
  hide,
  limitShift,
  offset,
  shift,
  type Placement,
} from '@floating-ui/react-dom';
import type {
  BaseUIChangeEventDetails,
  BaseUIEvent,
  ComponentRenderFn,
  HTMLProps,
} from '../types/index.ts';
import { useRender, type StateAttributesMapping } from '../use-render/index.ts';

const ROOT_RUNTIME_PROPERTY = '__baseUiPopoverRuntime';
const DIALOG_POPUP_ROLE_PROPERTY = '__baseUiDialogPopupRole';
const ROOT_ATTRIBUTE = 'data-base-ui-popover-root';
const PORTAL_ATTRIBUTE = 'data-base-ui-popover-portal';
const POSITIONER_ATTRIBUTE = 'data-base-ui-popover-positioner';
const POPUP_ATTRIBUTE = 'data-base-ui-popover-popup';
const TRIGGER_ATTRIBUTE = 'data-base-ui-popover-trigger';
const ARROW_ATTRIBUTE = 'data-base-ui-popover-arrow';
const VIEWPORT_ATTRIBUTE = 'data-base-ui-popover-viewport';
const BACKDROP_ATTRIBUTE = 'data-base-ui-popover-backdrop';
const TITLE_ATTRIBUTE = 'data-base-ui-popover-title';
const DESCRIPTION_ATTRIBUTE = 'data-base-ui-popover-description';
const CLOSE_ATTRIBUTE = 'data-base-ui-popover-close';
const STARTING_STYLE_ATTRIBUTE = 'data-starting-style';
const ENDING_STYLE_ATTRIBUTE = 'data-ending-style';
const GENERATED_ID_PREFIX = 'base-ui-popover';
const OPEN_DELAY = 300;
const POINTER_EVENTS_NONE_STYLE = {
  pointerEvents: 'none',
  userSelect: 'none',
  WebkitUserSelect: 'none',
} as const;
const DEFAULT_POSITIONER_STYLE = {
  position: 'absolute',
  left: '0px',
  top: '0px',
} as const;
const DATA_OPEN = { 'data-open': '' };
const DATA_CLOSED = { 'data-closed': '' };
const DATA_STARTING_STYLE = { [STARTING_STYLE_ATTRIBUTE]: '' };
const DATA_ENDING_STYLE = { [ENDING_STYLE_ATTRIBUTE]: '' };
const POPUP_WIDTH_CSS_VAR = '--popup-width';
const POPUP_HEIGHT_CSS_VAR = '--popup-height';
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[contenteditable]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

let generatedPopoverId = 0;

type InteractionType = 'mouse' | 'touch' | 'pen' | 'keyboard' | null;
type DialogPopupRole = 'dialog' | 'alertdialog';
type Side = 'top' | 'right' | 'bottom' | 'left';
type Align = 'start' | 'center' | 'end';
type TransitionStatus = 'starting' | 'ending' | undefined;
type Modal = boolean | 'trap-focus';
type PositionMethod = 'absolute' | 'fixed';
type ChangeReason =
  | 'trigger-hover'
  | 'trigger-focus'
  | 'trigger-press'
  | 'outside-press'
  | 'escape-key'
  | 'close-press'
  | 'focus-out'
  | 'imperative-action'
  | 'none';
type InstantType = 'dismiss' | 'click' | undefined;
type CollisionBoundary = 'clipping-ancestors' | Element | null | undefined | readonly Element[];
type FloatingBoundary = Boundary | undefined;
type FloatingArrowData = {
  centerOffset?: number | undefined;
  x?: number | undefined;
  y?: number | undefined;
};

type RefObject<T> = {
  current: T | null;
};

type Ref<T> = ((instance: T | null) => void) | RefObject<T> | null | undefined;
type PopupFocusProp =
  | boolean
  | RefObject<HTMLElement | null>
  | ((interactionType: NonNullable<InteractionType>) => void | boolean | HTMLElement | null)
  | undefined;

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
  [ROOT_RUNTIME_PROPERTY]?: PopoverRuntime<any> | undefined;
};

interface TriggerEntry<Payload = unknown> {
  id: string;
  element: HTMLElement | null;
  disabled: boolean;
  payload: Payload | undefined;
  openOnHover: boolean;
  delay: number;
  closeDelay: number;
}

interface SubscriptionOwner {
  onRuntimeChange(nextRuntime: PopoverRuntime<any> | null): void;
}

interface PopoverRuntime<Payload = unknown> {
  connectRoot(element: HTMLElement | null): void;
  subscribe(listener: () => void): () => void;
  getOpen(): boolean;
  isMounted(): boolean;
  getModal(): Modal;
  getOpenReason(): ChangeReason | null;
  getTransitionStatus(): TransitionStatus;
  getInstantType(): InstantType;
  getOpenMethod(): InteractionType;
  getPayload(): Payload | undefined;
  getPopupId(): string;
  getActiveTriggerId(): string | null;
  getActiveTriggerElement(): HTMLElement | null;
  getTriggerEntry(id: string | null): TriggerEntry<Payload> | undefined;
  getTriggerEntries(): TriggerEntry<Payload>[];
  getPositionState(): {
    align: Align;
    anchorHidden: boolean;
    arrowOffsetX: number | null;
    arrowOffsetY: number | null;
    arrowUncentered: boolean;
    side: Side;
    transformOrigin: string;
  };
  getTitleId(): string | undefined;
  getDescriptionId(): string | undefined;
  getClosePartCount(): number;
  getPortalKeepMounted(): boolean;
  getHoverCloseDelay(): number;
  setPositionState(
    next: Partial<PopoverRuntime<Payload>['getPositionState'] extends () => infer T ? T : never>,
  ): void;
  registerTrigger(entry: TriggerEntry<Payload>): () => void;
  setPopupElement(element: HTMLElement | null): void;
  setPositionerElement(element: HTMLElement | null): void;
  setBackdropElement(element: HTMLDivElement | null): void;
  setArrowElement(element: HTMLElement | null): void;
  setPopupId(id: string | undefined): void;
  setTitleId(id: string | undefined): void;
  setDescriptionId(id: string | undefined): void;
  registerClosePart(): () => void;
  setPortalKeepMounted(next: boolean): void;
  setPopupFinalFocus(finalFocus: PopupFocusProp): void;
  openWithTrigger(
    triggerId: string | null,
    event: Event | undefined,
    reason: ChangeReason,
    sourceElement?: Element | undefined,
  ): void;
  close(event: Event | undefined, reason: ChangeReason, sourceElement?: Element | undefined): void;
  toggleFromTrigger(
    id: string,
    event: Event | undefined,
    sourceElement?: Element | undefined,
  ): void;
  scheduleHoverOpen(id: string, delay: number, event: MouseEvent): void;
  cancelHoverOpen(): void;
  enterHoverRegion(): void;
  leaveHoverRegion(event: MouseEvent | undefined, closeDelay: number): void;
  unmount(): void;
  root: HTMLElement | null;
  popupElement: HTMLElement | null;
  positionerElement: HTMLElement | null;
  backdropElement: HTMLDivElement | null;
  arrowElement: HTMLElement | null;
  handle?: PopoverHandle<Payload> | undefined;
}

class TriggerRegistry<Payload = unknown> {
  private readonly entries = new Map<string, TriggerEntry<Payload>>();

  register(entry: TriggerEntry<Payload>) {
    this.entries.set(entry.id, entry);
    return () => {
      const current = this.entries.get(entry.id);
      if (current === entry) {
        this.entries.delete(entry.id);
      }
    };
  }

  get(id: string | null) {
    if (id == null) {
      return undefined;
    }

    return this.entries.get(id);
  }

  values() {
    return Array.from(this.entries.values());
  }
}

export class PopoverHandle<Payload = unknown> {
  private runtime: PopoverRuntime<Payload> | null = null;
  private readonly triggerRegistry = new TriggerRegistry<Payload>();
  private readonly owners = new Set<SubscriptionOwner>();

  setRuntime(runtime: PopoverRuntime<Payload> | null) {
    if (this.runtime === runtime) {
      return;
    }

    this.runtime = runtime;
    this.owners.forEach((owner) => {
      owner.onRuntimeChange(runtime);
    });
  }

  registerTrigger(entry: TriggerEntry<Payload>) {
    return this.triggerRegistry.register(entry);
  }

  getTriggerEntry(id: string | null) {
    return this.triggerRegistry.get(id);
  }

  getTriggerEntries() {
    return this.triggerRegistry.values();
  }

  subscribeOwner(owner: SubscriptionOwner) {
    this.owners.add(owner);
    owner.onRuntimeChange(this.runtime);
    return () => {
      this.owners.delete(owner);
    };
  }

  open(triggerId: string) {
    const trigger = this.getTriggerEntry(triggerId);

    if (triggerId && trigger == null) {
      throw new Error(`Base UI: PopoverHandle.open: No trigger found with id "${triggerId}".`);
    }

    this.runtime?.openWithTrigger(
      triggerId,
      undefined,
      'imperative-action',
      trigger?.element ?? undefined,
    );
  }

  close() {
    this.runtime?.close(undefined, 'imperative-action', undefined);
  }

  get isOpen() {
    return this.runtime?.getOpen() ?? false;
  }
}

export function createPopoverHandle<Payload = unknown>() {
  return new PopoverHandle<Payload>();
}

function createPopoverChangeEventDetails<Reason extends ChangeReason>(
  reason: Reason,
  event: Event | undefined,
  trigger: Element | undefined,
): BaseUIChangeEventDetails<Reason, { preventUnmountOnClose(): void }> {
  let canceled = false;
  let propagationAllowed = false;
  let preventUnmountOnClose = false;

  return {
    reason,
    event: (event ?? new Event(reason)) as BaseUIChangeEventDetails<Reason>['event'],
    trigger,
    cancel() {
      canceled = true;
    },
    allowPropagation() {
      propagationAllowed = true;
    },
    get isCanceled() {
      return canceled;
    },
    get isPropagationAllowed() {
      return propagationAllowed;
    },
    preventUnmountOnClose() {
      preventUnmountOnClose = true;
    },
    get __preventUnmountOnClose() {
      return preventUnmountOnClose;
    },
  } as unknown as BaseUIChangeEventDetails<Reason, { preventUnmountOnClose(): void }>;
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

function findPopoverRuntime(node: Node | null): PopoverRuntime<any> | null {
  let current: Node | null = node;

  while (current != null) {
    if (
      current instanceof HTMLElement &&
      (current as RootRuntimeElement)[ROOT_RUNTIME_PROPERTY] != null
    ) {
      return (current as RootRuntimeElement)[ROOT_RUNTIME_PROPERTY] ?? null;
    }

    current = getComposedParent(current);
  }

  return null;
}

function assignRef<T>(refValue: Ref<T>, value: T | null) {
  if (typeof refValue === 'function') {
    refValue(value);
    return;
  }

  if (refValue != null) {
    refValue.current = value;
  }
}

function resolveElement(
  value:
    | Element
    | null
    | undefined
    | RefObject<Element | null>
    | (() => Element | null | undefined),
) {
  if (typeof value === 'function') {
    return value() ?? null;
  }

  if (value != null && 'current' in value) {
    return value.current;
  }

  return value ?? null;
}

function getOwnerDocument(node: Node | null) {
  return node?.ownerDocument ?? document;
}

function isEventInside(eventTarget: EventTarget | null, element: Element | null) {
  return eventTarget instanceof Node && element?.contains(eventTarget) === true;
}

function isHTMLElement(value: unknown): value is HTMLElement {
  return value instanceof HTMLElement;
}

function isShadowRoot(value: unknown): value is ShadowRoot {
  return typeof ShadowRoot !== 'undefined' && value instanceof ShadowRoot;
}

function isDetachedChildPartError(error: unknown) {
  return (
    error instanceof Error &&
    error.message.includes('ChildPart') &&
    error.message.includes('no `parentNode`')
  );
}

function isVisible(element: HTMLElement) {
  if (element.hidden) {
    return false;
  }

  const style = getComputedStyle(element);
  return style.display !== 'none' && style.visibility !== 'hidden';
}

function getFocusableElements(container: HTMLElement | null) {
  if (container == null) {
    return [] as HTMLElement[];
  }

  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => {
      return (
        !element.hasAttribute('disabled') &&
        !element.getAttribute('aria-hidden') &&
        isVisible(element)
      );
    },
  );
}

function getInteractionType(event: Event | undefined): InteractionType {
  if (event == null) {
    return null;
  }

  if (event instanceof KeyboardEvent) {
    return 'keyboard';
  }

  if (event instanceof TouchEvent) {
    return 'touch';
  }

  if (event instanceof PointerEvent) {
    if (
      event.pointerType === 'mouse' ||
      event.pointerType === 'touch' ||
      event.pointerType === 'pen'
    ) {
      return event.pointerType;
    }

    return 'mouse';
  }

  if (event instanceof MouseEvent) {
    return 'mouse';
  }

  return null;
}

function normalizeSide(side: Side | 'inline-start' | 'inline-end') {
  if (side === 'inline-start') {
    return 'left' as const;
  }

  if (side === 'inline-end') {
    return 'right' as const;
  }

  return side;
}

function toPlacement(side: Side | 'inline-start' | 'inline-end', align: Align): Placement {
  const normalizedSide = normalizeSide(side);
  return align === 'center' ? normalizedSide : `${normalizedSide}-${align}`;
}

function parsePlacement(placement: Placement): { side: Side; align: Align } {
  const [side, align] = placement.split('-') as [Side, Align | undefined];
  return {
    side,
    align: align ?? 'center',
  };
}

function getTransformOrigin(
  side: Side,
  align: Align,
  arrowX: number | null,
  arrowY: number | null,
) {
  const alignValue = align === 'start' ? '0%' : align === 'end' ? '100%' : '50%';

  if (side === 'top') {
    return `${arrowX != null ? `${arrowX}px` : alignValue} 100%`;
  }

  if (side === 'bottom') {
    return `${arrowX != null ? `${arrowX}px` : alignValue} 0%`;
  }

  if (side === 'left') {
    return `100% ${arrowY != null ? `${arrowY}px` : alignValue}`;
  }

  return `0% ${arrowY != null ? `${arrowY}px` : alignValue}`;
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

const popupStateAttributes: StateAttributesMapping<Record<string, unknown>> = {
  open(value) {
    return value ? DATA_OPEN : DATA_CLOSED;
  },
  anchorHidden(value) {
    return value ? { 'data-anchor-hidden': '' } : null;
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

class PopoverRootDirective<Payload = unknown>
  extends AsyncDirective
  implements PopoverRuntime<Payload>
{
  private latestProps: PopoverRootProps<Payload> | null = null;
  private listeners = new Set<() => void>();
  private rootElement: HTMLElement | null = null;
  private triggerRegistry = new TriggerRegistry<Payload>();
  private openState = false;
  private activeTriggerId: string | null = null;
  private activeTriggerElement: HTMLElement | null = null;
  private payload: Payload | undefined = undefined;
  private openReason: ChangeReason | null = null;
  private transitionStatus: TransitionStatus = undefined;
  private instantType: InstantType = undefined;
  private openMethod: InteractionType = null;
  private popupId = `${GENERATED_ID_PREFIX}-popup-${(generatedPopoverId += 1)}`;
  private popupElementInternal: HTMLElement | null = null;
  private positionerElementInternal: HTMLElement | null = null;
  private backdropElementInternal: HTMLDivElement | null = null;
  private arrowElementInternal: HTMLElement | null = null;
  private titleId: string | undefined = undefined;
  private descriptionId: string | undefined = undefined;
  private mounted = false;
  private keepMounted = false;
  private popupFinalFocus: PopupFocusProp = undefined;
  private closePartCount = 0;
  private pendingUnmountPrevented = false;
  private hoverOpenTimeout: number | null = null;
  private hoverCloseTimeout: number | null = null;
  private hoverRegionDepth = 0;
  private positionState = {
    side: 'bottom' as Side,
    align: 'center' as Align,
    anchorHidden: false,
    arrowOffsetX: null as number | null,
    arrowOffsetY: null as number | null,
    arrowUncentered: false,
    transformOrigin: '50% 0%',
  };
  private transitionTimer: number | null = null;
  private openCompleteTimer: number | null = null;
  private documentListenersCleanup: (() => void) | null = null;
  private pendingControlledOpenSync: boolean | null = null;

  handle: PopoverHandle<Payload> | undefined = undefined;

  render(_componentProps: PopoverRootProps<Payload>) {
    return noChange;
  }

  override update(
    _part: Parameters<AsyncDirective['update']>[0],
    [componentProps]: [PopoverRootProps<Payload>],
  ) {
    const wasControlled = this.latestProps?.open !== undefined;
    const isControlled = componentProps.open !== undefined;
    this.latestProps = componentProps;
    this.handle = componentProps.handle;
    (
      this as PopoverRuntime<Payload> & {
        [DIALOG_POPUP_ROLE_PROPERTY]?: DialogPopupRole | undefined;
      }
    )[DIALOG_POPUP_ROLE_PROPERTY] = (
      componentProps as PopoverRootProps<Payload> & {
        [DIALOG_POPUP_ROLE_PROPERTY]?: DialogPopupRole | undefined;
      }
    )[DIALOG_POPUP_ROLE_PROPERTY];

    if (this.activeTriggerId == null) {
      this.activeTriggerId = componentProps.triggerId ?? componentProps.defaultTriggerId ?? null;
    }

    if (!wasControlled && !isControlled && !this.mounted) {
      this.openState = Boolean(componentProps.defaultOpen);
      this.mounted = this.openState;
    }

    if (isControlled) {
      const nextOpen = Boolean(componentProps.open);
      if (nextOpen !== this.openState) {
        const hasPendingControlledSync = this.pendingControlledOpenSync === nextOpen;
        this.openState = nextOpen;
        if (nextOpen || this.pendingUnmountPrevented) {
          this.mounted = true;
        }

        if (!hasPendingControlledSync) {
          this.syncActiveTriggerState();
          this.startTransition(nextOpen);
          this.syncDocumentListeners();

          if (nextOpen) {
            this.scheduleOpenComplete(true);
          } else {
            this.scheduleCloseFocus(false);
          }
        }

        this.pendingControlledOpenSync = hasPendingControlledSync
          ? null
          : this.pendingControlledOpenSync;
      }

      if (componentProps.triggerId !== undefined) {
        this.activeTriggerId = componentProps.triggerId;
      }
    }

    this.handle?.setRuntime(this);
    this.syncDocumentListeners();
    this.syncActionsRef();
    this.syncActiveTriggerState();
    this.syncImplicitActiveTrigger();
    return this.renderCurrent();
  }

  override disconnected() {
    this.clearTimers();
    this.documentListenersCleanup?.();
    this.documentListenersCleanup = null;
    this.pendingControlledOpenSync = null;
    this.handle?.setRuntime(null);
    this.connectRoot(null);
  }

  override reconnected() {}

  get root() {
    return this.rootElement;
  }

  get popupElement() {
    return this.popupElementInternal;
  }

  get positionerElement() {
    return this.positionerElementInternal;
  }

  get backdropElement() {
    return this.backdropElementInternal;
  }

  get arrowElement() {
    return this.arrowElementInternal;
  }

  connectRoot(element: HTMLElement | null) {
    if (this.rootElement === element) {
      return;
    }

    if (this.rootElement != null) {
      delete (this.rootElement as RootRuntimeElement)[ROOT_RUNTIME_PROPERTY];
    }

    this.rootElement = element;

    if (this.rootElement != null) {
      (this.rootElement as RootRuntimeElement)[ROOT_RUNTIME_PROPERTY] = this;
    }
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getOpen() {
    return this.latestProps?.open ?? this.openState;
  }

  isMounted() {
    return this.mounted;
  }

  getModal() {
    return this.latestProps?.modal ?? false;
  }

  getOpenReason() {
    return this.openReason;
  }

  getTransitionStatus() {
    return this.transitionStatus;
  }

  getInstantType() {
    return this.instantType;
  }

  getOpenMethod() {
    return this.openMethod;
  }

  getPayload() {
    return this.payload;
  }

  getPopupId() {
    return this.popupId;
  }

  getActiveTriggerId() {
    return this.activeTriggerId;
  }

  getActiveTriggerElement() {
    return this.activeTriggerElement;
  }

  getTriggerEntry(id: string | null) {
    return this.latestProps?.handle?.getTriggerEntry(id) ?? this.triggerRegistry.get(id);
  }

  getTriggerEntries() {
    return this.latestProps?.handle?.getTriggerEntries() ?? this.triggerRegistry.values();
  }

  getPositionState() {
    return this.positionState;
  }

  getTitleId() {
    return this.titleId;
  }

  getDescriptionId() {
    return this.descriptionId;
  }

  getClosePartCount() {
    return this.closePartCount;
  }

  getPortalKeepMounted() {
    return this.keepMounted;
  }

  getHoverCloseDelay() {
    return this.getTriggerEntry(this.activeTriggerId)?.closeDelay ?? 0;
  }

  setPositionState(
    next: Partial<{
      align: Align;
      anchorHidden: boolean;
      arrowOffsetX: number | null;
      arrowOffsetY: number | null;
      arrowUncentered: boolean;
      side: Side;
      transformOrigin: string;
    }>,
  ) {
    const nextState = { ...this.positionState, ...next };
    const currentState = this.positionState;

    if (
      currentState.align === nextState.align &&
      currentState.anchorHidden === nextState.anchorHidden &&
      currentState.arrowOffsetX === nextState.arrowOffsetX &&
      currentState.arrowOffsetY === nextState.arrowOffsetY &&
      currentState.arrowUncentered === nextState.arrowUncentered &&
      currentState.side === nextState.side &&
      currentState.transformOrigin === nextState.transformOrigin
    ) {
      return;
    }

    this.positionState = nextState;
    this.notify();
  }

  registerTrigger(entry: TriggerEntry<Payload>) {
    const unregister =
      this.latestProps?.handle?.registerTrigger(entry) ?? this.triggerRegistry.register(entry);

    if (entry.id === this.activeTriggerId) {
      this.activeTriggerElement = entry.element;
      this.payload = entry.payload;
    }

    if (this.syncImplicitActiveTrigger()) {
      queueMicrotask(() => {
        if (this.isConnected) {
          this.notify();
        }
      });
    }

    return () => {
      unregister();

      if (this.activeTriggerId === entry.id) {
        this.activeTriggerElement = this.getTriggerEntry(entry.id)?.element ?? null;
      }
    };
  }

  setPopupElement(element: HTMLElement | null) {
    this.popupElementInternal = element;
    this.syncDocumentListeners();
  }

  setPositionerElement(element: HTMLElement | null) {
    this.positionerElementInternal = element;
  }

  setBackdropElement(element: HTMLDivElement | null) {
    this.backdropElementInternal = element;
  }

  setArrowElement(element: HTMLElement | null) {
    this.arrowElementInternal = element;
  }

  setPopupId(id: string | undefined) {
    if (id == null || this.popupId === id) {
      return;
    }

    this.popupId = id;
  }

  setTitleId(id: string | undefined) {
    if (this.titleId === id) {
      return;
    }

    this.titleId = id;

    if (this.popupElementInternal != null) {
      if (id != null) {
        this.popupElementInternal.setAttribute('aria-labelledby', id);
      } else {
        this.popupElementInternal.removeAttribute('aria-labelledby');
      }
    }
  }

  setDescriptionId(id: string | undefined) {
    if (this.descriptionId === id) {
      return;
    }

    this.descriptionId = id;

    if (this.popupElementInternal != null) {
      if (id != null) {
        this.popupElementInternal.setAttribute('aria-describedby', id);
      } else {
        this.popupElementInternal.removeAttribute('aria-describedby');
      }
    }
  }

  registerClosePart() {
    this.closePartCount += 1;

    return () => {
      this.closePartCount = Math.max(0, this.closePartCount - 1);
    };
  }

  setPortalKeepMounted(next: boolean) {
    if (this.keepMounted === next) {
      return;
    }

    this.keepMounted = next;
    this.notify();
  }

  setPopupFinalFocus(finalFocus: PopupFocusProp) {
    this.popupFinalFocus = finalFocus;
  }

  openWithTrigger(
    triggerId: string | null,
    event: Event | undefined,
    reason: ChangeReason,
    sourceElement?: Element | undefined,
  ) {
    const entry = this.getTriggerEntry(triggerId);

    if (entry?.disabled) {
      return;
    }

    const trigger = sourceElement ?? entry?.element ?? undefined;
    this.activeTriggerId = triggerId;
    this.activeTriggerElement = entry?.element ?? null;
    this.payload = entry?.payload;
    this.setOpen(true, reason, event, trigger);
  }

  close(event: Event | undefined, reason: ChangeReason, sourceElement?: Element | undefined) {
    this.setOpen(false, reason, event, sourceElement);
  }

  toggleFromTrigger(id: string, event: Event | undefined, sourceElement?: Element | undefined) {
    const entry = this.getTriggerEntry(id);
    if (entry?.disabled) {
      return;
    }

    if (this.getOpen() && this.activeTriggerId === id) {
      this.close(event, 'trigger-press', sourceElement ?? entry?.element ?? undefined);
      return;
    }

    this.openWithTrigger(id, event, 'trigger-press', sourceElement ?? entry?.element ?? undefined);
  }

  scheduleHoverOpen(id: string, delay: number, event: MouseEvent) {
    this.cancelHoverOpen();
    this.hoverOpenTimeout =
      getOwnerDocument(this.rootElement).defaultView?.setTimeout(() => {
        this.hoverOpenTimeout = null;
        this.openWithTrigger(
          id,
          event,
          'trigger-hover',
          this.getTriggerEntry(id)?.element ?? undefined,
        );
      }, delay) ?? null;
  }

  cancelHoverOpen() {
    if (this.hoverOpenTimeout != null) {
      getOwnerDocument(this.rootElement).defaultView?.clearTimeout(this.hoverOpenTimeout);
      this.hoverOpenTimeout = null;
    }
  }

  enterHoverRegion() {
    this.cancelHoverClose();
    this.hoverRegionDepth += 1;
  }

  leaveHoverRegion(event: MouseEvent | undefined, closeDelay: number) {
    this.hoverRegionDepth = Math.max(0, this.hoverRegionDepth - 1);
    if (this.hoverRegionDepth > 0) {
      return;
    }

    this.cancelHoverClose();
    this.hoverCloseTimeout =
      getOwnerDocument(this.rootElement).defaultView?.setTimeout(() => {
        this.hoverCloseTimeout = null;
        if (this.hoverRegionDepth === 0 && this.getOpenReason() === 'trigger-hover') {
          this.close(event, 'focus-out', this.getActiveTriggerElement() ?? undefined);
        }
      }, closeDelay) ?? null;
  }

  unmount() {
    this.pendingUnmountPrevented = false;
    this.mounted = this.getOpen();
    this.notify();
  }

  private cancelHoverClose() {
    if (this.hoverCloseTimeout != null) {
      getOwnerDocument(this.rootElement).defaultView?.clearTimeout(this.hoverCloseTimeout);
      this.hoverCloseTimeout = null;
    }
  }

  private setOpen(
    nextOpen: boolean,
    reason: ChangeReason,
    event: Event | undefined,
    sourceElement?: Element | undefined,
  ) {
    const wasOpenedByHover = !nextOpen && this.openReason === 'trigger-hover';
    const details = createPopoverChangeEventDetails(reason, event, sourceElement);
    this.latestProps?.onOpenChange?.(nextOpen, details);

    if (details.isCanceled) {
      this.notify();
      return;
    }

    this.openMethod = getInteractionType(event);
    this.openReason = reason;
    this.instantType =
      !nextOpen && (reason === 'escape-key' || reason === 'outside-press')
        ? 'dismiss'
        : reason === 'trigger-press' && event instanceof KeyboardEvent
          ? 'click'
          : undefined;
    this.pendingUnmountPrevented =
      !nextOpen &&
      (details as BaseUIChangeEventDetails<ChangeReason> & { __preventUnmountOnClose?: boolean })
        .__preventUnmountOnClose === true;

    if (this.latestProps?.open !== undefined) {
      this.pendingControlledOpenSync = nextOpen;
    }

    if (this.latestProps?.open === undefined) {
      this.openState = nextOpen;
    }

    if (nextOpen || this.pendingUnmountPrevented) {
      this.mounted = true;
    }

    if (!nextOpen) {
      this.cancelHoverOpen();
      this.cancelHoverClose();
    }

    this.syncActiveTriggerState();
    this.startTransition(nextOpen);
    this.syncDocumentListeners();
    this.notify();

    if (nextOpen) {
      this.scheduleOpenComplete(true);
    } else {
      this.scheduleCloseFocus(wasOpenedByHover);
    }
  }

  private scheduleOpenComplete(open: boolean) {
    if (this.openCompleteTimer != null) {
      getOwnerDocument(this.rootElement).defaultView?.clearTimeout(this.openCompleteTimer);
      this.openCompleteTimer = null;
    }

    this.openCompleteTimer =
      getOwnerDocument(this.rootElement).defaultView?.setTimeout(() => {
        this.openCompleteTimer = null;
        this.latestProps?.onOpenChangeComplete?.(open);
      }, 32) ?? null;
  }

  private scheduleCloseFocus(skipFocusRestore: boolean) {
    const windowObject = getOwnerDocument(this.rootElement).defaultView;
    windowObject?.setTimeout(() => {
      if (skipFocusRestore) {
        this.latestProps?.onOpenChangeComplete?.(false);
        return;
      }

      const target = this.resolveFinalFocusTarget();
      if (target !== false) {
        target?.focus({ preventScroll: true });
      }
      this.latestProps?.onOpenChangeComplete?.(false);
    }, 0);
  }

  private resolveFinalFocusTarget() {
    const interactionType = this.openMethod ?? 'mouse';
    const finalFocus = this.popupFinalFocus;

    if (typeof finalFocus === 'function') {
      const resolved = finalFocus(interactionType);

      if (resolved === false || resolved === undefined) {
        return false;
      }

      if (resolved === true || resolved === null) {
        return this.resolveDefaultFinalFocus();
      }

      return isHTMLElement(resolved) ? resolved : false;
    }

    if (finalFocus != null && typeof finalFocus === 'object' && 'current' in finalFocus) {
      return finalFocus.current;
    }

    if (finalFocus === false) {
      return false;
    }

    return this.resolveDefaultFinalFocus();
  }

  private resolveDefaultFinalFocus() {
    const popup = this.popupElementInternal;
    const activeTrigger = this.activeTriggerElement;

    if (activeTrigger != null && activeTrigger.isConnected) {
      return activeTrigger;
    }

    if (popup != null && popup.ownerDocument.activeElement instanceof HTMLElement) {
      return popup.ownerDocument.activeElement;
    }

    return null;
  }

  private startTransition(open: boolean) {
    const windowObject = getOwnerDocument(this.rootElement).defaultView;

    if (this.transitionTimer != null) {
      windowObject?.clearTimeout(this.transitionTimer);
      this.transitionTimer = null;
    }

    this.transitionStatus = open ? 'starting' : 'ending';

    this.transitionTimer =
      windowObject?.setTimeout(() => {
        this.transitionTimer = null;
        this.transitionStatus = undefined;
        this.mounted = this.getOpen() || this.pendingUnmountPrevented;
        this.notify();
      }, 32) ?? null;
  }

  private syncActiveTriggerState() {
    const entry = this.getTriggerEntry(this.activeTriggerId);
    this.activeTriggerElement = entry?.element ?? null;
    this.payload = entry?.payload;
  }

  private syncImplicitActiveTrigger() {
    if (!this.getOpen() || this.activeTriggerId != null) {
      return false;
    }

    const triggerEntries = this.getTriggerEntries();
    if (triggerEntries.length !== 1) {
      return false;
    }

    const implicitTrigger = triggerEntries[0];
    this.activeTriggerId = implicitTrigger.id;
    this.activeTriggerElement = implicitTrigger.element;
    this.payload = implicitTrigger.payload;
    return true;
  }

  private syncActionsRef() {
    const actionsRef = this.latestProps?.actionsRef;
    if (actionsRef == null) {
      return;
    }

    actionsRef.current = {
      close: () => {
        this.close(undefined, 'imperative-action', this.getActiveTriggerElement() ?? undefined);
      },
      unmount: () => {
        this.unmount();
      },
    };
  }

  private clearTimers() {
    const windowObject = getOwnerDocument(this.rootElement).defaultView;
    if (this.hoverOpenTimeout != null) {
      windowObject?.clearTimeout(this.hoverOpenTimeout);
      this.hoverOpenTimeout = null;
    }
    if (this.hoverCloseTimeout != null) {
      windowObject?.clearTimeout(this.hoverCloseTimeout);
      this.hoverCloseTimeout = null;
    }
    if (this.transitionTimer != null) {
      windowObject?.clearTimeout(this.transitionTimer);
      this.transitionTimer = null;
    }
    if (this.openCompleteTimer != null) {
      windowObject?.clearTimeout(this.openCompleteTimer);
      this.openCompleteTimer = null;
    }
  }

  private syncDocumentListeners() {
    this.documentListenersCleanup?.();
    this.documentListenersCleanup = null;

    if (!this.getOpen()) {
      return;
    }

    const ownerDocument = getOwnerDocument(this.rootElement);

    const handlePointerDown = (event: Event) => {
      const target = event.target;
      if (
        isEventInside(target, this.positionerElementInternal) ||
        isEventInside(target, this.activeTriggerElement) ||
        isEventInside(target, this.backdropElementInternal)
      ) {
        return;
      }

      this.close(event, 'outside-press', undefined);
    };

    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (
        isEventInside(target, this.positionerElementInternal) ||
        isEventInside(target, this.activeTriggerElement)
      ) {
        return;
      }

      this.close(event, 'focus-out', undefined);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        this.close(event, 'escape-key', undefined);
      }
    };

    ownerDocument.addEventListener('mousedown', handlePointerDown, true);
    ownerDocument.addEventListener('touchstart', handlePointerDown, true);
    ownerDocument.addEventListener('focusin', handleFocusIn, true);
    ownerDocument.addEventListener('keydown', handleKeyDown, true);

    this.documentListenersCleanup = () => {
      ownerDocument.removeEventListener('mousedown', handlePointerDown, true);
      ownerDocument.removeEventListener('touchstart', handlePointerDown, true);
      ownerDocument.removeEventListener('focusin', handleFocusIn, true);
      ownerDocument.removeEventListener('keydown', handleKeyDown, true);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => {
      listener();
    });
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

  private renderCurrent() {
    const props = this.latestProps;
    if (props == null) {
      return nothing;
    }

    const renderedChildren =
      typeof props.children === 'function'
        ? props.children({ payload: this.payload })
        : props.children;

    return html`<div
      ${ref((element) => {
        this.connectRoot(element as HTMLElement | null);
      })}
      ${ROOT_ATTRIBUTE}=""
      style="display: contents;"
    >
      ${renderedChildren ?? nothing}
    </div>`;
  }
}

const popoverRootDirective = directive(PopoverRootDirective);

class PopoverPortalDirective extends AsyncDirective implements SubscriptionOwner {
  private latestProps: PopoverPortalProps | null = null;
  private runtime: PopoverRuntime<any> | null = null;
  private unsubscribeRuntime: (() => void) | null = null;
  private unsubscribeHandle: (() => void) | null = null;
  private placeholder: HTMLElement | null = null;
  private mountRoot: HTMLDivElement | null = null;

  render(_componentProps: PopoverPortalProps) {
    return noChange;
  }

  override update(
    _part: Parameters<AsyncDirective['update']>[0],
    [componentProps]: [PopoverPortalProps],
  ) {
    this.latestProps = componentProps;
    if (componentProps.handle != null) {
      this.unsubscribeHandle ??= componentProps.handle.subscribeOwner(this);
    }

    this.renderPortalContent();
    return this.renderCurrent();
  }

  private renderCurrent() {
    return html`<span
      hidden
      ${ref((element) => {
        this.placeholder = element as HTMLElement | null;
        if (this.runtime == null && this.placeholder != null) {
          this.setRuntime(findPopoverRuntime(this.placeholder));
        }
      })}
    ></span>`;
  }

  override disconnected() {
    this.unsubscribeRuntime?.();
    this.unsubscribeRuntime = null;
    this.unsubscribeHandle?.();
    this.unsubscribeHandle = null;
    this.clearPortal();
  }

  override reconnected() {}

  onRuntimeChange(nextRuntime: PopoverRuntime<any> | null) {
    this.setRuntime(nextRuntime);
  }

  private setRuntime(nextRuntime: PopoverRuntime<any> | null) {
    if (this.runtime === nextRuntime) {
      return;
    }

    this.unsubscribeRuntime?.();
    this.unsubscribeRuntime = null;
    this.runtime = nextRuntime;
    this.unsubscribeRuntime =
      nextRuntime?.subscribe(() => {
        this.renderPortalContent();
        queueMicrotask(() => {
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
        });
      }) ?? null;
    this.renderPortalContent();
    queueMicrotask(() => {
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
    });
  }

  private getContainer() {
    const explicitContainer = resolveElement(this.latestProps?.container as any);
    if (explicitContainer instanceof Element || isShadowRoot(explicitContainer)) {
      return explicitContainer;
    }

    const root = this.runtime?.root;
    return getOwnerDocument(root ?? null).body;
  }

  private renderPortalContent() {
    const runtime = this.runtime;
    const latestProps = this.latestProps;

    if (runtime == null || latestProps == null) {
      this.clearPortal();
      return;
    }

    runtime.setPortalKeepMounted(Boolean(latestProps.keepMounted));
    const shouldRender = runtime.isMounted() || Boolean(latestProps.keepMounted);
    if (!shouldRender) {
      this.clearPortal();
      return;
    }

    const container = this.getContainer();
    if (container == null) {
      this.clearPortal();
      return;
    }

    if (this.mountRoot == null) {
      this.mountRoot = getOwnerDocument(runtime.root).createElement('div');
      this.mountRoot.style.display = 'contents';
    }

    if (this.mountRoot.parentNode !== container) {
      container.appendChild(this.mountRoot);
    }

    renderTemplate(
      html`<div
        ${ref((element) => {
          if (element instanceof HTMLElement) {
            (element as RootRuntimeElement)[ROOT_RUNTIME_PROPERTY] = runtime;
          }
        })}
        ${PORTAL_ATTRIBUTE}=""
        style="display: contents;"
      >
        ${latestProps.children ?? nothing}
      </div>`,
      this.mountRoot,
    );
  }

  private clearPortal() {
    if (this.mountRoot == null) {
      return;
    }

    renderTemplate(nothing, this.mountRoot);
    this.mountRoot.remove();
  }
}

const popoverPortalDirective = directive(PopoverPortalDirective);

abstract class PopoverPartDirective<Props, ElementType extends HTMLElement>
  extends AsyncDirective
  implements SubscriptionOwner
{
  protected latestProps: Props | null = null;
  protected runtime: PopoverRuntime<any> | null = null;
  protected element: ElementType | null = null;
  private unsubscribeRuntime: (() => void) | null = null;
  private unsubscribeHandle: (() => void) | null = null;

  abstract renderCurrent(): TemplateResult;

  override disconnected() {
    this.unsubscribeRuntime?.();
    this.unsubscribeRuntime = null;
    this.unsubscribeHandle?.();
    this.unsubscribeHandle = null;
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

      throw error;
    }
  }

  protected setRuntime(nextRuntime: PopoverRuntime<any> | null) {
    if (this.runtime === nextRuntime) {
      return;
    }

    this.unsubscribeRuntime?.();
    this.unsubscribeRuntime = null;
    this.runtime = nextRuntime;
    this.unsubscribeRuntime =
      nextRuntime?.subscribe(() => {
        this.requestRender();
      }) ?? null;
    queueMicrotask(() => {
      this.requestRender();
    });
  }

  onRuntimeChange(nextRuntime: PopoverRuntime<any> | null) {
    this.setRuntime(nextRuntime);
    this.requestRender();
  }

  protected syncHandle(handle: PopoverHandle<any> | undefined) {
    this.unsubscribeHandle?.();
    this.unsubscribeHandle = null;
    if (handle != null) {
      this.unsubscribeHandle = handle.subscribeOwner(this);
    }
  }
}

class PopoverTriggerDirective<Payload = unknown> extends PopoverPartDirective<
  PopoverTriggerProps<Payload>,
  HTMLElement
> {
  private generatedId = `${GENERATED_ID_PREFIX}-trigger-${(generatedPopoverId += 1)}`;
  private unregisterTrigger: (() => void) | null = null;

  render(_componentProps: PopoverTriggerProps<Payload>) {
    return noChange;
  }

  override update(
    _part: Parameters<AsyncDirective['update']>[0],
    [componentProps]: [PopoverTriggerProps<Payload>],
  ) {
    this.latestProps = componentProps;
    this.syncHandle(componentProps.handle);
    return this.renderCurrent();
  }

  override disconnected() {
    super.disconnected();
    this.unregisterTrigger?.();
    this.unregisterTrigger = null;
  }

  renderCurrent() {
    const props = this.latestProps ?? {};
    const {
      children,
      closeDelay,
      delay,
      disabled: disabledProp,
      handle: _handle,
      id: _id,
      nativeButton,
      openOnHover,
      payload: _payload,
      ref: forwardedRef,
      render,
      ...elementProps
    } = props as PopoverTriggerProps<Payload> & Record<string, unknown>;
    void _handle;
    void _id;
    void _payload;
    const runtime = this.runtime;
    const open = runtime?.getOpen() === true && runtime.getActiveTriggerId() === this.getId();
    const disabled = Boolean(disabledProp);
    const resolvedNativeButton = nativeButton ?? true;

    const state = {
      disabled,
      open,
    } satisfies PopoverTriggerState;

    const buttonProps = resolvedNativeButton
      ? { type: 'button' }
      : { role: 'button', tabindex: disabled ? '-1' : '0' };

    const stateAttributes = {
      ...(open ? { 'data-popup-open': '' } : {}),
    };

    return useRender<PopoverTriggerState, HTMLElement>({
      defaultTagName: 'button',
      render: props.render as Parameters<
        typeof useRender<PopoverTriggerState, HTMLElement>
      >[0]['render'],
      ref: [
        (element) => {
          this.element = element;
          if (element != null) {
            const nextRuntime = props.handle != null ? this.runtime : findPopoverRuntime(element);
            this.setRuntime(nextRuntime);
            this.registerTrigger();
          }
          assignRef(forwardedRef as Ref<HTMLElement>, element);
        },
      ],
      state,
      props: {
        ...buttonProps,
        ...stateAttributes,
        [TRIGGER_ATTRIBUTE]: '',
        id: this.getId(),
        'aria-haspopup': 'dialog',
        'aria-expanded': String(open),
        'aria-controls': open ? runtime?.getPopupId() : undefined,
        'aria-disabled': disabled ? 'true' : undefined,
        disabled: resolvedNativeButton ? disabled : undefined,
        onClick: (event: MouseEvent) => {
          if (disabled) {
            event.preventDefault();
            return;
          }

          runtime?.toggleFromTrigger(this.getId(), event, this.element ?? undefined);
          (props.onClick as ((event: MouseEvent) => void) | undefined)?.(event);
        },
        onFocus: (event: FocusEvent) => {
          if (!disabled && openOnHover) {
            runtime?.openWithTrigger(
              this.getId(),
              event,
              'trigger-focus',
              this.element ?? undefined,
            );
          }
          (elementProps.onFocus as ((event: FocusEvent) => void) | undefined)?.(event);
        },
        onMouseEnter: (event: MouseEvent) => {
          if (!disabled && openOnHover) {
            runtime?.enterHoverRegion();
            runtime?.scheduleHoverOpen(this.getId(), delay ?? OPEN_DELAY, event);
          }
          (elementProps.onMouseEnter as ((event: MouseEvent) => void) | undefined)?.(event);
        },
        onMouseLeave: (event: MouseEvent) => {
          if (openOnHover) {
            runtime?.leaveHoverRegion(event, closeDelay ?? 0);
          }
          (elementProps.onMouseLeave as ((event: MouseEvent) => void) | undefined)?.(event);
        },
        onKeyDown: (event: BaseUIEvent<KeyboardEvent>) => {
          if (disabled) {
            event.preventDefault();
            return;
          }

          if (!resolvedNativeButton && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            runtime?.toggleFromTrigger(this.getId(), event, this.element ?? undefined);
          }

          (elementProps.onKeyDown as ((event: KeyboardEvent) => void) | undefined)?.(event);
        },
        ...(children === undefined ? elementProps : { ...elementProps, children }),
      },
    });
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
      disabled: Boolean(this.latestProps?.disabled),
      payload: this.latestProps?.payload,
      openOnHover: Boolean(this.latestProps?.openOnHover),
      delay: this.latestProps?.delay ?? OPEN_DELAY,
      closeDelay: this.latestProps?.closeDelay ?? 0,
    });
  }
}

const popoverTriggerDirective = directive(PopoverTriggerDirective);

class PopoverPositionerDirective extends PopoverPartDirective<
  PopoverPositionerProps,
  HTMLDivElement
> {
  private cleanupAutoUpdate: (() => void) | null = null;

  render(_componentProps: PopoverPositionerProps) {
    return noChange;
  }

  override update(
    _part: Parameters<AsyncDirective['update']>[0],
    [componentProps]: [PopoverPositionerProps],
  ) {
    this.latestProps = componentProps;
    return this.renderCurrent();
  }

  override disconnected() {
    super.disconnected();
    this.cleanupAutoUpdate?.();
    this.cleanupAutoUpdate = null;
  }

  renderCurrent() {
    const runtime = this.runtime;
    const props = this.latestProps ?? {};
    const {
      anchor: _anchor,
      align: _align,
      alignOffset: _alignOffset,
      arrowPadding: _arrowPadding,
      children,
      collisionAvoidance: _collisionAvoidance,
      collisionBoundary: _collisionBoundary,
      collisionPadding: _collisionPadding,
      disableAnchorTracking: _disableAnchorTracking,
      positionMethod: _positionMethod,
      ref: forwardedRef,
      render,
      side: _side,
      sideOffset: _sideOffset,
      sticky: _sticky,
      ...elementProps
    } = props as PopoverPositionerProps & Record<string, unknown>;
    void _anchor;
    void _align;
    void _alignOffset;
    void _arrowPadding;
    void _collisionAvoidance;
    void _collisionBoundary;
    void _collisionPadding;
    void _disableAnchorTracking;
    void _positionMethod;
    void _side;
    void _sideOffset;
    void _sticky;
    const state = {
      open: runtime?.getOpen() ?? false,
      side: runtime?.getPositionState().side ?? 'bottom',
      align: runtime?.getPositionState().align ?? 'center',
      anchorHidden: runtime?.getPositionState().anchorHidden ?? false,
      instant: runtime?.getInstantType(),
    } satisfies PopoverPositionerState;

    const stateAttributes = {
      ...composeStateAttributes(state as Record<string, unknown>, popupStateAttributes),
      'data-side': state.side,
      'data-align': state.align,
      'data-instant': state.instant ?? undefined,
    };

    const positioner = useRender<PopoverPositionerState, HTMLDivElement>({
      defaultTagName: 'div',
      render: render as Parameters<
        typeof useRender<PopoverPositionerState, HTMLDivElement>
      >[0]['render'],
      ref: [
        (element) => {
          this.element = element;
          if (element != null) {
            this.setRuntime(findPopoverRuntime(element));
            this.runtime?.setPositionerElement(element);
          }
          assignRef(forwardedRef as Ref<HTMLDivElement>, element);
          this.syncAutoUpdate();
        },
      ],
      state,
      props: {
        [POSITIONER_ATTRIBUTE]: '',
        role: 'presentation',
        hidden: runtime != null ? !runtime.isMounted() : true,
        style: {
          ...DEFAULT_POSITIONER_STYLE,
          position: props.positionMethod ?? 'absolute',
          pointerEvents: runtime?.getOpen() ? undefined : 'none',
        },
        ...stateAttributes,
        ...(children === undefined ? elementProps : { ...elementProps, children }),
      },
    });

    if (
      runtime?.getModal() === true &&
      runtime.isMounted() &&
      runtime.getOpenReason() !== 'trigger-hover'
    ) {
      return html`<div style="display: contents;">
        <div
          ${ref((element) => {
            runtime.setBackdropElement(element as HTMLDivElement | null);
          })}
          data-base-ui-popover-internal-backdrop=""
          role="presentation"
          inert=${runtime.getOpen() ? nothing : ''}
          style=${styleMap(
            getInternalBackdropStyle(runtime.getActiveTriggerElement(), runtime.getOpen()),
          )}
          @click=${(event: MouseEvent) => {
            runtime.close(event, 'outside-press', undefined);
          }}
        ></div>
        ${positioner}
      </div>`;
    }

    return positioner;
  }

  private syncAutoUpdate() {
    this.cleanupAutoUpdate?.();
    this.cleanupAutoUpdate = null;

    const runtime = this.runtime;
    const element = this.element;
    const props = this.latestProps;

    if (runtime == null || element == null || props == null || !runtime.isMounted()) {
      return;
    }

    const anchorElement = resolveElement(props.anchor as any) ?? runtime.getActiveTriggerElement();
    if (!(anchorElement instanceof Element)) {
      return;
    }

    const placement = toPlacement(props.side ?? 'bottom', props.align ?? 'center');
    const collisionAvoidance = props.collisionAvoidance;
    const middleware = [
      offset({
        mainAxis: props.sideOffset ?? 0,
        crossAxis: props.alignOffset ?? 0,
      }),
      hide(),
    ];

    if (collisionAvoidance == null || collisionAvoidance === 'flip') {
      middleware.push(
        flip({
          boundary: normalizeBoundary(props.collisionBoundary),
          padding: props.collisionPadding ?? 5,
        }),
      );
    }

    if (collisionAvoidance == null || collisionAvoidance === 'shift') {
      middleware.push(
        shift({
          boundary: normalizeBoundary(props.collisionBoundary),
          padding: props.collisionPadding ?? 5,
          limiter: props.sticky ? undefined : limitShift(),
        }),
      );
    }

    if (runtime.arrowElement != null) {
      middleware.push(
        floatingArrow({
          element: runtime.arrowElement,
          padding: props.arrowPadding ?? 5,
        }),
      );
    }

    const updatePosition = () => {
      computePosition(anchorElement, element, {
        placement,
        strategy: props.positionMethod ?? 'absolute',
        middleware,
      }).then((result: Awaited<ReturnType<typeof computePosition>>) => {
        Object.assign(element.style, {
          left: `${result.x}px`,
          top: `${result.y}px`,
          position: props.positionMethod ?? 'absolute',
        });

        const parsedPlacement = parsePlacement(result.placement);
        const middlewareData = result.middlewareData;
        const arrowData = middlewareData.arrow as FloatingArrowData | undefined;
        const hideData = middlewareData.hide as { referenceHidden?: boolean } | undefined;

        if (runtime.arrowElement != null) {
          const side = parsedPlacement.side;
          const staticSide =
            side === 'top'
              ? 'bottom'
              : side === 'bottom'
                ? 'top'
                : side === 'left'
                  ? 'right'
                  : 'left';

          Object.assign(runtime.arrowElement.style, {
            left: arrowData?.x != null ? `${arrowData.x}px` : '',
            top: arrowData?.y != null ? `${arrowData.y}px` : '',
            right: '',
            bottom: '',
            [staticSide]: '-4px',
          });
        }

        runtime.setPositionState({
          side: parsedPlacement.side,
          align: parsedPlacement.align,
          anchorHidden: Boolean(hideData?.referenceHidden),
          arrowOffsetX: arrowData?.x ?? null,
          arrowOffsetY: arrowData?.y ?? null,
          arrowUncentered:
            arrowData?.centerOffset != null ? Math.abs(arrowData.centerOffset) > 0.5 : false,
          transformOrigin: getTransformOrigin(
            parsedPlacement.side,
            parsedPlacement.align,
            arrowData?.x ?? null,
            arrowData?.y ?? null,
          ),
        });

        element.style.setProperty('--transform-origin', runtime.getPositionState().transformOrigin);
      });
    };

    updatePosition();
    this.cleanupAutoUpdate = autoUpdate(anchorElement, element, updatePosition, {
      elementResize: !Boolean(props.disableAnchorTracking),
      layoutShift: !Boolean(props.disableAnchorTracking),
    });
  }
}

function normalizeBoundary(boundary: CollisionBoundary): FloatingBoundary | undefined {
  if (boundary == null) {
    return undefined;
  }

  if (boundary === 'clipping-ancestors') {
    return 'clippingAncestors';
  }

  if (Array.isArray(boundary)) {
    return [...boundary] as Boundary;
  }

  return boundary as Boundary;
}

function getInternalBackdropStyle(triggerElement: HTMLElement | null, open: boolean) {
  let clipPath: string | undefined;

  if (triggerElement != null) {
    const rect = triggerElement.getBoundingClientRect();
    clipPath = `polygon(
      0% 0%,
      100% 0%,
      100% 100%,
      0% 100%,
      0% 0%,
      ${rect.left}px ${rect.top}px,
      ${rect.left}px ${rect.bottom}px,
      ${rect.right}px ${rect.bottom}px,
      ${rect.right}px ${rect.top}px,
      ${rect.left}px ${rect.top}px
    )`;
  }

  return {
    position: 'fixed',
    inset: '0',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    clipPath,
    pointerEvents: open ? undefined : 'none',
  };
}

function getActivationDirection(offset: { horizontal: number; vertical: number } | null) {
  if (offset == null) {
    return undefined;
  }

  return `${getValueWithTolerance(offset.horizontal, 5, 'right', 'left')} ${getValueWithTolerance(offset.vertical, 5, 'down', 'up')}`;
}

function getValueWithTolerance(
  value: number,
  tolerance: number,
  positiveLabel: string,
  negativeLabel: string,
) {
  if (value > tolerance) {
    return positiveLabel;
  }

  if (value < -tolerance) {
    return negativeLabel;
  }

  return '';
}

function calculateRelativePosition(from: Element, to: Element) {
  const fromRect = from.getBoundingClientRect();
  const toRect = to.getBoundingClientRect();

  return {
    horizontal: toRect.left + toRect.width / 2 - (fromRect.left + fromRect.width / 2),
    vertical: toRect.top + toRect.height / 2 - (fromRect.top + fromRect.height / 2),
  };
}

const popoverPositionerDirective = directive(PopoverPositionerDirective);

class PopoverPopupDirective extends PopoverPartDirective<PopoverPopupProps, HTMLDivElement> {
  private lastOpen = false;

  render(_componentProps: PopoverPopupProps) {
    return noChange;
  }

  override update(
    _part: Parameters<AsyncDirective['update']>[0],
    [componentProps]: [PopoverPopupProps],
  ) {
    this.latestProps = componentProps;
    return this.renderCurrent();
  }

  override disconnected() {
    this.runtime?.setPopupFinalFocus(undefined);
    super.disconnected();
  }

  renderCurrent() {
    const runtime = this.runtime;
    const props = this.latestProps ?? {};
    const {
      children,
      finalFocus,
      initialFocus: _initialFocus,
      ref: forwardedRef,
      render,
      ...elementProps
    } = props as PopoverPopupProps & Record<string, unknown>;
    void _initialFocus;
    runtime?.setPopupFinalFocus(finalFocus);
    const position = runtime?.getPositionState();
    const state = {
      open: runtime?.getOpen() ?? false,
      side: position?.side ?? 'bottom',
      align: position?.align ?? 'center',
      instant: runtime?.getInstantType(),
      transitionStatus: runtime?.getTransitionStatus(),
    } satisfies PopoverPopupState;

    const stateAttributes = {
      ...composeStateAttributes(state as Record<string, unknown>, popupStateAttributes),
      'data-side': state.side,
      'data-align': state.align,
      'data-instant': state.instant ?? undefined,
    };

    const template = useRender<PopoverPopupState, HTMLDivElement>({
      defaultTagName: 'div',
      render: render as Parameters<
        typeof useRender<PopoverPopupState, HTMLDivElement>
      >[0]['render'],
      ref: [
        (element) => {
          this.element = element;
          if (element != null) {
            this.setRuntime(findPopoverRuntime(element));
            this.runtime?.setPopupElement(element);
            this.runtime?.setPopupId(element.id || this.runtime.getPopupId());
          }
          assignRef(forwardedRef as Ref<HTMLDivElement>, element);
          this.syncOpenFocus();
        },
      ],
      state,
      props: {
        [POPUP_ATTRIBUTE]: '',
        id: runtime?.getPopupId(),
        role: 'dialog',
        tabindex: '-1',
        hidden: runtime != null ? !runtime.isMounted() : true,
        'aria-labelledby': runtime?.getTitleId(),
        'aria-describedby': runtime?.getDescriptionId(),
        style: {
          transformOrigin: position?.transformOrigin,
        },
        onMouseEnter: (event: MouseEvent) => {
          runtime?.enterHoverRegion();
          (elementProps.onMouseEnter as ((event: MouseEvent) => void) | undefined)?.(event);
        },
        onMouseLeave: (event: MouseEvent) => {
          runtime?.leaveHoverRegion(event, runtime?.getHoverCloseDelay() ?? 0);
          (elementProps.onMouseLeave as ((event: MouseEvent) => void) | undefined)?.(event);
        },
        onKeyDown: (event: KeyboardEvent) => {
          this.trapFocus(event);
          (elementProps.onKeyDown as ((event: KeyboardEvent) => void) | undefined)?.(event);
        },
        ...stateAttributes,
        ...(children === undefined ? elementProps : { ...elementProps, children }),
      },
    });

    this.syncOpenFocus();
    return template;
  }

  private syncOpenFocus() {
    const runtime = this.runtime;
    const open = runtime?.getOpen() ?? false;

    if (open && !this.lastOpen) {
      queueMicrotask(() => {
        this.focusInitial();
      });
    }

    this.lastOpen = open;
  }

  private focusInitial() {
    const runtime = this.runtime;
    const props = this.latestProps;
    const popup = this.element;

    if (runtime == null || popup == null || props == null || !runtime.getOpen()) {
      return;
    }

    if (runtime.getOpenReason() === 'trigger-hover') {
      return;
    }

    const initialFocus = props.initialFocus;
    const interactionType = runtime.getOpenMethod() ?? 'mouse';
    let target: HTMLElement | boolean | null | undefined;

    if (typeof initialFocus === 'function') {
      target = initialFocus(interactionType) ?? undefined;
    } else if (
      initialFocus != null &&
      typeof initialFocus === 'object' &&
      'current' in initialFocus
    ) {
      target = initialFocus.current;
    } else {
      target = initialFocus;
    }

    if (target === false) {
      return;
    }

    if (target === true || target == null) {
      if (interactionType === 'touch') {
        popup.focus({ preventScroll: true });
        return;
      }

      const firstFocusable = getFocusableElements(popup)[0];
      (firstFocusable ?? popup).focus({ preventScroll: true });
      return;
    }

    if (isHTMLElement(target)) {
      target.focus({ preventScroll: true });
    }
  }

  private trapFocus(event: KeyboardEvent) {
    const runtime = this.runtime;
    const popup = this.element;

    if (
      event.key !== 'Tab' ||
      runtime == null ||
      popup == null ||
      runtime.getModal() === false ||
      runtime.getClosePartCount() === 0
    ) {
      return;
    }

    const focusable = getFocusableElements(popup);
    if (focusable.length === 0) {
      event.preventDefault();
      popup.focus({ preventScroll: true });
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const activeElement = popup.ownerDocument.activeElement as HTMLElement | null;

    if (!event.shiftKey && activeElement === last) {
      event.preventDefault();
      first?.focus({ preventScroll: true });
    } else if (event.shiftKey && activeElement === first) {
      event.preventDefault();
      last?.focus({ preventScroll: true });
    }
  }
}

const popoverPopupDirective = directive(PopoverPopupDirective);

class PopoverArrowDirective extends PopoverPartDirective<PopoverArrowProps, HTMLDivElement> {
  render(_componentProps: PopoverArrowProps) {
    return noChange;
  }

  override update(
    _part: Parameters<AsyncDirective['update']>[0],
    [componentProps]: [PopoverArrowProps],
  ) {
    this.latestProps = componentProps;
    return this.renderCurrent();
  }

  renderCurrent() {
    const runtime = this.runtime;
    const props = this.latestProps ?? {};
    const {
      children,
      ref: forwardedRef,
      render,
      ...elementProps
    } = props as PopoverArrowProps & Record<string, unknown>;
    const position = runtime?.getPositionState();
    const state = {
      open: runtime?.getOpen() ?? false,
      side: position?.side ?? 'bottom',
      align: position?.align ?? 'center',
      uncentered: position?.arrowUncentered ?? false,
    } satisfies PopoverArrowState;

    return useRender<PopoverArrowState, HTMLDivElement>({
      defaultTagName: 'div',
      render: render as Parameters<
        typeof useRender<PopoverArrowState, HTMLDivElement>
      >[0]['render'],
      ref: [
        (element) => {
          this.element = element;
          if (element != null) {
            this.setRuntime(findPopoverRuntime(element));
            this.runtime?.setArrowElement(element);
          }
          assignRef(forwardedRef as Ref<HTMLDivElement>, element);
        },
      ],
      state,
      props: {
        [ARROW_ATTRIBUTE]: '',
        'aria-hidden': 'true',
        'data-open': state.open ? '' : undefined,
        'data-side': state.side,
        'data-align': state.align,
        'data-uncentered': state.uncentered ? '' : undefined,
        ...(children === undefined ? elementProps : { ...elementProps, children }),
      },
    });
  }
}

const popoverArrowDirective = directive(PopoverArrowDirective);

class PopoverBackdropDirective extends PopoverPartDirective<PopoverBackdropProps, HTMLDivElement> {
  render(_componentProps: PopoverBackdropProps) {
    return noChange;
  }

  override update(
    _part: Parameters<AsyncDirective['update']>[0],
    [componentProps]: [PopoverBackdropProps],
  ) {
    this.latestProps = componentProps;
    return this.renderCurrent();
  }

  renderCurrent() {
    const runtime = this.runtime;
    const props = this.latestProps ?? {};
    const {
      children,
      ref: forwardedRef,
      render,
      ...elementProps
    } = props as PopoverBackdropProps & Record<string, unknown>;
    const state = {
      open: runtime?.getOpen() ?? false,
      transitionStatus: runtime?.getTransitionStatus(),
    } satisfies PopoverBackdropState;

    return useRender<PopoverBackdropState, HTMLDivElement>({
      defaultTagName: 'div',
      render: render as Parameters<
        typeof useRender<PopoverBackdropState, HTMLDivElement>
      >[0]['render'],
      ref: [
        (element) => {
          this.element = element;
          if (element != null) {
            this.setRuntime(findPopoverRuntime(element));
            this.runtime?.setBackdropElement(element as HTMLDivElement | null);
          }
          assignRef(forwardedRef as Ref<HTMLDivElement>, element as HTMLDivElement | null);
        },
      ],
      state,
      props: {
        [BACKDROP_ATTRIBUTE]: '',
        role: 'presentation',
        hidden: runtime != null ? !runtime.isMounted() : true,
        style:
          runtime?.getOpenReason() === 'trigger-hover'
            ? POINTER_EVENTS_NONE_STYLE
            : {
                userSelect: 'none',
                WebkitUserSelect: 'none',
              },
        onClick: (event: MouseEvent) => {
          if (runtime?.getOpenReason() !== 'trigger-hover') {
            runtime?.close(event, 'outside-press', undefined);
          }
          (elementProps.onClick as ((event: MouseEvent) => void) | undefined)?.(event);
        },
        ...composeStateAttributes(state as Record<string, unknown>, popupStateAttributes),
        ...(children === undefined ? elementProps : { ...elementProps, children }),
      },
    });
  }
}

const popoverBackdropDirective = directive(PopoverBackdropDirective);

class PopoverTitleDirective extends PopoverPartDirective<PopoverTitleProps, HTMLHeadingElement> {
  private generatedId = `${GENERATED_ID_PREFIX}-title-${(generatedPopoverId += 1)}`;

  render(_componentProps: PopoverTitleProps) {
    return noChange;
  }

  override update(
    _part: Parameters<AsyncDirective['update']>[0],
    [componentProps]: [PopoverTitleProps],
  ) {
    this.latestProps = componentProps;
    return this.renderCurrent();
  }

  override disconnected() {
    this.runtime?.setTitleId(undefined);
    super.disconnected();
  }

  renderCurrent() {
    const props = this.latestProps ?? {};
    const {
      children,
      ref: forwardedRef,
      render,
      ...elementProps
    } = props as PopoverTitleProps & Record<string, unknown>;
    const id = (props.id as string | undefined) ?? this.generatedId;

    return useRender<PopoverTitleState, HTMLHeadingElement>({
      defaultTagName: 'h2',
      render: render as Parameters<
        typeof useRender<PopoverTitleState, HTMLHeadingElement>
      >[0]['render'],
      ref: [
        (element) => {
          this.element = element;
          if (element != null) {
            this.setRuntime(findPopoverRuntime(element));
            this.runtime?.setTitleId(id);
          }
          assignRef(forwardedRef as Ref<HTMLHeadingElement>, element);
        },
      ],
      state: {},
      props: {
        [TITLE_ATTRIBUTE]: '',
        id,
        ...(children === undefined ? elementProps : { ...elementProps, children }),
      },
    });
  }
}

const popoverTitleDirective = directive(PopoverTitleDirective);

class PopoverDescriptionDirective extends PopoverPartDirective<
  PopoverDescriptionProps,
  HTMLParagraphElement
> {
  private generatedId = `${GENERATED_ID_PREFIX}-description-${(generatedPopoverId += 1)}`;

  render(_componentProps: PopoverDescriptionProps) {
    return noChange;
  }

  override update(
    _part: Parameters<AsyncDirective['update']>[0],
    [componentProps]: [PopoverDescriptionProps],
  ) {
    this.latestProps = componentProps;
    return this.renderCurrent();
  }

  override disconnected() {
    this.runtime?.setDescriptionId(undefined);
    super.disconnected();
  }

  renderCurrent() {
    const props = this.latestProps ?? {};
    const {
      children,
      ref: forwardedRef,
      render,
      ...elementProps
    } = props as PopoverDescriptionProps & Record<string, unknown>;
    const id = (props.id as string | undefined) ?? this.generatedId;

    return useRender<PopoverDescriptionState, HTMLParagraphElement>({
      defaultTagName: 'p',
      render: render as Parameters<
        typeof useRender<PopoverDescriptionState, HTMLParagraphElement>
      >[0]['render'],
      ref: [
        (element) => {
          this.element = element;
          if (element != null) {
            this.setRuntime(findPopoverRuntime(element));
            this.runtime?.setDescriptionId(id);
          }
          assignRef(forwardedRef as Ref<HTMLParagraphElement>, element);
        },
      ],
      state: {},
      props: {
        [DESCRIPTION_ATTRIBUTE]: '',
        id,
        ...(children === undefined ? elementProps : { ...elementProps, children }),
      },
    });
  }
}

const popoverDescriptionDirective = directive(PopoverDescriptionDirective);

class PopoverCloseDirective extends PopoverPartDirective<PopoverCloseProps, HTMLElement> {
  private unregisterClosePart: (() => void) | null = null;

  render(_componentProps: PopoverCloseProps) {
    return noChange;
  }

  override update(
    _part: Parameters<AsyncDirective['update']>[0],
    [componentProps]: [PopoverCloseProps],
  ) {
    this.latestProps = componentProps;
    return this.renderCurrent();
  }

  override disconnected() {
    this.unregisterClosePart?.();
    this.unregisterClosePart = null;
    super.disconnected();
  }

  renderCurrent() {
    const props = this.latestProps ?? {};
    const {
      children,
      disabled: disabledProp,
      nativeButton,
      ref: forwardedRef,
      render,
      ...elementProps
    } = props as PopoverCloseProps & Record<string, unknown>;
    const resolvedNativeButton = nativeButton ?? true;
    const disabled = Boolean(disabledProp);

    return useRender<PopoverCloseState, HTMLElement>({
      defaultTagName: 'button',
      render: render as Parameters<typeof useRender<PopoverCloseState, HTMLElement>>[0]['render'],
      ref: [
        (element) => {
          this.element = element;
          if (element != null) {
            this.setRuntime(findPopoverRuntime(element));
            this.unregisterClosePart?.();
            this.unregisterClosePart = this.runtime?.registerClosePart() ?? null;
          }
          assignRef(forwardedRef as Ref<HTMLElement>, element);
        },
      ],
      state: {},
      props: {
        [CLOSE_ATTRIBUTE]: '',
        type: resolvedNativeButton ? 'button' : undefined,
        role: resolvedNativeButton ? undefined : 'button',
        tabindex: resolvedNativeButton ? undefined : disabled ? '-1' : '0',
        disabled: resolvedNativeButton ? disabled : undefined,
        'aria-disabled': disabled ? 'true' : undefined,
        onClick: (event: MouseEvent) => {
          if (disabled) {
            event.preventDefault();
            return;
          }

          this.runtime?.close(event, 'close-press', this.element ?? undefined);
          (props.onClick as ((event: MouseEvent) => void) | undefined)?.(event);
        },
        onKeyDown: (event: KeyboardEvent) => {
          if (!resolvedNativeButton && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            this.runtime?.close(event, 'close-press', this.element ?? undefined);
          }
          (elementProps.onKeyDown as ((event: KeyboardEvent) => void) | undefined)?.(event);
        },
        ...(children === undefined ? elementProps : { ...elementProps, children }),
      },
    });
  }
}

const popoverCloseDirective = directive(PopoverCloseDirective);

class PopoverViewportDirective extends PopoverPartDirective<PopoverViewportProps, HTMLDivElement> {
  private currentContainer: HTMLDivElement | null = null;
  private previousContainer: HTMLDivElement | null = null;
  private capturedNode: HTMLDivElement | null = null;
  private previousContentNode: HTMLDivElement | null = null;
  private previousContentDimensions: { width: number; height: number } | null = null;
  private activeTriggerElement: HTMLElement | null = null;
  private lastHandledTriggerElement: HTMLElement | null = null;
  private activationDirection: string | undefined = undefined;
  private transitioning = false;
  private showStartingStyleAttribute = false;
  private currentContentKey = 0;
  private frameId: number | null = null;
  private transitionRunId = 0;

  render(_componentProps: PopoverViewportProps) {
    return noChange;
  }

  override update(
    _part: Parameters<AsyncDirective['update']>[0],
    [componentProps]: [PopoverViewportProps],
  ) {
    this.latestProps = componentProps;
    return this.renderCurrent();
  }

  override disconnected() {
    super.disconnected();
    this.clearScheduledFrame();
    this.currentContainer = null;
    this.previousContainer = null;
    this.capturedNode = null;
    this.previousContentNode = null;
    this.previousContentDimensions = null;
    this.activeTriggerElement = null;
    this.lastHandledTriggerElement = null;
    this.activationDirection = undefined;
    this.transitioning = false;
    this.showStartingStyleAttribute = false;
  }

  renderCurrent() {
    const runtime = this.runtime;
    const props = this.latestProps ?? {};
    const {
      children,
      ref: forwardedRef,
      render,
      ...elementProps
    } = props as PopoverViewportProps & Record<string, unknown>;
    this.syncTriggerTransition();
    const state = {
      activationDirection: this.activationDirection,
      transitioning: this.transitioning,
      instant: runtime?.getInstantType(),
    } satisfies PopoverViewportState;

    const currentContainer = html`${keyed(
      this.currentContentKey,
      html`<div
        data-current
        ${this.showStartingStyleAttribute ? DATA_STARTING_STYLE : nothing}
        ${ref((element) => {
          this.currentContainer = element as HTMLDivElement | null;
          if (element instanceof HTMLDivElement) {
            queueMicrotask(() => {
              if (this.currentContainer === element) {
                this.captureCurrentContent();
              }
            });
          }
        })}
      >
        ${children}
      </div>`,
    )}`;

    const childrenToRender = this.transitioning
      ? html`${html`<div
          data-previous
          inert=""
          style=${styleMap({
            ...(this.previousContentDimensions != null
              ? {
                  [POPUP_WIDTH_CSS_VAR]: `${this.previousContentDimensions.width}px`,
                  [POPUP_HEIGHT_CSS_VAR]: `${this.previousContentDimensions.height}px`,
                }
              : null),
            position: 'absolute',
          })}
          ${this.showStartingStyleAttribute ? nothing : DATA_ENDING_STYLE}
          ${ref((element) => {
            this.previousContainer = element as HTMLDivElement | null;
            if (element instanceof HTMLDivElement) {
              this.syncPreviousContent();
            }
          })}
        ></div>`}${currentContainer}`
      : currentContainer;

    return useRender<PopoverViewportState, HTMLDivElement>({
      defaultTagName: 'div',
      render: render as Parameters<
        typeof useRender<PopoverViewportState, HTMLDivElement>
      >[0]['render'],
      ref: [
        (element) => {
          this.element = element;
          if (element != null) {
            this.setRuntime(findPopoverRuntime(element));
          }
          assignRef(forwardedRef as Ref<HTMLDivElement>, element);
        },
      ],
      state,
      props: {
        [VIEWPORT_ATTRIBUTE]: '',
        'data-activation-direction': state.activationDirection,
        'data-transitioning': state.transitioning ? '' : undefined,
        'data-instant': state.instant ?? undefined,
        ...elementProps,
        children: childrenToRender,
      },
    });
  }

  private syncTriggerTransition() {
    const runtime = this.runtime;
    const nextActiveTrigger =
      runtime?.getOpen() === true ? runtime.getActiveTriggerElement() : null;
    const previousActiveTrigger = this.activeTriggerElement;

    if (
      nextActiveTrigger != null &&
      previousActiveTrigger != null &&
      nextActiveTrigger !== previousActiveTrigger &&
      this.lastHandledTriggerElement !== nextActiveTrigger &&
      this.capturedNode != null
    ) {
      this.previousContentNode = this.capturedNode.cloneNode(true) as HTMLDivElement;
      this.previousContentDimensions = this.measureCurrentContent();
      this.activationDirection = getActivationDirection(
        calculateRelativePosition(previousActiveTrigger, nextActiveTrigger),
      );
      this.transitioning = true;
      this.showStartingStyleAttribute = true;
      this.currentContentKey += 1;
      this.lastHandledTriggerElement = nextActiveTrigger;
      this.scheduleStartingStyleCleanup();
      this.scheduleTransitionCleanup();
    }

    this.activeTriggerElement = nextActiveTrigger;

    if (nextActiveTrigger == null) {
      this.lastHandledTriggerElement = null;
    }
  }

  private captureCurrentContent() {
    const source = this.currentContainer;
    if (source == null) {
      return;
    }

    const wrapper = document.createElement('div');
    for (const child of Array.from(source.childNodes)) {
      wrapper.appendChild(child.cloneNode(true));
    }

    this.capturedNode = wrapper;
  }

  private syncPreviousContent() {
    const container = this.previousContainer;
    const content = this.previousContentNode;
    if (container == null || content == null) {
      return;
    }

    container.replaceChildren(
      ...Array.from(content.childNodes).map((node) => node.cloneNode(true)),
    );
  }

  private measureCurrentContent() {
    const rect = this.currentContainer?.getBoundingClientRect();
    if (rect == null) {
      return null;
    }

    return {
      width: rect.width,
      height: rect.height,
    };
  }

  private scheduleStartingStyleCleanup() {
    this.clearScheduledFrame();

    this.frameId = requestAnimationFrame(() => {
      this.frameId = null;

      if (!this.transitioning || !this.showStartingStyleAttribute) {
        return;
      }

      this.showStartingStyleAttribute = false;
      this.requestRender();
    });
  }

  private scheduleTransitionCleanup() {
    const runId = ++this.transitionRunId;

    requestAnimationFrame(() => {
      this.waitForTransitionAnimations(runId);
    });
  }

  private waitForTransitionAnimations(runId: number) {
    if (runId !== this.transitionRunId) {
      return;
    }

    const currentContainer = this.currentContainer;

    if (
      currentContainer == null ||
      typeof currentContainer.getAnimations !== 'function' ||
      (
        globalThis as typeof globalThis & {
          BASE_UI_ANIMATIONS_DISABLED?: boolean | undefined;
        }
      ).BASE_UI_ANIMATIONS_DISABLED
    ) {
      this.finishTransition(runId);
      return;
    }

    Promise.all(currentContainer.getAnimations().map((animation) => animation.finished))
      .then(() => {
        this.finishTransition(runId);
      })
      .catch(() => {
        this.finishTransition(runId);
      });
  }

  private finishTransition(runId: number) {
    if (runId !== this.transitionRunId) {
      return;
    }

    this.previousContentNode = null;
    this.previousContentDimensions = null;
    this.activationDirection = undefined;
    this.transitioning = false;
    this.requestRender();
  }

  private clearScheduledFrame() {
    if (this.frameId != null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
  }
}

const popoverViewportDirective = directive(PopoverViewportDirective);

export interface PopoverRootState {}

export interface PopoverRootActions {
  close(): void;
  unmount(): void;
}

export interface PopoverRootProps<Payload = unknown> {
  defaultOpen?: boolean | undefined;
  open?: boolean | undefined;
  onOpenChange?: ((open: boolean, eventDetails: PopoverRootChangeEventDetails) => void) | undefined;
  onOpenChangeComplete?: ((open: boolean) => void) | undefined;
  actionsRef?: RefObject<PopoverRootActions | null> | undefined;
  modal?: Modal | undefined;
  triggerId?: string | null | undefined;
  defaultTriggerId?: string | null | undefined;
  handle?: PopoverHandle<Payload> | undefined;
  children?: RootChildren<Payload>;
}

export type PopoverRootChangeEventReason = ChangeReason;
export type PopoverRootChangeEventDetails = BaseUIChangeEventDetails<
  PopoverRootChangeEventReason,
  { preventUnmountOnClose(): void }
>;

export namespace PopoverRoot {
  export type State = PopoverRootState;
  export type Props<Payload = unknown> = PopoverRootProps<Payload>;
  export type Actions = PopoverRootActions;
  export type ChangeEventReason = PopoverRootChangeEventReason;
  export type ChangeEventDetails = PopoverRootChangeEventDetails;
}

export type PopoverTriggerProps<Payload = unknown> = ComponentPropsWithChildren<
  'button',
  PopoverTriggerState
> & {
  nativeButton?: boolean | undefined;
  handle?: PopoverHandle<Payload> | undefined;
  payload?: Payload | undefined;
  id?: string | undefined;
  disabled?: boolean | undefined;
  openOnHover?: boolean | undefined;
  delay?: number | undefined;
  closeDelay?: number | undefined;
};

export interface PopoverTriggerState {
  disabled: boolean;
  open: boolean;
}

export namespace PopoverTrigger {
  export type State = PopoverTriggerState;
  export type Props<Payload = unknown> = PopoverTriggerProps<Payload>;
}

export interface PopoverPortalState {}

export interface PopoverPortalProps {
  children?: unknown;
  container?:
    | Element
    | ShadowRoot
    | RefObject<Element | ShadowRoot | null>
    | (() => Element | ShadowRoot | null | undefined)
    | undefined;
  keepMounted?: boolean | undefined;
  handle?: PopoverHandle<any> | undefined;
}

export namespace PopoverPortal {
  export type State = PopoverPortalState;
  export type Props = PopoverPortalProps;
}

export interface PopoverPositionerState {
  open: boolean;
  side: Side;
  align: Align;
  anchorHidden: boolean;
  instant: string | undefined;
}

export interface PopoverPositionerProps extends ComponentPropsWithChildren<
  'div',
  PopoverPositionerState
> {
  anchor?:
    | Element
    | RefObject<Element | null>
    | (() => Element | null | undefined)
    | null
    | undefined;
  positionMethod?: PositionMethod | undefined;
  side?: Side | 'inline-start' | 'inline-end' | undefined;
  align?: Align | undefined;
  sideOffset?: number | undefined;
  alignOffset?: number | undefined;
  collisionBoundary?: CollisionBoundary | undefined;
  collisionPadding?: number | undefined;
  arrowPadding?: number | undefined;
  sticky?: boolean | undefined;
  disableAnchorTracking?: boolean | undefined;
  collisionAvoidance?: 'flip' | 'shift' | 'none' | undefined;
}

export namespace PopoverPositioner {
  export type State = PopoverPositionerState;
  export type Props = PopoverPositionerProps;
}

export interface PopoverPopupState {
  open: boolean;
  side: Side;
  align: Align;
  transitionStatus: TransitionStatus;
  instant: InstantType;
}

export interface PopoverPopupProps extends ComponentPropsWithChildren<'div', PopoverPopupState> {
  initialFocus?: PopupFocusProp;
  finalFocus?: PopupFocusProp;
}

export namespace PopoverPopup {
  export type State = PopoverPopupState;
  export type Props = PopoverPopupProps;
}

export interface PopoverArrowState {
  open: boolean;
  side: Side;
  align: Align;
  uncentered: boolean;
}

export interface PopoverArrowProps extends ComponentPropsWithChildren<'div', PopoverArrowState> {}

export namespace PopoverArrow {
  export type State = PopoverArrowState;
  export type Props = PopoverArrowProps;
}

export interface PopoverBackdropState {
  open: boolean;
  transitionStatus: TransitionStatus;
}

export interface PopoverBackdropProps extends ComponentPropsWithChildren<
  'div',
  PopoverBackdropState
> {}

export namespace PopoverBackdrop {
  export type State = PopoverBackdropState;
  export type Props = PopoverBackdropProps;
}

export interface PopoverTitleState {}

export interface PopoverTitleProps extends ComponentPropsWithChildren<
  'h2',
  PopoverTitleState,
  unknown,
  HTMLProps<HTMLHeadingElement>
> {}

export namespace PopoverTitle {
  export type State = PopoverTitleState;
  export type Props = PopoverTitleProps;
}

export interface PopoverDescriptionState {}

export interface PopoverDescriptionProps extends ComponentPropsWithChildren<
  'p',
  PopoverDescriptionState
> {}

export namespace PopoverDescription {
  export type State = PopoverDescriptionState;
  export type Props = PopoverDescriptionProps;
}

export interface PopoverCloseState {}

export interface PopoverCloseProps extends ComponentPropsWithChildren<'button', PopoverCloseState> {
  nativeButton?: boolean | undefined;
  disabled?: boolean | undefined;
}

export namespace PopoverClose {
  export type State = PopoverCloseState;
  export type Props = PopoverCloseProps;
}

export interface PopoverViewportState {
  activationDirection: string | undefined;
  transitioning: boolean;
  instant: InstantType;
}

export interface PopoverViewportProps extends ComponentPropsWithChildren<
  'div',
  PopoverViewportState
> {}

export namespace PopoverViewport {
  export type State = PopoverViewportState;
  export type Props = PopoverViewportProps;
}

export function PopoverRoot<Payload = unknown>(props: PopoverRootProps<Payload>) {
  return html`${popoverRootDirective(props)}`;
}

export function PopoverTrigger<Payload = unknown>(props: PopoverTriggerProps<Payload>) {
  return html`${popoverTriggerDirective(props)}`;
}

export function PopoverPortal(props: PopoverPortalProps) {
  return html`${popoverPortalDirective(props)}`;
}

export function PopoverPositioner(props: PopoverPositionerProps) {
  return html`${popoverPositionerDirective(props)}`;
}

export function PopoverPopup(props: PopoverPopupProps) {
  return html`${popoverPopupDirective(props)}`;
}

export function PopoverArrow(props: PopoverArrowProps) {
  return html`${popoverArrowDirective(props)}`;
}

export function PopoverBackdrop(props: PopoverBackdropProps) {
  return html`${popoverBackdropDirective(props)}`;
}

export function PopoverTitle(props: PopoverTitleProps) {
  return html`${popoverTitleDirective(props)}`;
}

export function PopoverDescription(props: PopoverDescriptionProps) {
  return html`${popoverDescriptionDirective(props)}`;
}

export function PopoverClose(props: PopoverCloseProps) {
  return html`${popoverCloseDirective(props)}`;
}

export function PopoverViewport(props: PopoverViewportProps) {
  return html`${popoverViewportDirective(props)}`;
}

export const Popover = {
  Root: PopoverRoot,
  Trigger: PopoverTrigger,
  Portal: PopoverPortal,
  Positioner: PopoverPositioner,
  Popup: PopoverPopup,
  Arrow: PopoverArrow,
  Backdrop: PopoverBackdrop,
  Title: PopoverTitle,
  Description: PopoverDescription,
  Close: PopoverClose,
  Viewport: PopoverViewport,
  createHandle: createPopoverHandle,
  Handle: PopoverHandle,
};
