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
  TooltipRootElement,
  TooltipChangeEventDetails,
} from './index.ts';

describe('tooltip', () => {
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

  /** Advance fake timers precisely — for intermediate timing assertions
   *  where we must NOT drain future timers. */
  async function advanceTo(ms: number) {
    await vi.advanceTimersByTimeAsync(ms);
    for (let i = 0; i < 4; i++) {
      await Promise.resolve();
    }
  }

  /** Advance fake timers and drain all follow-up effects (rAF polyfill etc).
   *  Use for assertions where everything should have settled. */
  async function advance(ms = 0) {
    await vi.advanceTimersByTimeAsync(ms);
    await vi.runAllTimersAsync();
    for (let i = 0; i < 4; i++) {
      await Promise.resolve();
    }
  }

  function getRoot(container: HTMLElement) {
    return container.querySelector('tooltip-root') as TooltipRootElement;
  }

  function getTrigger(container: HTMLElement) {
    return container.querySelector('tooltip-trigger') as HTMLElement;
  }

  function getPopup(container: HTMLElement) {
    return container.querySelector('tooltip-popup') as HTMLElement;
  }

  function getPositioner(container: HTMLElement) {
    return container.querySelector('tooltip-positioner') as HTMLElement;
  }

  function getArrow(container: HTMLElement) {
    return container.querySelector('tooltip-arrow') as HTMLElement;
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

  function renderTooltip(rootProps: Record<string, unknown> = {}) {
    return html`
      <tooltip-root
        .defaultOpen=${rootProps.defaultOpen ?? false}
        .open=${rootProps.open}
        .onOpenChange=${rootProps.onOpenChange}
        ?disabled=${rootProps.disabled ?? false}
      >
        <tooltip-trigger
          .delay=${rootProps.delay ?? 0}
          .closeDelay=${rootProps.closeDelay ?? 0}
          .closeOnClick=${rootProps.closeOnClick ?? true}
          .disabled=${rootProps.triggerDisabled ?? false}
        >
          Trigger
        </tooltip-trigger>
        <tooltip-portal>
          <tooltip-positioner
            .side=${rootProps.side ?? 'bottom'}
            .sideOffset=${rootProps.sideOffset ?? 0}
            .align=${rootProps.align ?? 'center'}
            .collisionAvoidance=${rootProps.collisionAvoidance}
            .disableAnchorTracking=${rootProps.disableAnchorTracking ?? false}
          >
            <tooltip-popup>Tooltip content</tooltip-popup>
          </tooltip-positioner>
        </tooltip-portal>
      </tooltip-root>
    `;
  }

  it('renders tooltip-root as a custom element', async () => {
    const container = render(renderTooltip());
    await waitForUpdate();

    const root = getRoot(container);
    expect(root).toBeInTheDocument();
    expect(root).toHaveAttribute('data-base-ui-tooltip-root');
  });

  it('opens on hover with delay', async () => {
    vi.useFakeTimers();
    const container = render(renderTooltip({ delay: 100 }));
    await advance();

    const trigger = getTrigger(container);
    const popup = getPopup(container);

    // Initially closed
    expect(popup).toHaveAttribute('hidden');

    // Hover trigger
    mouseEnter(trigger);

    // Still closed before delay (precise timing, don't drain future timers)
    await advanceTo(50);
    expect(popup).toHaveAttribute('hidden');

    // Open after delay (drain all effects)
    await advance(60);

    expect(popup).not.toHaveAttribute('hidden');
    expect(popup).toHaveAttribute('role', 'tooltip');
  });

  it('opens immediately when delay is 0', async () => {
    vi.useFakeTimers();
    const container = render(renderTooltip({ delay: 0 }));
    await advance();

    mouseEnter(getTrigger(container));
    await advance();

    expect(getPopup(container)).not.toHaveAttribute('hidden');
  });

  it('closes on mouseleave', async () => {
    vi.useFakeTimers();
    const container = render(
      renderTooltip({ delay: 0, closeDelay: 0 }),
    );
    await advance();

    const trigger = getTrigger(container);

    // Open via hover
    mouseEnter(trigger);
    await advance();
    expect(getPopup(container)).not.toHaveAttribute('hidden');

    // Leave trigger
    mouseLeave(trigger);
    await advance();

    expect(getPopup(container)).toHaveAttribute('hidden');
  });

  it('opens on focus', async () => {
    const container = render(renderTooltip());
    await waitForUpdate();

    getTrigger(container).dispatchEvent(
      new FocusEvent('focusin', { bubbles: true, cancelable: true }),
    );
    await waitForUpdate();

    expect(getPopup(container)).not.toHaveAttribute('hidden');
    expect(getPopup(container)).toHaveAttribute('role', 'tooltip');
  });

  it('closes on blur', async () => {
    const container = render(renderTooltip());
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

  it('uses aria-describedby (not aria-expanded) on trigger', async () => {
    const container = render(renderTooltip());
    await waitForUpdate();

    const trigger = getTrigger(container);

    // Open via focus
    trigger.dispatchEvent(
      new FocusEvent('focusin', { bubbles: true, cancelable: true }),
    );
    await waitForUpdate();

    const popup = getPopup(container);

    expect(trigger).toHaveAttribute('aria-describedby', popup.id);
    expect(trigger).not.toHaveAttribute('aria-expanded');
    expect(trigger).not.toHaveAttribute('aria-controls');
  });

  it('removes aria-describedby when closed', async () => {
    const container = render(renderTooltip());
    await waitForUpdate();

    const trigger = getTrigger(container);

    // Initially no aria-describedby
    expect(trigger).not.toHaveAttribute('aria-describedby');

    // Open via focus
    trigger.dispatchEvent(
      new FocusEvent('focusin', { bubbles: true, cancelable: true }),
    );
    await waitForUpdate();
    expect(trigger).toHaveAttribute('aria-describedby');

    // Close via blur
    trigger.dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, cancelable: true }),
    );
    await waitForUpdate();
    expect(trigger).not.toHaveAttribute('aria-describedby');
  });

  it('calls onOpenChange with reason on hover', async () => {
    vi.useFakeTimers();
    const handleOpenChange = vi.fn();
    const container = render(
      renderTooltip({ delay: 0, onOpenChange: handleOpenChange }),
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
      renderTooltip({ onOpenChange: handleOpenChange }),
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
      (_open: boolean, details: TooltipChangeEventDetails) => {
        details.cancel();
      },
    );
    const container = render(
      renderTooltip({ onOpenChange: handleOpenChange }),
    );
    await waitForUpdate();

    getTrigger(container).dispatchEvent(
      new FocusEvent('focusin', { bubbles: true, cancelable: true }),
    );
    await waitForUpdate();

    expect(getPopup(container)).toHaveAttribute('hidden');
  });

  it('closes on Escape key', async () => {
    const handleOpenChange = vi.fn();
    const container = render(
      renderTooltip({
        defaultOpen: true,
        onOpenChange: handleOpenChange,
      }),
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

  it('supports controlled open state', async () => {
    const container = render(html``);

    function rerender(open: boolean) {
      renderTemplate(
        html`
          <tooltip-root .open=${open}>
            <tooltip-trigger .delay=${0}>Trigger</tooltip-trigger>
            <tooltip-portal>
              <tooltip-positioner>
                <tooltip-popup>Content</tooltip-popup>
              </tooltip-positioner>
            </tooltip-portal>
          </tooltip-root>
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

  it('closeOnClick cancels scheduled open and closes tooltip', async () => {
    vi.useFakeTimers();
    const handleOpenChange = vi.fn();
    const container = render(
      renderTooltip({
        delay: 0,
        closeOnClick: true,
        onOpenChange: handleOpenChange,
      }),
    );
    await advance();

    const trigger = getTrigger(container);

    // Open via hover
    mouseEnter(trigger);
    await advance();
    expect(getPopup(container)).not.toHaveAttribute('hidden');
    handleOpenChange.mockClear();

    // Click to close
    trigger.click();
    await advance();

    expect(handleOpenChange).toHaveBeenCalledTimes(1);
    expect(handleOpenChange.mock.calls[0]?.[0]).toBe(false);
    expect(handleOpenChange.mock.calls[0]?.[1].reason).toBe(
      'trigger-press',
    );
    expect(getPopup(container)).toHaveAttribute('hidden');
  });

  it('keeps tooltip when closeOnClick is false', async () => {
    vi.useFakeTimers();
    const container = render(
      renderTooltip({ delay: 0, closeOnClick: false }),
    );
    await advance();

    const trigger = getTrigger(container);

    // Open via hover
    mouseEnter(trigger);
    await advance();
    expect(getPopup(container)).not.toHaveAttribute('hidden');

    // Click should NOT close
    trigger.click();
    await advance();

    expect(getPopup(container)).not.toHaveAttribute('hidden');
  });

  it('disabled root prevents tooltip from opening', async () => {
    const container = render(renderTooltip({ disabled: true }));
    await waitForUpdate();

    getTrigger(container).dispatchEvent(
      new FocusEvent('focusin', { bubbles: true, cancelable: true }),
    );
    await waitForUpdate();

    expect(getPopup(container)).toHaveAttribute('hidden');
  });

  it('disabled trigger prevents tooltip but keeps trigger interactive', async () => {
    const container = render(
      renderTooltip({ triggerDisabled: true }),
    );
    await waitForUpdate();

    const trigger = getTrigger(container);

    expect(trigger).toHaveAttribute('data-trigger-disabled');
    expect(trigger).not.toHaveAttribute('disabled');
    expect(trigger).not.toHaveAttribute('aria-disabled');

    trigger.dispatchEvent(
      new FocusEvent('focusin', { bubbles: true, cancelable: true }),
    );
    await waitForUpdate();

    expect(getPopup(container)).toHaveAttribute('hidden');
  });

  it('popup has role=tooltip', async () => {
    const container = render(renderTooltip({ defaultOpen: true }));
    await waitForUpdate();

    expect(getPopup(container)).toHaveAttribute('role', 'tooltip');
  });

  it('calls floating-ui computePosition when open', async () => {
    const container = render(renderTooltip());
    await waitForUpdate();

    floatingUiMocks.computePosition.mockClear();

    getTrigger(container).dispatchEvent(
      new FocusEvent('focusin', { bubbles: true, cancelable: true }),
    );
    await waitForUpdate();

    expect(floatingUiMocks.computePosition).toHaveBeenCalled();
  });

  it('respects collisionAvoidance="none"', async () => {
    const container = render(
      renderTooltip({ collisionAvoidance: 'none' }),
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

  it('sets data-side and data-align on the positioner', async () => {
    const container = render(renderTooltip({ defaultOpen: true }));
    await waitForUpdate();

    const positioner = getPositioner(container);
    expect(positioner).toHaveAttribute('data-side', 'bottom');
    expect(positioner).toHaveAttribute('data-align', 'center');
  });

  it('passes disableAnchorTracking to autoUpdate', async () => {
    const container = render(
      renderTooltip({ disableAnchorTracking: true }),
    );
    await waitForUpdate();

    floatingUiMocks.autoUpdate.mockClear();

    getTrigger(container).dispatchEvent(
      new FocusEvent('focusin', { bubbles: true, cancelable: true }),
    );
    await waitForUpdate();

    const autoUpdateCall = floatingUiMocks.autoUpdate.mock.calls[0] as
      | [
          Element,
          Element,
          () => void,
          { elementResize?: boolean; layoutShift?: boolean },
        ]
      | undefined;

    expect(autoUpdateCall?.[3]).toMatchObject({
      elementResize: false,
      layoutShift: false,
    });
  });

  it('wires arrow element into positioning middleware', async () => {
    const container = render(html`
      <tooltip-root .defaultOpen=${true}>
        <tooltip-trigger .delay=${0}>Trigger</tooltip-trigger>
        <tooltip-portal>
          <tooltip-positioner>
            <tooltip-popup>
              <tooltip-arrow></tooltip-arrow>
              Content
            </tooltip-popup>
          </tooltip-positioner>
        </tooltip-portal>
      </tooltip-root>
    `);
    await waitForUpdate();

    const arrow = getArrow(container);
    expect(arrow).toHaveAttribute('aria-hidden', 'true');
    expect(arrow).toHaveAttribute('data-side', 'bottom');
    expect(arrow).toHaveAttribute('data-align', 'center');

    expect(floatingUiMocks.arrow).toHaveBeenCalled();
  });

  it('shows defaultOpen tooltip', async () => {
    const container = render(renderTooltip({ defaultOpen: true }));
    await waitForUpdate();

    const popup = getPopup(container);
    expect(popup).not.toHaveAttribute('hidden');
    expect(popup).toHaveAttribute('data-open');
  });

  it('logs error when parts are used outside root', () => {
    const errorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    render(html`<tooltip-trigger>Orphan</tooltip-trigger>`);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Tooltip parts must be placed within',
      ),
    );

    errorSpy.mockRestore();
  });

  it('provider sets display:contents', async () => {
    const container = render(html`
      <tooltip-provider>
        <tooltip-root>
          <tooltip-trigger .delay=${0}>Trigger</tooltip-trigger>
          <tooltip-portal>
            <tooltip-positioner>
              <tooltip-popup>Content</tooltip-popup>
            </tooltip-positioner>
          </tooltip-portal>
        </tooltip-root>
      </tooltip-provider>
    `);
    await waitForUpdate();

    const provider = container.querySelector(
      'tooltip-provider',
    ) as HTMLElement;
    expect(provider.style.display).toBe('contents');
  });

  it('trigger sets data-popup-open when tooltip is open', async () => {
    const container = render(renderTooltip());
    await waitForUpdate();

    const trigger = getTrigger(container);

    // Initially no data-popup-open
    expect(trigger).not.toHaveAttribute('data-popup-open');

    // Open via focus
    trigger.dispatchEvent(
      new FocusEvent('focusin', { bubbles: true, cancelable: true }),
    );
    await waitForUpdate();

    expect(trigger).toHaveAttribute('data-popup-open');

    // Close via blur
    trigger.dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, cancelable: true }),
    );
    await waitForUpdate();

    expect(trigger).not.toHaveAttribute('data-popup-open');
  });

  it('respects provider delay and closeDelay', async () => {
    vi.useFakeTimers();
    const container = render(html`
      <tooltip-provider .delay=${100} .closeDelay=${80}>
        <tooltip-root>
          <tooltip-trigger>Trigger</tooltip-trigger>
          <tooltip-portal>
            <tooltip-positioner>
              <tooltip-popup>Content</tooltip-popup>
            </tooltip-positioner>
          </tooltip-portal>
        </tooltip-root>
      </tooltip-provider>
    `);
    await advance();

    const trigger = getTrigger(container);

    mouseEnter(trigger);
    // Precise timing: 99ms < 100ms delay, should still be hidden
    await advanceTo(99);
    expect(getPopup(container)).toHaveAttribute('hidden');

    // At 100ms, timer fires + drain all effects
    await advance(1);
    expect(getPopup(container)).not.toHaveAttribute('hidden');

    mouseLeave(trigger);
    // Precise timing: 79ms < 80ms closeDelay, should still be open
    await advanceTo(79);
    expect(getPopup(container)).not.toHaveAttribute('hidden');

    // At 80ms, close timer fires + drain all effects
    await advance(1);
    expect(getPopup(container)).toHaveAttribute('hidden');
  });

  it('opens adjacent tooltips instantly inside a provider (warmth)', async () => {
    vi.useFakeTimers();
    const container = render(html`
      <tooltip-provider .timeout=${400}>
        <tooltip-root>
          <tooltip-trigger data-testid="trigger-one" .delay=${0}>
            One
          </tooltip-trigger>
          <tooltip-portal>
            <tooltip-positioner>
              <tooltip-popup data-testid="popup-one">One</tooltip-popup>
            </tooltip-positioner>
          </tooltip-portal>
        </tooltip-root>
        <tooltip-root>
          <tooltip-trigger data-testid="trigger-two" .delay=${100}>
            Two
          </tooltip-trigger>
          <tooltip-portal>
            <tooltip-positioner>
              <tooltip-popup data-testid="popup-two">Two</tooltip-popup>
            </tooltip-positioner>
          </tooltip-portal>
        </tooltip-root>
      </tooltip-provider>
    `);
    await advance();

    const triggerOne = container.querySelector(
      '[data-testid="trigger-one"]',
    ) as HTMLElement;
    const triggerTwo = container.querySelector(
      '[data-testid="trigger-two"]',
    ) as HTMLElement;

    // Open first tooltip
    mouseEnter(triggerOne);
    await advance();

    expect(
      container.querySelector('[data-testid="popup-one"]'),
    ).not.toHaveAttribute('hidden');

    // Leave first, enter second (within warmth timeout)
    mouseLeave(triggerOne);
    await advance();

    mouseEnter(triggerTwo);
    // Even though delay is 100, provider warmth should open instantly
    await advance();

    expect(
      container.querySelector('[data-testid="popup-two"]'),
    ).not.toHaveAttribute('hidden');
  });
});
