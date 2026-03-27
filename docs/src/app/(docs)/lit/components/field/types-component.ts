/* eslint-disable react/function-component-definition */
import * as React from 'react';

export interface RootState {
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
  /**
   * Whether the field has been touched.
   */
  touched: boolean;
  /**
   * Whether the field value has changed from its initial value.
   */
  dirty: boolean;
  /**
   * Whether the field is valid.
   */
  valid: boolean | null;
  /**
   * Whether the field has a value.
   */
  filled: boolean;
  /**
   * Whether the field is focused.
   */
  focused: boolean;
}

export interface LabelState extends RootState {}
export interface ControlState extends RootState {}
export interface DescriptionState extends RootState {}
export interface ItemState extends RootState {}

export interface ErrorState extends RootState {
  /**
   * Whether the error is transitioning in or out.
   */
  transitionStatus: 'starting' | 'ending' | undefined;
}

export interface ValidityState {
  /**
   * The current validity state.
   */
  validity: {
    badInput: boolean;
    customError: boolean;
    patternMismatch: boolean;
    rangeOverflow: boolean;
    rangeUnderflow: boolean;
    stepMismatch: boolean;
    tooLong: boolean;
    tooShort: boolean;
    typeMismatch: boolean;
    valid: boolean | null;
    valueMissing: boolean;
  };
  /**
   * The first validation error.
   */
  error: string;
  /**
   * All validation errors.
   */
  errors: string[];
  /**
   * The current field value.
   */
  value: unknown;
  /**
   * The initial field value.
   */
  initialValue: unknown;
  /**
   * Whether the validity output is transitioning in or out.
   */
  transitionStatus: 'starting' | 'ending' | undefined;
}

export interface RootActions {
  validate: () => void;
}

export type ControlChangeEventReason = 'none';

export interface ControlChangeEventDetails {
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
  isCanceled: boolean;
  /**
   * Indicates whether the event is allowed to propagate.
   */
  isPropagationAllowed: boolean;
  /**
   * The element that triggered the event, if applicable.
   */
  trigger?: Element | undefined;
}

export type ValidationMode = 'onSubmit' | 'onBlur' | 'onChange';

export interface RootApiProps {
  /**
   * Identifies the field when a form is submitted.
   * Takes precedence over the generated control name.
   */
  name?: string | undefined;
  /**
   * A ref to imperative actions.
   * `validate`: validates the field when called.
   */
  actionsRef?: { current: RootActions | null } | undefined;
  /**
   * Whether the field's value has changed from its initial value.
   * Useful when the field state is controlled externally.
   */
  dirty?: boolean | undefined;
  /**
   * Whether the field has been touched.
   * Useful when the field state is controlled externally.
   */
  touched?: boolean | undefined;
  /**
   * Whether the component should ignore user interaction.
   * Takes precedence over `disabled` on the generated control.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Whether the field is invalid.
   * Useful when the field state is controlled externally.
   */
  invalid?: boolean | undefined;
  /**
   * A function for custom validation.
   * Return a string or array of strings when invalid, or `null` when valid.
   */
  validate?:
    | ((
        value: unknown,
        formValues: Record<string, unknown>,
      ) => string | string[] | Promise<string | string[] | null> | null)
    | undefined;
  /**
   * Determines when the field should be validated.
   * Takes precedence over the `validationMode` on `<form-root>`.
   * @default 'onSubmit'
   */
  validationMode?: ValidationMode | undefined;
  /**
   * How long to wait between validation callbacks when `validationMode="onChange"`.
   * Specified in milliseconds.
   * @default 0
   */
  validationDebounceTime?: number | undefined;
}

export interface LabelApiProps {}

export interface DescriptionApiProps {}

export interface ControlApiProps {
  /**
   * The default value of the generated input.
   */
  defaultValue?: string | number | readonly string[] | undefined;
  /**
   * Callback fired when the generated input value changes.
   */
  onValueChange?: ((value: string, eventDetails: ControlChangeEventDetails) => void) | undefined;
}

export interface ItemApiProps {
  /**
   * Whether the wrapped control should ignore user interaction.
   * The `disabled` prop on `<field-root>` takes precedence.
   * @default false
   */
  disabled?: boolean | undefined;
}

export type ErrorMatch = boolean | keyof ValidityState['validity'];

export interface ErrorApiProps {
  /**
   * Determines whether to show the error message according to the field's validity state.
   * Specifying `true` always shows the message and allows external code to control visibility.
   */
  match?: ErrorMatch | undefined;
}

export interface ValidityApiProps {
  /**
   * Render callback that receives the current validity state.
   */
  renderValidity?: ((state: ValidityState) => unknown) | undefined;
}

export enum RootDataAttributes {
  disabled = 'data-disabled',
  valid = 'data-valid',
  invalid = 'data-invalid',
  dirty = 'data-dirty',
  touched = 'data-touched',
  filled = 'data-filled',
  focused = 'data-focused',
}

export enum LabelDataAttributes {
  disabled = 'data-disabled',
  valid = 'data-valid',
  invalid = 'data-invalid',
  dirty = 'data-dirty',
  touched = 'data-touched',
  filled = 'data-filled',
  focused = 'data-focused',
}

export enum ControlDataAttributes {
  disabled = 'data-disabled',
  valid = 'data-valid',
  invalid = 'data-invalid',
  dirty = 'data-dirty',
  touched = 'data-touched',
  filled = 'data-filled',
  focused = 'data-focused',
}

export enum DescriptionDataAttributes {
  disabled = 'data-disabled',
  valid = 'data-valid',
  invalid = 'data-invalid',
  dirty = 'data-dirty',
  touched = 'data-touched',
  filled = 'data-filled',
  focused = 'data-focused',
}

export enum ItemDataAttributes {
  disabled = 'data-disabled',
  valid = 'data-valid',
  invalid = 'data-invalid',
  dirty = 'data-dirty',
  touched = 'data-touched',
  filled = 'data-filled',
  focused = 'data-focused',
}

export enum ErrorDataAttributes {
  disabled = 'data-disabled',
  valid = 'data-valid',
  invalid = 'data-invalid',
  dirty = 'data-dirty',
  touched = 'data-touched',
  filled = 'data-filled',
  focused = 'data-focused',
}

/**
 * Groups all parts of the field.
 * Renders a `<field-root>` custom element.
 */
export const Root: React.FC<RootApiProps> = () => null;

/**
 * An accessible label that is automatically associated with the field control.
 * Renders a `<field-label>` custom element.
 */
export const Label: React.FC<LabelApiProps> = () => null;

/**
 * The generated form control for the field.
 * Renders a `<field-control>` custom element with a native `<input>` inside.
 */
export const Control: React.FC<ControlApiProps> = () => null;

/**
 * Additional information about the field.
 * Renders a `<field-description>` custom element.
 */
export const Description: React.FC<DescriptionApiProps> = () => null;

/**
 * Groups individual items in a checkbox or radio field.
 * Renders a `<field-item>` custom element.
 */
export const Item: React.FC<ItemApiProps> = () => null;

/**
 * Displays the current validation or form error.
 * Renders a `<field-error>` custom element.
 */
export const Error: React.FC<ErrorApiProps> = () => null;

/**
 * Exposes the current validity state through a render callback.
 * Renders a `<field-validity>` custom element.
 */
export const Validity: React.FC<ValidityApiProps> = () => null;

export namespace Root {
  export type Props = RootApiProps;
  export type State = RootState;
  export type Actions = RootActions;
  export type DataAttributes = RootDataAttributes;
}

export namespace Label {
  export type Props = LabelApiProps;
  export type State = LabelState;
  export type DataAttributes = LabelDataAttributes;
}

export namespace Control {
  export type Props = ControlApiProps;
  export type State = ControlState;
  export type DataAttributes = ControlDataAttributes;
  export type ChangeEventReason = ControlChangeEventReason;
  export type ChangeEventDetails = ControlChangeEventDetails;
}

export namespace Description {
  export type Props = DescriptionApiProps;
  export type State = DescriptionState;
  export type DataAttributes = DescriptionDataAttributes;
}

export namespace Item {
  export type Props = ItemApiProps;
  export type State = ItemState;
  export type DataAttributes = ItemDataAttributes;
}

export namespace Error {
  export type Match = ErrorMatch;
  export type Props = ErrorApiProps;
  export type State = ErrorState;
  export type DataAttributes = ErrorDataAttributes;
}

export namespace Validity {
  export type Props = ValidityApiProps;
  export type State = ValidityState;
}

export const Field = {
  Root,
  Label,
  Control,
  Description,
  Item,
  Error,
  Validity,
} as const;
