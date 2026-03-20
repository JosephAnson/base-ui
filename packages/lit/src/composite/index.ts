import type { TextDirection } from '../direction-provider/index.ts';

// ─── Key Constants ────────────────────────────────────────────────────────────

export const ARROW_UP = 'ArrowUp';
export const ARROW_DOWN = 'ArrowDown';
export const ARROW_LEFT = 'ArrowLeft';
export const ARROW_RIGHT = 'ArrowRight';
export const HOME = 'Home';
export const END = 'End';

export const HORIZONTAL_KEYS = new Set([ARROW_LEFT, ARROW_RIGHT]);
export const VERTICAL_KEYS = new Set([ARROW_UP, ARROW_DOWN]);
export const ALL_KEYS = new Set([ARROW_UP, ARROW_DOWN, ARROW_LEFT, ARROW_RIGHT, HOME, END]);

// ─── Types ────────────────────────────────────────────────────────────────────

export type CompositeOrientation = 'horizontal' | 'vertical' | 'both';

export type DisabledIndices = ReadonlyArray<number> | ((index: number) => boolean);

export interface CompositeNavigationOptions {
  /** Current highlighted index. Use `-1` for none. */
  currentIndex: number;
  /** Total number of items. */
  items: ReadonlyArray<HTMLElement | null>;
  /** The keyboard event. */
  event: KeyboardEvent;
  /** Orientation of the list. */
  orientation?: CompositeOrientation;
  /** Text direction for RTL-aware arrow key swapping. */
  direction?: TextDirection;
  /** Whether to loop focus when reaching list boundaries. */
  loop?: boolean;
  /** Indices (or predicate) for disabled items to skip. */
  disabledIndices?: DisabledIndices;
  /** Whether Home/End keys are enabled. */
  enableHomeAndEndKeys?: boolean;
}

export interface CompositeGridOptions extends CompositeNavigationOptions {
  /** Number of columns in the grid. */
  cols: number;
}

// ─── Core utilities ───────────────────────────────────────────────────────────

/**
 * Checks whether the item at `index` should be treated as disabled.
 * Respects an explicit disabled indices list/predicate. When no explicit list
 * is provided, falls back to the element's `disabled` attribute or
 * `aria-disabled="true"`.
 */
export function isListIndexDisabled(
  items: ReadonlyArray<HTMLElement | null>,
  index: number,
  disabledIndices?: DisabledIndices,
): boolean {
  const isExplicit =
    typeof disabledIndices === 'function'
      ? disabledIndices(index)
      : (disabledIndices?.includes(index) ?? false);
  if (isExplicit) {
    return true;
  }
  const element = items[index];
  if (!element) {
    return false;
  }
  return (
    !disabledIndices &&
    (element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true')
  );
}

/**
 * Starting from `startingIndex`, walks forward (or backward when `decrement`
 * is true) through `items` until a non-disabled index is found.
 * Returns the found index, which may be out of bounds if every item
 * between the start and the boundary is disabled.
 */
export function findNonDisabledIndex(
  items: ReadonlyArray<HTMLElement | null>,
  {
    startingIndex = -1,
    decrement = false,
    disabledIndices,
    amount = 1,
  }: {
    startingIndex?: number;
    decrement?: boolean;
    disabledIndices?: DisabledIndices;
    amount?: number;
  } = {},
): number {
  let index = startingIndex;
  do {
    index += decrement ? -amount : amount;
  } while (
    index >= 0 &&
    index <= items.length - 1 &&
    isListIndexDisabled(items, index, disabledIndices)
  );
  return index;
}

/**
 * Returns the first non-disabled index in `items`.
 */
export function getMinListIndex(
  items: ReadonlyArray<HTMLElement | null>,
  disabledIndices?: DisabledIndices,
): number {
  return findNonDisabledIndex(items, { disabledIndices });
}

/**
 * Returns the last non-disabled index in `items`.
 */
export function getMaxListIndex(
  items: ReadonlyArray<HTMLElement | null>,
  disabledIndices?: DisabledIndices,
): number {
  return findNonDisabledIndex(items, {
    decrement: true,
    startingIndex: items.length,
    disabledIndices,
  });
}

/**
 * Checks whether `index` falls outside the valid range of `items`.
 */
export function isIndexOutOfBounds(
  items: ReadonlyArray<HTMLElement | null>,
  index: number,
): boolean {
  return index < 0 || index >= items.length;
}

// ─── List navigation ──────────────────────────────────────────────────────────

/**
 * Computes the next highlighted index for a one-dimensional list based on a
 * keyboard event. Returns `-1` if the event doesn't correspond to a navigation
 * key (given the orientation and enabled keys).
 *
 * Handles:
 * - ArrowUp / ArrowDown / ArrowLeft / ArrowRight (orientation-aware)
 * - Home / End (optional)
 * - RTL direction reversal
 * - Disabled item skipping
 * - Loop / wrap at boundaries
 */
export function navigateList(options: CompositeNavigationOptions): number {
  const {
    currentIndex,
    items,
    event,
    orientation = 'vertical',
    direction = 'ltr',
    loop = false,
    disabledIndices,
    enableHomeAndEndKeys = true,
  } = options;

  const isRtl = direction === 'rtl';
  const horizontalForward = isRtl ? ARROW_LEFT : ARROW_RIGHT;
  const horizontalBackward = isRtl ? ARROW_RIGHT : ARROW_LEFT;

  const forwardKey =
    orientation === 'vertical' ? ARROW_DOWN : horizontalForward;
  const backwardKey =
    orientation === 'vertical' ? ARROW_UP : horizontalBackward;

  const forwardKeys = orientation === 'vertical'
    ? [ARROW_DOWN]
    : orientation === 'horizontal'
      ? [horizontalForward]
      : [ARROW_DOWN, horizontalForward];

  const backwardKeys = orientation === 'vertical'
    ? [ARROW_UP]
    : orientation === 'horizontal'
      ? [horizontalBackward]
      : [ARROW_UP, horizontalBackward];

  const allNavKeys = new Set([...forwardKeys, ...backwardKeys]);
  if (enableHomeAndEndKeys) {
    allNavKeys.add(HOME);
    allNavKeys.add(END);
  }

  if (!allNavKeys.has(event.key)) {
    return -1;
  }

  const minIndex = getMinListIndex(items, disabledIndices);
  const maxIndex = getMaxListIndex(items, disabledIndices);

  if (minIndex < 0 || maxIndex < 0) {
    return -1;
  }

  // Home / End
  if (enableHomeAndEndKeys) {
    if (event.key === HOME) {
      return minIndex;
    }
    if (event.key === END) {
      return maxIndex;
    }
  }

  // Forward / backward
  let nextIndex: number;

  if (currentIndex === -1) {
    nextIndex = forwardKeys.includes(event.key) ? minIndex : maxIndex;
  } else {
    nextIndex = findNonDisabledIndex(items, {
      startingIndex: currentIndex,
      decrement: backwardKeys.includes(event.key),
      disabledIndices,
    });
  }

  // Loop at boundaries
  if (loop) {
    if (nextIndex > maxIndex && forwardKeys.includes(event.key)) {
      nextIndex = minIndex;
    } else if (nextIndex < minIndex && backwardKeys.includes(event.key)) {
      nextIndex = maxIndex;
    }
  }

  if (isIndexOutOfBounds(items, nextIndex)) {
    return currentIndex;
  }

  return nextIndex;
}

// ─── Grid navigation ──────────────────────────────────────────────────────────

/**
 * Computes the next highlighted index for a two-dimensional grid based on a
 * keyboard event. Returns `-1` when the event doesn't match a navigation key.
 *
 * Handles:
 * - All four arrow keys
 * - Home / End (row-level)
 * - RTL horizontal key reversal
 * - Disabled item skipping
 * - Loop / wrap at boundaries
 */
export function navigateGrid(options: CompositeGridOptions): number {
  const {
    currentIndex,
    items,
    event,
    cols,
    direction = 'ltr',
    loop = false,
    disabledIndices,
    enableHomeAndEndKeys = true,
  } = options;

  const isRtl = direction === 'rtl';
  const minIndex = getMinListIndex(items, disabledIndices);
  const maxIndex = getMaxListIndex(items, disabledIndices);

  if (minIndex < 0 || maxIndex < 0) {
    return -1;
  }

  const navigationKeys = new Set([ARROW_UP, ARROW_DOWN, ARROW_LEFT, ARROW_RIGHT]);
  if (enableHomeAndEndKeys) {
    navigationKeys.add(HOME);
    navigationKeys.add(END);
  }

  if (!navigationKeys.has(event.key)) {
    return -1;
  }

  // Home / End (row-level)
  if (enableHomeAndEndKeys) {
    if (event.key === HOME) {
      return minIndex;
    }
    if (event.key === END) {
      return maxIndex;
    }
  }

  let nextIndex = currentIndex;
  const prevRow = Math.floor(currentIndex / cols);

  // Vertical navigation
  if (event.key === ARROW_UP || event.key === ARROW_DOWN) {
    const decrement = event.key === ARROW_UP;
    if (currentIndex === -1) {
      nextIndex = decrement ? maxIndex : minIndex;
    } else {
      nextIndex = findNonDisabledIndex(items, {
        startingIndex: currentIndex,
        amount: cols,
        decrement,
        disabledIndices,
      });

      if (loop) {
        if (decrement && nextIndex < minIndex) {
          // Wrap to same column in last row
          const col = currentIndex % cols;
          const maxCol = maxIndex % cols;
          const offset = maxIndex - (maxCol - col);
          nextIndex = maxCol >= col ? offset : offset - cols;
        } else if (!decrement && nextIndex > maxIndex) {
          // Wrap to same column in first row
          nextIndex = findNonDisabledIndex(items, {
            startingIndex: (currentIndex % cols) - cols,
            amount: cols,
            disabledIndices,
          });
        }
      }
    }

    if (isIndexOutOfBounds(items, nextIndex)) {
      nextIndex = currentIndex;
    }
    return nextIndex;
  }

  // Horizontal navigation
  const isForward = event.key === (isRtl ? ARROW_LEFT : ARROW_RIGHT);
  const isBackward = event.key === (isRtl ? ARROW_RIGHT : ARROW_LEFT);

  if (isForward) {
    if (currentIndex === -1) {
      nextIndex = minIndex;
    } else if (currentIndex % cols !== cols - 1) {
      nextIndex = findNonDisabledIndex(items, {
        startingIndex: currentIndex,
        disabledIndices,
      });
      // Don't cross row boundary
      if (Math.floor(nextIndex / cols) !== prevRow) {
        nextIndex = loop
          ? findNonDisabledIndex(items, {
              startingIndex: currentIndex - (currentIndex % cols) - 1,
              disabledIndices,
            })
          : currentIndex;
      }
    } else if (loop) {
      nextIndex = findNonDisabledIndex(items, {
        startingIndex: currentIndex - (currentIndex % cols) - 1,
        disabledIndices,
      });
    }
  } else if (isBackward) {
    if (currentIndex === -1) {
      nextIndex = maxIndex;
    } else if (currentIndex % cols !== 0) {
      nextIndex = findNonDisabledIndex(items, {
        startingIndex: currentIndex,
        decrement: true,
        disabledIndices,
      });
      if (Math.floor(nextIndex / cols) !== prevRow) {
        nextIndex = loop
          ? findNonDisabledIndex(items, {
              startingIndex: currentIndex + (cols - (currentIndex % cols)),
              decrement: true,
              disabledIndices,
            })
          : currentIndex;
      }
    } else if (loop) {
      nextIndex = findNonDisabledIndex(items, {
        startingIndex: currentIndex + (cols - (currentIndex % cols)),
        decrement: true,
        disabledIndices,
      });
    }
  }

  if (isIndexOutOfBounds(items, nextIndex)) {
    nextIndex = currentIndex;
  }

  if (Math.floor(nextIndex / cols) !== prevRow && currentIndex !== -1) {
    nextIndex = currentIndex;
  }

  return nextIndex;
}
