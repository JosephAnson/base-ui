import { html, nothing, render as renderTemplate } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import './index.ts';
import type { AlertDialogRootElement, AlertDialogChangeEventDetails } from './index.ts';

describe('alert-dialog', () => {
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

  function getPopup(container: HTMLElement) {
    return container.querySelector('alert-dialog-popup') as HTMLElement;
  }

  function getTrigger(container: HTMLElement) {
    return container.querySelector('alert-dialog-trigger') as HTMLElement;
  }

  function getBackdrop(container: HTMLElement) {
    return container.querySelector('alert-dialog-backdrop') as HTMLElement;
  }

  function getClose(container: HTMLElement) {
    return container.querySelector('alert-dialog-close') as HTMLElement;
  }

  function renderAlertDialog(rootProps: Record<string, unknown> = {}) {
    return html`
      <alert-dialog-root
        .defaultOpen=${rootProps.defaultOpen ?? false}
        .open=${rootProps.open}
        .onOpenChange=${rootProps.onOpenChange}
      >
        <alert-dialog-trigger>Open</alert-dialog-trigger>
        <alert-dialog-backdrop></alert-dialog-backdrop>
        <alert-dialog-popup>
          <alert-dialog-title>Discard draft?</alert-dialog-title>
          <alert-dialog-description>You can't undo this action.</alert-dialog-description>
          <alert-dialog-close>Discard</alert-dialog-close>
        </alert-dialog-popup>
      </alert-dialog-root>
    `;
  }

  it('renders alert-dialog-root as a custom element', async () => {
    const container = render(renderAlertDialog());
    await waitForUpdate();

    const root = container.querySelector('alert-dialog-root') as AlertDialogRootElement;
    expect(root).toBeInTheDocument();
    expect(root).toHaveAttribute('data-base-ui-alert-dialog-root');
  });

  it('uses role=alertdialog and aria-modal=true', async () => {
    const container = render(renderAlertDialog({ defaultOpen: true }));
    await waitForUpdate();

    const popup = getPopup(container);
    expect(popup).toHaveAttribute('role', 'alertdialog');
    expect(popup).toHaveAttribute('aria-modal', 'true');
  });

  it('wires aria-labelledby and aria-describedby', async () => {
    const container = render(renderAlertDialog({ defaultOpen: true }));
    await waitForUpdate();

    const popup = getPopup(container);
    const title = container.querySelector('alert-dialog-title') as HTMLElement;
    const description = container.querySelector('alert-dialog-description') as HTMLElement;

    expect(popup).toHaveAttribute('aria-labelledby', title.id);
    expect(popup).toHaveAttribute('aria-describedby', description.id);
  });

  it('opens through trigger and closes through close button', async () => {
    const container = render(renderAlertDialog());
    await waitForUpdate();

    const trigger = getTrigger(container);
    const popup = getPopup(container);

    // Initially closed
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(popup).toHaveAttribute('hidden');

    // Open
    trigger.click();
    await waitForUpdate();

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(popup).not.toHaveAttribute('hidden');
    expect(popup).toHaveAttribute('data-open');

    // Close via close button
    getClose(container).click();
    await waitForUpdate();

    expect(popup).toHaveAttribute('hidden');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('does NOT close on backdrop click', async () => {
    const handleOpenChange = vi.fn();
    const container = render(
      renderAlertDialog({ defaultOpen: true, onOpenChange: handleOpenChange }),
    );
    await waitForUpdate();
    handleOpenChange.mockClear();

    // Backdrop click should NOT dismiss
    getBackdrop(container).click();
    await waitForUpdate();

    expect(getPopup(container)).not.toHaveAttribute('hidden');
    expect(handleOpenChange).not.toHaveBeenCalled();
  });

  it('closes on Escape key', async () => {
    const handleOpenChange = vi.fn();
    const container = render(
      renderAlertDialog({ defaultOpen: true, onOpenChange: handleOpenChange }),
    );
    await waitForUpdate();
    handleOpenChange.mockClear();

    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    await waitForUpdate();

    expect(getPopup(container)).toHaveAttribute('hidden');
    expect(handleOpenChange).toHaveBeenCalledTimes(1);
    expect(handleOpenChange.mock.calls[0]?.[0]).toBe(false);
    expect(handleOpenChange.mock.calls[0]?.[1].reason).toBe('escape-key');
  });

  it('reports trigger-press and close-press reasons', async () => {
    const handleOpenChange = vi.fn();
    const container = render(renderAlertDialog({ onOpenChange: handleOpenChange }));
    await waitForUpdate();

    // Open
    getTrigger(container).click();
    await waitForUpdate();

    expect(handleOpenChange).toHaveBeenCalledTimes(1);
    expect(handleOpenChange.mock.calls[0]?.[1].reason).toBe('trigger-press');

    // Close
    getClose(container).click();
    await waitForUpdate();

    expect(handleOpenChange).toHaveBeenCalledTimes(2);
    expect(handleOpenChange.mock.calls[1]?.[1].reason).toBe('close-press');
  });

  it('supports cancellation in onOpenChange', async () => {
    const handleOpenChange = vi.fn(
      (_open: boolean, details: AlertDialogChangeEventDetails) => {
        details.cancel();
      },
    );
    const container = render(renderAlertDialog({ onOpenChange: handleOpenChange }));
    await waitForUpdate();

    getTrigger(container).click();
    await waitForUpdate();

    // Opening was cancelled
    expect(getPopup(container)).toHaveAttribute('hidden');
  });

  it('supports controlled open state', async () => {
    const container = render(html``);

    function rerender(open: boolean) {
      renderTemplate(
        html`
          <alert-dialog-root .open=${open}>
            <alert-dialog-popup>Content</alert-dialog-popup>
          </alert-dialog-root>
        `,
        container,
      );
    }

    rerender(false);
    await waitForUpdate();
    expect(getPopup(container)).toHaveAttribute('hidden');

    rerender(true);
    await waitForUpdate();
    expect(getPopup(container)).not.toHaveAttribute('hidden');

    rerender(false);
    await waitForUpdate();
    expect(getPopup(container)).toHaveAttribute('hidden');
  });

  it('backdrop has role=presentation and no dismiss behavior', async () => {
    const container = render(renderAlertDialog({ defaultOpen: true }));
    await waitForUpdate();

    const backdrop = getBackdrop(container);
    expect(backdrop).toHaveAttribute('role', 'presentation');
    expect(backdrop).not.toHaveAttribute('hidden');
    expect(backdrop).toHaveAttribute('data-open');
  });

  it('wires aria-haspopup on trigger', async () => {
    const container = render(renderAlertDialog());
    await waitForUpdate();

    expect(getTrigger(container)).toHaveAttribute('aria-haspopup', 'dialog');
  });

  it('logs error when parts are used outside root', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(html`<alert-dialog-trigger>Orphan</alert-dialog-trigger>`);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('AlertDialog parts must be placed within'),
    );

    errorSpy.mockRestore();
  });
});
