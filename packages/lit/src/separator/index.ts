import { ReactiveElement } from 'lit';

export type Orientation = 'horizontal' | 'vertical';

/**
 * A separator element accessible to screen readers.
 * Renders a `<separator-root>` custom element.
 *
 * Documentation: [Base UI Separator](https://base-ui.com/react/components/separator)
 */
export class SeparatorRootElement extends ReactiveElement {
  static properties = {
    orientation: { type: String, reflect: true },
  };

  declare orientation: Orientation;

  constructor() {
    super();
    this.orientation = 'horizontal';
  }

  override createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();
    this.syncAttributes();
  }

  protected override updated() {
    this.syncAttributes();
  }

  private syncAttributes() {
    this.setAttribute('role', 'separator');
    this.setAttribute('aria-orientation', this.orientation);
    this.dataset.orientation = this.orientation;
  }
}

if (!customElements.get('separator-root')) {
  customElements.define('separator-root', SeparatorRootElement);
}

export interface SeparatorRootState {
  /**
   * The orientation of the separator.
   */
  orientation: Orientation;
}

export namespace SeparatorRoot {
  export type State = SeparatorRootState;
}

// Backwards-compat alias — menu/index.ts re-exports `Separator` until it's rewritten
export { SeparatorRootElement as Separator };

declare global {
  interface HTMLElementTagNameMap {
    'separator-root': SeparatorRootElement;
  }
}
