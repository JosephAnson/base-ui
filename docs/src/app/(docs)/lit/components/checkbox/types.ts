import { createMultipleTypes } from 'docs/src/utils/createTypes';
import { Checkbox } from './types-component';

const { types } = createMultipleTypes(import.meta.url, Checkbox);

export const TypesCheckboxRoot = types.Root;
export const TypesCheckboxIndicator = types.Indicator;
