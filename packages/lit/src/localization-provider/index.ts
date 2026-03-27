import type { Locale } from 'date-fns/locale';
import { BaseHTMLElement } from '../utils';

const LOCALIZATION_PROVIDER_CHANGE_EVENT = 'base-ui-localization-provider-change';

/**
 * Localization context values.
 */
export interface LocalizationContext {
  /** A date-fns Locale object (or compatible locale). */
  temporalLocale?: Locale | undefined;
}

export interface LocalizationProviderProps {
  /**
   * The locale to use in temporal components.
   */
  temporalLocale?: Locale | undefined;
}

/**
 * Finds the nearest `<localization-provider>` ancestor and returns its context.
 * Falls back to `{}` when no provider is found.
 */
export function getLocalizationContext(element: Element): LocalizationContext {
  const provider = element.closest('localization-provider') as LocalizationProviderElement | null;
  if (!provider) {
    return {};
  }
  return { temporalLocale: provider.temporalLocale };
}

/**
 * A provider element that supplies a date-fns Locale (or compatible) to
 * temporal components in its subtree.
 * Renders with `display: contents`.
 *
 * Documentation: [Base UI LocalizationProvider](https://base-ui.com/react/utils/localization-provider)
 */
export class LocalizationProviderElement extends BaseHTMLElement {
  private temporalLocaleValue: Locale | undefined;

  /** A date-fns Locale object or compatible locale configuration. */
  get temporalLocale(): Locale | undefined {
    return this.temporalLocaleValue;
  }

  set temporalLocale(value: Locale | undefined) {
    if (this.temporalLocaleValue === value) {
      return;
    }

    this.temporalLocaleValue = value;
    this.dispatchEvent(
      new CustomEvent(LOCALIZATION_PROVIDER_CHANGE_EVENT, {
        bubbles: true,
        composed: true,
      }),
    );
  }

  /** @deprecated Use `temporalLocale` instead. */
  get locale(): Locale | undefined {
    return this.temporalLocale;
  }

  /** @deprecated Use `temporalLocale` instead. */
  set locale(value: Locale | undefined) {
    this.temporalLocale = value;
  }

  connectedCallback() {
    this.style.display = 'contents';
  }
}

if (!customElements.get('localization-provider')) {
  customElements.define('localization-provider', LocalizationProviderElement);
}

export namespace LocalizationProvider {
  export type Props = LocalizationProviderProps;
}

export { LOCALIZATION_PROVIDER_CHANGE_EVENT };

declare global {
  interface HTMLElementTagNameMap {
    'localization-provider': LocalizationProviderElement;
  }
}
