/**
 * Safe base class for custom elements that works in Node.js (SSR) environments
 * where HTMLElement is not defined. ReactiveElement from Lit handles this
 * internally, but plain HTMLElement does not.
 */
export const BaseHTMLElement = (globalThis.HTMLElement ??
  class {}) as typeof HTMLElement;

let idCounter = 0;

/**
 * Ensures the element has an ID, generating one with the given prefix if needed.
 * Returns the element's ID.
 */
export function ensureId(element: Element, prefix: string): string {
  if (!element.id) {
    idCounter += 1;
    element.id = `${prefix}-${idCounter}`;
  }
  return element.id;
}

/**
 * Calculates the percentage of a value within a range.
 */
export function valueToPercent(value: number, min: number, max: number): number {
  return ((value - min) * 100) / (max - min);
}

const formatterCache = new Map<string, Intl.NumberFormat>();

/**
 * Returns a cached Intl.NumberFormat instance.
 */
export function getFormatter(
  locale?: Intl.LocalesArgument,
  options?: Intl.NumberFormatOptions,
): Intl.NumberFormat {
  const cacheKey = JSON.stringify({ locale, options });
  const cachedFormatter = formatterCache.get(cacheKey);

  if (cachedFormatter) {
    return cachedFormatter;
  }

  const formatter = new Intl.NumberFormat(locale, options);
  formatterCache.set(cacheKey, formatter);
  return formatter;
}

/**
 * Formats a number using Intl.NumberFormat with caching.
 */
export function formatNumber(
  value: number | null,
  locale?: Intl.LocalesArgument,
  options?: Intl.NumberFormatOptions,
): string {
  if (value == null) {
    return '';
  }

  return getFormatter(locale, options).format(value);
}

/**
 * Formats a number while preserving as much precision as possible.
 */
export function formatNumberMaxPrecision(
  value: number | null,
  locale?: Intl.LocalesArgument,
  options?: Intl.NumberFormatOptions,
): string {
  return formatNumber(value, locale, {
    ...options,
    maximumFractionDigits: 20,
  });
}

/**
 * Formats a progress/meter value. When no custom format is provided,
 * formats as a percentage (value/100). Otherwise uses the custom format directly.
 */
export function formatNumberValue(
  value: number | null,
  locale?: Intl.LocalesArgument,
  format?: Intl.NumberFormatOptions,
): string {
  if (value == null) {
    return '';
  }

  if (!format) {
    return formatNumber(value / 100, locale, { style: 'percent' });
  }

  return formatNumber(value, locale, format);
}
