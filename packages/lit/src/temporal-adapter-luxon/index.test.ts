import { DateTime, Settings } from 'luxon';
import { afterEach, describe, expect, it } from 'vitest';
import { TemporalAdapterLuxon } from './index.ts';

const TEST_DATE_ISO_STRING = '2018-10-30T11:44:25.750Z';

function createRfc5545Format(adapter: TemporalAdapterLuxon) {
  const formats = adapter.formats;
  const dateFormat = `${formats.yearPadded}${formats.monthPadded}${formats.dayOfMonthPadded}`;
  const timeFormat = `${formats.hours24hPadded}${formats.minutesPadded}${formats.secondsPadded}`;
  const escapedT = `${adapter.escapedCharacters.start}T${adapter.escapedCharacters.end}`;
  const escapedZ = `${adapter.escapedCharacters.start}Z${adapter.escapedCharacters.end}`;

  return `${dateFormat}${escapedT}${timeFormat}${escapedZ}`;
}

describe('TemporalAdapterLuxon', () => {
  afterEach(() => {
    Settings.defaultZone = 'system';
  });

  it('exposes the expected public contract', () => {
    const adapter = new TemporalAdapterLuxon();

    expect(adapter.lib).toBe('luxon');
    expect(adapter.isTimezoneCompatible).toBe(true);
    expect(adapter.escapedCharacters).toEqual({ start: "'", end: "'" });
    expect(adapter.getCurrentLocaleCode()).toBe('en-US');
  });

  it('parses ISO strings into the requested timezone and preserves the represented instant', () => {
    const adapter = new TemporalAdapterLuxon();
    const value = adapter.date(TEST_DATE_ISO_STRING, 'America/New_York');

    expect(adapter.getTimezone(value)).toBe('America/New_York');
    expect(value.toJSDate().toISOString()).toBe(TEST_DATE_ISO_STRING);
  });

  it('uses the current default timezone when requested', () => {
    Settings.defaultZone = 'America/New_York';
    const adapter = new TemporalAdapterLuxon();
    const value = adapter.date(TEST_DATE_ISO_STRING, 'default');

    expect(adapter.getTimezone(value)).toBe('America/New_York');
  });

  it('parses RFC5545-like strings with the adapter format tokens', () => {
    const adapter = new TemporalAdapterLuxon();
    const value = adapter.parse('20181030T114400Z', createRfc5545Format(adapter), 'UTC');

    expect(adapter.getTimezone(value)).toBe('UTC');
    expect(value.toUTC().toISO()).toBe('2018-10-30T11:44:00.000Z');
  });

  it('converts between timezones without changing the timestamp', () => {
    const adapter = new TemporalAdapterLuxon();
    const original = adapter.date(TEST_DATE_ISO_STRING, 'Europe/London');
    const converted = adapter.setTimezone(original, 'Europe/Paris');

    expect(adapter.getTimezone(converted)).toBe('Europe/Paris');
    expect(converted.toMillis()).toBe(original.toMillis());
  });

  it('compares calendar boundaries in the value timezone', () => {
    const adapter = new TemporalAdapterLuxon();
    const london = adapter.endOfYear(adapter.setTimezone(adapter.date(TEST_DATE_ISO_STRING, 'UTC'), 'Europe/London'));
    const paris = adapter.setTimezone(london, 'Europe/Paris');

    expect(adapter.isSameYear(london, paris)).toBe(true);
    expect(adapter.isSameYear(paris, london)).toBe(true);
  });

  it('uses locale-aware week calculations and formatting', () => {
    const adapter = new TemporalAdapterLuxon({ locale: 'fr' });
    const value = DateTime.fromISO('2024-01-03T12:00:00.000Z', { locale: 'fr', zone: 'UTC' });

    expect(adapter.startOfWeek(value).toUTC().toISO()).toBe('2024-01-01T00:00:00.000Z');
    expect(adapter.format(value, 'weekday')).toBe('mercredi');
    expect(adapter.getCurrentLocaleCode()).toBe('fr');
  });
});
