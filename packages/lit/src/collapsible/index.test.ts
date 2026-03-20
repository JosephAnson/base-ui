import { html, nothing, render as renderTemplate } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import './index.ts';
import type { CollapsibleRootElement, CollapsibleChangeEventDetails } from './index.ts';

describe('collapsible', () => {
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
    for (let i = 0; i < 6; i++) {
      await new Promise((r) => setTimeout(r, 0));
    }
    await new Promise<void>((r) => requestAnimationFrame(() => r()));
    for (let i = 0; i < 6; i++) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  function getRoot(container: HTMLElement) {
    return container.querySelector('collapsible-root') as CollapsibleRootElement;
  }

  function getTrigger(container: HTMLElement) {
    return container.querySelector('collapsible-trigger') as HTMLElement;
  }

  function getPanel(container: HTMLElement) {
    return container.querySelector('collapsible-panel') as HTMLElement;
  }

  it('renders collapsible-root as a custom element', async () => {
    const container = render(html`
      <collapsible-root>
        <collapsible-trigger>Toggle</collapsible-trigger>
        <collapsible-panel>Content</collapsible-panel>
      </collapsible-root>
    `);
    await waitForUpdate();

    const root = getRoot(container);
    expect(root).toBeInTheDocument();
    expect(root).toHaveAttribute('data-base-ui-collapsible-root');
  });

  it('wires ARIA attributes and toggles open on trigger click', async () => {
    const container = render(html`
      <collapsible-root>
        <collapsible-trigger>Toggle</collapsible-trigger>
        <collapsible-panel>Content</collapsible-panel>
      </collapsible-root>
    `);
    await waitForUpdate();

    const trigger = getTrigger(container);
    const panel = getPanel(container);

    // Initially closed
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).not.toHaveAttribute('aria-controls');
    expect(panel).toHaveAttribute('hidden');

    // Click to open
    trigger.click();
    await waitForUpdate();

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(trigger).toHaveAttribute('aria-controls', panel.id);
    expect(trigger).toHaveAttribute('data-panel-open');
    expect(panel).not.toHaveAttribute('hidden');
    expect(panel).toHaveAttribute('data-open');

    // Click to close
    trigger.click();
    await waitForUpdate();

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).not.toHaveAttribute('aria-controls');
    expect(panel).toHaveAttribute('hidden');
  });

  it('supports controlled open state', async () => {
    const container = render(html``);

    function rerender(open: boolean) {
      renderTemplate(
        html`
          <collapsible-root .open=${open}>
            <collapsible-trigger>Toggle</collapsible-trigger>
            <collapsible-panel>Content</collapsible-panel>
          </collapsible-root>
        `,
        container,
      );
    }

    rerender(false);
    await waitForUpdate();

    expect(getTrigger(container)).toHaveAttribute('aria-expanded', 'false');
    expect(getPanel(container)).toHaveAttribute('hidden');

    rerender(true);
    await waitForUpdate();

    expect(getTrigger(container)).toHaveAttribute('aria-expanded', 'true');
    expect(getPanel(container)).not.toHaveAttribute('hidden');

    rerender(false);
    await waitForUpdate();

    expect(getTrigger(container)).toHaveAttribute('aria-expanded', 'false');
    expect(getPanel(container)).toHaveAttribute('hidden');
  });

  it('calls onOpenChange with event details', async () => {
    const handleOpenChange = vi.fn();
    const container = render(html`
      <collapsible-root .onOpenChange=${handleOpenChange}>
        <collapsible-trigger>Toggle</collapsible-trigger>
        <collapsible-panel>Content</collapsible-panel>
      </collapsible-root>
    `);
    await waitForUpdate();

    getTrigger(container).click();
    await waitForUpdate();

    expect(handleOpenChange).toHaveBeenCalledTimes(1);
    expect(handleOpenChange.mock.calls[0]?.[0]).toBe(true);
    const details = handleOpenChange.mock.calls[0]?.[1] as CollapsibleChangeEventDetails;
    expect(details.reason).toBe('trigger-press');
    expect(details.event).toBeInstanceOf(MouseEvent);
  });

  it('supports cancellation in onOpenChange', async () => {
    const handleOpenChange = vi.fn(
      (_open: boolean, details: CollapsibleChangeEventDetails) => {
        details.cancel();
      },
    );
    const container = render(html`
      <collapsible-root .onOpenChange=${handleOpenChange}>
        <collapsible-trigger>Toggle</collapsible-trigger>
        <collapsible-panel>Content</collapsible-panel>
      </collapsible-root>
    `);
    await waitForUpdate();

    getTrigger(container).click();
    await waitForUpdate();

    expect(handleOpenChange).toHaveBeenCalledTimes(1);
    // Open was cancelled - should remain closed
    expect(getPanel(container)).toHaveAttribute('hidden');
    expect(getTrigger(container)).toHaveAttribute('aria-expanded', 'false');
  });

  it('applies disabled state and prevents toggle', async () => {
    const container = render(html`
      <collapsible-root .defaultOpen=${true} .disabled=${true}>
        <collapsible-trigger>Toggle</collapsible-trigger>
        <collapsible-panel>Content</collapsible-panel>
      </collapsible-root>
    `);
    await waitForUpdate();

    const root = getRoot(container);
    const trigger = getTrigger(container);
    const panel = getPanel(container);

    expect(root).toHaveAttribute('data-disabled');
    expect(trigger).toHaveAttribute('data-disabled');
    expect(trigger).toHaveAttribute('aria-disabled', 'true');
    expect(panel).toHaveAttribute('data-disabled');

    // Click should not toggle because disabled
    trigger.click();
    await waitForUpdate();

    // Should still be open (disabled prevents toggle)
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(panel).toHaveAttribute('data-open');
  });

  it('supports keyboard activation with Enter and Space', async () => {
    const container = render(html`
      <collapsible-root>
        <collapsible-trigger>Toggle</collapsible-trigger>
        <collapsible-panel>Content</collapsible-panel>
      </collapsible-root>
    `);
    await waitForUpdate();

    const trigger = getTrigger(container);

    // Enter opens
    trigger.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter' }),
    );
    await waitForUpdate();
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    // Space closes
    trigger.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: ' ' }),
    );
    await waitForUpdate();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('keeps panel mounted when keepMounted is set', async () => {
    const container = render(html`
      <collapsible-root>
        <collapsible-trigger>Toggle</collapsible-trigger>
        <collapsible-panel .keepMounted=${true}>Content</collapsible-panel>
      </collapsible-root>
    `);
    await waitForUpdate();

    const trigger = getTrigger(container);
    const panel = getPanel(container);

    // Closed but still in DOM with hidden
    expect(panel).toBeInTheDocument();
    expect(panel).toHaveAttribute('hidden');
    expect(panel).toHaveAttribute('data-closed');

    // Open
    trigger.click();
    await waitForUpdate();
    expect(panel).not.toHaveAttribute('hidden');
    expect(panel).toHaveAttribute('data-open');

    // Close — still in DOM
    trigger.click();
    await waitForUpdate();
    expect(panel).toBeInTheDocument();
    expect(panel).toHaveAttribute('hidden');
    expect(panel).toHaveAttribute('data-closed');
  });

  it('supports hiddenUntilFound', async () => {
    const container = render(html`
      <collapsible-root>
        <collapsible-trigger>Toggle</collapsible-trigger>
        <collapsible-panel .hiddenUntilFound=${true}>Content</collapsible-panel>
      </collapsible-root>
    `);
    await waitForUpdate();

    const panel = getPanel(container);
    expect(panel).toHaveAttribute('hidden', 'until-found');
  });

  it('opens on beforematch event with hiddenUntilFound', async () => {
    const handleOpenChange = vi.fn();
    const container = render(html`
      <collapsible-root .onOpenChange=${handleOpenChange}>
        <collapsible-trigger>Toggle</collapsible-trigger>
        <collapsible-panel .hiddenUntilFound=${true}>Content</collapsible-panel>
      </collapsible-root>
    `);
    await waitForUpdate();

    // Simulate browser find-in-page triggering beforematch
    // The panel should tell the root to open
    // Since beforematch is not natively supported in jsdom, we simulate
    // the behavior that would happen: root.toggle(true, event, 'none')
    const root = getRoot(container);
    root.toggle(true, new Event('beforematch'), 'none');
    await waitForUpdate();

    expect(handleOpenChange).toHaveBeenCalledTimes(1);
    expect(handleOpenChange.mock.calls[0]?.[0]).toBe(true);
    expect(getPanel(container)).not.toHaveAttribute('hidden');
  });

  it('wires aria-controls with panel id', async () => {
    const container = render(html`
      <collapsible-root .defaultOpen=${true}>
        <collapsible-trigger>Toggle</collapsible-trigger>
        <collapsible-panel id="my-panel">Content</collapsible-panel>
      </collapsible-root>
    `);
    await waitForUpdate();

    const trigger = getTrigger(container);
    expect(trigger).toHaveAttribute('aria-controls', 'my-panel');
    expect(getPanel(container)).toHaveAttribute('id', 'my-panel');
  });

  it('logs error when parts are used outside root', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(html`<collapsible-trigger>Orphan</collapsible-trigger>`);

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Collapsible parts must be placed within'),
    );

    errorSpy.mockRestore();
  });

  it('starts closed by default and opens with defaultOpen', async () => {
    const closedContainer = render(html`
      <collapsible-root>
        <collapsible-trigger>Toggle</collapsible-trigger>
        <collapsible-panel>Content</collapsible-panel>
      </collapsible-root>
    `);
    await waitForUpdate();

    expect(getRoot(closedContainer)).toHaveAttribute('data-closed');

    const openContainer = render(html`
      <collapsible-root .defaultOpen=${true}>
        <collapsible-trigger>Toggle</collapsible-trigger>
        <collapsible-panel>Content</collapsible-panel>
      </collapsible-root>
    `);
    await waitForUpdate();

    expect(getRoot(openContainer)).toHaveAttribute('data-open');
    expect(getPanel(openContainer)).not.toHaveAttribute('hidden');
  });
});
