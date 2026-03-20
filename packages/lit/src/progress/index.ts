import { html, noChange, type TemplateResult } from 'lit';
// eslint-disable-next-line import/extensions
import { AsyncDirective, directive } from 'lit/async-directive.js';
import { useRender as renderElement } from '../use-render/index.ts';

const PROGRESS_ROOT_ATTRIBUTE = 'data-base-ui-progress-root';
const PROGRESS_CONTEXT_ATTRIBUTE = 'data-base-ui-progress-context';
const PROGRESS_FORMATTED_VALUE_ATTRIBUTE = 'data-base-ui-progress-formatted-value';
const PROGRESS_STATUS_ATTRIBUTE = 'data-base-ui-progress-status';
const PROGRESS_LABEL_MODE_ATTRIBUTE = 'data-base-ui-progress-label-mode';
const PROGRESS_LABEL_MODE_AUTO = 'auto';
const PROGRESS_LABEL_MODE_EXPLICIT = 'explicit';
const PROGRESS_COMPLETE_ATTRIBUTE = 'data-complete';
const PROGRESS_INDETERMINATE_ATTRIBUTE = 'data-indeterminate';
const PROGRESS_PROGRESSING_ATTRIBUTE = 'data-progressing';
const NVDA_FORCE_ANNOUNCEMENT_STYLE =
  'position:fixed;top:0;left:0;width:1px;height:1px;margin:-1px;padding:0;border:0;overflow:hidden;white-space:nowrap;clip-path:inset(50%);';
const PROGRESS_CONTEXT_ERROR =
  'Base UI: ProgressRootContext is missing. Progress parts must be placed within <Progress.Root>.';

let progressLabelId = 0;

export type ProgressStatus = 'indeterminate' | 'progressing' | 'complete';
export type Status = ProgressStatus;

export interface ProgressRootState {
  /**
   * The current status.
   */
  status: ProgressStatus;
}

type ProgressContext = {
  formattedValue: string;
  max: number;
  min: number;
  state: ProgressRootState;
  status: ProgressStatus;
  value: number | null;
};

const progressStateAttributesMapping: renderElement.Parameters<
  ProgressRootState,
  HTMLDivElement,
  undefined
>['stateAttributesMapping'] = {
  status(status) {
    let attributeName: string | null = null;

    if (status === 'progressing') {
      attributeName = PROGRESS_PROGRESSING_ATTRIBUTE;
    } else if (status === 'complete') {
      attributeName = PROGRESS_COMPLETE_ATTRIBUTE;
    } else if (status === 'indeterminate') {
      attributeName = PROGRESS_INDETERMINATE_ATTRIBUTE;
    }

    if (attributeName == null) {
      return null;
    }

    return { [attributeName]: '' };
  },
};

function getDefaultAriaValueText(formattedValue: string | null, value: number | null) {
  if (value == null) {
    return 'indeterminate progress';
  }

  return formattedValue || `${value}%`;
}

/**
 * Groups all parts of the progress bar and provides the task completion status to screen readers.
 * Renders a `<div>` element.
 */
function ProgressRoot(componentProps: ProgressRootProps): TemplateResult {
  const {
    format,
    getAriaValueText = getDefaultAriaValueText,
    locale,
    max = 100,
    min = 0,
    value,
    render,
    children,
    ...elementProps
  } = componentProps;

  let status: ProgressStatus = 'indeterminate';
  if (Number.isFinite(value)) {
    status = value === max ? 'complete' : 'progressing';
  }

  const formattedValue = formatNumberValue(value, locale, format);
  const state: ProgressRootState = { status };

  return renderElement<ProgressRootState, HTMLDivElement>({
    defaultTagName: 'div',
    render,
    state,
    stateAttributesMapping: progressStateAttributesMapping,
    props: {
      [PROGRESS_ROOT_ATTRIBUTE]: '',
      [PROGRESS_CONTEXT_ATTRIBUTE]: '',
      [PROGRESS_FORMATTED_VALUE_ATTRIBUTE]: formattedValue,
      [PROGRESS_LABEL_MODE_ATTRIBUTE]:
        elementProps['aria-labelledby'] == null
          ? PROGRESS_LABEL_MODE_AUTO
          : PROGRESS_LABEL_MODE_EXPLICIT,
      [PROGRESS_STATUS_ATTRIBUTE]: status,
      role: 'progressbar',
      'aria-valuemax': max,
      'aria-valuemin': min,
      'aria-valuenow': value ?? undefined,
      'aria-valuetext': getAriaValueText(formattedValue, value),
      children: html`${children}<span role="presentation" style=${NVDA_FORCE_ANNOUNCEMENT_STYLE}
          >x</span
        >`,
      ...elementProps,
    },
  });
}

class ProgressIndicatorDirective extends AsyncDirective {
  render(_componentProps: ProgressIndicatorProps) {
    return noChange;
  }

  override update(
    part: Parameters<AsyncDirective['update']>[0],
    [componentProps]: [ProgressIndicatorProps],
  ) {
    const { render, ...elementProps } = componentProps;
    const context = getProgressContext(part);
    const percentageValue =
      Number.isFinite(context.value) && context.value !== null
        ? valueToPercent(context.value, context.min, context.max)
        : null;

    return renderElement<ProgressIndicatorState, HTMLDivElement>({
      defaultTagName: 'div',
      render,
      state: context.state,
      stateAttributesMapping: progressStateAttributesMapping,
      props: {
        ...elementProps,
        style: mergeStyle(
          percentageValue == null
            ? {}
            : {
                insetInlineStart: 0,
                height: 'inherit',
                width: `${percentageValue}%`,
              },
          elementProps.style,
        ),
      },
    });
  }
}

class ProgressTrackDirective extends AsyncDirective {
  render(_componentProps: ProgressTrackProps) {
    return noChange;
  }

  override update(
    part: Parameters<AsyncDirective['update']>[0],
    [componentProps]: [ProgressTrackProps],
  ) {
    const { render, children, ...elementProps } = componentProps;
    const context = getProgressContext(part);

    return renderElement<ProgressTrackState, HTMLDivElement>({
      defaultTagName: 'div',
      render,
      state: context.state,
      stateAttributesMapping: progressStateAttributesMapping,
      props: {
        ...getProgressContextAttributes(context),
        ...elementProps,
        children,
      },
    });
  }
}

class ProgressLabelDirective extends AsyncDirective {
  private generatedId = `base-ui-progress-label-${(progressLabelId += 1)}`;
  private renderedRoot: Element | null = null;
  private renderedId: string | null = null;

  render(_componentProps: ProgressLabelProps) {
    return noChange;
  }

  override update(
    part: Parameters<AsyncDirective['update']>[0],
    [componentProps]: [ProgressLabelProps],
  ) {
    const { render, id: idProp, ...elementProps } = componentProps;
    const root = getProgressRoot(part);
    const context = getProgressContextFromElement(root);
    const id = idProp ?? this.generatedId;

    this.syncLabelRegistration(root, id);

    return renderElement<ProgressLabelState, HTMLSpanElement>({
      defaultTagName: 'span',
      render,
      state: context.state,
      stateAttributesMapping: progressStateAttributesMapping,
      props: {
        id,
        role: 'presentation',
        ...elementProps,
      },
    });
  }

  override disconnected() {
    this.clearLabelRegistration();
  }

  override reconnected() {}

  private syncLabelRegistration(root: Element, id: string) {
    if (this.renderedRoot != null && this.renderedRoot !== root) {
      this.clearLabelRegistration();
    }

    this.renderedRoot = root;
    this.renderedId = id;

    if (root.getAttribute(PROGRESS_LABEL_MODE_ATTRIBUTE) === PROGRESS_LABEL_MODE_EXPLICIT) {
      return;
    }

    root.setAttribute('aria-labelledby', id);
  }

  private clearLabelRegistration() {
    if (
      this.renderedRoot != null &&
      this.renderedId != null &&
      this.renderedRoot.getAttribute(PROGRESS_LABEL_MODE_ATTRIBUTE) === PROGRESS_LABEL_MODE_AUTO &&
      this.renderedRoot.getAttribute('aria-labelledby') === this.renderedId
    ) {
      this.renderedRoot.removeAttribute('aria-labelledby');
    }

    this.renderedRoot = null;
    this.renderedId = null;
  }
}

class ProgressValueDirective extends AsyncDirective {
  render(_componentProps: ProgressValueProps) {
    return noChange;
  }

  override update(
    part: Parameters<AsyncDirective['update']>[0],
    [componentProps]: [ProgressValueProps],
  ) {
    const { children, render, ...elementProps } = componentProps;
    const context = getProgressContext(part);
    const formattedValueArg = context.value == null ? 'indeterminate' : context.formattedValue;
    const formattedValueDisplay = context.value == null ? null : context.formattedValue;
    const resolvedChildren =
      typeof children === 'function'
        ? children(formattedValueArg, context.value)
        : formattedValueDisplay;

    return renderElement<ProgressValueState, HTMLSpanElement>({
      defaultTagName: 'span',
      render,
      state: context.state,
      stateAttributesMapping: progressStateAttributesMapping,
      props: {
        'aria-hidden': true,
        children: resolvedChildren,
        ...elementProps,
      },
    });
  }
}

const progressTrackDirective = directive(ProgressTrackDirective);
const progressIndicatorDirective = directive(ProgressIndicatorDirective);
const progressLabelDirective = directive(ProgressLabelDirective);
const progressValueDirective = directive(ProgressValueDirective);

/**
 * Contains the progress bar indicator.
 * Renders a `<div>` element.
 */
function ProgressTrack(componentProps: ProgressTrackProps): TemplateResult {
  return html`${progressTrackDirective(componentProps)}`;
}

/**
 * Visualizes the completion status of the task.
 * Renders a `<div>` element.
 */
function ProgressIndicator(componentProps: ProgressIndicatorProps): TemplateResult {
  return html`${progressIndicatorDirective(componentProps)}`;
}

/**
 * A text label displaying the current value.
 * Renders a `<span>` element.
 */
function ProgressValue(componentProps: ProgressValueProps): TemplateResult {
  return html`${progressValueDirective(componentProps)}`;
}

/**
 * An accessible label for the progress bar.
 * Renders a `<span>` element.
 */
function ProgressLabel(componentProps: ProgressLabelProps): TemplateResult {
  return html`${progressLabelDirective(componentProps)}`;
}

function getProgressContext(part: Parameters<AsyncDirective['update']>[0]): ProgressContext {
  const context = getProgressContextOrNull(part);

  if (context == null) {
    throw new Error(PROGRESS_CONTEXT_ERROR);
  }

  return context;
}

function getProgressContextOrNull(part: Parameters<AsyncDirective['update']>[0]) {
  const parentNode = (part as { parentNode?: Node | null | undefined }).parentNode ?? null;
  const parentElement = getParentElement(parentNode);
  const carrier = parentElement?.closest(`[${PROGRESS_CONTEXT_ATTRIBUTE}]`);

  if (carrier == null) {
    return null;
  }

  return getProgressContextFromElement(carrier);
}

function getProgressContextFromElement(element: Element): ProgressContext {
  const status = getProgressStatusFromElement(element);

  return {
    formattedValue: element.getAttribute(PROGRESS_FORMATTED_VALUE_ATTRIBUTE) ?? '',
    max: Number(element.getAttribute('aria-valuemax')),
    min: Number(element.getAttribute('aria-valuemin')),
    state: { status },
    status,
    value: element.hasAttribute('aria-valuenow')
      ? Number(element.getAttribute('aria-valuenow'))
      : null,
  };
}

function getProgressContextAttributes(context: ProgressContext) {
  return {
    [PROGRESS_CONTEXT_ATTRIBUTE]: '',
    [PROGRESS_FORMATTED_VALUE_ATTRIBUTE]: context.formattedValue,
    [PROGRESS_STATUS_ATTRIBUTE]: context.status,
    'aria-valuemax': context.max,
    'aria-valuemin': context.min,
    'aria-valuenow': context.value ?? undefined,
  };
}

function getProgressRoot(part: Parameters<AsyncDirective['update']>[0]) {
  const parentNode = (part as { parentNode?: Node | null | undefined }).parentNode ?? null;
  const parentElement = getParentElement(parentNode);
  const root = parentElement?.closest(`[${PROGRESS_ROOT_ATTRIBUTE}]`);

  if (root == null) {
    throw new Error(PROGRESS_CONTEXT_ERROR);
  }

  return root;
}

function getProgressStatusFromElement(element: Element): ProgressStatus {
  const status = element.getAttribute(PROGRESS_STATUS_ATTRIBUTE);

  if (status === 'complete' || status === 'progressing' || status === 'indeterminate') {
    return status;
  }

  if (element.hasAttribute(PROGRESS_COMPLETE_ATTRIBUTE)) {
    return 'complete';
  }

  if (element.hasAttribute(PROGRESS_PROGRESSING_ATTRIBUTE)) {
    return 'progressing';
  }

  return 'indeterminate';
}

function getParentElement(node: Node | null) {
  if (node == null) {
    return null;
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    return node as Element;
  }

  return node.parentElement;
}

function valueToPercent(value: number, min: number, max: number) {
  return ((value - min) * 100) / (max - min);
}

const formatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(locale?: Intl.LocalesArgument, options?: Intl.NumberFormatOptions) {
  const cacheKey = JSON.stringify({ locale, options });
  const cachedFormatter = formatterCache.get(cacheKey);

  if (cachedFormatter) {
    return cachedFormatter;
  }

  const formatter = new Intl.NumberFormat(locale, options);
  formatterCache.set(cacheKey, formatter);
  return formatter;
}

function formatNumber(
  value: number | null,
  locale?: Intl.LocalesArgument,
  options?: Intl.NumberFormatOptions,
) {
  if (value == null) {
    return '';
  }

  return getFormatter(locale, options).format(value);
}

function formatNumberValue(
  value: number | null,
  locale?: Intl.LocalesArgument,
  format?: Intl.NumberFormatOptions,
) {
  if (value == null) {
    return '';
  }

  if (!format) {
    return formatNumber(value / 100, locale, { style: 'percent' });
  }

  return formatNumber(value, locale, format);
}

function mergeStyle(defaultStyle: Record<string, unknown>, style: unknown) {
  if (style == null || typeof style !== 'object') {
    return defaultStyle;
  }

  return {
    ...defaultStyle,
    ...(style as Record<string, unknown>),
  };
}

type ComponentPropsWithChildren<
  ElementType extends keyof HTMLElementTagNameMap,
  State,
  Children = unknown,
> = Omit<renderElement.ComponentProps<ElementType, State>, 'children' | 'render'> & {
  children?: Children | undefined;
  render?: renderElement.RenderProp<State> | undefined;
};

export interface ProgressRootProps extends ComponentPropsWithChildren<'div', ProgressRootState> {
  /**
   * A string value that provides a user-friendly name for `aria-valuenow`, the current value of the progress bar.
   */
  'aria-valuetext'?: string | undefined;
  /**
   * Options to format the value.
   */
  format?: Intl.NumberFormatOptions | undefined;
  /**
   * Accepts a function which returns a string value that provides a human-readable text alternative for the current value of the progress bar.
   */
  getAriaValueText?: ((formattedValue: string | null, value: number | null) => string) | undefined;
  /**
   * The locale used by `Intl.NumberFormat` when formatting the value.
   * Defaults to the user's runtime locale.
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
  value: number | null;
}

export interface ProgressTrackState extends ProgressRootState {}

export interface ProgressTrackProps extends ComponentPropsWithChildren<'div', ProgressTrackState> {}

export interface ProgressIndicatorState extends ProgressRootState {}

export interface ProgressIndicatorProps extends ComponentPropsWithChildren<
  'div',
  ProgressIndicatorState
> {}

export interface ProgressValueState extends ProgressRootState {}

export interface ProgressValueProps extends ComponentPropsWithChildren<
  'span',
  ProgressValueState,
  null | ((formattedValue: string | null, value: number | null) => unknown)
> {
  children?: null | ((formattedValue: string | null, value: number | null) => unknown) | undefined;
}

export interface ProgressLabelState extends ProgressRootState {}

export interface ProgressLabelProps extends ComponentPropsWithChildren<'span', ProgressLabelState> {
  id?: string | undefined;
}

export const Progress = {
  Root: ProgressRoot,
  Track: ProgressTrack,
  Indicator: ProgressIndicator,
  Value: ProgressValue,
  Label: ProgressLabel,
} as const;
