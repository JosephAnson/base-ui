import { html, nothing, render as renderTemplate } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import './index.ts';
import type { FieldsetRootElement } from './index.ts';

describe('fieldset', () => {
  const containers = new Set<HTMLDivElement>();

  afterEach(() => {
    containers.forEach((container) => {
      renderTemplate(nothing, container);
      container.remove();
    });
    containers.clear();
  });

  function render(result: ReturnType<typeof html>) {
    const container = document.createElement('div');
    document.body.append(container);
    containers.add(container);
    renderTemplate(result, container);
    return container;
  }

  async function waitForUpdate() {
    for (let i = 0; i < 4; i++) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  function getRoot(container: HTMLElement) {
    return container.querySelector('fieldset-root') as FieldsetRootElement;
  }

  function getLegend(container: HTMLElement) {
    return container.querySelector('fieldset-legend') as HTMLElement;
  }

  it('renders fieldset-root as a custom element', async () => {
    const container = render(html`<fieldset-root></fieldset-root>`);
    await waitForUpdate();

    const root = getRoot(container);
    expect(root).toBeInTheDocument();
    expect(root).toHaveAttribute('data-base-ui-fieldset-root');
    expect(root).toHaveAttribute('data-base-ui-fieldset-context');
  });

  it('sets aria-labelledby on the root automatically from legend', async () => {
    const container = render(html`
      <fieldset-root>
        <fieldset-legend>Legend text</fieldset-legend>
      </fieldset-root>
    `);
    await waitForUpdate();

    const root = getRoot(container);
    const legend = getLegend(container);

    expect(legend).toHaveAttribute('id');
    expect(root).toHaveAttribute('aria-labelledby', legend.id);
  });

  it('sets aria-labelledby with a custom legend id', async () => {
    const container = render(html`
      <fieldset-root>
        <fieldset-legend id="my-legend">Legend</fieldset-legend>
      </fieldset-root>
    `);
    await waitForUpdate();

    const root = getRoot(container);
    expect(root).toHaveAttribute('aria-labelledby', 'my-legend');
  });

  it('removes aria-labelledby when legend is removed', async () => {
    const container = render(html`
      <fieldset-root>
        <fieldset-legend>Legend</fieldset-legend>
      </fieldset-root>
    `);
    await waitForUpdate();

    const root = getRoot(container);
    expect(root).toHaveAttribute('aria-labelledby');

    // Remove the legend
    const legend = getLegend(container);
    legend.remove();
    await waitForUpdate();

    expect(root).not.toHaveAttribute('aria-labelledby');
  });

  it('propagates disabled state to the legend', async () => {
    const container = render(html`
      <fieldset-root .disabled=${true}>
        <fieldset-legend>Legend</fieldset-legend>
      </fieldset-root>
    `);
    await waitForUpdate();

    const root = getRoot(container);
    const legend = getLegend(container);

    expect(root).toHaveAttribute('data-disabled');
    expect(legend).toHaveAttribute('data-disabled');
  });

  it('does not set data-disabled when disabled is false', async () => {
    const container = render(html`
      <fieldset-root>
        <fieldset-legend>Legend</fieldset-legend>
      </fieldset-root>
    `);
    await waitForUpdate();

    const root = getRoot(container);
    const legend = getLegend(container);

    expect(root).not.toHaveAttribute('data-disabled');
    expect(legend).not.toHaveAttribute('data-disabled');
  });

  it('logs error when legend is used outside fieldset-root', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(html`<fieldset-legend>Orphan</fieldset-legend>`);

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Fieldset parts must be placed within'),
    );

    errorSpy.mockRestore();
  });

  it('associates nested fieldsets with their nearest legends', async () => {
    const container = render(html`
      <fieldset-root>
        <fieldset-root>
          <fieldset-legend id="inner-legend">Inner</fieldset-legend>
        </fieldset-root>
        <fieldset-legend id="outer-legend">Outer</fieldset-legend>
      </fieldset-root>
    `);
    await waitForUpdate();

    const roots = container.querySelectorAll('fieldset-root');
    // roots[0] is the outer, roots[1] is the inner
    expect(roots[0]).toHaveAttribute('aria-labelledby', 'outer-legend');
    expect(roots[1]).toHaveAttribute('aria-labelledby', 'inner-legend');
  });
});
