import { ReactiveElement } from 'lit';
import { BaseHTMLElement, ensureId } from '../utils/index.ts';

// ─── Constants ──────────────────────────────────────────────────────────────────

const DRAWER_ROOT_ATTRIBUTE = 'data-base-ui-drawer-root';
const DRAWER_STATE_CHANGE_EVENT = 'base-ui-drawer-state-change';
const DRAWER_PROVIDER_STATE_CHANGE_EVENT = 'base-ui-drawer-provider-state-change';

const DEFAULT_SWIPE_OPEN_RATIO = 0.5;
const VELOCITY_THRESHOLD = 0.1;
const MIN_SWIPE_THRESHOLD = 10;

// ─── Types ──────────────────────────────────────────────────────────────────────

type SwipeDirection = 'up' | 'down' | 'left' | 'right';
type TransitionStatus = 'starting' | 'ending' | undefined;

export type DrawerChangeEventReason =
  | 'trigger-press'
  | 'outside-press'
  | 'escape-key'
  | 'close-press'
  | 'focus-out'
  | 'swipe'
  | 'none';

export interface DrawerChangeEventDetails {
  reason: DrawerChangeEventReason;
  event: Event;
  readonly isCanceled: boolean;
  cancel(): void;
}

export interface DrawerRootState {
  open: boolean;
  modal: boolean;
  transitionStatus: TransitionStatus;
  swipeDirection: SwipeDirection;
}

export interface DrawerTriggerState {
  open: boolean;
}

export interface DrawerPopupState extends DrawerRootState {}
export interface DrawerBackdropState extends DrawerRootState {}
export interface DrawerContentState {}

export interface DrawerCloseState {
  disabled: boolean;
}

export interface DrawerViewportState {
  swipeDirection: SwipeDirection;
}

export interface DrawerSwipeAreaState {
  swipeDirection: SwipeDirection;
  open: boolean;
}

export interface DrawerProviderState {
  active: boolean;
}

export interface DrawerIndentState {
  active: boolean;
}

export interface DrawerIndentBackgroundState {
  active: boolean;
}

// ─── Open drawer stack (for nested drawer/dialog dismissal) ─────────────────

const openDrawerStack: DrawerRootElement[] = [];

function pushOpenDrawer(root: DrawerRootElement) {
  const idx = openDrawerStack.indexOf(root);
  if (idx !== -1) openDrawerStack.splice(idx, 1);
  openDrawerStack.push(root);
}

function removeOpenDrawer(root: DrawerRootElement) {
  const idx = openDrawerStack.indexOf(root);
  if (idx !== -1) openDrawerStack.splice(idx, 1);
}

function getTopmostOpenDrawer(): DrawerRootElement | null {
  return openDrawerStack.at(-1) ?? null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function createChangeEventDetails(
  reason: DrawerChangeEventReason,
  event: Event,
): DrawerChangeEventDetails {
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

function isHorizontalSwipe(dir: SwipeDirection): boolean {
  return dir === 'left' || dir === 'right';
}

// ─── DrawerRootElement ──────────────────────────────────────────────────────────

/**
 * Groups all parts of the drawer.
 * Renders a `<drawer-root>` custom element (display:contents).
 *
 * Documentation: [Base UI Drawer](https://base-ui.com/react/components/drawer)
 */
export class DrawerRootElement extends ReactiveElement {
  static properties = {
    modal: { type: Boolean },
    disabled: { type: Boolean },
  };

  declare modal: boolean;
  declare disabled: boolean;

  /** Default open state (uncontrolled). */
  defaultOpen = false;

  /** Whether to prevent dismissal from outside pointer events. */
  disablePointerDismissal = false;

  /** Callback when open state changes. */
  onOpenChange:
    | ((open: boolean, details: DrawerChangeEventDetails) => void)
    | undefined;

  /** The direction in which the drawer can be swiped to dismiss. */
  swipeDirection: SwipeDirection = 'down';

  // Controlled/uncontrolled open
  private _open: boolean | undefined;
  private _openIsControlled = false;
  private _internalOpen = false;
  private _initialized = false;
  private _transitionStatus: TransitionStatus = undefined;
  private _lastPublishedStateKey: string | null = null;

  // Swipe tracking
  private _swiping = false;

  // Registered part IDs
  private _popupId: string | undefined;
  private _titleId: string | undefined;
  private _descriptionId: string | undefined;

  // Provider reference
  private _provider: DrawerProviderElement | null = null;

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
    this._syncAttributes();
    this._publishStateChange();
    this._notifyProvider();
  }

  constructor() {
    super();
    this.modal = true;
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
    this.setAttribute(DRAWER_ROOT_ATTRIBUTE, '');

    document.addEventListener('keydown', this._handleEscapeKey);

    // Find provider
    this._provider = this.closest('drawer-provider') as DrawerProviderElement | null;
    this._notifyProvider();

    this._syncOpenStack();
    this._syncAttributes();
    queueMicrotask(() => this._publishStateChange());
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('keydown', this._handleEscapeKey);
    removeOpenDrawer(this);
    this._lastPublishedStateKey = null;
    this._transitionStatus = undefined;
    this._notifyProvider();
    this._provider = null;
  }

  protected override updated() {
    this._syncOpenStack();
    this._syncAttributes();
    this._publishStateChange();
  }

  getOpen(): boolean {
    return this._openIsControlled ? Boolean(this._open) : this._internalOpen;
  }

  getState(): DrawerRootState {
    return {
      open: this.getOpen(),
      modal: this.modal,
      transitionStatus: this._transitionStatus,
      swipeDirection: this.swipeDirection,
    };
  }

  getSwipeDirection(): SwipeDirection {
    return this.swipeDirection;
  }

  getSwiping(): boolean {
    return this._swiping;
  }

  setSwiping(swiping: boolean) {
    if (this._swiping === swiping) return;
    this._swiping = swiping;
    this._publishStateChange();
  }

  getPopupId(): string | undefined {
    return this._popupId;
  }

  setPopupId(id: string | undefined) {
    if (this._popupId === id) return;
    this._popupId = id;
    this._publishStateChange();
  }

  getTitleId(): string | undefined {
    return this._titleId;
  }

  setTitleId(id: string | undefined) {
    if (this._titleId === id) return;
    this._titleId = id;
    this._publishStateChange();
  }

  getDescriptionId(): string | undefined {
    return this._descriptionId;
  }

  setDescriptionId(id: string | undefined) {
    if (this._descriptionId === id) return;
    this._descriptionId = id;
    this._publishStateChange();
  }

  setTransitionStatus(status: TransitionStatus) {
    if (this._transitionStatus === status) return;
    this._transitionStatus = status;
    this._syncAttributes();
    this._publishStateChange();
  }

  toggle(nextOpen: boolean, event: Event, reason: DrawerChangeEventReason) {
    // For close operations, check if we're the topmost drawer
    if (
      !nextOpen &&
      (reason === 'outside-press' || reason === 'escape-key') &&
      getTopmostOpenDrawer() !== this
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

    // Check for non-main button clicks on backdrop
    if (
      !nextOpen &&
      reason === 'outside-press' &&
      event instanceof MouseEvent &&
      event.button !== 0
    ) {
      return;
    }

    const details = createChangeEventDetails(reason, event);
    this.onOpenChange?.(nextOpen, details);

    if (details.isCanceled) return;

    if (!this._openIsControlled) {
      this._internalOpen = nextOpen;
    }

    this._syncOpenStack();
    this._syncAttributes();
    this._publishStateChange();
    this._notifyProvider();
  }

  private _handleEscapeKey = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    if (!this.getOpen()) return;

    // Only the topmost open drawer should handle Escape
    if (getTopmostOpenDrawer() !== this) return;

    event.preventDefault();
    this.toggle(false, event, 'escape-key');
  };

  private _syncOpenStack() {
    if (this.getOpen()) {
      pushOpenDrawer(this);
    } else {
      removeOpenDrawer(this);
    }
  }

  private _syncAttributes() {
    const state = this.getState();
    this.toggleAttribute('data-open', state.open);
    this.toggleAttribute('data-closed', !state.open);
    this.setAttribute('data-swipe-direction', state.swipeDirection);
  }

  private _publishStateChange() {
    const nextKey = [
      this.getOpen() ? 'open' : 'closed',
      this.modal ? 'modal' : 'non-modal',
      this._transitionStatus ?? 'idle',
      this.swipeDirection,
      this._swiping ? 'swiping' : 'still',
      this._popupId ?? '',
      this._titleId ?? '',
      this._descriptionId ?? '',
    ].join('|');

    if (nextKey === this._lastPublishedStateKey) return;
    this._lastPublishedStateKey = nextKey;
    this.dispatchEvent(new CustomEvent(DRAWER_STATE_CHANGE_EVENT));
  }

  private _notifyProvider() {
    if (!this._provider) return;
    this._provider._drawerStateChanged(this);
  }
}

if (!customElements.get('drawer-root')) {
  customElements.define('drawer-root', DrawerRootElement);
}

// ─── DrawerTriggerElement ───────────────────────────────────────────────────────

/**
 * A button that opens the drawer.
 * Renders a `<drawer-trigger>` custom element.
 *
 * Documentation: [Base UI Drawer](https://base-ui.com/react/components/drawer)
 */
export class DrawerTriggerElement extends BaseHTMLElement {
  private _root: DrawerRootElement | null = null;
  private _handler = () => this._syncAttributes();

  connectedCallback() {
    this._root = this.closest('drawer-root') as DrawerRootElement | null;
    if (!this._root) {
      console.error(
        'Base UI: Drawer parts must be placed within <drawer-root>.',
      );
      return;
    }

    this.setAttribute('role', 'button');
    this.setAttribute('tabindex', '0');

    this._root.addEventListener(DRAWER_STATE_CHANGE_EVENT, this._handler);

    this.addEventListener('click', this._handleClick);
    this.addEventListener('keydown', this._handleKeyDown);
    this.addEventListener('keyup', this._handleKeyUp);

    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(DRAWER_STATE_CHANGE_EVENT, this._handler);
    this.removeEventListener('click', this._handleClick);
    this.removeEventListener('keydown', this._handleKeyDown);
    this.removeEventListener('keyup', this._handleKeyUp);
    this._root = null;
  }

  private _handleClick = (event: Event) => {
    if (!this._root) return;
    this._root.toggle(!this._root.getOpen(), event, 'trigger-press');
  };

  private _handleKeyDown = (event: KeyboardEvent) => {
    if (!this._root) return;
    if (event.target !== this) return;

    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      this._root.toggle(!this._root.getOpen(), event, 'trigger-press');
    }
  };

  private _handleKeyUp = (event: KeyboardEvent) => {
    if (event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
    }
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

if (!customElements.get('drawer-trigger')) {
  customElements.define('drawer-trigger', DrawerTriggerElement);
}

// ─── DrawerPortalElement ────────────────────────────────────────────────────────

/**
 * A portal that renders drawer content.
 * Renders a `<drawer-portal>` custom element (display:contents).
 *
 * Documentation: [Base UI Drawer](https://base-ui.com/react/components/drawer)
 */
export class DrawerPortalElement extends BaseHTMLElement {
  private _root: DrawerRootElement | null = null;
  private _handler = () => this._syncVisibility();

  connectedCallback() {
    this._root = this.closest('drawer-root') as DrawerRootElement | null;
    if (!this._root) {
      console.error(
        'Base UI: Drawer parts must be placed within <drawer-root>.',
      );
      return;
    }

    this.style.display = 'contents';
    this._root.addEventListener(DRAWER_STATE_CHANGE_EVENT, this._handler);

    queueMicrotask(() => this._syncVisibility());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(DRAWER_STATE_CHANGE_EVENT, this._handler);
    this._root = null;
  }

  private _syncVisibility() {
    if (!this._root) return;
    const open = this._root.getOpen();
    this.toggleAttribute('data-open', open);
    this.toggleAttribute('data-closed', !open);
  }
}

if (!customElements.get('drawer-portal')) {
  customElements.define('drawer-portal', DrawerPortalElement);
}

// ─── DrawerPopupElement ─────────────────────────────────────────────────────────

/**
 * The drawer popup panel.
 * Renders a `<drawer-popup>` custom element.
 *
 * Documentation: [Base UI Drawer](https://base-ui.com/react/components/drawer)
 */
export class DrawerPopupElement extends BaseHTMLElement {
  private _root: DrawerRootElement | null = null;
  private _handler = () => this._handleStateChange();
  private _mounted = false;
  private _transitionStatus: TransitionStatus = undefined;
  private _lastOpen: boolean | null = null;
  private _frameId: number | null = null;
  private _exitRunId = 0;
  private _resizeObserver: ResizeObserver | null = null;

  connectedCallback() {
    this._root = this.closest('drawer-root') as DrawerRootElement | null;
    if (!this._root) {
      console.error(
        'Base UI: Drawer parts must be placed within <drawer-root>.',
      );
      return;
    }

    ensureId(this, 'base-ui-drawer-popup');
    this._root.setPopupId(this.id);

    this._root.addEventListener(DRAWER_STATE_CHANGE_EVENT, this._handler);

    // Set up ResizeObserver for height tracking
    if (typeof ResizeObserver !== 'undefined') {
      this._resizeObserver = new ResizeObserver(() => {
        // Height changes can be used for nested drawer coordination
      });
      this._resizeObserver.observe(this);
    }

    // Immediately hide if closed
    if (!this._root.getOpen()) {
      this.setAttribute('hidden', '');
    }

    queueMicrotask(() => this._handleStateChange());
  }

  disconnectedCallback() {
    this._clearFrame();
    this._resizeObserver?.disconnect();
    this._resizeObserver = null;
    if (this._root) {
      this._root.setPopupId(undefined);
      this._root.setTransitionStatus(undefined);
      this._root.removeEventListener(DRAWER_STATE_CHANGE_EVENT, this._handler);
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
    const state = this._root.getState();
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

    // ARIA attributes
    this.setAttribute('role', 'dialog');
    if (state.modal) {
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
    this.toggleAttribute('data-starting-style', this._transitionStatus === 'starting');
    this.toggleAttribute('data-ending-style', this._transitionStatus === 'ending');
    this.setAttribute('data-swipe-direction', state.swipeDirection);

    // Swiping state
    const swiping = this._root.getSwiping();
    this.toggleAttribute('data-swiping', swiping);

    // Update root's transition status
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
      (globalThis as typeof globalThis & { BASE_UI_ANIMATIONS_DISABLED?: boolean })
        .BASE_UI_ANIMATIONS_DISABLED
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

if (!customElements.get('drawer-popup')) {
  customElements.define('drawer-popup', DrawerPopupElement);
}

// ─── DrawerBackdropElement ──────────────────────────────────────────────────────

/**
 * A backdrop that covers the page behind the drawer.
 * Renders a `<drawer-backdrop>` custom element.
 *
 * Documentation: [Base UI Drawer](https://base-ui.com/react/components/drawer)
 */
export class DrawerBackdropElement extends BaseHTMLElement {
  private _root: DrawerRootElement | null = null;
  private _handler = () => this._syncVisibility();

  connectedCallback() {
    this._root = this.closest('drawer-root') as DrawerRootElement | null;
    if (!this._root) {
      console.error(
        'Base UI: Drawer parts must be placed within <drawer-root>.',
      );
      return;
    }

    this.setAttribute('role', 'presentation');

    this._root.addEventListener(DRAWER_STATE_CHANGE_EVENT, this._handler);

    this.addEventListener('click', this._handleClick);

    // Immediately hide if closed
    if (!this._root.getOpen()) {
      this.setAttribute('hidden', '');
    }

    queueMicrotask(() => this._syncVisibility());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(DRAWER_STATE_CHANGE_EVENT, this._handler);
    this.removeEventListener('click', this._handleClick);
    this._root = null;
  }

  private _handleClick = (event: MouseEvent) => {
    if (!this._root) return;

    // Only main button (left click)
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

    const state = this._root.getState();
    this.toggleAttribute('data-starting-style', state.transitionStatus === 'starting');
    this.toggleAttribute('data-ending-style', state.transitionStatus === 'ending');
  }
}

if (!customElements.get('drawer-backdrop')) {
  customElements.define('drawer-backdrop', DrawerBackdropElement);
}

// ─── DrawerTitleElement ─────────────────────────────────────────────────────────

/**
 * A title for the drawer.
 * Renders a `<drawer-title>` custom element.
 *
 * Documentation: [Base UI Drawer](https://base-ui.com/react/components/drawer)
 */
export class DrawerTitleElement extends BaseHTMLElement {
  private _root: DrawerRootElement | null = null;

  connectedCallback() {
    this._root = this.closest('drawer-root') as DrawerRootElement | null;
    if (!this._root) {
      console.error(
        'Base UI: Drawer parts must be placed within <drawer-root>.',
      );
      return;
    }

    ensureId(this, 'base-ui-drawer-title');
    this._root.setTitleId(this.id);
  }

  disconnectedCallback() {
    this._root?.setTitleId(undefined);
    this._root = null;
  }
}

if (!customElements.get('drawer-title')) {
  customElements.define('drawer-title', DrawerTitleElement);
}

// ─── DrawerDescriptionElement ───────────────────────────────────────────────────

/**
 * A description for the drawer.
 * Renders a `<drawer-description>` custom element.
 *
 * Documentation: [Base UI Drawer](https://base-ui.com/react/components/drawer)
 */
export class DrawerDescriptionElement extends BaseHTMLElement {
  private _root: DrawerRootElement | null = null;

  connectedCallback() {
    this._root = this.closest('drawer-root') as DrawerRootElement | null;
    if (!this._root) {
      console.error(
        'Base UI: Drawer parts must be placed within <drawer-root>.',
      );
      return;
    }

    ensureId(this, 'base-ui-drawer-description');
    this._root.setDescriptionId(this.id);
  }

  disconnectedCallback() {
    this._root?.setDescriptionId(undefined);
    this._root = null;
  }
}

if (!customElements.get('drawer-description')) {
  customElements.define('drawer-description', DrawerDescriptionElement);
}

// ─── DrawerCloseElement ─────────────────────────────────────────────────────────

/**
 * A button that closes the drawer.
 * Renders a `<drawer-close>` custom element.
 *
 * Documentation: [Base UI Drawer](https://base-ui.com/react/components/drawer)
 */
export class DrawerCloseElement extends BaseHTMLElement {
  /** Whether this close button is disabled. */
  disabled = false;

  private _root: DrawerRootElement | null = null;

  connectedCallback() {
    this._root = this.closest('drawer-root') as DrawerRootElement | null;
    if (!this._root) {
      console.error(
        'Base UI: Drawer parts must be placed within <drawer-root>.',
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

    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      this._root.toggle(false, event, 'close-press');
    }
  };

  private _handleKeyUp = (event: KeyboardEvent) => {
    if (event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
    }
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

if (!customElements.get('drawer-close')) {
  customElements.define('drawer-close', DrawerCloseElement);
}

// ─── DrawerContentElement ───────────────────────────────────────────────────────

/**
 * A content wrapper inside the drawer popup.
 * Renders a `<drawer-content>` custom element.
 *
 * Documentation: [Base UI Drawer](https://base-ui.com/react/components/drawer)
 */
export class DrawerContentElement extends BaseHTMLElement {
  connectedCallback() {
    this.setAttribute('data-drawer-content', '');
  }
}

if (!customElements.get('drawer-content')) {
  customElements.define('drawer-content', DrawerContentElement);
}

// ─── DrawerViewportElement ──────────────────────────────────────────────────────

/**
 * A viewport that wraps the drawer content and handles swipe-to-dismiss gestures.
 * Renders a `<drawer-viewport>` custom element.
 *
 * Documentation: [Base UI Drawer](https://base-ui.com/react/components/drawer)
 */
export class DrawerViewportElement extends BaseHTMLElement {
  private _root: DrawerRootElement | null = null;
  private _handler = () => this._syncAttributes();

  // Swipe tracking state
  private _startX = 0;
  private _startY = 0;
  private _startTime = 0;
  private _currentX = 0;
  private _currentY = 0;
  private _dragging = false;
  private _locked = false;
  private _pointerId: number | null = null;

  connectedCallback() {
    this._root = this.closest('drawer-root') as DrawerRootElement | null;
    if (!this._root) {
      console.error(
        'Base UI: Drawer parts must be placed within <drawer-root>.',
      );
      return;
    }

    this._root.addEventListener(DRAWER_STATE_CHANGE_EVENT, this._handler);

    this.addEventListener('pointerdown', this._handlePointerDown);
    this.addEventListener('pointermove', this._handlePointerMove);
    this.addEventListener('pointerup', this._handlePointerUp);
    this.addEventListener('pointercancel', this._handlePointerCancel);

    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(DRAWER_STATE_CHANGE_EVENT, this._handler);
    this.removeEventListener('pointerdown', this._handlePointerDown);
    this.removeEventListener('pointermove', this._handlePointerMove);
    this.removeEventListener('pointerup', this._handlePointerUp);
    this.removeEventListener('pointercancel', this._handlePointerCancel);
    this._resetSwipeState();
    this._root = null;
  }

  private _handlePointerDown = (event: PointerEvent) => {
    if (!this._root || !this._root.getOpen()) return;
    if (event.button !== 0) return;

    // Check for swipe-ignore
    const target = event.target as HTMLElement;
    if (target.closest('[data-base-ui-swipe-ignore], [data-swipe-ignore]')) return;

    this._startX = event.clientX;
    this._startY = event.clientY;
    this._currentX = event.clientX;
    this._currentY = event.clientY;
    this._startTime = Date.now();
    this._dragging = true;
    this._locked = false;
    this._pointerId = event.pointerId;

    try {
      this.setPointerCapture(event.pointerId);
    } catch {
      // setPointerCapture may not be available in JSDOM
    }
  };

  private _handlePointerMove = (event: PointerEvent) => {
    if (!this._dragging || !this._root) return;
    if (event.pointerId !== this._pointerId) return;

    this._currentX = event.clientX;
    this._currentY = event.clientY;

    const dx = this._currentX - this._startX;
    const dy = this._currentY - this._startY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // Lock direction after threshold
    if (!this._locked && (absDx > MIN_SWIPE_THRESHOLD || absDy > MIN_SWIPE_THRESHOLD)) {
      this._locked = true;

      const swipeDir = this._root.getSwipeDirection();
      const isHoriz = isHorizontalSwipe(swipeDir);

      // If motion is primarily in the wrong axis, cancel swipe
      if (isHoriz && absDy > absDx) {
        this._dragging = false;
        return;
      }
      if (!isHoriz && absDx > absDy) {
        this._dragging = false;
        return;
      }
    }

    if (this._locked) {
      const swipeDir = this._root.getSwipeDirection();
      const movement = this._getSwipeMovement(swipeDir);

      // Only allow dismissal direction movement
      if (movement > 0) {
        this._root.setSwiping(true);

        // Apply CSS variables for swipe animation
        const popup = this._root.querySelector('drawer-popup') as HTMLElement | null;
        if (popup) {
          if (isHorizontalSwipe(swipeDir)) {
            popup.style.setProperty('--drawer-popup-swipe-movement-x', `${movement}px`);
            popup.style.setProperty('--drawer-popup-swipe-movement-y', '0px');
          } else {
            popup.style.setProperty('--drawer-popup-swipe-movement-x', '0px');
            popup.style.setProperty('--drawer-popup-swipe-movement-y', `${movement}px`);
          }
        }
      }
    }
  };

  private _handlePointerUp = (event: PointerEvent) => {
    if (!this._dragging || !this._root) return;
    if (event.pointerId !== this._pointerId) return;

    const swipeDir = this._root.getSwipeDirection();
    const movement = this._getSwipeMovement(swipeDir);
    const elapsed = (Date.now() - this._startTime) / 1000; // seconds
    const velocity = elapsed > 0 ? movement / elapsed / 1000 : 0; // m/s (px/ms)

    // Clear CSS variables
    const popup = this._root.querySelector('drawer-popup') as HTMLElement | null;
    if (popup) {
      popup.style.removeProperty('--drawer-popup-swipe-movement-x');
      popup.style.removeProperty('--drawer-popup-swipe-movement-y');
    }

    this._root.setSwiping(false);

    // Check if swipe was significant enough to dismiss
    if (this._locked && movement > 0) {
      const popupSize = this._getPopupSize(swipeDir);
      const threshold = popupSize > 0 ? popupSize * DEFAULT_SWIPE_OPEN_RATIO : MIN_SWIPE_THRESHOLD * 5;

      if (movement > threshold || velocity > VELOCITY_THRESHOLD) {
        this._root.toggle(false, event, 'swipe');
      }
    }

    this._resetSwipeState();
  };

  private _handlePointerCancel = () => {
    if (!this._root) return;

    // Clear CSS variables
    const popup = this._root.querySelector('drawer-popup') as HTMLElement | null;
    if (popup) {
      popup.style.removeProperty('--drawer-popup-swipe-movement-x');
      popup.style.removeProperty('--drawer-popup-swipe-movement-y');
    }

    this._root.setSwiping(false);
    this._resetSwipeState();
  };

  private _getSwipeMovement(dir: SwipeDirection): number {
    const dx = this._currentX - this._startX;
    const dy = this._currentY - this._startY;

    switch (dir) {
      case 'down':
        return dy;
      case 'up':
        return -dy;
      case 'right':
        return dx;
      case 'left':
        return -dx;
    }
  }

  private _getPopupSize(dir: SwipeDirection): number {
    const popup = this._root?.querySelector('drawer-popup') as HTMLElement | null;
    if (!popup) return 0;

    if (isHorizontalSwipe(dir)) {
      return popup.offsetWidth || 0;
    }
    return popup.offsetHeight || 0;
  }

  private _resetSwipeState() {
    this._dragging = false;
    this._locked = false;
    this._pointerId = null;
  }

  private _syncAttributes() {
    if (!this._root) return;
    this.setAttribute('data-swipe-direction', this._root.getSwipeDirection());
  }
}

if (!customElements.get('drawer-viewport')) {
  customElements.define('drawer-viewport', DrawerViewportElement);
}

// ─── DrawerSwipeAreaElement ─────────────────────────────────────────────────────

/**
 * An invisible area outside the drawer that detects swipe gestures to open the drawer.
 * Renders a `<drawer-swipe-area>` custom element.
 *
 * Documentation: [Base UI Drawer](https://base-ui.com/react/components/drawer)
 */
export class DrawerSwipeAreaElement extends BaseHTMLElement {
  private _root: DrawerRootElement | null = null;
  private _handler = () => this._syncAttributes();

  // Swipe tracking
  private _startX = 0;
  private _startY = 0;
  private _currentX = 0;
  private _currentY = 0;
  private _dragging = false;
  private _locked = false;
  private _pointerId: number | null = null;

  connectedCallback() {
    this._root = this.closest('drawer-root') as DrawerRootElement | null;
    if (!this._root) {
      console.error(
        'Base UI: Drawer parts must be placed within <drawer-root>.',
      );
      return;
    }

    this._root.addEventListener(DRAWER_STATE_CHANGE_EVENT, this._handler);

    this.addEventListener('pointerdown', this._handlePointerDown);
    this.addEventListener('pointermove', this._handlePointerMove);
    this.addEventListener('pointerup', this._handlePointerUp);
    this.addEventListener('pointercancel', this._handlePointerCancel);

    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(DRAWER_STATE_CHANGE_EVENT, this._handler);
    this.removeEventListener('pointerdown', this._handlePointerDown);
    this.removeEventListener('pointermove', this._handlePointerMove);
    this.removeEventListener('pointerup', this._handlePointerUp);
    this.removeEventListener('pointercancel', this._handlePointerCancel);
    this._resetSwipeState();
    this._root = null;
  }

  private _handlePointerDown = (event: PointerEvent) => {
    if (!this._root) return;
    // Only open when drawer is closed
    if (this._root.getOpen()) return;
    if (event.button !== 0) return;

    this._startX = event.clientX;
    this._startY = event.clientY;
    this._currentX = event.clientX;
    this._currentY = event.clientY;
    this._dragging = true;
    this._locked = false;
    this._pointerId = event.pointerId;

    try {
      this.setPointerCapture(event.pointerId);
    } catch {
      // setPointerCapture may not be available in JSDOM
    }
  };

  private _handlePointerMove = (event: PointerEvent) => {
    if (!this._dragging || !this._root) return;
    if (event.pointerId !== this._pointerId) return;

    this._currentX = event.clientX;
    this._currentY = event.clientY;

    const dx = this._currentX - this._startX;
    const dy = this._currentY - this._startY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (!this._locked && (absDx > MIN_SWIPE_THRESHOLD || absDy > MIN_SWIPE_THRESHOLD)) {
      this._locked = true;

      const swipeDir = this._root.getSwipeDirection();
      const isHoriz = isHorizontalSwipe(swipeDir);

      // Wrong axis cancels swipe
      if (isHoriz && absDy > absDx) {
        this._dragging = false;
        return;
      }
      if (!isHoriz && absDx > absDy) {
        this._dragging = false;
        return;
      }
    }

    if (this._locked) {
      this.toggleAttribute('data-swiping', true);
    }
  };

  private _handlePointerUp = (event: PointerEvent) => {
    if (!this._dragging || !this._root) return;
    if (event.pointerId !== this._pointerId) return;

    if (this._locked) {
      const swipeDir = this._root.getSwipeDirection();
      const movement = this._getOpenMovement(swipeDir);

      if (movement > MIN_SWIPE_THRESHOLD) {
        this._root.toggle(true, event, 'swipe');
      }
    }

    this.removeAttribute('data-swiping');
    this._resetSwipeState();
  };

  private _handlePointerCancel = () => {
    this.removeAttribute('data-swiping');
    this._resetSwipeState();
  };

  private _getOpenMovement(dir: SwipeDirection): number {
    const dx = this._currentX - this._startX;
    const dy = this._currentY - this._startY;

    // Opening direction is opposite of swipe dismiss direction
    switch (dir) {
      case 'down':
        return -dy; // Swipe up to open a "swipe down to dismiss" drawer
      case 'up':
        return dy;
      case 'right':
        return -dx;
      case 'left':
        return dx;
    }
  }

  private _resetSwipeState() {
    this._dragging = false;
    this._locked = false;
    this._pointerId = null;
  }

  private _syncAttributes() {
    if (!this._root) return;
    const open = this._root.getOpen();
    this.toggleAttribute('data-open', open);
    this.toggleAttribute('data-closed', !open);
    this.setAttribute('data-swipe-direction', this._root.getSwipeDirection());
  }
}

if (!customElements.get('drawer-swipe-area')) {
  customElements.define('drawer-swipe-area', DrawerSwipeAreaElement);
}

// ─── DrawerProviderElement ──────────────────────────────────────────────────────

/**
 * A provider that coordinates multiple drawers.
 * Renders a `<drawer-provider>` custom element (display:contents).
 *
 * Documentation: [Base UI Drawer](https://base-ui.com/react/components/drawer)
 */
export class DrawerProviderElement extends BaseHTMLElement {
  private _drawers = new Map<DrawerRootElement, boolean>();
  private _active = false;

  connectedCallback() {
    this.style.display = 'contents';
  }

  getActive(): boolean {
    return this._active;
  }

  /** @internal Called by DrawerRootElement when state changes. */
  _drawerStateChanged(root: DrawerRootElement) {
    if (root.isConnected) {
      this._drawers.set(root, root.getOpen());
    } else {
      this._drawers.delete(root);
    }

    const wasActive = this._active;
    this._active = false;
    for (const open of this._drawers.values()) {
      if (open) {
        this._active = true;
        break;
      }
    }

    if (this._active !== wasActive) {
      this.dispatchEvent(new CustomEvent(DRAWER_PROVIDER_STATE_CHANGE_EVENT));
    }
  }
}

if (!customElements.get('drawer-provider')) {
  customElements.define('drawer-provider', DrawerProviderElement);
}

// ─── DrawerIndentElement ────────────────────────────────────────────────────────

/**
 * A wrapper for main UI that responds to drawer open/close state.
 * Renders a `<drawer-indent>` custom element.
 *
 * Documentation: [Base UI Drawer](https://base-ui.com/react/components/drawer)
 */
export class DrawerIndentElement extends BaseHTMLElement {
  private _provider: DrawerProviderElement | null = null;
  private _handler = () => this._syncAttributes();

  connectedCallback() {
    this._provider = this.closest('drawer-provider') as DrawerProviderElement | null;
    if (!this._provider) {
      console.error(
        'Base UI: DrawerIndent must be placed within <drawer-provider>.',
      );
      return;
    }

    this._provider.addEventListener(DRAWER_PROVIDER_STATE_CHANGE_EVENT, this._handler);

    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this._provider?.removeEventListener(DRAWER_PROVIDER_STATE_CHANGE_EVENT, this._handler);
    this._provider = null;
  }

  private _syncAttributes() {
    if (!this._provider) return;
    const active = this._provider.getActive();
    this.toggleAttribute('data-active', active);
    this.toggleAttribute('data-inactive', !active);
  }
}

if (!customElements.get('drawer-indent')) {
  customElements.define('drawer-indent', DrawerIndentElement);
}

// ─── DrawerIndentBackgroundElement ──────────────────────────────────────────────

/**
 * A backdrop layer for the indent area.
 * Renders a `<drawer-indent-background>` custom element.
 *
 * Documentation: [Base UI Drawer](https://base-ui.com/react/components/drawer)
 */
export class DrawerIndentBackgroundElement extends BaseHTMLElement {
  private _provider: DrawerProviderElement | null = null;
  private _handler = () => this._syncAttributes();

  connectedCallback() {
    this._provider = this.closest('drawer-provider') as DrawerProviderElement | null;
    if (!this._provider) {
      console.error(
        'Base UI: DrawerIndentBackground must be placed within <drawer-provider>.',
      );
      return;
    }

    this._provider.addEventListener(DRAWER_PROVIDER_STATE_CHANGE_EVENT, this._handler);

    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this._provider?.removeEventListener(DRAWER_PROVIDER_STATE_CHANGE_EVENT, this._handler);
    this._provider = null;
  }

  private _syncAttributes() {
    if (!this._provider) return;
    const active = this._provider.getActive();
    this.toggleAttribute('data-active', active);
    this.toggleAttribute('data-inactive', !active);
  }
}

if (!customElements.get('drawer-indent-background')) {
  customElements.define('drawer-indent-background', DrawerIndentBackgroundElement);
}

// ─── Namespace exports ──────────────────────────────────────────────────────────

export namespace DrawerRoot {
  export type State = DrawerRootState;
  export type ChangeEventReason = DrawerChangeEventReason;
  export type ChangeEventDetails = DrawerChangeEventDetails;
}

export namespace DrawerTrigger {
  export type State = DrawerTriggerState;
}

export namespace DrawerPopup {
  export type State = DrawerPopupState;
}

export namespace DrawerBackdrop {
  export type State = DrawerBackdropState;
}

export namespace DrawerContent {
  export type State = DrawerContentState;
}

export namespace DrawerClose {
  export type State = DrawerCloseState;
}

export namespace DrawerViewport {
  export type State = DrawerViewportState;
}

export namespace DrawerSwipeArea {
  export type State = DrawerSwipeAreaState;
}

export namespace DrawerProvider {
  export type State = DrawerProviderState;
}

export namespace DrawerIndent {
  export type State = DrawerIndentState;
}

export namespace DrawerIndentBackground {
  export type State = DrawerIndentBackgroundState;
}

// ─── Global type declarations ───────────────────────────────────────────────────

declare global {
  interface HTMLElementTagNameMap {
    'drawer-root': DrawerRootElement;
    'drawer-trigger': DrawerTriggerElement;
    'drawer-portal': DrawerPortalElement;
    'drawer-popup': DrawerPopupElement;
    'drawer-backdrop': DrawerBackdropElement;
    'drawer-title': DrawerTitleElement;
    'drawer-description': DrawerDescriptionElement;
    'drawer-close': DrawerCloseElement;
    'drawer-content': DrawerContentElement;
    'drawer-viewport': DrawerViewportElement;
    'drawer-swipe-area': DrawerSwipeAreaElement;
    'drawer-provider': DrawerProviderElement;
    'drawer-indent': DrawerIndentElement;
    'drawer-indent-background': DrawerIndentBackgroundElement;
  }
}
