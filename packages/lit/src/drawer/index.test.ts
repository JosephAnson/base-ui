import { html, nothing, render as renderTemplate } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import './index.ts';
import type { DrawerRootElement, DrawerChangeEventDetails } from './index.ts';

describe('drawer', () => {
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
    return container.querySelector('drawer-root') as DrawerRootElement;
  }

  function getTrigger(container: HTMLElement) {
    return container.querySelector('drawer-trigger') as HTMLElement;
  }

  function getPopup(container: HTMLElement) {
    return container.querySelector('drawer-popup') as HTMLElement;
  }

  function getBackdrop(container: HTMLElement) {
    return container.querySelector('drawer-backdrop') as HTMLElement;
  }

  function getClose(container: HTMLElement) {
    return container.querySelector('drawer-close') as HTMLElement;
  }

  function renderDrawer(rootProps: Record<string, unknown> = {}) {
    return html`
      <drawer-root
        .modal=${rootProps.modal ?? true}
        .defaultOpen=${rootProps.defaultOpen ?? false}
        .open=${rootProps.open}
        .onOpenChange=${rootProps.onOpenChange}
        .disablePointerDismissal=${rootProps.disablePointerDismissal ?? false}
        .swipeDirection=${rootProps.swipeDirection ?? 'down'}
      >
        <drawer-trigger>Open</drawer-trigger>
        <drawer-portal>
          <drawer-backdrop></drawer-backdrop>
          <drawer-popup>
            <drawer-viewport>
              <drawer-content>
                <drawer-title>Title</drawer-title>
                <drawer-description>Description</drawer-description>
                <drawer-close>Close</drawer-close>
              </drawer-content>
            </drawer-viewport>
          </drawer-popup>
        </drawer-portal>
      </drawer-root>
    `;
  }

  // ── DrawerRoot ──────────────────────────────────────────────────────────

  describe('DrawerRoot', () => {
    it('renders drawer-root as a custom element', async () => {
      const container = render(renderDrawer());
      await waitForUpdate();

      const root = getRoot(container);
      expect(root).toBeInTheDocument();
      expect(root).toHaveAttribute('data-base-ui-drawer-root');
    });

    it('sets data-swipe-direction attribute', async () => {
      const container = render(renderDrawer({ swipeDirection: 'left' }));
      await waitForUpdate();

      const root = getRoot(container);
      expect(root).toHaveAttribute('data-swipe-direction', 'left');
    });

    it('defaults swipeDirection to down', async () => {
      const container = render(renderDrawer());
      await waitForUpdate();

      const root = getRoot(container);
      expect(root).toHaveAttribute('data-swipe-direction', 'down');
    });

    it('opens through the trigger and closes through close button', async () => {
      const container = render(renderDrawer());
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

    it('wires aria-modal for modal drawers', async () => {
      const container = render(renderDrawer({ defaultOpen: true }));
      await waitForUpdate();

      const popup = getPopup(container);
      expect(popup).toHaveAttribute('aria-modal', 'true');
    });

    it('does not set aria-modal for non-modal drawers', async () => {
      const container = render(renderDrawer({ defaultOpen: true, modal: false }));
      await waitForUpdate();

      const popup = getPopup(container);
      expect(popup).not.toHaveAttribute('aria-modal');
    });

    it('wires aria-labelledby and aria-describedby', async () => {
      const container = render(renderDrawer({ defaultOpen: true }));
      await waitForUpdate();

      const popup = getPopup(container);
      const title = container.querySelector('drawer-title') as HTMLElement;
      const description = container.querySelector('drawer-description') as HTMLElement;

      expect(popup).toHaveAttribute('aria-labelledby', title.id);
      expect(popup).toHaveAttribute('aria-describedby', description.id);
    });

    it('closes on backdrop click', async () => {
      const container = render(renderDrawer({ defaultOpen: true }));
      await waitForUpdate();

      const backdrop = getBackdrop(container);
      expect(backdrop).toHaveAttribute('role', 'presentation');

      backdrop.click();
      await waitForUpdate();

      expect(getPopup(container)).toHaveAttribute('hidden');
    });

    it('closes on Escape key', async () => {
      const container = render(renderDrawer({ defaultOpen: true }));
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
      const container = render(renderDrawer({ onOpenChange: handleOpenChange }));
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
        (_open: boolean, details: DrawerChangeEventDetails) => {
          details.cancel();
        },
      );
      const container = render(renderDrawer({ onOpenChange: handleOpenChange }));
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
            <drawer-root .open=${open}>
              <drawer-trigger>Open</drawer-trigger>
              <drawer-portal>
                <drawer-popup>Content</drawer-popup>
              </drawer-portal>
            </drawer-root>
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

    it('respects disablePointerDismissal for backdrop clicks', async () => {
      const container = render(
        renderDrawer({ defaultOpen: true, disablePointerDismissal: true }),
      );
      await waitForUpdate();

      getBackdrop(container).click();
      await waitForUpdate();

      expect(getPopup(container)).not.toHaveAttribute('hidden');
    });

    it('does not dismiss on non-main button backdrop clicks', async () => {
      const handleOpenChange = vi.fn();
      const container = render(
        renderDrawer({ defaultOpen: true, onOpenChange: handleOpenChange }),
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

    it('onOpenChange reports escape-key reason', async () => {
      const handleOpenChange = vi.fn();
      const container = render(
        renderDrawer({ defaultOpen: true, onOpenChange: handleOpenChange }),
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
        renderDrawer({ defaultOpen: true, onOpenChange: handleOpenChange }),
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

  // ── DrawerTrigger ─────────────────────────────────────────────────────

  describe('DrawerTrigger', () => {
    it('has correct ARIA attributes', async () => {
      const container = render(renderDrawer());
      await waitForUpdate();

      const trigger = getTrigger(container);
      expect(trigger).toHaveAttribute('role', 'button');
      expect(trigger).toHaveAttribute('tabindex', '0');
      expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });

    it('wires aria-controls on trigger when open', async () => {
      const container = render(renderDrawer({ defaultOpen: true }));
      await waitForUpdate();

      const trigger = getTrigger(container);
      const popup = getPopup(container);

      expect(trigger).toHaveAttribute('aria-controls', popup.id);
    });

    it('supports keyboard activation', async () => {
      const container = render(renderDrawer());
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
  });

  // ── DrawerPopup ───────────────────────────────────────────────────────

  describe('DrawerPopup', () => {
    it('has data-swipe-direction attribute', async () => {
      const container = render(renderDrawer({ defaultOpen: true, swipeDirection: 'left' }));
      await waitForUpdate();

      const popup = getPopup(container);
      expect(popup).toHaveAttribute('data-swipe-direction', 'left');
    });

    it('sets data-open and data-closed attributes', async () => {
      const container = render(renderDrawer({ defaultOpen: true }));
      await waitForUpdate();

      const popup = getPopup(container);
      expect(popup).toHaveAttribute('data-open');
      expect(popup).not.toHaveAttribute('data-closed');
    });
  });

  // ── DrawerContent ─────────────────────────────────────────────────────

  describe('DrawerContent', () => {
    it('renders with data-drawer-content attribute', async () => {
      const container = render(renderDrawer({ defaultOpen: true }));
      await waitForUpdate();

      const content = container.querySelector('drawer-content')!;
      expect(content).toBeInTheDocument();
      expect(content).toHaveAttribute('data-drawer-content');
    });
  });

  // ── DrawerViewport ────────────────────────────────────────────────────

  describe('DrawerViewport', () => {
    it('has data-swipe-direction attribute', async () => {
      const container = render(renderDrawer({ defaultOpen: true, swipeDirection: 'right' }));
      await waitForUpdate();

      const viewport = container.querySelector('drawer-viewport')!;
      expect(viewport).toHaveAttribute('data-swipe-direction', 'right');
    });
  });

  // ── DrawerSwipeArea ───────────────────────────────────────────────────

  describe('DrawerSwipeArea', () => {
    it('shows open/closed state via data attributes', async () => {
      const container = render(html`
        <drawer-root .defaultOpen=${false}>
          <drawer-swipe-area></drawer-swipe-area>
          <drawer-trigger>Open</drawer-trigger>
          <drawer-portal>
            <drawer-popup>Content</drawer-popup>
          </drawer-portal>
        </drawer-root>
      `);
      await waitForUpdate();

      const swipeArea = container.querySelector('drawer-swipe-area')!;
      expect(swipeArea).toHaveAttribute('data-closed');
      expect(swipeArea).not.toHaveAttribute('data-open');
      expect(swipeArea).toHaveAttribute('data-swipe-direction', 'down');

      // Open drawer
      getTrigger(container).click();
      await waitForUpdate();

      expect(swipeArea).toHaveAttribute('data-open');
      expect(swipeArea).not.toHaveAttribute('data-closed');
    });
  });

  // ── DrawerClose ───────────────────────────────────────────────────────

  describe('DrawerClose', () => {
    it('shows disabled state', async () => {
      const container = render(html`
        <drawer-root .defaultOpen=${true}>
          <drawer-popup>
            <drawer-close .disabled=${true}>Close</drawer-close>
          </drawer-popup>
        </drawer-root>
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
  });

  // ── DrawerProvider ────────────────────────────────────────────────────

  describe('DrawerProvider', () => {
    it('tracks drawer open state', async () => {
      const container = render(html`
        <drawer-provider>
          <drawer-indent></drawer-indent>
          <drawer-indent-background></drawer-indent-background>
          <drawer-root>
            <drawer-trigger>Open</drawer-trigger>
            <drawer-portal>
              <drawer-popup>Content</drawer-popup>
            </drawer-portal>
          </drawer-root>
        </drawer-provider>
      `);
      await waitForUpdate();

      const indent = container.querySelector('drawer-indent')!;
      const indentBg = container.querySelector('drawer-indent-background')!;

      // Initially inactive
      expect(indent).toHaveAttribute('data-inactive');
      expect(indent).not.toHaveAttribute('data-active');
      expect(indentBg).toHaveAttribute('data-inactive');
      expect(indentBg).not.toHaveAttribute('data-active');

      // Open drawer
      getTrigger(container).click();
      await waitForUpdate();

      expect(indent).toHaveAttribute('data-active');
      expect(indent).not.toHaveAttribute('data-inactive');
      expect(indentBg).toHaveAttribute('data-active');
      expect(indentBg).not.toHaveAttribute('data-inactive');

      // Close drawer
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );
      await waitForUpdate();

      expect(indent).toHaveAttribute('data-inactive');
      expect(indent).not.toHaveAttribute('data-active');
      expect(indentBg).toHaveAttribute('data-inactive');
      expect(indentBg).not.toHaveAttribute('data-active');
    });
  });

  // ── Nested drawers ────────────────────────────────────────────────────

  describe('nested drawers', () => {
    it('dismisses stacked drawers one by one on Escape', async () => {
      const container = render(html`
        <drawer-root .defaultOpen=${true}>
          <drawer-popup data-testid="popup-1">
            Drawer 1
            <drawer-root .defaultOpen=${true}>
              <drawer-popup data-testid="popup-2">
                Drawer 2
              </drawer-popup>
            </drawer-root>
          </drawer-popup>
        </drawer-root>
      `);
      await waitForUpdate();

      // Both should be open
      expect(container.querySelector('[data-testid="popup-2"]')).not.toHaveAttribute('hidden');

      // Escape closes topmost (drawer 2)
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );
      await waitForUpdate();

      expect(container.querySelector('[data-testid="popup-2"]')).toHaveAttribute('hidden');
      expect(container.querySelector('[data-testid="popup-1"]')).not.toHaveAttribute('hidden');

      // Escape closes next (drawer 1)
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );
      await waitForUpdate();

      expect(container.querySelector('[data-testid="popup-1"]')).toHaveAttribute('hidden');
    });
  });

  // ── Error handling ────────────────────────────────────────────────────

  describe('error handling', () => {
    it('logs error when parts are used outside root', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(html`<drawer-trigger>Orphan</drawer-trigger>`);

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Drawer parts must be placed within'),
      );

      errorSpy.mockRestore();
    });
  });

  // ── Integration ───────────────────────────────────────────────────────

  describe('integration', () => {
    it('full structure renders without errors', async () => {
      const container = render(html`
        <drawer-provider>
          <drawer-indent></drawer-indent>
          <drawer-indent-background></drawer-indent-background>
          <drawer-root>
            <drawer-swipe-area></drawer-swipe-area>
            <drawer-trigger>Open</drawer-trigger>
            <drawer-portal>
              <drawer-backdrop></drawer-backdrop>
              <drawer-popup>
                <drawer-viewport>
                  <drawer-content>
                    <drawer-title>Title</drawer-title>
                    <drawer-description>Description</drawer-description>
                    <drawer-close>Close</drawer-close>
                  </drawer-content>
                </drawer-viewport>
              </drawer-popup>
            </drawer-portal>
          </drawer-root>
        </drawer-provider>
      `);
      await waitForUpdate();

      expect(container.querySelector('drawer-provider')).toBeInTheDocument();
      expect(container.querySelector('drawer-root')).toBeInTheDocument();
      expect(container.querySelector('drawer-trigger')).toBeInTheDocument();
      expect(container.querySelector('drawer-portal')).toBeInTheDocument();
      expect(container.querySelector('drawer-backdrop')).toBeInTheDocument();
      expect(container.querySelector('drawer-popup')).toBeInTheDocument();
      expect(container.querySelector('drawer-viewport')).toBeInTheDocument();
      expect(container.querySelector('drawer-content')).toBeInTheDocument();
      expect(container.querySelector('drawer-title')).toBeInTheDocument();
      expect(container.querySelector('drawer-description')).toBeInTheDocument();
      expect(container.querySelector('drawer-close')).toBeInTheDocument();
      expect(container.querySelector('drawer-swipe-area')).toBeInTheDocument();
      expect(container.querySelector('drawer-indent')).toBeInTheDocument();
      expect(container.querySelector('drawer-indent-background')).toBeInTheDocument();
    });

    it('cleanup works on disconnect', async () => {
      const container = render(html`
        <drawer-root .defaultOpen=${true}>
          <drawer-trigger>Open</drawer-trigger>
          <drawer-portal>
            <drawer-popup>
              <drawer-viewport>
                <drawer-content>Content</drawer-content>
              </drawer-viewport>
            </drawer-popup>
          </drawer-portal>
        </drawer-root>
      `);
      await waitForUpdate();

      // Should not throw when removed
      renderTemplate(nothing, container);
      await waitForUpdate();

      expect(document.querySelector('drawer-root')).toBe(null);
    });
  });
});
