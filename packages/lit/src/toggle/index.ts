import { ReactiveElement } from 'lit';
import type { ToggleGroupRootElement } from '../toggle-group/index.ts';

/**
 * A two-state button that can be on or off.
 * Renders a `<toggle-root>` custom element.
 *
 * When placed inside a `<toggle-group-root>`, the pressed state is managed
 * by the group and the `value` property is used as the toggle's identifier.
 *
 * Documentation: [Base UI Toggle](https://base-ui.com/react/components/toggle)
 */
export class ToggleRootElement extends ReactiveElement {
  static properties = {
    pressed: { type: Boolean, reflect: true },
    defaultPressed: { type: Boolean, attribute: 'default-pressed' },
    disabled: { type: Boolean, reflect: true },
    value: { type: String },
  };

  declare pressed: boolean | undefined;
  declare defaultPressed: boolean;
  declare disabled: boolean;
  declare value: string | undefined;

  /** Callback fired when the pressed state changes. Set via `.onPressedChange=${fn}`. */
  onPressedChange: ((pressed: boolean, event: Event) => void) | undefined;

  private _internalPressed = false;
  private _initialized = false;
  private _group: ToggleGroupRootElement | null = null;
  private _groupStateHandler = () => this._syncFromGroup();

  constructor() {
    super();
    this.pressed = undefined;
    this.defaultPressed = false;
    this.disabled = false;
  }

  override createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();

    // Detect toggle-group parent
    this._group = this.closest('toggle-group-root') as ToggleGroupRootElement | null;

    if (!this._initialized) {
      this._initialized = true;
      if (!this._group) {
        this._internalPressed = this.pressed ?? this.defaultPressed;
      }
    }

    if (this._group) {
      this._group.addEventListener('base-ui-toggle-group-state-change', this._groupStateHandler);
    }

    this.addEventListener('click', this._handleClick);
    this.addEventListener('keydown', this._handleKeyDown);
    this.addEventListener('keyup', this._handleKeyUp);
    this._syncAttributes();

    // When in a group, let the group manage tabindex after all items connect
    if (this._group) {
      queueMicrotask(() => this._group?._syncTabIndices());
    }
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('click', this._handleClick);
    this.removeEventListener('keydown', this._handleKeyDown);
    this.removeEventListener('keyup', this._handleKeyUp);

    if (this._group) {
      this._group.removeEventListener(
        'base-ui-toggle-group-state-change',
        this._groupStateHandler,
      );
      this._group = null;
    }
  }

  protected override updated() {
    this._syncAttributes();
  }

  /** Returns the effective disabled state, inheriting from group if applicable. */
  private _isDisabled(): boolean {
    return this.disabled || (this._group?.disabled ?? false);
  }

  getPressed(): boolean {
    // When inside a toggle-group, derive pressed from the group's value array
    if (this._group && this.value !== undefined) {
      return this._group.isPressed(this.value);
    }
    return this.pressed ?? this._internalPressed;
  }

  toggle(event?: Event) {
    const effectiveDisabled = this._isDisabled();
    if (effectiveDisabled) return;

    const nextPressed = !this.getPressed();

    // When inside a toggle-group, delegate to the group
    if (this._group && this.value !== undefined) {
      this.onPressedChange?.(nextPressed, event ?? new Event('change'));
      this._group.setGroupValue(this.value, nextPressed, event ?? new Event('change'));
      return;
    }

    this.onPressedChange?.(nextPressed, event ?? new Event('change'));

    // Update internal state (uncontrolled mode)
    if (this.pressed === undefined) {
      this._internalPressed = nextPressed;
    }

    this._syncAttributes();
    this.requestUpdate();
  }

  private _syncFromGroup() {
    this._syncAttributes();
    this.requestUpdate();
  }

  private _syncAttributes() {
    const isPressed = this.getPressed();
    const effectiveDisabled = this._isDisabled();

    // ARIA
    this.setAttribute('role', 'button');
    this.setAttribute('aria-pressed', isPressed ? 'true' : 'false');

    // Data attributes
    this.toggleAttribute('data-pressed', isPressed);
    this.toggleAttribute('data-disabled', effectiveDisabled);

    // Tabindex: when in a group, the group manages roving tabindex
    if (!this._group) {
      this.tabIndex = effectiveDisabled ? -1 : 0;
    }
  }

  private _handleClick = (event: MouseEvent) => {
    if (this._isDisabled()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    this.toggle(event);
  };

  private _handleKeyDown = (event: KeyboardEvent) => {
    if (this._isDisabled()) {
      event.preventDefault();
      return;
    }

    if (event.target !== this) return;

    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
    }

    if (event.key === 'Enter') {
      this.toggle(event);
    }
  };

  private _handleKeyUp = (event: KeyboardEvent) => {
    if (this._isDisabled()) return;
    if (event.target !== this) return;

    if (event.key === ' ') {
      this.toggle(event);
    }
  };
}

if (!customElements.get('toggle-root')) {
  customElements.define('toggle-root', ToggleRootElement);
}

export interface ToggleRootState {
  /**
   * Whether the toggle is currently pressed.
   */
  pressed: boolean;
  /**
   * Whether the toggle should ignore user interaction.
   */
  disabled: boolean;
}

export namespace ToggleRoot {
  export type State = ToggleRootState;
}

declare global {
  interface HTMLElementTagNameMap {
    'toggle-root': ToggleRootElement;
  }
}
