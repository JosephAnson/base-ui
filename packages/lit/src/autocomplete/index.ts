import { BaseHTMLElement } from '../utils/index.ts';
import {
  ComboboxRootElement,
  type ComboboxChangeEventDetails,
  type ComboboxChangeEventReason,
} from '../combobox/index.ts';

// Re-export all combobox parts for use as autocomplete parts
export {
  ComboboxInputElement as AutocompleteInputElement,
  ComboboxInputGroupElement as AutocompleteInputGroupElement,
  ComboboxTriggerElement as AutocompleteTriggerElement,
  ComboboxPopupElement as AutocompletePopupElement,
  ComboboxItemElement as AutocompleteItemElement,
  ComboboxItemIndicatorElement as AutocompleteItemIndicatorElement,
  ComboboxItemTextElement as AutocompleteItemTextElement,
  ComboboxGroupElement as AutocompleteGroupElement,
  ComboboxGroupLabelElement as AutocompleteGroupLabelElement,
  ComboboxIconElement as AutocompleteIconElement,
  ComboboxClearElement as AutocompleteClearElement,
  ComboboxEmptyElement as AutocompleteEmptyElement,
  ComboboxLabelElement as AutocompleteLabelElement,
  ComboboxValueElement as AutocompleteValueElement,
  type ComboboxInputState as AutocompleteInputState,
  type ComboboxInputGroupState as AutocompleteInputGroupState,
  type ComboboxTriggerState as AutocompleteTriggerState,
  type ComboboxPopupState as AutocompletePopupState,
  type ComboboxItemState as AutocompleteItemState,
  type ComboboxItemIndicatorState as AutocompleteItemIndicatorState,
  type ComboboxItemTextState as AutocompleteItemTextState,
  type ComboboxGroupState as AutocompleteGroupState,
  type ComboboxGroupLabelState as AutocompleteGroupLabelState,
  type ComboboxIconState as AutocompleteIconState,
  type ComboboxClearState as AutocompleteClearState,
  type ComboboxEmptyState as AutocompleteEmptyState,
  type ComboboxLabelState as AutocompleteLabelState,
  type ComboboxValueState as AutocompleteValueState,
} from '../combobox/index.ts';

// ─── Types ──────────────────────────────────────────────────────────────────────

/** Filtering mode for the autocomplete. */
export type AutocompleteFilterMode = 'list' | 'inline' | 'both' | 'none';

export interface AutocompleteRootState {
  open: boolean;
  value: unknown;
  inputValue: string;
  disabled: boolean;
  readOnly: boolean;
  required: boolean;
  filterMode: AutocompleteFilterMode;
}

export type AutocompleteChangeEventReason = ComboboxChangeEventReason;
export type AutocompleteChangeEventDetails = ComboboxChangeEventDetails;

// ─── AutocompleteRootElement ────────────────────────────────────────────────────

/**
 * Groups all parts of the autocomplete. Wraps a `<combobox-root>` internally,
 * adding a `filterMode` and built-in item filtering.
 * Renders an `<autocomplete-root>` custom element (display:contents).
 *
 * Documentation: [Base UI Autocomplete](https://base-ui.com/react/components/autocomplete)
 */
export class AutocompleteRootElement extends BaseHTMLElement {
  private _combobox: ComboboxRootElement | null = null;
  private _initialized = false;

  /** Default value (uncontrolled). */
  defaultValue: unknown = null;

  /** Whether disabled. */
  disabled = false;

  /** Whether read-only. */
  readOnly = false;

  /** Whether required. */
  required = false;

  /**
   * Filtering mode:
   * - `'list'` — filters the list items (default)
   * - `'inline'` — auto-completes the input text
   * - `'both'` — filters and auto-completes
   * - `'none'` — no built-in filtering
   */
  filterMode: AutocompleteFilterMode = 'list';

  /** Whether to auto-highlight the first matching item. */
  autoHighlight: boolean | 'always' | 'input-change' = 'input-change';

  /** Custom filter function. When provided, overrides default case-insensitive starts-with filter. */
  filterFn: ((itemLabel: string, inputValue: string) => boolean) | undefined;

  /** Callback when value changes. */
  onValueChange:
    | ((value: unknown, details: AutocompleteChangeEventDetails) => void)
    | undefined;

  /** Callback when open state changes. */
  onOpenChange: ((open: boolean) => void) | undefined;

  /** Callback when input value changes. */
  onInputValueChange: ((inputValue: string) => void) | undefined;

  connectedCallback() {
    this.style.display = 'contents';

    // Find or create the inner combobox-root
    this._combobox = this.querySelector(
      'combobox-root',
    ) as ComboboxRootElement | null;

    if (!this._combobox) {
      // Wrap children in a combobox-root
      this._combobox = document.createElement(
        'combobox-root',
      ) as ComboboxRootElement;
      while (this.firstChild) {
        this._combobox.appendChild(this.firstChild);
      }
      this.appendChild(this._combobox);
    }

    // Sync properties to inner combobox
    if (!this._initialized) {
      this._initialized = true;
      this._combobox.defaultValue = this.defaultValue;
    }
    this._combobox.disabled = this.disabled;
    this._combobox.readOnly = this.readOnly;
    this._combobox.required = this.required;
    this._combobox.autoHighlight = this.autoHighlight;

    // Wire up callbacks
    this._combobox.onValueChange = (value, details) => {
      this.onValueChange?.(value, details);
    };

    this._combobox.onOpenChange = (open) => {
      this.onOpenChange?.(open);
    };

    this._combobox.onInputValueChange = (inputValue) => {
      this.onInputValueChange?.(inputValue);
      if (this.filterMode === 'list' || this.filterMode === 'both') {
        this._filterItems(inputValue);
      }
    };
  }

  disconnectedCallback() {
    this._combobox = null;
  }

  /** Get the underlying combobox root element. */
  getComboboxRoot(): ComboboxRootElement | null {
    return this._combobox;
  }

  private _filterItems(query: string) {
    if (!this._combobox) return;

    const items = this._combobox.getItems();
    const normalizedQuery = query.toLowerCase();

    for (const item of items) {
      const label = item.getLabel().toLowerCase();
      let matches: boolean;

      if (this.filterFn) {
        matches = this.filterFn(item.getLabel(), query);
      } else {
        matches = !query || label.startsWith(normalizedQuery);
      }

      if (matches) {
        item.removeAttribute('hidden');
      } else {
        item.setAttribute('hidden', '');
      }
    }
  }
}

if (!customElements.get('autocomplete-root')) {
  customElements.define('autocomplete-root', AutocompleteRootElement);
}

// ─── Namespace exports ──────────────────────────────────────────────────────────

export namespace AutocompleteRoot {
  export type State = AutocompleteRootState;
  export type FilterMode = AutocompleteFilterMode;
  export type ChangeEventReason = AutocompleteChangeEventReason;
  export type ChangeEventDetails = AutocompleteChangeEventDetails;
}

// ─── Global type declarations ───────────────────────────────────────────────────

declare global {
  interface HTMLElementTagNameMap {
    'autocomplete-root': AutocompleteRootElement;
  }
}
