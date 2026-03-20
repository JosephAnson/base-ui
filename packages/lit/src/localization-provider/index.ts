import { BaseHTMLElement } from '../utils/index.ts';

/**
 * Localization context values.
 */
export interface LocalizationContext {
  /** A date-fns Locale object (or compatible locale). */
  temporalLocale?: object | undefined;
}

/**
 * Finds the nearest `<localization-provider>` ancestor and returns its context.
 * Falls back to `{}` when no provider is found.
 */
export function getLocalizationContext(element: Element): LocalizationContext {
  const provider = element.closest(
    'localization-provider',
  ) as LocalizationProviderElement | null;
  if (!provider) {
    return {};
  }
  return { temporalLocale: provider.locale };
}

/**
 * A provider element that supplies a date-fns Locale (or compatible) to
 * temporal components in its subtree.
 * Renders with `display: contents`.
 *
 * Documentation: [Base UI LocalizationProvider](https://base-ui.com/react/utils/localization-provider)
 */
export class LocalizationProviderElement extends BaseHTMLElement {
  /** A date-fns Locale object or compatible locale configuration. */
  locale: object | undefined;

  connectedCallback() {
    this.style.display = 'contents';
  }
}

if (!customElements.get('localization-provider')) {
  customElements.define('localization-provider', LocalizationProviderElement);
}

export namespace LocalizationProvider {
  export interface Props {
    locale?: object;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'localization-provider': LocalizationProviderElement;
  }
}
