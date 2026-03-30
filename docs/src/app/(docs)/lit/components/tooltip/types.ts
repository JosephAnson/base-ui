import { createMultipleTypes } from 'docs/src/utils/createTypes';
import { TooltipDocumentation } from './types-component';

export const { types: TypesTooltip } = createMultipleTypes(import.meta.url, TooltipDocumentation);
