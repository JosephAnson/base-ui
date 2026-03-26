import { describe, expect, it } from 'vitest';
import {
  ensureId,
  formatNumber,
  formatNumberMaxPrecision,
  formatNumberValue,
  getFormatter,
  valueToPercent,
} from './index';

describe('utils', () => {
  describe('ensureId', () => {
    it('generates an ID when element has none', () => {
      const el = document.createElement('div');
      const id = ensureId(el, 'test');
      expect(id).toMatch(/^test-\d+$/);
      expect(el.id).toBe(id);
    });

    it('preserves an existing ID', () => {
      const el = document.createElement('div');
      el.id = 'my-id';
      expect(ensureId(el, 'test')).toBe('my-id');
    });

    it('returns unique IDs for different elements', () => {
      const el1 = document.createElement('div');
      const el2 = document.createElement('div');
      const id1 = ensureId(el1, 'prefix');
      const id2 = ensureId(el2, 'prefix');
      expect(id1).not.toBe(id2);
    });
  });

  describe('valueToPercent', () => {
    it('calculates percentage for standard range', () => {
      expect(valueToPercent(50, 0, 100)).toBe(50);
    });

    it('calculates percentage for custom range', () => {
      expect(valueToPercent(15, 10, 20)).toBe(50);
    });

    it('returns 0 at min', () => {
      expect(valueToPercent(0, 0, 100)).toBe(0);
    });

    it('returns 100 at max', () => {
      expect(valueToPercent(100, 0, 100)).toBe(100);
    });
  });

  describe('formatNumber', () => {
    it('returns empty string for null', () => {
      expect(formatNumber(null)).toBe('');
    });

    it('formats a number', () => {
      const expected = new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: 'USD',
      }).format(1234.56);

      expect(
        formatNumber(1234.56, undefined, {
          currency: 'USD',
          style: 'currency',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
      ).toBe(expected);
    });

    it('formats a number with different options', () => {
      expect(formatNumber(0.1234, 'en-US', { style: 'percent' })).toBe('12%');
    });
  });

  describe('getFormatter', () => {
    it('caches the formatter based on options', () => {
      const options: Intl.NumberFormatOptions = {
        currency: 'USD',
        style: 'currency',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      };

      const formatter1 = getFormatter(undefined, options);
      const formatter2 = getFormatter(undefined, { ...options });

      expect(formatter1).toBe(formatter2);
    });
  });

  describe('formatNumberMaxPrecision', () => {
    it('preserves higher precision than the default formatter', () => {
      expect(formatNumberMaxPrecision(1.23456)).toBe(
        (1.23456).toLocaleString(undefined, { maximumFractionDigits: 20 }),
      );
    });

    it('returns empty string for null', () => {
      expect(formatNumberMaxPrecision(null)).toBe('');
    });
  });

  describe('formatNumberValue', () => {
    it('returns empty string for null', () => {
      expect(formatNumberValue(null)).toBe('');
    });

    it('formats as percentage by default', () => {
      expect(formatNumberValue(50)).toBe('50%');
    });

    it('uses custom format when provided', () => {
      expect(formatNumberValue(50, undefined, { style: 'decimal' })).toBe('50');
    });
  });
});
