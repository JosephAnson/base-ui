import { html, nothing, render as renderTemplate } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';

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
  PopoverRootElement,
  PopoverChangeEventDetails,
} from './index.ts';

describe('popover', () => {
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

  function getTrigger(container: HTMLElement) {
    return container.querySelector('popover-trigger') as HTMLElement;
  }

  function getPopup(container: HTMLElement) {
    return container.querySelector('popover-popup') as HTMLElement;
  }

  function getPositioner(container: HTMLElement) {
    return container.querySelector('popover-positioner') as HTMLElement;
  }

  function getBackdrop(container: HTMLElement) {
    return container.querySelector('popover-backdrop') as HTMLElement;
  }

  function getClose(container: HTMLElement) {
    return container.querySelector('popover-close') as HTMLElement;
  }

  function getArrow(container: HTMLElement) {
    return container.querySelector('popover-arrow') as HTMLElement;
  }

  function renderPopover(rootProps: Record<string, unknown> = {}) {
    return html`
      <popover-root
        .defaultOpen=${rootProps.defaultOpen ?? false}
        .open=${rootProps.open}
        .onOpenChange=${rootProps.onOpenChange}
        .modal=${rootProps.modal ?? false}
        .disablePointerDismissal=${rootProps.disablePointerDismissal ?? false}
      >
        <popover-trigger>Trigger</popover-trigger>
        <popover-portal>
          <popover-backdrop></popover-backdrop>
          <popover-positioner
            .side=${rootProps.side ?? 'bottom'}
            .sideOffset=${rootProps.sideOffset ?? 0}
            .align=${rootProps.align ?? 'center'}
            .collisionAvoidance=${rootProps.collisionAvoidance}
            .disableAnchorTracking=${rootProps.disableAnchorTracking ?? false}
          >
            <popover-popup>
              <popover-title>Title</popover-title>
              <popover-description>Description</popover-description>
              <popover-close>Close</popover-close>
            </popover-popup>
          </popover-positioner>
        </popover-portal>
      </popover-root>
    `;
  }

  it('renders popover-root as a custom element', async () => {
    const container = render(renderPopover());
    await waitForUpdate();

    const root = container.querySelector(
      'popover-root',
    ) as PopoverRootElement;
    expect(root).toBeInTheDocument();
    expect(root).toHaveAttribute('data-base-ui-popover-root');
  });

  it('opens and closes through the trigger', async () => {
    const container = render(renderPopover());
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

    // Click trigger again to close (toggle)
    trigger.click();
    await waitForUpdate();

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(popup).toHaveAttribute('hidden');
  });

  it('calls onOpenChange with reason on trigger press', async () => {
    const handleOpenChange = vi.fn();
    const container = render(
      renderPopover({ onOpenChange: handleOpenChange }),
    );
    await waitForUpdate();

    getTrigger(container).click();
    await waitForUpdate();

    expect(handleOpenChange).toHaveBeenCalledTimes(1);
    expect(handleOpenChange.mock.calls[0]?.[0]).toBe(true);
    expect(handleOpenChange.mock.calls[0]?.[1].reason).toBe(
      'trigger-press',
    );
  });

  it('supports cancellation in onOpenChange', async () => {
    const handleOpenChange = vi.fn(
      (_open: boolean, details: PopoverChangeEventDetails) => {
        details.cancel();
      },
    );
    const container = render(
      renderPopover({ onOpenChange: handleOpenChange }),
    );
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
          <popover-root .open=${open}>
            <popover-trigger>Open</popover-trigger>
            <popover-portal>
              <popover-positioner>
                <popover-popup>Content</popover-popup>
              </popover-positioner>
            </popover-portal>
          </popover-root>
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

  it('closes on Escape key', async () => {
    const handleOpenChange = vi.fn();
    const container = render(
      renderPopover({
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

  it('closes on outside mousedown', async () => {
    const handleOpenChange = vi.fn();
    const container = render(
      renderPopover({
        defaultOpen: true,
        onOpenChange: handleOpenChange,
      }),
    );
    await waitForUpdate();
    handleOpenChange.mockClear();

    // Clicking outside (on document.body) should close
    document.body.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, cancelable: true }),
    );
    await waitForUpdate();

    expect(getPopup(container)).toHaveAttribute('hidden');
    expect(handleOpenChange).toHaveBeenCalledTimes(1);
    expect(handleOpenChange.mock.calls[0]?.[1].reason).toBe(
      'outside-press',
    );
  });

  it('closes through backdrop on click, not on mousedown', async () => {
    const container = render(renderPopover({ defaultOpen: true }));
    await waitForUpdate();

    const backdrop = getBackdrop(container);

    // Mousedown on backdrop should NOT close (excluded from outside-press)
    backdrop.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, cancelable: true }),
    );
    await waitForUpdate();
    expect(getPopup(container)).not.toHaveAttribute('hidden');

    // Click on backdrop SHOULD close
    backdrop.click();
    await waitForUpdate();
    expect(getPopup(container)).toHaveAttribute('hidden');
  });

  it('wires title, description, and close to the popup', async () => {
    const container = render(renderPopover({ defaultOpen: true }));
    await waitForUpdate();

    const popup = getPopup(container);
    const title = container.querySelector(
      'popover-title',
    ) as HTMLElement;
    const description = container.querySelector(
      'popover-description',
    ) as HTMLElement;

    expect(popup).toHaveAttribute('aria-labelledby', title.id);
    expect(popup).toHaveAttribute('aria-describedby', description.id);

    // Close button works
    getClose(container).click();
    await waitForUpdate();

    expect(getPopup(container)).toHaveAttribute('hidden');
  });

  it('onOpenChange reports close-press reason', async () => {
    const handleOpenChange = vi.fn();
    const container = render(
      renderPopover({
        defaultOpen: true,
        onOpenChange: handleOpenChange,
      }),
    );
    await waitForUpdate();
    handleOpenChange.mockClear();

    getClose(container).click();
    await waitForUpdate();

    expect(handleOpenChange).toHaveBeenCalledTimes(1);
    expect(handleOpenChange.mock.calls[0]?.[0]).toBe(false);
    expect(handleOpenChange.mock.calls[0]?.[1].reason).toBe(
      'close-press',
    );
  });

  it('sets aria-haspopup and aria-controls on trigger', async () => {
    const container = render(renderPopover({ defaultOpen: true }));
    await waitForUpdate();

    const trigger = getTrigger(container);
    const popup = getPopup(container);

    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    expect(trigger).toHaveAttribute('aria-controls', popup.id);
  });

  it('calls floating-ui computePosition when open', async () => {
    const container = render(renderPopover());
    await waitForUpdate();

    floatingUiMocks.computePosition.mockClear();

    getTrigger(container).click();
    await waitForUpdate();

    expect(floatingUiMocks.computePosition).toHaveBeenCalled();
  });

  it('respects collisionAvoidance="none"', async () => {
    const container = render(
      renderPopover({ collisionAvoidance: 'none' }),
    );
    await waitForUpdate();

    floatingUiMocks.computePosition.mockClear();
    floatingUiMocks.flip.mockClear();
    floatingUiMocks.shift.mockClear();

    getTrigger(container).click();
    await waitForUpdate();

    expect(floatingUiMocks.computePosition).toHaveBeenCalled();

    // Extract middleware from the computePosition call
    const call = floatingUiMocks.computePosition.mock.calls[0] as
      | [Element, Element, { middleware?: Array<{ name?: string }> }]
      | undefined;
    const middlewareNames =
      call?.[2]?.middleware?.map((m: { name?: string }) => m.name) ??
      [];

    expect(middlewareNames).toContain('offset');
    expect(middlewareNames).toContain('hide');
    expect(middlewareNames).not.toContain('flip');
    expect(middlewareNames).not.toContain('shift');
  });

  it('passes disableAnchorTracking to autoUpdate', async () => {
    const container = render(
      renderPopover({ disableAnchorTracking: true }),
    );
    await waitForUpdate();

    floatingUiMocks.autoUpdate.mockClear();

    getTrigger(container).click();
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

  it('sets data-side and data-align on the positioner', async () => {
    const container = render(renderPopover({ defaultOpen: true }));
    await waitForUpdate();

    const positioner = getPositioner(container);
    expect(positioner).toHaveAttribute('data-side', 'bottom');
    expect(positioner).toHaveAttribute('data-align', 'center');
  });

  it('respects disablePointerDismissal for outside clicks', async () => {
    const container = render(
      renderPopover({
        defaultOpen: true,
        disablePointerDismissal: true,
      }),
    );
    await waitForUpdate();

    // Outside mousedown should NOT close
    document.body.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, cancelable: true }),
    );
    await waitForUpdate();

    expect(getPopup(container)).not.toHaveAttribute('hidden');
  });

  it('wires arrow element into positioning middleware', async () => {
    const container = render(html`
      <popover-root .defaultOpen=${true}>
        <popover-trigger>Trigger</popover-trigger>
        <popover-portal>
          <popover-positioner>
            <popover-popup>
              <popover-arrow></popover-arrow>
              Content
            </popover-popup>
          </popover-positioner>
        </popover-portal>
      </popover-root>
    `);
    await waitForUpdate();

    const arrow = getArrow(container);
    expect(arrow).toHaveAttribute('aria-hidden', 'true');
    expect(arrow).toHaveAttribute('data-side', 'bottom');
    expect(arrow).toHaveAttribute('data-align', 'center');

    // Arrow middleware should have been included
    expect(floatingUiMocks.arrow).toHaveBeenCalled();
  });

  it('supports hover opening and closing', async () => {
    const container = render(html`
      <popover-root>
        <popover-trigger
          .openOnHover=${true}
          .delay=${0}
          .closeDelay=${0}
        >
          Hover trigger
        </popover-trigger>
        <popover-portal>
          <popover-positioner>
            <popover-popup>Hover popup</popover-popup>
          </popover-positioner>
        </popover-portal>
      </popover-root>
    `);
    await waitForUpdate();

    const trigger = getTrigger(container);

    trigger.dispatchEvent(
      new MouseEvent('mouseenter', {
        bubbles: true,
        cancelable: true,
      }),
    );
    await waitForUpdate();

    expect(getPopup(container)).not.toHaveAttribute('hidden');

    trigger.dispatchEvent(
      new MouseEvent('mouseleave', {
        bubbles: true,
        cancelable: true,
      }),
    );
    await waitForUpdate();

    expect(getPopup(container)).toHaveAttribute('hidden');
  });

  it('supports keyboard activation on trigger', async () => {
    const container = render(renderPopover());
    await waitForUpdate();

    const trigger = getTrigger(container);

    // Enter opens
    trigger.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: 'Enter',
      }),
    );
    await waitForUpdate();
    expect(getPopup(container)).not.toHaveAttribute('hidden');

    // Space closes (toggle)
    trigger.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: ' ',
      }),
    );
    await waitForUpdate();
    expect(getPopup(container)).toHaveAttribute('hidden');
  });

  it('dismisses stacked popovers one by one on Escape', async () => {
    const container = render(html`
      <popover-root .defaultOpen=${true}>
        <popover-positioner>
          <popover-popup data-testid="popup-1">
            Popover 1
            <popover-root .defaultOpen=${true}>
              <popover-positioner>
                <popover-popup data-testid="popup-2">
                  Popover 2
                </popover-popup>
              </popover-positioner>
            </popover-root>
          </popover-popup>
        </popover-positioner>
      </popover-root>
    `);
    await waitForUpdate();

    expect(
      container.querySelector('[data-testid="popup-2"]'),
    ).not.toHaveAttribute('hidden');

    // Escape closes topmost (popover 2)
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    await waitForUpdate();

    expect(
      container.querySelector('[data-testid="popup-2"]'),
    ).toHaveAttribute('hidden');
    expect(
      container.querySelector('[data-testid="popup-1"]'),
    ).not.toHaveAttribute('hidden');

    // Escape closes next (popover 1)
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    await waitForUpdate();

    expect(
      container.querySelector('[data-testid="popup-1"]'),
    ).toHaveAttribute('hidden');
  });

  it('backdrop has role=presentation', async () => {
    const container = render(renderPopover({ defaultOpen: true }));
    await waitForUpdate();

    const backdrop = getBackdrop(container);
    expect(backdrop).toHaveAttribute('role', 'presentation');
    expect(backdrop).not.toHaveAttribute('hidden');
    expect(backdrop).toHaveAttribute('data-open');
  });

  it('logs error when parts are used outside root', () => {
    const errorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    render(html`<popover-trigger>Orphan</popover-trigger>`);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Popover parts must be placed within',
      ),
    );

    errorSpy.mockRestore();
  });

  it('shows defaultOpen popover', async () => {
    const container = render(renderPopover({ defaultOpen: true }));
    await waitForUpdate();

    const trigger = getTrigger(container);
    const popup = getPopup(container);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(popup).not.toHaveAttribute('hidden');
  });
});
