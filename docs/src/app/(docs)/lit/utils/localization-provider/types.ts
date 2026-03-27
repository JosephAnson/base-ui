import { createMultipleTypes } from 'docs/src/utils/createTypes';
import * as LocalizationProviderModule from './types-component';

const { types } = createMultipleTypes(import.meta.url, LocalizationProviderModule);

export const TypesLocalizationProvider = types.LocalizationProvider;
export const TypesGetLocalizationContext = types.getLocalizationContext;
