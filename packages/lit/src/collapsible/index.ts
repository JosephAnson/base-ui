import { ReactiveElement, render as renderTemplate, type TemplateResult } from 'lit';
import type { ComponentRenderFn, HTMLProps } from '../types';
import { BaseHTMLElement, ensureId } from '../utils';

// ─── Constants ──────────────────────────────────────────────────────────────────

const COLLAPSIBLE_ROOT_ATTRIBUTE = 'data-base-ui-collapsible-root';
const COLLAPSIBLE_STATE_CHANGE_EVENT = 'base-ui-collapsible-state-change';
const COLLAPSIBLE_PANEL_HEIGHT_VAR = '--collapsible-panel-height';
const COLLAPSIBLE_PANEL_WIDTH_VAR = '--collapsible-panel-width';
const CONTEXT_ERROR = 'Base UI: Collapsible parts must be placed within <collapsible-root>.';

// ─── Types ──────────────────────────────────────────────────────────────────────

type TransitionStatus = 'starting' | 'ending' | undefined;
type CollapsibleRootRenderProps = HTMLProps<HTMLElement>;
type CollapsibleRootRenderProp =
  | TemplateResult
  | ComponentRenderFn<CollapsibleRootRenderProps, CollapsibleRootState>;
type CollapsibleTriggerRenderProps = HTMLProps<HTMLElement>;
type CollapsibleTriggerRenderProp =
  | TemplateResult
  | ComponentRenderFn<CollapsibleTriggerRenderProps, CollapsibleTriggerState>;
type CollapsiblePanelRenderProps = HTMLProps<HTMLElement>;
type CollapsiblePanelRenderProp =
  | TemplateResult
  | ComponentRenderFn<CollapsiblePanelRenderProps, CollapsiblePanelState>;

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
  /**
   * Allows you to replace the component's HTML element with a different tag,
   * or compose it with a template that has a single root element.
   * Accepts a `TemplateResult` or a function that returns the template to render.
   */
  render?: CollapsibleRootRenderProp | undefined;
}

export interface CollapsibleTriggerProps {
  /**
   * Whether the component renders a native `<button>` element when replacing it
   * via the `render` prop.
   * Set to `false` if the rendered element is not a button.
   * @default true
   */
  nativeButton?: boolean | undefined;
  /**
   * Allows you to replace the component's HTML element with a different tag,
   * or compose it with a template that has a single root element.
   * Accepts a `TemplateResult` or a function that returns the template to render.
   */
  render?: CollapsibleTriggerRenderProp | undefined;
}

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
  /**
   * Allows you to replace the component's HTML element with a different tag,
   * or compose it with a template that has a single root element.
   * Accepts a `TemplateResult` or a function that returns the template to render.
   */
  render?: CollapsiblePanelRenderProp | undefined;
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
    render: { attribute: false },
  };

  declare disabled: boolean;
  declare render: CollapsibleRootRenderProp | undefined;

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
  private renderedElement: HTMLElement | null = null;

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
    this.resetRenderedElement();
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
    const root = this.ensureRenderedElement();

    this.removeAttribute('data-open');
    this.removeAttribute('data-closed');
    this.removeAttribute('data-disabled');
    this.removeAttribute('data-starting-style');
    this.removeAttribute('data-ending-style');

    root.toggleAttribute('data-open', state.open);
    root.toggleAttribute('data-closed', !state.open);
    root.toggleAttribute('data-disabled', state.disabled);
    root.toggleAttribute('data-starting-style', state.transitionStatus === 'starting');
    root.toggleAttribute('data-ending-style', state.transitionStatus === 'ending');
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

  private ensureRenderedElement(): HTMLElement {
    if (this.render == null) {
      this.resetRenderedElement();
      this.renderedElement = this;
      return this;
    }

    if (this.renderedElement && this.renderedElement !== this && this.contains(this.renderedElement)) {
      return this.renderedElement;
    }

    const contentNodes =
      this.renderedElement && this.renderedElement !== this
        ? Array.from(this.renderedElement.childNodes)
        : Array.from(this.childNodes).filter((node) => node !== this.renderedElement);
    const renderProps: CollapsibleRootRenderProps = {};
    const template =
      typeof this.render === 'function' ? this.render(renderProps, this.getState()) : this.render;
    const nextRoot = materializeTemplateRoot(template);

    this.style.display = 'contents';
    if (nextRoot !== this) {
      this.replaceChildren(nextRoot);
      nextRoot.append(...contentNodes);
    } else {
      this.resetRenderedElement();
    }

    this.renderedElement = nextRoot;
    return nextRoot;
  }

  private resetRenderedElement() {
    if (this.renderedElement == null || this.renderedElement === this) {
      return;
    }

    const contentNodes = Array.from(this.renderedElement.childNodes);
    this.replaceChildren(...contentNodes);
    this.renderedElement = null;
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
  render: CollapsibleTriggerRenderProp | undefined;
  nativeButton = true;
  private controlElement: HTMLElement | null = null;
  private listenerTarget: HTMLElement | null = null;

  connectedCallback() {
    if (!this.attachRoot()) {
      queueMicrotask(() => {
        if (!this.isConnected || this.rootElement) {
          return;
        }

        if (!this.attachRoot()) {
          console.error(CONTEXT_ERROR);
        }
      });
      return;
    }

    queueMicrotask(() => this.syncAttributes());
  }

  disconnectedCallback() {
    this.rootElement?.removeEventListener(COLLAPSIBLE_STATE_CHANGE_EVENT, this.stateHandler);
    this.setListenerTarget(null);
    this.resetControlElement();
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

    if (this.usesNativeButton() || event.target !== this.listenerTarget) {
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

    if (!this.usesNativeButton() && (event.key === ' ' || event.key === 'Spacebar')) {
      event.preventDefault();
    }
  };

  private syncAttributes() {
    if (!this.rootElement) {
      return;
    }

    const state = this.rootElement.getState();
    const panelId = this.rootElement.getPanelId();
    const control = this.ensureControlElement(state, panelId);

    this.removeAttribute('role');
    this.removeAttribute('tabindex');
    this.removeAttribute('aria-expanded');
    this.removeAttribute('aria-controls');
    this.removeAttribute('data-panel-open');
    this.removeAttribute('data-disabled');
    this.removeAttribute('data-starting-style');
    this.removeAttribute('data-ending-style');
    this.removeAttribute('aria-disabled');

    control.setAttribute('aria-expanded', String(state.open));

    if (state.open && panelId) {
      control.setAttribute('aria-controls', panelId);
    } else {
      control.removeAttribute('aria-controls');
    }

    control.toggleAttribute('data-panel-open', state.open);
    control.toggleAttribute('data-disabled', state.disabled);
    control.toggleAttribute('data-starting-style', state.transitionStatus === 'starting');
    control.toggleAttribute('data-ending-style', state.transitionStatus === 'ending');

    if (this.usesNativeButton()) {
      if (control instanceof HTMLButtonElement) {
        control.type = 'button';
        control.disabled = state.disabled;
      }
      control.removeAttribute('role');
      control.removeAttribute('tabindex');
      control.removeAttribute('aria-disabled');
    } else {
      control.setAttribute('role', 'button');
      control.setAttribute('tabindex', '0');
      if (state.disabled) {
        control.setAttribute('aria-disabled', 'true');
      } else {
        control.removeAttribute('aria-disabled');
      }
    }

    this.setListenerTarget(control);
  }

  private usesNativeButton() {
    return this.nativeButton && this.controlElement instanceof HTMLButtonElement;
  }

  private attachRoot() {
    this.rootElement = this.closest('collapsible-root') as CollapsibleRootElement | null;
    if (!this.rootElement) {
      return false;
    }

    this.rootElement.addEventListener(COLLAPSIBLE_STATE_CHANGE_EVENT, this.stateHandler);
    return true;
  }

  private ensureControlElement(state: CollapsibleTriggerState, panelId: string | undefined) {
    if (this.render == null) {
      this.resetControlElement();
      this.controlElement = this;
      return this;
    }

    if (this.controlElement && this.controlElement !== this && this.contains(this.controlElement)) {
      return this.controlElement;
    }

    const contentNodes =
      this.controlElement && this.controlElement !== this
        ? Array.from(this.controlElement.childNodes)
        : Array.from(this.childNodes).filter((node) => node !== this.controlElement);
    const renderProps: CollapsibleTriggerRenderProps = {
      'aria-controls': state.open ? panelId : undefined,
      'aria-expanded': String(state.open),
      role: this.nativeButton ? undefined : 'button',
      tabIndex: this.nativeButton ? undefined : 0,
    };
    const template =
      typeof this.render === 'function' ? this.render(renderProps, state) : this.render;
    const nextControl = materializeTemplateRoot(template);

    this.style.display = 'contents';
    if (nextControl !== this) {
      this.replaceChildren(nextControl);
      nextControl.append(...contentNodes);
    } else {
      this.resetControlElement();
    }

    this.controlElement = nextControl;
    return nextControl;
  }

  private resetControlElement() {
    if (this.controlElement == null || this.controlElement === this) {
      return;
    }

    const contentNodes = Array.from(this.controlElement.childNodes);
    this.replaceChildren(...contentNodes);
    this.controlElement = null;
  }

  private setListenerTarget(nextTarget: HTMLElement | null) {
    if (this.listenerTarget === nextTarget) {
      return;
    }

    if (this.listenerTarget) {
      this.listenerTarget.removeEventListener('click', this.handleClick);
      this.listenerTarget.removeEventListener('keydown', this.handleKeyDown);
      this.listenerTarget.removeEventListener('keyup', this.handleKeyUp);
    }

    this.listenerTarget = nextTarget;

    if (this.listenerTarget) {
      this.listenerTarget.addEventListener('click', this.handleClick);
      this.listenerTarget.addEventListener('keydown', this.handleKeyDown);
      this.listenerTarget.addEventListener('keyup', this.handleKeyUp);
    }
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
  render: CollapsiblePanelRenderProp | undefined;

  private rootElement: CollapsibleRootElement | null = null;
  private stateHandler = () => this.handleStateChange();
  private mounted = false;
  private transitionStatus: TransitionStatus = undefined;
  private lastOpen: boolean | null = null;
  private frameId: number | null = null;
  private exitRunId = 0;
  private renderedElement: HTMLElement | null = null;
  private beforeMatchTarget: HTMLElement | null = null;
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

    if (!this.attachRoot()) {
      queueMicrotask(() => {
        if (!this.isConnected || this.rootElement) {
          return;
        }

        if (!this.attachRoot()) {
          console.error(CONTEXT_ERROR);
          return;
        }

        if (!this.rootElement?.getOpen()) {
          this.setAttribute('hidden', '');
        }

        this.handleStateChange();
      });
      return;
    }

    if (!this.rootElement.getOpen()) {
      this.setAttribute('hidden', '');
    }

    queueMicrotask(() => this.handleStateChange());
  }

  disconnectedCallback() {
    this.clearFrame();
    this.setBeforeMatchTarget(null);
    if (this.rootElement) {
      this.rootElement.setPanelId(undefined);
      this.rootElement.setTransitionStatus(undefined);
      this.rootElement.removeEventListener(COLLAPSIBLE_STATE_CHANGE_EVENT, this.stateHandler);
    }
    this.rootElement = null;
    this.resetRenderedElement();
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
    const panel = this.ensurePanelElement({
      disabled: state.disabled,
      open,
      transitionStatus: this.transitionStatus,
    });

    if (!shouldRender) {
      panel.setAttribute('hidden', '');
      this.rootElement.setTransitionStatus(undefined);
      return;
    }

    const hidden = !open && this.transitionStatus !== 'ending';

    // Sync hidden attribute
    if (this.hiddenUntilFound && hidden) {
      panel.setAttribute('hidden', 'until-found');
    } else if (hidden) {
      panel.setAttribute('hidden', '');
    } else {
      panel.removeAttribute('hidden');
    }

    // Sync data attributes
    this.removeAttribute('data-open');
    this.removeAttribute('data-closed');
    this.removeAttribute('data-disabled');
    this.removeAttribute('data-starting-style');
    this.removeAttribute('data-ending-style');
    panel.toggleAttribute('data-open', open);
    panel.toggleAttribute('data-closed', !open);
    panel.toggleAttribute('data-disabled', state.disabled);
    panel.toggleAttribute('data-starting-style', this.transitionStatus === 'starting');
    panel.toggleAttribute('data-ending-style', this.transitionStatus === 'ending');

    // CSS custom properties for height/width
    const height = panel.scrollHeight;
    const width = panel.scrollWidth;
    panel.style.setProperty(COLLAPSIBLE_PANEL_HEIGHT_VAR, height ? `${height}px` : 'auto');
    panel.style.setProperty(COLLAPSIBLE_PANEL_WIDTH_VAR, width ? `${width}px` : 'auto');

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

  private ensurePanelElement(state: CollapsiblePanelState): HTMLElement {
    if (this.render == null) {
      this.resetRenderedElement();
      this.renderedElement = this;
      this.setBeforeMatchTarget(this);
      if (!this.id) {
        ensureId(this, 'base-ui-collapsible-panel');
      }
      this.rootElement?.setPanelId(this.id);
      return this;
    }

    if (this.renderedElement && this.renderedElement !== this && this.contains(this.renderedElement)) {
      this.setBeforeMatchTarget(this.renderedElement);
      this.rootElement?.setPanelId(this.renderedElement.id);
      return this.renderedElement;
    }

    const contentNodes =
      this.renderedElement && this.renderedElement !== this
        ? Array.from(this.renderedElement.childNodes)
        : Array.from(this.childNodes).filter((node) => node !== this.renderedElement);
    const renderProps: CollapsiblePanelRenderProps = {
      hidden: !state.open,
    };
    const template =
      typeof this.render === 'function' ? this.render(renderProps, state) : this.render;
    const nextPanel = materializeTemplateRoot(template);

    this.style.display = 'contents';
    if (nextPanel !== this) {
      this.replaceChildren(nextPanel);
      nextPanel.append(...contentNodes);
    } else {
      this.resetRenderedElement();
    }

    ensureId(nextPanel, 'base-ui-collapsible-panel');
    this.renderedElement = nextPanel;
    this.setBeforeMatchTarget(nextPanel);
    this.rootElement?.setPanelId(nextPanel.id);
    return nextPanel;
  }

  private resetRenderedElement() {
    if (this.renderedElement == null || this.renderedElement === this) {
      return;
    }

    const contentNodes = Array.from(this.renderedElement.childNodes);
    this.replaceChildren(...contentNodes);
    this.renderedElement = null;
  }

  private setBeforeMatchTarget(nextTarget: HTMLElement | null) {
    if (this.beforeMatchTarget === nextTarget) {
      return;
    }

    if (this.beforeMatchTarget) {
      this.beforeMatchTarget.removeEventListener('beforematch', this.beforeMatchHandler);
    }

    this.beforeMatchTarget = nextTarget;

    if (this.beforeMatchTarget) {
      this.beforeMatchTarget.addEventListener('beforematch', this.beforeMatchHandler);
    }
  }

  private attachRoot() {
    this.rootElement = this.closest('collapsible-root') as CollapsibleRootElement | null;
    if (!this.rootElement) {
      return false;
    }

    ensureId(this, 'base-ui-collapsible-panel');
    this.rootElement.setPanelId(this.id);
    this.rootElement.addEventListener(COLLAPSIBLE_STATE_CHANGE_EVENT, this.stateHandler);
    this.setBeforeMatchTarget(this);
    return true;
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

function materializeTemplateRoot(template: TemplateResult): HTMLElement {
  const container = document.createElement('div');
  renderTemplate(template, container);

  return (
    Array.from(container.children).find((child): child is HTMLElement => child instanceof HTMLElement) ??
    container
  );
}

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
