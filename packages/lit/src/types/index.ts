import type { TemplateResult } from 'lit';

interface ReasonToEventMap {
  none: Event;

  'trigger-press': MouseEvent | PointerEvent | TouchEvent | KeyboardEvent;
  'trigger-hover': MouseEvent;
  'trigger-focus': FocusEvent;

  'outside-press': MouseEvent | PointerEvent | TouchEvent;
  'item-press': MouseEvent | KeyboardEvent | PointerEvent;
  'close-press': MouseEvent | KeyboardEvent | PointerEvent;
  'link-press': MouseEvent | PointerEvent;
  'clear-press': PointerEvent | MouseEvent | KeyboardEvent;
  'chip-remove-press': PointerEvent | MouseEvent | KeyboardEvent;
  'track-press': PointerEvent | MouseEvent | TouchEvent;
  'increment-press': PointerEvent | MouseEvent | TouchEvent;
  'decrement-press': PointerEvent | MouseEvent | TouchEvent;

  'input-change': InputEvent | Event;
  'input-clear': InputEvent | FocusEvent | Event;
  'input-blur': FocusEvent;
  'input-paste': ClipboardEvent;
  'input-press': MouseEvent | PointerEvent | TouchEvent | KeyboardEvent;

  'focus-out': FocusEvent | KeyboardEvent;
  'escape-key': KeyboardEvent;
  'close-watcher': Event;
  'list-navigation': KeyboardEvent;
  keyboard: KeyboardEvent;

  pointer: PointerEvent;
  drag: PointerEvent | TouchEvent;
  swipe: PointerEvent | TouchEvent;
  wheel: WheelEvent;
  scrub: PointerEvent;

  'cancel-open': MouseEvent;
  'sibling-open': Event;
  disabled: Event;
  'imperative-action': Event;

  'window-resize': UIEvent;
}

type ReasonToEvent<Reason extends string> = Reason extends keyof ReasonToEventMap
  ? ReasonToEventMap[Reason]
  : Event;

type RefObject<T> = {
  current: T | null;
};

type RefCallback<T> = (instance: T | null) => void;

type Ref<T> = RefCallback<T> | RefObject<T> | null;

type BaseUIChangeEventDetail<Reason extends string, CustomProperties extends object> = {
  /**
   * The reason for the event.
   */
  reason: Reason;
  /**
   * The native event associated with the custom event.
   */
  event: ReasonToEvent<Reason>;
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
} & CustomProperties;

/**
 * Details of custom change events emitted by Base UI components.
 */
export type BaseUIChangeEventDetails<
  Reason extends string,
  CustomProperties extends object = {},
> = Reason extends string ? BaseUIChangeEventDetail<Reason, CustomProperties> : never;

type BaseUIGenericEventDetail<Reason extends string, CustomProperties extends object> = {
  /**
   * The reason for the event.
   */
  reason: Reason;
  /**
   * The native event associated with the custom event.
   */
  event: ReasonToEvent<Reason>;
} & CustomProperties;

/**
 * Details of custom generic events emitted by Base UI components.
 */
export type BaseUIGenericEventDetails<
  Reason extends string,
  CustomProperties extends object = {},
> = Reason extends string ? BaseUIGenericEventDetail<Reason, CustomProperties> : never;

/**
 * Shape of the prop bag spread onto rendered elements in the Lit port.
 *
 * The named export is preserved from React, while the type is adapted to
 * support DOM element properties plus arbitrary attributes/directives.
 */
export type HTMLProps<T = any> = Partial<T> & {
  [attribute: string]: unknown;
  ref?: Ref<T> | undefined;
};

/**
 * Shape of the render prop: a function that takes props to be spread on the
 * element and component state and returns a Lit template.
 *
 * @template Props Props to be spread on the rendered element.
 * @template State Component's internal state.
 */
export type ComponentRenderFn<Props, State> = (props: Props, state: State) => TemplateResult;

export type BaseUIEvent<E extends Event = Event> = E & {
  preventBaseUIHandler: () => void;
  readonly baseUIHandlerPrevented?: boolean | undefined;
};
