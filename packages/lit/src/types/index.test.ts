import { html, type TemplateResult } from 'lit';
import { describe, expect, expectTypeOf, it } from 'vitest';

import type {
  BaseUIChangeEventDetails,
  BaseUIEvent,
  BaseUIGenericEventDetails,
  ComponentRenderFn,
  HTMLProps,
} from '@base-ui/lit/types';

describe('types entrypoint', () => {
  it('has no runtime exports', async () => {
    const module = await import('@base-ui/lit/types');

    expect(Object.keys(module)).toEqual([]);
  });

  it('preserves the public type contracts', () => {
    const props: HTMLProps<HTMLButtonElement> = {
      ref: { current: null },
      disabled: true,
      onclick(event) {
        event.preventDefault();
      },
      'aria-label': 'Trigger',
      'data-state': 'open',
    };

    const render: ComponentRenderFn<{ id: string }, { pressed: boolean }> = (renderProps, state) =>
      html`<button id=${renderProps.id} ?aria-pressed=${state.pressed}></button>`;

    type ClickEvent = BaseUIEvent<PointerEvent>;
    type ChangeDetails = BaseUIChangeEventDetails<'input-blur', { value: string }>;
    type GenericDetails = BaseUIGenericEventDetails<'keyboard', { active: boolean }>;

    expect(props.disabled).toBe(true);
    expectTypeOf<HTMLProps<HTMLButtonElement>['ref']>().toEqualTypeOf<
      | { current: HTMLButtonElement | null }
      | ((instance: HTMLButtonElement | null) => void)
      | null
      | undefined
    >();
    expectTypeOf<HTMLProps<HTMLButtonElement>['onclick']>().toEqualTypeOf<
      HTMLButtonElement['onclick'] | undefined
    >();
    expectTypeOf(render).returns.toEqualTypeOf<TemplateResult>();
    expectTypeOf<ClickEvent>().toMatchTypeOf<PointerEvent>();
    expectTypeOf<ClickEvent['preventBaseUIHandler']>().toBeFunction();
    expectTypeOf<ClickEvent['baseUIHandlerPrevented']>().toEqualTypeOf<boolean | undefined>();
    expectTypeOf<ChangeDetails['reason']>().toEqualTypeOf<'input-blur'>();
    expectTypeOf<ChangeDetails['event']>().toEqualTypeOf<FocusEvent>();
    expectTypeOf<ChangeDetails['value']>().toEqualTypeOf<string>();
    expectTypeOf<ChangeDetails['trigger']>().toEqualTypeOf<Element | undefined>();
    expectTypeOf<GenericDetails['reason']>().toEqualTypeOf<'keyboard'>();
    expectTypeOf<GenericDetails['event']>().toEqualTypeOf<KeyboardEvent>();
    expectTypeOf<GenericDetails['active']>().toEqualTypeOf<boolean>();
  });
});
