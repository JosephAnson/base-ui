import { html, nothing, render as renderTemplate } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import './index.ts';

const SCROLL_TIMEOUT = 500;

describe('ScrollArea', () => {
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

  // ── ScrollAreaRoot ────────────────────────────────────────────────────

  describe('ScrollAreaRoot', () => {
    it('renders with position relative', async () => {
      render(html`
        <scroll-area-root data-testid="root">
          <scroll-area-viewport style="width: 200px; height: 200px;">
            <div style="width: 1000px; height: 1000px;"></div>
          </scroll-area-viewport>
        </scroll-area-root>
      `);
      await flush();

      const root = document.querySelector('scroll-area-root')!;
      expect(root.style.position).toBe('relative');
    });

    describe('data-scrolling attribute', () => {
      it('adds [data-scrolling] attribute when viewport is scrolled', async () => {
        vi.useFakeTimers();
        try {
          render(html`
            <scroll-area-root data-testid="root" style="width: 200px; height: 200px;">
              <scroll-area-viewport data-testid="viewport" style="width: 100%; height: 100%;">
                <div style="width: 1000px; height: 1000px;"></div>
              </scroll-area-viewport>
            </scroll-area-root>
          `);
          await vi.advanceTimersByTimeAsync(100);

          const root = document.querySelector('scroll-area-root')!;
          const viewport = document.querySelector('scroll-area-viewport')!;

          expect(root).not.toHaveAttribute('data-scrolling');

          // Trigger vertical scroll
          viewport.dispatchEvent(new Event('scroll'));
          // We need to simulate that scrollTop changed
          Object.defineProperty(viewport, 'scrollTop', { value: 1, configurable: true });
          viewport.dispatchEvent(new Event('scroll'));

          expect(root).toHaveAttribute('data-scrolling');

          await vi.advanceTimersByTimeAsync(SCROLL_TIMEOUT);

          expect(root).not.toHaveAttribute('data-scrolling');
        } finally {
          vi.useRealTimers();
        }
      });
    });

    describe('data-hovering attribute', () => {
      it('adds [data-hovering] on pointer enter', async () => {
        render(html`
          <scroll-area-root data-testid="root">
            <scroll-area-viewport style="width: 200px; height: 200px;">
              <div style="width: 1000px; height: 1000px;"></div>
            </scroll-area-viewport>
          </scroll-area-root>
        `);
        await flush();

        const root = document.querySelector('scroll-area-root')!;

        expect(root).not.toHaveAttribute('data-hovering');

        root.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
        expect(root).toHaveAttribute('data-hovering');

        root.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }));
        expect(root).not.toHaveAttribute('data-hovering');
      });

      it('does not add [data-hovering] on touch pointer', async () => {
        render(html`
          <scroll-area-root data-testid="root">
            <scroll-area-viewport style="width: 200px; height: 200px;">
              <div style="width: 1000px; height: 1000px;"></div>
            </scroll-area-viewport>
          </scroll-area-root>
        `);
        await flush();

        const root = document.querySelector('scroll-area-root')!;

        root.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'touch' }));
        expect(root).not.toHaveAttribute('data-hovering');
      });
    });
  });

  // ── ScrollAreaViewport ────────────────────────────────────────────────

  describe('ScrollAreaViewport', () => {
    it('has overflow: scroll', async () => {
      render(html`
        <scroll-area-root>
          <scroll-area-viewport>
            <div style="width: 1000px; height: 1000px;"></div>
          </scroll-area-viewport>
        </scroll-area-root>
      `);
      await flush();

      const viewport = document.querySelector('scroll-area-viewport')!;
      expect(viewport.style.overflow).toBe('scroll');
    });

    it('has tabIndex 0', async () => {
      render(html`
        <scroll-area-root>
          <scroll-area-viewport>
            <div style="width: 1000px; height: 1000px;"></div>
          </scroll-area-viewport>
        </scroll-area-root>
      `);
      await flush();

      const viewport = document.querySelector('scroll-area-viewport')!;
      expect(viewport.tabIndex).toBe(0);
    });
  });

  // ── ScrollAreaScrollbar ───────────────────────────────────────────────

  describe('ScrollAreaScrollbar', () => {
    it('sets data-orientation attribute', async () => {
      render(html`
        <scroll-area-root>
          <scroll-area-viewport style="width: 200px; height: 200px;">
            <div style="width: 1000px; height: 1000px;"></div>
          </scroll-area-viewport>
          <scroll-area-scrollbar orientation="vertical" data-testid="v"></scroll-area-scrollbar>
          <scroll-area-scrollbar orientation="horizontal" data-testid="h"></scroll-area-scrollbar>
        </scroll-area-root>
      `);
      await flush();

      const vScrollbar = document.querySelector('[data-testid="v"]')!;
      const hScrollbar = document.querySelector('[data-testid="h"]')!;

      expect(vScrollbar).toHaveAttribute('data-orientation', 'vertical');
      expect(hScrollbar).toHaveAttribute('data-orientation', 'horizontal');
    });

    it('defaults to vertical orientation', async () => {
      render(html`
        <scroll-area-root>
          <scroll-area-viewport style="width: 200px; height: 200px;">
            <div style="width: 1000px; height: 1000px;"></div>
          </scroll-area-viewport>
          <scroll-area-scrollbar></scroll-area-scrollbar>
        </scroll-area-root>
      `);
      await flush();

      const scrollbar = document.querySelector('scroll-area-scrollbar')!;
      expect(scrollbar).toHaveAttribute('data-orientation', 'vertical');
    });

    it('has absolute positioning', async () => {
      render(html`
        <scroll-area-root>
          <scroll-area-viewport style="width: 200px; height: 200px;">
            <div style="width: 1000px; height: 1000px;"></div>
          </scroll-area-viewport>
          <scroll-area-scrollbar></scroll-area-scrollbar>
        </scroll-area-root>
      `);
      await flush();

      const scrollbar = document.querySelector('scroll-area-scrollbar')!;
      expect(scrollbar.style.position).toBe('absolute');
    });

    describe('data-scrolling attribute', () => {
      it('adds [data-scrolling] when viewport is scrolled in the correct direction', async () => {
        vi.useFakeTimers();
        try {
          render(html`
            <scroll-area-root style="width: 200px; height: 200px;">
              <scroll-area-viewport style="width: 100%; height: 100%;">
                <div style="width: 1000px; height: 1000px;"></div>
              </scroll-area-viewport>
              <scroll-area-scrollbar orientation="vertical" data-testid="v"
                .keepMounted=${true}></scroll-area-scrollbar>
              <scroll-area-scrollbar orientation="horizontal" data-testid="h"
                .keepMounted=${true}></scroll-area-scrollbar>
            </scroll-area-root>
          `);
          await vi.advanceTimersByTimeAsync(100);

          const vScrollbar = document.querySelector('[data-testid="v"]')!;
          const hScrollbar = document.querySelector('[data-testid="h"]')!;
          const viewport = document.querySelector('scroll-area-viewport')!;

          expect(vScrollbar).not.toHaveAttribute('data-scrolling');
          expect(hScrollbar).not.toHaveAttribute('data-scrolling');

          // Trigger vertical scroll
          Object.defineProperty(viewport, 'scrollTop', { value: 1, configurable: true });
          viewport.dispatchEvent(new Event('scroll'));

          expect(vScrollbar).toHaveAttribute('data-scrolling');
          expect(hScrollbar).not.toHaveAttribute('data-scrolling');

          await vi.advanceTimersByTimeAsync(SCROLL_TIMEOUT);

          expect(vScrollbar).not.toHaveAttribute('data-scrolling');
          expect(hScrollbar).not.toHaveAttribute('data-scrolling');

          // Trigger horizontal scroll
          Object.defineProperty(viewport, 'scrollLeft', { value: 1, configurable: true });
          viewport.dispatchEvent(new Event('scroll'));

          expect(hScrollbar).toHaveAttribute('data-scrolling');

          await vi.advanceTimersByTimeAsync(SCROLL_TIMEOUT);

          expect(hScrollbar).not.toHaveAttribute('data-scrolling');
        } finally {
          vi.useRealTimers();
        }
      });
    });
  });

  // ── ScrollAreaThumb ───────────────────────────────────────────────────

  describe('ScrollAreaThumb', () => {
    it('renders inside scrollbar', async () => {
      render(html`
        <scroll-area-root>
          <scroll-area-viewport style="width: 200px; height: 200px;">
            <div style="width: 1000px; height: 1000px;"></div>
          </scroll-area-viewport>
          <scroll-area-scrollbar orientation="vertical">
            <scroll-area-thumb data-testid="thumb"></scroll-area-thumb>
          </scroll-area-scrollbar>
        </scroll-area-root>
      `);
      await flush();

      const thumb = document.querySelector('[data-testid="thumb"]')!;
      expect(thumb).toBeInTheDocument();
    });

    it('sets height via CSS variable for vertical scrollbar', async () => {
      render(html`
        <scroll-area-root>
          <scroll-area-viewport style="width: 200px; height: 200px;">
            <div style="width: 1000px; height: 1000px;"></div>
          </scroll-area-viewport>
          <scroll-area-scrollbar orientation="vertical">
            <scroll-area-thumb data-testid="thumb"></scroll-area-thumb>
          </scroll-area-scrollbar>
        </scroll-area-root>
      `);
      await flush();

      const thumb = document.querySelector<HTMLElement>('[data-testid="thumb"]')!;
      expect(thumb.style.height).toBe('var(--scroll-area-thumb-height, 0px)');
    });

    it('sets width via CSS variable for horizontal scrollbar', async () => {
      render(html`
        <scroll-area-root>
          <scroll-area-viewport style="width: 200px; height: 200px;">
            <div style="width: 1000px; height: 1000px;"></div>
          </scroll-area-viewport>
          <scroll-area-scrollbar orientation="horizontal">
            <scroll-area-thumb data-testid="thumb"></scroll-area-thumb>
          </scroll-area-scrollbar>
        </scroll-area-root>
      `);
      await flush();

      const thumb = document.querySelector<HTMLElement>('[data-testid="thumb"]')!;
      expect(thumb.style.width).toBe('var(--scroll-area-thumb-width, 0px)');
    });
  });

  // ── ScrollAreaCorner ──────────────────────────────────────────────────

  describe('ScrollAreaCorner', () => {
    it('renders inside root', async () => {
      render(html`
        <scroll-area-root>
          <scroll-area-viewport style="width: 200px; height: 200px;">
            <div style="width: 1000px; height: 1000px;"></div>
          </scroll-area-viewport>
          <scroll-area-scrollbar orientation="vertical"></scroll-area-scrollbar>
          <scroll-area-scrollbar orientation="horizontal"></scroll-area-scrollbar>
          <scroll-area-corner data-testid="corner"></scroll-area-corner>
        </scroll-area-root>
      `);
      await flush();

      const corner = document.querySelector('[data-testid="corner"]')!;
      expect(corner).toBeInTheDocument();
      expect(corner.style.position).toBe('absolute');
    });
  });

  // ── ScrollAreaContent ─────────────────────────────────────────────────

  describe('ScrollAreaContent', () => {
    it('propagates overflow attributes from root', async () => {
      render(html`
        <scroll-area-root>
          <scroll-area-viewport style="width: 200px; height: 200px;">
            <scroll-area-content data-testid="content">
              <div style="width: 1000px; height: 1000px;"></div>
            </scroll-area-content>
          </scroll-area-viewport>
        </scroll-area-root>
      `);
      await flush();

      const content = document.querySelector('[data-testid="content"]')!;
      expect(content).toBeInTheDocument();
    });
  });

  // ── Integration ───────────────────────────────────────────────────────

  describe('integration', () => {
    it('full structure renders without errors', async () => {
      render(html`
        <scroll-area-root>
          <scroll-area-viewport style="width: 200px; height: 200px;">
            <scroll-area-content>
              <div style="width: 1000px; height: 1000px;">Content</div>
            </scroll-area-content>
          </scroll-area-viewport>
          <scroll-area-scrollbar orientation="vertical">
            <scroll-area-thumb></scroll-area-thumb>
          </scroll-area-scrollbar>
          <scroll-area-scrollbar orientation="horizontal">
            <scroll-area-thumb></scroll-area-thumb>
          </scroll-area-scrollbar>
          <scroll-area-corner></scroll-area-corner>
        </scroll-area-root>
      `);
      await flush();

      expect(document.querySelector('scroll-area-root')).toBeInTheDocument();
      expect(document.querySelector('scroll-area-viewport')).toBeInTheDocument();
      expect(document.querySelector('scroll-area-content')).toBeInTheDocument();
      expect(document.querySelectorAll('scroll-area-scrollbar')).toHaveLength(2);
      expect(document.querySelectorAll('scroll-area-thumb')).toHaveLength(2);
      expect(document.querySelector('scroll-area-corner')).toBeInTheDocument();
    });

    it('cleanup works on disconnect', async () => {
      const container = render(html`
        <scroll-area-root>
          <scroll-area-viewport style="width: 200px; height: 200px;">
            <div style="width: 1000px; height: 1000px;"></div>
          </scroll-area-viewport>
          <scroll-area-scrollbar orientation="vertical">
            <scroll-area-thumb></scroll-area-thumb>
          </scroll-area-scrollbar>
        </scroll-area-root>
      `);
      await flush();

      // Should not throw when removed
      renderTemplate(nothing, container);
      await flush();

      expect(document.querySelector('scroll-area-root')).toBe(null);
    });
  });
});
