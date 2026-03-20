import { BaseHTMLElement } from '../utils/index.ts';

// ─── Constants ──────────────────────────────────────────────────────────────────

const SCROLL_TIMEOUT = 500;
const MIN_THUMB_SIZE = 16;
const STATE_CHANGE_EVENT = 'base-ui-scroll-area-state-change';

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface ScrollAreaRootState {
  scrolling: boolean;
  hasOverflowX: boolean;
  hasOverflowY: boolean;
  overflowXStart: boolean;
  overflowXEnd: boolean;
  overflowYStart: boolean;
  overflowYEnd: boolean;
  cornerHidden: boolean;
}

export interface ScrollAreaViewportState extends ScrollAreaRootState {}
export interface ScrollAreaContentState extends ScrollAreaRootState {}

export interface ScrollAreaScrollbarState {
  orientation: 'vertical' | 'horizontal';
  scrolling: boolean;
}

export interface ScrollAreaThumbState {
  orientation: 'vertical' | 'horizontal';
}

export interface ScrollAreaCornerState {}

// ─── ScrollAreaRootElement ──────────────────────────────────────────────────────

/**
 * Root container for the scroll area.
 * Renders a `<scroll-area-root>` custom element.
 *
 * Documentation: [Base UI ScrollArea](https://base-ui.com/react/components/scroll-area)
 */
export class ScrollAreaRootElement extends BaseHTMLElement {
  // ── State ──────────────────────────────────────────────────────────────
  private _scrollingX = false;
  private _scrollingY = false;
  private _hovering = false;
  private _hiddenX = true;
  private _hiddenY = true;
  private _overflowXStart = false;
  private _overflowXEnd = false;
  private _overflowYStart = false;
  private _overflowYEnd = false;
  private _scrollTimeoutX: ReturnType<typeof setTimeout> | null = null;
  private _scrollTimeoutY: ReturnType<typeof setTimeout> | null = null;

  // ── Drag state ─────────────────────────────────────────────────────────
  private _thumbDragging = false;
  private _dragOrientation: 'vertical' | 'horizontal' = 'vertical';
  private _startClientPos = 0;
  private _startScrollPos = 0;

  connectedCallback() {
    this.style.position = 'relative';
    this.style.display = 'block';

    this.addEventListener('pointerenter', this._handlePointerEnter);
    this.addEventListener('pointerleave', this._handlePointerLeave);
  }

  disconnectedCallback() {
    this.removeEventListener('pointerenter', this._handlePointerEnter);
    this.removeEventListener('pointerleave', this._handlePointerLeave);
    if (this._scrollTimeoutX) clearTimeout(this._scrollTimeoutX);
    if (this._scrollTimeoutY) clearTimeout(this._scrollTimeoutY);
  }

  // ── Public API ────────────────────────────────────────────────────────

  getViewport(): ScrollAreaViewportElement | null {
    return this.querySelector('scroll-area-viewport') as ScrollAreaViewportElement | null;
  }

  getScrollbar(orientation: 'vertical' | 'horizontal'): ScrollAreaScrollbarElement | null {
    return this.querySelector(
      `scroll-area-scrollbar[data-orientation="${orientation}"]`,
    ) as ScrollAreaScrollbarElement | null;
  }

  getThumb(orientation: 'vertical' | 'horizontal'): ScrollAreaThumbElement | null {
    const scrollbar = this.getScrollbar(orientation);
    return scrollbar?.querySelector('scroll-area-thumb') as ScrollAreaThumbElement | null;
  }

  isHovering(): boolean {
    return this._hovering;
  }

  isScrolling(): boolean {
    return this._scrollingX || this._scrollingY;
  }

  isScrollingX(): boolean {
    return this._scrollingX;
  }

  isScrollingY(): boolean {
    return this._scrollingY;
  }

  isHiddenX(): boolean {
    return this._hiddenX;
  }

  isHiddenY(): boolean {
    return this._hiddenY;
  }

  getOverflowEdges() {
    return {
      xStart: this._overflowXStart,
      xEnd: this._overflowXEnd,
      yStart: this._overflowYStart,
      yEnd: this._overflowYEnd,
    };
  }

  // ── Called by viewport on scroll ───────────────────────────────────────

  handleScroll(axis: 'x' | 'y') {
    if (axis === 'x') {
      this._scrollingX = true;
      if (this._scrollTimeoutX) clearTimeout(this._scrollTimeoutX);
      this._scrollTimeoutX = setTimeout(() => {
        this._scrollingX = false;
        this._syncAttributes();
        this._publishStateChange();
      }, SCROLL_TIMEOUT);
    } else {
      this._scrollingY = true;
      if (this._scrollTimeoutY) clearTimeout(this._scrollTimeoutY);
      this._scrollTimeoutY = setTimeout(() => {
        this._scrollingY = false;
        this._syncAttributes();
        this._publishStateChange();
      }, SCROLL_TIMEOUT);
    }
    this._syncAttributes();
    this._publishStateChange();
  }

  updateOverflowState(
    hiddenX: boolean,
    hiddenY: boolean,
    overflowXStart: boolean,
    overflowXEnd: boolean,
    overflowYStart: boolean,
    overflowYEnd: boolean,
  ) {
    this._hiddenX = hiddenX;
    this._hiddenY = hiddenY;
    this._overflowXStart = overflowXStart;
    this._overflowXEnd = overflowXEnd;
    this._overflowYStart = overflowYStart;
    this._overflowYEnd = overflowYEnd;
    this._syncAttributes();
    this._publishStateChange();
  }

  // ── Thumb drag API ────────────────────────────────────────────────────

  startThumbDrag(event: PointerEvent, orientation: 'vertical' | 'horizontal') {
    this._thumbDragging = true;
    this._dragOrientation = orientation;

    if (orientation === 'vertical') {
      this._startClientPos = event.clientY;
      this._startScrollPos = this.getViewport()?.scrollTop ?? 0;
    } else {
      this._startClientPos = event.clientX;
      this._startScrollPos = this.getViewport()?.scrollLeft ?? 0;
    }
  }

  handleThumbDrag(event: PointerEvent) {
    if (!this._thumbDragging) return;

    const viewport = this.getViewport();
    if (!viewport) return;

    const scrollbar = this.getScrollbar(this._dragOrientation);
    if (!scrollbar) return;

    const thumb = this.getThumb(this._dragOrientation);
    if (!thumb) return;

    if (this._dragOrientation === 'vertical') {
      const delta = event.clientY - this._startClientPos;
      const scrollbarHeight = scrollbar.offsetHeight;
      const thumbHeight = thumb.offsetHeight;
      const maxThumbOffset = scrollbarHeight - thumbHeight;
      if (maxThumbOffset <= 0) return;

      const scrollableHeight = viewport.scrollHeight - viewport.clientHeight;
      const scrollRatio = delta / maxThumbOffset;
      viewport.scrollTop = this._startScrollPos + scrollRatio * scrollableHeight;
    } else {
      const delta = event.clientX - this._startClientPos;
      const scrollbarWidth = scrollbar.offsetWidth;
      const thumbWidth = thumb.offsetWidth;
      const maxThumbOffset = scrollbarWidth - thumbWidth;
      if (maxThumbOffset <= 0) return;

      const scrollableWidth = viewport.scrollWidth - viewport.clientWidth;
      const scrollRatio = delta / maxThumbOffset;
      viewport.scrollLeft = this._startScrollPos + scrollRatio * scrollableWidth;
    }
  }

  endThumbDrag() {
    this._thumbDragging = false;
  }

  // ── Private ───────────────────────────────────────────────────────────

  private _handlePointerEnter = (event: PointerEvent) => {
    if (event.pointerType === 'touch') return;
    this._hovering = true;
    this._syncAttributes();
    this._publishStateChange();
  };

  private _handlePointerLeave = (event: PointerEvent) => {
    if (event.pointerType === 'touch') return;
    this._hovering = false;
    this._syncAttributes();
    this._publishStateChange();
  };

  _syncAttributes() {
    const scrolling = this._scrollingX || this._scrollingY;

    this.toggleAttribute('data-scrolling', scrolling);
    this.toggleAttribute('data-hovering', this._hovering);
    this.toggleAttribute('data-has-overflow-x', !this._hiddenX);
    this.toggleAttribute('data-has-overflow-y', !this._hiddenY);
    this.toggleAttribute('data-overflow-x-start', this._overflowXStart);
    this.toggleAttribute('data-overflow-x-end', this._overflowXEnd);
    this.toggleAttribute('data-overflow-y-start', this._overflowYStart);
    this.toggleAttribute('data-overflow-y-end', this._overflowYEnd);
  }

  private _publishStateChange() {
    this.dispatchEvent(
      new CustomEvent(STATE_CHANGE_EVENT, { bubbles: false, cancelable: false }),
    );
  }
}

if (!customElements.get('scroll-area-root')) {
  customElements.define('scroll-area-root', ScrollAreaRootElement);
}

// ─── ScrollAreaViewportElement ──────────────────────────────────────────────────

/**
 * Scrollable viewport container.
 * Renders a `<scroll-area-viewport>` custom element.
 */
export class ScrollAreaViewportElement extends BaseHTMLElement {
  private _root: ScrollAreaRootElement | null = null;
  private _lastScrollTop = 0;
  private _lastScrollLeft = 0;
  private _handler = () => this._syncAttributes();

  connectedCallback() {
    this._root = this.closest('scroll-area-root') as ScrollAreaRootElement | null;

    this.style.overflow = 'scroll';
    this.tabIndex = 0;

    this.addEventListener('scroll', this._handleScroll);

    if (this._root) {
      this._root.addEventListener(STATE_CHANGE_EVENT, this._handler);
    }

    queueMicrotask(() => {
      this._computeOverflow();
      this._syncAttributes();
    });
  }

  disconnectedCallback() {
    this.removeEventListener('scroll', this._handleScroll);
    this._root?.removeEventListener(STATE_CHANGE_EVENT, this._handler);
    this._root = null;
  }

  private _handleScroll = () => {
    const scrollTop = this.scrollTop;
    const scrollLeft = this.scrollLeft;

    // Determine which axis changed
    if (scrollTop !== this._lastScrollTop) {
      this._root?.handleScroll('y');
    }
    if (scrollLeft !== this._lastScrollLeft) {
      this._root?.handleScroll('x');
    }

    this._lastScrollTop = scrollTop;
    this._lastScrollLeft = scrollLeft;

    this._computeOverflow();
    this._computeThumbPositions();
  };

  private _computeOverflow() {
    if (!this._root) return;

    const hiddenX = this.clientWidth >= this.scrollWidth;
    const hiddenY = this.clientHeight >= this.scrollHeight;

    const maxScrollTop = Math.max(0, this.scrollHeight - this.clientHeight);
    const maxScrollLeft = Math.max(0, this.scrollWidth - this.clientWidth);

    const scrollTop = Math.max(0, Math.min(this.scrollTop, maxScrollTop));
    const scrollLeft = this._normalizeScrollLeft(maxScrollLeft);

    const TOLERANCE = 1;

    const overflowYStart = !hiddenY && scrollTop > TOLERANCE;
    const overflowYEnd = !hiddenY && (maxScrollTop - scrollTop) > TOLERANCE;
    const overflowXStart = !hiddenX && scrollLeft > TOLERANCE;
    const overflowXEnd = !hiddenX && (maxScrollLeft - scrollLeft) > TOLERANCE;

    this._root.updateOverflowState(
      hiddenX, hiddenY,
      overflowXStart, overflowXEnd,
      overflowYStart, overflowYEnd,
    );

    // Set CSS variable metrics on viewport
    this.style.setProperty('--scroll-area-overflow-x-start', `${scrollLeft}px`);
    this.style.setProperty('--scroll-area-overflow-x-end', `${Math.max(0, maxScrollLeft - scrollLeft)}px`);
    this.style.setProperty('--scroll-area-overflow-y-start', `${scrollTop}px`);
    this.style.setProperty('--scroll-area-overflow-y-end', `${Math.max(0, maxScrollTop - scrollTop)}px`);
  }

  private _normalizeScrollLeft(maxScrollLeft: number): number {
    const dir = this._getDirection();
    const rawScrollLeft = this.scrollLeft;

    if (dir === 'rtl') {
      // In RTL, scrollLeft can be negative (Chromium) or max-to-0 (Firefox)
      return Math.abs(rawScrollLeft);
    }
    return Math.max(0, Math.min(rawScrollLeft, maxScrollLeft));
  }

  _computeThumbPositions() {
    if (!this._root) return;

    const viewportWidth = this.clientWidth;
    const viewportHeight = this.clientHeight;
    const scrollWidth = this.scrollWidth;
    const scrollHeight = this.scrollHeight;

    // Vertical thumb
    const vScrollbar = this._root.getScrollbar('vertical');
    const vThumb = this._root.getThumb('vertical');
    if (vScrollbar && vThumb) {
      const ratioY = viewportHeight / scrollHeight;
      const scrollbarHeight = vScrollbar.offsetHeight;
      const thumbHeight = Math.max(MIN_THUMB_SIZE, scrollbarHeight * ratioY);
      const maxThumbOffset = scrollbarHeight - thumbHeight;
      const maxScrollTop = scrollHeight - viewportHeight;
      const scrollRatioY = maxScrollTop > 0 ? this.scrollTop / maxScrollTop : 0;
      const thumbOffsetY = Math.min(maxThumbOffset, Math.max(0, scrollRatioY * maxThumbOffset));

      vScrollbar.style.setProperty('--scroll-area-thumb-height', `${thumbHeight}px`);
      vThumb.style.transform = `translate3d(0, ${thumbOffsetY}px, 0)`;
    }

    // Horizontal thumb
    const hScrollbar = this._root.getScrollbar('horizontal');
    const hThumb = this._root.getThumb('horizontal');
    if (hScrollbar && hThumb) {
      const ratioX = viewportWidth / scrollWidth;
      const scrollbarWidth = hScrollbar.offsetWidth;
      const thumbWidth = Math.max(MIN_THUMB_SIZE, scrollbarWidth * ratioX);
      const maxThumbOffset = scrollbarWidth - thumbWidth;
      const maxScrollLeft = scrollWidth - viewportWidth;
      const scrollRatioX = maxScrollLeft > 0
        ? this._normalizeScrollLeft(maxScrollLeft) / maxScrollLeft
        : 0;
      const thumbOffsetX = Math.min(maxThumbOffset, Math.max(0, scrollRatioX * maxThumbOffset));

      hScrollbar.style.setProperty('--scroll-area-thumb-width', `${thumbWidth}px`);
      hThumb.style.transform = `translate3d(${thumbOffsetX}px, 0, 0)`;
    }
  }

  private _getDirection(): 'ltr' | 'rtl' {
    const scoped = this.closest('[dir]')?.getAttribute('dir');
    const doc = this.ownerDocument.documentElement.getAttribute('dir');
    return scoped === 'rtl' || doc === 'rtl' ? 'rtl' : 'ltr';
  }

  private _syncAttributes() {
    if (!this._root) return;
    const edges = this._root.getOverflowEdges();
    this.toggleAttribute('data-has-overflow-x', !this._root.isHiddenX());
    this.toggleAttribute('data-has-overflow-y', !this._root.isHiddenY());
    this.toggleAttribute('data-overflow-x-start', edges.xStart);
    this.toggleAttribute('data-overflow-x-end', edges.xEnd);
    this.toggleAttribute('data-overflow-y-start', edges.yStart);
    this.toggleAttribute('data-overflow-y-end', edges.yEnd);
    this.toggleAttribute('data-scrolling', this._root.isScrolling());
  }
}

if (!customElements.get('scroll-area-viewport')) {
  customElements.define('scroll-area-viewport', ScrollAreaViewportElement);
}

// ─── ScrollAreaContentElement ───────────────────────────────────────────────────

/**
 * Wrapper for content inside the viewport.
 * Renders a `<scroll-area-content>` custom element.
 */
export class ScrollAreaContentElement extends BaseHTMLElement {
  private _root: ScrollAreaRootElement | null = null;
  private _handler = () => this._syncAttributes();

  connectedCallback() {
    this._root = this.closest('scroll-area-root') as ScrollAreaRootElement | null;

    if (this._root) {
      this._root.addEventListener(STATE_CHANGE_EVENT, this._handler);
    }

    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(STATE_CHANGE_EVENT, this._handler);
    this._root = null;
  }

  private _syncAttributes() {
    if (!this._root) return;
    const edges = this._root.getOverflowEdges();
    this.toggleAttribute('data-has-overflow-x', !this._root.isHiddenX());
    this.toggleAttribute('data-has-overflow-y', !this._root.isHiddenY());
    this.toggleAttribute('data-overflow-x-start', edges.xStart);
    this.toggleAttribute('data-overflow-x-end', edges.xEnd);
    this.toggleAttribute('data-overflow-y-start', edges.yStart);
    this.toggleAttribute('data-overflow-y-end', edges.yEnd);
  }
}

if (!customElements.get('scroll-area-content')) {
  customElements.define('scroll-area-content', ScrollAreaContentElement);
}

// ─── ScrollAreaScrollbarElement ─────────────────────────────────────────────────

/**
 * Scrollbar track that contains the thumb.
 * Renders a `<scroll-area-scrollbar>` custom element.
 */
export class ScrollAreaScrollbarElement extends BaseHTMLElement {
  static get observedAttributes() {
    return ['orientation'];
  }

  orientation: 'vertical' | 'horizontal' = 'vertical';

  /** Keep the scrollbar visible even when not needed. */
  keepMounted = false;

  private _root: ScrollAreaRootElement | null = null;
  private _handler = () => this._syncAttributes();

  attributeChangedCallback(name: string, _old: string | null, val: string | null) {
    if (name === 'orientation' && (val === 'vertical' || val === 'horizontal')) {
      this.orientation = val;
    }
  }

  connectedCallback() {
    this._root = this.closest('scroll-area-root') as ScrollAreaRootElement | null;

    this.style.position = 'absolute';
    this.style.touchAction = 'none';
    this.style.userSelect = 'none';

    if (!this.hasAttribute('orientation')) {
      this.setAttribute('orientation', this.orientation);
    }
    this.setAttribute('data-orientation', this.orientation);

    this.addEventListener('pointerdown', this._handlePointerDown);

    if (this._root) {
      this._root.addEventListener(STATE_CHANGE_EVENT, this._handler);
    }

    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this.removeEventListener('pointerdown', this._handlePointerDown);
    this._root?.removeEventListener(STATE_CHANGE_EVENT, this._handler);
    this._root = null;
  }

  private _handlePointerDown = (event: PointerEvent) => {
    // Only handle clicks on the track itself, not the thumb
    if (event.target !== event.currentTarget) return;
    if (!this._root) return;

    const viewport = this._root.getViewport();
    if (!viewport) return;

    const thumb = this._root.getThumb(this.orientation);
    if (!thumb) return;

    const rect = this.getBoundingClientRect();

    if (this.orientation === 'vertical') {
      const thumbHeight = thumb.offsetHeight;
      const clickY = event.clientY - rect.top - thumbHeight / 2;
      const maxThumbOffset = this.offsetHeight - thumbHeight;
      if (maxThumbOffset <= 0) return;

      const scrollRatio = Math.max(0, Math.min(1, clickY / maxThumbOffset));
      const scrollableHeight = viewport.scrollHeight - viewport.clientHeight;
      viewport.scrollTop = scrollRatio * scrollableHeight;
    } else {
      const thumbWidth = thumb.offsetWidth;
      const clickX = event.clientX - rect.left - thumbWidth / 2;
      const maxThumbOffset = this.offsetWidth - thumbWidth;
      if (maxThumbOffset <= 0) return;

      const scrollRatio = Math.max(0, Math.min(1, clickX / maxThumbOffset));
      const scrollableWidth = viewport.scrollWidth - viewport.clientWidth;
      viewport.scrollLeft = scrollRatio * scrollableWidth;
    }
  };

  private _syncAttributes() {
    if (!this._root) return;

    const isVertical = this.orientation === 'vertical';
    const scrolling = isVertical ? this._root.isScrollingY() : this._root.isScrollingX();
    const edges = this._root.getOverflowEdges();

    this.toggleAttribute('data-scrolling', scrolling);
    this.toggleAttribute('data-hovering', this._root.isHovering());

    if (isVertical) {
      this.toggleAttribute('data-has-overflow-y', !this._root.isHiddenY());
      this.toggleAttribute('data-overflow-y-start', edges.yStart);
      this.toggleAttribute('data-overflow-y-end', edges.yEnd);
    } else {
      this.toggleAttribute('data-has-overflow-x', !this._root.isHiddenX());
      this.toggleAttribute('data-overflow-x-start', edges.xStart);
      this.toggleAttribute('data-overflow-x-end', edges.xEnd);
    }
  }
}

if (!customElements.get('scroll-area-scrollbar')) {
  customElements.define('scroll-area-scrollbar', ScrollAreaScrollbarElement);
}

// ─── ScrollAreaThumbElement ─────────────────────────────────────────────────────

/**
 * Draggable scroll thumb indicator.
 * Renders a `<scroll-area-thumb>` custom element.
 */
export class ScrollAreaThumbElement extends BaseHTMLElement {
  private _root: ScrollAreaRootElement | null = null;
  private _scrollbar: ScrollAreaScrollbarElement | null = null;

  connectedCallback() {
    this._root = this.closest('scroll-area-root') as ScrollAreaRootElement | null;
    this._scrollbar = this.closest('scroll-area-scrollbar') as ScrollAreaScrollbarElement | null;

    this.addEventListener('pointerdown', this._handlePointerDown);

    // Size is controlled via CSS variables set by the viewport
    if (this._scrollbar?.orientation === 'vertical') {
      this.style.height = 'var(--scroll-area-thumb-height, 0px)';
    } else {
      this.style.width = 'var(--scroll-area-thumb-width, 0px)';
    }
  }

  disconnectedCallback() {
    this.removeEventListener('pointerdown', this._handlePointerDown);
    document.removeEventListener('pointermove', this._handlePointerMove);
    document.removeEventListener('pointerup', this._handlePointerUp);
    this._root = null;
    this._scrollbar = null;
  }

  private _handlePointerDown = (event: PointerEvent) => {
    if (!this._root || !this._scrollbar) return;

    event.preventDefault();
    event.stopPropagation();

    this._root.startThumbDrag(event, this._scrollbar.orientation);
    (event.target as Element).setPointerCapture(event.pointerId);

    document.addEventListener('pointermove', this._handlePointerMove);
    document.addEventListener('pointerup', this._handlePointerUp);
  };

  private _handlePointerMove = (event: PointerEvent) => {
    event.preventDefault();
    this._root?.handleThumbDrag(event);
  };

  private _handlePointerUp = (event: PointerEvent) => {
    (event.target as Element).releasePointerCapture?.(event.pointerId);
    this._root?.endThumbDrag();

    document.removeEventListener('pointermove', this._handlePointerMove);
    document.removeEventListener('pointerup', this._handlePointerUp);
  };
}

if (!customElements.get('scroll-area-thumb')) {
  customElements.define('scroll-area-thumb', ScrollAreaThumbElement);
}

// ─── ScrollAreaCornerElement ────────────────────────────────────────────────────

/**
 * Corner element at the intersection of two scrollbars.
 * Renders a `<scroll-area-corner>` custom element.
 */
export class ScrollAreaCornerElement extends BaseHTMLElement {
  private _root: ScrollAreaRootElement | null = null;
  private _handler = () => this._syncAttributes();

  connectedCallback() {
    this._root = this.closest('scroll-area-root') as ScrollAreaRootElement | null;

    this.style.position = 'absolute';
    this.style.bottom = '0';
    this.style.insetInlineEnd = '0';

    if (this._root) {
      this._root.addEventListener(STATE_CHANGE_EVENT, this._handler);
    }

    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(STATE_CHANGE_EVENT, this._handler);
    this._root = null;
  }

  private _syncAttributes() {
    if (!this._root) return;

    // Corner is only visible when both scrollbars are present
    const hidden = this._root.isHiddenX() || this._root.isHiddenY();
    this.toggleAttribute('hidden', hidden);

    if (!hidden) {
      // Size matches scrollbar dimensions
      const vScrollbar = this._root.getScrollbar('vertical');
      const hScrollbar = this._root.getScrollbar('horizontal');

      if (vScrollbar && hScrollbar) {
        const width = vScrollbar.offsetWidth;
        const height = hScrollbar.offsetHeight;
        this.style.width = `${width}px`;
        this.style.height = `${height}px`;
        this.style.setProperty('--scroll-area-corner-width', `${width}px`);
        this.style.setProperty('--scroll-area-corner-height', `${height}px`);
      }
    }
  }
}

if (!customElements.get('scroll-area-corner')) {
  customElements.define('scroll-area-corner', ScrollAreaCornerElement);
}

// ─── Namespace & Tag declarations ───────────────────────────────────────────────

export namespace ScrollAreaRoot {
  export type State = ScrollAreaRootState;
}

export namespace ScrollAreaViewport {
  export type State = ScrollAreaViewportState;
}

export namespace ScrollAreaContent {
  export type State = ScrollAreaContentState;
}

export namespace ScrollAreaScrollbar {
  export type State = ScrollAreaScrollbarState;
}

export namespace ScrollAreaThumb {
  export type State = ScrollAreaThumbState;
}

export namespace ScrollAreaCorner {
  export type State = ScrollAreaCornerState;
}

declare global {
  interface HTMLElementTagNameMap {
    'scroll-area-root': ScrollAreaRootElement;
    'scroll-area-viewport': ScrollAreaViewportElement;
    'scroll-area-content': ScrollAreaContentElement;
    'scroll-area-scrollbar': ScrollAreaScrollbarElement;
    'scroll-area-thumb': ScrollAreaThumbElement;
    'scroll-area-corner': ScrollAreaCornerElement;
  }
}
