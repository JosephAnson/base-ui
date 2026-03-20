import { afterEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

import {
  SelectRootElement,
  SelectTriggerElement,
  SelectValueElement,
  SelectIconElement,
  SelectPopupElement,
  SelectItemElement,
  SelectItemIndicatorElement,
  SelectItemTextElement,
  SelectGroupElement,
  SelectGroupLabelElement,
} from './index.ts';

function createSelect(opts: {
  defaultValue?: unknown;
  value?: unknown;
  disabled?: boolean;
  required?: boolean;
  multiple?: boolean;
  items?: Array<{ value: string; label: string; disabled?: boolean }>;
  onValueChange?: (value: unknown, details: any) => void;
  onOpenChange?: (open: boolean) => void;
  placeholder?: string;
} = {}): HTMLElement {
  const container = document.createElement('div');

  const root = document.createElement('select-root') as SelectRootElement;
  if (opts.defaultValue !== undefined) root.defaultValue = opts.defaultValue;
  if (opts.disabled !== undefined) root.disabled = opts.disabled;
  if (opts.required !== undefined) root.required = opts.required;
  if (opts.multiple !== undefined) root.multiple = opts.multiple;
  if (opts.onValueChange !== undefined) root.onValueChange = opts.onValueChange;
  if (opts.onOpenChange !== undefined) root.onOpenChange = opts.onOpenChange;

  const trigger = document.createElement('select-trigger') as SelectTriggerElement;
  const valueEl = document.createElement('select-value') as SelectValueElement;
  if (opts.placeholder) valueEl.placeholder = opts.placeholder;
  trigger.appendChild(valueEl);
  root.appendChild(trigger);

  const popup = document.createElement('select-popup') as SelectPopupElement;
  const items = opts.items ?? [
    { value: 'apple', label: 'Apple' },
    { value: 'banana', label: 'Banana' },
    { value: 'cherry', label: 'Cherry' },
  ];

  for (const item of items) {
    const itemEl = document.createElement('select-item') as SelectItemElement;
    itemEl.value = item.value;
    if (item.disabled) itemEl.disabled = true;
    const textEl = document.createElement('select-item-text') as SelectItemTextElement;
    textEl.textContent = item.label;
    itemEl.appendChild(textEl);
    popup.appendChild(itemEl);
  }

  root.appendChild(popup);
  container.appendChild(root);
  document.body.appendChild(container);

  if (opts.value !== undefined) {
    root.value = opts.value;
  }

  return container;
}

function getRoot(container: HTMLElement): SelectRootElement {
  return container.querySelector('select-root')!;
}

function getTrigger(container: HTMLElement): SelectTriggerElement {
  return container.querySelector('select-trigger')!;
}

function getValue(container: HTMLElement): SelectValueElement {
  return container.querySelector('select-value')!;
}

function getPopup(container: HTMLElement): SelectPopupElement {
  return container.querySelector('select-popup')!;
}

function getItems(container: HTMLElement): SelectItemElement[] {
  return Array.from(container.querySelectorAll('select-item'));
}

async function waitForMicrotask() {
  await new Promise((r) => queueMicrotask(r));
}

describe('Select', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  // ─── Root ──────────────────────────────────────────────────────────────────────

  describe('Root', () => {
    it('renders with display:contents', () => {
      const container = createSelect();
      expect(getRoot(container).style.display).toBe('contents');
    });

    it('is an instance of SelectRootElement', () => {
      const container = createSelect();
      expect(getRoot(container)).toBeInstanceOf(SelectRootElement);
    });

    it('sets data-disabled when disabled', async () => {
      const container = createSelect({ disabled: true });
      await waitForMicrotask();
      expect(getRoot(container)).toHaveAttribute('data-disabled');
    });

    it('sets data-required when required', async () => {
      const container = createSelect({ required: true });
      await waitForMicrotask();
      expect(getRoot(container)).toHaveAttribute('data-required');
    });

    it('starts closed', async () => {
      const container = createSelect();
      await waitForMicrotask();
      expect(getRoot(container).isOpen()).toBe(false);
    });
  });

  // ─── Default Value ─────────────────────────────────────────────────────────────

  describe('prop: defaultValue', () => {
    it('accepts a value', async () => {
      const container = createSelect({ defaultValue: 'banana' });
      await waitForMicrotask();
      const valueEl = getValue(container);
      expect(valueEl.textContent).toBe('Banana');
    });

    it('defaults to null (placeholder shown)', async () => {
      const container = createSelect({ placeholder: 'Choose...' });
      await waitForMicrotask();
      const valueEl = getValue(container);
      expect(valueEl.textContent).toBe('Choose...');
      expect(valueEl).toHaveAttribute('data-placeholder');
    });
  });

  // ─── Controlled Value ──────────────────────────────────────────────────────────

  describe('prop: value', () => {
    it('accepts a controlled value', async () => {
      const container = createSelect({ value: 'cherry' });
      await waitForMicrotask();
      expect(getValue(container).textContent).toBe('Cherry');
    });

    it('updates when value changes', async () => {
      const container = createSelect({ value: 'apple' });
      await waitForMicrotask();
      expect(getValue(container).textContent).toBe('Apple');

      getRoot(container).value = 'banana';
      await waitForMicrotask();
      expect(getValue(container).textContent).toBe('Banana');
    });
  });

  // ─── Trigger ───────────────────────────────────────────────────────────────────

  describe('Trigger', () => {
    it('has role=combobox', async () => {
      const container = createSelect();
      await waitForMicrotask();
      expect(getTrigger(container).getAttribute('role')).toBe('combobox');
    });

    it('has aria-haspopup=listbox', async () => {
      const container = createSelect();
      await waitForMicrotask();
      expect(getTrigger(container).getAttribute('aria-haspopup')).toBe('listbox');
    });

    it('has aria-expanded=false when closed', async () => {
      const container = createSelect();
      await waitForMicrotask();
      expect(getTrigger(container).getAttribute('aria-expanded')).toBe('false');
    });

    it('has tabindex=0', async () => {
      const container = createSelect();
      await waitForMicrotask();
      expect(getTrigger(container).getAttribute('tabindex')).toBe('0');
    });

    it('opens popup on click', async () => {
      const container = createSelect();
      await waitForMicrotask();
      getTrigger(container).dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(getRoot(container).isOpen()).toBe(true);
      expect(getTrigger(container).getAttribute('aria-expanded')).toBe('true');
    });

    it('toggles popup on click', async () => {
      const container = createSelect();
      await waitForMicrotask();
      const trigger = getTrigger(container);

      trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(getRoot(container).isOpen()).toBe(true);

      trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(getRoot(container).isOpen()).toBe(false);
    });

    it('opens on Enter key', async () => {
      const container = createSelect();
      await waitForMicrotask();
      getTrigger(container).dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      );
      expect(getRoot(container).isOpen()).toBe(true);
    });

    it('opens on Space key', async () => {
      const container = createSelect();
      await waitForMicrotask();
      getTrigger(container).dispatchEvent(
        new KeyboardEvent('keydown', { key: ' ', bubbles: true }),
      );
      expect(getRoot(container).isOpen()).toBe(true);
    });

    it('opens on ArrowDown and sets active to first item', async () => {
      const container = createSelect();
      await waitForMicrotask();
      getTrigger(container).dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
      );
      expect(getRoot(container).isOpen()).toBe(true);
      expect(getRoot(container).getActiveIndex()).toBe(0);
    });

    it('does not open when disabled', async () => {
      const container = createSelect({ disabled: true });
      await waitForMicrotask();
      getTrigger(container).dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(getRoot(container).isOpen()).toBe(false);
    });

    it('calls onOpenChange', async () => {
      const onOpenChange = vi.fn();
      const container = createSelect({ onOpenChange });
      await waitForMicrotask();
      getTrigger(container).dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(onOpenChange).toHaveBeenCalledWith(true);
    });

    it('is an instance of SelectTriggerElement', () => {
      const container = createSelect();
      expect(getTrigger(container)).toBeInstanceOf(SelectTriggerElement);
    });

    it('has aria-controls when open', async () => {
      const container = createSelect();
      await waitForMicrotask();
      const trigger = getTrigger(container);
      const popup = getPopup(container);

      trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await waitForMicrotask();

      expect(trigger.getAttribute('aria-controls')).toBe(popup.id);
    });
  });

  // ─── Popup ─────────────────────────────────────────────────────────────────────

  describe('Popup', () => {
    it('has role=listbox', async () => {
      const container = createSelect();
      await waitForMicrotask();
      expect(getPopup(container).getAttribute('role')).toBe('listbox');
    });

    it('is hidden when closed', async () => {
      const container = createSelect();
      await waitForMicrotask();
      expect(getPopup(container)).toHaveAttribute('hidden');
    });

    it('is visible when open', async () => {
      const container = createSelect();
      await waitForMicrotask();
      getTrigger(container).dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await waitForMicrotask();
      expect(getPopup(container)).not.toHaveAttribute('hidden');
      expect(getPopup(container)).toHaveAttribute('data-open');
    });

    it('sets aria-multiselectable for multiple mode', async () => {
      const container = createSelect({ multiple: true });
      await waitForMicrotask();
      expect(getPopup(container).getAttribute('aria-multiselectable')).toBe('true');
    });

    it('navigates items with ArrowDown', async () => {
      const container = createSelect();
      await waitForMicrotask();
      getTrigger(container).dispatchEvent(new MouseEvent('click', { bubbles: true }));

      getPopup(container).dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
      );
      expect(getRoot(container).getActiveIndex()).toBe(0);

      getPopup(container).dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
      );
      expect(getRoot(container).getActiveIndex()).toBe(1);
    });

    it('navigates items with ArrowUp', async () => {
      const container = createSelect();
      await waitForMicrotask();
      getTrigger(container).dispatchEvent(new MouseEvent('click', { bubbles: true }));

      getPopup(container).dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }),
      );
      // Wraps to last item
      expect(getRoot(container).getActiveIndex()).toBe(2);
    });

    it('Home goes to first item', async () => {
      const container = createSelect();
      await waitForMicrotask();
      getTrigger(container).dispatchEvent(new MouseEvent('click', { bubbles: true }));
      getRoot(container).setActiveIndex(2);

      getPopup(container).dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Home', bubbles: true }),
      );
      expect(getRoot(container).getActiveIndex()).toBe(0);
    });

    it('End goes to last item', async () => {
      const container = createSelect();
      await waitForMicrotask();
      getTrigger(container).dispatchEvent(new MouseEvent('click', { bubbles: true }));

      getPopup(container).dispatchEvent(
        new KeyboardEvent('keydown', { key: 'End', bubbles: true }),
      );
      expect(getRoot(container).getActiveIndex()).toBe(2);
    });

    it('Enter selects highlighted item', async () => {
      const onValueChange = vi.fn();
      const container = createSelect({ onValueChange });
      await waitForMicrotask();
      getTrigger(container).dispatchEvent(new MouseEvent('click', { bubbles: true }));
      getRoot(container).setActiveIndex(1);

      getPopup(container).dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      );

      expect(onValueChange).toHaveBeenCalledWith('banana', expect.anything());
    });

    it('Escape closes popup', async () => {
      const container = createSelect();
      await waitForMicrotask();
      getTrigger(container).dispatchEvent(new MouseEvent('click', { bubbles: true }));

      getPopup(container).dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );

      expect(getRoot(container).isOpen()).toBe(false);
    });

    it('is an instance of SelectPopupElement', () => {
      const container = createSelect();
      expect(getPopup(container)).toBeInstanceOf(SelectPopupElement);
    });
  });

  // ─── Item ──────────────────────────────────────────────────────────────────────

  describe('Item', () => {
    it('has role=option', async () => {
      const container = createSelect();
      await waitForMicrotask();
      expect(getItems(container)[0].getAttribute('role')).toBe('option');
    });

    it('sets aria-selected when selected', async () => {
      const container = createSelect({ defaultValue: 'banana' });
      await waitForMicrotask();
      const items = getItems(container);
      expect(items[0].getAttribute('aria-selected')).toBe('false');
      expect(items[1].getAttribute('aria-selected')).toBe('true');
    });

    it('sets data-selected when selected', async () => {
      const container = createSelect({ defaultValue: 'banana' });
      await waitForMicrotask();
      expect(getItems(container)[1]).toHaveAttribute('data-selected');
    });

    it('sets data-highlighted on active index', async () => {
      const container = createSelect();
      await waitForMicrotask();
      getRoot(container).setActiveIndex(0);
      await waitForMicrotask();
      expect(getItems(container)[0]).toHaveAttribute('data-highlighted');
      expect(getItems(container)[1]).not.toHaveAttribute('data-highlighted');
    });

    it('sets data-disabled when disabled', async () => {
      const container = createSelect({
        items: [
          { value: 'a', label: 'A', disabled: true },
          { value: 'b', label: 'B' },
        ],
      });
      await waitForMicrotask();
      expect(getItems(container)[0]).toHaveAttribute('data-disabled');
    });

    it('selects on click', async () => {
      const onValueChange = vi.fn();
      const container = createSelect({ onValueChange });
      await waitForMicrotask();
      getTrigger(container).dispatchEvent(new MouseEvent('click', { bubbles: true }));

      getItems(container)[2].dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(onValueChange).toHaveBeenCalledWith('cherry', expect.anything());
    });

    it('closes popup after single select', async () => {
      const container = createSelect();
      await waitForMicrotask();
      getTrigger(container).dispatchEvent(new MouseEvent('click', { bubbles: true }));

      getItems(container)[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(getRoot(container).isOpen()).toBe(false);
    });

    it('stays open after multiple select', async () => {
      const container = createSelect({ multiple: true });
      await waitForMicrotask();
      getTrigger(container).dispatchEvent(new MouseEvent('click', { bubbles: true }));

      getItems(container)[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(getRoot(container).isOpen()).toBe(true);
    });

    it('does not select when disabled', async () => {
      const onValueChange = vi.fn();
      const container = createSelect({
        items: [
          { value: 'a', label: 'A', disabled: true },
          { value: 'b', label: 'B' },
        ],
        onValueChange,
      });
      await waitForMicrotask();
      getTrigger(container).dispatchEvent(new MouseEvent('click', { bubbles: true }));

      getItems(container)[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(onValueChange).not.toHaveBeenCalled();
    });

    it('highlights on pointer enter', async () => {
      const container = createSelect();
      await waitForMicrotask();
      getTrigger(container).dispatchEvent(new MouseEvent('click', { bubbles: true }));

      getItems(container)[1].dispatchEvent(
        new PointerEvent('pointerenter', { bubbles: true }),
      );
      await waitForMicrotask();

      expect(getItems(container)[1]).toHaveAttribute('data-highlighted');
    });

    it('is an instance of SelectItemElement', () => {
      const container = createSelect();
      expect(getItems(container)[0]).toBeInstanceOf(SelectItemElement);
    });
  });

  // ─── Multiple Selection ────────────────────────────────────────────────────────

  describe('multiple selection', () => {
    it('toggles items in array', async () => {
      const onValueChange = vi.fn();
      const container = createSelect({ multiple: true, defaultValue: [], onValueChange });
      await waitForMicrotask();
      getTrigger(container).dispatchEvent(new MouseEvent('click', { bubbles: true }));

      getItems(container)[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(onValueChange).toHaveBeenCalledWith(['apple'], expect.anything());

      // Second click on same item should deselect
      getItems(container)[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(onValueChange).toHaveBeenCalledWith([], expect.anything());
    });

    it('displays multiple values', async () => {
      const container = createSelect({ multiple: true, value: ['apple', 'cherry'] });
      await waitForMicrotask();
      const valueEl = getValue(container);
      expect(valueEl.textContent).toBe('Apple, Cherry');
    });
  });

  // ─── Value Display ─────────────────────────────────────────────────────────────

  describe('Value', () => {
    it('shows placeholder when no value', async () => {
      const container = createSelect({ placeholder: 'Pick one' });
      await waitForMicrotask();
      expect(getValue(container).textContent).toBe('Pick one');
    });

    it('shows selected item label', async () => {
      const container = createSelect({ defaultValue: 'apple' });
      await waitForMicrotask();
      expect(getValue(container).textContent).toBe('Apple');
    });

    it('uses custom formatValue', async () => {
      const container = createSelect({ defaultValue: 'apple' });
      await waitForMicrotask();
      const valueEl = getValue(container);
      valueEl.formatValue = (v: unknown) => `Selected: ${v}`;
      // Change to different value then back to trigger state change
      getRoot(container).value = 'banana';
      await waitForMicrotask();
      expect(valueEl.textContent).toBe('Selected: banana');
    });

    it('is an instance of SelectValueElement', () => {
      const container = createSelect();
      expect(getValue(container)).toBeInstanceOf(SelectValueElement);
    });
  });

  // ─── Icon ──────────────────────────────────────────────────────────────────────

  describe('Icon', () => {
    it('has aria-hidden=true', () => {
      const container = document.createElement('div');
      const root = document.createElement('select-root') as SelectRootElement;
      const icon = document.createElement('select-icon') as SelectIconElement;
      root.appendChild(icon);
      container.appendChild(root);
      document.body.appendChild(container);

      expect(icon.getAttribute('aria-hidden')).toBe('true');
    });

    it('is an instance of SelectIconElement', () => {
      const container = document.createElement('div');
      const root = document.createElement('select-root') as SelectRootElement;
      const icon = document.createElement('select-icon') as SelectIconElement;
      root.appendChild(icon);
      container.appendChild(root);
      document.body.appendChild(container);

      expect(icon).toBeInstanceOf(SelectIconElement);
    });
  });

  // ─── ItemIndicator ─────────────────────────────────────────────────────────────

  describe('ItemIndicator', () => {
    it('is hidden when item is not selected', async () => {
      const container = createSelect({ defaultValue: 'banana' });
      await waitForMicrotask();

      const firstItem = getItems(container)[0];
      const indicator = document.createElement('select-item-indicator') as SelectItemIndicatorElement;
      firstItem.appendChild(indicator);
      await waitForMicrotask();

      expect(indicator).toHaveAttribute('hidden');
    });

    it('is visible when item is selected', async () => {
      const container = createSelect({ defaultValue: 'banana' });
      await waitForMicrotask();

      const secondItem = getItems(container)[1];
      const indicator = document.createElement('select-item-indicator') as SelectItemIndicatorElement;
      secondItem.appendChild(indicator);
      await waitForMicrotask();

      expect(indicator).not.toHaveAttribute('hidden');
      expect(indicator).toHaveAttribute('data-selected');
    });

    it('is an instance of SelectItemIndicatorElement', () => {
      const container = createSelect();
      const item = getItems(container)[0];
      const indicator = document.createElement('select-item-indicator') as SelectItemIndicatorElement;
      item.appendChild(indicator);
      expect(indicator).toBeInstanceOf(SelectItemIndicatorElement);
    });
  });

  // ─── ItemText ──────────────────────────────────────────────────────────────────

  describe('ItemText', () => {
    it('is an instance of SelectItemTextElement', () => {
      const container = createSelect();
      const text = getItems(container)[0].querySelector('select-item-text')!;
      expect(text).toBeInstanceOf(SelectItemTextElement);
    });
  });

  // ─── Group ─────────────────────────────────────────────────────────────────────

  describe('Group', () => {
    it('has role=group', () => {
      const container = document.createElement('div');
      const root = document.createElement('select-root') as SelectRootElement;
      const popup = document.createElement('select-popup') as SelectPopupElement;
      const group = document.createElement('select-group') as SelectGroupElement;
      popup.appendChild(group);
      root.appendChild(popup);
      container.appendChild(root);
      document.body.appendChild(container);

      expect(group.getAttribute('role')).toBe('group');
    });

    it('is an instance of SelectGroupElement', () => {
      const container = document.createElement('div');
      const root = document.createElement('select-root') as SelectRootElement;
      const group = document.createElement('select-group') as SelectGroupElement;
      root.appendChild(group);
      container.appendChild(root);
      document.body.appendChild(container);

      expect(group).toBeInstanceOf(SelectGroupElement);
    });
  });

  // ─── GroupLabel ────────────────────────────────────────────────────────────────

  describe('GroupLabel', () => {
    it('auto-generates an id', () => {
      const container = document.createElement('div');
      const root = document.createElement('select-root') as SelectRootElement;
      const label = document.createElement('select-group-label') as SelectGroupLabelElement;
      root.appendChild(label);
      container.appendChild(root);
      document.body.appendChild(container);

      expect(label.id).toBeTruthy();
      expect(label.id).toContain('base-ui-select-group-label');
    });

    it('has aria-hidden=true', () => {
      const container = document.createElement('div');
      const root = document.createElement('select-root') as SelectRootElement;
      const label = document.createElement('select-group-label') as SelectGroupLabelElement;
      root.appendChild(label);
      container.appendChild(root);
      document.body.appendChild(container);

      expect(label.getAttribute('aria-hidden')).toBe('true');
    });

    it('is an instance of SelectGroupLabelElement', () => {
      const container = document.createElement('div');
      const root = document.createElement('select-root') as SelectRootElement;
      const label = document.createElement('select-group-label') as SelectGroupLabelElement;
      root.appendChild(label);
      container.appendChild(root);
      document.body.appendChild(container);

      expect(label).toBeInstanceOf(SelectGroupLabelElement);
    });
  });

  // ─── Error Handling ────────────────────────────────────────────────────────────

  describe('error handling', () => {
    it('logs error when child is outside root', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const container = document.createElement('div');
      const trigger = document.createElement('select-trigger') as SelectTriggerElement;
      container.appendChild(trigger);
      document.body.appendChild(container);

      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('must be placed within <select-root>'),
      );
    });
  });

  // ─── Integration ──────────────────────────────────────────────────────────────

  describe('integration', () => {
    it('full cycle: open, navigate, select, close', async () => {
      const onValueChange = vi.fn();
      const container = createSelect({ placeholder: 'Choose...', onValueChange });
      await waitForMicrotask();

      // Open
      getTrigger(container).dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(getRoot(container).isOpen()).toBe(true);

      // Navigate down
      getPopup(container).dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
      );
      getPopup(container).dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
      );

      // Select with Enter
      getPopup(container).dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      );

      expect(onValueChange).toHaveBeenCalledWith('banana', expect.anything());
      expect(getRoot(container).isOpen()).toBe(false);

      // Value should display
      await waitForMicrotask();
      expect(getValue(container).textContent).toBe('Banana');
    });
  });

  // ─── Cleanup ───────────────────────────────────────────────────────────────────

  describe('cleanup', () => {
    it('cleans up on disconnect', async () => {
      const container = createSelect();
      await waitForMicrotask();
      const root = getRoot(container);
      container.remove();

      expect(() => {
        root.dispatchEvent(new CustomEvent(SELECT_STATE_CHANGE_EVENT));
      }).not.toThrow();
    });
  });
});

const SELECT_STATE_CHANGE_EVENT = 'base-ui-select-state-change';
