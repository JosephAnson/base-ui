import { ReactiveElement } from 'lit';

/**
 * A button component that can be used to trigger actions.
 * Renders a `<button-root>` custom element.
 *
 * Documentation: [Base UI Button](https://base-ui.com/react/components/button)
 */
export class ButtonRootElement extends ReactiveElement {
  static properties = {
    disabled: { type: Boolean, reflect: true },
    focusableWhenDisabled: { type: Boolean, attribute: 'focusable-when-disabled' },
  };

  declare disabled: boolean;
  declare focusableWhenDisabled: boolean;

  constructor() {
    super();
    this.disabled = false;
    this.focusableWhenDisabled = false;
  }

  override createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();
    this.addEventListener('click', this._handleClick);
    this.addEventListener('keydown', this._handleKeyDown);
    this.addEventListener('keyup', this._handleKeyUp);
    this.addEventListener('pointerdown', this._handlePointerDown);
    this.syncAttributes();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('click', this._handleClick);
    this.removeEventListener('keydown', this._handleKeyDown);
    this.removeEventListener('keyup', this._handleKeyUp);
    this.removeEventListener('pointerdown', this._handlePointerDown);
  }

  protected override updated() {
    this.syncAttributes();
  }

  private _isNativeButton(): boolean {
    return this.tagName === 'BUTTON';
  }

  private syncAttributes() {
    const isNative = this._isNativeButton();

    if (!isNative) {
      this.setAttribute('role', 'button');

      if (this.disabled) {
        this.setAttribute('aria-disabled', 'true');
        if (!this.focusableWhenDisabled) {
          this.tabIndex = -1;
        } else {
          this.tabIndex = 0;
        }
      } else {
        this.removeAttribute('aria-disabled');
        this.tabIndex = 0;
      }
    } else {
      // Native button
      if (this.focusableWhenDisabled) {
        this.setAttribute('aria-disabled', 'true');
        (this as unknown as HTMLButtonElement).disabled = false;
      } else {
        this.removeAttribute('aria-disabled');
        (this as unknown as HTMLButtonElement).disabled = this.disabled;
      }

      if (!(this as unknown as HTMLButtonElement).type) {
        (this as unknown as HTMLButtonElement).type = 'button';
      }
    }

    this.toggleAttribute('data-disabled', this.disabled);
  }

  private _handleClick = (event: MouseEvent) => {
    if (this.disabled) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  private _handlePointerDown = (event: PointerEvent) => {
    if (this.disabled) {
      event.preventDefault();
    }
  };

  private _handleKeyDown = (event: KeyboardEvent) => {
    if (this.disabled && this.focusableWhenDisabled && event.key !== 'Tab') {
      event.preventDefault();
      return;
    }

    if (this.disabled) {
      return;
    }

    if (event.target !== this) {
      return;
    }

    const isNative = this._isNativeButton();

    if (!isNative && (event.key === ' ' || event.key === 'Enter')) {
      event.preventDefault();
    }

    if (!isNative && event.key === 'Enter') {
      this.click();
    }
  };

  private _handleKeyUp = (event: KeyboardEvent) => {
    if (this.disabled) {
      return;
    }

    if (event.target !== this) {
      return;
    }

    const isNative = this._isNativeButton();

    if (!isNative && event.key === ' ') {
      this.click();
    }
  };
}

if (!customElements.get('button-root')) {
  customElements.define('button-root', ButtonRootElement);
}

export interface ButtonRootState {
  /**
   * Whether the button should ignore user interaction.
   */
  disabled: boolean;
}

export namespace ButtonRoot {
  export type State = ButtonRootState;
}

declare global {
  interface HTMLElementTagNameMap {
    'button-root': ButtonRootElement;
  }
}
