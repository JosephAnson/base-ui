import { createMultipleTypes } from 'docs/src/utils/createTypes';
import { Meter } from './types-component';

export const { types: TypesMeter } = createMultipleTypes(import.meta.url, Meter);
