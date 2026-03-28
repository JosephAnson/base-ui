import { html, nothing, render as renderTemplate } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import {
  Fieldset,
  FieldsetLegendElement,
  FieldsetRootElement,
  type FieldsetLegend,
  type FieldsetLegendProps,
  type FieldsetLegendState,
  type FieldsetRoot,
  type FieldsetRootProps,
  type FieldsetRootState,
} from './index';

describe('fieldset', () => {
  const containers = new Set<HTMLDivElement>();

  afterEach(() => {
    containers.forEach((container) => {
      renderTemplate(nothing, container);
      container.remove();
    });
    containers.clear();
    vi.restoreAllMocks();
  });

  function render(result: ReturnType<typeof html>) {
    const container = document.createElement('div');
    document.body.append(container);
    containers.add(container);
    renderTemplate(result, container);
    return container;
  }

  async function waitForUpdate() {
    await flushTimers(4);
  }

  function flushTimers(count: number) {
    return Array.from({ length: count }).reduce<Promise<void>>((promise) => {
      return promise.then(
        () =>
          new Promise<void>((resolve) => {
            setTimeout(resolve, 0);
          }),
      );
    }, Promise.resolve());
  }

  function getRoot(view: HTMLElement) {
    return view.querySelector('fieldset-root') as FieldsetRootElement;
  }

  function getLegend(view: HTMLElement) {
    return view.querySelector('fieldset-legend') as HTMLElement;
  }

  it('exposes runtime parts and namespace aliases', () => {
    expect(Fieldset.Root).toBe(FieldsetRootElement);
    expect(Fieldset.Legend).toBe(FieldsetLegendElement);
    expectTypeOf<FieldsetRootProps>().toEqualTypeOf<FieldsetRoot.Props>();
    expectTypeOf<FieldsetRootState>().toEqualTypeOf<FieldsetRoot.State>();
    expectTypeOf<FieldsetLegendProps>().toEqualTypeOf<FieldsetLegend.Props>();
    expectTypeOf<FieldsetLegendState>().toEqualTypeOf<FieldsetLegend.State>();
  });

  it('renders fieldset-root as a custom element', async () => {
    const view = render(html`<fieldset-root></fieldset-root>`);
    await waitForUpdate();

    const root = getRoot(view);
    expect(root).toBeInTheDocument();
    expect(root).toHaveAttribute('data-base-ui-fieldset-root');
    expect(root).toHaveAttribute('data-base-ui-fieldset-context');
  });

  it('supports a static render template on the root', async () => {
    const view = render(html`
      <fieldset-root .render=${html`<fieldset data-testid="root"></fieldset>`}>
        <fieldset-legend>Legend</fieldset-legend>
      </fieldset-root>
    `);
    await waitForUpdate();

    const root = view.querySelector('[data-testid="root"]') as HTMLElement;
    expect(root).toHaveAttribute('aria-labelledby');
    expect(root.querySelector('fieldset-legend')).not.toBeNull();
  });

  it('sets aria-labelledby on the root automatically from legend', async () => {
    const view = render(html`
      <fieldset-root>
        <fieldset-legend>Legend text</fieldset-legend>
      </fieldset-root>
    `);
    await waitForUpdate();

    const root = getRoot(view);
    const legend = getLegend(view);

    expect(legend).toHaveAttribute('id');
    expect(root).toHaveAttribute('aria-labelledby', legend.id);
  });

  it('sets aria-labelledby with a custom legend id', async () => {
    const view = render(html`
      <fieldset-root>
        <fieldset-legend id="my-legend">Legend</fieldset-legend>
      </fieldset-root>
    `);
    await waitForUpdate();

    expect(getRoot(view)).toHaveAttribute('aria-labelledby', 'my-legend');
  });

  it('removes aria-labelledby when legend is removed', async () => {
    const view = render(html`
      <fieldset-root>
        <fieldset-legend>Legend</fieldset-legend>
      </fieldset-root>
    `);
    await waitForUpdate();

    const root = getRoot(view);
    expect(root).toHaveAttribute('aria-labelledby');

    getLegend(view).remove();
    await waitForUpdate();

    expect(root).not.toHaveAttribute('aria-labelledby');
  });

  it('propagates disabled state to the legend', async () => {
    const view = render(html`
      <fieldset-root .disabled=${true}>
        <fieldset-legend>Legend</fieldset-legend>
      </fieldset-root>
    `);
    await waitForUpdate();

    const root = getRoot(view);
    const legend = getLegend(view);

    expect(root).toHaveAttribute('data-disabled');
    expect(legend).toHaveAttribute('data-disabled');
  });

  it('supports a render function on the legend', async () => {
    let receivedState: Record<string, unknown> | null = null;

    const view = render(html`
      <fieldset-root .disabled=${true}>
        <fieldset-legend
          .render=${(_: Record<string, unknown>, state: Record<string, unknown>) => {
            receivedState = state;
            return html`<div data-testid="legend"></div>`;
          }}
        >
          Legend
        </fieldset-legend>
      </fieldset-root>
    `);
    await waitForUpdate();

    expect(receivedState).toEqual(expect.objectContaining({ disabled: true }));
    expect(view.querySelector('[data-testid="legend"]')).toHaveAttribute('data-disabled');
    expect(view.querySelector('[data-testid="legend"]')?.textContent?.trim()).toBe('Legend');
  });

  it('does not set data-disabled when disabled is false', async () => {
    const view = render(html`
      <fieldset-root>
        <fieldset-legend>Legend</fieldset-legend>
      </fieldset-root>
    `);
    await waitForUpdate();

    const root = getRoot(view);
    const legend = getLegend(view);

    expect(root).not.toHaveAttribute('data-disabled');
    expect(legend).not.toHaveAttribute('data-disabled');
  });

  it('logs error when legend is used outside fieldset-root', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(html`<fieldset-legend>Orphan</fieldset-legend>`);
    await waitForUpdate();

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Fieldset parts must be placed within'),
    );

    errorSpy.mockRestore();
  });

  it('associates nested fieldsets with their nearest legends', async () => {
    const view = render(html`
      <fieldset-root>
        <fieldset-root>
          <fieldset-legend id="inner-legend">Inner</fieldset-legend>
        </fieldset-root>
        <fieldset-legend id="outer-legend">Outer</fieldset-legend>
      </fieldset-root>
    `);
    await waitForUpdate();

    const roots = view.querySelectorAll('fieldset-root');
    expect(roots[0]).toHaveAttribute('aria-labelledby', 'outer-legend');
    expect(roots[1]).toHaveAttribute('aria-labelledby', 'inner-legend');
  });
});
