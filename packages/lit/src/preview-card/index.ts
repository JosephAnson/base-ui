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

const PREVIEW_CARD_ROOT_ATTRIBUTE = 'data-base-ui-preview-card-root';
const PREVIEW_CARD_STATE_CHANGE_EVENT = 'base-ui-preview-card-state-change';
const DEFAULT_OPEN_DELAY = 600;
const DEFAULT_CLOSE_DELAY = 300;

// ─── Types ──────────────────────────────────────────────────────────────────────

type Side = 'top' | 'right' | 'bottom' | 'left';
type Align = 'start' | 'center' | 'end';
type TransitionStatus = 'starting' | 'ending' | undefined;

export type PreviewCardChangeEventReason =
  | 'trigger-hover'
  | 'trigger-focus'
  | 'trigger-press'
  | 'escape-key'
  | 'none';

export interface PreviewCardChangeEventDetails {
  reason: PreviewCardChangeEventReason;
  event: Event;
  readonly isCanceled: boolean;
  cancel(): void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function createChangeEventDetails(
  reason: PreviewCardChangeEventReason,
  event: Event,
): PreviewCardChangeEventDetails {
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

// ─── PreviewCardRootElement ─────────────────────────────────────────────────────

/**
 * Manages state for a hover/focus-triggered preview card.
 * Unlike popover/dialog, the popup is passive (no role, no focus trap).
 */
export class PreviewCardRootElement extends ReactiveElement {
  /** Default open state (uncontrolled). */
  defaultOpen = false;

  /** Callback when open state changes. */
  onOpenChange:
    | ((open: boolean, details: PreviewCardChangeEventDetails) => void)
    | undefined;

  // ── Controlled / uncontrolled ──────────────────────────────────────────────
  private _open: boolean | undefined;
  private _openIsControlled = false;
  private _internalOpen = false;
  private _initialized = false;
  private _transitionStatus: TransitionStatus = undefined;
  private _lastPublishedStateKey: string | null = null;

  // ── Hover region ──────────────────────────────────────────────────────────
  private _hoverRegionActive = false;
  private _hoverOpenTimer: number | null = null;
  private _hoverCloseTimer: number | null = null;

  // ── Focus timers ──────────────────────────────────────────────────────────
  private _focusOpenTimer: number | null = null;
  private _focusCloseTimer: number | null = null;

  // ── Part references ────────────────────────────────────────────────────────
  private _popupId: string | undefined;
  private _arrowElement: HTMLElement | null = null;
  private _activeTriggerElement: HTMLElement | null = null;

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
    this.setAttribute(PREVIEW_CARD_ROOT_ATTRIBUTE, '');

    this._syncAttributes();
    queueMicrotask(() => this._publishStateChange());
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this._clearTimers();
    this._lastPublishedStateKey = null;
    this._transitionStatus = undefined;
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

  // ── Hover open / close ─────────────────────────────────────────────────────

  scheduleHoverOpen(delay: number, event: MouseEvent) {
    this._cancelHoverOpen();
    this._hoverOpenTimer = window.setTimeout(() => {
      this._hoverOpenTimer = null;
      this._applyOpen(event, 'trigger-hover');
    }, delay);
  }

  cancelHoverOpen() {
    this._cancelHoverOpen();
  }

  /** Called when mouse enters the hover region (trigger or positioner). */
  enterHoverRegion() {
    this._hoverRegionActive = true;
    this._cancelHoverClose();
  }

  /** Called when mouse leaves the hover region (trigger or positioner). */
  leaveHoverRegion(event: MouseEvent, closeDelay: number) {
    this._hoverRegionActive = false;
    this._cancelHoverClose();
    this._hoverCloseTimer = window.setTimeout(() => {
      this._hoverCloseTimer = null;
      if (!this._hoverRegionActive) {
        this._applyClose(event, 'none');
      }
    }, closeDelay);
  }

  // ── Focus open / close ─────────────────────────────────────────────────────

  scheduleFocusOpen(delay: number, event: FocusEvent) {
    this._cancelFocusOpen();
    if (delay <= 0) {
      this._applyOpen(event, 'trigger-focus');
      return;
    }
    this._focusOpenTimer = window.setTimeout(() => {
      this._focusOpenTimer = null;
      this._applyOpen(event, 'trigger-focus');
    }, delay);
  }

  scheduleFocusClose(event: FocusEvent) {
    this._cancelFocusClose();
    this._cancelFocusOpen();
    // Deferred close — gives popup content time to receive focus
    this._focusCloseTimer = window.setTimeout(() => {
      this._focusCloseTimer = null;
      this._applyClose(event, 'trigger-focus');
    }, 0);
  }

  cancelFocusClose() {
    this._cancelFocusClose();
  }

  cancelFocusOpen() {
    this._cancelFocusOpen();
  }

  // ── Internal ───────────────────────────────────────────────────────────────

  private _applyOpen(event: Event, reason: PreviewCardChangeEventReason) {
    if (this.getOpen()) return;

    const details = createChangeEventDetails(reason, event);
    this.onOpenChange?.(true, details);
    if (details.isCanceled) return;

    if (!this._openIsControlled) {
      this._internalOpen = true;
    }

    this._syncAttributes();
    this._publishStateChange();
  }

  private _applyClose(event: Event, reason: PreviewCardChangeEventReason) {
    if (!this.getOpen()) return;

    const details = createChangeEventDetails(reason, event);
    this.onOpenChange?.(false, details);
    if (details.isCanceled) return;

    if (!this._openIsControlled) {
      this._internalOpen = false;
    }

    this._syncAttributes();
    this._publishStateChange();
  }

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

  private _cancelFocusOpen() {
    if (this._focusOpenTimer != null) {
      window.clearTimeout(this._focusOpenTimer);
      this._focusOpenTimer = null;
    }
  }

  private _cancelFocusClose() {
    if (this._focusCloseTimer != null) {
      window.clearTimeout(this._focusCloseTimer);
      this._focusCloseTimer = null;
    }
  }

  private _clearTimers() {
    this._cancelHoverOpen();
    this._cancelHoverClose();
    this._cancelFocusOpen();
    this._cancelFocusClose();
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
    ].join('|');

    if (nextKey === this._lastPublishedStateKey) return;
    this._lastPublishedStateKey = nextKey;
    this.dispatchEvent(new CustomEvent(PREVIEW_CARD_STATE_CHANGE_EVENT));
  }
}

if (!customElements.get('preview-card-root')) {
  customElements.define('preview-card-root', PreviewCardRootElement);
}

// ─── PreviewCardTriggerElement ──────────────────────────────────────────────────

export class PreviewCardTriggerElement extends BaseHTMLElement {
  /** Open delay in ms (null = use default 600ms). */
  delay: number | null = null;

  /** Close delay in ms (null = use default 300ms). */
  closeDelay: number | null = null;

  private _root: PreviewCardRootElement | null = null;
  private _handler = () => this._syncAttributes();

  connectedCallback() {
    this._root = this.closest(
      'preview-card-root',
    ) as PreviewCardRootElement | null;
    if (!this._root) {
      console.error(
        'Base UI: PreviewCard parts must be placed within <preview-card-root>.',
      );
      return;
    }

    this._root.setActiveTriggerElement(this);

    this._root.addEventListener(
      PREVIEW_CARD_STATE_CHANGE_EVENT,
      this._handler,
    );

    this.addEventListener('mouseenter', this._handleMouseEnter);
    this.addEventListener('mouseleave', this._handleMouseLeave);
    this.addEventListener('focusin', this._handleFocus);
    this.addEventListener('focusout', this._handleBlur);

    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(
      PREVIEW_CARD_STATE_CHANGE_EVENT,
      this._handler,
    );
    this.removeEventListener('mouseenter', this._handleMouseEnter);
    this.removeEventListener('mouseleave', this._handleMouseLeave);
    this.removeEventListener('focusin', this._handleFocus);
    this.removeEventListener('focusout', this._handleBlur);
    this._root = null;
  }

  private _getDelay() {
    return this.delay ?? DEFAULT_OPEN_DELAY;
  }

  private _getCloseDelay() {
    return this.closeDelay ?? DEFAULT_CLOSE_DELAY;
  }

  private _handleMouseEnter = (event: MouseEvent) => {
    if (!this._root) return;
    this._root.enterHoverRegion();
    this._root.cancelFocusClose();
    this._root.cancelFocusOpen();

    if (!this._root.getOpen()) {
      this._root.scheduleHoverOpen(this._getDelay(), event);
    }
  };

  private _handleMouseLeave = (event: MouseEvent) => {
    if (!this._root) return;
    this._root.leaveHoverRegion(event, this._getCloseDelay());
  };

  private _handleFocus = (event: FocusEvent) => {
    if (!this._root) return;
    this._root.cancelFocusClose();

    if (!this._root.getOpen()) {
      this._root.scheduleFocusOpen(this._getDelay(), event);
    }
  };

  private _handleBlur = (event: FocusEvent) => {
    if (!this._root) return;
    this._root.scheduleFocusClose(event);
  };

  private _syncAttributes() {
    if (!this._root) return;

    const open = this._root.getOpen();

    // PreviewCard trigger uses data-popup-open (no aria-expanded, no aria-controls)
    this.toggleAttribute('data-popup-open', open);
  }
}

if (!customElements.get('preview-card-trigger')) {
  customElements.define('preview-card-trigger', PreviewCardTriggerElement);
}

// ─── PreviewCardPortalElement ───────────────────────────────────────────────────

export class PreviewCardPortalElement extends BaseHTMLElement {
  connectedCallback() {
    this.style.display = 'contents';
  }
}

if (!customElements.get('preview-card-portal')) {
  customElements.define('preview-card-portal', PreviewCardPortalElement);
}

// ─── PreviewCardPositionerElement ───────────────────────────────────────────────

export class PreviewCardPositionerElement extends BaseHTMLElement {
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

  private _root: PreviewCardRootElement | null = null;
  private _handler = () => this._handleStateChange();
  private _cleanupAutoUpdate: (() => void) | null = null;

  connectedCallback() {
    this._root = this.closest(
      'preview-card-root',
    ) as PreviewCardRootElement | null;
    if (!this._root) {
      console.error(
        'Base UI: PreviewCard parts must be placed within <preview-card-root>.',
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
      PREVIEW_CARD_STATE_CHANGE_EVENT,
      this._handler,
    );

    // Entering the positioner is part of the hover region
    this.addEventListener('mouseenter', this._handleMouseEnter);
    this.addEventListener('mouseleave', this._handleMouseLeave);

    queueMicrotask(() => this._handleStateChange());
  }

  disconnectedCallback() {
    this._stopAutoUpdate();
    this._root?.removeEventListener(
      PREVIEW_CARD_STATE_CHANGE_EVENT,
      this._handler,
    );
    this.removeEventListener('mouseenter', this._handleMouseEnter);
    this.removeEventListener('mouseleave', this._handleMouseLeave);
    this._root = null;
  }

  private _handleMouseEnter = () => {
    if (!this._root) return;
    this._root.enterHoverRegion();
    this._root.cancelFocusClose();
  };

  private _handleMouseLeave = (event: MouseEvent) => {
    if (!this._root) return;
    // Use a default close delay — the trigger's closeDelay is the canonical one
    // but the positioner doesn't know the trigger's closeDelay. Use 300ms default.
    this._root.leaveHoverRegion(event, DEFAULT_CLOSE_DELAY);
  };

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

if (!customElements.get('preview-card-positioner')) {
  customElements.define(
    'preview-card-positioner',
    PreviewCardPositionerElement,
  );
}

// ─── PreviewCardPopupElement ────────────────────────────────────────────────────

/**
 * Content container. Unlike Popover/Dialog popup, no role attribute is set
 * — the preview card is semantically passive.
 */
export class PreviewCardPopupElement extends BaseHTMLElement {
  private _root: PreviewCardRootElement | null = null;
  private _handler = () => this._handleStateChange();
  private _mounted = false;
  private _transitionStatus: TransitionStatus = undefined;
  private _lastOpen: boolean | null = null;
  private _frameId: number | null = null;
  private _exitRunId = 0;

  connectedCallback() {
    this._root = this.closest(
      'preview-card-root',
    ) as PreviewCardRootElement | null;
    if (!this._root) {
      console.error(
        'Base UI: PreviewCard parts must be placed within <preview-card-root>.',
      );
      return;
    }

    ensureId(this, 'base-ui-preview-card-popup');
    this._root.setPopupId(this.id);

    this._root.addEventListener(
      PREVIEW_CARD_STATE_CHANGE_EVENT,
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
        PREVIEW_CARD_STATE_CHANGE_EVENT,
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

    // PreviewCard popup is passive — NO role attribute
    // No aria-labelledby, no aria-describedby

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

if (!customElements.get('preview-card-popup')) {
  customElements.define('preview-card-popup', PreviewCardPopupElement);
}

// ─── PreviewCardArrowElement ────────────────────────────────────────────────────

export class PreviewCardArrowElement extends BaseHTMLElement {
  private _root: PreviewCardRootElement | null = null;
  private _handler = () => this._syncAttributes();

  connectedCallback() {
    this._root = this.closest(
      'preview-card-root',
    ) as PreviewCardRootElement | null;
    if (!this._root) {
      console.error(
        'Base UI: PreviewCard parts must be placed within <preview-card-root>.',
      );
      return;
    }

    this._root.setArrowElement(this);
    this.setAttribute('aria-hidden', 'true');

    this._root.addEventListener(
      PREVIEW_CARD_STATE_CHANGE_EVENT,
      this._handler,
    );
    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    if (this._root) {
      this._root.setArrowElement(null);
      this._root.removeEventListener(
        PREVIEW_CARD_STATE_CHANGE_EVENT,
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
    this.toggleAttribute('data-closed', !open);
    this.setAttribute('data-side', ps.side);
    this.setAttribute('data-align', ps.align);
    this.toggleAttribute('data-uncentered', ps.arrowUncentered);
  }
}

if (!customElements.get('preview-card-arrow')) {
  customElements.define('preview-card-arrow', PreviewCardArrowElement);
}

// ─── PreviewCardBackdropElement ─────────────────────────────────────────────────

/**
 * Inert backdrop — pointer-events and user-select are disabled.
 */
export class PreviewCardBackdropElement extends BaseHTMLElement {
  private _root: PreviewCardRootElement | null = null;
  private _handler = () => this._syncAttributes();

  connectedCallback() {
    this._root = this.closest(
      'preview-card-root',
    ) as PreviewCardRootElement | null;
    if (!this._root) {
      console.error(
        'Base UI: PreviewCard parts must be placed within <preview-card-root>.',
      );
      return;
    }

    this.setAttribute('role', 'presentation');
    Object.assign(this.style, {
      pointerEvents: 'none',
      userSelect: 'none',
    });

    this._root.addEventListener(
      PREVIEW_CARD_STATE_CHANGE_EVENT,
      this._handler,
    );
    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(
      PREVIEW_CARD_STATE_CHANGE_EVENT,
      this._handler,
    );
    this._root = null;
  }

  private _syncAttributes() {
    if (!this._root) return;
    const open = this._root.getOpen();

    this.toggleAttribute('data-open', open);
    this.toggleAttribute('data-closed', !open);

    if (open) {
      this.removeAttribute('hidden');
    } else {
      this.setAttribute('hidden', '');
    }
  }
}

if (!customElements.get('preview-card-backdrop')) {
  customElements.define(
    'preview-card-backdrop',
    PreviewCardBackdropElement,
  );
}

// ─── Namespace exports ──────────────────────────────────────────────────────────

export namespace PreviewCardRoot {
  export type ChangeEventReason = PreviewCardChangeEventReason;
  export type ChangeEventDetails = PreviewCardChangeEventDetails;
}

export namespace PreviewCardTrigger {}
export namespace PreviewCardPopup {}
export namespace PreviewCardPositioner {}
export namespace PreviewCardArrow {}
export namespace PreviewCardBackdrop {}
export namespace PreviewCardPortal {}

// ─── Global type declarations ───────────────────────────────────────────────────

declare global {
  interface HTMLElementTagNameMap {
    'preview-card-root': PreviewCardRootElement;
    'preview-card-trigger': PreviewCardTriggerElement;
    'preview-card-portal': PreviewCardPortalElement;
    'preview-card-positioner': PreviewCardPositionerElement;
    'preview-card-popup': PreviewCardPopupElement;
    'preview-card-arrow': PreviewCardArrowElement;
    'preview-card-backdrop': PreviewCardBackdropElement;
  }
}
