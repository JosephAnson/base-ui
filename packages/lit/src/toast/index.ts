import { BaseHTMLElement, ensureId } from '../utils/index.ts';

// ─── Constants ──────────────────────────────────────────────────────────────────

const TOAST_STATE_CHANGE_EVENT = 'base-ui-toast-state-change';
const TOAST_LIST_CHANGE_EVENT = 'base-ui-toast-list-change';

// ─── Types ──────────────────────────────────────────────────────────────────────

export type ToastType = 'info' | 'success' | 'warning' | 'error' | 'loading' | string;
export type ToastPriority = 'low' | 'high';
export type ToastTransitionStatus = 'starting' | 'ending' | undefined;

export interface ToastData {
  id: string;
  title?: string;
  description?: string;
  type?: ToastType;
  timeout?: number;
  priority?: ToastPriority;
  transitionStatus?: ToastTransitionStatus;
  onClose?: () => void;
  onRemove?: () => void;
  onAction?: () => void;
  actionLabel?: string;
  data?: unknown;
}

export interface ToastAddOptions {
  id?: string;
  title?: string;
  description?: string;
  type?: ToastType;
  timeout?: number;
  priority?: ToastPriority;
  onClose?: () => void;
  onRemove?: () => void;
  onAction?: () => void;
  actionLabel?: string;
  data?: unknown;
}

export interface ToastUpdateOptions {
  title?: string;
  description?: string;
  type?: ToastType;
  timeout?: number;
  onClose?: () => void;
  onRemove?: () => void;
  onAction?: () => void;
  actionLabel?: string;
  data?: unknown;
}

export interface ToastProviderState {
  toasts: ToastData[];
}

export interface ToastViewportState {
  expanded: boolean;
}

export interface ToastRootState {
  type: string | undefined;
  transitionStatus: ToastTransitionStatus;
}

export interface ToastContentState {
  type: string | undefined;
}

export interface ToastTitleState {
  type: string | undefined;
}

export interface ToastDescriptionState {
  type: string | undefined;
}

export interface ToastCloseState {
  type: string | undefined;
}

export interface ToastActionState {
  type: string | undefined;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

let nextToastId = 0;
function generateToastId(): string {
  return `base-ui-toast-${++nextToastId}`;
}

// ─── ToastProviderElement ───────────────────────────────────────────────────────

/**
 * Provides toast management context.
 * Renders a `<toast-provider>` custom element (display:contents).
 *
 * Documentation: [Base UI Toast](https://base-ui.com/react/components/toast)
 */
export class ToastProviderElement extends BaseHTMLElement {
  /** Default auto-dismiss timeout in ms. */
  timeout = 5000;

  /** Maximum number of visible toasts. */
  limit = 3;

  // Internal state
  private _toasts: ToastData[] = [];
  private _timers = new Map<string, ReturnType<typeof setTimeout>>();
  private _remainingTimes = new Map<string, number>();
  private _timerStarts = new Map<string, number>();
  private _paused = false;

  connectedCallback() {
    this.style.display = 'contents';
  }

  disconnectedCallback() {
    // Clear all timers
    for (const timer of this._timers.values()) {
      clearTimeout(timer);
    }
    this._timers.clear();
    this._remainingTimes.clear();
    this._timerStarts.clear();
  }

  getToasts(): readonly ToastData[] {
    return this._toasts;
  }

  /**
   * Add a new toast. Returns the toast ID.
   */
  add(options: ToastAddOptions): string {
    const id = options.id ?? generateToastId();
    const toast: ToastData = {
      ...options,
      id,
      transitionStatus: 'starting',
    };

    this._toasts = [toast, ...this._toasts];

    // Mark excess toasts as limited
    this._enforceLimits();

    // Schedule transition to stable state
    queueMicrotask(() => {
      const t = this._toasts.find((x) => x.id === id);
      if (t) {
        t.transitionStatus = undefined;
        this._publishListChange();
      }
    });

    // Start auto-dismiss timer (unless loading type)
    if (toast.type !== 'loading') {
      const timeout = toast.timeout ?? this.timeout;
      this._startTimer(id, timeout);
    }

    this._publishListChange();
    return id;
  }

  /**
   * Close a toast (or all toasts if no ID provided).
   */
  close(toastId?: string) {
    if (!toastId) {
      // Close all
      for (const t of this._toasts) {
        t.onClose?.();
        this._clearTimer(t.id);
      }
      this._toasts = this._toasts.map((t) => ({
        ...t,
        transitionStatus: 'ending' as const,
      }));
      this._publishListChange();

      // Remove after animation
      setTimeout(() => {
        const removed = this._toasts.filter((t) => t.transitionStatus === 'ending');
        for (const t of removed) {
          t.onRemove?.();
        }
        this._toasts = this._toasts.filter((t) => t.transitionStatus !== 'ending');
        this._publishListChange();
      }, 300);
      return;
    }

    const toast = this._toasts.find((t) => t.id === toastId);
    if (!toast) return;

    toast.onClose?.();
    toast.transitionStatus = 'ending';
    this._clearTimer(toastId);
    this._publishListChange();

    // Remove after animation
    setTimeout(() => {
      toast.onRemove?.();
      this._toasts = this._toasts.filter((t) => t.id !== toastId);
      this._enforceLimits();
      this._publishListChange();
    }, 300);
  }

  /**
   * Update an existing toast.
   */
  update(toastId: string, options: ToastUpdateOptions) {
    const toast = this._toasts.find((t) => t.id === toastId);
    if (!toast || toast.transitionStatus === 'ending') return;

    Object.assign(toast, options);

    // Reschedule timer if timeout changed
    if (options.timeout !== undefined) {
      this._clearTimer(toastId);
      this._startTimer(toastId, options.timeout);
    }

    // If transitioning from loading to other type, start timer
    if (options.type && options.type !== 'loading' && !this._timers.has(toastId)) {
      const timeout = toast.timeout ?? this.timeout;
      this._startTimer(toastId, timeout);
    }

    this._publishListChange();
  }

  /**
   * Handle a promise-based toast.
   */
  promise<T>(
    promise: Promise<T>,
    options: {
      loading: ToastAddOptions;
      success: ToastAddOptions | ((result: T) => ToastAddOptions);
      error: ToastAddOptions | ((err: unknown) => ToastAddOptions);
    },
  ): Promise<T> {
    const id = this.add({ ...options.loading, type: 'loading' });

    return promise.then(
      (result) => {
        const successOpts =
          typeof options.success === 'function' ? options.success(result) : options.success;
        this.update(id, { ...successOpts, type: successOpts.type ?? 'success' });
        return result;
      },
      (err) => {
        const errorOpts = typeof options.error === 'function' ? options.error(err) : options.error;
        this.update(id, { ...errorOpts, type: errorOpts.type ?? 'error' });
        throw err;
      },
    );
  }

  /**
   * Pause all auto-dismiss timers.
   */
  pauseTimers() {
    if (this._paused) return;
    this._paused = true;

    for (const [id, timer] of this._timers) {
      clearTimeout(timer);
      const start = this._timerStarts.get(id) ?? Date.now();
      const original = this._remainingTimes.get(id) ?? this.timeout;
      const elapsed = Date.now() - start;
      this._remainingTimes.set(id, Math.max(0, original - elapsed));
    }
    this._timers.clear();
  }

  /**
   * Resume all auto-dismiss timers.
   */
  resumeTimers() {
    if (!this._paused) return;
    this._paused = false;

    for (const toast of this._toasts) {
      if (toast.transitionStatus === 'ending') continue;
      if (toast.type === 'loading') continue;

      const remaining = this._remainingTimes.get(toast.id);
      if (remaining !== undefined && remaining > 0) {
        this._startTimer(toast.id, remaining);
      }
    }
  }

  private _startTimer(id: string, timeout: number) {
    this._clearTimer(id);
    if (this._paused) {
      this._remainingTimes.set(id, timeout);
      return;
    }
    this._remainingTimes.set(id, timeout);
    this._timerStarts.set(id, Date.now());
    const timer = setTimeout(() => {
      this.close(id);
    }, timeout);
    this._timers.set(id, timer);
  }

  private _clearTimer(id: string) {
    const timer = this._timers.get(id);
    if (timer != null) {
      clearTimeout(timer);
      this._timers.delete(id);
    }
    this._remainingTimes.delete(id);
    this._timerStarts.delete(id);
  }

  private _enforceLimits() {
    for (let i = 0; i < this._toasts.length; i++) {
      const toast = this._toasts[i];
      if (toast.transitionStatus !== 'ending') {
        // Count visible toasts up to this point
        const visibleBefore = this._toasts
          .slice(0, i + 1)
          .filter((t) => t.transitionStatus !== 'ending').length;
        // Toast is "limited" if it exceeds the limit count
        // (we don't hide it, just mark it for CSS to handle)
      }
    }
  }

  private _publishListChange() {
    this.dispatchEvent(new CustomEvent(TOAST_LIST_CHANGE_EVENT));
  }
}

if (!customElements.get('toast-provider')) {
  customElements.define('toast-provider', ToastProviderElement);
}

// ─── ToastViewportElement ───────────────────────────────────────────────────────

/**
 * Container for all visible toasts.
 * Renders a `<toast-viewport>` custom element.
 *
 * Documentation: [Base UI Toast](https://base-ui.com/react/components/toast)
 */
export class ToastViewportElement extends BaseHTMLElement {
  private _provider: ToastProviderElement | null = null;
  private _handler = () => this._syncAttributes();

  connectedCallback() {
    this._provider = this.closest('toast-provider') as ToastProviderElement | null;
    if (!this._provider) {
      console.error('Base UI: Toast parts must be placed within <toast-provider>.');
      return;
    }

    this.setAttribute('role', 'region');
    this.setAttribute('aria-live', 'polite');
    this.setAttribute('aria-atomic', 'false');
    this.setAttribute('aria-relevant', 'additions text');
    this.setAttribute('aria-label', 'Notifications');
    this.setAttribute('tabindex', '-1');

    this._provider.addEventListener(TOAST_LIST_CHANGE_EVENT, this._handler);

    this.addEventListener('mouseenter', this._handleMouseEnter);
    this.addEventListener('mouseleave', this._handleMouseLeave);
    this.addEventListener('focusin', this._handleFocusIn);
    this.addEventListener('focusout', this._handleFocusOut);

    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this._provider?.removeEventListener(TOAST_LIST_CHANGE_EVENT, this._handler);
    this.removeEventListener('mouseenter', this._handleMouseEnter);
    this.removeEventListener('mouseleave', this._handleMouseLeave);
    this.removeEventListener('focusin', this._handleFocusIn);
    this.removeEventListener('focusout', this._handleFocusOut);
    this._provider = null;
  }

  private _handleMouseEnter = () => {
    this._provider?.pauseTimers();
  };

  private _handleMouseLeave = () => {
    this._provider?.resumeTimers();
  };

  private _handleFocusIn = () => {
    this._provider?.pauseTimers();
  };

  private _handleFocusOut = (event: FocusEvent) => {
    // Only resume if focus leaves the viewport entirely
    if (!this.contains(event.relatedTarget as Node)) {
      this._provider?.resumeTimers();
    }
  };

  getProvider(): ToastProviderElement | null {
    return this._provider;
  }

  private _syncAttributes() {
    // Viewport doesn't need much syncing itself
  }
}

if (!customElements.get('toast-viewport')) {
  customElements.define('toast-viewport', ToastViewportElement);
}

// ─── ToastRootElement ───────────────────────────────────────────────────────────

/**
 * An individual toast notification.
 * Renders a `<toast-root>` custom element.
 *
 * Documentation: [Base UI Toast](https://base-ui.com/react/components/toast)
 */
export class ToastRootElement extends BaseHTMLElement {
  private _provider: ToastProviderElement | null = null;
  private _handler = () => this._syncAttributes();

  /** The toast ID this root represents. */
  toastId = '';

  /** Swipe directions that dismiss (e.g. ['right', 'down']). */
  swipeDirection: string[] = ['right', 'down'];

  /** Swipe threshold in pixels. */
  swipeThreshold = 40;

  // Swipe tracking
  private _startX = 0;
  private _startY = 0;
  private _swiping = false;
  private _pointerId: number | null = null;

  connectedCallback() {
    this._provider = this.closest('toast-provider') as ToastProviderElement | null;
    if (!this._provider) {
      console.error('Base UI: Toast parts must be placed within <toast-provider>.');
      return;
    }

    this.setAttribute('tabindex', '0');

    this._provider.addEventListener(TOAST_LIST_CHANGE_EVENT, this._handler);

    this.addEventListener('pointerdown', this._handlePointerDown);
    this.addEventListener('pointermove', this._handlePointerMove);
    this.addEventListener('pointerup', this._handlePointerUp);
    this.addEventListener('pointercancel', this._handlePointerUp);
    this.addEventListener('keydown', this._handleKeyDown);

    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this._provider?.removeEventListener(TOAST_LIST_CHANGE_EVENT, this._handler);
    this.removeEventListener('pointerdown', this._handlePointerDown);
    this.removeEventListener('pointermove', this._handlePointerMove);
    this.removeEventListener('pointerup', this._handlePointerUp);
    this.removeEventListener('pointercancel', this._handlePointerUp);
    this.removeEventListener('keydown', this._handleKeyDown);
    this._provider = null;
  }

  private _getToast(): ToastData | undefined {
    return this._provider?.getToasts().find((t) => t.id === this.toastId);
  }

  private _handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      this._provider?.close(this.toastId);
    }
  };

  private _handlePointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return;

    // Don't start swipe from interactive elements
    const target = event.target as HTMLElement;
    if (target.closest('button, a, input, select, textarea, [role="button"]')) return;

    this._startX = event.clientX;
    this._startY = event.clientY;
    this._swiping = false;
    this._pointerId = event.pointerId;

    try {
      this.setPointerCapture(event.pointerId);
    } catch {
      // May not be available in JSDOM
    }
  };

  private _handlePointerMove = (event: PointerEvent) => {
    if (this._pointerId == null || event.pointerId !== this._pointerId) return;

    const deltaX = event.clientX - this._startX;
    const deltaY = event.clientY - this._startY;

    // Check if movement exceeds threshold in a swipe direction
    for (const dir of this.swipeDirection) {
      if (
        (dir === 'right' && deltaX > this.swipeThreshold) ||
        (dir === 'left' && deltaX < -this.swipeThreshold) ||
        (dir === 'down' && deltaY > this.swipeThreshold) ||
        (dir === 'up' && deltaY < -this.swipeThreshold)
      ) {
        this._swiping = true;
        this.setAttribute('data-swiping', '');

        // Set CSS variables for swipe movement
        this.style.setProperty('--toast-swipe-movement-x', `${deltaX}px`);
        this.style.setProperty('--toast-swipe-movement-y', `${deltaY}px`);
        return;
      }
    }

    if (this._swiping) {
      this.style.setProperty('--toast-swipe-movement-x', `${deltaX}px`);
      this.style.setProperty('--toast-swipe-movement-y', `${deltaY}px`);
    }
  };

  private _handlePointerUp = () => {
    if (this._swiping && this._provider) {
      this._provider.close(this.toastId);
    }

    this._swiping = false;
    this._pointerId = null;
    this.removeAttribute('data-swiping');
    this.style.removeProperty('--toast-swipe-movement-x');
    this.style.removeProperty('--toast-swipe-movement-y');
  };

  private _syncAttributes() {
    const toast = this._getToast();
    if (!toast) return;

    // Role based on priority
    if (toast.priority === 'high') {
      this.setAttribute('role', 'alertdialog');
    } else {
      this.setAttribute('role', 'dialog');
    }
    this.setAttribute('aria-modal', 'false');

    // Type data attribute
    if (toast.type) {
      this.setAttribute('data-type', toast.type);
    } else {
      this.removeAttribute('data-type');
    }

    // Transition status
    if (toast.transitionStatus === 'starting') {
      this.setAttribute('data-state', 'starting');
    } else if (toast.transitionStatus === 'ending') {
      this.setAttribute('data-state', 'ending');
    } else {
      this.setAttribute('data-state', 'open');
    }

    // ARIA labels
    const titleEl = this.querySelector('toast-title');
    if (titleEl?.id) {
      this.setAttribute('aria-labelledby', titleEl.id);
    }
    const descEl = this.querySelector('toast-description');
    if (descEl?.id) {
      this.setAttribute('aria-describedby', descEl.id);
    }
  }
}

if (!customElements.get('toast-root')) {
  customElements.define('toast-root', ToastRootElement);
}

// ─── ToastContentElement ────────────────────────────────────────────────────────

/**
 * Wrapper for toast content.
 * Renders a `<toast-content>` custom element.
 *
 * Documentation: [Base UI Toast](https://base-ui.com/react/components/toast)
 */
export class ToastContentElement extends BaseHTMLElement {
  connectedCallback() {
    // Purely structural
  }
}

if (!customElements.get('toast-content')) {
  customElements.define('toast-content', ToastContentElement);
}

// ─── ToastTitleElement ──────────────────────────────────────────────────────────

/**
 * The title/heading of a toast.
 * Renders a `<toast-title>` custom element.
 *
 * Documentation: [Base UI Toast](https://base-ui.com/react/components/toast)
 */
export class ToastTitleElement extends BaseHTMLElement {
  connectedCallback() {
    ensureId(this, 'base-ui-toast-title');
  }
}

if (!customElements.get('toast-title')) {
  customElements.define('toast-title', ToastTitleElement);
}

// ─── ToastDescriptionElement ────────────────────────────────────────────────────

/**
 * The description/body of a toast.
 * Renders a `<toast-description>` custom element.
 *
 * Documentation: [Base UI Toast](https://base-ui.com/react/components/toast)
 */
export class ToastDescriptionElement extends BaseHTMLElement {
  connectedCallback() {
    ensureId(this, 'base-ui-toast-description');
  }
}

if (!customElements.get('toast-description')) {
  customElements.define('toast-description', ToastDescriptionElement);
}

// ─── ToastCloseElement ──────────────────────────────────────────────────────────

/**
 * A button that closes the parent toast.
 * Renders a `<toast-close>` custom element.
 *
 * Documentation: [Base UI Toast](https://base-ui.com/react/components/toast)
 */
export class ToastCloseElement extends BaseHTMLElement {
  private _provider: ToastProviderElement | null = null;

  connectedCallback() {
    this._provider = this.closest('toast-provider') as ToastProviderElement | null;

    this.setAttribute('role', 'button');
    this.setAttribute('tabindex', '0');

    this.addEventListener('click', this._handleClick);
    this.addEventListener('keydown', this._handleKeyDown);
  }

  disconnectedCallback() {
    this.removeEventListener('click', this._handleClick);
    this.removeEventListener('keydown', this._handleKeyDown);
    this._provider = null;
  }

  private _handleClick = () => {
    const root = this.closest('toast-root') as ToastRootElement | null;
    if (root && this._provider) {
      this._provider.close(root.toastId);
    }
  };

  private _handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this._handleClick();
    }
  };
}

if (!customElements.get('toast-close')) {
  customElements.define('toast-close', ToastCloseElement);
}

// ─── ToastActionElement ─────────────────────────────────────────────────────────

/**
 * A button for the toast's primary action.
 * Renders a `<toast-action>` custom element.
 *
 * Documentation: [Base UI Toast](https://base-ui.com/react/components/toast)
 */
export class ToastActionElement extends BaseHTMLElement {
  private _provider: ToastProviderElement | null = null;

  connectedCallback() {
    this._provider = this.closest('toast-provider') as ToastProviderElement | null;

    this.setAttribute('role', 'button');
    this.setAttribute('tabindex', '0');

    this.addEventListener('click', this._handleClick);
    this.addEventListener('keydown', this._handleKeyDown);
  }

  disconnectedCallback() {
    this.removeEventListener('click', this._handleClick);
    this.removeEventListener('keydown', this._handleKeyDown);
    this._provider = null;
  }

  private _handleClick = () => {
    const root = this.closest('toast-root') as ToastRootElement | null;
    if (!root || !this._provider) return;

    const toast = this._provider
      .getToasts()
      .find((t) => t.id === root.toastId);
    toast?.onAction?.();

    // Close after action
    this._provider.close(root.toastId);
  };

  private _handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this._handleClick();
    }
  };
}

if (!customElements.get('toast-action')) {
  customElements.define('toast-action', ToastActionElement);
}

// ─── Namespace exports ──────────────────────────────────────────────────────────

export namespace ToastProvider {
  export type State = ToastProviderState;
}

export namespace ToastViewport {
  export type State = ToastViewportState;
}

export namespace ToastRoot {
  export type State = ToastRootState;
}

export namespace ToastContent {
  export type State = ToastContentState;
}

export namespace ToastTitle {
  export type State = ToastTitleState;
}

export namespace ToastDescription {
  export type State = ToastDescriptionState;
}

export namespace ToastClose {
  export type State = ToastCloseState;
}

export namespace ToastAction {
  export type State = ToastActionState;
}

// ─── Global type declarations ───────────────────────────────────────────────────

declare global {
  interface HTMLElementTagNameMap {
    'toast-provider': ToastProviderElement;
    'toast-viewport': ToastViewportElement;
    'toast-root': ToastRootElement;
    'toast-content': ToastContentElement;
    'toast-title': ToastTitleElement;
    'toast-description': ToastDescriptionElement;
    'toast-close': ToastCloseElement;
    'toast-action': ToastActionElement;
  }
}
