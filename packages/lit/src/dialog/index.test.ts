import { html, nothing, render as renderTemplate } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import './index.ts';
import type { DialogRootElement, DialogChangeEventDetails } from './index.ts';

describe('dialog', () => {
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
    return container.querySelector('dialog-root') as DialogRootElement;
  }

  function getTrigger(container: HTMLElement) {
    return container.querySelector('dialog-trigger') as HTMLElement;
  }

  function getPopup(container: HTMLElement) {
    return container.querySelector('dialog-popup') as HTMLElement;
  }

  function getBackdrop(container: HTMLElement) {
    return container.querySelector('dialog-backdrop') as HTMLElement;
  }

  function getClose(container: HTMLElement) {
    return container.querySelector('dialog-close') as HTMLElement;
  }

  function renderDialog(rootProps: Record<string, unknown> = {}) {
    return html`
      <dialog-root
        .modal=${rootProps.modal ?? true}
        .defaultOpen=${rootProps.defaultOpen ?? false}
        .open=${rootProps.open}
        .onOpenChange=${rootProps.onOpenChange}
        .disablePointerDismissal=${rootProps.disablePointerDismissal ?? false}
      >
        <dialog-trigger>Open</dialog-trigger>
        <dialog-portal>
          <dialog-backdrop></dialog-backdrop>
          <dialog-popup>
            <dialog-title>Title</dialog-title>
            <dialog-description>Description</dialog-description>
            <dialog-close>Close</dialog-close>
          </dialog-popup>
        </dialog-portal>
      </dialog-root>
    `;
  }

  it('renders dialog-root as a custom element', async () => {
    const container = render(renderDialog());
    await waitForUpdate();

    const root = getRoot(container);
    expect(root).toBeInTheDocument();
    expect(root).toHaveAttribute('data-base-ui-dialog-root');
  });

  it('opens through the trigger and closes through close button', async () => {
    const container = render(renderDialog());
    await waitForUpdate();

    const trigger = getTrigger(container);
    const popup = getPopup(container);

    // Initially closed
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(popup).toHaveAttribute('hidden');

    // Click trigger to open
    trigger.click();
    await waitForUpdate();

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(popup).not.toHaveAttribute('hidden');
    expect(popup).toHaveAttribute('role', 'dialog');
    expect(popup).toHaveAttribute('data-open');

    // Click close button
    getClose(container).click();
    await waitForUpdate();

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(popup).toHaveAttribute('hidden');
  });

  it('wires aria-modal for modal dialogs', async () => {
    const container = render(renderDialog({ defaultOpen: true }));
    await waitForUpdate();

    const popup = getPopup(container);
    expect(popup).toHaveAttribute('aria-modal', 'true');
  });

  it('does not set aria-modal for non-modal dialogs', async () => {
    const container = render(renderDialog({ defaultOpen: true, modal: false }));
    await waitForUpdate();

    const popup = getPopup(container);
    expect(popup).not.toHaveAttribute('aria-modal');
  });

  it('wires aria-labelledby and aria-describedby', async () => {
    const container = render(renderDialog({ defaultOpen: true }));
    await waitForUpdate();

    const popup = getPopup(container);
    const title = container.querySelector('dialog-title') as HTMLElement;
    const description = container.querySelector('dialog-description') as HTMLElement;

    expect(popup).toHaveAttribute('aria-labelledby', title.id);
    expect(popup).toHaveAttribute('aria-describedby', description.id);
  });

  it('closes on backdrop click', async () => {
    const container = render(renderDialog({ defaultOpen: true }));
    await waitForUpdate();

    const backdrop = getBackdrop(container);
    expect(backdrop).toHaveAttribute('role', 'presentation');

    backdrop.click();
    await waitForUpdate();

    expect(getPopup(container)).toHaveAttribute('hidden');
  });

  it('closes on Escape key', async () => {
    const container = render(renderDialog({ defaultOpen: true }));
    await waitForUpdate();

    expect(getPopup(container)).not.toHaveAttribute('hidden');

    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    await waitForUpdate();

    expect(getPopup(container)).toHaveAttribute('hidden');
  });

  it('calls onOpenChange with event details', async () => {
    const handleOpenChange = vi.fn();
    const container = render(renderDialog({ onOpenChange: handleOpenChange }));
    await waitForUpdate();

    // Open via trigger
    getTrigger(container).click();
    await waitForUpdate();

    expect(handleOpenChange).toHaveBeenCalledTimes(1);
    expect(handleOpenChange.mock.calls[0]?.[0]).toBe(true);
    expect(handleOpenChange.mock.calls[0]?.[1].reason).toBe('trigger-press');

    // Close via backdrop
    getBackdrop(container).click();
    await waitForUpdate();

    expect(handleOpenChange).toHaveBeenCalledTimes(2);
    expect(handleOpenChange.mock.calls[1]?.[0]).toBe(false);
    expect(handleOpenChange.mock.calls[1]?.[1].reason).toBe('outside-press');
  });

  it('supports cancellation in onOpenChange', async () => {
    const handleOpenChange = vi.fn(
      (_open: boolean, details: DialogChangeEventDetails) => {
        details.cancel();
      },
    );
    const container = render(renderDialog({ onOpenChange: handleOpenChange }));
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
          <dialog-root .open=${open}>
            <dialog-trigger>Open</dialog-trigger>
            <dialog-portal>
              <dialog-popup>Content</dialog-popup>
            </dialog-portal>
          </dialog-root>
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

  it('does not dismiss on non-main button backdrop clicks', async () => {
    const handleOpenChange = vi.fn();
    const container = render(
      renderDialog({ defaultOpen: true, onOpenChange: handleOpenChange }),
    );
    await waitForUpdate();
    handleOpenChange.mockClear();

    getBackdrop(container).dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true, button: 2 }),
    );
    await waitForUpdate();

    expect(getPopup(container)).not.toHaveAttribute('hidden');
    expect(handleOpenChange).not.toHaveBeenCalled();
  });

  it('respects disablePointerDismissal for backdrop clicks', async () => {
    const container = render(
      renderDialog({ defaultOpen: true, disablePointerDismissal: true }),
    );
    await waitForUpdate();

    getBackdrop(container).click();
    await waitForUpdate();

    expect(getPopup(container)).not.toHaveAttribute('hidden');
  });

  it('dismisses stacked dialogs one by one on Escape', async () => {
    const container = render(html`
      <dialog-root .defaultOpen=${true}>
        <dialog-popup data-testid="popup-1">
          Dialog 1
          <dialog-root .defaultOpen=${true}>
            <dialog-popup data-testid="popup-2">
              Dialog 2
              <dialog-root .defaultOpen=${true}>
                <dialog-popup data-testid="popup-3">Dialog 3</dialog-popup>
              </dialog-root>
            </dialog-popup>
          </dialog-root>
        </dialog-popup>
      </dialog-root>
    `);
    await waitForUpdate();

    // All three should be open
    expect(container.querySelector('[data-testid="popup-3"]')).not.toHaveAttribute('hidden');

    // Escape closes topmost (dialog 3)
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    await waitForUpdate();

    expect(container.querySelector('[data-testid="popup-3"]')).toHaveAttribute('hidden');
    expect(container.querySelector('[data-testid="popup-2"]')).not.toHaveAttribute('hidden');

    // Escape closes next (dialog 2)
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    await waitForUpdate();

    expect(container.querySelector('[data-testid="popup-2"]')).toHaveAttribute('hidden');
    expect(container.querySelector('[data-testid="popup-1"]')).not.toHaveAttribute('hidden');
  });

  it('shows disabled state on close button', async () => {
    const container = render(html`
      <dialog-root .defaultOpen=${true}>
        <dialog-popup>
          <dialog-close .disabled=${true}>Close</dialog-close>
        </dialog-popup>
      </dialog-root>
    `);
    await waitForUpdate();

    const close = getClose(container);
    expect(close).toHaveAttribute('data-disabled');
    expect(close).toHaveAttribute('disabled');

    // Click should not close when disabled
    close.click();
    await waitForUpdate();

    expect(getPopup(container)).not.toHaveAttribute('hidden');
  });

  it('wires aria-controls on trigger when open', async () => {
    const container = render(renderDialog({ defaultOpen: true }));
    await waitForUpdate();

    const trigger = getTrigger(container);
    const popup = getPopup(container);

    expect(trigger).toHaveAttribute('aria-controls', popup.id);
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
  });

  it('supports keyboard activation on trigger', async () => {
    const container = render(renderDialog());
    await waitForUpdate();

    const trigger = getTrigger(container);

    // Enter opens
    trigger.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter' }),
    );
    await waitForUpdate();
    expect(getPopup(container)).not.toHaveAttribute('hidden');

    // Space closes (toggle)
    trigger.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: ' ' }),
    );
    await waitForUpdate();
    expect(getPopup(container)).toHaveAttribute('hidden');
  });

  it('logs error when parts are used outside root', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(html`<dialog-trigger>Orphan</dialog-trigger>`);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Dialog parts must be placed within'),
    );

    errorSpy.mockRestore();
  });

  it('onOpenChange reports escape-key reason', async () => {
    const handleOpenChange = vi.fn();
    const container = render(
      renderDialog({ defaultOpen: true, onOpenChange: handleOpenChange }),
    );
    await waitForUpdate();
    handleOpenChange.mockClear();

    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    await waitForUpdate();

    expect(handleOpenChange).toHaveBeenCalledTimes(1);
    expect(handleOpenChange.mock.calls[0]?.[0]).toBe(false);
    expect(handleOpenChange.mock.calls[0]?.[1].reason).toBe('escape-key');
  });

  it('onOpenChange reports close-press reason', async () => {
    const handleOpenChange = vi.fn();
    const container = render(
      renderDialog({ defaultOpen: true, onOpenChange: handleOpenChange }),
    );
    await waitForUpdate();
    handleOpenChange.mockClear();

    getClose(container).click();
    await waitForUpdate();

    expect(handleOpenChange).toHaveBeenCalledTimes(1);
    expect(handleOpenChange.mock.calls[0]?.[0]).toBe(false);
    expect(handleOpenChange.mock.calls[0]?.[1].reason).toBe('close-press');
  });
});
