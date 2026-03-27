/* eslint-disable react/function-component-definition */
import * as React from 'react';

export interface RadioGroupState {
  /**
   * Whether the group is disabled.
   */
  disabled: boolean;
  /**
   * Whether the group value has changed from its initial value.
   */
  dirty: boolean;
  /**
   * Whether the group currently has a selected value.
   */
  filled: boolean;
  /**
   * Whether focus is currently within the group.
   */
  focused: boolean;
  /**
   * Whether the group is read-only.
   */
  readOnly: boolean;
  /**
   * Whether the group requires a selected value.
   */
  required: boolean;
  /**
   * Whether the group has been touched.
   */
  touched: boolean;
  /**
   * The field validity state.
   */
  valid: boolean | null;
}

export interface RootState {
  /**
   * Whether the radio is currently selected.
   */
  checked: boolean;
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
  /**
   * Whether the user should be unable to select the radio button.
   */
  readOnly: boolean;
  /**
   * Whether the user must choose a value before submitting a form.
   */
  required: boolean;
}

export interface IndicatorState extends RootState {}

export interface RadioGroupChangeEventDetails {
  /**
   * The reason for the event.
   */
  reason: 'none';
  /**
   * The native event associated with the custom event.
   */
  event: Event;
  /**
   * Cancels Base UI from handling the event.
   */
  cancel: () => void;
  /**
   * Allows the event to propagate in cases where Base UI will stop the propagation.
   */
  allowPropagation: () => void;
  /**
   * Indicates whether the event has been canceled.
   */
  readonly isCanceled: boolean;
  /**
   * Indicates whether the event is allowed to propagate.
   */
  readonly isPropagationAllowed: boolean;
  /**
   * The element that triggered the event, if applicable.
   */
  trigger: Element | undefined;
}

export interface RootChangeEventDetails {
  /**
   * The reason for the event.
   */
  reason: 'none';
  /**
   * The native event associated with the custom event.
   */
  event: Event;
  /**
   * Cancels Base UI from handling the event.
   */
  cancel: () => void;
  /**
   * Allows the event to propagate in cases where Base UI will stop the propagation.
   */
  allowPropagation: () => void;
  /**
   * Indicates whether the event has been canceled.
   */
  readonly isCanceled: boolean;
  /**
   * Indicates whether the event is allowed to propagate.
   */
  readonly isPropagationAllowed: boolean;
  /**
   * The element that triggered the event, if applicable.
   */
  trigger: Element | undefined;
}

export type RadioGroupChangeEventReason = RadioGroupChangeEventDetails['reason'];
export type RootChangeEventReason = RootChangeEventDetails['reason'];

export interface RadioGroupApiProps {
  /**
   * Controlled selected value.
   */
  value?: unknown | undefined;
  /**
   * Default selected value for uncontrolled mode.
   */
  defaultValue?: unknown | undefined;
  /**
   * Whether the group is disabled.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Whether the group is read-only.
   * @default false
   */
  readOnly?: boolean | undefined;
  /**
   * Whether the group is required.
   * @default false
   */
  required?: boolean | undefined;
  /**
   * Shared input name for form submission.
   */
  name?: string | undefined;
  /**
   * Callback fired when the selected value changes.
   */
  onValueChange?:
    | ((value: unknown, eventDetails: RadioGroupChangeEventDetails) => void)
    | undefined;
}

export interface RootApiProps {
  /**
   * The value that identifies this radio within a group.
   */
  value?: unknown | undefined;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Whether the user should be unable to select the radio button.
   * @default false
   */
  readOnly?: boolean | undefined;
  /**
   * Whether the user must choose a value before submitting a form.
   * @default false
   */
  required?: boolean | undefined;
  /**
   * The id of the radio element.
   */
  id?: string | undefined;
}

export interface IndicatorApiProps {
  /**
   * Whether the indicator should stay mounted when unchecked.
   * @default false
   */
  keepMounted?: boolean | undefined;
}

export enum RadioGroupDataAttributes {
  /**
   * Present when the radio group is disabled.
   */
  disabled = 'data-disabled',
  /**
   * Present when the radio group's value has changed from its initial value.
   */
  dirty = 'data-dirty',
  /**
   * Present when the radio group has a selected value.
   */
  filled = 'data-filled',
  /**
   * Present when focus is within the radio group.
   */
  focused = 'data-focused',
  /**
   * Present when the radio group is readonly.
   */
  readonly = 'data-readonly',
  /**
   * Present when the radio group is required.
   */
  required = 'data-required',
  /**
   * Present when the radio group has been touched.
   */
  touched = 'data-touched',
  /**
   * Present when the radio group is in valid state.
   */
  valid = 'data-valid',
  /**
   * Present when the radio group is in invalid state.
   */
  invalid = 'data-invalid',
}

export enum RootDataAttributes {
  /**
   * Present when the radio is checked.
   */
  checked = 'data-checked',
  /**
   * Present when the radio is not checked.
   */
  unchecked = 'data-unchecked',
  /**
   * Present when the radio is disabled.
   */
  disabled = 'data-disabled',
  /**
   * Present when the radio is readonly.
   */
  readonly = 'data-readonly',
  /**
   * Present when the radio is required.
   */
  required = 'data-required',
}

export enum IndicatorDataAttributes {
  /**
   * Present when the radio is checked.
   */
  checked = 'data-checked',
  /**
   * Present when the radio is not checked.
   */
  unchecked = 'data-unchecked',
  /**
   * Present when the radio is disabled.
   */
  disabled = 'data-disabled',
  /**
   * Present when the radio is readonly.
   */
  readonly = 'data-readonly',
  /**
   * Present when the radio is required.
   */
  required = 'data-required',
}

/**
 * Provides a shared state to a series of radio buttons.
 * Renders a `<radio-group>` custom element.
 */
export const RadioGroup: React.FC<RadioGroupApiProps> = () => null;

/**
 * Represents the radio button itself.
 * Renders a `<radio-root>` custom element with a hidden `<input>` inside.
 */
export const Root: React.FC<RootApiProps> = () => null;

/**
 * Indicates whether the radio button is selected.
 * Renders a `<radio-indicator>` custom element.
 */
export const Indicator: React.FC<IndicatorApiProps> = () => null;

export namespace RadioGroup {
  export type Props = RadioGroupApiProps;
  export type State = RadioGroupState;
  export type ChangeEventReason = RadioGroupChangeEventReason;
  export type ChangeEventDetails = RadioGroupChangeEventDetails;
  export type DataAttributes = RadioGroupDataAttributes;
}

export namespace Root {
  export type Props = RootApiProps;
  export type State = RootState;
  export type ChangeEventReason = RootChangeEventReason;
  export type ChangeEventDetails = RootChangeEventDetails;
  export type DataAttributes = RootDataAttributes;
}

export namespace Indicator {
  export type Props = IndicatorApiProps;
  export type State = IndicatorState;
  export type DataAttributes = IndicatorDataAttributes;
}

export const Radio = {
  Root,
  Indicator,
} as const;

export const RadioDocumentation = {
  RadioGroup,
  Root,
  Indicator,
} as const;
