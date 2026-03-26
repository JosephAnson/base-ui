/**
 * Options for `applyButtonBehavior`.
 */
export interface ButtonBehaviorOptions {
  /** Whether the button is disabled. */
  disabled?: boolean | undefined;
  /** Whether to keep focus when disabled. */
  focusableWhenDisabled?: boolean | undefined;
  /** Tab index override. */
  tabIndex?: number | undefined;
  /** Whether the element is a native `<button>`. When false, role/tabindex/keyboard handling are added. */
  native?: boolean | undefined;
  /** Whether the element participates in a composite widget with roving focus managed elsewhere. */
  composite?: boolean | undefined;
  /** ARIA role to apply for non-native elements. */
  role?: string | undefined;
  /** Callback invoked when the button is activated (click, Enter, Space). */
  onAction?: ((event: Event) => void) | undefined;
}

const BUTTON_EVENT_HANDLED = Symbol('base-ui-lit-use-button-handled');

type HandledButtonEvent = Event & { [BUTTON_EVENT_HANDLED]?: boolean | undefined };

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
    focusableWhenDisabled,
    tabIndex = 0,
    native = element.tagName === 'BUTTON',
    composite = false,
    role = 'button',
    onAction,
  } = options;
  const focusableDisabled = isFocusableWhenDisabled({ composite, focusableWhenDisabled });

  const handleDisabledInteractionCapture = (event: Event) => {
    if (!disabled) {
      return;
    }

    if (event instanceof KeyboardEvent && focusableDisabled && event.key === 'Tab') {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
  };

  const handleClick = (event: MouseEvent) => {
    if (isButtonEventHandled(event)) {
      return;
    }
    markButtonEventHandled(event);
    onAction?.(event);
  };

  const handleMouseDown = (_event: MouseEvent) => {
    if (disabled) {
      return;
    }
  };

  const handlePointerDown = (_event: PointerEvent) => {
    if (disabled) {
      return;
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    const isCurrentTarget = event.target === element;

    if (disabled) {
      return;
    }
    if (!isCurrentTarget) {
      return;
    }

    const isEnterKey = event.key === 'Enter';
    const isSpaceKey = event.key === ' ';
    const currentRole = element.getAttribute('role') ?? role;

    if (composite && isSpaceKey) {
      if (event.defaultPrevented && isTextNavigationRole(currentRole)) {
        return;
      }

      event.preventDefault();

      if (isButtonEventHandled(event)) {
        return;
      }

      markButtonEventHandled(event);
      element.click();
      return;
    }

    if (!native && (isSpaceKey || isEnterKey)) {
      event.preventDefault();
    }

    if (!native && isEnterKey) {
      if (isButtonEventHandled(event)) {
        return;
      }

      markButtonEventHandled(event);
      element.click();
    }
  };

  const handleKeyUp = (event: KeyboardEvent) => {
    const isCurrentTarget = event.target === element;

    if (disabled) {
      return;
    }

    if (!isCurrentTarget) {
      return;
    }

    if (native && composite && event.key === ' ') {
      event.preventDefault();
      return;
    }

    if (!native && !composite && event.key === ' ') {
      if (isButtonEventHandled(event)) {
        return;
      }

      markButtonEventHandled(event);
      element.click();
    }
  };

  // Sync attributes
  syncButtonAttributes(element, {
    disabled,
    focusableWhenDisabled,
    tabIndex,
    native,
    composite,
    role,
  });

  element.addEventListener('click', handleClick as EventListener);
  element.addEventListener('click', handleDisabledInteractionCapture as EventListener, true);
  element.addEventListener('mousedown', handleMouseDown as EventListener);
  element.addEventListener('mousedown', handleDisabledInteractionCapture as EventListener, true);
  element.addEventListener('pointerdown', handlePointerDown as EventListener);
  element.addEventListener('pointerdown', handleDisabledInteractionCapture as EventListener, true);
  element.addEventListener('keydown', handleKeyDown as EventListener);
  element.addEventListener('keydown', handleDisabledInteractionCapture as EventListener, true);
  element.addEventListener('keyup', handleKeyUp as EventListener);
  element.addEventListener('keyup', handleDisabledInteractionCapture as EventListener, true);

  return () => {
    element.removeEventListener('click', handleClick as EventListener);
    element.removeEventListener('click', handleDisabledInteractionCapture as EventListener, true);
    element.removeEventListener('mousedown', handleMouseDown as EventListener);
    element.removeEventListener(
      'mousedown',
      handleDisabledInteractionCapture as EventListener,
      true,
    );
    element.removeEventListener('pointerdown', handlePointerDown as EventListener);
    element.removeEventListener(
      'pointerdown',
      handleDisabledInteractionCapture as EventListener,
      true,
    );
    element.removeEventListener('keydown', handleKeyDown as EventListener);
    element.removeEventListener('keydown', handleDisabledInteractionCapture as EventListener, true);
    element.removeEventListener('keyup', handleKeyUp as EventListener);
    element.removeEventListener('keyup', handleDisabledInteractionCapture as EventListener, true);
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
    focusableWhenDisabled,
    tabIndex = 0,
    native = element.tagName === 'BUTTON',
    composite = false,
    role = 'button',
  } = options;
  const focusableDisabled = isFocusableWhenDisabled({ composite, focusableWhenDisabled });

  if (!native) {
    element.setAttribute('role', role);
    if (disabled) {
      element.setAttribute('aria-disabled', 'true');
    } else {
      element.removeAttribute('aria-disabled');
    }

    if (!composite) {
      if (disabled) {
        element.tabIndex = focusableDisabled ? tabIndex : -1;
      } else {
        element.tabIndex = tabIndex;
      }
    }
  } else {
    element.removeAttribute('role');

    if (focusableDisabled && disabled) {
      element.setAttribute('aria-disabled', 'true');
      (element as unknown as HTMLButtonElement).disabled = false;
    } else {
      element.removeAttribute('aria-disabled');
      (element as unknown as HTMLButtonElement).disabled = disabled;
    }

    if (!composite) {
      element.tabIndex = tabIndex;
    }

    if (!(element as unknown as HTMLButtonElement).hasAttribute('type')) {
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

function isFocusableWhenDisabled({
  composite,
  focusableWhenDisabled,
}: {
  composite: boolean;
  focusableWhenDisabled: boolean | undefined;
}) {
  if (composite) {
    return focusableWhenDisabled !== false;
  }

  return focusableWhenDisabled ?? false;
}

function isTextNavigationRole(role: string | null) {
  return role?.startsWith('menuitem') || role === 'option' || role === 'gridcell';
}

function isButtonEventHandled(event: Event) {
  return Boolean((event as HandledButtonEvent)[BUTTON_EVENT_HANDLED]);
}

function markButtonEventHandled(event: Event) {
  (event as HandledButtonEvent)[BUTTON_EVENT_HANDLED] = true;
}
