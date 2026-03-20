import { describe, expect, it } from 'vitest';
import { ensureId, formatNumber, formatNumberValue, valueToPercent } from './index.ts';

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
      const result = formatNumber(1234);
      expect(result).toBeTruthy();
    });
  });

  describe('formatNumberValue', () => {
    it('returns empty string for null', () => {
      expect(formatNumberValue(null)).toBe('');
    });

    it('formats as percentage by default', () => {
      const result = formatNumberValue(50);
      expect(result).toContain('50');
    });

    it('uses custom format when provided', () => {
      const result = formatNumberValue(50, undefined, { style: 'decimal' });
      expect(result).toBe('50');
    });
  });
});
