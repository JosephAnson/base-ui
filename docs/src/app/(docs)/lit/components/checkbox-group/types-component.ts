/* eslint-disable react/function-component-definition */
import * as React from 'react';
import type { ComponentRenderFn, HTMLProps } from '@base-ui/lit/types';
import type { TemplateResult } from 'lit';

export interface CheckboxGroupState {
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
}

export interface CheckboxGroupChangeEventDetails {
  event: Event;
  cancel(): void;
  isCanceled: boolean;
  reason: 'none';
}

export enum CheckboxGroupDataAttributes {
  disabled = 'data-disabled',
}

export interface CheckboxGroupApiProps {
  /**
   * Controlled selected values.
   */
  value?: string[] | undefined;
  /**
   * Default selected values for uncontrolled mode.
   */
  defaultValue?: string[] | undefined;
  /**
   * All possible values of child checkboxes. Required for parent checkbox support.
   */
  allValues?: string[] | undefined;
  /**
   * Whether the group is disabled.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Callback fired when the selected values change.
   */
  onValueChange?:
    | ((value: string[], eventDetails: CheckboxGroupChangeEventDetails) => void)
    | undefined;
  /**
   * Allows you to replace the component's HTML element
   * with a different tag, or compose it with a template that has a single root element.
   *
   * Accepts a `TemplateResult` or a function that returns the template to render.
   */
  render?: TemplateResult | ComponentRenderFn<HTMLProps, CheckboxGroupState> | undefined;
}

/**
 * Provides a shared state to a series of checkboxes.
 * Renders a `<div>` element by default.
 */
export const CheckboxGroup: React.FC<CheckboxGroupApiProps> = () => null;

export namespace CheckboxGroup {
  export type Props = CheckboxGroupApiProps;
  export type State = CheckboxGroupState;
  export type ChangeEventDetails = CheckboxGroupChangeEventDetails;
  export type DataAttributes = CheckboxGroupDataAttributes;
}
