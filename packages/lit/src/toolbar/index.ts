import { ReactiveElement } from 'lit';
import { BaseHTMLElement } from '../utils/index.ts';

// ─── Constants ──────────────────────────────────────────────────────────────────

const TOOLBAR_ROOT_ATTRIBUTE = 'data-base-ui-toolbar-root';
const TOOLBAR_STATE_CHANGE_EVENT = 'base-ui-toolbar-state-change';
const TOOLBAR_ITEM_SELECTOR = 'toolbar-button, toolbar-link, toolbar-input';

type ToolbarOrientation = 'horizontal' | 'vertical';

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface ToolbarRootState {
  disabled: boolean;
  orientation: ToolbarOrientation;
}

export interface ToolbarGroupState extends ToolbarRootState {}

export interface ToolbarButtonState extends ToolbarRootState {
  disabled: boolean;
  focusable: boolean;
}

export interface ToolbarLinkState {
  orientation: ToolbarOrientation;
}

export interface ToolbarInputState extends ToolbarRootState {
  disabled: boolean;
  focusable: boolean;
}

export interface ToolbarSeparatorState {
  orientation: ToolbarOrientation;
}

// ─── ToolbarRootElement ─────────────────────────────────────────────────────────

/**
 * The toolbar container providing keyboard navigation.
 * Renders a `<toolbar-root>` custom element with `role="toolbar"`.
 *
 * Documentation: [Base UI Toolbar](https://base-ui.com/react/components/toolbar)
 */
export class ToolbarRootElement extends ReactiveElement {
  static properties = {
    disabled: { type: Boolean, reflect: true },
  };

  declare disabled: boolean;

  loopFocus = true;
  orientation: ToolbarOrientation = 'horizontal';

  constructor() {
    super();
    this.disabled = false;
  }

  override createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();
    this.style.display = 'contents';
    this.setAttribute(TOOLBAR_ROOT_ATTRIBUTE, '');
    this.setAttribute('role', 'toolbar');

    this.addEventListener('keydown', this._handleKeyDown);

    this._syncAttributes();
    queueMicrotask(() => this._syncTabIndices());
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('keydown', this._handleKeyDown);
  }

  protected override updated() {
    this._syncAttributes();
    this._publishStateChange();
  }

  // ── Public API ──────────────────────────────────────────────────────────

  getOrientation(): ToolbarOrientation {
    return this.orientation;
  }

  // ── Private ─────────────────────────────────────────────────────────────

  private _syncAttributes() {
    this.setAttribute('aria-orientation', this.orientation);
    this.setAttribute('data-orientation', this.orientation);
    this.toggleAttribute('data-disabled', this.disabled);
  }

  private _publishStateChange() {
    this.dispatchEvent(
      new CustomEvent(TOOLBAR_STATE_CHANGE_EVENT, { bubbles: false, cancelable: false }),
    );
  }

  // ── Keyboard navigation (roving tabindex) ─────────────────────────────

  private _getFocusableItems(): HTMLElement[] {
    return Array.from(
      this.querySelectorAll<HTMLElement>(TOOLBAR_ITEM_SELECTOR),
    ).filter((el) => {
      // Skip items with focusableWhenDisabled=false that are disabled
      if (el.tagName.toLowerCase() === 'toolbar-link') return true;
      const isDisabled = el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true';
      const isFocusable = el.getAttribute('data-focusable') !== null || !isDisabled;
      return isFocusable;
    });
  }

  private _handleKeyDown = (event: KeyboardEvent) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    // Don't capture arrow keys when inside an input (let cursor move)
    if (target.tagName.toLowerCase() === 'toolbar-input' || target.tagName.toLowerCase() === 'input') {
      const isHorizontal = this.orientation === 'horizontal';
      if (isHorizontal && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
        return; // Let input handle cursor movement
      }
      if (!isHorizontal && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
        return; // Let input handle vertical input navigation
      }
    }

    // Check if the target is a toolbar item
    const isToolbarItem = target.closest(TOOLBAR_ITEM_SELECTOR);
    if (!isToolbarItem) return;

    const delta = this._getNavigationDelta(event.key);
    if (delta == null) return;

    event.preventDefault();
    event.stopPropagation();

    const items = this._getFocusableItems();
    if (items.length === 0) return;

    // Find the current item
    const currentItem = target.closest(TOOLBAR_ITEM_SELECTOR) as HTMLElement;
    const currentIndex = items.indexOf(currentItem);
    if (currentIndex === -1) return;

    let nextItem: HTMLElement;

    if (delta === Infinity) {
      nextItem = items[items.length - 1];
    } else if (delta === -Infinity) {
      nextItem = items[0];
    } else {
      const proposed = currentIndex + delta;
      if (proposed < 0) {
        nextItem = this.loopFocus ? items[items.length - 1] : items[0];
      } else if (proposed >= items.length) {
        nextItem = this.loopFocus ? items[0] : items[items.length - 1];
      } else {
        nextItem = items[proposed];
      }
    }

    nextItem.focus();
    this._syncTabIndices(nextItem);
  };

  private _getNavigationDelta(key: string): number | null {
    if (this.orientation === 'vertical') {
      if (key === 'ArrowDown') return 1;
      if (key === 'ArrowUp') return -1;
      if (key === 'Home') return -Infinity;
      if (key === 'End') return Infinity;
      return null;
    }

    const dir = this._getDirection();
    const forward = dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
    const backward = dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft';

    if (key === forward) return 1;
    if (key === backward) return -1;
    if (key === 'Home') return -Infinity;
    if (key === 'End') return Infinity;
    return null;
  }

  private _getDirection(): 'ltr' | 'rtl' {
    const scoped = this.closest('[dir]')?.getAttribute('dir');
    const doc = this.ownerDocument.documentElement.getAttribute('dir');
    return scoped === 'rtl' || doc === 'rtl' ? 'rtl' : 'ltr';
  }

  /** Update roving tabindex. */
  _syncTabIndices(activeItem?: HTMLElement) {
    const items = this._getFocusableItems();
    if (items.length === 0) return;

    const current = activeItem ?? items[0];

    items.forEach((item) => {
      item.tabIndex = item === current ? 0 : -1;
    });
  }
}

if (!customElements.get('toolbar-root')) {
  customElements.define('toolbar-root', ToolbarRootElement);
}

// ─── ToolbarGroupElement ────────────────────────────────────────────────────────

/**
 * Groups toolbar items. Can be independently disabled.
 * Renders a `<toolbar-group>` custom element with `role="group"`.
 */
export class ToolbarGroupElement extends BaseHTMLElement {
  static get observedAttributes() {
    return ['disabled'];
  }

  disabled = false;

  private _root: ToolbarRootElement | null = null;
  private _handler = () => this._syncAttributes();

  attributeChangedCallback(name: string, _old: string | null, value: string | null) {
    if (name === 'disabled') {
      this.disabled = value !== null;
      this._syncAttributes();
    }
  }

  connectedCallback() {
    this._root = this.closest('toolbar-root') as ToolbarRootElement | null;
    this.setAttribute('role', 'group');

    if (this._root) {
      this._root.addEventListener(TOOLBAR_STATE_CHANGE_EVENT, this._handler);
    }

    this._syncAttributes();
  }

  disconnectedCallback() {
    this._root?.removeEventListener(TOOLBAR_STATE_CHANGE_EVENT, this._handler);
    this._root = null;
  }

  private _syncAttributes() {
    const effectiveDisabled = this.disabled || (this._root?.disabled ?? false);
    this.toggleAttribute('data-disabled', effectiveDisabled);
    this.setAttribute('data-orientation', this._root?.getOrientation() ?? 'horizontal');
  }
}

if (!customElements.get('toolbar-group')) {
  customElements.define('toolbar-group', ToolbarGroupElement);
}

// ─── ToolbarButtonElement ───────────────────────────────────────────────────────

/**
 * An interactive button in the toolbar.
 * Renders a `<toolbar-button>` custom element.
 */
export class ToolbarButtonElement extends BaseHTMLElement {
  static get observedAttributes() {
    return ['disabled'];
  }

  disabled = false;
  focusableWhenDisabled = true;

  private _root: ToolbarRootElement | null = null;
  private _group: ToolbarGroupElement | null = null;
  private _handler = () => this._syncAttributes();
  private _syncing = false;

  attributeChangedCallback(name: string, _old: string | null, value: string | null) {
    if (name === 'disabled' && !this._syncing) {
      this.disabled = value !== null;
    }
  }

  connectedCallback() {
    this._root = this.closest('toolbar-root') as ToolbarRootElement | null;
    this._group = this.closest('toolbar-group') as ToolbarGroupElement | null;

    this.setAttribute('role', 'button');
    this.addEventListener('click', this._handleClick);
    this.addEventListener('keydown', this._handleKeyDown);
    this.addEventListener('keyup', this._handleKeyUp);

    if (this._root) {
      this._root.addEventListener(TOOLBAR_STATE_CHANGE_EVENT, this._handler);
    }

    // Defer so Lit property bindings are set first
    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this.removeEventListener('click', this._handleClick);
    this.removeEventListener('keydown', this._handleKeyDown);
    this.removeEventListener('keyup', this._handleKeyUp);
    this._root?.removeEventListener(TOOLBAR_STATE_CHANGE_EVENT, this._handler);
    this._root = null;
    this._group = null;
  }

  private _isDisabled(): boolean {
    return this.disabled || (this._group?.disabled ?? false) || (this._root?.disabled ?? false);
  }

  private _syncAttributes() {
    if (this._syncing) return;
    this._syncing = true;

    const isDisabled = this._isDisabled();
    this.toggleAttribute('data-disabled', isDisabled);
    this.setAttribute('data-orientation', this._root?.getOrientation() ?? 'horizontal');

    if (isDisabled) {
      if (this.focusableWhenDisabled) {
        this.setAttribute('aria-disabled', 'true');
        this.toggleAttribute('data-focusable', true);
        this.removeAttribute('disabled');
      } else {
        this.setAttribute('disabled', '');
        this.removeAttribute('aria-disabled');
        this.removeAttribute('data-focusable');
      }
    } else {
      this.removeAttribute('aria-disabled');
      this.removeAttribute('data-focusable');
      this.removeAttribute('disabled');
    }

    this._syncing = false;
  }

  private _handleClick = (event: MouseEvent) => {
    if (this._isDisabled()) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  private _handleKeyDown = (event: KeyboardEvent) => {
    if (event.target !== this) return;

    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      if (this._isDisabled()) return;
    }

    if (event.key === 'Enter' && !this._isDisabled()) {
      this.click();
    }
  };

  private _handleKeyUp = (event: KeyboardEvent) => {
    if (event.target !== this) return;
    if (event.key === ' ' && !this._isDisabled()) {
      this.click();
    }
  };
}

if (!customElements.get('toolbar-button')) {
  customElements.define('toolbar-button', ToolbarButtonElement);
}

// ─── ToolbarLinkElement ─────────────────────────────────────────────────────────

/**
 * A hyperlink in the toolbar.
 * Renders a `<toolbar-link>` custom element.
 */
export class ToolbarLinkElement extends BaseHTMLElement {
  private _root: ToolbarRootElement | null = null;
  private _handler = () => this._syncAttributes();

  connectedCallback() {
    this._root = this.closest('toolbar-root') as ToolbarRootElement | null;

    if (this._root) {
      this._root.addEventListener(TOOLBAR_STATE_CHANGE_EVENT, this._handler);
    }

    this._syncAttributes();
  }

  disconnectedCallback() {
    this._root?.removeEventListener(TOOLBAR_STATE_CHANGE_EVENT, this._handler);
    this._root = null;
  }

  private _syncAttributes() {
    this.setAttribute('data-orientation', this._root?.getOrientation() ?? 'horizontal');
  }
}

if (!customElements.get('toolbar-link')) {
  customElements.define('toolbar-link', ToolbarLinkElement);
}

// ─── ToolbarInputElement ────────────────────────────────────────────────────────

/**
 * A text input in the toolbar.
 * Renders a `<toolbar-input>` custom element.
 */
export class ToolbarInputElement extends BaseHTMLElement {
  static get observedAttributes() {
    return ['disabled'];
  }

  disabled = false;
  focusableWhenDisabled = true;

  private _root: ToolbarRootElement | null = null;
  private _group: ToolbarGroupElement | null = null;
  private _handler = () => this._syncAttributes();
  private _syncing = false;

  attributeChangedCallback(name: string, _old: string | null, value: string | null) {
    if (name === 'disabled' && !this._syncing) {
      this.disabled = value !== null;
    }
  }

  connectedCallback() {
    this._root = this.closest('toolbar-root') as ToolbarRootElement | null;
    this._group = this.closest('toolbar-group') as ToolbarGroupElement | null;

    this.setAttribute('role', 'textbox');

    if (this._root) {
      this._root.addEventListener(TOOLBAR_STATE_CHANGE_EVENT, this._handler);
    }

    this.addEventListener('click', this._handleClick);
    this.addEventListener('keydown', this._handleKeyDown);
    this.addEventListener('pointerdown', this._handlePointerDown);

    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this.removeEventListener('click', this._handleClick);
    this.removeEventListener('keydown', this._handleKeyDown);
    this.removeEventListener('pointerdown', this._handlePointerDown);
    this._root?.removeEventListener(TOOLBAR_STATE_CHANGE_EVENT, this._handler);
    this._root = null;
    this._group = null;
  }

  private _isDisabled(): boolean {
    return this.disabled || (this._group?.disabled ?? false) || (this._root?.disabled ?? false);
  }

  private _syncAttributes() {
    if (this._syncing) return;
    this._syncing = true;

    const isDisabled = this._isDisabled();
    this.toggleAttribute('data-disabled', isDisabled);
    this.setAttribute('data-orientation', this._root?.getOrientation() ?? 'horizontal');

    if (isDisabled) {
      if (this.focusableWhenDisabled) {
        this.setAttribute('aria-disabled', 'true');
        this.toggleAttribute('data-focusable', true);
        this.removeAttribute('disabled');
      } else {
        this.setAttribute('disabled', '');
        this.removeAttribute('aria-disabled');
        this.removeAttribute('data-focusable');
      }
    } else {
      this.removeAttribute('aria-disabled');
      this.removeAttribute('data-focusable');
      this.removeAttribute('disabled');
    }

    this._syncing = false;
  }

  private _handleClick = (event: MouseEvent) => {
    if (this._isDisabled()) {
      event.preventDefault();
    }
  };

  private _handleKeyDown = (event: KeyboardEvent) => {
    if (this._isDisabled()) {
      // Allow ArrowLeft/ArrowRight for cursor movement in disabled state
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
        event.preventDefault();
        event.stopPropagation();
      }
    }
  };

  private _handlePointerDown = (event: PointerEvent) => {
    if (this._isDisabled()) {
      event.preventDefault();
    }
  };
}

if (!customElements.get('toolbar-input')) {
  customElements.define('toolbar-input', ToolbarInputElement);
}

// ─── ToolbarSeparatorElement ────────────────────────────────────────────────────

/**
 * A visual separator in the toolbar.
 * Renders a `<toolbar-separator>` custom element with `role="separator"`.
 * Orientation is inverted relative to the toolbar (horizontal toolbar → vertical separator).
 */
export class ToolbarSeparatorElement extends BaseHTMLElement {
  private _root: ToolbarRootElement | null = null;
  private _handler = () => this._syncAttributes();

  connectedCallback() {
    this._root = this.closest('toolbar-root') as ToolbarRootElement | null;
    this.setAttribute('role', 'separator');

    if (this._root) {
      this._root.addEventListener(TOOLBAR_STATE_CHANGE_EVENT, this._handler);
    }

    this._syncAttributes();
  }

  disconnectedCallback() {
    this._root?.removeEventListener(TOOLBAR_STATE_CHANGE_EVENT, this._handler);
    this._root = null;
  }

  private _syncAttributes() {
    const toolbarOrientation = this._root?.getOrientation() ?? 'horizontal';
    const invertedOrientation = toolbarOrientation === 'horizontal' ? 'vertical' : 'horizontal';
    this.setAttribute('aria-orientation', invertedOrientation);
    this.setAttribute('data-orientation', invertedOrientation);
  }
}

if (!customElements.get('toolbar-separator')) {
  customElements.define('toolbar-separator', ToolbarSeparatorElement);
}

// ─── Namespace & Tag declarations ───────────────────────────────────────────────

export namespace ToolbarRoot {
  export type State = ToolbarRootState;
}

export namespace ToolbarGroup {
  export type State = ToolbarGroupState;
}

export namespace ToolbarButton {
  export type State = ToolbarButtonState;
}

export namespace ToolbarLink {
  export type State = ToolbarLinkState;
}

export namespace ToolbarInput {
  export type State = ToolbarInputState;
}

export namespace ToolbarSeparator {
  export type State = ToolbarSeparatorState;
}

declare global {
  interface HTMLElementTagNameMap {
    'toolbar-root': ToolbarRootElement;
    'toolbar-group': ToolbarGroupElement;
    'toolbar-button': ToolbarButtonElement;
    'toolbar-link': ToolbarLinkElement;
    'toolbar-input': ToolbarInputElement;
    'toolbar-separator': ToolbarSeparatorElement;
  }
}
