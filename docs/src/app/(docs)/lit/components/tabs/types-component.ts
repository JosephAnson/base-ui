/* eslint-disable react/function-component-definition */
import * as React from 'react';
import type { TemplateResult } from 'lit';

export type TabsRootOrientation = 'horizontal' | 'vertical';
export type TabsTabActivationDirection = 'left' | 'right' | 'up' | 'down' | 'none';
export type TabsTabValue = string | number;

export interface TabsRootState {
  /**
   * The component orientation.
   */
  orientation: TabsRootOrientation;
  /**
   * The direction used for tab activation.
   */
  tabActivationDirection: TabsTabActivationDirection;
}

export interface TabsListState extends TabsRootState {}

export interface TabsTabState {
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
  /**
   * Whether the component is active.
   */
  active: boolean;
  /**
   * The component orientation.
   */
  orientation: TabsRootOrientation;
}

export interface TabsPanelState extends TabsRootState {
  /**
   * Whether the component is hidden.
   */
  hidden: boolean;
}

export interface TabsIndicatorState extends TabsRootState {}

export interface TabsRootChangeEventDetails {
  /**
   * The native event associated with the custom event.
   */
  event: Event;
  /**
   * Cancels Base UI from handling the event.
   */
  cancel(): void;
  /**
   * Indicates whether the event has been canceled.
   */
  isCanceled: boolean;
  /**
   * The reason for the event.
   */
  reason: 'none';
  /**
   * The direction used for the newly activated tab.
   */
  activationDirection: TabsTabActivationDirection;
}

export interface RootApiProps {
  /**
   * The default value. Use when the component is not controlled.
   * When the value is `null`, no Tab will be active.
   * @default 0
   */
  defaultValue?: TabsTabValue | undefined;
  /**
   * The value of the currently active `Tab`. Use when the component is controlled.
   * When the value is `null`, no Tab will be active.
   */
  value?: TabsTabValue | undefined;
  /**
   * Callback invoked when new value is being set.
   */
  onValueChange?:
    | ((value: TabsTabValue, eventDetails: TabsRootChangeEventDetails) => void)
    | undefined;
  /**
   * The component orientation (layout flow direction).
   * @default 'horizontal'
   */
  orientation?: TabsRootOrientation | undefined;
}

export interface ListApiProps {
  /**
   * Whether to automatically change the active tab on arrow key focus.
   * Otherwise, tabs will be activated using Enter or Space key press.
   * @default false
   */
  activateOnFocus?: boolean | undefined;
  /**
   * Whether to loop keyboard focus back to the first item when the end of the list is reached.
   * @default true
   */
  loopFocus?: boolean | undefined;
}

export interface TabApiProps {
  /**
   * The value of the Tab.
   */
  value: TabsTabValue;
  /**
   * Allows you to replace the tab's rendered element with a custom template.
   * Accepts a `TemplateResult` or a function that returns the template to render.
   */
  render?:
    | TemplateResult
    | ((props: Record<string, unknown>, state: TabsTabState) => TemplateResult)
    | undefined;
  /**
   * Whether the Tab is disabled.
   * If a first Tab on a `<Tabs.List>` is disabled, it won't initially be selected.
   * Instead, the next enabled Tab will be selected.
   */
  disabled?: boolean | undefined;
}

export interface PanelApiProps {
  /**
   * The value of the TabPanel. It will be shown when the Tab with the corresponding value is active.
   */
  value: TabsTabValue;
  /**
   * Whether to keep the HTML element in the DOM while the panel is hidden.
   * @default false
   */
  keepMounted?: boolean | undefined;
}

export interface IndicatorApiProps {}

export enum RootDataAttributes {
  /** Indicates the orientation of the tabs. */
  orientation = 'data-orientation',
  /** Indicates the direction of the activation based on the previous active tab. */
  activationDirection = 'data-activation-direction',
}

export enum ListDataAttributes {
  /** Indicates the orientation of the tabs. */
  orientation = 'data-orientation',
  /** Indicates the direction of the activation based on the previous active tab. */
  activationDirection = 'data-activation-direction',
}

export enum TabDataAttributes {
  /** Present when the tab is active. */
  active = 'data-active',
  /** Present when the tab is disabled. */
  disabled = 'data-disabled',
  /** Indicates the orientation of the tabs. */
  orientation = 'data-orientation',
  /** Indicates the direction of the activation based on the previous active tab. */
  activationDirection = 'data-activation-direction',
}

export enum PanelDataAttributes {
  /** Present when the panel is hidden. */
  hidden = 'data-hidden',
  /** Indicates the orientation of the tabs. */
  orientation = 'data-orientation',
}

export enum IndicatorDataAttributes {
  /** Indicates the orientation of the tabs. */
  orientation = 'data-orientation',
  /** Indicates the direction of the activation based on the previous active tab. */
  activationDirection = 'data-activation-direction',
}

export enum IndicatorCssVariables {
  /** Indicates the distance on the bottom side from the parent's container if the tab is active. */
  activeTabBottom = '--active-tab-bottom',
  /** Indicates the height of the tab if it is active. */
  activeTabHeight = '--active-tab-height',
  /** Indicates the distance on the left side from the parent's container if the tab is active. */
  activeTabLeft = '--active-tab-left',
  /** Indicates the distance on the right side from the parent's container if the tab is active. */
  activeTabRight = '--active-tab-right',
  /** Indicates the distance on the top side from the parent's container if the tab is active. */
  activeTabTop = '--active-tab-top',
  /** Indicates the width of the tab if it is active. */
  activeTabWidth = '--active-tab-width',
}

/**
 * Groups the tabs and the corresponding panels.
 * Renders a `<div>` element.
 */
export const Root: React.FC<RootApiProps> = () => null;

/**
 * Groups the individual tab buttons.
 * Renders a `<div>` element.
 */
export const List: React.FC<ListApiProps> = () => null;

/**
 * An individual interactive tab button that toggles the corresponding panel.
 * Renders a `<button>` element.
 */
export const Tab: React.FC<TabApiProps> = () => null;

/**
 * A visual indicator that can be styled to match the position of the currently active tab.
 * Renders a `<span>` element.
 */
export const Indicator: React.FC<IndicatorApiProps> = () => null;

/**
 * A panel displayed when the corresponding tab is active.
 * Renders a `<div>` element.
 */
export const Panel: React.FC<PanelApiProps> = () => null;

export namespace Root {
  export type State = TabsRootState;
  export type Props = RootApiProps;
  export type DataAttributes = RootDataAttributes;
  export type Orientation = TabsRootOrientation;
  export type ChangeEventDetails = TabsRootChangeEventDetails;
}

export namespace List {
  export type State = TabsListState;
  export type Props = ListApiProps;
  export type DataAttributes = ListDataAttributes;
}

export namespace Tab {
  export type Value = TabsTabValue;
  export type ActivationDirection = TabsTabActivationDirection;
  export type State = TabsTabState;
  export type Props = TabApiProps;
  export type DataAttributes = TabDataAttributes;
}

export namespace Indicator {
  export type State = TabsIndicatorState;
  export type Props = IndicatorApiProps;
  export type DataAttributes = IndicatorDataAttributes;
  export type CssVariables = IndicatorCssVariables;
}

export namespace Panel {
  export type State = TabsPanelState;
  export type Props = PanelApiProps;
  export type DataAttributes = PanelDataAttributes;
}

export const Tabs = {
  Root,
  List,
  Tab,
  Indicator,
  Panel,
} as const;
