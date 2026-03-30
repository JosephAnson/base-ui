import { ReactiveElement, render as renderTemplate, type TemplateResult } from 'lit';
import type { ComponentRenderFn, HTMLProps } from '../types';
import { BaseHTMLElement } from '../utils';

const TOOLBAR_ROOT_ATTRIBUTE = 'data-base-ui-toolbar-root';
const TOOLBAR_STATE_CHANGE_EVENT = 'base-ui-toolbar-state-change';
const TOOLBAR_ITEM_SELECTOR = 'toolbar-button, toolbar-link, toolbar-input';
const TOOLBAR_ROOT_OWNER_ATTRIBUTES = new Set([
  TOOLBAR_ROOT_ATTRIBUTE,
  'aria-orientation',
  'data-disabled',
  'data-orientation',
  'role',
]);
const TOOLBAR_GROUP_OWNER_ATTRIBUTES = new Set(['data-disabled', 'data-orientation', 'role']);
const TOOLBAR_BUTTON_OWNER_ATTRIBUTES = new Set([
  'aria-disabled',
  'data-disabled',
  'data-focusable',
  'data-orientation',
  'disabled',
  'role',
]);
const TOOLBAR_LINK_OWNER_ATTRIBUTES = new Set(['data-orientation']);
const TOOLBAR_INPUT_OWNER_ATTRIBUTES = new Set([
  'aria-disabled',
  'data-disabled',
  'data-focusable',
  'data-orientation',
  'disabled',
  'role',
]);
const TOOLBAR_SEPARATOR_OWNER_ATTRIBUTES = new Set([
  'aria-orientation',
  'data-orientation',
  'role',
]);

type ToolbarOrientation = 'horizontal' | 'vertical';
type ToolbarRootRenderProps = HTMLProps<HTMLElement>;
type ToolbarRootRenderProp =
  | TemplateResult
  | ComponentRenderFn<ToolbarRootRenderProps, ToolbarRootState>;
type ToolbarGroupRenderProps = HTMLProps<HTMLElement>;
type ToolbarGroupRenderProp =
  | TemplateResult
  | ComponentRenderFn<ToolbarGroupRenderProps, ToolbarGroupState>;
type ToolbarButtonRenderProps = HTMLProps<HTMLElement>;
type ToolbarButtonRenderProp =
  | TemplateResult
  | ComponentRenderFn<ToolbarButtonRenderProps, ToolbarButtonState>;
type ToolbarLinkRenderProps = HTMLProps<HTMLElement>;
type ToolbarLinkRenderProp =
  | TemplateResult
  | ComponentRenderFn<ToolbarLinkRenderProps, ToolbarLinkState>;
type ToolbarInputRenderProps = HTMLProps<HTMLElement>;
type ToolbarInputRenderProp =
  | TemplateResult
  | ComponentRenderFn<ToolbarInputRenderProps, ToolbarInputState>;
type ToolbarSeparatorRenderProps = HTMLProps<HTMLElement>;
type ToolbarSeparatorRenderProp =
  | TemplateResult
  | ComponentRenderFn<ToolbarSeparatorRenderProps, ToolbarSeparatorState>;

export interface ToolbarRootState {
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
  /**
   * The component orientation.
   */
  orientation: ToolbarOrientation;
}

export interface ToolbarGroupState extends ToolbarRootState {}

export interface ToolbarButtonState extends ToolbarRootState {
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
  /**
   * Whether the component remains focusable when disabled.
   */
  focusable: boolean;
}

export interface ToolbarLinkState {
  /**
   * The component orientation.
   */
  orientation: ToolbarOrientation;
}

export interface ToolbarInputState extends ToolbarRootState {
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
  /**
   * Whether the component remains focusable when disabled.
   */
  focusable: boolean;
}

export interface ToolbarSeparatorState {
  /**
   * The orientation of the separator.
   */
  orientation: ToolbarOrientation;
}

export interface ToolbarRootItemMetadata {
  focusableWhenDisabled: boolean;
}

export interface ToolbarRootProps {
  /**
   * If `true`, using keyboard navigation wraps focus to the opposite end.
   * @default true
   */
  loopFocus?: boolean | undefined;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * The component orientation.
   * @default 'horizontal'
   */
  orientation?: ToolbarOrientation | undefined;
  /**
   * Allows you to replace the component's HTML element with a custom template.
   * Accepts a `TemplateResult` or a function that returns the template to render.
   */
  render?: ToolbarRootRenderProp | undefined;
}

export interface ToolbarGroupProps {
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Allows you to replace the component's HTML element with a custom template.
   * Accepts a `TemplateResult` or a function that returns the template to render.
   */
  render?: ToolbarGroupRenderProp | undefined;
}

export interface ToolbarButtonProps {
  /**
   * When `true`, the item remains focusable when disabled.
   * @default true
   */
  focusableWhenDisabled?: boolean | undefined;
  /**
   * Whether the component expects a native `<button>` when replacing it via `render`.
   * This mirrors the React API for parity.
   * @default true
   */
  nativeButton?: boolean | undefined;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Allows you to replace the component's HTML element with a custom template.
   * Accepts a `TemplateResult` or a function that returns the template to render.
   */
  render?: ToolbarButtonRenderProp | undefined;
}

export interface ToolbarLinkProps {
  /**
   * Allows you to replace the component's HTML element with a custom template.
   * Accepts a `TemplateResult` or a function that returns the template to render.
   */
  render?: ToolbarLinkRenderProp | undefined;
}

export interface ToolbarInputProps {
  /**
   * The initial value for uncontrolled usage.
   */
  defaultValue?: string | number | string[] | undefined;
  /**
   * When `true`, the item remains focusable when disabled.
   * @default true
   */
  focusableWhenDisabled?: boolean | undefined;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Allows you to replace the component's HTML element with a custom template.
   * Accepts a `TemplateResult` or a function that returns the template to render.
   */
  render?: ToolbarInputRenderProp | undefined;
}

export interface ToolbarSeparatorProps {
  /**
   * Allows you to replace the component's HTML element with a custom template.
   * Accepts a `TemplateResult` or a function that returns the template to render.
   */
  render?: ToolbarSeparatorRenderProp | undefined;
}

interface ToolbarFocusableHost extends HTMLElement {
  getFocusableElement(): HTMLElement;
  getEffectiveDisabled(): boolean;
  readonly focusableWhenDisabled: boolean;
}

/**
 * The toolbar container providing keyboard navigation.
 * Renders a `<toolbar-root>` custom element.
 *
 * Documentation: [Base UI Toolbar](https://base-ui.com/react/components/toolbar)
 */
export class ToolbarRootElement extends ReactiveElement {
  static properties = {
    disabled: { type: Boolean, reflect: true },
    orientation: { type: String },
    render: { attribute: false },
  };

  declare disabled: boolean;
  declare orientation: ToolbarOrientation;
  declare render: ToolbarRootRenderProp | undefined;

  loopFocus = true;
  private renderedElement: HTMLElement | null = null;

  constructor() {
    super();
    this.disabled = false;
    this.orientation = 'horizontal';
  }

  override createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();
    this.setAttribute(TOOLBAR_ROOT_ATTRIBUTE, '');
    this.addEventListener('keydown', this.handleKeyDown);
    this.syncAttributes();
    queueMicrotask(() => this.syncTabIndices());
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('keydown', this.handleKeyDown);
    this.resetRenderedElement();
  }

  protected override updated() {
    this.syncAttributes();
    this.publishStateChange();
    queueMicrotask(() => this.syncTabIndices());
  }

  getOrientation(): ToolbarOrientation {
    return this.orientation;
  }

  getState(): ToolbarRootState {
    return {
      disabled: this.disabled,
      orientation: this.orientation,
    };
  }

  syncTabIndices(activeItem?: HTMLElement) {
    const items = this.getFocusableItems();
    if (items.length === 0) {
      return;
    }

    const current = activeItem ?? items[0];
    items.forEach((item) => {
      item.tabIndex = item === current ? 0 : -1;
    });
  }

  private syncAttributes() {
    const root = this.ensureRenderedElement();
    clearOwnedAttributes(this, TOOLBAR_ROOT_OWNER_ATTRIBUTES, root);

    root.setAttribute('role', 'toolbar');
    root.setAttribute('aria-orientation', this.orientation);
    root.setAttribute('data-orientation', this.orientation);
    root.toggleAttribute('data-disabled', this.disabled);
  }

  private publishStateChange() {
    this.dispatchEvent(
      new CustomEvent(TOOLBAR_STATE_CHANGE_EVENT, { bubbles: false, cancelable: false }),
    );
  }

  private getItemHosts(): ToolbarFocusableHost[] {
    return Array.from(this.querySelectorAll<HTMLElement>(TOOLBAR_ITEM_SELECTOR)).filter(
      (element): element is ToolbarFocusableHost =>
        typeof (element as ToolbarFocusableHost).getFocusableElement === 'function',
    );
  }

  private getFocusableItems(): HTMLElement[] {
    return this.getItemHosts()
      .filter((item) => !item.getEffectiveDisabled() || item.focusableWhenDisabled)
      .map((item) => item.getFocusableElement());
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const host = target.closest(TOOLBAR_ITEM_SELECTOR) as ToolbarFocusableHost | null;
    if (!host) {
      return;
    }

    const hostTagName = (host as HTMLElement).tagName.toLowerCase();
    if (hostTagName === 'toolbar-input' || target.tagName.toLowerCase() === 'input') {
      const isHorizontal = this.orientation === 'horizontal';
      if (isHorizontal && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
        return;
      }
      if (!isHorizontal && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
        return;
      }
    }

    const delta = this.getNavigationDelta(event.key);
    if (delta == null) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const items = this.getFocusableItems();
    if (items.length === 0) {
      return;
    }

    const currentItem = host.getFocusableElement();
    const currentIndex = items.indexOf(currentItem);
    if (currentIndex === -1) {
      return;
    }

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
    this.syncTabIndices(nextItem);
  };

  private getNavigationDelta(key: string): number | null {
    if (this.orientation === 'vertical') {
      if (key === 'ArrowDown') {
        return 1;
      }
      if (key === 'ArrowUp') {
        return -1;
      }
      if (key === 'Home') {
        return -Infinity;
      }
      if (key === 'End') {
        return Infinity;
      }
      return null;
    }

    const dir = getDirection(this);
    const forward = dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
    const backward = dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft';

    if (key === forward) {
      return 1;
    }
    if (key === backward) {
      return -1;
    }
    if (key === 'Home') {
      return -Infinity;
    }
    if (key === 'End') {
      return Infinity;
    }
    return null;
  }

  private ensureRenderedElement(): HTMLElement {
    if (this.render == null) {
      this.style.display = 'block';
      this.resetRenderedElement();
      this.renderedElement = this;
      return this;
    }

    if (
      this.renderedElement &&
      this.renderedElement !== this &&
      this.contains(this.renderedElement)
    ) {
      copyHostAttributes(this, this.renderedElement, TOOLBAR_ROOT_OWNER_ATTRIBUTES);
      return this.renderedElement;
    }

    const contentNodes =
      this.renderedElement && this.renderedElement !== this
        ? Array.from(this.renderedElement.childNodes)
        : Array.from(this.childNodes).filter((node) => node !== this.renderedElement);
    const renderProps: ToolbarRootRenderProps = {
      'aria-orientation': this.orientation,
      role: 'toolbar',
    };
    const template =
      typeof this.render === 'function' ? this.render(renderProps, this.getState()) : this.render;
    const nextRoot = materializeTemplateRoot('toolbar-root', template);

    copyHostAttributes(this, nextRoot, TOOLBAR_ROOT_OWNER_ATTRIBUTES);
    this.style.display = 'contents';
    this.replaceChildren(nextRoot);
    nextRoot.append(...contentNodes);
    this.renderedElement = nextRoot;
    return nextRoot;
  }

  private resetRenderedElement() {
    if (this.renderedElement == null || this.renderedElement === this) {
      this.renderedElement = this;
      return;
    }

    const contentNodes = Array.from(this.renderedElement.childNodes);
    this.style.display = 'block';
    this.replaceChildren(...contentNodes);
    this.renderedElement = null;
  }
}

if (!customElements.get('toolbar-root')) {
  customElements.define('toolbar-root', ToolbarRootElement);
}

/**
 * Groups toolbar items. Can be independently disabled.
 * Renders a `<toolbar-group>` custom element.
 */
export class ToolbarGroupElement extends BaseHTMLElement {
  static get observedAttributes() {
    return ['disabled'];
  }

  disabled = false;
  render: ToolbarGroupRenderProp | undefined;
  renderedElement: HTMLElement | null = null;

  private rootElement: ToolbarRootElement | null = null;
  private readonly handleToolbarStateChange = () => this.syncAttributes();

  attributeChangedCallback(name: string, _old: string | null, value: string | null) {
    if (name === 'disabled') {
      this.disabled = value !== null;
      this.syncAttributes();
    }
  }

  connectedCallback() {
    this.rootElement = this.closest('toolbar-root') as ToolbarRootElement | null;
    this.rootElement?.addEventListener(TOOLBAR_STATE_CHANGE_EVENT, this.handleToolbarStateChange);
    this.syncAttributes();
  }

  disconnectedCallback() {
    this.rootElement?.removeEventListener(
      TOOLBAR_STATE_CHANGE_EVENT,
      this.handleToolbarStateChange,
    );
    this.rootElement = null;
    this.resetRenderedElement();
  }

  getState(): ToolbarGroupState {
    return {
      disabled: this.getEffectiveDisabled(),
      orientation: this.rootElement?.getOrientation() ?? 'horizontal',
    };
  }

  getEffectiveDisabled(): boolean {
    return this.disabled || (this.rootElement?.disabled ?? false);
  }

  private syncAttributes() {
    const group = this.ensureRenderedElement();
    const state = this.getState();

    clearOwnedAttributes(this, TOOLBAR_GROUP_OWNER_ATTRIBUTES, group);
    group.setAttribute('role', 'group');
    group.toggleAttribute('data-disabled', state.disabled);
    group.setAttribute('data-orientation', state.orientation);
  }

  private ensureRenderedElement(): HTMLElement {
    if (this.render == null) {
      this.style.removeProperty('display');
      this.resetRenderedElement();
      this.renderedElement = this;
      return this;
    }

    if (
      this.renderedElement &&
      this.renderedElement !== this &&
      this.contains(this.renderedElement)
    ) {
      copyHostAttributes(this, this.renderedElement, TOOLBAR_GROUP_OWNER_ATTRIBUTES);
      return this.renderedElement;
    }

    const contentNodes =
      this.renderedElement && this.renderedElement !== this
        ? Array.from(this.renderedElement.childNodes)
        : Array.from(this.childNodes).filter((node) => node !== this.renderedElement);
    const template =
      typeof this.render === 'function' ? this.render({}, this.getState()) : this.render;
    const nextRoot = materializeTemplateRoot('toolbar-group', template);

    copyHostAttributes(this, nextRoot, TOOLBAR_GROUP_OWNER_ATTRIBUTES);
    this.style.display = 'contents';
    this.replaceChildren(nextRoot);
    nextRoot.append(...contentNodes);
    this.renderedElement = nextRoot;
    return nextRoot;
  }

  private resetRenderedElement() {
    if (this.renderedElement == null || this.renderedElement === this) {
      this.renderedElement = this;
      return;
    }

    const contentNodes = Array.from(this.renderedElement.childNodes);
    this.style.removeProperty('display');
    this.replaceChildren(...contentNodes);
    this.renderedElement = null;
  }
}

if (!customElements.get('toolbar-group')) {
  customElements.define('toolbar-group', ToolbarGroupElement);
}

/**
 * An interactive button in the toolbar.
 * Renders a `<toolbar-button>` custom element.
 */
export class ToolbarButtonElement extends BaseHTMLElement implements ToolbarFocusableHost {
  static get observedAttributes() {
    return ['disabled'];
  }

  disabled = false;
  focusableWhenDisabled = true;
  nativeButton = true;
  render: ToolbarButtonRenderProp | undefined;
  renderedElement: HTMLElement | null = null;

  private rootElement: ToolbarRootElement | null = null;
  private groupElement: ToolbarGroupElement | null = null;
  private syncing = false;
  private readonly handleToolbarStateChange = () => this.syncAttributes();

  attributeChangedCallback(name: string, _old: string | null, value: string | null) {
    if (name === 'disabled' && !this.syncing) {
      this.disabled = value !== null;
    }
  }

  connectedCallback() {
    this.rootElement = this.closest('toolbar-root') as ToolbarRootElement | null;
    this.groupElement = this.closest('toolbar-group') as ToolbarGroupElement | null;

    this.addEventListener('click', this.handleClick);
    this.addEventListener('keydown', this.handleKeyDown);
    this.addEventListener('keyup', this.handleKeyUp);
    this.rootElement?.addEventListener(TOOLBAR_STATE_CHANGE_EVENT, this.handleToolbarStateChange);

    queueMicrotask(() => this.syncAttributes());
  }

  disconnectedCallback() {
    this.removeEventListener('click', this.handleClick);
    this.removeEventListener('keydown', this.handleKeyDown);
    this.removeEventListener('keyup', this.handleKeyUp);
    this.rootElement?.removeEventListener(
      TOOLBAR_STATE_CHANGE_EVENT,
      this.handleToolbarStateChange,
    );
    this.rootElement = null;
    this.groupElement = null;
    this.resetRenderedElement();
  }

  getState(): ToolbarButtonState {
    return {
      disabled: this.getEffectiveDisabled(),
      focusable: this.focusableWhenDisabled,
      orientation: this.rootElement?.getOrientation() ?? 'horizontal',
    };
  }

  getEffectiveDisabled(): boolean {
    return (
      this.disabled ||
      (this.groupElement?.getEffectiveDisabled() ?? false) ||
      (this.rootElement?.disabled ?? false)
    );
  }

  getFocusableElement(): HTMLElement {
    return this.ensureRenderedElement();
  }

  private syncAttributes() {
    if (this.syncing) {
      return;
    }

    this.syncing = true;
    const button = this.ensureRenderedElement();
    const state = this.getState();

    clearOwnedAttributes(this, TOOLBAR_BUTTON_OWNER_ATTRIBUTES, button);
    button.setAttribute('data-orientation', state.orientation);
    button.toggleAttribute('data-disabled', state.disabled);

    if (this.render == null) {
      button.setAttribute('role', 'button');
    }

    if (state.disabled) {
      if (this.focusableWhenDisabled) {
        button.setAttribute('aria-disabled', 'true');
        button.toggleAttribute('data-focusable', true);
        button.removeAttribute('disabled');
      } else {
        button.setAttribute('disabled', '');
        button.removeAttribute('aria-disabled');
        button.removeAttribute('data-focusable');
      }
    } else {
      button.removeAttribute('aria-disabled');
      button.removeAttribute('data-focusable');
      button.removeAttribute('disabled');
    }

    this.syncing = false;
  }

  private ensureRenderedElement(): HTMLElement {
    if (this.render == null) {
      this.style.removeProperty('display');
      this.resetRenderedElement();
      this.renderedElement = this;
      return this;
    }

    if (
      this.renderedElement &&
      this.renderedElement !== this &&
      this.contains(this.renderedElement)
    ) {
      copyHostAttributes(this, this.renderedElement, TOOLBAR_BUTTON_OWNER_ATTRIBUTES);
      return this.renderedElement;
    }

    const contentNodes =
      this.renderedElement && this.renderedElement !== this
        ? Array.from(this.renderedElement.childNodes)
        : Array.from(this.childNodes).filter((node) => node !== this.renderedElement);
    const template =
      typeof this.render === 'function' ? this.render({}, this.getState()) : this.render;
    const nextRoot = materializeTemplateRoot('toolbar-button', template);

    copyHostAttributes(this, nextRoot, TOOLBAR_BUTTON_OWNER_ATTRIBUTES);
    this.style.display = 'contents';
    this.replaceChildren(nextRoot);
    nextRoot.append(...contentNodes);
    this.renderedElement = nextRoot;
    return nextRoot;
  }

  private resetRenderedElement() {
    if (this.renderedElement == null || this.renderedElement === this) {
      this.renderedElement = this;
      return;
    }

    const contentNodes = Array.from(this.renderedElement.childNodes);
    this.style.removeProperty('display');
    this.replaceChildren(...contentNodes);
    this.renderedElement = null;
  }

  private handleClick = (event: MouseEvent) => {
    if (this.getEffectiveDisabled()) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  private handleKeyDown = (event: KeyboardEvent) => {
    if (this.render != null || event.target !== this) {
      return;
    }

    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      if (this.getEffectiveDisabled()) {
        return;
      }
    }

    if (event.key === 'Enter' && !this.getEffectiveDisabled()) {
      this.click();
    }
  };

  private handleKeyUp = (event: KeyboardEvent) => {
    if (this.render != null || event.target !== this) {
      return;
    }

    if (event.key === ' ' && !this.getEffectiveDisabled()) {
      this.click();
    }
  };
}

if (!customElements.get('toolbar-button')) {
  customElements.define('toolbar-button', ToolbarButtonElement);
}

/**
 * A hyperlink in the toolbar.
 * Renders a `<toolbar-link>` custom element.
 */
export class ToolbarLinkElement extends BaseHTMLElement implements ToolbarFocusableHost {
  render: ToolbarLinkRenderProp | undefined;
  renderedElement: HTMLElement | null = null;

  private rootElement: ToolbarRootElement | null = null;
  private readonly handleToolbarStateChange = () => this.syncAttributes();

  get focusableWhenDisabled() {
    return true;
  }

  connectedCallback() {
    this.rootElement = this.closest('toolbar-root') as ToolbarRootElement | null;
    this.rootElement?.addEventListener(TOOLBAR_STATE_CHANGE_EVENT, this.handleToolbarStateChange);
    this.syncAttributes();
  }

  disconnectedCallback() {
    this.rootElement?.removeEventListener(
      TOOLBAR_STATE_CHANGE_EVENT,
      this.handleToolbarStateChange,
    );
    this.rootElement = null;
    this.resetRenderedElement();
  }

  getState(): ToolbarLinkState {
    return {
      orientation: this.rootElement?.getOrientation() ?? 'horizontal',
    };
  }

  getEffectiveDisabled(): boolean {
    return false;
  }

  getFocusableElement(): HTMLElement {
    return this.ensureRenderedElement();
  }

  private syncAttributes() {
    const link = this.ensureRenderedElement();
    const state = this.getState();

    clearOwnedAttributes(this, TOOLBAR_LINK_OWNER_ATTRIBUTES, link);
    link.setAttribute('data-orientation', state.orientation);
  }

  private ensureRenderedElement(): HTMLElement {
    if (this.render == null) {
      this.style.removeProperty('display');
      this.resetRenderedElement();
      this.renderedElement = this;
      return this;
    }

    if (
      this.renderedElement &&
      this.renderedElement !== this &&
      this.contains(this.renderedElement)
    ) {
      copyHostAttributes(this, this.renderedElement, TOOLBAR_LINK_OWNER_ATTRIBUTES);
      return this.renderedElement;
    }

    const contentNodes =
      this.renderedElement && this.renderedElement !== this
        ? Array.from(this.renderedElement.childNodes)
        : Array.from(this.childNodes).filter((node) => node !== this.renderedElement);
    const template =
      typeof this.render === 'function' ? this.render({}, this.getState()) : this.render;
    const nextRoot = materializeTemplateRoot('toolbar-link', template);

    copyHostAttributes(this, nextRoot, TOOLBAR_LINK_OWNER_ATTRIBUTES);
    this.style.display = 'contents';
    this.replaceChildren(nextRoot);
    nextRoot.append(...contentNodes);
    this.renderedElement = nextRoot;
    return nextRoot;
  }

  private resetRenderedElement() {
    if (this.renderedElement == null || this.renderedElement === this) {
      this.renderedElement = this;
      return;
    }

    const contentNodes = Array.from(this.renderedElement.childNodes);
    this.style.removeProperty('display');
    this.replaceChildren(...contentNodes);
    this.renderedElement = null;
  }
}

if (!customElements.get('toolbar-link')) {
  customElements.define('toolbar-link', ToolbarLinkElement);
}

/**
 * A text input in the toolbar.
 * Renders a `<toolbar-input>` custom element.
 */
export class ToolbarInputElement extends BaseHTMLElement implements ToolbarFocusableHost {
  static get observedAttributes() {
    return ['disabled'];
  }

  disabled = false;
  focusableWhenDisabled = true;
  defaultValue: string | number | string[] | undefined;
  render: ToolbarInputRenderProp | undefined;
  renderedElement: HTMLElement | null = null;

  private rootElement: ToolbarRootElement | null = null;
  private groupElement: ToolbarGroupElement | null = null;
  private syncing = false;
  private readonly handleToolbarStateChange = () => this.syncAttributes();

  attributeChangedCallback(name: string, _old: string | null, value: string | null) {
    if (name === 'disabled' && !this.syncing) {
      this.disabled = value !== null;
    }
  }

  connectedCallback() {
    this.rootElement = this.closest('toolbar-root') as ToolbarRootElement | null;
    this.groupElement = this.closest('toolbar-group') as ToolbarGroupElement | null;

    this.addEventListener('click', this.handleClick);
    this.addEventListener('keydown', this.handleKeyDown);
    this.addEventListener('pointerdown', this.handlePointerDown);
    this.rootElement?.addEventListener(TOOLBAR_STATE_CHANGE_EVENT, this.handleToolbarStateChange);

    queueMicrotask(() => this.syncAttributes());
  }

  disconnectedCallback() {
    this.removeEventListener('click', this.handleClick);
    this.removeEventListener('keydown', this.handleKeyDown);
    this.removeEventListener('pointerdown', this.handlePointerDown);
    this.rootElement?.removeEventListener(
      TOOLBAR_STATE_CHANGE_EVENT,
      this.handleToolbarStateChange,
    );
    this.rootElement = null;
    this.groupElement = null;
    this.resetRenderedElement();
  }

  getState(): ToolbarInputState {
    return {
      disabled: this.getEffectiveDisabled(),
      focusable: this.focusableWhenDisabled,
      orientation: this.rootElement?.getOrientation() ?? 'horizontal',
    };
  }

  getEffectiveDisabled(): boolean {
    return (
      this.disabled ||
      (this.groupElement?.getEffectiveDisabled() ?? false) ||
      (this.rootElement?.disabled ?? false)
    );
  }

  getFocusableElement(): HTMLElement {
    return this.ensureRenderedElement();
  }

  private syncAttributes() {
    if (this.syncing) {
      return;
    }

    this.syncing = true;
    const input = this.ensureRenderedElement();
    const state = this.getState();

    clearOwnedAttributes(this, TOOLBAR_INPUT_OWNER_ATTRIBUTES, input);
    input.setAttribute('data-orientation', state.orientation);
    input.toggleAttribute('data-disabled', state.disabled);

    if (this.render == null) {
      input.setAttribute('role', 'textbox');
    }

    if (state.disabled) {
      if (this.focusableWhenDisabled) {
        input.setAttribute('aria-disabled', 'true');
        input.toggleAttribute('data-focusable', true);
        input.removeAttribute('disabled');
      } else {
        input.setAttribute('disabled', '');
        input.removeAttribute('aria-disabled');
        input.removeAttribute('data-focusable');
      }
    } else {
      input.removeAttribute('aria-disabled');
      input.removeAttribute('data-focusable');
      input.removeAttribute('disabled');
    }

    if (this.defaultValue !== undefined && input instanceof HTMLInputElement) {
      input.defaultValue = String(this.defaultValue);
      if (input.value === '') {
        input.value = String(this.defaultValue);
      }
    }

    this.syncing = false;
  }

  private ensureRenderedElement(): HTMLElement {
    if (this.render == null) {
      this.style.removeProperty('display');
      this.resetRenderedElement();
      this.renderedElement = this;
      return this;
    }

    if (
      this.renderedElement &&
      this.renderedElement !== this &&
      this.contains(this.renderedElement)
    ) {
      copyHostAttributes(this, this.renderedElement, TOOLBAR_INPUT_OWNER_ATTRIBUTES);
      return this.renderedElement;
    }

    const contentNodes =
      this.renderedElement && this.renderedElement !== this
        ? Array.from(this.renderedElement.childNodes)
        : Array.from(this.childNodes).filter((node) => node !== this.renderedElement);
    const template =
      typeof this.render === 'function' ? this.render({}, this.getState()) : this.render;
    const nextRoot = materializeTemplateRoot('toolbar-input', template);

    copyHostAttributes(this, nextRoot, TOOLBAR_INPUT_OWNER_ATTRIBUTES);
    this.style.display = 'contents';
    this.replaceChildren(nextRoot);
    nextRoot.append(...contentNodes);
    this.renderedElement = nextRoot;
    return nextRoot;
  }

  private resetRenderedElement() {
    if (this.renderedElement == null || this.renderedElement === this) {
      this.renderedElement = this;
      return;
    }

    const contentNodes = Array.from(this.renderedElement.childNodes);
    this.style.removeProperty('display');
    this.replaceChildren(...contentNodes);
    this.renderedElement = null;
  }

  private handleClick = (event: MouseEvent) => {
    if (this.getEffectiveDisabled()) {
      event.preventDefault();
    }
  };

  private handleKeyDown = (event: KeyboardEvent) => {
    if (this.getEffectiveDisabled()) {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
        event.preventDefault();
        event.stopPropagation();
      }
    }
  };

  private handlePointerDown = (event: PointerEvent) => {
    if (this.getEffectiveDisabled()) {
      event.preventDefault();
    }
  };
}

if (!customElements.get('toolbar-input')) {
  customElements.define('toolbar-input', ToolbarInputElement);
}

/**
 * A visual separator in the toolbar.
 * Renders a `<toolbar-separator>` custom element.
 */
export class ToolbarSeparatorElement extends BaseHTMLElement {
  render: ToolbarSeparatorRenderProp | undefined;
  renderedElement: HTMLElement | null = null;

  private rootElement: ToolbarRootElement | null = null;
  private readonly handleToolbarStateChange = () => this.syncAttributes();

  connectedCallback() {
    this.rootElement = this.closest('toolbar-root') as ToolbarRootElement | null;
    this.rootElement?.addEventListener(TOOLBAR_STATE_CHANGE_EVENT, this.handleToolbarStateChange);
    this.syncAttributes();
  }

  disconnectedCallback() {
    this.rootElement?.removeEventListener(
      TOOLBAR_STATE_CHANGE_EVENT,
      this.handleToolbarStateChange,
    );
    this.rootElement = null;
    this.resetRenderedElement();
  }

  getState(): ToolbarSeparatorState {
    return {
      orientation:
        (this.rootElement?.getOrientation() ?? 'horizontal') === 'horizontal'
          ? 'vertical'
          : 'horizontal',
    };
  }

  private syncAttributes() {
    const separator = this.ensureRenderedElement();
    const state = this.getState();

    clearOwnedAttributes(this, TOOLBAR_SEPARATOR_OWNER_ATTRIBUTES, separator);
    separator.setAttribute('role', 'separator');
    separator.setAttribute('aria-orientation', state.orientation);
    separator.setAttribute('data-orientation', state.orientation);
  }

  private ensureRenderedElement(): HTMLElement {
    if (this.render == null) {
      this.style.removeProperty('display');
      this.resetRenderedElement();
      this.renderedElement = this;
      return this;
    }

    if (
      this.renderedElement &&
      this.renderedElement !== this &&
      this.contains(this.renderedElement)
    ) {
      copyHostAttributes(this, this.renderedElement, TOOLBAR_SEPARATOR_OWNER_ATTRIBUTES);
      return this.renderedElement;
    }

    const contentNodes =
      this.renderedElement && this.renderedElement !== this
        ? Array.from(this.renderedElement.childNodes)
        : Array.from(this.childNodes).filter((node) => node !== this.renderedElement);
    const template =
      typeof this.render === 'function' ? this.render({}, this.getState()) : this.render;
    const nextRoot = materializeTemplateRoot('toolbar-separator', template);

    copyHostAttributes(this, nextRoot, TOOLBAR_SEPARATOR_OWNER_ATTRIBUTES);
    this.style.display = 'contents';
    this.replaceChildren(nextRoot);
    nextRoot.append(...contentNodes);
    this.renderedElement = nextRoot;
    return nextRoot;
  }

  private resetRenderedElement() {
    if (this.renderedElement == null || this.renderedElement === this) {
      this.renderedElement = this;
      return;
    }

    const contentNodes = Array.from(this.renderedElement.childNodes);
    this.style.removeProperty('display');
    this.replaceChildren(...contentNodes);
    this.renderedElement = null;
  }
}

if (!customElements.get('toolbar-separator')) {
  customElements.define('toolbar-separator', ToolbarSeparatorElement);
}

export const Toolbar = {
  Root: ToolbarRootElement,
  Group: ToolbarGroupElement,
  Button: ToolbarButtonElement,
  Link: ToolbarLinkElement,
  Input: ToolbarInputElement,
  Separator: ToolbarSeparatorElement,
} as const;

function getDirection(element: Element): 'ltr' | 'rtl' {
  const scoped = element.closest('[dir]')?.getAttribute('dir');
  const doc = element.ownerDocument.documentElement.getAttribute('dir');
  return scoped === 'rtl' || doc === 'rtl' ? 'rtl' : 'ltr';
}

function clearOwnedAttributes(
  host: HTMLElement,
  ownedAttributes: Set<string>,
  renderedElement: HTMLElement,
) {
  if (renderedElement === host) {
    return;
  }

  ownedAttributes.forEach((attributeName) => {
    host.removeAttribute(attributeName);
  });
}

function copyHostAttributes(
  host: HTMLElement,
  target: HTMLElement,
  ignoredAttributes: Set<string>,
) {
  let copiedStyle = false;

  Array.from(host.attributes).forEach((attribute) => {
    if (ignoredAttributes.has(attribute.name)) {
      return;
    }

    if (attribute.name === 'style') {
      copiedStyle = true;
      const declarations = Array.from(host.style)
        .filter((propertyName) => propertyName !== 'display')
        .map((propertyName) => {
          const value = host.style.getPropertyValue(propertyName);
          const priority = host.style.getPropertyPriority(propertyName);
          return priority ? `${propertyName}: ${value} !important;` : `${propertyName}: ${value};`;
        })
        .join(' ');

      if (declarations.trim().length > 0) {
        target.setAttribute('style', declarations);
      } else {
        target.removeAttribute('style');
      }
      return;
    }

    target.setAttribute(attribute.name, attribute.value);
  });

  if (!copiedStyle && target.getAttribute('style') != null && target.style.display === '') {
    target.removeAttribute('style');
  }
}

function materializeTemplateRoot(name: string, template: TemplateResult): HTMLElement {
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
      `Base UI: \`<${name}>\` render templates must resolve to exactly one HTML element ` +
        'so attributes, ids, and children can be applied correctly. ' +
        'Update the `render` template to return a single root element.',
    );
  }

  return meaningfulChildren[0];
}

export namespace ToolbarRoot {
  export type Props = ToolbarRootProps;
  export type State = ToolbarRootState;
  export type Orientation = ToolbarOrientation;
  export type ItemMetadata = ToolbarRootItemMetadata;
}

export namespace ToolbarGroup {
  export type Props = ToolbarGroupProps;
  export type State = ToolbarGroupState;
}

export namespace ToolbarButton {
  export type Props = ToolbarButtonProps;
  export type State = ToolbarButtonState;
}

export namespace ToolbarLink {
  export type Props = ToolbarLinkProps;
  export type State = ToolbarLinkState;
}

export namespace ToolbarInput {
  export type Props = ToolbarInputProps;
  export type State = ToolbarInputState;
}

export namespace ToolbarSeparator {
  export type Props = ToolbarSeparatorProps;
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
