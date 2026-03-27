/* eslint-disable react/function-component-definition */
import * as React from 'react';
import type { ComponentRenderFn, HTMLProps } from '@base-ui/lit/types';
import type { TemplateResult } from 'lit';

export interface ButtonState {
  /**
   * Whether the button should ignore user interaction.
   */
  disabled: boolean;
}

export interface ButtonApiProps {
  /**
   * Whether the button should be focusable when disabled.
   * @default false
   */
  focusableWhenDisabled?: boolean | undefined;
  /**
   * Whether the rendered element should be treated as a native `<button>`.
   * Set to `false` when replacing the default element with a non-button via `render`.
   * @default true
   */
  nativeButton?: boolean | undefined;
  /**
   * Allows you to replace the component's HTML element
   * with a different tag, or compose it with a template that has a single root element.
   *
   * Accepts a `TemplateResult` or a function that returns the template to render.
   */
  render?: TemplateResult | ComponentRenderFn<HTMLProps, ButtonState> | undefined;
}

export const Button: React.FC<ButtonApiProps> = () => null;
