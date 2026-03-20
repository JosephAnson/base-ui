import { html, noChange, type TemplateResult } from 'lit';
// eslint-disable-next-line import/extensions
import { AsyncDirective, directive } from 'lit/async-directive.js';
import { useRender as renderElement } from '../use-render/index.ts';

const METER_ROOT_ATTRIBUTE = 'data-base-ui-meter-root';
const METER_CONTEXT_ATTRIBUTE = 'data-base-ui-meter-context';
const METER_FORMATTED_VALUE_ATTRIBUTE = 'data-base-ui-meter-formatted-value';
const METER_LABEL_MODE_ATTRIBUTE = 'data-base-ui-meter-label-mode';
const METER_LABEL_MODE_AUTO = 'auto';
const METER_LABEL_MODE_EXPLICIT = 'explicit';
const NVDA_FORCE_ANNOUNCEMENT_STYLE =
  'position:fixed;top:0;left:0;width:1px;height:1px;margin:-1px;padding:0;border:0;overflow:hidden;white-space:nowrap;clip-path:inset(50%);';
const METER_CONTEXT_ERROR =
  'Base UI: MeterRootContext is missing. Meter parts must be placed within <Meter.Root>.';

let meterLabelId = 0;

/**
 * Groups all parts of the meter and provides the value for screen readers.
 * Renders a `<div>` element.
 */
function MeterRoot(componentProps: MeterRootProps): TemplateResult {
  const {
    format,
    getAriaValueText,
    locale,
    max = 100,
    min = 0,
    value,
    render,
    children,
    ...elementProps
  } = componentProps;

  const formattedValue = formatNumberValue(value, locale, format);

  let ariaValueText = `${value}%`;
  if (getAriaValueText) {
    ariaValueText = getAriaValueText(formattedValue, value);
  } else if (format) {
    ariaValueText = formattedValue;
  }

  return renderElement<MeterRootState, HTMLDivElement>({
    defaultTagName: 'div',
    render,
    state: {},
    props: {
      [METER_ROOT_ATTRIBUTE]: '',
      [METER_CONTEXT_ATTRIBUTE]: '',
      [METER_FORMATTED_VALUE_ATTRIBUTE]: formattedValue,
      [METER_LABEL_MODE_ATTRIBUTE]:
        elementProps['aria-labelledby'] == null ? METER_LABEL_MODE_AUTO : METER_LABEL_MODE_EXPLICIT,
      role: 'meter',
      'aria-valuemax': max,
      'aria-valuemin': min,
      'aria-valuenow': value,
      'aria-valuetext': ariaValueText,
      children: html`${children}<span role="presentation" style=${NVDA_FORCE_ANNOUNCEMENT_STYLE}
          >x</span
        >`,
      ...elementProps,
    },
  });
}

type MeterContext = {
  formattedValue: string;
  max: number;
  min: number;
  value: number;
};

class MeterIndicatorDirective extends AsyncDirective {
  render(_componentProps: MeterIndicatorProps) {
    return noChange;
  }

  override update(
    part: Parameters<AsyncDirective['update']>[0],
    [componentProps]: [MeterIndicatorProps],
  ) {
    const { render, ...elementProps } = componentProps;
    const context = getMeterContext(part);
    const percentageWidth = valueToPercent(context.value, context.min, context.max);

    return renderElement<MeterIndicatorState, HTMLDivElement>({
      defaultTagName: 'div',
      render,
      state: {},
      props: {
        ...elementProps,
        style: mergeStyle(
          {
            insetInlineStart: 0,
            height: 'inherit',
            width: `${percentageWidth}%`,
          },
          elementProps.style,
        ),
      },
    });
  }
}

class MeterTrackDirective extends AsyncDirective {
  render(_componentProps: MeterTrackProps) {
    return noChange;
  }

  override update(
    part: Parameters<AsyncDirective['update']>[0],
    [componentProps]: [MeterTrackProps],
  ) {
    const { render, children, ...elementProps } = componentProps;
    const context = getMeterContextOrNull(part);

    return renderElement<MeterTrackState, HTMLDivElement>({
      defaultTagName: 'div',
      render,
      state: {},
      props: {
        ...getMeterContextAttributes(context),
        ...elementProps,
        children,
      },
    });
  }
}

class MeterLabelDirective extends AsyncDirective {
  private generatedId = `base-ui-meter-label-${(meterLabelId += 1)}`;
  private renderedRoot: Element | null = null;
  private renderedId: string | null = null;

  render(_componentProps: MeterLabelProps) {
    return noChange;
  }

  override update(
    part: Parameters<AsyncDirective['update']>[0],
    [componentProps]: [MeterLabelProps],
  ) {
    const { render, id: idProp, ...elementProps } = componentProps;
    const root = getMeterRoot(part);
    const id = idProp ?? this.generatedId;

    this.syncLabelRegistration(root, id);

    return renderElement<MeterLabelState, HTMLSpanElement>({
      defaultTagName: 'span',
      render,
      state: {},
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

    if (root.getAttribute(METER_LABEL_MODE_ATTRIBUTE) === METER_LABEL_MODE_EXPLICIT) {
      return;
    }

    root.setAttribute('aria-labelledby', id);
  }

  private clearLabelRegistration() {
    if (
      this.renderedRoot != null &&
      this.renderedId != null &&
      this.renderedRoot.getAttribute(METER_LABEL_MODE_ATTRIBUTE) === METER_LABEL_MODE_AUTO &&
      this.renderedRoot.getAttribute('aria-labelledby') === this.renderedId
    ) {
      this.renderedRoot.removeAttribute('aria-labelledby');
    }

    this.renderedRoot = null;
    this.renderedId = null;
  }
}

class MeterValueDirective extends AsyncDirective {
  render(_componentProps: MeterValueProps) {
    return noChange;
  }

  override update(
    part: Parameters<AsyncDirective['update']>[0],
    [componentProps]: [MeterValueProps],
  ) {
    const { children, render, ...elementProps } = componentProps;
    const context = getMeterContext(part);
    const resolvedChildren =
      typeof children === 'function'
        ? children(context.formattedValue, context.value)
        : ((context.formattedValue || context.value) ?? '');

    return renderElement<MeterValueState, HTMLSpanElement>({
      defaultTagName: 'span',
      render,
      state: {},
      props: {
        'aria-hidden': true,
        children: resolvedChildren,
        ...elementProps,
      },
    });
  }
}

const meterTrackDirective = directive(MeterTrackDirective);
const meterIndicatorDirective = directive(MeterIndicatorDirective);
const meterLabelDirective = directive(MeterLabelDirective);
const meterValueDirective = directive(MeterValueDirective);

/**
 * Contains the meter indicator and represents the entire range of the meter.
 * Renders a `<div>` element.
 */
function MeterTrack(componentProps: MeterTrackProps): TemplateResult {
  return html`${meterTrackDirective(componentProps)}`;
}

/**
 * Visualizes the position of the value along the range.
 * Renders a `<div>` element.
 */
function MeterIndicator(componentProps: MeterIndicatorProps): TemplateResult {
  return html`${meterIndicatorDirective(componentProps)}`;
}

/**
 * A text element displaying the current value.
 * Renders a `<span>` element.
 */
function MeterValue(componentProps: MeterValueProps): TemplateResult {
  return html`${meterValueDirective(componentProps)}`;
}

/**
 * An accessible label for the meter.
 * Renders a `<span>` element.
 */
function MeterLabel(componentProps: MeterLabelProps): TemplateResult {
  return html`${meterLabelDirective(componentProps)}`;
}

function getMeterContext(part: Parameters<AsyncDirective['update']>[0]): MeterContext {
  const context = getMeterContextOrNull(part);

  if (context == null) {
    throw new Error(METER_CONTEXT_ERROR);
  }

  return context;
}

function getMeterContextOrNull(part: Parameters<AsyncDirective['update']>[0]) {
  const parentNode = (part as { parentNode?: Node | null | undefined }).parentNode ?? null;
  const parentElement = getParentElement(parentNode);
  const carrier = parentElement?.closest(`[${METER_CONTEXT_ATTRIBUTE}]`);

  if (carrier == null) {
    return null;
  }

  return getMeterContextFromElement(carrier);
}

function getMeterContextFromElement(element: Element): MeterContext {
  return {
    formattedValue: element.getAttribute(METER_FORMATTED_VALUE_ATTRIBUTE) ?? '',
    max: Number(element.getAttribute('aria-valuemax')),
    min: Number(element.getAttribute('aria-valuemin')),
    value: Number(element.getAttribute('aria-valuenow')),
  };
}

function getMeterContextAttributes(context: MeterContext | null) {
  if (context == null) {
    return {};
  }

  return {
    [METER_CONTEXT_ATTRIBUTE]: '',
    [METER_FORMATTED_VALUE_ATTRIBUTE]: context.formattedValue,
    'aria-valuemax': context.max,
    'aria-valuemin': context.min,
    'aria-valuenow': context.value,
  };
}

function getMeterRoot(part: Parameters<AsyncDirective['update']>[0]) {
  const parentNode = (part as { parentNode?: Node | null | undefined }).parentNode ?? null;
  const parentElement = getParentElement(parentNode);
  const root = parentElement?.closest(`[${METER_ROOT_ATTRIBUTE}]`);

  if (root == null) {
    throw new Error(METER_CONTEXT_ERROR);
  }

  return root;
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

export interface MeterRootState {}

export interface MeterRootProps extends ComponentPropsWithChildren<'div', MeterRootState> {
  /**
   * A string value that provides a user-friendly name for `aria-valuenow`, the current value of the meter.
   */
  'aria-valuetext'?: string | undefined;
  /**
   * Options to format the value.
   */
  format?: Intl.NumberFormatOptions | undefined;
  /**
   * A function that returns a string value that provides a human-readable text alternative for `aria-valuenow`, the current value of the meter.
   */
  getAriaValueText?: ((formattedValue: string, value: number) => string) | undefined;
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
   * The current value.
   */
  value: number;
}

export interface MeterTrackState extends MeterRootState {}

export interface MeterTrackProps extends ComponentPropsWithChildren<'div', MeterTrackState> {}

export interface MeterIndicatorState extends MeterRootState {}

export interface MeterIndicatorProps extends ComponentPropsWithChildren<
  'div',
  MeterIndicatorState
> {}

export interface MeterValueState extends MeterRootState {}

export interface MeterValueProps extends ComponentPropsWithChildren<
  'span',
  MeterValueState,
  null | ((formattedValue: string, value: number) => unknown)
> {
  children?: null | ((formattedValue: string, value: number) => unknown) | undefined;
}

export interface MeterLabelState extends MeterRootState {}

export interface MeterLabelProps extends ComponentPropsWithChildren<'span', MeterLabelState> {
  id?: string | undefined;
}

export const Meter = {
  Root: MeterRoot,
  Track: MeterTrack,
  Indicator: MeterIndicator,
  Value: MeterValue,
  Label: MeterLabel,
} as const;
