import { BaseHTMLElement, ensureId } from '../utils/index.ts';

// ─── Constants ──────────────────────────────────────────────────────────────────

const SLIDER_STATE_CHANGE_EVENT = 'base-ui-slider-state-change';

// ─── Types ──────────────────────────────────────────────────────────────────────

export type SliderChangeEventReason =
  | 'drag'
  | 'track-press'
  | 'keyboard'
  | 'input-change'
  | 'none';

export type SliderCommitEventReason =
  | 'drag'
  | 'track-press'
  | 'keyboard'
  | 'input-change';

export interface SliderChangeEventDetails {
  reason: SliderChangeEventReason;
  event: Event;
}

export interface SliderCommitEventDetails {
  reason: SliderCommitEventReason;
  event: Event;
}

export type SliderOrientation = 'horizontal' | 'vertical';

export interface SliderRootState {
  values: readonly number[];
  activeThumbIndex: number;
  disabled: boolean;
  dragging: boolean;
  min: number;
  max: number;
  step: number;
  orientation: SliderOrientation;
}

export interface SliderControlState {
  disabled: boolean;
  dragging: boolean;
  orientation: SliderOrientation;
}

export interface SliderTrackState {
  disabled: boolean;
  dragging: boolean;
  orientation: SliderOrientation;
}

export interface SliderThumbState {
  disabled: boolean;
  dragging: boolean;
  index: number;
}

export interface SliderIndicatorState {
  disabled: boolean;
  dragging: boolean;
  orientation: SliderOrientation;
}

export interface SliderLabelState {
  disabled: boolean;
}

export interface SliderValueState {
  values: readonly number[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function roundToStep(value: number, step: number, min: number): number {
  const remainder = (value - min) % step;
  if (Math.abs(remainder) < 1e-10) return value;
  const lower = value - remainder;
  const upper = lower + step;
  return Math.abs(value - lower) <= Math.abs(value - upper) ? lower : upper;
}

function valueToPercent(value: number, min: number, max: number): number {
  if (max === min) return 0;
  return ((value - min) / (max - min)) * 100;
}

function percentToValue(percent: number, min: number, max: number): number {
  return min + (percent / 100) * (max - min);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function formatNumber(
  value: number,
  locale?: string | Intl.LocalesArgument,
  options?: Intl.NumberFormatOptions,
): string {
  try {
    return new Intl.NumberFormat(locale as string | undefined, options).format(value);
  } catch {
    return String(value);
  }
}

// ─── SliderRootElement ──────────────────────────────────────────────────────────

/**
 * Groups all parts of the slider.
 * Renders a `<slider-root>` custom element (display:contents).
 *
 * Documentation: [Base UI Slider](https://base-ui.com/react/components/slider)
 */
export class SliderRootElement extends BaseHTMLElement {
  /** Default value(s) (uncontrolled). */
  defaultValue: number | readonly number[] = 0;

  /** Minimum value. */
  min = 0;

  /** Maximum value. */
  max = 100;

  /** Step increment. */
  step = 1;

  /** Large step (Shift + Arrow, Page Up/Down). */
  largeStep = 10;

  /** Whether disabled. */
  disabled = false;

  /** Orientation. */
  orientation: SliderOrientation = 'horizontal';

  /** Minimum number of steps between range thumbs. */
  minStepsBetweenValues = 0;

  /** Intl.NumberFormatOptions for formatting. */
  format: Intl.NumberFormatOptions | undefined;

  /** Locale for formatting. */
  locale: string | Intl.LocalesArgument | undefined;

  /** Value change callback. */
  onValueChange:
    | ((value: number | readonly number[], details: SliderChangeEventDetails) => void)
    | undefined;

  /** Value commit callback. */
  onValueCommitted:
    | ((value: number | readonly number[], details: SliderCommitEventDetails) => void)
    | undefined;

  // Internal state
  private _value: number | readonly number[] | undefined;
  private _valueIsControlled = false;
  private _internalValues: number[] = [];
  private _initialized = false;
  private _activeThumbIndex = -1;
  private _dragging = false;
  private _lastPublishedStateKey: string | null = null;
  private _labelId: string | undefined;
  private _thumbInputIds: string[] = [];

  get value(): number | readonly number[] | undefined {
    return this._value;
  }
  set value(val: number | readonly number[] | undefined) {
    if (val !== undefined) {
      this._valueIsControlled = true;
      this._value = val;
      this._internalValues = Array.isArray(val) ? [...val] : [val as number];
    } else {
      this._valueIsControlled = false;
      this._value = undefined;
    }
    this._syncAttributes();
    this._publishStateChange();
  }

  connectedCallback() {
    if (!this._initialized) {
      this._initialized = true;
      const def = this.defaultValue;
      this._internalValues = Array.isArray(def) ? [...def] : [def as number];
    }
    this.style.display = 'contents';
    this.setAttribute('role', 'group');
    this._syncAttributes();
    queueMicrotask(() => this._publishStateChange());
  }

  disconnectedCallback() {
    this._lastPublishedStateKey = null;
  }

  getValues(): readonly number[] {
    if (this._valueIsControlled && this._value !== undefined) {
      return Array.isArray(this._value) ? this._value : [this._value as number];
    }
    return this._internalValues;
  }

  getActiveThumbIndex(): number {
    return this._activeThumbIndex;
  }

  setActiveThumbIndex(index: number) {
    if (this._activeThumbIndex !== index) {
      this._activeThumbIndex = index;
      this._publishStateChange();
    }
  }

  isDragging(): boolean {
    return this._dragging;
  }

  setDragging(dragging: boolean) {
    if (this._dragging !== dragging) {
      this._dragging = dragging;
      this._syncAttributes();
      this._publishStateChange();
    }
  }

  setLabelId(id: string | undefined) {
    this._labelId = id;
    this._publishStateChange();
  }

  getLabelId(): string | undefined {
    return this._labelId;
  }

  registerThumbInputId(index: number, id: string) {
    this._thumbInputIds[index] = id;
  }

  getThumbInputIds(): string[] {
    return this._thumbInputIds;
  }

  setValue(
    newValues: number[],
    event: Event,
    reason: SliderChangeEventReason,
  ) {
    // Clamp and round all values
    const validated = newValues.map((v) => {
      const clamped = clamp(v, this.min, this.max);
      return roundToStep(clamped, this.step, this.min);
    });

    const result = validated.length === 1 ? validated[0] : validated;
    const details: SliderChangeEventDetails = { reason, event };
    this.onValueChange?.(result, details);

    if (!this._valueIsControlled) {
      this._internalValues = validated;
    }

    this._syncAttributes();
    this._publishStateChange();
  }

  setThumbValue(index: number, rawValue: number, event: Event, reason: SliderChangeEventReason) {
    const values = [...this.getValues()];
    const clamped = clamp(rawValue, this.min, this.max);
    const rounded = roundToStep(clamped, this.step, this.min);

    // Enforce minimum distance
    const minDist = this.minStepsBetweenValues * this.step;
    let newVal = rounded;
    if (index > 0 && newVal < values[index - 1] + minDist) {
      newVal = values[index - 1] + minDist;
    }
    if (index < values.length - 1 && newVal > values[index + 1] - minDist) {
      newVal = values[index + 1] - minDist;
    }
    newVal = clamp(newVal, this.min, this.max);

    values[index] = newVal;
    this.setValue(values, event, reason);
  }

  commitValue(event: Event, reason: SliderCommitEventReason) {
    const values = this.getValues();
    const result = values.length === 1 ? values[0] : values;
    const details: SliderCommitEventDetails = { reason, event };
    this.onValueCommitted?.(result, details);
  }

  getFormattedValue(index: number): string {
    const values = this.getValues();
    if (index < 0 || index >= values.length) return '';
    return formatNumber(values[index], this.locale, this.format);
  }

  getAllFormattedValues(): string[] {
    return this.getValues().map((_, i) => this.getFormattedValue(i));
  }

  private _syncAttributes() {
    this.toggleAttribute('data-disabled', this.disabled);
    this.toggleAttribute('data-dragging', this._dragging);
    this.setAttribute('data-orientation', this.orientation);
  }

  private _publishStateChange() {
    const nextKey = [
      this.getValues().join(','),
      String(this._activeThumbIndex),
      this.disabled ? 'd' : '',
      this._dragging ? 'g' : '',
      this.orientation,
      String(this.min),
      String(this.max),
      String(this.step),
      this._labelId ?? '',
    ].join('|');

    if (nextKey === this._lastPublishedStateKey) return;
    this._lastPublishedStateKey = nextKey;
    this.dispatchEvent(new CustomEvent(SLIDER_STATE_CHANGE_EVENT));
  }
}

if (!customElements.get('slider-root')) {
  customElements.define('slider-root', SliderRootElement);
}

// ─── SliderControlElement ───────────────────────────────────────────────────────

/**
 * The interactive region that handles pointer events for the slider.
 * Renders a `<slider-control>` custom element.
 *
 * Documentation: [Base UI Slider](https://base-ui.com/react/components/slider)
 */
export class SliderControlElement extends BaseHTMLElement {
  private _root: SliderRootElement | null = null;
  private _handler = () => this._syncAttributes();
  private _pressedThumbIndex = -1;
  private _dragging = false;

  connectedCallback() {
    this._root = this.closest('slider-root') as SliderRootElement | null;
    if (!this._root) {
      console.error('Base UI: Slider parts must be placed within <slider-root>.');
      return;
    }

    this.setAttribute('tabindex', '-1');
    this.style.touchAction = 'none';
    this.style.position = 'relative';

    this._root.addEventListener(SLIDER_STATE_CHANGE_EVENT, this._handler);
    this.addEventListener('pointerdown', this._handlePointerDown);

    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(SLIDER_STATE_CHANGE_EVENT, this._handler);
    this.removeEventListener('pointerdown', this._handlePointerDown);
    document.removeEventListener('pointermove', this._handlePointerMove);
    document.removeEventListener('pointerup', this._handlePointerUp);
    this._root = null;
  }

  private _getValueFromPointer(event: PointerEvent): number {
    if (!this._root) return 0;
    const rect = this.getBoundingClientRect();
    let percent: number;

    if (this._root.orientation === 'vertical') {
      percent = ((rect.bottom - event.clientY) / rect.height) * 100;
    } else {
      percent = ((event.clientX - rect.left) / rect.width) * 100;
    }

    percent = clamp(percent, 0, 100);
    return percentToValue(percent, this._root.min, this._root.max);
  }

  private _findClosestThumb(value: number): number {
    if (!this._root) return 0;
    const values = this._root.getValues();
    if (values.length <= 1) return 0;

    let closest = 0;
    let minDist = Math.abs(values[0] - value);
    for (let i = 1; i < values.length; i++) {
      const dist = Math.abs(values[i] - value);
      if (dist < minDist) {
        minDist = dist;
        closest = i;
      }
    }
    return closest;
  }

  private _handlePointerDown = (event: PointerEvent) => {
    if (!this._root || this._root.disabled) return;
    if (event.button !== 0) return;

    event.preventDefault();
    const value = this._getValueFromPointer(event);
    const thumbIndex = this._findClosestThumb(value);

    this._pressedThumbIndex = thumbIndex;
    this._dragging = true;
    this._root.setActiveThumbIndex(thumbIndex);
    this._root.setDragging(true);
    this._root.setThumbValue(thumbIndex, value, event, 'track-press');

    // Focus the thumb's hidden input
    const thumbs = this._root.querySelectorAll('slider-thumb');
    const thumb = thumbs[thumbIndex];
    const input = thumb?.querySelector('input');
    input?.focus();

    try {
      this.setPointerCapture(event.pointerId);
    } catch {
      // setPointerCapture may not be available in JSDOM
    }

    document.addEventListener('pointermove', this._handlePointerMove);
    document.addEventListener('pointerup', this._handlePointerUp);
  };

  private _handlePointerMove = (event: PointerEvent) => {
    if (!this._root || !this._dragging) return;

    const value = this._getValueFromPointer(event);
    this._root.setThumbValue(this._pressedThumbIndex, value, event, 'drag');
  };

  private _handlePointerUp = (event: PointerEvent) => {
    if (!this._root) return;

    this._dragging = false;
    this._root.setDragging(false);
    this._root.commitValue(event, this._pressedThumbIndex >= 0 ? 'drag' : 'track-press');
    this._pressedThumbIndex = -1;

    document.removeEventListener('pointermove', this._handlePointerMove);
    document.removeEventListener('pointerup', this._handlePointerUp);
  };

  private _syncAttributes() {
    if (!this._root) return;
    this.toggleAttribute('data-disabled', this._root.disabled);
    this.toggleAttribute('data-dragging', this._root.isDragging());
    this.setAttribute('data-orientation', this._root.orientation);
  }
}

if (!customElements.get('slider-control')) {
  customElements.define('slider-control', SliderControlElement);
}

// ─── SliderTrackElement ─────────────────────────────────────────────────────────

/**
 * The visual track that contains the indicator.
 * Renders a `<slider-track>` custom element.
 *
 * Documentation: [Base UI Slider](https://base-ui.com/react/components/slider)
 */
export class SliderTrackElement extends BaseHTMLElement {
  private _root: SliderRootElement | null = null;
  private _handler = () => this._syncAttributes();

  connectedCallback() {
    this._root = this.closest('slider-root') as SliderRootElement | null;
    if (!this._root) {
      console.error('Base UI: Slider parts must be placed within <slider-root>.');
      return;
    }

    this.style.position = 'relative';

    this._root.addEventListener(SLIDER_STATE_CHANGE_EVENT, this._handler);
    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(SLIDER_STATE_CHANGE_EVENT, this._handler);
    this._root = null;
  }

  private _syncAttributes() {
    if (!this._root) return;
    this.toggleAttribute('data-disabled', this._root.disabled);
    this.toggleAttribute('data-dragging', this._root.isDragging());
    this.setAttribute('data-orientation', this._root.orientation);
  }
}

if (!customElements.get('slider-track')) {
  customElements.define('slider-track', SliderTrackElement);
}

// ─── SliderThumbElement ─────────────────────────────────────────────────────────

/**
 * A draggable thumb with a hidden range input.
 * Renders a `<slider-thumb>` custom element.
 *
 * Documentation: [Base UI Slider](https://base-ui.com/react/components/slider)
 */
export class SliderThumbElement extends BaseHTMLElement {
  private _root: SliderRootElement | null = null;
  private _handler = () => this._syncAttributes();
  private _input: HTMLInputElement | null = null;
  private _index = -1;

  /** Get/set ARIA label dynamically per index. */
  getAriaLabel: ((index: number) => string) | undefined;

  /** Get/set ARIA value text dynamically. */
  getAriaValueText:
    | ((formattedValue: string, value: number, index: number) => string)
    | undefined;

  connectedCallback() {
    this._root = this.closest('slider-root') as SliderRootElement | null;
    if (!this._root) {
      console.error('Base UI: Slider parts must be placed within <slider-root>.');
      return;
    }

    // Determine index from sibling position
    const thumbs = this._root.querySelectorAll('slider-thumb');
    this._index = Array.from(thumbs).indexOf(this);

    this.style.position = 'absolute';

    // Create hidden input
    this._input = this.querySelector('input') as HTMLInputElement | null;
    if (!this._input) {
      this._input = document.createElement('input');
      this._input.type = 'range';
      this._input.style.cssText =
        'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0';
      this.appendChild(this._input);
    }

    ensureId(this._input, 'base-ui-slider-thumb-input');
    this._root.registerThumbInputId(this._index, this._input.id);

    this._root.addEventListener(SLIDER_STATE_CHANGE_EVENT, this._handler);
    this._input.addEventListener('keydown', this._handleKeyDown);
    this._input.addEventListener('focus', this._handleFocus);
    this._input.addEventListener('blur', this._handleBlur);

    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(SLIDER_STATE_CHANGE_EVENT, this._handler);
    if (this._input) {
      this._input.removeEventListener('keydown', this._handleKeyDown);
      this._input.removeEventListener('focus', this._handleFocus);
      this._input.removeEventListener('blur', this._handleBlur);
    }
    this._root = null;
    this._input = null;
  }

  private _handleKeyDown = (event: KeyboardEvent) => {
    if (!this._root || this._root.disabled) return;

    const { step, largeStep, min, max, orientation } = this._root;
    const values = this._root.getValues();
    const currentValue = values[this._index] ?? 0;
    let newValue: number | null = null;
    let handled = false;

    const effectiveStep = event.shiftKey ? largeStep : step;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        newValue = currentValue + effectiveStep;
        handled = true;
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        newValue = currentValue - effectiveStep;
        handled = true;
        break;
      case 'PageUp':
        newValue = currentValue + largeStep;
        handled = true;
        break;
      case 'PageDown':
        newValue = currentValue - largeStep;
        handled = true;
        break;
      case 'Home':
        newValue = min;
        handled = true;
        break;
      case 'End':
        newValue = max;
        handled = true;
        break;
    }

    if (handled && newValue !== null) {
      event.preventDefault();
      this._root.setThumbValue(this._index, newValue, event, 'keyboard');
      this._root.commitValue(event, 'keyboard');
    }
  };

  private _handleFocus = () => {
    if (this._root) {
      this._root.setActiveThumbIndex(this._index);
    }
  };

  private _handleBlur = () => {
    // Nothing specific needed on blur
  };

  private _syncAttributes() {
    if (!this._root || !this._input) return;

    const values = this._root.getValues();
    const value = values[this._index] ?? 0;
    const percent = valueToPercent(value, this._root.min, this._root.max);

    // Position the thumb
    if (this._root.orientation === 'vertical') {
      this.style.bottom = `${percent}%`;
      this.style.insetInlineStart = '';
    } else {
      this.style.insetInlineStart = `${percent}%`;
      this.style.bottom = '';
    }

    // Update hidden input
    this._input.min = String(this._root.min);
    this._input.max = String(this._root.max);
    this._input.step = String(this._root.step);
    this._input.value = String(value);
    this._input.disabled = this._root.disabled;
    this._input.setAttribute('aria-valuenow', String(value));
    this._input.setAttribute('aria-valuemin', String(this._root.min));
    this._input.setAttribute('aria-valuemax', String(this._root.max));
    this._input.setAttribute('aria-orientation', this._root.orientation);

    // ARIA value text
    const formatted = this._root.getFormattedValue(this._index);
    if (this.getAriaValueText) {
      this._input.setAttribute(
        'aria-valuetext',
        this.getAriaValueText(formatted, value, this._index),
      );
    } else {
      this._input.setAttribute('aria-valuetext', formatted);
    }

    // ARIA label
    if (this.getAriaLabel) {
      this._input.setAttribute('aria-label', this.getAriaLabel(this._index));
    }

    // Label association
    const labelId = this._root.getLabelId();
    if (labelId) {
      this._input.setAttribute('aria-labelledby', labelId);
    }

    // Data attributes
    this.toggleAttribute('data-disabled', this._root.disabled);
    this.toggleAttribute('data-dragging', this._root.isDragging());
    this.setAttribute('data-slider-thumb-index', String(this._index));
  }
}

if (!customElements.get('slider-thumb')) {
  customElements.define('slider-thumb', SliderThumbElement);
}

// ─── SliderIndicatorElement ─────────────────────────────────────────────────────

/**
 * The visual indicator of the slider value.
 * Renders a `<slider-indicator>` custom element.
 *
 * Documentation: [Base UI Slider](https://base-ui.com/react/components/slider)
 */
export class SliderIndicatorElement extends BaseHTMLElement {
  private _root: SliderRootElement | null = null;
  private _handler = () => this._syncAttributes();

  connectedCallback() {
    this._root = this.closest('slider-root') as SliderRootElement | null;
    if (!this._root) {
      console.error('Base UI: Slider parts must be placed within <slider-root>.');
      return;
    }

    this.style.position = 'absolute';

    this._root.addEventListener(SLIDER_STATE_CHANGE_EVENT, this._handler);
    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(SLIDER_STATE_CHANGE_EVENT, this._handler);
    this._root = null;
  }

  private _syncAttributes() {
    if (!this._root) return;

    const values = this._root.getValues();
    const { min, max, orientation } = this._root;

    let startPercent: number;
    let sizePercent: number;

    if (values.length === 1) {
      // Single value: from 0% to value%
      startPercent = 0;
      sizePercent = valueToPercent(values[0], min, max);
    } else {
      // Range: from first value to last value
      const first = Math.min(...values);
      const last = Math.max(...values);
      startPercent = valueToPercent(first, min, max);
      sizePercent = valueToPercent(last, min, max) - startPercent;
    }

    if (orientation === 'vertical') {
      this.style.bottom = `${startPercent}%`;
      this.style.height = `${sizePercent}%`;
      this.style.insetInlineStart = '';
      this.style.width = '';
    } else {
      this.style.insetInlineStart = `${startPercent}%`;
      this.style.width = `${sizePercent}%`;
      this.style.bottom = '';
      this.style.height = '';
    }

    this.toggleAttribute('data-disabled', this._root.disabled);
    this.toggleAttribute('data-dragging', this._root.isDragging());
    this.setAttribute('data-orientation', this._root.orientation);
  }
}

if (!customElements.get('slider-indicator')) {
  customElements.define('slider-indicator', SliderIndicatorElement);
}

// ─── SliderLabelElement ─────────────────────────────────────────────────────────

/**
 * An accessible label for the slider.
 * Renders a `<slider-label>` custom element.
 *
 * Documentation: [Base UI Slider](https://base-ui.com/react/components/slider)
 */
export class SliderLabelElement extends BaseHTMLElement {
  private _root: SliderRootElement | null = null;
  private _handler = () => this._syncAttributes();

  connectedCallback() {
    this._root = this.closest('slider-root') as SliderRootElement | null;
    if (!this._root) {
      console.error('Base UI: Slider parts must be placed within <slider-root>.');
      return;
    }

    ensureId(this, 'base-ui-slider-label');
    this._root.setLabelId(this.id);

    this._root.addEventListener(SLIDER_STATE_CHANGE_EVENT, this._handler);

    this.addEventListener('click', this._handleClick);

    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(SLIDER_STATE_CHANGE_EVENT, this._handler);
    this.removeEventListener('click', this._handleClick);
    if (this._root) {
      this._root.setLabelId(undefined);
    }
    this._root = null;
  }

  private _handleClick = () => {
    if (!this._root) return;
    // Focus first thumb input
    const thumb = this._root.querySelector('slider-thumb');
    const input = thumb?.querySelector('input');
    input?.focus();
  };

  private _syncAttributes() {
    if (!this._root) return;
    this.toggleAttribute('data-disabled', this._root.disabled);
  }
}

if (!customElements.get('slider-label')) {
  customElements.define('slider-label', SliderLabelElement);
}

// ─── SliderValueElement ─────────────────────────────────────────────────────────

/**
 * Displays the current value(s) of the slider.
 * Renders a `<slider-value>` custom element.
 *
 * Documentation: [Base UI Slider](https://base-ui.com/react/components/slider)
 */
export class SliderValueElement extends BaseHTMLElement {
  private _root: SliderRootElement | null = null;
  private _handler = () => this._syncAttributes();

  /** Custom render function for the value display. */
  renderValue: ((formattedValues: string[], values: readonly number[]) => string) | undefined;

  connectedCallback() {
    this._root = this.closest('slider-root') as SliderRootElement | null;
    if (!this._root) {
      console.error('Base UI: Slider parts must be placed within <slider-root>.');
      return;
    }

    this.setAttribute('aria-hidden', 'true');

    this._root.addEventListener(SLIDER_STATE_CHANGE_EVENT, this._handler);
    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(SLIDER_STATE_CHANGE_EVENT, this._handler);
    this._root = null;
  }

  private _syncAttributes() {
    if (!this._root) return;

    const values = this._root.getValues();
    const formatted = this._root.getAllFormattedValues();

    // Set htmlFor linking to thumb inputs
    const ids = this._root.getThumbInputIds().filter(Boolean);
    if (ids.length > 0) {
      this.setAttribute('for', ids.join(' '));
    }

    if (this.renderValue) {
      this.textContent = this.renderValue(formatted, values);
    } else {
      this.textContent = formatted.join(' \u2013 ');
    }
  }
}

if (!customElements.get('slider-value')) {
  customElements.define('slider-value', SliderValueElement);
}

// ─── Namespace exports ──────────────────────────────────────────────────────────

export namespace SliderRoot {
  export type State = SliderRootState;
  export type ChangeEventReason = SliderChangeEventReason;
  export type ChangeEventDetails = SliderChangeEventDetails;
  export type CommitEventReason = SliderCommitEventReason;
  export type CommitEventDetails = SliderCommitEventDetails;
  export type Orientation = SliderOrientation;
}

export namespace SliderControl {
  export type State = SliderControlState;
}

export namespace SliderTrack {
  export type State = SliderTrackState;
}

export namespace SliderThumb {
  export type State = SliderThumbState;
}

export namespace SliderIndicator {
  export type State = SliderIndicatorState;
}

export namespace SliderLabel {
  export type State = SliderLabelState;
}

export namespace SliderValue {
  export type State = SliderValueState;
}

// ─── Global type declarations ───────────────────────────────────────────────────

declare global {
  interface HTMLElementTagNameMap {
    'slider-root': SliderRootElement;
    'slider-control': SliderControlElement;
    'slider-track': SliderTrackElement;
    'slider-thumb': SliderThumbElement;
    'slider-indicator': SliderIndicatorElement;
    'slider-label': SliderLabelElement;
    'slider-value': SliderValueElement;
  }
}
