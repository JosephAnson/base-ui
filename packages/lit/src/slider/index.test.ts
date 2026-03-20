import { afterEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

import {
  SliderRootElement,
  SliderControlElement,
  SliderTrackElement,
  SliderThumbElement,
  SliderIndicatorElement,
  SliderLabelElement,
  SliderValueElement,
} from './index.ts';

function createSlider(opts: {
  defaultValue?: number | readonly number[];
  value?: number | readonly number[];
  min?: number;
  max?: number;
  step?: number;
  largeStep?: number;
  disabled?: boolean;
  orientation?: 'horizontal' | 'vertical';
  minStepsBetweenValues?: number;
  onValueChange?: (value: number | readonly number[], details: any) => void;
  onValueCommitted?: (value: number | readonly number[], details: any) => void;
  format?: Intl.NumberFormatOptions;
  locale?: string;
  thumbCount?: number;
} = {}): HTMLElement {
  const container = document.createElement('div');

  const root = document.createElement('slider-root') as SliderRootElement;
  if (opts.defaultValue !== undefined) root.defaultValue = opts.defaultValue;
  if (opts.min !== undefined) root.min = opts.min;
  if (opts.max !== undefined) root.max = opts.max;
  if (opts.step !== undefined) root.step = opts.step;
  if (opts.largeStep !== undefined) root.largeStep = opts.largeStep;
  if (opts.disabled !== undefined) root.disabled = opts.disabled;
  if (opts.orientation !== undefined) root.orientation = opts.orientation;
  if (opts.minStepsBetweenValues !== undefined)
    root.minStepsBetweenValues = opts.minStepsBetweenValues;
  if (opts.onValueChange !== undefined) root.onValueChange = opts.onValueChange;
  if (opts.onValueCommitted !== undefined) root.onValueCommitted = opts.onValueCommitted;
  if (opts.format !== undefined) root.format = opts.format;
  if (opts.locale !== undefined) root.locale = opts.locale;

  const control = document.createElement('slider-control') as SliderControlElement;
  const track = document.createElement('slider-track') as SliderTrackElement;
  const indicator = document.createElement('slider-indicator') as SliderIndicatorElement;

  track.appendChild(indicator);

  const thumbCount = opts.thumbCount ?? (Array.isArray(opts.defaultValue ?? opts.value) ? (opts.defaultValue ?? opts.value as any).length : 1);

  for (let i = 0; i < thumbCount; i++) {
    const thumb = document.createElement('slider-thumb') as SliderThumbElement;
    track.appendChild(thumb);
  }

  control.appendChild(track);
  root.appendChild(control);
  container.appendChild(root);
  document.body.appendChild(container);

  if (opts.value !== undefined) {
    root.value = opts.value;
  }

  return container;
}

function getRoot(container: HTMLElement): SliderRootElement {
  return container.querySelector('slider-root')!;
}

function getControl(container: HTMLElement): SliderControlElement {
  return container.querySelector('slider-control')!;
}

function getTrack(container: HTMLElement): SliderTrackElement {
  return container.querySelector('slider-track')!;
}

function getThumbs(container: HTMLElement): SliderThumbElement[] {
  return Array.from(container.querySelectorAll('slider-thumb'));
}

function getIndicator(container: HTMLElement): SliderIndicatorElement {
  return container.querySelector('slider-indicator')!;
}

function getThumbInput(container: HTMLElement, index = 0): HTMLInputElement {
  const thumbs = getThumbs(container);
  return thumbs[index].querySelector('input')!;
}

async function waitForMicrotask() {
  await new Promise((r) => queueMicrotask(r));
}

describe('Slider', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  // ─── Root ──────────────────────────────────────────────────────────────────────

  describe('Root', () => {
    it('renders with display:contents', async () => {
      const container = createSlider();
      await waitForMicrotask();
      expect(getRoot(container).style.display).toBe('contents');
    });

    it('has role=group', async () => {
      const container = createSlider();
      await waitForMicrotask();
      expect(getRoot(container).getAttribute('role')).toBe('group');
    });

    it('is an instance of SliderRootElement', () => {
      const container = createSlider();
      expect(getRoot(container)).toBeInstanceOf(SliderRootElement);
    });

    it('sets data-orientation', async () => {
      const container = createSlider({ orientation: 'vertical' });
      await waitForMicrotask();
      expect(getRoot(container).getAttribute('data-orientation')).toBe('vertical');
    });

    it('sets data-disabled when disabled', async () => {
      const container = createSlider({ disabled: true });
      await waitForMicrotask();
      expect(getRoot(container)).toHaveAttribute('data-disabled');
    });

    it('defaults to horizontal orientation', async () => {
      const container = createSlider();
      await waitForMicrotask();
      expect(getRoot(container).getAttribute('data-orientation')).toBe('horizontal');
    });
  });

  // ─── Default Value ─────────────────────────────────────────────────────────────

  describe('prop: defaultValue', () => {
    it('accepts a number', async () => {
      const container = createSlider({ defaultValue: 50 });
      await waitForMicrotask();
      const input = getThumbInput(container);
      expect(input.value).toBe('50');
    });

    it('accepts an array for range slider', async () => {
      const container = createSlider({ defaultValue: [25, 75] });
      await waitForMicrotask();
      const input0 = getThumbInput(container, 0);
      const input1 = getThumbInput(container, 1);
      expect(input0.value).toBe('25');
      expect(input1.value).toBe('75');
    });

    it('defaults to 0', async () => {
      const container = createSlider();
      await waitForMicrotask();
      const input = getThumbInput(container);
      expect(input.value).toBe('0');
    });
  });

  // ─── Controlled Value ──────────────────────────────────────────────────────────

  describe('prop: value', () => {
    it('accepts a controlled number', async () => {
      const container = createSlider({ value: 42 });
      await waitForMicrotask();
      const input = getThumbInput(container);
      expect(input.value).toBe('42');
    });

    it('updates when value changes', async () => {
      const container = createSlider({ value: 10 });
      await waitForMicrotask();
      const root = getRoot(container);
      root.value = 90;
      await waitForMicrotask();
      const input = getThumbInput(container);
      expect(input.value).toBe('90');
    });

    it('accepts controlled array for range', async () => {
      const container = createSlider({ value: [20, 80] });
      await waitForMicrotask();
      expect(getThumbInput(container, 0).value).toBe('20');
      expect(getThumbInput(container, 1).value).toBe('80');
    });
  });

  // ─── Keyboard Navigation ──────────────────────────────────────────────────────

  describe('keyboard navigation', () => {
    it('ArrowRight increments by step', async () => {
      const onValueChange = vi.fn();
      const container = createSlider({ defaultValue: 50, step: 5, onValueChange });
      await waitForMicrotask();
      const input = getThumbInput(container);

      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));

      expect(onValueChange).toHaveBeenCalledWith(55, expect.objectContaining({ reason: 'keyboard' }));
    });

    it('ArrowLeft decrements by step', async () => {
      const onValueChange = vi.fn();
      const container = createSlider({ defaultValue: 50, step: 5, onValueChange });
      await waitForMicrotask();
      const input = getThumbInput(container);

      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));

      expect(onValueChange).toHaveBeenCalledWith(45, expect.objectContaining({ reason: 'keyboard' }));
    });

    it('ArrowUp increments by step', async () => {
      const onValueChange = vi.fn();
      const container = createSlider({ defaultValue: 50, onValueChange });
      await waitForMicrotask();
      const input = getThumbInput(container);

      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));

      expect(onValueChange).toHaveBeenCalledWith(51, expect.objectContaining({ reason: 'keyboard' }));
    });

    it('ArrowDown decrements by step', async () => {
      const onValueChange = vi.fn();
      const container = createSlider({ defaultValue: 50, onValueChange });
      await waitForMicrotask();
      const input = getThumbInput(container);

      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));

      expect(onValueChange).toHaveBeenCalledWith(49, expect.objectContaining({ reason: 'keyboard' }));
    });

    it('Shift+Arrow uses largeStep', async () => {
      const onValueChange = vi.fn();
      const container = createSlider({ defaultValue: 50, largeStep: 20, onValueChange });
      await waitForMicrotask();
      const input = getThumbInput(container);

      input.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', shiftKey: true, bubbles: true }),
      );

      expect(onValueChange).toHaveBeenCalledWith(70, expect.objectContaining({ reason: 'keyboard' }));
    });

    it('PageUp uses largeStep', async () => {
      const onValueChange = vi.fn();
      const container = createSlider({ defaultValue: 50, largeStep: 10, onValueChange });
      await waitForMicrotask();
      const input = getThumbInput(container);

      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageUp', bubbles: true }));

      expect(onValueChange).toHaveBeenCalledWith(60, expect.objectContaining({ reason: 'keyboard' }));
    });

    it('PageDown uses largeStep', async () => {
      const onValueChange = vi.fn();
      const container = createSlider({ defaultValue: 50, largeStep: 10, onValueChange });
      await waitForMicrotask();
      const input = getThumbInput(container);

      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageDown', bubbles: true }));

      expect(onValueChange).toHaveBeenCalledWith(40, expect.objectContaining({ reason: 'keyboard' }));
    });

    it('Home jumps to min', async () => {
      const onValueChange = vi.fn();
      const container = createSlider({ defaultValue: 50, min: 10, onValueChange });
      await waitForMicrotask();
      const input = getThumbInput(container);

      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));

      expect(onValueChange).toHaveBeenCalledWith(10, expect.objectContaining({ reason: 'keyboard' }));
    });

    it('End jumps to max', async () => {
      const onValueChange = vi.fn();
      const container = createSlider({ defaultValue: 50, max: 90, onValueChange });
      await waitForMicrotask();
      const input = getThumbInput(container);

      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));

      expect(onValueChange).toHaveBeenCalledWith(90, expect.objectContaining({ reason: 'keyboard' }));
    });

    it('commits value on keyboard', async () => {
      const onValueCommitted = vi.fn();
      const container = createSlider({ defaultValue: 50, onValueCommitted });
      await waitForMicrotask();
      const input = getThumbInput(container);

      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));

      expect(onValueCommitted).toHaveBeenCalledWith(51, expect.objectContaining({ reason: 'keyboard' }));
    });

    it('does not respond when disabled', async () => {
      const onValueChange = vi.fn();
      const container = createSlider({ defaultValue: 50, disabled: true, onValueChange });
      await waitForMicrotask();
      const input = getThumbInput(container);

      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));

      expect(onValueChange).not.toHaveBeenCalled();
    });

    it('clamps at max', async () => {
      const onValueChange = vi.fn();
      const container = createSlider({ defaultValue: 99, max: 100, onValueChange });
      await waitForMicrotask();
      const input = getThumbInput(container);

      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      expect(onValueChange).toHaveBeenCalledWith(100, expect.anything());

      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      expect(onValueChange).toHaveBeenLastCalledWith(100, expect.anything());
    });

    it('clamps at min', async () => {
      const onValueChange = vi.fn();
      const container = createSlider({ defaultValue: 1, min: 0, onValueChange });
      await waitForMicrotask();
      const input = getThumbInput(container);

      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
      expect(onValueChange).toHaveBeenCalledWith(0, expect.anything());

      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
      expect(onValueChange).toHaveBeenLastCalledWith(0, expect.anything());
    });
  });

  // ─── Thumb ─────────────────────────────────────────────────────────────────────

  describe('Thumb', () => {
    it('creates a hidden range input', async () => {
      const container = createSlider({ defaultValue: 50 });
      await waitForMicrotask();
      const input = getThumbInput(container);
      expect(input).toBeTruthy();
      expect(input.type).toBe('range');
    });

    it('sets aria-valuenow', async () => {
      const container = createSlider({ defaultValue: 42 });
      await waitForMicrotask();
      const input = getThumbInput(container);
      expect(input.getAttribute('aria-valuenow')).toBe('42');
    });

    it('sets aria-valuemin and aria-valuemax', async () => {
      const container = createSlider({ defaultValue: 50, min: 10, max: 90 });
      await waitForMicrotask();
      const input = getThumbInput(container);
      expect(input.getAttribute('aria-valuemin')).toBe('10');
      expect(input.getAttribute('aria-valuemax')).toBe('90');
    });

    it('sets aria-orientation', async () => {
      const container = createSlider({ orientation: 'vertical' });
      await waitForMicrotask();
      const input = getThumbInput(container);
      expect(input.getAttribute('aria-orientation')).toBe('vertical');
    });

    it('positions horizontally with insetInlineStart', async () => {
      const container = createSlider({ defaultValue: 50, min: 0, max: 100 });
      await waitForMicrotask();
      const thumb = getThumbs(container)[0];
      expect(thumb.style.insetInlineStart).toBe('50%');
    });

    it('positions vertically with bottom', async () => {
      const container = createSlider({ defaultValue: 50, min: 0, max: 100, orientation: 'vertical' });
      await waitForMicrotask();
      const thumb = getThumbs(container)[0];
      expect(thumb.style.bottom).toBe('50%');
    });

    it('has position:absolute', async () => {
      const container = createSlider();
      await waitForMicrotask();
      const thumb = getThumbs(container)[0];
      expect(thumb.style.position).toBe('absolute');
    });

    it('sets data-slider-thumb-index', async () => {
      const container = createSlider({ defaultValue: [25, 75] });
      await waitForMicrotask();
      const thumbs = getThumbs(container);
      expect(thumbs[0].getAttribute('data-slider-thumb-index')).toBe('0');
      expect(thumbs[1].getAttribute('data-slider-thumb-index')).toBe('1');
    });

    it('is an instance of SliderThumbElement', () => {
      const container = createSlider();
      expect(getThumbs(container)[0]).toBeInstanceOf(SliderThumbElement);
    });

    it('disables hidden input when root is disabled', async () => {
      const container = createSlider({ disabled: true });
      await waitForMicrotask();
      const input = getThumbInput(container);
      expect(input.disabled).toBe(true);
    });
  });

  // ─── Control ───────────────────────────────────────────────────────────────────

  describe('Control', () => {
    it('has tabindex=-1', async () => {
      const container = createSlider();
      await waitForMicrotask();
      expect(getControl(container).getAttribute('tabindex')).toBe('-1');
    });

    it('sets touch-action:none', async () => {
      const container = createSlider();
      await waitForMicrotask();
      expect(getControl(container).style.touchAction).toBe('none');
    });

    it('is an instance of SliderControlElement', () => {
      const container = createSlider();
      expect(getControl(container)).toBeInstanceOf(SliderControlElement);
    });

    it('mirrors data-disabled from root', async () => {
      const container = createSlider({ disabled: true });
      await waitForMicrotask();
      expect(getControl(container)).toHaveAttribute('data-disabled');
    });

    it('mirrors data-orientation from root', async () => {
      const container = createSlider({ orientation: 'vertical' });
      await waitForMicrotask();
      expect(getControl(container).getAttribute('data-orientation')).toBe('vertical');
    });
  });

  // ─── Track ─────────────────────────────────────────────────────────────────────

  describe('Track', () => {
    it('has position:relative', async () => {
      const container = createSlider();
      await waitForMicrotask();
      expect(getTrack(container).style.position).toBe('relative');
    });

    it('is an instance of SliderTrackElement', () => {
      const container = createSlider();
      expect(getTrack(container)).toBeInstanceOf(SliderTrackElement);
    });

    it('mirrors data-orientation', async () => {
      const container = createSlider({ orientation: 'vertical' });
      await waitForMicrotask();
      expect(getTrack(container).getAttribute('data-orientation')).toBe('vertical');
    });
  });

  // ─── Indicator ─────────────────────────────────────────────────────────────────

  describe('Indicator', () => {
    it('has position:absolute', async () => {
      const container = createSlider();
      await waitForMicrotask();
      expect(getIndicator(container).style.position).toBe('absolute');
    });

    it('sets width for horizontal single value', async () => {
      const container = createSlider({ defaultValue: 50, min: 0, max: 100 });
      await waitForMicrotask();
      expect(getIndicator(container).style.width).toBe('50%');
      expect(getIndicator(container).style.insetInlineStart).toBe('0%');
    });

    it('sets width for horizontal range', async () => {
      const container = createSlider({ defaultValue: [25, 75], min: 0, max: 100 });
      await waitForMicrotask();
      expect(getIndicator(container).style.insetInlineStart).toBe('25%');
      expect(getIndicator(container).style.width).toBe('50%');
    });

    it('sets height for vertical single value', async () => {
      const container = createSlider({
        defaultValue: 50,
        min: 0,
        max: 100,
        orientation: 'vertical',
      });
      await waitForMicrotask();
      expect(getIndicator(container).style.height).toBe('50%');
      expect(getIndicator(container).style.bottom).toBe('0%');
    });

    it('is an instance of SliderIndicatorElement', () => {
      const container = createSlider();
      expect(getIndicator(container)).toBeInstanceOf(SliderIndicatorElement);
    });

    it('mirrors data-orientation', async () => {
      const container = createSlider({ orientation: 'vertical' });
      await waitForMicrotask();
      expect(getIndicator(container).getAttribute('data-orientation')).toBe('vertical');
    });
  });

  // ─── Label ─────────────────────────────────────────────────────────────────────

  describe('Label', () => {
    it('auto-generates an id', () => {
      const container = document.createElement('div');
      const root = document.createElement('slider-root') as SliderRootElement;
      const label = document.createElement('slider-label') as SliderLabelElement;
      const control = document.createElement('slider-control') as SliderControlElement;
      const track = document.createElement('slider-track') as SliderTrackElement;
      const thumb = document.createElement('slider-thumb') as SliderThumbElement;

      track.appendChild(thumb);
      control.appendChild(track);
      root.appendChild(label);
      root.appendChild(control);
      container.appendChild(root);
      document.body.appendChild(container);

      expect(label.id).toBeTruthy();
      expect(label.id).toContain('base-ui-slider-label');
    });

    it('sets aria-labelledby on thumb input', async () => {
      const container = document.createElement('div');
      const root = document.createElement('slider-root') as SliderRootElement;
      root.defaultValue = 50;
      const label = document.createElement('slider-label') as SliderLabelElement;
      const control = document.createElement('slider-control') as SliderControlElement;
      const track = document.createElement('slider-track') as SliderTrackElement;
      const thumb = document.createElement('slider-thumb') as SliderThumbElement;

      track.appendChild(thumb);
      control.appendChild(track);
      root.appendChild(label);
      root.appendChild(control);
      container.appendChild(root);
      document.body.appendChild(container);

      await waitForMicrotask();

      const input = thumb.querySelector('input')!;
      expect(input.getAttribute('aria-labelledby')).toBe(label.id);
    });

    it('is an instance of SliderLabelElement', () => {
      const container = document.createElement('div');
      const root = document.createElement('slider-root') as SliderRootElement;
      const label = document.createElement('slider-label') as SliderLabelElement;
      root.appendChild(label);
      container.appendChild(root);
      document.body.appendChild(container);

      expect(label).toBeInstanceOf(SliderLabelElement);
    });
  });

  // ─── Value ─────────────────────────────────────────────────────────────────────

  describe('Value', () => {
    it('displays the formatted value', async () => {
      const container = document.createElement('div');
      const root = document.createElement('slider-root') as SliderRootElement;
      root.defaultValue = 50;
      const control = document.createElement('slider-control') as SliderControlElement;
      const track = document.createElement('slider-track') as SliderTrackElement;
      const thumb = document.createElement('slider-thumb') as SliderThumbElement;
      const value = document.createElement('slider-value') as SliderValueElement;

      track.appendChild(thumb);
      control.appendChild(track);
      root.appendChild(control);
      root.appendChild(value);
      container.appendChild(root);
      document.body.appendChild(container);

      await waitForMicrotask();

      expect(value.textContent).toBe('50');
    });

    it('displays range values joined with en-dash', async () => {
      const container = document.createElement('div');
      const root = document.createElement('slider-root') as SliderRootElement;
      root.defaultValue = [25, 75];
      const control = document.createElement('slider-control') as SliderControlElement;
      const track = document.createElement('slider-track') as SliderTrackElement;

      for (let i = 0; i < 2; i++) {
        const thumb = document.createElement('slider-thumb') as SliderThumbElement;
        track.appendChild(thumb);
      }

      const value = document.createElement('slider-value') as SliderValueElement;

      control.appendChild(track);
      root.appendChild(control);
      root.appendChild(value);
      container.appendChild(root);
      document.body.appendChild(container);

      await waitForMicrotask();

      expect(value.textContent).toBe('25 \u2013 75');
    });

    it('uses custom renderValue', async () => {
      const container = document.createElement('div');
      const root = document.createElement('slider-root') as SliderRootElement;
      root.defaultValue = 50;
      const control = document.createElement('slider-control') as SliderControlElement;
      const track = document.createElement('slider-track') as SliderTrackElement;
      const thumb = document.createElement('slider-thumb') as SliderThumbElement;
      const value = document.createElement('slider-value') as SliderValueElement;
      value.renderValue = (formatted) => `Value: ${formatted[0]}`;

      track.appendChild(thumb);
      control.appendChild(track);
      root.appendChild(control);
      root.appendChild(value);
      container.appendChild(root);
      document.body.appendChild(container);

      await waitForMicrotask();

      expect(value.textContent).toBe('Value: 50');
    });

    it('has aria-hidden=true', async () => {
      const container = document.createElement('div');
      const root = document.createElement('slider-root') as SliderRootElement;
      root.defaultValue = 50;
      const value = document.createElement('slider-value') as SliderValueElement;
      root.appendChild(value);
      container.appendChild(root);
      document.body.appendChild(container);

      expect(value.getAttribute('aria-hidden')).toBe('true');
    });

    it('is an instance of SliderValueElement', () => {
      const container = document.createElement('div');
      const root = document.createElement('slider-root') as SliderRootElement;
      const value = document.createElement('slider-value') as SliderValueElement;
      root.appendChild(value);
      container.appendChild(root);
      document.body.appendChild(container);

      expect(value).toBeInstanceOf(SliderValueElement);
    });
  });

  // ─── Formatting ────────────────────────────────────────────────────────────────

  describe('formatting', () => {
    it('formats value with currency', async () => {
      const container = document.createElement('div');
      const root = document.createElement('slider-root') as SliderRootElement;
      root.defaultValue = 50;
      root.locale = 'en-US';
      root.format = { style: 'currency', currency: 'USD' };
      const value = document.createElement('slider-value') as SliderValueElement;
      const control = document.createElement('slider-control') as SliderControlElement;
      const track = document.createElement('slider-track') as SliderTrackElement;
      const thumb = document.createElement('slider-thumb') as SliderThumbElement;

      track.appendChild(thumb);
      control.appendChild(track);
      root.appendChild(control);
      root.appendChild(value);
      container.appendChild(root);
      document.body.appendChild(container);

      await waitForMicrotask();

      expect(value.textContent).toBe('$50.00');
    });

    it('formats thumb aria-valuetext', async () => {
      const container = document.createElement('div');
      const root = document.createElement('slider-root') as SliderRootElement;
      root.defaultValue = 50;
      root.locale = 'en-US';
      root.format = { style: 'percent' };
      const control = document.createElement('slider-control') as SliderControlElement;
      const track = document.createElement('slider-track') as SliderTrackElement;
      const thumb = document.createElement('slider-thumb') as SliderThumbElement;

      track.appendChild(thumb);
      control.appendChild(track);
      root.appendChild(control);
      container.appendChild(root);
      document.body.appendChild(container);

      await waitForMicrotask();

      const input = thumb.querySelector('input')!;
      expect(input.getAttribute('aria-valuetext')).toBe('5,000%');
    });
  });

  // ─── Range Slider ──────────────────────────────────────────────────────────────

  describe('range slider', () => {
    it('renders multiple thumbs', async () => {
      const container = createSlider({ defaultValue: [25, 75] });
      await waitForMicrotask();
      const thumbs = getThumbs(container);
      expect(thumbs).toHaveLength(2);
    });

    it('positions thumbs correctly', async () => {
      const container = createSlider({ defaultValue: [25, 75], min: 0, max: 100 });
      await waitForMicrotask();
      const thumbs = getThumbs(container);
      expect(thumbs[0].style.insetInlineStart).toBe('25%');
      expect(thumbs[1].style.insetInlineStart).toBe('75%');
    });

    it('respects minStepsBetweenValues', async () => {
      const onValueChange = vi.fn();
      const container = createSlider({
        defaultValue: [40, 60],
        min: 0,
        max: 100,
        step: 1,
        minStepsBetweenValues: 10,
        onValueChange,
      });
      await waitForMicrotask();

      // Try to move first thumb to 55 (only 5 steps from second at 60)
      const input0 = getThumbInput(container, 0);
      input0.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));

      // Should be clamped to 50 (60 - 10*1)
      expect(onValueChange.mock.calls[0][0]).toEqual([50, 60]);
    });

    it('each thumb has independent keyboard control', async () => {
      const onValueChange = vi.fn();
      const container = createSlider({ defaultValue: [25, 75], onValueChange });
      await waitForMicrotask();

      // Move second thumb
      const input1 = getThumbInput(container, 1);
      input1.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));

      expect(onValueChange.mock.calls[0][0]).toEqual([25, 76]);
    });
  });

  // ─── Disabled ──────────────────────────────────────────────────────────────────

  describe('disabled', () => {
    it('does not respond to pointer on control', async () => {
      const onValueChange = vi.fn();
      const container = createSlider({ defaultValue: 50, disabled: true, onValueChange });
      await waitForMicrotask();
      const control = getControl(container);

      control.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: 50, clientY: 50 }),
      );

      expect(onValueChange).not.toHaveBeenCalled();
    });

    it('propagates data-disabled to children', async () => {
      const container = createSlider({ disabled: true });
      await waitForMicrotask();
      expect(getControl(container)).toHaveAttribute('data-disabled');
      expect(getTrack(container)).toHaveAttribute('data-disabled');
      expect(getIndicator(container)).toHaveAttribute('data-disabled');
      expect(getThumbs(container)[0]).toHaveAttribute('data-disabled');
    });
  });

  // ─── Step ──────────────────────────────────────────────────────────────────────

  describe('step', () => {
    it('rounds value to step', async () => {
      const onValueChange = vi.fn();
      const container = createSlider({ defaultValue: 50, step: 10, onValueChange });
      await waitForMicrotask();
      const input = getThumbInput(container);

      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));

      expect(onValueChange).toHaveBeenCalledWith(60, expect.anything());
    });
  });

  // ─── Error Handling ────────────────────────────────────────────────────────────

  describe('error handling', () => {
    it('logs error when child is outside root', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const container = document.createElement('div');
      const control = document.createElement('slider-control') as SliderControlElement;
      container.appendChild(control);
      document.body.appendChild(container);

      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('must be placed within <slider-root>'),
      );
    });
  });

  // ─── Integration ───────────────────────────────────────────────────────────────

  describe('integration', () => {
    it('full cycle: keyboard increment, decrement, value display updates', async () => {
      const onValueChange = vi.fn();
      const container = document.createElement('div');
      const root = document.createElement('slider-root') as SliderRootElement;
      root.defaultValue = 50;
      root.min = 0;
      root.max = 100;
      root.onValueChange = onValueChange;

      const control = document.createElement('slider-control') as SliderControlElement;
      const track = document.createElement('slider-track') as SliderTrackElement;
      const indicator = document.createElement('slider-indicator') as SliderIndicatorElement;
      const thumb = document.createElement('slider-thumb') as SliderThumbElement;
      const value = document.createElement('slider-value') as SliderValueElement;

      track.appendChild(indicator);
      track.appendChild(thumb);
      control.appendChild(track);
      root.appendChild(control);
      root.appendChild(value);
      container.appendChild(root);
      document.body.appendChild(container);

      await waitForMicrotask();

      const input = thumb.querySelector('input')!;
      expect(value.textContent).toBe('50');

      // Increment
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      await waitForMicrotask();
      expect(value.textContent).toBe('51');
      expect(indicator.style.width).toBe('51%');

      // Decrement
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
      await waitForMicrotask();
      expect(value.textContent).toBe('50');
    });
  });

  // ─── Cleanup ───────────────────────────────────────────────────────────────────

  describe('cleanup', () => {
    it('cleans up event listeners on disconnect', async () => {
      const container = createSlider({ defaultValue: 50 });
      await waitForMicrotask();
      const root = getRoot(container);
      container.remove();

      expect(() => {
        root.dispatchEvent(new CustomEvent('base-ui-slider-state-change'));
      }).not.toThrow();
    });
  });
});
