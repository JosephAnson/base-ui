import { ReactiveElement } from 'lit';
import { BaseHTMLElement, ensureId, formatNumberValue, valueToPercent } from '../utils';

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

export interface ProgressRootProps {
  /**
   * A string value that provides a user-friendly name for `aria-valuenow`, the current value.
   */
  'aria-valuetext'?: string | undefined;
  /**
   * Options to format the value.
   */
  format?: Intl.NumberFormatOptions | undefined;
  /**
   * Accepts a function that returns a human-readable text alternative for the current value.
   */
  getAriaValueText?: ((formattedValue: string | null, value: number | null) => string) | undefined;
  /**
   * The locale used by `Intl.NumberFormat` when formatting the value.
   */
  locale?: Intl.LocalesArgument | undefined;
  /**
   * The maximum value.
   * @default 100
   */
  max?: number | undefined;
  /**
   * The minimum value.
   * @default 0
   */
  min?: number | undefined;
  /**
   * The current value. The component is indeterminate when value is `null`.
   */
  value?: number | null | undefined;
}

export interface ProgressTrackProps {}

export interface ProgressIndicatorProps {}

export interface ProgressLabelProps {}

export interface ProgressValueProps {
  /**
   * Custom render function for the displayed value.
   */
  renderValue?: ((formattedValue: string | null, value: number | null) => string) | undefined;
}

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
  getAriaValueText: ((formattedValue: string | null, value: number | null) => string) | undefined;

  /** Number format options. Set via `.format=${options}`. */
  format: Intl.NumberFormatOptions | undefined;

  /** Locale for formatting. Set via `.locale=${locale}`. */
  locale: Intl.LocalesArgument | undefined;

  private labelId: string | undefined;
  private labelMode: 'auto' | 'explicit' = 'auto';
  private nvdaSpan: HTMLSpanElement | null = null;
  private explicitAriaValueText: string | null = null;

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
    if (!this.nvdaSpan) {
      this.nvdaSpan = document.createElement('span');
      this.nvdaSpan.setAttribute('role', 'presentation');
      this.nvdaSpan.style.cssText = NVDA_FORCE_ANNOUNCEMENT_STYLE;
      this.nvdaSpan.textContent = 'x';
      this.appendChild(this.nvdaSpan);
    }

    if (this.hasAttribute('aria-labelledby')) {
      this.labelMode = 'explicit';
    }
    this.explicitAriaValueText = this.getAttribute('aria-valuetext');
    this.syncAttributes();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.nvdaSpan?.remove();
    this.nvdaSpan = null;
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
    if (this.labelMode === 'explicit') {
      return;
    }
    this.labelId = id;
    this.setAttribute('aria-labelledby', id);
  }

  unregisterLabel(id: string) {
    if (this.labelId === id) {
      this.labelId = undefined;
      this.removeAttribute('aria-labelledby');
    }
  }

  setLabelMode(mode: 'auto' | 'explicit') {
    this.labelMode = mode;
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

    const ariaValueText =
      this.explicitAriaValueText ?? getValueText(formattedValue || null, this.value);
    this.setAttribute('aria-valuetext', ariaValueText);

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
  private rootElement: ProgressRootElement | null = null;
  private stateHandler = () => this.syncAttributes();

  connectedCallback() {
    this.rootElement = this.closest('progress-root') as ProgressRootElement | null;
    if (!this.rootElement) {
      console.error(CONTEXT_ERROR);
      return;
    }

    this.rootElement.addEventListener(STATE_CHANGE_EVENT, this.stateHandler);
    queueMicrotask(() => this.syncAttributes());
  }

  disconnectedCallback() {
    this.rootElement?.removeEventListener(STATE_CHANGE_EVENT, this.stateHandler);
    this.rootElement = null;
  }

  private syncAttributes() {
    if (!this.rootElement) {
      return;
    }
    setStatusAttributes(this, this.rootElement.getStatus());
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
  private rootElement: ProgressRootElement | null = null;
  private stateHandler = () => this.syncAttributes();

  connectedCallback() {
    this.rootElement = this.closest('progress-root') as ProgressRootElement | null;
    if (!this.rootElement) {
      console.error(CONTEXT_ERROR);
      return;
    }

    this.rootElement.addEventListener(STATE_CHANGE_EVENT, this.stateHandler);
    queueMicrotask(() => this.syncAttributes());
  }

  disconnectedCallback() {
    this.rootElement?.removeEventListener(STATE_CHANGE_EVENT, this.stateHandler);
    this.rootElement = null;
  }

  private syncAttributes() {
    if (!this.rootElement) {
      return;
    }
    const ctx = this.rootElement.getProgressContext();

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
  private rootElement: ProgressRootElement | null = null;
  private stateHandler = () => this.syncAttributes();

  connectedCallback() {
    this.rootElement = this.closest('progress-root') as ProgressRootElement | null;
    if (!this.rootElement) {
      console.error(CONTEXT_ERROR);
      return;
    }

    this.setAttribute('role', 'presentation');
    const id = ensureId(this, 'base-ui-progress-label');
    this.rootElement.registerLabel(id);
    this.rootElement.addEventListener(STATE_CHANGE_EVENT, this.stateHandler);
    queueMicrotask(() => this.syncAttributes());
  }

  disconnectedCallback() {
    if (this.rootElement && this.id) {
      this.rootElement.unregisterLabel(this.id);
    }
    this.rootElement?.removeEventListener(STATE_CHANGE_EVENT, this.stateHandler);
    this.rootElement = null;
  }

  private syncAttributes() {
    if (!this.rootElement) {
      return;
    }
    setStatusAttributes(this, this.rootElement.getStatus());
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
  private rootElement: ProgressRootElement | null = null;
  private stateHandler = () => this.syncAttributes();

  /** Custom render function for value display. Set via `.renderValue=${fn}`. */
  renderValue: ((formattedValue: string | null, value: number | null) => string) | undefined;

  connectedCallback() {
    this.rootElement = this.closest('progress-root') as ProgressRootElement | null;
    if (!this.rootElement) {
      console.error(CONTEXT_ERROR);
      return;
    }

    this.setAttribute('aria-hidden', 'true');
    this.rootElement.addEventListener(STATE_CHANGE_EVENT, this.stateHandler);
    queueMicrotask(() => this.syncAttributes());
  }

  disconnectedCallback() {
    this.rootElement?.removeEventListener(STATE_CHANGE_EVENT, this.stateHandler);
    this.rootElement = null;
  }

  private syncAttributes() {
    if (!this.rootElement) {
      return;
    }
    const ctx = this.rootElement.getProgressContext();

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
  export type Props = ProgressRootProps;
  export type State = ProgressRootState;
}

export namespace ProgressTrack {
  export type Props = ProgressTrackProps;
  export type State = ProgressTrackState;
}

export namespace ProgressIndicator {
  export type Props = ProgressIndicatorProps;
  export type State = ProgressIndicatorState;
}

export namespace ProgressLabel {
  export type Props = ProgressLabelProps;
  export type State = ProgressLabelState;
}

export namespace ProgressValue {
  export type Props = ProgressValueProps;
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
