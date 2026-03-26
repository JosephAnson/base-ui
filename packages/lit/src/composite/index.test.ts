import { describe, expect, it } from 'vitest';
import {
  findNonDisabledIndex,
  getMinListIndex,
  getMaxListIndex,
  isListIndexDisabled,
  isIndexOutOfBounds,
  navigateList,
  navigateGrid,
  ARROW_UP,
  ARROW_DOWN,
  ARROW_LEFT,
  ARROW_RIGHT,
  HOME,
  END,
} from './index';

function makeItems(count: number, disabledSet?: Set<number>): HTMLElement[] {
  return Array.from({ length: count }, (_, i) => {
    const el = document.createElement('div');
    if (disabledSet?.has(i)) {
      el.setAttribute('disabled', '');
    }
    return el;
  });
}

function keyEvent(key: string): KeyboardEvent {
  return new KeyboardEvent('keydown', { key, bubbles: true });
}

describe('composite', () => {
  // ─── isListIndexDisabled ──────────────────────────────────────────────

  describe('isListIndexDisabled', () => {
    it('returns false for a normal element without explicit disabled indices', () => {
      const items = makeItems(3);
      expect(isListIndexDisabled(items, 0)).toBe(false);
    });

    it('returns true when element has disabled attribute', () => {
      const items = makeItems(3, new Set([1]));
      expect(isListIndexDisabled(items, 1)).toBe(true);
    });

    it('returns true when element has aria-disabled', () => {
      const items = makeItems(3);
      items[2].setAttribute('aria-disabled', 'true');
      expect(isListIndexDisabled(items, 2)).toBe(true);
    });

    it('returns true for indices in the disabledIndices array', () => {
      const items = makeItems(3);
      expect(isListIndexDisabled(items, 1, [1, 2])).toBe(true);
    });

    it('returns true when disabledIndices predicate returns true', () => {
      const items = makeItems(3);
      expect(isListIndexDisabled(items, 1, (i) => i === 1)).toBe(true);
    });

    it('returns false for null elements', () => {
      const items: (HTMLElement | null)[] = [null, null];
      expect(isListIndexDisabled(items, 0)).toBe(false);
    });
  });

  // ─── findNonDisabledIndex ─────────────────────────────────────────────

  describe('findNonDisabledIndex', () => {
    it('finds the first non-disabled index going forward', () => {
      const items = makeItems(5, new Set([0, 1]));
      expect(findNonDisabledIndex(items)).toBe(2);
    });

    it('finds the first non-disabled index going backward', () => {
      const items = makeItems(5, new Set([3, 4]));
      expect(findNonDisabledIndex(items, { startingIndex: items.length, decrement: true })).toBe(2);
    });

    it('skips multiple disabled items', () => {
      const items = makeItems(5, new Set([0, 1, 2]));
      expect(findNonDisabledIndex(items)).toBe(3);
    });

    it('returns out-of-bounds index when all disabled', () => {
      const items = makeItems(3, new Set([0, 1, 2]));
      const result = findNonDisabledIndex(items);
      expect(result).toBeGreaterThanOrEqual(items.length);
    });

    it('supports custom amount (for grid navigation)', () => {
      const items = makeItems(9);
      expect(findNonDisabledIndex(items, { startingIndex: 0, amount: 3 })).toBe(3);
    });
  });

  // ─── getMinListIndex / getMaxListIndex ────────────────────────────────

  describe('getMinListIndex', () => {
    it('returns the first non-disabled index', () => {
      const items = makeItems(5, new Set([0]));
      expect(getMinListIndex(items)).toBe(1);
    });

    it('returns 0 when no items disabled', () => {
      const items = makeItems(3);
      expect(getMinListIndex(items)).toBe(0);
    });
  });

  describe('getMaxListIndex', () => {
    it('returns the last non-disabled index', () => {
      const items = makeItems(5, new Set([4]));
      expect(getMaxListIndex(items)).toBe(3);
    });

    it('returns last index when no items disabled', () => {
      const items = makeItems(3);
      expect(getMaxListIndex(items)).toBe(2);
    });
  });

  // ─── isIndexOutOfBounds ───────────────────────────────────────────────

  describe('isIndexOutOfBounds', () => {
    it('returns true for negative index', () => {
      expect(isIndexOutOfBounds(makeItems(3), -1)).toBe(true);
    });

    it('returns true for index >= length', () => {
      expect(isIndexOutOfBounds(makeItems(3), 3)).toBe(true);
    });

    it('returns false for valid index', () => {
      expect(isIndexOutOfBounds(makeItems(3), 0)).toBe(false);
      expect(isIndexOutOfBounds(makeItems(3), 2)).toBe(false);
    });
  });

  // ─── navigateList ─────────────────────────────────────────────────────

  describe('navigateList', () => {
    it('moves forward with ArrowDown in vertical orientation', () => {
      const items = makeItems(5);
      const result = navigateList({
        currentIndex: 0,
        items,
        event: keyEvent(ARROW_DOWN),
        orientation: 'vertical',
      });
      expect(result).toBe(1);
    });

    it('moves backward with ArrowUp in vertical orientation', () => {
      const items = makeItems(5);
      const result = navigateList({
        currentIndex: 2,
        items,
        event: keyEvent(ARROW_UP),
        orientation: 'vertical',
      });
      expect(result).toBe(1);
    });

    it('moves forward with ArrowRight in horizontal orientation', () => {
      const items = makeItems(5);
      const result = navigateList({
        currentIndex: 0,
        items,
        event: keyEvent(ARROW_RIGHT),
        orientation: 'horizontal',
      });
      expect(result).toBe(1);
    });

    it('moves backward with ArrowLeft in horizontal orientation', () => {
      const items = makeItems(5);
      const result = navigateList({
        currentIndex: 2,
        items,
        event: keyEvent(ARROW_LEFT),
        orientation: 'horizontal',
      });
      expect(result).toBe(1);
    });

    it('reverses arrow keys in RTL mode', () => {
      const items = makeItems(5);
      // In RTL, ArrowLeft moves forward
      const result = navigateList({
        currentIndex: 0,
        items,
        event: keyEvent(ARROW_LEFT),
        orientation: 'horizontal',
        direction: 'rtl',
      });
      expect(result).toBe(1);
    });

    it('ArrowRight moves backward in RTL mode', () => {
      const items = makeItems(5);
      const result = navigateList({
        currentIndex: 2,
        items,
        event: keyEvent(ARROW_RIGHT),
        orientation: 'horizontal',
        direction: 'rtl',
      });
      expect(result).toBe(1);
    });

    it('supports both orientation with RTL-aware horizontal keys', () => {
      const items = makeItems(5);
      const forwardResult = navigateList({
        currentIndex: 0,
        items,
        event: keyEvent(ARROW_LEFT),
        orientation: 'both',
        direction: 'rtl',
      });
      const backwardResult = navigateList({
        currentIndex: 2,
        items,
        event: keyEvent(ARROW_RIGHT),
        orientation: 'both',
        direction: 'rtl',
      });

      expect(forwardResult).toBe(1);
      expect(backwardResult).toBe(1);
    });

    it('Home key navigates to the first item', () => {
      const items = makeItems(5);
      const result = navigateList({
        currentIndex: 3,
        items,
        event: keyEvent(HOME),
      });
      expect(result).toBe(0);
    });

    it('ignores Home and End when enableHomeAndEndKeys is false', () => {
      const items = makeItems(5);
      const homeResult = navigateList({
        currentIndex: 3,
        items,
        event: keyEvent(HOME),
        enableHomeAndEndKeys: false,
      });
      const endResult = navigateList({
        currentIndex: 1,
        items,
        event: keyEvent(END),
        enableHomeAndEndKeys: false,
      });

      expect(homeResult).toBe(-1);
      expect(endResult).toBe(-1);
    });

    it('End key navigates to the last item', () => {
      const items = makeItems(5);
      const result = navigateList({
        currentIndex: 1,
        items,
        event: keyEvent(END),
      });
      expect(result).toBe(4);
    });

    it('Home skips disabled items at the start', () => {
      const items = makeItems(5, new Set([0, 1]));
      const result = navigateList({
        currentIndex: 3,
        items,
        event: keyEvent(HOME),
      });
      expect(result).toBe(2);
    });

    it('End skips disabled items at the end', () => {
      const items = makeItems(5, new Set([3, 4]));
      const result = navigateList({
        currentIndex: 0,
        items,
        event: keyEvent(END),
      });
      expect(result).toBe(2);
    });

    it('skips disabled items during navigation', () => {
      const items = makeItems(5, new Set([1]));
      const result = navigateList({
        currentIndex: 0,
        items,
        event: keyEvent(ARROW_DOWN),
      });
      expect(result).toBe(2);
    });

    it('allows DOM-disabled items when disabledIndices is explicitly empty', () => {
      const items = makeItems(3, new Set([1]));
      const result = navigateList({
        currentIndex: 0,
        items,
        event: keyEvent(ARROW_DOWN),
        loop: true,
        disabledIndices: [],
      });

      expect(result).toBe(1);
    });

    it('stays at boundary without loop', () => {
      const items = makeItems(3);
      const result = navigateList({
        currentIndex: 2,
        items,
        event: keyEvent(ARROW_DOWN),
        loop: false,
      });
      expect(result).toBe(2);
    });

    it('wraps around with loop enabled (forward)', () => {
      const items = makeItems(3);
      const result = navigateList({
        currentIndex: 2,
        items,
        event: keyEvent(ARROW_DOWN),
        loop: true,
      });
      expect(result).toBe(0);
    });

    it('wraps around with loop enabled (backward)', () => {
      const items = makeItems(3);
      const result = navigateList({
        currentIndex: 0,
        items,
        event: keyEvent(ARROW_UP),
        loop: true,
      });
      expect(result).toBe(2);
    });

    it('returns -1 for unrelated keys', () => {
      const items = makeItems(3);
      const result = navigateList({
        currentIndex: 0,
        items,
        event: keyEvent('a'),
      });
      expect(result).toBe(-1);
    });

    it('ignores cross-axis keys in vertical orientation', () => {
      const items = makeItems(3);
      const result = navigateList({
        currentIndex: 0,
        items,
        event: keyEvent(ARROW_RIGHT),
        orientation: 'vertical',
      });
      expect(result).toBe(-1);
    });

    it('ignores cross-axis keys in horizontal orientation', () => {
      const items = makeItems(3);
      const result = navigateList({
        currentIndex: 0,
        items,
        event: keyEvent(ARROW_DOWN),
        orientation: 'horizontal',
      });
      expect(result).toBe(-1);
    });

    it('navigates from -1 to first item on forward key', () => {
      const items = makeItems(3);
      const result = navigateList({
        currentIndex: -1,
        items,
        event: keyEvent(ARROW_DOWN),
      });
      expect(result).toBe(0);
    });

    it('navigates from -1 to last item on backward key', () => {
      const items = makeItems(3);
      const result = navigateList({
        currentIndex: -1,
        items,
        event: keyEvent(ARROW_UP),
      });
      expect(result).toBe(2);
    });
  });

  // ─── navigateGrid ────────────────────────────────────────────────────

  describe('navigateGrid', () => {
    it('moves down by cols', () => {
      const items = makeItems(9); // 3x3
      const result = navigateGrid({
        currentIndex: 1,
        items,
        event: keyEvent(ARROW_DOWN),
        cols: 3,
      });
      expect(result).toBe(4);
    });

    it('moves up by cols', () => {
      const items = makeItems(9); // 3x3
      const result = navigateGrid({
        currentIndex: 4,
        items,
        event: keyEvent(ARROW_UP),
        cols: 3,
      });
      expect(result).toBe(1);
    });

    it('moves right within a row', () => {
      const items = makeItems(9); // 3x3
      const result = navigateGrid({
        currentIndex: 3,
        items,
        event: keyEvent(ARROW_RIGHT),
        cols: 3,
      });
      expect(result).toBe(4);
    });

    it('moves left within a row', () => {
      const items = makeItems(9); // 3x3
      const result = navigateGrid({
        currentIndex: 4,
        items,
        event: keyEvent(ARROW_LEFT),
        cols: 3,
      });
      expect(result).toBe(3);
    });

    it('does not cross row boundary without loop', () => {
      const items = makeItems(9); // 3x3, right edge is index 2,5,8
      const result = navigateGrid({
        currentIndex: 2,
        items,
        event: keyEvent(ARROW_RIGHT),
        cols: 3,
        loop: false,
      });
      expect(result).toBe(2);
    });

    it('wraps horizontally within row with loop', () => {
      const items = makeItems(9); // 3x3
      const result = navigateGrid({
        currentIndex: 2,
        items,
        event: keyEvent(ARROW_RIGHT),
        cols: 3,
        loop: true,
      });
      expect(result).toBe(0);
    });

    it('RTL reverses horizontal movement', () => {
      const items = makeItems(9); // 3x3
      const result = navigateGrid({
        currentIndex: 3,
        items,
        event: keyEvent(ARROW_LEFT),
        cols: 3,
        direction: 'rtl',
      });
      expect(result).toBe(4);
    });

    it('wraps vertically to the same column with loop enabled', () => {
      const items = makeItems(9);
      const result = navigateGrid({
        currentIndex: 7,
        items,
        event: keyEvent(ARROW_DOWN),
        cols: 3,
        loop: true,
      });

      expect(result).toBe(1);
    });

    it('wraps horizontally backward within a row when loop is enabled', () => {
      const items = makeItems(9);
      const result = navigateGrid({
        currentIndex: 3,
        items,
        event: keyEvent(ARROW_LEFT),
        cols: 3,
        loop: true,
      });

      expect(result).toBe(5);
    });

    it('supports both-orientation RTL movement in grids', () => {
      const items = makeItems(9);
      const result = navigateGrid({
        currentIndex: 3,
        items,
        event: keyEvent(ARROW_LEFT),
        cols: 3,
        direction: 'rtl',
        orientation: 'both',
      });

      expect(result).toBe(4);
    });

    it('allows DOM-disabled grid items when disabledIndices is explicitly empty', () => {
      const items = makeItems(9, new Set([4]));
      const result = navigateGrid({
        currentIndex: 3,
        items,
        event: keyEvent(ARROW_RIGHT),
        cols: 3,
        disabledIndices: [],
      });

      expect(result).toBe(4);
    });

    it('Home navigates to first item', () => {
      const items = makeItems(9);
      const result = navigateGrid({
        currentIndex: 5,
        items,
        event: keyEvent(HOME),
        cols: 3,
      });
      expect(result).toBe(0);
    });

    it('End navigates to last item', () => {
      const items = makeItems(9);
      const result = navigateGrid({
        currentIndex: 2,
        items,
        event: keyEvent(END),
        cols: 3,
      });
      expect(result).toBe(8);
    });

    it('ignores Home and End in grids when enableHomeAndEndKeys is false', () => {
      const items = makeItems(9);
      const homeResult = navigateGrid({
        currentIndex: 5,
        items,
        event: keyEvent(HOME),
        cols: 3,
        enableHomeAndEndKeys: false,
      });
      const endResult = navigateGrid({
        currentIndex: 2,
        items,
        event: keyEvent(END),
        cols: 3,
        enableHomeAndEndKeys: false,
      });

      expect(homeResult).toBe(-1);
      expect(endResult).toBe(-1);
    });

    it('returns -1 for unrelated keys', () => {
      const items = makeItems(9);
      const result = navigateGrid({
        currentIndex: 0,
        items,
        event: keyEvent('a'),
        cols: 3,
      });
      expect(result).toBe(-1);
    });
  });
});
