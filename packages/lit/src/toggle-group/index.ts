import { ReactiveElement } from 'lit';

// ─── Constants ──────────────────────────────────────────────────────────────────

const TOGGLE_GROUP_ROOT_ATTRIBUTE = 'data-base-ui-toggle-group-root';
const TOGGLE_GROUP_STATE_CHANGE_EVENT = 'base-ui-toggle-group-state-change';

type ToggleGroupOrientation = 'horizontal' | 'vertical';

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface ToggleGroupRootState {
  /**
   * Whether the toggle group should ignore user interaction.
   */
  disabled: boolean;
  /**
   * Whether multiple items can be pressed at the same time.
   */
  multiple: boolean;
  /**
   * The orientation of the toggle group.
   */
  orientation: ToggleGroupOrientation;
}

// ─── ToggleGroupRootElement ─────────────────────────────────────────────────────

/**
 * Groups related toggle buttons.
 * Renders a `<toggle-group-root>` custom element.
 *
 * Documentation: [Base UI Toggle Group](https://base-ui.com/react/components/toggle-group)
 */
export class ToggleGroupRootElement extends ReactiveElement {
  static properties = {
    disabled: { type: Boolean, reflect: true },
    multiple: { type: Boolean },
  };

  declare disabled: boolean;
  declare multiple: boolean;

  /** Whether arrow key navigation loops back to the start. */
  loopFocus = true;

  /** The orientation of the toggle group for keyboard navigation. */
  orientation: ToggleGroupOrientation = 'horizontal';

  /**
   * Controlled value: array of pressed toggle values.
   * When set, the component is controlled and `onValueChange` must be used to update.
   */
  value: readonly string[] | undefined;

  /**
   * Default pressed values for uncontrolled mode.
   */
  defaultValue: readonly string[] | undefined;

  /**
   * Callback fired when the group value changes.
   * Set via `.onValueChange=${fn}`.
   */
  onValueChange: ((groupValue: string[], event: Event) => void) | undefined;

  private _internalValue: string[] = [];
  private _initialized = false;

  constructor() {
    super();
    this.disabled = false;
    this.multiple = false;
  }

  override createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();

    if (!this._initialized) {
      this._initialized = true;
      this._internalValue = this.value
        ? [...this.value]
        : this.defaultValue
          ? [...this.defaultValue]
          : [];
    }

    this.setAttribute(TOGGLE_GROUP_ROOT_ATTRIBUTE, '');
    this.setAttribute('role', 'group');
    this.style.display = 'contents';

    this.addEventListener('keydown', this._handleKeyDown);

    this._syncAttributes();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('keydown', this._handleKeyDown);
  }

  protected override updated() {
    this._syncAttributes();
  }

  // ── Public API ──────────────────────────────────────────────────────────

  /** Returns the current array of pressed values. */
  getValue(): readonly string[] {
    return this.value ?? this._internalValue;
  }

  /** Whether a specific value is pressed in the group. */
  isPressed(toggleValue: string): boolean {
    return this.getValue().indexOf(toggleValue) > -1;
  }

  /**
   * Called by child toggle-root elements when they are toggled.
   * Manages single vs multiple selection logic.
   */
  setGroupValue(toggleValue: string, nextPressed: boolean, event: Event) {
    const currentValue = [...this.getValue()];
    let newValue: string[];

    if (this.multiple) {
      if (nextPressed) {
        newValue = [...currentValue, toggleValue];
      } else {
        newValue = currentValue.filter((v) => v !== toggleValue);
      }
    } else {
      if (nextPressed) {
        newValue = [toggleValue];
      } else {
        newValue = [];
      }
    }

    this.onValueChange?.(newValue, event);

    // Update internal state (uncontrolled mode)
    if (this.value === undefined) {
      this._internalValue = newValue;
    }

    this._syncAttributes();
    this._publishStateChange();
    this.requestUpdate();
  }

  // ── Private ─────────────────────────────────────────────────────────────

  private _syncAttributes() {
    this.setAttribute('data-orientation', this.orientation);
    this.toggleAttribute('data-disabled', this.disabled);
    this.toggleAttribute('data-multiple', this.multiple);
  }

  private _publishStateChange() {
    this.dispatchEvent(
      new CustomEvent(TOGGLE_GROUP_STATE_CHANGE_EVENT, { bubbles: false, cancelable: false }),
    );
  }

  // ── Keyboard navigation (roving tabindex) ─────────────────────────────

  private _getToggleItems(): HTMLElement[] {
    return Array.from(
      this.querySelectorAll<HTMLElement>('toggle-root'),
    ).filter((el) => !el.hasAttribute('disabled') && el.getAttribute('aria-disabled') !== 'true');
  }

  private _handleKeyDown = (event: KeyboardEvent) => {
    if (this.disabled) return;

    const target = event.target;
    if (!(target instanceof HTMLElement) || target.tagName.toLowerCase() !== 'toggle-root') return;

    const delta = this._getNavigationDelta(event.key);
    if (delta == null) return;

    event.preventDefault();
    event.stopPropagation();

    const items = this._getToggleItems();
    if (items.length === 0) return;

    const currentIndex = items.indexOf(target);
    if (currentIndex === -1) return;

    let nextItem: HTMLElement;

    if (delta === Infinity) {
      nextItem = items[items.length - 1];
    } else if (delta === -Infinity) {
      nextItem = items[0];
    } else {
      const proposed = currentIndex + delta;
      if (proposed < 0) {
        nextItem = this.loopFocus ? items[items.length - 1] : items[0];
      } else if (proposed >= items.length) {
        nextItem = this.loopFocus ? items[0] : items[items.length - 1];
      } else {
        nextItem = items[proposed];
      }
    }

    nextItem.focus();
    this._syncTabIndices(nextItem);
  };

  private _getNavigationDelta(key: string): number | null {
    if (this.orientation === 'vertical') {
      if (key === 'ArrowDown') return 1;
      if (key === 'ArrowUp') return -1;
      if (key === 'Home') return -(Infinity);
      if (key === 'End') return Infinity;
      return null;
    }

    const dir = this._getDirection();
    const forward = dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
    const backward = dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft';

    if (key === forward) return 1;
    if (key === backward) return -1;
    if (key === 'Home') return -(Infinity);
    if (key === 'End') return Infinity;
    return null;
  }

  private _getDirection(): 'ltr' | 'rtl' {
    const scoped = this.closest('[dir]')?.getAttribute('dir');
    const doc = this.ownerDocument.documentElement.getAttribute('dir');
    return scoped === 'rtl' || doc === 'rtl' ? 'rtl' : 'ltr';
  }

  /** Update tab indices so only one item is tabbable (roving tabindex). */
  _syncTabIndices(activeItem?: HTMLElement) {
    const items = this._getToggleItems();
    if (items.length === 0) return;

    const current = activeItem ?? items[0];

    items.forEach((item) => {
      item.tabIndex = item === current ? 0 : -1;
    });
  }
}

if (!customElements.get('toggle-group-root')) {
  customElements.define('toggle-group-root', ToggleGroupRootElement);
}

export namespace ToggleGroupRoot {
  export type State = ToggleGroupRootState;
}

declare global {
  interface HTMLElementTagNameMap {
    'toggle-group-root': ToggleGroupRootElement;
  }
}
