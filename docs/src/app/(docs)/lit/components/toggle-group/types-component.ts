/* eslint-disable react/function-component-definition */
import * as React from 'react';

export type ToggleGroupOrientation = 'horizontal' | 'vertical';

export interface ToggleGroupState {
  /**
   * Whether the toggle group should ignore user interaction.
   */
  disabled: boolean;
  /**
   * Whether multiple items can be pressed at the same time.
   */
  multiple: boolean;
  /**
   * The orientation of the toggle group.
   */
  orientation: ToggleGroupOrientation;
}

export interface ToggleGroupChangeEventDetails {
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
  readonly isCanceled: boolean;
  /**
   * Indicates whether the event is allowed to propagate.
   */
  readonly isPropagationAllowed: boolean;
  /**
   * The element that triggered the event, if applicable.
   */
  trigger: Element | undefined;
}

export interface ToggleGroupApiProps {
  /**
   * The open state of the toggle group represented by an array of
   * the values of all pressed toggle buttons.
   * This is the uncontrolled counterpart of `value`.
   */
  defaultValue?: string[] | undefined;
  /**
   * The open state of the toggle group represented by an array of
   * the values of all pressed toggle buttons.
   * This is the controlled counterpart of `defaultValue`.
   */
  value?: string[] | undefined;
  /**
   * Callback fired when the pressed states of the toggle group changes.
   */
  onValueChange?:
    | ((groupValue: string[], eventDetails: ToggleGroupChangeEventDetails) => void)
    | undefined;
  /**
   * Whether to loop keyboard focus back to the first item
   * when the end of the list is reached while using the arrow keys.
   * @default true
   */
  loopFocus?: boolean | undefined;
  /**
   * When `false` only one item in the group can be pressed. If any item in
   * the group becomes pressed, the others will become unpressed.
   * When `true` multiple items can be pressed.
   * @default false
   */
  multiple?: boolean | undefined;
  /**
   * Whether the toggle group should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * The orientation of the toggle group.
   * @default 'horizontal'
   */
  orientation?: ToggleGroupOrientation | undefined;
}

export const ToggleGroup: React.FC<ToggleGroupApiProps> = () => null;
