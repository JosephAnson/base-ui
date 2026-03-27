/* eslint-disable react/function-component-definition */
import * as React from 'react';
import type { ComponentRenderFn, HTMLProps } from '@base-ui/lit/types';
import type { TemplateResult } from 'lit';

export interface RootState {
  /**
   * Whether the switch is currently active.
   */
  checked: boolean;
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
  /**
   * Whether the user should be unable to activate or deactivate the switch.
   */
  readOnly: boolean;
  /**
   * Whether the user must activate the switch before submitting a form.
   */
  required: boolean;
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

export interface ThumbState extends RootState {}

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

export type RootChangeEventReason = RootChangeEventDetails['reason'];

export interface RootApiProps {
  /**
   * The id of the switch element.
   */
  id?: string | undefined;
  /**
   * A ref to access the hidden `<input>` element.
   */
  inputRef?: React.Ref<HTMLInputElement> | undefined;
  /**
   * Whether the switch is currently active.
   * This is the controlled counterpart of `defaultChecked`.
   */
  checked?: boolean | undefined;
  /**
   * Whether the switch is initially active.
   * This is the uncontrolled counterpart of `checked`.
   * @default false
   */
  defaultChecked?: boolean | undefined;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Identifies the field when a form is submitted.
   */
  name?: string | undefined;
  /**
   * Identifies the form that owns the hidden input.
   * Useful when the switch is rendered outside the form.
   */
  form?: string | undefined;
  /**
   * Event handler called when the switch is activated or deactivated.
   */
  onCheckedChange?: ((checked: boolean, eventDetails: RootChangeEventDetails) => void) | undefined;
  /**
   * Whether the rendered element should be treated as a native `<button>`.
   * Set to `true` when replacing the default element with a native button via `render`.
   * @default false
   */
  nativeButton?: boolean | undefined;
  /**
   * Whether the user should be unable to activate or deactivate the switch.
   * @default false
   */
  readOnly?: boolean | undefined;
  /**
   * Whether the user must activate the switch before submitting a form.
   * @default false
   */
  required?: boolean | undefined;
  /**
   * The value submitted with the form when the switch is on.
   * By default, switch submits the "on" value, matching native checkbox behavior.
   */
  value?: string | undefined;
  /**
   * The value submitted with the form when the switch is off.
   * By default, unchecked switches do not submit any value, matching native checkbox behavior.
   */
  uncheckedValue?: string | undefined;
  /**
   * Allows you to replace the component's HTML element
   * with a different tag, or compose it with a template that has a single root element.
   *
   * Accepts a `TemplateResult` or a function that returns the template to render.
   */
  render?: TemplateResult | ComponentRenderFn<HTMLProps, RootState> | undefined;
}

export interface ThumbApiProps {
  /**
   * Allows you to replace the component's HTML element
   * with a different tag, or compose it with a template that has a single root element.
   *
   * Accepts a `TemplateResult` or a function that returns the template to render.
   */
  render?: TemplateResult | ComponentRenderFn<HTMLProps, ThumbState> | undefined;
}

export enum RootDataAttributes {
  /**
   * Present when the switch is checked.
   */
  checked = 'data-checked',
  /**
   * Present when the switch is not checked.
   */
  unchecked = 'data-unchecked',
  /**
   * Present when the switch is disabled.
   */
  disabled = 'data-disabled',
  /**
   * Present when the switch is readonly.
   */
  readonly = 'data-readonly',
  /**
   * Present when the switch is required.
   */
  required = 'data-required',
  /**
   * Present when the switch is in valid state (when wrapped in Field.Root).
   */
  valid = 'data-valid',
  /**
   * Present when the switch is in invalid state (when wrapped in Field.Root).
   */
  invalid = 'data-invalid',
  /**
   * Present when the switch has been touched (when wrapped in Field.Root).
   */
  touched = 'data-touched',
  /**
   * Present when the switch's value has changed (when wrapped in Field.Root).
   */
  dirty = 'data-dirty',
  /**
   * Present when the switch is active (when wrapped in Field.Root).
   */
  filled = 'data-filled',
  /**
   * Present when the switch is focused (when wrapped in Field.Root).
   */
  focused = 'data-focused',
}

export enum ThumbDataAttributes {
  /**
   * Present when the switch is checked.
   */
  checked = 'data-checked',
  /**
   * Present when the switch is not checked.
   */
  unchecked = 'data-unchecked',
  /**
   * Present when the switch is disabled.
   */
  disabled = 'data-disabled',
  /**
   * Present when the switch is readonly.
   */
  readonly = 'data-readonly',
  /**
   * Present when the switch is required.
   */
  required = 'data-required',
  /**
   * Present when the switch is in valid state (when wrapped in Field.Root).
   */
  valid = 'data-valid',
  /**
   * Present when the switch is in invalid state (when wrapped in Field.Root).
   */
  invalid = 'data-invalid',
  /**
   * Present when the switch has been touched (when wrapped in Field.Root).
   */
  touched = 'data-touched',
  /**
   * Present when the switch's value has changed (when wrapped in Field.Root).
   */
  dirty = 'data-dirty',
  /**
   * Present when the switch is active (when wrapped in Field.Root).
   */
  filled = 'data-filled',
  /**
   * Present when the switch is focused (when wrapped in Field.Root).
   */
  focused = 'data-focused',
}

/**
 * Represents the switch itself.
 * Renders a `<span>` element and a hidden `<input>` beside.
 */
export const Root: React.FC<RootApiProps> = () => null;
/**
 * The movable part of the switch that indicates whether the switch is on or off.
 * Renders a `<span>`.
 */
export const Thumb: React.FC<ThumbApiProps> = () => null;

export namespace Root {
  export type Props = RootApiProps;
  export type State = RootState;
  export type ChangeEventReason = RootChangeEventReason;
  export type ChangeEventDetails = RootChangeEventDetails;
  export type DataAttributes = RootDataAttributes;
}

export namespace Thumb {
  export type Props = ThumbApiProps;
  export type State = ThumbState;
  export type DataAttributes = ThumbDataAttributes;
}

export const Switch = {
  Root,
  Thumb,
} as const;
