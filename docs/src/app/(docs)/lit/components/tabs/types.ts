import { createMultipleTypes } from 'docs/src/utils/createTypes';
import { Tabs } from './types-component';

export const { types: TypesTabs } = createMultipleTypes(import.meta.url, Tabs);
