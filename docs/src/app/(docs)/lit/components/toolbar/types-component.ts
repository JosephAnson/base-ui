/* eslint-disable react/function-component-definition */
import * as React from 'react';
import type { ComponentRenderFn, HTMLProps } from '@base-ui/lit/types';
import type { TemplateResult } from 'lit';

export type ToolbarOrientation = 'horizontal' | 'vertical';

export interface RootState {
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
  /**
   * The component orientation.
   */
  orientation: ToolbarOrientation;
}

export interface GroupState extends RootState {}

export interface ButtonState extends RootState {
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
  /**
   * Whether the component remains focusable when disabled.
   */
  focusable: boolean;
}

export interface LinkState {
  /**
   * The component orientation.
   */
  orientation: ToolbarOrientation;
}

export interface InputState extends RootState {
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
  /**
   * Whether the component remains focusable when disabled.
   */
  focusable: boolean;
}

export interface SeparatorState {
  /**
   * The orientation of the separator.
   */
  orientation: ToolbarOrientation;
}

export interface RootItemMetadata {
  focusableWhenDisabled: boolean;
}

export interface RootApiProps {
  /**
   * If `true`, using keyboard navigation wraps focus to the opposite end.
   * @default true
   */
  loopFocus?: boolean | undefined;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * The component orientation.
   * @default 'horizontal'
   */
  orientation?: ToolbarOrientation | undefined;
  /**
   * Allows you to replace the component's HTML element with a custom template.
   * Accepts a `TemplateResult` or a function that returns the template to render.
   */
  render?: TemplateResult | ComponentRenderFn<HTMLProps, RootState> | undefined;
}

export interface ButtonApiProps {
  /**
   * When `true`, the item remains focusable when disabled.
   * @default true
   */
  focusableWhenDisabled?: boolean | undefined;
  /**
   * Whether the component expects a native `<button>` when replacing it via `render`.
   * @default true
   */
  nativeButton?: boolean | undefined;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Allows you to replace the component's HTML element with a custom template.
   * Accepts a `TemplateResult` or a function that returns the template to render.
   */
  render?: TemplateResult | ComponentRenderFn<HTMLProps, ButtonState> | undefined;
}

export interface LinkApiProps {
  /**
   * Allows you to replace the component's HTML element with a custom template.
   * Accepts a `TemplateResult` or a function that returns the template to render.
   */
  render?: TemplateResult | ComponentRenderFn<HTMLProps, LinkState> | undefined;
}

export interface InputApiProps {
  /**
   * The initial value for uncontrolled usage.
   */
  defaultValue?: string | number | string[] | undefined;
  /**
   * When `true`, the item remains focusable when disabled.
   * @default true
   */
  focusableWhenDisabled?: boolean | undefined;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Allows you to replace the component's HTML element with a custom template.
   * Accepts a `TemplateResult` or a function that returns the template to render.
   */
  render?: TemplateResult | ComponentRenderFn<HTMLProps, InputState> | undefined;
}

export interface GroupApiProps {
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Allows you to replace the component's HTML element with a custom template.
   * Accepts a `TemplateResult` or a function that returns the template to render.
   */
  render?: TemplateResult | ComponentRenderFn<HTMLProps, GroupState> | undefined;
}

export interface SeparatorApiProps {
  /**
   * Allows you to replace the component's HTML element with a custom template.
   * Accepts a `TemplateResult` or a function that returns the template to render.
   */
  render?: TemplateResult | ComponentRenderFn<HTMLProps, SeparatorState> | undefined;
}

export enum RootDataAttributes {
  orientation = 'data-orientation',
  disabled = 'data-disabled',
}

export enum ButtonDataAttributes {
  orientation = 'data-orientation',
  disabled = 'data-disabled',
  focusable = 'data-focusable',
}

export enum LinkDataAttributes {
  orientation = 'data-orientation',
}

export enum InputDataAttributes {
  orientation = 'data-orientation',
  disabled = 'data-disabled',
  focusable = 'data-focusable',
}

export enum GroupDataAttributes {
  orientation = 'data-orientation',
  disabled = 'data-disabled',
}

export enum SeparatorDataAttributes {
  orientation = 'data-orientation',
}

/**
 * A container for grouping a set of controls, such as buttons, toggle groups, or menus.
 * Renders a `<toolbar-root>` custom element.
 */
export const Root: React.FC<RootApiProps> = () => null;

/**
 * A button that can be used as-is or as a trigger for other components.
 * Renders a `<toolbar-button>` custom element.
 */
export const Button: React.FC<ButtonApiProps> = () => null;

/**
 * A link component.
 * Renders a `<toolbar-link>` custom element.
 */
export const Link: React.FC<LinkApiProps> = () => null;

/**
 * A text input that integrates with Toolbar keyboard navigation.
 * Renders a `<toolbar-input>` custom element.
 */
export const Input: React.FC<InputApiProps> = () => null;

/**
 * Groups several toolbar items or toggles.
 * Renders a `<toolbar-group>` custom element.
 */
export const Group: React.FC<GroupApiProps> = () => null;

/**
 * A separator element accessible to screen readers.
 * Renders a `<toolbar-separator>` custom element.
 */
export const Separator: React.FC<SeparatorApiProps> = () => null;

export namespace Root {
  export type Props = RootApiProps;
  export type State = RootState;
  export type Orientation = ToolbarOrientation;
  export type ItemMetadata = RootItemMetadata;
  export type DataAttributes = RootDataAttributes;
}

export namespace Button {
  export type Props = ButtonApiProps;
  export type State = ButtonState;
  export type DataAttributes = ButtonDataAttributes;
}

export namespace Link {
  export type Props = LinkApiProps;
  export type State = LinkState;
  export type DataAttributes = LinkDataAttributes;
}

export namespace Input {
  export type Props = InputApiProps;
  export type State = InputState;
  export type DataAttributes = InputDataAttributes;
}

export namespace Group {
  export type Props = GroupApiProps;
  export type State = GroupState;
  export type DataAttributes = GroupDataAttributes;
}

export namespace Separator {
  export type Props = SeparatorApiProps;
  export type State = SeparatorState;
  export type DataAttributes = SeparatorDataAttributes;
}

export const Toolbar = {
  Root,
  Button,
  Link,
  Input,
  Group,
  Separator,
} as const;
