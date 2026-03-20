import { afterEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

import {
  CalendarRootElement,
  CalendarDayGridElement,
  CalendarDayGridHeaderElement,
  CalendarDayGridHeaderRowElement,
  CalendarDayGridHeaderCellElement,
  CalendarDayGridBodyElement,
  CalendarDayGridRowElement,
  CalendarDayGridCellElement,
  CalendarDayButtonElement,
  CalendarIncrementMonthElement,
  CalendarDecrementMonthElement,
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
} from './index.ts';

// Use a fixed date for deterministic tests: January 15, 2025 (Wednesday)
const FIXED_DATE = new Date(2025, 0, 15);
const FIXED_DATE_STR = '2025-01-15';

function createCalendar(opts: {
  defaultValue?: Date;
  value?: Date | null;
  disabled?: boolean;
  readOnly?: boolean;
  invalid?: boolean;
  minDate?: Date;
  maxDate?: Date;
  isDateUnavailable?: (date: Date) => boolean;
  weekStartsOn?: 0 | 1;
  locale?: string;
  monthPageSize?: number;
  onValueChange?: (value: Date | null, details: { event: Event }) => void;
  onVisibleDateChange?: (visibleDate: Date) => void;
} = {}): HTMLElement {
  const container = document.createElement('div');
  const root = document.createElement('calendar-root') as CalendarRootElement;

  if (opts.defaultValue !== undefined) root.defaultValue = opts.defaultValue;
  if (opts.value !== undefined) root.value = opts.value;
  if (opts.disabled !== undefined) root.disabled = opts.disabled;
  if (opts.readOnly !== undefined) root.readOnly = opts.readOnly;
  if (opts.invalid !== undefined) root.invalid = opts.invalid;
  if (opts.minDate !== undefined) root.minDate = opts.minDate;
  if (opts.maxDate !== undefined) root.maxDate = opts.maxDate;
  if (opts.isDateUnavailable !== undefined) root.isDateUnavailable = opts.isDateUnavailable;
  if (opts.weekStartsOn !== undefined) root.weekStartsOn = opts.weekStartsOn;
  if (opts.locale !== undefined) root.locale = opts.locale;
  if (opts.monthPageSize !== undefined) root.monthPageSize = opts.monthPageSize;
  if (opts.onValueChange !== undefined) root.onValueChange = opts.onValueChange;
  if (opts.onVisibleDateChange !== undefined) root.onVisibleDateChange = opts.onVisibleDateChange;

  // Build grid structure
  const decrement = document.createElement('calendar-decrement-month') as CalendarDecrementMonthElement;
  decrement.textContent = 'Prev';
  const increment = document.createElement('calendar-increment-month') as CalendarIncrementMonthElement;
  increment.textContent = 'Next';

  const grid = document.createElement('calendar-day-grid') as CalendarDayGridElement;
  const header = document.createElement('calendar-day-grid-header') as CalendarDayGridHeaderElement;
  const headerRow = document.createElement('calendar-day-grid-header-row') as CalendarDayGridHeaderRowElement;

  // Add weekday header cells
  const weekdays = getWeekdayNames(opts.weekStartsOn ?? 0, opts.locale ?? 'en-US');
  for (const wd of weekdays) {
    const cell = document.createElement('calendar-day-grid-header-cell') as CalendarDayGridHeaderCellElement;
    cell.textContent = wd;
    headerRow.appendChild(cell);
  }
  header.appendChild(headerRow);
  grid.appendChild(header);

  const body = document.createElement('calendar-day-grid-body') as CalendarDayGridBodyElement;

  // Generate day buttons for the visible month
  const visibleMonth = opts.defaultValue ?? opts.value ?? FIXED_DATE;
  const weeks = getMonthWeeks(visibleMonth, opts.weekStartsOn ?? 0);
  for (const week of weeks) {
    const row = document.createElement('calendar-day-grid-row') as CalendarDayGridRowElement;
    for (const day of week) {
      const cellEl = document.createElement('calendar-day-grid-cell') as CalendarDayGridCellElement;
      const btn = document.createElement('calendar-day-button') as CalendarDayButtonElement;
      btn.dateValue = day;
      btn.textContent = String(day.getDate());
      cellEl.appendChild(btn);
      row.appendChild(cellEl);
    }
    body.appendChild(row);
  }

  grid.appendChild(body);

  root.appendChild(decrement);
  root.appendChild(increment);
  root.appendChild(grid);
  container.appendChild(root);
  document.body.appendChild(container);

  return container;
}

function getRoot(container: HTMLElement): CalendarRootElement {
  return container.querySelector('calendar-root')!;
}

function getDayButtons(container: HTMLElement): CalendarDayButtonElement[] {
  return Array.from(container.querySelectorAll('calendar-day-button'));
}

function getDayButtonByDate(container: HTMLElement, date: Date): CalendarDayButtonElement | undefined {
  return getDayButtons(container).find((b) => b.dateValue && isSameDay(b.dateValue, date));
}

function getIncrement(container: HTMLElement): CalendarIncrementMonthElement {
  return container.querySelector('calendar-increment-month')!;
}

function getDecrement(container: HTMLElement): CalendarDecrementMonthElement {
  return container.querySelector('calendar-decrement-month')!;
}

async function waitForMicrotask() {
  await new Promise((r) => queueMicrotask(r));
}

describe('Calendar', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  // ─── Date utilities ───────────────────────────────────────────────────────────

  describe('Date utilities', () => {
    it('isSameDay compares days correctly', () => {
      expect(isSameDay(new Date(2025, 0, 15), new Date(2025, 0, 15))).toBe(true);
      expect(isSameDay(new Date(2025, 0, 15), new Date(2025, 0, 16))).toBe(false);
      expect(isSameDay(new Date(2025, 0, 15, 10), new Date(2025, 0, 15, 23))).toBe(true);
    });

    it('isSameMonth compares months correctly', () => {
      expect(isSameMonth(new Date(2025, 0, 1), new Date(2025, 0, 31))).toBe(true);
      expect(isSameMonth(new Date(2025, 0, 1), new Date(2025, 1, 1))).toBe(false);
    });

    it('addMonths adds months correctly', () => {
      const jan = new Date(2025, 0, 15);
      const feb = addMonths(jan, 1);
      expect(feb.getMonth()).toBe(1);
      expect(feb.getFullYear()).toBe(2025);

      const dec = addMonths(jan, -1);
      expect(dec.getMonth()).toBe(11);
      expect(dec.getFullYear()).toBe(2024);
    });

    it('addDays adds days correctly', () => {
      const jan15 = new Date(2025, 0, 15);
      const jan16 = addDays(jan15, 1);
      expect(jan16.getDate()).toBe(16);

      const jan14 = addDays(jan15, -1);
      expect(jan14.getDate()).toBe(14);
    });

    it('startOfMonth returns first day of month', () => {
      const result = startOfMonth(new Date(2025, 0, 15));
      expect(result.getDate()).toBe(1);
      expect(result.getMonth()).toBe(0);
    });

    it('endOfMonth returns last day of month', () => {
      const result = endOfMonth(new Date(2025, 0, 15));
      expect(result.getDate()).toBe(31);
      expect(result.getMonth()).toBe(0);

      const febEnd = endOfMonth(new Date(2025, 1, 10));
      expect(febEnd.getDate()).toBe(28);
    });

    it('startOfWeek returns correct start with Sunday weekStart', () => {
      // Jan 15, 2025 is Wednesday → previous Sunday is Jan 12
      const result = startOfWeek(new Date(2025, 0, 15), 0);
      expect(result.getDate()).toBe(12);
      expect(result.getDay()).toBe(0);
    });

    it('startOfWeek returns correct start with Monday weekStart', () => {
      // Jan 15, 2025 is Wednesday → previous Monday is Jan 13
      const result = startOfWeek(new Date(2025, 0, 15), 1);
      expect(result.getDate()).toBe(13);
      expect(result.getDay()).toBe(1);
    });

    it('getMonthWeeks returns weeks for a month', () => {
      const weeks = getMonthWeeks(new Date(2025, 0, 1), 0);
      expect(weeks.length).toBeGreaterThanOrEqual(4);
      expect(weeks.length).toBeLessThanOrEqual(6);
      expect(weeks[0].length).toBe(7);
    });

    it('getWeekdayNames returns 7 names starting from weekStartsOn', () => {
      const sundayStart = getWeekdayNames(0, 'en-US');
      expect(sundayStart.length).toBe(7);

      const mondayStart = getWeekdayNames(1, 'en-US');
      expect(mondayStart.length).toBe(7);
      // Monday start should differ from Sunday start
      expect(mondayStart[0]).not.toBe(sundayStart[0]);
    });

    it('normalizeDate strips time component', () => {
      const dateWithTime = new Date(2025, 0, 15, 14, 30, 45);
      const normalized = normalizeDate(dateWithTime);
      expect(normalized.getHours()).toBe(0);
      expect(normalized.getMinutes()).toBe(0);
      expect(normalized.getSeconds()).toBe(0);
      expect(normalized.getDate()).toBe(15);
    });
  });

  // ─── Root ─────────────────────────────────────────────────────────────────────

  describe('Root', () => {
    it('renders with display:contents', () => {
      const container = createCalendar({ defaultValue: FIXED_DATE });
      const root = getRoot(container);
      expect(root.style.display).toBe('contents');
    });

    it('sets data-disabled when disabled', () => {
      const container = createCalendar({ defaultValue: FIXED_DATE, disabled: true });
      const root = getRoot(container);
      expect(root).toHaveAttribute('data-disabled');
    });

    it('sets data-readonly when readOnly', () => {
      const container = createCalendar({ defaultValue: FIXED_DATE, readOnly: true });
      const root = getRoot(container);
      expect(root).toHaveAttribute('data-readonly');
    });

    it('sets data-invalid when invalid', () => {
      const container = createCalendar({ defaultValue: FIXED_DATE, invalid: true });
      const root = getRoot(container);
      expect(root).toHaveAttribute('data-invalid');
    });

    it('uses defaultValue for initial value', async () => {
      const container = createCalendar({ defaultValue: FIXED_DATE });
      await waitForMicrotask();
      const root = getRoot(container);
      expect(root.getValue()).toEqual(FIXED_DATE);
    });

    it('getVisibleDate returns the visible month', () => {
      const container = createCalendar({ defaultValue: FIXED_DATE });
      const root = getRoot(container);
      const visible = root.getVisibleDate();
      expect(visible.getMonth()).toBe(0); // January
      expect(visible.getFullYear()).toBe(2025);
    });

    it('getWeeks returns weeks for the visible month', () => {
      const container = createCalendar({ defaultValue: FIXED_DATE });
      const root = getRoot(container);
      const weeks = root.getWeeks();
      expect(weeks.length).toBeGreaterThanOrEqual(4);
      expect(weeks[0].length).toBe(7);
    });

    it('getWeekdayNames returns localized names', () => {
      const container = createCalendar({ defaultValue: FIXED_DATE, locale: 'en-US' });
      const root = getRoot(container);
      const names = root.getWeekdayNames();
      expect(names.length).toBe(7);
    });
  });

  // ─── Day Grid ─────────────────────────────────────────────────────────────────

  describe('DayGrid', () => {
    it('has role=grid', () => {
      const container = createCalendar({ defaultValue: FIXED_DATE });
      const grid = container.querySelector('calendar-day-grid')!;
      expect(grid).toHaveAttribute('role', 'grid');
    });
  });

  describe('DayGridHeader', () => {
    it('has role=rowgroup', () => {
      const container = createCalendar({ defaultValue: FIXED_DATE });
      const header = container.querySelector('calendar-day-grid-header')!;
      expect(header).toHaveAttribute('role', 'rowgroup');
    });
  });

  describe('DayGridHeaderRow', () => {
    it('has role=row', () => {
      const container = createCalendar({ defaultValue: FIXED_DATE });
      const headerRow = container.querySelector('calendar-day-grid-header-row')!;
      expect(headerRow).toHaveAttribute('role', 'row');
    });
  });

  describe('DayGridHeaderCell', () => {
    it('has role=columnheader', () => {
      const container = createCalendar({ defaultValue: FIXED_DATE });
      const cells = container.querySelectorAll('calendar-day-grid-header-cell');
      expect(cells.length).toBe(7);
      for (const cell of cells) {
        expect(cell).toHaveAttribute('role', 'columnheader');
      }
    });
  });

  describe('DayGridBody', () => {
    it('has role=rowgroup', () => {
      const container = createCalendar({ defaultValue: FIXED_DATE });
      const body = container.querySelector('calendar-day-grid-body')!;
      expect(body).toHaveAttribute('role', 'rowgroup');
    });
  });

  describe('DayGridRow', () => {
    it('has role=row', () => {
      const container = createCalendar({ defaultValue: FIXED_DATE });
      const rows = container.querySelectorAll('calendar-day-grid-row');
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        expect(row).toHaveAttribute('role', 'row');
      }
    });
  });

  describe('DayGridCell', () => {
    it('has role=gridcell', () => {
      const container = createCalendar({ defaultValue: FIXED_DATE });
      const cells = container.querySelectorAll('calendar-day-grid-cell');
      expect(cells.length).toBeGreaterThan(0);
      for (const cell of cells) {
        expect(cell).toHaveAttribute('role', 'gridcell');
      }
    });
  });

  // ─── DayButton ────────────────────────────────────────────────────────────────

  describe('DayButton', () => {
    it('has role=button', async () => {
      const container = createCalendar({ defaultValue: FIXED_DATE });
      await waitForMicrotask();
      const buttons = getDayButtons(container);
      expect(buttons.length).toBeGreaterThan(0);
      for (const btn of buttons) {
        expect(btn).toHaveAttribute('role', 'button');
      }
    });

    it('sets data-selected on the selected date', async () => {
      const container = createCalendar({ defaultValue: FIXED_DATE });
      await waitForMicrotask();
      const btn = getDayButtonByDate(container, FIXED_DATE);
      expect(btn).toBeDefined();
      expect(btn).toHaveAttribute('data-selected');
    });

    it('sets aria-pressed=true on the selected date', async () => {
      const container = createCalendar({ defaultValue: FIXED_DATE });
      await waitForMicrotask();
      const btn = getDayButtonByDate(container, FIXED_DATE);
      expect(btn).toHaveAttribute('aria-pressed', 'true');
    });

    it('does not set data-selected on non-selected dates', async () => {
      const container = createCalendar({ defaultValue: FIXED_DATE });
      await waitForMicrotask();
      const otherDate = new Date(2025, 0, 20);
      const btn = getDayButtonByDate(container, otherDate);
      expect(btn).toBeDefined();
      expect(btn).not.toHaveAttribute('data-selected');
    });

    it('sets data-outside-month for dates in other months', async () => {
      const container = createCalendar({ defaultValue: FIXED_DATE });
      await waitForMicrotask();
      const buttons = getDayButtons(container);
      // Find a button that's outside January 2025
      const outsideBtn = buttons.find((b) => b.dateValue && !isSameMonth(b.dateValue, FIXED_DATE));
      if (outsideBtn) {
        expect(outsideBtn).toHaveAttribute('data-outside-month');
      }
    });

    it('sets data-disabled on disabled dates', async () => {
      const minDate = new Date(2025, 0, 10);
      const container = createCalendar({ defaultValue: FIXED_DATE, minDate });
      await waitForMicrotask();
      const btn = getDayButtonByDate(container, new Date(2025, 0, 5));
      if (btn) {
        expect(btn).toHaveAttribute('data-disabled');
      }
    });

    it('sets data-unavailable on unavailable dates', async () => {
      const isUnavailable = (date: Date) => date.getDate() === 20;
      const container = createCalendar({ defaultValue: FIXED_DATE, isDateUnavailable: isUnavailable });
      await waitForMicrotask();
      const btn = getDayButtonByDate(container, new Date(2025, 0, 20));
      expect(btn).toBeDefined();
      expect(btn).toHaveAttribute('data-unavailable');
    });

    it('selects a date on click', async () => {
      const onValueChange = vi.fn();
      const container = createCalendar({ defaultValue: FIXED_DATE, onValueChange });
      await waitForMicrotask();

      const target = new Date(2025, 0, 20);
      const btn = getDayButtonByDate(container, target);
      expect(btn).toBeDefined();
      btn!.click();
      await waitForMicrotask();

      expect(onValueChange).toHaveBeenCalledOnce();
      const [val] = onValueChange.mock.calls[0];
      expect(isSameDay(val, target)).toBe(true);
    });

    it('updates internal value when uncontrolled', async () => {
      const container = createCalendar({ defaultValue: FIXED_DATE });
      await waitForMicrotask();

      const root = getRoot(container);
      const target = new Date(2025, 0, 20);
      const btn = getDayButtonByDate(container, target);
      btn!.click();
      await waitForMicrotask();

      expect(isSameDay(root.getValue()!, target)).toBe(true);
    });

    it('does not select when disabled', async () => {
      const onValueChange = vi.fn();
      const container = createCalendar({ defaultValue: FIXED_DATE, disabled: true, onValueChange });
      await waitForMicrotask();

      const btn = getDayButtonByDate(container, new Date(2025, 0, 20));
      btn!.click();
      await waitForMicrotask();

      expect(onValueChange).not.toHaveBeenCalled();
    });

    it('does not select when readOnly', async () => {
      const onValueChange = vi.fn();
      const container = createCalendar({ defaultValue: FIXED_DATE, readOnly: true, onValueChange });
      await waitForMicrotask();

      const btn = getDayButtonByDate(container, new Date(2025, 0, 20));
      btn!.click();
      await waitForMicrotask();

      expect(onValueChange).not.toHaveBeenCalled();
    });

    it('does not select a disabled date (via minDate)', async () => {
      const onValueChange = vi.fn();
      const container = createCalendar({
        defaultValue: FIXED_DATE,
        minDate: new Date(2025, 0, 10),
        onValueChange,
      });
      await waitForMicrotask();

      const btn = getDayButtonByDate(container, new Date(2025, 0, 5));
      if (btn) {
        btn.click();
        await waitForMicrotask();
        expect(onValueChange).not.toHaveBeenCalled();
      }
    });

    it('sets tabindex=0 on selected date and -1 on others', async () => {
      const container = createCalendar({ defaultValue: FIXED_DATE });
      await waitForMicrotask();

      const selectedBtn = getDayButtonByDate(container, FIXED_DATE);
      expect(selectedBtn).toHaveAttribute('tabindex', '0');

      const otherBtn = getDayButtonByDate(container, new Date(2025, 0, 20));
      expect(otherBtn).toHaveAttribute('tabindex', '-1');
    });
  });

  // ─── Month navigation ────────────────────────────────────────────────────────

  describe('IncrementMonth', () => {
    it('has role=button', () => {
      const container = createCalendar({ defaultValue: FIXED_DATE });
      const inc = getIncrement(container);
      expect(inc).toHaveAttribute('role', 'button');
    });

    it('has aria-label', () => {
      const container = createCalendar({ defaultValue: FIXED_DATE });
      const inc = getIncrement(container);
      expect(inc).toHaveAttribute('aria-label', 'Next month');
    });

    it('has tabindex=0', () => {
      const container = createCalendar({ defaultValue: FIXED_DATE });
      const inc = getIncrement(container);
      expect(inc).toHaveAttribute('tabindex', '0');
    });

    it('navigates to next month on click', async () => {
      const onVisibleDateChange = vi.fn();
      const container = createCalendar({ defaultValue: FIXED_DATE, onVisibleDateChange });
      await waitForMicrotask();

      getIncrement(container).click();
      await waitForMicrotask();

      expect(onVisibleDateChange).toHaveBeenCalledOnce();
      const [newDate] = onVisibleDateChange.mock.calls[0];
      expect(newDate.getMonth()).toBe(1); // February
    });

    it('updates visible date when uncontrolled', async () => {
      const container = createCalendar({ defaultValue: FIXED_DATE });
      await waitForMicrotask();

      const root = getRoot(container);
      expect(root.getVisibleDate().getMonth()).toBe(0); // January

      getIncrement(container).click();
      await waitForMicrotask();

      expect(root.getVisibleDate().getMonth()).toBe(1); // February
    });

    it('disables when maxDate reached', async () => {
      const container = createCalendar({
        defaultValue: FIXED_DATE,
        maxDate: new Date(2025, 0, 31), // Jan 31
      });
      await waitForMicrotask();

      const inc = getIncrement(container);
      expect(inc).toHaveAttribute('data-disabled');
      expect(inc).toHaveAttribute('aria-disabled', 'true');
    });

    it('does not navigate when disabled at maxDate', async () => {
      const onVisibleDateChange = vi.fn();
      const container = createCalendar({
        defaultValue: FIXED_DATE,
        maxDate: new Date(2025, 0, 31),
        onVisibleDateChange,
      });
      await waitForMicrotask();

      getIncrement(container).click();
      await waitForMicrotask();

      expect(onVisibleDateChange).not.toHaveBeenCalled();
    });
  });

  describe('DecrementMonth', () => {
    it('has role=button', () => {
      const container = createCalendar({ defaultValue: FIXED_DATE });
      const dec = getDecrement(container);
      expect(dec).toHaveAttribute('role', 'button');
    });

    it('has aria-label', () => {
      const container = createCalendar({ defaultValue: FIXED_DATE });
      const dec = getDecrement(container);
      expect(dec).toHaveAttribute('aria-label', 'Previous month');
    });

    it('navigates to previous month on click', async () => {
      const onVisibleDateChange = vi.fn();
      const container = createCalendar({ defaultValue: FIXED_DATE, onVisibleDateChange });
      await waitForMicrotask();

      getDecrement(container).click();
      await waitForMicrotask();

      expect(onVisibleDateChange).toHaveBeenCalledOnce();
      const [newDate] = onVisibleDateChange.mock.calls[0];
      expect(newDate.getMonth()).toBe(11); // December 2024
      expect(newDate.getFullYear()).toBe(2024);
    });

    it('disables when minDate reached', async () => {
      const container = createCalendar({
        defaultValue: FIXED_DATE,
        minDate: new Date(2025, 0, 1), // Jan 1
      });
      await waitForMicrotask();

      const dec = getDecrement(container);
      expect(dec).toHaveAttribute('data-disabled');
      expect(dec).toHaveAttribute('aria-disabled', 'true');
    });
  });

  // ─── Controlled value ─────────────────────────────────────────────────────────

  describe('Controlled value', () => {
    it('uses controlled value', async () => {
      const container = createCalendar({ value: FIXED_DATE });
      await waitForMicrotask();
      const root = getRoot(container);
      expect(isSameDay(root.getValue()!, FIXED_DATE)).toBe(true);
    });

    it('controlled value does not change on click', async () => {
      const onValueChange = vi.fn();
      const container = createCalendar({ value: FIXED_DATE, onValueChange });
      await waitForMicrotask();

      const target = new Date(2025, 0, 20);
      const btn = getDayButtonByDate(container, target);
      btn!.click();
      await waitForMicrotask();

      // Callback fires but internal value doesn't change
      expect(onValueChange).toHaveBeenCalledOnce();
      const root = getRoot(container);
      expect(isSameDay(root.getValue()!, FIXED_DATE)).toBe(true);
    });

    it('controlled value updates when set externally', async () => {
      const container = createCalendar({ value: FIXED_DATE });
      await waitForMicrotask();
      const root = getRoot(container);

      const newDate = new Date(2025, 0, 20);
      root.value = newDate;
      await waitForMicrotask();

      expect(isSameDay(root.getValue()!, newDate)).toBe(true);
    });
  });

  // ─── monthPageSize ────────────────────────────────────────────────────────────

  describe('monthPageSize', () => {
    it('jumps multiple months', async () => {
      const onVisibleDateChange = vi.fn();
      const container = createCalendar({
        defaultValue: FIXED_DATE,
        monthPageSize: 3,
        onVisibleDateChange,
      });
      await waitForMicrotask();

      getIncrement(container).click();
      await waitForMicrotask();

      expect(onVisibleDateChange).toHaveBeenCalledOnce();
      const [newDate] = onVisibleDateChange.mock.calls[0];
      expect(newDate.getMonth()).toBe(3); // April (Jan + 3)
    });
  });

  // ─── weekStartsOn ────────────────────────────────────────────────────────────

  describe('weekStartsOn', () => {
    it('starts weeks on Monday when weekStartsOn=1', () => {
      const container = createCalendar({ defaultValue: FIXED_DATE, weekStartsOn: 1 });
      const root = getRoot(container);
      const weeks = root.getWeeks();
      // First day of first week should be a Monday
      expect(weeks[0][0].getDay()).toBe(1);
    });

    it('starts weeks on Sunday when weekStartsOn=0', () => {
      const container = createCalendar({ defaultValue: FIXED_DATE, weekStartsOn: 0 });
      const root = getRoot(container);
      const weeks = root.getWeeks();
      // First day of first week should be a Sunday
      expect(weeks[0][0].getDay()).toBe(0);
    });
  });

  // ─── isDateDisabled / isDateUnavailable ───────────────────────────────────────

  describe('Date restrictions', () => {
    it('isDateDisabled returns true for dates before minDate', () => {
      const container = createCalendar({
        defaultValue: FIXED_DATE,
        minDate: new Date(2025, 0, 10),
      });
      const root = getRoot(container);
      expect(root.isDateDisabled(new Date(2025, 0, 5))).toBe(true);
      expect(root.isDateDisabled(new Date(2025, 0, 15))).toBe(false);
    });

    it('isDateDisabled returns true for dates after maxDate', () => {
      const container = createCalendar({
        defaultValue: FIXED_DATE,
        maxDate: new Date(2025, 0, 20),
      });
      const root = getRoot(container);
      expect(root.isDateDisabled(new Date(2025, 0, 25))).toBe(true);
      expect(root.isDateDisabled(new Date(2025, 0, 15))).toBe(false);
    });

    it('isDateDisabled returns true when calendar is disabled', () => {
      const container = createCalendar({
        defaultValue: FIXED_DATE,
        disabled: true,
      });
      const root = getRoot(container);
      expect(root.isDateDisabled(new Date(2025, 0, 15))).toBe(true);
    });

    it('isDateUnavailableFn delegates to user function', () => {
      const isUnavailable = (date: Date) => date.getDay() === 0; // Sundays
      const container = createCalendar({
        defaultValue: FIXED_DATE,
        isDateUnavailable: isUnavailable,
      });
      const root = getRoot(container);
      const sunday = new Date(2025, 0, 12); // Sunday
      const monday = new Date(2025, 0, 13); // Monday
      expect(root.isDateUnavailableFn(sunday)).toBe(true);
      expect(root.isDateUnavailableFn(monday)).toBe(false);
    });
  });

  // ─── isDateSelected ───────────────────────────────────────────────────────────

  describe('isDateSelected', () => {
    it('returns true for the selected date', () => {
      const container = createCalendar({ defaultValue: FIXED_DATE });
      const root = getRoot(container);
      expect(root.isDateSelected(FIXED_DATE)).toBe(true);
    });

    it('returns false for non-selected dates', () => {
      const container = createCalendar({ defaultValue: FIXED_DATE });
      const root = getRoot(container);
      expect(root.isDateSelected(new Date(2025, 0, 20))).toBe(false);
    });

    it('returns false when no value is set', () => {
      const container = createCalendar();
      const root = getRoot(container);
      expect(root.isDateSelected(FIXED_DATE)).toBe(false);
    });
  });

  // ─── navigateMonth ────────────────────────────────────────────────────────────

  describe('navigateMonth', () => {
    it('navigates forward', () => {
      const container = createCalendar({ defaultValue: FIXED_DATE });
      const root = getRoot(container);
      root.navigateMonth(1);
      expect(root.getVisibleDate().getMonth()).toBe(1); // February
    });

    it('navigates backward', () => {
      const container = createCalendar({ defaultValue: FIXED_DATE });
      const root = getRoot(container);
      root.navigateMonth(-1);
      expect(root.getVisibleDate().getMonth()).toBe(11); // December 2024
    });

    it('canNavigateMonth respects minDate', () => {
      const container = createCalendar({
        defaultValue: FIXED_DATE,
        minDate: new Date(2025, 0, 1),
      });
      const root = getRoot(container);
      expect(root.canNavigateMonth(-1)).toBe(false);
      expect(root.canNavigateMonth(1)).toBe(true);
    });

    it('canNavigateMonth respects maxDate', () => {
      const container = createCalendar({
        defaultValue: FIXED_DATE,
        maxDate: new Date(2025, 0, 31),
      });
      const root = getRoot(container);
      expect(root.canNavigateMonth(1)).toBe(false);
      expect(root.canNavigateMonth(-1)).toBe(true);
    });
  });

  // ─── Active date / keyboard ───────────────────────────────────────────────────

  describe('Active date', () => {
    it('setActiveDate updates the active date', async () => {
      const container = createCalendar({ defaultValue: FIXED_DATE });
      await waitForMicrotask();
      const root = getRoot(container);

      root.setActiveDate(new Date(2025, 0, 20));
      expect(isSameDay(root.getActiveDate()!, new Date(2025, 0, 20))).toBe(true);
    });

    it('active date button gets tabindex=0', async () => {
      const container = createCalendar({ defaultValue: FIXED_DATE });
      await waitForMicrotask();
      const root = getRoot(container);

      const target = new Date(2025, 0, 20);
      root.setActiveDate(target);
      await waitForMicrotask();

      const btn = getDayButtonByDate(container, target);
      expect(btn).toHaveAttribute('tabindex', '0');
    });
  });

  // ─── Custom element registration ─────────────────────────────────────────────

  describe('Custom element registration', () => {
    it('registers all custom elements', () => {
      expect(customElements.get('calendar-root')).toBe(CalendarRootElement);
      expect(customElements.get('calendar-day-grid')).toBe(CalendarDayGridElement);
      expect(customElements.get('calendar-day-grid-header')).toBe(CalendarDayGridHeaderElement);
      expect(customElements.get('calendar-day-grid-header-row')).toBe(CalendarDayGridHeaderRowElement);
      expect(customElements.get('calendar-day-grid-header-cell')).toBe(CalendarDayGridHeaderCellElement);
      expect(customElements.get('calendar-day-grid-body')).toBe(CalendarDayGridBodyElement);
      expect(customElements.get('calendar-day-grid-row')).toBe(CalendarDayGridRowElement);
      expect(customElements.get('calendar-day-grid-cell')).toBe(CalendarDayGridCellElement);
      expect(customElements.get('calendar-day-button')).toBe(CalendarDayButtonElement);
      expect(customElements.get('calendar-increment-month')).toBe(CalendarIncrementMonthElement);
      expect(customElements.get('calendar-decrement-month')).toBe(CalendarDecrementMonthElement);
    });
  });
});
