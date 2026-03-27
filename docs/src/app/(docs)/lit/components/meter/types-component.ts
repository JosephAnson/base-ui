/* eslint-disable react/function-component-definition */
import * as React from 'react';

export interface RootState {}
export interface TrackState extends RootState {}
export interface IndicatorState extends RootState {}
export interface ValueState extends RootState {}
export interface LabelState extends RootState {}

export interface RootApiProps {
  /**
   * A string value that provides a user-friendly name for `aria-valuenow`, the current value of the meter.
   */
  'aria-valuetext'?: string | undefined;
  /**
   * Options to format the value.
   */
  format?: Intl.NumberFormatOptions | undefined;
  /**
   * A function that returns a string value that provides a human-readable text alternative for `aria-valuenow`, the current value of the meter.
   */
  getAriaValueText?: ((formattedValue: string, value: number) => string) | undefined;
  /**
   * The locale used by `Intl.NumberFormat` when formatting the value.
   * Defaults to the user's runtime locale.
   */
  locale?: Intl.LocalesArgument | undefined;
  /**
   * The maximum value
   * @default 100
   */
  max?: number | undefined;
  /**
   * The minimum value
   * @default 0
   */
  min?: number | undefined;
  /**
   * The current value.
   * @default 0
   */
  value?: number | undefined;
}

export interface TrackApiProps {}

export interface IndicatorApiProps {}

export interface ValueApiProps {
  /**
   * Custom render function for the displayed value.
   */
  renderValue?: ((formattedValue: string, value: number) => string) | undefined;
}

export interface LabelApiProps {}

/**
 * Groups all parts of the meter and provides the value for screen readers.
 * Renders a `<meter-root>` custom element.
 */
export const Root: React.FC<RootApiProps> = () => null;

/**
 * Contains the meter indicator and represents the entire range of the meter.
 * Renders a `<meter-track>` custom element.
 */
export const Track: React.FC<TrackApiProps> = () => null;

/**
 * Visualizes the position of the value along the range.
 * Renders a `<meter-indicator>` custom element.
 */
export const Indicator: React.FC<IndicatorApiProps> = () => null;

/**
 * A text element displaying the current value.
 * Renders a `<meter-value>` custom element.
 */
export const Value: React.FC<ValueApiProps> = () => null;

/**
 * An accessible label for the meter.
 * Renders a `<meter-label>` custom element.
 */
export const Label: React.FC<LabelApiProps> = () => null;

export namespace Root {
  export type Props = RootApiProps;
  export type State = RootState;
}

export namespace Track {
  export type Props = TrackApiProps;
  export type State = TrackState;
}

export namespace Indicator {
  export type Props = IndicatorApiProps;
  export type State = IndicatorState;
}

export namespace Value {
  export type Props = ValueApiProps;
  export type State = ValueState;
}

export namespace Label {
  export type Props = LabelApiProps;
  export type State = LabelState;
}

export const Meter = {
  Root,
  Track,
  Indicator,
  Value,
  Label,
} as const;
