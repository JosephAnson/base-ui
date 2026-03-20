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

// ─── Constants ──────────────────────────────────────────────────────────────────

const POPOVER_ROOT_ATTRIBUTE = 'data-base-ui-popover-root';
const POPOVER_STATE_CHANGE_EVENT = 'base-ui-popover-state-change';
const DEFAULT_HOVER_OPEN_DELAY = 300;

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

// ─── Types ──────────────────────────────────────────────────────────────────────

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

export type PopoverChangeEventReason =
  | 'trigger-hover'
  | 'trigger-focus'
  | 'trigger-press'
  | 'outside-press'
  | 'escape-key'
  | 'close-press'
  | 'focus-out'
  | 'none';

export interface PopoverChangeEventDetails {
  reason: PopoverChangeEventReason;
  event: Event;
  readonly isCanceled: boolean;
  cancel(): void;
}

export interface PopoverPositionState {
  side: Side;
  align: Align;
  anchorHidden: boolean;
  arrowOffsetX: number | null;
  arrowOffsetY: number | null;
  arrowUncentered: boolean;
  transformOrigin: string;
}

// ─── Open popover stack (for nested Escape dismissal) ────────────────────────

const openPopoverStack: PopoverRootElement[] = [];

function pushOpenPopover(root: PopoverRootElement) {
  const idx = openPopoverStack.indexOf(root);
  if (idx !== -1) openPopoverStack.splice(idx, 1);
  openPopoverStack.push(root);
}

function removeOpenPopover(root: PopoverRootElement) {
  const idx = openPopoverStack.indexOf(root);
  if (idx !== -1) openPopoverStack.splice(idx, 1);
}

function getTopmostOpenPopover(): PopoverRootElement | null {
  return openPopoverStack.at(-1) ?? null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function createChangeEventDetails(
  reason: PopoverChangeEventReason,
  event: Event,
): PopoverChangeEventDetails {
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

function getTransformOrigin(
  side: Side,
  align: Align,
  arrowX: number | null,
  arrowY: number | null,
) {
  const alignValue =
    align === 'start' ? '0%' : align === 'end' ? '100%' : '50%';
  if (side === 'top')
    return `${arrowX != null ? `${arrowX}px` : alignValue} 100%`;
  if (side === 'bottom')
    return `${arrowX != null ? `${arrowX}px` : alignValue} 0%`;
  if (side === 'left')
    return `100% ${arrowY != null ? `${arrowY}px` : alignValue}`;
  return `0% ${arrowY != null ? `${arrowY}px` : alignValue}`;
}

function isEventInside(
  target: EventTarget | null,
  element: Element | null,
) {
  return target instanceof Node && element?.contains(target) === true;
}

function normalizeBoundary(
  boundary: CollisionBoundary,
): Boundary | undefined {
  if (boundary == null) return undefined;
  if (boundary === 'clipping-ancestors') return 'clippingAncestors';
  if (Array.isArray(boundary)) return [...boundary] as Boundary;
  return boundary as Boundary;
}

function isVisible(element: HTMLElement) {
  if (element.hidden) return false;
  const style = getComputedStyle(element);
  return style.display !== 'none' && style.visibility !== 'hidden';
}

function getFocusableElements(container: HTMLElement | null) {
  if (container == null) return [] as HTMLElement[];
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter(
    (el) =>
      !el.hasAttribute('disabled') &&
      !el.getAttribute('aria-hidden') &&
      isVisible(el),
  );
}

// ─── PopoverRootElement ─────────────────────────────────────────────────────────

export class PopoverRootElement extends ReactiveElement {
  static properties = {
    modal: { type: Boolean },
  };

  declare modal: boolean;

  /** Default open state (uncontrolled). */
  defaultOpen = false;

  /** Prevent dismissal from outside pointer / focus events. */
  disablePointerDismissal = false;

  /** Called when the open state changes. */
  onOpenChange:
    | ((open: boolean, details: PopoverChangeEventDetails) => void)
    | undefined;

  // ── Controlled / uncontrolled ──────────────────────────────────────────────
  private _open: boolean | undefined;
  private _openIsControlled = false;
  private _internalOpen = false;
  private _initialized = false;
  private _transitionStatus: TransitionStatus = undefined;
  private _openReason: PopoverChangeEventReason | null = null;
  private _lastPublishedStateKey: string | null = null;

  // ── Part references ────────────────────────────────────────────────────────
  private _popupId: string | undefined;
  private _titleId: string | undefined;
  private _descriptionId: string | undefined;
  private _arrowElement: HTMLElement | null = null;
  private _positionerElement: HTMLElement | null = null;
  private _popupElement: HTMLElement | null = null;
  private _backdropElement: HTMLElement | null = null;
  private _activeTriggerElement: HTMLElement | null = null;

  // ── Hover ──────────────────────────────────────────────────────────────────
  private _hoverOpenTimeout: number | null = null;
  private _hoverCloseTimeout: number | null = null;
  private _hoverRegionDepth = 0;

  // ── Position ───────────────────────────────────────────────────────────────
  private _positionState: PopoverPositionState = {
    side: 'bottom',
    align: 'center',
    anchorHidden: false,
    arrowOffsetX: null,
    arrowOffsetY: null,
    arrowUncentered: false,
    transformOrigin: '50% 0%',
  };

  // ── Document listeners ─────────────────────────────────────────────────────
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
    this.modal = false;
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
    this.setAttribute(POPOVER_ROOT_ATTRIBUTE, '');

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
    removeOpenPopover(this);
    this._lastPublishedStateKey = null;
    this._transitionStatus = undefined;
  }

  protected override updated() {
    this._syncOpenStack();
    this._syncDocumentListeners();
    this._syncAttributes();
    this._publishStateChange();
  }

  // ── Public API for child parts ─────────────────────────────────────────────

  getOpen(): boolean {
    return this._openIsControlled
      ? Boolean(this._open)
      : this._internalOpen;
  }

  getModal(): boolean {
    return this.modal;
  }

  getOpenReason(): PopoverChangeEventReason | null {
    return this._openReason;
  }

  getTransitionStatus(): TransitionStatus {
    return this._transitionStatus;
  }

  // Part registration
  getPopupId() {
    return this._popupId;
  }
  setPopupId(id: string | undefined) {
    if (this._popupId === id) return;
    this._popupId = id;
    this._publishStateChange();
  }

  getTitleId() {
    return this._titleId;
  }
  setTitleId(id: string | undefined) {
    if (this._titleId === id) return;
    this._titleId = id;
    this._publishStateChange();
  }

  getDescriptionId() {
    return this._descriptionId;
  }
  setDescriptionId(id: string | undefined) {
    if (this._descriptionId === id) return;
    this._descriptionId = id;
    this._publishStateChange();
  }

  getArrowElement() {
    return this._arrowElement;
  }
  setArrowElement(el: HTMLElement | null) {
    this._arrowElement = el;
    this._publishStateChange();
  }

  getPositionerElement() {
    return this._positionerElement;
  }
  setPositionerElement(el: HTMLElement | null) {
    this._positionerElement = el;
  }

  getPopupElement() {
    return this._popupElement;
  }
  setPopupElement(el: HTMLElement | null) {
    this._popupElement = el;
  }

  getBackdropElement() {
    return this._backdropElement;
  }
  setBackdropElement(el: HTMLElement | null) {
    this._backdropElement = el;
  }

  getActiveTriggerElement() {
    return this._activeTriggerElement;
  }
  setActiveTriggerElement(el: HTMLElement | null) {
    this._activeTriggerElement = el;
  }

  getPositionState() {
    return this._positionState;
  }
  setPositionState(next: Partial<PopoverPositionState>) {
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

  setTransitionStatus(status: TransitionStatus) {
    if (this._transitionStatus === status) return;
    this._transitionStatus = status;
    this._syncAttributes();
    this._publishStateChange();
  }

  toggle(
    nextOpen: boolean,
    event: Event,
    reason: PopoverChangeEventReason,
  ) {
    // Only the topmost popover handles Escape
    if (
      !nextOpen &&
      reason === 'escape-key' &&
      getTopmostOpenPopover() !== this
    ) {
      return;
    }

    // Check disablePointerDismissal
    if (
      !nextOpen &&
      this.disablePointerDismissal &&
      (reason === 'outside-press' || reason === 'focus-out')
    ) {
      return;
    }

    const details = createChangeEventDetails(reason, event);
    this.onOpenChange?.(nextOpen, details);

    if (details.isCanceled) return;

    this._openReason = reason;

    if (!this._openIsControlled) {
      this._internalOpen = nextOpen;
    }

    if (!nextOpen) {
      this._clearHoverTimers();
    }

    this._syncOpenStack();
    this._syncDocumentListeners();
    this._syncAttributes();
    this._publishStateChange();

    // Restore focus to trigger on close (not for hover-opened popovers)
    if (!nextOpen && this._openReason !== 'trigger-hover') {
      setTimeout(() => {
        if (
          this._activeTriggerElement?.isConnected &&
          !this.getOpen()
        ) {
          this._activeTriggerElement.focus({ preventScroll: true });
        }
      }, 0);
    }
  }

  // ── Hover support ──────────────────────────────────────────────────────────

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
      if (
        this._hoverRegionDepth === 0 &&
        this._openReason === 'trigger-hover'
      ) {
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

  // ── Internal ───────────────────────────────────────────────────────────────

  private _syncOpenStack() {
    if (this.getOpen()) {
      pushOpenPopover(this);
    } else {
      removeOpenPopover(this);
    }
  }

  private _syncDocumentListeners() {
    this._documentListenersCleanup?.();
    this._documentListenersCleanup = null;

    if (!this.getOpen()) return;

    const handleMouseDown = (event: Event) => {
      const target = event.target;
      if (
        isEventInside(target, this._positionerElement) ||
        isEventInside(target, this._activeTriggerElement) ||
        isEventInside(target, this._backdropElement)
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
      this.modal ? 'modal' : 'non-modal',
      this._transitionStatus ?? 'idle',
      this._popupId ?? '',
      this._titleId ?? '',
      this._descriptionId ?? '',
      ps.side,
      ps.align,
      String(ps.anchorHidden),
      String(ps.arrowOffsetX),
      String(ps.arrowOffsetY),
      String(ps.arrowUncentered),
      this._openReason ?? '',
    ].join('|');

    if (nextKey === this._lastPublishedStateKey) return;
    this._lastPublishedStateKey = nextKey;
    this.dispatchEvent(new CustomEvent(POPOVER_STATE_CHANGE_EVENT));
  }
}

if (!customElements.get('popover-root')) {
  customElements.define('popover-root', PopoverRootElement);
}

// ─── PopoverTriggerElement ──────────────────────────────────────────────────────

export class PopoverTriggerElement extends BaseHTMLElement {
  /** Whether this trigger is disabled. */
  disabled = false;

  /** Open the popover on hover. */
  openOnHover = false;

  /** Hover open delay in ms (default 300). */
  delay = DEFAULT_HOVER_OPEN_DELAY;

  /** Hover close delay in ms (default 0). */
  closeDelay = 0;

  private _root: PopoverRootElement | null = null;
  private _handler = () => this._syncAttributes();

  connectedCallback() {
    this._root = this.closest('popover-root') as PopoverRootElement | null;
    if (!this._root) {
      console.error(
        'Base UI: Popover parts must be placed within <popover-root>.',
      );
      return;
    }

    this._root.setActiveTriggerElement(this);

    this.setAttribute('role', 'button');
    this.setAttribute('tabindex', '0');

    this._root.addEventListener(POPOVER_STATE_CHANGE_EVENT, this._handler);

    this.addEventListener('click', this._handleClick);
    this.addEventListener('keydown', this._handleKeyDown);
    this.addEventListener('keyup', this._handleKeyUp);
    this.addEventListener('mouseenter', this._handleMouseEnter);
    this.addEventListener('mouseleave', this._handleMouseLeave);

    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(
      POPOVER_STATE_CHANGE_EVENT,
      this._handler,
    );
    this.removeEventListener('click', this._handleClick);
    this.removeEventListener('keydown', this._handleKeyDown);
    this.removeEventListener('keyup', this._handleKeyUp);
    this.removeEventListener('mouseenter', this._handleMouseEnter);
    this.removeEventListener('mouseleave', this._handleMouseLeave);
    this._root = null;
  }

  private _handleClick = (event: Event) => {
    if (!this._root || this.disabled) return;
    const open = this._root.getOpen();
    this._root.toggle(!open, event, 'trigger-press');
  };

  private _handleKeyDown = (event: KeyboardEvent) => {
    if (!this._root || this.disabled) return;
    if (event.target !== this) return;

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const open = this._root.getOpen();
      this._root.toggle(!open, event, 'trigger-press');
    }
  };

  private _handleKeyUp = (event: KeyboardEvent) => {
    if (event.key === ' ') event.preventDefault();
  };

  private _handleMouseEnter = (event: MouseEvent) => {
    if (!this._root || this.disabled || !this.openOnHover) return;
    this._root.enterHoverRegion();
    this._root.scheduleHoverOpen(this.delay, event);
  };

  private _handleMouseLeave = (event: MouseEvent) => {
    if (!this._root || !this.openOnHover) return;
    this._root.leaveHoverRegion(event, this.closeDelay);
  };

  private _syncAttributes() {
    if (!this._root) return;
    const open = this._root.getOpen();
    const popupId = this._root.getPopupId();

    this.setAttribute('aria-expanded', String(open));
    this.toggleAttribute('data-popup-open', open);

    if (open && popupId) {
      this.setAttribute('aria-controls', popupId);
    } else {
      this.removeAttribute('aria-controls');
    }

    this.setAttribute('aria-haspopup', 'dialog');
  }
}

if (!customElements.get('popover-trigger')) {
  customElements.define('popover-trigger', PopoverTriggerElement);
}

// ─── PopoverPortalElement ───────────────────────────────────────────────────────

export class PopoverPortalElement extends BaseHTMLElement {
  private _root: PopoverRootElement | null = null;
  private _handler = () => this._syncVisibility();

  connectedCallback() {
    this._root = this.closest('popover-root') as PopoverRootElement | null;
    if (!this._root) {
      console.error(
        'Base UI: Popover parts must be placed within <popover-root>.',
      );
      return;
    }

    this.style.display = 'contents';
    this._root.addEventListener(POPOVER_STATE_CHANGE_EVENT, this._handler);
    queueMicrotask(() => this._syncVisibility());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(
      POPOVER_STATE_CHANGE_EVENT,
      this._handler,
    );
    this._root = null;
  }

  private _syncVisibility() {
    if (!this._root) return;
    const open = this._root.getOpen();
    this.toggleAttribute('data-open', open);
    this.toggleAttribute('data-closed', !open);
  }
}

if (!customElements.get('popover-portal')) {
  customElements.define('popover-portal', PopoverPortalElement);
}

// ─── PopoverPositionerElement ───────────────────────────────────────────────────

export class PopoverPositionerElement extends BaseHTMLElement {
  /** Preferred side. */
  side: Side = 'bottom';

  /** Offset from the anchor along the main axis. */
  sideOffset = 0;

  /** Preferred alignment. */
  align: Align = 'center';

  /** Offset from the anchor along the cross axis. */
  alignOffset = 0;

  /** Collision avoidance strategy. undefined = both flip + shift. */
  collisionAvoidance: CollisionAvoidance = undefined;

  /** Collision boundary. */
  collisionBoundary: CollisionBoundary = undefined;

  /** Collision padding in px. */
  collisionPadding = 5;

  /** Arrow padding in px. */
  arrowPadding = 5;

  /** Whether the popover sticks to the edge when shifting. */
  sticky = false;

  /** Disable anchor element resize/layout-shift tracking. */
  disableAnchorTracking = false;

  /** Position strategy: 'absolute' or 'fixed'. */
  positionMethod: 'absolute' | 'fixed' = 'absolute';

  /** Custom anchor element (default: trigger). */
  anchor: Element | undefined;

  private _root: PopoverRootElement | null = null;
  private _handler = () => this._handleStateChange();
  private _cleanupAutoUpdate: (() => void) | null = null;

  connectedCallback() {
    this._root = this.closest('popover-root') as PopoverRootElement | null;
    if (!this._root) {
      console.error(
        'Base UI: Popover parts must be placed within <popover-root>.',
      );
      return;
    }

    this._root.setPositionerElement(this);

    // Set default positioner styles
    this.setAttribute('role', 'presentation');
    Object.assign(this.style, {
      position: this.positionMethod,
      left: '0px',
      top: '0px',
    });

    this._root.addEventListener(POPOVER_STATE_CHANGE_EVENT, this._handler);
    queueMicrotask(() => this._handleStateChange());
  }

  disconnectedCallback() {
    this._stopAutoUpdate();
    this._root?.removeEventListener(
      POPOVER_STATE_CHANGE_EVENT,
      this._handler,
    );
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

    const anchorElement =
      this.anchor ?? this._root.getActiveTriggerElement();
    if (!(anchorElement instanceof Element)) return;

    const placement = toPlacement(this.side, this.align);
    const middleware: Array<{
      name: string;
      options?: unknown;
      fn?: (state: unknown) => unknown;
    }> = [
      offset({
        mainAxis: this.sideOffset,
        crossAxis: this.alignOffset,
      }) as any,
      hide() as any,
    ];

    const avoid = this.collisionAvoidance;
    if (avoid !== 'none') {
      if (avoid === undefined || avoid === 'flip') {
        middleware.push(
          flip({
            boundary: normalizeBoundary(this.collisionBoundary),
            padding: this.collisionPadding,
          }) as any,
        );
      }
      if (avoid === undefined || avoid === 'shift') {
        middleware.push(
          shift({
            boundary: normalizeBoundary(this.collisionBoundary),
            padding: this.collisionPadding,
            limiter: this.sticky ? undefined : limitShift(),
          }) as any,
        );
      }
    }

    const arrowElement = this._root.getArrowElement();
    if (arrowElement) {
      middleware.push(
        floatingArrow({
          element: arrowElement,
          padding: this.arrowPadding,
        }) as any,
      );
    }

    const updatePosition = () => {
      if (!this._root) return;
      const root = this._root;

      computePosition(anchorElement, this, {
        placement,
        strategy: this.positionMethod,
        middleware: middleware as any,
      }).then(
        (result: Awaited<ReturnType<typeof computePosition>>) => {
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
          const hideData = result.middlewareData.hide as
            | { referenceHidden?: boolean }
            | undefined;

          // Position arrow
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
              left:
                arrowData?.x != null ? `${arrowData.x}px` : '',
              top:
                arrowData?.y != null ? `${arrowData.y}px` : '',
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
              arrowData?.centerOffset != null
                ? Math.abs(arrowData.centerOffset) > 0.5
                : false,
            transformOrigin: getTransformOrigin(
              parsed.side,
              parsed.align,
              arrowData?.x ?? null,
              arrowData?.y ?? null,
            ),
          });

          this.style.setProperty(
            '--transform-origin',
            root.getPositionState().transformOrigin,
          );
        },
      );
    };

    updatePosition();
    this._cleanupAutoUpdate = autoUpdate(
      anchorElement,
      this,
      updatePosition,
      {
        elementResize: !this.disableAnchorTracking,
        layoutShift: !this.disableAnchorTracking,
      },
    );
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
  }
}

if (!customElements.get('popover-positioner')) {
  customElements.define('popover-positioner', PopoverPositionerElement);
}

// ─── PopoverPopupElement ────────────────────────────────────────────────────────

export class PopoverPopupElement extends BaseHTMLElement {
  private _root: PopoverRootElement | null = null;
  private _handler = () => this._handleStateChange();
  private _mounted = false;
  private _transitionStatus: TransitionStatus = undefined;
  private _lastOpen: boolean | null = null;
  private _frameId: number | null = null;
  private _exitRunId = 0;

  connectedCallback() {
    this._root = this.closest('popover-root') as PopoverRootElement | null;
    if (!this._root) {
      console.error(
        'Base UI: Popover parts must be placed within <popover-root>.',
      );
      return;
    }

    ensureId(this, 'base-ui-popover-popup');
    this._root.setPopupId(this.id);
    this._root.setPopupElement(this);

    this._root.addEventListener(POPOVER_STATE_CHANGE_EVENT, this._handler);

    this.addEventListener('mouseenter', this._handleMouseEnter);
    this.addEventListener('mouseleave', this._handleMouseLeave);
    this.addEventListener('keydown', this._handleKeyDown);

    if (!this._root.getOpen()) {
      this.setAttribute('hidden', '');
    }

    queueMicrotask(() => this._handleStateChange());
  }

  disconnectedCallback() {
    this._clearFrame();
    if (this._root) {
      this._root.setPopupId(undefined);
      this._root.setPopupElement(null);
      this._root.setTransitionStatus(undefined);
      this._root.removeEventListener(
        POPOVER_STATE_CHANGE_EVENT,
        this._handler,
      );
    }
    this.removeEventListener('mouseenter', this._handleMouseEnter);
    this.removeEventListener('mouseleave', this._handleMouseLeave);
    this.removeEventListener('keydown', this._handleKeyDown);
    this._root = null;
    this._mounted = false;
    this._lastOpen = null;
    this._transitionStatus = undefined;
  }

  private _handleMouseEnter = () => {
    this._root?.enterHoverRegion();
  };

  private _handleMouseLeave = (event: MouseEvent) => {
    this._root?.leaveHoverRegion(event, 0);
  };

  private _handleKeyDown = (event: KeyboardEvent) => {
    if (!this._root) return;

    // Focus trap for modal popovers
    if (event.key === 'Tab' && this._root.getModal()) {
      const focusable = getFocusableElements(this);
      if (focusable.length === 0) {
        event.preventDefault();
        this.focus({ preventScroll: true });
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active =
        this.ownerDocument.activeElement as HTMLElement | null;

      if (!event.shiftKey && active === last) {
        event.preventDefault();
        first?.focus({ preventScroll: true });
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last?.focus({ preventScroll: true });
      }
    }
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
    } else if (
      wasOpen === true &&
      this._mounted &&
      this._transitionStatus !== 'ending'
    ) {
      this._transitionStatus = 'ending';
      this._scheduleExitCleanup();
    }

    this._lastOpen = open;
    this._syncVisibility();
  }

  private _syncVisibility() {
    if (!this._root) return;

    const open = this._root.getOpen();
    const shouldRender =
      this._mounted || this._transitionStatus === 'ending';

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

    // ARIA
    this.setAttribute('role', 'dialog');
    this.setAttribute('tabindex', '-1');
    if (this._root.getModal()) {
      this.setAttribute('aria-modal', 'true');
    } else {
      this.removeAttribute('aria-modal');
    }

    const titleId = this._root.getTitleId();
    if (titleId) {
      this.setAttribute('aria-labelledby', titleId);
    } else {
      this.removeAttribute('aria-labelledby');
    }

    const descriptionId = this._root.getDescriptionId();
    if (descriptionId) {
      this.setAttribute('aria-describedby', descriptionId);
    } else {
      this.removeAttribute('aria-describedby');
    }

    // Data attributes
    this.toggleAttribute('data-open', open);
    this.toggleAttribute('data-closed', !open);
    this.toggleAttribute(
      'data-starting-style',
      this._transitionStatus === 'starting',
    );
    this.toggleAttribute(
      'data-ending-style',
      this._transitionStatus === 'ending',
    );

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
        const active = this.getAnimations();
        if (
          active.length > 0 &&
          active.some((a) => a.pending || a.playState !== 'finished')
        ) {
          this._waitForExitAnimations(runId);
          return;
        }
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

if (!customElements.get('popover-popup')) {
  customElements.define('popover-popup', PopoverPopupElement);
}

// ─── PopoverArrowElement ────────────────────────────────────────────────────────

export class PopoverArrowElement extends BaseHTMLElement {
  private _root: PopoverRootElement | null = null;
  private _handler = () => this._syncAttributes();

  connectedCallback() {
    this._root = this.closest('popover-root') as PopoverRootElement | null;
    if (!this._root) {
      console.error(
        'Base UI: Popover parts must be placed within <popover-root>.',
      );
      return;
    }

    this._root.setArrowElement(this);
    this.setAttribute('aria-hidden', 'true');

    this._root.addEventListener(POPOVER_STATE_CHANGE_EVENT, this._handler);
    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    if (this._root) {
      this._root.setArrowElement(null);
      this._root.removeEventListener(
        POPOVER_STATE_CHANGE_EVENT,
        this._handler,
      );
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

if (!customElements.get('popover-arrow')) {
  customElements.define('popover-arrow', PopoverArrowElement);
}

// ─── PopoverBackdropElement ─────────────────────────────────────────────────────

export class PopoverBackdropElement extends BaseHTMLElement {
  private _root: PopoverRootElement | null = null;
  private _handler = () => this._syncVisibility();

  connectedCallback() {
    this._root = this.closest('popover-root') as PopoverRootElement | null;
    if (!this._root) {
      console.error(
        'Base UI: Popover parts must be placed within <popover-root>.',
      );
      return;
    }

    this._root.setBackdropElement(this);
    this.setAttribute('role', 'presentation');

    this._root.addEventListener(POPOVER_STATE_CHANGE_EVENT, this._handler);
    this.addEventListener('click', this._handleClick);

    if (!this._root.getOpen()) {
      this.setAttribute('hidden', '');
    }

    queueMicrotask(() => this._syncVisibility());
  }

  disconnectedCallback() {
    if (this._root) {
      this._root.setBackdropElement(null);
      this._root.removeEventListener(
        POPOVER_STATE_CHANGE_EVENT,
        this._handler,
      );
    }
    this.removeEventListener('click', this._handleClick);
    this._root = null;
  }

  private _handleClick = (event: MouseEvent) => {
    if (!this._root) return;
    if (event.button !== 0) return;
    this._root.toggle(false, event, 'outside-press');
  };

  private _syncVisibility() {
    if (!this._root) return;
    const open = this._root.getOpen();

    if (open) {
      this.removeAttribute('hidden');
    } else {
      this.setAttribute('hidden', '');
    }

    this.toggleAttribute('data-open', open);
    this.toggleAttribute('data-closed', !open);
  }
}

if (!customElements.get('popover-backdrop')) {
  customElements.define('popover-backdrop', PopoverBackdropElement);
}

// ─── PopoverTitleElement ────────────────────────────────────────────────────────

export class PopoverTitleElement extends BaseHTMLElement {
  private _root: PopoverRootElement | null = null;

  connectedCallback() {
    this._root = this.closest('popover-root') as PopoverRootElement | null;
    if (!this._root) {
      console.error(
        'Base UI: Popover parts must be placed within <popover-root>.',
      );
      return;
    }

    ensureId(this, 'base-ui-popover-title');
    this._root.setTitleId(this.id);
  }

  disconnectedCallback() {
    this._root?.setTitleId(undefined);
    this._root = null;
  }
}

if (!customElements.get('popover-title')) {
  customElements.define('popover-title', PopoverTitleElement);
}

// ─── PopoverDescriptionElement ──────────────────────────────────────────────────

export class PopoverDescriptionElement extends BaseHTMLElement {
  private _root: PopoverRootElement | null = null;

  connectedCallback() {
    this._root = this.closest('popover-root') as PopoverRootElement | null;
    if (!this._root) {
      console.error(
        'Base UI: Popover parts must be placed within <popover-root>.',
      );
      return;
    }

    ensureId(this, 'base-ui-popover-description');
    this._root.setDescriptionId(this.id);
  }

  disconnectedCallback() {
    this._root?.setDescriptionId(undefined);
    this._root = null;
  }
}

if (!customElements.get('popover-description')) {
  customElements.define('popover-description', PopoverDescriptionElement);
}

// ─── PopoverCloseElement ────────────────────────────────────────────────────────

export class PopoverCloseElement extends BaseHTMLElement {
  /** Whether this close button is disabled. */
  disabled = false;

  private _root: PopoverRootElement | null = null;

  connectedCallback() {
    this._root = this.closest('popover-root') as PopoverRootElement | null;
    if (!this._root) {
      console.error(
        'Base UI: Popover parts must be placed within <popover-root>.',
      );
      return;
    }

    this.setAttribute('role', 'button');
    this.setAttribute('tabindex', '0');

    this.addEventListener('click', this._handleClick);
    this.addEventListener('keydown', this._handleKeyDown);
    this.addEventListener('keyup', this._handleKeyUp);

    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this.removeEventListener('click', this._handleClick);
    this.removeEventListener('keydown', this._handleKeyDown);
    this.removeEventListener('keyup', this._handleKeyUp);
    this._root = null;
  }

  private _handleClick = (event: Event) => {
    if (!this._root || this.disabled) return;
    this._root.toggle(false, event, 'close-press');
  };

  private _handleKeyDown = (event: KeyboardEvent) => {
    if (!this._root || this.disabled) return;
    if (event.target !== this) return;

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this._root.toggle(false, event, 'close-press');
    }
  };

  private _handleKeyUp = (event: KeyboardEvent) => {
    if (event.key === ' ') event.preventDefault();
  };

  private _syncAttributes() {
    this.toggleAttribute('data-disabled', this.disabled);
    if (this.disabled) {
      this.setAttribute('disabled', '');
    } else {
      this.removeAttribute('disabled');
    }
  }
}

if (!customElements.get('popover-close')) {
  customElements.define('popover-close', PopoverCloseElement);
}

// ─── Namespace exports ──────────────────────────────────────────────────────────

export namespace PopoverRoot {
  export type ChangeEventReason = PopoverChangeEventReason;
  export type ChangeEventDetails = PopoverChangeEventDetails;
}

export namespace PopoverTrigger {}
export namespace PopoverPopup {}
export namespace PopoverPositioner {}
export namespace PopoverArrow {}
export namespace PopoverBackdrop {}
export namespace PopoverTitle {}
export namespace PopoverDescription {}
export namespace PopoverClose {}
export namespace PopoverPortal {}

// ─── Global type declarations ───────────────────────────────────────────────────

declare global {
  interface HTMLElementTagNameMap {
    'popover-root': PopoverRootElement;
    'popover-trigger': PopoverTriggerElement;
    'popover-portal': PopoverPortalElement;
    'popover-positioner': PopoverPositionerElement;
    'popover-popup': PopoverPopupElement;
    'popover-arrow': PopoverArrowElement;
    'popover-backdrop': PopoverBackdropElement;
    'popover-title': PopoverTitleElement;
    'popover-description': PopoverDescriptionElement;
    'popover-close': PopoverCloseElement;
  }
}
