import { BaseHTMLElement } from '../utils/index.ts';

// ─── Temporal types (mirrored from React for framework independence) ──────────

/**
 * Lookup in which each date library can register its supported date object type.
 */
export interface TemporalSupportedObjectLookup {}

/**
 * The valid shape date objects can take in components that deal with dates.
 */
export type TemporalSupportedObject = keyof TemporalSupportedObjectLookup extends never
  ? any
  : TemporalSupportedObjectLookup[keyof TemporalSupportedObjectLookup];

/**
 * Valid timezone argument values.
 */
export type TemporalTimezone = 'default' | 'system' | 'UTC' | string;

/**
 * Value type for single date components.
 */
export type TemporalValue = TemporalSupportedObject | null;

/**
 * Value type for range components.
 */
export type TemporalRangeValue = [TemporalValue, TemporalValue];

/**
 * Union of all supported temporal values.
 */
export type TemporalSupportedValue = TemporalValue | TemporalRangeValue;

// ─── Adapter formats ──────────────────────────────────────────────────────────

export interface TemporalAdapterFormats {
  yearPadded: string;
  monthPadded: string;
  dayOfMonthPadded: string;
  hours24hPadded: string;
  hours12hPadded: string;
  minutesPadded: string;
  secondsPadded: string;
  dayOfMonth: string;
  hours24h: string;
  hours12h: string;
  month3Letters: string;
  monthFullLetter: string;
  weekday: string;
  weekday3Letters: string;
  weekday1Letter: string;
  meridiem: string;
  localizedDateWithFullMonthAndWeekDay: string;
  localizedNumericDate: string;
}

// ─── Adapter interface ────────────────────────────────────────────────────────

export type DateBuilderReturnType<T extends string | null> = [T] extends [null]
  ? null
  : TemporalSupportedObject;

/**
 * Abstract interface for pluggable date library adapters (date-fns, Luxon, etc.).
 */
export interface TemporalAdapter {
  isTimezoneCompatible: boolean;
  formats: TemporalAdapterFormats;
  lib: string;
  escapedCharacters: { start: string; end: string };

  date<T extends string | null>(value: T, timezone: TemporalTimezone): DateBuilderReturnType<T>;
  parse(value: string, format: string, timezone: TemporalTimezone): TemporalSupportedObject;
  now(timezone: TemporalTimezone): TemporalSupportedObject;
  getTimezone(value: TemporalSupportedValue | null): TemporalTimezone;
  setTimezone(
    value: TemporalSupportedObject,
    timezone: TemporalTimezone,
  ): TemporalSupportedObject;
  toJsDate(value: TemporalSupportedObject): Date;
  getCurrentLocaleCode(): string;
  isValid(value: TemporalSupportedValue): value is TemporalSupportedObject;

  format(value: TemporalSupportedObject, formatKey: keyof TemporalAdapterFormats): string;
  formatByString(value: TemporalSupportedObject, formatString: string): string;

  isEqual(value: TemporalSupportedValue, comparing: TemporalSupportedValue): boolean;
  isSameYear(value: TemporalSupportedObject, comparing: TemporalSupportedObject): boolean;
  isSameMonth(value: TemporalSupportedObject, comparing: TemporalSupportedObject): boolean;
  isSameDay(value: TemporalSupportedObject, comparing: TemporalSupportedObject): boolean;
  isSameHour(value: TemporalSupportedObject, comparing: TemporalSupportedObject): boolean;
  isAfter(value: TemporalSupportedObject, comparing: TemporalSupportedObject): boolean;
  isBefore(value: TemporalSupportedObject, comparing: TemporalSupportedObject): boolean;
  isWithinRange(
    value: TemporalSupportedObject,
    range: [TemporalSupportedObject, TemporalSupportedObject],
  ): boolean;

  startOfYear(value: TemporalSupportedObject): TemporalSupportedObject;
  startOfMonth(value: TemporalSupportedObject): TemporalSupportedObject;
  startOfWeek(value: TemporalSupportedObject): TemporalSupportedObject;
  startOfDay(value: TemporalSupportedObject): TemporalSupportedObject;
  startOfHour(value: TemporalSupportedObject): TemporalSupportedObject;
  startOfMinute(value: TemporalSupportedObject): TemporalSupportedObject;
  startOfSecond(value: TemporalSupportedObject): TemporalSupportedObject;

  endOfYear(value: TemporalSupportedObject): TemporalSupportedObject;
  endOfMonth(value: TemporalSupportedObject): TemporalSupportedObject;
  endOfWeek(value: TemporalSupportedObject): TemporalSupportedObject;
  endOfDay(value: TemporalSupportedObject): TemporalSupportedObject;
  endOfHour(value: TemporalSupportedObject): TemporalSupportedObject;
  endOfMinute(value: TemporalSupportedObject): TemporalSupportedObject;
  endOfSecond(value: TemporalSupportedObject): TemporalSupportedObject;

  addYears(value: TemporalSupportedObject, amount: number): TemporalSupportedObject;
  addMonths(value: TemporalSupportedObject, amount: number): TemporalSupportedObject;
  addWeeks(value: TemporalSupportedObject, amount: number): TemporalSupportedObject;
  addDays(value: TemporalSupportedObject, amount: number): TemporalSupportedObject;
  addHours(value: TemporalSupportedObject, amount: number): TemporalSupportedObject;
  addMinutes(value: TemporalSupportedObject, amount: number): TemporalSupportedObject;
  addSeconds(value: TemporalSupportedObject, amount: number): TemporalSupportedObject;
  addMilliseconds(value: TemporalSupportedObject, amount: number): TemporalSupportedObject;

  getYear(value: TemporalSupportedObject): number;
  getMonth(value: TemporalSupportedObject): number;
  getDate(value: TemporalSupportedObject): number;
  getHours(value: TemporalSupportedObject): number;
  getMinutes(value: TemporalSupportedObject): number;
  getSeconds(value: TemporalSupportedObject): number;
  getMilliseconds(value: TemporalSupportedObject): number;
  getTime(value: TemporalSupportedObject): number;

  setYear(value: TemporalSupportedObject, year: number): TemporalSupportedObject;
  setMonth(value: TemporalSupportedObject, month: number): TemporalSupportedObject;
  setDate(value: TemporalSupportedObject, date: number): TemporalSupportedObject;
  setHours(value: TemporalSupportedObject, hours: number): TemporalSupportedObject;
  setMinutes(value: TemporalSupportedObject, minutes: number): TemporalSupportedObject;
  setSeconds(value: TemporalSupportedObject, seconds: number): TemporalSupportedObject;
  setMilliseconds(
    value: TemporalSupportedObject,
    milliseconds: number,
  ): TemporalSupportedObject;

  differenceInYears(
    value: TemporalSupportedObject,
    comparing: TemporalSupportedObject,
  ): number;
  differenceInMonths(
    value: TemporalSupportedObject,
    comparing: TemporalSupportedObject,
  ): number;
  differenceInWeeks(
    value: TemporalSupportedObject,
    comparing: TemporalSupportedObject,
  ): number;
  differenceInDays(
    value: TemporalSupportedObject,
    comparing: TemporalSupportedObject,
  ): number;
  differenceInHours(
    value: TemporalSupportedObject,
    comparing: TemporalSupportedObject,
  ): number;
  differenceInMinutes(
    value: TemporalSupportedObject,
    comparing: TemporalSupportedObject,
  ): number;

  getDaysInMonth(value: TemporalSupportedObject): number;
  getWeekNumber(value: TemporalSupportedObject): number;
  getDayOfWeek(value: TemporalSupportedObject): number;
}

// ─── Provider element ─────────────────────────────────────────────────────────

/**
 * Finds the nearest `<temporal-adapter-provider>` ancestor and returns its adapter.
 * Returns `null` when no provider is found.
 */
export function getTemporalAdapter(element: Element): TemporalAdapter | null {
  const provider = element.closest(
    'temporal-adapter-provider',
  ) as TemporalAdapterProviderElement | null;
  return provider?.adapter ?? null;
}

/**
 * A provider element that supplies a pluggable date library adapter
 * to temporal components in its subtree.
 * Renders with `display: contents`.
 *
 * Documentation: [Base UI TemporalAdapterProvider](https://base-ui.com/react/utils/temporal-adapter-provider)
 */
export class TemporalAdapterProviderElement extends BaseHTMLElement {
  adapter: TemporalAdapter | null = null;

  connectedCallback() {
    this.style.display = 'contents';
  }
}

if (!customElements.get('temporal-adapter-provider')) {
  customElements.define('temporal-adapter-provider', TemporalAdapterProviderElement);
}

export namespace TemporalAdapterProvider {
  export interface Props {
    adapter: TemporalAdapter;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'temporal-adapter-provider': TemporalAdapterProviderElement;
  }
}
