/* eslint-disable testing-library/render-result-naming-convention */
import { html, nothing, render as renderTemplate, type TemplateResult } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import type {
  RadioIndicatorProps,
  RadioIndicatorState,
  RadioRootProps,
  RadioRootState,
} from '@base-ui/lit/radio';
import { Radio } from '@base-ui/lit/radio';
import { RadioGroup } from '@base-ui/lit/radio-group';

describe('Radio', () => {
  const containers = new Set<HTMLDivElement>();

  afterEach(() => {
    containers.forEach((container) => {
      renderTemplate(nothing, container);
      container.remove();
    });
    containers.clear();
    vi.restoreAllMocks();
    (
      globalThis as typeof globalThis & {
        BASE_UI_ANIMATIONS_DISABLED?: boolean | undefined;
      }
    ).BASE_UI_ANIMATIONS_DISABLED = true;
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

  function getRadio(container: HTMLElement, testId = 'radio') {
    return container.querySelector(`[data-testid="${testId}"]`) as HTMLElement;
  }

  it('preserves the public type contracts', () => {
    const radioRoot = Radio.Root({ value: 'a' });
    const radioIndicator = Radio.Indicator({});

    expectTypeOf(radioRoot).toEqualTypeOf<TemplateResult>();
    expectTypeOf(radioIndicator).toEqualTypeOf<TemplateResult>();
    expectTypeOf<RadioRootProps['disabled']>().toEqualTypeOf<boolean | undefined>();
    expectTypeOf<RadioRootState['checked']>().toEqualTypeOf<boolean>();
    expectTypeOf<RadioIndicatorProps['keepMounted']>().toEqualTypeOf<boolean | undefined>();
    expectTypeOf<RadioIndicatorState['transitionStatus']>().toEqualTypeOf<
      'starting' | 'ending' | undefined
    >();
  });

  it('does not forward the value prop to the rendered root', async () => {
    const container = render(
      RadioGroup({
        children: [Radio.Root({ value: 'test', 'data-testid': 'radio' })],
      }),
    );
    await flushUpdates();

    expect(getRadio(container)).not.toHaveAttribute('value');
  });

  it('allows null values inside a group', async () => {
    const container = render(
      RadioGroup({
        children: [
          Radio.Root({ value: null, 'data-testid': 'radio-null' }),
          Radio.Root({ value: 'a', 'data-testid': 'radio-a' }),
        ],
      }),
    );
    await flushUpdates();

    let radioNull = getRadio(container, 'radio-null');
    let radioA = getRadio(container, 'radio-a');

    radioNull.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await flushUpdates();
    radioNull = getRadio(container, 'radio-null');
    radioA = getRadio(container, 'radio-a');
    expect(radioNull).toHaveAttribute('aria-checked', 'true');

    radioA.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await flushUpdates();
    radioNull = getRadio(container, 'radio-null');
    expect(radioNull).toHaveAttribute('aria-checked', 'false');
  });

  it('associates id with the native button', async () => {
    const container = render(
      html`<label data-testid="label" for="myRadio">A</label> ${RadioGroup({
          defaultValue: 'b',
          children: [
            Radio.Root({
              id: 'myRadio',
              nativeButton: true,
              render: html`<button data-testid="radio"></button>`,
              value: 'a',
            }),
            Radio.Root({ value: 'b' }),
          ],
        })}`,
    );
    await flushUpdates();

    const radio = getRadio(container);
    const hiddenInput = radio.nextElementSibling as HTMLInputElement | null;

    expect(radio).toHaveAttribute('id', 'myRadio');
    expect(hiddenInput?.tagName).toBe('INPUT');
    expect(hiddenInput).not.toHaveAttribute('id', 'myRadio');

    (container.querySelector('[data-testid="label"]') as HTMLLabelElement).click();
    await flushUpdates();

    const updatedRadio = getRadio(container);
    expect(updatedRadio).toHaveAttribute('aria-checked', 'true');
  });

  it('derives aria-labelledby from a sibling label associated with the hidden input', async () => {
    const container = render(
      html`<label for="radio-input">Label</label> ${RadioGroup({
          children: [Radio.Root({ id: 'radio-input', value: 'a', 'data-testid': 'radio' })],
        })}`,
    );
    await flushUpdates();

    const label = container.querySelector('label') as HTMLLabelElement;
    const radio = getRadio(container);

    expect(label.id).not.toBe('');
    expect(radio).toHaveAttribute('aria-labelledby', label.id);
  });

  it('uses aria-disabled instead of html disabled on the root', async () => {
    const container = render(
      RadioGroup({
        children: [Radio.Root({ disabled: true, value: 'a', 'data-testid': 'radio' })],
      }),
    );
    await flushUpdates();

    const radio = getRadio(container);
    const input = radio.nextElementSibling as HTMLInputElement;

    expect(radio).not.toHaveAttribute('disabled');
    expect(radio).toHaveAttribute('aria-disabled', 'true');
    expect(input).toHaveAttribute('disabled');
  });

  it('keeps the first enabled radio tabbable when a controlled value matches no item', async () => {
    const container = render(
      RadioGroup({
        children: [
          Radio.Root({ value: 'a', 'data-testid': 'radio-a' }),
          Radio.Root({ value: 'b', 'data-testid': 'radio-b' }),
        ],
        value: 'missing',
      }),
    );
    await flushUpdates(8);

    const radioA = getRadio(container, 'radio-a');
    const radioB = getRadio(container, 'radio-b');

    expect(radioA).toHaveAttribute('tabindex', '0');
    expect(radioB).toHaveAttribute('tabindex', '-1');

    await flushUpdates(8);

    expect(radioA).toHaveAttribute('tabindex', '0');
    expect(radioB).toHaveAttribute('tabindex', '-1');
  });

  it('mounts and unmounts the indicator with keepMounted support', async () => {
    const container = render(
      RadioGroup({
        children: [
          Radio.Root({
            value: 'a',
            'data-testid': 'radio-a',
            children: Radio.Indicator({ 'data-testid': 'indicator-a' }),
          }),
          Radio.Root({
            value: 'b',
            'data-testid': 'radio-b',
            children: Radio.Indicator({ keepMounted: true, 'data-testid': 'indicator-b' }),
          }),
        ],
      }),
    );
    await flushUpdates();

    const radioA = getRadio(container, 'radio-a');
    const radioB = getRadio(container, 'radio-b');

    expect(container.querySelector('[data-testid="indicator-a"]')).toBe(null);
    expect(container.querySelector('[data-testid="indicator-b"]')).not.toBe(null);

    radioA.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await flushUpdates();

    expect(container.querySelector('[data-testid="indicator-a"]')).not.toBe(null);

    radioB.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await flushUpdates();

    expect(container.querySelector('[data-testid="indicator-a"]')).toBe(null);
    expect(container.querySelector('[data-testid="indicator-b"]')).not.toBe(null);
  });
});
