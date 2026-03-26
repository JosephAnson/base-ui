import type { BaseUIEvent, HTMLProps } from '../types';

type IntrinsicElementTagName = keyof HTMLElementTagNameMap | keyof SVGElementTagNameMap;
type UppercaseAsciiLetter =
  | 'A'
  | 'B'
  | 'C'
  | 'D'
  | 'E'
  | 'F'
  | 'G'
  | 'H'
  | 'I'
  | 'J'
  | 'K'
  | 'L'
  | 'M'
  | 'N'
  | 'O'
  | 'P'
  | 'Q'
  | 'R'
  | 'S'
  | 'T'
  | 'U'
  | 'V'
  | 'W'
  | 'X'
  | 'Y'
  | 'Z';

type ElementType = IntrinsicElementTagName | Element;
type EventHandlerKey = `on${UppercaseAsciiLetter}${string}`;
type EventHandler = ((event: any) => any) | undefined;
type EventHandlerProps = {
  [Key in EventHandlerKey]?: EventHandler;
};
type StyleObject = Record<string, unknown>;
type SyntheticEvent<E extends Event = Event> = {
  nativeEvent: E;
  preventBaseUIHandler?: (() => void) | undefined;
  readonly baseUIHandlerPrevented?: boolean | undefined;
};
type PreventableSyntheticEvent<E extends Event = Event> = SyntheticEvent<E> & {
  preventBaseUIHandler: () => void;
  readonly baseUIHandlerPrevented?: boolean | undefined;
};

type ElementForType<T> = T extends keyof HTMLElementTagNameMap
  ? HTMLElementTagNameMap[T]
  : T extends keyof SVGElementTagNameMap
    ? SVGElementTagNameMap[T]
    : T extends Element
      ? T
      : Element;
type RemoveIndexSignature<T> = {
  [Key in keyof T as string extends Key
    ? never
    : number extends Key
      ? never
      : symbol extends Key
        ? never
        : Key]: T[Key];
};

type WithPreventBaseUIHandler<T> = T extends (this: infer This, event: infer E) => infer R
  ? E extends Event
    ? ((this: This, event: BaseUIEvent<E>) => R) | null
    : T
  : T extends (event: infer E) => infer R
    ? E extends Event
      ? (event: BaseUIEvent<E>) => R
      : T
    : T;

type WithBaseUIEvent<T> = {
  [Key in keyof T]: WithPreventBaseUIHandler<T[Key]>;
};

type KnownPropsOf<T extends ElementType> = WithBaseUIEvent<
  RemoveIndexSignature<HTMLProps<ElementForType<T>>>
>;

type CamelCaseEventHandlerProps<T extends ElementType> = {
  [Key in keyof KnownPropsOf<T> as Key extends `on${infer Rest}`
    ? Key extends Lowercase<Key>
      ? `on${Capitalize<Rest>}`
      : never
    : never]?: OmitThisParameter<Extract<KnownPropsOf<T>[Key], (...args: any[]) => any>>;
};

type FallbackEventHandlerProps<T extends ElementType> = Omit<
  EventHandlerProps,
  keyof CamelCaseEventHandlerProps<T>
>;

type PropsOf<T extends ElementType> = Omit<KnownPropsOf<T>, 'className' | 'style'> &
  Omit<HTMLProps<ElementForType<T>>, keyof RemoveIndexSignature<HTMLProps<ElementForType<T>>>> &
  CamelCaseEventHandlerProps<T> &
  FallbackEventHandlerProps<T> & {
    class?: string | undefined;
    className?: string | undefined;
    style?: StyleObject | undefined;
  };
type InputProps<T extends ElementType> =
  | PropsOf<T>
  | ((otherProps: PropsOf<T>) => PropsOf<T>)
  | undefined;

const EMPTY_PROPS = {};

/* eslint-disable id-denylist */
/**
 * Merges multiple sets of props. It follows the Object.assign pattern where the rightmost object's
 * fields overwrite the conflicting ones from others. This doesn't apply to event handlers,
 * `className`, `class`, and `style` props.
 *
 * Event handlers are merged and called in right-to-left order (rightmost handler executes first,
 * leftmost last). `Event` instances and React-style synthetic event wrappers can prevent prior
 * handlers from executing by calling `event.preventBaseUIHandler()`. For non-event values such as
 * custom primitives or objects, all handlers always execute without prevention capability.
 *
 * The `className` and `class` props are merged by concatenating classes in right-to-left order
 * (rightmost class appears first in the string). The `style` prop is merged with rightmost styles
 * overwriting the prior ones.
 *
 * Props can either be provided as objects or as functions that take the previous props as an
 * argument. The function will receive the merged props up to that point (going from left to right):
 * so in the case of `(obj1, obj2, fn, obj3)`, `fn` will receive the merged props of `obj1` and
 * `obj2`. The function is responsible for chaining event handlers if needed (i.e. we don't run the
 * merge logic).
 *
 * Handlers that a props getter manually calls are not automatically prevented when
 * `preventBaseUIHandler` is called. They must check `event.baseUIHandlerPrevented` themselves and
 * bail out if it's true.
 *
 * @important **`ref` is not merged.**
 * @param a Props object to merge.
 * @param b Props object to merge. The function will overwrite conflicting props from `a`.
 * @param c Props object to merge. The function will overwrite conflicting props from previous
 *   parameters.
 * @param d Props object to merge. The function will overwrite conflicting props from previous
 *   parameters.
 * @param e Props object to merge. The function will overwrite conflicting props from previous
 *   parameters.
 * @returns The merged props.
 * @public
 */
export function mergeProps<T extends ElementType>(
  a: InputProps<T>,
  b: InputProps<T>,
  c: InputProps<T>,
  d: InputProps<T>,
  e: InputProps<T>,
): PropsOf<T>;
export function mergeProps<T extends ElementType>(
  a: InputProps<T>,
  b: InputProps<T>,
  c: InputProps<T>,
  d: InputProps<T>,
): PropsOf<T>;
export function mergeProps<T extends ElementType>(
  a: InputProps<T>,
  b: InputProps<T>,
  c: InputProps<T>,
): PropsOf<T>;
export function mergeProps<T extends ElementType>(a: InputProps<T>, b: InputProps<T>): PropsOf<T>;
export function mergeProps(a: any, b: any, c?: any, d?: any, e?: any) {
  if (!c && !d && !e && !a) {
    return createInitialMergedProps(b);
  }

  let merged = createInitialMergedProps(a);

  if (b) {
    merged = mergeOne(merged, b);
  }
  if (c) {
    merged = mergeOne(merged, c);
  }
  if (d) {
    merged = mergeOne(merged, d);
  }
  if (e) {
    merged = mergeOne(merged, e);
  }

  return merged;
}
/* eslint-enable id-denylist */

/**
 * Merges an arbitrary number of props using the same logic as {@link mergeProps}.
 *
 * This has slightly lower performance than {@link mergeProps} due to accepting an array instead of
 * a fixed number of arguments. Prefer {@link mergeProps} when merging 5 or fewer prop sets for
 * better performance.
 *
 * @param props Array of props to merge.
 * @returns The merged props.
 * @see mergeProps
 * @public
 */
export function mergePropsN<T extends ElementType>(props: InputProps<T>[]): PropsOf<T> {
  if (props.length === 0) {
    return EMPTY_PROPS as PropsOf<T>;
  }
  if (props.length === 1) {
    const firstProps = props[0];

    if (isPropsGetter(firstProps)) {
      return resolvePropsGetter(firstProps, EMPTY_PROPS) as PropsOf<T>;
    }

    return copyPropsWithWrappedEventHandlers(firstProps) as PropsOf<T>;
  }

  let merged = createInitialMergedProps(props[0]);

  for (let index = 1; index < props.length; index += 1) {
    merged = mergeOne(merged, props[index] as InputProps<any>);
  }

  return merged as PropsOf<T>;
}

function mergeOne(merged: Record<string, any>, inputProps: InputProps<any>) {
  if (isPropsGetter(inputProps)) {
    return inputProps(merged);
  }

  return mutablyMergeInto(merged, inputProps);
}

function createInitialMergedProps<T extends ElementType>(inputProps: InputProps<T>) {
  if (isPropsGetter(inputProps)) {
    return { ...resolvePropsGetter(inputProps, EMPTY_PROPS) };
  }

  return copyPropsWithWrappedEventHandlers(inputProps);
}

function copyPropsWithWrappedEventHandlers(inputProps: Record<string, any> | undefined) {
  const copiedProps = { ...inputProps };

  for (const propName in copiedProps) {
    if (isEventHandler(propName, copiedProps[propName])) {
      copiedProps[propName] = wrapEventHandler(copiedProps[propName]);
    }
  }

  return copiedProps;
}

function mutablyMergeInto(
  mergedProps: Record<string, any>,
  externalProps: Record<string, any> | undefined,
) {
  if (!externalProps) {
    return mergedProps;
  }

  // eslint-disable-next-line guard-for-in
  for (const propName in externalProps) {
    const externalPropValue = externalProps[propName];

    switch (propName) {
      case 'style':
        mergedProps[propName] = mergeObjects(
          mergedProps.style as StyleObject | undefined,
          externalPropValue as StyleObject | undefined,
        );
        break;
      case 'class': {
        const classNameKey = resolveClassNameKey(mergedProps, propName);
        const className = mergeClassNames(
          getClassNameValue(mergedProps),
          externalPropValue as string,
        );

        delete mergedProps.class;
        delete mergedProps.className;
        mergedProps[classNameKey] = className;
        break;
      }
      case 'className':
        {
          const classNameKey = resolveClassNameKey(mergedProps, propName);
          const className = mergeClassNames(
            getClassNameValue(mergedProps),
            externalPropValue as string,
          );

          delete mergedProps.class;
          delete mergedProps.className;
          mergedProps[classNameKey] = className;
        }
        break;
      default:
        if (isEventHandler(propName, externalPropValue)) {
          const handlerKey = resolveEventHandlerKey(mergedProps, propName);

          mergedProps[handlerKey] = mergeEventHandlers(mergedProps[handlerKey], externalPropValue);
        } else {
          mergedProps[propName] = externalPropValue;
        }
        break;
    }
  }

  return mergedProps;
}

function isEventHandler(key: string, value: unknown) {
  if (typeof value !== 'function' && typeof value !== 'undefined') {
    return false;
  }

  const code0 = key.charCodeAt(0);
  const code1 = key.charCodeAt(1);
  const code2 = key.charCodeAt(2);

  if (Number.isNaN(code0) || Number.isNaN(code1) || Number.isNaN(code2)) {
    return false;
  }

  return (
    code0 === 111 /* o */ &&
    code1 === 110 /* n */ &&
    ((code2 >= 65 && code2 <= 90) || (code2 >= 97 && code2 <= 122))
  );
}

function resolveEventHandlerKey(mergedProps: Record<string, any>, propName: string) {
  const mergedEventName = getEventHandlerName(propName);

  for (const existingPropName in mergedProps) {
    if (
      isEventHandler(existingPropName, mergedProps[existingPropName]) &&
      getEventHandlerName(existingPropName) === mergedEventName
    ) {
      return existingPropName;
    }
  }

  return propName;
}

function getEventHandlerName(propName: string) {
  return propName.slice(2).toLowerCase();
}

function resolveClassNameKey(mergedProps: Record<string, any>, propName: 'class' | 'className') {
  if (propName === 'className' || mergedProps.className != null) {
    return 'className';
  }

  return 'class';
}

function getClassNameValue(mergedProps: Record<string, any>) {
  return (mergedProps.className ?? mergedProps.class) as string | undefined;
}

function isPropsGetter(
  inputProps: InputProps<any>,
): inputProps is (props: Record<string, any>) => Record<string, any> {
  return typeof inputProps === 'function';
}

function resolvePropsGetter<T extends ElementType>(
  inputProps: InputProps<any>,
  previousProps: Record<string, any>,
) {
  if (isPropsGetter(inputProps)) {
    return inputProps(previousProps);
  }

  return inputProps ?? (EMPTY_PROPS as PropsOf<T>);
}

function mergeEventHandlers(ourHandler: Function | undefined, theirHandler: Function | undefined) {
  if (!theirHandler) {
    return ourHandler;
  }
  if (!ourHandler) {
    return wrapEventHandler(theirHandler);
  }

  return function mergedEventHandler(this: unknown, event: unknown) {
    if (isPreventableEvent(event)) {
      const baseUIEvent = event as BaseUIEvent<Event>;

      makeEventPreventable(baseUIEvent);

      const result = theirHandler.call(this, baseUIEvent);

      if (!baseUIEvent.baseUIHandlerPrevented) {
        ourHandler.call(this, baseUIEvent);
      }

      return result;
    }

    const result = theirHandler.call(this, event);
    ourHandler.call(this, event);
    return result;
  };
}

function wrapEventHandler(handler: Function | undefined) {
  if (!handler) {
    return handler;
  }

  return function wrappedEventHandler(this: unknown, event: unknown) {
    if (isPreventableEvent(event)) {
      makeEventPreventable(event as BaseUIEvent<Event>);
    }

    return handler.call(this, event);
  };
}

export function makeEventPreventable<E extends Event>(event: BaseUIEvent<E>): BaseUIEvent<E>;
export function makeEventPreventable<E extends Event>(
  event: SyntheticEvent<E>,
): PreventableSyntheticEvent<E>;
export function makeEventPreventable(event: BaseUIEvent<Event> | SyntheticEvent<Event>) {
  event.preventBaseUIHandler = () => {
    (event.baseUIHandlerPrevented as boolean) = true;
  };

  return event;
}

export function mergeClassNames(
  ourClassName: string | undefined,
  theirClassName: string | undefined,
) {
  if (theirClassName) {
    if (ourClassName) {
      return `${theirClassName} ${ourClassName}`;
    }

    return theirClassName;
  }

  return ourClassName;
}

function isPreventableEvent(event: unknown): event is Event | { nativeEvent: unknown } {
  return isDomEvent(event) || isSyntheticEvent(event);
}

function isDomEvent(event: unknown): event is Event {
  return typeof Event !== 'undefined' && event instanceof Event;
}

function isSyntheticEvent(event: unknown): event is { nativeEvent: unknown } {
  return (
    event != null &&
    typeof event === 'object' &&
    'nativeEvent' in event &&
    isDomEvent(event.nativeEvent)
  );
}

function mergeObjects<A extends object | undefined, B extends object | undefined>(a: A, b: B) {
  if (a && !b) {
    return a;
  }
  if (!a && b) {
    return b;
  }
  if (a || b) {
    return { ...a, ...b };
  }

  return undefined;
}
