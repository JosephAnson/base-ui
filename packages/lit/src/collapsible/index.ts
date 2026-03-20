import { ReactiveElement } from 'lit';
import { BaseHTMLElement, ensureId } from '../utils/index.ts';

// ─── Constants ──────────────────────────────────────────────────────────────────

const COLLAPSIBLE_ROOT_ATTRIBUTE = 'data-base-ui-collapsible-root';
const COLLAPSIBLE_STATE_CHANGE_EVENT = 'base-ui-collapsible-state-change';
const COLLAPSIBLE_PANEL_HEIGHT_VAR = '--collapsible-panel-height';
const COLLAPSIBLE_PANEL_WIDTH_VAR = '--collapsible-panel-width';

// ─── Types ──────────────────────────────────────────────────────────────────────

type TransitionStatus = 'starting' | 'ending' | undefined;

export type CollapsibleChangeEventReason = 'trigger-press' | 'none';

export interface CollapsibleChangeEventDetails {
  reason: CollapsibleChangeEventReason;
  event: Event;
  readonly isCanceled: boolean;
  cancel(): void;
}

export interface CollapsibleRootState {
  disabled: boolean;
  open: boolean;
  transitionStatus: TransitionStatus;
}

export interface CollapsibleTriggerState extends CollapsibleRootState {}
export interface CollapsiblePanelState extends CollapsibleRootState {}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function createChangeEventDetails(
  reason: CollapsibleChangeEventReason,
  event: Event,
): CollapsibleChangeEventDetails {
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

// ─── CollapsibleRootElement ─────────────────────────────────────────────────────

/**
 * Groups all parts of the collapsible.
 * Renders a `<collapsible-root>` custom element.
 *
 * Documentation: [Base UI Collapsible](https://base-ui.com/react/components/collapsible)
 */
export class CollapsibleRootElement extends ReactiveElement {
  static properties = {
    disabled: { type: Boolean },
  };

  declare disabled: boolean;

  /** Default open state (uncontrolled). */
  defaultOpen = false;

  /** Callback when open state changes. Set via `.onOpenChange=${fn}`. */
  onOpenChange:
    | ((open: boolean, eventDetails: CollapsibleChangeEventDetails) => void)
    | undefined;

  // Controlled/uncontrolled open
  private _open: boolean | undefined;
  private _openIsControlled = false;
  private _internalOpen = false;
  private _initialized = false;
  private _panelId: string | undefined;
  private _transitionStatus: TransitionStatus = undefined;
  private _lastPublishedStateKey: string | null = null;

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

    this.setAttribute(COLLAPSIBLE_ROOT_ATTRIBUTE, '');
    this._syncAttributes();

    queueMicrotask(() => this._publishStateChange());
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this._lastPublishedStateKey = null;
    this._transitionStatus = undefined;
  }

  protected override updated() {
    this._syncAttributes();
    this._publishStateChange();
  }

  getOpen(): boolean {
    return this._openIsControlled ? Boolean(this._open) : this._internalOpen;
  }

  getState(): CollapsibleRootState {
    return {
      disabled: this.disabled,
      open: this.getOpen(),
      transitionStatus: this._transitionStatus,
    };
  }

  getPanelId(): string | undefined {
    return this._panelId;
  }

  setPanelId(id: string | undefined) {
    if (this._panelId === id) return;
    this._panelId = id;
    this._publishStateChange();
  }

  setTransitionStatus(status: TransitionStatus) {
    if (this._transitionStatus === status) return;
    this._transitionStatus = status;
    this._syncAttributes();
    this._publishStateChange();
  }

  toggle(nextOpen: boolean, event: Event, reason: CollapsibleChangeEventReason) {
    const details = createChangeEventDetails(reason, event);
    this.onOpenChange?.(nextOpen, details);

    if (details.isCanceled) return;

    if (!this._openIsControlled) {
      this._internalOpen = nextOpen;
    }

    this._syncAttributes();
    this._publishStateChange();
  }

  private _syncAttributes() {
    const state = this.getState();
    this.toggleAttribute('data-open', state.open);
    this.toggleAttribute('data-closed', !state.open);
    this.toggleAttribute('data-disabled', state.disabled);
    this.toggleAttribute('data-starting-style', state.transitionStatus === 'starting');
    this.toggleAttribute('data-ending-style', state.transitionStatus === 'ending');
  }

  private _publishStateChange() {
    const nextKey = [
      this.getOpen() ? 'open' : 'closed',
      this.disabled ? 'disabled' : 'enabled',
      this._transitionStatus ?? 'idle',
      this._panelId ?? '',
    ].join('|');

    if (nextKey === this._lastPublishedStateKey) return;
    this._lastPublishedStateKey = nextKey;
    this.dispatchEvent(new CustomEvent(COLLAPSIBLE_STATE_CHANGE_EVENT));
  }
}

if (!customElements.get('collapsible-root')) {
  customElements.define('collapsible-root', CollapsibleRootElement);
}

// ─── CollapsibleTriggerElement ──────────────────────────────────────────────────

/**
 * A button that opens and closes the collapsible panel.
 * Renders a `<collapsible-trigger>` custom element.
 *
 * Documentation: [Base UI Collapsible](https://base-ui.com/react/components/collapsible)
 */
export class CollapsibleTriggerElement extends BaseHTMLElement {
  private _root: CollapsibleRootElement | null = null;
  private _handler = () => this._syncAttributes();

  connectedCallback() {
    this._root = this.closest('collapsible-root') as CollapsibleRootElement | null;
    if (!this._root) {
      console.error(
        'Base UI: Collapsible parts must be placed within <collapsible-root>.',
      );
      return;
    }

    this.setAttribute('role', 'button');
    this.setAttribute('tabindex', '0');

    this._root.addEventListener(COLLAPSIBLE_STATE_CHANGE_EVENT, this._handler);

    this.addEventListener('click', this._handleClick);
    this.addEventListener('keydown', this._handleKeyDown);
    this.addEventListener('keyup', this._handleKeyUp);

    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(COLLAPSIBLE_STATE_CHANGE_EVENT, this._handler);
    this.removeEventListener('click', this._handleClick);
    this.removeEventListener('keydown', this._handleKeyDown);
    this.removeEventListener('keyup', this._handleKeyUp);
    this._root = null;
  }

  private _handleClick = (event: Event) => {
    if (!this._root) return;
    const state = this._root.getState();
    if (state.disabled) {
      event.preventDefault();
      return;
    }
    this._root.toggle(!state.open, event, 'trigger-press');
  };

  private _handleKeyDown = (event: KeyboardEvent) => {
    if (!this._root) return;
    if (event.target !== this) return;
    const state = this._root.getState();
    if (state.disabled) return;

    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      this._root.toggle(!state.open, event, 'trigger-press');
    }
  };

  private _handleKeyUp = (event: KeyboardEvent) => {
    if (event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
    }
  };

  private _syncAttributes() {
    if (!this._root) return;
    const state = this._root.getState();
    const panelId = this._root.getPanelId();

    this.setAttribute('aria-expanded', String(state.open));

    if (state.open && panelId) {
      this.setAttribute('aria-controls', panelId);
    } else {
      this.removeAttribute('aria-controls');
    }

    this.toggleAttribute('data-panel-open', state.open);
    this.toggleAttribute('data-disabled', state.disabled);

    if (state.disabled) {
      this.setAttribute('aria-disabled', 'true');
    } else {
      this.removeAttribute('aria-disabled');
    }

    this.toggleAttribute('data-starting-style', state.transitionStatus === 'starting');
    this.toggleAttribute('data-ending-style', state.transitionStatus === 'ending');
  }
}

if (!customElements.get('collapsible-trigger')) {
  customElements.define('collapsible-trigger', CollapsibleTriggerElement);
}

// ─── CollapsiblePanelElement ────────────────────────────────────────────────────

/**
 * A panel with the collapsible contents.
 * Renders a `<collapsible-panel>` custom element.
 *
 * Documentation: [Base UI Collapsible](https://base-ui.com/react/components/collapsible)
 */
export class CollapsiblePanelElement extends BaseHTMLElement {
  static get observedAttributes() {
    return ['keep-mounted', 'hidden-until-found'];
  }

  /** Keep the panel in the DOM when closed. */
  keepMounted = false;

  /** Use hidden="until-found" for browser find-in-page support. */
  hiddenUntilFound = false;

  private _root: CollapsibleRootElement | null = null;
  private _handler = () => this._handleStateChange();
  private _mounted = false;
  private _transitionStatus: TransitionStatus = undefined;
  private _lastOpen: boolean | null = null;
  private _frameId: number | null = null;
  private _exitRunId = 0;

  connectedCallback() {
    // Custom elements default to display:inline where height/overflow are ignored.
    // Ensure block display so CSS height transitions work (matches React's <div>).
    if (!this.style.display) {
      this.style.display = 'block';
    }

    this._root = this.closest('collapsible-root') as CollapsibleRootElement | null;
    if (!this._root) {
      console.error(
        'Base UI: Collapsible parts must be placed within <collapsible-root>.',
      );
      return;
    }

    ensureId(this, 'base-ui-collapsible-panel');
    this._root.setPanelId(this.id);
    this._root.addEventListener(COLLAPSIBLE_STATE_CHANGE_EVENT, this._handler);

    // Immediately hide if root is closed to prevent flash
    if (!this._root.getOpen()) {
      this.setAttribute('hidden', '');
    }

    queueMicrotask(() => this._handleStateChange());
  }

  disconnectedCallback() {
    this._clearFrame();
    if (this._root) {
      this._root.setPanelId(undefined);
      this._root.setTransitionStatus(undefined);
      this._root.removeEventListener(COLLAPSIBLE_STATE_CHANGE_EVENT, this._handler);
    }
    this._root = null;
    this._mounted = false;
    this._lastOpen = null;
    this._transitionStatus = undefined;
  }

  attributeChangedCallback(name: string) {
    if (name === 'keep-mounted') {
      this.keepMounted = this.hasAttribute('keep-mounted');
    }
    if (name === 'hidden-until-found') {
      this.hiddenUntilFound = this.hasAttribute('hidden-until-found');
    }
    // Re-evaluate visibility when these attributes change
    if (this._root) {
      this._handleStateChange();
    }
  }

  private _handleStateChange() {
    if (!this._root) return;

    const state = this._root.getState();
    const open = state.open;
    const wasOpen = this._lastOpen;
    const shouldStayMounted = this.keepMounted || this.hiddenUntilFound;

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
      this._scheduleExitCleanup(shouldStayMounted);
    } else if (!this._mounted && shouldStayMounted) {
      this._mounted = true;
    }

    this._lastOpen = open;
    this._syncVisibility();
  }

  private _syncVisibility() {
    if (!this._root) return;

    const state = this._root.getState();
    const open = state.open;
    const shouldStayMounted = this.keepMounted || this.hiddenUntilFound;
    const shouldRender = this._mounted || this._transitionStatus === 'ending' || shouldStayMounted;

    if (!shouldRender) {
      this.setAttribute('hidden', '');
      this._root.setTransitionStatus(undefined);
      return;
    }

    const hidden = !open && this._transitionStatus !== 'ending';

    // Sync hidden attribute
    if (this.hiddenUntilFound && hidden) {
      this.setAttribute('hidden', 'until-found');
    } else if (hidden) {
      this.setAttribute('hidden', '');
    } else {
      this.removeAttribute('hidden');
    }

    // Sync data attributes
    this.toggleAttribute('data-open', open);
    this.toggleAttribute('data-closed', !open);
    this.toggleAttribute('data-disabled', state.disabled);
    this.toggleAttribute('data-starting-style', this._transitionStatus === 'starting');
    this.toggleAttribute('data-ending-style', this._transitionStatus === 'ending');

    // CSS custom properties for height/width
    const height = this.scrollHeight;
    const width = this.scrollWidth;
    this.style.setProperty(COLLAPSIBLE_PANEL_HEIGHT_VAR, height ? `${height}px` : 'auto');
    this.style.setProperty(COLLAPSIBLE_PANEL_WIDTH_VAR, width ? `${width}px` : 'auto');

    // Update root's transition status
    this._root.setTransitionStatus(this._transitionStatus);
  }

  private _scheduleStartingCleanup() {
    this._clearFrame();
    // Double rAF ensures the browser paints the starting state (height: 0)
    // before we remove data-starting-style and trigger the CSS transition.
    this._frameId = requestAnimationFrame(() => {
      this._frameId = requestAnimationFrame(() => {
        this._frameId = null;
        if (!this._root || this._transitionStatus !== 'starting') return;
        if (!this._root.getOpen()) return;
        this._transitionStatus = undefined;
        this._syncVisibility();
      });
    });
  }

  private _scheduleExitCleanup(keepMounted: boolean) {
    this._clearFrame();
    this._exitRunId += 1;
    const runId = this._exitRunId;
    this._frameId = requestAnimationFrame(() => {
      this._frameId = null;
      this._waitForExitAnimations(runId, keepMounted);
    });
  }

  private _waitForExitAnimations(runId: number, keepMounted: boolean) {
    if (runId !== this._exitRunId) return;

    if (
      typeof this.getAnimations !== 'function' ||
      (globalThis as typeof globalThis & { BASE_UI_ANIMATIONS_DISABLED?: boolean })
        .BASE_UI_ANIMATIONS_DISABLED
    ) {
      this._finishExit(runId, keepMounted);
      return;
    }

    Promise.all(this.getAnimations().map((a) => a.finished))
      .then(() => this._finishExit(runId, keepMounted))
      .catch(() => {
        if (runId !== this._exitRunId) return;
        const active = this.getAnimations();
        if (
          active.length > 0 &&
          active.some((a) => a.pending || a.playState !== 'finished')
        ) {
          this._waitForExitAnimations(runId, keepMounted);
          return;
        }
        this._finishExit(runId, keepMounted);
      });
  }

  private _finishExit(runId: number, keepMounted: boolean) {
    if (runId !== this._exitRunId) return;
    this._mounted = keepMounted;
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

if (!customElements.get('collapsible-panel')) {
  customElements.define('collapsible-panel', CollapsiblePanelElement);
}

// ─── Namespace exports ──────────────────────────────────────────────────────────

export namespace CollapsibleRoot {
  export type State = CollapsibleRootState;
  export type ChangeEventReason = CollapsibleChangeEventReason;
  export type ChangeEventDetails = CollapsibleChangeEventDetails;
}

export namespace CollapsibleTrigger {
  export type State = CollapsibleTriggerState;
}

export namespace CollapsiblePanel {
  export type State = CollapsiblePanelState;
}

// ─── Global type declarations ───────────────────────────────────────────────────

declare global {
  interface HTMLElementTagNameMap {
    'collapsible-root': CollapsibleRootElement;
    'collapsible-trigger': CollapsibleTriggerElement;
    'collapsible-panel': CollapsiblePanelElement;
  }
}
