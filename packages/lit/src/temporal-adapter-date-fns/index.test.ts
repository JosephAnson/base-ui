import { fr } from 'date-fns/locale/fr';
import { describe, expect, it } from 'vitest';
import { TemporalAdapterDateFns } from './index.ts';

const TEST_DATE_ISO_STRING = '2018-10-30T11:44:25.750Z';

function createRfc5545Format(adapter: TemporalAdapterDateFns) {
  const formats = adapter.formats;
  const dateFormat = `${formats.yearPadded}${formats.monthPadded}${formats.dayOfMonthPadded}`;
  const timeFormat = `${formats.hours24hPadded}${formats.minutesPadded}${formats.secondsPadded}`;
  const escapedT = `${adapter.escapedCharacters.start}T${adapter.escapedCharacters.end}`;
  const escapedZ = `${adapter.escapedCharacters.start}Z${adapter.escapedCharacters.end}`;

  return `${dateFormat}${escapedT}${timeFormat}${escapedZ}`;
}

describe('TemporalAdapterDateFns', () => {
  it('exposes the expected public contract', () => {
    const adapter = new TemporalAdapterDateFns();

    expect(adapter.lib).toBe('date-fns');
    expect(adapter.isTimezoneCompatible).toBe(true);
    expect(adapter.escapedCharacters).toEqual({ start: "'", end: "'" });
    expect(adapter.getCurrentLocaleCode()).toMatch(/^en/i);
  });

  it('parses ISO strings into the requested timezone without losing wall-clock fields', () => {
    const adapter = new TemporalAdapterDateFns();
    const value = adapter.date(TEST_DATE_ISO_STRING, 'America/New_York');

    expect(adapter.getTimezone(value)).toBe('America/New_York');
    expect(adapter.getYear(value)).toBe(2018);
    expect(adapter.getMonth(value)).toBe(9);
    expect(adapter.getDate(value)).toBe(30);
    expect(adapter.getHours(value)).toBe(11);
    expect(adapter.getMinutes(value)).toBe(44);
    expect(adapter.getSeconds(value)).toBe(25);
    expect(adapter.getMilliseconds(value)).toBe(750);
  });

  it('parses date-only strings at midnight in the target timezone', () => {
    const adapter = new TemporalAdapterDateFns();
    const value = adapter.date('2018-10-30', 'Europe/Paris');

    expect(adapter.getTimezone(value)).toBe('Europe/Paris');
    expect(adapter.getHours(value)).toBe(0);
    expect(adapter.getMinutes(value)).toBe(0);
    expect(adapter.getSeconds(value)).toBe(0);
    expect(adapter.date(null, 'UTC')).toBeNull();
  });

  it('parses RFC5545-like strings with the adapter format tokens', () => {
    const adapter = new TemporalAdapterDateFns();
    const value = adapter.parse('20181030T114400Z', createRfc5545Format(adapter), 'default');

    expect(value.toISOString()).toBe('2018-10-30T11:44:00.000Z');
  });

  it('converts between timezones without changing the underlying timestamp', () => {
    const adapter = new TemporalAdapterDateFns();
    const original = adapter.date(TEST_DATE_ISO_STRING, 'America/New_York');
    const converted = adapter.setTimezone(original, 'Europe/Paris');

    expect(adapter.getTimezone(converted)).toBe('Europe/Paris');
    expect(adapter.toJsDate(converted).getTime()).toBe(adapter.toJsDate(original).getTime());
  });

  it('uses locale-aware week calculations', () => {
    const enAdapter = new TemporalAdapterDateFns();
    const frAdapter = new TemporalAdapterDateFns({ locale: fr });
    const enValue = enAdapter.date('2024-01-03T12:00:00.000Z', 'default');
    const frValue = frAdapter.date('2024-01-03T12:00:00.000Z', 'default');

    expect(enAdapter.getDayOfWeek(enValue)).toBe(4);
    expect(frAdapter.getDayOfWeek(frValue)).toBe(3);
    expect(frAdapter.startOfWeek(frValue).toISOString()).toBe('2024-01-01T00:00:00.000Z');
    expect(frAdapter.format(frValue, 'weekday')).toBe('mercredi');
  });
});
