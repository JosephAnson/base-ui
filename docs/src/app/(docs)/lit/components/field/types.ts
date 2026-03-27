import { createMultipleTypes } from 'docs/src/utils/createTypes';
import { Field } from './types-component';

export const { types: TypesField } = createMultipleTypes(import.meta.url, Field);
