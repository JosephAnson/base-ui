/* eslint-disable testing-library/render-result-naming-convention */
import { html, nothing, render as renderTemplate, type TemplateResult } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, expectTypeOf, it } from 'vitest';
import { Fieldset } from '@base-ui/lit/fieldset';
import type {
  FieldsetLegendProps,
  FieldsetLegendState,
  FieldsetRootProps,
  FieldsetRootState,
} from '@base-ui/lit/fieldset';

describe('Fieldset', () => {
  const containers = new Set<HTMLDivElement>();

  afterEach(() => {
    containers.forEach((container) => {
      renderTemplate(nothing, container);
      container.remove();
    });
    containers.clear();
  });

  function render(result: TemplateResult) {
    const container = document.createElement('div');
    document.body.append(container);
    containers.add(container);

    renderTemplate(result, container);
    return container;
  }

  async function flushMicrotasks(iterations = 6) {
    await Array.from({ length: iterations }).reduce<Promise<void>>((promise) => {
      return promise.then(() => Promise.resolve());
    }, Promise.resolve());
  }

  it('preserves the public type contracts', () => {
    const root = Fieldset.Root({});
    const legend = Fieldset.Legend({});

    expectTypeOf(root).toEqualTypeOf<TemplateResult>();
    expectTypeOf(legend).toEqualTypeOf<TemplateResult>();
    expectTypeOf<FieldsetRootProps['disabled']>().toEqualTypeOf<boolean | undefined>();
    expectTypeOf<FieldsetRootState['disabled']>().toEqualTypeOf<boolean>();
    expectTypeOf<FieldsetLegendProps['id']>().toEqualTypeOf<string | undefined>();
    expectTypeOf<FieldsetLegendState['disabled']>().toEqualTypeOf<boolean>();
  });

  it('sets aria-labelledby on the fieldset automatically', async () => {
    const container = render(
      Fieldset.Root({
        children: Fieldset.Legend({
          'data-testid': 'legend',
          children: 'Legend',
        }),
      }),
    );

    await flushMicrotasks();

    const fieldset = container.querySelector('fieldset');
    const legend = container.querySelector('[data-testid="legend"]');

    expect(legend).toHaveAttribute('id');
    expect(fieldset).toHaveAttribute('aria-labelledby', legend?.getAttribute('id') ?? '');
  });

  it('sets aria-labelledby with a custom legend id', async () => {
    const container = render(
      Fieldset.Root({
        children: Fieldset.Legend({
          id: 'legend-id',
        }),
      }),
    );

    await flushMicrotasks();

    expect(container.querySelector('fieldset')).toHaveAttribute('aria-labelledby', 'legend-id');
  });

  it('removes aria-labelledby when the legend unmounts', async () => {
    const container = render(
      Fieldset.Root({
        children: Fieldset.Legend({
          children: 'Legend',
        }),
      }),
    );

    await flushMicrotasks();

    renderTemplate(Fieldset.Root({}), container);
    await flushMicrotasks();

    expect(container.querySelector('fieldset')).not.toHaveAttribute('aria-labelledby');
  });

  it('preserves an explicit aria-labelledby override on the root', async () => {
    const container = render(
      Fieldset.Root({
        'aria-labelledby': 'external-label',
        children: Fieldset.Legend({
          id: 'legend-id',
          children: 'Legend',
        }),
      }),
    );

    await flushMicrotasks();

    expect(container.querySelector('fieldset')).toHaveAttribute(
      'aria-labelledby',
      'external-label',
    );
  });

  it('propagates disabled state to the legend', async () => {
    const container = render(
      Fieldset.Root({
        disabled: true,
        children: Fieldset.Legend({
          'data-testid': 'legend',
          children: 'Legend',
        }),
      }),
    );

    await flushMicrotasks();

    expect(container.querySelector('fieldset')).toHaveAttribute('data-disabled');
    expect(container.querySelector('[data-testid="legend"]')).toHaveAttribute('data-disabled');
  });

  it('supports render composition with a custom root', async () => {
    const container = render(
      Fieldset.Root({
        render: html`<div role="group"></div>`,
        children: Fieldset.Legend({
          'data-testid': 'legend',
          children: 'Legend',
        }),
      }),
    );

    await flushMicrotasks();

    const group = container.querySelector('[data-base-ui-fieldset-root]');
    const legend = container.querySelector('[data-testid="legend"]');

    expect(group).toHaveAttribute('aria-labelledby', legend?.getAttribute('id') ?? '');
  });

  it('associates nested fieldsets with their nearest legends', async () => {
    const container = render(
      Fieldset.Root({
        children: [
          Fieldset.Root({
            children: Fieldset.Legend({
              id: 'inner-legend',
              children: 'Inner legend',
            }),
          }),
          Fieldset.Legend({
            id: 'outer-legend',
            children: 'Outer legend',
          }),
        ],
      }),
    );

    await flushMicrotasks();

    const fieldsets = container.querySelectorAll('fieldset');

    expect(fieldsets[0]).toHaveAttribute('aria-labelledby', 'outer-legend');
    expect(fieldsets[1]).toHaveAttribute('aria-labelledby', 'inner-legend');
  });
});
