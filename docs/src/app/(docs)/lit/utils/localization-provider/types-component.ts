/* eslint-disable react/function-component-definition */
import * as React from 'react';
import type { Locale } from 'date-fns/locale';

export interface LocalizationContext {
  /**
   * The locale to use in temporal components.
   */
  temporalLocale?: Locale | undefined;
}

export interface LocalizationProviderProps {
  /**
   * The locale to use in temporal components.
   * @default en-US
   */
  temporalLocale?: Locale | undefined;
}

/**
 * Defines the temporal locale provider for Base UI temporal components.
 */
export const LocalizationProvider: React.FC<LocalizationProviderProps> = () => null;

export namespace LocalizationProvider {
  export type Props = LocalizationProviderProps;
}

/**
 * Returns the localization context from the nearest provider.
 */
export function getLocalizationContext(element: Element): LocalizationContext {
  void element;
  return {};
}
