import { ReactiveElement } from 'lit';

/**
 * Text direction type.
 */
export type TextDirection = 'ltr' | 'rtl';

/**
 * Resolves the text direction for an element by walking up the DOM tree
 * to find the nearest `[dir]` attribute, falling back to the document
 * element's `dir`, or `'ltr'` as the default.
 */
export function getDirection(element: Element): TextDirection {
  const documentElement = element.ownerDocument?.documentElement;
  const dir = element.closest('[dir]')?.getAttribute('dir') ?? documentElement?.getAttribute('dir');
  return dir === 'rtl' ? 'rtl' : 'ltr';
}

/**
 * A provider element that sets the text direction for its subtree.
 * Renders a `<direction-provider>` custom element with `display: contents`.
 *
 * Documentation: [Base UI Direction Provider](https://base-ui.com/react/utils/direction-provider)
 */
export class DirectionProviderElement extends ReactiveElement {
  static override get observedAttributes() {
    return [...super.observedAttributes, 'dir'];
  }

  static properties = {
    direction: { type: String, reflect: true },
  };

  declare direction: TextDirection;

  get dir(): TextDirection {
    return this.direction;
  }

  set dir(value: TextDirection) {
    this.direction = value === 'rtl' ? 'rtl' : 'ltr';
  }

  constructor() {
    super();
    this.direction = 'ltr';
  }

  override createRenderRoot() {
    return this;
  }

  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ) {
    super.attributeChangedCallback(name, oldValue, newValue);

    if (name === 'dir' && !this.hasAttribute('direction')) {
      this.direction = newValue === 'rtl' ? 'rtl' : 'ltr';
    }
  }

  override connectedCallback() {
    super.connectedCallback();

    if (!this.hasAttribute('direction') && this.hasAttribute('dir')) {
      this.direction = this.getAttribute('dir') === 'rtl' ? 'rtl' : 'ltr';
    }

    this.style.display = 'contents';
    this.syncDirectionAttributes();
  }

  protected override updated() {
    this.syncDirectionAttributes();
  }

  private syncDirectionAttributes() {
    const direction = this.direction === 'rtl' ? 'rtl' : 'ltr';

    if (this.direction !== direction) {
      this.direction = direction;
      return;
    }

    if (this.getAttribute('dir') !== direction) {
      this.setAttribute('dir', direction);
    }
  }
}

if (!customElements.get('direction-provider')) {
  customElements.define('direction-provider', DirectionProviderElement);
}

export interface DirectionProviderState {}

export interface DirectionProviderProps {
  /**
   * The reading direction of the text.
   * @default 'ltr'
   */
  direction?: TextDirection | undefined;
}

export namespace DirectionProvider {
  export type Props = DirectionProviderProps;
  export type State = DirectionProviderState;
}

declare global {
  interface HTMLElementTagNameMap {
    'direction-provider': DirectionProviderElement;
  }
}
