import { html, nothing, render as renderTemplate } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, expectTypeOf, it } from 'vitest';
import * as separatorModule from './index';

describe('separator-root', () => {
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
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });
  }

  it('exposes namespace aliases for props and state', () => {
    expect(customElements.get('separator-root')).toBe(separatorModule.SeparatorRootElement);
    expectTypeOf<
      import('./index').SeparatorRootProps
    >().toEqualTypeOf<separatorModule.SeparatorRoot.Props>();
    expectTypeOf<
      import('./index').SeparatorRootState
    >().toEqualTypeOf<separatorModule.SeparatorRoot.State>();
  });

  it('renders as a custom element in the DOM', () => {
    const view = render(html`<separator-root></separator-root>`);
    const element = view.querySelector('separator-root');
    expect(element).toBeInTheDocument();
    expect(element?.tagName.toLowerCase()).toBe('separator-root');
  });

  it('accepts class attribute for styling', () => {
    const view = render(html`<separator-root class="my-sep"></separator-root>`);
    const element = view.querySelector('separator-root');
    expect(element).toHaveClass('my-sep');
  });

  it('sets data-orientation attribute for CSS targeting', async () => {
    const view = render(html`<separator-root></separator-root>`);
    const element = view.querySelector('separator-root')!;
    await waitForUpdate();
    expect(element.dataset.orientation).toBe('horizontal');
  });

  it('has role="separator"', async () => {
    const view = render(html`<separator-root></separator-root>`);
    const element = view.querySelector('separator-root')!;
    await waitForUpdate();
    expect(element).toHaveAttribute('role', 'separator');
  });

  it('has aria-orientation="horizontal" by default', async () => {
    const view = render(html`<separator-root></separator-root>`);
    const element = view.querySelector('separator-root')!;
    await waitForUpdate();
    expect(element).toHaveAttribute('aria-orientation', 'horizontal');
  });

  it('applies vertical orientation', async () => {
    const view = render(html`<separator-root orientation="vertical"></separator-root>`);
    const element = view.querySelector('separator-root')!;
    await waitForUpdate();
    expect(element).toHaveAttribute('aria-orientation', 'vertical');
    expect(element.dataset.orientation).toBe('vertical');
  });

  it('updates when orientation property changes', async () => {
    const view = render(html`<separator-root></separator-root>`);
    const element = view.querySelector('separator-root')! as separatorModule.SeparatorRootElement;
    await waitForUpdate();

    expect(element).toHaveAttribute('aria-orientation', 'horizontal');

    element.orientation = 'vertical';
    await waitForUpdate();

    expect(element).toHaveAttribute('aria-orientation', 'vertical');
    expect(element.dataset.orientation).toBe('vertical');
  });

  it('forwards standard HTML attributes', () => {
    const view = render(html`<separator-root id="sep-1" data-testid="my-sep"></separator-root>`);
    const element = view.querySelector('separator-root')!;
    expect(element).toHaveAttribute('id', 'sep-1');
    expect(element).toHaveAttribute('data-testid', 'my-sep');
  });

  it('supports a TemplateResult render prop', async () => {
    const view = render(
      html`<separator-root .render=${html`<div class="custom-separator"></div>`}></separator-root>`,
    );
    const host = view.querySelector('separator-root')!;
    await waitForUpdate();

    const element = host.querySelector('.custom-separator');
    expect(host).toHaveStyle({ display: 'contents' });
    expect(element).toHaveAttribute('role', 'separator');
    expect(element).toHaveAttribute('aria-orientation', 'horizontal');
    expect(element).toHaveAttribute('data-orientation', 'horizontal');
  });

  it('supports a render function', async () => {
    const view = render(
      html`<separator-root
        orientation="vertical"
        .render=${(_props: unknown, state: { orientation: string }) =>
          html`<div data-state-orientation=${state.orientation}></div>`}
      ></separator-root>`,
    );
    const host = view.querySelector('separator-root')!;
    await waitForUpdate();

    const element = host.querySelector('[data-state-orientation="vertical"]');
    expect(element).toHaveAttribute('role', 'separator');
    expect(element).toHaveAttribute('aria-orientation', 'vertical');
    expect(element).toHaveAttribute('data-orientation', 'vertical');
  });
});
