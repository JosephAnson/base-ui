/* eslint-disable react/function-component-definition */
import * as React from 'react';
import type { TemplateResult } from 'lit';
import type { SeparatorRootProps } from '@base-ui/lit/separator';
import type { ComponentRenderFn, HTMLProps } from '@base-ui/lit/types';

export interface SeparatorProps extends SeparatorRootProps {
  /**
   * Allows you to replace the component's HTML element with a different tag,
   * or compose it with a template that has a single root element.
   * Accepts a `TemplateResult` or a function that returns the template to render.
   */
  render?: TemplateResult | ComponentRenderFn<HTMLProps, { orientation: 'horizontal' | 'vertical' }> | undefined;
}

export const Separator: React.FC<SeparatorProps> = () => null;
