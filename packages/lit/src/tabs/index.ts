/* eslint-disable no-underscore-dangle */
import { ReactiveElement, nothing, render as renderTemplate, type TemplateResult } from 'lit';
import { BaseHTMLElement, ensureId } from '../utils';
import { getDirection } from '../direction-provider';
import type { ComponentRenderFn, HTMLProps } from '../types';

// ─── Constants ──────────────────────────────────────────────────────────────────

const TABS_ROOT_ATTRIBUTE = 'data-base-ui-tabs-root';
const TABS_STATE_CHANGE_EVENT = 'base-ui-tabs-state-change';

type TabsOrientation = 'horizontal' | 'vertical';
type TabActivationDirection = 'left' | 'right' | 'up' | 'down' | 'none';
type TabValue = string | number | null;

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface TabsRootState {
  orientation: TabsOrientation;
  tabActivationDirection: TabActivationDirection;
}

export type TabsRootChangeEventReason = 'none';

export interface TabsRootChangeEventDetails {
  event: Event;
  cancel(): void;
  readonly isCanceled: boolean;
  allowPropagation(): void;
  readonly isPropagationAllowed: boolean;
  reason: TabsRootChangeEventReason;
  activationDirection: TabActivationDirection;
  trigger: Element | undefined;
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

export interface TabsRootProps {
  value?: TabValue | undefined;
  defaultValue?: TabValue | undefined;
  orientation?: TabsOrientation | undefined;
  render?: TabsRootRenderProp | undefined;
  onValueChange?:
    | ((value: TabValue, eventDetails: TabsRootChangeEventDetails) => void)
    | undefined;
}

export interface TabsListProps {
  activateOnFocus?: boolean | undefined;
  loopFocus?: boolean | undefined;
  render?: TabsListRenderProp | undefined;
}

export interface TabsTabProps {
  value?: TabValue | undefined;
  disabled?: boolean | undefined;
  render?: TabsTabRenderProp | undefined;
}

export interface TabsPanelProps {
  value?: TabValue | undefined;
  keepMounted?: boolean | undefined;
  render?: TabsPanelRenderProp | undefined;
}

export interface TabsIndicatorProps {
  render?: TabsIndicatorRenderProp | undefined;
}

type TabsRootRenderProps = HTMLProps<HTMLElement>;
type TabsRootRenderProp =
  | TemplateResult
  | ComponentRenderFn<TabsRootRenderProps, TabsRootState>;
type TabsListRenderProps = HTMLProps<HTMLElement>;
type TabsListRenderProp =
  | TemplateResult
  | ComponentRenderFn<TabsListRenderProps, TabsListState>;
type TabsTabRenderProps = HTMLProps<HTMLElement>;
type TabsTabRenderProp =
  | TemplateResult
  | ComponentRenderFn<TabsTabRenderProps, TabsTabState>;
type TabsPanelRenderProps = HTMLProps<HTMLElement>;
type TabsPanelRenderProp =
  | TemplateResult
  | ComponentRenderFn<TabsPanelRenderProps, TabsPanelState>;
type TabsIndicatorRenderProps = HTMLProps<HTMLElement>;
type TabsIndicatorRenderProp =
  | TemplateResult
  | ComponentRenderFn<TabsIndicatorRenderProps, TabsIndicatorState>;

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
  onValueChange:
    | ((value: TabValue, eventDetails: TabsRootChangeEventDetails) => void)
    | undefined;
  render: TabsRootRenderProp | undefined;

  private _internalValue: TabValue | undefined;
  private _initialized = false;
  private _hasExplicitDefaultValue = false;
  private _tabActivationDirection: TabActivationDirection = 'none';
  private _renderedElement: HTMLElement | null = null;

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
      this._hasExplicitDefaultValue =
        this.hasAttribute('default-value') || this.defaultValue !== undefined;
      this._internalValue = this.value ?? this.defaultValue ?? null;
    }

    this.setAttribute(TABS_ROOT_ATTRIBUTE, '');
    this._syncAttributes(this._ensureRenderedElement());
    queueMicrotask(() => this.refreshSelectionState());
  }

  protected override updated() {
    this._syncAttributes(this._ensureRenderedElement());
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this._resetRenderedElement();
  }

  // ── Public API ──────────────────────────────────────────────────────────

  /** Returns the current active tab value. */
  getValue(): TabValue {
    if (this.value !== undefined) {
      return this.value;
    }

    if (this._internalValue != null) {
      return this._internalValue;
    }

    if (this._hasExplicitDefaultValue) {
      return this.defaultValue ?? null;
    }

    return this._getFirstEnabledTabValue();
  }

  /** Activates a tab by value. */
  setValue(newValue: TabValue, event: Event) {
    const oldValue = this.getValue();

    // Determine activation direction
    const activationDirection = this._getActivationDirection(oldValue, newValue);
    const eventDetails = createTabsChangeEventDetails(event, activationDirection);

    this._tabActivationDirection = activationDirection;

    this.onValueChange?.(newValue, eventDetails);

    if (eventDetails.isCanceled) {
      this._tabActivationDirection = 'none';
      this._syncAttributes();
      this._publishStateChange();
      this.requestUpdate();
      return;
    }

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

  getState(): TabsRootState {
    return {
      orientation: this.orientation,
      tabActivationDirection: this._tabActivationDirection,
    };
  }

  refreshSelectionState() {
    this._syncSelectionState();
  }

  ensureInitialUncontrolledValue(candidateValue: TabValue, disabled: boolean) {
    if (this.value !== undefined || this._hasExplicitDefaultValue || disabled || candidateValue == null) {
      return;
    }

    if (this.getValue() != null) {
      return;
    }

    this._internalValue = candidateValue;
    this._tabActivationDirection = 'none';
    this._syncAttributes();
    this._publishStateChange();
    this.requestUpdate();
  }

  // ── Private ─────────────────────────────────────────────────────────────

  private _syncAttributes(target: HTMLElement = this) {
    if (target !== this) {
      this.removeAttribute('data-orientation');
      this.removeAttribute('data-activation-direction');
    }

    target.setAttribute('data-orientation', this.orientation);
    target.setAttribute('data-activation-direction', this._tabActivationDirection);
  }

  private _publishStateChange() {
    this.dispatchEvent(
      new CustomEvent(TABS_STATE_CHANGE_EVENT, { bubbles: false, cancelable: false }),
    );
  }

  private _getTabs(): TabsTabElement[] {
    return Array.from(this.querySelectorAll<TabsTabElement>('tabs-tab'));
  }

  private _getTabValue(tab: TabsTabElement): TabValue {
    if (tab.value !== undefined) {
      return tab.value;
    }

    const attributeValue = tab.getAttribute('value');
    if (attributeValue == null) {
      return null;
    }

    const numericValue = Number(attributeValue);
    return Number.isNaN(numericValue) ? attributeValue : numericValue;
  }

  private _isDisabledTab(tab: TabsTabElement | null) {
    return tab?.disabled === true || tab?.hasAttribute('disabled') === true;
  }

  private _findTabByValue(value: TabValue): TabsTabElement | null {
    if (value == null) {
      return null;
    }

    return this._getTabs().find((tab) => Object.is(this._getTabValue(tab), value)) ?? null;
  }

  private _getFirstEnabledTabValue(): TabValue {
    const firstEnabledTab = this._getTabs().find((tab) => !this._isDisabledTab(tab));
    return firstEnabledTab ? this._getTabValue(firstEnabledTab) : null;
  }

  private _syncSelectionState() {
    if (this.value !== undefined) {
      return;
    }

    const currentValue = this.getValue();
    const currentTab = this._findTabByValue(currentValue);
    const selectionIsDisabled = this._isDisabledTab(currentTab);
    const selectionIsMissing = currentValue !== null && currentTab == null;
    const selectionIsUnset = currentValue == null && !this._hasExplicitDefaultValue;
    const shouldHonorExplicitDefaultSelection =
      this._hasExplicitDefaultValue &&
      Object.is(currentValue, this.defaultValue) &&
      selectionIsDisabled;

    if (shouldHonorExplicitDefaultSelection) {
      return;
    }

    if (!selectionIsUnset && !selectionIsDisabled && !selectionIsMissing) {
      return;
    }

    const fallbackValue = this._getFirstEnabledTabValue();
    if (Object.is(currentValue, fallbackValue)) {
      return;
    }

    this._internalValue = fallbackValue;
    this._tabActivationDirection = 'none';
    this._syncAttributes();
    this._publishStateChange();
    this.requestUpdate();
  }

  private _getActivationDirection(
    oldValue: TabValue,
    newValue: TabValue,
  ): TabActivationDirection {
    if (oldValue == null || newValue == null) {
      return 'none';
    }

    // Try to determine direction from tab element positions
    const oldTab = this.querySelector(`[role="tab"][data-value="${oldValue}"]`) as HTMLElement | null;
    const newTab = this.querySelector(`[role="tab"][data-value="${newValue}"]`) as HTMLElement | null;

    if (!oldTab || !newTab) {return 'none';}

    const oldRect = oldTab.getBoundingClientRect();
    const newRect = newTab.getBoundingClientRect();

    if (this.orientation === 'horizontal') {
      return newRect.left > oldRect.left ? 'right' : 'left';
    }
    return newRect.top > oldRect.top ? 'down' : 'up';
  }

  private _ensureRenderedElement(): HTMLElement {
    if (this.render == null) {
      this._resetRenderedElement();
      this.style.display = 'block';
      this._renderedElement = this;
      return this;
    }

    if (
      this._renderedElement &&
      this._renderedElement !== this &&
      this.contains(this._renderedElement)
    ) {
      return this._renderedElement;
    }

    const contentNodes =
      this._renderedElement && this._renderedElement !== this
        ? Array.from(this._renderedElement.childNodes)
        : Array.from(this.childNodes).filter((node) => node !== this._renderedElement);
    const renderProps: TabsRootRenderProps = {};
    const template =
      typeof this.render === 'function' ? this.render(renderProps, this.getState()) : this.render;
    const nextRoot = materializeTemplateRoot(template);

    this.style.display = 'contents';

    if (nextRoot !== this) {
      this.replaceChildren(nextRoot);
      nextRoot.append(...contentNodes);
    } else {
      this._resetRenderedElement();
    }

    this._renderedElement = nextRoot;
    return nextRoot;
  }

  private _resetRenderedElement() {
    if (this._renderedElement == null || this._renderedElement === this) {
      return;
    }

    const contentNodes = Array.from(this._renderedElement.childNodes);
    this.replaceChildren(...contentNodes);
    this._renderedElement = null;
    this.style.display = 'block';
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
  render: TabsListRenderProp | undefined;

  private _root: TabsRootElement | null = null;
  private _handler = () => this._syncAttributes();
  private _renderedElement: HTMLElement | null = null;

  connectedCallback() {
    this._root = this.closest('tabs-root') as TabsRootElement | null;

    this._ensureRenderedElement();
    this.addEventListener('keydown', this._handleKeyDown);

    if (this._root) {
      this._root.addEventListener(TABS_STATE_CHANGE_EVENT, this._handler);
    }

    this._syncAttributes();
    queueMicrotask(() => {
      this._root?.refreshSelectionState();
      this._syncTabIndices();
    });
  }

  disconnectedCallback() {
    this.removeEventListener('keydown', this._handleKeyDown);
    this._root?.removeEventListener(TABS_STATE_CHANGE_EVENT, this._handler);
    this._resetRenderedElement();
    this._root = null;
  }

  private _syncAttributes() {
    const orientation = this._root?.getOrientation() ?? 'horizontal';
    const target = this._ensureRenderedElement();

    if (target !== this) {
      this.removeAttribute('role');
      this.removeAttribute('data-orientation');
      this.removeAttribute('aria-orientation');
      this.removeAttribute('data-activation-direction');
    }

    target.setAttribute('role', 'tablist');
    target.setAttribute('data-orientation', orientation);
    if (orientation === 'vertical') {
      target.setAttribute('aria-orientation', 'vertical');
    } else {
      target.removeAttribute('aria-orientation');
    }
    target.setAttribute(
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

  private _isDisabledTab(tab: HTMLElement) {
    return tab.hasAttribute('disabled') || tab.getAttribute('aria-disabled') === 'true';
  }

  _syncTabIndices(activeTab?: HTMLElement) {
    const tabs = this._getTabs();
    if (tabs.length === 0) {return;}

    // Active tab gets tabindex=0, others get -1
    const firstEnabledTab = tabs.find((tab) => !this._isDisabledTab(tab));
    const firstEnabledValue = firstEnabledTab?.getAttribute('data-value');

    if (firstEnabledValue != null) {
      this._root?.ensureInitialUncontrolledValue(
        this._parseValue(firstEnabledValue),
        this._isDisabledTab(firstEnabledTab),
      );
    }

    const selectedValue = this._root?.getValue();
    const selectedTab = tabs.find((tab) => tab.getAttribute('data-value') === String(selectedValue));
    const current =
      activeTab ??
      (selectedTab && !this._isDisabledTab(selectedTab) ? selectedTab : undefined) ??
      firstEnabledTab ??
      tabs[0];

    tabs.forEach((tab) => {
      tab.tabIndex = tab === current ? 0 : -1;
    });
  }

  private _handleKeyDown = (event: KeyboardEvent) => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || target.getAttribute('role') !== 'tab') {return;}

    // Modifier keys prevent navigation
    if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) {return;}

    const orientation = this._root?.getOrientation() ?? 'horizontal';
    const delta = this._getNavigationDelta(event.key, orientation);
    if (delta == null) {return;}

    event.preventDefault();

    // Navigate ALL tabs including disabled ones (matches React behavior)
    const tabs = this._getTabs();
    if (tabs.length === 0) {return;}

    const currentIndex = tabs.indexOf(target);
    if (currentIndex === -1) {return;}

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
      if (key === 'ArrowDown') {return 1;}
      if (key === 'ArrowUp') {return -1;}
      if (key === 'Home') {return -Infinity;}
      if (key === 'End') {return Infinity;}
      return null;
    }

    const dir = getDirection(this);
    const forward = dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
    const backward = dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft';

    if (key === forward) {return 1;}
    if (key === backward) {return -1;}
    if (key === 'Home') {return -Infinity;}
    if (key === 'End') {return Infinity;}
    return null;
  }

  private _parseValue(str: string): TabValue {
    const num = Number(str);
    return Number.isNaN(num) ? str : num;
  }

  private _ensureRenderedElement(): HTMLElement {
    if (this.render == null) {
      this._resetRenderedElement();
      this.style.removeProperty('display');
      this._renderedElement = this;
      return this;
    }

    if (
      this._renderedElement &&
      this._renderedElement !== this &&
      this.contains(this._renderedElement)
    ) {
      return this._renderedElement;
    }

    const contentNodes =
      this._renderedElement && this._renderedElement !== this
        ? Array.from(this._renderedElement.childNodes)
        : Array.from(this.childNodes).filter((node) => node !== this._renderedElement);
    const state: TabsListState = {
      orientation: this._root?.getOrientation() ?? 'horizontal',
      tabActivationDirection: this._root?.getTabActivationDirection() ?? 'none',
    };
    const renderProps: TabsListRenderProps = {
      'aria-orientation': state.orientation === 'vertical' ? 'vertical' : undefined,
      role: 'tablist',
    };
    const template =
      typeof this.render === 'function' ? this.render(renderProps, state) : this.render;
    const nextRoot = materializeTemplateRoot(template);

    this.style.display = 'contents';

    if (nextRoot !== this) {
      this.replaceChildren(nextRoot);
      nextRoot.append(...contentNodes);
    } else {
      this._resetRenderedElement();
    }

    this._renderedElement = nextRoot;
    return nextRoot;
  }

  private _resetRenderedElement() {
    if (this._renderedElement == null || this._renderedElement === this) {
      return;
    }

    const contentNodes = Array.from(this._renderedElement.childNodes);
    this.replaceChildren(...contentNodes);
    this._renderedElement = null;
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
  render: TabsTabRenderProp | undefined;

  private _root: TabsRootElement | null = null;
  private _list: TabsListElement | null = null;
  private _handler = () => this._syncAttributes();
  private _controlElement: HTMLElement | null = null;
  private _listenerTarget: HTMLElement | null = null;

  attributeChangedCallback(name: string, _old: string | null, val: string | null) {
    if (name === 'disabled') {
      this.disabled = val !== null;
    } else if (name === 'value') {
      if (val !== null) {
        const num = Number(val);
        this.value = Number.isNaN(num) ? val : num;
      }
    }

    if (this.value !== undefined) {
      this._root?.ensureInitialUncontrolledValue(this.value, this.disabled);
    }

    queueMicrotask(() => {
      this._root?.refreshSelectionState();
      this._syncAttributes();
      this._list?._syncTabIndices();
    });
  }

  connectedCallback() {
    this._root = this.closest('tabs-root') as TabsRootElement | null;
    this._list = this.closest('tabs-list') as TabsListElement | null;

    this.disabled = this.disabled || this.hasAttribute('disabled');
    const valueAttribute = this.getAttribute('value');
    if (this.value === undefined && valueAttribute != null) {
      const numericValue = Number(valueAttribute);
      this.value = Number.isNaN(numericValue) ? valueAttribute : numericValue;
    }

    this._prepareInitialControl();

    if (this._root) {
      this._root.addEventListener(TABS_STATE_CHANGE_EVENT, this._handler);
    }

    queueMicrotask(() => {
      this._root?.refreshSelectionState();
      this._syncAttributes();
      this._list?._syncTabIndices();
    });
  }

  disconnectedCallback() {
    this._setListenerTarget(null);
    this._root?.removeEventListener(TABS_STATE_CHANGE_EVENT, this._handler);
    this._root?.refreshSelectionState();
    if (this.render != null) {
      renderTemplate(nothing, this);
      this._controlElement = null;
      this.style.removeProperty('display');
    }
    this._root = null;
    this._list = null;
  }

  private _isActive(): boolean {
    return this.value !== undefined && this._root?.getValue() === this.value;
  }

  private _syncAttributes() {
    const active = this._isActive();
    const orientation = this._root?.getOrientation() ?? 'horizontal';
    const control = this._ensureControlElement({
      active,
      disabled: this.disabled,
      orientation,
    });

    this.removeAttribute('role');
    this.removeAttribute('aria-selected');
    this.removeAttribute('aria-controls');
    this.removeAttribute('data-active');
    this.removeAttribute('data-disabled');
    this.removeAttribute('data-orientation');
    this.removeAttribute(
      'data-activation-direction',
    );

    control.setAttribute('role', 'tab');
    control.setAttribute('aria-selected', active ? 'true' : 'false');
    control.toggleAttribute('data-active', active);
    control.toggleAttribute('data-disabled', this.disabled);
    control.setAttribute('data-orientation', orientation);
    control.setAttribute(
      'data-activation-direction',
      this._root?.getTabActivationDirection() ?? 'none',
    );

    if (this.value !== undefined) {
      control.setAttribute('data-value', String(this.value));
      if (control !== this) {
        this.setAttribute('data-value', String(this.value));
      }
    } else {
      control.removeAttribute('data-value');
      this.removeAttribute('data-value');
    }

    // Associate with panel
    const panelId = this._findPanelId();
    if (panelId) {
      control.setAttribute('aria-controls', panelId);
    } else {
      control.removeAttribute('aria-controls');
    }

    this._setListenerTarget(control);
  }

  private _findPanelId(): string | null {
    if (this.value === undefined || !this._root) {return null;}
    const panels = Array.from(
      this._root.querySelectorAll<HTMLElement>(
        `tabs-panel[data-value="${this.value}"], [role="tabpanel"][data-value="${this.value}"]`,
      ),
    );
    const panel =
      panels.find(
        (candidate) =>
          (!candidate.matches('tabs-panel') ||
            (candidate as TabsPanelElement).keepMounted) ||
          Object.is(this._root?.getValue(), this.value),
      ) ?? null;
    return panel?.id ?? null;
  }

  private _handleClick = (event: MouseEvent) => {
    if (event.button !== 0) {return;}
    if (this.disabled) {return;}
    if (this.value === undefined || !this._root) {return;}
    if (this._isActive()) {return;}

    this._root.setValue(this.value, event);
    this._list?._syncTabIndices(this);
  };

  private _handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      if (this.disabled) {return;}

      if (event.key === 'Enter' && this.value !== undefined && this._root) {
        if (!this._isActive()) {
          this._root.setValue(this.value, event);
        }
      }
    }
  };

  private _handleKeyUp = (event: KeyboardEvent) => {
    if (this.disabled) {return;}

    if (event.key === ' ' && this.value !== undefined && this._root) {
      if (!this._isActive()) {
        this._root.setValue(this.value, event);
      }
    }
  };

  private _prepareInitialControl() {
    const initialState: TabsTabState = {
      active: false,
      disabled: this.disabled,
      orientation: this._root?.getOrientation() ?? 'horizontal',
    };
    const control = this._ensureControlElement(initialState);
    ensureId(control, 'base-ui-tab');

    if (this.value !== undefined) {
      control.setAttribute('data-value', String(this.value));
      this._root?.ensureInitialUncontrolledValue(this.value, this.disabled);
    }
  }

  private _ensureControlElement(state: TabsTabState) {
    if (this.render == null) {
      this.style.removeProperty('display');
      if (this._controlElement && this._controlElement !== this) {
        renderTemplate(nothing, this);
      }
      this._controlElement = this;
      ensureId(this, 'base-ui-tab');
      return this;
    }

    const renderProps: TabsTabRenderProps = {
      'aria-controls': this._findPanelId() ?? undefined,
      'aria-selected': state.active ? 'true' : 'false',
      role: 'tab',
      tabIndex: 0,
    };
    const template =
      typeof this.render === 'function' ? this.render(renderProps, state) : this.render;

    this.style.display = 'contents';
    renderTemplate(template, this);

    const nextControl = Array.from(this.children).find(
      (child): child is HTMLElement => child instanceof HTMLElement,
    ) ?? this;

    ensureId(nextControl, 'base-ui-tab');
    this._controlElement = nextControl;
    return nextControl;
  }

  private _setListenerTarget(nextTarget: HTMLElement | null) {
    if (this._listenerTarget === nextTarget) {
      return;
    }

    if (this._listenerTarget) {
      this._listenerTarget.removeEventListener('click', this._handleClick);
      this._listenerTarget.removeEventListener('keydown', this._handleKeyDown);
      this._listenerTarget.removeEventListener('keyup', this._handleKeyUp);
    }

    this._listenerTarget = nextTarget;

    if (this._listenerTarget) {
      this._listenerTarget.addEventListener('click', this._handleClick);
      this._listenerTarget.addEventListener('keydown', this._handleKeyDown);
      this._listenerTarget.addEventListener('keyup', this._handleKeyUp);
    }
  }
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
    return ['keep-mounted', 'value'];
  }

  value: TabValue | undefined;

  /** Keep the panel in the DOM when hidden. */
  keepMounted = false;
  render: TabsPanelRenderProp | undefined;

  private _root: TabsRootElement | null = null;
  private _handler = () => this._syncAttributes();
  private _renderedElement: HTMLElement | null = null;

  attributeChangedCallback(name: string, _old: string | null, val: string | null) {
    if (name === 'keep-mounted') {
      this.keepMounted = val !== null;
    } else if (name === 'value') {
      if (val !== null) {
        const num = Number(val);
        this.value = Number.isNaN(num) ? val : num;
      }
    }
  }

  connectedCallback() {
    this._root = this.closest('tabs-root') as TabsRootElement | null;

    if (this.hasAttribute('keep-mounted')) {
      this.keepMounted = true;
    }

    const valueAttribute = this.getAttribute('value');
    if (this.value === undefined && valueAttribute != null) {
      const numericValue = Number(valueAttribute);
      this.value = Number.isNaN(numericValue) ? valueAttribute : numericValue;
    }

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
    this._resetRenderedElement();
    this._root = null;
  }

  private _isOpen(): boolean {
    return this.value !== undefined && this._root?.getValue() === this.value;
  }

  private _syncAttributes() {
    const open = this._isOpen();
    const orientation = this._root?.getOrientation() ?? 'horizontal';
    const target = this._ensureRenderedElement(open, orientation);

    if (target !== this) {
      this.removeAttribute('role');
      this.removeAttribute('aria-labelledby');
      this.removeAttribute('hidden');
      this.removeAttribute('data-hidden');
      this.removeAttribute('data-orientation');
    }

    target.setAttribute('role', 'tabpanel');
    target.toggleAttribute('hidden', !open);
    target.toggleAttribute('data-hidden', !open);
    target.setAttribute('data-orientation', orientation);
    target.tabIndex = open ? 0 : -1;

    if (this.value !== undefined) {
      target.setAttribute('data-value', String(this.value));
      if (target !== this) {
        this.setAttribute('data-value', String(this.value));
      }
    }

    // Associate with tab
    const tabId = this._findTabId();
    if (tabId) {
      target.setAttribute('aria-labelledby', tabId);
    } else {
      target.removeAttribute('aria-labelledby');
    }
  }

  private _findTabId(): string | null {
    if (this.value === undefined || !this._root) {return null;}
    const tab = this._root.querySelector(
      `[role="tab"][data-value="${this.value}"]`,
    ) as HTMLElement | null;
    return tab?.id ?? null;
  }

  private _ensureRenderedElement(open: boolean, orientation: TabsOrientation): HTMLElement {
    if (this.render == null) {
      this._resetRenderedElement();
      this.style.removeProperty('display');
      this._renderedElement = this;
      return this;
    }

    if (
      this._renderedElement &&
      this._renderedElement !== this &&
      this.contains(this._renderedElement)
    ) {
      return this._renderedElement;
    }

    const contentNodes =
      this._renderedElement && this._renderedElement !== this
        ? Array.from(this._renderedElement.childNodes)
        : Array.from(this.childNodes).filter((node) => node !== this._renderedElement);
    const state: TabsPanelState = {
      hidden: !open,
      orientation,
    };
    const renderProps: TabsPanelRenderProps = {
      'aria-labelledby': this._findTabId() ?? undefined,
      role: 'tabpanel',
      tabIndex: open ? 0 : -1,
    };
    const template =
      typeof this.render === 'function' ? this.render(renderProps, state) : this.render;
    const nextRoot = materializeTemplateRoot(template);

    this.style.display = 'contents';

    if (nextRoot !== this) {
      this.replaceChildren(nextRoot);
      nextRoot.append(...contentNodes);
    } else {
      this._resetRenderedElement();
    }

    ensureId(nextRoot, this.id || 'base-ui-tabpanel');
    this._renderedElement = nextRoot;
    return nextRoot;
  }

  private _resetRenderedElement() {
    if (this._renderedElement == null || this._renderedElement === this) {
      return;
    }

    const contentNodes = Array.from(this._renderedElement.childNodes);
    this.replaceChildren(...contentNodes);
    this._renderedElement = null;
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
  render: TabsIndicatorRenderProp | undefined;
  private _renderedElement: HTMLElement | null = null;

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
    this._resetRenderedElement();
    this._root = null;
    this._list = null;
  }

  private _syncPosition() {
    const orientation = this._root?.getOrientation() ?? 'horizontal';
    const target = this._ensureRenderedElement(orientation);

    if (target !== this) {
      this.removeAttribute('role');
      this.removeAttribute('aria-hidden');
      this.removeAttribute('data-orientation');
      this.removeAttribute('data-activation-direction');
    }

    target.setAttribute('role', 'presentation');
    target.setAttribute('aria-hidden', 'true');
    target.setAttribute('data-orientation', orientation);
    target.setAttribute(
      'data-activation-direction',
      this._root?.getTabActivationDirection() ?? 'none',
    );

    const selectedValue = this._root?.getValue();
    if (selectedValue == null) {
      target.style.display = 'none';
      return;
    }

    const activeTab = this._root?.querySelector(
      `[role="tab"][data-value="${selectedValue}"]`,
    ) as HTMLElement | null;

    if (!activeTab || !this._list) {
      target.style.display = 'none';
      return;
    }

    const listRect = this._list.getBoundingClientRect();
    const tabRect = activeTab.getBoundingClientRect();

    const left = tabRect.left - listRect.left + this._list.scrollLeft;
    const top = tabRect.top - listRect.top + this._list.scrollTop;

    target.style.setProperty('--active-tab-left', `${left}px`);
    target.style.setProperty('--active-tab-top', `${top}px`);
    target.style.setProperty('--active-tab-width', `${tabRect.width}px`);
    target.style.setProperty('--active-tab-height', `${tabRect.height}px`);
    target.style.setProperty(
      '--active-tab-right',
      `${this._list.scrollWidth - left - tabRect.width}px`,
    );
    target.style.setProperty(
      '--active-tab-bottom',
      `${this._list.scrollHeight - top - tabRect.height}px`,
    );
    target.style.display = '';
  }

  private _ensureRenderedElement(orientation: TabsOrientation): HTMLElement {
    if (this.render == null) {
      this._resetRenderedElement();
      this.style.removeProperty('display');
      this._renderedElement = this;
      return this;
    }

    const state: TabsIndicatorState = {
      orientation,
    };
    const renderProps: TabsIndicatorRenderProps = {
      'aria-hidden': 'true',
      role: 'presentation',
    };
    const template =
      typeof this.render === 'function' ? this.render(renderProps, state) : this.render;

    this.style.display = 'contents';
    renderTemplate(template, this);

    const nextRoot = Array.from(this.children).find(
      (child): child is HTMLElement => child instanceof HTMLElement,
    ) ?? this;
    this._renderedElement = nextRoot;
    return nextRoot;
  }

  private _resetRenderedElement() {
    if (this._renderedElement == null || this._renderedElement === this) {
      return;
    }

    renderTemplate(nothing, this);
    this.style.removeProperty('display');
    this._renderedElement = null;
  }
}

if (!customElements.get('tabs-indicator')) {
  customElements.define('tabs-indicator', TabsIndicatorElement);
}

// ─── Namespace & Tag declarations ───────────────────────────────────────────────

export namespace TabsRoot {
  export type Props = TabsRootProps;
  export type State = TabsRootState;
  export type Orientation = TabsOrientation;
  export type ChangeEventReason = TabsRootChangeEventReason;
  export type ChangeEventDetails = TabsRootChangeEventDetails;
}

export namespace TabsList {
  export type Props = TabsListProps;
  export type State = TabsListState;
}

export namespace TabsTab {
  export type Props = TabsTabProps;
  export type State = TabsTabState;
  export type Value = TabValue;
  export type ActivationDirection = TabActivationDirection;
}

export namespace TabsPanel {
  export type Props = TabsPanelProps;
  export type State = TabsPanelState;
}

export namespace TabsIndicator {
  export type Props = TabsIndicatorProps;
  export type State = TabsIndicatorState;
}

export const Tabs = {
  Root: TabsRootElement,
  List: TabsListElement,
  Tab: TabsTabElement,
  Panel: TabsPanelElement,
  Indicator: TabsIndicatorElement,
} as const;

function createTabsChangeEventDetails(
  event: Event,
  activationDirection: TabActivationDirection,
): TabsRootChangeEventDetails {
  let canceled = false;
  let propagationAllowed = false;

  return {
    activationDirection,
    allowPropagation() {
      propagationAllowed = true;
    },
    cancel() {
      canceled = true;
    },
    get isCanceled() {
      return canceled;
    },
    get isPropagationAllowed() {
      return propagationAllowed;
    },
    event,
    reason: 'none',
    trigger: event.target instanceof Element ? event.target : undefined,
  };
}

function materializeTemplateRoot(template: TemplateResult): HTMLElement {
  const container = document.createElement('div');
  renderTemplate(template, container);

  const meaningfulChildren = Array.from(container.childNodes).filter((node) => {
    if (node.nodeType === Node.COMMENT_NODE) {
      return false;
    }

    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent?.trim().length;
    }

    return true;
  });

  if (meaningfulChildren.length !== 1 || !(meaningfulChildren[0] instanceof HTMLElement)) {
    throw new Error(
      'Base UI: `<tabs-*>` render templates must resolve to exactly one HTML element ' +
        'so attributes, ids, and children can be applied correctly. ' +
        'Update the `render` template to return a single root element.',
    );
  }

  return meaningfulChildren[0];
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
