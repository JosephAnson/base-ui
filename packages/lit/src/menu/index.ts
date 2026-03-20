import { ReactiveElement } from 'lit';
import {
  arrow as floatingArrow,
  autoUpdate,
  computePosition,
  flip,
  hide,
  limitShift,
  offset,
  shift,
  type Boundary,
  type Placement,
} from '@floating-ui/react-dom';
import { BaseHTMLElement, ensureId } from '../utils/index.ts';
import { getDirection } from '../direction-provider/index.ts';

// ─── Constants ──────────────────────────────────────────────────────────────────

const MENU_ROOT_SELECTOR = '[data-base-ui-menu-root]';
const MENU_STATE_CHANGE_EVENT = 'base-ui-menu-state-change';

type Side = 'top' | 'right' | 'bottom' | 'left';
type Align = 'start' | 'center' | 'end';
type TransitionStatus = 'starting' | 'ending' | undefined;
type CollisionAvoidance = 'flip' | 'shift' | 'none' | undefined;
type CollisionBoundary =
  | 'clipping-ancestors'
  | Element
  | null
  | undefined
  | readonly Element[];

export type MenuChangeEventReason =
  | 'trigger-press'
  | 'trigger-hover'
  | 'outside-press'
  | 'escape-key'
  | 'focus-out'
  | 'item-press'
  | 'none';

export interface MenuChangeEventDetails {
  reason: MenuChangeEventReason;
  event: Event;
  readonly isCanceled: boolean;
  cancel(): void;
}

// ─── Open menu stack ─────────────────────────────────────────────────────────

const openMenuStack: MenuRootElement[] = [];

function pushOpenMenu(root: MenuRootElement) {
  const idx = openMenuStack.indexOf(root);
  if (idx !== -1) openMenuStack.splice(idx, 1);
  openMenuStack.push(root);
}

function removeOpenMenu(root: MenuRootElement) {
  const idx = openMenuStack.indexOf(root);
  if (idx !== -1) openMenuStack.splice(idx, 1);
}

function getTopmostOpenMenu(): MenuRootElement | null {
  return openMenuStack.at(-1) ?? null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createChangeEventDetails(
  reason: MenuChangeEventReason,
  event: Event,
): MenuChangeEventDetails {
  let canceled = false;
  return {
    reason,
    event,
    get isCanceled() {
      return canceled;
    },
    cancel() {
      canceled = true;
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

function getTransformOrigin(side: Side, align: Align, arrowX: number | null, arrowY: number | null) {
  const alignValue = align === 'start' ? '0%' : align === 'end' ? '100%' : '50%';
  if (side === 'top') return `${arrowX != null ? `${arrowX}px` : alignValue} 100%`;
  if (side === 'bottom') return `${arrowX != null ? `${arrowX}px` : alignValue} 0%`;
  if (side === 'left') return `100% ${arrowY != null ? `${arrowY}px` : alignValue}`;
  return `0% ${arrowY != null ? `${arrowY}px` : alignValue}`;
}

function isEventInside(target: EventTarget | null, element: Element | null) {
  return target instanceof Node && element?.contains(target) === true;
}

function normalizeBoundary(boundary: CollisionBoundary): Boundary | undefined {
  if (boundary == null) return undefined;
  if (boundary === 'clipping-ancestors') return 'clippingAncestors';
  if (Array.isArray(boundary)) return [...boundary] as Boundary;
  return boundary as Boundary;
}

function findMenuRoot(el: Element | null): MenuRootElement | null {
  return el?.closest(MENU_ROOT_SELECTOR) as MenuRootElement | null;
}

function getSubmenuOpenKey(orientation: 'horizontal' | 'vertical', direction: 'ltr' | 'rtl') {
  if (orientation === 'horizontal') return 'ArrowDown';
  return direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
}

function getSubmenuCloseKey(orientation: 'horizontal' | 'vertical', direction: 'ltr' | 'rtl') {
  if (orientation === 'horizontal') return 'ArrowUp';
  return direction === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
}

let generatedMenuId = 0;
function createMenuId(prefix: string) {
  generatedMenuId += 1;
  return `base-ui-menu-${prefix}-${generatedMenuId}`;
}

// ─── Item registration ───────────────────────────────────────────────────────

interface ItemRegistration {
  id: string;
  element: HTMLElement;
  isDisabled(): boolean;
  isSubmenuTrigger: boolean;
}

// Keyboard click suppression (prevents Enter from re-clicking the focused item
// after the menu opens from a native button keyboard click).
const suppressedItemTimers = new Map<string, number>();

function suppressItem(id: string | null) {
  if (id == null) return;
  clearSuppressedItem(id);
  suppressedItemTimers.set(
    id,
    window.setTimeout(() => suppressedItemTimers.delete(id), 200),
  );
}

function clearSuppressedItem(id: string | null) {
  if (id == null) return;
  const timer = suppressedItemTimers.get(id);
  if (timer != null) {
    clearTimeout(timer);
    suppressedItemTimers.delete(id);
  }
}

function isItemSuppressed(id: string) {
  return suppressedItemTimers.has(id);
}

// ─── MenuRootElement ─────────────────────────────────────────────────────────

export class MenuRootElement extends ReactiveElement {
  static properties = {
    disabled: { type: Boolean },
  };

  declare disabled: boolean;

  defaultOpen = false;
  orientation: 'horizontal' | 'vertical' = 'vertical';
  loopFocus = true;
  highlightItemOnHover = true;
  closeParentOnEsc = false;
  nested = false;

  onOpenChange:
    | ((open: boolean, details: MenuChangeEventDetails) => void)
    | undefined;

  // Controlled / uncontrolled
  private _open: boolean | undefined;
  private _openIsControlled = false;
  private _internalOpen = false;
  private _initialized = false;
  private _openReason: MenuChangeEventReason | null = null;
  private _lastPublishedStateKey: string | null = null;
  private _initialFocusEdge: 'first' | 'last' | null = null;
  private _suppressKeyboardClick = false;

  // Part references
  private _popupId: string | undefined;
  private _popupElement: HTMLElement | null = null;
  private _activeTriggerElement: HTMLElement | null = null;
  private _positionerElement: HTMLElement | null = null;
  private _arrowElement: HTMLElement | null = null;
  private _backdropElement: HTMLElement | null = null;

  // Hover
  private _hoverOpenTimeout: number | null = null;
  private _hoverCloseTimeout: number | null = null;
  private _hoverRegionDepth = 0;

  // Position
  private _positionState = {
    side: 'bottom' as Side,
    align: 'center' as Align,
    anchorHidden: false,
    arrowOffsetX: null as number | null,
    arrowOffsetY: null as number | null,
    arrowUncentered: false,
    transformOrigin: '50% 0%',
  };

  // Document listeners
  private _documentListenersCleanup: (() => void) | null = null;

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
    this._syncOpenStack();
    this._syncDocumentListeners();
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
    this.style.display = 'contents';
    this.setAttribute('data-base-ui-menu-root', '');
    this._syncOpenStack();
    this._syncDocumentListeners();
    this._syncAttributes();
    queueMicrotask(() => this._publishStateChange());
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this._documentListenersCleanup?.();
    this._documentListenersCleanup = null;
    this._clearHoverTimers();
    removeOpenMenu(this);
    this._lastPublishedStateKey = null;
  }

  protected override updated() {
    this._syncOpenStack();
    this._syncDocumentListeners();
    this._syncAttributes();
    this._publishStateChange();
  }

  // Public API for child parts
  getOpen(): boolean {
    return this._openIsControlled ? Boolean(this._open) : this._internalOpen;
  }

  getOpenReason() {
    return this._openReason;
  }

  getPopupId() {
    return this._popupId;
  }
  setPopupId(id: string | undefined) {
    if (this._popupId === id) return;
    this._popupId = id;
    this._publishStateChange();
  }

  getPopupElement() {
    return this._popupElement;
  }
  setPopupElement(el: HTMLElement | null) {
    this._popupElement = el;
  }

  getActiveTriggerElement() {
    return this._activeTriggerElement;
  }
  setActiveTriggerElement(el: HTMLElement | null) {
    this._activeTriggerElement = el;
  }

  getPositionerElement() {
    return this._positionerElement;
  }
  setPositionerElement(el: HTMLElement | null) {
    this._positionerElement = el;
  }

  getArrowElement() {
    return this._arrowElement;
  }
  setArrowElement(el: HTMLElement | null) {
    this._arrowElement = el;
  }

  getBackdropElement() {
    return this._backdropElement;
  }
  setBackdropElement(el: HTMLElement | null) {
    this._backdropElement = el;
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

  getInitialFocusEdge() {
    return this._initialFocusEdge;
  }
  setInitialFocusEdge(edge: 'first' | 'last' | null) {
    this._initialFocusEdge = edge;
  }

  getSuppressKeyboardClick() {
    return this._suppressKeyboardClick;
  }
  setSuppressKeyboardClick(v: boolean) {
    this._suppressKeyboardClick = v;
  }

  toggle(nextOpen: boolean, event: Event, reason: MenuChangeEventReason) {
    if (!nextOpen && reason === 'escape-key' && getTopmostOpenMenu() !== this) return;

    if (this.disabled && nextOpen) return;

    const details = createChangeEventDetails(reason, event);
    this.onOpenChange?.(nextOpen, details);
    if (details.isCanceled) return;

    this._openReason = reason;
    if (!this._openIsControlled) {
      this._internalOpen = nextOpen;
    }
    if (!nextOpen) this._clearHoverTimers();

    this._syncOpenStack();
    this._syncDocumentListeners();
    this._syncAttributes();
    this._publishStateChange();

    if (!nextOpen && this._openReason !== 'trigger-hover') {
      setTimeout(() => {
        if (this._activeTriggerElement?.isConnected && !this.getOpen()) {
          this._activeTriggerElement.focus({ preventScroll: true });
        }
      }, 0);
    }
  }

  // Hover support
  scheduleHoverOpen(delay: number, event: MouseEvent) {
    this.cancelHoverOpen();
    this._hoverOpenTimeout = window.setTimeout(() => {
      this._hoverOpenTimeout = null;
      this.toggle(true, event, 'trigger-hover');
    }, delay);
  }

  cancelHoverOpen() {
    if (this._hoverOpenTimeout != null) {
      window.clearTimeout(this._hoverOpenTimeout);
      this._hoverOpenTimeout = null;
    }
  }

  enterHoverRegion() {
    this._cancelHoverClose();
    this._hoverRegionDepth += 1;
  }

  leaveHoverRegion(event: MouseEvent, closeDelay: number) {
    this._hoverRegionDepth = Math.max(0, this._hoverRegionDepth - 1);
    if (this._hoverRegionDepth > 0) return;
    this._cancelHoverClose();
    this._hoverCloseTimeout = window.setTimeout(() => {
      this._hoverCloseTimeout = null;
      if (this._hoverRegionDepth === 0 && this._openReason === 'trigger-hover') {
        this.toggle(false, event, 'focus-out');
      }
    }, closeDelay);
  }

  private _cancelHoverClose() {
    if (this._hoverCloseTimeout != null) {
      window.clearTimeout(this._hoverCloseTimeout);
      this._hoverCloseTimeout = null;
    }
  }

  private _clearHoverTimers() {
    this.cancelHoverOpen();
    this._cancelHoverClose();
    this._hoverRegionDepth = 0;
  }

  private _syncOpenStack() {
    if (this.getOpen()) pushOpenMenu(this);
    else removeOpenMenu(this);
  }

  private _syncDocumentListeners() {
    this._documentListenersCleanup?.();
    this._documentListenersCleanup = null;
    if (!this.getOpen()) return;

    const handleMouseDown = (event: Event) => {
      if (
        isEventInside(event.target, this._positionerElement) ||
        isEventInside(event.target, this._activeTriggerElement) ||
        isEventInside(event.target, this._backdropElement)
      )
        return;
      this.toggle(false, event, 'outside-press');
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        this.toggle(false, event, 'escape-key');
      }
    };

    document.addEventListener('mousedown', handleMouseDown, true);
    document.addEventListener('keydown', handleKeyDown, true);
    this._documentListenersCleanup = () => {
      document.removeEventListener('mousedown', handleMouseDown, true);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }

  private _syncAttributes() {
    const open = this.getOpen();
    this.toggleAttribute('data-open', open);
    this.toggleAttribute('data-closed', !open);
  }

  private _publishStateChange() {
    const ps = this._positionState;
    const nextKey = [
      this.getOpen() ? 'open' : 'closed',
      this._popupId ?? '',
      ps.side,
      ps.align,
      this._openReason ?? '',
    ].join('|');
    if (nextKey === this._lastPublishedStateKey) return;
    this._lastPublishedStateKey = nextKey;
    this.dispatchEvent(new CustomEvent(MENU_STATE_CHANGE_EVENT));
  }
}

if (!customElements.get('menu-root')) {
  customElements.define('menu-root', MenuRootElement);
}

// ─── MenuSubmenuRootElement ──────────────────────────────────────────────────

export class MenuSubmenuRootElement extends MenuRootElement {
  constructor() {
    super();
    this.nested = true;
  }
}

if (!customElements.get('menu-submenu-root')) {
  customElements.define('menu-submenu-root', MenuSubmenuRootElement);
}

// ─── MenuTriggerElement ──────────────────────────────────────────────────────

export class MenuTriggerElement extends BaseHTMLElement {
  disabled = false;

  private _root: MenuRootElement | null = null;
  private _handler = () => this._syncAttributes();

  connectedCallback() {
    this._root = findMenuRoot(this);
    if (!this._root) return;

    this._root.setActiveTriggerElement(this);

    this.setAttribute('role', 'button');
    this.setAttribute('tabindex', '0');
    this.setAttribute('aria-haspopup', 'menu');

    this._root.addEventListener(MENU_STATE_CHANGE_EVENT, this._handler);
    this.addEventListener('click', this._handleClick);
    this.addEventListener('keydown', this._handleKeyDown);
    this.addEventListener('keyup', this._handleKeyUp);

    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(MENU_STATE_CHANGE_EVENT, this._handler);
    this.removeEventListener('click', this._handleClick);
    this.removeEventListener('keydown', this._handleKeyDown);
    this.removeEventListener('keyup', this._handleKeyUp);
    this._root = null;
  }

  private _handleClick = (event: MouseEvent) => {
    if (!this._root || this.disabled || this._root.disabled) return;

    // Check preventBaseUIHandler
    const baseUiEvent = event as MouseEvent & { baseUIHandlerPrevented?: boolean; preventBaseUIHandler?: () => void };
    if (baseUiEvent.baseUIHandlerPrevented) return;

    const wasOpen = this._root.getOpen();

    if (!wasOpen && event.detail === 0) {
      // Keyboard-initiated click (Enter/Space on native button)
      this._root.setInitialFocusEdge('first');
      this._root.setSuppressKeyboardClick(true);
    }

    this._root.toggle(!wasOpen, event, 'trigger-press');

    if (event.detail === 0 && !wasOpen) {
      this._scheduleFocusFirstItem(true);
    }
  };

  private _handleKeyDown = (event: KeyboardEvent) => {
    if (!this._root || this.disabled || this._root.disabled) return;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      this._root.setInitialFocusEdge(event.key === 'ArrowUp' ? 'last' : 'first');
      this._root.toggle(true, event, 'trigger-press');
      this._scheduleFocusItem(event.key === 'ArrowUp' ? 'last' : 'first');
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      // If this is a native button, let the click event handle it
      if (this.tagName === 'BUTTON' || (this.firstElementChild?.tagName === 'BUTTON')) return;
      event.preventDefault();
      this.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 0 }));
    }
  };

  private _handleKeyUp = (event: KeyboardEvent) => {
    if (event.key === ' ') event.preventDefault();
  };

  private _scheduleFocusItem(edge: 'first' | 'last', attempts = 5) {
    setTimeout(() => {
      if (!this._root?.getOpen()) return;
      const popup = this._root.getPopupElement();
      if (!(popup instanceof HTMLElement)) {
        if (attempts > 0) this._scheduleFocusItem(edge, attempts - 1);
        return;
      }
      const items = Array.from(popup.querySelectorAll<HTMLElement>('[role^="menuitem"]'));
      const target = edge === 'last' ? items[items.length - 1] : items[0];
      if (target) {
        const runtime = (popup as any).__menuRuntime as MenuItemManager | undefined;
        runtime?.highlightItem(target.id);
        target.focus({ preventScroll: true });
      } else if (attempts > 0) {
        this._scheduleFocusItem(edge, attempts - 1);
      }
    }, 0);
  }

  private _scheduleFocusFirstItem(suppress = false, attempts = 5) {
    setTimeout(() => {
      if (!this._root?.getOpen()) return;
      const popup = this._root.getPopupElement();
      if (!(popup instanceof HTMLElement)) {
        if (attempts > 0) this._scheduleFocusFirstItem(suppress, attempts - 1);
        return;
      }
      const items = Array.from(popup.querySelectorAll<HTMLElement>('[role^="menuitem"]'));
      const target = items[0];
      if (target) {
        const runtime = (popup as any).__menuRuntime as MenuItemManager | undefined;
        runtime?.highlightItem(target.id);
        if (suppress) suppressItem(target.id);
        target.focus({ preventScroll: true });
      } else if (attempts > 0) {
        this._scheduleFocusFirstItem(suppress, attempts - 1);
      }
    }, 0);
  }

  private _syncAttributes() {
    if (!this._root) return;
    const open = this._root.getOpen();
    const popupId = this._root.getPopupId();
    this.setAttribute('aria-expanded', String(open));
    this.toggleAttribute('data-popup-open', open);
    if (open && popupId) this.setAttribute('aria-controls', popupId);
    else this.removeAttribute('aria-controls');
  }
}

if (!customElements.get('menu-trigger')) {
  customElements.define('menu-trigger', MenuTriggerElement);
}

// ─── MenuPortalElement ───────────────────────────────────────────────────────

export class MenuPortalElement extends BaseHTMLElement {
  private _root: MenuRootElement | null = null;
  private _handler = () => this._syncVisibility();

  connectedCallback() {
    this._root = findMenuRoot(this);
    if (!this._root) return;
    this.style.display = 'contents';
    this._root.addEventListener(MENU_STATE_CHANGE_EVENT, this._handler);
    queueMicrotask(() => this._syncVisibility());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(MENU_STATE_CHANGE_EVENT, this._handler);
    this._root = null;
  }

  private _syncVisibility() {
    if (!this._root) return;
    const open = this._root.getOpen();
    this.toggleAttribute('data-open', open);
    this.toggleAttribute('data-closed', !open);
  }
}

if (!customElements.get('menu-portal')) {
  customElements.define('menu-portal', MenuPortalElement);
}

// ─── MenuPositionerElement ───────────────────────────────────────────────────

export class MenuPositionerElement extends BaseHTMLElement {
  side: Side = 'bottom';
  sideOffset = 0;
  align: Align = 'center';
  alignOffset = 0;
  collisionAvoidance: CollisionAvoidance = undefined;
  collisionBoundary: CollisionBoundary = undefined;
  collisionPadding = 5;
  arrowPadding = 5;
  sticky = false;
  disableAnchorTracking = false;
  positionMethod: 'absolute' | 'fixed' = 'absolute';
  anchor: Element | { getBoundingClientRect: () => DOMRect } | undefined;

  private _root: MenuRootElement | null = null;
  private _handler = () => this._handleStateChange();
  private _cleanupAutoUpdate: (() => void) | null = null;

  connectedCallback() {
    this._root = findMenuRoot(this);
    if (!this._root) return;

    this._root.setPositionerElement(this);
    this.setAttribute('role', 'presentation');
    Object.assign(this.style, { position: this.positionMethod, left: '0px', top: '0px' });

    this._root.addEventListener(MENU_STATE_CHANGE_EVENT, this._handler);
    queueMicrotask(() => this._handleStateChange());
  }

  disconnectedCallback() {
    this._stopAutoUpdate();
    this._root?.removeEventListener(MENU_STATE_CHANGE_EVENT, this._handler);
    this._root = null;
  }

  private _handleStateChange() {
    if (!this._root) return;
    const open = this._root.getOpen();
    if (open) {
      this.removeAttribute('hidden');
      this.style.pointerEvents = '';
      this._syncAutoUpdate();
    } else {
      this.setAttribute('hidden', '');
      this.style.pointerEvents = 'none';
      this._stopAutoUpdate();
    }
    this._syncAttributes();
  }

  private _syncAutoUpdate() {
    this._stopAutoUpdate();
    if (!this._root?.getOpen()) return;
    const anchorElement = this.anchor ?? this._root.getActiveTriggerElement();
    if (!anchorElement || (!(anchorElement instanceof Element) && typeof (anchorElement as any).getBoundingClientRect !== 'function')) return;

    const placement = toPlacement(this.side, this.align);
    const mw: any[] = [
      offset({ mainAxis: this.sideOffset, crossAxis: this.alignOffset }),
      hide(),
    ];
    const avoid = this.collisionAvoidance;
    if (avoid !== 'none') {
      if (avoid === undefined || avoid === 'flip')
        mw.push(flip({ boundary: normalizeBoundary(this.collisionBoundary), padding: this.collisionPadding }));
      if (avoid === undefined || avoid === 'shift')
        mw.push(shift({ boundary: normalizeBoundary(this.collisionBoundary), padding: this.collisionPadding, limiter: this.sticky ? undefined : limitShift() }));
    }
    const arrowEl = this._root.getArrowElement();
    if (arrowEl) mw.push(floatingArrow({ element: arrowEl, padding: this.arrowPadding }));

    const updatePosition = () => {
      if (!this._root) return;
      const root = this._root;
      computePosition(anchorElement, this, {
        placement,
        strategy: this.positionMethod,
        middleware: mw,
      }).then((result: any) => {
        Object.assign(this.style, { left: `${result.x}px`, top: `${result.y}px`, position: this.positionMethod });
        const parsed = parsePlacement(result.placement);
        const arrowData = result.middlewareData.arrow as { x?: number; y?: number; centerOffset?: number } | undefined;
        const hideData = result.middlewareData.hide as { referenceHidden?: boolean } | undefined;
        if (arrowEl) {
          const staticSide = parsed.side === 'top' ? 'bottom' : parsed.side === 'bottom' ? 'top' : parsed.side === 'left' ? 'right' : 'left';
          Object.assign(arrowEl.style, {
            left: arrowData?.x != null ? `${arrowData.x}px` : '',
            top: arrowData?.y != null ? `${arrowData.y}px` : '',
            right: '', bottom: '', [staticSide]: '-4px',
          });
        }
        root.setPositionState({
          side: parsed.side,
          align: parsed.align,
          anchorHidden: Boolean(hideData?.referenceHidden),
          arrowOffsetX: arrowData?.x ?? null,
          arrowOffsetY: arrowData?.y ?? null,
          arrowUncentered: arrowData?.centerOffset != null ? Math.abs(arrowData.centerOffset) > 0.5 : false,
          transformOrigin: getTransformOrigin(parsed.side, parsed.align, arrowData?.x ?? null, arrowData?.y ?? null),
        });
        this.style.setProperty('--transform-origin', root.getPositionState().transformOrigin);
      });
    };

    updatePosition();
    // autoUpdate only works with real DOM elements; virtual anchors (cursor position) don't need tracking
    if (anchorElement instanceof Element) {
      this._cleanupAutoUpdate = autoUpdate(anchorElement, this, updatePosition, {
        elementResize: !this.disableAnchorTracking,
        layoutShift: !this.disableAnchorTracking,
      });
    }
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
    this.toggleAttribute('data-anchor-hidden', ps.anchorHidden);
    this.toggleAttribute('data-nested', this._root.nested);
  }
}

if (!customElements.get('menu-positioner')) {
  customElements.define('menu-positioner', MenuPositionerElement);
}

// ─── Item Manager (used by MenuPopupElement) ─────────────────────────────────

class MenuItemManager {
  private _items = new Map<string, ItemRegistration>();
  private _highlightedId: string | null = null;
  private _root: MenuRootElement;
  private _popup: HTMLElement;

  constructor(popup: HTMLElement, root: MenuRootElement) {
    this._popup = popup;
    this._root = root;
  }

  registerItem(item: ItemRegistration): () => void {
    this._items.set(item.id, item);
    item.element.tabIndex = -1;
    return () => {
      const reg = this._items.get(item.id);
      if (reg?.element === item.element) {
        this._items.delete(item.id);
        if (this._highlightedId === item.id) this._highlightedId = null;
      }
    };
  }

  highlightItem(itemId: string | null) {
    if (this._highlightedId === itemId) return;

    // Unhighlight previous
    if (this._highlightedId != null) {
      const prev = this._items.get(this._highlightedId);
      if (prev) {
        prev.element.removeAttribute('data-highlighted');
        prev.element.tabIndex = -1;
      }
    }

    // Highlight next
    if (itemId != null) {
      const next = this._items.get(itemId);
      if (next) {
        next.element.setAttribute('data-highlighted', '');
        next.element.tabIndex = 0;
      }
    }

    this._highlightedId = itemId;
  }

  getHighlightedId() {
    return this._highlightedId;
  }

  private _getOrdered(): ItemRegistration[] {
    return Array.from(this._items.values())
      .filter((item) => item.element.isConnected)
      .sort((a, b) => {
        const pos = a.element.compareDocumentPosition(b.element);
        if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
        if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
        return 0;
      });
  }

  focusFirst() {
    const items = this._getOrdered();
    if (items.length === 0) return;
    this.highlightItem(items[0].id);
    items[0].element.focus({ preventScroll: true });
  }

  focusLast() {
    const items = this._getOrdered();
    if (items.length === 0) return;
    const last = items[items.length - 1];
    this.highlightItem(last.id);
    last.element.focus({ preventScroll: true });
  }

  focusNext(fromId: string | null) {
    const items = this._getOrdered();
    if (items.length === 0) return;
    const idx = items.findIndex((item) => item.id === fromId);
    const nextIdx = idx >= 0 ? idx + 1 : 0;
    const finalIdx = nextIdx >= items.length
      ? (this._root.loopFocus ? 0 : items.length - 1)
      : nextIdx;
    this.highlightItem(items[finalIdx].id);
    items[finalIdx].element.focus({ preventScroll: true });
  }

  focusPrevious(fromId: string | null) {
    const items = this._getOrdered();
    if (items.length === 0) return;
    const idx = items.findIndex((item) => item.id === fromId);
    const prevIdx = idx >= 0 ? idx - 1 : items.length - 1;
    const finalIdx = prevIdx < 0
      ? (this._root.loopFocus ? items.length - 1 : 0)
      : prevIdx;
    this.highlightItem(items[finalIdx].id);
    items[finalIdx].element.focus({ preventScroll: true });
  }

  handleKeyDown(event: KeyboardEvent) {
    const target = event.target instanceof HTMLElement ? event.target : null;
    // Find the active item by checking if the target (or its ancestor) is a registered item
    let activeId: string | null = null;
    if (target) {
      for (const [id, item] of this._items) {
        if (item.element === target || item.element.contains(target)) {
          activeId = id;
          break;
        }
      }
    }
    const direction = getDirection(this._popup);
    const orientation = this._root.orientation;

    const closeSubmenu = () => {
      const trigger = this._root.getActiveTriggerElement();
      const parentPopup = trigger?.closest('menu-popup') as HTMLElement | null;
      if (trigger && parentPopup) {
        event.preventDefault();
        this._root.toggle(false, event, 'escape-key');
        queueMicrotask(() => {
          trigger.focus({ preventScroll: true });
          const parentRuntime = (parentPopup as any).__menuRuntime as MenuItemManager | undefined;
          parentRuntime?.highlightItem(trigger.id);
        });
      }
    };

    const closeSubmenuKey = getSubmenuCloseKey(orientation, direction);

    switch (event.key) {
      case 'ArrowDown':
        if (orientation !== 'vertical' && !this._root.nested) break;
        event.preventDefault();
        this.focusNext(activeId);
        break;
      case 'ArrowUp':
        if (this._root.nested && closeSubmenuKey === 'ArrowUp') {
          closeSubmenu();
          break;
        }
        if (orientation !== 'vertical' && !this._root.nested) break;
        event.preventDefault();
        this.focusPrevious(activeId);
        break;
      case 'ArrowRight':
        if (orientation === 'horizontal' && !this._root.nested) {
          event.preventDefault();
          this.focusNext(activeId);
          break;
        }
        if (this._root.nested && event.key === closeSubmenuKey) {
          closeSubmenu();
        }
        break;
      case 'ArrowLeft':
        if (this._root.nested && closeSubmenuKey === 'ArrowLeft') {
          closeSubmenu();
          break;
        }
        if (orientation === 'horizontal' && !this._root.nested) {
          event.preventDefault();
          this.focusPrevious(activeId);
        }
        break;
      case 'Home':
      case 'PageUp':
        event.preventDefault();
        this.focusFirst();
        break;
      case 'End':
      case 'PageDown':
        event.preventDefault();
        this.focusLast();
        break;
      default:
        break;
    }
  }

  resetHighlight() {
    if (this._highlightedId != null) {
      const prev = this._items.get(this._highlightedId);
      if (prev) {
        prev.element.removeAttribute('data-highlighted');
        prev.element.tabIndex = -1;
      }
      this._highlightedId = null;
    }
  }
}

// ─── MenuPopupElement ────────────────────────────────────────────────────────

export class MenuPopupElement extends BaseHTMLElement {
  __menuRuntime: MenuItemManager | null = null;

  private _root: MenuRootElement | null = null;
  private _handler = () => this._handleStateChange();
  private _lastOpen: boolean | null = null;
  private _mounted = false;
  private _transitionStatus: TransitionStatus = undefined;
  private _frameId: number | null = null;
  private _exitRunId = 0;

  connectedCallback() {
    this._root = findMenuRoot(this);
    if (!this._root) return;

    ensureId(this, 'base-ui-menu-popup');
    this._root.setPopupId(this.id);
    this._root.setPopupElement(this);

    this.__menuRuntime = new MenuItemManager(this, this._root);
    (this as any).__menuItemManager = this.__menuRuntime;

    this._root.addEventListener(MENU_STATE_CHANGE_EVENT, this._handler);
    this.addEventListener('keydown', this._handleKeyDown);

    if (!this._root.getOpen()) this.setAttribute('hidden', '');

    queueMicrotask(() => this._handleStateChange());
  }

  disconnectedCallback() {
    this._clearFrame();
    if (this._root) {
      this._root.setPopupId(undefined);
      this._root.setPopupElement(null);
      this._root.removeEventListener(MENU_STATE_CHANGE_EVENT, this._handler);
    }
    this.removeEventListener('keydown', this._handleKeyDown);
    this._root = null;
    this._mounted = false;
    this._lastOpen = null;
    this._transitionStatus = undefined;
    this.__menuRuntime = null;
  }

  private _handleKeyDown = (event: KeyboardEvent) => {
    if (!this._root || !this.__menuRuntime) return;

    if (event.key === 'Escape' && this._root.closeParentOnEsc && this._root.nested) {
      const parentTrigger = this._root.getActiveTriggerElement();
      const parentRoot = parentTrigger ? findMenuRoot(parentTrigger) : null;
      parentRoot?.toggle(false, event, 'escape-key');
    }

    this.__menuRuntime.handleKeyDown(event);
  };

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

    // Sync open state with item manager
    if (open && wasOpen !== true && this.__menuRuntime) {
      // Schedule initial item focus
      this._scheduleInitialFocus();
    } else if (!open && this.__menuRuntime) {
      this.__menuRuntime.resetHighlight();
      this._root.setInitialFocusEdge(null);
    }

    this._lastOpen = open;
    this._syncVisibility();
  }

  private _scheduleInitialFocus(attempts = 5) {
    setTimeout(() => {
      if (!this._root?.getOpen() || !this.__menuRuntime) return;

      if (this._root.getOpenReason() === 'trigger-hover') return;

      const activeElement = this.ownerDocument.activeElement;
      if (
        activeElement instanceof HTMLElement &&
        this.contains(activeElement) &&
        activeElement !== this
      )
        return;

      const edge = this._root.getInitialFocusEdge() ?? 'first';
      const items = Array.from(this.querySelectorAll<HTMLElement>('[role^="menuitem"]'));

      if (items.length === 0) {
        if (attempts > 0) this._scheduleInitialFocus(attempts - 1);
        return;
      }

      const target = edge === 'last' ? items[items.length - 1] : items[0];
      if (target) {
        this.__menuRuntime!.highlightItem(target.id);
        if (this._root.getSuppressKeyboardClick()) {
          suppressItem(target.id);
          this._root.setSuppressKeyboardClick(false);
        }
        target.focus({ preventScroll: true });
      }
      this._root.setInitialFocusEdge(null);
    }, 0);
  }

  private _syncVisibility() {
    if (!this._root) return;
    const open = this._root.getOpen();
    const shouldRender = this._mounted || this._transitionStatus === 'ending';

    if (!shouldRender) {
      this.setAttribute('hidden', '');
      return;
    }

    const hidden = !open && this._transitionStatus !== 'ending';
    if (hidden) this.setAttribute('hidden', '');
    else this.removeAttribute('hidden');

    this.setAttribute('role', 'menu');
    this.setAttribute('tabindex', '-1');
    this.setAttribute('aria-orientation', this._root.orientation);

    this.toggleAttribute('data-open', open);
    this.toggleAttribute('data-closed', !open);
    this.toggleAttribute('data-starting-style', this._transitionStatus === 'starting');
    this.toggleAttribute('data-ending-style', this._transitionStatus === 'ending');
    this.toggleAttribute('data-nested', this._root.nested);
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
    const animations = this.getAnimations?.({ subtree: true }) ?? [];
    if (animations.length > 0) {
      Promise.allSettled(animations.map((a) => a.finished)).then(() => {
        if (runId !== this._exitRunId) return;
        this._finishExit();
      });
    } else {
      this._finishExit();
    }
  }

  private _finishExit() {
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

if (!customElements.get('menu-popup')) {
  customElements.define('menu-popup', MenuPopupElement);
}

// ─── MenuArrowElement ────────────────────────────────────────────────────────

export class MenuArrowElement extends BaseHTMLElement {
  private _root: MenuRootElement | null = null;
  private _handler = () => this._syncAttributes();

  connectedCallback() {
    this._root = findMenuRoot(this);
    if (!this._root) return;
    this._root.setArrowElement(this);
    this._root.addEventListener(MENU_STATE_CHANGE_EVENT, this._handler);
    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(MENU_STATE_CHANGE_EVENT, this._handler);
    if (this._root?.getArrowElement() === this) this._root.setArrowElement(null);
    this._root = null;
  }

  private _syncAttributes() {
    if (!this._root) return;
    const open = this._root.getOpen();
    const ps = this._root.getPositionState();
    this.toggleAttribute('data-open', open);
    this.toggleAttribute('data-closed', !open);
    this.setAttribute('data-side', ps.side);
    this.setAttribute('data-align', ps.align);
    this.toggleAttribute('data-anchor-hidden', ps.anchorHidden);
    this.toggleAttribute('data-arrow-uncentered', ps.arrowUncentered);
  }
}

if (!customElements.get('menu-arrow')) {
  customElements.define('menu-arrow', MenuArrowElement);
}

// ─── MenuBackdropElement ─────────────────────────────────────────────────────

export class MenuBackdropElement extends BaseHTMLElement {
  private _root: MenuRootElement | null = null;
  private _handler = () => this._syncAttributes();

  connectedCallback() {
    this._root = findMenuRoot(this);
    if (!this._root) return;
    this._root.setBackdropElement(this);
    Object.assign(this.style, { pointerEvents: 'none', userSelect: 'none' });
    this.setAttribute('role', 'presentation');
    this.setAttribute('aria-hidden', 'true');
    this._root.addEventListener(MENU_STATE_CHANGE_EVENT, this._handler);
    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(MENU_STATE_CHANGE_EVENT, this._handler);
    this._root = null;
  }

  private _syncAttributes() {
    if (!this._root) return;
    const open = this._root.getOpen();
    this.toggleAttribute('data-open', open);
    this.toggleAttribute('data-closed', !open);
    if (open) this.removeAttribute('hidden');
    else this.setAttribute('hidden', '');
  }
}

if (!customElements.get('menu-backdrop')) {
  customElements.define('menu-backdrop', MenuBackdropElement);
}

// ─── MenuViewportElement ─────────────────────────────────────────────────────

export class MenuViewportElement extends BaseHTMLElement {
  connectedCallback() {
    Object.assign(this.style, {
      overflow: 'auto',
      scrollbarWidth: 'none',
    });
  }
}

if (!customElements.get('menu-viewport')) {
  customElements.define('menu-viewport', MenuViewportElement);
}

// ─── Shared item helpers ─────────────────────────────────────────────────────

function findPopupRuntime(el: Element): MenuItemManager | null {
  const popup = el.closest('menu-popup') as MenuPopupElement | null;
  return popup?.__menuRuntime ?? null;
}

function closeMenuChain(element: HTMLElement, event: Event, reason: MenuChangeEventReason) {
  let root = findMenuRoot(element);
  while (root) {
    const trigger = root.getActiveTriggerElement();
    const parentRoot = trigger ? findMenuRoot(trigger) : null;
    if (!parentRoot || parentRoot === root) break;
    root = parentRoot;
  }
  root?.toggle(false, event, reason);
}

// ─── MenuItemElement ─────────────────────────────────────────────────────────

export class MenuItemElement extends BaseHTMLElement {
  disabled = false;
  closeOnClick = true;

  private _root: MenuRootElement | null = null;
  private _unregister: (() => void) | null = null;

  connectedCallback() {
    this._root = findMenuRoot(this);
    if (!this.id) this.id = createMenuId('item');

    this.setAttribute('role', 'menuitem');
    this.setAttribute('tabindex', '-1');
    if (this.disabled) this.setAttribute('aria-disabled', 'true');
    this.toggleAttribute('data-disabled', this.disabled);

    this.addEventListener('click', this._handleClick);
    this.addEventListener('mouseenter', this._handleMouseEnter);
    this.addEventListener('focus', this._handleFocus);
    this.addEventListener('keydown', this._handleKeyDown);

    this._registerWithPopup();
  }

  disconnectedCallback() {
    this._unregister?.();
    this._unregister = null;
    this.removeEventListener('click', this._handleClick);
    this.removeEventListener('mouseenter', this._handleMouseEnter);
    this.removeEventListener('focus', this._handleFocus);
    this.removeEventListener('keydown', this._handleKeyDown);
    this._root = null;
  }

  private _registerWithPopup(attempts = 5) {
    const runtime = findPopupRuntime(this);
    if (runtime) {
      this._unregister?.();
      this._unregister = runtime.registerItem({
        id: this.id,
        element: this,
        isDisabled: () => this.disabled,
        isSubmenuTrigger: false,
      });
    } else if (attempts > 0) {
      setTimeout(() => this._registerWithPopup(attempts - 1), 0);
    }
  }

  private _handleClick = (event: MouseEvent) => {
    if (this.disabled || this._root?.disabled) {
      event.preventDefault();
      return;
    }
    if (event.detail === 0 && isItemSuppressed(this.id)) {
      clearSuppressedItem(this.id);
      event.preventDefault();
      return;
    }
    if (this.closeOnClick) {
      closeMenuChain(this, event, 'item-press');
    }
  };

  private _handleMouseEnter = () => {
    if (this.disabled || this._root?.disabled) return;
    if (this._root && !this._root.highlightItemOnHover) return;
    findPopupRuntime(this)?.highlightItem(this.id);
  };

  private _handleFocus = () => {
    findPopupRuntime(this)?.highlightItem(this.id);
  };

  private _handleKeyDown = (event: KeyboardEvent) => {
    if (this.disabled || this._root?.disabled) {
      event.preventDefault();
      return;
    }
    if ((event.key === 'Enter' || event.key === ' ') && this.tagName !== 'BUTTON') {
      clearSuppressedItem(this.id);
      event.preventDefault();
      this.click();
    }
  };
}

if (!customElements.get('menu-item')) {
  customElements.define('menu-item', MenuItemElement);
}

// ─── MenuLinkItemElement ─────────────────────────────────────────────────────

export class MenuLinkItemElement extends BaseHTMLElement {
  closeOnClick = false;

  private _root: MenuRootElement | null = null;
  private _unregister: (() => void) | null = null;

  connectedCallback() {
    this._root = findMenuRoot(this);
    if (!this.id) this.id = createMenuId('link-item');

    this.setAttribute('role', 'menuitem');
    this.setAttribute('tabindex', '-1');

    this.addEventListener('click', this._handleClick);
    this.addEventListener('mouseenter', this._handleMouseEnter);
    this.addEventListener('focus', this._handleFocus);
    this.addEventListener('keydown', this._handleKeyDown);

    this._registerWithPopup();
  }

  disconnectedCallback() {
    this._unregister?.();
    this._unregister = null;
    this.removeEventListener('click', this._handleClick);
    this.removeEventListener('mouseenter', this._handleMouseEnter);
    this.removeEventListener('focus', this._handleFocus);
    this.removeEventListener('keydown', this._handleKeyDown);
    this._root = null;
  }

  private _registerWithPopup(attempts = 5) {
    const runtime = findPopupRuntime(this);
    if (runtime) {
      this._unregister?.();
      this._unregister = runtime.registerItem({
        id: this.id,
        element: this,
        isDisabled: () => false,
        isSubmenuTrigger: false,
      });
    } else if (attempts > 0) {
      setTimeout(() => this._registerWithPopup(attempts - 1), 0);
    }
  }

  private _handleClick = (event: MouseEvent) => {
    if (event.detail === 0 && isItemSuppressed(this.id)) {
      clearSuppressedItem(this.id);
      event.preventDefault();
      return;
    }
    if (this.closeOnClick) {
      closeMenuChain(this, event, 'item-press');
    }
  };

  private _handleMouseEnter = () => {
    if (this._root && !this._root.highlightItemOnHover) return;
    findPopupRuntime(this)?.highlightItem(this.id);
  };

  private _handleFocus = () => {
    findPopupRuntime(this)?.highlightItem(this.id);
  };

  private _handleKeyDown = (event: KeyboardEvent) => {
    // Don't prevent Enter on links - let native navigation happen
    if (event.key === 'Enter') return;
    if (event.key === ' ') {
      event.preventDefault();
      this.click();
    }
  };
}

if (!customElements.get('menu-link-item')) {
  customElements.define('menu-link-item', MenuLinkItemElement);
}

// ─── MenuCheckboxItemElement ─────────────────────────────────────────────────

export class MenuCheckboxItemElement extends BaseHTMLElement {
  disabled = false;
  closeOnClick = false;
  defaultChecked = false;

  onCheckedChange:
    | ((checked: boolean, details: MenuChangeEventDetails) => void)
    | undefined;

  private _checked: boolean | undefined;
  private _checkedIsControlled = false;
  private _internalChecked = false;
  private _initialized = false;
  private _root: MenuRootElement | null = null;
  private _unregister: (() => void) | null = null;

  get checked(): boolean | undefined {
    return this._checked;
  }
  set checked(value: boolean | undefined) {
    if (value !== undefined) {
      this._checkedIsControlled = true;
      this._checked = value;
    } else {
      this._checkedIsControlled = false;
      this._checked = undefined;
    }
    this._syncCheckedAttributes();
  }

  connectedCallback() {
    this._root = findMenuRoot(this);
    if (!this.id) this.id = createMenuId('checkbox-item');

    if (!this._initialized) {
      this._initialized = true;
      this._internalChecked = this.defaultChecked;
    }

    this.setAttribute('role', 'menuitemcheckbox');
    this.setAttribute('tabindex', '-1');
    if (this.disabled) this.setAttribute('aria-disabled', 'true');
    this.toggleAttribute('data-disabled', this.disabled);
    this._syncCheckedAttributes();

    this.addEventListener('click', this._handleClick);
    this.addEventListener('mouseenter', this._handleMouseEnter);
    this.addEventListener('focus', this._handleFocus);
    this.addEventListener('keydown', this._handleKeyDown);

    this._registerWithPopup();
  }

  disconnectedCallback() {
    this._unregister?.();
    this._unregister = null;
    this.removeEventListener('click', this._handleClick);
    this.removeEventListener('mouseenter', this._handleMouseEnter);
    this.removeEventListener('focus', this._handleFocus);
    this.removeEventListener('keydown', this._handleKeyDown);
    this._root = null;
  }

  getChecked(): boolean {
    return this._checkedIsControlled ? Boolean(this._checked) : this._internalChecked;
  }

  private _registerWithPopup(attempts = 5) {
    const runtime = findPopupRuntime(this);
    if (runtime) {
      this._unregister?.();
      this._unregister = runtime.registerItem({
        id: this.id,
        element: this,
        isDisabled: () => this.disabled,
        isSubmenuTrigger: false,
      });
    } else if (attempts > 0) {
      setTimeout(() => this._registerWithPopup(attempts - 1), 0);
    }
  }

  private _handleClick = (event: MouseEvent) => {
    if (this.disabled || this._root?.disabled) {
      event.preventDefault();
      return;
    }

    const currentChecked = this.getChecked();
    const nextChecked = !currentChecked;

    const details = createChangeEventDetails('item-press', event);
    this.onCheckedChange?.(nextChecked, details);

    if (details.isCanceled) return;

    if (!this._checkedIsControlled) {
      this._internalChecked = nextChecked;
      this._syncCheckedAttributes();
    }

    if (this.closeOnClick) {
      closeMenuChain(this, event, 'item-press');
    }
  };

  private _handleMouseEnter = () => {
    if (this.disabled || this._root?.disabled) return;
    if (this._root && !this._root.highlightItemOnHover) return;
    findPopupRuntime(this)?.highlightItem(this.id);
  };

  private _handleFocus = () => {
    findPopupRuntime(this)?.highlightItem(this.id);
  };

  private _handleKeyDown = (event: KeyboardEvent) => {
    if (this.disabled || this._root?.disabled) {
      event.preventDefault();
      return;
    }
    if ((event.key === 'Enter' || event.key === ' ') && this.tagName !== 'BUTTON') {
      event.preventDefault();
      this.click();
    }
  };

  private _syncCheckedAttributes() {
    const checked = this.getChecked();
    this.setAttribute('aria-checked', String(checked));
    this.toggleAttribute('data-checked', checked);
    this.toggleAttribute('data-unchecked', !checked);
    // Notify indicator children
    this.dispatchEvent(new CustomEvent('base-ui-menu-checked-change'));
  }
}

if (!customElements.get('menu-checkbox-item')) {
  customElements.define('menu-checkbox-item', MenuCheckboxItemElement);
}

// ─── MenuCheckboxItemIndicatorElement ────────────────────────────────────────

export class MenuCheckboxItemIndicatorElement extends BaseHTMLElement {
  keepMounted = false;

  private _parent: MenuCheckboxItemElement | null = null;
  private _handler = () => this._sync();

  connectedCallback() {
    this._parent = this.closest('menu-checkbox-item') as MenuCheckboxItemElement | null;
    this.setAttribute('aria-hidden', 'true');

    if (this._parent) {
      this._parent.addEventListener('base-ui-menu-checked-change', this._handler);
    }
    this._sync();
  }

  disconnectedCallback() {
    this._parent?.removeEventListener('base-ui-menu-checked-change', this._handler);
    this._parent = null;
  }

  private _sync() {
    const checked = this._parent?.getChecked() ?? false;
    this.hidden = !this.keepMounted && !checked;
    this.toggleAttribute('data-checked', checked);
    this.toggleAttribute('data-unchecked', !checked);
  }
}

if (!customElements.get('menu-checkbox-item-indicator')) {
  customElements.define('menu-checkbox-item-indicator', MenuCheckboxItemIndicatorElement);
}

// ─── MenuGroupElement ────────────────────────────────────────────────────────

export class MenuGroupElement extends BaseHTMLElement {
  private _labelId: string | undefined;

  connectedCallback() {
    this.setAttribute('role', 'group');
  }

  getLabelId() {
    return this._labelId;
  }

  setLabelId(id: string | undefined) {
    this._labelId = id;
    if (id) this.setAttribute('aria-labelledby', id);
    else this.removeAttribute('aria-labelledby');
  }
}

if (!customElements.get('menu-group')) {
  customElements.define('menu-group', MenuGroupElement);
}

// ─── MenuGroupLabelElement ───────────────────────────────────────────────────

export class MenuGroupLabelElement extends BaseHTMLElement {
  private _group: MenuGroupElement | null = null;
  private _registeredId: string | null = null;

  connectedCallback() {
    if (!this.id) this.id = createMenuId('group-label');
    this.setAttribute('role', 'presentation');

    // Find parent group
    this._group = this.closest('menu-group') as MenuGroupElement | null;
    if (this._group) {
      this._group.setLabelId(this.id);
      this._registeredId = this.id;
    }
  }

  disconnectedCallback() {
    if (this._group && this._registeredId && this._group.getLabelId() === this._registeredId) {
      this._group.setLabelId(undefined);
    }
    this._group = null;
    this._registeredId = null;
  }
}

if (!customElements.get('menu-group-label')) {
  customElements.define('menu-group-label', MenuGroupLabelElement);
}

// ─── MenuRadioGroupElement ───────────────────────────────────────────────────

export class MenuRadioGroupElement extends BaseHTMLElement {
  disabled = false;
  defaultValue: any;

  onValueChange:
    | ((value: any, details: MenuChangeEventDetails) => void)
    | undefined;

  private _value: any;
  private _valueIsControlled = false;
  private _internalValue: any;
  private _initialized = false;

  get value(): any {
    return this._value;
  }
  set value(v: any) {
    if (v !== undefined) {
      this._valueIsControlled = true;
      this._value = v;
    } else {
      this._valueIsControlled = false;
      this._value = undefined;
    }
    this.dispatchEvent(new CustomEvent('base-ui-menu-radio-change'));
  }

  connectedCallback() {
    this.setAttribute('role', 'group');
    if (this.disabled) this.setAttribute('aria-disabled', 'true');

    if (!this._initialized) {
      this._initialized = true;
      this._internalValue = this.defaultValue;
    }
  }

  getValue(): any {
    return this._valueIsControlled ? this._value : this._internalValue;
  }

  setValue(nextValue: any, event: Event) {
    const details = createChangeEventDetails('item-press', event);
    this.onValueChange?.(nextValue, details);

    if (details.isCanceled) return;

    if (this._valueIsControlled) return;

    this._internalValue = nextValue;
    this.dispatchEvent(new CustomEvent('base-ui-menu-radio-change'));
  }
}

if (!customElements.get('menu-radio-group')) {
  customElements.define('menu-radio-group', MenuRadioGroupElement);
}

// ─── MenuRadioItemElement ────────────────────────────────────────────────────

export class MenuRadioItemElement extends BaseHTMLElement {
  disabled = false;
  closeOnClick = false;

  private _value: any;
  private _root: MenuRootElement | null = null;
  private _radioGroup: MenuRadioGroupElement | null = null;
  private _unregister: (() => void) | null = null;
  private _radioHandler = () => this._syncChecked();

  get value(): any {
    return this._value;
  }
  set value(v: any) {
    this._value = v;
    this._syncChecked();
  }

  connectedCallback() {
    this._root = findMenuRoot(this);
    this._radioGroup = this.closest('menu-radio-group') as MenuRadioGroupElement | null;
    if (!this.id) this.id = createMenuId('radio-item');

    this.setAttribute('role', 'menuitemradio');
    this.setAttribute('tabindex', '-1');

    if (this._radioGroup) {
      this._radioGroup.addEventListener('base-ui-menu-radio-change', this._radioHandler);
    }

    this._syncChecked();
    this._syncDisabled();

    this.addEventListener('click', this._handleClick);
    this.addEventListener('mouseenter', this._handleMouseEnter);
    this.addEventListener('focus', this._handleFocus);
    this.addEventListener('keydown', this._handleKeyDown);

    this._registerWithPopup();
  }

  disconnectedCallback() {
    this._unregister?.();
    this._unregister = null;
    this._radioGroup?.removeEventListener('base-ui-menu-radio-change', this._radioHandler);
    this.removeEventListener('click', this._handleClick);
    this.removeEventListener('mouseenter', this._handleMouseEnter);
    this.removeEventListener('focus', this._handleFocus);
    this.removeEventListener('keydown', this._handleKeyDown);
    this._root = null;
    this._radioGroup = null;
  }

  private _registerWithPopup(attempts = 5) {
    const runtime = findPopupRuntime(this);
    if (runtime) {
      this._unregister?.();
      this._unregister = runtime.registerItem({
        id: this.id,
        element: this,
        isDisabled: () => this.disabled || Boolean(this._radioGroup?.disabled),
        isSubmenuTrigger: false,
      });
    } else if (attempts > 0) {
      setTimeout(() => this._registerWithPopup(attempts - 1), 0);
    }
  }

  private _syncChecked() {
    if (!this._radioGroup) return;
    const checked = this._radioGroup.getValue() === this._value;
    this.setAttribute('aria-checked', String(checked));
    this.toggleAttribute('data-checked', checked);
    this.toggleAttribute('data-unchecked', !checked);
    this.dispatchEvent(new CustomEvent('base-ui-menu-radio-item-change'));
  }

  private _syncDisabled() {
    const disabled = this.disabled || Boolean(this._radioGroup?.disabled);
    if (disabled) this.setAttribute('aria-disabled', 'true');
    else this.removeAttribute('aria-disabled');
    this.toggleAttribute('data-disabled', disabled);
  }

  private _handleClick = (event: MouseEvent) => {
    const disabled = this.disabled || Boolean(this._radioGroup?.disabled);
    if (disabled || this._root?.disabled) {
      event.preventDefault();
      return;
    }
    this._radioGroup?.setValue(this._value, event);
    if (this.closeOnClick) {
      closeMenuChain(this, event, 'item-press');
    }
  };

  private _handleMouseEnter = () => {
    const disabled = this.disabled || Boolean(this._radioGroup?.disabled);
    if (disabled || this._root?.disabled) return;
    if (this._root && !this._root.highlightItemOnHover) return;
    findPopupRuntime(this)?.highlightItem(this.id);
  };

  private _handleFocus = () => {
    findPopupRuntime(this)?.highlightItem(this.id);
  };

  private _handleKeyDown = (event: KeyboardEvent) => {
    const disabled = this.disabled || Boolean(this._radioGroup?.disabled);
    if (disabled || this._root?.disabled) {
      event.preventDefault();
      return;
    }
    if ((event.key === 'Enter' || event.key === ' ') && this.tagName !== 'BUTTON') {
      event.preventDefault();
      this.click();
    }
  };
}

if (!customElements.get('menu-radio-item')) {
  customElements.define('menu-radio-item', MenuRadioItemElement);
}

// ─── MenuRadioItemIndicatorElement ───────────────────────────────────────────

export class MenuRadioItemIndicatorElement extends BaseHTMLElement {
  keepMounted = false;

  private _parent: MenuRadioItemElement | null = null;
  private _handler = () => this._sync();

  connectedCallback() {
    this._parent = this.closest('menu-radio-item') as MenuRadioItemElement | null;
    this.setAttribute('aria-hidden', 'true');

    if (this._parent) {
      this._parent.addEventListener('base-ui-menu-radio-item-change', this._handler);
    }
    this._sync();
  }

  disconnectedCallback() {
    this._parent?.removeEventListener('base-ui-menu-radio-item-change', this._handler);
    this._parent = null;
  }

  private _sync() {
    const checked = this._parent?.getAttribute('aria-checked') === 'true';
    this.hidden = !this.keepMounted && !checked;
    this.toggleAttribute('data-checked', checked);
    this.toggleAttribute('data-unchecked', !checked);
  }
}

if (!customElements.get('menu-radio-item-indicator')) {
  customElements.define('menu-radio-item-indicator', MenuRadioItemIndicatorElement);
}

// ─── MenuSeparatorElement ────────────────────────────────────────────────────

export class MenuSeparatorElement extends BaseHTMLElement {
  connectedCallback() {
    this.setAttribute('role', 'separator');
  }
}

if (!customElements.get('menu-separator')) {
  customElements.define('menu-separator', MenuSeparatorElement);
}

// ─── MenuSubmenuTriggerElement ───────────────────────────────────────────────

export class MenuSubmenuTriggerElement extends BaseHTMLElement {
  disabled = false;
  openOnHover = true;
  delay = 100;
  closeDelay = 0;

  private _submenuRoot: MenuRootElement | null = null;
  private _parentRoot: MenuRootElement | null = null;
  private _unregister: (() => void) | null = null;
  private _handler = () => this._syncAttributes();

  connectedCallback() {
    // Find the submenu-root (direct parent in DOM)
    this._submenuRoot = this.closest('menu-submenu-root') as MenuRootElement | null;

    // The parent menu root is the root ABOVE the submenu-root
    if (this._submenuRoot?.parentElement) {
      this._parentRoot = findMenuRoot(this._submenuRoot.parentElement);
    }

    if (!this.id) this.id = createMenuId('submenu-trigger');

    this.setAttribute('role', 'menuitem');
    this.setAttribute('tabindex', '-1');
    this.setAttribute('aria-haspopup', 'menu');
    if (this.disabled) {
      this.setAttribute('aria-disabled', 'true');
      this.toggleAttribute('data-disabled', true);
    }

    // Register as trigger for the submenu
    if (this._submenuRoot) {
      this._submenuRoot.setActiveTriggerElement(this);
      this._submenuRoot.addEventListener(MENU_STATE_CHANGE_EVENT, this._handler);
    }

    this.addEventListener('click', this._handleClick);
    this.addEventListener('mouseenter', this._handleMouseEnter);
    this.addEventListener('mouseleave', this._handleMouseLeave);
    this.addEventListener('focus', this._handleFocus);
    this.addEventListener('keydown', this._handleKeyDown);

    // Register as item in parent popup
    this._registerWithParentPopup();
    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this._unregister?.();
    this._unregister = null;
    this._submenuRoot?.removeEventListener(MENU_STATE_CHANGE_EVENT, this._handler);
    this.removeEventListener('click', this._handleClick);
    this.removeEventListener('mouseenter', this._handleMouseEnter);
    this.removeEventListener('mouseleave', this._handleMouseLeave);
    this.removeEventListener('focus', this._handleFocus);
    this.removeEventListener('keydown', this._handleKeyDown);
    this._submenuRoot = null;
    this._parentRoot = null;
  }

  private _registerWithParentPopup(attempts = 5) {
    const runtime = findPopupRuntime(this);
    if (runtime) {
      this._unregister?.();
      this._unregister = runtime.registerItem({
        id: this.id,
        element: this,
        isDisabled: () => this.disabled,
        isSubmenuTrigger: true,
      });
    } else if (attempts > 0) {
      setTimeout(() => this._registerWithParentPopup(attempts - 1), 0);
    }
  }

  private _handleClick = (event: MouseEvent) => {
    if (this.disabled || this._parentRoot?.disabled) {
      event.preventDefault();
      return;
    }
    if (!this._submenuRoot) return;

    const wasOpen = this._submenuRoot.getOpen();
    this._submenuRoot.toggle(!wasOpen, event, 'trigger-press');
  };

  private _handleMouseEnter = () => {
    if (this.disabled || this._parentRoot?.disabled) return;
    if (!this.openOnHover || !this._submenuRoot) return;

    // Highlight in parent
    const parentRuntime = findPopupRuntime(this);
    if (this._parentRoot?.highlightItemOnHover) {
      parentRuntime?.highlightItem(this.id);
    }

    this._submenuRoot.enterHoverRegion();
    this._submenuRoot.scheduleHoverOpen(this.delay, new MouseEvent('mouseenter'));
  };

  private _handleMouseLeave = (event: MouseEvent) => {
    if (!this.openOnHover || !this._submenuRoot) return;
    this._submenuRoot.leaveHoverRegion(event, this.closeDelay);
  };

  private _handleFocus = () => {
    if (this.disabled || this._parentRoot?.disabled) return;
    findPopupRuntime(this)?.highlightItem(this.id);
  };

  private _handleKeyDown = (event: KeyboardEvent) => {
    if (this.disabled || this._parentRoot?.disabled) {
      event.preventDefault();
      return;
    }
    if (!this._submenuRoot) return;

    const parentOrientation = this._parentRoot?.orientation ?? 'vertical';
    const direction = getDirection(this);
    const openKey = getSubmenuOpenKey(parentOrientation, direction);

    if (event.key === openKey) {
      event.preventDefault();
      this.click();
      // Focus first item in submenu
      this._scheduleFocusFirstSubmenuItem();
    }
  };

  private _scheduleFocusFirstSubmenuItem(attempts = 5) {
    setTimeout(() => {
      if (!this._submenuRoot?.getOpen()) return;
      const popup = this._submenuRoot.getPopupElement();
      if (!(popup instanceof HTMLElement)) {
        if (attempts > 0) this._scheduleFocusFirstSubmenuItem(attempts - 1);
        return;
      }
      const items = Array.from(popup.querySelectorAll<HTMLElement>('[role^="menuitem"]'));
      const target = items[0];
      if (target) {
        const runtime = (popup as any).__menuRuntime as MenuItemManager | undefined;
        runtime?.highlightItem(target.id);
        target.focus({ preventScroll: true });
      } else if (attempts > 0) {
        this._scheduleFocusFirstSubmenuItem(attempts - 1);
      }
    }, 0);
  }

  private _syncAttributes() {
    if (!this._submenuRoot) return;
    const open = this._submenuRoot.getOpen();
    this.setAttribute('aria-expanded', String(open));
    this.toggleAttribute('data-popup-open', open);
  }
}

if (!customElements.get('menu-submenu-trigger')) {
  customElements.define('menu-submenu-trigger', MenuSubmenuTriggerElement);
}

