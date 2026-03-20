import { BaseHTMLElement, ensureId } from '../utils/index.ts';

// ─── Constants ──────────────────────────────────────────────────────────────────

const COMBOBOX_STATE_CHANGE_EVENT = 'base-ui-combobox-state-change';

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface ComboboxRootState {
  open: boolean;
  value: unknown;
  inputValue: string;
  disabled: boolean;
  readOnly: boolean;
  required: boolean;
  multiple: boolean;
}

export interface ComboboxInputState {
  open: boolean;
  disabled: boolean;
}

export interface ComboboxInputGroupState {
  open: boolean;
  disabled: boolean;
}

export interface ComboboxTriggerState {
  open: boolean;
  disabled: boolean;
}

export interface ComboboxValueState {
  value: unknown;
}

export interface ComboboxPopupState {
  open: boolean;
}

export interface ComboboxItemState {
  selected: boolean;
  highlighted: boolean;
  disabled: boolean;
}

export interface ComboboxItemIndicatorState {
  selected: boolean;
}

export interface ComboboxItemTextState {
  selected: boolean;
}

export interface ComboboxGroupState {}

export interface ComboboxGroupLabelState {}

export interface ComboboxIconState {
  open: boolean;
}

export interface ComboboxClearState {
  disabled: boolean;
}

export interface ComboboxEmptyState {
  open: boolean;
}

export interface ComboboxLabelState {}

export type ComboboxChangeEventReason = 'click' | 'keyboard';

export interface ComboboxChangeEventDetails {
  reason: ComboboxChangeEventReason;
  event: Event;
}

// ─── ComboboxRootElement ────────────────────────────────────────────────────────

/**
 * Groups all parts of the combobox.
 * Renders a `<combobox-root>` custom element (display:contents).
 *
 * Documentation: [Base UI Combobox](https://base-ui.com/react/components/combobox)
 */
export class ComboboxRootElement extends BaseHTMLElement {
  /** Default value (uncontrolled). */
  defaultValue: unknown = null;

  /** Whether disabled. */
  disabled = false;

  /** Whether read-only. */
  readOnly = false;

  /** Whether required. */
  required = false;

  /** Whether multiple selection is allowed. */
  multiple = false;

  /** Whether to auto-highlight the first matching item when popup opens. */
  autoHighlight: boolean | 'always' | 'input-change' = false;

  /** Callback when value changes. */
  onValueChange:
    | ((value: unknown, details: ComboboxChangeEventDetails) => void)
    | undefined;

  /** Callback when open state changes. */
  onOpenChange: ((open: boolean) => void) | undefined;

  /** Callback when input value changes. */
  onInputValueChange: ((inputValue: string) => void) | undefined;

  // Internal state
  private _value: unknown | undefined;
  private _valueIsControlled = false;
  private _internalValue: unknown = null;
  private _open = false;
  private _openIsControlled = false;
  private _internalOpen = false;
  private _inputValue = '';
  private _inputValueIsControlled = false;
  private _internalInputValue = '';
  private _initialized = false;
  private _activeIndex = -1;
  private _lastPublishedStateKey: string | null = null;
  private _inputId: string | undefined;
  private _listId: string | undefined;
  private _labelId: string | undefined;

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
    return this._openIsControlled
      ? (this._open as unknown as boolean)
      : this._internalOpen;
  }
  set open(val: boolean) {
    this._openIsControlled = true;
    this._open = val;
    this._syncAttributes();
    this._publishStateChange();
  }

  get inputValue(): string {
    return this._inputValueIsControlled
      ? this._inputValue
      : this._internalInputValue;
  }
  set inputValue(val: string) {
    this._inputValueIsControlled = true;
    this._inputValue = val;
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
    return this._openIsControlled
      ? (this._open as boolean)
      : this._internalOpen;
  }

  getInputValue(): string {
    return this._inputValueIsControlled
      ? this._inputValue
      : this._internalInputValue;
  }

  getActiveIndex(): number {
    return this._activeIndex;
  }

  setActiveIndex(index: number) {
    this._activeIndex = index;
    this._publishStateChange();
  }

  setInputId(id: string | undefined) {
    this._inputId = id;
  }

  getInputId(): string | undefined {
    return this._inputId;
  }

  setListId(id: string | undefined) {
    this._listId = id;
  }

  getListId(): string | undefined {
    return this._listId;
  }

  setLabelId(id: string | undefined) {
    this._labelId = id;
  }

  getLabelId(): string | undefined {
    return this._labelId;
  }

  setOpen(open: boolean) {
    if (open === this.isOpen()) return;

    this.onOpenChange?.(open);

    if (!this._openIsControlled) {
      this._internalOpen = open;
    }

    if (!open) {
      this._activeIndex = -1;
    } else if (this.autoHighlight) {
      // Auto-highlight first enabled item when opening
      const items = this.getEnabledItems();
      if (items.length > 0) {
        this._activeIndex = 0;
      }
    }

    this._syncAttributes();
    this._publishStateChange();
  }

  setInputValue(val: string) {
    this.onInputValueChange?.(val);

    if (!this._inputValueIsControlled) {
      this._internalInputValue = val;
    }

    // Auto-highlight first item on input change
    if (
      this.autoHighlight === true ||
      this.autoHighlight === 'always' ||
      this.autoHighlight === 'input-change'
    ) {
      queueMicrotask(() => {
        const items = this.getEnabledItems();
        if (items.length > 0) {
          this._activeIndex = 0;
        } else {
          this._activeIndex = -1;
        }
        this._publishStateChange();
      });
    }

    this._syncAttributes();
    this._publishStateChange();
  }

  selectValue(
    newValue: unknown,
    event: Event,
    reason: ComboboxChangeEventReason,
  ) {
    const details: ComboboxChangeEventDetails = { reason, event };

    if (this.multiple) {
      const currentArr = Array.isArray(this.getValue())
        ? [...(this.getValue() as unknown[])]
        : [];
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
      // Close popup for single select and clear input
      this.setOpen(false);
      // Update input value to selected item's label
      const item = this.getItems().find((i) => i.value === newValue);
      if (item) {
        this.setInputValue(item.getLabel());
      }
    }

    this._syncAttributes();
    this._publishStateChange();
  }

  clearValue() {
    if (this.multiple) {
      this.onValueChange?.([], {
        reason: 'click',
        event: new Event('clear'),
      });
      if (!this._valueIsControlled) {
        this._internalValue = [];
      }
    } else {
      this.onValueChange?.(null, {
        reason: 'click',
        event: new Event('clear'),
      });
      if (!this._valueIsControlled) {
        this._internalValue = null;
      }
    }

    this.setInputValue('');
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

  getItems(): ComboboxItemElement[] {
    return Array.from(this.querySelectorAll('combobox-item'));
  }

  getEnabledItems(): ComboboxItemElement[] {
    return this.getItems().filter(
      (item) => !item.disabled && !item.hasAttribute('hidden'),
    );
  }

  private _syncAttributes() {
    this.toggleAttribute('data-disabled', this.disabled);
    this.toggleAttribute('data-readonly', this.readOnly);
    this.toggleAttribute('data-required', this.required);
    this.toggleAttribute('data-open', this.isOpen());
  }

  private _publishStateChange() {
    const nextKey = [
      String(this.getValue()),
      this.isOpen() ? 'o' : '',
      this.getInputValue(),
      this.disabled ? 'd' : '',
      this.readOnly ? 'ro' : '',
      this.required ? 'r' : '',
      this.multiple ? 'm' : '',
      String(this._activeIndex),
    ].join('|');

    if (nextKey === this._lastPublishedStateKey) return;
    this._lastPublishedStateKey = nextKey;
    this.dispatchEvent(new CustomEvent(COMBOBOX_STATE_CHANGE_EVENT));
  }
}

if (!customElements.get('combobox-root')) {
  customElements.define('combobox-root', ComboboxRootElement);
}

// ─── ComboboxLabelElement ───────────────────────────────────────────────────────

/**
 * An accessible label for the combobox.
 * Renders a `<combobox-label>` custom element.
 *
 * Documentation: [Base UI Combobox](https://base-ui.com/react/components/combobox)
 */
export class ComboboxLabelElement extends BaseHTMLElement {
  private _root: ComboboxRootElement | null = null;

  connectedCallback() {
    this._root = this.closest('combobox-root') as ComboboxRootElement | null;
    if (!this._root) {
      console.error(
        'Base UI: Combobox parts must be placed within <combobox-root>.',
      );
      return;
    }

    ensureId(this, 'base-ui-combobox-label');
    this._root.setLabelId(this.id);
  }

  disconnectedCallback() {
    if (this._root) {
      this._root.setLabelId(undefined);
    }
    this._root = null;
  }
}

if (!customElements.get('combobox-label')) {
  customElements.define('combobox-label', ComboboxLabelElement);
}

// ─── ComboboxInputGroupElement ──────────────────────────────────────────────────

/**
 * A wrapper for the input and associated controls.
 * Renders a `<combobox-input-group>` custom element (role=group).
 *
 * Documentation: [Base UI Combobox](https://base-ui.com/react/components/combobox)
 */
export class ComboboxInputGroupElement extends BaseHTMLElement {
  private _root: ComboboxRootElement | null = null;
  private _handler = () => this._syncAttributes();

  connectedCallback() {
    this._root = this.closest('combobox-root') as ComboboxRootElement | null;
    if (!this._root) {
      console.error(
        'Base UI: Combobox parts must be placed within <combobox-root>.',
      );
      return;
    }

    this.setAttribute('role', 'group');

    this._root.addEventListener(COMBOBOX_STATE_CHANGE_EVENT, this._handler);
    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(COMBOBOX_STATE_CHANGE_EVENT, this._handler);
    this._root = null;
  }

  private _syncAttributes() {
    if (!this._root) return;
    this.toggleAttribute('data-open', this._root.isOpen());
    this.toggleAttribute('data-disabled', this._root.disabled);
  }
}

if (!customElements.get('combobox-input-group')) {
  customElements.define('combobox-input-group', ComboboxInputGroupElement);
}

// ─── ComboboxInputElement ───────────────────────────────────────────────────────

/**
 * The text input for filtering combobox items.
 * Renders a `<combobox-input>` custom element.
 * Must contain or be an `<input>` element.
 *
 * Documentation: [Base UI Combobox](https://base-ui.com/react/components/combobox)
 */
export class ComboboxInputElement extends BaseHTMLElement {
  private _root: ComboboxRootElement | null = null;
  private _handler = () => this._syncAttributes();
  private _input: HTMLInputElement | null = null;

  connectedCallback() {
    this._root = this.closest('combobox-root') as ComboboxRootElement | null;
    if (!this._root) {
      console.error(
        'Base UI: Combobox parts must be placed within <combobox-root>.',
      );
      return;
    }

    // If this element IS an input, use self; otherwise find child input
    if (this.tagName === 'INPUT') {
      this._input = this as unknown as HTMLInputElement;
    } else {
      this._input = this.querySelector('input');
    }

    // Create input if none exists
    if (!this._input) {
      this._input = document.createElement('input');
      this._input.type = 'text';
      this.appendChild(this._input);
    }

    ensureId(this._input, 'base-ui-combobox-input');
    this._root.setInputId(this._input.id);

    this._input.setAttribute('role', 'combobox');
    this._input.setAttribute('aria-haspopup', 'listbox');
    this._input.setAttribute('aria-autocomplete', 'list');
    this._input.setAttribute('autocomplete', 'off');

    this._root.addEventListener(COMBOBOX_STATE_CHANGE_EVENT, this._handler);

    this._input.addEventListener('input', this._handleInput);
    this._input.addEventListener('keydown', this._handleKeyDown);
    this._input.addEventListener('focus', this._handleFocus);

    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(COMBOBOX_STATE_CHANGE_EVENT, this._handler);
    this._input?.removeEventListener('input', this._handleInput);
    this._input?.removeEventListener('keydown', this._handleKeyDown);
    this._input?.removeEventListener('focus', this._handleFocus);
    this._root = null;
    this._input = null;
  }

  getInputElement(): HTMLInputElement | null {
    return this._input;
  }

  private _handleInput = (event: Event) => {
    if (!this._root || this._root.disabled || this._root.readOnly) return;
    const val = (event.target as HTMLInputElement).value;
    this._root.setInputValue(val);
    if (!this._root.isOpen()) {
      this._root.setOpen(true);
    }
  };

  private _handleFocus = () => {
    // Open popup on focus (standard combobox behavior)
    if (!this._root || this._root.disabled) return;
    if (!this._root.isOpen()) {
      this._root.setOpen(true);
    }
  };

  private _handleKeyDown = (event: KeyboardEvent) => {
    if (!this._root || this._root.disabled) return;

    const items = this._root.getEnabledItems();
    const currentIndex = this._root.getActiveIndex();

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!this._root.isOpen()) {
        this._root.setOpen(true);
      }
      if (items.length > 0) {
        const next =
          currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        this._root.setActiveIndex(next);
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!this._root.isOpen()) {
        this._root.setOpen(true);
      }
      if (items.length > 0) {
        const prev =
          currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        this._root.setActiveIndex(prev);
      }
    } else if (event.key === 'Home') {
      if (this._root.isOpen() && items.length > 0) {
        event.preventDefault();
        this._root.setActiveIndex(0);
      }
    } else if (event.key === 'End') {
      if (this._root.isOpen() && items.length > 0) {
        event.preventDefault();
        this._root.setActiveIndex(items.length - 1);
      }
    } else if (event.key === 'Enter') {
      if (
        this._root.isOpen() &&
        currentIndex >= 0 &&
        currentIndex < items.length
      ) {
        event.preventDefault();
        items[currentIndex].select(event);
      }
    } else if (event.key === 'Escape') {
      if (this._root.isOpen()) {
        event.preventDefault();
        this._root.setOpen(false);
      }
    }
  };

  private _syncAttributes() {
    if (!this._root || !this._input) return;
    const open = this._root.isOpen();

    this._input.setAttribute('aria-expanded', String(open));
    this.toggleAttribute('data-open', open);
    this.toggleAttribute('data-disabled', this._root.disabled);

    const listId = this._root.getListId();
    if (listId && open) {
      this._input.setAttribute('aria-controls', listId);
    } else {
      this._input.removeAttribute('aria-controls');
    }

    const labelId = this._root.getLabelId();
    if (labelId) {
      this._input.setAttribute('aria-labelledby', labelId);
    }

    // Update active descendant
    const activeIndex = this._root.getActiveIndex();
    const items = this._root.getEnabledItems();
    if (activeIndex >= 0 && activeIndex < items.length) {
      ensureId(items[activeIndex], 'base-ui-combobox-item');
      this._input.setAttribute(
        'aria-activedescendant',
        items[activeIndex].id,
      );
    } else {
      this._input.removeAttribute('aria-activedescendant');
    }

    // Sync input value
    if (this._input.value !== this._root.getInputValue()) {
      this._input.value = this._root.getInputValue();
    }

    if (this._root.disabled) {
      this._input.setAttribute('disabled', '');
    } else {
      this._input.removeAttribute('disabled');
    }

    if (this._root.readOnly) {
      this._input.setAttribute('readonly', '');
    } else {
      this._input.removeAttribute('readonly');
    }
  }
}

if (!customElements.get('combobox-input')) {
  customElements.define('combobox-input', ComboboxInputElement);
}

// ─── ComboboxTriggerElement ─────────────────────────────────────────────────────

/**
 * A button that opens/closes the combobox popup.
 * Renders a `<combobox-trigger>` custom element.
 *
 * Documentation: [Base UI Combobox](https://base-ui.com/react/components/combobox)
 */
export class ComboboxTriggerElement extends BaseHTMLElement {
  private _root: ComboboxRootElement | null = null;
  private _handler = () => this._syncAttributes();

  connectedCallback() {
    this._root = this.closest('combobox-root') as ComboboxRootElement | null;
    if (!this._root) {
      console.error(
        'Base UI: Combobox parts must be placed within <combobox-root>.',
      );
      return;
    }

    this.setAttribute('role', 'button');
    this.setAttribute('tabindex', '-1');
    this.setAttribute('aria-label', 'Toggle popup');

    this._root.addEventListener(COMBOBOX_STATE_CHANGE_EVENT, this._handler);

    this.addEventListener('click', this._handleClick);

    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(COMBOBOX_STATE_CHANGE_EVENT, this._handler);
    this.removeEventListener('click', this._handleClick);
    this._root = null;
  }

  private _handleClick = () => {
    if (!this._root || this._root.disabled) return;
    this._root.setOpen(!this._root.isOpen());
    // Focus input after toggling
    const inputEl = this._root.querySelector(
      'combobox-input',
    ) as ComboboxInputElement | null;
    inputEl?.getInputElement()?.focus();
  };

  private _syncAttributes() {
    if (!this._root) return;
    const open = this._root.isOpen();
    this.setAttribute('aria-expanded', String(open));
    this.toggleAttribute('data-open', open);
    this.toggleAttribute('data-disabled', this._root.disabled);
  }
}

if (!customElements.get('combobox-trigger')) {
  customElements.define('combobox-trigger', ComboboxTriggerElement);
}

// ─── ComboboxValueElement ───────────────────────────────────────────────────────

/**
 * Displays the label of the currently selected item.
 * Renders a `<combobox-value>` custom element.
 *
 * Documentation: [Base UI Combobox](https://base-ui.com/react/components/combobox)
 */
export class ComboboxValueElement extends BaseHTMLElement {
  private _root: ComboboxRootElement | null = null;
  private _handler = () => this._syncAttributes();

  /** Placeholder text when no value is selected. */
  placeholder = '';

  /** Custom function to format the displayed value. */
  formatValue: ((value: unknown) => string) | undefined;

  connectedCallback() {
    this._root = this.closest('combobox-root') as ComboboxRootElement | null;
    if (!this._root) {
      console.error(
        'Base UI: Combobox parts must be placed within <combobox-root>.',
      );
      return;
    }

    this._root.addEventListener(COMBOBOX_STATE_CHANGE_EVENT, this._handler);
    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(COMBOBOX_STATE_CHANGE_EVENT, this._handler);
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

    if (this._root.multiple && Array.isArray(value)) {
      const labels: string[] = [];
      for (const v of value) {
        const item = this._root.getItems().find((i) => i.value === v);
        labels.push(item?.getLabel() ?? String(v));
      }
      this.textContent = labels.join(', ');
    } else {
      const item = this._root.getItems().find((i) => i.value === value);
      this.textContent = item?.getLabel() ?? String(value);
    }
  }
}

if (!customElements.get('combobox-value')) {
  customElements.define('combobox-value', ComboboxValueElement);
}

// ─── ComboboxIconElement ────────────────────────────────────────────────────────

/**
 * A visual icon indicator inside the trigger.
 * Renders a `<combobox-icon>` custom element.
 *
 * Documentation: [Base UI Combobox](https://base-ui.com/react/components/combobox)
 */
export class ComboboxIconElement extends BaseHTMLElement {
  private _root: ComboboxRootElement | null = null;
  private _handler = () => this._syncAttributes();

  connectedCallback() {
    this._root = this.closest('combobox-root') as ComboboxRootElement | null;
    if (!this._root) {
      console.error(
        'Base UI: Combobox parts must be placed within <combobox-root>.',
      );
      return;
    }

    this.setAttribute('aria-hidden', 'true');

    this._root.addEventListener(COMBOBOX_STATE_CHANGE_EVENT, this._handler);
    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(COMBOBOX_STATE_CHANGE_EVENT, this._handler);
    this._root = null;
  }

  private _syncAttributes() {
    if (!this._root) return;
    this.toggleAttribute('data-open', this._root.isOpen());
  }
}

if (!customElements.get('combobox-icon')) {
  customElements.define('combobox-icon', ComboboxIconElement);
}

// ─── ComboboxPopupElement ───────────────────────────────────────────────────────

/**
 * The popup container for the combobox options.
 * Renders a `<combobox-popup>` custom element.
 *
 * Documentation: [Base UI Combobox](https://base-ui.com/react/components/combobox)
 */
export class ComboboxPopupElement extends BaseHTMLElement {
  private _root: ComboboxRootElement | null = null;
  private _handler = () => this._syncAttributes();

  connectedCallback() {
    this._root = this.closest('combobox-root') as ComboboxRootElement | null;
    if (!this._root) {
      console.error(
        'Base UI: Combobox parts must be placed within <combobox-root>.',
      );
      return;
    }

    ensureId(this, 'base-ui-combobox-popup');
    this._root.setListId(this.id);

    this.setAttribute('role', 'listbox');
    this.setAttribute('tabindex', '-1');

    this._root.addEventListener(COMBOBOX_STATE_CHANGE_EVENT, this._handler);

    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(COMBOBOX_STATE_CHANGE_EVENT, this._handler);
    if (this._root) {
      this._root.setListId(undefined);
    }
    this._root = null;
  }

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

if (!customElements.get('combobox-popup')) {
  customElements.define('combobox-popup', ComboboxPopupElement);
}

// ─── ComboboxItemElement ────────────────────────────────────────────────────────

/**
 * An individual option in the combobox.
 * Renders a `<combobox-item>` custom element.
 *
 * Documentation: [Base UI Combobox](https://base-ui.com/react/components/combobox)
 */
export class ComboboxItemElement extends BaseHTMLElement {
  private _root: ComboboxRootElement | null = null;
  private _handler = () => this._syncAttributes();

  /** The value this item represents. */
  value: unknown = undefined;

  /** Whether this item is disabled. */
  disabled = false;

  /** Optional label (defaults to textContent). */
  label: string | undefined;

  connectedCallback() {
    this._root = this.closest('combobox-root') as ComboboxRootElement | null;
    if (!this._root) {
      console.error(
        'Base UI: Combobox parts must be placed within <combobox-root>.',
      );
      return;
    }

    ensureId(this, 'base-ui-combobox-item');
    this.setAttribute('role', 'option');
    this.setAttribute('tabindex', '-1');

    this._root.addEventListener(COMBOBOX_STATE_CHANGE_EVENT, this._handler);

    this.addEventListener('click', this._handleClick);
    this.addEventListener('pointerenter', this._handlePointerEnter);

    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(COMBOBOX_STATE_CHANGE_EVENT, this._handler);
    this.removeEventListener('click', this._handleClick);
    this.removeEventListener('pointerenter', this._handlePointerEnter);
    this._root = null;
  }

  getLabel(): string {
    if (this.label) return this.label;
    const textEl = this.querySelector('combobox-item-text');
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

if (!customElements.get('combobox-item')) {
  customElements.define('combobox-item', ComboboxItemElement);
}

// ─── ComboboxItemIndicatorElement ───────────────────────────────────────────────

/**
 * A visual indicator (e.g., checkmark) for the selected item.
 * Renders a `<combobox-item-indicator>` custom element.
 *
 * Documentation: [Base UI Combobox](https://base-ui.com/react/components/combobox)
 */
export class ComboboxItemIndicatorElement extends BaseHTMLElement {
  private _root: ComboboxRootElement | null = null;
  private _item: ComboboxItemElement | null = null;
  private _handler = () => this._syncAttributes();

  connectedCallback() {
    this._root = this.closest('combobox-root') as ComboboxRootElement | null;
    this._item = this.closest('combobox-item') as ComboboxItemElement | null;

    if (!this._root) {
      console.error(
        'Base UI: Combobox parts must be placed within <combobox-root>.',
      );
      return;
    }

    this._root.addEventListener(COMBOBOX_STATE_CHANGE_EVENT, this._handler);
    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(COMBOBOX_STATE_CHANGE_EVENT, this._handler);
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

if (!customElements.get('combobox-item-indicator')) {
  customElements.define('combobox-item-indicator', ComboboxItemIndicatorElement);
}

// ─── ComboboxItemTextElement ────────────────────────────────────────────────────

/**
 * The text content of a combobox item.
 * Renders a `<combobox-item-text>` custom element.
 *
 * Documentation: [Base UI Combobox](https://base-ui.com/react/components/combobox)
 */
export class ComboboxItemTextElement extends BaseHTMLElement {
  connectedCallback() {
    // Structural only
  }
}

if (!customElements.get('combobox-item-text')) {
  customElements.define('combobox-item-text', ComboboxItemTextElement);
}

// ─── ComboboxGroupElement ───────────────────────────────────────────────────────

/**
 * Groups related combobox items.
 * Renders a `<combobox-group>` custom element.
 *
 * Documentation: [Base UI Combobox](https://base-ui.com/react/components/combobox)
 */
export class ComboboxGroupElement extends BaseHTMLElement {
  connectedCallback() {
    this.setAttribute('role', 'group');

    queueMicrotask(() => {
      const label = this.querySelector('combobox-group-label');
      if (label?.id) {
        this.setAttribute('aria-labelledby', label.id);
      }
    });
  }
}

if (!customElements.get('combobox-group')) {
  customElements.define('combobox-group', ComboboxGroupElement);
}

// ─── ComboboxGroupLabelElement ──────────────────────────────────────────────────

/**
 * A label for a group of combobox items.
 * Renders a `<combobox-group-label>` custom element.
 *
 * Documentation: [Base UI Combobox](https://base-ui.com/react/components/combobox)
 */
export class ComboboxGroupLabelElement extends BaseHTMLElement {
  connectedCallback() {
    ensureId(this, 'base-ui-combobox-group-label');
    this.setAttribute('aria-hidden', 'true');
  }
}

if (!customElements.get('combobox-group-label')) {
  customElements.define('combobox-group-label', ComboboxGroupLabelElement);
}

// ─── ComboboxClearElement ───────────────────────────────────────────────────────

/**
 * A button to clear the combobox value and input.
 * Renders a `<combobox-clear>` custom element.
 *
 * Documentation: [Base UI Combobox](https://base-ui.com/react/components/combobox)
 */
export class ComboboxClearElement extends BaseHTMLElement {
  private _root: ComboboxRootElement | null = null;
  private _handler = () => this._syncAttributes();

  connectedCallback() {
    this._root = this.closest('combobox-root') as ComboboxRootElement | null;
    if (!this._root) {
      console.error(
        'Base UI: Combobox parts must be placed within <combobox-root>.',
      );
      return;
    }

    this.setAttribute('role', 'button');
    this.setAttribute('tabindex', '-1');
    this.setAttribute('aria-label', 'Clear');

    this._root.addEventListener(COMBOBOX_STATE_CHANGE_EVENT, this._handler);

    this.addEventListener('click', this._handleClick);

    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(COMBOBOX_STATE_CHANGE_EVENT, this._handler);
    this.removeEventListener('click', this._handleClick);
    this._root = null;
  }

  private _handleClick = () => {
    if (!this._root || this._root.disabled) return;
    this._root.clearValue();
    // Focus input after clearing
    const inputEl = this._root.querySelector(
      'combobox-input',
    ) as ComboboxInputElement | null;
    inputEl?.getInputElement()?.focus();
  };

  private _syncAttributes() {
    if (!this._root) return;
    this.toggleAttribute('data-disabled', this._root.disabled);
  }
}

if (!customElements.get('combobox-clear')) {
  customElements.define('combobox-clear', ComboboxClearElement);
}

// ─── ComboboxEmptyElement ───────────────────────────────────────────────────────

/**
 * Content shown when no items match the current filter.
 * Renders a `<combobox-empty>` custom element.
 *
 * Documentation: [Base UI Combobox](https://base-ui.com/react/components/combobox)
 */
export class ComboboxEmptyElement extends BaseHTMLElement {
  private _root: ComboboxRootElement | null = null;
  private _handler = () => this._syncAttributes();

  connectedCallback() {
    this._root = this.closest('combobox-root') as ComboboxRootElement | null;
    if (!this._root) {
      console.error(
        'Base UI: Combobox parts must be placed within <combobox-root>.',
      );
      return;
    }

    this._root.addEventListener(COMBOBOX_STATE_CHANGE_EVENT, this._handler);
    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(COMBOBOX_STATE_CHANGE_EVENT, this._handler);
    this._root = null;
  }

  private _syncAttributes() {
    if (!this._root) return;
    const items = this._root.getEnabledItems();
    if (items.length === 0 && this._root.isOpen()) {
      this.removeAttribute('hidden');
    } else {
      this.setAttribute('hidden', '');
    }
  }
}

if (!customElements.get('combobox-empty')) {
  customElements.define('combobox-empty', ComboboxEmptyElement);
}

// ─── Namespace exports ──────────────────────────────────────────────────────────

export namespace ComboboxRoot {
  export type State = ComboboxRootState;
  export type ChangeEventReason = ComboboxChangeEventReason;
  export type ChangeEventDetails = ComboboxChangeEventDetails;
}

export namespace ComboboxInput {
  export type State = ComboboxInputState;
}

export namespace ComboboxInputGroup {
  export type State = ComboboxInputGroupState;
}

export namespace ComboboxTrigger {
  export type State = ComboboxTriggerState;
}

export namespace ComboboxValue {
  export type State = ComboboxValueState;
}

export namespace ComboboxPopup {
  export type State = ComboboxPopupState;
}

export namespace ComboboxItem {
  export type State = ComboboxItemState;
}

export namespace ComboboxItemIndicator {
  export type State = ComboboxItemIndicatorState;
}

export namespace ComboboxItemText {
  export type State = ComboboxItemTextState;
}

export namespace ComboboxGroup {
  export type State = ComboboxGroupState;
}

export namespace ComboboxGroupLabel {
  export type State = ComboboxGroupLabelState;
}

export namespace ComboboxIcon {
  export type State = ComboboxIconState;
}

export namespace ComboboxClear {
  export type State = ComboboxClearState;
}

export namespace ComboboxEmpty {
  export type State = ComboboxEmptyState;
}

export namespace ComboboxLabel {
  export type State = ComboboxLabelState;
}

// ─── Global type declarations ───────────────────────────────────────────────────

declare global {
  interface HTMLElementTagNameMap {
    'combobox-root': ComboboxRootElement;
    'combobox-label': ComboboxLabelElement;
    'combobox-input-group': ComboboxInputGroupElement;
    'combobox-input': ComboboxInputElement;
    'combobox-trigger': ComboboxTriggerElement;
    'combobox-value': ComboboxValueElement;
    'combobox-icon': ComboboxIconElement;
    'combobox-popup': ComboboxPopupElement;
    'combobox-item': ComboboxItemElement;
    'combobox-item-indicator': ComboboxItemIndicatorElement;
    'combobox-item-text': ComboboxItemTextElement;
    'combobox-group': ComboboxGroupElement;
    'combobox-group-label': ComboboxGroupLabelElement;
    'combobox-clear': ComboboxClearElement;
    'combobox-empty': ComboboxEmptyElement;
  }
}
