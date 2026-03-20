/**
 * Options for `applyButtonBehavior`.
 */
export interface ButtonBehaviorOptions {
  /** Whether the button is disabled. */
  disabled?: boolean;
  /** Whether to keep focus when disabled. */
  focusableWhenDisabled?: boolean;
  /** Tab index override. */
  tabIndex?: number;
  /** Whether the element is a native `<button>`. When false, role/tabindex/keyboard handling are added. */
  native?: boolean;
  /** Callback invoked when the button is activated (click, Enter, Space). */
  onAction?: (event: Event) => void;
}

/**
 * Applies button-like keyboard, mouse, and ARIA behavior to an arbitrary
 * HTML element. Returns a cleanup function that removes all listeners.
 *
 * For native `<button>` elements, only disabled/focusableWhenDisabled handling
 * is applied. For non-native elements, also adds `role="button"`, `tabindex`,
 * and Space/Enter key activation.
 */
export function applyButtonBehavior(
  element: HTMLElement,
  options: ButtonBehaviorOptions = {},
): () => void {
  const {
    disabled = false,
    focusableWhenDisabled = false,
    tabIndex = 0,
    native = element.tagName === 'BUTTON',
    onAction,
  } = options;

  const handleClick = (event: MouseEvent) => {
    if (disabled) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    onAction?.(event);
  };

  const handlePointerDown = (event: PointerEvent) => {
    if (disabled) {
      event.preventDefault();
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (disabled && focusableWhenDisabled && event.key !== 'Tab') {
      event.preventDefault();
      return;
    }
    if (disabled) {
      return;
    }
    if (event.target !== element) {
      return;
    }
    if (!native && (event.key === ' ' || event.key === 'Enter')) {
      event.preventDefault();
    }
    if (!native && event.key === 'Enter') {
      element.click();
    }
  };

  const handleKeyUp = (event: KeyboardEvent) => {
    if (disabled) {
      return;
    }
    if (event.target !== element) {
      return;
    }
    if (!native && event.key === ' ') {
      element.click();
    }
  };

  // Sync attributes
  syncButtonAttributes(element, { disabled, focusableWhenDisabled, tabIndex, native });

  element.addEventListener('click', handleClick as EventListener);
  element.addEventListener('pointerdown', handlePointerDown as EventListener);
  element.addEventListener('keydown', handleKeyDown as EventListener);
  element.addEventListener('keyup', handleKeyUp as EventListener);

  return () => {
    element.removeEventListener('click', handleClick as EventListener);
    element.removeEventListener('pointerdown', handlePointerDown as EventListener);
    element.removeEventListener('keydown', handleKeyDown as EventListener);
    element.removeEventListener('keyup', handleKeyUp as EventListener);
  };
}

/**
 * Syncs ARIA and DOM attributes for button behavior on an element.
 * Useful for updating attributes when options change without re-applying all listeners.
 */
export function syncButtonAttributes(
  element: HTMLElement,
  options: ButtonBehaviorOptions = {},
): void {
  const {
    disabled = false,
    focusableWhenDisabled = false,
    tabIndex = 0,
    native = element.tagName === 'BUTTON',
  } = options;

  if (!native) {
    element.setAttribute('role', 'button');
    if (disabled) {
      element.setAttribute('aria-disabled', 'true');
      element.tabIndex = focusableWhenDisabled ? tabIndex : -1;
    } else {
      element.removeAttribute('aria-disabled');
      element.tabIndex = tabIndex;
    }
  } else {
    if (focusableWhenDisabled && disabled) {
      element.setAttribute('aria-disabled', 'true');
      (element as unknown as HTMLButtonElement).disabled = false;
    } else {
      element.removeAttribute('aria-disabled');
      (element as unknown as HTMLButtonElement).disabled = disabled;
    }
    if (!(element as unknown as HTMLButtonElement).type) {
      (element as unknown as HTMLButtonElement).type = 'button';
    }
  }

  element.toggleAttribute('data-disabled', disabled);
}

/**
 * Removes button behavior attributes from an element.
 */
export function removeButtonBehavior(element: HTMLElement): void {
  element.removeAttribute('role');
  element.removeAttribute('aria-disabled');
  element.removeAttribute('data-disabled');
  element.removeAttribute('tabindex');
}
