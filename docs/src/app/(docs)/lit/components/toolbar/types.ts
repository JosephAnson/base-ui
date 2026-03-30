import { createMultipleTypes } from 'docs/src/utils/createTypes';
import { Toolbar } from './types-component';

export const { types: TypesToolbar } = createMultipleTypes(import.meta.url, Toolbar);
