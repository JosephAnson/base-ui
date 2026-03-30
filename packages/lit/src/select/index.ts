import { BaseHTMLElement, ensureId } from '../utils/index.ts';

// ─── Constants ──────────────────────────────────────────────────────────────────

const SELECT_STATE_CHANGE_EVENT = 'base-ui-select-state-change';

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface SelectRootState {
  open: boolean;
  value: unknown;
  disabled: boolean;
  required: boolean;
  multiple: boolean;
}

export interface SelectTriggerState {
  open: boolean;
  disabled: boolean;
}

export interface SelectValueState {
  value: unknown;
}

export interface SelectPopupState {
  open: boolean;
}

export interface SelectItemState {
  selected: boolean;
  highlighted: boolean;
  disabled: boolean;
}

export interface SelectItemIndicatorState {
  selected: boolean;
}

export interface SelectItemTextState {
  selected: boolean;
}

export interface SelectGroupState {}

export interface SelectGroupLabelState {}

export interface SelectIconState {
  open: boolean;
}

export type SelectChangeEventReason = 'click' | 'keyboard';

export interface SelectChangeEventDetails {
  reason: SelectChangeEventReason;
  event: Event;
}

// ─── SelectRootElement ──────────────────────────────────────────────────────────

/**
 * Groups all parts of the select.
 * Renders a `<select-root>` custom element (display:contents).
 *
 * Documentation: [Base UI Select](https://base-ui.com/react/components/select)
 */
export class SelectRootElement extends BaseHTMLElement {
  /** Default value (uncontrolled). */
  defaultValue: unknown = null;

  /** Whether disabled. */
  disabled = false;

  /** Whether required. */
  required = false;

  /** Whether multiple selection is allowed. */
  multiple = false;

  /** Callback when value changes. */
  onValueChange:
    | ((value: unknown, details: SelectChangeEventDetails) => void)
    | undefined;

  /** Callback when open state changes. */
  onOpenChange: ((open: boolean) => void) | undefined;

  // Internal state
  private _value: unknown | undefined;
  private _valueIsControlled = false;
  private _internalValue: unknown = null;
  private _open = false;
  private _openIsControlled = false;
  private _internalOpen = false;
  private _initialized = false;
  private _activeIndex = -1;
  private _lastPublishedStateKey: string | null = null;
  private _triggerId: string | undefined;
  private _listId: string | undefined;

  get value(): unknown | undefined {
    return this._value;
  }
  set value(val: unknown | undefined) {
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

  get open(): boolean {
    return this._openIsControlled ? this._open as unknown as boolean : this._internalOpen;
  }
  set open(val: boolean) {
    this._openIsControlled = true;
    this._open = val;
    this._syncAttributes();
    this._publishStateChange();
  }

  connectedCallback() {
    if (!this._initialized) {
      this._initialized = true;
      this._internalValue = this.defaultValue;
    }
    this.style.display = 'contents';
    this._syncAttributes();
    queueMicrotask(() => this._publishStateChange());
  }

  disconnectedCallback() {
    this._lastPublishedStateKey = null;
  }

  getValue(): unknown {
    return this._valueIsControlled ? this._value : this._internalValue;
  }

  isOpen(): boolean {
    return this._openIsControlled ? (this._open as boolean) : this._internalOpen;
  }

  getActiveIndex(): number {
    return this._activeIndex;
  }

  setActiveIndex(index: number) {
    this._activeIndex = index;
    this._publishStateChange();
  }

  setTriggerId(id: string | undefined) {
    this._triggerId = id;
  }

  getTriggerId(): string | undefined {
    return this._triggerId;
  }

  setListId(id: string | undefined) {
    this._listId = id;
  }

  getListId(): string | undefined {
    return this._listId;
  }

  setOpen(open: boolean) {
    if (open === this.isOpen()) return;

    this.onOpenChange?.(open);

    if (!this._openIsControlled) {
      this._internalOpen = open;
    }

    if (!open) {
      this._activeIndex = -1;
    }

    this._syncAttributes();
    this._publishStateChange();
  }

  selectValue(newValue: unknown, event: Event, reason: SelectChangeEventReason) {
    const details: SelectChangeEventDetails = { reason, event };

    if (this.multiple) {
      const currentArr = Array.isArray(this.getValue()) ? [...(this.getValue() as unknown[])] : [];
      const idx = currentArr.indexOf(newValue);
      if (idx >= 0) {
        currentArr.splice(idx, 1);
      } else {
        currentArr.push(newValue);
      }
      this.onValueChange?.(currentArr, details);
      if (!this._valueIsControlled) {
        this._internalValue = currentArr;
      }
    } else {
      this.onValueChange?.(newValue, details);
      if (!this._valueIsControlled) {
        this._internalValue = newValue;
      }
      // Close popup for single select
      this.setOpen(false);
    }

    this._syncAttributes();
    this._publishStateChange();
  }

  isValueSelected(itemValue: unknown): boolean {
    const current = this.getValue();
    if (this.multiple && Array.isArray(current)) {
      return current.includes(itemValue);
    }
    return current === itemValue;
  }

  getItems(): SelectItemElement[] {
    return Array.from(this.querySelectorAll('select-item'));
  }

  getEnabledItems(): SelectItemElement[] {
    return this.getItems().filter((item) => !item.disabled);
  }

  private _syncAttributes() {
    this.toggleAttribute('data-disabled', this.disabled);
    this.toggleAttribute('data-required', this.required);
    this.toggleAttribute('data-open', this.isOpen());
  }

  private _publishStateChange() {
    const nextKey = [
      String(this.getValue()),
      this.isOpen() ? 'o' : '',
      this.disabled ? 'd' : '',
      this.required ? 'r' : '',
      this.multiple ? 'm' : '',
      String(this._activeIndex),
    ].join('|');

    if (nextKey === this._lastPublishedStateKey) return;
    this._lastPublishedStateKey = nextKey;
    this.dispatchEvent(new CustomEvent(SELECT_STATE_CHANGE_EVENT));
  }
}

if (!customElements.get('select-root')) {
  customElements.define('select-root', SelectRootElement);
}

// ─── SelectTriggerElement ───────────────────────────────────────────────────────

/**
 * A button that opens/closes the select popup.
 * Renders a `<select-trigger>` custom element.
 *
 * Documentation: [Base UI Select](https://base-ui.com/react/components/select)
 */
export class SelectTriggerElement extends BaseHTMLElement {
  private _root: SelectRootElement | null = null;
  private _handler = () => this._syncAttributes();

  connectedCallback() {
    this._root = this.closest('select-root') as SelectRootElement | null;
    if (!this._root) {
      console.error('Base UI: Select parts must be placed within <select-root>.');
      return;
    }

    ensureId(this, 'base-ui-select-trigger');
    this._root.setTriggerId(this.id);

    this.setAttribute('role', 'combobox');
    this.setAttribute('aria-haspopup', 'listbox');
    this.setAttribute('tabindex', '0');

    this._root.addEventListener(SELECT_STATE_CHANGE_EVENT, this._handler);

    this.addEventListener('click', this._handleClick);
    this.addEventListener('keydown', this._handleKeyDown);

    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(SELECT_STATE_CHANGE_EVENT, this._handler);
    this.removeEventListener('click', this._handleClick);
    this.removeEventListener('keydown', this._handleKeyDown);
    this._root = null;
  }

  private _handleClick = () => {
    if (!this._root || this._root.disabled) return;
    this._root.setOpen(!this._root.isOpen());
  };

  private _handleKeyDown = (event: KeyboardEvent) => {
    if (!this._root || this._root.disabled) return;

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this._root.setOpen(!this._root.isOpen());
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!this._root.isOpen()) {
        this._root.setOpen(true);
      }
      // Move to first enabled item
      const items = this._root.getEnabledItems();
      if (items.length > 0) {
        this._root.setActiveIndex(0);
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!this._root.isOpen()) {
        this._root.setOpen(true);
      }
      const items = this._root.getEnabledItems();
      if (items.length > 0) {
        this._root.setActiveIndex(items.length - 1);
      }
    } else if (event.key === 'Escape') {
      if (this._root.isOpen()) {
        event.preventDefault();
        this._root.setOpen(false);
        this.focus();
      }
    }
  };

  private _syncAttributes() {
    if (!this._root) return;
    const open = this._root.isOpen();
    this.setAttribute('aria-expanded', String(open));
    this.toggleAttribute('data-open', open);
    this.toggleAttribute('data-disabled', this._root.disabled);

    const listId = this._root.getListId();
    if (listId && open) {
      this.setAttribute('aria-controls', listId);
    } else {
      this.removeAttribute('aria-controls');
    }
  }
}

if (!customElements.get('select-trigger')) {
  customElements.define('select-trigger', SelectTriggerElement);
}

// ─── SelectValueElement ─────────────────────────────────────────────────────────

/**
 * Displays the label of the currently selected item.
 * Renders a `<select-value>` custom element.
 *
 * Documentation: [Base UI Select](https://base-ui.com/react/components/select)
 */
export class SelectValueElement extends BaseHTMLElement {
  private _root: SelectRootElement | null = null;
  private _handler = () => this._syncAttributes();

  /** Placeholder text when no value is selected. */
  placeholder = '';

  /** Custom function to format the displayed value. */
  formatValue: ((value: unknown) => string) | undefined;

  connectedCallback() {
    this._root = this.closest('select-root') as SelectRootElement | null;
    if (!this._root) {
      console.error('Base UI: Select parts must be placed within <select-root>.');
      return;
    }

    this._root.addEventListener(SELECT_STATE_CHANGE_EVENT, this._handler);
    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(SELECT_STATE_CHANGE_EVENT, this._handler);
    this._root = null;
  }

  private _syncAttributes() {
    if (!this._root) return;

    const value = this._root.getValue();

    if (this.formatValue) {
      this.textContent = this.formatValue(value);
      return;
    }

    if (value == null || (Array.isArray(value) && value.length === 0)) {
      this.textContent = this.placeholder;
      this.toggleAttribute('data-placeholder', true);
      return;
    }

    this.removeAttribute('data-placeholder');

    // Find the item(s) with this value and use their text content
    if (this._root.multiple && Array.isArray(value)) {
      const labels: string[] = [];
      for (const v of value) {
        const item = this._root
          .getItems()
          .find((i) => i.value === v);
        labels.push(item?.getLabel() ?? String(v));
      }
      this.textContent = labels.join(', ');
    } else {
      const item = this._root
        .getItems()
        .find((i) => i.value === value);
      this.textContent = item?.getLabel() ?? String(value);
    }
  }
}

if (!customElements.get('select-value')) {
  customElements.define('select-value', SelectValueElement);
}

// ─── SelectIconElement ──────────────────────────────────────────────────────────

/**
 * A visual icon indicator inside the trigger.
 * Renders a `<select-icon>` custom element.
 *
 * Documentation: [Base UI Select](https://base-ui.com/react/components/select)
 */
export class SelectIconElement extends BaseHTMLElement {
  private _root: SelectRootElement | null = null;
  private _handler = () => this._syncAttributes();

  connectedCallback() {
    this._root = this.closest('select-root') as SelectRootElement | null;
    if (!this._root) {
      console.error('Base UI: Select parts must be placed within <select-root>.');
      return;
    }

    this.setAttribute('aria-hidden', 'true');

    this._root.addEventListener(SELECT_STATE_CHANGE_EVENT, this._handler);
    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(SELECT_STATE_CHANGE_EVENT, this._handler);
    this._root = null;
  }

  private _syncAttributes() {
    if (!this._root) return;
    this.toggleAttribute('data-open', this._root.isOpen());
  }
}

if (!customElements.get('select-icon')) {
  customElements.define('select-icon', SelectIconElement);
}

// ─── SelectPopupElement ─────────────────────────────────────────────────────────

/**
 * The popup container for the select options.
 * Renders a `<select-popup>` custom element.
 *
 * Documentation: [Base UI Select](https://base-ui.com/react/components/select)
 */
export class SelectPopupElement extends BaseHTMLElement {
  private _root: SelectRootElement | null = null;
  private _handler = () => this._syncAttributes();

  connectedCallback() {
    this._root = this.closest('select-root') as SelectRootElement | null;
    if (!this._root) {
      console.error('Base UI: Select parts must be placed within <select-root>.');
      return;
    }

    ensureId(this, 'base-ui-select-popup');
    this._root.setListId(this.id);

    this.setAttribute('role', 'listbox');
    this.setAttribute('tabindex', '-1');

    this._root.addEventListener(SELECT_STATE_CHANGE_EVENT, this._handler);

    this.addEventListener('keydown', this._handleKeyDown);

    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(SELECT_STATE_CHANGE_EVENT, this._handler);
    this.removeEventListener('keydown', this._handleKeyDown);
    if (this._root) {
      this._root.setListId(undefined);
    }
    this._root = null;
  }

  private _handleKeyDown = (event: KeyboardEvent) => {
    if (!this._root) return;

    const items = this._root.getEnabledItems();
    if (items.length === 0) return;

    const currentIndex = this._root.getActiveIndex();

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const next = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
      this._root.setActiveIndex(next);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const prev = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
      this._root.setActiveIndex(prev);
    } else if (event.key === 'Home') {
      event.preventDefault();
      this._root.setActiveIndex(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      this._root.setActiveIndex(items.length - 1);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (currentIndex >= 0 && currentIndex < items.length) {
        items[currentIndex].select(event);
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this._root.setOpen(false);
      // Return focus to trigger
      const trigger = this._root.querySelector('select-trigger') as HTMLElement | null;
      trigger?.focus();
    }
  };

  private _syncAttributes() {
    if (!this._root) return;
    const open = this._root.isOpen();

    if (open) {
      this.removeAttribute('hidden');
      this.toggleAttribute('data-open', true);
    } else {
      this.setAttribute('hidden', '');
      this.removeAttribute('data-open');
    }

    if (this._root.multiple) {
      this.setAttribute('aria-multiselectable', 'true');
    } else {
      this.removeAttribute('aria-multiselectable');
    }
  }
}

if (!customElements.get('select-popup')) {
  customElements.define('select-popup', SelectPopupElement);
}

// ─── SelectItemElement ──────────────────────────────────────────────────────────

/**
 * An individual option in the select.
 * Renders a `<select-item>` custom element.
 *
 * Documentation: [Base UI Select](https://base-ui.com/react/components/select)
 */
export class SelectItemElement extends BaseHTMLElement {
  static get observedAttributes() {
    return ['disabled', 'label', 'value'];
  }

  private _root: SelectRootElement | null = null;
  private _handler = () => this._syncAttributes();

  /** The value this item represents. */
  value: unknown = undefined;

  /** Whether this item is disabled. */
  disabled = false;

  /** Optional label (defaults to textContent). */
  label: string | undefined;

  attributeChangedCallback(name: string, _old: string | null, value: string | null) {
    if (name === 'disabled') {
      this.disabled = value !== null;
      this._syncAttributes();
      return;
    }

    if (name === 'label') {
      this.label = value ?? undefined;
      this._syncAttributes();
      return;
    }

    if (name === 'value') {
      this.value = value;
      this._syncAttributes();
    }
  }

  connectedCallback() {
    this._root = this.closest('select-root') as SelectRootElement | null;
    if (!this._root) {
      console.error('Base UI: Select parts must be placed within <select-root>.');
      return;
    }

    this.setAttribute('role', 'option');
    this.setAttribute('tabindex', '-1');

    this._root.addEventListener(SELECT_STATE_CHANGE_EVENT, this._handler);

    this.addEventListener('click', this._handleClick);
    this.addEventListener('pointerenter', this._handlePointerEnter);

    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(SELECT_STATE_CHANGE_EVENT, this._handler);
    this.removeEventListener('click', this._handleClick);
    this.removeEventListener('pointerenter', this._handlePointerEnter);
    this._root = null;
  }

  getLabel(): string {
    if (this.label) return this.label;
    const textEl = this.querySelector('select-item-text');
    return textEl?.textContent ?? this.textContent ?? '';
  }

  select(event: Event) {
    if (!this._root || this.disabled) return;
    this._root.selectValue(this.value, event, 'click');
  }

  private _handleClick = (event: MouseEvent) => {
    this.select(event);
  };

  private _handlePointerEnter = () => {
    if (!this._root || this.disabled) return;
    const items = this._root.getEnabledItems();
    const idx = items.indexOf(this);
    if (idx >= 0) {
      this._root.setActiveIndex(idx);
    }
  };

  private _getIndex(): number {
    if (!this._root) return -1;
    return this._root.getEnabledItems().indexOf(this);
  }

  private _syncAttributes() {
    if (!this._root) return;

    const selected = this._root.isValueSelected(this.value);
    const highlighted = this._getIndex() === this._root.getActiveIndex();

    this.setAttribute('aria-selected', String(selected));
    this.toggleAttribute('data-selected', selected);
    this.toggleAttribute('data-highlighted', highlighted);
    this.toggleAttribute('data-disabled', this.disabled);

    if (highlighted) {
      this.setAttribute('tabindex', '0');
    } else {
      this.setAttribute('tabindex', '-1');
    }
  }
}

if (!customElements.get('select-item')) {
  customElements.define('select-item', SelectItemElement);
}

// ─── SelectItemIndicatorElement ─────────────────────────────────────────────────

/**
 * A visual indicator (e.g., checkmark) for the selected item.
 * Renders a `<select-item-indicator>` custom element.
 *
 * Documentation: [Base UI Select](https://base-ui.com/react/components/select)
 */
export class SelectItemIndicatorElement extends BaseHTMLElement {
  private _root: SelectRootElement | null = null;
  private _item: SelectItemElement | null = null;
  private _handler = () => this._syncAttributes();

  connectedCallback() {
    this._root = this.closest('select-root') as SelectRootElement | null;
    this._item = this.closest('select-item') as SelectItemElement | null;

    if (!this._root) {
      console.error('Base UI: Select parts must be placed within <select-root>.');
      return;
    }

    this._root.addEventListener(SELECT_STATE_CHANGE_EVENT, this._handler);
    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(SELECT_STATE_CHANGE_EVENT, this._handler);
    this._root = null;
    this._item = null;
  }

  private _syncAttributes() {
    if (!this._root || !this._item) return;
    const selected = this._root.isValueSelected(this._item.value);
    this.toggleAttribute('data-selected', selected);

    if (!selected) {
      this.setAttribute('hidden', '');
    } else {
      this.removeAttribute('hidden');
    }
  }
}

if (!customElements.get('select-item-indicator')) {
  customElements.define('select-item-indicator', SelectItemIndicatorElement);
}

// ─── SelectItemTextElement ──────────────────────────────────────────────────────

/**
 * The text content of a select item.
 * Renders a `<select-item-text>` custom element.
 *
 * Documentation: [Base UI Select](https://base-ui.com/react/components/select)
 */
export class SelectItemTextElement extends BaseHTMLElement {
  connectedCallback() {
    // Structural only
  }
}

if (!customElements.get('select-item-text')) {
  customElements.define('select-item-text', SelectItemTextElement);
}

// ─── SelectGroupElement ─────────────────────────────────────────────────────────

/**
 * Groups related select items.
 * Renders a `<select-group>` custom element.
 *
 * Documentation: [Base UI Select](https://base-ui.com/react/components/select)
 */
export class SelectGroupElement extends BaseHTMLElement {
  connectedCallback() {
    this.setAttribute('role', 'group');

    queueMicrotask(() => {
      const label = this.querySelector('select-group-label');
      if (label?.id) {
        this.setAttribute('aria-labelledby', label.id);
      }
    });
  }
}

if (!customElements.get('select-group')) {
  customElements.define('select-group', SelectGroupElement);
}

// ─── SelectGroupLabelElement ────────────────────────────────────────────────────

/**
 * A label for a group of select items.
 * Renders a `<select-group-label>` custom element.
 *
 * Documentation: [Base UI Select](https://base-ui.com/react/components/select)
 */
export class SelectGroupLabelElement extends BaseHTMLElement {
  connectedCallback() {
    ensureId(this, 'base-ui-select-group-label');
    this.setAttribute('aria-hidden', 'true');
  }
}

if (!customElements.get('select-group-label')) {
  customElements.define('select-group-label', SelectGroupLabelElement);
}

// ─── Namespace exports ──────────────────────────────────────────────────────────

export namespace SelectRoot {
  export type State = SelectRootState;
  export type ChangeEventReason = SelectChangeEventReason;
  export type ChangeEventDetails = SelectChangeEventDetails;
}

export namespace SelectTrigger {
  export type State = SelectTriggerState;
}

export namespace SelectValue {
  export type State = SelectValueState;
}

export namespace SelectPopup {
  export type State = SelectPopupState;
}

export namespace SelectItem {
  export type State = SelectItemState;
}

export namespace SelectItemIndicator {
  export type State = SelectItemIndicatorState;
}

export namespace SelectItemText {
  export type State = SelectItemTextState;
}

export namespace SelectGroup {
  export type State = SelectGroupState;
}

export namespace SelectGroupLabel {
  export type State = SelectGroupLabelState;
}

export namespace SelectIcon {
  export type State = SelectIconState;
}

// ─── Global type declarations ───────────────────────────────────────────────────

declare global {
  interface HTMLElementTagNameMap {
    'select-root': SelectRootElement;
    'select-trigger': SelectTriggerElement;
    'select-value': SelectValueElement;
    'select-icon': SelectIconElement;
    'select-popup': SelectPopupElement;
    'select-item': SelectItemElement;
    'select-item-indicator': SelectItemIndicatorElement;
    'select-item-text': SelectItemTextElement;
    'select-group': SelectGroupElement;
    'select-group-label': SelectGroupLabelElement;
  }
}
