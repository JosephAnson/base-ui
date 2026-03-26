import { ReactiveElement } from 'lit';

/**
 * CSP context values.
 */
export interface CSPContextValue {
  nonce?: string | undefined;
  disableStyleElements?: boolean | undefined;
}

export interface CSPProviderState {}

export interface CSPProviderProps {
  nonce?: string | undefined;
  disableStyleElements?: boolean | undefined;
}

/**
 * Finds the nearest `<csp-provider>` ancestor and returns its CSP context.
 * Falls back to `{ disableStyleElements: false }` when no provider is found.
 */
export function getCSPContext(element: Element): CSPContextValue {
  const provider = element.closest('csp-provider') as CSPProviderElement | null;
  if (!provider) {
    return { disableStyleElements: false };
  }
  return {
    nonce: provider.nonce || undefined,
    disableStyleElements: provider.disableStyleElements,
  };
}

/**
 * A provider element that supplies a CSP nonce and/or disables inline style
 * injection for all Base UI descendants.
 * Renders a `<csp-provider>` custom element with `display: contents`.
 *
 * Documentation: [Base UI CSPProvider](https://base-ui.com/react/utils/csp-provider)
 */
export class CSPProviderElement extends ReactiveElement {
  static properties = {
    nonce: { type: String, reflect: true },
    disableStyleElements: { type: Boolean, attribute: 'disable-style-elements' },
  };

  declare nonce: string;
  declare disableStyleElements: boolean;

  constructor() {
    super();
    this.nonce = '';
    this.disableStyleElements = false;
  }

  override createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();
    this.style.display = 'contents';
  }
}

if (!customElements.get('csp-provider')) {
  customElements.define('csp-provider', CSPProviderElement);
}

export namespace CSPProvider {
  export type Props = CSPProviderProps;
  export type State = CSPProviderState;
}

declare global {
  interface HTMLElementTagNameMap {
    'csp-provider': CSPProviderElement;
  }
}
