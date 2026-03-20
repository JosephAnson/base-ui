/**
 * POC: separator-root custom element
 *
 * Architecture: Option C - Host IS the element
 * The custom element tag itself acts as the separator.
 * No shadow DOM, no inner wrapper.
 *
 * Supports `as-child` attribute: when present, the custom element becomes
 * invisible (display: contents) and forwards all behavior to its first
 * child element.
 *
 * Usage:
 *   html`<separator-root orientation="vertical" class="my-sep"></separator-root>`
 *
 *   <!-- as-child: host is invisible, <hr> gets the separator behavior -->
 *   html`<separator-root as-child>
 *     <hr class="custom-separator" />
 *   </separator-root>`
 */
import { ReactiveElement } from 'lit';

export type Orientation = 'horizontal' | 'vertical';

export class SeparatorRootElement extends ReactiveElement {
  static properties = {
    orientation: { type: String, reflect: true },
    asChild: { type: Boolean, attribute: 'as-child', reflect: true },
  };

  declare orientation: Orientation;
  declare asChild: boolean;

  constructor() {
    super();
    this.orientation = 'horizontal';
    this.asChild = false;
  }

  override createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();
    this.syncAttributes();
  }

  protected override updated(changed: Map<string, unknown>) {
    super.updated(changed);
    this.syncAttributes();
  }

  /** The element that receives role/ARIA/data-* attributes. */
  private getTarget(): Element {
    if (this.asChild) {
      const child = this.firstElementChild;
      if (child) return child;
    }
    return this;
  }

  private syncAttributes() {
    const target = this.getTarget();

    if (this.asChild) {
      // Host becomes invisible to layout
      this.style.display = 'contents';
      // Remove role/aria from host when delegating
      this.removeAttribute('role');
      this.removeAttribute('aria-orientation');
      delete this.dataset.orientation;
    } else {
      this.style.display = '';
    }

    target.setAttribute('role', 'separator');
    target.setAttribute('aria-orientation', this.orientation);
    if (target instanceof HTMLElement) {
      target.dataset.orientation = this.orientation;
    }
  }
}

customElements.define('separator-root', SeparatorRootElement);

declare global {
  interface HTMLElementTagNameMap {
    'separator-root': SeparatorRootElement;
  }
}
