/* eslint-disable react/function-component-definition */
import * as React from 'react';
import type { TemplateResult } from 'lit';

export type Side = 'top' | 'right' | 'bottom' | 'left';
export type Align = 'start' | 'center' | 'end';
export type TransitionStatus = 'starting' | 'ending' | undefined;

export type RootChangeEventReason =
  | 'trigger-hover'
  | 'trigger-focus'
  | 'trigger-press'
  | 'outside-press'
  | 'escape-key'
  | 'close-press'
  | 'focus-out'
  | 'imperative-action'
  | 'none';

export interface RootChangeEventDetails {
  reason: RootChangeEventReason;
  event: Event;
  cancel(): void;
  allowPropagation(): void;
  isCanceled: boolean;
  isPropagationAllowed: boolean;
  trigger: Element | undefined;
}

export interface RootActions {
  close(): void;
  unmount(): void;
}

export interface TriggerState {
  disabled: boolean;
  open: boolean;
}

export interface PortalState {
  open: boolean;
}

export interface BackdropState extends PortalState {}

export interface PositionerState extends PortalState {
  side: Side;
  align: Align;
  anchorHidden: boolean;
}

export interface PopupState extends PositionerState {
  transitionStatus: TransitionStatus;
  modal: boolean;
}

export interface ArrowState extends PositionerState {
  uncentered: boolean;
}

export interface CloseState {
  disabled: boolean;
}

export interface ViewportState {
  activationDirection: string | undefined;
  transitioning: boolean;
  instant: 'dismiss' | 'click' | undefined;
}

export interface RootApiProps {
  defaultOpen?: boolean | undefined;
  open?: boolean | undefined;
  onOpenChange?: ((open: boolean, details: RootChangeEventDetails) => void) | undefined;
  onOpenChangeComplete?: ((open: boolean) => void) | undefined;
  actionsRef?: { current: RootActions | null } | undefined;
  modal?: boolean | undefined;
  disablePointerDismissal?: boolean | undefined;
  handle?: Handle | undefined;
  triggerId?: string | null | undefined;
  defaultTriggerId?: string | null | undefined;
}

export interface TriggerApiProps {
  disabled?: boolean | undefined;
  nativeButton?: boolean | undefined;
  openOnHover?: boolean | undefined;
  delay?: number | undefined;
  closeDelay?: number | undefined;
  handle?: Handle | undefined;
  payload?: unknown;
  id?: string | undefined;
  render?:
    | TemplateResult
    | ((props: Record<string, unknown>, state: TriggerState) => TemplateResult)
    | undefined;
}

export interface PortalApiProps {
  container?: HTMLElement | ShadowRoot | null | undefined;
  render?:
    | TemplateResult
    | ((props: Record<string, unknown>, state: PortalState) => TemplateResult)
    | undefined;
}

export interface BackdropApiProps {
  render?:
    | TemplateResult
    | ((props: Record<string, unknown>, state: BackdropState) => TemplateResult)
    | undefined;
}

export interface PositionerApiProps {
  side?: Side | undefined;
  sideOffset?: number | undefined;
  align?: Align | undefined;
  alignOffset?: number | undefined;
  collisionAvoidance?: 'flip' | 'shift' | 'none' | undefined;
  collisionBoundary?: 'clipping-ancestors' | Element | readonly Element[] | null | undefined;
  collisionPadding?: number | undefined;
  arrowPadding?: number | undefined;
  sticky?: boolean | undefined;
  disableAnchorTracking?: boolean | undefined;
  positionMethod?: 'absolute' | 'fixed' | undefined;
  anchor?: Element | undefined;
  render?:
    | TemplateResult
    | ((props: Record<string, unknown>, state: PositionerState) => TemplateResult)
    | undefined;
}

export interface PopupApiProps {
  render?:
    | TemplateResult
    | ((props: Record<string, unknown>, state: PopupState) => TemplateResult)
    | undefined;
}

export interface ArrowApiProps {
  render?:
    | TemplateResult
    | ((props: Record<string, unknown>, state: ArrowState) => TemplateResult)
    | undefined;
}

export interface TitleApiProps {
  render?:
    | TemplateResult
    | ((props: Record<string, unknown>, state: Record<string, never>) => TemplateResult)
    | undefined;
}

export interface DescriptionApiProps {
  render?:
    | TemplateResult
    | ((props: Record<string, unknown>, state: Record<string, never>) => TemplateResult)
    | undefined;
}

export interface CloseApiProps {
  disabled?: boolean | undefined;
  nativeButton?: boolean | undefined;
  render?:
    | TemplateResult
    | ((props: Record<string, unknown>, state: CloseState) => TemplateResult)
    | undefined;
}

export interface ViewportApiProps {
  render?:
    | TemplateResult
    | ((props: Record<string, unknown>, state: ViewportState) => TemplateResult)
    | undefined;
}

export enum TriggerDataAttributes {
  popupOpen = 'data-popup-open',
}

export enum PortalDataAttributes {
  open = 'data-open',
  closed = 'data-closed',
}

export enum BackdropDataAttributes {
  open = 'data-open',
  closed = 'data-closed',
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

export enum CloseDataAttributes {
  disabled = 'data-disabled',
}

export enum ViewportDataAttributes {
  activationDirection = 'data-activation-direction',
  transitioning = 'data-transitioning',
  instant = 'data-instant',
}

export enum PositionerCssVars {
  transformOrigin = '--transform-origin',
}

export enum ViewportCssVars {
  popupWidth = '--popup-width',
  popupHeight = '--popup-height',
}

/**
 * Groups all parts of the popover.
 * Renders a `<popover-root>` custom element.
 */
export const Root: React.FC<RootApiProps> = () => null;

/**
 * A button-like trigger that opens the popover.
 * Renders a `<popover-trigger>` custom element.
 */
export const Trigger: React.FC<TriggerApiProps> = () => null;

/**
 * A portal wrapper for the positioned popup subtree.
 * By default, the portal element is appended to `<body>`.
 * Renders a `<popover-portal>` custom element.
 */
export const Portal: React.FC<PortalApiProps> = () => null;

/**
 * Positions the popup relative to the active trigger.
 * Renders a `<popover-positioner>` custom element.
 */
export const Positioner: React.FC<PositionerApiProps> = () => null;

/**
 * The popup surface itself.
 * Renders a `<popover-popup>` custom element.
 */
export const Popup: React.FC<PopupApiProps> = () => null;

/**
 * An arrow pointing from the popup toward the trigger.
 * Renders a `<popover-arrow>` custom element.
 */
export const Arrow: React.FC<ArrowApiProps> = () => null;

/**
 * A backdrop rendered beneath the popup.
 * Renders a `<popover-backdrop>` custom element.
 */
export const Backdrop: React.FC<BackdropApiProps> = () => null;

/**
 * Labels the popup for assistive technology.
 * Renders a `<popover-title>` custom element.
 */
export const Title: React.FC<TitleApiProps> = () => null;

/**
 * Describes the popup for assistive technology.
 * Renders a `<popover-description>` custom element.
 */
export const Description: React.FC<DescriptionApiProps> = () => null;

/**
 * Closes the popover when pressed.
 * Renders a `<popover-close>` custom element.
 */
export const Close: React.FC<CloseApiProps> = () => null;

/**
 * Wraps popup content and exposes transition-oriented data attributes.
 * Renders a `<popover-viewport>` custom element.
 */
export const Viewport: React.FC<ViewportApiProps> = () => null;

/**
 * Creates a handle that connects detached triggers to a popover root.
 */
export function createHandle(): Handle {
  return null as never;
}

/**
 * Imperative handle shared between detached triggers and the popover root.
 */
export class Handle {
  readonly isOpen!: boolean;

  open(_triggerId?: string): void {}

  close(): void {}
}

export namespace Root {
  export type Props = RootApiProps;
  export type Actions = RootActions;
  export type ChangeEventReason = RootChangeEventReason;
  export type ChangeEventDetails = RootChangeEventDetails;
}

export namespace Trigger {
  export type Props = TriggerApiProps;
  export type State = TriggerState;
  export type DataAttributes = TriggerDataAttributes;
}

export namespace Portal {
  export type Props = PortalApiProps;
  export type State = PortalState;
  export type DataAttributes = PortalDataAttributes;
}

export namespace Backdrop {
  export type Props = BackdropApiProps;
  export type State = BackdropState;
  export type DataAttributes = BackdropDataAttributes;
}

export namespace Positioner {
  export type Props = PositionerApiProps;
  export type State = PositionerState;
  export type DataAttributes = PositionerDataAttributes;
  export type CssVars = PositionerCssVars;
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

export namespace Title {
  export type Props = TitleApiProps;
}

export namespace Description {
  export type Props = DescriptionApiProps;
}

export namespace Close {
  export type Props = CloseApiProps;
  export type State = CloseState;
  export type DataAttributes = CloseDataAttributes;
}

export namespace Viewport {
  export type Props = ViewportApiProps;
  export type State = ViewportState;
  export type DataAttributes = ViewportDataAttributes;
  export type CssVars = ViewportCssVars;
}

export const PopoverDocumentation = {
  Root,
  Trigger,
  Portal,
  Positioner,
  Popup,
  Arrow,
  Backdrop,
  Title,
  Description,
  Close,
  Viewport,
  createHandle,
  Handle,
} as const;
