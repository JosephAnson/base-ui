import { html, nothing, render as renderTemplate } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it } from 'vitest';
import './separator.ts';
import type { SeparatorRootElement } from './separator.ts';

describe('separator-root (Web Component POC)', () => {
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

  // ─── 1. Children Composition ──────────────────────────────────────────────

  it('renders as a custom element in the DOM', () => {
    const container = render(html`<separator-root></separator-root>`);
    const separator = container.querySelector('separator-root');
    expect(separator).toBeInTheDocument();
    expect(separator?.tagName.toLowerCase()).toBe('separator-root');
  });

  // ─── 2. Styling ──────────────────────────────────────────────────────────

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

  // ─── 3. Accessibility ────────────────────────────────────────────────────

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

  // ─── 5. Reactivity ───────────────────────────────────────────────────────

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

  // ─── 6. Standard HTML attributes ─────────────────────────────────────────

  it('forwards standard HTML attributes', () => {
    const container = render(
      html`<separator-root id="sep-1" data-testid="my-sep"></separator-root>`,
    );
    const separator = container.querySelector('separator-root')!;
    expect(separator).toHaveAttribute('id', 'sep-1');
    expect(separator).toHaveAttribute('data-testid', 'my-sep');
  });

  // ─── 7. as-child ───────────────────────────────────────────────────────────

  describe('as-child', () => {
    it('host becomes display:contents when as-child is set', async () => {
      const container = render(html`
        <separator-root as-child>
          <hr class="custom-sep" />
        </separator-root>
      `);
      await waitForUpdate();

      const host = container.querySelector('separator-root')! as HTMLElement;
      expect(host.style.display).toBe('contents');
    });

    it('forwards role and aria-orientation to the child element', async () => {
      const container = render(html`
        <separator-root as-child orientation="vertical">
          <hr class="custom-sep" />
        </separator-root>
      `);
      await waitForUpdate();

      const hr = container.querySelector('hr')!;
      expect(hr).toHaveAttribute('role', 'separator');
      expect(hr).toHaveAttribute('aria-orientation', 'vertical');
      expect(hr.dataset.orientation).toBe('vertical');
    });

    it('does not set role/aria on the host when as-child', async () => {
      const container = render(html`
        <separator-root as-child>
          <hr />
        </separator-root>
      `);
      await waitForUpdate();

      const host = container.querySelector('separator-root')!;
      expect(host).not.toHaveAttribute('role');
      expect(host).not.toHaveAttribute('aria-orientation');
    });

    it('child element gets data-orientation attribute', async () => {
      const container = render(html`
        <separator-root as-child>
          <hr />
        </separator-root>
      `);
      await waitForUpdate();

      const hr = container.querySelector('hr')!;
      expect(hr.dataset.orientation).toBe('horizontal');
    });

    it('reactivity works: orientation changes update the child', async () => {
      const container = render(html`
        <separator-root as-child>
          <hr />
        </separator-root>
      `);
      await waitForUpdate();

      const separator = container.querySelector('separator-root')! as SeparatorRootElement;
      const hr = container.querySelector('hr')!;

      expect(hr).toHaveAttribute('aria-orientation', 'horizontal');

      separator.orientation = 'vertical';
      await waitForUpdate();

      expect(hr).toHaveAttribute('aria-orientation', 'vertical');
      expect(hr.dataset.orientation).toBe('vertical');
    });

    it('child keeps its own classes and attributes', async () => {
      const container = render(html`
        <separator-root as-child>
          <hr class="my-hr" data-testid="sep" />
        </separator-root>
      `);
      await waitForUpdate();

      const hr = container.querySelector('hr')!;
      expect(hr).toHaveClass('my-hr');
      expect(hr).toHaveAttribute('data-testid', 'sep');
      expect(hr).toHaveAttribute('role', 'separator');
    });
  });
});
