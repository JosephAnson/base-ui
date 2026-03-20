import { html, nothing, render as renderTemplate } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import './index.ts';
import type { NavigationMenuRootElement, NavigationMenuChangeEventDetails } from './index.ts';

describe('NavigationMenu', () => {
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
    return container.querySelector('navigation-menu-root') as NavigationMenuRootElement;
  }

  function renderMenu(rootProps: Record<string, unknown> = {}) {
    return html`
      <navigation-menu-root
        .orientation=${rootProps.orientation ?? 'horizontal'}
        .defaultValue=${rootProps.defaultValue ?? ''}
        .value=${rootProps.value}
        .onValueChange=${rootProps.onValueChange}
        .delay=${rootProps.delay ?? 50}
        .closeDelay=${rootProps.closeDelay ?? 50}
      >
        <navigation-menu-list>
          <navigation-menu-item .value=${'products'}>
            <navigation-menu-trigger>Products</navigation-menu-trigger>
            <navigation-menu-content>
              <navigation-menu-link>Product A</navigation-menu-link>
              <navigation-menu-link>Product B</navigation-menu-link>
            </navigation-menu-content>
          </navigation-menu-item>
          <navigation-menu-item .value=${'resources'}>
            <navigation-menu-trigger>Resources</navigation-menu-trigger>
            <navigation-menu-content>
              <navigation-menu-link>Resource A</navigation-menu-link>
            </navigation-menu-content>
          </navigation-menu-item>
          <navigation-menu-item .value=${'about'}>
            <navigation-menu-trigger>About</navigation-menu-trigger>
            <navigation-menu-content>
              <navigation-menu-link>About Us</navigation-menu-link>
            </navigation-menu-content>
          </navigation-menu-item>
        </navigation-menu-list>
        <navigation-menu-popup>
          <navigation-menu-viewport></navigation-menu-viewport>
        </navigation-menu-popup>
        <navigation-menu-backdrop></navigation-menu-backdrop>
      </navigation-menu-root>
    `;
  }

  // ── Root ───────────────────────────────────────────────────────────────

  describe('NavigationMenuRoot', () => {
    it('renders as a custom element with role=navigation', async () => {
      const container = render(renderMenu());
      await waitForUpdate();

      const root = getRoot(container);
      expect(root).toBeInTheDocument();
      expect(root).toHaveAttribute('role', 'navigation');
      expect(root).toHaveAttribute('data-base-ui-navigation-menu-root');
    });

    it('sets data-orientation attribute', async () => {
      const container = render(renderMenu({ orientation: 'vertical' }));
      await waitForUpdate();

      const root = getRoot(container);
      expect(root).toHaveAttribute('data-orientation', 'vertical');
    });

    it('defaults to horizontal orientation', async () => {
      const container = render(renderMenu());
      await waitForUpdate();

      expect(getRoot(container)).toHaveAttribute('data-orientation', 'horizontal');
    });

    it('opens content on trigger click', async () => {
      const container = render(renderMenu());
      await waitForUpdate();

      const triggers = container.querySelectorAll('navigation-menu-trigger');
      const contents = container.querySelectorAll('navigation-menu-content');

      // All content hidden initially
      contents.forEach((c) => expect(c).toHaveAttribute('hidden'));

      // Click first trigger
      (triggers[0] as HTMLElement).click();
      await waitForUpdate();

      expect(contents[0]).not.toHaveAttribute('hidden');
      expect(contents[1]).toHaveAttribute('hidden');
      expect(contents[2]).toHaveAttribute('hidden');
    });

    it('closes on Escape key', async () => {
      const container = render(renderMenu({ defaultValue: 'products' }));
      await waitForUpdate();

      const content = container.querySelectorAll('navigation-menu-content');
      expect(content[0]).not.toHaveAttribute('hidden');

      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );
      await waitForUpdate();

      expect(content[0]).toHaveAttribute('hidden');
    });

    it('calls onValueChange with event details', async () => {
      const handleValueChange = vi.fn();
      const container = render(renderMenu({ onValueChange: handleValueChange }));
      await waitForUpdate();

      const trigger = container.querySelector('navigation-menu-trigger') as HTMLElement;
      trigger.click();
      await waitForUpdate();

      expect(handleValueChange).toHaveBeenCalledTimes(1);
      expect(handleValueChange.mock.calls[0]?.[0]).toBe('products');
      expect(handleValueChange.mock.calls[0]?.[1].reason).toBe('trigger-press');
    });

    it('supports cancellation in onValueChange', async () => {
      const handleValueChange = vi.fn(
        (_value: string, details: NavigationMenuChangeEventDetails) => {
          details.cancel();
        },
      );
      const container = render(renderMenu({ onValueChange: handleValueChange }));
      await waitForUpdate();

      const trigger = container.querySelector('navigation-menu-trigger') as HTMLElement;
      trigger.click();
      await waitForUpdate();

      // Opening was cancelled
      const content = container.querySelector('navigation-menu-content')!;
      expect(content).toHaveAttribute('hidden');
    });

    it('supports controlled value', async () => {
      const container = render(html``);

      function rerender(value: string) {
        renderTemplate(
          html`
            <navigation-menu-root .value=${value}>
              <navigation-menu-list>
                <navigation-menu-item .value=${'products'}>
                  <navigation-menu-trigger>Products</navigation-menu-trigger>
                  <navigation-menu-content>Product content</navigation-menu-content>
                </navigation-menu-item>
              </navigation-menu-list>
            </navigation-menu-root>
          `,
          container,
        );
      }

      rerender('');
      await waitForUpdate();
      expect(container.querySelector('navigation-menu-content')).toHaveAttribute('hidden');

      rerender('products');
      await waitForUpdate();
      expect(container.querySelector('navigation-menu-content')).not.toHaveAttribute('hidden');

      rerender('');
      await waitForUpdate();
      expect(container.querySelector('navigation-menu-content')).toHaveAttribute('hidden');
    });

    it('switches between items on trigger click', async () => {
      const container = render(renderMenu());
      await waitForUpdate();

      const triggers = container.querySelectorAll('navigation-menu-trigger');
      const contents = container.querySelectorAll('navigation-menu-content');

      // Open first item
      (triggers[0] as HTMLElement).click();
      await waitForUpdate();
      expect(contents[0]).not.toHaveAttribute('hidden');

      // Click second trigger - should switch
      (triggers[1] as HTMLElement).click();
      await waitForUpdate();
      expect(contents[0]).toHaveAttribute('hidden');
      expect(contents[1]).not.toHaveAttribute('hidden');
    });

    it('toggles item closed on second click', async () => {
      const container = render(renderMenu());
      await waitForUpdate();

      const trigger = container.querySelector('navigation-menu-trigger') as HTMLElement;
      const content = container.querySelector('navigation-menu-content')!;

      trigger.click();
      await waitForUpdate();
      expect(content).not.toHaveAttribute('hidden');

      trigger.click();
      await waitForUpdate();
      expect(content).toHaveAttribute('hidden');
    });
  });

  // ── List ──────────────────────────────────────────────────────────────

  describe('NavigationMenuList', () => {
    it('has role=menubar', async () => {
      const container = render(renderMenu());
      await waitForUpdate();

      const list = container.querySelector('navigation-menu-list')!;
      expect(list).toHaveAttribute('role', 'menubar');
    });

    it('sets data-orientation', async () => {
      const container = render(renderMenu());
      await waitForUpdate();

      const list = container.querySelector('navigation-menu-list')!;
      expect(list).toHaveAttribute('data-orientation', 'horizontal');
    });

    it('supports ArrowRight/ArrowLeft keyboard navigation (horizontal)', async () => {
      const container = render(renderMenu());
      await waitForUpdate();

      const triggers = container.querySelectorAll('navigation-menu-trigger') as NodeListOf<HTMLElement>;
      triggers[0].focus();

      // ArrowRight moves to next
      triggers[0].dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
      );
      await waitForUpdate();

      expect(document.activeElement).toBe(triggers[1]);

      // ArrowLeft moves back
      triggers[1].dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }),
      );
      await waitForUpdate();

      expect(document.activeElement).toBe(triggers[0]);
    });

    it('supports ArrowDown/ArrowUp keyboard navigation (vertical)', async () => {
      const container = render(renderMenu({ orientation: 'vertical' }));
      await waitForUpdate();

      const triggers = container.querySelectorAll('navigation-menu-trigger') as NodeListOf<HTMLElement>;
      triggers[0].focus();

      triggers[0].dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }),
      );
      await waitForUpdate();

      expect(document.activeElement).toBe(triggers[1]);
    });

    it('wraps around on keyboard navigation', async () => {
      const container = render(renderMenu());
      await waitForUpdate();

      const triggers = container.querySelectorAll('navigation-menu-trigger') as NodeListOf<HTMLElement>;
      triggers[2].focus();

      // ArrowRight from last wraps to first
      triggers[2].dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
      );
      await waitForUpdate();

      expect(document.activeElement).toBe(triggers[0]);
    });

    it('supports Home/End keys', async () => {
      const container = render(renderMenu());
      await waitForUpdate();

      const triggers = container.querySelectorAll('navigation-menu-trigger') as NodeListOf<HTMLElement>;
      triggers[1].focus();

      triggers[1].dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true }),
      );
      await waitForUpdate();

      expect(document.activeElement).toBe(triggers[0]);

      triggers[0].dispatchEvent(
        new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }),
      );
      await waitForUpdate();

      expect(document.activeElement).toBe(triggers[2]);
    });
  });

  // ── Item ──────────────────────────────────────────────────────────────

  describe('NavigationMenuItem', () => {
    it('has role=none', async () => {
      const container = render(renderMenu());
      await waitForUpdate();

      const item = container.querySelector('navigation-menu-item')!;
      expect(item).toHaveAttribute('role', 'none');
    });

    it('sets data-value attribute', async () => {
      const container = render(renderMenu());
      await waitForUpdate();

      const items = container.querySelectorAll('navigation-menu-item');
      expect(items[0]).toHaveAttribute('data-value', 'products');
      expect(items[1]).toHaveAttribute('data-value', 'resources');
    });

    it('sets data-open/data-closed based on active value', async () => {
      const container = render(renderMenu({ defaultValue: 'products' }));
      await waitForUpdate();

      const items = container.querySelectorAll('navigation-menu-item');
      expect(items[0]).toHaveAttribute('data-open');
      expect(items[0]).not.toHaveAttribute('data-closed');
      expect(items[1]).not.toHaveAttribute('data-open');
      expect(items[1]).toHaveAttribute('data-closed');
    });
  });

  // ── Trigger ───────────────────────────────────────────────────────────

  describe('NavigationMenuTrigger', () => {
    it('has correct ARIA attributes', async () => {
      const container = render(renderMenu());
      await waitForUpdate();

      const trigger = container.querySelector('navigation-menu-trigger') as HTMLElement;
      expect(trigger).toHaveAttribute('role', 'menuitem');
      expect(trigger).toHaveAttribute('tabindex', '0');
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(trigger).toHaveAttribute('aria-haspopup', 'true');
    });

    it('updates aria-expanded when open', async () => {
      const container = render(renderMenu({ defaultValue: 'products' }));
      await waitForUpdate();

      const triggers = container.querySelectorAll('navigation-menu-trigger');
      expect(triggers[0]).toHaveAttribute('aria-expanded', 'true');
      expect(triggers[1]).toHaveAttribute('aria-expanded', 'false');
    });

    it('supports Enter/Space keyboard activation', async () => {
      const container = render(renderMenu());
      await waitForUpdate();

      const trigger = container.querySelector('navigation-menu-trigger') as HTMLElement;

      trigger.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter' }),
      );
      await waitForUpdate();

      expect(container.querySelector('navigation-menu-content')).not.toHaveAttribute('hidden');

      // Space closes
      trigger.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: ' ' }),
      );
      await waitForUpdate();

      expect(container.querySelector('navigation-menu-content')).toHaveAttribute('hidden');
    });

    it('ArrowDown opens content in horizontal mode', async () => {
      const container = render(renderMenu());
      await waitForUpdate();

      const trigger = container.querySelector('navigation-menu-trigger') as HTMLElement;

      trigger.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowDown' }),
      );
      await waitForUpdate();

      expect(container.querySelector('navigation-menu-content')).not.toHaveAttribute('hidden');
    });
  });

  // ── Content ───────────────────────────────────────────────────────────

  describe('NavigationMenuContent', () => {
    it('shows when item value matches root value', async () => {
      const container = render(renderMenu({ defaultValue: 'products' }));
      await waitForUpdate();

      const contents = container.querySelectorAll('navigation-menu-content');
      expect(contents[0]).not.toHaveAttribute('hidden');
      expect(contents[1]).toHaveAttribute('hidden');
    });

    it('sets data-open/data-closed attributes', async () => {
      const container = render(renderMenu({ defaultValue: 'products' }));
      await waitForUpdate();

      const content = container.querySelector('navigation-menu-content')!;
      expect(content).toHaveAttribute('data-open');
      expect(content).not.toHaveAttribute('data-closed');
    });

    it('has auto-generated id', async () => {
      const container = render(renderMenu({ defaultValue: 'products' }));
      await waitForUpdate();

      const content = container.querySelector('navigation-menu-content')!;
      expect(content.id).toContain('base-ui-navigation-menu-content');
    });
  });

  // ── Popup ─────────────────────────────────────────────────────────────

  describe('NavigationMenuPopup', () => {
    it('has role=navigation', async () => {
      const container = render(renderMenu());
      await waitForUpdate();

      const popup = container.querySelector('navigation-menu-popup')!;
      expect(popup).toHaveAttribute('role', 'navigation');
    });

    it('shows when any item is open', async () => {
      const container = render(renderMenu());
      await waitForUpdate();

      const popup = container.querySelector('navigation-menu-popup')!;
      expect(popup).toHaveAttribute('hidden');

      const trigger = container.querySelector('navigation-menu-trigger') as HTMLElement;
      trigger.click();
      await waitForUpdate();

      expect(popup).not.toHaveAttribute('hidden');
    });
  });

  // ── Viewport ──────────────────────────────────────────────────────────

  describe('NavigationMenuViewport', () => {
    it('has overflow hidden and position relative', async () => {
      const container = render(renderMenu());
      await waitForUpdate();

      const viewport = container.querySelector('navigation-menu-viewport') as HTMLElement;
      expect(viewport.style.overflow).toBe('hidden');
      expect(viewport.style.position).toBe('relative');
    });
  });

  // ── Backdrop ──────────────────────────────────────────────────────────

  describe('NavigationMenuBackdrop', () => {
    it('is hidden when menu is closed', async () => {
      const container = render(renderMenu());
      await waitForUpdate();

      const backdrop = container.querySelector('navigation-menu-backdrop')!;
      expect(backdrop).toHaveAttribute('hidden');
      expect(backdrop).toHaveAttribute('role', 'presentation');
      expect(backdrop).toHaveAttribute('aria-hidden', 'true');
    });

    it('shows when menu is open', async () => {
      const container = render(renderMenu({ defaultValue: 'products' }));
      await waitForUpdate();

      const backdrop = container.querySelector('navigation-menu-backdrop')!;
      expect(backdrop).not.toHaveAttribute('hidden');
      expect(backdrop).toHaveAttribute('data-open');
    });
  });

  // ── Arrow ─────────────────────────────────────────────────────────────

  describe('NavigationMenuArrow', () => {
    it('is aria-hidden', async () => {
      const container = render(html`
        <navigation-menu-root>
          <navigation-menu-list>
            <navigation-menu-item .value=${'test'}>
              <navigation-menu-trigger>Test</navigation-menu-trigger>
            </navigation-menu-item>
          </navigation-menu-list>
          <navigation-menu-arrow></navigation-menu-arrow>
        </navigation-menu-root>
      `);
      await waitForUpdate();

      const arrow = container.querySelector('navigation-menu-arrow')!;
      expect(arrow).toHaveAttribute('aria-hidden', 'true');
    });
  });

  // ── Link ──────────────────────────────────────────────────────────────

  describe('NavigationMenuLink', () => {
    it('has role=menuitem', async () => {
      const container = render(renderMenu({ defaultValue: 'products' }));
      await waitForUpdate();

      const link = container.querySelector('navigation-menu-link')!;
      expect(link).toHaveAttribute('role', 'menuitem');
    });

    it('closes menu on click by default', async () => {
      const container = render(renderMenu({ defaultValue: 'products' }));
      await waitForUpdate();

      const link = container.querySelector('navigation-menu-link') as HTMLElement;
      const content = container.querySelector('navigation-menu-content')!;

      expect(content).not.toHaveAttribute('hidden');

      link.click();
      await waitForUpdate();

      expect(content).toHaveAttribute('hidden');
    });

    it('does not close when closeOnClick is false', async () => {
      const container = render(html`
        <navigation-menu-root .defaultValue=${'test'}>
          <navigation-menu-list>
            <navigation-menu-item .value=${'test'}>
              <navigation-menu-trigger>Test</navigation-menu-trigger>
              <navigation-menu-content>
                <navigation-menu-link .closeOnClick=${false}>Stay Open</navigation-menu-link>
              </navigation-menu-content>
            </navigation-menu-item>
          </navigation-menu-list>
        </navigation-menu-root>
      `);
      await waitForUpdate();

      const link = container.querySelector('navigation-menu-link') as HTMLElement;
      const content = container.querySelector('navigation-menu-content')!;

      expect(content).not.toHaveAttribute('hidden');

      link.click();
      await waitForUpdate();

      expect(content).not.toHaveAttribute('hidden');
    });

    it('sets data-active attribute', async () => {
      const container = render(html`
        <navigation-menu-root>
          <navigation-menu-list>
            <navigation-menu-item .value=${'test'}>
              <navigation-menu-trigger>Test</navigation-menu-trigger>
              <navigation-menu-content>
                <navigation-menu-link .active=${true}>Active</navigation-menu-link>
              </navigation-menu-content>
            </navigation-menu-item>
          </navigation-menu-list>
        </navigation-menu-root>
      `);
      await waitForUpdate();

      const link = container.querySelector('navigation-menu-link')!;
      expect(link).toHaveAttribute('data-active');
    });
  });

  // ── Icon ──────────────────────────────────────────────────────────────

  describe('NavigationMenuIcon', () => {
    it('is aria-hidden and tracks open state', async () => {
      const container = render(html`
        <navigation-menu-root .defaultValue=${'test'}>
          <navigation-menu-list>
            <navigation-menu-item .value=${'test'}>
              <navigation-menu-trigger>
                Test
                <navigation-menu-icon></navigation-menu-icon>
              </navigation-menu-trigger>
              <navigation-menu-content>Content</navigation-menu-content>
            </navigation-menu-item>
            <navigation-menu-item .value=${'other'}>
              <navigation-menu-trigger>
                Other
                <navigation-menu-icon></navigation-menu-icon>
              </navigation-menu-trigger>
              <navigation-menu-content>Other content</navigation-menu-content>
            </navigation-menu-item>
          </navigation-menu-list>
        </navigation-menu-root>
      `);
      await waitForUpdate();

      const icons = container.querySelectorAll('navigation-menu-icon');
      expect(icons[0]).toHaveAttribute('aria-hidden', 'true');
      expect(icons[0]).toHaveAttribute('data-open');
      expect(icons[1]).toHaveAttribute('data-closed');
    });
  });

  // ── Integration ───────────────────────────────────────────────────────

  describe('integration', () => {
    it('full structure renders without errors', async () => {
      const container = render(renderMenu());
      await waitForUpdate();

      expect(container.querySelector('navigation-menu-root')).toBeInTheDocument();
      expect(container.querySelector('navigation-menu-list')).toBeInTheDocument();
      expect(container.querySelectorAll('navigation-menu-item')).toHaveLength(3);
      expect(container.querySelectorAll('navigation-menu-trigger')).toHaveLength(3);
      expect(container.querySelectorAll('navigation-menu-content')).toHaveLength(3);
      expect(container.querySelector('navigation-menu-popup')).toBeInTheDocument();
      expect(container.querySelector('navigation-menu-viewport')).toBeInTheDocument();
      expect(container.querySelector('navigation-menu-backdrop')).toBeInTheDocument();
    });

    it('cleanup works on disconnect', async () => {
      const container = render(renderMenu({ defaultValue: 'products' }));
      await waitForUpdate();

      renderTemplate(nothing, container);
      await waitForUpdate();

      expect(document.querySelector('navigation-menu-root')).toBe(null);
    });
  });

  // ── Error handling ────────────────────────────────────────────────────

  describe('error handling', () => {
    it('logs error when parts are used outside root', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(html`<navigation-menu-trigger>Orphan</navigation-menu-trigger>`);

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('NavigationMenu parts must be placed within'),
      );

      errorSpy.mockRestore();
    });
  });
});
