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
  const dir =
    element.closest('[dir]')?.getAttribute('dir') ?? documentElement?.getAttribute('dir');
  return dir === 'rtl' ? 'rtl' : 'ltr';
}

/**
 * A provider element that sets the text direction for its subtree.
 * Renders a `<direction-provider>` custom element with `display: contents`.
 *
 * Documentation: [Base UI DirectionProvider](https://base-ui.com/react/utils/direction-provider)
 */
export class DirectionProviderElement extends ReactiveElement {
  static properties = {
    dir: { type: String, reflect: true },
  };

  declare dir: TextDirection;

  constructor() {
    super();
    this.dir = 'ltr';
  }

  override createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();
    this.style.display = 'contents';
  }
}

if (!customElements.get('direction-provider')) {
  customElements.define('direction-provider', DirectionProviderElement);
}

export namespace DirectionProvider {
  export interface Props {
    dir?: TextDirection;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'direction-provider': DirectionProviderElement;
  }
}
