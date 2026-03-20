import { ReactiveElement } from 'lit';
import { BaseHTMLElement, ensureId } from '../utils/index.ts';
import { getDirection } from '../direction-provider/index.ts';

// ─── Constants ──────────────────────────────────────────────────────────────────

const TABS_ROOT_ATTRIBUTE = 'data-base-ui-tabs-root';
const TABS_STATE_CHANGE_EVENT = 'base-ui-tabs-state-change';

type TabsOrientation = 'horizontal' | 'vertical';
type TabActivationDirection = 'left' | 'right' | 'up' | 'down' | 'none';
type TabValue = string | number;

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface TabsRootState {
  orientation: TabsOrientation;
  tabActivationDirection: TabActivationDirection;
}

export interface TabsListState extends TabsRootState {}

export interface TabsTabState {
  disabled: boolean;
  active: boolean;
  orientation: TabsOrientation;
}

export interface TabsPanelState {
  hidden: boolean;
  orientation: TabsOrientation;
}

export interface TabsIndicatorState {
  orientation: TabsOrientation;
}

// ─── TabsRootElement ────────────────────────────────────────────────────────────

/**
 * Groups tabs and tab panels together.
 * Renders a `<tabs-root>` custom element.
 *
 * Documentation: [Base UI Tabs](https://base-ui.com/react/components/tabs)
 */
export class TabsRootElement extends ReactiveElement {
  static properties = {
    orientation: { type: String },
  };

  declare orientation: TabsOrientation;

  /**
   * Controlled value: the currently active tab value.
   */
  value: TabValue | undefined;

  /**
   * Default active tab value for uncontrolled mode.
   */
  defaultValue: TabValue | undefined;

  /**
   * Callback fired when the active tab changes.
   * Set via `.onValueChange=${fn}`.
   */
  onValueChange: ((value: TabValue, event: Event) => void) | undefined;

  private _internalValue: TabValue | undefined;
  private _initialized = false;
  private _tabActivationDirection: TabActivationDirection = 'none';

  constructor() {
    super();
    this.orientation = 'horizontal';
  }

  override createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();

    if (!this._initialized) {
      this._initialized = true;
      this._internalValue = this.value ?? this.defaultValue ?? 0;
    }

    this.style.display = 'contents';
    this.setAttribute(TABS_ROOT_ATTRIBUTE, '');
    this._syncAttributes();
  }

  protected override updated() {
    this._syncAttributes();
  }

  // ── Public API ──────────────────────────────────────────────────────────

  /** Returns the current active tab value. */
  getValue(): TabValue {
    return this.value ?? this._internalValue ?? 0;
  }

  /** Activates a tab by value. */
  setValue(newValue: TabValue, event: Event) {
    const oldValue = this.getValue();

    // Determine activation direction
    this._tabActivationDirection = this._getActivationDirection(oldValue, newValue);

    this.onValueChange?.(newValue, event);

    // Update internal state (uncontrolled mode)
    if (this.value === undefined) {
      this._internalValue = newValue;
    }

    this._syncAttributes();
    this._publishStateChange();
    this.requestUpdate();
  }

  getOrientation(): TabsOrientation {
    return this.orientation;
  }

  getTabActivationDirection(): TabActivationDirection {
    return this._tabActivationDirection;
  }

  // ── Private ─────────────────────────────────────────────────────────────

  private _syncAttributes() {
    this.setAttribute('data-orientation', this.orientation);
    this.setAttribute('data-activation-direction', this._tabActivationDirection);
  }

  private _publishStateChange() {
    this.dispatchEvent(
      new CustomEvent(TABS_STATE_CHANGE_EVENT, { bubbles: false, cancelable: false }),
    );
  }

  private _getActivationDirection(
    oldValue: TabValue,
    newValue: TabValue,
  ): TabActivationDirection {
    // Try to determine direction from tab element positions
    const oldTab = this.querySelector(`[role="tab"][data-value="${oldValue}"]`) as HTMLElement | null;
    const newTab = this.querySelector(`[role="tab"][data-value="${newValue}"]`) as HTMLElement | null;

    if (!oldTab || !newTab) return 'none';

    const oldRect = oldTab.getBoundingClientRect();
    const newRect = newTab.getBoundingClientRect();

    if (this.orientation === 'horizontal') {
      return newRect.left > oldRect.left ? 'right' : 'left';
    }
    return newRect.top > oldRect.top ? 'down' : 'up';
  }
}

if (!customElements.get('tabs-root')) {
  customElements.define('tabs-root', TabsRootElement);
}

// ─── TabsListElement ────────────────────────────────────────────────────────────

/**
 * Container for tab buttons with keyboard navigation.
 * Renders a `<tabs-list>` custom element with `role="tablist"`.
 */
export class TabsListElement extends BaseHTMLElement {
  /** Activate tab on focus instead of requiring Enter/Space. */
  activateOnFocus = false;

  /** Whether arrow key navigation loops. */
  loopFocus = true;

  private _root: TabsRootElement | null = null;
  private _handler = () => this._syncAttributes();

  connectedCallback() {
    this._root = this.closest('tabs-root') as TabsRootElement | null;

    this.setAttribute('role', 'tablist');
    this.addEventListener('keydown', this._handleKeyDown);

    if (this._root) {
      this._root.addEventListener(TABS_STATE_CHANGE_EVENT, this._handler);
    }

    this._syncAttributes();
    queueMicrotask(() => this._syncTabIndices());
  }

  disconnectedCallback() {
    this.removeEventListener('keydown', this._handleKeyDown);
    this._root?.removeEventListener(TABS_STATE_CHANGE_EVENT, this._handler);
    this._root = null;
  }

  private _syncAttributes() {
    const orientation = this._root?.getOrientation() ?? 'horizontal';
    this.setAttribute('data-orientation', orientation);
    if (orientation === 'vertical') {
      this.setAttribute('aria-orientation', 'vertical');
    } else {
      this.removeAttribute('aria-orientation');
    }
    this.setAttribute(
      'data-activation-direction',
      this._root?.getTabActivationDirection() ?? 'none',
    );
  }

  // ── Keyboard navigation ─────────────────────────────────────────────

  private _getTabs(): HTMLElement[] {
    return Array.from(this.querySelectorAll<HTMLElement>('[role="tab"]'));
  }

  private _getEnabledTabs(): HTMLElement[] {
    return this._getTabs().filter(
      (t) => !t.hasAttribute('disabled') && t.getAttribute('aria-disabled') !== 'true',
    );
  }

  _syncTabIndices(activeTab?: HTMLElement) {
    const tabs = this._getTabs();
    if (tabs.length === 0) return;

    // Active tab gets tabindex=0, others get -1
    const selectedValue = this._root?.getValue();
    const current =
      activeTab ??
      tabs.find((t) => t.getAttribute('data-value') === String(selectedValue)) ??
      tabs[0];

    tabs.forEach((tab) => {
      tab.tabIndex = tab === current ? 0 : -1;
    });
  }

  private _handleKeyDown = (event: KeyboardEvent) => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || target.getAttribute('role') !== 'tab') return;

    // Modifier keys prevent navigation
    if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return;

    const orientation = this._root?.getOrientation() ?? 'horizontal';
    const delta = this._getNavigationDelta(event.key, orientation);
    if (delta == null) return;

    event.preventDefault();

    // Navigate ALL tabs including disabled ones (matches React behavior)
    const tabs = this._getTabs();
    if (tabs.length === 0) return;

    const currentIndex = tabs.indexOf(target);
    if (currentIndex === -1) return;

    let nextTab: HTMLElement;

    if (delta === Infinity) {
      nextTab = tabs[tabs.length - 1];
    } else if (delta === -Infinity) {
      nextTab = tabs[0];
    } else {
      const proposed = currentIndex + delta;
      if (proposed < 0) {
        nextTab = this.loopFocus ? tabs[tabs.length - 1] : tabs[0];
      } else if (proposed >= tabs.length) {
        nextTab = this.loopFocus ? tabs[0] : tabs[tabs.length - 1];
      } else {
        nextTab = tabs[proposed];
      }
    }

    nextTab.focus();
    this._syncTabIndices(nextTab);

    // Only activate non-disabled tabs when activateOnFocus is true
    if (this.activateOnFocus) {
      const isDisabled =
        nextTab.hasAttribute('disabled') || nextTab.getAttribute('aria-disabled') === 'true';
      if (!isDisabled) {
        const value = nextTab.getAttribute('data-value');
        if (value != null && this._root) {
          this._root.setValue(this._parseValue(value), event);
        }
      }
    }
  };

  private _getNavigationDelta(key: string, orientation: TabsOrientation): number | null {
    if (orientation === 'vertical') {
      if (key === 'ArrowDown') return 1;
      if (key === 'ArrowUp') return -1;
      if (key === 'Home') return -Infinity;
      if (key === 'End') return Infinity;
      return null;
    }

    const dir = getDirection(this);
    const forward = dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
    const backward = dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft';

    if (key === forward) return 1;
    if (key === backward) return -1;
    if (key === 'Home') return -Infinity;
    if (key === 'End') return Infinity;
    return null;
  }

  private _parseValue(str: string): TabValue {
    const num = Number(str);
    return Number.isNaN(num) ? str : num;
  }
}

if (!customElements.get('tabs-list')) {
  customElements.define('tabs-list', TabsListElement);
}

// ─── TabsTabElement ─────────────────────────────────────────────────────────────

/**
 * An individual tab button.
 * Renders a `<tabs-tab>` custom element with `role="tab"`.
 */
export class TabsTabElement extends BaseHTMLElement {
  static get observedAttributes() {
    return ['disabled', 'value'];
  }

  disabled = false;
  value: TabValue | undefined;

  private _root: TabsRootElement | null = null;
  private _list: TabsListElement | null = null;
  private _handler = () => this._syncAttributes();

  attributeChangedCallback(name: string, _old: string | null, val: string | null) {
    if (name === 'disabled') {
      this.disabled = val !== null;
    } else if (name === 'value') {
      if (val !== null) {
        const num = Number(val);
        this.value = Number.isNaN(num) ? val : num;
      }
    }
  }

  connectedCallback() {
    this._root = this.closest('tabs-root') as TabsRootElement | null;
    this._list = this.closest('tabs-list') as TabsListElement | null;

    ensureId(this, 'base-ui-tab');
    this.setAttribute('role', 'tab');

    // Set data-value eagerly so parent list can find us during initial sync
    if (this.value !== undefined) {
      this.setAttribute('data-value', String(this.value));
    }

    this.addEventListener('click', this._handleClick);
    this.addEventListener('keydown', this._handleKeyDown);
    this.addEventListener('keyup', this._handleKeyUp);

    if (this._root) {
      this._root.addEventListener(TABS_STATE_CHANGE_EVENT, this._handler);
    }

    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this.removeEventListener('click', this._handleClick);
    this.removeEventListener('keydown', this._handleKeyDown);
    this.removeEventListener('keyup', this._handleKeyUp);
    this._root?.removeEventListener(TABS_STATE_CHANGE_EVENT, this._handler);
    this._root = null;
    this._list = null;
  }

  private _isActive(): boolean {
    return this.value !== undefined && this._root?.getValue() === this.value;
  }

  private _syncAttributes() {
    const active = this._isActive();
    const orientation = this._root?.getOrientation() ?? 'horizontal';

    this.setAttribute('aria-selected', active ? 'true' : 'false');
    this.toggleAttribute('data-active', active);
    this.toggleAttribute('data-disabled', this.disabled);
    this.setAttribute('data-orientation', orientation);
    this.setAttribute(
      'data-activation-direction',
      this._root?.getTabActivationDirection() ?? 'none',
    );

    if (this.value !== undefined) {
      this.setAttribute('data-value', String(this.value));
    }

    // Associate with panel
    const panelId = this._findPanelId();
    if (panelId) {
      this.setAttribute('aria-controls', panelId);
    }
  }

  private _findPanelId(): string | null {
    if (this.value === undefined || !this._root) return null;
    const panel = this._root.querySelector(
      `[role="tabpanel"][data-value="${this.value}"]`,
    ) as HTMLElement | null;
    return panel?.id ?? null;
  }

  private _handleClick = (event: MouseEvent) => {
    if (this.disabled) return;
    if (this.value === undefined || !this._root) return;
    if (this._isActive()) return;

    this._root.setValue(this.value, event);
    this._list?._syncTabIndices(this);
  };

  private _handleKeyDown = (event: KeyboardEvent) => {
    if (event.target !== this) return;

    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      if (this.disabled) return;

      if (event.key === 'Enter' && this.value !== undefined && this._root) {
        if (!this._isActive()) {
          this._root.setValue(this.value, event);
        }
      }
    }
  };

  private _handleKeyUp = (event: KeyboardEvent) => {
    if (event.target !== this) return;
    if (this.disabled) return;

    if (event.key === ' ' && this.value !== undefined && this._root) {
      if (!this._isActive()) {
        this._root.setValue(this.value, event);
      }
    }
  };
}

if (!customElements.get('tabs-tab')) {
  customElements.define('tabs-tab', TabsTabElement);
}

// ─── TabsPanelElement ───────────────────────────────────────────────────────────

/**
 * Content area corresponding to a tab.
 * Renders a `<tabs-panel>` custom element with `role="tabpanel"`.
 */
export class TabsPanelElement extends BaseHTMLElement {
  static get observedAttributes() {
    return ['value'];
  }

  value: TabValue | undefined;

  /** Keep the panel in the DOM when hidden. */
  keepMounted = true;

  private _root: TabsRootElement | null = null;
  private _handler = () => this._syncAttributes();

  attributeChangedCallback(name: string, _old: string | null, val: string | null) {
    if (name === 'value') {
      if (val !== null) {
        const num = Number(val);
        this.value = Number.isNaN(num) ? val : num;
      }
    }
  }

  connectedCallback() {
    this._root = this.closest('tabs-root') as TabsRootElement | null;

    ensureId(this, 'base-ui-tabpanel');
    this.setAttribute('role', 'tabpanel');
    this.tabIndex = 0;

    // Set data-value eagerly so tabs can find us for aria-controls during initial sync
    if (this.value !== undefined) {
      this.setAttribute('data-value', String(this.value));
    }

    if (this._root) {
      this._root.addEventListener(TABS_STATE_CHANGE_EVENT, this._handler);
    }

    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(TABS_STATE_CHANGE_EVENT, this._handler);
    this._root = null;
  }

  private _isOpen(): boolean {
    return this.value !== undefined && this._root?.getValue() === this.value;
  }

  private _syncAttributes() {
    const open = this._isOpen();
    const orientation = this._root?.getOrientation() ?? 'horizontal';

    this.toggleAttribute('hidden', !open);
    this.toggleAttribute('data-hidden', !open);
    this.setAttribute('data-orientation', orientation);
    this.tabIndex = open ? 0 : -1;

    if (this.value !== undefined) {
      this.setAttribute('data-value', String(this.value));
    }

    // Associate with tab
    const tabId = this._findTabId();
    if (tabId) {
      this.setAttribute('aria-labelledby', tabId);
    }
  }

  private _findTabId(): string | null {
    if (this.value === undefined || !this._root) return null;
    const tab = this._root.querySelector(
      `[role="tab"][data-value="${this.value}"]`,
    ) as HTMLElement | null;
    return tab?.id ?? null;
  }
}

if (!customElements.get('tabs-panel')) {
  customElements.define('tabs-panel', TabsPanelElement);
}

// ─── TabsIndicatorElement ───────────────────────────────────────────────────────

/**
 * Visual indicator that tracks the active tab.
 * Renders a `<tabs-indicator>` custom element.
 * Sets CSS variables for positioning: --active-tab-left, --active-tab-top,
 * --active-tab-width, --active-tab-height.
 */
export class TabsIndicatorElement extends BaseHTMLElement {
  private _root: TabsRootElement | null = null;
  private _list: TabsListElement | null = null;
  private _handler = () => this._syncPosition();

  connectedCallback() {
    this._root = this.closest('tabs-root') as TabsRootElement | null;
    this._list = this.closest('tabs-list') as TabsListElement | null;

    this.setAttribute('role', 'presentation');
    this.setAttribute('aria-hidden', 'true');

    if (this._root) {
      this._root.addEventListener(TABS_STATE_CHANGE_EVENT, this._handler);
    }

    queueMicrotask(() => this._syncPosition());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(TABS_STATE_CHANGE_EVENT, this._handler);
    this._root = null;
    this._list = null;
  }

  private _syncPosition() {
    const orientation = this._root?.getOrientation() ?? 'horizontal';
    this.setAttribute('data-orientation', orientation);
    this.setAttribute(
      'data-activation-direction',
      this._root?.getTabActivationDirection() ?? 'none',
    );

    const selectedValue = this._root?.getValue();
    if (selectedValue === undefined) {
      this.style.display = 'none';
      return;
    }

    const activeTab = this._root?.querySelector(
      `[role="tab"][data-value="${selectedValue}"]`,
    ) as HTMLElement | null;

    if (!activeTab || !this._list) {
      this.style.display = 'none';
      return;
    }

    const listRect = this._list.getBoundingClientRect();
    const tabRect = activeTab.getBoundingClientRect();

    const left = tabRect.left - listRect.left + this._list.scrollLeft;
    const top = tabRect.top - listRect.top + this._list.scrollTop;

    this.style.setProperty('--active-tab-left', `${left}px`);
    this.style.setProperty('--active-tab-top', `${top}px`);
    this.style.setProperty('--active-tab-width', `${tabRect.width}px`);
    this.style.setProperty('--active-tab-height', `${tabRect.height}px`);
    this.style.setProperty(
      '--active-tab-right',
      `${this._list.scrollWidth - left - tabRect.width}px`,
    );
    this.style.setProperty(
      '--active-tab-bottom',
      `${this._list.scrollHeight - top - tabRect.height}px`,
    );
    this.style.display = '';
  }
}

if (!customElements.get('tabs-indicator')) {
  customElements.define('tabs-indicator', TabsIndicatorElement);
}

// ─── Namespace & Tag declarations ───────────────────────────────────────────────

export namespace TabsRoot {
  export type State = TabsRootState;
}

export namespace TabsList {
  export type State = TabsListState;
}

export namespace TabsTab {
  export type State = TabsTabState;
  export type Value = TabValue;
}

export namespace TabsPanel {
  export type State = TabsPanelState;
}

export namespace TabsIndicator {
  export type State = TabsIndicatorState;
}

declare global {
  interface HTMLElementTagNameMap {
    'tabs-root': TabsRootElement;
    'tabs-list': TabsListElement;
    'tabs-tab': TabsTabElement;
    'tabs-panel': TabsPanelElement;
    'tabs-indicator': TabsIndicatorElement;
  }
}
