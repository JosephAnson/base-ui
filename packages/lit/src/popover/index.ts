/* eslint-disable no-underscore-dangle, @typescript-eslint/no-use-before-define */
import { html, ReactiveElement, render as renderTemplate, type TemplateResult } from 'lit';
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
import type { ComponentRenderFn, HTMLProps } from '../types';
import { BaseHTMLElement, ensureId } from '../utils';

// ─── Constants ──────────────────────────────────────────────────────────────────

const POPOVER_ROOT_ATTRIBUTE = 'data-base-ui-popover-root';
const POPOVER_STATE_CHANGE_EVENT = 'base-ui-popover-state-change';
const DEFAULT_HOVER_OPEN_DELAY = 300;
const POPOVER_ROOT_CONTEXT = Symbol('base-ui-popover-root-context');

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

type PopoverChildren = unknown;
type PopoverTriggerRenderProps = HTMLProps<HTMLElement>;
type PopoverTriggerRenderProp =
  | TemplateResult
  | ComponentRenderFn<PopoverTriggerRenderProps, PopoverTriggerState>;
type PopoverPartRenderProps = HTMLProps<HTMLElement>;
type PopoverPortalRenderProp =
  | TemplateResult
  | ComponentRenderFn<PopoverPartRenderProps, PopoverPortalState>;
type PopoverPositionerRenderProp =
  | TemplateResult
  | ComponentRenderFn<PopoverPartRenderProps, PopoverPositionerState>;
type PopoverPopupRenderProp =
  | TemplateResult
  | ComponentRenderFn<PopoverPartRenderProps, PopoverPopupState>;
type PopoverArrowRenderProp =
  | TemplateResult
  | ComponentRenderFn<PopoverPartRenderProps, PopoverArrowState>;
type PopoverBackdropRenderProp =
  | TemplateResult
  | ComponentRenderFn<PopoverPartRenderProps, PopoverBackdropState>;
type PopoverTitleRenderProp =
  | TemplateResult
  | ComponentRenderFn<PopoverPartRenderProps, Record<string, never>>;
type PopoverDescriptionRenderProp =
  | TemplateResult
  | ComponentRenderFn<PopoverPartRenderProps, Record<string, never>>;
type PopoverCloseRenderProp =
  | TemplateResult
  | ComponentRenderFn<PopoverPartRenderProps, PopoverCloseState>;
type PopoverViewportRenderProp =
  | TemplateResult
  | ComponentRenderFn<PopoverPartRenderProps, PopoverViewportState>;
type PopoverPayloadRenderFunction<Payload> = (arg: {
  payload: Payload | undefined;
}) => TemplateResult | null | undefined;

export interface PopoverRootProps<Payload = unknown> {
  defaultOpen?: boolean | undefined;
  open?: boolean | undefined;
  onOpenChange?:
    | ((open: boolean, details: PopoverChangeEventDetails) => void)
    | undefined;
  onOpenChangeComplete?: ((open: boolean) => void) | undefined;
  modal?: boolean | undefined;
  disablePointerDismissal?: boolean | undefined;
  handle?: PopoverHandle<Payload> | undefined;
  triggerId?: string | null | undefined;
  defaultTriggerId?: string | null | undefined;
  actionsRef?: { current: PopoverRootActions | null } | undefined;
  children?: PopoverChildren | PopoverPayloadRenderFunction<Payload> | undefined;
}

export interface PopoverTriggerProps<Payload = unknown> {
  disabled?: boolean | undefined;
  nativeButton?: boolean | undefined;
  openOnHover?: boolean | undefined;
  delay?: number | undefined;
  closeDelay?: number | undefined;
  handle?: PopoverHandle<Payload> | undefined;
  payload?: Payload | undefined;
  id?: string | undefined;
  render?: PopoverTriggerRenderProp | undefined;
  children?: PopoverChildren | undefined;
}

export interface PopoverPortalProps {
  container?: HTMLElement | ShadowRoot | null | undefined;
  render?: PopoverPortalRenderProp | undefined;
  render?: PopoverPopupRenderProp | undefined;
  children?: PopoverChildren | undefined;
}

export interface PopoverPositionerProps {
  side?: Side | undefined;
  sideOffset?: number | undefined;
  align?: Align | undefined;
  alignOffset?: number | undefined;
  collisionAvoidance?: CollisionAvoidance | undefined;
  collisionBoundary?: CollisionBoundary | undefined;
  collisionPadding?: number | undefined;
  arrowPadding?: number | undefined;
  sticky?: boolean | undefined;
  disableAnchorTracking?: boolean | undefined;
  positionMethod?: 'absolute' | 'fixed' | undefined;
  anchor?: Element | undefined;
  render?: PopoverPositionerRenderProp | undefined;
  children?: PopoverChildren | undefined;
}

export interface PopoverPopupProps {
  /**
   * Determines the element to focus when the popover is opened.
   * - `false`: Do not move focus.
   * - An `HTMLElement`: Focus that element.
   * - `undefined` (default): Focus first tabbable element (or popup for touch).
   */
  initialFocus?: HTMLElement | false | undefined;
  /**
   * Determines the element to focus when the popover is closed.
   * - `false`: Do not move focus.
   * - An `HTMLElement`: Focus that element.
   * - `undefined` (default): Focus the trigger.
   */
  finalFocus?: HTMLElement | false | undefined;
  children?: PopoverChildren | undefined;
}

export interface PopoverArrowProps {
  render?: PopoverArrowRenderProp | undefined;
  children?: PopoverChildren | undefined;
}

export interface PopoverBackdropProps {
  render?: PopoverBackdropRenderProp | undefined;
  children?: PopoverChildren | undefined;
}

export interface PopoverTitleProps {
  render?: PopoverTitleRenderProp | undefined;
  children?: PopoverChildren | undefined;
}

export interface PopoverDescriptionProps {
  render?: PopoverDescriptionRenderProp | undefined;
  children?: PopoverChildren | undefined;
}

export interface PopoverCloseProps {
  disabled?: boolean | undefined;
  nativeButton?: boolean | undefined;
  render?: PopoverCloseRenderProp | undefined;
  children?: PopoverChildren | undefined;
}

export interface PopoverViewportProps {
  render?: PopoverViewportRenderProp | undefined;
  children?: PopoverChildren | undefined;
}

export interface PopoverRootActions {
  close: () => void;
  unmount: () => void;
}

export class PopoverHandle<Payload = unknown> {
  root: PopoverRootElement | null = null;
  triggers = new Map<string, PopoverTriggerElement<Payload>>();
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
    const trigger = triggerId ? this.triggers.get(triggerId) : undefined;

    if (triggerId != null && trigger == null) {
      throw new Error(
        `Base UI: PopoverHandle.open: No trigger found with id "${triggerId}".`,
      );
    }

    if (trigger != null) {
      this.activeTriggerId = trigger.id || null;
      this.activePayload = trigger.payload;
      this.root?.setActiveTriggerElement(trigger);
    }

    this.root?.toggle(
      true,
      new Event('base-ui-popover-imperative-action'),
      'imperative-action',
      trigger ?? undefined,
    );
  }

  close() {
    this.root?.toggle(
      false,
      new Event('base-ui-popover-imperative-action'),
      'imperative-action',
      undefined,
    );
  }

  get isOpen() {
    return this.root?.getOpen() ?? false;
  }
}

export function createPopoverHandle<Payload = unknown>(): PopoverHandle<Payload> {
  return new PopoverHandle<Payload>();
}

export type PopoverChangeEventReason =
  | 'trigger-hover'
  | 'trigger-focus'
  | 'trigger-press'
  | 'outside-press'
  | 'escape-key'
  | 'close-press'
  | 'focus-out'
  | 'imperative-action'
  | 'none';

export interface PopoverChangeEventDetails {
  reason: PopoverChangeEventReason;
  event: Event;
  readonly isPropagationAllowed: boolean;
  readonly isCanceled: boolean;
  readonly trigger: Element | undefined;
  cancel(): void;
  allowPropagation(): void;
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

export interface PopoverTriggerState {
  disabled: boolean;
  open: boolean;
}

export interface PopoverPortalState {
  open: boolean;
}

export interface PopoverBackdropState {
  open: boolean;
}

export interface PopoverPositionerState extends PopoverPortalState {
  side: Side;
  align: Align;
  anchorHidden: boolean;
}

export interface PopoverPopupState extends PopoverPositionerState {
  transitionStatus: TransitionStatus;
  modal: boolean;
}

export interface PopoverArrowState extends PopoverPositionerState {
  uncentered: boolean;
}

export interface PopoverCloseState {
  disabled: boolean;
}

export interface PopoverViewportState {
  activationDirection: string | undefined;
  transitioning: boolean;
  instant: 'dismiss' | 'click' | undefined;
}

// ─── Open popover stack (for nested Escape dismissal) ────────────────────────

const openPopoverStack: PopoverRootElement[] = [];

function pushOpenPopover(root: PopoverRootElement) {
  const idx = openPopoverStack.indexOf(root);
  if (idx !== -1) {openPopoverStack.splice(idx, 1);}
  openPopoverStack.push(root);
}

function removeOpenPopover(root: PopoverRootElement) {
  const idx = openPopoverStack.indexOf(root);
  if (idx !== -1) {openPopoverStack.splice(idx, 1);}
}

function getTopmostOpenPopover(): PopoverRootElement | null {
  return openPopoverStack.at(-1) ?? null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function createChangeEventDetails(
  reason: PopoverChangeEventReason,
  event: Event,
  trigger: Element | undefined,
): PopoverChangeEventDetails {
  let canceled = false;
  let propagationAllowed = false;
  return {
    reason,
    event,
    trigger,
    get isPropagationAllowed() {
      return propagationAllowed;
    },
    get isCanceled() {
      return canceled;
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
  let alignValue = '50%';
  if (align === 'start') {
    alignValue = '0%';
  } else if (align === 'end') {
    alignValue = '100%';
  }

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

function isEventInside(
  target: EventTarget | null,
  element: Element | null,
) {
  return target instanceof Node && element?.contains(target) === true;
}

function normalizeBoundary(
  boundary: CollisionBoundary,
): Boundary | undefined {
  if (boundary == null) {return undefined;}
  if (boundary === 'clipping-ancestors') {return 'clippingAncestors';}
  if (Array.isArray(boundary)) {return [...boundary] as Boundary;}
  return boundary as Boundary;
}

function isVisible(element: HTMLElement) {
  if (element.hidden) {return false;}
  const style = getComputedStyle(element);
  return style.display !== 'none' && style.visibility !== 'hidden';
}

function deriveInteractionType(event: Event): 'mouse' | 'touch' | 'keyboard' | null {
  if (event instanceof KeyboardEvent) {return 'keyboard';}
  if (typeof PointerEvent !== 'undefined' && event instanceof PointerEvent) {
    if (event.pointerType === 'touch') {return 'touch';}
    if (event.pointerType === 'mouse' || event.pointerType === 'pen') {return 'mouse';}
  }
  if (typeof TouchEvent !== 'undefined' && event instanceof TouchEvent) {return 'touch';}
  if (event instanceof MouseEvent) {return 'mouse';}
  return null;
}

// ─── Safe Polygon ──────────────────────────────────────────────────────────────

const CURSOR_SPEED_THRESHOLD = 0.1;
const CURSOR_SPEED_THRESHOLD_SQUARED = CURSOR_SPEED_THRESHOLD * CURSOR_SPEED_THRESHOLD;
const POLYGON_BUFFER = 0.5;

function hasIntersectingEdge(
  pointX: number, pointY: number,
  xi: number, yi: number,
  xj: number, yj: number,
) {
  return yi >= pointY !== yj >= pointY && pointX <= ((xj - xi) * (pointY - yi)) / (yj - yi) + xi;
}

function isPointInQuadrilateral(
  px: number, py: number,
  x1: number, y1: number,
  x2: number, y2: number,
  x3: number, y3: number,
  x4: number, y4: number,
) {
  let inside = false;
  if (hasIntersectingEdge(px, py, x1, y1, x2, y2)) {inside = !inside;}
  if (hasIntersectingEdge(px, py, x2, y2, x3, y3)) {inside = !inside;}
  if (hasIntersectingEdge(px, py, x3, y3, x4, y4)) {inside = !inside;}
  if (hasIntersectingEdge(px, py, x4, y4, x1, y1)) {inside = !inside;}
  return inside;
}

function isInsideAxisAlignedRect(
  px: number, py: number,
  x1: number, y1: number,
  x2: number, y2: number,
) {
  return px >= Math.min(x1, x2) && px <= Math.max(x1, x2) &&
    py >= Math.min(y1, y2) && py <= Math.max(y1, y2);
}

function isInsideRect(px: number, py: number, rect: { x: number; y: number; width: number; height: number }) {
  return px >= rect.x && px <= rect.x + rect.width && py >= rect.y && py <= rect.y + rect.height;
}

class SafePolygonHandler {
  private _handler: ((event: MouseEvent) => void) | null = null;
  private _closeTimer: number | null = null;

  start(params: {
    cursorX: number;
    cursorY: number;
    triggerElement: HTMLElement;
    positionerElement: HTMLElement | null;
    side: Side;
    onClose: () => void;
    onEnterFloating: () => void;
  }) {
    this.stop();

    const { cursorX: startX, cursorY: startY, triggerElement, positionerElement, side, onClose, onEnterFloating } = params;
    if (!positionerElement) {
      return;
    }

    let hasLanded = false;
    let lastX: number | null = null;
    let lastY: number | null = null;
    let lastCursorTime = typeof performance !== 'undefined' ? performance.now() : 0;

    const isCursorMovingSlowly = (nextX: number, nextY: number) => {
      const currentTime = performance.now();
      const elapsed = currentTime - lastCursorTime;
      if (lastX === null || lastY === null || elapsed === 0) {
        lastX = nextX;
        lastY = nextY;
        lastCursorTime = currentTime;
        return false;
      }
      const dx = nextX - lastX;
      const dy = nextY - lastY;
      const distSq = dx * dx + dy * dy;
      const threshSq = elapsed * elapsed * CURSOR_SPEED_THRESHOLD_SQUARED;
      lastX = nextX;
      lastY = nextY;
      lastCursorTime = currentTime;
      return distSq < threshSq;
    };

    const close = () => {
      if (this._closeTimer != null) {
        clearTimeout(this._closeTimer);
        this._closeTimer = null;
      }
      this.stop();
      onClose();
    };

    this._handler = (event: MouseEvent) => {
      if (this._closeTimer != null) {
        clearTimeout(this._closeTimer);
        this._closeTimer = null;
      }

      if (!positionerElement) {return;}

      const { clientX, clientY } = event;
      const target = event.target as Element | null;
      const isLeave = event.type === 'mouseleave';
      const isOverFloating = positionerElement.contains(target);
      const isOverReference = triggerElement.contains(target);

      if (isOverFloating) {
        hasLanded = true;
        if (!isLeave) {
          this.stop();
          onEnterFloating();
          return;
        }
      }

      if (isOverReference) {
        hasLanded = false;
        if (!isLeave) {
          hasLanded = true;
          return;
        }
      }

      if (isLeave && event.relatedTarget instanceof Element && positionerElement.contains(event.relatedTarget)) {
        return;
      }

      const refRect = triggerElement.getBoundingClientRect();
      const rect = positionerElement.getBoundingClientRect();
      const cursorLeaveFromRight = startX > rect.right - rect.width / 2;
      const cursorLeaveFromBottom = startY > rect.bottom - rect.height / 2;
      const isFloatingWider = rect.width > refRect.width;
      const isFloatingTaller = rect.height > refRect.height;
      const left = (isFloatingWider ? refRect : rect).left;
      const right = (isFloatingWider ? refRect : rect).right;
      const top = (isFloatingTaller ? refRect : rect).top;
      const bottom = (isFloatingTaller ? refRect : rect).bottom;

      if (
        (side === 'top' && startY >= refRect.bottom - 1) ||
        (side === 'bottom' && startY <= refRect.top + 1) ||
        (side === 'left' && startX >= refRect.right - 1) ||
        (side === 'right' && startX <= refRect.left + 1)
      ) {
        close();
        return;
      }

      let isInsideTroughRect = false;
      switch (side) {
        case 'top':
          isInsideTroughRect = isInsideAxisAlignedRect(clientX, clientY, left, refRect.top + 1, right, rect.bottom - 1);
          break;
        case 'bottom':
          isInsideTroughRect = isInsideAxisAlignedRect(clientX, clientY, left, rect.top + 1, right, refRect.bottom - 1);
          break;
        case 'left':
          isInsideTroughRect = isInsideAxisAlignedRect(clientX, clientY, rect.right - 1, bottom, refRect.left + 1, top);
          break;
        case 'right':
          isInsideTroughRect = isInsideAxisAlignedRect(clientX, clientY, refRect.right - 1, bottom, rect.left + 1, top);
          break;
        default:
      }

      if (isInsideTroughRect) {return;}

      if (hasLanded && !isInsideRect(clientX, clientY, refRect)) {
        close();
        return;
      }

      if (!isLeave && isCursorMovingSlowly(clientX, clientY)) {
        close();
        return;
      }

      const isInsidePolygon = computePolygonContainment(
        clientX, clientY, startX, startY,
        refRect, rect, side,
        cursorLeaveFromRight, cursorLeaveFromBottom,
        isFloatingWider, isFloatingTaller,
      );

      if (!isInsidePolygon) {
        close();
      } else if (!hasLanded) {
        this._closeTimer = setTimeout(close, 40);
      }
    };

    document.addEventListener('mousemove', this._handler, true);
  }

  stop() {
    if (this._handler) {
      document.removeEventListener('mousemove', this._handler, true);
      this._handler = null;
    }
    if (this._closeTimer != null) {
      clearTimeout(this._closeTimer);
      this._closeTimer = null;
    }
  }
}

/* eslint-disable no-nested-ternary */
function computePolygonContainment(
  clientX: number, clientY: number,
  x: number, y: number,
  refRect: DOMRect, rect: DOMRect,
  side: Side,
  cursorLeaveFromRight: boolean, cursorLeaveFromBottom: boolean,
  isFloatingWider: boolean, isFloatingTaller: boolean,
): boolean {
  switch (side) {
    case 'top': {
      const co = isFloatingWider ? POLYGON_BUFFER / 2 : POLYGON_BUFFER * 4;
      const cp1x = isFloatingWider ? x + co : cursorLeaveFromRight ? x + co : x - co;
      const cp2x = isFloatingWider ? x - co : cursorLeaveFromRight ? x + co : x - co;
      const cpy = y + POLYGON_BUFFER + 1;
      const cyl = cursorLeaveFromRight ? rect.bottom - POLYGON_BUFFER : isFloatingWider ? rect.bottom - POLYGON_BUFFER : rect.top;
      const cyr = cursorLeaveFromRight ? (isFloatingWider ? rect.bottom - POLYGON_BUFFER : rect.top) : rect.bottom - POLYGON_BUFFER;
      return isPointInQuadrilateral(clientX, clientY, cp1x, cpy, cp2x, cpy, rect.left, cyl, rect.right, cyr);
    }
    case 'bottom': {
      const co = isFloatingWider ? POLYGON_BUFFER / 2 : POLYGON_BUFFER * 4;
      const cp1x = isFloatingWider ? x + co : cursorLeaveFromRight ? x + co : x - co;
      const cp2x = isFloatingWider ? x - co : cursorLeaveFromRight ? x + co : x - co;
      const cpy = y - POLYGON_BUFFER;
      const cyl = cursorLeaveFromRight ? rect.top + POLYGON_BUFFER : isFloatingWider ? rect.top + POLYGON_BUFFER : rect.bottom;
      const cyr = cursorLeaveFromRight ? (isFloatingWider ? rect.top + POLYGON_BUFFER : rect.bottom) : rect.top + POLYGON_BUFFER;
      return isPointInQuadrilateral(clientX, clientY, cp1x, cpy, cp2x, cpy, rect.left, cyl, rect.right, cyr);
    }
    case 'left': {
      const co = isFloatingTaller ? POLYGON_BUFFER / 2 : POLYGON_BUFFER * 4;
      const cp1y = isFloatingTaller ? y + co : cursorLeaveFromBottom ? y + co : y - co;
      const cp2y = isFloatingTaller ? y - co : cursorLeaveFromBottom ? y + co : y - co;
      const cpx = x + POLYGON_BUFFER + 1;
      const cxt = cursorLeaveFromBottom ? rect.right - POLYGON_BUFFER : isFloatingTaller ? rect.right - POLYGON_BUFFER : rect.left;
      const cxb = cursorLeaveFromBottom ? (isFloatingTaller ? rect.right - POLYGON_BUFFER : rect.left) : rect.right - POLYGON_BUFFER;
      return isPointInQuadrilateral(clientX, clientY, cxt, rect.top, cxb, rect.bottom, cpx, cp1y, cpx, cp2y);
    }
    case 'right': {
      const co = isFloatingTaller ? POLYGON_BUFFER / 2 : POLYGON_BUFFER * 4;
      const cp1y = isFloatingTaller ? y + co : cursorLeaveFromBottom ? y + co : y - co;
      const cp2y = isFloatingTaller ? y - co : cursorLeaveFromBottom ? y + co : y - co;
      const cpx = x - POLYGON_BUFFER;
      const cxt = cursorLeaveFromBottom ? rect.left + POLYGON_BUFFER : isFloatingTaller ? rect.left + POLYGON_BUFFER : rect.right;
      const cxb = cursorLeaveFromBottom ? (isFloatingTaller ? rect.left + POLYGON_BUFFER : rect.right) : rect.left + POLYGON_BUFFER;
      return isPointInQuadrilateral(clientX, clientY, cpx, cp1y, cpx, cp2y, cxt, rect.top, cxb, rect.bottom);
    }
    default:
      return false;
  }
}
/* eslint-enable no-nested-ternary */

// ─── Scroll Lock ───────────────────────────────────────────────────────────────

function lockScroll(referenceElement: Element | null): () => void {
  const doc = referenceElement?.ownerDocument ?? document;
  const htmlEl = doc.documentElement;
  const win = doc.defaultView ?? window;
  const originalOverflow = htmlEl.style.overflow;
  const originalPaddingRight = htmlEl.style.paddingRight;

  const computedOverflow = win.getComputedStyle(htmlEl).overflowY;
  if (computedOverflow === 'hidden' || computedOverflow === 'clip') {
    return () => {};
  }

  // Calculate scrollbar width
  const scrollbarWidth = win.innerWidth - htmlEl.clientWidth;

  htmlEl.style.overflow = 'hidden';
  if (scrollbarWidth > 0) {
    htmlEl.style.paddingRight = `${scrollbarWidth}px`;
  }

  return () => {
    htmlEl.style.overflow = originalOverflow;
    htmlEl.style.paddingRight = originalPaddingRight;
  };
}

// ─── Focus Guard ───────────────────────────────────────────────────────────────

function createFocusGuard(): HTMLSpanElement {
  const guard = document.createElement('span');
  guard.tabIndex = 0;
  guard.setAttribute('aria-hidden', 'true');
  guard.setAttribute('data-base-ui-focus-guard', '');
  Object.assign(guard.style, {
    position: 'fixed',
    width: '1px',
    height: '1px',
    padding: '0',
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    borderWidth: '0',
    top: '0',
    left: '0',
  });
  return guard;
}

function getFocusableElements(container: HTMLElement | null) {
  if (container == null) {return [] as HTMLElement[];}
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
  onOpenChangeComplete: ((open: boolean) => void) | undefined;

  /** Optional handle used to connect detached triggers. */
  handle: PopoverHandle<unknown> | undefined;

  /** ID of the active trigger in controlled mode. */
  triggerId: string | null = null;

  /** Default active trigger ID for uncontrolled initially-open usage. */
  defaultTriggerId: string | null = null;
  private actionsRefValue: { current: PopoverRootActions | null } | undefined;
  get actionsRef(): { current: PopoverRootActions | null } | undefined {
    return this.actionsRefValue;
  }
  set actionsRef(value: { current: PopoverRootActions | null } | undefined) {
    this.actionsRefValue = value;
    if (value != null) {
      value.current = this._actions;
    }
  }

  // ── Controlled / uncontrolled ──────────────────────────────────────────────
  private _open: boolean | undefined;
  private _openIsControlled = false;
  private _internalOpen = false;
  private _initialized = false;
  private _transitionStatus: TransitionStatus = undefined;
  private _openReason: PopoverChangeEventReason | null = null;
  private _lastPublishedStateKey: string | null = null;
  private _openInteractionType: 'mouse' | 'touch' | 'keyboard' | null = null;
  private _closePartCount = 0;
  private _instantType: 'dismiss' | 'click' | undefined = undefined;
  private _popupMounted = false;
  private _scrollLockRelease: (() => void) | null = null;

  // ── Part references ────────────────────────────────────────────────────────
  private _popupId: string | undefined;
  private _titleId: string | undefined;
  private _descriptionId: string | undefined;
  private _arrowElement: HTMLElement | null = null;
  private _positionerElement: HTMLElement | null = null;
  private _popupElement: HTMLElement | null = null;
  private _backdropElement: HTMLElement | null = null;
  private _activeTriggerElement: HTMLElement | null = null;
  private readonly _actions: PopoverRootActions = {
    close: () =>
      this.toggle(
        false,
        new Event('base-ui-popover-imperative-action'),
        'imperative-action',
      ),
    unmount: () => this.remove(),
  };

  // ── Hover ──────────────────────────────────────────────────────────────────
  private _hoverOpenTimeout: number | null = null;
  private _hoverCloseTimeout: number | null = null;
  private _hoverRegionDepth = 0;
  private _safePolygon = new SafePolygonHandler();

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
    if (this.handle) {
      this.handle.root = this;
      const initialTriggerId =
        this.triggerId ?? (this.defaultOpen ? this.defaultTriggerId : null);
      if (initialTriggerId) {
        const trigger = this.handle.triggers.get(initialTriggerId);
        if (trigger) {
          this._activeTriggerElement = trigger;
          this.handle.activeTriggerId = initialTriggerId;
          this.handle.activePayload = trigger.payload;
        }
      }
    }

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
    this._safePolygon.stop();
    this._releaseScrollLock();
    removeOpenPopover(this);
    if (this.handle?.root === this) {
      this.handle.root = null;
    }
    if (this.actionsRefValue != null) {
      this.actionsRefValue.current = null;
    }
    this._lastPublishedStateKey = null;
    this._transitionStatus = undefined;
    this._openInteractionType = null;
    this._instantType = undefined;
    this._popupMounted = false;
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

  getOpenInteractionType(): 'mouse' | 'touch' | 'keyboard' | null {
    return this._openInteractionType;
  }

  getInstantType(): 'dismiss' | 'click' | undefined {
    return this._instantType;
  }

  isPopupMounted(): boolean {
    return this._popupMounted;
  }

  setPopupMounted(mounted: boolean) {
    if (this._popupMounted === mounted) {return;}
    this._popupMounted = mounted;
    this._publishStateChange();
  }

  registerClosePart() {
    this._closePartCount += 1;
  }

  deregisterClosePart() {
    this._closePartCount = Math.max(0, this._closePartCount - 1);
  }

  hasFocusTrap(): boolean {
    return this.modal && this._closePartCount > 0;
  }

  fireOpenChangeComplete(open: boolean) {
    this.onOpenChangeComplete?.(open);
  }

  // Part registration
  getPopupId() {
    return this._popupId;
  }
  setPopupId(id: string | undefined) {
    if (this._popupId === id) {return;}
    this._popupId = id;
    this._publishStateChange();
  }

  getTitleId() {
    return this._titleId;
  }
  setTitleId(id: string | undefined) {
    if (this._titleId === id) {return;}
    this._titleId = id;
    this._publishStateChange();
  }

  getDescriptionId() {
    return this._descriptionId;
  }
  setDescriptionId(id: string | undefined) {
    if (this._descriptionId === id) {return;}
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
    if (this.handle && el instanceof PopoverTriggerElement) {
      this.handle.activeTriggerId = el.id || null;
      this.handle.activePayload = el.payload;
    }
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
      {return;}
    this._positionState = merged;
    this._publishStateChange();
  }

  setTransitionStatus(status: TransitionStatus) {
    if (this._transitionStatus === status) {return;}
    this._transitionStatus = status;
    this._syncAttributes();
    this._publishStateChange();
  }

  toggle(
    nextOpen: boolean,
    event: Event,
    reason: PopoverChangeEventReason,
    trigger: Element | undefined = this._activeTriggerElement ?? undefined,
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

    const details = createChangeEventDetails(reason, event, trigger);
    this.onOpenChange?.(nextOpen, details);

    if (details.isCanceled) {return;}

    this._openReason = reason;

    // Track interaction type for focus management
    if (nextOpen) {
      this._openInteractionType = deriveInteractionType(event);
      this._instantType = undefined;
    } else if (reason === 'escape-key' || reason === 'outside-press' || reason === 'focus-out') {
      this._instantType = 'dismiss';
    } else if (reason === 'trigger-press' || reason === 'close-press') {
      this._instantType = 'click';
    } else {
      this._instantType = undefined;
    }

    if (trigger instanceof HTMLElement) {
      this._activeTriggerElement = trigger;
      if (this.handle && trigger instanceof PopoverTriggerElement) {
        this.handle.activeTriggerId = trigger.id || null;
        this.handle.activePayload = trigger.payload;
      }
    }

    if (!this._openIsControlled) {
      this._internalOpen = nextOpen;
    }

    if (!nextOpen) {
      this._clearHoverTimers();
      this._safePolygon.stop();
      this._releaseScrollLock();
    }
    if (this.handle && !nextOpen) {
      this.handle.activeTriggerId = this.triggerId;
    }

    // Acquire scroll lock for modal popovers (not hover or touch)
    if (
      nextOpen &&
      this.modal &&
      reason !== 'trigger-hover' &&
      this._openInteractionType !== 'touch'
    ) {
      this._acquireScrollLock();
    }

    this._syncOpenStack();
    this._syncDocumentListeners();
    this._syncAttributes();
    this._publishStateChange();
    // Note: onOpenChangeComplete is fired from PopoverPopupElement after animations
  }

  // ── Hover support ──────────────────────────────────────────────────────────

  scheduleHoverOpen(delay: number, event: MouseEvent) {
    this.cancelHoverOpen();
    this._hoverOpenTimeout = setTimeout(() => {
      this._hoverOpenTimeout = null;
      this.toggle(true, event, 'trigger-hover');
    }, delay);
  }

  cancelHoverOpen() {
    if (this._hoverOpenTimeout != null) {
      clearTimeout(this._hoverOpenTimeout);
      this._hoverOpenTimeout = null;
    }
  }

  enterHoverRegion() {
    this._cancelHoverClose();
    this._safePolygon.stop();
    this._hoverRegionDepth += 1;
  }

  leaveHoverRegion(event: MouseEvent, closeDelay: number) {
    this._hoverRegionDepth = Math.max(0, this._hoverRegionDepth - 1);
    if (this._hoverRegionDepth > 0) {return;}

    this._cancelHoverClose();
    this._hoverCloseTimeout = setTimeout(() => {
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
      clearTimeout(this._hoverCloseTimeout);
      this._hoverCloseTimeout = null;
    }
  }

  private _clearHoverTimers() {
    this.cancelHoverOpen();
    this._cancelHoverClose();
    this._hoverRegionDepth = 0;
  }

  startSafePolygon(cursorX: number, cursorY: number, triggerElement: HTMLElement) {
    if (!this.getOpen() || this._openReason !== 'trigger-hover') {return;}
    const positionerElement = this._positionerElement;
    const side = this._positionState.side;
    this._safePolygon.start({
      cursorX,
      cursorY,
      triggerElement,
      positionerElement,
      side,
      onClose: () => {
        if (this._hoverRegionDepth === 0 && this._openReason === 'trigger-hover') {
          this.toggle(false, new MouseEvent('mouseleave'), 'focus-out');
        }
      },
      onEnterFloating: () => {
        this.enterHoverRegion();
      },
    });
  }

  private _acquireScrollLock() {
    if (this._scrollLockRelease) {return;}
    this._scrollLockRelease = lockScroll(this._positionerElement);
  }

  private _releaseScrollLock() {
    this._scrollLockRelease?.();
    this._scrollLockRelease = null;
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

    if (!this.getOpen()) {return;}

    const handleMouseDown = (event: Event) => {
      const target = event.target;
      if (
        isEventInside(target, this._positionerElement) ||
        isEventInside(target, this._activeTriggerElement) ||
        isEventInside(target, this._backdropElement)
      )
        {return;}
      // If a handle is present, check all registered triggers — not just the active one.
      // Mirrors React's useDismiss which checks `store.context.triggerElements` (all triggers).
      if (this.handle) {
        for (const [, trigger] of this.handle.triggers) {
          if (isEventInside(target, trigger)) {return;}
        }
      }
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
      this.handle?.activeTriggerId ?? this.triggerId ?? '',
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
      this._instantType ?? '',
      this._popupMounted ? 'mounted' : 'unmounted',
    ].join('|');

    if (nextKey === this._lastPublishedStateKey) {return;}
    this._lastPublishedStateKey = nextKey;
    this.dispatchEvent(new CustomEvent(POPOVER_STATE_CHANGE_EVENT));
    this.handle?._notify();
  }
}

if (!customElements.get('popover-root')) {
  customElements.define('popover-root', PopoverRootElement);
}

// ─── PopoverTriggerElement ──────────────────────────────────────────────────────

export class PopoverTriggerElement<Payload = unknown> extends BaseHTMLElement {
  static properties = {
    disabled: { type: Boolean },
    nativeButton: { type: Boolean, attribute: 'native-button' },
    openOnHover: { type: Boolean, attribute: 'open-on-hover' },
    delay: { type: Number },
    closeDelay: { type: Number, attribute: 'close-delay' },
    render: { attribute: false },
  };

  /** Whether this trigger is disabled. */
  disabled = false;

  /** Open the popover on hover. */
  openOnHover = false;

  /** Whether the rendered element should be treated as a native button. */
  nativeButton = true;

  /** Hover open delay in ms (default 300). */
  delay = DEFAULT_HOVER_OPEN_DELAY;

  /** Hover close delay in ms (default 0). */
  closeDelay = 0;

  /** Optional detached-trigger handle. */
  handle: PopoverHandle<Payload> | undefined;

  /** Optional payload passed through the handle when opened. */
  payload: Payload | undefined;

  /** Optional rendered root override. */
  render: PopoverTriggerRenderProp | undefined;

  renderedElement: HTMLElement | null = null;

  private _root: PopoverRootElement | null = null;
  private _handler = () => this._syncAttributes();
  private _preFocusGuard: HTMLSpanElement | null = null;
  private _postFocusGuard: HTMLSpanElement | null = null;
  private _redirectingFocus = false;

  connectedCallback() {
    this._root = (this.closest('popover-root') as PopoverRootElement | null) ?? null;
    if (!this._root && !this.handle) {
      console.error(
        'Base UI: Popover parts must be placed within <popover-root>.',
      );
      return;
    }

    if (!this.id) {
      ensureId(this, 'base-ui-popover-trigger');
    }

    this._registerDetachedTrigger();
    if (this._root) {
      // For detached triggers (with handle), only restore active trigger if popup is open
      // and this trigger was the last active one — prevents the last-connected detached
      // trigger from incorrectly overwriting handle.activePayload on initial render.
      // For inline triggers (no handle), always set as active trigger (original behavior).
      if (!this.handle || (this._root.getOpen() && this.handle.activeTriggerId === this.id)) {
        this._root.setActiveTriggerElement(this);
      }
      this._root.addEventListener(POPOVER_STATE_CHANGE_EVENT, this._handler);
      queueMicrotask(() => this._syncAttributes());
    } else {
      this._bindRoot();
    }

    this.addEventListener('click', this._handleClick);
    this.addEventListener('keydown', this._handleKeyDown);
    this.addEventListener('keyup', this._handleKeyUp);
    this.addEventListener('mouseenter', this._handleMouseEnter);
    this.addEventListener('mouseleave', this._handleMouseLeave);
    this.addEventListener('focusin', this._handleFocusIn);

    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(POPOVER_STATE_CHANGE_EVENT, this._handler);
    this.removeEventListener('click', this._handleClick);
    this.removeEventListener('keydown', this._handleKeyDown);
    this.removeEventListener('keyup', this._handleKeyUp);
    this.removeEventListener('mouseenter', this._handleMouseEnter);
    this.removeEventListener('mouseleave', this._handleMouseLeave);
    this.removeEventListener('focusin', this._handleFocusIn);
    this._removeFocusGuards();
    if (this.handle && this.id) {
      this.handle.triggers.delete(this.id);
      if (this.handle.activeTriggerId === this.id) {
        this.handle.activeTriggerId = null;
        this.handle.activePayload = undefined;
      }
    }
    this._root = null;
    this._resetRenderedElement();
  }

  private _handleClick = (event: Event) => {
    if (this.disabled) {return;}
    const root = this._getRoot();
    if (!root) {return;}
    const open = root.getOpen();
    const isActiveTrigger = root.getActiveTriggerElement() === this;
    root.toggle(open && !isActiveTrigger ? true : !open, event, 'trigger-press', this);
  };

  private _handleKeyDown = (event: KeyboardEvent) => {
    if (this.disabled) {return;}
    if (this.render != null && this.nativeButton) {return;}
    if (event.target !== this._getInteractiveElement()) {return;}
    const root = this._getRoot();
    if (!root) {return;}

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const open = root.getOpen();
      const isActiveTrigger = root.getActiveTriggerElement() === this;
      root.toggle(open && !isActiveTrigger ? true : !open, event, 'trigger-press', this);
    }
  };

  private _handleKeyUp = (event: KeyboardEvent) => {
    if (this.render != null && this.nativeButton) {return;}
    if (event.key === ' ') {event.preventDefault();}
  };

  private _handleMouseEnter = (event: MouseEvent) => {
    if (this.disabled || !this.openOnHover) {return;}
    const root = this._getRoot();
    if (!root) {return;}
    root.setActiveTriggerElement(this);
    root.enterHoverRegion();
    root.scheduleHoverOpen(this.delay, event);
  };

  private _handleMouseLeave = (event: MouseEvent) => {
    if (!this.openOnHover) {return;}
    const root = this._getRoot();
    if (!root) {return;}
    // Start safe polygon tracking to allow mouse to traverse gap
    root.startSafePolygon(event.clientX, event.clientY, this._ensureRenderedElement());
    root.leaveHoverRegion(event, this.closeDelay);
  };

  private _handleFocusIn = () => {
    if (this._redirectingFocus) {return;}
    const root = this._getRoot();
    if (!root || !root.getOpen()) {return;}
    if (root.getOpenReason() === 'trigger-hover') {return;}
    if (root.getActiveTriggerElement() !== this) {return;}

    const popup = root.getPopupElement();
    if (!popup || !popup.isConnected) {return;}
    if (popup.hidden) {return;}

    // Redirect focus into the popup (restoreFocus="popup" behavior)
    this._redirectingFocus = true;
    try {
      const focusable = getFocusableElements(popup);
      if (focusable.length > 0) {
        focusable[0].focus({ preventScroll: true });
      } else {
        popup.focus({ preventScroll: true });
      }
    } finally {
      this._redirectingFocus = false;
    }
  };

  private _syncFocusGuards() {
    const root = this._getRoot();
    if (!root) {
      this._removeFocusGuards();
      return;
    }

    const open = root.getOpen();
    const isActiveTrigger = root.getActiveTriggerElement() === this;
    const shouldHaveGuards = open && isActiveTrigger && !root.hasFocusTrap() && root.getOpenReason() !== 'trigger-hover';

    if (shouldHaveGuards) {
      this._ensureFocusGuards(root);
    } else {
      this._removeFocusGuards();
    }
  }

  private _ensureFocusGuards(root: PopoverRootElement) {
    if (!this._preFocusGuard) {
      this._preFocusGuard = createFocusGuard();
      this._preFocusGuard.addEventListener('focus', () => {
        // Close and focus previous tabbable
        root.toggle(false, new FocusEvent('focusout'), 'focus-out');
      });
    }
    if (!this._postFocusGuard) {
      this._postFocusGuard = createFocusGuard();
      this._postFocusGuard.addEventListener('focus', () => {
        // Close and focus next tabbable after the popup
        root.toggle(false, new FocusEvent('focusout'), 'focus-out');
      });
    }

    // Insert guards around the trigger
    if (this._preFocusGuard.parentNode !== this.parentNode || this._preFocusGuard.nextSibling !== this) {
      this.parentNode?.insertBefore(this._preFocusGuard, this);
    }
    if (this._postFocusGuard.parentNode !== this.parentNode || this._postFocusGuard.previousSibling !== this) {
      if (this.nextSibling) {
        this.parentNode?.insertBefore(this._postFocusGuard, this.nextSibling);
      } else {
        this.parentNode?.appendChild(this._postFocusGuard);
      }
    }
  }

  private _removeFocusGuards() {
    this._preFocusGuard?.remove();
    this._preFocusGuard = null;
    this._postFocusGuard?.remove();
    this._postFocusGuard = null;
  }

  private _syncAttributes() {
    const root = this._getRoot();
    if (!root) {return;}
    const open = root.getOpen();
    const expanded = open && root.getActiveTriggerElement() === this;
    const popupId = root.getPopupId();
    const trigger = this._ensureRenderedElement();

    clearOwnedAttributes(this, POPOVER_TRIGGER_OWNER_ATTRIBUTES, trigger);

    trigger.setAttribute('aria-expanded', String(expanded));
    trigger.toggleAttribute('data-popup-open', expanded);

    if (expanded && popupId) {
      trigger.setAttribute('aria-controls', popupId);
    } else {
      trigger.removeAttribute('aria-controls');
    }

    trigger.setAttribute('aria-haspopup', 'dialog');

    const renderedNativeButton = this.render != null && this.nativeButton;

    if (renderedNativeButton) {
      trigger.removeAttribute('role');
      trigger.removeAttribute('tabindex');
      trigger.removeAttribute('aria-disabled');

      if (trigger instanceof HTMLButtonElement && !trigger.hasAttribute('type')) {
        trigger.setAttribute('type', 'button');
      }

      if (this.disabled) {
        trigger.setAttribute('disabled', '');
      } else {
        trigger.removeAttribute('disabled');
      }
    } else {
      trigger.setAttribute('role', 'button');
      if (this.disabled) {
        trigger.setAttribute('aria-disabled', 'true');
        trigger.setAttribute('tabindex', '-1');
        trigger.removeAttribute('disabled');
      } else {
        trigger.removeAttribute('aria-disabled');
        trigger.setAttribute('tabindex', '0');
        trigger.removeAttribute('disabled');
      }
    }

    // Sync focus guards for non-modal popovers
    this._syncFocusGuards();
  }

  private _registerDetachedTrigger() {
    if (this.handle && this.id) {
      this.handle.triggers.set(this.id, this);
    }
  }

  private _bindRoot(root: PopoverRootElement | null = null) {
    const nextRoot =
      root ?? (this.closest('popover-root') as PopoverRootElement | null) ?? this.handle?.root ?? null;
    if (!nextRoot || this._root === nextRoot) {
      return;
    }

    this._root?.removeEventListener(POPOVER_STATE_CHANGE_EVENT, this._handler);
    this._root = nextRoot;
    if (this.handle) {
      this.handle.root = nextRoot;
    }
    if (!this.handle || (nextRoot.getOpen() && this.handle.activeTriggerId === this.id)) {
      nextRoot.setActiveTriggerElement(this);
    }
    nextRoot.addEventListener(POPOVER_STATE_CHANGE_EVENT, this._handler);
    queueMicrotask(() => this._syncAttributes());
  }

  getAnchorElement(): HTMLElement {
    return this._ensureRenderedElement();
  }

  private _getInteractiveElement() {
    return this.renderedElement ?? this;
  }

  private _ensureRenderedElement(): HTMLElement {
    if (this.render == null) {
      this.style.removeProperty('display');
      this._resetRenderedElement();
      this.renderedElement = this;
      return this;
    }

    if (
      this.renderedElement &&
      this.renderedElement !== this &&
      this.contains(this.renderedElement)
    ) {
      copyHostAttributes(this, this.renderedElement, POPOVER_TRIGGER_OWNER_ATTRIBUTES);
      return this.renderedElement;
    }

    const contentNodes =
      this.renderedElement && this.renderedElement !== this
        ? Array.from(this.renderedElement.childNodes)
        : Array.from(this.childNodes).filter((node) => node !== this.renderedElement);
    const template =
      typeof this.render === 'function'
        ? this.render({}, { disabled: this.disabled, open: false })
        : this.render;
    const nextRoot = materializeTemplateRoot('popover-trigger', template);

    copyHostAttributes(this, nextRoot, POPOVER_TRIGGER_OWNER_ATTRIBUTES);
    this.style.display = 'contents';
    this.replaceChildren(nextRoot);
    nextRoot.append(...contentNodes);
    this.renderedElement = nextRoot;
    return nextRoot;
  }

  private _resetRenderedElement() {
    if (this.renderedElement == null || this.renderedElement === this) {
      this.renderedElement = this;
      return;
    }

    const contentNodes = Array.from(this.renderedElement.childNodes);
    this.style.removeProperty('display');
    this.replaceChildren(...contentNodes);
    this.renderedElement = null;
  }

  private _getRoot(): PopoverRootElement | null {
    if (this._root?.isConnected) {
      return this._root;
    }

    const root =
      (this.closest('popover-root') as PopoverRootElement | null) ?? this.handle?.root ?? null;

    if (root && root !== this._root) {
      this._bindRoot(root);
      return this._root;
    }

    return root;
  }
}

if (!customElements.get('popover-trigger')) {
  customElements.define('popover-trigger', PopoverTriggerElement);
}

// ─── PopoverPortalElement ───────────────────────────────────────────────────────

export class PopoverPortalElement extends BaseHTMLElement {
  private _root: PopoverRootElement | null = null;
  private _handler = () => this._syncVisibility();
  container: HTMLElement | ShadowRoot | null = null;
  render: PopoverPortalRenderProp | undefined;
  private renderedElement: HTMLElement | null = null;
  private portalContainer: HTMLElement | null = null;
  private syncingPortal = false;

  connectedCallback() {
    this._root = this.closest('popover-root') as PopoverRootElement | null;
    if (!this._root) {
      console.error(
        'Base UI: Popover parts must be placed within <popover-root>.',
      );
      return;
    }

    this.style.display = 'contents';
    this._ensurePortalContainer();
    this._root.addEventListener(POPOVER_STATE_CHANGE_EVENT, this._handler);
    queueMicrotask(() => this._syncVisibility());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(
      POPOVER_STATE_CHANGE_EVENT,
      this._handler,
    );
    this._teardownPortalContainer();
    this._root = null;
  }

  private _syncVisibility() {
    if (!this._root) {return;}
    const open = this._root.getOpen();
    const target = this._ensureRenderedElement({ open });
    target.toggleAttribute('data-open', open);
    target.toggleAttribute('data-closed', !open);
  }

  private _ensureRenderedElement(state: PopoverPortalState) {
    const portalContainer = this._ensurePortalContainer();

    if (this.syncingPortal && this.renderedElement) {
      return this.renderedElement;
    }

    if (this.render == null) {
      if (this.renderedElement === portalContainer) {
        return portalContainer;
      }

      this._resetRenderedElement();
      const contentNodes = Array.from(this.childNodes);
      contentNodes.forEach((node) => {
        stampPopoverRootContext(node, this._root);
      });
      this.renderedElement = portalContainer;
      this.syncingPortal = true;
      try {
        portalContainer.replaceChildren(...contentNodes);
      } finally {
        this.syncingPortal = false;
      }
      return portalContainer;
    }

    if (
      this.renderedElement &&
      this.renderedElement !== portalContainer &&
      portalContainer.contains(this.renderedElement)
    ) {
      return this.renderedElement;
    }

    const contentNodes =
      this.renderedElement && this.renderedElement !== portalContainer
        ? Array.from(this.renderedElement.childNodes)
        : Array.from(this.childNodes).filter((node) => node !== this.renderedElement);
    const template = typeof this.render === 'function' ? this.render({}, state) : this.render;
    const nextRoot = materializeTemplateRoot('popover-portal', template);

    stampPopoverRootContext(nextRoot, this._root);
    contentNodes.forEach((node) => {
      stampPopoverRootContext(node, this._root);
    });
    this.renderedElement = nextRoot;
    this.syncingPortal = true;
    try {
      portalContainer.replaceChildren(nextRoot);
      nextRoot.append(...contentNodes);
    } finally {
      this.syncingPortal = false;
    }
    return nextRoot;
  }

  private _resetRenderedElement() {
    if (this.portalContainer == null || this.renderedElement == null) {
      return;
    }

    const source =
      this.renderedElement === this.portalContainer
        ? this.portalContainer
        : this.renderedElement;
    const contentNodes = Array.from(source.childNodes);
    this.replaceChildren(...contentNodes);
    this.renderedElement = null;
  }

  private _ensurePortalContainer() {
    const owner = this.ownerDocument ?? document;
    const mountRoot = this.container ?? owner.body;

    if (this.portalContainer?.isConnected) {
      stampPopoverRootContext(this.portalContainer, this._root);

      if (this.portalContainer.parentNode !== mountRoot) {
        mountRoot.append(this.portalContainer);
      }

      return this.portalContainer;
    }

    const portalContainer = owner.createElement('div');
    portalContainer.style.display = 'contents';
    portalContainer.setAttribute('data-base-ui-popover-portal', '');
    stampPopoverRootContext(portalContainer, this._root);
    mountRoot.append(portalContainer);
    this.portalContainer = portalContainer;
    return portalContainer;
  }

  private _teardownPortalContainer() {
    this._resetRenderedElement();

    if (this.portalContainer == null) {
      return;
    }

    this.portalContainer.remove();
    this.portalContainer = null;
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
  render: PopoverPositionerRenderProp | undefined;

  private _root: PopoverRootElement | null = null;
  private _handler = () => this._handleStateChange();
  private _cleanupAutoUpdate: (() => void) | null = null;
  private renderedElement: HTMLElement | null = null;
  private syncingRenderedElement = false;
  private _wasOpen = false;
  private _suppressNextPositionTransition = false;

  connectedCallback() {
    this._root = resolvePopoverRoot(this);
    if (!this._root) {
      console.error(
        'Base UI: Popover parts must be placed within <popover-root>.',
      );
      return;
    }

    this._root.addEventListener(POPOVER_STATE_CHANGE_EVENT, this._handler);
    queueMicrotask(() => this._handleStateChange());
  }

  disconnectedCallback() {
    this._stopAutoUpdate();
    this._root?.removeEventListener(
      POPOVER_STATE_CHANGE_EVENT,
      this._handler,
    );
    this._root?.setPositionerElement(null);
    this._root = null;
    this._resetRenderedElement();
  }

  private _handleStateChange() {
    if (!this._root) {return;}
    const target = this._ensureRenderedElement();
    this._root.setPositionerElement(target);

    target.setAttribute('role', 'presentation');
    Object.assign(target.style, {
      position: this.positionMethod,
      left: target.style.left || '0px',
      top: target.style.top || '0px',
    });
    if (target.style.zIndex === '') {
      target.style.zIndex = '1';
    }

    const open = this._root.getOpen();
    const wasOpen = this._wasOpen;
    this._wasOpen = open;

    if (open) {
      target.removeAttribute('hidden');
      target.style.pointerEvents = '';
      // Suppress CSS position transitions during initial positioning so the popup
      // doesn't animate from (0,0). Mirrors React's getDisabledMountTransitionStyles
      // which applies `transition: none` while transitionStatus === 'starting'.
      if (!wasOpen) {
        this._suppressNextPositionTransition = true;
      }
      this._syncAutoUpdate();
    } else {
      target.setAttribute('hidden', '');
      target.style.pointerEvents = 'none';
      this._stopAutoUpdate();
    }

    this._syncAttributes();
  }

  private _syncAutoUpdate() {
    this._stopAutoUpdate();

    if (!this._root?.getOpen()) {return;}

    const activeTrigger = this._root.getActiveTriggerElement();
    const anchorElement =
      this.anchor ??
      (activeTrigger instanceof PopoverTriggerElement
        ? activeTrigger.getAnchorElement()
        : activeTrigger);
    if (!(anchorElement instanceof Element)) {return;}

    const target = this._ensureRenderedElement();
    const placement = toPlacement(this.side, this.align);
    const middleware: Array<{
      name: string;
      options?: unknown;
      fn?: ((state: unknown) => unknown) | undefined;
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
      if (!this._root) {return;}
      const root = this._root;

      computePosition(anchorElement, target, {
        placement,
        strategy: this.positionMethod,
        middleware: middleware as any,
      }).then(
        (result: Awaited<ReturnType<typeof computePosition>>) => {
          // If this is the first position update after opening, suppress CSS transitions
          // so the popup doesn't animate from (0,0) to the correct position.
          // Mirrors React's getDisabledMountTransitionStyles (transition:none during 'starting').
          const suppressTransition = this._suppressNextPositionTransition;
          if (suppressTransition) {
            this._suppressNextPositionTransition = false;
            target.style.setProperty('transition', 'none');
          }

          Object.assign(target.style, {
            left: `${result.x}px`,
            top: `${result.y}px`,
            position: this.positionMethod,
          });

          if (suppressTransition) {
            // Force a layout flush so the browser commits the position without transition,
            // then re-enable transitions for subsequent moves (scroll, resize, trigger-switch).
            void target.offsetWidth;
            target.style.removeProperty('transition');
          }

          const parsed = parsePlacement(result.placement);
          const arrowData = result.middlewareData.arrow as
            | {
                x?: (number) | undefined;
                y?: (number) | undefined;
                centerOffset?: (number) | undefined;
              }
            | undefined;
          const hideData = result.middlewareData.hide as
            | { referenceHidden?: (boolean) | undefined }
            | undefined;

          // Position arrow
          if (arrowElement) {
            Object.assign(arrowElement.style, {
              left:
                arrowData?.x != null ? `${arrowData.x}px` : '',
              top:
                arrowData?.y != null ? `${arrowData.y}px` : '',
              right: '',
              bottom: '',
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

          target.style.setProperty(
            '--transform-origin',
            root.getPositionState().transformOrigin,
          );
        },
      );
    };

    updatePosition();
    this._cleanupAutoUpdate = autoUpdate(
      anchorElement,
      target,
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
    if (!this._root) {return;}
    const target = this._ensureRenderedElement();
    const open = this._root.getOpen();
    const ps = this._root.getPositionState();

    clearOwnedAttributes(this, POPOVER_POSITIONER_OWNER_ATTRIBUTES, target);

    target.setAttribute('role', 'presentation');
    target.toggleAttribute('data-open', open);
    target.toggleAttribute('data-closed', !open);
    target.setAttribute('data-side', ps.side);
    target.setAttribute('data-align', ps.align);
    target.toggleAttribute('data-anchor-hidden', ps.anchorHidden);
  }

  private _ensureRenderedElement(): HTMLElement {
    if (this.syncingRenderedElement && this.renderedElement) {
      return this.renderedElement;
    }

    if (this.render == null) {
      this._resetRenderedElement();
      this.renderedElement = this;
      return this;
    }

    if (
      this.renderedElement &&
      this.renderedElement !== this &&
      this.contains(this.renderedElement)
    ) {
      copyHostAttributes(this, this.renderedElement, POPOVER_POSITIONER_OWNER_ATTRIBUTES);
      return this.renderedElement;
    }

    const contentNodes =
      this.renderedElement && this.renderedElement !== this
        ? Array.from(this.renderedElement.childNodes)
        : Array.from(this.childNodes).filter((node) => node !== this.renderedElement);
    const template =
      typeof this.render === 'function'
        ? this.render({}, {
            ...this._root!.getPositionState(),
            open: this._root!.getOpen(),
          })
        : this.render;
    const nextRoot = materializeTemplateRoot('popover-positioner', template);

    copyHostAttributes(this, nextRoot, POPOVER_POSITIONER_OWNER_ATTRIBUTES);
    this.style.display = 'contents';
    this.renderedElement = nextRoot;
    this.syncingRenderedElement = true;
    try {
      this.replaceChildren(nextRoot);
      nextRoot.append(...contentNodes);
    } finally {
      this.syncingRenderedElement = false;
    }
    return nextRoot;
  }

  private _resetRenderedElement() {
    if (this.renderedElement == null || this.renderedElement === this) {
      this.renderedElement = this;
      return;
    }

    const contentNodes = Array.from(this.renderedElement.childNodes);
    this.style.removeProperty('display');
    this.replaceChildren(...contentNodes);
    this.renderedElement = null;
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
  private _widthVars: { width: string; height: string } | null = null;
  initialFocus: HTMLElement | false | undefined;
  finalFocus: HTMLElement | false | undefined;
  render: PopoverPopupRenderProp | undefined;
  private renderedElement: HTMLElement | null = null;

  connectedCallback() {
    this._root = resolvePopoverRoot(this);
    if (!this._root) {
      console.error(
        'Base UI: Popover parts must be placed within <popover-root>.',
      );
      return;
    }

    const root = this._root;
    ensureId(this, 'base-ui-popover-popup');
    root.setPopupId(this.id);
    root.setPopupElement(this);

    if (this.style.display === '') {
      this.style.display = 'block';
    }
    if (this.style.position === '') {
      this.style.position = 'relative';
    }

    root.addEventListener(POPOVER_STATE_CHANGE_EVENT, this._handler);

    this.addEventListener('mouseenter', this._handleMouseEnter);
    this.addEventListener('mouseleave', this._handleMouseLeave);
    this.addEventListener('keydown', this._handleKeyDown);

    if (!root.getOpen()) {
      this.setAttribute('hidden', '');
    }

    queueMicrotask(() => this._handleStateChange());
  }

  disconnectedCallback() {
    this._clearFrame();
    const root = this._root;
    if (root) {
      root.setPopupId(undefined);
      root.setPopupElement(null);
      root.setTransitionStatus(undefined);
      root.removeEventListener(
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
    this._resetRenderedElement();
  }

  private _handleMouseEnter = () => {
    this._root?.enterHoverRegion();
  };

  private _handleMouseLeave = (event: MouseEvent) => {
    this._root?.leaveHoverRegion(event, 0);
  };

  private _handleKeyDown = (event: KeyboardEvent) => {
    if (!this._root) {return;}

    // Focus trap for modal popovers (only when close part exists)
    if (event.key === 'Tab' && this._root.hasFocusTrap()) {
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
    if (!this._root) {return;}

    const open = this._root.getOpen();
    const wasOpen = this._lastOpen;

    if (open) {
      this._exitRunId += 1;
      if (wasOpen !== true && !this._mounted) {
        this._mounted = true;
        // Set _transitionStatus BEFORE setPopupMounted so the re-entrant _syncVisibility()
        // call (fired synchronously by setPopupMounted) sees 'starting' and applies
        // data-starting-style BEFORE removing [hidden]. This ensures the browser paints
        // opacity:0 on the very first frame the popup becomes visible.
        this._transitionStatus = 'starting';
        this._root.setPopupMounted(true);
        this._scheduleStartingCleanup();
        this._scheduleInitialFocus();
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

  private _scheduleInitialFocus() {
    if (!this._root) {return;}
    // Don't manage focus for hover-opened popovers
    if (this._root.getOpenReason() === 'trigger-hover') {return;}
    if (this.initialFocus === false) {return;}

    // Use rAF so the element is visible and positioned
    requestAnimationFrame(() => {
      if (!this._root?.getOpen()) {return;}

      if (this.initialFocus instanceof HTMLElement) {
        this.initialFocus.focus({ preventScroll: true });
        return;
      }

      const target = this._ensureRenderedElement();

      // For touch, focus popup itself to prevent virtual keyboard
      if (this._root.getOpenInteractionType() === 'touch') {
        target.focus({ preventScroll: true });
        return;
      }

      const focusable = getFocusableElements(target);
      if (focusable.length > 0) {
        focusable[0].focus({ preventScroll: true });
      } else {
        target.focus({ preventScroll: true });
      }
    });
  }

  private _syncVisibility() {
    if (!this._root) {return;}

    const open = this._root.getOpen();
    const shouldRender =
      this._mounted || this._transitionStatus === 'ending';
    const target = this._ensureRenderedElement();

    if (!shouldRender) {
      target.setAttribute('hidden', '');
      this._root.setTransitionStatus(undefined);
      return;
    }

    // Set starting/ending style BEFORE showing the element so the browser computes the
    // initial opacity/transform from the CSS rule on the very first painted frame.
    // If we set data-starting-style after removing [hidden], the element flashes at
    // its final opacity (1) for one frame before the CSS rule can take effect.
    target.toggleAttribute('data-starting-style', this._transitionStatus === 'starting');
    target.toggleAttribute('data-ending-style', this._transitionStatus === 'ending');

    const hidden = !open && this._transitionStatus !== 'ending';

    if (hidden) {
      target.setAttribute('hidden', '');
    } else {
      target.removeAttribute('hidden');
    }

    // ARIA
    target.setAttribute('role', 'dialog');
    target.setAttribute('tabindex', '-1');
    if (this._root.getModal()) {
      target.setAttribute('aria-modal', 'true');
    } else {
      target.removeAttribute('aria-modal');
    }

    const titleId = this._root.getTitleId();
    if (titleId) {
      target.setAttribute('aria-labelledby', titleId);
    } else {
      target.removeAttribute('aria-labelledby');
    }

    const descriptionId = this._root.getDescriptionId();
    if (descriptionId) {
      target.setAttribute('aria-describedby', descriptionId);
    } else {
      target.removeAttribute('aria-describedby');
    }

    // Data attributes (data-starting-style and data-ending-style are set above,
    // before hidden is toggled, so the browser applies CSS rules on the first frame)
    target.toggleAttribute('data-open', open);
    target.toggleAttribute('data-closed', !open);

    // Instant type attribute
    const instantType = this._root.getInstantType();
    if (instantType) {
      target.setAttribute('data-instant', instantType);
    } else {
      target.removeAttribute('data-instant');
    }

    this._root.setTransitionStatus(this._transitionStatus);
  }

  /**
   * Sets --popup-width/--popup-height on the actual rendered element (not the display:contents
   * host). The constraint is stored internally so it survives copyHostAttributes overwrites.
   */
  setWidthConstraint(width: number | null, height: number | null) {
    this._widthVars =
      width != null && height != null
        ? { width: `${width}px`, height: `${height}px` }
        : null;
    this._applyWidthVars(this.renderedElement ?? this);
  }

  /** Returns the actual styled element for measurement (offsetWidth/offsetHeight). */
  getStyledElement(): HTMLElement {
    return this.renderedElement ?? this;
  }

  private _applyWidthVars(el: HTMLElement) {
    if (this._widthVars != null) {
      el.style.setProperty('--popup-width', this._widthVars.width);
      el.style.setProperty('--popup-height', this._widthVars.height);
    } else {
      el.style.removeProperty('--popup-width');
      el.style.removeProperty('--popup-height');
    }
  }

  private _ensureRenderedElement() {
    if (this.render == null) {
      this._resetRenderedElement();
      this.renderedElement = this;
      return this;
    }

    if (this.renderedElement && this.renderedElement !== this && this.contains(this.renderedElement)) {
      copyHostAttributes(this, this.renderedElement, POPOVER_POPUP_OWNER_ATTRIBUTES);
      this._applyWidthVars(this.renderedElement);
      return this.renderedElement;
    }

    const contentNodes =
      this.renderedElement && this.renderedElement !== this
        ? Array.from(this.renderedElement.childNodes)
        : Array.from(this.childNodes).filter((node) => node !== this.renderedElement);
    const template =
      typeof this.render === 'function'
        ? this.render({}, {
            transitionStatus: this._transitionStatus,
            modal: this._root?.getModal() ?? false,
            ...this._root!.getPositionState(),
            open: this._root!.getOpen(),
          })
        : this.render;
    const nextRoot = materializeTemplateRoot('popover-popup', template);

    copyHostAttributes(this, nextRoot, POPOVER_POPUP_OWNER_ATTRIBUTES);
    this._applyWidthVars(nextRoot);
    this.style.display = 'contents';
    this.replaceChildren(nextRoot);
    nextRoot.append(...contentNodes);
    this.renderedElement = nextRoot;
    return nextRoot;
  }

  private _resetRenderedElement() {
    if (this.renderedElement == null || this.renderedElement === this) {
      this.renderedElement = this;
      return;
    }

    const contentNodes = Array.from(this.renderedElement.childNodes);
    this.style.removeProperty('display');
    this.replaceChildren(...contentNodes);
    this.renderedElement = null;
  }

  private _scheduleStartingCleanup() {
    this._clearFrame();
    // Double rAF: the first rAF fires before the browser paints `data-starting-style`.
    // The second rAF fires AFTER that paint, so the CSS transition has a painted "from"
    // state to animate from. Mirrors React's useIsoLayoutEffect + AnimationFrame.request
    // which runs after React commits data-starting-style to DOM and the browser paints.
    this._frameId = requestAnimationFrame(() => {
      this._frameId = requestAnimationFrame(() => {
        this._frameId = null;
        if (!this._root || this._transitionStatus !== 'starting') {return;}
        if (!this._root.getOpen()) {return;}
        this._transitionStatus = undefined;
        this._syncVisibility();

        // Fire onOpenChangeComplete after enter animations finish
        this._waitForOpenAnimations();
      });
    });
  }

  private _waitForOpenAnimations() {
    if (
      typeof this.getAnimations !== 'function' ||
      (globalThis as typeof globalThis & { BASE_UI_ANIMATIONS_DISABLED?: boolean | undefined }).BASE_UI_ANIMATIONS_DISABLED
    ) {
      this._root?.fireOpenChangeComplete(true);
      return;
    }

    const animations = this.getAnimations();
    if (animations.length === 0) {
      this._root?.fireOpenChangeComplete(true);
      return;
    }

    Promise.all(animations.map((a) => a.finished))
      .then(() => {
        if (this._root?.getOpen()) {
          this._root.fireOpenChangeComplete(true);
        }
      })
      .catch(() => {
        // Animations may be canceled if popover closes before they finish
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
    if (runId !== this._exitRunId) {return;}

    if (
      typeof this.getAnimations !== 'function' ||
      (
        globalThis as typeof globalThis & {
          BASE_UI_ANIMATIONS_DISABLED?: (boolean) | undefined;
        }
      ).BASE_UI_ANIMATIONS_DISABLED
    ) {
      this._finishExit(runId);
      return;
    }

    Promise.all(this.getAnimations().map((a) => a.finished))
      .then(() => this._finishExit(runId))
      .catch(() => {
        if (runId !== this._exitRunId) {return;}
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
    if (runId !== this._exitRunId) {return;}
    this._mounted = false;
    this._transitionStatus = undefined;
    this._syncVisibility();

    // Notify root that popup is unmounted
    this._root?.setPopupMounted(false);

    // Restore focus on close (not for hover-opened popovers)
    if (this._root && this._root.getOpenReason() !== 'trigger-hover') {
      if (this.finalFocus === false) {
        // Don't move focus
      } else if (this.finalFocus instanceof HTMLElement) {
        this.finalFocus.focus({ preventScroll: true });
      } else {
        const trigger = this._root.getActiveTriggerElement();
        if (trigger?.isConnected) {
          trigger.focus({ preventScroll: true });
        }
      }
    }

    // Fire onOpenChangeComplete after exit
    this._root?.fireOpenChangeComplete(false);
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

// ─── PopoverViewportElement ─────────────────────────────────────────────────────

export class PopoverViewportElement extends BaseHTMLElement {
  private static readonly TRANSITION_DURATION_MS = 350;
  private static readonly ACTIVATION_DIRECTION_TOLERANCE_PX = 5;
  private _root: PopoverRootElement | null = null;
  private _handler = () => {
    if (this._syncingStructure) {
      this._pendingRootStateSync = true;
      return;
    }

    this._syncFromRootState();
  };
  private _lastTriggerRect:
    | { x: number; y: number; width: number; height: number }
    | null = null;
  private _lastRootStateKey: string | null = null;
  private _mutationObserver: MutationObserver | null = null;
  private _pendingPreviousContent: HTMLElement | null = null;
  private _pendingRootStateSync = false;
  private _transitionCleanupTimer: number | null = null;
  private _startingStyleFrame: number | null = null;
  private _widthObserver: MutationObserver | null = null;
  private _syncingStructure = false;
  render: PopoverViewportRenderProp | undefined;
  private renderedElement: HTMLElement | null = null;

  connectedCallback() {
    this._root = resolvePopoverRoot(this);
    if (!this._root) {
      console.error(
        'Base UI: Popover parts must be placed within <popover-root>.',
      );
      return;
    }

    this._root.addEventListener(POPOVER_STATE_CHANGE_EVENT, this._handler);
    this._mutationObserver = new MutationObserver(() => {
      if (this._syncingStructure) {
        return;
      }

      this._syncStructure();
    });
    this._mutationObserver.observe(this, {
      childList: true,
    });
    queueMicrotask(() => this._syncFromRootState(true));
  }

  disconnectedCallback() {
    this._root?.removeEventListener(
      POPOVER_STATE_CHANGE_EVENT,
      this._handler,
    );
    this._mutationObserver?.disconnect();
    this._mutationObserver = null;
    this._pendingPreviousContent = null;
    this._pendingRootStateSync = false;
    this._clearTransitionTimers();
    this._lastRootStateKey = null;
    this._root = null;
    this._lastTriggerRect = null;
    this._resetRenderedElement();
  }

  private _syncFromRootState(force = false) {
    if (!this._root) {
      return;
    }

    const nextKey = [
      this._root.getOpen() ? 'open' : 'closed',
      this._root.handle?.activeTriggerId ?? '',
      this._root.getTransitionStatus() ?? 'idle',
    ].join('|');

    if (!force && nextKey === this._lastRootStateKey) {
      return;
    }

    this._lastRootStateKey = nextKey;
    this._syncAttributes();
  }

  private _syncAttributes() {
    if (!this._root) {return;}
    const target = this._ensureRenderedElement();

    if (getComputedStyle(target).display === 'inline') {
      target.style.display = 'block';
    }

    const activeTrigger = this._root.getActiveTriggerElement();
    const trigger =
      activeTrigger instanceof PopoverTriggerElement
        ? activeTrigger.getAnchorElement()
        : activeTrigger;
    const popup = this._root.getPopupElement();
    const activationDirection = this._getActivationDirection(trigger);

    if (activationDirection) {
      this._capturePreviousContent(target);
    }

    if (activationDirection) {
      target.setAttribute('data-activation-direction', activationDirection);
    } else {
      target.removeAttribute('data-activation-direction');
    }

    target.removeAttribute('data-instant');

    // Measure old popup dimensions before DOM changes so we can animate from them.
    // Use getStyledElement() so offsetWidth is correct even when host is display:contents.
    const styledPopup = popup?.getStyledElement() ?? null;
    // Use getBoundingClientRect for sub-pixel precision — offsetWidth rounds to integers which
    // can misalign the CSS transition start-point from the actual displayed width.
    const priorBcr = activationDirection && styledPopup ? styledPopup.getBoundingClientRect() : null;
    const priorWidth = priorBcr?.width ?? null;
    const priorHeight = priorBcr?.height ?? null;

    this._syncStructure(target);

    if (popup && target.hasAttribute('data-transitioning')) {
      if (priorWidth != null && priorHeight != null) {
        // Lock popup at old dimensions so CSS transition has a stable starting point.
        // setWidthConstraint() targets the rendered element and survives re-renders.
        popup.setWidthConstraint(priorWidth, priorHeight);

        // Lock [data-previous] at the old popup width so its content doesn't reflow
        // while the popup is animating to the new size (matches React's previousContentDimensions).
        const previousContainer = target.querySelector('[data-previous]') as HTMLElement | null;
        if (previousContainer) {
          previousContainer.style.setProperty('--popup-width', `${priorWidth}px`);
        }

        // Wait for new content to be rendered into [data-current] before starting transitions.
        // We use a MutationObserver (fires as a microtask, unthrottled) instead of rAF
        // (throttled to ~1fps in background tabs). The observer detects both element
        // insertions (childList) and text-node changes (characterData), covering all Lit
        // render patterns: element-swapping (→ profile) and in-place text updates (notifications ↔ activity).
        const currentContainer = target.querySelector('[data-current]') as HTMLElement | null;
        if (currentContainer) {
          this._clearWidthObserver();
          this._widthObserver = new MutationObserver(() => {
            this._clearWidthObserver();
            if (!this._root || !target.hasAttribute('data-transitioning')) {return;}
            const currentPopup = this._root.getPopupElement();
            if (!currentPopup) {return;}

            const currentStyled = currentPopup.getStyledElement();

            // Read the locked values committed earlier by setWidthConstraint.
            const lockedWidthStr = currentStyled.style.getPropertyValue('--popup-width');
            const lockedHeightStr = currentStyled.style.getPropertyValue('--popup-height');
            if (!lockedWidthStr) {
              currentPopup.setWidthConstraint(null, null);
            } else {
              // Suppress transitions during measurement to avoid visual glitches.
              currentStyled.style.setProperty('transition', 'none');

              // Mirror React's usePopupAutoResize measurement approach:
              // 1. Set popup to 'auto' (not 'max-content') — 'max-content' in a calc() is
              //    circular/invalid so [data-current]'s width calc breaks; 'auto' also breaks
              //    the calc but lets the element fill its parent naturally.
              // 2. Set positioner to 'max-content' so the popup's containing block is
              //    unconstrained — without this the positioner stays at the old locked px width
              //    and the popup can't grow beyond it, causing too-narrow measurements.
              // 3. Override [data-current]'s width directly so it can size to its content.
              const positionerEl = this._root.getPositionerElement();
              const savedPositionerWidth = positionerEl?.style.getPropertyValue('--positioner-width') ?? '';
              const savedPositionerHeight = positionerEl?.style.getPropertyValue('--positioner-height') ?? '';
              positionerEl?.style.setProperty('--positioner-width', 'max-content');
              positionerEl?.style.setProperty('--positioner-height', 'max-content');
              currentStyled.style.setProperty('--popup-width', 'auto');
              currentStyled.style.setProperty('--popup-height', 'auto');
              currentContainer.style.setProperty('width', 'max-content');
              // Use getBoundingClientRect for sub-pixel precision, matching React's
              // getCssDimensions which uses getComputedStyle(element).width (also fractional).
              // offsetWidth rounds to integers; a 0.3px rounding loss can make the text
              // column just barely too narrow for the content (e.g. "Jason Eventon" wraps).
              const bcr = currentStyled.getBoundingClientRect();
              const naturalWidth = bcr.width;
              const naturalHeight = bcr.height;
              currentContainer.style.removeProperty('width');
              // Restore positioner before committing new popup size.
              positionerEl?.style.setProperty('--positioner-width', savedPositionerWidth);
              positionerEl?.style.setProperty('--positioner-height', savedPositionerHeight);

              // Restore the old locked px values and force a layout to commit them.
              // This makes the CSS transition start from the old px (not from auto/max-content).
              currentStyled.style.setProperty('--popup-width', lockedWidthStr);
              if (lockedHeightStr) {
                currentStyled.style.setProperty('--popup-height', lockedHeightStr);
              }
              void currentStyled.offsetWidth; // commit old px as CSS transition start

              // Re-enable transitions, then set new size — CSS animates old px → new px.
              currentStyled.style.removeProperty('transition');
              currentPopup.setWidthConstraint(naturalWidth, naturalHeight);

              // Lock [data-current] at the new natural width so its content doesn't
              // reflow while the popup animates from old → new size. Without this,
              // [data-current] inherits --popup-width from the popup and re-lays out
              // text at each intermediate width, causing a visible text-wrap flash.
              // Mirrors React's previousContentDimensions pattern for [data-previous].
              currentContainer.style.setProperty('--popup-width', `${naturalWidth}px`);
            }

            // Cancel the fallback timer — we're handling transition start here.
            if (this._startingStyleFrame != null) {
              clearTimeout(this._startingStyleFrame);
              this._startingStyleFrame = null;
            }

            // Ensure the browser has painted [data-current] at opacity:0 (data-starting-style)
            // before we trigger the CSS cross-fade. A setTimeout(0) fires in a new task after
            // any pending paint, guaranteeing the "from" state is committed.
            // Mirrors React's cleanupFrame.request(() => flushSync(() => setShowStartingStyleAttribute(false))).
            const prevEl = previousContainer;
            this._startingStyleFrame = window.setTimeout(() => {
              this._startingStyleFrame = null;
              currentContainer.removeAttribute('data-starting-style');
              if (prevEl?.isConnected) {
                prevEl.setAttribute('data-ending-style', '');
              }
            }, 0);
          });
          // childList catches element insertions (profile panel); characterData catches text
          // node updates (notifications ↔ activity) that Lit performs in-place.
          this._widthObserver.observe(currentContainer, {
            childList: true,
            characterData: true,
            subtree: true,
          });
        }
      }
    } else {
      popup?.setWidthConstraint(null, null);
    }
  }

  private _ensureRenderedElement() {
    if (this.render == null) {
      this._resetRenderedElement();
      this.renderedElement = this;
      return this;
    }

    if (this.renderedElement && this.renderedElement !== this && this.contains(this.renderedElement)) {
      return this.renderedElement;
    }

    const contentNodes =
      this.renderedElement && this.renderedElement !== this
        ? Array.from(this.renderedElement.childNodes)
        : Array.from(this.childNodes).filter((node) => node !== this.renderedElement);
    const template =
      typeof this.render === 'function'
        ? this.render({}, {
            activationDirection: this.getAttribute('data-activation-direction') ?? undefined,
            transitioning: this.hasAttribute('data-transitioning'),
            instant: (this.getAttribute('data-instant') as 'dismiss' | 'click' | null) ?? undefined,
          })
        : this.render;
    const nextRoot = materializeTemplateRoot('popover-viewport', template);

    copyHostAttributes(this, nextRoot, POPOVER_VIEWPORT_OWNER_ATTRIBUTES);
    this.style.display = 'contents';
    this.replaceChildren(nextRoot);
    nextRoot.append(...contentNodes);
    this.renderedElement = nextRoot;
    return nextRoot;
  }

  private _resetRenderedElement() {
    if (this.renderedElement == null || this.renderedElement === this) {
      this.renderedElement = this;
      return;
    }

    const contentNodes = Array.from(this.renderedElement.childNodes);
    this.style.removeProperty('display');
    this.replaceChildren(...contentNodes);
    this.renderedElement = null;
  }

  private _capturePreviousContent(target: HTMLElement) {
    const current = target.querySelector(':scope > [data-current]') as HTMLElement | null;
    const contentSource =
      current ?? this._createSnapshotContainer(Array.from(target.childNodes));

    if (!contentSource || contentSource.childNodes.length === 0) {
      return;
    }

    const previous = document.createElement('div');
    previous.setAttribute('data-previous', '');
    // data-ending-style is NOT set here — it will be added after one frame,
    // simultaneously with data-starting-style removal from [data-current], so
    // both CSS transitions (old content out, new content in) start at the same time.
    previous.style.position = 'absolute';
    previous.setAttribute('inert', '');
    previous.append(
      ...Array.from(contentSource.childNodes).map((node) => node.cloneNode(true)),
    );
    this._pendingPreviousContent = previous;
  }

  private _syncStructure(forcedTarget?: HTMLElement) {
    const target = forcedTarget ?? this._ensureRenderedElement();
    const directChildren = Array.from(target.childNodes);
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

    // Only restructure the DOM when a trigger-switch transition is in progress.
    // Without pending previous content there is no transition — leave bare content
    // nodes unwrapped so [data-current]'s width rule (which depends on --popup-width)
    // never applies on initial open and causes a brief text-fold flash.
    if (!this._pendingPreviousContent) {
      return;
    }

    const nextCurrent =
      current && contentNodes.length === 0
        ? current
        : this._createCurrentContainer(contentNodes);
    const nextPrevious =
      this._pendingPreviousContent ?? previous ?? null;

    this._syncingStructure = true;
    try {
      const nextChildren = nextPrevious ? [nextPrevious, nextCurrent] : [nextCurrent];
      target.replaceChildren(...nextChildren);
    } finally {
      this._syncingStructure = false;
    }

    if (this._pendingRootStateSync) {
      this._pendingRootStateSync = false;
      queueMicrotask(() => {
        if (!this.isConnected || this._syncingStructure) {
          return;
        }

        this._syncFromRootState();
      });
    }

    this._pendingPreviousContent = null;

    if (nextPrevious) {
      target.setAttribute('data-transitioning', '');
      nextCurrent.setAttribute('data-starting-style', '');
      this._clearTransitionTimers();
      // Fallback: if the MutationObserver (content-loaded trigger) doesn't fire
      // within 100ms (e.g. same panel shown again, no Lit DOM update), start the
      // CSS transitions anyway so the UI isn't stuck in the invisible state.
      this._startingStyleFrame = window.setTimeout(() => {
        this._startingStyleFrame = null;
        nextCurrent.removeAttribute('data-starting-style');
        if (nextPrevious.isConnected) {
          nextPrevious.setAttribute('data-ending-style', '');
        }
      }, 100);
      this._transitionCleanupTimer = setTimeout(() => {
        if (nextPrevious.isConnected) {
          nextPrevious.remove();
        }

        target.removeAttribute('data-transitioning');
        // Clear the --popup-width lock set on [data-current] during the transition.
        const currentEl = target.querySelector(':scope > [data-current]') as HTMLElement | null;
        currentEl?.style.removeProperty('--popup-width');
        this._root?.getPopupElement()?.setWidthConstraint(null, null);
        this._transitionCleanupTimer = null;
      }, PopoverViewportElement.TRANSITION_DURATION_MS);
      return;
    }

    target.removeAttribute('data-transitioning');
    this._root?.getPopupElement()?.setWidthConstraint(null, null);
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
      clearTimeout(this._startingStyleFrame);
      this._startingStyleFrame = null;
    }

    this._clearWidthObserver();
  }

  private _clearWidthObserver() {
    if (this._widthObserver != null) {
      this._widthObserver.disconnect();
      this._widthObserver = null;
    }
  }

  private _getActivationDirection(trigger: HTMLElement | null) {
    if (!trigger) {
      this._lastTriggerRect = null;
      return undefined;
    }

    const rect = trigger.getBoundingClientRect();
    const nextRect = {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    };

    const previousRect = this._lastTriggerRect;
    this._lastTriggerRect = nextRect;

    if (!previousRect) {
      return undefined;
    }

    const prevCenterX = previousRect.x + previousRect.width / 2;
    const prevCenterY = previousRect.y + previousRect.height / 2;
    const nextCenterX = nextRect.x + nextRect.width / 2;
    const nextCenterY = nextRect.y + nextRect.height / 2;
    const dx = nextCenterX - prevCenterX;
    const dy = nextCenterY - prevCenterY;
    const directions: string[] = [];
    const tolerance = PopoverViewportElement.ACTIVATION_DIRECTION_TOLERANCE_PX;

    if (Math.abs(dx) > tolerance) {
      directions.push(dx > 0 ? 'right' : 'left');
    }

    if (Math.abs(dy) > tolerance) {
      directions.push(dy > 0 ? 'down' : 'up');
    }

    return directions.length > 0 ? directions.join(' ') : undefined;
  }
}

if (!customElements.get('popover-viewport')) {
  customElements.define('popover-viewport', PopoverViewportElement);
}

// ─── PopoverArrowElement ────────────────────────────────────────────────────────

export class PopoverArrowElement extends BaseHTMLElement {
  private _root: PopoverRootElement | null = null;
  private _handler = () => this._syncAttributes();
  render: PopoverArrowRenderProp | undefined;
  private renderedElement: HTMLElement | null = null;

  connectedCallback() {
    this._root = resolvePopoverRoot(this);
    if (!this._root) {
      console.error(
        'Base UI: Popover parts must be placed within <popover-root>.',
      );
      return;
    }

    const root = this._root;
    root.setArrowElement(this);
    this.setAttribute('aria-hidden', 'true');

    if (this.style.position === '') {
      this.style.position = 'absolute';
    }

    root.addEventListener(POPOVER_STATE_CHANGE_EVENT, this._handler);
    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    const root = this._root;
    if (root) {
      root.setArrowElement(null);
      root.removeEventListener(
        POPOVER_STATE_CHANGE_EVENT,
        this._handler,
      );
    }
    this._root = null;
    this._resetRenderedElement();
  }

  private _syncAttributes() {
    if (!this._root) {return;}
    const ps = this._root.getPositionState();
    const open = this._root.getOpen();
    const target = this._ensureRenderedElement(ps, open);

    target.toggleAttribute('data-open', open);
    target.setAttribute('data-side', ps.side);
    target.setAttribute('data-align', ps.align);
    target.toggleAttribute('data-uncentered', ps.arrowUncentered);
  }

  private _ensureRenderedElement(ps: PopoverPositionState, open: boolean) {
    if (this.render == null) {
      this._resetRenderedElement();
      this.renderedElement = this;
      return this;
    }

    if (this.renderedElement && this.renderedElement !== this && this.contains(this.renderedElement)) {
      return this.renderedElement;
    }

    const contentNodes =
      this.renderedElement && this.renderedElement !== this
        ? Array.from(this.renderedElement.childNodes)
        : Array.from(this.childNodes).filter((node) => node !== this.renderedElement);
    const template =
      typeof this.render === 'function'
        ? this.render({}, {
            side: ps.side,
            align: ps.align,
            anchorHidden: ps.anchorHidden,
            uncentered: ps.arrowUncentered,
            open,
          })
        : this.render;
    const nextRoot = materializeTemplateRoot('popover-arrow', template);

    copyHostAttributes(this, nextRoot, POPOVER_ARROW_OWNER_ATTRIBUTES);
    this.style.display = 'contents';
    this.replaceChildren(nextRoot);
    nextRoot.append(...contentNodes);
    this.renderedElement = nextRoot;
    return nextRoot;
  }

  private _resetRenderedElement() {
    if (this.renderedElement == null || this.renderedElement === this) {
      this.renderedElement = this;
      return;
    }

    const contentNodes = Array.from(this.renderedElement.childNodes);
    this.style.removeProperty('display');
    this.replaceChildren(...contentNodes);
    this.renderedElement = null;
  }
}

if (!customElements.get('popover-arrow')) {
  customElements.define('popover-arrow', PopoverArrowElement);
}

// ─── PopoverBackdropElement ─────────────────────────────────────────────────────

export class PopoverBackdropElement extends BaseHTMLElement {
  private _root: PopoverRootElement | null = null;
  private _handler = () => this._syncVisibility();
  render: PopoverBackdropRenderProp | undefined;
  private renderedElement: HTMLElement | null = null;

  connectedCallback() {
    this._root = resolvePopoverRoot(this);
    if (!this._root) {
      console.error(
        'Base UI: Popover parts must be placed within <popover-root>.',
      );
      return;
    }

    const root = this._root;
    root.setBackdropElement(this);
    this.setAttribute('role', 'presentation');

    root.addEventListener(POPOVER_STATE_CHANGE_EVENT, this._handler);
    this.addEventListener('click', this._handleClick);

    if (!root.getOpen()) {
      this.setAttribute('hidden', '');
    }

    queueMicrotask(() => this._syncVisibility());
  }

  disconnectedCallback() {
    const root = this._root;
    if (root) {
      root.setBackdropElement(null);
      root.removeEventListener(
        POPOVER_STATE_CHANGE_EVENT,
        this._handler,
      );
    }
    this.removeEventListener('click', this._handleClick);
    this._root = null;
    this._resetRenderedElement();
  }

  private _handleClick = (event: MouseEvent) => {
    if (!this._root) {return;}
    if (event.button !== 0) {return;}
    this._root.toggle(false, event, 'outside-press');
  };

  private _syncVisibility() {
    if (!this._root) {return;}
    const open = this._root.getOpen();
    const target = this._ensureRenderedElement({ open });

    if (open) {
      target.removeAttribute('hidden');
    } else {
      target.setAttribute('hidden', '');
    }

    target.toggleAttribute('data-open', open);
    target.toggleAttribute('data-closed', !open);
  }

  private _ensureRenderedElement(state: PopoverBackdropState) {
    if (this.render == null) {
      this._resetRenderedElement();
      this.renderedElement = this;
      return this;
    }

    if (this.renderedElement && this.renderedElement !== this && this.contains(this.renderedElement)) {
      return this.renderedElement;
    }

    const contentNodes =
      this.renderedElement && this.renderedElement !== this
        ? Array.from(this.renderedElement.childNodes)
        : Array.from(this.childNodes).filter((node) => node !== this.renderedElement);
    const template = typeof this.render === 'function' ? this.render({}, state) : this.render;
    const nextRoot = materializeTemplateRoot('popover-backdrop', template);

    copyHostAttributes(this, nextRoot, POPOVER_BACKDROP_OWNER_ATTRIBUTES);
    this.style.display = 'contents';
    this.replaceChildren(nextRoot);
    nextRoot.append(...contentNodes);
    this.renderedElement = nextRoot;
    return nextRoot;
  }

  private _resetRenderedElement() {
    if (this.renderedElement == null || this.renderedElement === this) {
      this.renderedElement = this;
      return;
    }

    const contentNodes = Array.from(this.renderedElement.childNodes);
    this.style.removeProperty('display');
    this.replaceChildren(...contentNodes);
    this.renderedElement = null;
  }
}

if (!customElements.get('popover-backdrop')) {
  customElements.define('popover-backdrop', PopoverBackdropElement);
}

// ─── PopoverTitleElement ────────────────────────────────────────────────────────

export class PopoverTitleElement extends BaseHTMLElement {
  private _root: PopoverRootElement | null = null;
  render: PopoverTitleRenderProp | undefined;
  private renderedElement: HTMLElement | null = null;

  connectedCallback() {
    this._root = resolvePopoverRoot(this);
    if (!this._root) {
      console.error(
        'Base UI: Popover parts must be placed within <popover-root>.',
      );
      return;
    }

    const root = this._root;
    ensureId(this, 'base-ui-popover-title');
    const target = this._ensureRenderedElement();
    root.setTitleId(target.id || this.id);

    if (target.style.display === '') {
      target.style.display = 'block';
    }
  }

  disconnectedCallback() {
    const root = this._root;
    this._root = null;
    const renderedId =
      this.renderedElement && this.renderedElement !== this
        ? this.renderedElement.id || this.id
        : this.id;

    queueMicrotask(() => {
      if (this.isConnected || !root) {
        return;
      }

      if (!renderedId || root.getTitleId() === renderedId) {
        root.setTitleId(undefined);
      }
    });
    this._resetRenderedElement();
  }

  private _ensureRenderedElement() {
    if (this.renderedElement && this.renderedElement !== this && this.contains(this.renderedElement)) {
      return this.renderedElement;
    }

    const contentNodes =
      this.renderedElement && this.renderedElement !== this
        ? Array.from(this.renderedElement.childNodes)
        : Array.from(this.childNodes).filter((node) => node !== this.renderedElement);
    let template: TemplateResult;
    if (this.render == null) {
      template = html`<h2></h2>`;
    } else if (typeof this.render === 'function') {
      template = this.render({}, {});
    } else {
      template = this.render;
    }
    const nextRoot = materializeTemplateRoot('popover-title', template);

    copyHostAttributes(this, nextRoot, POPOVER_LABEL_OWNER_ATTRIBUTES);
    if (!nextRoot.id && this.id) {
      nextRoot.id = this.id;
    }
    this.style.display = 'contents';
    this.replaceChildren(nextRoot);
    nextRoot.append(...contentNodes);
    this.renderedElement = nextRoot;
    return nextRoot;
  }

  private _resetRenderedElement() {
    if (this.renderedElement == null || this.renderedElement === this) {
      this.renderedElement = this;
      return;
    }

    const contentNodes = Array.from(this.renderedElement.childNodes);
    this.style.removeProperty('display');
    this.replaceChildren(...contentNodes);
    this.renderedElement = null;
  }
}

if (!customElements.get('popover-title')) {
  customElements.define('popover-title', PopoverTitleElement);
}

// ─── PopoverDescriptionElement ──────────────────────────────────────────────────

export class PopoverDescriptionElement extends BaseHTMLElement {
  private _root: PopoverRootElement | null = null;
  render: PopoverDescriptionRenderProp | undefined;
  private renderedElement: HTMLElement | null = null;

  connectedCallback() {
    this._root = resolvePopoverRoot(this);
    if (!this._root) {
      console.error(
        'Base UI: Popover parts must be placed within <popover-root>.',
      );
      return;
    }

    const root = this._root;
    ensureId(this, 'base-ui-popover-description');
    const target = this._ensureRenderedElement();
    root.setDescriptionId(target.id || this.id);

    if (target.style.display === '') {
      target.style.display = 'block';
    }
  }

  disconnectedCallback() {
    const root = this._root;
    this._root = null;
    const renderedId =
      this.renderedElement && this.renderedElement !== this
        ? this.renderedElement.id || this.id
        : this.id;

    queueMicrotask(() => {
      if (this.isConnected || !root) {
        return;
      }

      if (!renderedId || root.getDescriptionId() === renderedId) {
        root.setDescriptionId(undefined);
      }
    });
    this._resetRenderedElement();
  }

  private _ensureRenderedElement() {
    if (this.renderedElement && this.renderedElement !== this && this.contains(this.renderedElement)) {
      return this.renderedElement;
    }

    const contentNodes =
      this.renderedElement && this.renderedElement !== this
        ? Array.from(this.renderedElement.childNodes)
        : Array.from(this.childNodes).filter((node) => node !== this.renderedElement);
    let template: TemplateResult;
    if (this.render == null) {
      template = html`<p></p>`;
    } else if (typeof this.render === 'function') {
      template = this.render({}, {});
    } else {
      template = this.render;
    }
    const nextRoot = materializeTemplateRoot('popover-description', template);

    copyHostAttributes(this, nextRoot, POPOVER_LABEL_OWNER_ATTRIBUTES);
    if (!nextRoot.id && this.id) {
      nextRoot.id = this.id;
    }
    this.style.display = 'contents';
    this.replaceChildren(nextRoot);
    nextRoot.append(...contentNodes);
    this.renderedElement = nextRoot;
    return nextRoot;
  }

  private _resetRenderedElement() {
    if (this.renderedElement == null || this.renderedElement === this) {
      this.renderedElement = this;
      return;
    }

    const contentNodes = Array.from(this.renderedElement.childNodes);
    this.style.removeProperty('display');
    this.replaceChildren(...contentNodes);
    this.renderedElement = null;
  }
}

if (!customElements.get('popover-description')) {
  customElements.define('popover-description', PopoverDescriptionElement);
}

// ─── PopoverCloseElement ────────────────────────────────────────────────────────

export class PopoverCloseElement extends BaseHTMLElement {
  /** Whether this close button is disabled. */
  disabled = false;
  nativeButton = true;
  render: PopoverCloseRenderProp | undefined;

  private _root: PopoverRootElement | null = null;
  private renderedElement: HTMLElement | null = null;

  connectedCallback() {
    this._root = resolvePopoverRoot(this);
    if (!this._root) {
      console.error(
        'Base UI: Popover parts must be placed within <popover-root>.',
      );
      return;
    }

    this._root.registerClosePart();

    this.setAttribute('role', 'button');
    this.setAttribute('tabindex', '0');

    this.addEventListener('click', this._handleClick);
    this.addEventListener('keydown', this._handleKeyDown);
    this.addEventListener('keyup', this._handleKeyUp);

    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this._root?.deregisterClosePart();
    this.removeEventListener('click', this._handleClick);
    this.removeEventListener('keydown', this._handleKeyDown);
    this.removeEventListener('keyup', this._handleKeyUp);
    this._root = null;
    this._resetRenderedElement();
  }

  private _handleClick = (event: Event) => {
    if (!this._root || this.disabled) {return;}
    this._root.toggle(false, event, 'close-press');
  };

  private _handleKeyDown = (event: KeyboardEvent) => {
    if (!this._root || this.disabled) {return;}
    if (this.render != null && this.nativeButton) {return;}
    if (event.target !== this._getInteractiveElement()) {return;}

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this._root.toggle(false, event, 'close-press');
    }
  };

  private _handleKeyUp = (event: KeyboardEvent) => {
    if (this.render != null && this.nativeButton) {return;}
    if (event.key === ' ') {event.preventDefault();}
  };

  private _syncAttributes() {
    const target = this._ensureRenderedElement();

    clearOwnedAttributes(this, POPOVER_CLOSE_OWNER_ATTRIBUTES, target);

    target.toggleAttribute('data-disabled', this.disabled);

    const renderedNativeButton = this.render != null && this.nativeButton;

    if (renderedNativeButton) {
      target.removeAttribute('role');
      target.removeAttribute('tabindex');
      target.removeAttribute('aria-disabled');

      if (target instanceof HTMLButtonElement && !target.hasAttribute('type')) {
        target.setAttribute('type', 'button');
      }

      if (this.disabled) {
        target.setAttribute('disabled', '');
      } else {
        target.removeAttribute('disabled');
      }
    } else {
      target.setAttribute('role', 'button');

      if (this.disabled) {
        target.setAttribute('aria-disabled', 'true');
        target.setAttribute('tabindex', '-1');
        target.removeAttribute('disabled');
      } else {
        target.removeAttribute('aria-disabled');
        target.setAttribute('tabindex', '0');
        target.removeAttribute('disabled');
      }
    }
  }

  private _getInteractiveElement() {
    return this.renderedElement ?? this;
  }

  private _ensureRenderedElement(): HTMLElement {
    if (this.render == null) {
      this._resetRenderedElement();
      this.renderedElement = this;
      return this;
    }

    if (
      this.renderedElement &&
      this.renderedElement !== this &&
      this.contains(this.renderedElement)
    ) {
      copyHostAttributes(this, this.renderedElement, POPOVER_CLOSE_OWNER_ATTRIBUTES);
      return this.renderedElement;
    }

    const contentNodes =
      this.renderedElement && this.renderedElement !== this
        ? Array.from(this.renderedElement.childNodes)
        : Array.from(this.childNodes).filter((node) => node !== this.renderedElement);
    const template =
      typeof this.render === 'function'
        ? this.render({}, { disabled: this.disabled })
        : this.render;
    const nextRoot = materializeTemplateRoot('popover-close', template);

    copyHostAttributes(this, nextRoot, POPOVER_CLOSE_OWNER_ATTRIBUTES);
    this.style.display = 'contents';
    this.replaceChildren(nextRoot);
    nextRoot.append(...contentNodes);
    this.renderedElement = nextRoot;
    return nextRoot;
  }

  private _resetRenderedElement() {
    if (this.renderedElement == null || this.renderedElement === this) {
      this.renderedElement = this;
      return;
    }

    const contentNodes = Array.from(this.renderedElement.childNodes);
    this.style.removeProperty('display');
    this.replaceChildren(...contentNodes);
    this.renderedElement = null;
  }
}

if (!customElements.get('popover-close')) {
  customElements.define('popover-close', PopoverCloseElement);
}

function PopoverRootHelper<Payload = unknown>(
  props: PopoverRootProps<Payload>,
) {
  const content =
    typeof props.children === 'function'
      ? props.children({ payload: props.handle?.activePayload })
      : props.children;

  return html`<popover-root
    .defaultOpen=${props.defaultOpen ?? false}
    .open=${props.open}
    .onOpenChange=${props.onOpenChange}
    .onOpenChangeComplete=${props.onOpenChangeComplete}
    .modal=${props.modal ?? false}
    .disablePointerDismissal=${props.disablePointerDismissal ?? false}
    .handle=${props.handle}
    .triggerId=${props.triggerId ?? null}
    .defaultTriggerId=${props.defaultTriggerId ?? null}
    .actionsRef=${props.actionsRef}
  >
    ${content}
  </popover-root>`;
}

function PopoverTriggerHelper<Payload = unknown>(
  props: PopoverTriggerProps<Payload>,
) {
  return html`<popover-trigger
    .disabled=${props.disabled ?? false}
    .nativeButton=${props.nativeButton ?? true}
    .openOnHover=${props.openOnHover ?? false}
    .delay=${props.delay ?? DEFAULT_HOVER_OPEN_DELAY}
    .closeDelay=${props.closeDelay ?? 0}
    .handle=${props.handle}
    .payload=${props.payload}
    .render=${props.render}
    id=${props.id ?? ''}
  >
    ${props.children}
  </popover-trigger>`;
}

function PopoverPortalHelper(props: PopoverPortalProps) {
  return html`<popover-portal .container=${props.container ?? null} .render=${props.render}
    >${props.children}</popover-portal
  >`;
}

function PopoverPositionerHelper(props: PopoverPositionerProps) {
  return html`<popover-positioner
    .side=${props.side ?? 'bottom'}
    .sideOffset=${props.sideOffset ?? 0}
    .align=${props.align ?? 'center'}
    .alignOffset=${props.alignOffset ?? 0}
    .collisionAvoidance=${props.collisionAvoidance}
    .collisionBoundary=${props.collisionBoundary}
    .collisionPadding=${props.collisionPadding ?? 5}
    .arrowPadding=${props.arrowPadding ?? 5}
    .sticky=${props.sticky ?? false}
    .disableAnchorTracking=${props.disableAnchorTracking ?? false}
    .positionMethod=${props.positionMethod ?? 'absolute'}
    .anchor=${props.anchor}
    .render=${props.render}
  >
    ${props.children}
  </popover-positioner>`;
}

function PopoverPopupHelper(props: PopoverPopupProps) {
  return html`<popover-popup
    .render=${props.render}
    .initialFocus=${props.initialFocus}
    .finalFocus=${props.finalFocus}
  >${props.children}</popover-popup>`;
}

function PopoverArrowHelper(props: PopoverArrowProps) {
  return html`<popover-arrow .render=${props.render}>${props.children}</popover-arrow>`;
}

function PopoverBackdropHelper(props: PopoverBackdropProps) {
  return html`<popover-backdrop .render=${props.render}>${props.children}</popover-backdrop>`;
}

function PopoverTitleHelper(props: PopoverTitleProps) {
  return html`<popover-title .render=${props.render}>${props.children}</popover-title>`;
}

function PopoverDescriptionHelper(props: PopoverDescriptionProps) {
  return html`<popover-description .render=${props.render}>${props.children}</popover-description>`;
}

function PopoverCloseHelper(props: PopoverCloseProps) {
  return html`<popover-close
    .disabled=${props.disabled ?? false}
    .nativeButton=${props.nativeButton ?? true}
    .render=${props.render}
  >
    ${props.children}
  </popover-close>`;
}

function PopoverViewportHelper(props: PopoverViewportProps) {
  return html`<popover-viewport .render=${props.render}>${props.children}</popover-viewport>`;
}

// ─── Namespace exports ──────────────────────────────────────────────────────────

export namespace PopoverRoot {
  export type Props<Payload = unknown> = PopoverRootProps<Payload>;
  export type Actions = PopoverRootActions;
  export type ChangeEventReason = PopoverChangeEventReason;
  export type ChangeEventDetails = PopoverChangeEventDetails;
}

export namespace PopoverTrigger {
  export type Props<Payload = unknown> = PopoverTriggerProps<Payload>;
  export type State = PopoverTriggerState;
}
export namespace PopoverPopup {
  export type Props = PopoverPopupProps;
  export type State = PopoverPopupState;
}
export namespace PopoverPositioner {
  export type Props = PopoverPositionerProps;
  export type State = PopoverPositionerState;
}
export namespace PopoverArrow {
  export type Props = PopoverArrowProps;
  export type State = PopoverArrowState;
}
export namespace PopoverBackdrop {
  export type Props = PopoverBackdropProps;
  export type State = PopoverBackdropState;
}
export namespace PopoverTitle {
  export type Props = PopoverTitleProps;
}
export namespace PopoverDescription {
  export type Props = PopoverDescriptionProps;
}
export namespace PopoverClose {
  export type Props = PopoverCloseProps;
  export type State = PopoverCloseState;
}
export namespace PopoverPortal {
  export type Props = PopoverPortalProps;
  export type State = PopoverPortalState;
}
export namespace PopoverViewport {
  export type Props = PopoverViewportProps;
  export type State = PopoverViewportState;
}

export const Popover = {
  Root: PopoverRootHelper,
  Trigger: PopoverTriggerHelper,
  Portal: PopoverPortalHelper,
  Positioner: PopoverPositionerHelper,
  Popup: PopoverPopupHelper,
  Arrow: PopoverArrowHelper,
  Backdrop: PopoverBackdropHelper,
  Title: PopoverTitleHelper,
  Description: PopoverDescriptionHelper,
  Close: PopoverCloseHelper,
  Viewport: PopoverViewportHelper,
  createHandle: createPopoverHandle,
  Handle: PopoverHandle,
} as const;

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
    'popover-viewport': PopoverViewportElement;
  }
}

const POPOVER_TRIGGER_OWNER_ATTRIBUTES = new Set([
  'aria-controls',
  'aria-disabled',
  'aria-expanded',
  'aria-haspopup',
  'data-popup-open',
  'disabled',
  'id',
  'native-button',
  'open-on-hover',
  'delay',
  'close-delay',
  'role',
  'tabindex',
]);
const POPOVER_POPUP_OWNER_ATTRIBUTES = new Set([
  'aria-describedby',
  'aria-labelledby',
  'aria-modal',
  'data-closed',
  'data-ending-style',
  'data-open',
  'data-starting-style',
  'hidden',
  'role',
  'tabindex',
]);
const POPOVER_POSITIONER_OWNER_ATTRIBUTES = new Set([
  'data-align',
  'data-anchor-hidden',
  'data-closed',
  'data-open',
  'data-side',
  'hidden',
  'role',
]);
const POPOVER_VIEWPORT_OWNER_ATTRIBUTES = new Set([
  'data-activation-direction',
  'data-instant',
  'data-transitioning',
]);
const POPOVER_ARROW_OWNER_ATTRIBUTES = new Set([
  'aria-hidden',
  'data-align',
  'data-open',
  'data-side',
  'data-uncentered',
]);
const POPOVER_BACKDROP_OWNER_ATTRIBUTES = new Set([
  'data-closed',
  'data-open',
  'hidden',
  'role',
]);
const POPOVER_LABEL_OWNER_ATTRIBUTES = new Set(['id']);
const POPOVER_CLOSE_OWNER_ATTRIBUTES = new Set([
  'aria-disabled',
  'data-disabled',
  'disabled',
  'native-button',
  'role',
  'tabindex',
]);

function clearOwnedAttributes(
  host: HTMLElement,
  ignoredAttributes: Set<string>,
  target: HTMLElement,
) {
  ignoredAttributes.forEach((attributeName) => {
    if (target !== host) {
      host.removeAttribute(attributeName);
    }
    if (attributeName !== 'id') {
      target.removeAttribute(attributeName);
    }
  });
}

function resolvePopoverRoot(element: HTMLElement): PopoverRootElement | null {
  const closestRoot = element.closest('popover-root') as PopoverRootElement | null;

  if (closestRoot) {
    return closestRoot;
  }

  let current: Node | null = element;

  while (current) {
    if (current instanceof HTMLElement) {
      const stampedRoot = (
        current as typeof current & {
          [POPOVER_ROOT_CONTEXT]?: PopoverRootElement | null | undefined;
        }
      )[POPOVER_ROOT_CONTEXT];

      if (stampedRoot) {
        return stampedRoot;
      }
    }

    current =
      current.parentNode ??
      (current instanceof ShadowRoot ? current.host : null);
  }

  return null;
}

function stampPopoverRootContext(
  node: Node,
  root: PopoverRootElement | null,
) {
  if (!(node instanceof HTMLElement)) {
    return;
  }

  (
    node as typeof node & {
      [POPOVER_ROOT_CONTEXT]?: PopoverRootElement | null | undefined;
    }
  )[POPOVER_ROOT_CONTEXT] = root;

  Array.from(node.children).forEach((child) => {
    stampPopoverRootContext(child, root);
  });
}

function copyHostAttributes(
  host: HTMLElement,
  target: HTMLElement,
  ignoredAttributes: Set<string>,
) {
  let copiedStyle = false;

  Array.from(host.attributes).forEach((attribute) => {
    if (ignoredAttributes.has(attribute.name)) {
      return;
    }

    if (attribute.name === 'style') {
      copiedStyle = true;
      const declarations = Array.from(host.style)
        .filter((propertyName) => propertyName !== 'display')
        .map((propertyName) => {
          const value = host.style.getPropertyValue(propertyName);
          const priority = host.style.getPropertyPriority(propertyName);
          return priority ? `${propertyName}: ${value} !important;` : `${propertyName}: ${value};`;
        })
        .join(' ');

      if (declarations.trim().length > 0) {
        target.setAttribute('style', declarations);
      } else {
        target.removeAttribute('style');
      }
      return;
    }

    target.setAttribute(attribute.name, attribute.value);
  });

  if (!copiedStyle && target.getAttribute('style') != null && target.style.display === '') {
    target.removeAttribute('style');
  }
}

function materializeTemplateRoot(name: string, template: TemplateResult): HTMLElement {
  const container = document.createElement('div');
  renderTemplate(template, container);

  const meaningfulChildren = Array.from(container.childNodes).filter((node) => {
    if (node.nodeType === Node.COMMENT_NODE) {
      return false;
    }

    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent?.trim().length;
    }

    return true;
  });

  if (meaningfulChildren.length !== 1 || !(meaningfulChildren[0] instanceof HTMLElement)) {
    throw new Error(
      `Base UI: \`<${name}>\` render templates must resolve to exactly one HTML element ` +
        'so attributes, ids, and children can be applied correctly. ' +
        'Update the `render` template to return a single root element.',
    );
  }

  return meaningfulChildren[0];
}
