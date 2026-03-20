import { ReactiveElement } from 'lit';
import { BaseHTMLElement, ensureId, formatNumberValue, valueToPercent } from '../utils/index.ts';

// ─── Constants ──────────────────────────────────────────────────────────────────

const STATE_CHANGE_EVENT = 'base-ui-meter-state-change';
const NVDA_FORCE_ANNOUNCEMENT_STYLE =
  'position:fixed;top:0;left:0;width:1px;height:1px;margin:-1px;padding:0;border:0;overflow:hidden;white-space:nowrap;clip-path:inset(50%)';
const CONTEXT_ERROR =
  'Base UI: MeterRootContext is missing. Meter parts must be placed within <meter-root>.';

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface MeterRootState {}
export interface MeterTrackState extends MeterRootState {}
export interface MeterIndicatorState extends MeterRootState {}
export interface MeterValueState extends MeterRootState {}
export interface MeterLabelState extends MeterRootState {}

// ─── MeterRootElement ────────────────────────────────────────────────────────────

/**
 * Groups all parts of the meter and provides the value for screen readers.
 * Renders a `<meter-root>` custom element.
 *
 * Documentation: [Base UI Meter](https://base-ui.com/react/components/meter)
 */
export class MeterRootElement extends ReactiveElement {
  static properties = {
    value: { type: Number, reflect: true },
    min: { type: Number, reflect: true },
    max: { type: Number, reflect: true },
  };

  declare value: number;
  declare min: number;
  declare max: number;

  /** Custom aria-valuetext function. Set via `.getAriaValueText=${fn}`. */
  getAriaValueText: ((formattedValue: string, value: number) => string) | undefined;

  /** Number format options. Set via `.format=${options}`. */
  format: Intl.NumberFormatOptions | undefined;

  /** Locale for formatting. Set via `.locale=${locale}`. */
  locale: Intl.LocalesArgument | undefined;

  private _labelId: string | undefined;
  private _labelMode: 'auto' | 'explicit' = 'auto';
  private _nvdaSpan: HTMLSpanElement | null = null;

  constructor() {
    super();
    this.value = 0;
    this.min = 0;
    this.max = 100;
  }

  override createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();

    if (!this._nvdaSpan) {
      this._nvdaSpan = document.createElement('span');
      this._nvdaSpan.setAttribute('role', 'presentation');
      this._nvdaSpan.style.cssText = NVDA_FORCE_ANNOUNCEMENT_STYLE;
      this._nvdaSpan.textContent = 'x';
      this.appendChild(this._nvdaSpan);
    }

    this.syncAttributes();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this._nvdaSpan?.remove();
    this._nvdaSpan = null;
  }

  protected override updated() {
    this.syncAttributes();
  }

  getFormattedValue(): string {
    return formatNumberValue(this.value, this.locale, this.format);
  }

  getMeterContext() {
    return {
      value: this.value,
      min: this.min,
      max: this.max,
      formattedValue: this.getFormattedValue(),
    };
  }

  registerLabel(id: string) {
    if (this._labelMode === 'explicit') return;
    this._labelId = id;
    this.setAttribute('aria-labelledby', id);
  }

  unregisterLabel(id: string) {
    if (this._labelId === id) {
      this._labelId = undefined;
      this.removeAttribute('aria-labelledby');
    }
  }

  setLabelMode(mode: 'auto' | 'explicit') {
    this._labelMode = mode;
  }

  private syncAttributes() {
    const formattedValue = this.getFormattedValue();

    let ariaValueText = `${this.value}%`;
    if (this.getAriaValueText) {
      ariaValueText = this.getAriaValueText(formattedValue, this.value);
    } else if (this.format) {
      ariaValueText = formattedValue;
    }

    this.setAttribute('role', 'meter');
    this.setAttribute('aria-valuemin', String(this.min));
    this.setAttribute('aria-valuemax', String(this.max));
    this.setAttribute('aria-valuenow', String(this.value));
    this.setAttribute('aria-valuetext', ariaValueText);

    this.dispatchEvent(new CustomEvent(STATE_CHANGE_EVENT, { bubbles: false }));
  }
}

if (!customElements.get('meter-root')) {
  customElements.define('meter-root', MeterRootElement);
}

// ─── MeterTrackElement ───────────────────────────────────────────────────────────

/**
 * Contains the meter indicator and represents the entire range of the meter.
 * Renders a `<meter-track>` custom element.
 */
export class MeterTrackElement extends BaseHTMLElement {
  private _root: MeterRootElement | null = null;
  private _handler = () => this.syncAttributes();

  connectedCallback() {
    this._root = this.closest('meter-root') as MeterRootElement | null;
    if (!this._root) {
      console.error(CONTEXT_ERROR);
      return;
    }

    this._root.addEventListener(STATE_CHANGE_EVENT, this._handler);
    queueMicrotask(() => this.syncAttributes());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(STATE_CHANGE_EVENT, this._handler);
    this._root = null;
  }

  private syncAttributes() {
    // Structural container — no special attributes needed
  }
}

if (!customElements.get('meter-track')) {
  customElements.define('meter-track', MeterTrackElement);
}

// ─── MeterIndicatorElement ───────────────────────────────────────────────────────

/**
 * Visualizes the position of the value along the range.
 * Renders a `<meter-indicator>` custom element.
 */
export class MeterIndicatorElement extends BaseHTMLElement {
  private _root: MeterRootElement | null = null;
  private _handler = () => this.syncAttributes();

  connectedCallback() {
    this._root = this.closest('meter-root') as MeterRootElement | null;
    if (!this._root) {
      console.error(CONTEXT_ERROR);
      return;
    }

    this._root.addEventListener(STATE_CHANGE_EVENT, this._handler);
    queueMicrotask(() => this.syncAttributes());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(STATE_CHANGE_EVENT, this._handler);
    this._root = null;
  }

  private syncAttributes() {
    if (!this._root) return;
    const ctx = this._root.getMeterContext();
    const percent = valueToPercent(ctx.value, ctx.min, ctx.max);

    this.style.width = `${percent}%`;
    this.style.insetInlineStart = '0';
    this.style.height = 'inherit';
  }
}

if (!customElements.get('meter-indicator')) {
  customElements.define('meter-indicator', MeterIndicatorElement);
}

// ─── MeterLabelElement ───────────────────────────────────────────────────────────

/**
 * An accessible label for the meter.
 * Renders a `<meter-label>` custom element.
 */
export class MeterLabelElement extends BaseHTMLElement {
  private _root: MeterRootElement | null = null;
  private _handler = () => this.syncAttributes();

  connectedCallback() {
    this._root = this.closest('meter-root') as MeterRootElement | null;
    if (!this._root) {
      console.error(CONTEXT_ERROR);
      return;
    }

    this.setAttribute('role', 'presentation');
    const id = ensureId(this, 'base-ui-meter-label');
    this._root.registerLabel(id);
    this._root.addEventListener(STATE_CHANGE_EVENT, this._handler);
    queueMicrotask(() => this.syncAttributes());
  }

  disconnectedCallback() {
    if (this._root && this.id) {
      this._root.unregisterLabel(this.id);
    }
    this._root?.removeEventListener(STATE_CHANGE_EVENT, this._handler);
    this._root = null;
  }

  private syncAttributes() {
    // Structural — mirrors parent state if needed
  }
}

if (!customElements.get('meter-label')) {
  customElements.define('meter-label', MeterLabelElement);
}

// ─── MeterValueElement ───────────────────────────────────────────────────────────

/**
 * A text element displaying the current value.
 * Renders a `<meter-value>` custom element.
 */
export class MeterValueElement extends BaseHTMLElement {
  private _root: MeterRootElement | null = null;
  private _handler = () => this.syncAttributes();

  /** Custom render function for value display. Set via `.renderValue=${fn}`. */
  renderValue: ((formattedValue: string, value: number) => string) | undefined;

  connectedCallback() {
    this._root = this.closest('meter-root') as MeterRootElement | null;
    if (!this._root) {
      console.error(CONTEXT_ERROR);
      return;
    }

    this.setAttribute('aria-hidden', 'true');
    this._root.addEventListener(STATE_CHANGE_EVENT, this._handler);
    queueMicrotask(() => this.syncAttributes());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(STATE_CHANGE_EVENT, this._handler);
    this._root = null;
  }

  private syncAttributes() {
    if (!this._root) return;
    const ctx = this._root.getMeterContext();

    if (this.renderValue) {
      this.textContent = this.renderValue(ctx.formattedValue, ctx.value);
    } else {
      this.textContent = ctx.formattedValue || String(ctx.value);
    }
  }
}

if (!customElements.get('meter-value')) {
  customElements.define('meter-value', MeterValueElement);
}

// ─── Namespace exports ──────────────────────────────────────────────────────────

export namespace MeterRoot {
  export type State = MeterRootState;
}

export namespace MeterTrack {
  export type State = MeterTrackState;
}

export namespace MeterIndicator {
  export type State = MeterIndicatorState;
}

export namespace MeterLabel {
  export type State = MeterLabelState;
}

export namespace MeterValue {
  export type State = MeterValueState;
}

// ─── Global type declarations ───────────────────────────────────────────────────

declare global {
  interface HTMLElementTagNameMap {
    'meter-root': MeterRootElement;
    'meter-track': MeterTrackElement;
    'meter-indicator': MeterIndicatorElement;
    'meter-label': MeterLabelElement;
    'meter-value': MeterValueElement;
  }
}
