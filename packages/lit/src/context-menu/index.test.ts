import { html, nothing, render as renderTemplate } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import './index.ts';
import '../menu/index.ts';

const floatingUiMocks = vi.hoisted(() => ({
  arrow: vi.fn((options: unknown) => ({ name: 'arrow', options })),
  autoUpdate: vi.fn(
    (
      _anchor: Element,
      _floating: Element,
      update: () => void,
      _options?: {
        elementResize?: boolean;
        layoutShift?: boolean;
      },
    ) => {
      update();
      return () => {};
    },
  ),
  computePosition: vi.fn(async () => ({
    x: 0,
    y: 0,
    placement: 'bottom',
    middlewareData: {
      arrow: {},
      hide: {},
    },
  })),
  flip: vi.fn((options: unknown) => ({ name: 'flip', options })),
  hide: vi.fn((options: unknown) => ({ name: 'hide', options })),
  limitShift: vi.fn(() => ({ name: 'limitShift' })),
  offset: vi.fn((options: unknown) => ({ name: 'offset', options })),
  shift: vi.fn((options: unknown) => ({ name: 'shift', options })),
}));

vi.mock('@floating-ui/react-dom', () => floatingUiMocks);

describe('ContextMenu', () => {
  const containers = new Set<HTMLDivElement>();

  afterEach(async () => {
    containers.forEach((container) => {
      renderTemplate(nothing, container);
      container.remove();
    });
    containers.clear();
    await flush();
  });

  function render(result: ReturnType<typeof html>) {
    const container = document.createElement('div');
    document.body.append(container);
    containers.add(container);
    renderTemplate(result, container);
    return container;
  }

  async function flush() {
    await Promise.resolve();
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 50);
    });
    await Promise.resolve();
  }

  function contextMenu(element: Element, clientX = 100, clientY = 100) {
    element.dispatchEvent(
      new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX,
        clientY,
      }),
    );
  }

  function renderContextMenu(props: { disabled?: boolean } = {}) {
    return html`
      <context-menu-root ?disabled=${props.disabled}>
        <context-menu-trigger data-testid="trigger">
          Right click me
        </context-menu-trigger>
        <menu-root>
          <menu-portal>
            <menu-positioner data-testid="positioner">
              <menu-popup data-testid="popup">
                <menu-item data-testid="item-1">Cut</menu-item>
                <menu-item data-testid="item-2">Copy</menu-item>
                <menu-item data-testid="item-3">Paste</menu-item>
              </menu-popup>
            </menu-positioner>
          </menu-portal>
        </menu-root>
      </context-menu-root>
    `;
  }

  // ── ContextMenuTrigger ────────────────────────────────────────────────

  describe('ContextMenuTrigger', () => {
    it('should open menu on right click (context menu event)', async () => {
      const container = render(renderContextMenu());
      await flush();

      const trigger = container.querySelector('[data-testid="trigger"]') as HTMLElement;
      contextMenu(trigger);
      await flush();

      const menuRoot = container.querySelector('menu-root') as any;
      expect(menuRoot.getOpen()).toBe(true);
    });

    it('adds open state attributes', async () => {
      const container = render(renderContextMenu());
      await flush();

      const trigger = container.querySelector('[data-testid="trigger"]') as HTMLElement;
      expect(trigger).not.toHaveAttribute('data-popup-open');

      contextMenu(trigger);
      await flush();

      expect(trigger).toHaveAttribute('data-popup-open');
    });

    it('should call onOpenChange when menu is opened via right click', async () => {
      const onOpenChange = vi.fn();
      const container = render(html`
        <context-menu-root .onOpenChange=${onOpenChange}>
          <context-menu-trigger data-testid="trigger">
            Right click me
          </context-menu-trigger>
          <menu-root>
            <menu-portal>
              <menu-positioner>
                <menu-popup>
                  <menu-item>Cut</menu-item>
                </menu-popup>
              </menu-positioner>
            </menu-portal>
          </menu-root>
        </context-menu-root>
      `);
      await flush();

      const trigger = container.querySelector('[data-testid="trigger"]') as HTMLElement;
      contextMenu(trigger);
      await flush();

      expect(onOpenChange).toHaveBeenCalledWith(true, expect.any(Event));
    });

    it('does not open on right-click when disabled', async () => {
      const container = render(renderContextMenu({ disabled: true }));
      await flush();

      const trigger = container.querySelector('[data-testid="trigger"]') as HTMLElement;
      contextMenu(trigger);
      await flush();

      const menuRoot = container.querySelector('menu-root') as any;
      expect(menuRoot.getOpen()).toBe(false);
    });

    it('does not block the native context menu when disabled', async () => {
      const container = render(renderContextMenu({ disabled: true }));
      await flush();

      const trigger = container.querySelector('[data-testid="trigger"]') as HTMLElement;
      const event = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: 100,
        clientY: 100,
      });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      trigger.dispatchEvent(event);
      await flush();

      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });

    it('prevents native context menu when not disabled', async () => {
      const container = render(renderContextMenu());
      await flush();

      const trigger = container.querySelector('[data-testid="trigger"]') as HTMLElement;
      const event = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: 100,
        clientY: 100,
      });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      trigger.dispatchEvent(event);
      await flush();

      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  // ── ContextMenuRoot ───────────────────────────────────────────────────

  describe('ContextMenuRoot', () => {
    it('does not open when disabled', async () => {
      const container = render(renderContextMenu({ disabled: true }));
      await flush();

      const trigger = container.querySelector('[data-testid="trigger"]') as HTMLElement;
      contextMenu(trigger);
      await flush();

      const menuRoot = container.querySelector('menu-root') as any;
      expect(menuRoot.getOpen()).toBe(false);
    });

    it('sets virtual anchor at cursor position', async () => {
      const container = render(renderContextMenu());
      await flush();

      const trigger = container.querySelector('[data-testid="trigger"]') as HTMLElement;
      contextMenu(trigger, 200, 300);
      await flush();

      const root = container.querySelector('context-menu-root') as any;
      const anchor = root.getVirtualAnchor();
      expect(anchor).not.toBeNull();

      const rect = anchor.getBoundingClientRect();
      expect(rect.x).toBe(200);
      expect(rect.y).toBe(300);
    });

    it('sets the virtual anchor on the positioner', async () => {
      const container = render(renderContextMenu());
      await flush();

      const trigger = container.querySelector('[data-testid="trigger"]') as HTMLElement;
      contextMenu(trigger, 150, 250);
      await flush();

      const positioner = container.querySelector('[data-testid="positioner"]') as any;
      expect(positioner.anchor).not.toBeUndefined();
      expect(positioner.anchor.getBoundingClientRect().x).toBe(150);
    });

    it('should handle nested context menus correctly', async () => {
      const container = render(html`
        <context-menu-root>
          <context-menu-trigger data-testid="outer-trigger">
            Outer area
            <context-menu-root>
              <context-menu-trigger data-testid="inner-trigger">
                Inner area
              </context-menu-trigger>
              <menu-root>
                <menu-portal>
                  <menu-positioner>
                    <menu-popup>
                      <menu-item data-testid="inner-item">Inner Item</menu-item>
                    </menu-popup>
                  </menu-positioner>
                </menu-portal>
              </menu-root>
            </context-menu-root>
          </context-menu-trigger>
          <menu-root>
            <menu-portal>
              <menu-positioner>
                <menu-popup>
                  <menu-item data-testid="outer-item">Outer Item</menu-item>
                </menu-popup>
              </menu-positioner>
            </menu-portal>
          </menu-root>
        </context-menu-root>
      `);
      await flush();

      // Right-click inner trigger
      const innerTrigger = container.querySelector('[data-testid="inner-trigger"]') as HTMLElement;
      contextMenu(innerTrigger);
      await flush();

      // Inner menu should open
      const innerMenuRoot = innerTrigger.closest('context-menu-root')?.querySelector('menu-root') as any;
      expect(innerMenuRoot.getOpen()).toBe(true);
    });
  });

  // ── Long press (touch) ────────────────────────────────────────────────

  describe('long press', () => {
    it('should open menu on long press on touchscreen devices', async () => {
      const container = render(renderContextMenu());
      await flush();

      const trigger = container.querySelector('[data-testid="trigger"]') as HTMLElement;

      trigger.dispatchEvent(
        new TouchEvent('touchstart', {
          bubbles: true,
          cancelable: true,
          touches: [{ clientX: 100, clientY: 100 } as Touch],
        }),
      );

      // Wait for long press delay
      await new Promise<void>((resolve) => setTimeout(resolve, LONG_PRESS_DELAY + 50));
      await flush();

      const menuRoot = container.querySelector('menu-root') as any;
      expect(menuRoot.getOpen()).toBe(true);
    });

    it('should cancel long press when touch moves beyond threshold', async () => {
      const container = render(renderContextMenu());
      await flush();

      const trigger = container.querySelector('[data-testid="trigger"]') as HTMLElement;

      trigger.dispatchEvent(
        new TouchEvent('touchstart', {
          bubbles: true,
          cancelable: true,
          touches: [{ clientX: 100, clientY: 100 } as Touch],
        }),
      );

      // Move beyond threshold
      trigger.dispatchEvent(
        new TouchEvent('touchmove', {
          bubbles: true,
          cancelable: true,
          touches: [{ clientX: 100 + TOUCH_MOVE_THRESHOLD + 1, clientY: 100 } as Touch],
        }),
      );

      // Wait for long press delay
      await new Promise<void>((resolve) => setTimeout(resolve, LONG_PRESS_DELAY + 50));
      await flush();

      const menuRoot = container.querySelector('menu-root') as any;
      expect(menuRoot.getOpen()).toBe(false);
    });

    it('does not open on long press when disabled', async () => {
      const container = render(renderContextMenu({ disabled: true }));
      await flush();

      const trigger = container.querySelector('[data-testid="trigger"]') as HTMLElement;

      trigger.dispatchEvent(
        new TouchEvent('touchstart', {
          bubbles: true,
          cancelable: true,
          touches: [{ clientX: 100, clientY: 100 } as Touch],
        }),
      );

      await new Promise<void>((resolve) => setTimeout(resolve, LONG_PRESS_DELAY + 50));
      await flush();

      const menuRoot = container.querySelector('menu-root') as any;
      expect(menuRoot.getOpen()).toBe(false);
    });
  });
});

const LONG_PRESS_DELAY = 500;
const TOUCH_MOVE_THRESHOLD = 10;
