import { ReactiveElement } from 'lit';
import { BaseHTMLElement, ensureId } from '../utils';

// ─── Constants ──────────────────────────────────────────────────────────────────

const COLLAPSIBLE_ROOT_ATTRIBUTE = 'data-base-ui-collapsible-root';
const COLLAPSIBLE_STATE_CHANGE_EVENT = 'base-ui-collapsible-state-change';
const COLLAPSIBLE_PANEL_HEIGHT_VAR = '--collapsible-panel-height';
const COLLAPSIBLE_PANEL_WIDTH_VAR = '--collapsible-panel-width';
const CONTEXT_ERROR = 'Base UI: Collapsible parts must be placed within <collapsible-root>.';

// ─── Types ──────────────────────────────────────────────────────────────────────

type TransitionStatus = 'starting' | 'ending' | undefined;

export type CollapsibleChangeEventReason = 'trigger-press' | 'none';

export interface CollapsibleChangeEventDetails {
  reason: CollapsibleChangeEventReason;
  event: Event;
  readonly isCanceled: boolean;
  readonly isPropagationAllowed: boolean;
  cancel(): void;
  allowPropagation(): void;
}

export interface CollapsibleRootState {
  disabled: boolean;
  open: boolean;
  transitionStatus: TransitionStatus;
}

export interface CollapsibleTriggerState extends CollapsibleRootState {}
export interface CollapsiblePanelState extends CollapsibleRootState {}

export interface CollapsibleRootProps {
  /**
   * Whether the collapsible panel is currently open.
   * This is the controlled counterpart of `defaultOpen`.
   */
  open?: boolean | undefined;
  /**
   * Whether the collapsible panel is initially open.
   * This is the uncontrolled counterpart of `open`.
   * @default false
   */
  defaultOpen?: boolean | undefined;
  /**
   * Event handler called when the panel is opened or closed.
   */
  onOpenChange?: ((open: boolean, eventDetails: CollapsibleChangeEventDetails) => void) | undefined;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
}

export interface CollapsibleTriggerProps {}

export interface CollapsiblePanelProps {
  /**
   * Allows the browser's built-in page search to find and expand the panel contents.
   * Uses `hidden="until-found"` to hide the panel without removing it from the DOM.
   * @default false
   */
  hiddenUntilFound?: boolean | undefined;
  /**
   * Whether to keep the element in the DOM while the panel is hidden.
   * This prop is ignored when `hiddenUntilFound` is used.
   * @default false
   */
  keepMounted?: boolean | undefined;
}

export type CollapsibleRootChangeEventReason = CollapsibleChangeEventReason;
export type CollapsibleRootChangeEventDetails = CollapsibleChangeEventDetails;

// ─── Helpers ────────────────────────────────────────────────────────────────────

function createChangeEventDetails(
  reason: CollapsibleChangeEventReason,
  event: Event,
): CollapsibleChangeEventDetails {
  let canceled = false;
  let propagationAllowed = false;
  return {
    reason,
    event,
    get isCanceled() {
      return canceled;
    },
    get isPropagationAllowed() {
      return propagationAllowed;
    },
    cancel() {
      canceled = true;
    },
    allowPropagation() {
      propagationAllowed = true;
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
  onOpenChange: ((open: boolean, eventDetails: CollapsibleChangeEventDetails) => void) | undefined;

  // Controlled/uncontrolled open
  private openValue: boolean | undefined;
  private openIsControlled = false;
  private internalOpen = false;
  private initialized = false;
  private panelIdValue: string | undefined;
  private transitionStatusValue: TransitionStatus = undefined;
  private lastPublishedStateKey: string | null = null;

  get open(): boolean | undefined {
    return this.openValue;
  }
  set open(value: boolean | undefined) {
    if (value !== undefined) {
      this.openIsControlled = true;
      this.openValue = value;
    } else {
      this.openIsControlled = false;
      this.openValue = undefined;
    }
    this.syncAttributes();
    this.publishStateChange();
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

    if (!this.initialized) {
      this.initialized = true;
      this.internalOpen = this.defaultOpen;
    }

    this.setAttribute(COLLAPSIBLE_ROOT_ATTRIBUTE, '');
    this.syncAttributes();

    queueMicrotask(() => this.publishStateChange());
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.lastPublishedStateKey = null;
    this.transitionStatusValue = undefined;
  }

  protected override updated() {
    this.syncAttributes();
    this.publishStateChange();
  }

  getOpen(): boolean {
    return this.openIsControlled ? Boolean(this.openValue) : this.internalOpen;
  }

  getState(): CollapsibleRootState {
    return {
      disabled: this.disabled,
      open: this.getOpen(),
      transitionStatus: this.transitionStatusValue,
    };
  }

  getPanelId(): string | undefined {
    return this.panelIdValue;
  }

  setPanelId(id: string | undefined) {
    if (this.panelIdValue === id) {
      return;
    }
    this.panelIdValue = id;
    this.publishStateChange();
  }

  setTransitionStatus(status: TransitionStatus) {
    if (this.transitionStatusValue === status) {
      return;
    }
    this.transitionStatusValue = status;
    this.syncAttributes();
    this.publishStateChange();
  }

  toggle(nextOpen: boolean, event: Event, reason: CollapsibleChangeEventReason) {
    const details = createChangeEventDetails(reason, event);
    this.onOpenChange?.(nextOpen, details);

    if (details.isCanceled) {
      return;
    }

    if (!this.openIsControlled) {
      this.internalOpen = nextOpen;
    }

    this.syncAttributes();
    this.publishStateChange();
  }

  private syncAttributes() {
    const state = this.getState();
    this.toggleAttribute('data-open', state.open);
    this.toggleAttribute('data-closed', !state.open);
    this.toggleAttribute('data-disabled', state.disabled);
    this.toggleAttribute('data-starting-style', state.transitionStatus === 'starting');
    this.toggleAttribute('data-ending-style', state.transitionStatus === 'ending');
  }

  private publishStateChange() {
    const nextKey = [
      this.getOpen() ? 'open' : 'closed',
      this.disabled ? 'disabled' : 'enabled',
      this.transitionStatusValue ?? 'idle',
      this.panelIdValue ?? '',
    ].join('|');

    if (nextKey === this.lastPublishedStateKey) {
      return;
    }
    this.lastPublishedStateKey = nextKey;
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
  private rootElement: CollapsibleRootElement | null = null;
  private stateHandler = () => this.syncAttributes();

  connectedCallback() {
    this.rootElement = this.closest('collapsible-root') as CollapsibleRootElement | null;
    if (!this.rootElement) {
      console.error(CONTEXT_ERROR);
      return;
    }

    this.setAttribute('role', 'button');
    this.setAttribute('tabindex', '0');

    this.rootElement.addEventListener(COLLAPSIBLE_STATE_CHANGE_EVENT, this.stateHandler);

    this.addEventListener('click', this.handleClick);
    this.addEventListener('keydown', this.handleKeyDown);
    this.addEventListener('keyup', this.handleKeyUp);

    queueMicrotask(() => this.syncAttributes());
  }

  disconnectedCallback() {
    this.rootElement?.removeEventListener(COLLAPSIBLE_STATE_CHANGE_EVENT, this.stateHandler);
    this.removeEventListener('click', this.handleClick);
    this.removeEventListener('keydown', this.handleKeyDown);
    this.removeEventListener('keyup', this.handleKeyUp);
    this.rootElement = null;
  }

  private handleClick = (event: Event) => {
    if (!this.rootElement) {
      return;
    }

    const state = this.rootElement.getState();
    if (state.disabled) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    this.rootElement.toggle(!state.open, event, 'trigger-press');
  };

  private handleKeyDown = (event: KeyboardEvent) => {
    if (!this.rootElement) {
      return;
    }

    const state = this.rootElement.getState();
    if (state.disabled) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }

    if (event.target !== this) {
      return;
    }

    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      this.rootElement.toggle(!state.open, event, 'trigger-press');
    }
  };

  private handleKeyUp = (event: KeyboardEvent) => {
    if (!this.rootElement) {
      return;
    }

    if (this.rootElement.getState().disabled) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }

    if (event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
    }
  };

  private syncAttributes() {
    if (!this.rootElement) {
      return;
    }

    const state = this.rootElement.getState();
    const panelId = this.rootElement.getPanelId();

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

  private rootElement: CollapsibleRootElement | null = null;
  private stateHandler = () => this.handleStateChange();
  private mounted = false;
  private transitionStatus: TransitionStatus = undefined;
  private lastOpen: boolean | null = null;
  private frameId: number | null = null;
  private exitRunId = 0;
  private beforeMatchHandler = (event: Event) => {
    if (!this.rootElement) {
      return;
    }

    this.rootElement.toggle(true, event, 'none');
  };

  connectedCallback() {
    // Custom elements default to display:inline where height/overflow are ignored.
    // Ensure block display so CSS height transitions work (matches React's <div>).
    if (!this.style.display) {
      this.style.display = 'block';
    }

    this.rootElement = this.closest('collapsible-root') as CollapsibleRootElement | null;
    if (!this.rootElement) {
      console.error(CONTEXT_ERROR);
      return;
    }

    ensureId(this, 'base-ui-collapsible-panel');
    this.rootElement.setPanelId(this.id);
    this.rootElement.addEventListener(COLLAPSIBLE_STATE_CHANGE_EVENT, this.stateHandler);
    this.addEventListener('beforematch', this.beforeMatchHandler);

    // Immediately hide if root is closed to prevent flash
    if (!this.rootElement.getOpen()) {
      this.setAttribute('hidden', '');
    }

    queueMicrotask(() => this.handleStateChange());
  }

  disconnectedCallback() {
    this.clearFrame();
    this.removeEventListener('beforematch', this.beforeMatchHandler);
    if (this.rootElement) {
      this.rootElement.setPanelId(undefined);
      this.rootElement.setTransitionStatus(undefined);
      this.rootElement.removeEventListener(COLLAPSIBLE_STATE_CHANGE_EVENT, this.stateHandler);
    }
    this.rootElement = null;
    this.mounted = false;
    this.lastOpen = null;
    this.transitionStatus = undefined;
  }

  attributeChangedCallback(name: string) {
    if (name === 'keep-mounted') {
      this.keepMounted = this.hasAttribute('keep-mounted');
    }
    if (name === 'hidden-until-found') {
      this.hiddenUntilFound = this.hasAttribute('hidden-until-found');
    }
    // Re-evaluate visibility when these attributes change
    if (this.rootElement) {
      this.handleStateChange();
    }
  }

  private handleStateChange() {
    if (!this.rootElement) {
      return;
    }

    const state = this.rootElement.getState();
    const open = state.open;
    const wasOpen = this.lastOpen;
    const shouldStayMounted = this.keepMounted || this.hiddenUntilFound;

    if (open) {
      this.exitRunId += 1;
      if (wasOpen !== true && !this.mounted) {
        this.mounted = true;
        this.transitionStatus = 'starting';
        this.scheduleStartingCleanup();
      } else if (this.transitionStatus === 'ending') {
        this.transitionStatus = undefined;
      }
    } else if (wasOpen === true && this.mounted && this.transitionStatus !== 'ending') {
      this.transitionStatus = 'ending';
      this.scheduleExitCleanup(shouldStayMounted);
    } else if (!this.mounted && shouldStayMounted) {
      this.mounted = true;
    }

    this.lastOpen = open;
    this.syncVisibility();
  }

  private syncVisibility() {
    if (!this.rootElement) {
      return;
    }

    const state = this.rootElement.getState();
    const open = state.open;
    const shouldStayMounted = this.keepMounted || this.hiddenUntilFound;
    const shouldRender = this.mounted || this.transitionStatus === 'ending' || shouldStayMounted;

    if (!shouldRender) {
      this.setAttribute('hidden', '');
      this.rootElement.setTransitionStatus(undefined);
      return;
    }

    const hidden = !open && this.transitionStatus !== 'ending';

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
    this.toggleAttribute('data-starting-style', this.transitionStatus === 'starting');
    this.toggleAttribute('data-ending-style', this.transitionStatus === 'ending');

    // CSS custom properties for height/width
    const height = this.scrollHeight;
    const width = this.scrollWidth;
    this.style.setProperty(COLLAPSIBLE_PANEL_HEIGHT_VAR, height ? `${height}px` : 'auto');
    this.style.setProperty(COLLAPSIBLE_PANEL_WIDTH_VAR, width ? `${width}px` : 'auto');

    // Update root's transition status
    this.rootElement.setTransitionStatus(this.transitionStatus);
  }

  private scheduleStartingCleanup() {
    this.clearFrame();
    // Double rAF ensures the browser paints the starting state (height: 0)
    // before we remove data-starting-style and trigger the CSS transition.
    this.frameId = requestAnimationFrame(() => {
      this.frameId = requestAnimationFrame(() => {
        this.frameId = null;
        if (!this.rootElement || this.transitionStatus !== 'starting') {
          return;
        }
        if (!this.rootElement.getOpen()) {
          return;
        }
        this.transitionStatus = undefined;
        this.syncVisibility();
      });
    });
  }

  private scheduleExitCleanup(keepMounted: boolean) {
    this.clearFrame();
    this.exitRunId += 1;
    const runId = this.exitRunId;
    this.frameId = requestAnimationFrame(() => {
      this.frameId = null;
      this.waitForExitAnimations(runId, keepMounted);
    });
  }

  private waitForExitAnimations(runId: number, keepMounted: boolean) {
    if (runId !== this.exitRunId) {
      return;
    }

    if (
      typeof this.getAnimations !== 'function' ||
      (globalThis as typeof globalThis & { BASE_UI_ANIMATIONS_DISABLED?: boolean | undefined })
        .BASE_UI_ANIMATIONS_DISABLED
    ) {
      this.finishExit(runId, keepMounted);
      return;
    }

    Promise.all(this.getAnimations().map((a) => a.finished))
      .then(() => this.finishExit(runId, keepMounted))
      .catch(() => {
        if (runId !== this.exitRunId) {
          return;
        }
        const active = this.getAnimations();
        if (active.length > 0 && active.some((a) => a.pending || a.playState !== 'finished')) {
          this.waitForExitAnimations(runId, keepMounted);
          return;
        }
        this.finishExit(runId, keepMounted);
      });
  }

  private finishExit(runId: number, keepMounted: boolean) {
    if (runId !== this.exitRunId) {
      return;
    }
    this.mounted = keepMounted;
    this.transitionStatus = undefined;
    this.syncVisibility();
  }

  private clearFrame() {
    if (this.frameId != null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
  }
}

if (!customElements.get('collapsible-panel')) {
  customElements.define('collapsible-panel', CollapsiblePanelElement);
}

export const Collapsible = {
  Root: CollapsibleRootElement,
  Trigger: CollapsibleTriggerElement,
  Panel: CollapsiblePanelElement,
} as const;

// ─── Namespace exports ──────────────────────────────────────────────────────────

export namespace CollapsibleRoot {
  export type Props = CollapsibleRootProps;
  export type State = CollapsibleRootState;
  export type ChangeEventReason = CollapsibleChangeEventReason;
  export type ChangeEventDetails = CollapsibleChangeEventDetails;
}

export namespace CollapsibleTrigger {
  export type Props = CollapsibleTriggerProps;
  export type State = CollapsibleTriggerState;
}

export namespace CollapsiblePanel {
  export type Props = CollapsiblePanelProps;
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
