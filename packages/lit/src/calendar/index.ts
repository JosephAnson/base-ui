import { BaseHTMLElement, ensureId } from '../utils/index.ts';
import {
  getLocalizationContext,
  LOCALIZATION_PROVIDER_CHANGE_EVENT,
} from '../localization-provider/index.ts';

// ─── Constants ──────────────────────────────────────────────────────────────────

const CALENDAR_STATE_CHANGE_EVENT = 'base-ui-calendar-state-change';

// ─── Date utilities ─────────────────────────────────────────────────────────────

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isSameMonth(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
  );
}

function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function startOfWeek(date: Date, weekStartsOn: 0 | 1 = 0): Date {
  const day = date.getDay();
  const diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn;
  const result = new Date(date);
  result.setDate(result.getDate() - diff);
  return result;
}

function isDateBefore(a: Date, b: Date): boolean {
  return a.getTime() < b.getTime();
}

function isDateAfter(a: Date, b: Date): boolean {
  return a.getTime() > b.getTime();
}

/** Normalize a date to midnight to avoid time comparison issues. */
function normalizeDate(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Get the weeks for a given month. Each week is an array of 7 Date objects. */
function getMonthWeeks(
  month: Date,
  weekStartsOn: 0 | 1 = 0,
): Date[][] {
  const first = startOfMonth(month);
  const last = endOfMonth(month);
  const gridStart = startOfWeek(first, weekStartsOn);

  const weeks: Date[][] = [];
  let current = new Date(gridStart);

  // Generate weeks until we've passed the last day of the month
  while (
    current <= last ||
    current.getDay() !== weekStartsOn
  ) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(current));
      current = addDays(current, 1);
    }
    weeks.push(week);

    // Safety: stop after 6 weeks maximum
    if (weeks.length >= 6) break;
  }

  return weeks;
}

/** Short weekday names. */
function getWeekdayNames(
  weekStartsOn: 0 | 1 = 0,
  locale = 'en-US',
): string[] {
  const names: string[] = [];
  // Use a known Sunday (Jan 4, 2015 is a Sunday)
  const base = new Date(2015, 0, 4 + weekStartsOn);
  for (let i = 0; i < 7; i++) {
    const day = addDays(base, i);
    names.push(
      day.toLocaleDateString(locale, { weekday: 'short' }),
    );
  }
  return names;
}

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface CalendarRootState {
  value: Date | null;
  visibleDate: Date;
  disabled: boolean;
  readOnly: boolean;
  invalid: boolean;
}

export interface CalendarDayGridState {}

export interface CalendarDayGridHeaderState {}

export interface CalendarDayGridHeaderRowState {}

export interface CalendarDayGridHeaderCellState {
  weekday: string;
}

export interface CalendarDayGridBodyState {}

export interface CalendarDayGridRowState {}

export interface CalendarDayGridCellState {
  selected: boolean;
  disabled: boolean;
  unavailable: boolean;
  current: boolean;
  outsideMonth: boolean;
}

export interface CalendarDayButtonState {
  selected: boolean;
  disabled: boolean;
  unavailable: boolean;
  current: boolean;
  outsideMonth: boolean;
}

export interface CalendarIncrementMonthState {
  disabled: boolean;
}

export interface CalendarDecrementMonthState {
  disabled: boolean;
}

export interface CalendarChangeEventDetails {
  event: Event;
}

// ─── CalendarRootElement ────────────────────────────────────────────────────────

/**
 * Groups all parts of the calendar.
 * Renders a `<calendar-root>` custom element (display:contents).
 *
 * Documentation: [Base UI Calendar](https://base-ui.com/react/components/calendar)
 */
export class CalendarRootElement extends BaseHTMLElement {
  /** Default selected date (uncontrolled). */
  defaultValue: Date | null = null;

  /** Whether the calendar is disabled. */
  disabled = false;

  /** Whether the calendar is read-only. */
  readOnly = false;

  /** Whether the calendar is in an invalid state. */
  invalid = false;

  /** Minimum selectable date. */
  minDate: Date | null = null;

  /** Maximum selectable date. */
  maxDate: Date | null = null;

  /** Function to check if a date is unavailable. */
  isDateUnavailable: ((date: Date) => boolean) | undefined;

  /** Day of the week to start on (0=Sunday, 1=Monday). */
  private _weekStartsOn: 0 | 1 = 0;

  private _hasExplicitWeekStartsOn = false;

  /** Locale for formatting (default 'en-US'). */
  private _locale = 'en-US';

  private _hasExplicitLocale = false;

  /** Number of months to jump when navigating. */
  monthPageSize = 1;

  /** Callback when value changes. */
  onValueChange:
    | ((value: Date | null, details: CalendarChangeEventDetails) => void)
    | undefined;

  /** Callback when the visible month changes. */
  onVisibleDateChange: ((visibleDate: Date) => void) | undefined;

  // Internal state
  private _value: Date | null | undefined;
  private _valueIsControlled = false;
  private _internalValue: Date | null = null;
  private _visibleDate: Date | undefined;
  private _visibleDateIsControlled = false;
  private _internalVisibleDate: Date = new Date();
  private _initialized = false;
  private _lastPublishedStateKey: string | null = null;
  private _activeDate: Date | null = null;

  get weekStartsOn(): 0 | 1 {
    return this._weekStartsOn;
  }

  set weekStartsOn(val: 0 | 1) {
    this._hasExplicitWeekStartsOn = true;
    this._weekStartsOn = val;
    this._publishStateChange();
  }

  get locale(): string {
    return this._locale;
  }

  set locale(val: string) {
    this._hasExplicitLocale = true;
    this._locale = val;
    this._publishStateChange();
  }

  get value(): Date | null | undefined {
    return this._value;
  }
  set value(val: Date | null | undefined) {
    if (val !== undefined) {
      this._valueIsControlled = true;
      this._value = val;
    } else {
      this._valueIsControlled = false;
      this._value = undefined;
    }
    this._syncAttributes();
    this._publishStateChange();
  }

  get visibleDate(): Date | undefined {
    return this._visibleDate;
  }
  set visibleDate(val: Date | undefined) {
    if (val !== undefined) {
      this._visibleDateIsControlled = true;
      this._visibleDate = val;
    } else {
      this._visibleDateIsControlled = false;
      this._visibleDate = undefined;
    }
    this._syncAttributes();
    this._publishStateChange();
  }

  connectedCallback() {
    if (!this._initialized) {
      this._initialized = true;
      this._internalValue = this.defaultValue;
      // Set initial visible date to the value month or current month
      if (this.defaultValue) {
        this._internalVisibleDate = startOfMonth(this.defaultValue);
      } else {
        this._internalVisibleDate = startOfMonth(new Date());
      }
    }
    this.style.display = 'contents';
    this.addEventListener(
      LOCALIZATION_PROVIDER_CHANGE_EVENT,
      this._handleLocalizationProviderChange as EventListener,
    );
    this._syncAttributes();
    queueMicrotask(() => this._publishStateChange());
  }

  disconnectedCallback() {
    this.removeEventListener(
      LOCALIZATION_PROVIDER_CHANGE_EVENT,
      this._handleLocalizationProviderChange as EventListener,
    );
    this._lastPublishedStateKey = null;
  }

  getValue(): Date | null {
    return this._valueIsControlled
      ? (this._value as Date | null)
      : this._internalValue;
  }

  getVisibleDate(): Date {
    return this._visibleDateIsControlled
      ? (this._visibleDate as Date)
      : this._internalVisibleDate;
  }

  getActiveDate(): Date | null {
    return this._activeDate;
  }

  setActiveDate(date: Date | null) {
    this._activeDate = date;
    this._publishStateChange();
  }

  getWeeks(): Date[][] {
    return getMonthWeeks(this.getVisibleDate(), this._getResolvedWeekStartsOn());
  }

  getWeekdayNames(): string[] {
    return getWeekdayNames(this._getResolvedWeekStartsOn(), this._getResolvedLocale());
  }

  selectDate(date: Date, event: Event) {
    if (this.disabled || this.readOnly) return;
    if (this.isDateDisabled(date)) return;

    const normalized = normalizeDate(date);
    const details: CalendarChangeEventDetails = { event };

    this.onValueChange?.(normalized, details);

    if (!this._valueIsControlled) {
      this._internalValue = normalized;
    }

    this._syncAttributes();
    this._publishStateChange();
  }

  isDateDisabled(date: Date): boolean {
    if (this.disabled) return true;
    const normalized = normalizeDate(date);
    if (this.minDate && isDateBefore(normalized, normalizeDate(this.minDate))) {
      return true;
    }
    if (this.maxDate && isDateAfter(normalized, normalizeDate(this.maxDate))) {
      return true;
    }
    if (this.isDateUnavailable?.(normalized)) return true;
    return false;
  }

  isDateUnavailableFn(date: Date): boolean {
    return this.isDateUnavailable?.(normalizeDate(date)) ?? false;
  }

  isDateSelected(date: Date): boolean {
    const current = this.getValue();
    if (!current) return false;
    return isSameDay(normalizeDate(date), normalizeDate(current));
  }

  navigateMonth(direction: 1 | -1) {
    const current = this.getVisibleDate();
    const next = addMonths(current, direction * this.monthPageSize);

    this.onVisibleDateChange?.(next);

    if (!this._visibleDateIsControlled) {
      this._internalVisibleDate = next;
    }

    this._syncAttributes();
    this._publishStateChange();
  }

  canNavigateMonth(direction: 1 | -1): boolean {
    const current = this.getVisibleDate();
    if (direction === -1 && this.minDate) {
      const prevMonth = addMonths(current, -this.monthPageSize);
      return !isDateBefore(
        endOfMonth(prevMonth),
        normalizeDate(this.minDate),
      );
    }
    if (direction === 1 && this.maxDate) {
      const nextMonth = addMonths(current, this.monthPageSize);
      return !isDateAfter(
        startOfMonth(nextMonth),
        normalizeDate(this.maxDate),
      );
    }
    return true;
  }

  private _syncAttributes() {
    this.toggleAttribute('data-disabled', this.disabled);
    this.toggleAttribute('data-readonly', this.readOnly);
    this.toggleAttribute('data-invalid', this.invalid);
  }

  private _getResolvedWeekStartsOn(): 0 | 1 {
    if (this._hasExplicitWeekStartsOn) {
      return this._weekStartsOn;
    }

    const weekStartsOn = (getLocalizationContext(this).temporalLocale as {
      options?: { weekStartsOn?: number | undefined } | undefined;
    } | undefined)?.options?.weekStartsOn;

    return weekStartsOn === 1 ? 1 : 0;
  }

  private _getResolvedLocale(): string {
    if (this._hasExplicitLocale) {
      return this._locale;
    }

    const code = (getLocalizationContext(this).temporalLocale as { code?: string | undefined } | undefined)
      ?.code;

    return code || 'en-US';
  }

  private _handleLocalizationProviderChange = () => {
    if (this._hasExplicitLocale && this._hasExplicitWeekStartsOn) {
      return;
    }

    this._publishStateChange();
  };

  private _publishStateChange() {
    const value = this.getValue();
    const nextKey = [
      value ? value.getTime() : 'null',
      this.getVisibleDate().getTime(),
      this.disabled ? 'd' : '',
      this.readOnly ? 'ro' : '',
      this.invalid ? 'i' : '',
      this._activeDate ? this._activeDate.getTime() : '',
      this._getResolvedWeekStartsOn(),
      this._getResolvedLocale(),
    ].join('|');

    if (nextKey === this._lastPublishedStateKey) return;
    this._lastPublishedStateKey = nextKey;
    this.dispatchEvent(new CustomEvent(CALENDAR_STATE_CHANGE_EVENT));
  }
}

if (!customElements.get('calendar-root')) {
  customElements.define('calendar-root', CalendarRootElement);
}

// ─── CalendarDayGridElement ─────────────────────────────────────────────────────

/**
 * The grid container for calendar days.
 * Renders a `<calendar-day-grid>` custom element (renders as table).
 *
 * Documentation: [Base UI Calendar](https://base-ui.com/react/components/calendar)
 */
export class CalendarDayGridElement extends BaseHTMLElement {
  connectedCallback() {
    this.setAttribute('role', 'grid');
  }
}

if (!customElements.get('calendar-day-grid')) {
  customElements.define('calendar-day-grid', CalendarDayGridElement);
}

// ─── CalendarDayGridHeaderElement ───────────────────────────────────────────────

/**
 * The header section of the day grid containing weekday names.
 * Renders a `<calendar-day-grid-header>` custom element.
 *
 * Documentation: [Base UI Calendar](https://base-ui.com/react/components/calendar)
 */
export class CalendarDayGridHeaderElement extends BaseHTMLElement {
  connectedCallback() {
    this.setAttribute('role', 'rowgroup');
  }
}

if (!customElements.get('calendar-day-grid-header')) {
  customElements.define(
    'calendar-day-grid-header',
    CalendarDayGridHeaderElement,
  );
}

// ─── CalendarDayGridHeaderRowElement ────────────────────────────────────────────

/**
 * A row containing weekday name headers.
 * Renders a `<calendar-day-grid-header-row>` custom element.
 *
 * Documentation: [Base UI Calendar](https://base-ui.com/react/components/calendar)
 */
export class CalendarDayGridHeaderRowElement extends BaseHTMLElement {
  connectedCallback() {
    this.setAttribute('role', 'row');
  }
}

if (!customElements.get('calendar-day-grid-header-row')) {
  customElements.define(
    'calendar-day-grid-header-row',
    CalendarDayGridHeaderRowElement,
  );
}

// ─── CalendarDayGridHeaderCellElement ───────────────────────────────────────────

/**
 * An individual weekday header cell (e.g., "Mon", "Tue").
 * Renders a `<calendar-day-grid-header-cell>` custom element.
 *
 * Documentation: [Base UI Calendar](https://base-ui.com/react/components/calendar)
 */
export class CalendarDayGridHeaderCellElement extends BaseHTMLElement {
  connectedCallback() {
    this.setAttribute('role', 'columnheader');
  }
}

if (!customElements.get('calendar-day-grid-header-cell')) {
  customElements.define(
    'calendar-day-grid-header-cell',
    CalendarDayGridHeaderCellElement,
  );
}

// ─── CalendarDayGridBodyElement ─────────────────────────────────────────────────

/**
 * The body section of the day grid containing week rows.
 * Renders a `<calendar-day-grid-body>` custom element.
 * Handles keyboard navigation between days.
 *
 * Documentation: [Base UI Calendar](https://base-ui.com/react/components/calendar)
 */
export class CalendarDayGridBodyElement extends BaseHTMLElement {
  private _root: CalendarRootElement | null = null;

  connectedCallback() {
    this._root = this.closest('calendar-root') as CalendarRootElement | null;
    if (!this._root) {
      console.error(
        'Base UI: Calendar parts must be placed within <calendar-root>.',
      );
      return;
    }

    this.setAttribute('role', 'rowgroup');

    this.addEventListener('keydown', this._handleKeyDown);
  }

  disconnectedCallback() {
    this.removeEventListener('keydown', this._handleKeyDown);
    this._root = null;
  }

  private _handleKeyDown = (event: KeyboardEvent) => {
    if (!this._root || this._root.disabled) return;

    const buttons = Array.from(
      this.querySelectorAll('calendar-day-button:not([data-disabled])'),
    ) as CalendarDayButtonElement[];
    if (buttons.length === 0) return;

    const activeDate = this._root.getActiveDate();
    let currentIdx = activeDate
      ? buttons.findIndex((b) => b.dateValue && isSameDay(b.dateValue, activeDate))
      : -1;

    let newIdx = currentIdx;
    let handled = false;

    if (event.key === 'ArrowRight') {
      newIdx = currentIdx < buttons.length - 1 ? currentIdx + 1 : currentIdx;
      handled = true;
    } else if (event.key === 'ArrowLeft') {
      newIdx = currentIdx > 0 ? currentIdx - 1 : currentIdx;
      handled = true;
    } else if (event.key === 'ArrowDown') {
      newIdx = Math.min(currentIdx + 7, buttons.length - 1);
      handled = true;
    } else if (event.key === 'ArrowUp') {
      newIdx = Math.max(currentIdx - 7, 0);
      handled = true;
    } else if (event.key === 'Home') {
      // Go to start of week (find index of first button in same row)
      const row = Math.floor(currentIdx / 7);
      newIdx = row * 7;
      handled = true;
    } else if (event.key === 'End') {
      const row = Math.floor(currentIdx / 7);
      newIdx = Math.min(row * 7 + 6, buttons.length - 1);
      handled = true;
    } else if (event.key === 'PageDown') {
      if (event.shiftKey) {
        // Go forward 12 months
        this._root.navigateMonth(12 as unknown as 1);
      } else {
        this._root.navigateMonth(1);
      }
      handled = true;
    } else if (event.key === 'PageUp') {
      if (event.shiftKey) {
        this._root.navigateMonth(-12 as unknown as -1);
      } else {
        this._root.navigateMonth(-1);
      }
      handled = true;
    } else if (event.key === 'Enter' || event.key === ' ') {
      if (currentIdx >= 0 && buttons[currentIdx]?.dateValue) {
        event.preventDefault();
        this._root.selectDate(buttons[currentIdx].dateValue!, event);
      }
      handled = true;
    }

    if (handled) {
      event.preventDefault();
      if (newIdx >= 0 && newIdx < buttons.length && buttons[newIdx]?.dateValue) {
        this._root.setActiveDate(buttons[newIdx].dateValue!);
        buttons[newIdx].focus();
      }
    }
  };
}

if (!customElements.get('calendar-day-grid-body')) {
  customElements.define('calendar-day-grid-body', CalendarDayGridBodyElement);
}

// ─── CalendarDayGridRowElement ──────────────────────────────────────────────────

/**
 * A single week row in the calendar grid.
 * Renders a `<calendar-day-grid-row>` custom element.
 *
 * Documentation: [Base UI Calendar](https://base-ui.com/react/components/calendar)
 */
export class CalendarDayGridRowElement extends BaseHTMLElement {
  connectedCallback() {
    this.setAttribute('role', 'row');
  }
}

if (!customElements.get('calendar-day-grid-row')) {
  customElements.define('calendar-day-grid-row', CalendarDayGridRowElement);
}

// ─── CalendarDayGridCellElement ─────────────────────────────────────────────────

/**
 * A single day cell in the calendar grid.
 * Renders a `<calendar-day-grid-cell>` custom element.
 *
 * Documentation: [Base UI Calendar](https://base-ui.com/react/components/calendar)
 */
export class CalendarDayGridCellElement extends BaseHTMLElement {
  connectedCallback() {
    this.setAttribute('role', 'gridcell');
  }
}

if (!customElements.get('calendar-day-grid-cell')) {
  customElements.define('calendar-day-grid-cell', CalendarDayGridCellElement);
}

// ─── CalendarDayButtonElement ───────────────────────────────────────────────────

/**
 * An interactive button representing a single day.
 * Renders a `<calendar-day-button>` custom element.
 *
 * Documentation: [Base UI Calendar](https://base-ui.com/react/components/calendar)
 */
export class CalendarDayButtonElement extends BaseHTMLElement {
  private _root: CalendarRootElement | null = null;
  private _handler = () => this._syncAttributes();

  /** The date this button represents. */
  dateValue: Date | null = null;

  connectedCallback() {
    this._root = this.closest('calendar-root') as CalendarRootElement | null;
    if (!this._root) {
      console.error(
        'Base UI: Calendar parts must be placed within <calendar-root>.',
      );
      return;
    }

    this.setAttribute('role', 'button');
    this.setAttribute('tabindex', '-1');

    this._root.addEventListener(CALENDAR_STATE_CHANGE_EVENT, this._handler);

    this.addEventListener('click', this._handleClick);

    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(CALENDAR_STATE_CHANGE_EVENT, this._handler);
    this.removeEventListener('click', this._handleClick);
    this._root = null;
  }

  private _handleClick = (event: MouseEvent) => {
    if (!this._root || !this.dateValue) return;
    this._root.selectDate(this.dateValue, event);
  };

  private _syncAttributes() {
    if (!this._root || !this.dateValue) return;

    const selected = this._root.isDateSelected(this.dateValue);
    const disabled = this._root.isDateDisabled(this.dateValue);
    const unavailable = this._root.isDateUnavailableFn(this.dateValue);
    const current = isToday(this.dateValue);
    const outsideMonth = !isSameMonth(
      this.dateValue,
      this._root.getVisibleDate(),
    );

    this.toggleAttribute('data-selected', selected);
    this.toggleAttribute('data-disabled', disabled);
    this.toggleAttribute('data-unavailable', unavailable);
    this.toggleAttribute('data-current', current);
    this.toggleAttribute('data-outside-month', outsideMonth);

    if (selected) {
      this.setAttribute('aria-pressed', 'true');
    } else {
      this.removeAttribute('aria-pressed');
    }

    // Active date gets tabindex 0
    const activeDate = this._root.getActiveDate();
    if (activeDate && isSameDay(this.dateValue, activeDate)) {
      this.setAttribute('tabindex', '0');
    } else if (!activeDate && selected) {
      this.setAttribute('tabindex', '0');
    } else if (!activeDate && !this._root.getValue() && current && !outsideMonth) {
      this.setAttribute('tabindex', '0');
    } else {
      this.setAttribute('tabindex', '-1');
    }
  }
}

if (!customElements.get('calendar-day-button')) {
  customElements.define('calendar-day-button', CalendarDayButtonElement);
}

// ─── CalendarIncrementMonthElement ──────────────────────────────────────────────

/**
 * A button to navigate to the next month.
 * Renders a `<calendar-increment-month>` custom element.
 *
 * Documentation: [Base UI Calendar](https://base-ui.com/react/components/calendar)
 */
export class CalendarIncrementMonthElement extends BaseHTMLElement {
  private _root: CalendarRootElement | null = null;
  private _handler = () => this._syncAttributes();

  connectedCallback() {
    this._root = this.closest('calendar-root') as CalendarRootElement | null;
    if (!this._root) {
      console.error(
        'Base UI: Calendar parts must be placed within <calendar-root>.',
      );
      return;
    }

    this.setAttribute('role', 'button');
    this.setAttribute('tabindex', '0');
    this.setAttribute('aria-label', 'Next month');

    this._root.addEventListener(CALENDAR_STATE_CHANGE_EVENT, this._handler);

    this.addEventListener('click', this._handleClick);

    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(CALENDAR_STATE_CHANGE_EVENT, this._handler);
    this.removeEventListener('click', this._handleClick);
    this._root = null;
  }

  private _handleClick = () => {
    if (!this._root || !this._root.canNavigateMonth(1)) return;
    this._root.navigateMonth(1);
  };

  private _syncAttributes() {
    if (!this._root) return;
    const disabled = !this._root.canNavigateMonth(1);
    this.toggleAttribute('data-disabled', disabled);
    if (disabled) {
      this.setAttribute('aria-disabled', 'true');
    } else {
      this.removeAttribute('aria-disabled');
    }
  }
}

if (!customElements.get('calendar-increment-month')) {
  customElements.define(
    'calendar-increment-month',
    CalendarIncrementMonthElement,
  );
}

// ─── CalendarDecrementMonthElement ──────────────────────────────────────────────

/**
 * A button to navigate to the previous month.
 * Renders a `<calendar-decrement-month>` custom element.
 *
 * Documentation: [Base UI Calendar](https://base-ui.com/react/components/calendar)
 */
export class CalendarDecrementMonthElement extends BaseHTMLElement {
  private _root: CalendarRootElement | null = null;
  private _handler = () => this._syncAttributes();

  connectedCallback() {
    this._root = this.closest('calendar-root') as CalendarRootElement | null;
    if (!this._root) {
      console.error(
        'Base UI: Calendar parts must be placed within <calendar-root>.',
      );
      return;
    }

    this.setAttribute('role', 'button');
    this.setAttribute('tabindex', '0');
    this.setAttribute('aria-label', 'Previous month');

    this._root.addEventListener(CALENDAR_STATE_CHANGE_EVENT, this._handler);

    this.addEventListener('click', this._handleClick);

    queueMicrotask(() => this._syncAttributes());
  }

  disconnectedCallback() {
    this._root?.removeEventListener(CALENDAR_STATE_CHANGE_EVENT, this._handler);
    this.removeEventListener('click', this._handleClick);
    this._root = null;
  }

  private _handleClick = () => {
    if (!this._root || !this._root.canNavigateMonth(-1)) return;
    this._root.navigateMonth(-1);
  };

  private _syncAttributes() {
    if (!this._root) return;
    const disabled = !this._root.canNavigateMonth(-1);
    this.toggleAttribute('data-disabled', disabled);
    if (disabled) {
      this.setAttribute('aria-disabled', 'true');
    } else {
      this.removeAttribute('aria-disabled');
    }
  }
}

if (!customElements.get('calendar-decrement-month')) {
  customElements.define(
    'calendar-decrement-month',
    CalendarDecrementMonthElement,
  );
}

// ─── Exported utilities ─────────────────────────────────────────────────────────

export {
  isSameDay,
  isSameMonth,
  isToday,
  addMonths,
  addDays,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  getMonthWeeks,
  getWeekdayNames,
  normalizeDate,
};

// ─── Namespace exports ──────────────────────────────────────────────────────────

export namespace CalendarRoot {
  export type State = CalendarRootState;
  export type ChangeEventDetails = CalendarChangeEventDetails;
}

export namespace CalendarDayGrid {
  export type State = CalendarDayGridState;
}

export namespace CalendarDayGridHeader {
  export type State = CalendarDayGridHeaderState;
}

export namespace CalendarDayGridHeaderRow {
  export type State = CalendarDayGridHeaderRowState;
}

export namespace CalendarDayGridHeaderCell {
  export type State = CalendarDayGridHeaderCellState;
}

export namespace CalendarDayGridBody {
  export type State = CalendarDayGridBodyState;
}

export namespace CalendarDayGridRow {
  export type State = CalendarDayGridRowState;
}

export namespace CalendarDayGridCell {
  export type State = CalendarDayGridCellState;
}

export namespace CalendarDayButton {
  export type State = CalendarDayButtonState;
}

export namespace CalendarIncrementMonth {
  export type State = CalendarIncrementMonthState;
}

export namespace CalendarDecrementMonth {
  export type State = CalendarDecrementMonthState;
}

// ─── Global type declarations ───────────────────────────────────────────────────

declare global {
  interface HTMLElementTagNameMap {
    'calendar-root': CalendarRootElement;
    'calendar-day-grid': CalendarDayGridElement;
    'calendar-day-grid-header': CalendarDayGridHeaderElement;
    'calendar-day-grid-header-row': CalendarDayGridHeaderRowElement;
    'calendar-day-grid-header-cell': CalendarDayGridHeaderCellElement;
    'calendar-day-grid-body': CalendarDayGridBodyElement;
    'calendar-day-grid-row': CalendarDayGridRowElement;
    'calendar-day-grid-cell': CalendarDayGridCellElement;
    'calendar-day-button': CalendarDayButtonElement;
    'calendar-increment-month': CalendarIncrementMonthElement;
    'calendar-decrement-month': CalendarDecrementMonthElement;
  }
}
