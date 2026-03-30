import { createMultipleTypes } from 'docs/src/utils/createTypes';
import { PopoverDocumentation } from './types-component';

export const { types: TypesPopover } = createMultipleTypes(import.meta.url, PopoverDocumentation);
