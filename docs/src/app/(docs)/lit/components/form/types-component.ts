/* eslint-disable react/function-component-definition */
import * as React from 'react';
import type { TemplateResult } from 'lit';
import type { ComponentRenderFn, HTMLProps } from '@base-ui/lit/types';

export interface FormState {}

export type FormValues = Record<string, any>;

export interface FormActions {
  validate: (fieldName?: string) => void;
}

export interface FormSubmitEventDetails {
  /**
   * The reason for the event.
   */
  reason: 'none';
  /**
   * The native event associated with the custom event.
   */
  event: SubmitEvent;
}

export type FormSubmitEventReason = FormSubmitEventDetails['reason'];

export type FormValidationMode = 'onSubmit' | 'onBlur' | 'onChange';

export interface FormApiProps {
  /**
   * Validation errors returned externally, typically after submission.
   * Keys must match the `name` attribute on `<field-root>`.
   */
  errors?: Record<string, string | string[]> | undefined;
  /**
   * A ref to imperative actions.
   * `validate`: validates all fields when called.
   * Optionally pass a field name to validate a single field.
   */
  actionsRef?: { current: FormActions | null } | undefined;
  /**
   * Event handler called when the form is submitted.
   * `preventDefault()` is called on the native submit event when used.
   */
  onFormSubmit?:
    | ((formValues: FormValues, eventDetails: FormSubmitEventDetails) => void)
    | undefined;
  /**
   * Determines when the form should be validated.
   * The `validationMode` prop on `<field-root>` takes precedence over this.
   * @default 'onSubmit'
   */
  validationMode?: FormValidationMode | undefined;
  /**
   * Whether native HTML validation should be disabled on the nested form.
   * @default true
   */
  noValidate?: boolean | undefined;
  /**
   * Allows you to replace the component's HTML element with a different tag,
   * or compose it with a template that has a single root element.
   * Accepts a `TemplateResult` or a function that returns the template to render.
   */
  render?: TemplateResult | ComponentRenderFn<HTMLProps, FormState> | undefined;
}

/**
 * A native form element with consolidated error handling.
 * Enhances a nested `<form>` and renders a `<form-root>` custom element.
 */
export const Form: React.FC<FormApiProps> = () => null;

export namespace Form {
  export type Props = FormApiProps;
  export type State = FormState;
  export type Actions = FormActions;
  export type SubmitEventDetails = FormSubmitEventDetails;
  export type SubmitEventReason = FormSubmitEventReason;
  export type ValidationMode = FormValidationMode;
  export type Values = FormValues;
}
