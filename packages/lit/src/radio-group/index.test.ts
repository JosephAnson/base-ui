/* eslint-disable testing-library/render-result-naming-convention */
import { html, nothing, render as renderTemplate, type TemplateResult } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import { Fieldset } from '@base-ui/lit/fieldset';
import type { BaseUIChangeEventDetails } from '@base-ui/lit/types';
import type {
  RadioGroupChangeEventDetails,
  RadioGroupProps,
  RadioGroupState,
} from '@base-ui/lit/radio-group';
import { RadioGroup } from '@base-ui/lit/radio-group';
import { Radio } from '@base-ui/lit/radio';

describe('RadioGroup', () => {
  const containers = new Set<HTMLDivElement>();

  afterEach(() => {
    containers.forEach((container) => {
      renderTemplate(nothing, container);
      container.remove();
    });
    containers.clear();
    vi.restoreAllMocks();
  });

  function render(result: TemplateResult) {
    const container = document.createElement('div');
    document.body.append(container);
    containers.add(container);

    renderTemplate(result, container);
    return container;
  }

  async function flushMicrotasks(iterations = 4) {
    await Array.from({ length: iterations }).reduce<Promise<void>>((promise) => {
      return promise.then(() => Promise.resolve());
    }, Promise.resolve());
  }

  async function flushUpdates(iterations = 4) {
    await flushMicrotasks(iterations);
  }

  function click(element: Element) {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  }

  function getRadio(container: HTMLElement, testId: string) {
    return container.querySelector(`[data-testid="${testId}"]`) as HTMLElement;
  }

  it('preserves the public type contracts', () => {
    const radioGroup = RadioGroup({});

    expectTypeOf(radioGroup).toEqualTypeOf<TemplateResult>();
    expectTypeOf<RadioGroupProps['value']>().toEqualTypeOf<any>();
    expectTypeOf<RadioGroupProps['defaultValue']>().toEqualTypeOf<any>();
    expectTypeOf<RadioGroupProps['disabled']>().toEqualTypeOf<boolean | undefined>();
    expectTypeOf<RadioGroupProps['readOnly']>().toEqualTypeOf<boolean | undefined>();
    expectTypeOf<RadioGroupProps['required']>().toEqualTypeOf<boolean | undefined>();
    expectTypeOf<RadioGroupChangeEventDetails>().toEqualTypeOf<BaseUIChangeEventDetails<'none'>>();
    expectTypeOf<RadioGroupState['disabled']>().toEqualTypeOf<boolean>();
    expectTypeOf<RadioGroupState['dirty']>().toEqualTypeOf<boolean>();
    expectTypeOf<RadioGroupState['filled']>().toEqualTypeOf<boolean>();
    expectTypeOf<RadioGroupState['focused']>().toEqualTypeOf<boolean>();
    expectTypeOf<RadioGroupState['touched']>().toEqualTypeOf<boolean>();
    expectTypeOf<RadioGroupState['valid']>().toEqualTypeOf<boolean | null>();
  });

  it('labels the radio group from a surrounding fieldset legend', async () => {
    const container = render(
      Fieldset.Root({
        children: [
          Fieldset.Legend({
            'data-testid': 'legend',
            children: 'Legend',
          }),
          RadioGroup({
            children: [Radio.Root({ value: 'a', 'data-testid': 'a' })],
          }),
        ],
      }),
    );

    await flushUpdates();

    const group = container.querySelector('[role="radiogroup"]');
    const legend = container.querySelector('[data-testid="legend"]');

    expect(group).toHaveAttribute('aria-labelledby', legend?.getAttribute('id') ?? '');
  });

  it('controls child radios with value and onValueChange', async () => {
    let value = 'red';
    const handleValueChange = vi.fn(
      (nextValue: string, eventDetails: RadioGroupChangeEventDetails) => {
        value = nextValue;
        rerender();
        return { eventDetails, nextValue };
      },
    );
    const container = render(html``);

    function rerender() {
      renderTemplate(
        RadioGroup({
          onValueChange: handleValueChange,
          value,
          children: [
            Radio.Root({ value: 'red', 'data-testid': 'red' }),
            Radio.Root({ value: 'green', 'data-testid': 'green' }),
            Radio.Root({ value: 'blue', 'data-testid': 'blue' }),
          ],
        }),
        container,
      );
    }

    rerender();
    await flushUpdates();

    let red = getRadio(container, 'red');
    let green = getRadio(container, 'green');
    let blue = getRadio(container, 'blue');

    expect(red).toHaveAttribute('aria-checked', 'true');
    expect(green).toHaveAttribute('aria-checked', 'false');
    expect(blue).toHaveAttribute('aria-checked', 'false');

    click(green);
    await flushUpdates();

    red = getRadio(container, 'red');
    green = getRadio(container, 'green');
    blue = getRadio(container, 'blue');

    expect(handleValueChange).toHaveBeenCalledTimes(1);
    expect(handleValueChange.mock.calls[0]?.[0]).toBe('green');
    expect(handleValueChange.mock.results[0]?.value.eventDetails.reason).toBe('none');
    expect(red).toHaveAttribute('aria-checked', 'false');
    expect(green).toHaveAttribute('aria-checked', 'true');
    expect(blue).toHaveAttribute('aria-checked', 'false');
  });

  it('uses defaultValue for uncontrolled groups and loops focus with arrow keys', async () => {
    const container = render(
      RadioGroup({
        defaultValue: 'a',
        children: [
          Radio.Root({ value: 'a', 'data-testid': 'a' }),
          Radio.Root({ value: 'b', 'data-testid': 'b' }),
          Radio.Root({ value: 'c', 'data-testid': 'c' }),
        ],
      }),
    );
    await flushUpdates();

    let radioA = getRadio(container, 'a');
    let radioB = getRadio(container, 'b');
    let radioC = getRadio(container, 'c');

    expect(radioA).toHaveAttribute('tabindex', '0');
    expect(radioB).toHaveAttribute('tabindex', '-1');

    radioA.focus();
    radioA.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowRight' }),
    );
    await flushUpdates();
    radioA = getRadio(container, 'a');
    radioB = getRadio(container, 'b');
    radioC = getRadio(container, 'c');

    expect(radioB).toHaveFocus();
    expect(radioB).toHaveAttribute('aria-checked', 'true');
    expect(radioB).toHaveAttribute('tabindex', '0');

    radioB.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowLeft' }),
    );
    await flushUpdates();
    radioA = getRadio(container, 'a');
    radioB = getRadio(container, 'b');
    radioC = getRadio(container, 'c');

    expect(radioA).toHaveFocus();
    expect(radioA).toHaveAttribute('aria-checked', 'true');
    expect(radioA).toHaveAttribute('tabindex', '0');

    radioA.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowLeft' }),
    );
    await flushUpdates();
    radioA = getRadio(container, 'a');
    radioB = getRadio(container, 'b');
    radioC = getRadio(container, 'c');

    expect(radioC).toHaveFocus();
    expect(radioC).toHaveAttribute('aria-checked', 'true');
    expect(radioC).toHaveAttribute('tabindex', '0');
  });

  it('points inputRef to the checked input and keeps form submission native', async () => {
    const inputRef: { current: HTMLInputElement | null } = { current: null };
    const container = render(
      html`<form data-testid="form">
        ${RadioGroup({
          defaultValue: 'b',
          inputRef,
          name: 'fruit',
          children: [
            Radio.Root({ value: 'a', 'data-testid': 'a' }),
            Radio.Root({ value: 'b', 'data-testid': 'b' }),
          ],
        })}
      </form>`,
    );
    await flushUpdates();

    const radioA = getRadio(container, 'a');
    const radioB = getRadio(container, 'b');
    const inputB = radioB.nextElementSibling as HTMLInputElement;

    expect(inputRef.current).toBe(inputB);

    click(radioA);
    await flushUpdates();

    const updatedRadioA = getRadio(container, 'a');
    const updatedInputA = updatedRadioA.nextElementSibling as HTMLInputElement;
    expect(inputRef.current).toBe(updatedInputA);

    const form = container.querySelector('[data-testid="form"]') as HTMLFormElement;
    const formData = new FormData(form);
    expect(formData.get('fruit')).toBe('a');
  });

  it('does not submit a value when name is omitted', async () => {
    const container = render(
      html`<form data-testid="form">
        ${RadioGroup({
          defaultValue: 'b',
          children: [Radio.Root({ value: 'a' }), Radio.Root({ value: 'b' })],
        })}
      </form>`,
    );
    await flushUpdates();

    const form = container.querySelector('[data-testid="form"]') as HTMLFormElement;
    expect(
      Array.from(form.querySelectorAll<HTMLInputElement>('input[type="radio"]')).every(
        (input) => !input.name,
      ),
    ).toBe(true);
    const formData = new FormData(form);
    const entries: Array<[string, FormDataEntryValue]> = [];
    formData.forEach((value, key) => {
      entries.push([key, value]);
    });
    expect(formData.get('b')).toBe(null);
    expect(entries).toHaveLength(0);
  });

  it('treats null as a controlled cleared value instead of falling back to defaultValue', async () => {
    const container = render(
      html`<form data-testid="form">
        ${RadioGroup({
          defaultValue: 'b',
          name: 'fruit',
          value: null,
          children: [
            Radio.Root({ value: 'a', 'data-testid': 'a' }),
            Radio.Root({ value: 'b', 'data-testid': 'b' }),
          ],
        })}
      </form>`,
    );
    await flushUpdates();

    expect(getRadio(container, 'a')).toHaveAttribute('aria-checked', 'false');
    expect(getRadio(container, 'b')).toHaveAttribute('aria-checked', 'false');
    expect(
      container.querySelectorAll('input[type="radio"]:checked'),
    ).toHaveLength(0);
    expect(new FormData(container.querySelector('[data-testid="form"]') as HTMLFormElement).get('fruit')).toBe(
      null,
    );
  });

  it('rebinds object inputRef when the ref prop changes without changing the checked input', async () => {
    const refA: { current: HTMLInputElement | null } = { current: null };
    const refB: { current: HTMLInputElement | null } = { current: null };
    const container = render(html``);

    function rerender(inputRef: { current: HTMLInputElement | null }) {
      renderTemplate(
        RadioGroup({
          defaultValue: 'b',
          inputRef,
          children: [Radio.Root({ value: 'a' }), Radio.Root({ value: 'b', 'data-testid': 'b' })],
        }),
        container,
      );
    }

    rerender(refA);
    await flushUpdates();

    const inputB = getRadio(container, 'b').nextElementSibling as HTMLInputElement;
    expect(refA.current).toBe(inputB);

    rerender(refB);
    await flushUpdates();

    expect(refA.current).toBeNull();
    expect(refB.current?.value).toBe(inputB.value);
  });

  it('rebinds callback inputRef when the ref prop changes without changing the checked input', async () => {
    const inputRefA = vi.fn();
    const inputRefB = vi.fn();
    const container = render(html``);

    function rerender(inputRef: (input: HTMLInputElement | null) => void) {
      renderTemplate(
        RadioGroup({
          defaultValue: 'b',
          inputRef,
          children: [Radio.Root({ value: 'a' }), Radio.Root({ value: 'b', 'data-testid': 'b' })],
        }),
        container,
      );
    }

    rerender(inputRefA);
    await flushUpdates();

    const inputB = getRadio(container, 'b').nextElementSibling as HTMLInputElement;
    expect(inputRefA).toHaveBeenLastCalledWith(inputB);

    rerender(inputRefB);
    await flushUpdates();

    expect(inputRefA).toHaveBeenLastCalledWith(null);
    expect(inputRefB).toHaveBeenLastCalledWith(inputB);
  });

  it('updates sibling roving tabindex when a child radio becomes disabled after mount', async () => {
    const container = render(html``);

    function rerender(disabledA: boolean) {
      renderTemplate(
        RadioGroup({
          defaultValue: 'a',
          children: [
            Radio.Root({ disabled: disabledA, value: 'a', 'data-testid': 'a' }),
            Radio.Root({ value: 'b', 'data-testid': 'b' }),
          ],
        }),
        container,
      );
    }

    rerender(false);
    await flushUpdates();

    expect(getRadio(container, 'a')).toHaveAttribute('tabindex', '0');
    expect(getRadio(container, 'b')).toHaveAttribute('tabindex', '-1');

    rerender(true);
    await flushUpdates();

    expect(getRadio(container, 'a')).toHaveAttribute('aria-disabled', 'true');
    expect(getRadio(container, 'a')).toHaveAttribute('tabindex', '-1');
    expect(getRadio(container, 'b')).toHaveAttribute('tabindex', '0');
  });

  it('restores the previous selection when a controlled group rejects a new value', async () => {
    const handleValueChange = vi.fn();
    const container = render(
      html`<form data-testid="form">
        ${RadioGroup({
          name: 'fruit',
          onValueChange: handleValueChange,
          value: 'red',
          children: [
            Radio.Root({ value: 'red', 'data-testid': 'red' }),
            Radio.Root({ value: 'green', 'data-testid': 'green' }),
          ],
        })}
      </form>`,
    );
    await flushUpdates();

    click(getRadio(container, 'green'));
    await flushUpdates();

    const red = getRadio(container, 'red');
    const green = getRadio(container, 'green');
    const form = container.querySelector('[data-testid="form"]') as HTMLFormElement;

    expect(handleValueChange).toHaveBeenCalledTimes(1);
    expect(red).toHaveAttribute('aria-checked', 'true');
    expect(green).toHaveAttribute('aria-checked', 'false');
    expect(form.querySelectorAll('input[type="radio"]:checked')).toHaveLength(1);
    expect(new FormData(form).get('fruit')).toBe('red');
  });

  it('restores the previous selection when onValueChange is canceled', async () => {
    const handleValueChange = vi.fn(
      (_value: string, eventDetails: RadioGroupChangeEventDetails) => {
        eventDetails.cancel();
      },
    );
    const container = render(
      html`<form data-testid="form">
        ${RadioGroup({
          defaultValue: 'red',
          name: 'fruit',
          onValueChange: handleValueChange,
          children: [
            Radio.Root({ value: 'red', 'data-testid': 'red' }),
            Radio.Root({ value: 'green', 'data-testid': 'green' }),
          ],
        })}
      </form>`,
    );
    await flushUpdates();

    click(getRadio(container, 'green'));
    await flushUpdates();

    const red = getRadio(container, 'red');
    const green = getRadio(container, 'green');
    const form = container.querySelector('[data-testid="form"]') as HTMLFormElement;

    expect(handleValueChange).toHaveBeenCalledTimes(1);
    expect(red).toHaveAttribute('aria-checked', 'true');
    expect(green).toHaveAttribute('aria-checked', 'false');
    expect(form.querySelectorAll('input[type="radio"]:checked')).toHaveLength(1);
    expect(new FormData(form).get('fruit')).toBe('red');
  });

  it('does not restore stale pending focus after a rejected arrow key update is followed by an accepted one', async () => {
    let value = 'a';
    const container = render(html``);

    function rerender() {
      renderTemplate(
        RadioGroup({
          value,
          onValueChange(nextValue: string) {
            if (nextValue === 'c') {
              value = nextValue;
              rerender();
            }
          },
          children: [
            Radio.Root({ value: 'a', 'data-testid': 'a' }),
            Radio.Root({ value: 'b', 'data-testid': 'b' }),
            Radio.Root({ value: 'c', 'data-testid': 'c' }),
          ],
        }),
        container,
      );
    }

    rerender();
    await flushUpdates();

    const radioA = getRadio(container, 'a');
    radioA.focus();

    radioA.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowRight' }),
    );
    await flushUpdates();

    const radioB = getRadio(container, 'b');
    expect(radioB).toHaveFocus();
    expect(radioA).toHaveAttribute('aria-checked', 'true');

    radioB.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowRight' }),
    );
    await flushUpdates();

    const radioC = getRadio(container, 'c');
    expect(radioC).toHaveAttribute('aria-checked', 'true');
    expect(radioC).toHaveFocus();
  });

  it('publishes dirty, filled, focused, and touched state on the group root', async () => {
    const container = render(
      html`<div>
        ${RadioGroup({
          children: [
            Radio.Root({ value: 'a', 'data-testid': 'a' }),
            Radio.Root({ value: 'b', 'data-testid': 'b' }),
          ],
        })}
      </div>`,
    );
    await flushUpdates();

    const group = container.querySelector('[role="radiogroup"]') as HTMLElement;
    expect(group).not.toHaveAttribute('data-dirty');
    expect(group).not.toHaveAttribute('data-filled');
    expect(group).not.toHaveAttribute('data-focused');
    expect(group).not.toHaveAttribute('data-touched');

    const radioA = getRadio(container, 'a');
    radioA.focus();
    await flushUpdates();

    expect(group).toHaveAttribute('data-focused');
    expect(group).not.toHaveAttribute('data-touched');

    click(radioA);
    await flushUpdates();

    expect(group).toHaveAttribute('data-dirty');
    expect(group).toHaveAttribute('data-filled');
    radioA.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowRight' }),
    );
    await flushUpdates();

    expect(group).toHaveAttribute('data-touched');
  });

  it('derives valid state from validity attributes', async () => {
    const invalidContainer = render(
      RadioGroup({
        'aria-invalid': 'true',
        children: [Radio.Root({ value: 'a' })],
      }),
    );
    await flushUpdates();

    expect(invalidContainer.querySelector('[role="radiogroup"]')).toHaveAttribute('data-invalid');

    const validContainer = render(
      RadioGroup({
        'data-valid': '',
        children: [Radio.Root({ value: 'a' })],
      }),
    );
    await flushUpdates();

    expect(validContainer.querySelector('[role="radiogroup"]')).toHaveAttribute('data-valid');
  });

  it('keeps radios in different forms isolated when names match', async () => {
    const container = render(
      html`<div>
        <form data-testid="form-a">
          ${RadioGroup({
            defaultValue: 'red',
            name: 'fruit',
            children: [
              Radio.Root({ value: 'red', 'data-testid': 'form-a-red' }),
              Radio.Root({ value: 'green', 'data-testid': 'form-a-green' }),
            ],
          })}
        </form>
        <form data-testid="form-b">
          ${RadioGroup({
            defaultValue: 'blue',
            name: 'fruit',
            children: [
              Radio.Root({ value: 'blue', 'data-testid': 'form-b-blue' }),
              Radio.Root({ value: 'yellow', 'data-testid': 'form-b-yellow' }),
            ],
          })}
        </form>
      </div>`,
    );
    await flushUpdates();

    click(getRadio(container, 'form-a-green'));
    await flushUpdates();

    const formA = container.querySelector('[data-testid="form-a"]') as HTMLFormElement;
    const formB = container.querySelector('[data-testid="form-b"]') as HTMLFormElement;

    expect(new FormData(formA).get('fruit')).toBe('green');
    expect(new FormData(formB).get('fruit')).toBe('blue');
    expect(getRadio(container, 'form-b-blue')).toHaveAttribute('aria-checked', 'true');
    expect(getRadio(container, 'form-b-yellow')).toHaveAttribute('aria-checked', 'false');
  });
});
