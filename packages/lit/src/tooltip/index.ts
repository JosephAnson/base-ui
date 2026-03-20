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

// ─── Types ──────────────────────────────────────────────────────────────────────

type Side = 'top' | 'right' | 'bottom' | 'left';
type Align = 'start' | 'center' | 'end';
type TransitionStatus = 'starting' | 'ending' | undefined;

export type TooltipChangeEventReason =
  | 'trigger-hover'
  | 'trigger-focus'
  | 'trigger-press'
  | 'escape-key'
  | 'none';

export interface TooltipChangeEventDetails {
  reason: TooltipChangeEventReason;
  event: Event;
  readonly isCanceled: boolean;
  cancel(): void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function createChangeEventDetails(
  reason: TooltipChangeEventReason,
  event: Event,
): TooltipChangeEventDetails {
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

export class TooltipRootElement extends ReactiveElement {
  static properties = {
    disabled: { type: Boolean },
  };

  declare disabled: boolean;

  /** Default open state (uncontrolled). */
  defaultOpen = false;

  /** Callback when open state changes. */
  onOpenChange:
    | ((open: boolean, details: TooltipChangeEventDetails) => void)
    | undefined;

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

    this._provider = this.closest(
      'tooltip-provider',
    ) as TooltipProviderElement | null;

    this.style.display = 'contents';
    this.setAttribute(TOOLTIP_ROOT_ATTRIBUTE, '');

    document.addEventListener('keydown', this._handleEscapeKey);

    this._syncAttributes();
    queueMicrotask(() => this._publishStateChange());
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('keydown', this._handleEscapeKey);
    this._clearTimers();
    this._lastPublishedStateKey = null;
    this._transitionStatus = undefined;
  }

  protected override updated() {
    this._syncAttributes();
    this._publishStateChange();
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  getOpen(): boolean {
    return this._openIsControlled
      ? Boolean(this._open)
      : this._internalOpen;
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
    this._publishStateChange();
  }

  getActiveTriggerElement() {
    return this._activeTriggerElement;
  }
  setActiveTriggerElement(el: HTMLElement | null) {
    this._activeTriggerElement = el;
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
  setPositionState(
    next: Partial<typeof this._positionState>,
  ) {
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
    if (this._provider?.closeDelay != null)
      return this._provider.closeDelay;
    return DEFAULT_CLOSE_DELAY;
  }

  // ── Hover open / close ─────────────────────────────────────────────────────

  scheduleHoverOpen(delay: number, event: MouseEvent) {
    this._cancelHoverOpen();
    this._hoverOpenTimer = window.setTimeout(() => {
      this._hoverOpenTimer = null;
      this._hoverActive = true;
      this._syncOpenState(event, 'trigger-hover');
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
    this._syncOpenState(event, 'trigger-focus');
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
      this._syncOpenState(event, 'trigger-press');
    }
  }

  // ── Internal ───────────────────────────────────────────────────────────────

  private _syncOpenState(event: Event, reason: TooltipChangeEventReason) {
    const shouldBeOpen =
      !this.disabled && (this._hoverActive || this._focusActive);

    if (shouldBeOpen === this.getOpen()) return;

    const details = createChangeEventDetails(
      reason,
      event,
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
  }

  private _handleEscapeKey = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    if (!this.getOpen()) return;

    this._hoverActive = false;
    this._focusActive = false;
    this._clearTimers();

    const details = createChangeEventDetails('escape-key', event);
    this.onOpenChange?.(false, details);
    if (details.isCanceled) return;

    this._openReason = 'escape-key';

    if (!this._openIsControlled) {
      this._internalOpen = false;
    }

    this._provider?.notifyClosed();
    this._syncAttributes();
    this._publishStateChange();
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
  }

  private _publishStateChange() {
    const ps = this._positionState;
    const nextKey = [
      this.getOpen() ? 'open' : 'closed',
      this._transitionStatus ?? 'idle',
      this._popupId ?? '',
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
  }
}

if (!customElements.get('tooltip-root')) {
  customElements.define('tooltip-root', TooltipRootElement);
}

// ─── TooltipTriggerElement ──────────────────────────────────────────────────────

export class TooltipTriggerElement extends BaseHTMLElement {
  /** Tooltip-level disabled — prevents tooltip but keeps button interactive. */
  disabled = false;

  /** Open delay override (null = use provider / default). */
  delay: number | null = null;

  /** Close delay override (null = use provider / default). */
  closeDelay: number | null = null;

  /** Whether clicking the trigger cancels the tooltip (default true). */
  closeOnClick = true;

  private _root: TooltipRootElement | null = null;
  private _handler = () => this._syncAttributes();

  connectedCallback() {
    this._root = this.closest(
      'tooltip-root',
    ) as TooltipRootElement | null;
    if (!this._root) {
      console.error(
        'Base UI: Tooltip parts must be placed within <tooltip-root>.',
      );
      return;
    }

    this._root.setActiveTriggerElement(this);

    this._root.addEventListener(
      TOOLTIP_STATE_CHANGE_EVENT,
      this._handler,
    );

    this.addEventListener('mouseenter', this._handleMouseEnter);
    this.addEventListener('mousemove', this._handleMouseMove);
    this.addEventListener('mouseleave', this._handleMouseLeave);
    this.addEventListener('focusin', this._handleFocus);
    this.addEventListener('focusout', this._handleBlur);
    this.addEventListener('click', this._handleClick);

    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(
      TOOLTIP_STATE_CHANGE_EVENT,
      this._handler,
    );
    this.removeEventListener('mouseenter', this._handleMouseEnter);
    this.removeEventListener('mousemove', this._handleMouseMove);
    this.removeEventListener('mouseleave', this._handleMouseLeave);
    this.removeEventListener('focusin', this._handleFocus);
    this.removeEventListener('focusout', this._handleBlur);
    this.removeEventListener('click', this._handleClick);
    this._root = null;
  }

  private _isDisabled(): boolean {
    return this.disabled || Boolean(this._root?.disabled);
  }

  private _handleMouseEnter = (event: MouseEvent) => {
    if (!this._root || this._isDisabled()) return;
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
    const effectiveCloseDelay = this._root.getEffectiveCloseDelay(
      this.closeDelay,
    );
    this._root.scheduleHoverClose(effectiveCloseDelay, event);
  };

  private _handleFocus = (event: FocusEvent) => {
    if (!this._root || this._isDisabled()) return;
    this._root.openFromFocus(event);
  };

  private _handleBlur = (event: FocusEvent) => {
    if (!this._root) return;
    this._root.closeFromFocus(event);
  };

  private _handleClick = (event: Event) => {
    if (!this._root) return;
    if (this.closeOnClick) {
      this._root.cancelFromClick(event);
    }
  };

  private _syncAttributes() {
    if (!this._root) return;

    const open = this._root.getOpen();
    const popupId = this._root.getPopupId();
    const isDisabled = this._isDisabled();

    // Tooltip trigger uses aria-describedby (not aria-expanded or aria-controls)
    if (open && popupId) {
      this.setAttribute('aria-describedby', popupId);
    } else {
      this.removeAttribute('aria-describedby');
    }

    this.toggleAttribute('data-popup-open', open);
    this.toggleAttribute('data-trigger-disabled', isDisabled);
  }
}

if (!customElements.get('tooltip-trigger')) {
  customElements.define('tooltip-trigger', TooltipTriggerElement);
}

// ─── TooltipPortalElement ───────────────────────────────────────────────────────

export class TooltipPortalElement extends BaseHTMLElement {
  connectedCallback() {
    this.style.display = 'contents';
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
    this._root = this.closest(
      'tooltip-root',
    ) as TooltipRootElement | null;
    if (!this._root) {
      console.error(
        'Base UI: Tooltip parts must be placed within <tooltip-root>.',
      );
      return;
    }

    this.setAttribute('role', 'presentation');
    Object.assign(this.style, {
      position: this.positionMethod,
      left: '0px',
      top: '0px',
    });

    this._root.addEventListener(
      TOOLTIP_STATE_CHANGE_EVENT,
      this._handler,
    );
    queueMicrotask(() => this._handleStateChange());
  }

  disconnectedCallback() {
    this._stopAutoUpdate();
    this._root?.removeEventListener(
      TOOLTIP_STATE_CHANGE_EVENT,
      this._handler,
    );
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
    this._root = this.closest(
      'tooltip-root',
    ) as TooltipRootElement | null;
    if (!this._root) {
      console.error(
        'Base UI: Tooltip parts must be placed within <tooltip-root>.',
      );
      return;
    }

    ensureId(this, 'base-ui-tooltip-popup');
    this._root.setPopupId(this.id);

    this._root.addEventListener(
      TOOLTIP_STATE_CHANGE_EVENT,
      this._handler,
    );

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
      this._root.removeEventListener(
        TOOLTIP_STATE_CHANGE_EVENT,
        this._handler,
      );
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

    // Tooltip uses role=tooltip (not role=dialog)
    this.setAttribute('role', 'tooltip');

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
    this._root = this.closest(
      'tooltip-root',
    ) as TooltipRootElement | null;
    if (!this._root) {
      console.error(
        'Base UI: Tooltip parts must be placed within <tooltip-root>.',
      );
      return;
    }

    this._root.setArrowElement(this);
    this.setAttribute('aria-hidden', 'true');

    this._root.addEventListener(
      TOOLTIP_STATE_CHANGE_EVENT,
      this._handler,
    );
    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    if (this._root) {
      this._root.setArrowElement(null);
      this._root.removeEventListener(
        TOOLTIP_STATE_CHANGE_EVENT,
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

if (!customElements.get('tooltip-arrow')) {
  customElements.define('tooltip-arrow', TooltipArrowElement);
}

// ─── Namespace exports ──────────────────────────────────────────────────────────

export namespace TooltipRoot {
  export type ChangeEventReason = TooltipChangeEventReason;
  export type ChangeEventDetails = TooltipChangeEventDetails;
}

export namespace TooltipProvider {}
export namespace TooltipTrigger {}
export namespace TooltipPopup {}
export namespace TooltipPositioner {}
export namespace TooltipArrow {}
export namespace TooltipPortal {}

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
  }
}
