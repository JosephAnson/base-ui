import { BaseHTMLElement } from '../utils/index.ts';
import type { MenuRootElement, MenuPositionerElement } from '../menu/index.ts';

// ─── Constants ──────────────────────────────────────────────────────────────────

const CONTEXT_MENU_ROOT_ATTRIBUTE = 'data-base-ui-context-menu-root';
const LONG_PRESS_DELAY = 500;
const TOUCH_MOVE_THRESHOLD = 10;

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface ContextMenuRootState {
  /**
   * Whether the context menu is currently open.
   */
  open: boolean;
}

export interface ContextMenuTriggerState {
  /**
   * Whether the context menu is currently open.
   */
  open: boolean;
}

// ─── Virtual anchor helper ──────────────────────────────────────────────────────

function createVirtualAnchor(x: number, y: number, size = 0) {
  return {
    getBoundingClientRect: () =>
      new DOMRect(x, y, size, size),
  };
}

// ─── ContextMenuRootElement ─────────────────────────────────────────────────────

/**
 * Groups context menu components. Does not render its own element — uses `display: contents`.
 *
 * Documentation: [Base UI Context Menu](https://base-ui.com/react/components/context-menu)
 */
export class ContextMenuRootElement extends BaseHTMLElement {
  static get observedAttributes() {
    return ['disabled'];
  }

  disabled = false;

  /** Callback fired when the open state changes. */
  onOpenChange: ((open: boolean, event: Event) => void) | undefined;

  attributeChangedCallback(name: string, _old: string | null, value: string | null) {
    if (name === 'disabled') {
      this.disabled = value !== null;
    }
  }

  private _menuRoot: MenuRootElement | null = null;
  private _virtualAnchor: { getBoundingClientRect: () => DOMRect } | null = null;
  private _initialCursorPoint: { x: number; y: number } | null = null;
  private _allowMouseUpTrigger = false;
  private _mouseUpHandler: ((e: MouseEvent) => void) | null = null;

  connectedCallback() {
    this.style.display = 'contents';
    this.setAttribute(CONTEXT_MENU_ROOT_ATTRIBUTE, '');
  }

  disconnectedCallback() {
    this._removeMouseUpListener();
    this._menuRoot = null;
  }

  /** Returns the child menu-root element. */
  getMenuRoot(): MenuRootElement | null {
    if (!this._menuRoot || !this._menuRoot.isConnected) {
      this._menuRoot = this.querySelector('menu-root') as MenuRootElement | null;
    }
    return this._menuRoot;
  }

  /** Returns the virtual anchor at the cursor position. */
  getVirtualAnchor(): { getBoundingClientRect: () => DOMRect } | null {
    return this._virtualAnchor;
  }

  /** Opens the context menu at the given cursor coordinates. */
  openAtPoint(x: number, y: number, event: Event, isTouchEvent = false) {
    if (this.disabled) return;

    const menuRoot = this.getMenuRoot();
    if (!menuRoot) return;

    this._initialCursorPoint = { x, y };
    this._virtualAnchor = createVirtualAnchor(x, y, isTouchEvent ? 10 : 0);

    // Set the virtual anchor on the positioner
    const positioner = menuRoot.querySelector('menu-positioner') as MenuPositionerElement | null;
    if (positioner) {
      positioner.anchor = this._virtualAnchor;
    }

    menuRoot.toggle(true, event, 'trigger-press');
    this.onOpenChange?.(true, event);

    // Set up mouseup handling
    this._allowMouseUpTrigger = false;
    this._removeMouseUpListener();

    this._mouseUpHandler = (e: MouseEvent) => {
      if (!this._allowMouseUpTrigger) {
        // Still within the initial delay — let menu stay open
        this._allowMouseUpTrigger = true;
        return;
      }

      // Check if mouseup is at the initial cursor point (where menu spawned)
      if (this._initialCursorPoint) {
        const dx = Math.abs(e.clientX - this._initialCursorPoint.x);
        const dy = Math.abs(e.clientY - this._initialCursorPoint.y);
        if (dx < 2 && dy < 2) {
          // Mouse hasn't moved from spawn point — ignore
          return;
        }
      }

      // Check if mouseup is inside the positioner
      if (positioner && positioner.contains(e.target as Node)) {
        return;
      }

      // Close the menu
      menuRoot.toggle(false, e, 'outside-press');
      this.onOpenChange?.(false, e);
      this._removeMouseUpListener();
    };

    this.ownerDocument.addEventListener('mouseup', this._mouseUpHandler);

    // Allow mouseup to trigger close after the delay
    setTimeout(() => {
      this._allowMouseUpTrigger = true;
    }, LONG_PRESS_DELAY);
  }

  private _removeMouseUpListener() {
    if (this._mouseUpHandler) {
      this.ownerDocument?.removeEventListener('mouseup', this._mouseUpHandler);
      this._mouseUpHandler = null;
    }
  }
}

if (!customElements.get('context-menu-root')) {
  customElements.define('context-menu-root', ContextMenuRootElement);
}

// ─── ContextMenuTriggerElement ──────────────────────────────────────────────────

/**
 * An area that opens the context menu on right-click or long press.
 * Renders a `<context-menu-trigger>` custom element.
 *
 * Documentation: [Base UI Context Menu](https://base-ui.com/react/components/context-menu)
 */
export class ContextMenuTriggerElement extends BaseHTMLElement {
  static get observedAttributes() {
    return ['disabled'];
  }

  disabled = false;

  attributeChangedCallback(name: string, _old: string | null, value: string | null) {
    if (name === 'disabled') {
      this.disabled = value !== null;
    }
  }

  private _root: ContextMenuRootElement | null = null;
  private _longPressTimeout: ReturnType<typeof setTimeout> | null = null;
  private _touchStartPos: { x: number; y: number } | null = null;

  connectedCallback() {
    this._root = this.closest('context-menu-root') as ContextMenuRootElement | null;

    this.addEventListener('contextmenu', this._handleContextMenu);
    this.addEventListener('touchstart', this._handleTouchStart, { passive: true });
    this.addEventListener('touchmove', this._handleTouchMove, { passive: true });
    this.addEventListener('touchend', this._handleTouchEnd);
    this.addEventListener('touchcancel', this._handleTouchEnd);

    this.style.webkitTouchCallout = 'none';
    this._syncAttributes();
  }

  disconnectedCallback() {
    this.removeEventListener('contextmenu', this._handleContextMenu);
    this.removeEventListener('touchstart', this._handleTouchStart);
    this.removeEventListener('touchmove', this._handleTouchMove);
    this.removeEventListener('touchend', this._handleTouchEnd);
    this.removeEventListener('touchcancel', this._handleTouchEnd);
    this._clearLongPressTimeout();
    this._root = null;
  }

  private _syncAttributes() {
    const open = this._root?.getMenuRoot()?.getOpen() ?? false;
    this.toggleAttribute('data-popup-open', open);
  }

  private _handleContextMenu = (event: MouseEvent) => {
    if (this.disabled || this._root?.disabled) {
      // Don't prevent default when disabled — allow native context menu
      return;
    }

    event.preventDefault();

    this._root?.openAtPoint(event.clientX, event.clientY, event);
    this._syncAttributes();
  };

  private _handleTouchStart = (event: TouchEvent) => {
    if (this.disabled || this._root?.disabled) return;

    const touch = event.touches[0];
    if (!touch) return;

    this._touchStartPos = { x: touch.clientX, y: touch.clientY };
    this._clearLongPressTimeout();

    this._longPressTimeout = setTimeout(() => {
      if (this._touchStartPos) {
        this._root?.openAtPoint(
          this._touchStartPos.x,
          this._touchStartPos.y,
          event,
          true,
        );
        this._syncAttributes();
      }
      this._touchStartPos = null;
    }, LONG_PRESS_DELAY);
  };

  private _handleTouchMove = (event: TouchEvent) => {
    if (!this._touchStartPos) return;

    const touch = event.touches[0];
    if (!touch) return;

    const dx = Math.abs(touch.clientX - this._touchStartPos.x);
    const dy = Math.abs(touch.clientY - this._touchStartPos.y);

    if (dx > TOUCH_MOVE_THRESHOLD || dy > TOUCH_MOVE_THRESHOLD) {
      this._clearLongPressTimeout();
      this._touchStartPos = null;
    }
  };

  private _handleTouchEnd = () => {
    this._clearLongPressTimeout();
    this._touchStartPos = null;
  };

  private _clearLongPressTimeout() {
    if (this._longPressTimeout != null) {
      clearTimeout(this._longPressTimeout);
      this._longPressTimeout = null;
    }
  }
}

if (!customElements.get('context-menu-trigger')) {
  customElements.define('context-menu-trigger', ContextMenuTriggerElement);
}

// ─── Namespace & Tag declarations ───────────────────────────────────────────────

export namespace ContextMenuRoot {
  export type State = ContextMenuRootState;
}

export namespace ContextMenuTrigger {
  export type State = ContextMenuTriggerState;
}

declare global {
  interface HTMLElementTagNameMap {
    'context-menu-root': ContextMenuRootElement;
    'context-menu-trigger': ContextMenuTriggerElement;
  }
}
