import { ReactiveElement } from 'lit';
import { BaseHTMLElement, ensureId } from '../utils/index.ts';

// ─── Constants ──────────────────────────────────────────────────────────────────

const NM_ROOT_ATTRIBUTE = 'data-base-ui-navigation-menu-root';
const NM_STATE_CHANGE_EVENT = 'base-ui-navigation-menu-state-change';
const DEFAULT_OPEN_DELAY = 50;
const DEFAULT_CLOSE_DELAY = 50;

// ─── Types ──────────────────────────────────────────────────────────────────────

type TransitionStatus = 'starting' | 'ending' | undefined;
type ActivationDirection = 'left' | 'right' | 'up' | 'down' | null;

export type NavigationMenuChangeEventReason =
  | 'trigger-press'
  | 'trigger-hover'
  | 'escape-key'
  | 'outside-press'
  | 'link-press'
  | 'none';

export interface NavigationMenuChangeEventDetails {
  reason: NavigationMenuChangeEventReason;
  event: Event;
  readonly isCanceled: boolean;
  cancel(): void;
}

export interface NavigationMenuRootState {
  value: string;
  orientation: 'horizontal' | 'vertical';
}

export interface NavigationMenuListState {
  orientation: 'horizontal' | 'vertical';
}

export interface NavigationMenuItemState {
  value: string;
  open: boolean;
}

export interface NavigationMenuTriggerState {
  open: boolean;
}

export interface NavigationMenuContentState {
  open: boolean;
  transitionStatus: TransitionStatus;
}

export interface NavigationMenuPopupState {
  open: boolean;
}

export interface NavigationMenuViewportState {
  open: boolean;
}

export interface NavigationMenuPortalState {}

export interface NavigationMenuBackdropState {
  open: boolean;
}

export interface NavigationMenuArrowState {
  open: boolean;
}

export interface NavigationMenuLinkState {
  active: boolean;
}

export interface NavigationMenuIconState {
  open: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function createChangeEventDetails(
  reason: NavigationMenuChangeEventReason,
  event: Event,
): NavigationMenuChangeEventDetails {
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

// ─── NavigationMenuRootElement ──────────────────────────────────────────────────

/**
 * Groups all parts of the navigation menu.
 * Renders a `<navigation-menu-root>` custom element.
 *
 * Documentation: [Base UI NavigationMenu](https://base-ui.com/react/components/navigation-menu)
 */
export class NavigationMenuRootElement extends ReactiveElement {
  static properties = {
    orientation: { type: String },
    disabled: { type: Boolean },
  };

  declare orientation: 'horizontal' | 'vertical';
  declare disabled: boolean;

  /** Default value (uncontrolled). */
  defaultValue = '';

  /** Callback when value changes. */
  onValueChange:
    | ((value: string, details: NavigationMenuChangeEventDetails) => void)
    | undefined;

  /** Open delay in ms. */
  delay: number = DEFAULT_OPEN_DELAY;

  /** Close delay in ms. */
  closeDelay: number = DEFAULT_CLOSE_DELAY;

  // Controlled/uncontrolled value
  private _value: string | undefined;
  private _valueIsControlled = false;
  private _internalValue = '';
  private _initialized = false;
  private _activationDirection: ActivationDirection = null;
  private _lastPublishedStateKey: string | null = null;
  private _transitionStatus: TransitionStatus = undefined;

  get value(): string | undefined {
    return this._value;
  }
  set value(val: string | undefined) {
    if (val !== undefined) {
      this._valueIsControlled = true;
      this._value = val;
    } else {
      this._valueIsControlled = false;
      this._value = undefined;
    }
    this._syncAttributes();
    this._publishStateChange();
  }

  constructor() {
    super();
    this.orientation = 'horizontal';
    this.disabled = false;
  }

  override createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();

    if (!this._initialized) {
      this._initialized = true;
      this._internalValue = this.defaultValue;
    }

    this.setAttribute('role', 'navigation');
    this.setAttribute(NM_ROOT_ATTRIBUTE, '');

    document.addEventListener('keydown', this._handleEscapeKey);

    this._syncAttributes();
    queueMicrotask(() => this._publishStateChange());
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('keydown', this._handleEscapeKey);
    this._lastPublishedStateKey = null;
  }

  protected override updated() {
    this._syncAttributes();
    this._publishStateChange();
  }

  getValue(): string {
    return this._valueIsControlled ? (this._value ?? '') : this._internalValue;
  }

  getOrientation(): 'horizontal' | 'vertical' {
    return this.orientation;
  }

  getActivationDirection(): ActivationDirection {
    return this._activationDirection;
  }

  getTransitionStatus(): TransitionStatus {
    return this._transitionStatus;
  }

  setTransitionStatus(status: TransitionStatus) {
    if (this._transitionStatus === status) return;
    this._transitionStatus = status;
    this._publishStateChange();
  }

  isOpen(): boolean {
    return this.getValue() !== '';
  }

  setValue(nextValue: string, event: Event, reason: NavigationMenuChangeEventReason) {
    const currentValue = this.getValue();

    // Determine activation direction
    if (nextValue !== '' && currentValue !== '' && nextValue !== currentValue) {
      const triggers = Array.from(
        this.querySelectorAll('navigation-menu-trigger'),
      ) as HTMLElement[];
      const currentIndex = triggers.findIndex(
        (t) => t.closest('navigation-menu-item')?.getAttribute('data-value') === currentValue,
      );
      const nextIndex = triggers.findIndex(
        (t) => t.closest('navigation-menu-item')?.getAttribute('data-value') === nextValue,
      );
      if (currentIndex >= 0 && nextIndex >= 0) {
        const isHoriz = this.orientation === 'horizontal';
        if (isHoriz) {
          this._activationDirection = nextIndex > currentIndex ? 'right' : 'left';
        } else {
          this._activationDirection = nextIndex > currentIndex ? 'down' : 'up';
        }
      }
    } else if (nextValue === '') {
      this._activationDirection = null;
    }

    const details = createChangeEventDetails(reason, event);
    this.onValueChange?.(nextValue, details);

    if (details.isCanceled) return;

    if (!this._valueIsControlled) {
      this._internalValue = nextValue;
    }

    this._syncAttributes();
    this._publishStateChange();
  }

  private _handleEscapeKey = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    if (!this.isOpen()) return;

    event.preventDefault();
    this.setValue('', event, 'escape-key');
  };

  private _syncAttributes() {
    const open = this.isOpen();
    this.toggleAttribute('data-open', open);
    this.toggleAttribute('data-closed', !open);
    this.setAttribute('data-orientation', this.orientation);
  }

  private _publishStateChange() {
    const nextKey = [
      this.getValue(),
      this.orientation,
      this._activationDirection ?? 'none',
      this._transitionStatus ?? 'idle',
    ].join('|');

    if (nextKey === this._lastPublishedStateKey) return;
    this._lastPublishedStateKey = nextKey;
    this.dispatchEvent(new CustomEvent(NM_STATE_CHANGE_EVENT));
  }
}

if (!customElements.get('navigation-menu-root')) {
  customElements.define('navigation-menu-root', NavigationMenuRootElement);
}

// ─── NavigationMenuListElement ──────────────────────────────────────────────────

/**
 * A list container for navigation menu items.
 * Renders a `<navigation-menu-list>` custom element.
 *
 * Documentation: [Base UI NavigationMenu](https://base-ui.com/react/components/navigation-menu)
 */
export class NavigationMenuListElement extends BaseHTMLElement {
  private _root: NavigationMenuRootElement | null = null;
  private _handler = () => this._syncAttributes();

  connectedCallback() {
    this._root = this.closest('navigation-menu-root') as NavigationMenuRootElement | null;
    if (!this._root) {
      console.error(
        'Base UI: NavigationMenu parts must be placed within <navigation-menu-root>.',
      );
      return;
    }

    this.setAttribute('role', 'menubar');

    this._root.addEventListener(NM_STATE_CHANGE_EVENT, this._handler);

    this.addEventListener('keydown', this._handleKeyDown);

    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(NM_STATE_CHANGE_EVENT, this._handler);
    this.removeEventListener('keydown', this._handleKeyDown);
    this._root = null;
  }

  private _handleKeyDown = (event: KeyboardEvent) => {
    if (!this._root) return;

    const target = event.target as HTMLElement;
    if (!target.closest('navigation-menu-trigger')) return;

    // Modifier keys prevent navigation
    if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return;

    const orientation = this._root.getOrientation();
    const triggers = Array.from(
      this.querySelectorAll('navigation-menu-trigger'),
    ) as HTMLElement[];

    const currentIndex = triggers.indexOf(target.closest('navigation-menu-trigger') as HTMLElement);
    if (currentIndex === -1) return;

    let nextIndex: number | null = null;

    if (orientation === 'horizontal') {
      if (event.key === 'ArrowRight') {
        nextIndex = (currentIndex + 1) % triggers.length;
      } else if (event.key === 'ArrowLeft') {
        nextIndex = (currentIndex - 1 + triggers.length) % triggers.length;
      } else if (event.key === 'Home') {
        nextIndex = 0;
      } else if (event.key === 'End') {
        nextIndex = triggers.length - 1;
      }
    } else {
      if (event.key === 'ArrowDown') {
        nextIndex = (currentIndex + 1) % triggers.length;
      } else if (event.key === 'ArrowUp') {
        nextIndex = (currentIndex - 1 + triggers.length) % triggers.length;
      } else if (event.key === 'Home') {
        nextIndex = 0;
      } else if (event.key === 'End') {
        nextIndex = triggers.length - 1;
      }
    }

    if (nextIndex != null) {
      event.preventDefault();
      triggers[nextIndex]?.focus();
    }
  };

  private _syncAttributes() {
    if (!this._root) return;
    this.setAttribute('data-orientation', this._root.getOrientation());
  }
}

if (!customElements.get('navigation-menu-list')) {
  customElements.define('navigation-menu-list', NavigationMenuListElement);
}

// ─── NavigationMenuItemElement ──────────────────────────────────────────────────

/**
 * A navigation menu item that contains a trigger and content.
 * Renders a `<navigation-menu-item>` custom element.
 *
 * Documentation: [Base UI NavigationMenu](https://base-ui.com/react/components/navigation-menu)
 */
export class NavigationMenuItemElement extends BaseHTMLElement {
  private _root: NavigationMenuRootElement | null = null;
  private _handler = () => this._syncAttributes();

  // Value set via Lit property binding
  value = '';

  connectedCallback() {
    this._root = this.closest('navigation-menu-root') as NavigationMenuRootElement | null;
    if (!this._root) {
      console.error(
        'Base UI: NavigationMenu parts must be placed within <navigation-menu-root>.',
      );
      return;
    }

    this.setAttribute('role', 'none');

    // Set data-value eagerly
    if (this.value) {
      this.setAttribute('data-value', this.value);
    }

    this._root.addEventListener(NM_STATE_CHANGE_EVENT, this._handler);

    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(NM_STATE_CHANGE_EVENT, this._handler);
    this._root = null;
  }

  getIsOpen(): boolean {
    if (!this._root) return false;
    return this._root.getValue() === this.value;
  }

  private _syncAttributes() {
    if (!this._root) return;
    const open = this.getIsOpen();
    this.setAttribute('data-value', this.value);
    this.toggleAttribute('data-open', open);
    this.toggleAttribute('data-closed', !open);
  }
}

if (!customElements.get('navigation-menu-item')) {
  customElements.define('navigation-menu-item', NavigationMenuItemElement);
}

// ─── NavigationMenuTriggerElement ───────────────────────────────────────────────

/**
 * A button that opens a navigation menu item's content.
 * Renders a `<navigation-menu-trigger>` custom element.
 *
 * Documentation: [Base UI NavigationMenu](https://base-ui.com/react/components/navigation-menu)
 */
export class NavigationMenuTriggerElement extends BaseHTMLElement {
  private _root: NavigationMenuRootElement | null = null;
  private _item: NavigationMenuItemElement | null = null;
  private _handler = () => this._syncAttributes();
  private _openTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private _closeTimeoutId: ReturnType<typeof setTimeout> | null = null;

  connectedCallback() {
    this._root = this.closest('navigation-menu-root') as NavigationMenuRootElement | null;
    this._item = this.closest('navigation-menu-item') as NavigationMenuItemElement | null;

    if (!this._root || !this._item) {
      console.error(
        'Base UI: NavigationMenu parts must be placed within <navigation-menu-root> and <navigation-menu-item>.',
      );
      return;
    }

    this.setAttribute('role', 'menuitem');
    this.setAttribute('tabindex', '0');

    this._root.addEventListener(NM_STATE_CHANGE_EVENT, this._handler);

    this.addEventListener('click', this._handleClick);
    this.addEventListener('keydown', this._handleKeyDown);
    this.addEventListener('pointerenter', this._handlePointerEnter);
    this.addEventListener('pointerleave', this._handlePointerLeave);

    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(NM_STATE_CHANGE_EVENT, this._handler);
    this.removeEventListener('click', this._handleClick);
    this.removeEventListener('keydown', this._handleKeyDown);
    this.removeEventListener('pointerenter', this._handlePointerEnter);
    this.removeEventListener('pointerleave', this._handlePointerLeave);
    this._clearTimeouts();
    this._root = null;
    this._item = null;
  }

  private _handleClick = (event: Event) => {
    if (!this._root || !this._item) return;
    this._clearTimeouts();

    const itemValue = this._item.value;
    const isOpen = this._root.getValue() === itemValue;

    this._root.setValue(
      isOpen ? '' : itemValue,
      event,
      'trigger-press',
    );
  };

  private _handleKeyDown = (event: KeyboardEvent) => {
    if (!this._root || !this._item) return;
    if (event.target !== this) return;

    const orientation = this._root.getOrientation();
    const isOpen = this._item.getIsOpen();

    // Enter/Space toggle
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      const itemValue = this._item.value;
      this._root.setValue(
        isOpen ? '' : itemValue,
        event,
        'trigger-press',
      );
      return;
    }

    // Arrow key to open content
    const openKey = orientation === 'horizontal' ? 'ArrowDown' : 'ArrowRight';
    if (event.key === openKey && !isOpen) {
      event.preventDefault();
      this._root.setValue(this._item.value, event, 'trigger-press');
    }
  };

  private _handlePointerEnter = (event: PointerEvent) => {
    if (!this._root || !this._item) return;
    // Only respond to mouse, not touch/pen
    if (event.pointerType !== 'mouse') return;

    this._clearTimeouts();

    const itemValue = this._item.value;
    const currentValue = this._root.getValue();

    // If another item is already open, switch immediately
    if (currentValue !== '' && currentValue !== itemValue) {
      this._root.setValue(itemValue, event, 'trigger-hover');
      return;
    }

    // Open with delay
    if (currentValue !== itemValue) {
      this._openTimeoutId = setTimeout(() => {
        this._openTimeoutId = null;
        if (this._root && this._item) {
          this._root.setValue(this._item.value, event, 'trigger-hover');
        }
      }, this._root.delay);
    }
  };

  private _handlePointerLeave = (event: PointerEvent) => {
    if (!this._root || !this._item) return;
    if (event.pointerType !== 'mouse') return;

    this._clearTimeouts();

    const itemValue = this._item.value;
    if (this._root.getValue() === itemValue) {
      this._closeTimeoutId = setTimeout(() => {
        this._closeTimeoutId = null;
        if (this._root && this._root.getValue() === itemValue) {
          this._root.setValue('', event, 'trigger-hover');
        }
      }, this._root.closeDelay);
    }
  };

  private _clearTimeouts() {
    if (this._openTimeoutId != null) {
      clearTimeout(this._openTimeoutId);
      this._openTimeoutId = null;
    }
    if (this._closeTimeoutId != null) {
      clearTimeout(this._closeTimeoutId);
      this._closeTimeoutId = null;
    }
  }

  private _syncAttributes() {
    if (!this._root || !this._item) return;
    const open = this._item.getIsOpen();
    const popupId = this._root.querySelector(
      `navigation-menu-content[data-value="${this._item.value}"]`,
    )?.id;

    this.setAttribute('aria-expanded', String(open));
    this.setAttribute('aria-haspopup', 'true');
    this.toggleAttribute('data-open', open);
    this.toggleAttribute('data-closed', !open);

    if (open && popupId) {
      this.setAttribute('aria-controls', popupId);
    } else {
      this.removeAttribute('aria-controls');
    }
  }
}

if (!customElements.get('navigation-menu-trigger')) {
  customElements.define('navigation-menu-trigger', NavigationMenuTriggerElement);
}

// ─── NavigationMenuContentElement ───────────────────────────────────────────────

/**
 * The content panel for a navigation menu item.
 * Renders a `<navigation-menu-content>` custom element.
 *
 * Documentation: [Base UI NavigationMenu](https://base-ui.com/react/components/navigation-menu)
 */
export class NavigationMenuContentElement extends BaseHTMLElement {
  private _root: NavigationMenuRootElement | null = null;
  private _item: NavigationMenuItemElement | null = null;
  private _handler = () => this._handleStateChange();
  private _mounted = false;
  private _transitionStatus: TransitionStatus = undefined;
  private _lastOpen: boolean | null = null;
  private _frameId: number | null = null;
  private _exitRunId = 0;

  /** Keep content in DOM when hidden. */
  keepMounted = false;

  connectedCallback() {
    this._root = this.closest('navigation-menu-root') as NavigationMenuRootElement | null;
    this._item = this.closest('navigation-menu-item') as NavigationMenuItemElement | null;

    if (!this._root || !this._item) {
      console.error(
        'Base UI: NavigationMenu parts must be placed within <navigation-menu-root> and <navigation-menu-item>.',
      );
      return;
    }

    ensureId(this, 'base-ui-navigation-menu-content');
    this.setAttribute('data-value', this._item.value);

    this._root.addEventListener(NM_STATE_CHANGE_EVENT, this._handler);

    // Immediately hide if not active
    if (!this._item.getIsOpen()) {
      this.setAttribute('hidden', '');
    }

    queueMicrotask(() => this._handleStateChange());
  }

  disconnectedCallback() {
    this._clearFrame();
    this._root?.removeEventListener(NM_STATE_CHANGE_EVENT, this._handler);
    this._root = null;
    this._item = null;
    this._mounted = false;
    this._lastOpen = null;
    this._transitionStatus = undefined;
  }

  private _handleStateChange() {
    if (!this._root || !this._item) return;

    const open = this._item.getIsOpen();
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
    if (!this._root || !this._item) return;

    const open = this._item.getIsOpen();
    const shouldRender = this._mounted || this._transitionStatus === 'ending' || this.keepMounted;

    if (!shouldRender) {
      this.setAttribute('hidden', '');
      return;
    }

    const hidden = !open && this._transitionStatus !== 'ending';

    if (hidden) {
      this.setAttribute('hidden', '');
    } else {
      this.removeAttribute('hidden');
    }

    // Data attributes
    this.toggleAttribute('data-open', open);
    this.toggleAttribute('data-closed', !open);
    this.toggleAttribute('data-starting-style', this._transitionStatus === 'starting');
    this.toggleAttribute('data-ending-style', this._transitionStatus === 'ending');

    const direction = this._root.getActivationDirection();
    if (direction) {
      this.setAttribute('data-activation-direction', direction);
    } else {
      this.removeAttribute('data-activation-direction');
    }
  }

  private _scheduleStartingCleanup() {
    this._clearFrame();
    this._frameId = requestAnimationFrame(() => {
      this._frameId = null;
      if (!this._root || this._transitionStatus !== 'starting') return;
      if (!this._item?.getIsOpen()) return;
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
    if (!this.keepMounted) {
      this._mounted = false;
    }
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

if (!customElements.get('navigation-menu-content')) {
  customElements.define('navigation-menu-content', NavigationMenuContentElement);
}

// ─── NavigationMenuPortalElement ────────────────────────────────────────────────

/**
 * A portal container for navigation menu content.
 * Renders a `<navigation-menu-portal>` custom element (display:contents).
 *
 * Documentation: [Base UI NavigationMenu](https://base-ui.com/react/components/navigation-menu)
 */
export class NavigationMenuPortalElement extends BaseHTMLElement {
  connectedCallback() {
    this.style.display = 'contents';
  }
}

if (!customElements.get('navigation-menu-portal')) {
  customElements.define('navigation-menu-portal', NavigationMenuPortalElement);
}

// ─── NavigationMenuPopupElement ─────────────────────────────────────────────────

/**
 * A popup container for navigation menu viewport.
 * Renders a `<navigation-menu-popup>` custom element.
 *
 * Documentation: [Base UI NavigationMenu](https://base-ui.com/react/components/navigation-menu)
 */
export class NavigationMenuPopupElement extends BaseHTMLElement {
  private _root: NavigationMenuRootElement | null = null;
  private _handler = () => this._syncAttributes();

  connectedCallback() {
    this._root = this.closest('navigation-menu-root') as NavigationMenuRootElement | null;
    if (!this._root) {
      console.error(
        'Base UI: NavigationMenu parts must be placed within <navigation-menu-root>.',
      );
      return;
    }

    this.setAttribute('role', 'navigation');

    this._root.addEventListener(NM_STATE_CHANGE_EVENT, this._handler);

    if (!this._root.isOpen()) {
      this.setAttribute('hidden', '');
    }

    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(NM_STATE_CHANGE_EVENT, this._handler);
    this._root = null;
  }

  private _syncAttributes() {
    if (!this._root) return;
    const open = this._root.isOpen();

    if (open) {
      this.removeAttribute('hidden');
    } else {
      this.setAttribute('hidden', '');
    }

    this.toggleAttribute('data-open', open);
    this.toggleAttribute('data-closed', !open);
  }
}

if (!customElements.get('navigation-menu-popup')) {
  customElements.define('navigation-menu-popup', NavigationMenuPopupElement);
}

// ─── NavigationMenuViewportElement ──────────────────────────────────────────────

/**
 * A viewport that clips navigation menu content.
 * Renders a `<navigation-menu-viewport>` custom element.
 *
 * Documentation: [Base UI NavigationMenu](https://base-ui.com/react/components/navigation-menu)
 */
export class NavigationMenuViewportElement extends BaseHTMLElement {
  private _root: NavigationMenuRootElement | null = null;
  private _handler = () => this._syncAttributes();

  connectedCallback() {
    this._root = this.closest('navigation-menu-root') as NavigationMenuRootElement | null;
    if (!this._root) {
      console.error(
        'Base UI: NavigationMenu parts must be placed within <navigation-menu-root>.',
      );
      return;
    }

    this.style.overflow = 'hidden';
    this.style.position = 'relative';

    this._root.addEventListener(NM_STATE_CHANGE_EVENT, this._handler);

    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(NM_STATE_CHANGE_EVENT, this._handler);
    this._root = null;
  }

  private _syncAttributes() {
    if (!this._root) return;
    const open = this._root.isOpen();
    this.toggleAttribute('data-open', open);
    this.toggleAttribute('data-closed', !open);
  }
}

if (!customElements.get('navigation-menu-viewport')) {
  customElements.define('navigation-menu-viewport', NavigationMenuViewportElement);
}

// ─── NavigationMenuBackdropElement ──────────────────────────────────────────────

/**
 * An optional backdrop behind the navigation menu popup.
 * Renders a `<navigation-menu-backdrop>` custom element.
 *
 * Documentation: [Base UI NavigationMenu](https://base-ui.com/react/components/navigation-menu)
 */
export class NavigationMenuBackdropElement extends BaseHTMLElement {
  private _root: NavigationMenuRootElement | null = null;
  private _handler = () => this._syncAttributes();

  connectedCallback() {
    this._root = this.closest('navigation-menu-root') as NavigationMenuRootElement | null;
    if (!this._root) {
      console.error(
        'Base UI: NavigationMenu parts must be placed within <navigation-menu-root>.',
      );
      return;
    }

    this.setAttribute('role', 'presentation');
    this.setAttribute('aria-hidden', 'true');

    this._root.addEventListener(NM_STATE_CHANGE_EVENT, this._handler);

    if (!this._root.isOpen()) {
      this.setAttribute('hidden', '');
    }

    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(NM_STATE_CHANGE_EVENT, this._handler);
    this._root = null;
  }

  private _syncAttributes() {
    if (!this._root) return;
    const open = this._root.isOpen();

    if (open) {
      this.removeAttribute('hidden');
    } else {
      this.setAttribute('hidden', '');
    }

    this.toggleAttribute('data-open', open);
    this.toggleAttribute('data-closed', !open);
  }
}

if (!customElements.get('navigation-menu-backdrop')) {
  customElements.define('navigation-menu-backdrop', NavigationMenuBackdropElement);
}

// ─── NavigationMenuArrowElement ─────────────────────────────────────────────────

/**
 * An arrow element that points toward the trigger.
 * Renders a `<navigation-menu-arrow>` custom element.
 *
 * Documentation: [Base UI NavigationMenu](https://base-ui.com/react/components/navigation-menu)
 */
export class NavigationMenuArrowElement extends BaseHTMLElement {
  private _root: NavigationMenuRootElement | null = null;
  private _handler = () => this._syncAttributes();

  connectedCallback() {
    this._root = this.closest('navigation-menu-root') as NavigationMenuRootElement | null;
    if (!this._root) {
      console.error(
        'Base UI: NavigationMenu parts must be placed within <navigation-menu-root>.',
      );
      return;
    }

    this.setAttribute('aria-hidden', 'true');

    this._root.addEventListener(NM_STATE_CHANGE_EVENT, this._handler);

    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(NM_STATE_CHANGE_EVENT, this._handler);
    this._root = null;
  }

  private _syncAttributes() {
    if (!this._root) return;
    const open = this._root.isOpen();
    this.toggleAttribute('data-open', open);
    this.toggleAttribute('data-closed', !open);
  }
}

if (!customElements.get('navigation-menu-arrow')) {
  customElements.define('navigation-menu-arrow', NavigationMenuArrowElement);
}

// ─── NavigationMenuLinkElement ──────────────────────────────────────────────────

/**
 * A navigation link within the menu.
 * Renders a `<navigation-menu-link>` custom element.
 *
 * Documentation: [Base UI NavigationMenu](https://base-ui.com/react/components/navigation-menu)
 */
export class NavigationMenuLinkElement extends BaseHTMLElement {
  private _root: NavigationMenuRootElement | null = null;

  /** Whether to close the menu when this link is clicked. */
  closeOnClick = true;

  /** Whether this link is currently active. */
  active = false;

  connectedCallback() {
    this._root = this.closest('navigation-menu-root') as NavigationMenuRootElement | null;

    this.setAttribute('role', 'menuitem');

    this.addEventListener('click', this._handleClick);

    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this.removeEventListener('click', this._handleClick);
    this._root = null;
  }

  private _handleClick = (event: Event) => {
    if (!this._root) return;
    if (this.closeOnClick && this._root.isOpen()) {
      this._root.setValue('', event, 'link-press');
    }
  };

  private _syncAttributes() {
    this.toggleAttribute('data-active', this.active);
  }
}

if (!customElements.get('navigation-menu-link')) {
  customElements.define('navigation-menu-link', NavigationMenuLinkElement);
}

// ─── NavigationMenuIconElement ──────────────────────────────────────────────────

/**
 * A visual indicator icon for the trigger.
 * Renders a `<navigation-menu-icon>` custom element.
 *
 * Documentation: [Base UI NavigationMenu](https://base-ui.com/react/components/navigation-menu)
 */
export class NavigationMenuIconElement extends BaseHTMLElement {
  private _item: NavigationMenuItemElement | null = null;
  private _root: NavigationMenuRootElement | null = null;
  private _handler = () => this._syncAttributes();

  connectedCallback() {
    this._root = this.closest('navigation-menu-root') as NavigationMenuRootElement | null;
    this._item = this.closest('navigation-menu-item') as NavigationMenuItemElement | null;

    if (this._root) {
      this._root.addEventListener(NM_STATE_CHANGE_EVENT, this._handler);
    }

    this.setAttribute('aria-hidden', 'true');

    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(NM_STATE_CHANGE_EVENT, this._handler);
    this._root = null;
    this._item = null;
  }

  private _syncAttributes() {
    const open = this._item?.getIsOpen() ?? false;
    this.toggleAttribute('data-open', open);
    this.toggleAttribute('data-closed', !open);
  }
}

if (!customElements.get('navigation-menu-icon')) {
  customElements.define('navigation-menu-icon', NavigationMenuIconElement);
}

// ─── Namespace exports ──────────────────────────────────────────────────────────

export namespace NavigationMenuRoot {
  export type State = NavigationMenuRootState;
  export type ChangeEventReason = NavigationMenuChangeEventReason;
  export type ChangeEventDetails = NavigationMenuChangeEventDetails;
}

export namespace NavigationMenuList {
  export type State = NavigationMenuListState;
}

export namespace NavigationMenuItem {
  export type State = NavigationMenuItemState;
}

export namespace NavigationMenuTrigger {
  export type State = NavigationMenuTriggerState;
}

export namespace NavigationMenuContent {
  export type State = NavigationMenuContentState;
}

export namespace NavigationMenuPortal {
  export type State = NavigationMenuPortalState;
}

export namespace NavigationMenuPopup {
  export type State = NavigationMenuPopupState;
}

export namespace NavigationMenuViewport {
  export type State = NavigationMenuViewportState;
}

export namespace NavigationMenuBackdrop {
  export type State = NavigationMenuBackdropState;
}

export namespace NavigationMenuArrow {
  export type State = NavigationMenuArrowState;
}

export namespace NavigationMenuLink {
  export type State = NavigationMenuLinkState;
}

export namespace NavigationMenuIcon {
  export type State = NavigationMenuIconState;
}

// ─── Global type declarations ───────────────────────────────────────────────────

declare global {
  interface HTMLElementTagNameMap {
    'navigation-menu-root': NavigationMenuRootElement;
    'navigation-menu-list': NavigationMenuListElement;
    'navigation-menu-item': NavigationMenuItemElement;
    'navigation-menu-trigger': NavigationMenuTriggerElement;
    'navigation-menu-content': NavigationMenuContentElement;
    'navigation-menu-portal': NavigationMenuPortalElement;
    'navigation-menu-popup': NavigationMenuPopupElement;
    'navigation-menu-viewport': NavigationMenuViewportElement;
    'navigation-menu-backdrop': NavigationMenuBackdropElement;
    'navigation-menu-arrow': NavigationMenuArrowElement;
    'navigation-menu-link': NavigationMenuLinkElement;
    'navigation-menu-icon': NavigationMenuIconElement;
  }
}
