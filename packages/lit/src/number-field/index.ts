import { BaseHTMLElement, ensureId } from '../utils/index.ts';

// ─── Constants ──────────────────────────────────────────────────────────────────

const NF_STATE_CHANGE_EVENT = 'base-ui-number-field-state-change';
const START_AUTO_CHANGE_DELAY = 400;
const CHANGE_VALUE_TICK_DELAY = 60;

// ─── Types ──────────────────────────────────────────────────────────────────────

export type NumberFieldChangeEventReason =
  | 'increment-press'
  | 'decrement-press'
  | 'keyboard'
  | 'input-change'
  | 'input-blur'
  | 'input-clear'
  | 'wheel'
  | 'scrub'
  | 'none';

export interface NumberFieldChangeEventDetails {
  reason: NumberFieldChangeEventReason;
  event: Event;
}

export interface NumberFieldRootState {
  value: number | null;
  inputValue: string;
  disabled: boolean;
  readOnly: boolean;
  required: boolean;
  scrubbing: boolean;
}

export interface NumberFieldGroupState {
  disabled: boolean;
}

export interface NumberFieldInputState {
  value: number | null;
  inputValue: string;
}

export interface NumberFieldIncrementState {
  disabled: boolean;
}

export interface NumberFieldDecrementState {
  disabled: boolean;
}

export interface NumberFieldScrubAreaState {
  scrubbing: boolean;
  direction: 'horizontal' | 'vertical';
}

export interface NumberFieldScrubAreaCursorState {
  scrubbing: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function formatNumber(
  value: number | null,
  locale?: string,
  options?: Intl.NumberFormatOptions,
): string {
  if (value == null) return '';
  try {
    return new Intl.NumberFormat(locale, options).format(value);
  } catch {
    return String(value);
  }
}

function removeFloatingPointErrors(value: number, maxFractionDigits = 10): number {
  return parseFloat(value.toFixed(maxFractionDigits));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// ─── NumberFieldRootElement ─────────────────────────────────────────────────────

/**
 * Groups all parts of the number field.
 * Renders a `<number-field-root>` custom element (display:contents).
 *
 * Documentation: [Base UI NumberField](https://base-ui.com/react/components/number-field)
 */
export class NumberFieldRootElement extends BaseHTMLElement {
  /** Default value (uncontrolled). */
  defaultValue: number | null = null;

  /** Minimum allowed value. */
  min = -Infinity;

  /** Maximum allowed value. */
  max = Infinity;

  /** Step amount for increment/decrement. */
  step = 1;

  /** Small step amount (used with Alt key). */
  smallStep = 0.1;

  /** Large step amount (used with Shift key). */
  largeStep = 10;

  /** Whether the field is disabled. */
  disabled = false;

  /** Whether the field is read-only. */
  readOnly = false;

  /** Whether the field is required. */
  required = false;

  /** Whether to allow mouse wheel scrubbing. */
  allowWheelScrub = false;

  /** Intl.NumberFormatOptions for formatting. */
  format: Intl.NumberFormatOptions | undefined;

  /** Locale for formatting. */
  locale: string | undefined;

  /** Callback when value changes. */
  onValueChange:
    | ((value: number | null, details: NumberFieldChangeEventDetails) => void)
    | undefined;

  /** Callback when value is committed (e.g., on blur). */
  onValueCommitted:
    | ((value: number | null, details: NumberFieldChangeEventDetails) => void)
    | undefined;

  // Controlled/uncontrolled value
  private _value: number | null | undefined;
  private _valueIsControlled = false;
  private _internalValue: number | null = null;
  private _initialized = false;
  private _inputValue = '';
  private _scrubbing = false;
  private _lastPublishedStateKey: string | null = null;
  private _inputId: string | undefined;
  private _labelId: string | undefined;

  get value(): number | null | undefined {
    return this._value;
  }
  set value(val: number | null | undefined) {
    if (val !== undefined) {
      this._valueIsControlled = true;
      this._value = val;
      this._inputValue = formatNumber(val, this.locale, this.format);
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
      this._internalValue = this.defaultValue;
      this._inputValue = formatNumber(this._internalValue, this.locale, this.format);
    }

    this.style.display = 'contents';

    this._syncAttributes();
    queueMicrotask(() => this._publishStateChange());
  }

  disconnectedCallback() {
    this._lastPublishedStateKey = null;
  }

  getValue(): number | null {
    return this._valueIsControlled ? (this._value ?? null) : this._internalValue;
  }

  getInputValue(): string {
    return this._inputValue;
  }

  getInputId(): string | undefined {
    return this._inputId;
  }

  setInputId(id: string | undefined) {
    this._inputId = id;
    this._publishStateChange();
  }

  setLabelId(id: string | undefined) {
    this._labelId = id;
    this._publishStateChange();
  }

  getLabelId(): string | undefined {
    return this._labelId;
  }

  setScrubbing(scrubbing: boolean) {
    if (this._scrubbing === scrubbing) return;
    this._scrubbing = scrubbing;
    this._publishStateChange();
  }

  getStepAmount(event?: { altKey?: boolean; shiftKey?: boolean }): number {
    if (event?.altKey) return this.smallStep;
    if (event?.shiftKey) return this.largeStep;
    return this.step;
  }

  isAtMin(): boolean {
    const val = this.getValue();
    return val != null && val <= this.min;
  }

  isAtMax(): boolean {
    const val = this.getValue();
    return val != null && val >= this.max;
  }

  setValue(
    rawValue: number | null,
    event: Event,
    reason: NumberFieldChangeEventReason,
    opts?: { direction?: 1 | -1; clampToRange?: boolean },
  ) {
    let validated = rawValue;

    if (validated != null) {
      // Clamp to range for step-based changes
      if (opts?.clampToRange !== false) {
        validated = clamp(validated, this.min, this.max);
      }

      // Remove floating point errors
      validated = removeFloatingPointErrors(validated);
    }

    const details: NumberFieldChangeEventDetails = { reason, event };
    this.onValueChange?.(validated, details);

    if (!this._valueIsControlled) {
      this._internalValue = validated;
    }

    this._inputValue = formatNumber(validated, this.locale, this.format);
    this._syncAttributes();
    this._publishStateChange();
  }

  setInputValueDirect(inputValue: string) {
    this._inputValue = inputValue;
    this._publishStateChange();
  }

  increment(event: Event, reason: NumberFieldChangeEventReason = 'increment-press') {
    if (this.disabled || this.readOnly) return;
    const current = this.getValue() ?? 0;
    const stepAmount = this.getStepAmount(event as KeyboardEvent);
    this.setValue(current + stepAmount, event, reason, { direction: 1 });
  }

  decrement(event: Event, reason: NumberFieldChangeEventReason = 'decrement-press') {
    if (this.disabled || this.readOnly) return;
    const current = this.getValue() ?? 0;
    const stepAmount = this.getStepAmount(event as KeyboardEvent);
    this.setValue(current - stepAmount, event, reason, { direction: -1 });
  }

  commitValue(event: Event, reason: NumberFieldChangeEventReason = 'input-blur') {
    const details: NumberFieldChangeEventDetails = { reason, event };
    this.onValueCommitted?.(this.getValue(), details);
  }

  private _syncAttributes() {
    this.toggleAttribute('data-disabled', this.disabled);
    this.toggleAttribute('data-readonly', this.readOnly);
    this.toggleAttribute('data-required', this.required);
    this.toggleAttribute('data-scrubbing', this._scrubbing);
  }

  private _publishStateChange() {
    const nextKey = [
      String(this.getValue()),
      this._inputValue,
      this.disabled ? 'd' : '',
      this.readOnly ? 'r' : '',
      this.required ? 'q' : '',
      this._scrubbing ? 's' : '',
      this._inputId ?? '',
      this._labelId ?? '',
    ].join('|');

    if (nextKey === this._lastPublishedStateKey) return;
    this._lastPublishedStateKey = nextKey;
    this.dispatchEvent(new CustomEvent(NF_STATE_CHANGE_EVENT));
  }
}

if (!customElements.get('number-field-root')) {
  customElements.define('number-field-root', NumberFieldRootElement);
}

// ─── NumberFieldGroupElement ────────────────────────────────────────────────────

/**
 * A container for the number field input and buttons.
 * Renders a `<number-field-group>` custom element.
 *
 * Documentation: [Base UI NumberField](https://base-ui.com/react/components/number-field)
 */
export class NumberFieldGroupElement extends BaseHTMLElement {
  private _root: NumberFieldRootElement | null = null;
  private _handler = () => this._syncAttributes();

  connectedCallback() {
    this._root = this.closest('number-field-root') as NumberFieldRootElement | null;
    if (!this._root) {
      console.error(
        'Base UI: NumberField parts must be placed within <number-field-root>.',
      );
      return;
    }

    this.setAttribute('role', 'group');

    this._root.addEventListener(NF_STATE_CHANGE_EVENT, this._handler);

    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(NF_STATE_CHANGE_EVENT, this._handler);
    this._root = null;
  }

  private _syncAttributes() {
    if (!this._root) return;
    this.toggleAttribute('data-disabled', this._root.disabled);
    this.toggleAttribute('data-readonly', this._root.readOnly);
  }
}

if (!customElements.get('number-field-group')) {
  customElements.define('number-field-group', NumberFieldGroupElement);
}

// ─── NumberFieldInputElement ────────────────────────────────────────────────────

/**
 * The text input for the number field.
 * Renders a `<number-field-input>` custom element.
 *
 * Documentation: [Base UI NumberField](https://base-ui.com/react/components/number-field)
 */
export class NumberFieldInputElement extends BaseHTMLElement {
  private _root: NumberFieldRootElement | null = null;
  private _handler = () => this._syncAttributes();
  private _input: HTMLInputElement | null = null;
  private _allowSync = true;

  connectedCallback() {
    this._root = this.closest('number-field-root') as NumberFieldRootElement | null;
    if (!this._root) {
      console.error(
        'Base UI: NumberField parts must be placed within <number-field-root>.',
      );
      return;
    }

    ensureId(this, 'base-ui-number-field-input');
    this._root.setInputId(this.id);

    // Create internal input element
    this._input = this.querySelector('input') as HTMLInputElement | null;
    if (!this._input) {
      this._input = document.createElement('input');
      this._input.type = 'text';
      this.appendChild(this._input);
    }

    this._input.setAttribute('inputmode', 'decimal');
    this._input.setAttribute('autocomplete', 'off');
    this._input.setAttribute('autocorrect', 'off');
    this._input.setAttribute('spellcheck', 'false');
    this._input.setAttribute('aria-roledescription', 'Number field');

    this._root.addEventListener(NF_STATE_CHANGE_EVENT, this._handler);

    this._input.addEventListener('input', this._handleInput);
    this._input.addEventListener('keydown', this._handleKeyDown);
    this._input.addEventListener('blur', this._handleBlur);
    this._input.addEventListener('focus', this._handleFocus);

    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(NF_STATE_CHANGE_EVENT, this._handler);

    if (this._input) {
      this._input.removeEventListener('input', this._handleInput);
      this._input.removeEventListener('keydown', this._handleKeyDown);
      this._input.removeEventListener('blur', this._handleBlur);
      this._input.removeEventListener('focus', this._handleFocus);
    }

    if (this._root) {
      this._root.setInputId(undefined);
    }
    this._root = null;
    this._input = null;
  }

  private _handleInput = (event: Event) => {
    if (!this._root || !this._input) return;

    this._allowSync = false;
    const inputValue = this._input.value;
    this._root.setInputValueDirect(inputValue);

    // Try to parse the value
    const parsed = parseFloat(inputValue.replace(/[^0-9.\-]/g, ''));
    if (!isNaN(parsed)) {
      this._root.setValue(parsed, event, 'input-change', { clampToRange: false });
    } else if (inputValue === '' || inputValue === '-') {
      // Allow empty or just minus sign during typing
    }
  };

  private _handleKeyDown = (event: KeyboardEvent) => {
    if (!this._root) return;
    if (this._root.disabled || this._root.readOnly) return;

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this._allowSync = true;
      this._root.increment(event, 'keyboard');
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      this._allowSync = true;
      this._root.decrement(event, 'keyboard');
    } else if (event.key === 'Home' && this._root.min > -Infinity) {
      event.preventDefault();
      this._allowSync = true;
      this._root.setValue(this._root.min, event, 'keyboard');
    } else if (event.key === 'End' && this._root.max < Infinity) {
      event.preventDefault();
      this._allowSync = true;
      this._root.setValue(this._root.max, event, 'keyboard');
    }
  };

  private _handleBlur = (event: Event) => {
    if (!this._root || !this._input) return;

    this._allowSync = true;
    const inputValue = this._input.value.trim();

    if (inputValue === '') {
      this._root.setValue(null, event, 'input-clear');
    } else {
      const parsed = parseFloat(inputValue.replace(/[^0-9.\-]/g, ''));
      if (!isNaN(parsed)) {
        this._root.setValue(parsed, event, 'input-blur');
      }
    }

    this._root.commitValue(event, 'input-blur');
  };

  private _handleFocus = () => {
    // Select all on focus
    if (this._input) {
      requestAnimationFrame(() => {
        this._input?.select();
      });
    }
  };

  private _syncAttributes() {
    if (!this._root || !this._input) return;

    // Only update display value if not actively typing
    if (this._allowSync) {
      this._input.value = this._root.getInputValue();
    }

    this._input.disabled = this._root.disabled;
    this._input.readOnly = this._root.readOnly;
    this._input.required = this._root.required;

    const labelId = this._root.getLabelId();
    if (labelId) {
      this._input.setAttribute('aria-labelledby', labelId);
    }

    this.toggleAttribute('data-disabled', this._root.disabled);
    this.toggleAttribute('data-readonly', this._root.readOnly);
  }
}

if (!customElements.get('number-field-input')) {
  customElements.define('number-field-input', NumberFieldInputElement);
}

// ─── NumberFieldIncrementElement ─────────────────────────────────────────────────

/**
 * A button to increment the number field value.
 * Renders a `<number-field-increment>` custom element.
 *
 * Documentation: [Base UI NumberField](https://base-ui.com/react/components/number-field)
 */
export class NumberFieldIncrementElement extends BaseHTMLElement {
  private _root: NumberFieldRootElement | null = null;
  private _handler = () => this._syncAttributes();
  private _holdTimer: ReturnType<typeof setTimeout> | null = null;
  private _tickTimer: ReturnType<typeof setInterval> | null = null;

  connectedCallback() {
    this._root = this.closest('number-field-root') as NumberFieldRootElement | null;
    if (!this._root) {
      console.error(
        'Base UI: NumberField parts must be placed within <number-field-root>.',
      );
      return;
    }

    this.setAttribute('role', 'button');
    this.setAttribute('tabindex', '-1');
    this.setAttribute('aria-label', 'Increase');

    this._root.addEventListener(NF_STATE_CHANGE_EVENT, this._handler);

    this.addEventListener('pointerdown', this._handlePointerDown);
    this.addEventListener('pointerup', this._handlePointerUp);
    this.addEventListener('pointercancel', this._handlePointerUp);
    this.addEventListener('pointerleave', this._handlePointerUp);

    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(NF_STATE_CHANGE_EVENT, this._handler);
    this.removeEventListener('pointerdown', this._handlePointerDown);
    this.removeEventListener('pointerup', this._handlePointerUp);
    this.removeEventListener('pointercancel', this._handlePointerUp);
    this.removeEventListener('pointerleave', this._handlePointerUp);
    this._clearTimers();
    this._root = null;
  }

  private _handlePointerDown = (event: PointerEvent) => {
    if (!this._root) return;
    if (event.button !== 0) return;
    if (this._root.disabled || this._root.readOnly) return;

    event.preventDefault();
    this._root.increment(event);

    // Start hold-to-repeat
    this._holdTimer = setTimeout(() => {
      this._tickTimer = setInterval(() => {
        if (this._root) {
          this._root.increment(event);
        }
      }, CHANGE_VALUE_TICK_DELAY);
    }, START_AUTO_CHANGE_DELAY);
  };

  private _handlePointerUp = (event: PointerEvent) => {
    this._clearTimers();
    if (this._root) {
      this._root.commitValue(event, 'increment-press');
    }
  };

  private _clearTimers() {
    if (this._holdTimer != null) {
      clearTimeout(this._holdTimer);
      this._holdTimer = null;
    }
    if (this._tickTimer != null) {
      clearInterval(this._tickTimer);
      this._tickTimer = null;
    }
  }

  private _syncAttributes() {
    if (!this._root) return;
    const disabled = this._root.disabled || this._root.isAtMax();
    this.toggleAttribute('data-disabled', disabled);
    this.toggleAttribute('disabled', disabled);

    const inputId = this._root.getInputId();
    if (inputId) {
      this.setAttribute('aria-controls', inputId);
    }

    if (this._root.readOnly) {
      this.setAttribute('aria-readonly', 'true');
    } else {
      this.removeAttribute('aria-readonly');
    }
  }
}

if (!customElements.get('number-field-increment')) {
  customElements.define('number-field-increment', NumberFieldIncrementElement);
}

// ─── NumberFieldDecrementElement ─────────────────────────────────────────────────

/**
 * A button to decrement the number field value.
 * Renders a `<number-field-decrement>` custom element.
 *
 * Documentation: [Base UI NumberField](https://base-ui.com/react/components/number-field)
 */
export class NumberFieldDecrementElement extends BaseHTMLElement {
  private _root: NumberFieldRootElement | null = null;
  private _handler = () => this._syncAttributes();
  private _holdTimer: ReturnType<typeof setTimeout> | null = null;
  private _tickTimer: ReturnType<typeof setInterval> | null = null;

  connectedCallback() {
    this._root = this.closest('number-field-root') as NumberFieldRootElement | null;
    if (!this._root) {
      console.error(
        'Base UI: NumberField parts must be placed within <number-field-root>.',
      );
      return;
    }

    this.setAttribute('role', 'button');
    this.setAttribute('tabindex', '-1');
    this.setAttribute('aria-label', 'Decrease');

    this._root.addEventListener(NF_STATE_CHANGE_EVENT, this._handler);

    this.addEventListener('pointerdown', this._handlePointerDown);
    this.addEventListener('pointerup', this._handlePointerUp);
    this.addEventListener('pointercancel', this._handlePointerUp);
    this.addEventListener('pointerleave', this._handlePointerUp);

    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(NF_STATE_CHANGE_EVENT, this._handler);
    this.removeEventListener('pointerdown', this._handlePointerDown);
    this.removeEventListener('pointerup', this._handlePointerUp);
    this.removeEventListener('pointercancel', this._handlePointerUp);
    this.removeEventListener('pointerleave', this._handlePointerUp);
    this._clearTimers();
    this._root = null;
  }

  private _handlePointerDown = (event: PointerEvent) => {
    if (!this._root) return;
    if (event.button !== 0) return;
    if (this._root.disabled || this._root.readOnly) return;

    event.preventDefault();
    this._root.decrement(event);

    // Start hold-to-repeat
    this._holdTimer = setTimeout(() => {
      this._tickTimer = setInterval(() => {
        if (this._root) {
          this._root.decrement(event);
        }
      }, CHANGE_VALUE_TICK_DELAY);
    }, START_AUTO_CHANGE_DELAY);
  };

  private _handlePointerUp = (event: PointerEvent) => {
    this._clearTimers();
    if (this._root) {
      this._root.commitValue(event, 'decrement-press');
    }
  };

  private _clearTimers() {
    if (this._holdTimer != null) {
      clearTimeout(this._holdTimer);
      this._holdTimer = null;
    }
    if (this._tickTimer != null) {
      clearInterval(this._tickTimer);
      this._tickTimer = null;
    }
  }

  private _syncAttributes() {
    if (!this._root) return;
    const disabled = this._root.disabled || this._root.isAtMin();
    this.toggleAttribute('data-disabled', disabled);
    this.toggleAttribute('disabled', disabled);

    const inputId = this._root.getInputId();
    if (inputId) {
      this.setAttribute('aria-controls', inputId);
    }

    if (this._root.readOnly) {
      this.setAttribute('aria-readonly', 'true');
    } else {
      this.removeAttribute('aria-readonly');
    }
  }
}

if (!customElements.get('number-field-decrement')) {
  customElements.define('number-field-decrement', NumberFieldDecrementElement);
}

// ─── NumberFieldScrubAreaElement ─────────────────────────────────────────────────

/**
 * A drag area for scrubbing the number field value.
 * Renders a `<number-field-scrub-area>` custom element.
 *
 * Documentation: [Base UI NumberField](https://base-ui.com/react/components/number-field)
 */
export class NumberFieldScrubAreaElement extends BaseHTMLElement {
  private _root: NumberFieldRootElement | null = null;

  /** Drag direction. */
  direction: 'horizontal' | 'vertical' = 'horizontal';

  /** Pixels per step change. */
  pixelSensitivity = 2;

  // Scrub tracking
  private _startX = 0;
  private _startY = 0;
  private _accumulatedMovement = 0;
  private _dragging = false;
  private _pointerId: number | null = null;

  connectedCallback() {
    this._root = this.closest('number-field-root') as NumberFieldRootElement | null;
    if (!this._root) {
      console.error(
        'Base UI: NumberField parts must be placed within <number-field-root>.',
      );
      return;
    }

    this.setAttribute('role', 'presentation');
    this.style.touchAction = 'none';
    this.style.userSelect = 'none';

    this.addEventListener('pointerdown', this._handlePointerDown);
    this.addEventListener('pointermove', this._handlePointerMove);
    this.addEventListener('pointerup', this._handlePointerUp);
    this.addEventListener('pointercancel', this._handlePointerUp);
  }

  disconnectedCallback() {
    this.removeEventListener('pointerdown', this._handlePointerDown);
    this.removeEventListener('pointermove', this._handlePointerMove);
    this.removeEventListener('pointerup', this._handlePointerUp);
    this.removeEventListener('pointercancel', this._handlePointerUp);
    this._root = null;
  }

  private _handlePointerDown = (event: PointerEvent) => {
    if (!this._root) return;
    if (event.button !== 0) return;
    if (this._root.disabled || this._root.readOnly) return;

    this._startX = event.clientX;
    this._startY = event.clientY;
    this._accumulatedMovement = 0;
    this._dragging = true;
    this._pointerId = event.pointerId;
    this._root.setScrubbing(true);

    try {
      this.setPointerCapture(event.pointerId);
    } catch {
      // setPointerCapture may not be available in JSDOM
    }

    this.toggleAttribute('data-scrubbing', true);
  };

  private _handlePointerMove = (event: PointerEvent) => {
    if (!this._dragging || !this._root) return;
    if (event.pointerId !== this._pointerId) return;

    let delta: number;
    if (this.direction === 'horizontal') {
      delta = event.clientX - this._startX;
    } else {
      // Vertical: up is increase (negative Y)
      delta = -(event.clientY - this._startY);
    }

    this._startX = event.clientX;
    this._startY = event.clientY;

    this._accumulatedMovement += delta;

    while (Math.abs(this._accumulatedMovement) >= this.pixelSensitivity) {
      if (this._accumulatedMovement > 0) {
        this._root.increment(event, 'scrub');
        this._accumulatedMovement -= this.pixelSensitivity;
      } else {
        this._root.decrement(event, 'scrub');
        this._accumulatedMovement += this.pixelSensitivity;
      }
    }
  };

  private _handlePointerUp = (event: PointerEvent) => {
    if (!this._dragging) return;
    this._dragging = false;
    this._pointerId = null;

    if (this._root) {
      this._root.setScrubbing(false);
      this._root.commitValue(event, 'scrub');
    }

    this.removeAttribute('data-scrubbing');
  };
}

if (!customElements.get('number-field-scrub-area')) {
  customElements.define('number-field-scrub-area', NumberFieldScrubAreaElement);
}

// ─── NumberFieldScrubAreaCursorElement ───────────────────────────────────────────

/**
 * A visual cursor shown during scrub interactions.
 * Renders a `<number-field-scrub-area-cursor>` custom element.
 *
 * Documentation: [Base UI NumberField](https://base-ui.com/react/components/number-field)
 */
export class NumberFieldScrubAreaCursorElement extends BaseHTMLElement {
  private _root: NumberFieldRootElement | null = null;
  private _handler = () => this._syncAttributes();

  connectedCallback() {
    this._root = this.closest('number-field-root') as NumberFieldRootElement | null;
    if (!this._root) {
      console.error(
        'Base UI: NumberField parts must be placed within <number-field-root>.',
      );
      return;
    }

    this.style.position = 'fixed';
    this.style.pointerEvents = 'none';

    this._root.addEventListener(NF_STATE_CHANGE_EVENT, this._handler);

    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(NF_STATE_CHANGE_EVENT, this._handler);
    this._root = null;
  }

  private _syncAttributes() {
    if (!this._root) return;
    // Hidden unless scrubbing - in a real implementation this would track cursor position
    this.toggleAttribute('data-scrubbing', false);
    this.setAttribute('hidden', '');
  }
}

if (!customElements.get('number-field-scrub-area-cursor')) {
  customElements.define('number-field-scrub-area-cursor', NumberFieldScrubAreaCursorElement);
}

// ─── Namespace exports ──────────────────────────────────────────────────────────

export namespace NumberFieldRoot {
  export type State = NumberFieldRootState;
  export type ChangeEventReason = NumberFieldChangeEventReason;
  export type ChangeEventDetails = NumberFieldChangeEventDetails;
}

export namespace NumberFieldGroup {
  export type State = NumberFieldGroupState;
}

export namespace NumberFieldInput {
  export type State = NumberFieldInputState;
}

export namespace NumberFieldIncrement {
  export type State = NumberFieldIncrementState;
}

export namespace NumberFieldDecrement {
  export type State = NumberFieldDecrementState;
}

export namespace NumberFieldScrubArea {
  export type State = NumberFieldScrubAreaState;
}

export namespace NumberFieldScrubAreaCursor {
  export type State = NumberFieldScrubAreaCursorState;
}

// ─── Global type declarations ───────────────────────────────────────────────────

declare global {
  interface HTMLElementTagNameMap {
    'number-field-root': NumberFieldRootElement;
    'number-field-group': NumberFieldGroupElement;
    'number-field-input': NumberFieldInputElement;
    'number-field-increment': NumberFieldIncrementElement;
    'number-field-decrement': NumberFieldDecrementElement;
    'number-field-scrub-area': NumberFieldScrubAreaElement;
    'number-field-scrub-area-cursor': NumberFieldScrubAreaCursorElement;
  }
}
