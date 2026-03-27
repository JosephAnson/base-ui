/* eslint-disable react/function-component-definition */
import * as React from 'react';
import type { ComponentRenderFn, HTMLProps } from '@base-ui/lit/types';
import type { TemplateResult } from 'lit';

export interface ToggleState {
  /**
   * Whether the toggle is currently pressed.
   */
  pressed: boolean;
  /**
   * Whether the toggle should ignore user interaction.
   */
  disabled: boolean;
}

export interface ToggleApiProps {
  /**
   * A unique string that identifies the toggle when used
   * inside a toggle group.
   */
  value?: string | undefined;
  /**
   * Whether the toggle button is currently pressed.
   * This is the uncontrolled counterpart of `pressed`.
   * @default false
   */
  defaultPressed?: boolean | undefined;
  /**
   * Whether the toggle button is currently pressed.
   * This is the controlled counterpart of `defaultPressed`.
   */
  pressed?: boolean | undefined;
  /**
   * Callback fired when the pressed state is changed.
   */
  onPressedChange?:
    | ((pressed: boolean, eventDetails: ToggleChangeEventDetails) => void)
    | undefined;
  /**
   * Whether the rendered element should be treated as a native `<button>`.
   * Set to `false` when replacing the default element with a non-button via `render`.
   * @default true
   */
  nativeButton?: boolean | undefined;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Allows you to replace the component's HTML element
   * with a different tag, or compose it with a template that has a single root element.
   *
   * Accepts a `TemplateResult` or a function that returns the template to render.
   */
  render?: TemplateResult | ComponentRenderFn<HTMLProps, ToggleState> | undefined;
}

export interface ToggleChangeEventDetails {
  reason: 'none';
  event: Event;
  cancel: () => void;
  allowPropagation: () => void;
  readonly isCanceled: boolean;
  readonly isPropagationAllowed: boolean;
  trigger: Element | undefined;
}

export const Toggle: React.FC<ToggleApiProps> = () => null;
