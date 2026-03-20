import { describe, expect, it, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import {
  ComboboxRootElement,
  ComboboxLabelElement,
  ComboboxInputGroupElement,
  ComboboxInputElement,
  ComboboxTriggerElement,
  ComboboxValueElement,
  ComboboxIconElement,
  ComboboxPopupElement,
  ComboboxItemElement,
  ComboboxItemIndicatorElement,
  ComboboxItemTextElement,
  ComboboxGroupElement,
  ComboboxGroupLabelElement,
  ComboboxClearElement,
  ComboboxEmptyElement,
} from './index.ts';

// ─── Helpers ────────────────────────────────────────────────────────────────────

const waitForMicrotask = () => new Promise<void>((r) => queueMicrotask(r));

function createCombobox(opts: {
  defaultValue?: unknown;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  multiple?: boolean;
  autoHighlight?: boolean | 'always' | 'input-change';
  items?: Array<{ value: string; label: string; disabled?: boolean }>;
} = {}) {
  const container = document.createElement('div');
  const items = opts.items ?? [
    { value: 'apple', label: 'Apple' },
    { value: 'banana', label: 'Banana' },
    { value: 'cherry', label: 'Cherry' },
  ];

  // Build root element with properties before connecting to DOM
  const root = document.createElement('combobox-root') as ComboboxRootElement;
  if (opts.defaultValue !== undefined) root.defaultValue = opts.defaultValue;
  if (opts.disabled) root.disabled = true;
  if (opts.readOnly) root.readOnly = true;
  if (opts.required) root.required = true;
  if (opts.multiple) root.multiple = true;
  if (opts.autoHighlight !== undefined) root.autoHighlight = opts.autoHighlight;

  root.innerHTML = `
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
            `<combobox-item${item.disabled ? ' data-item-disabled' : ''}>
          <combobox-item-indicator>✓</combobox-item-indicator>
          <combobox-item-text>${item.label}</combobox-item-text>
        </combobox-item>`,
        )
        .join('')}
      <combobox-empty>No results</combobox-empty>
    </combobox-popup>
    <combobox-value></combobox-value>
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

function getRoot(container: HTMLElement): ComboboxRootElement {
  return container.querySelector('combobox-root') as ComboboxRootElement;
}

function getLabel(container: HTMLElement): ComboboxLabelElement {
  return container.querySelector('combobox-label') as ComboboxLabelElement;
}

function getInputGroup(container: HTMLElement): ComboboxInputGroupElement {
  return container.querySelector('combobox-input-group') as ComboboxInputGroupElement;
}

function getComboboxInput(container: HTMLElement): ComboboxInputElement {
  return container.querySelector('combobox-input') as ComboboxInputElement;
}

function getInput(container: HTMLElement): HTMLInputElement {
  const cbInput = getComboboxInput(container);
  return cbInput.getInputElement()!;
}

function getTrigger(container: HTMLElement): ComboboxTriggerElement {
  return container.querySelector('combobox-trigger') as ComboboxTriggerElement;
}

function getClear(container: HTMLElement): ComboboxClearElement {
  return container.querySelector('combobox-clear') as ComboboxClearElement;
}

function getPopup(container: HTMLElement): ComboboxPopupElement {
  return container.querySelector('combobox-popup') as ComboboxPopupElement;
}

function getItems(container: HTMLElement): ComboboxItemElement[] {
  return Array.from(container.querySelectorAll('combobox-item'));
}

function getValue(container: HTMLElement): ComboboxValueElement {
  return container.querySelector('combobox-value') as ComboboxValueElement;
}

function getIcon(container: HTMLElement): ComboboxIconElement {
  return container.querySelector('combobox-icon') as ComboboxIconElement;
}

function getEmpty(container: HTMLElement): ComboboxEmptyElement {
  return container.querySelector('combobox-empty') as ComboboxEmptyElement;
}

afterEach(() => {
  document.body.innerHTML = '';
});

// ─── Tests ──────────────────────────────────────────────────────────────────────

describe('Combobox', () => {
  describe('Root', () => {
    it('renders with display:contents', async () => {
      const container = createCombobox();
      await waitForMicrotask();
      expect(getRoot(container).style.display).toBe('contents');
    });

    it('is an instance of ComboboxRootElement', () => {
      const container = createCombobox();
      expect(getRoot(container)).toBeInstanceOf(ComboboxRootElement);
    });

    it('sets data-disabled when disabled', async () => {
      const container = createCombobox({ disabled: true });
      await waitForMicrotask();
      expect(getRoot(container)).toHaveAttribute('data-disabled');
    });

    it('sets data-readonly when readOnly', async () => {
      const container = createCombobox({ readOnly: true });
      await waitForMicrotask();
      expect(getRoot(container)).toHaveAttribute('data-readonly');
    });

    it('sets data-required when required', async () => {
      const container = createCombobox({ required: true });
      await waitForMicrotask();
      expect(getRoot(container)).toHaveAttribute('data-required');
    });

    it('starts closed', async () => {
      const container = createCombobox();
      await waitForMicrotask();
      expect(getRoot(container).isOpen()).toBe(false);
    });
  });

  describe('Default value', () => {
    it('accepts a defaultValue', async () => {
      const container = createCombobox({ defaultValue: 'apple' });
      await waitForMicrotask();
      expect(getRoot(container).getValue()).toBe('apple');
    });

    it('defaults to null', async () => {
      const container = createCombobox();
      await waitForMicrotask();
      expect(getRoot(container).getValue()).toBe(null);
    });
  });

  describe('Controlled value', () => {
    it('accepts a controlled value', async () => {
      const container = createCombobox();
      await waitForMicrotask();
      getRoot(container).value = 'banana';
      expect(getRoot(container).getValue()).toBe('banana');
    });

    it('updates when value changes', async () => {
      const container = createCombobox();
      await waitForMicrotask();
      getRoot(container).value = 'apple';
      expect(getRoot(container).getValue()).toBe('apple');
      getRoot(container).value = 'cherry';
      expect(getRoot(container).getValue()).toBe('cherry');
    });
  });

  describe('Label', () => {
    it('auto-generates an id', async () => {
      const container = createCombobox();
      await waitForMicrotask();
      expect(getLabel(container).id).toMatch(/^base-ui-combobox-label-/);
    });

    it('registers with root', async () => {
      const container = createCombobox();
      await waitForMicrotask();
      expect(getRoot(container).getLabelId()).toBe(getLabel(container).id);
    });

    it('is an instance of ComboboxLabelElement', () => {
      const container = createCombobox();
      expect(getLabel(container)).toBeInstanceOf(ComboboxLabelElement);
    });
  });

  describe('Input Group', () => {
    it('has role=group', async () => {
      const container = createCombobox();
      await waitForMicrotask();
      expect(getInputGroup(container)).toHaveAttribute('role', 'group');
    });

    it('sets data-open when popup is open', async () => {
      const container = createCombobox();
      await waitForMicrotask();
      expect(getInputGroup(container)).not.toHaveAttribute('data-open');
      getRoot(container).setOpen(true);
      await waitForMicrotask();
      expect(getInputGroup(container)).toHaveAttribute('data-open');
    });

    it('is an instance of ComboboxInputGroupElement', () => {
      const container = createCombobox();
      expect(getInputGroup(container)).toBeInstanceOf(
        ComboboxInputGroupElement,
      );
    });
  });

  describe('Input', () => {
    it('creates an input element', async () => {
      const container = createCombobox();
      await waitForMicrotask();
      expect(getInput(container)).toBeInstanceOf(HTMLInputElement);
    });

    it('has role=combobox on the input', async () => {
      const container = createCombobox();
      await waitForMicrotask();
      expect(getInput(container)).toHaveAttribute('role', 'combobox');
    });

    it('has aria-haspopup=listbox', async () => {
      const container = createCombobox();
      await waitForMicrotask();
      expect(getInput(container)).toHaveAttribute('aria-haspopup', 'listbox');
    });

    it('has aria-autocomplete=list', async () => {
      const container = createCombobox();
      await waitForMicrotask();
      expect(getInput(container)).toHaveAttribute('aria-autocomplete', 'list');
    });

    it('has aria-expanded=false when closed', async () => {
      const container = createCombobox();
      await waitForMicrotask();
      expect(getInput(container)).toHaveAttribute('aria-expanded', 'false');
    });

    it('has aria-expanded=true when open', async () => {
      const container = createCombobox();
      await waitForMicrotask();
      getRoot(container).setOpen(true);
      await waitForMicrotask();
      expect(getInput(container)).toHaveAttribute('aria-expanded', 'true');
    });

    it('has aria-controls when open', async () => {
      const container = createCombobox();
      await waitForMicrotask();
      getRoot(container).setOpen(true);
      await waitForMicrotask();
      expect(getInput(container)).toHaveAttribute('aria-controls');
    });

    it('has aria-labelledby from label', async () => {
      const container = createCombobox();
      await waitForMicrotask();
      const labelId = getLabel(container).id;
      expect(getInput(container)).toHaveAttribute('aria-labelledby', labelId);
    });

    it('opens popup on ArrowDown', async () => {
      const container = createCombobox();
      await waitForMicrotask();
      const input = getInput(container);
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      await waitForMicrotask();
      expect(getRoot(container).isOpen()).toBe(true);
    });

    it('opens popup on ArrowUp', async () => {
      const container = createCombobox();
      await waitForMicrotask();
      const input = getInput(container);
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
      await waitForMicrotask();
      expect(getRoot(container).isOpen()).toBe(true);
    });

    it('navigates items with ArrowDown', async () => {
      const container = createCombobox();
      await waitForMicrotask();
      getRoot(container).setOpen(true);
      await waitForMicrotask();
      const input = getInput(container);
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      await waitForMicrotask();
      expect(getRoot(container).getActiveIndex()).toBe(0);
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      await waitForMicrotask();
      expect(getRoot(container).getActiveIndex()).toBe(1);
    });

    it('navigates items with ArrowUp', async () => {
      const container = createCombobox();
      await waitForMicrotask();
      getRoot(container).setOpen(true);
      getRoot(container).setActiveIndex(2);
      await waitForMicrotask();
      const input = getInput(container);
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
      await waitForMicrotask();
      expect(getRoot(container).getActiveIndex()).toBe(1);
    });

    it('Home goes to first item', async () => {
      const container = createCombobox();
      await waitForMicrotask();
      getRoot(container).setOpen(true);
      getRoot(container).setActiveIndex(2);
      await waitForMicrotask();
      const input = getInput(container);
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
      await waitForMicrotask();
      expect(getRoot(container).getActiveIndex()).toBe(0);
    });

    it('End goes to last item', async () => {
      const container = createCombobox();
      await waitForMicrotask();
      getRoot(container).setOpen(true);
      await waitForMicrotask();
      const input = getInput(container);
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
      await waitForMicrotask();
      expect(getRoot(container).getActiveIndex()).toBe(2);
    });

    it('Enter selects highlighted item', async () => {
      const container = createCombobox();
      await waitForMicrotask();
      const onValueChange = vi.fn();
      getRoot(container).onValueChange = onValueChange;
      getRoot(container).setOpen(true);
      getRoot(container).setActiveIndex(1);
      await waitForMicrotask();
      const input = getInput(container);
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await waitForMicrotask();
      expect(onValueChange).toHaveBeenCalledWith('banana', expect.any(Object));
    });

    it('Escape closes popup', async () => {
      const container = createCombobox();
      await waitForMicrotask();
      getRoot(container).setOpen(true);
      await waitForMicrotask();
      const input = getInput(container);
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await waitForMicrotask();
      expect(getRoot(container).isOpen()).toBe(false);
    });

    it('does not open when disabled', async () => {
      const container = createCombobox({ disabled: true });
      await waitForMicrotask();
      const input = getInput(container);
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      await waitForMicrotask();
      expect(getRoot(container).isOpen()).toBe(false);
    });

    it('sets disabled attribute on input when root is disabled', async () => {
      const container = createCombobox({ disabled: true });
      await waitForMicrotask();
      expect(getInput(container)).toHaveAttribute('disabled');
    });

    it('sets readonly attribute when readOnly', async () => {
      const container = createCombobox({ readOnly: true });
      await waitForMicrotask();
      expect(getInput(container)).toHaveAttribute('readonly');
    });

    it('calls onInputValueChange on input', async () => {
      const container = createCombobox();
      await waitForMicrotask();
      const onInputValueChange = vi.fn();
      getRoot(container).onInputValueChange = onInputValueChange;
      const input = getInput(container);
      // Simulate typing
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
      )!.set!.call(input, 'app');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await waitForMicrotask();
      expect(onInputValueChange).toHaveBeenCalledWith('app');
    });

    it('opens popup on input', async () => {
      const container = createCombobox();
      await waitForMicrotask();
      const input = getInput(container);
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
      )!.set!.call(input, 'a');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await waitForMicrotask();
      expect(getRoot(container).isOpen()).toBe(true);
    });

    it('is an instance of ComboboxInputElement', () => {
      const container = createCombobox();
      expect(getComboboxInput(container)).toBeInstanceOf(ComboboxInputElement);
    });

    it('sets aria-activedescendant when item is highlighted', async () => {
      const container = createCombobox();
      await waitForMicrotask();
      getRoot(container).setOpen(true);
      getRoot(container).setActiveIndex(0);
      await waitForMicrotask();
      const input = getInput(container);
      expect(input).toHaveAttribute('aria-activedescendant');
      const itemId = getItems(container)[0].id;
      expect(input.getAttribute('aria-activedescendant')).toBe(itemId);
    });
  });

  describe('Trigger', () => {
    it('has role=button', async () => {
      const container = createCombobox();
      await waitForMicrotask();
      expect(getTrigger(container)).toHaveAttribute('role', 'button');
    });

    it('toggles popup on click', async () => {
      const container = createCombobox();
      await waitForMicrotask();
      expect(getRoot(container).isOpen()).toBe(false);
      getTrigger(container).click();
      await waitForMicrotask();
      expect(getRoot(container).isOpen()).toBe(true);
      getTrigger(container).click();
      await waitForMicrotask();
      expect(getRoot(container).isOpen()).toBe(false);
    });

    it('does not toggle when disabled', async () => {
      const container = createCombobox({ disabled: true });
      await waitForMicrotask();
      getTrigger(container).click();
      await waitForMicrotask();
      expect(getRoot(container).isOpen()).toBe(false);
    });

    it('calls onOpenChange', async () => {
      const container = createCombobox();
      await waitForMicrotask();
      const onOpenChange = vi.fn();
      getRoot(container).onOpenChange = onOpenChange;
      getTrigger(container).click();
      await waitForMicrotask();
      expect(onOpenChange).toHaveBeenCalledWith(true);
    });

    it('is an instance of ComboboxTriggerElement', () => {
      const container = createCombobox();
      expect(getTrigger(container)).toBeInstanceOf(ComboboxTriggerElement);
    });
  });

  describe('Popup', () => {
    it('has role=listbox', async () => {
      const container = createCombobox();
      await waitForMicrotask();
      expect(getPopup(container)).toHaveAttribute('role', 'listbox');
    });

    it('is hidden when closed', async () => {
      const container = createCombobox();
      await waitForMicrotask();
      expect(getPopup(container)).toHaveAttribute('hidden');
    });

    it('is visible when open', async () => {
      const container = createCombobox();
      await waitForMicrotask();
      getRoot(container).setOpen(true);
      await waitForMicrotask();
      expect(getPopup(container)).not.toHaveAttribute('hidden');
    });

    it('sets aria-multiselectable for multiple mode', async () => {
      const container = createCombobox({ multiple: true });
      await waitForMicrotask();
      expect(getPopup(container)).toHaveAttribute(
        'aria-multiselectable',
        'true',
      );
    });

    it('is an instance of ComboboxPopupElement', () => {
      const container = createCombobox();
      expect(getPopup(container)).toBeInstanceOf(ComboboxPopupElement);
    });
  });

  describe('Item', () => {
    it('has role=option', async () => {
      const container = createCombobox();
      await waitForMicrotask();
      expect(getItems(container)[0]).toHaveAttribute('role', 'option');
    });

    it('sets aria-selected when selected', async () => {
      const container = createCombobox({ defaultValue: 'apple' });
      await waitForMicrotask();
      expect(getItems(container)[0]).toHaveAttribute('aria-selected', 'true');
      expect(getItems(container)[1]).toHaveAttribute('aria-selected', 'false');
    });

    it('sets data-selected when selected', async () => {
      const container = createCombobox({ defaultValue: 'apple' });
      await waitForMicrotask();
      expect(getItems(container)[0]).toHaveAttribute('data-selected');
      expect(getItems(container)[1]).not.toHaveAttribute('data-selected');
    });

    it('sets data-highlighted on active index', async () => {
      const container = createCombobox();
      await waitForMicrotask();
      getRoot(container).setActiveIndex(1);
      await waitForMicrotask();
      expect(getItems(container)[0]).not.toHaveAttribute('data-highlighted');
      expect(getItems(container)[1]).toHaveAttribute('data-highlighted');
    });

    it('sets data-disabled when disabled', async () => {
      const container = createCombobox({
        items: [
          { value: 'apple', label: 'Apple', disabled: true },
          { value: 'banana', label: 'Banana' },
        ],
      });
      await waitForMicrotask();
      expect(getItems(container)[0]).toHaveAttribute('data-disabled');
    });

    it('selects on click', async () => {
      const container = createCombobox();
      await waitForMicrotask();
      const onValueChange = vi.fn();
      getRoot(container).onValueChange = onValueChange;
      getItems(container)[1].click();
      await waitForMicrotask();
      expect(onValueChange).toHaveBeenCalledWith('banana', expect.any(Object));
    });

    it('closes popup after single select', async () => {
      const container = createCombobox();
      await waitForMicrotask();
      getRoot(container).setOpen(true);
      await waitForMicrotask();
      getItems(container)[0].click();
      await waitForMicrotask();
      expect(getRoot(container).isOpen()).toBe(false);
    });

    it('stays open after multiple select', async () => {
      const container = createCombobox({ multiple: true });
      await waitForMicrotask();
      getRoot(container).setOpen(true);
      await waitForMicrotask();
      getItems(container)[0].click();
      await waitForMicrotask();
      expect(getRoot(container).isOpen()).toBe(true);
    });

    it('does not select when disabled', async () => {
      const container = createCombobox({
        items: [
          { value: 'apple', label: 'Apple', disabled: true },
          { value: 'banana', label: 'Banana' },
        ],
      });
      await waitForMicrotask();
      const onValueChange = vi.fn();
      getRoot(container).onValueChange = onValueChange;
      getItems(container)[0].click();
      await waitForMicrotask();
      expect(onValueChange).not.toHaveBeenCalled();
    });

    it('highlights on pointer enter', async () => {
      const container = createCombobox();
      await waitForMicrotask();
      getItems(container)[2].dispatchEvent(
        new PointerEvent('pointerenter', { bubbles: true }),
      );
      await waitForMicrotask();
      expect(getRoot(container).getActiveIndex()).toBe(2);
    });

    it('is an instance of ComboboxItemElement', () => {
      const container = createCombobox();
      expect(getItems(container)[0]).toBeInstanceOf(ComboboxItemElement);
    });
  });

  describe('Multiple selection', () => {
    it('toggles items in array', async () => {
      const container = createCombobox({ multiple: true });
      await waitForMicrotask();
      getItems(container)[0].click();
      await waitForMicrotask();
      expect(getRoot(container).getValue()).toEqual(['apple']);
      getItems(container)[1].click();
      await waitForMicrotask();
      expect(getRoot(container).getValue()).toEqual(['apple', 'banana']);
      getItems(container)[0].click();
      await waitForMicrotask();
      expect(getRoot(container).getValue()).toEqual(['banana']);
    });

    it('displays multiple values', async () => {
      const container = createCombobox({ multiple: true });
      await waitForMicrotask();
      getItems(container)[0].click();
      getItems(container)[1].click();
      await waitForMicrotask();
      expect(getValue(container).textContent).toBe('Apple, Banana');
    });
  });

  describe('Input value', () => {
    it('updates input value programmatically', async () => {
      const container = createCombobox();
      await waitForMicrotask();
      getRoot(container).setInputValue('test');
      await waitForMicrotask();
      expect(getInput(container).value).toBe('test');
    });

    it('sets controlled inputValue', async () => {
      const container = createCombobox();
      await waitForMicrotask();
      getRoot(container).inputValue = 'controlled';
      await waitForMicrotask();
      expect(getRoot(container).getInputValue()).toBe('controlled');
    });

    it('updates input to selected item label on select (single)', async () => {
      const container = createCombobox();
      await waitForMicrotask();
      getRoot(container).setOpen(true);
      await waitForMicrotask();
      getItems(container)[1].click();
      await waitForMicrotask();
      expect(getInput(container).value).toBe('Banana');
    });
  });

  describe('Value display', () => {
    it('shows placeholder when no value', async () => {
      const container = createCombobox();
      await waitForMicrotask();
      const valueEl = getValue(container);
      valueEl.placeholder = 'Select fruit...';
      // Force a state change to trigger re-sync
      getRoot(container).setInputValue('x');
      await waitForMicrotask();
      getRoot(container).setInputValue('');
      await waitForMicrotask();
      expect(valueEl.textContent).toBe('Select fruit...');
    });

    it('shows selected item label', async () => {
      const container = createCombobox({ defaultValue: 'cherry' });
      await waitForMicrotask();
      expect(getValue(container).textContent).toBe('Cherry');
    });

    it('is an instance of ComboboxValueElement', () => {
      const container = createCombobox();
      expect(getValue(container)).toBeInstanceOf(ComboboxValueElement);
    });
  });

  describe('Icon', () => {
    it('has aria-hidden=true', async () => {
      const container = createCombobox();
      await waitForMicrotask();
      expect(getIcon(container)).toHaveAttribute('aria-hidden', 'true');
    });

    it('sets data-open when popup is open', async () => {
      const container = createCombobox();
      await waitForMicrotask();
      expect(getIcon(container)).not.toHaveAttribute('data-open');
      getRoot(container).setOpen(true);
      await waitForMicrotask();
      expect(getIcon(container)).toHaveAttribute('data-open');
    });

    it('is an instance of ComboboxIconElement', () => {
      const container = createCombobox();
      expect(getIcon(container)).toBeInstanceOf(ComboboxIconElement);
    });
  });

  describe('Item Indicator', () => {
    it('is hidden when item is not selected', async () => {
      const container = createCombobox();
      await waitForMicrotask();
      const indicators = container.querySelectorAll('combobox-item-indicator');
      expect(indicators[0]).toHaveAttribute('hidden');
    });

    it('is visible when item is selected', async () => {
      const container = createCombobox({ defaultValue: 'apple' });
      await waitForMicrotask();
      const indicators = container.querySelectorAll('combobox-item-indicator');
      expect(indicators[0]).not.toHaveAttribute('hidden');
    });

    it('is an instance of ComboboxItemIndicatorElement', () => {
      const container = createCombobox();
      const indicator = container.querySelector('combobox-item-indicator');
      expect(indicator).toBeInstanceOf(ComboboxItemIndicatorElement);
    });
  });

  describe('Item Text', () => {
    it('is an instance of ComboboxItemTextElement', () => {
      const container = createCombobox();
      const text = container.querySelector('combobox-item-text');
      expect(text).toBeInstanceOf(ComboboxItemTextElement);
    });
  });

  describe('Group', () => {
    it('has role=group', async () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <combobox-root>
          <combobox-popup>
            <combobox-group>
              <combobox-group-label>Fruits</combobox-group-label>
              <combobox-item><combobox-item-text>Apple</combobox-item-text></combobox-item>
            </combobox-group>
          </combobox-popup>
        </combobox-root>
      `;
      document.body.appendChild(container);
      await waitForMicrotask();
      const group = container.querySelector(
        'combobox-group',
      ) as ComboboxGroupElement;
      expect(group).toHaveAttribute('role', 'group');
    });

    it('is an instance of ComboboxGroupElement', async () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <combobox-root>
          <combobox-popup>
            <combobox-group>
              <combobox-group-label>Fruits</combobox-group-label>
            </combobox-group>
          </combobox-popup>
        </combobox-root>
      `;
      document.body.appendChild(container);
      const group = container.querySelector('combobox-group');
      expect(group).toBeInstanceOf(ComboboxGroupElement);
    });
  });

  describe('Group Label', () => {
    it('auto-generates an id', async () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <combobox-root>
          <combobox-popup>
            <combobox-group>
              <combobox-group-label>Fruits</combobox-group-label>
            </combobox-group>
          </combobox-popup>
        </combobox-root>
      `;
      document.body.appendChild(container);
      await waitForMicrotask();
      const label = container.querySelector('combobox-group-label');
      expect(label!.id).toMatch(/^base-ui-combobox-group-label-/);
    });

    it('has aria-hidden=true', async () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <combobox-root>
          <combobox-popup>
            <combobox-group>
              <combobox-group-label>Fruits</combobox-group-label>
            </combobox-group>
          </combobox-popup>
        </combobox-root>
      `;
      document.body.appendChild(container);
      await waitForMicrotask();
      expect(
        container.querySelector('combobox-group-label'),
      ).toHaveAttribute('aria-hidden', 'true');
    });

    it('is an instance of ComboboxGroupLabelElement', async () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <combobox-root>
          <combobox-popup>
            <combobox-group>
              <combobox-group-label>Fruits</combobox-group-label>
            </combobox-group>
          </combobox-popup>
        </combobox-root>
      `;
      document.body.appendChild(container);
      const label = container.querySelector('combobox-group-label');
      expect(label).toBeInstanceOf(ComboboxGroupLabelElement);
    });
  });

  describe('Clear', () => {
    it('has role=button', async () => {
      const container = createCombobox();
      await waitForMicrotask();
      expect(getClear(container)).toHaveAttribute('role', 'button');
    });

    it('clears value on click', async () => {
      const container = createCombobox({ defaultValue: 'apple' });
      await waitForMicrotask();
      expect(getRoot(container).getValue()).toBe('apple');
      getClear(container).click();
      await waitForMicrotask();
      expect(getRoot(container).getValue()).toBe(null);
    });

    it('clears input value on click', async () => {
      const container = createCombobox();
      await waitForMicrotask();
      getRoot(container).setInputValue('test');
      await waitForMicrotask();
      expect(getInput(container).value).toBe('test');
      getClear(container).click();
      await waitForMicrotask();
      expect(getInput(container).value).toBe('');
    });

    it('does not clear when disabled', async () => {
      const container = createCombobox({ disabled: true, defaultValue: 'apple' });
      await waitForMicrotask();
      getClear(container).click();
      await waitForMicrotask();
      expect(getRoot(container).getValue()).toBe('apple');
    });

    it('is an instance of ComboboxClearElement', () => {
      const container = createCombobox();
      expect(getClear(container)).toBeInstanceOf(ComboboxClearElement);
    });
  });

  describe('Empty', () => {
    it('is hidden when items exist', async () => {
      const container = createCombobox();
      await waitForMicrotask();
      getRoot(container).setOpen(true);
      await waitForMicrotask();
      expect(getEmpty(container)).toHaveAttribute('hidden');
    });

    it('is visible when no enabled items and popup is open', async () => {
      const container = createCombobox({ items: [] });
      await waitForMicrotask();
      getRoot(container).setOpen(true);
      await waitForMicrotask();
      expect(getEmpty(container)).not.toHaveAttribute('hidden');
    });

    it('is an instance of ComboboxEmptyElement', () => {
      const container = createCombobox();
      expect(getEmpty(container)).toBeInstanceOf(ComboboxEmptyElement);
    });
  });

  describe('Auto-highlight', () => {
    it('highlights first item when popup opens with autoHighlight=true', async () => {
      const container = createCombobox({ autoHighlight: true });
      await waitForMicrotask();
      getRoot(container).setOpen(true);
      await waitForMicrotask();
      expect(getRoot(container).getActiveIndex()).toBe(0);
    });

    it('does not auto-highlight when autoHighlight=false', async () => {
      const container = createCombobox({ autoHighlight: false });
      await waitForMicrotask();
      getRoot(container).setOpen(true);
      await waitForMicrotask();
      expect(getRoot(container).getActiveIndex()).toBe(-1);
    });
  });

  describe('Error handling', () => {
    it('logs error when child is outside root', async () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const container = document.createElement('div');
      container.innerHTML = '<combobox-input></combobox-input>';
      document.body.appendChild(container);
      await waitForMicrotask();
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('must be placed within'),
      );
      spy.mockRestore();
    });
  });

  describe('Integration', () => {
    it('full cycle: type, navigate, select, close', async () => {
      const container = createCombobox();
      await waitForMicrotask();
      const input = getInput(container);

      // Open via typing
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
      )!.set!.call(input, 'b');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await waitForMicrotask();
      expect(getRoot(container).isOpen()).toBe(true);

      // Navigate to second item
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      await waitForMicrotask();
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      await waitForMicrotask();

      // Select with Enter
      const onValueChange = vi.fn();
      getRoot(container).onValueChange = onValueChange;
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await waitForMicrotask();
      expect(onValueChange).toHaveBeenCalled();

      // Popup should close for single select
      expect(getRoot(container).isOpen()).toBe(false);
    });
  });

  describe('Cleanup', () => {
    it('cleans up on disconnect', async () => {
      const container = createCombobox();
      await waitForMicrotask();
      container.remove();
      // Should not throw
      expect(true).toBe(true);
    });
  });
});
