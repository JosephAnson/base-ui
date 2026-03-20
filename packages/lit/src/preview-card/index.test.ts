import { html, nothing, render as renderTemplate } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

import './index.ts';
import type {
  PreviewCardRootElement,
  PreviewCardChangeEventDetails,
} from './index.ts';

describe('preview-card', () => {
  const containers = new Set<HTMLDivElement>();

  beforeEach(() => {
    (
      globalThis as typeof globalThis & {
        BASE_UI_ANIMATIONS_DISABLED?: boolean;
      }
    ).BASE_UI_ANIMATIONS_DISABLED = true;
  });

  afterEach(() => {
    containers.forEach((container) => {
      renderTemplate(nothing, container);
      container.remove();
    });
    containers.clear();
    vi.useRealTimers();
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

  /** Advance fake timers precisely — for intermediate timing assertions. */
  async function advanceTo(ms: number) {
    await vi.advanceTimersByTimeAsync(ms);
    for (let i = 0; i < 4; i++) {
      await Promise.resolve();
    }
  }

  /** Advance and drain all follow-up effects. */
  async function advance(ms = 0) {
    await vi.advanceTimersByTimeAsync(ms);
    await vi.runAllTimersAsync();
    for (let i = 0; i < 4; i++) {
      await Promise.resolve();
    }
  }

  function mouseEnter(element: Element) {
    element.dispatchEvent(
      new MouseEvent('mouseenter', { bubbles: true, cancelable: true }),
    );
  }

  function mouseLeave(element: Element) {
    element.dispatchEvent(
      new MouseEvent('mouseleave', { bubbles: true, cancelable: true }),
    );
  }

  function getRoot(container: HTMLElement) {
    return container.querySelector(
      'preview-card-root',
    ) as PreviewCardRootElement;
  }

  function getTrigger(container: HTMLElement) {
    return container.querySelector(
      'preview-card-trigger',
    ) as HTMLElement;
  }

  function getPopup(container: HTMLElement) {
    return container.querySelector('preview-card-popup') as HTMLElement;
  }

  function getPositioner(container: HTMLElement) {
    return container.querySelector(
      'preview-card-positioner',
    ) as HTMLElement;
  }

  function getArrow(container: HTMLElement) {
    return container.querySelector(
      'preview-card-arrow',
    ) as HTMLElement;
  }

  function getBackdrop(container: HTMLElement) {
    return container.querySelector(
      'preview-card-backdrop',
    ) as HTMLElement;
  }

  function renderPreviewCard(
    rootProps: Record<string, unknown> = {},
  ) {
    return html`
      <preview-card-root
        .defaultOpen=${rootProps.defaultOpen ?? false}
        .open=${rootProps.open}
        .onOpenChange=${rootProps.onOpenChange}
      >
        <preview-card-trigger
          .delay=${rootProps.delay ?? 0}
          .closeDelay=${rootProps.closeDelay ?? 0}
        >
          <a href="#">Trigger link</a>
        </preview-card-trigger>
        <preview-card-portal>
          <preview-card-backdrop></preview-card-backdrop>
          <preview-card-positioner
            .side=${rootProps.side ?? 'bottom'}
            .sideOffset=${rootProps.sideOffset ?? 0}
            .align=${rootProps.align ?? 'center'}
            .collisionAvoidance=${rootProps.collisionAvoidance}
            .disableAnchorTracking=${rootProps.disableAnchorTracking ?? false}
          >
            <preview-card-popup>
              <preview-card-arrow></preview-card-arrow>
              Preview content
            </preview-card-popup>
          </preview-card-positioner>
        </preview-card-portal>
      </preview-card-root>
    `;
  }

  it('renders preview-card-root as a custom element', async () => {
    const container = render(renderPreviewCard());
    await waitForUpdate();

    const root = getRoot(container);
    expect(root).toBeInTheDocument();
    expect(root).toHaveAttribute('data-base-ui-preview-card-root');
  });

  it('opens on hover after configured delay', async () => {
    vi.useFakeTimers();
    const container = render(renderPreviewCard({ delay: 100 }));
    await advance();

    const trigger = getTrigger(container);
    const popup = getPopup(container);

    // Initially closed
    expect(popup).toHaveAttribute('hidden');

    // Hover trigger
    mouseEnter(trigger);

    // Still closed before delay
    await advanceTo(50);
    expect(popup).toHaveAttribute('hidden');

    // Open after delay
    await advance(60);

    expect(popup).not.toHaveAttribute('hidden');
  });

  it('closes after close delay on mouseleave', async () => {
    vi.useFakeTimers();
    const container = render(
      renderPreviewCard({ delay: 0, closeDelay: 50 }),
    );
    await advance();

    const trigger = getTrigger(container);

    // Open via hover
    mouseEnter(trigger);
    await advance();
    expect(getPopup(container)).not.toHaveAttribute('hidden');

    // Leave trigger
    mouseLeave(trigger);

    // Still open during close delay
    await advanceTo(30);
    expect(getPopup(container)).not.toHaveAttribute('hidden');

    // Closed after close delay
    await advance(30);
    expect(getPopup(container)).toHaveAttribute('hidden');
  });

  it('keeps popup open when mouse moves from trigger to positioner', async () => {
    vi.useFakeTimers();
    const container = render(
      renderPreviewCard({ delay: 0, closeDelay: 50 }),
    );
    await advance();

    const trigger = getTrigger(container);
    const positioner = getPositioner(container);

    // Open via hover
    mouseEnter(trigger);
    await advance();
    expect(getPopup(container)).not.toHaveAttribute('hidden');

    // Leave trigger
    mouseLeave(trigger);

    // Enter positioner (part of hover region)
    mouseEnter(positioner);
    await advanceTo(100);

    // Still open because we're in the hover region
    expect(getPopup(container)).not.toHaveAttribute('hidden');
  });

  it('opens on focus after delay', async () => {
    vi.useFakeTimers();
    const container = render(renderPreviewCard({ delay: 100 }));
    await advance();

    const trigger = getTrigger(container);

    trigger.dispatchEvent(
      new FocusEvent('focusin', { bubbles: true, cancelable: true }),
    );

    // Still closed before delay
    await advanceTo(50);
    expect(getPopup(container)).toHaveAttribute('hidden');

    // Open after delay
    await advance(60);
    expect(getPopup(container)).not.toHaveAttribute('hidden');
  });

  it('opens immediately on focus when delay is 0', async () => {
    const container = render(renderPreviewCard({ delay: 0 }));
    await waitForUpdate();

    getTrigger(container).dispatchEvent(
      new FocusEvent('focusin', { bubbles: true, cancelable: true }),
    );
    await waitForUpdate();

    expect(getPopup(container)).not.toHaveAttribute('hidden');
  });

  it('closes on blur', async () => {
    const container = render(renderPreviewCard({ delay: 0 }));
    await waitForUpdate();

    const trigger = getTrigger(container);

    // Open via focus
    trigger.dispatchEvent(
      new FocusEvent('focusin', { bubbles: true, cancelable: true }),
    );
    await waitForUpdate();
    expect(getPopup(container)).not.toHaveAttribute('hidden');

    // Blur
    trigger.dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, cancelable: true }),
    );
    await waitForUpdate();

    expect(getPopup(container)).toHaveAttribute('hidden');
  });

  it('calls onOpenChange with reason on hover', async () => {
    vi.useFakeTimers();
    const handleOpenChange = vi.fn();
    const container = render(
      renderPreviewCard({
        delay: 0,
        onOpenChange: handleOpenChange,
      }),
    );
    await advance();

    mouseEnter(getTrigger(container));
    await advance();

    expect(handleOpenChange).toHaveBeenCalledTimes(1);
    expect(handleOpenChange.mock.calls[0]?.[0]).toBe(true);
    expect(handleOpenChange.mock.calls[0]?.[1].reason).toBe(
      'trigger-hover',
    );
  });

  it('calls onOpenChange with reason on focus', async () => {
    const handleOpenChange = vi.fn();
    const container = render(
      renderPreviewCard({
        delay: 0,
        onOpenChange: handleOpenChange,
      }),
    );
    await waitForUpdate();

    getTrigger(container).dispatchEvent(
      new FocusEvent('focusin', { bubbles: true, cancelable: true }),
    );
    await waitForUpdate();

    expect(handleOpenChange).toHaveBeenCalledTimes(1);
    expect(handleOpenChange.mock.calls[0]?.[0]).toBe(true);
    expect(handleOpenChange.mock.calls[0]?.[1].reason).toBe(
      'trigger-focus',
    );
  });

  it('supports cancellation in onOpenChange', async () => {
    const handleOpenChange = vi.fn(
      (_open: boolean, details: PreviewCardChangeEventDetails) => {
        details.cancel();
      },
    );
    const container = render(
      renderPreviewCard({
        delay: 0,
        onOpenChange: handleOpenChange,
      }),
    );
    await waitForUpdate();

    getTrigger(container).dispatchEvent(
      new FocusEvent('focusin', { bubbles: true, cancelable: true }),
    );
    await waitForUpdate();

    expect(getPopup(container)).toHaveAttribute('hidden');
  });

  it('supports controlled open state', async () => {
    const container = render(html``);

    function rerender(open: boolean) {
      renderTemplate(
        html`
          <preview-card-root .open=${open}>
            <preview-card-trigger .delay=${0}>
              <a href="#">Link</a>
            </preview-card-trigger>
            <preview-card-portal>
              <preview-card-positioner>
                <preview-card-popup>Content</preview-card-popup>
              </preview-card-positioner>
            </preview-card-portal>
          </preview-card-root>
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

  it('popup has no role attribute (passive semantics)', async () => {
    const container = render(
      renderPreviewCard({ defaultOpen: true }),
    );
    await waitForUpdate();

    const popup = getPopup(container);
    expect(popup).not.toHaveAttribute('role');
    expect(popup).not.toHaveAttribute('tabindex');
    expect(popup).not.toHaveAttribute('aria-labelledby');
    expect(popup).not.toHaveAttribute('aria-describedby');
  });

  it('trigger has no aria-expanded (passive semantics)', async () => {
    const container = render(
      renderPreviewCard({ defaultOpen: true }),
    );
    await waitForUpdate();

    const trigger = getTrigger(container);
    expect(trigger).not.toHaveAttribute('aria-expanded');
    expect(trigger).not.toHaveAttribute('aria-controls');
    expect(trigger).not.toHaveAttribute('aria-describedby');
    expect(trigger).toHaveAttribute('data-popup-open');
  });

  it('backdrop has pointer-events:none and role=presentation', async () => {
    const container = render(
      renderPreviewCard({ defaultOpen: true }),
    );
    await waitForUpdate();

    const backdrop = getBackdrop(container);
    expect(backdrop).toHaveAttribute('role', 'presentation');
    expect(backdrop.style.pointerEvents).toBe('none');
    expect(backdrop.style.userSelect).toBe('none');
  });

  it('calls floating-ui computePosition when open', async () => {
    const container = render(renderPreviewCard());
    await waitForUpdate();

    floatingUiMocks.computePosition.mockClear();

    getTrigger(container).dispatchEvent(
      new FocusEvent('focusin', { bubbles: true, cancelable: true }),
    );
    await waitForUpdate();

    expect(floatingUiMocks.computePosition).toHaveBeenCalled();
  });

  it('sets data-side and data-align on the positioner', async () => {
    const container = render(
      renderPreviewCard({ defaultOpen: true }),
    );
    await waitForUpdate();

    const positioner = getPositioner(container);
    expect(positioner).toHaveAttribute('data-side', 'bottom');
    expect(positioner).toHaveAttribute('data-align', 'center');
  });

  it('wires arrow element into positioning middleware', async () => {
    const container = render(
      renderPreviewCard({ defaultOpen: true }),
    );
    await waitForUpdate();

    const arrow = getArrow(container);
    expect(arrow).toHaveAttribute('aria-hidden', 'true');
    expect(arrow).toHaveAttribute('data-side', 'bottom');
    expect(arrow).toHaveAttribute('data-align', 'center');

    expect(floatingUiMocks.arrow).toHaveBeenCalled();
  });

  it('shows defaultOpen preview card', async () => {
    const container = render(
      renderPreviewCard({ defaultOpen: true }),
    );
    await waitForUpdate();

    const popup = getPopup(container);
    expect(popup).not.toHaveAttribute('hidden');
    expect(popup).toHaveAttribute('data-open');
  });

  it('logs error when parts are used outside root', () => {
    const errorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    render(
      html`<preview-card-trigger>Orphan</preview-card-trigger>`,
    );

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'PreviewCard parts must be placed within',
      ),
    );

    errorSpy.mockRestore();
  });

  it('trigger sets data-popup-open when open', async () => {
    const container = render(renderPreviewCard());
    await waitForUpdate();

    const trigger = getTrigger(container);

    expect(trigger).not.toHaveAttribute('data-popup-open');

    trigger.dispatchEvent(
      new FocusEvent('focusin', { bubbles: true, cancelable: true }),
    );
    await waitForUpdate();

    expect(trigger).toHaveAttribute('data-popup-open');

    trigger.dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, cancelable: true }),
    );
    await waitForUpdate();

    expect(trigger).not.toHaveAttribute('data-popup-open');
  });

  it('backdrop hidden when closed, visible when open', async () => {
    const container = render(renderPreviewCard());
    await waitForUpdate();

    expect(getBackdrop(container)).toHaveAttribute('hidden');

    getTrigger(container).dispatchEvent(
      new FocusEvent('focusin', { bubbles: true, cancelable: true }),
    );
    await waitForUpdate();

    expect(getBackdrop(container)).not.toHaveAttribute('hidden');
    expect(getBackdrop(container)).toHaveAttribute('data-open');
  });

  it('respects collisionAvoidance="none"', async () => {
    const container = render(
      renderPreviewCard({ collisionAvoidance: 'none' }),
    );
    await waitForUpdate();

    floatingUiMocks.computePosition.mockClear();
    floatingUiMocks.flip.mockClear();
    floatingUiMocks.shift.mockClear();

    getTrigger(container).dispatchEvent(
      new FocusEvent('focusin', { bubbles: true, cancelable: true }),
    );
    await waitForUpdate();

    expect(floatingUiMocks.computePosition).toHaveBeenCalled();

    const call = floatingUiMocks.computePosition.mock.calls[0] as
      | [Element, Element, { middleware?: Array<{ name?: string }> }]
      | undefined;
    const middlewareNames =
      call?.[2]?.middleware?.map((m: { name?: string }) => m.name) ?? [];

    expect(middlewareNames).toContain('offset');
    expect(middlewareNames).toContain('hide');
    expect(middlewareNames).not.toContain('flip');
    expect(middlewareNames).not.toContain('shift');
  });
});
