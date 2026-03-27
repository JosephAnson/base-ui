import { createMultipleTypes } from 'docs/src/utils/createTypes';
import { Avatar } from './types-component';

export const { types: TypesAvatar } = createMultipleTypes(import.meta.url, Avatar);
