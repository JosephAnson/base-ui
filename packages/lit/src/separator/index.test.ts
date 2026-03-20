import { html, nothing, render as renderTemplate } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it } from 'vitest';
import './index.ts';
import type { SeparatorRootElement } from './index.ts';

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
    await new Promise((r) => setTimeout(r, 0));
  }

  it('renders as a custom element in the DOM', () => {
    const container = render(html`<separator-root></separator-root>`);
    const separator = container.querySelector('separator-root');
    expect(separator).toBeInTheDocument();
    expect(separator?.tagName.toLowerCase()).toBe('separator-root');
  });

  it('accepts class attribute for styling', () => {
    const container = render(html`<separator-root class="my-sep"></separator-root>`);
    const separator = container.querySelector('separator-root');
    expect(separator).toHaveClass('my-sep');
  });

  it('sets data-orientation attribute for CSS targeting', async () => {
    const container = render(html`<separator-root></separator-root>`);
    const separator = container.querySelector('separator-root')!;
    await waitForUpdate();
    expect(separator.dataset.orientation).toBe('horizontal');
  });

  it('has role="separator"', async () => {
    const container = render(html`<separator-root></separator-root>`);
    const separator = container.querySelector('separator-root')!;
    await waitForUpdate();
    expect(separator).toHaveAttribute('role', 'separator');
  });

  it('has aria-orientation="horizontal" by default', async () => {
    const container = render(html`<separator-root></separator-root>`);
    const separator = container.querySelector('separator-root')!;
    await waitForUpdate();
    expect(separator).toHaveAttribute('aria-orientation', 'horizontal');
  });

  it('applies vertical orientation', async () => {
    const container = render(
      html`<separator-root orientation="vertical"></separator-root>`,
    );
    const separator = container.querySelector('separator-root')!;
    await waitForUpdate();
    expect(separator).toHaveAttribute('aria-orientation', 'vertical');
    expect(separator.dataset.orientation).toBe('vertical');
  });

  it('updates when orientation property changes', async () => {
    const container = render(html`<separator-root></separator-root>`);
    const separator = container.querySelector('separator-root')! as SeparatorRootElement;
    await waitForUpdate();

    expect(separator).toHaveAttribute('aria-orientation', 'horizontal');

    separator.orientation = 'vertical';
    await waitForUpdate();

    expect(separator).toHaveAttribute('aria-orientation', 'vertical');
    expect(separator.dataset.orientation).toBe('vertical');
  });

  it('forwards standard HTML attributes', () => {
    const container = render(
      html`<separator-root id="sep-1" data-testid="my-sep"></separator-root>`,
    );
    const separator = container.querySelector('separator-root')!;
    expect(separator).toHaveAttribute('id', 'sep-1');
    expect(separator).toHaveAttribute('data-testid', 'my-sep');
  });
});
