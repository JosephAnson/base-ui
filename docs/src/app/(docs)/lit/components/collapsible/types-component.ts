/* eslint-disable react/function-component-definition */
import * as React from 'react';

export type TransitionStatus = 'starting' | 'ending' | undefined;

export interface RootState {
  /**
   * Whether the collapsible panel is currently open.
   */
  open: boolean;
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
}

export interface TriggerState extends RootState {}

export interface PanelState extends RootState {
  /**
   * The transition status of the component.
   */
  transitionStatus: TransitionStatus;
}

export type RootChangeEventReason = 'trigger-press' | 'none';

export interface RootChangeEventDetails {
  /**
   * The reason for the event.
   */
  reason: RootChangeEventReason;
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
}

export interface RootApiProps {
  /**
   * Whether the collapsible panel is currently open.
   *
   * To render an uncontrolled collapsible, use the `defaultOpen` prop instead.
   */
  open?: boolean | undefined;
  /**
   * Whether the collapsible panel is initially open.
   *
   * To render a controlled collapsible, use the `open` prop instead.
   * @default false
   */
  defaultOpen?: boolean | undefined;
  /**
   * Event handler called when the panel is opened or closed.
   */
  onOpenChange?: ((open: boolean, eventDetails: RootChangeEventDetails) => void) | undefined;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
}

export interface TriggerApiProps {}

export interface PanelApiProps {
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
}

export enum TriggerDataAttributes {
  /**
   * Present when the collapsible panel is open.
   */
  panelOpen = 'data-panel-open',
}

export enum PanelDataAttributes {
  /**
   * Present when the collapsible panel is open.
   */
  open = 'data-open',
  /**
   * Present when the collapsible panel is closed.
   */
  closed = 'data-closed',
  /**
   * Present when the panel is animating in.
   */
  startingStyle = 'data-starting-style',
  /**
   * Present when the panel is animating out.
   */
  endingStyle = 'data-ending-style',
}

export enum PanelCssVars {
  /**
   * The collapsible panel's height.
   */
  collapsiblePanelHeight = '--collapsible-panel-height',
  /**
   * The collapsible panel's width.
   */
  collapsiblePanelWidth = '--collapsible-panel-width',
}

/**
 * Groups all parts of the collapsible.
 * Renders a `<collapsible-root>` custom element.
 */
export const Root: React.FC<RootApiProps> = () => null;

/**
 * A button that opens and closes the collapsible panel.
 * Renders a `<collapsible-trigger>` custom element.
 */
export const Trigger: React.FC<TriggerApiProps> = () => null;

/**
 * A panel with the collapsible contents.
 * Renders a `<collapsible-panel>` custom element.
 */
export const Panel: React.FC<PanelApiProps> = () => null;

export namespace Root {
  export type Props = RootApiProps;
  export type State = RootState;
  export type ChangeEventReason = RootChangeEventReason;
  export type ChangeEventDetails = RootChangeEventDetails;
}

export namespace Trigger {
  export type Props = TriggerApiProps;
  export type State = TriggerState;
  export type DataAttributes = TriggerDataAttributes;
}

export namespace Panel {
  export type Props = PanelApiProps;
  export type State = PanelState;
  export type DataAttributes = PanelDataAttributes;
  export type CssVars = PanelCssVars;
}

export const Collapsible = {
  Root,
  Trigger,
  Panel,
} as const;
