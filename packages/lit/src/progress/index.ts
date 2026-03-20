import { ReactiveElement } from 'lit';
import { BaseHTMLElement, ensureId, formatNumberValue, valueToPercent } from '../utils/index.ts';

// ─── Constants ──────────────────────────────────────────────────────────────────

const STATE_CHANGE_EVENT = 'base-ui-progress-state-change';
const NVDA_FORCE_ANNOUNCEMENT_STYLE =
  'position:fixed;top:0;left:0;width:1px;height:1px;margin:-1px;padding:0;border:0;overflow:hidden;white-space:nowrap;clip-path:inset(50%)';
const CONTEXT_ERROR =
  'Base UI: ProgressRootContext is missing. Progress parts must be placed within <progress-root>.';

// ─── Types ──────────────────────────────────────────────────────────────────────

export type ProgressStatus = 'indeterminate' | 'progressing' | 'complete';
export type Status = ProgressStatus;

export interface ProgressRootState {
  /**
   * The current status.
   */
  status: ProgressStatus;
}

export interface ProgressTrackState extends ProgressRootState {}
export interface ProgressIndicatorState extends ProgressRootState {}
export interface ProgressValueState extends ProgressRootState {}
export interface ProgressLabelState extends ProgressRootState {}

// ─── Helpers ─────────────────────────────────────────────────────────────────────

function getDefaultAriaValueText(formattedValue: string | null, value: number | null) {
  if (value == null) {
    return 'indeterminate progress';
  }
  return formattedValue || `${value}%`;
}

function getStatus(value: number | null, max: number): ProgressStatus {
  if (!Number.isFinite(value) || value == null) {
    return 'indeterminate';
  }
  return value === max ? 'complete' : 'progressing';
}

function setStatusAttributes(element: HTMLElement, status: ProgressStatus) {
  element.toggleAttribute('data-indeterminate', status === 'indeterminate');
  element.toggleAttribute('data-progressing', status === 'progressing');
  element.toggleAttribute('data-complete', status === 'complete');
}

// ─── ProgressRootElement ─────────────────────────────────────────────────────────

/**
 * Groups all parts of the progress bar and provides the task completion status to screen readers.
 * Renders a `<progress-root>` custom element.
 *
 * Documentation: [Base UI Progress](https://base-ui.com/react/components/progress)
 */
export class ProgressRootElement extends ReactiveElement {
  static properties = {
    value: { type: Number, reflect: true },
    min: { type: Number, reflect: true },
    max: { type: Number, reflect: true },
  };

  declare value: number | null;
  declare min: number;
  declare max: number;

  /** Custom aria-valuetext function. Set via `.getAriaValueText=${fn}`. */
  getAriaValueText:
    | ((formattedValue: string | null, value: number | null) => string)
    | undefined;

  /** Number format options. Set via `.format=${options}`. */
  format: Intl.NumberFormatOptions | undefined;

  /** Locale for formatting. Set via `.locale=${locale}`. */
  locale: Intl.LocalesArgument | undefined;

  private _labelId: string | undefined;
  private _labelMode: 'auto' | 'explicit' = 'auto';
  private _nvdaSpan: HTMLSpanElement | null = null;

  constructor() {
    super();
    this.value = null;
    this.min = 0;
    this.max = 100;
  }

  override createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();

    // Create NVDA force-announcement span
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

  getStatus(): ProgressStatus {
    return getStatus(this.value, this.max);
  }

  getFormattedValue(): string {
    return formatNumberValue(this.value, this.locale, this.format);
  }

  getProgressContext() {
    return {
      value: this.value,
      min: this.min,
      max: this.max,
      status: this.getStatus(),
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
    const status = this.getStatus();
    const formattedValue = this.getFormattedValue();
    const getValueText = this.getAriaValueText ?? getDefaultAriaValueText;

    this.setAttribute('role', 'progressbar');
    this.setAttribute('aria-valuemin', String(this.min));
    this.setAttribute('aria-valuemax', String(this.max));

    if (this.value != null && Number.isFinite(this.value)) {
      this.setAttribute('aria-valuenow', String(this.value));
    } else {
      this.removeAttribute('aria-valuenow');
    }

    this.setAttribute('aria-valuetext', getValueText(formattedValue || null, this.value));

    setStatusAttributes(this, status);

    this.dispatchEvent(new CustomEvent(STATE_CHANGE_EVENT, { bubbles: false }));
  }
}

if (!customElements.get('progress-root')) {
  customElements.define('progress-root', ProgressRootElement);
}

// ─── ProgressTrackElement ────────────────────────────────────────────────────────

/**
 * Contains the progress bar indicator.
 * Renders a `<progress-track>` custom element.
 */
export class ProgressTrackElement extends BaseHTMLElement {
  private _root: ProgressRootElement | null = null;
  private _handler = () => this.syncAttributes();

  connectedCallback() {
    this._root = this.closest('progress-root') as ProgressRootElement | null;
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
    setStatusAttributes(this, this._root.getStatus());
  }
}

if (!customElements.get('progress-track')) {
  customElements.define('progress-track', ProgressTrackElement);
}

// ─── ProgressIndicatorElement ────────────────────────────────────────────────────

/**
 * Visualizes the completion status of the task.
 * Renders a `<progress-indicator>` custom element.
 */
export class ProgressIndicatorElement extends BaseHTMLElement {
  private _root: ProgressRootElement | null = null;
  private _handler = () => this.syncAttributes();

  connectedCallback() {
    this._root = this.closest('progress-root') as ProgressRootElement | null;
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
    const ctx = this._root.getProgressContext();

    setStatusAttributes(this, ctx.status);

    if (ctx.value != null && Number.isFinite(ctx.value)) {
      const percent = valueToPercent(ctx.value, ctx.min, ctx.max);
      this.style.width = `${percent}%`;
      this.style.insetInlineStart = '0';
      this.style.height = 'inherit';
    } else {
      this.style.width = '';
      this.style.insetInlineStart = '';
      this.style.height = '';
    }
  }
}

if (!customElements.get('progress-indicator')) {
  customElements.define('progress-indicator', ProgressIndicatorElement);
}

// ─── ProgressLabelElement ────────────────────────────────────────────────────────

/**
 * An accessible label for the progress bar.
 * Renders a `<progress-label>` custom element.
 */
export class ProgressLabelElement extends BaseHTMLElement {
  private _root: ProgressRootElement | null = null;
  private _handler = () => this.syncAttributes();

  connectedCallback() {
    this._root = this.closest('progress-root') as ProgressRootElement | null;
    if (!this._root) {
      console.error(CONTEXT_ERROR);
      return;
    }

    this.setAttribute('role', 'presentation');
    const id = ensureId(this, 'base-ui-progress-label');
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
    if (!this._root) return;
    setStatusAttributes(this, this._root.getStatus());
  }
}

if (!customElements.get('progress-label')) {
  customElements.define('progress-label', ProgressLabelElement);
}

// ─── ProgressValueElement ────────────────────────────────────────────────────────

/**
 * A text label displaying the current value.
 * Renders a `<progress-value>` custom element.
 */
export class ProgressValueElement extends BaseHTMLElement {
  private _root: ProgressRootElement | null = null;
  private _handler = () => this.syncAttributes();

  /** Custom render function for value display. Set via `.renderValue=${fn}`. */
  renderValue:
    | ((formattedValue: string | null, value: number | null) => string)
    | undefined;

  connectedCallback() {
    this._root = this.closest('progress-root') as ProgressRootElement | null;
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
    const ctx = this._root.getProgressContext();

    setStatusAttributes(this, ctx.status);

    if (this.renderValue) {
      const formattedArg = ctx.value == null ? 'indeterminate' : ctx.formattedValue;
      this.textContent = this.renderValue(formattedArg, ctx.value);
    } else {
      this.textContent = ctx.value == null ? null : ctx.formattedValue;
    }
  }
}

if (!customElements.get('progress-value')) {
  customElements.define('progress-value', ProgressValueElement);
}

// ─── Namespace exports ──────────────────────────────────────────────────────────

export namespace ProgressRoot {
  export type State = ProgressRootState;
}

export namespace ProgressTrack {
  export type State = ProgressTrackState;
}

export namespace ProgressIndicator {
  export type State = ProgressIndicatorState;
}

export namespace ProgressLabel {
  export type State = ProgressLabelState;
}

export namespace ProgressValue {
  export type State = ProgressValueState;
}

// ─── Global type declarations ───────────────────────────────────────────────────

declare global {
  interface HTMLElementTagNameMap {
    'progress-root': ProgressRootElement;
    'progress-track': ProgressTrackElement;
    'progress-indicator': ProgressIndicatorElement;
    'progress-label': ProgressLabelElement;
    'progress-value': ProgressValueElement;
  }
}
