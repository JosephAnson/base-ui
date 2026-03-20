import { ReactiveElement } from 'lit';
import { BaseHTMLElement, ensureId } from '../utils/index.ts';

// ─── Constants ──────────────────────────────────────────────────────────────────

const DIALOG_ROOT_ATTRIBUTE = 'data-base-ui-dialog-root';
const DIALOG_STATE_CHANGE_EVENT = 'base-ui-dialog-state-change';

// ─── Types ──────────────────────────────────────────────────────────────────────

type TransitionStatus = 'starting' | 'ending' | undefined;

export type DialogChangeEventReason =
  | 'trigger-press'
  | 'outside-press'
  | 'escape-key'
  | 'close-press'
  | 'focus-out'
  | 'none';

export interface DialogChangeEventDetails {
  reason: DialogChangeEventReason;
  event: Event;
  readonly isCanceled: boolean;
  cancel(): void;
}

export interface DialogRootState {
  open: boolean;
  modal: boolean;
  transitionStatus: TransitionStatus;
}

export interface DialogTriggerState {
  open: boolean;
}

export interface DialogPopupState extends DialogRootState {}
export interface DialogBackdropState extends DialogRootState {}
export interface DialogCloseState {
  disabled: boolean;
}

// ─── Open dialog stack (for nested dialog dismissal) ─────────────────────────

const openDialogStack: DialogRootElement[] = [];

function pushOpenDialog(root: DialogRootElement) {
  const idx = openDialogStack.indexOf(root);
  if (idx !== -1) openDialogStack.splice(idx, 1);
  openDialogStack.push(root);
}

function removeOpenDialog(root: DialogRootElement) {
  const idx = openDialogStack.indexOf(root);
  if (idx !== -1) openDialogStack.splice(idx, 1);
}

function getTopmostOpenDialog(): DialogRootElement | null {
  return openDialogStack.at(-1) ?? null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function createChangeEventDetails(
  reason: DialogChangeEventReason,
  event: Event,
): DialogChangeEventDetails {
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

// ─── DialogRootElement ───────────────────────────────────────────────────────────

/**
 * Groups all parts of the dialog.
 * Renders a `<dialog-root>` custom element (display:contents).
 *
 * Documentation: [Base UI Dialog](https://base-ui.com/react/components/dialog)
 */
export class DialogRootElement extends ReactiveElement {
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
    | ((open: boolean, details: DialogChangeEventDetails) => void)
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
    this.setAttribute(DIALOG_ROOT_ATTRIBUTE, '');

    document.addEventListener('keydown', this._handleEscapeKey);

    this._syncOpenStack();
    this._syncAttributes();
    queueMicrotask(() => this._publishStateChange());
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('keydown', this._handleEscapeKey);
    removeOpenDialog(this);
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

  getState(): DialogRootState {
    return {
      open: this.getOpen(),
      modal: this.modal,
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

  toggle(nextOpen: boolean, event: Event, reason: DialogChangeEventReason) {
    // For close operations, check if we're the topmost dialog
    if (
      !nextOpen &&
      (reason === 'outside-press' || reason === 'escape-key') &&
      getTopmostOpenDialog() !== this
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
  }

  private _handleEscapeKey = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    if (!this.getOpen()) return;

    // Only the topmost open dialog should handle Escape
    if (getTopmostOpenDialog() !== this) return;

    event.preventDefault();
    this.toggle(false, event, 'escape-key');
  };

  private _syncOpenStack() {
    if (this.getOpen()) {
      pushOpenDialog(this);
    } else {
      removeOpenDialog(this);
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
      this.modal ? 'modal' : 'non-modal',
      this._transitionStatus ?? 'idle',
      this._popupId ?? '',
      this._titleId ?? '',
      this._descriptionId ?? '',
    ].join('|');

    if (nextKey === this._lastPublishedStateKey) return;
    this._lastPublishedStateKey = nextKey;
    this.dispatchEvent(new CustomEvent(DIALOG_STATE_CHANGE_EVENT));
  }
}

if (!customElements.get('dialog-root')) {
  customElements.define('dialog-root', DialogRootElement);
}

// ─── DialogTriggerElement ────────────────────────────────────────────────────────

/**
 * A button that opens the dialog.
 * Renders a `<dialog-trigger>` custom element.
 *
 * Documentation: [Base UI Dialog](https://base-ui.com/react/components/dialog)
 */
export class DialogTriggerElement extends BaseHTMLElement {
  private _root: DialogRootElement | null = null;
  private _handler = () => this._syncAttributes();

  connectedCallback() {
    this._root = this.closest('dialog-root') as DialogRootElement | null;
    if (!this._root) {
      console.error(
        'Base UI: Dialog parts must be placed within <dialog-root>.',
      );
      return;
    }

    this.setAttribute('role', 'button');
    this.setAttribute('tabindex', '0');

    this._root.addEventListener(DIALOG_STATE_CHANGE_EVENT, this._handler);

    this.addEventListener('click', this._handleClick);
    this.addEventListener('keydown', this._handleKeyDown);
    this.addEventListener('keyup', this._handleKeyUp);

    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(DIALOG_STATE_CHANGE_EVENT, this._handler);
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

if (!customElements.get('dialog-trigger')) {
  customElements.define('dialog-trigger', DialogTriggerElement);
}

// ─── DialogPortalElement ─────────────────────────────────────────────────────────

/**
 * A portal that renders dialog content.
 * Currently a passthrough element (display:contents). Content uses CSS positioning.
 * Renders a `<dialog-portal>` custom element.
 *
 * Documentation: [Base UI Dialog](https://base-ui.com/react/components/dialog)
 */
export class DialogPortalElement extends BaseHTMLElement {
  private _root: DialogRootElement | null = null;
  private _handler = () => this._syncVisibility();

  connectedCallback() {
    this._root = this.closest('dialog-root') as DialogRootElement | null;
    if (!this._root) {
      console.error(
        'Base UI: Dialog parts must be placed within <dialog-root>.',
      );
      return;
    }

    this.style.display = 'contents';
    this._root.addEventListener(DIALOG_STATE_CHANGE_EVENT, this._handler);

    queueMicrotask(() => this._syncVisibility());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(DIALOG_STATE_CHANGE_EVENT, this._handler);
    this._root = null;
  }

  private _syncVisibility() {
    if (!this._root) return;
    const open = this._root.getOpen();
    this.toggleAttribute('data-open', open);
    this.toggleAttribute('data-closed', !open);
  }
}

if (!customElements.get('dialog-portal')) {
  customElements.define('dialog-portal', DialogPortalElement);
}

// ─── DialogPopupElement ──────────────────────────────────────────────────────────

/**
 * The dialog popup panel.
 * Renders a `<dialog-popup>` custom element.
 *
 * Documentation: [Base UI Dialog](https://base-ui.com/react/components/dialog)
 */
export class DialogPopupElement extends BaseHTMLElement {
  private _root: DialogRootElement | null = null;
  private _handler = () => this._handleStateChange();
  private _mounted = false;
  private _transitionStatus: TransitionStatus = undefined;
  private _lastOpen: boolean | null = null;
  private _frameId: number | null = null;
  private _exitRunId = 0;

  connectedCallback() {
    this._root = this.closest('dialog-root') as DialogRootElement | null;
    if (!this._root) {
      console.error(
        'Base UI: Dialog parts must be placed within <dialog-root>.',
      );
      return;
    }

    ensureId(this, 'base-ui-dialog-popup');
    this._root.setPopupId(this.id);

    this._root.addEventListener(DIALOG_STATE_CHANGE_EVENT, this._handler);

    // Immediately hide if closed
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
      this._root.removeEventListener(DIALOG_STATE_CHANGE_EVENT, this._handler);
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

if (!customElements.get('dialog-popup')) {
  customElements.define('dialog-popup', DialogPopupElement);
}

// ─── DialogBackdropElement ───────────────────────────────────────────────────────

/**
 * A backdrop that covers the page behind the dialog.
 * Renders a `<dialog-backdrop>` custom element.
 *
 * Documentation: [Base UI Dialog](https://base-ui.com/react/components/dialog)
 */
export class DialogBackdropElement extends BaseHTMLElement {
  private _root: DialogRootElement | null = null;
  private _handler = () => this._syncVisibility();

  connectedCallback() {
    this._root = this.closest('dialog-root') as DialogRootElement | null;
    if (!this._root) {
      console.error(
        'Base UI: Dialog parts must be placed within <dialog-root>.',
      );
      return;
    }

    this.setAttribute('role', 'presentation');

    this._root.addEventListener(DIALOG_STATE_CHANGE_EVENT, this._handler);

    this.addEventListener('click', this._handleClick);

    // Immediately hide if closed
    if (!this._root.getOpen()) {
      this.setAttribute('hidden', '');
    }

    queueMicrotask(() => this._syncVisibility());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(DIALOG_STATE_CHANGE_EVENT, this._handler);
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

if (!customElements.get('dialog-backdrop')) {
  customElements.define('dialog-backdrop', DialogBackdropElement);
}

// ─── DialogTitleElement ──────────────────────────────────────────────────────────

/**
 * A title for the dialog.
 * Renders a `<dialog-title>` custom element.
 *
 * Documentation: [Base UI Dialog](https://base-ui.com/react/components/dialog)
 */
export class DialogTitleElement extends BaseHTMLElement {
  private _root: DialogRootElement | null = null;

  connectedCallback() {
    this._root = this.closest('dialog-root') as DialogRootElement | null;
    if (!this._root) {
      console.error(
        'Base UI: Dialog parts must be placed within <dialog-root>.',
      );
      return;
    }

    ensureId(this, 'base-ui-dialog-title');
    this._root.setTitleId(this.id);
  }

  disconnectedCallback() {
    this._root?.setTitleId(undefined);
    this._root = null;
  }
}

if (!customElements.get('dialog-title')) {
  customElements.define('dialog-title', DialogTitleElement);
}

// ─── DialogDescriptionElement ────────────────────────────────────────────────────

/**
 * A description for the dialog.
 * Renders a `<dialog-description>` custom element.
 *
 * Documentation: [Base UI Dialog](https://base-ui.com/react/components/dialog)
 */
export class DialogDescriptionElement extends BaseHTMLElement {
  private _root: DialogRootElement | null = null;

  connectedCallback() {
    this._root = this.closest('dialog-root') as DialogRootElement | null;
    if (!this._root) {
      console.error(
        'Base UI: Dialog parts must be placed within <dialog-root>.',
      );
      return;
    }

    ensureId(this, 'base-ui-dialog-description');
    this._root.setDescriptionId(this.id);
  }

  disconnectedCallback() {
    this._root?.setDescriptionId(undefined);
    this._root = null;
  }
}

if (!customElements.get('dialog-description')) {
  customElements.define('dialog-description', DialogDescriptionElement);
}

// ─── DialogCloseElement ──────────────────────────────────────────────────────────

/**
 * A button that closes the dialog.
 * Renders a `<dialog-close>` custom element.
 *
 * Documentation: [Base UI Dialog](https://base-ui.com/react/components/dialog)
 */
export class DialogCloseElement extends BaseHTMLElement {
  /** Whether this close button is disabled. */
  disabled = false;

  private _root: DialogRootElement | null = null;

  connectedCallback() {
    this._root = this.closest('dialog-root') as DialogRootElement | null;
    if (!this._root) {
      console.error(
        'Base UI: Dialog parts must be placed within <dialog-root>.',
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

if (!customElements.get('dialog-close')) {
  customElements.define('dialog-close', DialogCloseElement);
}

// ─── Namespace exports ──────────────────────────────────────────────────────────

export namespace DialogRoot {
  export type State = DialogRootState;
  export type ChangeEventReason = DialogChangeEventReason;
  export type ChangeEventDetails = DialogChangeEventDetails;
}

export namespace DialogTrigger {
  export type State = DialogTriggerState;
}

export namespace DialogPopup {
  export type State = DialogPopupState;
}

export namespace DialogBackdrop {
  export type State = DialogBackdropState;
}

export namespace DialogClose {
  export type State = DialogCloseState;
}

// ─── Global type declarations ───────────────────────────────────────────────────

declare global {
  interface HTMLElementTagNameMap {
    'dialog-root': DialogRootElement;
    'dialog-trigger': DialogTriggerElement;
    'dialog-portal': DialogPortalElement;
    'dialog-popup': DialogPopupElement;
    'dialog-backdrop': DialogBackdropElement;
    'dialog-title': DialogTitleElement;
    'dialog-description': DialogDescriptionElement;
    'dialog-close': DialogCloseElement;
  }
}
