import { ReactiveElement } from 'lit';
import { BaseHTMLElement, ensureId } from '../utils/index.ts';

// ─── Constants ──────────────────────────────────────────────────────────────────

const ALERT_DIALOG_ROOT_ATTRIBUTE = 'data-base-ui-alert-dialog-root';
const ALERT_DIALOG_STATE_CHANGE_EVENT = 'base-ui-alert-dialog-state-change';

// ─── Types ──────────────────────────────────────────────────────────────────────

type TransitionStatus = 'starting' | 'ending' | undefined;

export type AlertDialogChangeEventReason =
  | 'trigger-press'
  | 'escape-key'
  | 'close-press'
  | 'none';

export interface AlertDialogChangeEventDetails {
  reason: AlertDialogChangeEventReason;
  event: Event;
  readonly isCanceled: boolean;
  cancel(): void;
}

export interface AlertDialogRootState {
  open: boolean;
  transitionStatus: TransitionStatus;
}

export interface AlertDialogTriggerState {
  open: boolean;
}

export interface AlertDialogPopupState extends AlertDialogRootState {}
export interface AlertDialogBackdropState extends AlertDialogRootState {}

export interface AlertDialogCloseState {
  disabled: boolean;
}

// ─── Open alert dialog stack (for nested dismissal) ──────────────────────────

const openAlertDialogStack: AlertDialogRootElement[] = [];

function pushOpenAlertDialog(root: AlertDialogRootElement) {
  const idx = openAlertDialogStack.indexOf(root);
  if (idx !== -1) openAlertDialogStack.splice(idx, 1);
  openAlertDialogStack.push(root);
}

function removeOpenAlertDialog(root: AlertDialogRootElement) {
  const idx = openAlertDialogStack.indexOf(root);
  if (idx !== -1) openAlertDialogStack.splice(idx, 1);
}

function getTopmostOpenAlertDialog(): AlertDialogRootElement | null {
  return openAlertDialogStack.at(-1) ?? null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function createChangeEventDetails(
  reason: AlertDialogChangeEventReason,
  event: Event,
): AlertDialogChangeEventDetails {
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

// ─── AlertDialogRootElement ──────────────────────────────────────────────────────

/**
 * Groups all parts of the alert dialog.
 * Always modal. Backdrop clicks do NOT dismiss.
 * Renders an `<alert-dialog-root>` custom element (display:contents).
 *
 * Documentation: [Base UI AlertDialog](https://base-ui.com/react/components/alert-dialog)
 */
export class AlertDialogRootElement extends ReactiveElement {
  static properties = {
    disabled: { type: Boolean },
  };

  declare disabled: boolean;

  /** Default open state (uncontrolled). */
  defaultOpen = false;

  /** Callback when open state changes. */
  onOpenChange:
    | ((open: boolean, details: AlertDialogChangeEventDetails) => void)
    | undefined;

  // Controlled/uncontrolled open
  private _open: boolean | undefined;
  private _openIsControlled = false;
  private _internalOpen = false;
  private _initialized = false;
  private _transitionStatus: TransitionStatus = undefined;
  private _lastPublishedStateKey: string | null = null;

  // Registered part IDs
  private _popupId: string | undefined;
  private _titleId: string | undefined;
  private _descriptionId: string | undefined;

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

    this.style.display = 'contents';
    this.setAttribute(ALERT_DIALOG_ROOT_ATTRIBUTE, '');

    document.addEventListener('keydown', this._handleEscapeKey);

    this._syncOpenStack();
    this._syncAttributes();
    queueMicrotask(() => this._publishStateChange());
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('keydown', this._handleEscapeKey);
    removeOpenAlertDialog(this);
    this._lastPublishedStateKey = null;
    this._transitionStatus = undefined;
  }

  protected override updated() {
    this._syncOpenStack();
    this._syncAttributes();
    this._publishStateChange();
  }

  getOpen(): boolean {
    return this._openIsControlled ? Boolean(this._open) : this._internalOpen;
  }

  getState(): AlertDialogRootState {
    return {
      open: this.getOpen(),
      transitionStatus: this._transitionStatus,
    };
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

  toggle(nextOpen: boolean, event: Event, reason: AlertDialogChangeEventReason) {
    // Only topmost alert dialog handles Escape
    if (
      !nextOpen &&
      reason === 'escape-key' &&
      getTopmostOpenAlertDialog() !== this
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
  }

  private _handleEscapeKey = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    if (!this.getOpen()) return;
    if (getTopmostOpenAlertDialog() !== this) return;

    event.preventDefault();
    this.toggle(false, event, 'escape-key');
  };

  private _syncOpenStack() {
    if (this.getOpen()) {
      pushOpenAlertDialog(this);
    } else {
      removeOpenAlertDialog(this);
    }
  }

  private _syncAttributes() {
    const state = this.getState();
    this.toggleAttribute('data-open', state.open);
    this.toggleAttribute('data-closed', !state.open);
  }

  private _publishStateChange() {
    const nextKey = [
      this.getOpen() ? 'open' : 'closed',
      this._transitionStatus ?? 'idle',
      this._popupId ?? '',
      this._titleId ?? '',
      this._descriptionId ?? '',
    ].join('|');

    if (nextKey === this._lastPublishedStateKey) return;
    this._lastPublishedStateKey = nextKey;
    this.dispatchEvent(new CustomEvent(ALERT_DIALOG_STATE_CHANGE_EVENT));
  }
}

if (!customElements.get('alert-dialog-root')) {
  customElements.define('alert-dialog-root', AlertDialogRootElement);
}

// ─── AlertDialogTriggerElement ───────────────────────────────────────────────────

/**
 * A button that opens the alert dialog.
 * Renders an `<alert-dialog-trigger>` custom element.
 */
export class AlertDialogTriggerElement extends BaseHTMLElement {
  private _root: AlertDialogRootElement | null = null;
  private _handler = () => this._syncAttributes();

  connectedCallback() {
    this._root = this.closest('alert-dialog-root') as AlertDialogRootElement | null;
    if (!this._root) {
      console.error(
        'Base UI: AlertDialog parts must be placed within <alert-dialog-root>.',
      );
      return;
    }

    this.setAttribute('role', 'button');
    this.setAttribute('tabindex', '0');

    this._root.addEventListener(ALERT_DIALOG_STATE_CHANGE_EVENT, this._handler);

    this.addEventListener('click', this._handleClick);
    this.addEventListener('keydown', this._handleKeyDown);
    this.addEventListener('keyup', this._handleKeyUp);

    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(ALERT_DIALOG_STATE_CHANGE_EVENT, this._handler);
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

if (!customElements.get('alert-dialog-trigger')) {
  customElements.define('alert-dialog-trigger', AlertDialogTriggerElement);
}

// ─── AlertDialogPopupElement ─────────────────────────────────────────────────────

/**
 * The alert dialog popup panel.
 * Uses role="alertdialog" and aria-modal="true".
 * Renders an `<alert-dialog-popup>` custom element.
 */
export class AlertDialogPopupElement extends BaseHTMLElement {
  private _root: AlertDialogRootElement | null = null;
  private _handler = () => this._handleStateChange();
  private _mounted = false;
  private _transitionStatus: TransitionStatus = undefined;
  private _lastOpen: boolean | null = null;
  private _frameId: number | null = null;
  private _exitRunId = 0;

  connectedCallback() {
    this._root = this.closest('alert-dialog-root') as AlertDialogRootElement | null;
    if (!this._root) {
      console.error(
        'Base UI: AlertDialog parts must be placed within <alert-dialog-root>.',
      );
      return;
    }

    ensureId(this, 'base-ui-alert-dialog-popup');
    this._root.setPopupId(this.id);

    this._root.addEventListener(ALERT_DIALOG_STATE_CHANGE_EVENT, this._handler);

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
      this._root.removeEventListener(ALERT_DIALOG_STATE_CHANGE_EVENT, this._handler);
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

    // ARIA - always alertdialog, always modal
    this.setAttribute('role', 'alertdialog');
    this.setAttribute('aria-modal', 'true');

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

    this.toggleAttribute('data-open', open);
    this.toggleAttribute('data-closed', !open);
    this.toggleAttribute('data-starting-style', this._transitionStatus === 'starting');
    this.toggleAttribute('data-ending-style', this._transitionStatus === 'ending');

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

if (!customElements.get('alert-dialog-popup')) {
  customElements.define('alert-dialog-popup', AlertDialogPopupElement);
}

// ─── AlertDialogBackdropElement ──────────────────────────────────────────────────

/**
 * A backdrop behind the alert dialog. Does NOT dismiss on click.
 * Renders an `<alert-dialog-backdrop>` custom element.
 */
export class AlertDialogBackdropElement extends BaseHTMLElement {
  private _root: AlertDialogRootElement | null = null;
  private _handler = () => this._syncVisibility();

  connectedCallback() {
    this._root = this.closest('alert-dialog-root') as AlertDialogRootElement | null;
    if (!this._root) {
      console.error(
        'Base UI: AlertDialog parts must be placed within <alert-dialog-root>.',
      );
      return;
    }

    this.setAttribute('role', 'presentation');
    this._root.addEventListener(ALERT_DIALOG_STATE_CHANGE_EVENT, this._handler);

    if (!this._root.getOpen()) {
      this.setAttribute('hidden', '');
    }

    queueMicrotask(() => this._syncVisibility());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(ALERT_DIALOG_STATE_CHANGE_EVENT, this._handler);
    this._root = null;
  }

  // No click handler - backdrop does NOT dismiss alert dialog
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

if (!customElements.get('alert-dialog-backdrop')) {
  customElements.define('alert-dialog-backdrop', AlertDialogBackdropElement);
}

// ─── AlertDialogTitleElement ─────────────────────────────────────────────────────

/**
 * A title for the alert dialog.
 * Renders an `<alert-dialog-title>` custom element.
 */
export class AlertDialogTitleElement extends BaseHTMLElement {
  private _root: AlertDialogRootElement | null = null;

  connectedCallback() {
    this._root = this.closest('alert-dialog-root') as AlertDialogRootElement | null;
    if (!this._root) {
      console.error(
        'Base UI: AlertDialog parts must be placed within <alert-dialog-root>.',
      );
      return;
    }

    ensureId(this, 'base-ui-alert-dialog-title');
    this._root.setTitleId(this.id);
  }

  disconnectedCallback() {
    this._root?.setTitleId(undefined);
    this._root = null;
  }
}

if (!customElements.get('alert-dialog-title')) {
  customElements.define('alert-dialog-title', AlertDialogTitleElement);
}

// ─── AlertDialogDescriptionElement ───────────────────────────────────────────────

/**
 * A description for the alert dialog.
 * Renders an `<alert-dialog-description>` custom element.
 */
export class AlertDialogDescriptionElement extends BaseHTMLElement {
  private _root: AlertDialogRootElement | null = null;

  connectedCallback() {
    this._root = this.closest('alert-dialog-root') as AlertDialogRootElement | null;
    if (!this._root) {
      console.error(
        'Base UI: AlertDialog parts must be placed within <alert-dialog-root>.',
      );
      return;
    }

    ensureId(this, 'base-ui-alert-dialog-description');
    this._root.setDescriptionId(this.id);
  }

  disconnectedCallback() {
    this._root?.setDescriptionId(undefined);
    this._root = null;
  }
}

if (!customElements.get('alert-dialog-description')) {
  customElements.define('alert-dialog-description', AlertDialogDescriptionElement);
}

// ─── AlertDialogCloseElement ─────────────────────────────────────────────────────

/**
 * A button that closes the alert dialog.
 * Renders an `<alert-dialog-close>` custom element.
 */
export class AlertDialogCloseElement extends BaseHTMLElement {
  disabled = false;

  private _root: AlertDialogRootElement | null = null;

  connectedCallback() {
    this._root = this.closest('alert-dialog-root') as AlertDialogRootElement | null;
    if (!this._root) {
      console.error(
        'Base UI: AlertDialog parts must be placed within <alert-dialog-root>.',
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

if (!customElements.get('alert-dialog-close')) {
  customElements.define('alert-dialog-close', AlertDialogCloseElement);
}

// ─── Namespace exports ──────────────────────────────────────────────────────────

export namespace AlertDialogRoot {
  export type State = AlertDialogRootState;
  export type ChangeEventReason = AlertDialogChangeEventReason;
  export type ChangeEventDetails = AlertDialogChangeEventDetails;
}

export namespace AlertDialogTrigger {
  export type State = AlertDialogTriggerState;
}

export namespace AlertDialogPopup {
  export type State = AlertDialogPopupState;
}

export namespace AlertDialogBackdrop {
  export type State = AlertDialogBackdropState;
}

export namespace AlertDialogClose {
  export type State = AlertDialogCloseState;
}

// ─── Global type declarations ───────────────────────────────────────────────────

declare global {
  interface HTMLElementTagNameMap {
    'alert-dialog-root': AlertDialogRootElement;
    'alert-dialog-trigger': AlertDialogTriggerElement;
    'alert-dialog-popup': AlertDialogPopupElement;
    'alert-dialog-backdrop': AlertDialogBackdropElement;
    'alert-dialog-title': AlertDialogTitleElement;
    'alert-dialog-description': AlertDialogDescriptionElement;
    'alert-dialog-close': AlertDialogCloseElement;
  }
}
