/* eslint-disable react/function-component-definition */
import * as React from 'react';
import type { ComponentRenderFn, HTMLProps } from '@base-ui/lit/types';
import type { TemplateResult } from 'lit';

export type Orientation = 'horizontal' | 'vertical';
export type TransitionStatus = 'starting' | 'ending' | undefined;

export interface RootState<Value = any> {
  /**
   * The current value.
   */
  value: Value[];
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
  /**
   * The component orientation.
   */
  orientation: Orientation;
}

export interface ItemState<Value = any> extends RootState<Value> {
  /**
   * The item index.
   */
  index: number;
  /**
   * Whether the component is open.
   */
  open: boolean;
}

export interface HeaderState<Value = any> extends ItemState<Value> {}
export interface TriggerState<Value = any> extends ItemState<Value> {}
export interface PanelState<Value = any> extends ItemState<Value> {
  /**
   * The transition status of the component.
   */
  transitionStatus: TransitionStatus;
}

export type RootChangeEventReason = 'trigger-press' | 'none';
export type ItemChangeEventReason = 'trigger-press' | 'none';

export interface RootChangeEventDetails {
  /**
   * The reason for the event.
   */
  reason: RootChangeEventReason;
  /**
   * The native event associated with the change.
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
  trigger: Element | undefined;
}

export interface ItemChangeEventDetails extends RootChangeEventDetails {
  reason: ItemChangeEventReason;
}

export interface RootApiProps<Value = any> {
  /**
   * The uncontrolled value of the item(s) that should be initially expanded.
   */
  defaultValue?: Value[] | undefined;
  /**
   * The controlled value of the item(s) that should be expanded.
   */
  value?: Value[] | undefined;
  /**
   * Event handler called when an accordion item is expanded or collapsed.
   */
  onValueChange?: ((value: Value[], eventDetails: RootChangeEventDetails) => void) | undefined;
  /**
   * Allows the browser's built-in page search to find and expand the panel contents.
   * Overrides the `keepMounted` prop and uses `hidden="until-found"`
   * to hide the element without removing it from the DOM.
   * @default false
   */
  hiddenUntilFound?: boolean | undefined;
  /**
   * Whether to loop keyboard focus back to the first item
   * when the end of the list is reached while using the arrow keys.
   * @default true
   */
  loopFocus?: boolean | undefined;
  /**
   * Whether multiple items can be open at the same time.
   * @default false
   */
  multiple?: boolean | undefined;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * The visual orientation of the accordion.
   * @default 'vertical'
   */
  orientation?: Orientation | undefined;
  /**
   * Whether to keep the element in the DOM while the panel is closed.
   * This prop is ignored when `hiddenUntilFound` is used.
   * @default false
   */
  keepMounted?: boolean | undefined;
  /**
   * Allows you to replace the component's HTML element with a custom template.
   * Accepts a `TemplateResult` or a function that returns the template to render.
   */
  render?: TemplateResult | ComponentRenderFn<HTMLProps, RootState<Value>> | undefined;
}

export interface ItemApiProps<Value = any> {
  /**
   * A unique value that identifies this accordion item.
   */
  value?: Value | undefined;
  /**
   * Event handler called when the panel is opened or closed.
   */
  onOpenChange?: ((open: boolean, eventDetails: ItemChangeEventDetails) => void) | undefined;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Allows you to replace the component's HTML element with a custom template.
   * Accepts a `TemplateResult` or a function that returns the template to render.
   */
  render?: TemplateResult | ComponentRenderFn<HTMLProps, ItemState<Value>> | undefined;
}

export interface HeaderApiProps<Value = any> {
  /**
   * Allows you to replace the component's HTML element with a custom template.
   * Accepts a `TemplateResult` or a function that returns the template to render.
   */
  render?: TemplateResult | ComponentRenderFn<HTMLProps, HeaderState<Value>> | undefined;
}

export interface TriggerApiProps<Value = any> {
  /**
   * Whether the component renders a native `<button>` element when replacing it
   * via the `render` prop.
   * Set to `false` if the rendered element is not a button.
   * @default true
   */
  nativeButton?: boolean | undefined;
  /**
   * Allows you to replace the component's HTML element with a custom template.
   * Accepts a `TemplateResult` or a function that returns the template to render.
   */
  render?: TemplateResult | ComponentRenderFn<HTMLProps, TriggerState<Value>> | undefined;
}

export interface PanelApiProps<Value = any> {
  /**
   * Allows the browser's built-in page search to find and expand the panel contents.
   * Overrides the `keepMounted` prop and uses `hidden="until-found"`
   * to hide the element without removing it from the DOM.
   * @default false
   */
  hiddenUntilFound?: boolean | undefined;
  /**
   * Whether to keep the element in the DOM while the panel is hidden.
   * This prop is ignored when `hiddenUntilFound` is used.
   * @default false
   */
  keepMounted?: boolean | undefined;
  /**
   * Allows you to replace the component's HTML element with a custom template.
   * Accepts a `TemplateResult` or a function that returns the template to render.
   */
  render?: TemplateResult | ComponentRenderFn<HTMLProps, PanelState<Value>> | undefined;
}

export enum RootDataAttributes {
  orientation = 'data-orientation',
  disabled = 'data-disabled',
}

export enum ItemDataAttributes {
  open = 'data-open',
  disabled = 'data-disabled',
  index = 'data-index',
}

export enum HeaderDataAttributes {
  open = 'data-open',
  disabled = 'data-disabled',
  index = 'data-index',
}

export enum TriggerDataAttributes {
  panelOpen = 'data-panel-open',
  disabled = 'data-disabled',
}

export enum PanelDataAttributes {
  open = 'data-open',
  disabled = 'data-disabled',
  index = 'data-index',
  startingStyle = 'data-starting-style',
  endingStyle = 'data-ending-style',
}

export enum PanelCssVars {
  accordionPanelHeight = '--accordion-panel-height',
  accordionPanelWidth = '--accordion-panel-width',
}

/**
 * Groups all parts of the accordion.
 * Renders an `<accordion-root>` custom element.
 */
export const Root: React.FC<RootApiProps> = () => null;

/**
 * Groups an accordion header with the corresponding panel.
 * Renders an `<accordion-item>` custom element.
 */
export const Item: React.FC<ItemApiProps> = () => null;

/**
 * A heading that labels the corresponding panel.
 * Renders an `<accordion-header>` custom element.
 */
export const Header: React.FC<HeaderApiProps> = () => null;

/**
 * A button that opens and closes the corresponding panel.
 * Renders an `<accordion-trigger>` custom element.
 */
export const Trigger: React.FC<TriggerApiProps> = () => null;

/**
 * A collapsible panel with the accordion item contents.
 * Renders an `<accordion-panel>` custom element.
 */
export const Panel: React.FC<PanelApiProps> = () => null;

export namespace Root {
  export type Props<Value = any> = RootApiProps<Value>;
  export type State<Value = any> = RootState<Value>;
  export type ChangeEventReason = RootChangeEventReason;
  export type ChangeEventDetails = RootChangeEventDetails;
  export type DataAttributes = RootDataAttributes;
}

export namespace Item {
  export type Props<Value = any> = ItemApiProps<Value>;
  export type State<Value = any> = ItemState<Value>;
  export type ChangeEventReason = ItemChangeEventReason;
  export type ChangeEventDetails = ItemChangeEventDetails;
  export type DataAttributes = ItemDataAttributes;
}

export namespace Header {
  export type Props<Value = any> = HeaderApiProps<Value>;
  export type State<Value = any> = HeaderState<Value>;
  export type DataAttributes = HeaderDataAttributes;
}

export namespace Trigger {
  export type Props<Value = any> = TriggerApiProps<Value>;
  export type State<Value = any> = TriggerState<Value>;
  export type DataAttributes = TriggerDataAttributes;
}

export namespace Panel {
  export type Props<Value = any> = PanelApiProps<Value>;
  export type State<Value = any> = PanelState<Value>;
  export type DataAttributes = PanelDataAttributes;
  export type CssVars = PanelCssVars;
}

export const Accordion = {
  Root,
  Item,
  Header,
  Trigger,
  Panel,
} as const;
