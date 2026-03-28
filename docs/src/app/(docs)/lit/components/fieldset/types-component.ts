/* eslint-disable react/function-component-definition */
import * as React from 'react';
import type { TemplateResult } from 'lit';
import type { ComponentRenderFn, HTMLProps } from '@base-ui/lit/types';

export interface RootState {
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
}

export interface LegendState {
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
}

export interface RootApiProps {
  /**
   * Allows you to replace the component's HTML element with a different tag,
   * or compose it with a template that has a single root element.
   * Accepts a `TemplateResult` or a function that returns the template to render.
   */
  render?: TemplateResult | ComponentRenderFn<HTMLProps, RootState> | undefined;
}

export interface LegendApiProps {
  /**
   * Allows you to replace the component's HTML element with a different tag,
   * or compose it with a template that has a single root element.
   * Accepts a `TemplateResult` or a function that returns the template to render.
   */
  render?: TemplateResult | ComponentRenderFn<HTMLProps, LegendState> | undefined;
}

/**
 * Groups a shared legend with related controls.
 * Renders a `<fieldset-root>` custom element.
 */
export const Root: React.FC<RootApiProps> = () => null;

/**
 * An accessible label that is automatically associated with the fieldset.
 * Renders a `<fieldset-legend>` custom element.
 */
export const Legend: React.FC<LegendApiProps> = () => null;

export namespace Root {
  export type Props = RootApiProps;
  export type State = RootState;
}

export namespace Legend {
  export type Props = LegendApiProps;
  export type State = LegendState;
}

export const Fieldset = {
  Root,
  Legend,
} as const;
