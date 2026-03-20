/* eslint-disable testing-library/render-result-naming-convention */
import { html, nothing, render as renderTemplate, type TemplateResult } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import { Checkbox } from '@base-ui/lit/checkbox';
import type {
  FieldControlProps,
  FieldRootProps,
  FieldValidityState,
} from '@base-ui/lit/field';
import { Field } from '@base-ui/lit/field';
import { Fieldset } from '@base-ui/lit/fieldset';
import type { BaseUIChangeEventDetails } from '@base-ui/lit/types';

describe('Field', () => {
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

  async function flushMicrotasks(iterations = 6) {
    for (let index = 0; index < iterations; index += 1) {
      await Promise.resolve();
    }
  }

  it('preserves the public type contracts', () => {
    const root = Field.Root({});
    const label = Field.Label({});
    const control = Field.Control({});
    const description = Field.Description({});
    const error = Field.Error({});
    const item = Field.Item({});
    const validity = Field.Validity({ children: () => html`` });

    expectTypeOf(root).toEqualTypeOf<TemplateResult>();
    expectTypeOf(label).toEqualTypeOf<TemplateResult>();
    expectTypeOf(control).toEqualTypeOf<TemplateResult>();
    expectTypeOf(description).toEqualTypeOf<TemplateResult>();
    expectTypeOf(error).toEqualTypeOf<TemplateResult>();
    expectTypeOf(item).toEqualTypeOf<TemplateResult>();
    expectTypeOf(validity).toEqualTypeOf<TemplateResult>();
    expectTypeOf<FieldControlProps['onValueChange']>().toEqualTypeOf<
      ((value: string, eventDetails: BaseUIChangeEventDetails<'none'>) => void) | undefined
    >();
    expectTypeOf<FieldRootProps['validationMode']>().toEqualTypeOf<
      'onSubmit' | 'onBlur' | 'onChange' | undefined
    >();
    expectTypeOf<FieldValidityState['transitionStatus']>().toEqualTypeOf<
      'starting' | 'ending' | undefined
    >();
  });

  it('links the label to the generated control id', async () => {
    const container = render(
      Field.Root({
        children: [Field.Control({}), Field.Label({ children: 'Name' })],
      }),
    );

    await flushMicrotasks();

    const label = container.querySelector('label') as HTMLLabelElement;
    const input = container.querySelector('input') as HTMLInputElement;

    expect(input.id).not.toBe('');
    expect(label).toHaveAttribute('for', input.id);
  });

  it('focuses the control when a non-native label is clicked', async () => {
    const container = render(
      Field.Root({
        children: [
          Field.Control({}),
          Field.Label({
            children: 'Name',
            nativeLabel: false,
            render: html`<div data-testid="label"></div>`,
          }),
        ],
      }),
    );

    await flushMicrotasks();

    const label = container.querySelector('[data-testid="label"]') as HTMLDivElement;
    const input = container.querySelector('input') as HTMLInputElement;

    label.click();
    await flushMicrotasks();

    expect(input).toHaveFocus();
  });

  it('applies aria-describedby from the description', async () => {
    const container = render(
      Field.Root({
        children: [Field.Control({}), Field.Description({ children: 'Visible on your profile' })],
      }),
    );

    await flushMicrotasks();

    const input = container.querySelector('input') as HTMLInputElement;
    const description = container.querySelector('p') as HTMLParagraphElement;

    expect(description.id).not.toBe('');
    expect(input).toHaveAttribute('aria-describedby', description.id);
  });

  it('shows the error content after submit validation and wires aria-describedby', async () => {
    const container = render(html`<form>
      ${Field.Root({
        validate: () => 'Required',
        children: [Field.Control({}), Field.Error({})],
      })}
    </form>`);

    await flushMicrotasks();

    const form = container.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await flushMicrotasks();

    const input = container.querySelector('input') as HTMLInputElement;
    const error = container.querySelector('div[data-invalid]') as HTMLDivElement | null;

    expect(error).not.toBe(null);
    expect(error).toHaveTextContent('Required');
    expect(error?.id).not.toBe('');
    expect(input).toHaveAttribute('aria-describedby', error?.id ?? '');
  });

  it('passes validity updates to the render callback', async () => {
    const handleValidity = vi.fn<(state: FieldValidityState) => TemplateResult>(() => html``);
    const container = render(
      Field.Root({
        validationMode: 'onBlur',
        validate: () => ['one', 'two'],
        children: [Field.Control({}), Field.Validity({ children: handleValidity })],
      }),
    );

    await flushMicrotasks();

    const input = container.querySelector('input') as HTMLInputElement;
    input.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
    input.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    await flushMicrotasks();

    expect(handleValidity).toHaveBeenCalled();
    const latestValidity = handleValidity.mock.lastCall?.[0];

    expect(latestValidity?.error).toBe('one');
    expect(latestValidity?.errors).toEqual(['one', 'two']);
    expect(latestValidity).toHaveProperty('transitionStatus');
  });

  it('blocks checkbox interaction inside a disabled item', async () => {
    const container = render(
      Field.Root({
        children: [
          Field.Item({
            disabled: true,
            children: Checkbox.Root({ 'data-testid': 'blocked' }),
          }),
          Field.Item({
            children: Checkbox.Root({ 'data-testid': 'allowed' }),
          }),
        ],
      }),
    );

    await flushMicrotasks();

    const blocked = container.querySelector('[data-testid="blocked"]') as HTMLElement;
    const allowed = container.querySelector('[data-testid="allowed"]') as HTMLElement;

    blocked.click();
    await flushMicrotasks();
    expect(blocked).toHaveAttribute('aria-checked', 'false');

    allowed.click();
    await flushMicrotasks();
    expect(allowed).toHaveAttribute('aria-checked', 'true');
  });

  it('inherits disabled state from a surrounding fieldset', async () => {
    const container = render(
      Fieldset.Root({
        disabled: true,
        children: Field.Root({
          'data-testid': 'field',
          children: [Field.Control({})],
        }),
      }),
    );

    await flushMicrotasks();

    expect(container.querySelector('[data-testid="field"]')).toHaveAttribute('data-disabled');
  });
});
