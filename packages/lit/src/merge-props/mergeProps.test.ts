import { expect, expectTypeOf, vi } from 'vitest';

import { makeEventPreventable, mergeProps, mergePropsN } from '@base-ui/lit/merge-props';
import type { BaseUIEvent } from '../types';

describe('mergeProps', () => {
  it('merges event handlers', () => {
    const theirProps = {
      onClick: vi.fn(),
      onKeyDown: vi.fn(),
    };
    const ourProps = {
      onClick: vi.fn(),
      onPaste: vi.fn(),
    };
    const mergedProps = mergeProps<'button'>(ourProps, theirProps);

    type OnClick = typeof mergedProps.onClick;

    expectTypeOf<OnClick>().toEqualTypeOf<
      ((event: BaseUIEvent<PointerEvent>) => any) | undefined
    >();
    mergedProps.onClick?.({ nativeEvent: new MouseEvent('click') } as any);
    mergedProps.onKeyDown?.({ nativeEvent: new KeyboardEvent('keydown') } as any);
    mergedProps.onPaste?.({ nativeEvent: new Event('paste') } as any);

    expect(theirProps.onClick.mock.invocationCallOrder[0]).toBeLessThan(
      ourProps.onClick.mock.invocationCallOrder[0],
    );
    expect(theirProps.onClick.mock.calls.length).toBe(1);
    expect(ourProps.onClick.mock.calls.length).toBe(1);
    expect(theirProps.onKeyDown.mock.calls.length).toBe(1);
    expect(ourProps.onPaste.mock.calls.length).toBe(1);
  });

  it('merges multiple event handlers', () => {
    const log: string[] = [];

    const mergedProps = mergeProps<'button'>(
      {
        onClick() {
          log.push('3');
        },
      },
      {
        onClick() {
          log.push('2');
        },
      },
      {
        onClick() {
          log.push('1');
        },
      },
    );

    mergedProps.onClick?.({ nativeEvent: new MouseEvent('click') } as any);
    expect(log).toEqual(['1', '2', '3']);
  });

  it('merges lowercase DOM event handlers', () => {
    const log: string[] = [];
    const button = document.createElement('button');

    const mergedProps = mergeProps<HTMLButtonElement>(
      {
        onclick() {
          log.push('internal');
        },
      },
      {
        onclick(event: BaseUIEvent<PointerEvent>) {
          event.preventBaseUIHandler();
          log.push('external');
        },
      },
    );

    type OnClick = typeof mergedProps.onclick;
    const event = new PointerEvent('click') as BaseUIEvent<PointerEvent>;

    expectTypeOf<OnClick>().toEqualTypeOf<
      ((this: GlobalEventHandlers, ev: BaseUIEvent<PointerEvent>) => any) | null | undefined
    >();
    mergedProps.onclick?.call(button, event);

    expect(log).toEqual(['external']);
    expect(event.baseUIHandlerPrevented).toBe(true);
  });

  it('preserves this for merged lowercase DOM event handlers', () => {
    const contexts: unknown[] = [];
    const button = document.createElement('button');

    const mergedProps = mergeProps<HTMLButtonElement>(
      {
        onclick(this: GlobalEventHandlers) {
          contexts.push(this);
        },
      },
      {
        onclick(this: GlobalEventHandlers) {
          contexts.push(this);
        },
      },
    );

    type OnClick = typeof mergedProps.onclick;
    const event = new PointerEvent('click') as BaseUIEvent<PointerEvent>;

    expectTypeOf<OnClick>().toEqualTypeOf<
      ((this: GlobalEventHandlers, ev: BaseUIEvent<PointerEvent>) => any) | null | undefined
    >();
    mergedProps.onclick?.call(button, event);

    expect(contexts).toEqual([button, button]);
  });

  it('merges mixed-case DOM handler aliases into one chain', () => {
    const log: string[] = [];
    const button = document.createElement('button');

    const mergedProps = mergeProps<HTMLButtonElement>(
      {
        onclick() {
          log.push('internal');
        },
      },
      {
        onClick(event: BaseUIEvent<PointerEvent>) {
          event.preventBaseUIHandler();
          log.push('external');
        },
      },
    );

    const event = new PointerEvent('click') as BaseUIEvent<PointerEvent>;
    const clickHandler = (mergedProps.onClick ?? mergedProps.onclick) as
      | ((this: GlobalEventHandlers, event: BaseUIEvent<PointerEvent>) => any)
      | null
      | undefined;

    clickHandler?.call(button, event);

    expect(log).toEqual(['external']);
    expect([mergedProps.onClick, mergedProps.onclick].filter(Boolean)).toHaveLength(1);
  });

  it('preserves synthetic wrapper support in makeEventPreventable', () => {
    const event = makeEventPreventable({
      nativeEvent: new MouseEvent('click'),
    });

    expectTypeOf(event.preventBaseUIHandler).toBeFunction();

    event.preventBaseUIHandler();

    expect(event.baseUIHandlerPrevented).toBe(true);
  });

  it('does not treat plain objects with nativeEvent properties as preventable events', () => {
    const log: string[] = [];
    const event = { nativeEvent: {} };

    const mergedProps = mergeProps<any>(
      {
        onValueChange() {
          log.push('internal');
        },
      },
      {
        onValueChange(payload: { nativeEvent: object; preventBaseUIHandler?: () => void }) {
          payload.preventBaseUIHandler?.();
          log.push('external');
        },
      },
    );

    mergedProps.onValueChange?.(event);

    expect(log).toEqual(['external', 'internal']);
    expect('preventBaseUIHandler' in event).toBe(false);
  });

  it('merges undefined event handlers', () => {
    const log: string[] = [];

    const mergedProps = mergeProps<'button'>(
      {
        onClick() {
          log.push('3');
        },
      },
      {
        onClick: undefined,
      },
      {
        onClick() {
          log.push('1');
        },
      },
    );

    mergedProps.onClick?.({ nativeEvent: new MouseEvent('click') } as any);
    expect(log).toEqual(['1', '3']);
  });

  it('makes a lone synthetic event handler preventable', () => {
    let prevented = false;

    const mergedProps = mergeProps<'button'>(
      {},
      {
        onMouseDown(event: BaseUIEvent<MouseEvent>) {
          event.preventBaseUIHandler();
          prevented = event.baseUIHandlerPrevented === true;
        },
      },
    );

    mergedProps.onMouseDown?.({ nativeEvent: new MouseEvent('mousedown') } as any);

    expect(prevented).toBe(true);
  });

  it('makes a first-position synthetic event handler preventable', () => {
    let prevented = false;

    const mergedProps = mergeProps<'button'>(
      {
        onMouseDown(event: BaseUIEvent<MouseEvent>) {
          event.preventBaseUIHandler();
          prevented = event.baseUIHandlerPrevented === true;
        },
      },
      {
        id: 'test-button',
      },
    );

    mergedProps.onMouseDown?.({ nativeEvent: new MouseEvent('mousedown') } as any);

    expect(prevented).toBe(true);
  });

  it('makes a first-position synthetic event handler preventable in mergePropsN', () => {
    let prevented = false;

    const mergedProps = mergePropsN<'button'>([
      {
        onMouseDown(event: BaseUIEvent<MouseEvent>) {
          event.preventBaseUIHandler();
          prevented = event.baseUIHandlerPrevented === true;
        },
      },
      {
        id: 'test-button',
      },
    ]);

    mergedProps.onMouseDown?.({ nativeEvent: new MouseEvent('mousedown') } as any);

    expect(prevented).toBe(true);
  });

  it('makes a lone obscure synthetic event handler preventable', () => {
    let prevented = false;

    const mergedProps = mergeProps<'button'>(
      {},
      {
        onContextMenu(event: BaseUIEvent<MouseEvent>) {
          event.preventBaseUIHandler();
          prevented = event.baseUIHandlerPrevented === true;
        },
      },
    );

    mergedProps.onContextMenu?.({ nativeEvent: new MouseEvent('contextmenu') } as any);

    expect(prevented).toBe(true);
  });

  it('merges styles', () => {
    const theirProps = {
      style: { color: 'red' },
    };
    const ourProps = {
      style: { color: 'blue', backgroundColor: 'blue' },
    };
    const mergedProps = mergeProps<'div'>(ourProps, theirProps);

    expect(mergedProps.style).toEqual({
      color: 'red',
      backgroundColor: 'blue',
    });
  });

  it('merges styles with undefined', () => {
    const theirProps = {
      style: { color: 'red' },
    };
    const ourProps = {};

    const mergedProps = mergeProps<'button'>(ourProps, theirProps);

    expect(mergedProps.style).toEqual({
      color: 'red',
    });
  });

  it('does not merge styles if both are undefined', () => {
    const theirProps = {};
    const ourProps = {};
    const mergedProps = mergeProps<'button'>(ourProps, theirProps);

    expect(mergedProps.style).toBe(undefined);
  });

  it('merges classNames with rightmost first', () => {
    const theirProps = {
      className: 'external-class',
    };
    const ourProps = {
      className: 'internal-class',
    };
    const mergedProps = mergeProps<'div'>(ourProps, theirProps);

    expect(mergedProps.className).toBe('external-class internal-class');
  });

  it('merges class props with rightmost first', () => {
    const theirProps = {
      class: 'external-class',
    };
    const ourProps = {
      class: 'internal-class',
    };
    const mergedProps = mergeProps<'div'>(ourProps, theirProps);

    type ClassName = typeof mergedProps.class;

    expectTypeOf<ClassName>().toEqualTypeOf<string | undefined>();
    expect(mergedProps.class).toBe('external-class internal-class');
    expect(mergedProps.className).toBe(undefined);
  });

  it('merges class into className without dropping either contribution', () => {
    const theirProps = {
      class: 'external-class',
    };
    const ourProps = {
      className: 'internal-class',
    };
    const mergedProps = mergeProps<'div'>(ourProps, theirProps);

    expect(mergedProps.className).toBe('external-class internal-class');
    expect(mergedProps.class).toBe(undefined);
  });

  it('merges className into class without dropping either contribution', () => {
    const theirProps = {
      className: 'external-class',
    };
    const ourProps = {
      class: 'internal-class',
    };
    const mergedProps = mergeProps<'div'>(ourProps, theirProps);

    expect(mergedProps.className).toBe('external-class internal-class');
    expect(mergedProps.class).toBe(undefined);
  });

  it('merges multiple classNames', () => {
    const mergedProps = mergeProps<'div'>(
      {
        className: 'class-1',
      },
      {
        className: 'class-2',
      },
      {
        className: 'class-3',
      },
    );

    expect(mergedProps.className).toBe('class-3 class-2 class-1');
  });

  it('merges classNames with undefined', () => {
    const theirProps = {
      className: 'external-class',
    };
    const ourProps = {};

    const mergedProps = mergeProps<'button'>(ourProps, theirProps);

    expect(mergedProps.className).toBe('external-class');
  });

  it('does not merge classNames if both are undefined', () => {
    const theirProps = {};
    const ourProps = {};
    const mergedProps = mergeProps<'button'>(ourProps, theirProps);

    expect(mergedProps.className).toBe(undefined);
  });

  it('does not prevent internal handler if event.preventBaseUIHandler() is not called', () => {
    let ran = false;

    const mergedProps = mergeProps<'button'>(
      {
        onClick() {},
      },
      {
        onClick() {
          ran = true;
        },
      },
    );

    mergedProps.onClick?.({ nativeEvent: new MouseEvent('click') } as any);

    expect(ran).toBe(true);
  });

  it('prevents internal handler if event.preventBaseUIHandler() is called', () => {
    let ran = false;

    const mergedProps = mergeProps<'button'>(
      {
        onClick: function onClick3() {
          ran = true;
        },
      },
      {
        onClick: function onClick2() {
          ran = true;
        },
      },
      {
        onClick: function onClick1(event: BaseUIEvent<PointerEvent>) {
          event.preventBaseUIHandler();
        },
      },
    );

    const event = { nativeEvent: new MouseEvent('click') } as any;
    mergedProps.onClick?.(event);

    expect(ran).toBe(false);
  });

  it('prevents handlers merged after event.preventBaseUIHandler() is called', () => {
    const log: string[] = [];

    const mergedProps = mergeProps<any>(
      {
        onClick() {
          log.push('2');
        },
      },
      {
        onClick(event: BaseUIEvent<MouseEvent>) {
          event.preventBaseUIHandler();
          log.push('1');
        },
      },
      {
        onClick() {
          log.push('0');
        },
      },
    );

    mergedProps.onClick?.({ nativeEvent: new MouseEvent('click') });

    expect(log).toEqual(['0', '1']);
  });

  [true, 13, 'newValue', { key: 'value' }, ['value'], () => 'value'].forEach((eventArgument) => {
    it('handles non-standard event handlers without error', () => {
      const log: string[] = [];

      const mergedProps = mergeProps<any>(
        {
          onValueChange() {
            log.push('1');
          },
        },
        {
          onValueChange() {
            log.push('0');
          },
        },
      );

      mergedProps.onValueChange?.(eventArgument);

      expect(log).toEqual(['0', '1']);
    });
  });

  it('merges internal props so that the ones defined later override the ones defined earlier', () => {
    const mergedProps = mergeProps<'button'>(
      {
        title: 'internal title 2',
      },
      {
        title: 'internal title 1',
      },
      {},
    );

    expect(mergedProps.title).toBe('internal title 1');
  });

  it('sets baseUIHandlerPrevented to true after calling preventBaseUIHandler()', () => {
    let observedFlag: boolean | undefined;

    const mergedProps = mergeProps<'button'>(
      {
        onClick() {},
      },
      {
        onClick(event: BaseUIEvent<PointerEvent>) {
          event.preventBaseUIHandler();
          observedFlag = event.baseUIHandlerPrevented;
        },
      },
    );

    mergedProps.onClick?.({ nativeEvent: new MouseEvent('click') } as any);

    expect(observedFlag).toBe(true);
  });

  describe('mergePropsN', () => {
    it('returns an empty object when no props are provided', () => {
      expect(mergePropsN([])).toEqual({});
    });

    it('returns a shallow copy for a single props entry', () => {
      const props = {
        id: 'test-id',
      };

      expect(mergePropsN([props])).toEqual(props);
    });

    it('merges arrays using the same right-to-left handler order', () => {
      const log: string[] = [];

      const mergedProps = mergePropsN<'button'>([
        {
          onClick() {
            log.push('2');
          },
        },
        {
          onClick() {
            log.push('1');
          },
        },
        {
          onClick() {
            log.push('0');
          },
        },
      ]);

      mergedProps.onClick?.({ nativeEvent: new MouseEvent('click') } as any);

      expect(log).toEqual(['0', '1', '2']);
    });

    it('passes merged props into array-based props getters', () => {
      let observedProps;
      const propsGetter = vi.fn((props) => {
        observedProps = { ...props };
        return props;
      });

      mergePropsN([
        {
          className: 'test-class',
        },
        {
          id: 'one',
        },
        propsGetter,
      ]);

      expect(propsGetter).toHaveBeenCalledTimes(1);
      expect(observedProps).toEqual({
        className: 'test-class',
        id: 'one',
      });
    });
  });

  describe('props getters', () => {
    it('calls the props getter with the props defined before it', () => {
      let observedProps;
      const propsGetter = vi.fn((props) => {
        observedProps = { ...props };
        return props;
      });

      mergeProps(
        {
          id: '2',
          className: 'test-class',
        },
        propsGetter,
        {
          id: '1',
          role: 'button',
        },
      );

      expect(propsGetter.mock.calls.length === 1).toBe(true);
      expect(observedProps).toEqual({ id: '2', className: 'test-class' });
    });

    it('calls the props getter with merged props defined before it', () => {
      let observedProps;
      const propsGetter = vi.fn((props) => {
        observedProps = { ...props };
        return props;
      });

      mergeProps(
        {
          role: 'button',
          className: 'test-class',
        },
        {
          role: 'tab',
        },
        propsGetter,
        {
          id: 'one',
        },
      );

      expect(propsGetter.mock.calls.length === 1).toBe(true);
      expect(observedProps).toEqual({
        role: 'tab',
        className: 'test-class',
      });
    });

    it('calls the props getter with an empty object if no props are defined before it', () => {
      let observedProps;
      const propsGetter = vi.fn((props) => {
        observedProps = { ...props };
        return props;
      });

      mergeProps(propsGetter, { id: '1' });

      expect(propsGetter.mock.calls.length === 1).toBe(true);
      expect(observedProps).toEqual({});
    });

    it('accepts the result of the props getter', () => {
      const propsGetter = () => ({ className: 'test-class' });
      const result = mergeProps(
        {
          id: 'two',
          role: 'tab',
        },
        {
          id: 'one',
        },
        propsGetter,
      );

      expect(result).toEqual({
        className: 'test-class',
      });
    });

    it('does not automatically prevent handlers that are manually called by getter handlers', () => {
      const log: string[] = [];

      const mergedProps = mergeProps<'button'>(
        {
          onClick() {
            log.push('first-handler');
          },
        },
        (props) => ({
          onClick(event: BaseUIEvent<MouseEvent>) {
            event.preventBaseUIHandler();
            log.push('getter-handler');
            props.onClick?.({ nativeEvent: new MouseEvent('click') } as any);
          },
        }),
        {
          onClick() {
            log.push('last-handler');
          },
        },
      );

      mergedProps.onClick?.({ nativeEvent: new MouseEvent('click') } as any);

      expect(log).toEqual(['last-handler', 'getter-handler', 'first-handler']);
    });

    it('allows props getter handlers to check baseUIHandlerPrevented manually', () => {
      const log: string[] = [];

      const mergedProps = mergeProps<'button'>(
        {
          onClick() {
            log.push('first-handler');
          },
        },
        (props) => ({
          onClick(event: BaseUIEvent<MouseEvent>) {
            event.preventBaseUIHandler();
            log.push('getter-handler');
            if (!event.baseUIHandlerPrevented) {
              props.onClick?.({ nativeEvent: new MouseEvent('click') } as any);
            }
          },
        }),
        {
          onClick() {
            log.push('last-handler');
          },
        },
      );

      mergedProps.onClick?.({ nativeEvent: new MouseEvent('click') } as any);

      expect(log).toEqual(['last-handler', 'getter-handler']);
    });
  });
});
