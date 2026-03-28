/* eslint-disable react/function-component-definition */
import * as React from 'react';
import type { ComponentRenderFn, HTMLProps } from '@base-ui/lit/types';
import type { TemplateResult } from 'lit';

export interface RootState {
  /**
   * Whether the checkbox is currently checked.
   */
  checked: boolean;
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
  /**
   * Whether the checkbox is in an indeterminate state.
   */
  indeterminate: boolean;
  /**
   * Whether the user should be unable to check or uncheck the checkbox.
   */
  readOnly: boolean;
  /**
   * Whether the user must check the checkbox before submitting a form.
   */
  required: boolean;
}

export interface IndicatorState extends RootState {}

export interface RootApiProps {
  /**
   * Whether the checkbox is currently checked.
   */
  checked?: boolean | undefined;
  /**
   * The uncontrolled checked state when initially rendered.
   * @default false
   */
  defaultChecked?: boolean | undefined;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Associates the hidden input with an external form element.
   */
  form?: string | undefined;
  /**
   * The id of the checkbox element.
   */
  id?: string | undefined;
  /**
   * Whether the checkbox is in an indeterminate state.
   * @default false
   */
  indeterminate?: boolean | undefined;
  /**
   * A ref to access the hidden input element.
   */
  inputRef?: React.Ref<HTMLInputElement> | undefined;
  /**
   * Shared form field name for form submission.
   */
  name?: string | undefined;
  /**
   * Whether the rendered element should be treated as a native `<button>`.
   * Set to `true` when replacing the default element with a native button via `render`.
   * @default false
   */
  nativeButton?: boolean | undefined;
  /**
   * Callback fired when the checked state changes.
   */
  onCheckedChange?: ((checked: boolean, eventDetails: CheckboxRootChangeEventDetails) => void) | undefined;
  /**
   * Whether this checkbox acts as a parent "select all" checkbox inside a group.
   * @default false
   */
  parent?: boolean | undefined;
  /**
   * Whether the user should be unable to check or uncheck the checkbox.
   * @default false
   */
  readOnly?: boolean | undefined;
  /**
   * Allows you to replace the component's HTML element
   * with a different tag, or compose it with a template that has a single root element.
   *
   * Accepts a `TemplateResult` or a function that returns the template to render.
   */
  render?: TemplateResult | ComponentRenderFn<HTMLProps, RootState> | undefined;
  /**
   * Whether the user must check the checkbox before submitting a form.
   * @default false
   */
  required?: boolean | undefined;
  /**
   * The unchecked form value.
   */
  uncheckedValue?: string | undefined;
  /**
   * The checked form value.
   * @default 'on'
   */
  value?: string | undefined;
}

export interface IndicatorApiProps {
  /**
   * Whether the indicator should stay mounted when unchecked.
   * @default false
   */
  keepMounted?: boolean | undefined;
  /**
   * Allows you to replace the component's HTML element
   * with a different tag, or compose it with a template that has a single root element.
   *
   * Accepts a `TemplateResult` or a function that returns the template to render.
   */
  render?: TemplateResult | ComponentRenderFn<HTMLProps, IndicatorState> | undefined;
}

export interface CheckboxRootChangeEventDetails {
  event: Event;
  cancel(): void;
  isCanceled: boolean;
  reason: 'none';
}

export enum RootDataAttributes {
  checked = 'data-checked',
  unchecked = 'data-unchecked',
  indeterminate = 'data-indeterminate',
  disabled = 'data-disabled',
  readonly = 'data-readonly',
  required = 'data-required',
}

export enum IndicatorDataAttributes {
  checked = 'data-checked',
  unchecked = 'data-unchecked',
  indeterminate = 'data-indeterminate',
  disabled = 'data-disabled',
  readonly = 'data-readonly',
  required = 'data-required',
}

/**
 * Represents the checkbox itself.
 * Renders a `<span>` element and a hidden `<input>` beside by default.
 */
export const Root: React.FC<RootApiProps> = () => null;

/**
 * Indicates whether the checkbox is checked.
 * Renders a `<span>` element by default.
 */
export const Indicator: React.FC<IndicatorApiProps> = () => null;

export namespace Root {
  export type Props = RootApiProps;
  export type State = RootState;
  export type DataAttributes = RootDataAttributes;
  export type ChangeEventDetails = CheckboxRootChangeEventDetails;
}

export namespace Indicator {
  export type Props = IndicatorApiProps;
  export type State = IndicatorState;
  export type DataAttributes = IndicatorDataAttributes;
}

export const Checkbox = {
  Root,
  Indicator,
} as const;
