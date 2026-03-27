/* eslint-disable react/function-component-definition */
import * as React from 'react';

export type ProgressStatus = 'indeterminate' | 'progressing' | 'complete';

export interface RootState {
  /**
   * The current status.
   */
  status: ProgressStatus;
}

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
   * Accepts a function which returns a string value that provides a human-readable text alternative for the current value of the progress bar.
   */
  getAriaValueText?: ((formattedValue: string | null, value: number | null) => string) | undefined;
  /**
   * The locale used by `Intl.NumberFormat` when formatting the value.
   * Defaults to the user's runtime locale.
   */
  locale?: Intl.LocalesArgument | undefined;
  /**
   * The maximum value.
   * @default 100
   */
  max?: number | undefined;
  /**
   * The minimum value.
   * @default 0
   */
  min?: number | undefined;
  /**
   * The current value. The component is indeterminate when value is `null`.
   * @default null
   */
  value?: number | null | undefined;
}

export interface TrackApiProps {}

export interface IndicatorApiProps {}

export interface ValueApiProps {
  /**
   * Custom render function for the displayed value.
   */
  renderValue?: ((formattedValue: string | null, value: number | null) => string) | undefined;
}

export interface LabelApiProps {}

export enum RootDataAttributes {
  /**
   * Present when the progress has completed.
   */
  complete = 'data-complete',
  /**
   * Present when the progress is in indeterminate state.
   */
  indeterminate = 'data-indeterminate',
  /**
   * Present while the progress is progressing.
   */
  progressing = 'data-progressing',
}

export enum TrackDataAttributes {
  /**
   * Present when the progress has completed.
   */
  complete = 'data-complete',
  /**
   * Present when the progress is in indeterminate state.
   */
  indeterminate = 'data-indeterminate',
  /**
   * Present while the progress is progressing.
   */
  progressing = 'data-progressing',
}

export enum IndicatorDataAttributes {
  /**
   * Present when the progress has completed.
   */
  complete = 'data-complete',
  /**
   * Present when the progress is in indeterminate state.
   */
  indeterminate = 'data-indeterminate',
  /**
   * Present while the progress is progressing.
   */
  progressing = 'data-progressing',
}

export enum ValueDataAttributes {
  /**
   * Present when the progress has completed.
   */
  complete = 'data-complete',
  /**
   * Present when the progress is in indeterminate state.
   */
  indeterminate = 'data-indeterminate',
  /**
   * Present while the progress is progressing.
   */
  progressing = 'data-progressing',
}

export enum LabelDataAttributes {
  /**
   * Present when the progress has completed.
   */
  complete = 'data-complete',
  /**
   * Present when the progress is in indeterminate state.
   */
  indeterminate = 'data-indeterminate',
  /**
   * Present while the progress is progressing.
   */
  progressing = 'data-progressing',
}

/**
 * Groups all parts of the progress bar and provides the task completion status to screen readers.
 * Renders a `<progress-root>` custom element.
 */
export const Root: React.FC<RootApiProps> = () => null;

/**
 * Contains the progress bar indicator.
 * Renders a `<progress-track>` custom element.
 */
export const Track: React.FC<TrackApiProps> = () => null;

/**
 * Visualizes the completion status of the task.
 * Renders a `<progress-indicator>` custom element.
 */
export const Indicator: React.FC<IndicatorApiProps> = () => null;

/**
 * A text label displaying the current value.
 * Renders a `<progress-value>` custom element.
 */
export const Value: React.FC<ValueApiProps> = () => null;

/**
 * An accessible label for the progress bar.
 * Renders a `<progress-label>` custom element.
 */
export const Label: React.FC<LabelApiProps> = () => null;

export namespace Root {
  export type Props = RootApiProps;
  export type State = RootState;
  export type DataAttributes = RootDataAttributes;
}

export namespace Track {
  export type Props = TrackApiProps;
  export type State = TrackState;
  export type DataAttributes = TrackDataAttributes;
}

export namespace Indicator {
  export type Props = IndicatorApiProps;
  export type State = IndicatorState;
  export type DataAttributes = IndicatorDataAttributes;
}

export namespace Value {
  export type Props = ValueApiProps;
  export type State = ValueState;
  export type DataAttributes = ValueDataAttributes;
}

export namespace Label {
  export type Props = LabelApiProps;
  export type State = LabelState;
  export type DataAttributes = LabelDataAttributes;
}

export const Progress = {
  Root,
  Track,
  Indicator,
  Value,
  Label,
} as const;
