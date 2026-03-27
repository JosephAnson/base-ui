/* eslint-disable react/function-component-definition */
import * as React from 'react';

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

export interface RootApiProps {}

export interface LegendApiProps {}

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
