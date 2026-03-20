import { ReactiveElement } from 'lit';

// ─── Constants ──────────────────────────────────────────────────────────────────

const MENUBAR_ROOT_ATTRIBUTE = 'data-base-ui-menubar-root';
const TRIGGER_SELECTOR = '[aria-haspopup="menu"]';
const POPUP_SELECTOR = '[role="menu"]';
const MENUBAR_STATE_CHANGE_EVENT = 'base-ui-menubar-state-change';

type MenubarOrientation = 'horizontal' | 'vertical';

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface MenubarRootState {
  /**
   * The orientation of the menubar.
   */
  orientation: MenubarOrientation;
  /**
   * Whether the menubar is modal.
   */
  modal: boolean;
  /**
   * Whether any submenu within the menubar is open.
   */
  hasSubmenuOpen: boolean;
}

// ─── MenubarRootElement ─────────────────────────────────────────────────────────

/**
 * The container for menus.
 */
export class MenubarRootElement extends ReactiveElement {
  static properties = {
    disabled: { type: Boolean },
  };

  declare disabled: boolean;

  modal = true;
  loopFocus = true;
  orientation: MenubarOrientation = 'horizontal';

  private _hasSubmenuOpen = false;
  private _isClosingOtherMenus = false;
  private _lastFocusedTrigger: HTMLElement | null = null;
  private _nativeButtonDisabledState = new WeakMap<HTMLButtonElement, boolean>();
  private _mutationObserver: MutationObserver | null = null;
  private _rootListenersCleanup: (() => void) | null = null;
  private _documentListenersCleanup: (() => void) | null = null;
  private _lockedBodyOverflow: string | null = null;
  private _lastPublishedStateKey: string | null = null;

  constructor() {
    super();
    this.disabled = false;
  }

  override createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();
    this.style.display = 'contents';
    this.setAttribute(MENUBAR_ROOT_ATTRIBUTE, '');
    this.setAttribute('role', 'menubar');
    this.setAttribute('data-orientation', this.orientation);
    this.setAttribute('data-has-submenu-open', 'false');
    this._setupListeners();
    queueMicrotask(() => {
      this._syncTriggersAndState();
      this._publishStateChange();
    });
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this._cleanup();
    this._lastFocusedTrigger = null;
    this._hasSubmenuOpen = false;
    this._lockedBodyOverflow = null;
    this._lastPublishedStateKey = null;
  }

  protected override updated() {
    this._syncTriggersAndState();
    this._publishStateChange();
  }

  // ── Public API ──────────────────────────────────────────────────────────

  getHasSubmenuOpen(): boolean {
    return this._hasSubmenuOpen;
  }

  // ── Setup / teardown ────────────────────────────────────────────────────

  private _setupListeners() {
    this._mutationObserver = new MutationObserver(() => {
      this._syncTriggersAndState();
    });
    this._mutationObserver.observe(this, {
      attributes: true,
      attributeFilter: ['aria-expanded'],
      childList: true,
      subtree: true,
    });

    const handleFocusIn = (event: FocusEvent) => {
      const trigger = this._findTopLevelTrigger(event.target);
      if (!trigger) return;
      this._lastFocusedTrigger = trigger;
      this._syncTriggerTabIndices();
    };

    const handlePointerMove = (event: MouseEvent) => {
      if (this.disabled) return;
      const trigger = this._findTopLevelTrigger(event.target);
      if (!trigger || this._isTriggerExpanded(trigger) || !this._hasSubmenuOpen) return;

      const relatedTarget = event.relatedTarget;
      if (relatedTarget instanceof Node && trigger.contains(relatedTarget)) return;

      this._openTriggerByHover(trigger);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || this.disabled) return;

      const trigger = this._findTopLevelTrigger(event.target);
      if (!trigger) return;

      const delta = this._getNavigationDelta(event.key);
      if (delta == null) return;

      const nextTrigger = this._getRelativeTrigger(trigger, delta);
      if (!nextTrigger) return;

      event.preventDefault();
      this._lastFocusedTrigger = nextTrigger;
      nextTrigger.focus({ preventScroll: true });
      this._syncTriggerTabIndices();

      if (this._hasSubmenuOpen) {
        this._openTrigger(nextTrigger, true);
      }
    };

    const handleClick = (event: MouseEvent) => {
      if (this.disabled || this._isClosingOtherMenus) return;
      const trigger = this._findTopLevelTrigger(event.target);
      if (!trigger) return;
      // Close other open menus when a trigger is directly clicked
      this._isClosingOtherMenus = true;
      this._closeOtherOpenMenus(trigger);
      this._isClosingOtherMenus = false;
    };

    this.addEventListener('focusin', handleFocusIn);
    this.addEventListener('click', handleClick);
    this.addEventListener('keydown', handleKeyDown);
    this.addEventListener('mousemove', handlePointerMove);
    this.addEventListener('mouseover', handlePointerMove);

    this._rootListenersCleanup = () => {
      this.removeEventListener('focusin', handleFocusIn);
      this.removeEventListener('click', handleClick);
      this.removeEventListener('keydown', handleKeyDown);
      this.removeEventListener('mousemove', handlePointerMove);
      this.removeEventListener('mouseover', handlePointerMove);
    };

    this._syncDocumentListeners();
  }

  private _cleanup() {
    this._mutationObserver?.disconnect();
    this._mutationObserver = null;
    this._rootListenersCleanup?.();
    this._rootListenersCleanup = null;
    this._documentListenersCleanup?.();
    this._documentListenersCleanup = null;
    this._syncScrollLock(false);
  }

  // ── Document-level keyboard nav ─────────────────────────────────────────

  private _syncDocumentListeners() {
    this._documentListenersCleanup?.();
    this._documentListenersCleanup = null;

    const handleDocumentKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || this.disabled) return;

      const context = this._resolvePopupContext();
      if (!context) return;

      const forwardKey = this._getForwardKey();
      const backwardKey = this._getBackwardKey();

      if (event.key === forwardKey) {
        const activeElement = this.ownerDocument.activeElement;
        if (
          activeElement instanceof HTMLElement &&
          activeElement.getAttribute('aria-haspopup') === 'menu' &&
          activeElement.getAttribute('aria-expanded') !== 'true'
        ) {
          return;
        }

        event.preventDefault();
        this._navigateOpenTree(context.topLevelTrigger, 1);
        return;
      }

      if (event.key === backwardKey && !context.isNested) {
        event.preventDefault();
        this._navigateOpenTree(context.topLevelTrigger, -1);
      }
    };

    this.ownerDocument.addEventListener('keydown', handleDocumentKeyDown);
    this._documentListenersCleanup = () => {
      this.ownerDocument.removeEventListener('keydown', handleDocumentKeyDown);
    };
  }

  // ── Trigger/state sync ──────────────────────────────────────────────────

  private _syncTriggersAndState() {
    const triggers = this._getTopLevelTriggers();

    triggers.forEach((trigger) => {
      trigger.setAttribute('role', 'menuitem');
      trigger.setAttribute('data-orientation', this.orientation);

      if (this.modal) {
        trigger.setAttribute('data-modal', '');
      } else {
        trigger.removeAttribute('data-modal');
      }

      if (trigger instanceof HTMLButtonElement) {
        if (this.disabled) {
          if (!this._nativeButtonDisabledState.has(trigger)) {
            this._nativeButtonDisabledState.set(trigger, trigger.disabled);
          }
          trigger.disabled = true;
        } else if (this._nativeButtonDisabledState.has(trigger)) {
          trigger.disabled = this._nativeButtonDisabledState.get(trigger) ?? false;
          this._nativeButtonDisabledState.delete(trigger);
        }
      } else {
        // Custom element triggers: use aria-disabled
        if (this.disabled) {
          trigger.setAttribute('aria-disabled', 'true');
        } else {
          trigger.removeAttribute('aria-disabled');
        }
      }
    });

    // Propagate disabled to child menu-root elements so their triggers respect it
    this._syncMenuRootsDisabled();

    const nextHasSubmenuOpen = triggers.some((t) => this._isTriggerExpanded(t));

    if (this._hasSubmenuOpen !== nextHasSubmenuOpen) {
      this._hasSubmenuOpen = nextHasSubmenuOpen;
      this._syncDocumentListeners();
      this._syncScrollLock(this._hasSubmenuOpen);
      this._publishStateChange();
    } else {
      this._syncScrollLock(this._hasSubmenuOpen);
    }

    this._syncTriggerTabIndices();
  }

  private _syncTriggerTabIndices() {
    const triggers = this._getEnabledTriggers();
    if (triggers.length === 0) return;

    const activeElement = this.ownerDocument.activeElement;
    if (activeElement instanceof HTMLElement && triggers.includes(activeElement)) {
      this._lastFocusedTrigger = activeElement;
    }

    const currentTrigger =
      (this._lastFocusedTrigger != null && triggers.includes(this._lastFocusedTrigger)
        ? this._lastFocusedTrigger
        : null) ?? triggers[0];

    triggers.forEach((trigger) => {
      trigger.tabIndex = trigger === currentTrigger ? 0 : -1;
    });
  }

  private _syncScrollLock(locked: boolean) {
    const body = this.ownerDocument.body;
    if (!this.modal) locked = false;

    if (locked) {
      if (this._lockedBodyOverflow == null) {
        this._lockedBodyOverflow = body.style.overflow;
      }
      body.style.overflow = 'hidden';
      return;
    }

    if (this._lockedBodyOverflow != null) {
      body.style.overflow = this._lockedBodyOverflow;
      this._lockedBodyOverflow = null;
    }
  }

  private _syncMenuRootsDisabled() {
    const menuRoots = this.querySelectorAll<HTMLElement>('menu-root');
    menuRoots.forEach((root) => {
      if (this.disabled) {
        root.setAttribute('disabled', '');
        (root as any).disabled = true;
      } else {
        root.removeAttribute('disabled');
        (root as any).disabled = false;
      }
    });
  }

  // ── Trigger query helpers ───────────────────────────────────────────────

  private _findTopLevelTrigger(target: EventTarget | null): HTMLElement | null {
    if (!(target instanceof Node)) return null;

    const closestTrigger =
      target instanceof Element
        ? (target.closest(TRIGGER_SELECTOR) as HTMLElement | null)
        : null;

    if (!closestTrigger || !this.contains(closestTrigger)) return null;

    // Only return top-level triggers (not submenu triggers inside a popup)
    if (closestTrigger.closest(POPUP_SELECTOR)) return null;

    return closestTrigger;
  }

  private _getTopLevelTriggers(): HTMLElement[] {
    return Array.from(this.querySelectorAll<HTMLElement>(TRIGGER_SELECTOR)).filter((trigger) => {
      // Exclude triggers that are inside a menu popup (submenu triggers)
      return !trigger.closest(POPUP_SELECTOR);
    });
  }

  private _getEnabledTriggers(): HTMLElement[] {
    return this._getTopLevelTriggers().filter((trigger) => {
      return (
        !trigger.hasAttribute('disabled') && trigger.getAttribute('aria-disabled') !== 'true'
      );
    });
  }

  private _getRelativeTrigger(current: HTMLElement, delta: number): HTMLElement | null {
    const triggers = this._getEnabledTriggers();
    if (triggers.length === 0) return null;

    const currentIndex = triggers.indexOf(current);
    if (currentIndex === -1) return triggers[0];

    const proposed = currentIndex + delta;
    if (proposed < 0) {
      return this.loopFocus ? triggers[triggers.length - 1] : triggers[0];
    }
    if (proposed >= triggers.length) {
      return this.loopFocus ? triggers[0] : triggers[triggers.length - 1];
    }
    return triggers[proposed];
  }

  // ── Open/close/hover helpers ────────────────────────────────────────────

  private _openTriggerByHover(trigger: HTMLElement) {
    this._openTrigger(trigger, false);
  }

  private _navigateOpenTree(currentTrigger: HTMLElement, delta: number) {
    const nextTrigger = this._getRelativeTrigger(currentTrigger, delta);
    if (!nextTrigger) return;
    this._openTrigger(nextTrigger, true);
  }

  private _openTrigger(trigger: HTMLElement, focusFirstItem: boolean) {
    this._closeOtherOpenMenus(trigger);
    this._lastFocusedTrigger = trigger;
    this._syncTriggerTabIndices();
    setTimeout(() => {
      trigger.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }),
      );

      if (focusFirstItem) {
        this._scheduleFocusFirstItem(trigger);
      }
    }, 0);
  }

  private _scheduleFocusFirstItem(trigger: HTMLElement, attempt = 0) {
    const popupId = trigger.getAttribute('aria-controls');
    const popup = popupId ? this.ownerDocument.getElementById(popupId) : null;
    const firstItem = popup?.querySelector<HTMLElement>(
      '[role^="menuitem"]:not([aria-disabled="true"]):not([disabled])',
    );

    if (firstItem) {
      firstItem.focus({ preventScroll: true });
      return;
    }

    if (attempt >= 3) return;
    setTimeout(() => this._scheduleFocusFirstItem(trigger, attempt + 1), 0);
  }

  private _closeOtherOpenMenus(nextTrigger: HTMLElement) {
    this._getTopLevelTriggers().forEach((trigger) => {
      if (trigger === nextTrigger || !this._isTriggerExpanded(trigger)) return;
      trigger.click();
    });
  }

  private _resolvePopupContext() {
    const activeElement = this.ownerDocument.activeElement;
    if (!(activeElement instanceof HTMLElement)) return null;

    const popup = activeElement.closest(POPUP_SELECTOR) as HTMLElement | null;
    if (!popup) return null;

    const topLevelTrigger = this._getTopLevelTriggers().find((t) => this._isTriggerExpanded(t));
    if (!topLevelTrigger) return null;

    return {
      isNested: topLevelTrigger.getAttribute('aria-controls') !== popup.id,
      topLevelTrigger,
    };
  }

  private _isTriggerExpanded(trigger: HTMLElement): boolean {
    return trigger.getAttribute('aria-expanded') === 'true';
  }

  // ── Keyboard direction helpers ──────────────────────────────────────────

  private _getNavigationDelta(key: string): number | null {
    if (this.orientation === 'vertical') {
      if (key === 'ArrowDown') return 1;
      if (key === 'ArrowUp') return -1;
      return null;
    }

    if (key === this._getForwardKey()) return 1;
    if (key === this._getBackwardKey()) return -1;
    return null;
  }

  private _getDirection(): 'ltr' | 'rtl' {
    const scoped = this.closest('[dir]')?.getAttribute('dir');
    const doc = this.ownerDocument.documentElement.getAttribute('dir');
    return scoped === 'rtl' || doc === 'rtl' ? 'rtl' : 'ltr';
  }

  private _getForwardKey(): string {
    if (this.orientation === 'vertical') return 'ArrowDown';
    return this._getDirection() === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
  }

  private _getBackwardKey(): string {
    if (this.orientation === 'vertical') return 'ArrowUp';
    return this._getDirection() === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
  }

  // ── State change publishing ─────────────────────────────────────────────

  private _publishStateChange() {
    const nextKey = `${this.orientation}|${this.modal}|${this._hasSubmenuOpen}`;
    if (this._lastPublishedStateKey === nextKey) return;
    this._lastPublishedStateKey = nextKey;

    this.setAttribute('data-orientation', this.orientation);
    this.setAttribute('data-has-submenu-open', String(this._hasSubmenuOpen));

    this.dispatchEvent(
      new CustomEvent(MENUBAR_STATE_CHANGE_EVENT, { bubbles: false, cancelable: false }),
    );
  }
}

if (!customElements.get('menubar-root')) {
  customElements.define('menubar-root', MenubarRootElement);
}
