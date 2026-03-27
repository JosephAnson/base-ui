/* eslint-disable react/function-component-definition */
import * as React from 'react';
import type { InputChangeEventDetails } from '@base-ui/lit/input';
import type { ComponentRenderFn, HTMLProps } from '@base-ui/lit/types';
import type { TemplateResult } from 'lit';

export interface InputState {
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

export interface InputApiProps {
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Callback fired when the `value` changes. Use when controlled.
   */
  onValueChange?: ((value: string, eventDetails: InputChangeEventDetails) => void) | undefined;
  /**
   * The default value of the input. Use when uncontrolled.
   */
  defaultValue?: string | number | readonly string[] | undefined;
  /**
   * The value of the input. Use when controlled.
   */
  value?: string | number | readonly string[] | undefined;
  /**
   * Allows you to replace the component's HTML element
   * with a different tag, or compose it with a template that has a single root element.
   *
   * Accepts a `TemplateResult` or a function that returns the template to render.
   */
  render?: TemplateResult | ComponentRenderFn<HTMLProps, InputState> | undefined;
}

export const Input: React.FC<InputApiProps> = () => null;
