import { html, ReactiveElement } from 'lit';
import {
  arrow as floatingArrow,
  autoUpdate,
  computePosition,
  flip,
  hide,
  limitShift,
  offset,
  shift,
  type Placement,
} from '@floating-ui/react-dom';
import { BaseHTMLElement, ensureId } from '../utils/index.ts';

// ─── Constants ──────────────────────────────────────────────────────────────────

const TOOLTIP_ROOT_ATTRIBUTE = 'data-base-ui-tooltip-root';
const TOOLTIP_PROVIDER_ATTRIBUTE = 'data-base-ui-tooltip-provider';
const TOOLTIP_STATE_CHANGE_EVENT = 'base-ui-tooltip-state-change';
const DEFAULT_OPEN_DELAY = 600;
const DEFAULT_CLOSE_DELAY = 0;
const DEFAULT_PROVIDER_TIMEOUT = 400;
const TOOLTIP_ROOT_CONTEXT = Symbol('base-ui-tooltip-root-context');

// ─── Types ──────────────────────────────────────────────────────────────────────

type Side = 'top' | 'right' | 'bottom' | 'left';
type Align = 'start' | 'center' | 'end';
type TransitionStatus = 'starting' | 'ending' | undefined;
type TooltipChildren = unknown;

export type TooltipChangeEventReason =
  | 'trigger-hover'
  | 'trigger-focus'
  | 'trigger-press'
  | 'disabled'
  | 'imperative-action'
  | 'escape-key'
  | 'none';

export interface TooltipChangeEventDetails {
  reason: TooltipChangeEventReason;
  event: Event;
  trigger: Element | undefined;
  readonly isCanceled: boolean;
  readonly isPropagationAllowed: boolean;
  cancel(): void;
  allowPropagation(): void;
}

export interface TooltipRootActions {
  close: () => void;
  unmount: () => void;
}

export interface TooltipRootProps<Payload = unknown> {
  defaultOpen?: boolean | undefined;
  open?: boolean | undefined;
  onOpenChange?: ((open: boolean, details: TooltipChangeEventDetails) => void) | undefined;
  onOpenChangeComplete?: ((open: boolean) => void) | undefined;
  handle?: TooltipHandle<Payload> | undefined;
  triggerId?: string | null | undefined;
  defaultTriggerId?: string | null | undefined;
  actionsRef?: { current: TooltipRootActions | null } | undefined;
  disabled?: boolean | undefined;
  disableHoverablePopup?: boolean | undefined;
  children?:
    | TooltipChildren
    | ((arg: { payload: Payload | undefined }) => TooltipChildren)
    | undefined;
}

export interface TooltipProviderProps {
  delay?: number | null | undefined;
  closeDelay?: number | null | undefined;
  timeout?: number | undefined;
  children?: TooltipChildren | undefined;
}

export interface TooltipTriggerProps<Payload = unknown> {
  closeOnClick?: boolean | undefined;
  handle?: TooltipHandle<Payload> | undefined;
  payload?: Payload | undefined;
  disabled?: boolean | undefined;
  delay?: number | null | undefined;
  closeDelay?: number | null | undefined;
  id?: string | undefined;
  children?: TooltipChildren | undefined;
}

export interface TooltipPortalProps {
  container?: HTMLElement | ShadowRoot | null | undefined;
  children?: TooltipChildren | undefined;
}

export interface TooltipPositionerProps {
  side?: Side | undefined;
  sideOffset?: number | undefined;
  align?: Align | undefined;
  alignOffset?: number | undefined;
  collisionAvoidance?: 'flip' | 'shift' | 'none' | undefined;
  collisionPadding?: number | undefined;
  arrowPadding?: number | undefined;
  sticky?: boolean | undefined;
  disableAnchorTracking?: boolean | undefined;
  positionMethod?: 'absolute' | 'fixed' | undefined;
  children?: TooltipChildren | undefined;
}

export interface TooltipPopupProps {
  children?: TooltipChildren | undefined;
}

export interface TooltipArrowProps {
  children?: TooltipChildren | undefined;
}

export interface TooltipViewportProps {
  children?: TooltipChildren | undefined;
}

export class TooltipHandle<Payload = unknown> {
  root: TooltipRootElement<Payload> | null = null;
  triggers = new Map<string, TooltipTriggerElement<Payload>>();
  activeTriggerId: string | null = null;
  activePayload: Payload | undefined;
  private _subscribers = new Set<() => void>();

  /** Subscribe to state changes. Returns an unsubscribe function. */
  subscribe(fn: () => void): () => void {
    this._subscribers.add(fn);
    return () => this._subscribers.delete(fn);
  }

  _notify() {
    this._subscribers.forEach((fn) => fn());
  }

  open(triggerId?: string) {
    const nextTrigger =
      (triggerId ? this.triggers.get(triggerId) : undefined) ??
      (this.activeTriggerId ? this.triggers.get(this.activeTriggerId) : undefined);

    if (triggerId && !nextTrigger) {
      throw new Error(`Base UI: TooltipHandle.open: No trigger found with id "${triggerId}".`);
    }

    this.root?.openImperatively(nextTrigger ?? undefined);
  }

  close() {
    this.root?.closeImperatively();
  }

  get isOpen() {
    return this.root?.getOpen() ?? false;
  }
}

export function createTooltipHandle<Payload = unknown>() {
  return new TooltipHandle<Payload>();
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function createChangeEventDetails(
  reason: TooltipChangeEventReason,
  event: Event,
  trigger: Element | undefined,
): TooltipChangeEventDetails {
  let canceled = false;
  let propagationAllowed = false;
  return {
    reason,
    event,
    trigger,
    get isCanceled() {
      return canceled;
    },
    get isPropagationAllowed() {
      return propagationAllowed;
    },
    cancel() {
      canceled = true;
    },
    allowPropagation() {
      propagationAllowed = true;
    },
  };
}

function toPlacement(side: Side, align: Align): Placement {
  return align === 'center' ? side : `${side}-${align}`;
}

function parsePlacement(placement: Placement): { side: Side; align: Align } {
  const [side, align] = placement.split('-') as [Side, Align | undefined];
  return { side, align: align ?? 'center' };
}

function getTransformOrigin(
  side: Side,
  align: Align,
  arrowX: number | null,
  arrowY: number | null,
) {
  const alignValue = align === 'start' ? '0%' : align === 'end' ? '100%' : '50%';
  if (side === 'top') return `${arrowX != null ? `${arrowX}px` : alignValue} 100%`;
  if (side === 'bottom') return `${arrowX != null ? `${arrowX}px` : alignValue} 0%`;
  if (side === 'left') return `100% ${arrowY != null ? `${arrowY}px` : alignValue}`;
  return `0% ${arrowY != null ? `${arrowY}px` : alignValue}`;
}

// ─── TooltipProviderElement ─────────────────────────────────────────────────────

/**
 * Coordinates tooltip delays for a group. Enables instant switching between
 * adjacent tooltips after one has been opened.
 */
export class TooltipProviderElement extends BaseHTMLElement {
  /** Default open delay for tooltips in this group (ms). */
  delay: number | null = null;

  /** Default close delay for tooltips in this group (ms). */
  closeDelay: number | null = null;

  /** Warmth timeout — how long after one tooltip closes before instant
   *  switching expires (ms). */
  timeout = DEFAULT_PROVIDER_TIMEOUT;

  private _closedAt: number | null = null;

  connectedCallback() {
    this.style.display = 'contents';
    this.setAttribute(TOOLTIP_PROVIDER_ATTRIBUTE, '');
  }

  /** Called by a tooltip root when its tooltip closes. */
  notifyClosed() {
    this._closedAt = Date.now();
  }

  /** Returns `true` if a tooltip was recently closed (within `timeout`). */
  isWarm(): boolean {
    if (this._closedAt == null) return false;
    return Date.now() - this._closedAt < this.timeout;
  }
}

if (!customElements.get('tooltip-provider')) {
  customElements.define('tooltip-provider', TooltipProviderElement);
}

// ─── TooltipRootElement ─────────────────────────────────────────────────────────

export class TooltipRootElement<Payload = unknown> extends ReactiveElement {
  static properties = {
    disabled: { type: Boolean },
  };

  declare disabled: boolean;

  /** Default open state (uncontrolled). */
  defaultOpen = false;

  /** Callback when open state changes. */
  onOpenChange: ((open: boolean, details: TooltipChangeEventDetails) => void) | undefined;
  onOpenChangeComplete: ((open: boolean) => void) | undefined;
  handle: TooltipHandle<Payload> | undefined;
  triggerId: string | null = null;
  defaultTriggerId: string | null = null;
  actionsRef: { current: TooltipRootActions | null } | undefined;
  disableHoverablePopup = false;

  // ── Controlled / uncontrolled ──────────────────────────────────────────────
  private _open: boolean | undefined;
  private _openIsControlled = false;
  private _internalOpen = false;
  private _initialized = false;
  private _transitionStatus: TransitionStatus = undefined;
  private _lastPublishedStateKey: string | null = null;

  // ── Open reasons ───────────────────────────────────────────────────────────
  private _hoverActive = false;
  private _focusActive = false;
  private _openReason: TooltipChangeEventReason | null = null;

  // ── Timers ─────────────────────────────────────────────────────────────────
  private _hoverOpenTimer: number | null = null;
  private _hoverCloseTimer: number | null = null;

  // ── Part references ────────────────────────────────────────────────────────
  private _popupId: string | undefined;
  private _arrowElement: HTMLElement | null = null;
  private _activeTriggerElement: HTMLElement | null = null;
  private _provider: TooltipProviderElement | null = null;
  private _mounted = true;

  // ── Position state ─────────────────────────────────────────────────────────
  private _positionState = {
    side: 'bottom' as Side,
    align: 'center' as Align,
    anchorHidden: false,
    arrowOffsetX: null as number | null,
    arrowOffsetY: null as number | null,
    arrowUncentered: false,
    transformOrigin: '50% 0%',
  };

  get open(): boolean | undefined {
    return this._open;
  }
  set open(value: boolean | undefined) {
    if (value !== undefined) {
      this._openIsControlled = true;
      this._open = value;
    } else {
      this._openIsControlled = false;
      this._open = undefined;
    }
    this._syncAttributes();
    this._publishStateChange();
  }

  constructor() {
    super();
    this.disabled = false;
  }

  override createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();

    if (!this._initialized) {
      this._initialized = true;
      this._internalOpen = this.defaultOpen;
    }

    this._provider = this.closest('tooltip-provider') as TooltipProviderElement | null;

    if (this.handle) {
      this.handle.root = this;
      this.handle.triggers.forEach((trigger) => {
        trigger.refreshRootConnection();
      });
    }

    this.style.display = 'contents';
    this.setAttribute(TOOLTIP_ROOT_ATTRIBUTE, '');
    if (this.actionsRef) {
      this.actionsRef.current = {
        close: () => this.closeImperatively(),
        unmount: () => this.unmountImperatively(),
      };
    }

    document.addEventListener('keydown', this._handleEscapeKey);

    this._syncAttributes();
    queueMicrotask(() => this._syncInitialTrigger());
    queueMicrotask(() => this._publishStateChange());
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('keydown', this._handleEscapeKey);
    this._clearTimers();
    if (this.handle?.root === this) {
      this.handle.root = null;
      this.handle.triggers.forEach((trigger) => {
        trigger.refreshRootConnection();
      });
    }
    if (this.actionsRef) {
      this.actionsRef.current = null;
    }
    this._lastPublishedStateKey = null;
    this._transitionStatus = undefined;
  }

  protected override updated(changedProperties: Map<PropertyKey, unknown>) {
    this._syncAttributes();
    this._publishStateChange();

    if (changedProperties.has('disabled') && this.disabled && this.getOpen()) {
      const event = new Event('base-ui-tooltip-disabled-change');
      this._hoverActive = false;
      this._focusActive = false;
      this._openFromState(false, event, 'disabled');
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  getOpen(): boolean {
    return this._openIsControlled ? Boolean(this._open) : this._internalOpen;
  }

  getPopupId() {
    return this._popupId;
  }
  setPopupId(id: string | undefined) {
    if (this._popupId === id) return;
    this._popupId = id;
    this._publishStateChange();
  }

  getArrowElement() {
    return this._arrowElement;
  }
  setArrowElement(el: HTMLElement | null) {
    this._arrowElement = el;
    this._lastPublishedStateKey = null;
    this._publishStateChange();
  }

  getActiveTriggerElement() {
    return this._activeTriggerElement;
  }
  setActiveTriggerElement(el: HTMLElement | null) {
    this._activeTriggerElement = el;
    if (this.handle) {
      this.handle.activeTriggerId = el?.id ?? null;
      this.handle.activePayload = el instanceof TooltipTriggerElement ? el.payload : undefined;
    }
    this._publishStateChange();
  }

  getTransitionStatus() {
    return this._transitionStatus;
  }
  setTransitionStatus(status: TransitionStatus) {
    if (this._transitionStatus === status) return;
    this._transitionStatus = status;
    this._syncAttributes();
    this._publishStateChange();
  }

  getPositionState() {
    return this._positionState;
  }
  setPositionState(next: Partial<typeof this._positionState>) {
    const merged = { ...this._positionState, ...next };
    const cur = this._positionState;
    if (
      cur.side === merged.side &&
      cur.align === merged.align &&
      cur.anchorHidden === merged.anchorHidden &&
      cur.arrowOffsetX === merged.arrowOffsetX &&
      cur.arrowOffsetY === merged.arrowOffsetY &&
      cur.arrowUncentered === merged.arrowUncentered &&
      cur.transformOrigin === merged.transformOrigin
    )
      return;
    this._positionState = merged;
    this._publishStateChange();
  }

  getProvider() {
    return this._provider;
  }

  openImperatively(trigger?: HTMLElement | undefined) {
    const event = new Event('base-ui-tooltip-imperative-action');
    if (trigger) {
      this.setActiveTriggerElement(trigger);
    } else if (this.triggerId && this.handle) {
      const nextTrigger = this.handle.triggers.get(this.triggerId) ?? null;
      this.setActiveTriggerElement(nextTrigger);
    }

    this._hoverActive = true;
    this._focusActive = false;
    this._openFromState(true, event, 'imperative-action');
  }

  closeImperatively() {
    const event = new Event('base-ui-tooltip-imperative-action');
    this._hoverActive = false;
    this._focusActive = false;
    this._openFromState(false, event, 'imperative-action');
  }

  unmountImperatively() {
    this._mounted = false;
    this.closeImperatively();
  }

  /** Compute the effective open delay, accounting for provider warmth. */
  getEffectiveDelay(triggerDelay: number | null): number {
    if (this._provider?.isWarm()) return 0;
    if (triggerDelay != null) return triggerDelay;
    if (this._provider?.delay != null) return this._provider.delay;
    return DEFAULT_OPEN_DELAY;
  }

  /** Compute the effective close delay. */
  getEffectiveCloseDelay(triggerCloseDelay: number | null): number {
    if (triggerCloseDelay != null) return triggerCloseDelay;
    if (this._provider?.closeDelay != null) return this._provider.closeDelay;
    return DEFAULT_CLOSE_DELAY;
  }

  // ── Hover open / close ─────────────────────────────────────────────────────

  scheduleHoverOpen(delay: number, event: MouseEvent) {
    this._cancelHoverOpen();
    this._hoverOpenTimer = window.setTimeout(() => {
      this._hoverOpenTimer = null;
      this._hoverActive = true;
      this._openFromState(true, event, 'trigger-hover');
    }, delay);
  }

  cancelHoverOpen() {
    this._cancelHoverOpen();
  }

  scheduleHoverClose(closeDelay: number, event: MouseEvent) {
    this._cancelHoverClose();
    this._hoverCloseTimer = window.setTimeout(() => {
      this._hoverCloseTimer = null;
      this._hoverActive = false;
      this._syncOpenState(event, 'none');
    }, closeDelay);
  }

  // ── Focus open / close ─────────────────────────────────────────────────────

  openFromFocus(event: Event) {
    if (this.disabled) return;
    this._focusActive = true;
    this._openFromState(true, event, 'trigger-focus');
  }

  closeFromFocus(event: Event) {
    this._focusActive = false;
    this._syncOpenState(event, 'none');
  }

  // ── Click cancel ───────────────────────────────────────────────────────────

  cancelFromClick(event: Event) {
    this._cancelHoverOpen();
    if (this.getOpen()) {
      this._hoverActive = false;
      this._focusActive = false;
      this._openFromState(false, event, 'trigger-press');
    }
  }

  // ── Internal ───────────────────────────────────────────────────────────────

  private _syncOpenState(event: Event, reason: TooltipChangeEventReason) {
    const shouldBeOpen = !this.disabled && (this._hoverActive || this._focusActive);

    this._openFromState(shouldBeOpen, event, reason);
  }

  private _openFromState(shouldBeOpen: boolean, event: Event, reason: TooltipChangeEventReason) {
    if (shouldBeOpen === this.getOpen()) return;

    const details = createChangeEventDetails(
      reason,
      event,
      this.getActiveTriggerElement() ?? undefined,
    );
    this.onOpenChange?.(shouldBeOpen, details);
    if (details.isCanceled) return;

    this._openReason = reason;

    if (!this._openIsControlled) {
      this._internalOpen = shouldBeOpen;
    }

    if (!shouldBeOpen) {
      this._provider?.notifyClosed();
    }

    this._syncAttributes();
    this._publishStateChange();
    this.onOpenChangeComplete?.(this.getOpen());
  }

  private _handleEscapeKey = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    if (!this.getOpen()) return;

    this._hoverActive = false;
    this._focusActive = false;
    this._clearTimers();

    const details = createChangeEventDetails(
      'escape-key',
      event,
      this.getActiveTriggerElement() ?? undefined,
    );
    this.onOpenChange?.(false, details);
    if (details.isCanceled) return;

    this._openReason = 'escape-key';

    if (!this._openIsControlled) {
      this._internalOpen = false;
    }

    this._provider?.notifyClosed();
    this._syncAttributes();
    this._publishStateChange();
    this.onOpenChangeComplete?.(this.getOpen());
  };

  private _cancelHoverOpen() {
    if (this._hoverOpenTimer != null) {
      window.clearTimeout(this._hoverOpenTimer);
      this._hoverOpenTimer = null;
    }
  }

  private _cancelHoverClose() {
    if (this._hoverCloseTimer != null) {
      window.clearTimeout(this._hoverCloseTimer);
      this._hoverCloseTimer = null;
    }
  }

  private _clearTimers() {
    this._cancelHoverOpen();
    this._cancelHoverClose();
  }

  private _syncAttributes() {
    const open = this.getOpen();
    this.toggleAttribute('data-open', open);
    this.toggleAttribute('data-closed', !open);
    this.toggleAttribute('data-disabled', this.disabled);
  }

  private _publishStateChange() {
    const ps = this._positionState;
    const nextKey = [
      this.getOpen() ? 'open' : 'closed',
      this._transitionStatus ?? 'idle',
      this.handle?.activeTriggerId ?? this.triggerId ?? '',
      this._popupId ?? '',
      this._arrowElement ? 'arrow' : 'no-arrow',
      ps.side,
      ps.align,
      String(ps.anchorHidden),
      String(ps.arrowOffsetX),
      String(ps.arrowOffsetY),
      String(ps.arrowUncentered),
      this._openReason ?? '',
      this.disabled ? 'disabled' : '',
    ].join('|');

    if (nextKey === this._lastPublishedStateKey) return;
    this._lastPublishedStateKey = nextKey;
    this.dispatchEvent(new CustomEvent(TOOLTIP_STATE_CHANGE_EVENT));
    this.handle?._notify();
  }

  private _syncInitialTrigger() {
    const nextTriggerId = this.triggerId ?? (this.defaultOpen ? this.defaultTriggerId : null);

    if (nextTriggerId && this.handle) {
      const trigger = this.handle.triggers.get(nextTriggerId) ?? null;
      this.setActiveTriggerElement(trigger);
      return;
    }

    if (this.getActiveTriggerElement()) {
      return;
    }

    const nextTrigger = (this.querySelector('tooltip-trigger') as HTMLElement | null) ?? null;
    this.setActiveTriggerElement(nextTrigger);
  }
}

if (!customElements.get('tooltip-root')) {
  customElements.define('tooltip-root', TooltipRootElement);
}

// ─── TooltipTriggerElement ──────────────────────────────────────────────────────

export class TooltipTriggerElement<Payload = unknown> extends BaseHTMLElement {
  /** Tooltip-level disabled — prevents tooltip but keeps button interactive. */
  disabled = false;

  /** Open delay override (null = use provider / default). */
  delay: number | null = null;

  /** Close delay override (null = use provider / default). */
  closeDelay: number | null = null;

  /** Whether clicking the trigger cancels the tooltip (default true). */
  closeOnClick = true;
  handle: TooltipHandle<Payload> | undefined;
  payload: Payload | undefined;

  private _root: TooltipRootElement<Payload> | null = null;
  private _handler = () => this._syncAttributes();
  private _missingRootLogged = false;

  connectedCallback() {
    if (!this.id) {
      ensureId(this, 'base-ui-tooltip-trigger');
    }

    this.handle?.triggers.set(this.id, this);
    this._refreshRootConnection();

    this.addEventListener('mouseenter', this._handleMouseEnter);
    this.addEventListener('mousemove', this._handleMouseMove);
    this.addEventListener('mouseleave', this._handleMouseLeave);
    this.addEventListener('focusin', this._handleFocus);
    this.addEventListener('focusout', this._handleBlur);
    this.addEventListener('click', this._handleClick);

    queueMicrotask(() => this._refreshRootConnection());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(TOOLTIP_STATE_CHANGE_EVENT, this._handler);
    if (this.handle?.triggers.get(this.id) === this) {
      this.handle.triggers.delete(this.id);
    }
    this.removeEventListener('mouseenter', this._handleMouseEnter);
    this.removeEventListener('mousemove', this._handleMouseMove);
    this.removeEventListener('mouseleave', this._handleMouseLeave);
    this.removeEventListener('focusin', this._handleFocus);
    this.removeEventListener('focusout', this._handleBlur);
    this.removeEventListener('click', this._handleClick);
    this._root = null;
    this._missingRootLogged = false;
  }

  refreshRootConnection() {
    this._refreshRootConnection();
  }

  private _isDisabled(): boolean {
    return this.disabled || Boolean(this._root?.disabled);
  }

  private _handleMouseEnter = (event: MouseEvent) => {
    if (!this._root || this._isDisabled()) return;
    this._root.setActiveTriggerElement(this);
    const effectiveDelay = this._root.getEffectiveDelay(this.delay);
    this._root.scheduleHoverOpen(effectiveDelay, event);
  };

  private _handleMouseMove = (event: MouseEvent) => {
    // Ensure hover open is scheduled (covers edge cases)
    if (!this._root || this._isDisabled()) return;
    if (this._root.getOpen()) return; // already open
  };

  private _handleMouseLeave = (event: MouseEvent) => {
    if (!this._root) return;
    this._root.cancelHoverOpen();
    const effectiveCloseDelay = this._root.getEffectiveCloseDelay(this.closeDelay);
    this._root.scheduleHoverClose(effectiveCloseDelay, event);
  };

  private _handleFocus = (event: FocusEvent) => {
    if (!this._root || this._isDisabled()) return;
    this._root.setActiveTriggerElement(this);
    this._root.openFromFocus(event);
  };

  private _handleBlur = (event: FocusEvent) => {
    if (!this._root) return;
    this._root.closeFromFocus(event);
  };

  private _handleClick = (event: Event) => {
    if (!this._root) return;
    this._root.setActiveTriggerElement(this);
    if (this.closeOnClick) {
      this._root.cancelFromClick(event);
    }
  };

  private _syncAttributes() {
    if (!this._root) return;

    const open = this._root.getOpen();
    const popupId = this._root.getPopupId();
    const isDisabled = this._isDisabled();
    const isActive = this._root.getActiveTriggerElement() === this;

    // Tooltip trigger uses aria-describedby (not aria-expanded or aria-controls)
    if (open && popupId && isActive) {
      this.setAttribute('aria-describedby', popupId);
    } else {
      this.removeAttribute('aria-describedby');
    }

    this.toggleAttribute('data-popup-open', open && isActive);
    this.toggleAttribute('data-trigger-disabled', isDisabled);
  }

  private _refreshRootConnection() {
    const nextRoot =
      this.handle?.root ?? (this.closest('tooltip-root') as TooltipRootElement<Payload> | null);

    if (this._root !== nextRoot) {
      this._root?.removeEventListener(TOOLTIP_STATE_CHANGE_EVENT, this._handler);
      this._root = nextRoot;
      this._root?.addEventListener(TOOLTIP_STATE_CHANGE_EVENT, this._handler);
    }

    if (!this._root) {
      if (!this.handle && !this._missingRootLogged) {
        console.error('Base UI: Tooltip parts must be placed within <tooltip-root>.');
        this._missingRootLogged = true;
      }
      return;
    }

    this._missingRootLogged = false;
    this._syncAttributes();
  }
}

if (!customElements.get('tooltip-trigger')) {
  customElements.define('tooltip-trigger', TooltipTriggerElement);
}

// ─── TooltipPortalElement ───────────────────────────────────────────────────────

export class TooltipPortalElement extends BaseHTMLElement {
  container: HTMLElement | ShadowRoot | null = null;
  private _root: TooltipRootElement | null = null;
  private _handler = () => this._syncVisibility();
  private portalContainer: HTMLElement | null = null;

  connectedCallback() {
    this.style.display = 'contents';
    this._root = resolveTooltipRoot(this);
    if (!this._root) {
      console.error('Base UI: Tooltip parts must be placed within <tooltip-root>.');
      return;
    }

    this._ensurePortalContainer();
    this._root.addEventListener(TOOLTIP_STATE_CHANGE_EVENT, this._handler);
    queueMicrotask(() => this._syncVisibility());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(TOOLTIP_STATE_CHANGE_EVENT, this._handler);
    this._teardownPortalContainer();
    this._root = null;
  }

  private _syncVisibility() {
    if (!this._root) {
      return;
    }

    const open = this._root.getOpen();
    const portalContainer = this._ensurePortalContainer();
    portalContainer.toggleAttribute('data-open', open);
    portalContainer.toggleAttribute('data-closed', !open);
  }

  private _ensurePortalContainer() {
    const owner = this.ownerDocument ?? document;
    const mountRoot = this.container ?? owner.body;

    if (this.portalContainer?.isConnected) {
      stampTooltipRootContext(this.portalContainer, this._root);
      if (this.portalContainer.parentNode !== mountRoot) {
        mountRoot.append(this.portalContainer);
      }
      return this.portalContainer;
    }

    const portalContainer = owner.createElement('div');
    portalContainer.style.display = 'contents';
    portalContainer.setAttribute('data-base-ui-tooltip-portal', '');
    stampTooltipRootContext(portalContainer, this._root);
    const contentNodes = Array.from(this.childNodes);
    contentNodes.forEach((node) => {
      stampTooltipRootContext(node, this._root);
    });
    portalContainer.replaceChildren(...contentNodes);
    mountRoot.append(portalContainer);
    this.portalContainer = portalContainer;
    return portalContainer;
  }

  private _teardownPortalContainer() {
    if (this.portalContainer == null) {
      return;
    }

    const contentNodes = Array.from(this.portalContainer.childNodes);
    this.replaceChildren(...contentNodes);
    this.portalContainer.remove();
    this.portalContainer = null;
  }
}

if (!customElements.get('tooltip-portal')) {
  customElements.define('tooltip-portal', TooltipPortalElement);
}

// ─── TooltipPositionerElement ───────────────────────────────────────────────────

export class TooltipPositionerElement extends BaseHTMLElement {
  side: Side = 'bottom';
  sideOffset = 0;
  align: Align = 'center';
  alignOffset = 0;
  collisionAvoidance: 'flip' | 'shift' | 'none' | undefined = undefined;
  collisionPadding = 5;
  arrowPadding = 5;
  sticky = false;
  disableAnchorTracking = false;
  positionMethod: 'absolute' | 'fixed' = 'absolute';

  private _root: TooltipRootElement | null = null;
  private _handler = () => this._handleStateChange();
  private _cleanupAutoUpdate: (() => void) | null = null;

  connectedCallback() {
    this._root = resolveTooltipRoot(this);
    if (!this._root) {
      console.error('Base UI: Tooltip parts must be placed within <tooltip-root>.');
      return;
    }

    this.setAttribute('role', 'presentation');
    Object.assign(this.style, {
      position: this.positionMethod,
      left: '0px',
      top: '0px',
    });

    this._root.addEventListener(TOOLTIP_STATE_CHANGE_EVENT, this._handler);
    queueMicrotask(() => this._handleStateChange());
  }

  disconnectedCallback() {
    this._stopAutoUpdate();
    this._root?.removeEventListener(TOOLTIP_STATE_CHANGE_EVENT, this._handler);
    this._root = null;
  }

  private _handleStateChange() {
    if (!this._root) return;

    const open = this._root.getOpen();

    if (open) {
      this.removeAttribute('hidden');
      this._syncAutoUpdate();
    } else {
      this.setAttribute('hidden', '');
      this._stopAutoUpdate();
    }

    this._syncAttributes();
  }

  private _syncAutoUpdate() {
    this._stopAutoUpdate();
    if (!this._root?.getOpen()) return;

    const anchorElement = this._root.getActiveTriggerElement();
    if (!(anchorElement instanceof Element)) return;

    const placement = toPlacement(this.side, this.align);
    const middleware: Array<any> = [
      offset({
        mainAxis: this.sideOffset,
        crossAxis: this.alignOffset,
      }),
      hide(),
    ];

    const avoid = this.collisionAvoidance;
    if (avoid !== 'none') {
      if (avoid === undefined || avoid === 'flip') {
        middleware.push(flip({ padding: this.collisionPadding }));
      }
      if (avoid === undefined || avoid === 'shift') {
        middleware.push(
          shift({
            padding: this.collisionPadding,
            limiter: this.sticky ? undefined : limitShift(),
          }),
        );
      }
    }

    const arrowElement = this._root.getArrowElement();
    if (arrowElement) {
      middleware.push(
        floatingArrow({
          element: arrowElement,
          padding: this.arrowPadding,
        }),
      );
    }

    const root = this._root;

    const updatePosition = () => {
      computePosition(anchorElement, this, {
        placement,
        strategy: this.positionMethod,
        middleware,
      }).then((result: Awaited<ReturnType<typeof computePosition>>) => {
        Object.assign(this.style, {
          left: `${result.x}px`,
          top: `${result.y}px`,
          position: this.positionMethod,
        });

        const parsed = parsePlacement(result.placement);
        const arrowData = result.middlewareData.arrow as
          | {
              x?: number;
              y?: number;
              centerOffset?: number;
            }
          | undefined;
        const hideData = result.middlewareData.hide as { referenceHidden?: boolean } | undefined;

        if (arrowElement) {
          const staticSide =
            parsed.side === 'top'
              ? 'bottom'
              : parsed.side === 'bottom'
                ? 'top'
                : parsed.side === 'left'
                  ? 'right'
                  : 'left';
          Object.assign(arrowElement.style, {
            left: arrowData?.x != null ? `${arrowData.x}px` : '',
            top: arrowData?.y != null ? `${arrowData.y}px` : '',
            right: '',
            bottom: '',
            [staticSide]: '-4px',
          });
        }

        root.setPositionState({
          side: parsed.side,
          align: parsed.align,
          anchorHidden: Boolean(hideData?.referenceHidden),
          arrowOffsetX: arrowData?.x ?? null,
          arrowOffsetY: arrowData?.y ?? null,
          arrowUncentered:
            arrowData?.centerOffset != null ? Math.abs(arrowData.centerOffset) > 0.5 : false,
          transformOrigin: getTransformOrigin(
            parsed.side,
            parsed.align,
            arrowData?.x ?? null,
            arrowData?.y ?? null,
          ),
        });
      });
    };

    updatePosition();
    this._cleanupAutoUpdate = autoUpdate(anchorElement, this, updatePosition, {
      elementResize: !this.disableAnchorTracking,
      layoutShift: !this.disableAnchorTracking,
    });
  }

  private _stopAutoUpdate() {
    this._cleanupAutoUpdate?.();
    this._cleanupAutoUpdate = null;
  }

  private _syncAttributes() {
    if (!this._root) return;
    const open = this._root.getOpen();
    const ps = this._root.getPositionState();

    this.toggleAttribute('data-open', open);
    this.toggleAttribute('data-closed', !open);
    this.setAttribute('data-side', ps.side);
    this.setAttribute('data-align', ps.align);

    if (open && this._root.disableHoverablePopup) {
      this.style.pointerEvents = 'none';
    } else {
      this.style.removeProperty('pointer-events');
    }
  }
}

if (!customElements.get('tooltip-positioner')) {
  customElements.define('tooltip-positioner', TooltipPositionerElement);
}

// ─── TooltipPopupElement ────────────────────────────────────────────────────────

export class TooltipPopupElement extends BaseHTMLElement {
  private _root: TooltipRootElement | null = null;
  private _handler = () => this._handleStateChange();
  private _mounted = false;
  private _transitionStatus: TransitionStatus = undefined;
  private _lastOpen: boolean | null = null;
  private _frameId: number | null = null;
  private _exitRunId = 0;

  connectedCallback() {
    this._root = resolveTooltipRoot(this);
    if (!this._root) {
      console.error('Base UI: Tooltip parts must be placed within <tooltip-root>.');
      return;
    }

    ensureId(this, 'base-ui-tooltip-popup');
    this._root.setPopupId(this.id);

    this._root.addEventListener(TOOLTIP_STATE_CHANGE_EVENT, this._handler);

    if (!this._root.getOpen()) {
      this.setAttribute('hidden', '');
    }

    queueMicrotask(() => this._handleStateChange());
  }

  disconnectedCallback() {
    this._clearFrame();
    if (this._root) {
      this._root.setPopupId(undefined);
      this._root.setTransitionStatus(undefined);
      this._root.removeEventListener(TOOLTIP_STATE_CHANGE_EVENT, this._handler);
    }
    this._root = null;
    this._mounted = false;
    this._lastOpen = null;
    this._transitionStatus = undefined;
  }

  private _handleStateChange() {
    if (!this._root) return;

    const open = this._root.getOpen();
    const wasOpen = this._lastOpen;

    if (open) {
      this._exitRunId += 1;
      if (wasOpen !== true && !this._mounted) {
        this._mounted = true;
        this._transitionStatus = 'starting';
        this._scheduleStartingCleanup();
      } else if (this._transitionStatus === 'ending') {
        this._transitionStatus = undefined;
      }
    } else if (wasOpen === true && this._mounted && this._transitionStatus !== 'ending') {
      this._transitionStatus = 'ending';
      this._scheduleExitCleanup();
    }

    this._lastOpen = open;
    this._syncVisibility();
  }

  private _syncVisibility() {
    if (!this._root) return;

    const open = this._root.getOpen();
    const shouldRender = this._mounted || this._transitionStatus === 'ending';

    if (!shouldRender) {
      this.setAttribute('hidden', '');
      this._root.setTransitionStatus(undefined);
      return;
    }

    const hidden = !open && this._transitionStatus !== 'ending';

    if (hidden) {
      this.setAttribute('hidden', '');
    } else {
      this.removeAttribute('hidden');
    }

    // Tooltip uses role=tooltip (not role=dialog)
    this.setAttribute('role', 'tooltip');

    // Data attributes
    this.toggleAttribute('data-open', open);
    this.toggleAttribute('data-closed', !open);
    this.toggleAttribute('data-starting-style', this._transitionStatus === 'starting');
    this.toggleAttribute('data-ending-style', this._transitionStatus === 'ending');

    this._root.setTransitionStatus(this._transitionStatus);
  }

  private _scheduleStartingCleanup() {
    this._clearFrame();
    this._frameId = requestAnimationFrame(() => {
      this._frameId = null;
      if (!this._root || this._transitionStatus !== 'starting') return;
      if (!this._root.getOpen()) return;
      this._transitionStatus = undefined;
      this._syncVisibility();
    });
  }

  private _scheduleExitCleanup() {
    this._clearFrame();
    this._exitRunId += 1;
    const runId = this._exitRunId;
    this._frameId = requestAnimationFrame(() => {
      this._frameId = null;
      this._waitForExitAnimations(runId);
    });
  }

  private _waitForExitAnimations(runId: number) {
    if (runId !== this._exitRunId) return;

    if (
      typeof this.getAnimations !== 'function' ||
      (
        globalThis as typeof globalThis & {
          BASE_UI_ANIMATIONS_DISABLED?: boolean;
        }
      ).BASE_UI_ANIMATIONS_DISABLED
    ) {
      this._finishExit(runId);
      return;
    }

    Promise.all(this.getAnimations().map((a) => a.finished))
      .then(() => this._finishExit(runId))
      .catch(() => {
        if (runId !== this._exitRunId) return;
        this._finishExit(runId);
      });
  }

  private _finishExit(runId: number) {
    if (runId !== this._exitRunId) return;
    this._mounted = false;
    this._transitionStatus = undefined;
    this._syncVisibility();
  }

  private _clearFrame() {
    if (this._frameId != null) {
      cancelAnimationFrame(this._frameId);
      this._frameId = null;
    }
  }
}

if (!customElements.get('tooltip-popup')) {
  customElements.define('tooltip-popup', TooltipPopupElement);
}

// ─── TooltipArrowElement ────────────────────────────────────────────────────────

export class TooltipArrowElement extends BaseHTMLElement {
  private _root: TooltipRootElement | null = null;
  private _handler = () => this._syncAttributes();

  connectedCallback() {
    this._root = resolveTooltipRoot(this);
    if (!this._root) {
      console.error('Base UI: Tooltip parts must be placed within <tooltip-root>.');
      return;
    }

    this._root.setArrowElement(this);
    this.setAttribute('aria-hidden', 'true');

    this._root.addEventListener(TOOLTIP_STATE_CHANGE_EVENT, this._handler);
    queueMicrotask(() => {
      this._syncAttributes();
      this._root?.dispatchEvent(new CustomEvent(TOOLTIP_STATE_CHANGE_EVENT));
    });
  }

  disconnectedCallback() {
    if (this._root) {
      this._root.setArrowElement(null);
      this._root.removeEventListener(TOOLTIP_STATE_CHANGE_EVENT, this._handler);
    }
    this._root = null;
  }

  private _syncAttributes() {
    if (!this._root) return;
    const ps = this._root.getPositionState();
    const open = this._root.getOpen();

    this.toggleAttribute('data-open', open);
    this.setAttribute('data-side', ps.side);
    this.setAttribute('data-align', ps.align);
    this.toggleAttribute('data-uncentered', ps.arrowUncentered);
  }
}

if (!customElements.get('tooltip-arrow')) {
  customElements.define('tooltip-arrow', TooltipArrowElement);
}

// ─── TooltipViewportElement ─────────────────────────────────────────────────────

export class TooltipViewportElement extends BaseHTMLElement {
  private static readonly TRANSITION_DURATION_MS = 350;
  private static readonly ACTIVATION_DIRECTION_TOLERANCE_PX = 5;
  private _root: TooltipRootElement | null = null;
  private _handler = () => this._syncAttributes();
  private _lastTriggerRect: { x: number; y: number; width: number; height: number } | null = null;
  private _mutationObserver: MutationObserver | null = null;
  private _pendingPreviousContent: HTMLElement | null = null;
  private _transitionCleanupTimer: number | null = null;
  private _startingStyleFrame: number | null = null;
  private _syncingStructure = false;

  connectedCallback() {
    this._root = resolveTooltipRoot(this);
    if (!this._root) {
      console.error('Base UI: Tooltip parts must be placed within <tooltip-root>.');
      return;
    }

    this._root.addEventListener(TOOLTIP_STATE_CHANGE_EVENT, this._handler);
    this._mutationObserver = new MutationObserver(() => {
      if (this._syncingStructure) {
        return;
      }

      this._syncStructure();
    });
    this._mutationObserver.observe(this, { childList: true });
    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(TOOLTIP_STATE_CHANGE_EVENT, this._handler);
    this._mutationObserver?.disconnect();
    this._mutationObserver = null;
    this._pendingPreviousContent = null;
    this._clearTransitionTimers();
    this._root = null;
    this._lastTriggerRect = null;
  }

  private _syncAttributes() {
    if (!this._root) {
      return;
    }

    if (getComputedStyle(this).display === 'inline') {
      this.style.display = 'block';
    }

    const trigger = this._root.getActiveTriggerElement();
    const popup = resolveTooltipRoot(this)?.getPopupId()
      ? (this.closest('[data-base-ui-tooltip-portal]')?.querySelector(
          'tooltip-popup',
        ) as HTMLElement | null)
      : null;
    const activationDirection = this._getActivationDirection(trigger);

    if (activationDirection) {
      this._capturePreviousContent();
      this.setAttribute('data-activation-direction', activationDirection);
    } else {
      this.removeAttribute('data-activation-direction');
    }

    this._syncStructure();

    if (popup && this.hasAttribute('data-transitioning')) {
      const dimensions = this._measureTransitionDimensions(popup);
      this.style.setProperty('--popup-width', `${dimensions.width}px`);
      this.style.setProperty('--popup-height', `${dimensions.height}px`);
    } else {
      this.style.removeProperty('--popup-width');
      this.style.removeProperty('--popup-height');
    }
  }

  private _capturePreviousContent() {
    const current = this.querySelector(':scope > [data-current]') as HTMLElement | null;
    const source = current ?? this._createSnapshotContainer(Array.from(this.childNodes));
    if (!source || source.childNodes.length === 0) {
      return;
    }

    const previous = document.createElement('div');
    previous.setAttribute('data-previous', '');
    previous.setAttribute('data-ending-style', '');
    previous.style.position = 'absolute';
    previous.setAttribute('inert', '');
    previous.append(...Array.from(source.childNodes).map((node) => node.cloneNode(true)));
    this._pendingPreviousContent = previous;
  }

  private _syncStructure() {
    const directChildren = Array.from(this.childNodes);
    const current = directChildren.find(
      (node) => node instanceof HTMLElement && node.hasAttribute('data-current'),
    ) as HTMLElement | undefined;
    const previous = directChildren.find(
      (node) => node instanceof HTMLElement && node.hasAttribute('data-previous'),
    ) as HTMLElement | undefined;
    const contentNodes = directChildren.filter((node) => {
      return !(
        node instanceof HTMLElement &&
        (node.hasAttribute('data-current') || node.hasAttribute('data-previous'))
      );
    });

    if (!this._pendingPreviousContent && current && contentNodes.length === 0) {
      return;
    }
    if (!this._pendingPreviousContent && !current && contentNodes.length === 0) {
      return;
    }

    const nextCurrent =
      current && contentNodes.length === 0 ? current : this._createCurrentContainer(contentNodes);
    const nextPrevious = this._pendingPreviousContent ?? previous ?? null;

    this._syncingStructure = true;
    try {
      this.replaceChildren(...(nextPrevious ? [nextPrevious, nextCurrent] : [nextCurrent]));
    } finally {
      this._syncingStructure = false;
    }

    this._pendingPreviousContent = null;

    if (nextPrevious) {
      this.setAttribute('data-transitioning', '');
      nextCurrent.setAttribute('data-starting-style', '');
      this._clearTransitionTimers();
      this._startingStyleFrame = requestAnimationFrame(() => {
        nextCurrent.removeAttribute('data-starting-style');
      });
      this._transitionCleanupTimer = window.setTimeout(() => {
        if (nextPrevious.isConnected) {
          nextPrevious.remove();
        }
        this.removeAttribute('data-transitioning');
        this.style.removeProperty('--popup-width');
        this.style.removeProperty('--popup-height');
        this._transitionCleanupTimer = null;
      }, TooltipViewportElement.TRANSITION_DURATION_MS);
      return;
    }

    this.removeAttribute('data-transitioning');
    this.style.removeProperty('--popup-width');
    this.style.removeProperty('--popup-height');
  }

  private _createCurrentContainer(contentNodes: Node[]) {
    const current = document.createElement('div');
    current.setAttribute('data-current', '');
    current.append(...contentNodes);
    return current;
  }

  private _createSnapshotContainer(contentNodes: Node[]) {
    if (contentNodes.length === 0) {
      return null;
    }

    const snapshot = document.createElement('div');
    snapshot.append(...contentNodes.map((node) => node.cloneNode(true)));
    return snapshot;
  }

  private _clearTransitionTimers() {
    if (this._transitionCleanupTimer != null) {
      clearTimeout(this._transitionCleanupTimer);
      this._transitionCleanupTimer = null;
    }
    if (this._startingStyleFrame != null) {
      cancelAnimationFrame(this._startingStyleFrame);
      this._startingStyleFrame = null;
    }
  }

  private _measureTransitionDimensions(popup: HTMLElement) {
    const current = this.querySelector(':scope > [data-current]') as HTMLElement | null;
    const previous = this.querySelector(':scope > [data-previous]') as HTMLElement | null;
    const styles = getComputedStyle(this);
    const paddingInline =
      parseFloat(styles.paddingLeft || '0') + parseFloat(styles.paddingRight || '0');
    const paddingBlock =
      parseFloat(styles.paddingTop || '0') + parseFloat(styles.paddingBottom || '0');
    const contentWidth = Math.max(
      current?.scrollWidth ?? 0,
      previous?.scrollWidth ?? 0,
      popup.offsetWidth - paddingInline,
    );
    const contentHeight = Math.max(
      current?.scrollHeight ?? 0,
      previous?.scrollHeight ?? 0,
      popup.offsetHeight - paddingBlock,
    );

    return {
      width: contentWidth + paddingInline,
      height: contentHeight + paddingBlock,
    };
  }

  private _getActivationDirection(trigger: HTMLElement | null) {
    if (!trigger) {
      this._lastTriggerRect = null;
      return undefined;
    }

    const rect = trigger.getBoundingClientRect();
    const nextRect = { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    const previousRect = this._lastTriggerRect;
    this._lastTriggerRect = nextRect;
    if (!previousRect) {
      return undefined;
    }

    const tolerance = TooltipViewportElement.ACTIVATION_DIRECTION_TOLERANCE_PX;
    const horizontalDelta = nextRect.x - previousRect.x;
    const verticalDelta = nextRect.y - previousRect.y;
    const directions: string[] = [];

    if (horizontalDelta > tolerance) {
      directions.push('right');
    } else if (horizontalDelta < -tolerance) {
      directions.push('left');
    }

    if (verticalDelta > tolerance) {
      directions.push('down');
    } else if (verticalDelta < -tolerance) {
      directions.push('up');
    }

    return directions.length > 0 ? directions.join(' ') : undefined;
  }
}

if (!customElements.get('tooltip-viewport')) {
  customElements.define('tooltip-viewport', TooltipViewportElement);
}

// ─── Namespace exports ──────────────────────────────────────────────────────────

export namespace TooltipRoot {
  export type Props<Payload = unknown> = TooltipRootProps<Payload>;
  export type Actions = TooltipRootActions;
  export type ChangeEventReason = TooltipChangeEventReason;
  export type ChangeEventDetails = TooltipChangeEventDetails;
}

export namespace TooltipProvider {
  export type Props = TooltipProviderProps;
}
export namespace TooltipTrigger {
  export type Props<Payload = unknown> = TooltipTriggerProps<Payload>;
}
export namespace TooltipPopup {
  export type Props = TooltipPopupProps;
}
export namespace TooltipPositioner {
  export type Props = TooltipPositionerProps;
}
export namespace TooltipArrow {
  export type Props = TooltipArrowProps;
}
export namespace TooltipPortal {
  export type Props = TooltipPortalProps;
}
export namespace TooltipViewport {
  export type Props = TooltipViewportProps;
}

function TooltipProviderHelper(props: TooltipProviderProps) {
  return html`<tooltip-provider
    .delay=${props.delay ?? null}
    .closeDelay=${props.closeDelay ?? null}
    .timeout=${props.timeout ?? DEFAULT_PROVIDER_TIMEOUT}
  >
    ${props.children}
  </tooltip-provider>`;
}

function TooltipRootHelper<Payload = unknown>(props: TooltipRootProps<Payload>) {
  const content =
    typeof props.children === 'function'
      ? props.children({ payload: props.handle?.activePayload })
      : props.children;

  return html`<tooltip-root
    .defaultOpen=${props.defaultOpen ?? false}
    .open=${props.open}
    .onOpenChange=${props.onOpenChange}
    .onOpenChangeComplete=${props.onOpenChangeComplete}
    .handle=${props.handle}
    .triggerId=${props.triggerId ?? null}
    .defaultTriggerId=${props.defaultTriggerId ?? null}
    .actionsRef=${props.actionsRef}
    .disabled=${props.disabled ?? false}
    .disableHoverablePopup=${props.disableHoverablePopup ?? false}
  >
    ${content}
  </tooltip-root>`;
}

function TooltipTriggerHelper<Payload = unknown>(props: TooltipTriggerProps<Payload>) {
  return html`<tooltip-trigger
    .closeOnClick=${props.closeOnClick ?? true}
    .handle=${props.handle}
    .payload=${props.payload}
    .disabled=${props.disabled ?? false}
    .delay=${props.delay ?? null}
    .closeDelay=${props.closeDelay ?? null}
    id=${props.id ?? ''}
  >
    ${props.children}
  </tooltip-trigger>`;
}

function TooltipPortalHelper(props: TooltipPortalProps) {
  return html`<tooltip-portal .container=${props.container ?? null}
    >${props.children}</tooltip-portal
  >`;
}

function TooltipPositionerHelper(props: TooltipPositionerProps) {
  return html`<tooltip-positioner
    .side=${props.side ?? 'bottom'}
    .sideOffset=${props.sideOffset ?? 0}
    .align=${props.align ?? 'center'}
    .alignOffset=${props.alignOffset ?? 0}
    .collisionAvoidance=${props.collisionAvoidance}
    .collisionPadding=${props.collisionPadding ?? 5}
    .arrowPadding=${props.arrowPadding ?? 5}
    .sticky=${props.sticky ?? false}
    .disableAnchorTracking=${props.disableAnchorTracking ?? false}
    .positionMethod=${props.positionMethod ?? 'absolute'}
  >
    ${props.children}
  </tooltip-positioner>`;
}

function TooltipPopupHelper(props: TooltipPopupProps) {
  return html`<tooltip-popup>${props.children}</tooltip-popup>`;
}

function TooltipArrowHelper(props: TooltipArrowProps) {
  return html`<tooltip-arrow>${props.children}</tooltip-arrow>`;
}

function TooltipViewportHelper(props: TooltipViewportProps) {
  return html`<tooltip-viewport>${props.children}</tooltip-viewport>`;
}

export const Tooltip = {
  Provider: TooltipProviderHelper,
  Root: TooltipRootHelper,
  Trigger: TooltipTriggerHelper,
  Portal: TooltipPortalHelper,
  Positioner: TooltipPositionerHelper,
  Popup: TooltipPopupHelper,
  Arrow: TooltipArrowHelper,
  Viewport: TooltipViewportHelper,
  createHandle: createTooltipHandle,
  Handle: TooltipHandle,
} as const;

// ─── Global type declarations ───────────────────────────────────────────────────

declare global {
  interface HTMLElementTagNameMap {
    'tooltip-provider': TooltipProviderElement;
    'tooltip-root': TooltipRootElement;
    'tooltip-trigger': TooltipTriggerElement;
    'tooltip-portal': TooltipPortalElement;
    'tooltip-positioner': TooltipPositionerElement;
    'tooltip-popup': TooltipPopupElement;
    'tooltip-arrow': TooltipArrowElement;
    'tooltip-viewport': TooltipViewportElement;
  }
}

function resolveTooltipRoot(element: HTMLElement): TooltipRootElement | null {
  const closestRoot = element.closest('tooltip-root');
  if (closestRoot instanceof TooltipRootElement) {
    return closestRoot;
  }

  let current: Node | null = element;
  while (current) {
    const stampedRoot = (
      current as Node & {
        [TOOLTIP_ROOT_CONTEXT]?: TooltipRootElement | null | undefined;
      }
    )[TOOLTIP_ROOT_CONTEXT];
    if (stampedRoot) {
      return stampedRoot;
    }
    current = current.parentNode;
  }

  return null;
}

function stampTooltipRootContext(node: Node, root: TooltipRootElement | null | undefined) {
  (
    node as Node & {
      [TOOLTIP_ROOT_CONTEXT]?: TooltipRootElement | null | undefined;
    }
  )[TOOLTIP_ROOT_CONTEXT] = root;

  if (!(node instanceof Element)) {
    return;
  }

  for (const child of Array.from(node.childNodes)) {
    stampTooltipRootContext(child, root);
  }
}
