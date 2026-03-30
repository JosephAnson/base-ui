/* eslint-disable react/function-component-definition */
import * as React from 'react';

export type Side = 'top' | 'right' | 'bottom' | 'left';
export type Align = 'start' | 'center' | 'end';
export type TransitionStatus = 'starting' | 'ending' | undefined;

export type RootChangeEventReason =
  | 'trigger-hover'
  | 'trigger-focus'
  | 'trigger-press'
  | 'disabled'
  | 'imperative-action'
  | 'escape-key'
  | 'none';

export interface RootChangeEventDetails {
  reason: RootChangeEventReason;
  event: Event;
  trigger: Element | undefined;
  cancel(): void;
  allowPropagation(): void;
  isCanceled: boolean;
  isPropagationAllowed: boolean;
}

export interface RootActions {
  close(): void;
  unmount(): void;
}

export interface RootApiProps<Payload = unknown> {
  defaultOpen?: boolean | undefined;
  open?: boolean | undefined;
  onOpenChange?: ((open: boolean, details: RootChangeEventDetails) => void) | undefined;
  onOpenChangeComplete?: ((open: boolean) => void) | undefined;
  handle?: Handle<Payload> | undefined;
  triggerId?: string | null | undefined;
  defaultTriggerId?: string | null | undefined;
  actionsRef?: { current: RootActions | null } | undefined;
  disabled?: boolean | undefined;
  disableHoverablePopup?: boolean | undefined;
  children?: unknown | ((arg: { payload: Payload | undefined }) => unknown) | undefined;
}

export interface ProviderApiProps {
  delay?: number | null | undefined;
  closeDelay?: number | null | undefined;
  timeout?: number | undefined;
  children?: unknown;
}

export interface TriggerState {
  open: boolean;
  disabled: boolean;
}

export interface TriggerApiProps<Payload = unknown> {
  closeOnClick?: boolean | undefined;
  handle?: Handle<Payload> | undefined;
  payload?: Payload | undefined;
  disabled?: boolean | undefined;
  delay?: number | null | undefined;
  closeDelay?: number | null | undefined;
  id?: string | undefined;
  children?: unknown;
}

export interface PortalApiProps {
  container?: HTMLElement | ShadowRoot | null | undefined;
  children?: unknown;
}

export interface PositionerState {
  open: boolean;
  side: Side;
  align: Align;
  anchorHidden: boolean;
}

export interface PositionerApiProps {
  side?: Side | undefined;
  sideOffset?: number | undefined;
  align?: Align | undefined;
  alignOffset?: number | undefined;
  collisionAvoidance?: 'flip' | 'shift' | 'none' | undefined;
  collisionPadding?: number | undefined;
  arrowPadding?: number | undefined;
  sticky?: boolean | undefined;
  disableAnchorTracking?: boolean | undefined;
  positionMethod?: 'absolute' | 'fixed' | undefined;
  children?: unknown;
}

export interface PopupState extends PositionerState {
  transitionStatus: TransitionStatus;
}

export interface PopupApiProps {
  children?: unknown;
}

export interface ArrowState extends PositionerState {
  uncentered: boolean;
}

export interface ArrowApiProps {
  children?: unknown;
}

export enum TriggerDataAttributes {
  popupOpen = 'data-popup-open',
  triggerDisabled = 'data-trigger-disabled',
}

export enum PositionerDataAttributes {
  open = 'data-open',
  closed = 'data-closed',
  anchorHidden = 'data-anchor-hidden',
  side = 'data-side',
  align = 'data-align',
}

export enum PopupDataAttributes {
  open = 'data-open',
  closed = 'data-closed',
  startingStyle = 'data-starting-style',
  endingStyle = 'data-ending-style',
}

export enum ArrowDataAttributes {
  open = 'data-open',
  side = 'data-side',
  align = 'data-align',
  uncentered = 'data-uncentered',
}

/**
 * Provides a shared delay for multiple tooltips.
 * Renders a `<tooltip-provider>` custom element.
 */
export const Provider: React.FC<ProviderApiProps> = () => null;

/**
 * Groups all parts of the tooltip.
 * Renders a `<tooltip-root>` custom element.
 */
export const Root: React.FC<RootApiProps> = () => null;

/**
 * An element to attach the tooltip to.
 * Renders a `<tooltip-trigger>` custom element.
 */
export const Trigger: React.FC<TriggerApiProps> = () => null;

/**
 * A portal element that moves the popup to a different part of the DOM.
 * By default, the portal element is appended to `<body>`.
 * Renders a `<tooltip-portal>` custom element.
 */
export const Portal: React.FC<PortalApiProps> = () => null;

/**
 * Positions the tooltip against the trigger.
 * Renders a `<tooltip-positioner>` custom element.
 */
export const Positioner: React.FC<PositionerApiProps> = () => null;

/**
 * A container for the tooltip contents.
 * Renders a `<tooltip-popup>` custom element.
 */
export const Popup: React.FC<PopupApiProps> = () => null;

/**
 * An arrow that points toward the trigger.
 * Renders a `<tooltip-arrow>` custom element.
 */
export const Arrow: React.FC<ArrowApiProps> = () => null;

/**
 * Creates a handle to connect a tooltip root with detached triggers.
 */
export function createHandle<Payload = unknown>(): Handle<Payload> {
  return null as never;
}

/**
 * Imperative handle shared between detached triggers and the tooltip root.
 */
export class Handle<Payload = unknown> {
  readonly isOpen!: boolean;
  activeTriggerId!: string | null;
  activePayload!: Payload | undefined;

  open(_triggerId?: string): void {}

  close(): void {}
}

export namespace Provider {
  export type Props = ProviderApiProps;
}

export namespace Root {
  export type Props<Payload = unknown> = RootApiProps<Payload>;
  export type Actions = RootActions;
  export type ChangeEventReason = RootChangeEventReason;
  export type ChangeEventDetails = RootChangeEventDetails;
}

export namespace Trigger {
  export type Props<Payload = unknown> = TriggerApiProps<Payload>;
  export type State = TriggerState;
  export type DataAttributes = TriggerDataAttributes;
}

export namespace Portal {
  export type Props = PortalApiProps;
}

export namespace Positioner {
  export type Props = PositionerApiProps;
  export type State = PositionerState;
  export type DataAttributes = PositionerDataAttributes;
}

export namespace Popup {
  export type Props = PopupApiProps;
  export type State = PopupState;
  export type DataAttributes = PopupDataAttributes;
}

export namespace Arrow {
  export type Props = ArrowApiProps;
  export type State = ArrowState;
  export type DataAttributes = ArrowDataAttributes;
}

export const TooltipDocumentation = {
  Provider,
  Root,
  Trigger,
  Portal,
  Positioner,
  Popup,
  Arrow,
  createHandle,
  Handle,
} as const;
