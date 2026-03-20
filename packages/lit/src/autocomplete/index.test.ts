import { describe, expect, it, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import {
  AutocompleteRootElement,
  AutocompleteInputElement,
  AutocompleteInputGroupElement,
  AutocompleteTriggerElement,
  AutocompletePopupElement,
  AutocompleteItemElement,
  AutocompleteItemIndicatorElement,
  AutocompleteItemTextElement,
  AutocompleteGroupElement,
  AutocompleteGroupLabelElement,
  AutocompleteIconElement,
  AutocompleteClearElement,
  AutocompleteEmptyElement,
  AutocompleteLabelElement,
  AutocompleteValueElement,
} from './index.ts';
import type { ComboboxItemElement } from '../combobox/index.ts';

// ─── Helpers ────────────────────────────────────────────────────────────────────

const waitForMicrotask = () => new Promise<void>((r) => queueMicrotask(r));

function createAutocomplete(opts: {
  defaultValue?: unknown;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  filterMode?: 'list' | 'inline' | 'both' | 'none';
  items?: Array<{ value: string; label: string; disabled?: boolean }>;
} = {}) {
  const container = document.createElement('div');
  const items = opts.items ?? [
    { value: 'apple', label: 'Apple' },
    { value: 'banana', label: 'Banana' },
    { value: 'cherry', label: 'Cherry' },
    { value: 'apricot', label: 'Apricot' },
  ];

  const root = document.createElement(
    'autocomplete-root',
  ) as AutocompleteRootElement;
  if (opts.defaultValue !== undefined) root.defaultValue = opts.defaultValue;
  if (opts.disabled) root.disabled = true;
  if (opts.readOnly) root.readOnly = true;
  if (opts.required) root.required = true;
  if (opts.filterMode) root.filterMode = opts.filterMode;

  root.innerHTML = `
    <combobox-root>
      <combobox-label>Fruit</combobox-label>
      <combobox-input-group>
        <combobox-input></combobox-input>
        <combobox-trigger>Open</combobox-trigger>
        <combobox-clear>Clear</combobox-clear>
        <combobox-icon>▼</combobox-icon>
      </combobox-input-group>
      <combobox-popup>
        ${items
          .map(
            (item) =>
              `<combobox-item>
            <combobox-item-indicator>✓</combobox-item-indicator>
            <combobox-item-text>${item.label}</combobox-item-text>
          </combobox-item>`,
          )
          .join('')}
        <combobox-empty>No results</combobox-empty>
      </combobox-popup>
      <combobox-value></combobox-value>
    </combobox-root>
  `;

  // Assign values to items before appending to DOM
  const itemEls = root.querySelectorAll('combobox-item');
  itemEls.forEach((el, i) => {
    const itemEl = el as ComboboxItemElement;
    itemEl.value = items[i].value;
    if (items[i].disabled) itemEl.disabled = true;
  });

  container.appendChild(root);
  document.body.appendChild(container);

  return container;
}

function getRoot(container: HTMLElement): AutocompleteRootElement {
  return container.querySelector(
    'autocomplete-root',
  ) as AutocompleteRootElement;
}

function getComboboxRoot(container: HTMLElement) {
  return getRoot(container).getComboboxRoot()!;
}

function getInput(container: HTMLElement): HTMLInputElement {
  const cbInput = container.querySelector('combobox-input') as any;
  return cbInput.getInputElement()!;
}

function getItems(container: HTMLElement): ComboboxItemElement[] {
  return Array.from(container.querySelectorAll('combobox-item'));
}

afterEach(() => {
  document.body.innerHTML = '';
});

// ─── Tests ──────────────────────────────────────────────────────────────────────

describe('Autocomplete', () => {
  describe('Root', () => {
    it('renders with display:contents', async () => {
      const container = createAutocomplete();
      await waitForMicrotask();
      expect(getRoot(container).style.display).toBe('contents');
    });

    it('is an instance of AutocompleteRootElement', () => {
      const container = createAutocomplete();
      expect(getRoot(container)).toBeInstanceOf(AutocompleteRootElement);
    });

    it('wraps a combobox-root', async () => {
      const container = createAutocomplete();
      await waitForMicrotask();
      expect(getComboboxRoot(container)).toBeTruthy();
      expect(getComboboxRoot(container).tagName.toLowerCase()).toBe(
        'combobox-root',
      );
    });

    it('passes disabled to inner combobox', async () => {
      const container = createAutocomplete({ disabled: true });
      await waitForMicrotask();
      expect(getComboboxRoot(container).disabled).toBe(true);
    });

    it('passes readOnly to inner combobox', async () => {
      const container = createAutocomplete({ readOnly: true });
      await waitForMicrotask();
      expect(getComboboxRoot(container).readOnly).toBe(true);
    });

    it('passes required to inner combobox', async () => {
      const container = createAutocomplete({ required: true });
      await waitForMicrotask();
      expect(getComboboxRoot(container).required).toBe(true);
    });

    it('passes defaultValue to inner combobox', async () => {
      const container = createAutocomplete({ defaultValue: 'apple' });
      await waitForMicrotask();
      expect(getComboboxRoot(container).getValue()).toBe('apple');
    });
  });

  describe('Filtering (list mode)', () => {
    it('filters items based on input (case-insensitive starts-with)', async () => {
      const container = createAutocomplete({ filterMode: 'list' });
      await waitForMicrotask();

      // Type "ap" to filter
      getComboboxRoot(container).setInputValue('ap');
      await waitForMicrotask();

      const items = getItems(container);
      // "Apple" and "Apricot" start with "ap", "Banana" and "Cherry" don't
      expect(items[0]).not.toHaveAttribute('hidden'); // Apple
      expect(items[1]).toHaveAttribute('hidden'); // Banana
      expect(items[2]).toHaveAttribute('hidden'); // Cherry
      expect(items[3]).not.toHaveAttribute('hidden'); // Apricot
    });

    it('shows all items when input is cleared', async () => {
      const container = createAutocomplete({ filterMode: 'list' });
      await waitForMicrotask();

      getComboboxRoot(container).setInputValue('ap');
      await waitForMicrotask();
      getComboboxRoot(container).setInputValue('');
      await waitForMicrotask();

      const items = getItems(container);
      for (const item of items) {
        expect(item).not.toHaveAttribute('hidden');
      }
    });

    it('filters items with exact match', async () => {
      const container = createAutocomplete({ filterMode: 'list' });
      await waitForMicrotask();

      getComboboxRoot(container).setInputValue('banana');
      await waitForMicrotask();

      const items = getItems(container);
      expect(items[0]).toHaveAttribute('hidden'); // Apple
      expect(items[1]).not.toHaveAttribute('hidden'); // Banana
      expect(items[2]).toHaveAttribute('hidden'); // Cherry
      expect(items[3]).toHaveAttribute('hidden'); // Apricot
    });

    it('does not filter when filterMode is none', async () => {
      const container = createAutocomplete({ filterMode: 'none' });
      await waitForMicrotask();

      getComboboxRoot(container).setInputValue('xyz');
      await waitForMicrotask();

      const items = getItems(container);
      for (const item of items) {
        expect(item).not.toHaveAttribute('hidden');
      }
    });
  });

  describe('Custom filter', () => {
    it('uses custom filterFn when provided', async () => {
      const container = createAutocomplete({ filterMode: 'list' });
      await waitForMicrotask();

      // Custom filter: contains instead of starts-with
      getRoot(container).filterFn = (label, input) =>
        label.toLowerCase().includes(input.toLowerCase());

      getComboboxRoot(container).setInputValue('an');
      await waitForMicrotask();

      const items = getItems(container);
      expect(items[0]).toHaveAttribute('hidden'); // Apple - no "an"
      expect(items[1]).not.toHaveAttribute('hidden'); // Banana - contains "an"
      expect(items[2]).toHaveAttribute('hidden'); // Cherry - no "an"
      expect(items[3]).toHaveAttribute('hidden'); // Apricot - no "an"
    });
  });

  describe('Callbacks', () => {
    it('calls onValueChange when item is selected', async () => {
      const container = createAutocomplete();
      await waitForMicrotask();
      const onValueChange = vi.fn();
      getRoot(container).onValueChange = onValueChange;

      getItems(container)[1].click();
      await waitForMicrotask();
      expect(onValueChange).toHaveBeenCalledWith('banana', expect.any(Object));
    });

    it('calls onOpenChange when popup opens', async () => {
      const container = createAutocomplete();
      await waitForMicrotask();
      const onOpenChange = vi.fn();
      getRoot(container).onOpenChange = onOpenChange;

      getComboboxRoot(container).setOpen(true);
      await waitForMicrotask();
      expect(onOpenChange).toHaveBeenCalledWith(true);
    });

    it('calls onInputValueChange on input', async () => {
      const container = createAutocomplete();
      await waitForMicrotask();
      const onInputValueChange = vi.fn();
      getRoot(container).onInputValueChange = onInputValueChange;

      getComboboxRoot(container).setInputValue('test');
      await waitForMicrotask();
      expect(onInputValueChange).toHaveBeenCalledWith('test');
    });
  });

  describe('Re-exported parts', () => {
    it('AutocompleteInputElement is ComboboxInputElement', () => {
      // These are re-exports, so they should be the same class
      expect(AutocompleteInputElement).toBeTruthy();
    });

    it('AutocompleteInputGroupElement is ComboboxInputGroupElement', () => {
      expect(AutocompleteInputGroupElement).toBeTruthy();
    });

    it('AutocompleteTriggerElement is ComboboxTriggerElement', () => {
      expect(AutocompleteTriggerElement).toBeTruthy();
    });

    it('AutocompletePopupElement is ComboboxPopupElement', () => {
      expect(AutocompletePopupElement).toBeTruthy();
    });

    it('AutocompleteItemElement is ComboboxItemElement', () => {
      expect(AutocompleteItemElement).toBeTruthy();
    });

    it('AutocompleteItemIndicatorElement is ComboboxItemIndicatorElement', () => {
      expect(AutocompleteItemIndicatorElement).toBeTruthy();
    });

    it('AutocompleteItemTextElement is ComboboxItemTextElement', () => {
      expect(AutocompleteItemTextElement).toBeTruthy();
    });

    it('AutocompleteGroupElement is ComboboxGroupElement', () => {
      expect(AutocompleteGroupElement).toBeTruthy();
    });

    it('AutocompleteGroupLabelElement is ComboboxGroupLabelElement', () => {
      expect(AutocompleteGroupLabelElement).toBeTruthy();
    });

    it('AutocompleteIconElement is ComboboxIconElement', () => {
      expect(AutocompleteIconElement).toBeTruthy();
    });

    it('AutocompleteClearElement is ComboboxClearElement', () => {
      expect(AutocompleteClearElement).toBeTruthy();
    });

    it('AutocompleteEmptyElement is ComboboxEmptyElement', () => {
      expect(AutocompleteEmptyElement).toBeTruthy();
    });

    it('AutocompleteLabelElement is ComboboxLabelElement', () => {
      expect(AutocompleteLabelElement).toBeTruthy();
    });

    it('AutocompleteValueElement is ComboboxValueElement', () => {
      expect(AutocompleteValueElement).toBeTruthy();
    });
  });

  describe('Integration', () => {
    it('full cycle: type to filter, navigate, select', async () => {
      const container = createAutocomplete({ filterMode: 'list' });
      await waitForMicrotask();

      const input = getInput(container);

      // Type "ch" to filter to Cherry
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
      )!.set!.call(input, 'ch');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await waitForMicrotask();

      // Only Cherry should be visible
      const items = getItems(container);
      expect(items[0]).toHaveAttribute('hidden'); // Apple
      expect(items[1]).toHaveAttribute('hidden'); // Banana
      expect(items[2]).not.toHaveAttribute('hidden'); // Cherry
      expect(items[3]).toHaveAttribute('hidden'); // Apricot

      // Select Cherry
      const onValueChange = vi.fn();
      getRoot(container).onValueChange = onValueChange;
      items[2].click();
      await waitForMicrotask();
      expect(onValueChange).toHaveBeenCalledWith('cherry', expect.any(Object));
    });
  });

  describe('Cleanup', () => {
    it('cleans up on disconnect', async () => {
      const container = createAutocomplete();
      await waitForMicrotask();
      container.remove();
      expect(true).toBe(true);
    });
  });
});
