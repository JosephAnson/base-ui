import { afterEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

import {
  NumberFieldRootElement,
  NumberFieldGroupElement,
  NumberFieldInputElement,
  NumberFieldIncrementElement,
  NumberFieldDecrementElement,
  NumberFieldScrubAreaElement,
  NumberFieldScrubAreaCursorElement,
} from './index.ts';

function createNumberField(opts: {
  defaultValue?: number | null;
  value?: number | null;
  min?: number;
  max?: number;
  step?: number;
  smallStep?: number;
  largeStep?: number;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  onValueChange?: (value: number | null, details: any) => void;
  onValueCommitted?: (value: number | null, details: any) => void;
  locale?: string;
  format?: Intl.NumberFormatOptions;
} = {}): HTMLElement {
  const container = document.createElement('div');

  const root = document.createElement('number-field-root') as NumberFieldRootElement;
  if (opts.defaultValue !== undefined) root.defaultValue = opts.defaultValue;
  if (opts.min !== undefined) root.min = opts.min;
  if (opts.max !== undefined) root.max = opts.max;
  if (opts.step !== undefined) root.step = opts.step;
  if (opts.smallStep !== undefined) root.smallStep = opts.smallStep;
  if (opts.largeStep !== undefined) root.largeStep = opts.largeStep;
  if (opts.disabled !== undefined) root.disabled = opts.disabled;
  if (opts.readOnly !== undefined) root.readOnly = opts.readOnly;
  if (opts.required !== undefined) root.required = opts.required;
  if (opts.onValueChange !== undefined) root.onValueChange = opts.onValueChange;
  if (opts.onValueCommitted !== undefined) root.onValueCommitted = opts.onValueCommitted;
  if (opts.locale !== undefined) root.locale = opts.locale;
  if (opts.format !== undefined) root.format = opts.format;

  const group = document.createElement('number-field-group') as NumberFieldGroupElement;
  const input = document.createElement('number-field-input') as NumberFieldInputElement;
  const increment = document.createElement('number-field-increment') as NumberFieldIncrementElement;
  const decrement = document.createElement('number-field-decrement') as NumberFieldDecrementElement;

  group.appendChild(decrement);
  group.appendChild(input);
  group.appendChild(increment);
  root.appendChild(group);
  container.appendChild(root);
  document.body.appendChild(container);

  if (opts.value !== undefined) {
    root.value = opts.value;
  }

  return container;
}

function getInput(container: HTMLElement): HTMLInputElement {
  return container.querySelector('input')!;
}

function getRoot(container: HTMLElement): NumberFieldRootElement {
  return container.querySelector('number-field-root')!;
}

function getGroup(container: HTMLElement): NumberFieldGroupElement {
  return container.querySelector('number-field-group')!;
}

function getIncrement(container: HTMLElement): NumberFieldIncrementElement {
  return container.querySelector('number-field-increment')!;
}

function getDecrement(container: HTMLElement): NumberFieldDecrementElement {
  return container.querySelector('number-field-decrement')!;
}

async function waitForMicrotask() {
  await new Promise((r) => queueMicrotask(r));
}

describe('NumberField', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  // ─── Root ──────────────────────────────────────────────────────────────────────

  describe('Root', () => {
    it('renders with display:contents', async () => {
      const container = createNumberField();
      await waitForMicrotask();
      const root = getRoot(container);
      expect(root.style.display).toBe('contents');
    });

    it('is an instance of NumberFieldRootElement', () => {
      const container = createNumberField();
      const root = getRoot(container);
      expect(root).toBeInstanceOf(NumberFieldRootElement);
    });
  });

  // ─── Default Value ─────────────────────────────────────────────────────────────

  describe('prop: defaultValue', () => {
    it('should accept a number value', async () => {
      const container = createNumberField({ defaultValue: 1 });
      await waitForMicrotask();
      const input = getInput(container);
      expect(input.value).toBe('1');
    });

    it('should accept undefined (empty)', async () => {
      const container = createNumberField();
      await waitForMicrotask();
      const input = getInput(container);
      expect(input.value).toBe('');
    });

    it('should accept null (empty)', async () => {
      const container = createNumberField({ defaultValue: null });
      await waitForMicrotask();
      const input = getInput(container);
      expect(input.value).toBe('');
    });
  });

  // ─── Controlled Value ──────────────────────────────────────────────────────────

  describe('prop: value', () => {
    it('should accept a number value', async () => {
      const container = createNumberField({ value: 5 });
      await waitForMicrotask();
      const input = getInput(container);
      expect(input.value).toBe('5');
    });

    it('should update when value changes', async () => {
      const container = createNumberField({ value: 1 });
      await waitForMicrotask();
      const input = getInput(container);
      expect(input.value).toBe('1');

      const root = getRoot(container);
      root.value = 2;
      await waitForMicrotask();
      expect(input.value).toBe('2');
    });

    it('should accept null (empty)', async () => {
      const container = createNumberField({ value: null });
      await waitForMicrotask();
      const input = getInput(container);
      expect(input.value).toBe('');
    });
  });

  // ─── onValueChange ─────────────────────────────────────────────────────────────

  describe('prop: onValueChange', () => {
    it('should be called when the input value changes', async () => {
      const onValueChange = vi.fn();
      const container = createNumberField({ defaultValue: 1, onValueChange });
      await waitForMicrotask();
      const input = getInput(container);

      input.value = '2';
      input.dispatchEvent(new Event('input', { bubbles: true }));

      expect(onValueChange).toHaveBeenCalledTimes(1);
      expect(onValueChange.mock.calls[0][0]).toBe(2);
      expect(onValueChange.mock.calls[0][1]).toHaveProperty('reason', 'input-change');
    });

    it('should be called when increment is pressed', async () => {
      const onValueChange = vi.fn();
      const container = createNumberField({ defaultValue: 0, onValueChange });
      await waitForMicrotask();
      const increment = getIncrement(container);

      increment.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, button: 0 }),
      );
      increment.dispatchEvent(
        new PointerEvent('pointerup', { bubbles: true }),
      );

      expect(onValueChange).toHaveBeenCalledTimes(1);
      expect(onValueChange.mock.calls[0][0]).toBe(1);
      expect(onValueChange.mock.calls[0][1]).toHaveProperty('reason', 'increment-press');
    });

    it('should be called when decrement is pressed', async () => {
      const onValueChange = vi.fn();
      const container = createNumberField({ defaultValue: 0, onValueChange });
      await waitForMicrotask();
      const decrement = getDecrement(container);

      decrement.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, button: 0 }),
      );
      decrement.dispatchEvent(
        new PointerEvent('pointerup', { bubbles: true }),
      );

      expect(onValueChange).toHaveBeenCalledTimes(1);
      expect(onValueChange.mock.calls[0][0]).toBe(-1);
      expect(onValueChange.mock.calls[0][1]).toHaveProperty('reason', 'decrement-press');
    });

    it('should be called with keyboard ArrowUp', async () => {
      const onValueChange = vi.fn();
      const container = createNumberField({ defaultValue: 5, onValueChange });
      await waitForMicrotask();
      const input = getInput(container);

      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));

      expect(onValueChange).toHaveBeenCalledTimes(1);
      expect(onValueChange.mock.calls[0][0]).toBe(6);
      expect(onValueChange.mock.calls[0][1]).toHaveProperty('reason', 'keyboard');
    });

    it('should be called with keyboard ArrowDown', async () => {
      const onValueChange = vi.fn();
      const container = createNumberField({ defaultValue: 5, onValueChange });
      await waitForMicrotask();
      const input = getInput(container);

      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));

      expect(onValueChange).toHaveBeenCalledTimes(1);
      expect(onValueChange.mock.calls[0][0]).toBe(4);
      expect(onValueChange.mock.calls[0][1]).toHaveProperty('reason', 'keyboard');
    });
  });

  // ─── onValueCommitted ──────────────────────────────────────────────────────────

  describe('prop: onValueCommitted', () => {
    it('should be called on blur', async () => {
      const onValueCommitted = vi.fn();
      const container = createNumberField({ defaultValue: 5, onValueCommitted });
      await waitForMicrotask();
      const input = getInput(container);

      input.dispatchEvent(new Event('blur', { bubbles: true }));

      expect(onValueCommitted).toHaveBeenCalledTimes(1);
      expect(onValueCommitted.mock.calls[0][0]).toBe(5);
      expect(onValueCommitted.mock.calls[0][1]).toHaveProperty('reason', 'input-blur');
    });

    it('should be called after increment pointerup', async () => {
      const onValueCommitted = vi.fn();
      const container = createNumberField({ defaultValue: 0, onValueCommitted });
      await waitForMicrotask();
      const increment = getIncrement(container);

      increment.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, button: 0 }),
      );
      increment.dispatchEvent(
        new PointerEvent('pointerup', { bubbles: true }),
      );

      expect(onValueCommitted).toHaveBeenCalledTimes(1);
      expect(onValueCommitted.mock.calls[0][1]).toHaveProperty('reason', 'increment-press');
    });
  });

  // ─── Input Attributes ──────────────────────────────────────────────────────────

  describe('input attributes', () => {
    it('sets inputmode=decimal', async () => {
      const container = createNumberField();
      await waitForMicrotask();
      const input = getInput(container);
      expect(input.getAttribute('inputmode')).toBe('decimal');
    });

    it('sets autocomplete=off', async () => {
      const container = createNumberField();
      await waitForMicrotask();
      const input = getInput(container);
      expect(input.getAttribute('autocomplete')).toBe('off');
    });

    it('sets aria-roledescription', async () => {
      const container = createNumberField();
      await waitForMicrotask();
      const input = getInput(container);
      expect(input.getAttribute('aria-roledescription')).toBe('Number field');
    });

    it('sets disabled on input when root is disabled', async () => {
      const container = createNumberField({ disabled: true });
      await waitForMicrotask();
      const input = getInput(container);
      expect(input.disabled).toBe(true);
    });

    it('sets readOnly on input when root is readOnly', async () => {
      const container = createNumberField({ readOnly: true });
      await waitForMicrotask();
      const input = getInput(container);
      expect(input.readOnly).toBe(true);
    });

    it('sets required on input when root is required', async () => {
      const container = createNumberField({ required: true });
      await waitForMicrotask();
      const input = getInput(container);
      expect(input.required).toBe(true);
    });
  });

  // ─── Data Attributes ──────────────────────────────────────────────────────────

  describe('data attributes', () => {
    it('sets data-disabled on root when disabled', async () => {
      const container = createNumberField({ disabled: true });
      await waitForMicrotask();
      const root = getRoot(container);
      expect(root).toHaveAttribute('data-disabled');
    });

    it('sets data-readonly on root when readOnly', async () => {
      const container = createNumberField({ readOnly: true });
      await waitForMicrotask();
      const root = getRoot(container);
      expect(root).toHaveAttribute('data-readonly');
    });

    it('sets data-required on root when required', async () => {
      const container = createNumberField({ required: true });
      await waitForMicrotask();
      const root = getRoot(container);
      expect(root).toHaveAttribute('data-required');
    });

    it('sets data-disabled on group when root is disabled', async () => {
      const container = createNumberField({ disabled: true });
      await waitForMicrotask();
      const group = getGroup(container);
      expect(group).toHaveAttribute('data-disabled');
    });

    it('sets data-disabled on input element when root is disabled', async () => {
      const container = createNumberField({ disabled: true });
      await waitForMicrotask();
      const inputEl = container.querySelector('number-field-input')!;
      expect(inputEl).toHaveAttribute('data-disabled');
    });
  });

  // ─── Group ─────────────────────────────────────────────────────────────────────

  describe('Group', () => {
    it('has role=group', async () => {
      const container = createNumberField();
      await waitForMicrotask();
      const group = getGroup(container);
      expect(group.getAttribute('role')).toBe('group');
    });

    it('is an instance of NumberFieldGroupElement', () => {
      const container = createNumberField();
      const group = getGroup(container);
      expect(group).toBeInstanceOf(NumberFieldGroupElement);
    });
  });

  // ─── Input ─────────────────────────────────────────────────────────────────────

  describe('Input', () => {
    it('creates an internal input element', async () => {
      const container = createNumberField();
      await waitForMicrotask();
      const input = getInput(container);
      expect(input).toBeTruthy();
      expect(input.tagName).toBe('INPUT');
      expect(input.type).toBe('text');
    });

    it('is an instance of NumberFieldInputElement', () => {
      const container = createNumberField();
      const inputEl = container.querySelector('number-field-input')!;
      expect(inputEl).toBeInstanceOf(NumberFieldInputElement);
    });

    it('clears value on empty blur', async () => {
      const onValueChange = vi.fn();
      const container = createNumberField({ defaultValue: 5, onValueChange });
      await waitForMicrotask();
      const input = getInput(container);

      input.value = '';
      input.dispatchEvent(new Event('blur', { bubbles: true }));

      expect(onValueChange).toHaveBeenCalledWith(null, expect.objectContaining({ reason: 'input-clear' }));
    });

    it('parses value on blur', async () => {
      const onValueChange = vi.fn();
      const container = createNumberField({ defaultValue: 0, onValueChange });
      await waitForMicrotask();
      const input = getInput(container);

      input.value = '42';
      input.dispatchEvent(new Event('blur', { bubbles: true }));

      expect(onValueChange).toHaveBeenCalledWith(42, expect.objectContaining({ reason: 'input-blur' }));
    });
  });

  // ─── Increment ─────────────────────────────────────────────────────────────────

  describe('Increment', () => {
    it('has role=button', async () => {
      const container = createNumberField();
      await waitForMicrotask();
      const increment = getIncrement(container);
      expect(increment.getAttribute('role')).toBe('button');
    });

    it('has tabindex=-1', async () => {
      const container = createNumberField();
      await waitForMicrotask();
      const increment = getIncrement(container);
      expect(increment.getAttribute('tabindex')).toBe('-1');
    });

    it('has aria-label=Increase', async () => {
      const container = createNumberField();
      await waitForMicrotask();
      const increment = getIncrement(container);
      expect(increment.getAttribute('aria-label')).toBe('Increase');
    });

    it('is disabled when value is at max', async () => {
      const container = createNumberField({ defaultValue: 10, max: 10 });
      await waitForMicrotask();
      const increment = getIncrement(container);
      expect(increment).toHaveAttribute('data-disabled');
    });

    it('has aria-controls pointing to input', async () => {
      const container = createNumberField();
      await waitForMicrotask();
      const increment = getIncrement(container);
      const inputEl = container.querySelector('number-field-input')!;
      expect(increment.getAttribute('aria-controls')).toBe(inputEl.id);
    });

    it('is an instance of NumberFieldIncrementElement', () => {
      const container = createNumberField();
      const increment = getIncrement(container);
      expect(increment).toBeInstanceOf(NumberFieldIncrementElement);
    });

    it('does not increment when disabled', async () => {
      const onValueChange = vi.fn();
      const container = createNumberField({ defaultValue: 0, disabled: true, onValueChange });
      await waitForMicrotask();
      const increment = getIncrement(container);

      increment.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, button: 0 }),
      );

      expect(onValueChange).not.toHaveBeenCalled();
    });

    it('does not increment when readOnly', async () => {
      const onValueChange = vi.fn();
      const container = createNumberField({ defaultValue: 0, readOnly: true, onValueChange });
      await waitForMicrotask();
      const increment = getIncrement(container);

      increment.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, button: 0 }),
      );

      expect(onValueChange).not.toHaveBeenCalled();
    });
  });

  // ─── Decrement ─────────────────────────────────────────────────────────────────

  describe('Decrement', () => {
    it('has role=button', async () => {
      const container = createNumberField();
      await waitForMicrotask();
      const decrement = getDecrement(container);
      expect(decrement.getAttribute('role')).toBe('button');
    });

    it('has aria-label=Decrease', async () => {
      const container = createNumberField();
      await waitForMicrotask();
      const decrement = getDecrement(container);
      expect(decrement.getAttribute('aria-label')).toBe('Decrease');
    });

    it('is disabled when value is at min', async () => {
      const container = createNumberField({ defaultValue: 0, min: 0 });
      await waitForMicrotask();
      const decrement = getDecrement(container);
      expect(decrement).toHaveAttribute('data-disabled');
    });

    it('is an instance of NumberFieldDecrementElement', () => {
      const container = createNumberField();
      const decrement = getDecrement(container);
      expect(decrement).toBeInstanceOf(NumberFieldDecrementElement);
    });
  });

  // ─── Range constraints ────────────────────────────────────────────────────────

  describe('range constraints', () => {
    it('clamps value to min', async () => {
      const onValueChange = vi.fn();
      const container = createNumberField({ defaultValue: 0, min: 0, onValueChange });
      await waitForMicrotask();
      const decrement = getDecrement(container);

      decrement.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, button: 0 }),
      );

      expect(onValueChange).toHaveBeenCalledWith(0, expect.anything());
    });

    it('clamps value to max', async () => {
      const onValueChange = vi.fn();
      const container = createNumberField({ defaultValue: 10, max: 10, onValueChange });
      await waitForMicrotask();
      const increment = getIncrement(container);

      increment.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, button: 0 }),
      );

      expect(onValueChange).toHaveBeenCalledWith(10, expect.anything());
    });

    it('keyboard Home sets to min', async () => {
      const onValueChange = vi.fn();
      const container = createNumberField({ defaultValue: 5, min: 0, max: 10, onValueChange });
      await waitForMicrotask();
      const input = getInput(container);

      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));

      expect(onValueChange).toHaveBeenCalledWith(0, expect.objectContaining({ reason: 'keyboard' }));
    });

    it('keyboard End sets to max', async () => {
      const onValueChange = vi.fn();
      const container = createNumberField({ defaultValue: 5, min: 0, max: 10, onValueChange });
      await waitForMicrotask();
      const input = getInput(container);

      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));

      expect(onValueChange).toHaveBeenCalledWith(10, expect.objectContaining({ reason: 'keyboard' }));
    });

    it('Home does nothing when min is -Infinity', async () => {
      const onValueChange = vi.fn();
      const container = createNumberField({ defaultValue: 5, onValueChange });
      await waitForMicrotask();
      const input = getInput(container);

      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));

      expect(onValueChange).not.toHaveBeenCalled();
    });

    it('End does nothing when max is Infinity', async () => {
      const onValueChange = vi.fn();
      const container = createNumberField({ defaultValue: 5, onValueChange });
      await waitForMicrotask();
      const input = getInput(container);

      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));

      expect(onValueChange).not.toHaveBeenCalled();
    });
  });

  // ─── Step modifiers ────────────────────────────────────────────────────────────

  describe('step modifiers', () => {
    it('uses step for normal increment', async () => {
      const onValueChange = vi.fn();
      const container = createNumberField({ defaultValue: 0, step: 5, onValueChange });
      await waitForMicrotask();
      const input = getInput(container);

      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));

      expect(onValueChange.mock.calls[0][0]).toBe(5);
    });

    it('uses smallStep with Alt key', async () => {
      const onValueChange = vi.fn();
      const container = createNumberField({ defaultValue: 0, smallStep: 0.5, onValueChange });
      await waitForMicrotask();
      const input = getInput(container);

      input.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowUp', altKey: true, bubbles: true }),
      );

      expect(onValueChange.mock.calls[0][0]).toBe(0.5);
    });

    it('uses largeStep with Shift key', async () => {
      const onValueChange = vi.fn();
      const container = createNumberField({ defaultValue: 0, largeStep: 100, onValueChange });
      await waitForMicrotask();
      const input = getInput(container);

      input.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowUp', shiftKey: true, bubbles: true }),
      );

      expect(onValueChange.mock.calls[0][0]).toBe(100);
    });
  });

  // ─── Formatting ────────────────────────────────────────────────────────────────

  describe('formatting', () => {
    it('formats value with locale and options', async () => {
      const container = createNumberField({
        defaultValue: 1234.5,
        locale: 'en-US',
        format: { style: 'currency', currency: 'USD' },
      });
      await waitForMicrotask();
      const input = getInput(container);
      expect(input.value).toBe('$1,234.50');
    });

    it('formats plain numbers', async () => {
      const container = createNumberField({ defaultValue: 42 });
      await waitForMicrotask();
      const input = getInput(container);
      expect(input.value).toBe('42');
    });

    it('formats percentages', async () => {
      const container = createNumberField({
        defaultValue: 0.75,
        locale: 'en-US',
        format: { style: 'percent' },
      });
      await waitForMicrotask();
      const input = getInput(container);
      expect(input.value).toBe('75%');
    });
  });

  // ─── ScrubArea ─────────────────────────────────────────────────────────────────

  describe('ScrubArea', () => {
    it('renders with role=presentation', () => {
      const container = document.createElement('div');
      const root = document.createElement('number-field-root') as NumberFieldRootElement;
      root.defaultValue = 0;
      const scrubArea = document.createElement(
        'number-field-scrub-area',
      ) as NumberFieldScrubAreaElement;
      root.appendChild(scrubArea);
      container.appendChild(root);
      document.body.appendChild(container);

      expect(scrubArea.getAttribute('role')).toBe('presentation');
    });

    it('is an instance of NumberFieldScrubAreaElement', () => {
      const container = document.createElement('div');
      const root = document.createElement('number-field-root') as NumberFieldRootElement;
      const scrubArea = document.createElement(
        'number-field-scrub-area',
      ) as NumberFieldScrubAreaElement;
      root.appendChild(scrubArea);
      container.appendChild(root);
      document.body.appendChild(container);

      expect(scrubArea).toBeInstanceOf(NumberFieldScrubAreaElement);
    });

    it('sets touch-action:none and user-select:none', () => {
      const container = document.createElement('div');
      const root = document.createElement('number-field-root') as NumberFieldRootElement;
      const scrubArea = document.createElement(
        'number-field-scrub-area',
      ) as NumberFieldScrubAreaElement;
      root.appendChild(scrubArea);
      container.appendChild(root);
      document.body.appendChild(container);

      expect(scrubArea.style.touchAction).toBe('none');
      expect(scrubArea.style.userSelect).toBe('none');
    });

    it('sets data-scrubbing during pointer drag', () => {
      const container = document.createElement('div');
      const root = document.createElement('number-field-root') as NumberFieldRootElement;
      root.defaultValue = 0;
      const scrubArea = document.createElement(
        'number-field-scrub-area',
      ) as NumberFieldScrubAreaElement;
      root.appendChild(scrubArea);
      container.appendChild(root);
      document.body.appendChild(container);

      scrubArea.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          button: 0,
          clientX: 100,
          clientY: 100,
          pointerId: 1,
        }),
      );
      expect(scrubArea).toHaveAttribute('data-scrubbing');

      scrubArea.dispatchEvent(
        new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }),
      );
      expect(scrubArea).not.toHaveAttribute('data-scrubbing');
    });
  });

  // ─── ScrubAreaCursor ──────────────────────────────────────────────────────────

  describe('ScrubAreaCursor', () => {
    it('is an instance of NumberFieldScrubAreaCursorElement', () => {
      const container = document.createElement('div');
      const root = document.createElement('number-field-root') as NumberFieldRootElement;
      const cursor = document.createElement(
        'number-field-scrub-area-cursor',
      ) as NumberFieldScrubAreaCursorElement;
      root.appendChild(cursor);
      container.appendChild(root);
      document.body.appendChild(container);

      expect(cursor).toBeInstanceOf(NumberFieldScrubAreaCursorElement);
    });

    it('has position:fixed and pointer-events:none', () => {
      const container = document.createElement('div');
      const root = document.createElement('number-field-root') as NumberFieldRootElement;
      const cursor = document.createElement(
        'number-field-scrub-area-cursor',
      ) as NumberFieldScrubAreaCursorElement;
      root.appendChild(cursor);
      container.appendChild(root);
      document.body.appendChild(container);

      expect(cursor.style.position).toBe('fixed');
      expect(cursor.style.pointerEvents).toBe('none');
    });
  });

  // ─── Disabled / ReadOnly interactions ──────────────────────────────────────────

  describe('disabled interactions', () => {
    it('does not change value via keyboard when disabled', async () => {
      const onValueChange = vi.fn();
      const container = createNumberField({ defaultValue: 5, disabled: true, onValueChange });
      await waitForMicrotask();
      const input = getInput(container);

      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));

      expect(onValueChange).not.toHaveBeenCalled();
    });

    it('does not change value via keyboard when readOnly', async () => {
      const onValueChange = vi.fn();
      const container = createNumberField({ defaultValue: 5, readOnly: true, onValueChange });
      await waitForMicrotask();
      const input = getInput(container);

      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));

      expect(onValueChange).not.toHaveBeenCalled();
    });
  });

  // ─── Error handling ────────────────────────────────────────────────────────────

  describe('error handling', () => {
    it('logs error when child is placed outside root', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const container = document.createElement('div');
      const group = document.createElement('number-field-group') as NumberFieldGroupElement;
      container.appendChild(group);
      document.body.appendChild(container);

      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('must be placed within <number-field-root>'),
      );
    });
  });

  // ─── Integration ───────────────────────────────────────────────────────────────

  describe('integration', () => {
    it('full cycle: increment, decrement, keyboard, typed input', async () => {
      const onValueChange = vi.fn();
      const container = createNumberField({
        defaultValue: 10,
        min: 0,
        max: 20,
        step: 1,
        onValueChange,
      });
      await waitForMicrotask();
      const input = getInput(container);
      const increment = getIncrement(container);
      const decrement = getDecrement(container);

      // Increment
      increment.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, button: 0 }),
      );
      increment.dispatchEvent(
        new PointerEvent('pointerup', { bubbles: true }),
      );
      expect(onValueChange.mock.calls[0][0]).toBe(11);

      // Decrement
      decrement.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, button: 0 }),
      );
      decrement.dispatchEvent(
        new PointerEvent('pointerup', { bubbles: true }),
      );
      expect(onValueChange.mock.calls[1][0]).toBe(10);

      // Keyboard
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
      expect(onValueChange.mock.calls[2][0]).toBe(11);

      // Type a value
      input.value = '15';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      expect(onValueChange.mock.calls[3][0]).toBe(15);
    });
  });

  // ─── Cleanup ───────────────────────────────────────────────────────────────────

  describe('cleanup', () => {
    it('cleans up event listeners on disconnect', async () => {
      const container = createNumberField({ defaultValue: 0 });
      await waitForMicrotask();
      const root = getRoot(container);
      container.remove();

      // Should not throw after removal
      expect(() => {
        root.dispatchEvent(new CustomEvent('base-ui-number-field-state-change'));
      }).not.toThrow();
    });
  });
});
