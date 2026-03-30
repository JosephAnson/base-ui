/* eslint-disable default-case, curly, no-nested-ternary, no-underscore-dangle */
import { html, ReactiveElement, render as renderTemplate, type TemplateResult } from 'lit';
import type { ComponentRenderFn, HTMLProps } from '../types';
import { BaseHTMLElement, ensureId } from '../utils';
import { getDirection } from '../direction-provider';

// ─── Constants ──────────────────────────────────────────────────────────────────

const ACCORDION_ROOT_ATTRIBUTE = 'data-base-ui-accordion-root';
const ACCORDION_ITEM_ATTRIBUTE = 'data-base-ui-accordion-item';
const ACCORDION_TRIGGER_ATTRIBUTE = 'data-base-ui-accordion-trigger';
const ACCORDION_PANEL_ATTRIBUTE = 'data-base-ui-accordion-panel';
const ACCORDION_ROOT_STATE_CHANGE_EVENT = 'base-ui-accordion-root-state-change';
const ACCORDION_ITEM_STATE_CHANGE_EVENT = 'base-ui-accordion-item-state-change';
const ACCORDION_PANEL_HEIGHT_VAR = '--accordion-panel-height';
const ACCORDION_PANEL_WIDTH_VAR = '--accordion-panel-width';
const ACCORDION_ROOT_OWNER_ATTRIBUTES = new Set(['id', 'render']);
const ACCORDION_ITEM_OWNER_ATTRIBUTES = new Set(['id', 'render', 'value']);
const ACCORDION_HEADER_OWNER_ATTRIBUTES = new Set(['id', 'render']);
const ACCORDION_TRIGGER_OWNER_ATTRIBUTES = new Set(['id', 'render', 'native-button']);
const ACCORDION_PANEL_OWNER_ATTRIBUTES = new Set([
  'id',
  'render',
  'hidden-until-found',
  'keep-mounted',
]);

const SUPPORTED_TRIGGER_KEYS = new Set([
  'ArrowDown',
  'ArrowUp',
  'ArrowRight',
  'ArrowLeft',
  'Home',
  'End',
]);

// ─── Types ──────────────────────────────────────────────────────────────────────

type Orientation = 'horizontal' | 'vertical';
type TransitionStatus = 'starting' | 'ending' | undefined;
type AccordionRootRenderProps = HTMLProps<HTMLElement>;
type AccordionRootRenderProp =
  | TemplateResult
  | ComponentRenderFn<AccordionRootRenderProps, AccordionRootState>;
type AccordionItemRenderProps = HTMLProps<HTMLElement>;
type AccordionItemRenderProp =
  | TemplateResult
  | ComponentRenderFn<AccordionItemRenderProps, AccordionItemState>;
type AccordionHeaderRenderProps = HTMLProps<HTMLElement>;
type AccordionHeaderRenderProp =
  | TemplateResult
  | ComponentRenderFn<AccordionHeaderRenderProps, AccordionHeaderState>;
type AccordionTriggerRenderProps = HTMLProps<HTMLElement>;
type AccordionTriggerRenderProp =
  | TemplateResult
  | ComponentRenderFn<AccordionTriggerRenderProps, AccordionTriggerState>;
type AccordionPanelRenderProps = HTMLProps<HTMLElement>;
type AccordionPanelRenderProp =
  | TemplateResult
  | ComponentRenderFn<AccordionPanelRenderProps, AccordionPanelState>;

export type AccordionItemChangeEventReason = 'trigger-press' | 'none';

export interface AccordionItemChangeEventDetails {
  reason: AccordionItemChangeEventReason;
  event: Event;
  readonly isPropagationAllowed: boolean;
  readonly isCanceled: boolean;
  readonly trigger: Element | undefined;
  cancel(): void;
  allowPropagation(): void;
}

export type AccordionRootChangeEventReason = 'trigger-press' | 'none';

export interface AccordionRootChangeEventDetails {
  reason: AccordionRootChangeEventReason;
  event: Event;
  readonly isPropagationAllowed: boolean;
  readonly isCanceled: boolean;
  readonly trigger: Element | undefined;
  cancel(): void;
  allowPropagation(): void;
}

export interface AccordionRootState {
  value: unknown[];
  disabled: boolean;
  orientation: Orientation;
}

export interface AccordionItemState extends AccordionRootState {
  index: number;
  open: boolean;
}

export interface AccordionHeaderState extends AccordionItemState {}
export interface AccordionTriggerState extends AccordionItemState {}
export interface AccordionPanelState extends AccordionItemState {
  transitionStatus: TransitionStatus;
}

export interface AccordionRootProps<Value = unknown> {
  /**
   * The uncontrolled value of the item(s) that should be initially expanded.
   */
  defaultValue?: Value[] | undefined;
  /**
   * The controlled value of the item(s) that should be expanded.
   */
  value?: Value[] | undefined;
  /**
   * Event handler called when an accordion item is expanded or collapsed.
   */
  onValueChange?:
    | ((value: Value[], eventDetails: AccordionRootChangeEventDetails) => void)
    | undefined;
  /**
   * Allows the browser's built-in page search to find and expand the panel contents.
   * @default false
   */
  hiddenUntilFound?: boolean | undefined;
  /**
   * Whether to keep the element in the DOM while the panel is closed.
   * This prop is ignored when `hiddenUntilFound` is used.
   * @default false
   */
  keepMounted?: boolean | undefined;
  /**
   * Whether to loop keyboard focus back to the first item.
   * @default true
   */
  loopFocus?: boolean | undefined;
  /**
   * Whether multiple items can be open at the same time.
   * @default false
   */
  multiple?: boolean | undefined;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * The visual orientation of the accordion.
   * @default 'vertical'
   */
  orientation?: Orientation | undefined;
  /**
   * Allows you to replace the component's HTML element with a custom template.
   * Accepts a `TemplateResult` or a function that returns the template to render.
   */
  render?: AccordionRootRenderProp | undefined;
}

export interface AccordionItemProps<Value = unknown> {
  /**
   * A unique value that identifies this accordion item.
   */
  value?: Value | undefined;
  /**
   * Event handler called when the panel is opened or closed.
   */
  onOpenChange?:
    | ((open: boolean, eventDetails: AccordionItemChangeEventDetails) => void)
    | undefined;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Allows you to replace the component's HTML element with a custom template.
   * Accepts a `TemplateResult` or a function that returns the template to render.
   */
  render?: AccordionItemRenderProp | undefined;
}

export interface AccordionHeaderProps {
  /**
   * Allows you to replace the component's HTML element with a custom template.
   * Accepts a `TemplateResult` or a function that returns the template to render.
   */
  render?: AccordionHeaderRenderProp | undefined;
}

export interface AccordionTriggerProps {
  /**
   * Whether the component renders a native `<button>` element when replacing it
   * via the `render` prop.
   * Set to `false` if the rendered element is not a button.
   * @default true
   */
  nativeButton?: boolean | undefined;
  /**
   * Allows you to replace the component's HTML element with a custom template.
   * Accepts a `TemplateResult` or a function that returns the template to render.
   */
  render?: AccordionTriggerRenderProp | undefined;
}

export interface AccordionPanelProps {
  /**
   * Allows the browser's built-in page search to find and expand the panel contents.
   * @default false
   */
  hiddenUntilFound?: boolean | undefined;
  /**
   * Whether to keep the element in the DOM while the panel is closed.
   * This prop is ignored when `hiddenUntilFound` is used.
   * @default false
   */
  keepMounted?: boolean | undefined;
  /**
   * Allows you to replace the component's HTML element with a custom template.
   * Accepts a `TemplateResult` or a function that returns the template to render.
   */
  render?: AccordionPanelRenderProp | undefined;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function createItemChangeEventDetails(
  reason: AccordionItemChangeEventReason,
  event: Event,
  trigger: Element | undefined,
): AccordionItemChangeEventDetails {
  let canceled = false;
  let propagationAllowed = false;
  return {
    reason,
    event,
    trigger,
    get isPropagationAllowed() {
      return propagationAllowed;
    },
    get isCanceled() {
      return canceled;
    },
    cancel() {
      canceled = true;
    },
    allowPropagation() {
      propagationAllowed = true;
    },
  };
}

function createRootChangeEventDetails(
  reason: AccordionRootChangeEventReason,
  event: Event,
  trigger: Element | undefined,
): AccordionRootChangeEventDetails {
  let canceled = false;
  let propagationAllowed = false;
  return {
    reason,
    event,
    trigger,
    get isPropagationAllowed() {
      return propagationAllowed;
    },
    get isCanceled() {
      return canceled;
    },
    cancel() {
      canceled = true;
    },
    allowPropagation() {
      propagationAllowed = true;
    },
  };
}

// ─── AccordionRootElement ────────────────────────────────────────────────────────

/**
 * Groups all parts of the accordion.
 * Renders an `<accordion-root>` custom element.
 *
 * Documentation: [Base UI Accordion](https://base-ui.com/react/components/accordion)
 */
export class AccordionRootElement extends ReactiveElement {
  static properties = {
    disabled: { type: Boolean },
    orientation: { type: String, reflect: true },
    render: { attribute: false },
  };

  declare disabled: boolean;
  declare orientation: Orientation;
  declare render: AccordionRootRenderProp | undefined;

  /** Default value (uncontrolled). */
  defaultValue: unknown[] = [];

  /** Allow multiple items open at once. */
  multiple = false;

  /** Loop keyboard focus from last to first trigger. */
  loopFocus = true;

  /** Whether panels should use hidden="until-found". */
  hiddenUntilFound = false;

  /** Whether panels stay mounted when closed. */
  keepMounted = false;

  /** Callback when value changes. */
  onValueChange:
    | ((value: unknown[], eventDetails: AccordionRootChangeEventDetails) => void)
    | undefined;

  // Controlled/uncontrolled value
  private _value: unknown[] | undefined;
  private _valueIsControlled = false;
  private _internalValue: unknown[] = [];
  private _initialized = false;
  private _lastPublishedStateKey: string | null = null;
  private _renderedElement: HTMLElement | null = null;

  get value(): unknown[] | undefined {
    return this._value;
  }
  set value(val: unknown[] | undefined) {
    if (val !== undefined) {
      this._valueIsControlled = true;
      this._value = val;
    } else {
      this._valueIsControlled = false;
      this._value = undefined;
    }
    this._syncAttributes();
    this._publishStateChange();
  }

  constructor() {
    super();
    this.disabled = false;
    this.orientation = 'vertical';
  }

  override createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();

    if (!this._initialized) {
      this._initialized = true;
      this._internalValue = [...this.defaultValue];
    }

    this.setAttribute(ACCORDION_ROOT_ATTRIBUTE, '');
    this.setAttribute('role', 'region');
    this._syncAttributes();
    this._syncRenderedElement();

    queueMicrotask(() => this._publishStateChange());
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this._lastPublishedStateKey = null;
    this._resetRenderedElement();
  }

  protected override updated() {
    this._syncAttributes();
    this._syncRenderedElement();
    this._publishStateChange();
  }

  getValue(): unknown[] {
    return this._valueIsControlled ? (this._value ?? []) : this._internalValue;
  }

  isItemOpen(itemValue: unknown): boolean {
    return this.getValue().some((v) => Object.is(v, itemValue));
  }

  handleValueChange(
    itemValue: unknown,
    nextOpen: boolean,
    event: Event,
    reason: AccordionRootChangeEventReason = 'none',
    trigger: Element | undefined = undefined,
  ): boolean {
    const currentValue = this.getValue();
    let nextValue: unknown[];

    if (!this.multiple) {
      nextValue = Object.is(currentValue[0], itemValue) ? [] : [itemValue];
    } else if (nextOpen) {
      nextValue = [...currentValue, itemValue];
    } else {
      nextValue = currentValue.filter((v) => !Object.is(v, itemValue));
    }

    const details = createRootChangeEventDetails(reason, event, trigger);
    this.onValueChange?.(nextValue, details);

    if (details.isCanceled) return false;
    if (reason === 'trigger-press' && !details.isPropagationAllowed) {
      event.stopPropagation();
    }

    if (!this._valueIsControlled) {
      this._internalValue = nextValue;
    }

    this._syncAttributes();
    this._publishStateChange();
    return true;
  }

  private _syncAttributes() {
    this.toggleAttribute('data-disabled', this.disabled);
    this.setAttribute('data-orientation', this.orientation);
  }

  private _syncRenderedElement(): HTMLElement {
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
      copyHostAttributes(this, this._renderedElement, ACCORDION_ROOT_OWNER_ATTRIBUTES);
      this.style.setProperty('display', 'contents');
      return this._renderedElement;
    }

    const currentContentNodes =
      this._renderedElement && this._renderedElement !== this
        ? Array.from(this._renderedElement.childNodes)
        : Array.from(this.childNodes).filter((node) => node !== this._renderedElement);
    const template =
      typeof this.render === 'function' ? this.render({}, this.getState()) : this.render;
    const nextRoot = materializeTemplateRoot('accordion-root', template);

    copyHostAttributes(this, nextRoot, ACCORDION_ROOT_OWNER_ATTRIBUTES);
    nextRoot.replaceChildren(...currentContentNodes);
    this.replaceChildren(nextRoot);
    this.style.setProperty('display', 'contents');
    this._renderedElement = nextRoot;
    return nextRoot;
  }

  private _resetRenderedElement() {
    if (this._renderedElement == null || this._renderedElement === this) {
      this._renderedElement = this;
      return;
    }

    const contentNodes = Array.from(this._renderedElement.childNodes);
    this.replaceChildren(...contentNodes);
    this._renderedElement = null;
  }

  getState(): AccordionRootState {
    return {
      value: this.getValue(),
      disabled: this.disabled,
      orientation: this.orientation,
    };
  }

  private _publishStateChange() {
    const nextKey = [
      JSON.stringify(this.getValue()),
      this.disabled ? 'disabled' : 'enabled',
      this.orientation,
    ].join('|');

    if (nextKey === this._lastPublishedStateKey) return;
    this._lastPublishedStateKey = nextKey;
    this.dispatchEvent(new CustomEvent(ACCORDION_ROOT_STATE_CHANGE_EVENT));
  }
}

if (!customElements.get('accordion-root')) {
  customElements.define('accordion-root', AccordionRootElement);
}

// ─── AccordionItemElement ────────────────────────────────────────────────────────

/**
 * Groups an accordion header with the corresponding panel.
 * Renders an `<accordion-item>` custom element.
 *
 * Documentation: [Base UI Accordion](https://base-ui.com/react/components/accordion)
 */
export class AccordionItemElement extends BaseHTMLElement {
  static override get observedAttributes() {
    return ['value', 'disabled'];
  }

  /** The value that identifies this item. */
  declare itemValue: unknown;

  /** Alias of `itemValue` to match the React/public API surface. */
  get value(): unknown {
    return this.itemValue;
  }

  set value(nextValue: unknown) {
    this.itemValue = nextValue;
    this._syncAttributes();
  }

  /** Whether this item is disabled. */
  disabled = false;

  /** Callback when this item's open state changes. */
  onOpenChange:
    | ((open: boolean, eventDetails: AccordionItemChangeEventDetails) => void)
    | undefined;

  render: AccordionItemRenderProp | undefined;

  private _root: AccordionRootElement | null = null;
  private _triggerId: string | undefined;
  private _panelId: string | undefined;
  private _handler = () => this._syncAttributes();
  private _lastPublishedStateKey: string | null = null;
  private _renderedElement: HTMLElement | null = null;

  override attributeChangedCallback(
    name: string,
    _oldValue: string | null,
    newValue: string | null,
  ) {
    if (name === 'value') {
      this.itemValue = newValue ?? undefined;
      this._syncAttributes();
    } else if (name === 'disabled') {
      this.disabled = newValue !== null;
      this._syncAttributes();
    }
  }

  connectedCallback() {
    this._root = this.closest('accordion-root') as AccordionRootElement | null;
    if (!this._root) {
      console.error('Base UI: Accordion parts must be placed within <accordion-root>.');
      return;
    }

    this.setAttribute(ACCORDION_ITEM_ATTRIBUTE, '');
    this._root.addEventListener(ACCORDION_ROOT_STATE_CHANGE_EVENT, this._handler);
    this._syncRenderedElement();

    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(ACCORDION_ROOT_STATE_CHANGE_EVENT, this._handler);
    this._root = null;
    this._lastPublishedStateKey = null;
    this._resetRenderedElement();
  }

  getRoot(): AccordionRootElement | null {
    return this._root;
  }

  getOpen(): boolean {
    if (!this._root) return false;
    return this._root.isItemOpen(this.itemValue);
  }

  getState(): AccordionItemState {
    const root = this._root;
    const disabled = this.disabled || (root?.disabled ?? false);
    return {
      value: root?.getValue() ?? [],
      disabled,
      orientation: root?.orientation ?? 'vertical',
      index: this._getIndex(),
      open: this.getOpen(),
    };
  }

  getTriggerId(): string | undefined {
    return this._triggerId;
  }

  setTriggerId(id: string | undefined) {
    if (this._triggerId === id) return;
    this._triggerId = id;
    this._publishItemStateChange();
  }

  getPanelId(): string | undefined {
    return this._panelId;
  }

  setPanelId(id: string | undefined) {
    if (this._panelId === id) return;
    this._panelId = id;
    this._publishItemStateChange();
  }

  toggle(nextOpen: boolean, event: Event, reason: AccordionItemChangeEventReason) {
    if (!this._root) return;

    const details = createItemChangeEventDetails(
      reason,
      event,
      this.getTriggerElement() ?? undefined,
    );
    this.onOpenChange?.(nextOpen, details);

    if (details.isCanceled) return;
    if (reason === 'trigger-press' && !details.isPropagationAllowed) {
      event.stopPropagation();
    }

    this._root.handleValueChange(this.itemValue, nextOpen, event, reason, details.trigger);
  }

  getTriggerElement(): HTMLElement | null {
    if (this._triggerId) {
      const byId = this.querySelector<HTMLElement>(`#${CSS.escape(this._triggerId)}`);
      if (byId) {
        return byId;
      }
    }

    const trigger = this.querySelector<AccordionTriggerElement>('accordion-trigger');
    return trigger?.getFocusTarget() ?? trigger ?? null;
  }

  private _getIndex(): number {
    if (!this._root) return 0;
    const items = Array.from(
      this._root.querySelectorAll<HTMLElement>(`[${ACCORDION_ITEM_ATTRIBUTE}]`),
    );
    return items.indexOf(this);
  }

  private _syncAttributes() {
    if (!this._root) return;
    const state = this.getState();

    this.toggleAttribute('data-open', state.open);
    this.toggleAttribute('data-closed', !state.open);
    this.toggleAttribute('data-disabled', state.disabled);
    if (Number.isInteger(state.index)) {
      this.setAttribute('data-index', String(state.index));
    }

    this._syncRenderedElement();
    this._publishItemStateChange();
  }

  private _syncRenderedElement(): HTMLElement {
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
      copyHostAttributes(this, this._renderedElement, ACCORDION_ITEM_OWNER_ATTRIBUTES);
      this.style.setProperty('display', 'contents');
      return this._renderedElement;
    }

    const currentContentNodes =
      this._renderedElement && this._renderedElement !== this
        ? Array.from(this._renderedElement.childNodes)
        : Array.from(this.childNodes).filter((node) => node !== this._renderedElement);
    const template =
      typeof this.render === 'function' ? this.render({}, this.getState()) : this.render;
    const nextRoot = materializeTemplateRoot('accordion-item', template);

    copyHostAttributes(this, nextRoot, ACCORDION_ITEM_OWNER_ATTRIBUTES);
    nextRoot.replaceChildren(...currentContentNodes);
    this.replaceChildren(nextRoot);
    this.style.setProperty('display', 'contents');
    this._renderedElement = nextRoot;
    return nextRoot;
  }

  private _resetRenderedElement() {
    if (this._renderedElement == null || this._renderedElement === this) {
      this._renderedElement = this;
      return;
    }

    const contentNodes = Array.from(this._renderedElement.childNodes);
    this.replaceChildren(...contentNodes);
    this._renderedElement = null;
  }

  private _publishItemStateChange() {
    const nextKey = [
      this.getOpen() ? 'open' : 'closed',
      this.disabled ? 'disabled' : 'enabled',
      this._triggerId ?? '',
      this._panelId ?? '',
      this._getIndex(),
    ].join('|');

    if (nextKey === this._lastPublishedStateKey) return;
    this._lastPublishedStateKey = nextKey;
    this.dispatchEvent(new CustomEvent(ACCORDION_ITEM_STATE_CHANGE_EVENT));
  }
}

if (!customElements.get('accordion-item')) {
  customElements.define('accordion-item', AccordionItemElement);
}

// ─── AccordionHeaderElement ──────────────────────────────────────────────────────

/**
 * A heading that labels the corresponding panel.
 * Renders an `<accordion-header>` custom element.
 *
 * Documentation: [Base UI Accordion](https://base-ui.com/react/components/accordion)
 */
export class AccordionHeaderElement extends BaseHTMLElement {
  private _item: AccordionItemElement | null = null;
  private _handler = () => this._syncAttributes();
  render: AccordionHeaderRenderProp | undefined;
  private _renderedElement: HTMLElement | null = null;

  connectedCallback() {
    this._item = this.closest('accordion-item') as AccordionItemElement | null;
    if (!this._item) {
      console.error('Base UI: Accordion parts must be placed within <accordion-item>.');
      return;
    }

    this.setAttribute('role', 'heading');
    this.setAttribute('aria-level', '3');

    this._item.addEventListener(ACCORDION_ITEM_STATE_CHANGE_EVENT, this._handler);
    this._syncRenderedElement();
    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this._item?.removeEventListener(ACCORDION_ITEM_STATE_CHANGE_EVENT, this._handler);
    this._item = null;
    this._resetRenderedElement();
  }

  private _syncAttributes() {
    if (!this._item) return;
    const state = this._item.getState();

    this.toggleAttribute('data-open', state.open);
    this.toggleAttribute('data-closed', !state.open);
    this.toggleAttribute('data-disabled', state.disabled);
    if (Number.isInteger(state.index)) {
      this.setAttribute('data-index', String(state.index));
    }
    this._syncRenderedElement();
  }

  private _syncRenderedElement(): HTMLElement {
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
      copyHostAttributes(this, this._renderedElement, ACCORDION_HEADER_OWNER_ATTRIBUTES);
      this.style.setProperty('display', 'contents');
      return this._renderedElement;
    }

    const currentContentNodes =
      this._renderedElement && this._renderedElement !== this
        ? Array.from(this._renderedElement.childNodes)
        : Array.from(this.childNodes).filter((node) => node !== this._renderedElement);
    const template =
      typeof this.render === 'function'
        ? this.render(
            {},
            this._item?.getState() ?? {
              value: [],
              disabled: false,
              orientation: 'vertical',
              index: 0,
              open: false,
            },
          )
        : this.render;
    const nextRoot = materializeTemplateRoot('accordion-header', template);

    copyHostAttributes(this, nextRoot, ACCORDION_HEADER_OWNER_ATTRIBUTES);
    nextRoot.replaceChildren(...currentContentNodes);
    this.replaceChildren(nextRoot);
    this.style.setProperty('display', 'contents');
    this._renderedElement = nextRoot;
    return nextRoot;
  }

  private _resetRenderedElement() {
    if (this._renderedElement == null || this._renderedElement === this) {
      this._renderedElement = this;
      return;
    }

    const contentNodes = Array.from(this._renderedElement.childNodes);
    this.replaceChildren(...contentNodes);
    this._renderedElement = null;
  }
}

if (!customElements.get('accordion-header')) {
  customElements.define('accordion-header', AccordionHeaderElement);
}

// ─── AccordionTriggerElement ─────────────────────────────────────────────────────

/**
 * A button that opens and closes the corresponding panel.
 * Renders an `<accordion-trigger>` custom element.
 *
 * Documentation: [Base UI Accordion](https://base-ui.com/react/components/accordion)
 */
export class AccordionTriggerElement extends BaseHTMLElement {
  static properties = {
    nativeButton: { type: Boolean, attribute: 'native-button' },
    render: { attribute: false },
  };

  nativeButton = true;
  render: AccordionTriggerRenderProp | undefined;
  private _item: AccordionItemElement | null = null;
  private _handler = () => this._syncAttributes();
  private _renderedElement: HTMLElement | null = null;

  connectedCallback() {
    this._item = this.closest('accordion-item') as AccordionItemElement | null;
    if (!this._item) {
      console.error('Base UI: Accordion parts must be placed within <accordion-item>.');
      return;
    }

    this.setAttribute(ACCORDION_TRIGGER_ATTRIBUTE, '');
    this.setAttribute('role', 'button');
    this.setAttribute('tabindex', '0');

    ensureId(this, 'base-ui-accordion-trigger');
    this._item.setTriggerId(this.id);

    this._item.addEventListener(ACCORDION_ITEM_STATE_CHANGE_EVENT, this._handler);
    this._syncRenderedElement();

    this.addEventListener('click', this._handleClick);
    this.addEventListener('keydown', this._handleKeyDown);
    this.addEventListener('keyup', this._handleKeyUp);

    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    if (this._item) {
      this._item.setTriggerId(undefined);
      this._item.removeEventListener(ACCORDION_ITEM_STATE_CHANGE_EVENT, this._handler);
    }
    this.removeEventListener('click', this._handleClick);
    this.removeEventListener('keydown', this._handleKeyDown);
    this.removeEventListener('keyup', this._handleKeyUp);
    this._item = null;
    this._resetRenderedElement();
  }

  private _handleClick = (event: Event) => {
    if (!this._item) return;
    const state = this._item.getState();
    if (state.disabled) {
      event.preventDefault();
      return;
    }
    this._item.toggle(!state.open, event, 'trigger-press');
  };

  private _handleKeyDown = (event: KeyboardEvent) => {
    if (!this._item) return;
    if (event.target !== this && event.target !== this.getFocusTarget()) return;
    const state = this._item.getState();
    if (state.disabled) return;

    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      this._item.toggle(!state.open, event, 'trigger-press');
      return;
    }

    if (!SUPPORTED_TRIGGER_KEYS.has(event.key)) return;

    event.preventDefault();
    this._moveFocus(event.key, state.orientation);
  };

  private _handleKeyUp = (event: KeyboardEvent) => {
    if (event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
    }
  };

  private _moveFocus(key: string, orientation: Orientation) {
    const root = this._item?.getRoot();
    if (!root) return;

    const activeTriggers = Array.from(
      root.querySelectorAll<HTMLElement>(`[${ACCORDION_ITEM_ATTRIBUTE}]`),
    )
      .filter((item) => !item.hasAttribute('data-disabled'))
      .map((item) =>
        item.querySelector<AccordionTriggerElement>(`[${ACCORDION_TRIGGER_ATTRIBUTE}]`),
      )
      .map((trigger) => trigger?.getFocusTarget() ?? null)
      .filter((trigger): trigger is HTMLElement => trigger != null);

    if (activeTriggers.length === 0) return;

    const currentIndex = activeTriggers.indexOf(this.getFocusTarget());
    const lastIndex = activeTriggers.length - 1;
    const loopFocus = root.loopFocus;
    let nextIndex = -1;

    const toNext = () => {
      nextIndex = loopFocus
        ? currentIndex + 1 > lastIndex
          ? 0
          : currentIndex + 1
        : Math.min(currentIndex + 1, lastIndex);
    };

    const toPrev = () => {
      nextIndex = loopFocus
        ? currentIndex <= 0
          ? lastIndex
          : currentIndex - 1
        : Math.max(currentIndex - 1, 0);
    };

    switch (key) {
      case 'ArrowDown':
        if (orientation === 'vertical') toNext();
        break;
      case 'ArrowUp':
        if (orientation === 'vertical') toPrev();
        break;
      case 'ArrowRight':
        if (orientation === 'horizontal') {
          if (getDirection(root) === 'rtl') toPrev();
          else toNext();
        }
        break;
      case 'ArrowLeft':
        if (orientation === 'horizontal') {
          if (getDirection(root) === 'rtl') toNext();
          else toPrev();
        }
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = lastIndex;
        break;
    }

    if (nextIndex > -1) {
      activeTriggers[nextIndex]?.focus();
    }
  }

  private _syncAttributes() {
    if (!this._item) return;
    const state = this._item.getState();
    const panelId = this._item.getPanelId();

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

    this.toggleAttribute('data-starting-style', false);
    this.toggleAttribute('data-ending-style', false);
    this._syncRenderedElement();
  }

  getFocusTarget(): HTMLElement {
    if (
      this._renderedElement &&
      this._renderedElement !== this &&
      this.contains(this._renderedElement)
    ) {
      return this._renderedElement;
    }

    return this;
  }

  private _syncRenderedElement(): HTMLElement {
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
      copyHostAttributes(this, this._renderedElement, ACCORDION_TRIGGER_OWNER_ATTRIBUTES);
      this._applyNativeButtonSemantics(this._renderedElement);
      this.style.setProperty('display', 'contents');
      return this._renderedElement;
    }

    const currentContentNodes =
      this._renderedElement && this._renderedElement !== this
        ? Array.from(this._renderedElement.childNodes)
        : Array.from(this.childNodes).filter((node) => node !== this._renderedElement);
    const template =
      typeof this.render === 'function'
        ? this.render(
            {},
            this._item?.getState() ?? {
              value: [],
              disabled: false,
              orientation: 'vertical',
              index: 0,
              open: false,
            },
          )
        : this.render;
    const nextRoot = materializeTemplateRoot('accordion-trigger', template);

    copyHostAttributes(this, nextRoot, ACCORDION_TRIGGER_OWNER_ATTRIBUTES);
    nextRoot.replaceChildren(...currentContentNodes);
    this.replaceChildren(nextRoot);
    this._applyNativeButtonSemantics(nextRoot);
    this.style.setProperty('display', 'contents');
    this._renderedElement = nextRoot;
    return nextRoot;
  }

  private _applyNativeButtonSemantics(target: HTMLElement) {
    if (this.nativeButton && target instanceof HTMLButtonElement) {
      target.type = 'button';
      target.disabled = this.hasAttribute('aria-disabled');
      target.removeAttribute('role');
      return;
    }

    if (!target.hasAttribute('tabindex')) {
      target.setAttribute('tabindex', '0');
    }
    target.setAttribute('role', 'button');
  }

  private _resetRenderedElement() {
    if (this._renderedElement == null || this._renderedElement === this) {
      this._renderedElement = this;
      return;
    }

    const contentNodes = Array.from(this._renderedElement.childNodes);
    this.replaceChildren(...contentNodes);
    this._renderedElement = null;
  }
}

if (!customElements.get('accordion-trigger')) {
  customElements.define('accordion-trigger', AccordionTriggerElement);
}

// ─── AccordionPanelElement ───────────────────────────────────────────────────────

/**
 * A collapsible panel with the accordion item contents.
 * Renders an `<accordion-panel>` custom element.
 *
 * Documentation: [Base UI Accordion](https://base-ui.com/react/components/accordion)
 */
export class AccordionPanelElement extends BaseHTMLElement {
  static properties = {
    keepMounted: { type: Boolean, attribute: 'keep-mounted' },
    hiddenUntilFound: { type: Boolean, attribute: 'hidden-until-found' },
    render: { attribute: false },
  };

  /** Keep the panel in the DOM when closed. */
  keepMounted = false;

  /** Use hidden="until-found" for browser find-in-page support. */
  hiddenUntilFound = false;

  render: AccordionPanelRenderProp | undefined;

  private _item: AccordionItemElement | null = null;
  private _handler = () => this._handleStateChange();
  private _mounted = false;
  private _transitionStatus: TransitionStatus = undefined;
  private _lastOpen: boolean | null = null;
  private _frameId: number | null = null;
  private _exitRunId = 0;
  private _renderedElement: HTMLElement | null = null;

  connectedCallback() {
    // Custom elements default to display:inline where height/overflow are ignored.
    // Ensure block display so CSS height transitions work (matches React's <div>).
    if (!this.style.display) {
      this.style.display = 'block';
    }

    this._item = this.closest('accordion-item') as AccordionItemElement | null;
    if (!this._item) {
      console.error('Base UI: Accordion parts must be placed within <accordion-item>.');
      return;
    }

    this.setAttribute(ACCORDION_PANEL_ATTRIBUTE, '');
    this.setAttribute('role', 'region');

    ensureId(this, 'base-ui-accordion-panel');
    this._item.setPanelId(this.id);

    // Wire up aria-labelledby with the trigger's id
    const triggerId = this._item.getTriggerId();
    if (triggerId) {
      this.setAttribute('aria-labelledby', triggerId);
    }

    this._item.addEventListener(ACCORDION_ITEM_STATE_CHANGE_EVENT, this._handler);
    this._syncRenderedElement();

    // Immediately hide if item is closed to prevent flash
    if (!this._item.getOpen()) {
      this.setAttribute('hidden', '');
    }

    queueMicrotask(() => this._handleStateChange());
  }

  disconnectedCallback() {
    this._clearFrame();
    if (this._item) {
      this._item.setPanelId(undefined);
      this._item.removeEventListener(ACCORDION_ITEM_STATE_CHANGE_EVENT, this._handler);
    }
    this._item = null;
    this._mounted = false;
    this._lastOpen = null;
    this._transitionStatus = undefined;
    this._resetRenderedElement();
  }

  private _handleStateChange() {
    if (!this._item) return;

    const open = this._item.getOpen();
    const wasOpen = this._lastOpen;
    const root = this._item.getRoot();
    const shouldStayMounted =
      this.keepMounted || this.hiddenUntilFound || root?.keepMounted || root?.hiddenUntilFound;

    // Update aria-labelledby when trigger id may have changed
    const triggerId = this._item.getTriggerId();
    if (triggerId) {
      this.setAttribute('aria-labelledby', triggerId);
    }

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
      this._scheduleExitCleanup(Boolean(shouldStayMounted));
    } else if (!this._mounted && shouldStayMounted) {
      this._mounted = true;
    }

    this._lastOpen = open;
    this._syncVisibility();
  }

  private _syncVisibility() {
    if (!this._item) return;

    const open = this._item.getOpen();
    const state = this._item.getState();
    const root = this._item.getRoot();
    const shouldStayMounted =
      this.keepMounted || this.hiddenUntilFound || root?.keepMounted || root?.hiddenUntilFound;
    const useHiddenUntilFound = this.hiddenUntilFound || root?.hiddenUntilFound;
    const shouldRender = this._mounted || this._transitionStatus === 'ending' || shouldStayMounted;

    if (!shouldRender) {
      this.setAttribute('hidden', '');
      return;
    }

    const hidden = !open && this._transitionStatus !== 'ending';

    if (useHiddenUntilFound && hidden) {
      this.setAttribute('hidden', 'until-found');
    } else if (hidden) {
      this.setAttribute('hidden', '');
    } else {
      this.removeAttribute('hidden');
    }

    this.toggleAttribute('data-open', open);
    this.toggleAttribute('data-closed', !open);
    this.toggleAttribute('data-disabled', state.disabled);
    this.toggleAttribute('data-starting-style', this._transitionStatus === 'starting');
    this.toggleAttribute('data-ending-style', this._transitionStatus === 'ending');
    if (Number.isInteger(state.index)) {
      this.setAttribute('data-index', String(state.index));
    }

    // CSS custom properties for height/width
    const height = this.scrollHeight;
    const width = this.scrollWidth;
    this.style.setProperty(ACCORDION_PANEL_HEIGHT_VAR, height ? `${height}px` : 'auto');
    this.style.setProperty(ACCORDION_PANEL_WIDTH_VAR, width ? `${width}px` : 'auto');
    this._syncRenderedElement();
  }

  private _syncRenderedElement(): HTMLElement {
    if (this.render == null) {
      this._resetRenderedElement();
      if (!this.style.display) {
        this.style.display = 'block';
      }
      this._renderedElement = this;
      return this;
    }

    if (
      this._renderedElement &&
      this._renderedElement !== this &&
      this.contains(this._renderedElement)
    ) {
      copyHostAttributes(this, this._renderedElement, ACCORDION_PANEL_OWNER_ATTRIBUTES);
      this.style.setProperty('display', 'contents');
      return this._renderedElement;
    }

    const currentContentNodes =
      this._renderedElement && this._renderedElement !== this
        ? Array.from(this._renderedElement.childNodes)
        : Array.from(this.childNodes).filter((node) => node !== this._renderedElement);
    const template =
      typeof this.render === 'function'
        ? this.render(
            {},
            this._item?.getState() != null
              ? {
                  ...this._item.getState(),
                  transitionStatus: this._transitionStatus,
                }
              : {
                  value: [],
                  disabled: false,
                  orientation: 'vertical',
                  index: 0,
                  open: false,
                  transitionStatus: this._transitionStatus,
                },
          )
        : this.render;
    const nextRoot = materializeTemplateRoot('accordion-panel', template);

    copyHostAttributes(this, nextRoot, ACCORDION_PANEL_OWNER_ATTRIBUTES);
    nextRoot.replaceChildren(...currentContentNodes);
    this.replaceChildren(nextRoot);
    this.style.setProperty('display', 'contents');
    this._renderedElement = nextRoot;
    return nextRoot;
  }

  private _resetRenderedElement() {
    if (this._renderedElement == null || this._renderedElement === this) {
      this._renderedElement = this;
      return;
    }

    const contentNodes = Array.from(this._renderedElement.childNodes);
    this.replaceChildren(...contentNodes);
    this._renderedElement = null;
  }

  private _scheduleStartingCleanup() {
    this._clearFrame();
    // Double rAF ensures the browser paints the starting state (height: 0)
    // before we remove data-starting-style and trigger the CSS transition.
    this._frameId = requestAnimationFrame(() => {
      this._frameId = requestAnimationFrame(() => {
        this._frameId = null;
        if (!this._item || this._transitionStatus !== 'starting') return;
        if (!this._item.getOpen()) return;
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
      (globalThis as typeof globalThis & { BASE_UI_ANIMATIONS_DISABLED?: boolean | undefined })
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
        if (active.length > 0 && active.some((a) => a.pending || a.playState !== 'finished')) {
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

if (!customElements.get('accordion-panel')) {
  customElements.define('accordion-panel', AccordionPanelElement);
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

function AccordionRootHelper<Value = unknown>(props: AccordionRootProps<Value>) {
  return html`<accordion-root
    .defaultValue=${props.defaultValue ?? []}
    .value=${props.value}
    .onValueChange=${props.onValueChange}
    .hiddenUntilFound=${props.hiddenUntilFound ?? false}
    .keepMounted=${props.keepMounted ?? false}
    .loopFocus=${props.loopFocus ?? true}
    .multiple=${props.multiple ?? false}
    .disabled=${props.disabled ?? false}
    .orientation=${props.orientation ?? 'vertical'}
    .render=${props.render}
  ></accordion-root>`;
}

function AccordionItemHelper<Value = unknown>(props: AccordionItemProps<Value>) {
  return html`<accordion-item
    .itemValue=${props.value}
    .disabled=${props.disabled ?? false}
    .onOpenChange=${props.onOpenChange}
    .render=${props.render}
  ></accordion-item>`;
}

function AccordionHeaderHelper(props: AccordionHeaderProps) {
  return html`<accordion-header .render=${props.render}></accordion-header>`;
}

function AccordionTriggerHelper(props: AccordionTriggerProps) {
  return html`<accordion-trigger
    .nativeButton=${props.nativeButton ?? true}
    .render=${props.render}
  ></accordion-trigger>`;
}

function AccordionPanelHelper(props: AccordionPanelProps) {
  return html`<accordion-panel
    .hiddenUntilFound=${props.hiddenUntilFound ?? false}
    .keepMounted=${props.keepMounted ?? false}
    .render=${props.render}
  ></accordion-panel>`;
}

// ─── Namespace exports ──────────────────────────────────────────────────────────

export namespace AccordionRoot {
  export type Props<Value = unknown> = AccordionRootProps<Value>;
  export type State = AccordionRootState;
  export type ChangeEventReason = AccordionRootChangeEventReason;
  export type ChangeEventDetails = AccordionRootChangeEventDetails;
}

export namespace AccordionItem {
  export type Props<Value = unknown> = AccordionItemProps<Value>;
  export type State = AccordionItemState;
  export type ChangeEventReason = AccordionItemChangeEventReason;
  export type ChangeEventDetails = AccordionItemChangeEventDetails;
}

export namespace AccordionHeader {
  export type Props = AccordionHeaderProps;
  export type State = AccordionHeaderState;
}

export namespace AccordionTrigger {
  export type Props = AccordionTriggerProps;
  export type State = AccordionTriggerState;
}

export namespace AccordionPanel {
  export type Props = AccordionPanelProps;
  export type State = AccordionPanelState;
}

export const Accordion = {
  Root: AccordionRootHelper,
  Item: AccordionItemHelper,
  Header: AccordionHeaderHelper,
  Trigger: AccordionTriggerHelper,
  Panel: AccordionPanelHelper,
} as const;

// ─── Global type declarations ───────────────────────────────────────────────────

declare global {
  interface HTMLElementTagNameMap {
    'accordion-root': AccordionRootElement;
    'accordion-item': AccordionItemElement;
    'accordion-header': AccordionHeaderElement;
    'accordion-trigger': AccordionTriggerElement;
    'accordion-panel': AccordionPanelElement;
  }
}
