/* eslint-disable testing-library/render-result-naming-convention, no-plusplus, no-await-in-loop, no-promise-executor-return */
import { html, nothing, render as renderTemplate } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';

import './index';
import type {
  PopoverRootElement,
  PopoverChangeEventDetails,
} from './index';

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

  function getLatestElement<T extends HTMLElement>(selector: string) {
    const elements = Array.from(document.querySelectorAll(selector));
    return elements[elements.length - 1] as T;
  }

  function getPopup(_container: HTMLElement) {
    return getLatestElement<HTMLElement>('popover-popup');
  }

  function getPositioner(_container: HTMLElement) {
    return getLatestElement<HTMLElement>('popover-positioner');
  }

  function getBackdrop(_container: HTMLElement) {
    return getLatestElement<HTMLElement>('popover-backdrop');
  }

  function getClose(_container: HTMLElement) {
    return getLatestElement<HTMLElement>('popover-close');
  }

  function getArrow(_container: HTMLElement) {
    return getLatestElement<HTMLElement>('popover-arrow');
  }

  function getViewport(_container: HTMLElement) {
    return getLatestElement<HTMLElement>('popover-viewport');
  }

  function renderPopover(rootProps: Record<string, unknown> = {}) {
    return html`
      <popover-root
        .defaultOpen=${rootProps.defaultOpen ?? false}
        .open=${rootProps.open}
        .onOpenChange=${rootProps.onOpenChange}
        .onOpenChangeComplete=${rootProps.onOpenChangeComplete}
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

  it('teleports popup content into a portal attached to document.body by default', async () => {
    const view = render(renderPopover({ defaultOpen: true }));
    await waitForUpdate();

    const popup = getPopup(view);
    const portalContainer = popup.closest('[data-base-ui-popover-portal]');

    expect(portalContainer).toHaveAttribute('data-base-ui-popover-portal');
    expect(portalContainer?.parentElement).toBe(document.body);
  });

  it('teleports popup content into a custom portal container', async () => {
    const customContainer = document.createElement('div');
    document.body.append(customContainer);

    const view = render(html`
      <popover-root .defaultOpen=${true}>
        <popover-trigger>Trigger</popover-trigger>
        <popover-portal .container=${customContainer}>
          <popover-positioner>
            <popover-popup>Content</popover-popup>
          </popover-positioner>
        </popover-portal>
      </popover-root>
    `);
    await waitForUpdate();

    const popup = getPopup(view);
    const portalContainer = popup.closest('[data-base-ui-popover-portal]');

    expect(portalContainer).toHaveAttribute('data-base-ui-popover-portal');
    expect(portalContainer?.parentElement).toBe(customContainer);

    customContainer.remove();
  });

  it('supports a rendered non-native trigger', async () => {
    const container = render(html`
      <popover-root>
        <popover-trigger
          .nativeButton=${false}
          .render=${html`<div data-testid="rendered-trigger"></div>`}
        >
          Trigger
        </popover-trigger>
        <popover-portal>
          <popover-positioner>
            <popover-popup>Content</popover-popup>
          </popover-positioner>
        </popover-portal>
      </popover-root>
    `);
    await waitForUpdate();

    const triggerHost = getTrigger(container);
    const trigger = container.querySelector(
      '[data-testid="rendered-trigger"]',
    ) as HTMLElement;

    expect(triggerHost.style.display).toBe('contents');
    expect(trigger).toHaveAttribute('role', 'button');
    expect(trigger).toHaveAttribute('tabindex', '0');

    trigger.click();
    await waitForUpdate();

    expect(getPopup(container)).not.toHaveAttribute('hidden');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    trigger.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    await waitForUpdate();

    expect(getPopup(container)).toHaveAttribute('hidden');
  });

  it('anchors positioning to the rendered trigger element', async () => {
    const container = render(html`
      <popover-root>
        <popover-trigger
          .render=${html`<button data-testid="rendered-trigger"></button>`}
        >
          Trigger
        </popover-trigger>
        <popover-portal>
          <popover-positioner>
            <popover-popup>Content</popover-popup>
          </popover-positioner>
        </popover-portal>
      </popover-root>
    `);
    await waitForUpdate();

    const trigger = container.querySelector(
      '[data-testid="rendered-trigger"]',
    ) as HTMLElement;

    trigger.click();
    await waitForUpdate();

    expect(floatingUiMocks.computePosition).toHaveBeenCalled();
    expect(floatingUiMocks.computePosition.mock.calls.at(-1)?.[0]).toBe(trigger);
  });

  it('supports disabled rendered non-native triggers', async () => {
    const container = render(html`
      <popover-root>
        <popover-trigger
          .disabled=${true}
          .nativeButton=${false}
          .render=${html`<div data-testid="rendered-trigger"></div>`}
        >
          Trigger
        </popover-trigger>
        <popover-portal>
          <popover-positioner>
            <popover-popup>Content</popover-popup>
          </popover-positioner>
        </popover-portal>
      </popover-root>
    `);
    await waitForUpdate();

    const trigger = container.querySelector(
      '[data-testid="rendered-trigger"]',
    ) as HTMLElement;

    expect(trigger).toHaveAttribute('aria-disabled', 'true');
    expect(trigger).toHaveAttribute('tabindex', '-1');
    expect(trigger).not.toHaveAttribute('disabled');

    trigger.click();
    await waitForUpdate();

    expect(getPopup(container)).toHaveAttribute('hidden');
  });

  it('anchors positioning to a rendered positioner element', async () => {
    const container = render(html`
      <popover-root .defaultOpen=${true}>
        <popover-trigger>Trigger</popover-trigger>
        <popover-portal>
          <popover-positioner
            .render=${html`<div data-testid="rendered-positioner"></div>`}
          >
            <popover-popup>Content</popover-popup>
          </popover-positioner>
        </popover-portal>
      </popover-root>
    `);
    await waitForUpdate();

    const positionerHost = getPositioner(container);
    const renderedPositioners = document.querySelectorAll(
      '[data-testid="rendered-positioner"]',
    );
    const positioner = renderedPositioners[
      renderedPositioners.length - 1
    ] as HTMLElement;

    expect(positionerHost.style.display).toBe('contents');
    expect(positioner).toHaveAttribute('role', 'presentation');
    expect(positioner).toHaveAttribute('data-open');
    expect(floatingUiMocks.computePosition.mock.calls.at(-1)?.[1]).toBe(
      positioner,
    );
  });

  it('supports rendered close controls', async () => {
    const container = render(html`
      <popover-root .defaultOpen=${true}>
        <popover-trigger>Trigger</popover-trigger>
        <popover-portal>
          <popover-positioner>
            <popover-popup>
              <popover-close
                .nativeButton=${false}
                .render=${html`<div data-testid="rendered-close"></div>`}
              >
                Close
              </popover-close>
            </popover-popup>
          </popover-positioner>
        </popover-portal>
      </popover-root>
    `);
    await waitForUpdate();

    const closeHost = getClose(container);
    const close = document.querySelector(
      '[data-testid="rendered-close"]',
    ) as HTMLElement;

    expect(closeHost.style.display).toBe('contents');
    expect(close).toHaveAttribute('role', 'button');
    expect(close).toHaveAttribute('tabindex', '0');

    close.click();
    await waitForUpdate();

    expect(getPopup(container)).toHaveAttribute('hidden');
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
    const titleHost = document.querySelector(
      'popover-title',
    ) as HTMLElement;
    const descriptionHost = document.querySelector(
      'popover-description',
    ) as HTMLElement;
    const title = titleHost.querySelector('h2') as HTMLElement;
    const description = descriptionHost.querySelector('p') as HTMLElement;

    expect(popup).toHaveAttribute('aria-labelledby', title.id);
    expect(popup).toHaveAttribute('aria-describedby', description.id);
    expect(popup.style.display).toBe('block');
    expect(popup.style.position).toBe('relative');
    expect(titleHost.style.display).toBe('contents');
    expect(descriptionHost.style.display).toBe('contents');
    expect(title.style.display).toBe('block');
    expect(description.style.display).toBe('block');

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

  it('positions the arrow absolutely inside the popup', async () => {
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

    expect(arrow.style.position).toBe('absolute');
  });

  it('renders the viewport as a block-level box by default', async () => {
    const container = render(html`
      <popover-root .defaultOpen=${true}>
        <popover-trigger>Trigger</popover-trigger>
        <popover-portal>
          <popover-positioner>
            <popover-popup>
              <popover-viewport>Content</popover-viewport>
            </popover-popup>
          </popover-positioner>
        </popover-portal>
      </popover-root>
    `);
    await waitForUpdate();

    const viewport = getViewport(container);

    expect(viewport.style.display).toBe('block');
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
    expect(positioner.style.zIndex).toBe('1');
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

  it('supports detached triggers via a handle', async () => {
    const module = (await import('./index')) as typeof import('./index');
    const handle = module.createPopoverHandle<{ text: string }>();

    const container = render(html`
      <popover-trigger .handle=${handle} id="detached-trigger" .payload=${{ text: 'Trigger' }}>
        Detached
      </popover-trigger>
      <popover-root .handle=${handle}>
        <popover-portal>
          <popover-positioner>
            <popover-popup>Detached content</popover-popup>
          </popover-positioner>
        </popover-portal>
      </popover-root>
    `);
    await waitForUpdate();

    const trigger = getTrigger(container);
    trigger.click();
    await waitForUpdate();

    expect(getPopup(container)).not.toHaveAttribute('hidden');
    expect(handle.isOpen).toBe(true);
    expect(handle.activePayload).toEqual({ text: 'Trigger' });
  });

  it('supports imperative actions through actionsRef', async () => {
    const actionsRef = { current: null as import('./index').PopoverRootActions | null };
    const container = render(html`
      <popover-root .defaultOpen=${true} .actionsRef=${actionsRef}>
        <popover-trigger>Trigger</popover-trigger>
        <popover-portal>
          <popover-positioner>
            <popover-popup>Content</popover-popup>
          </popover-positioner>
        </popover-portal>
      </popover-root>
    `);
    await waitForUpdate();

    expect(actionsRef.current).not.toBeNull();
    actionsRef.current?.close();
    await waitForUpdate();
    expect(getPopup(container)).toHaveAttribute('hidden');
  });

  it('calls onOpenChangeComplete after the open state changes', async () => {
    const handleOpenChangeComplete = vi.fn();
    const container = render(
      renderPopover({ onOpenChangeComplete: handleOpenChangeComplete }),
    );
    await waitForUpdate();

    getTrigger(container).click();
    await waitForUpdate();

    expect(handleOpenChangeComplete).toHaveBeenCalledWith(true);
  });

  it('sets viewport activation direction when switching triggers', async () => {
    const module = (await import('./index')) as typeof import('./index');
    const handle = module.createPopoverHandle<string>();

    const container = render(html`
      <popover-trigger .handle=${handle} id="trigger-1" .payload=${'first'}>
        First
      </popover-trigger>
      <popover-trigger .handle=${handle} id="trigger-2" .payload=${'second'}>
        Second
      </popover-trigger>
      <popover-root .handle=${handle}>
        <popover-portal>
          <popover-positioner>
            <popover-popup>
              <popover-viewport>Content</popover-viewport>
            </popover-popup>
          </popover-positioner>
        </popover-portal>
      </popover-root>
    `);
    await waitForUpdate();

    const [firstTrigger, secondTrigger] = Array.from(
      container.querySelectorAll('popover-trigger'),
    ) as HTMLElement[];

    vi.spyOn(firstTrigger, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      width: 24,
      height: 24,
      top: 0,
      left: 0,
      right: 24,
      bottom: 24,
      toJSON: () => ({}),
    });
    vi.spyOn(secondTrigger, 'getBoundingClientRect').mockReturnValue({
      x: 120,
      y: 0,
      width: 24,
      height: 24,
      top: 0,
      left: 120,
      right: 144,
      bottom: 24,
      toJSON: () => ({}),
    });

    firstTrigger.click();
    await waitForUpdate();

    expect(getViewport(container)).not.toHaveAttribute(
      'data-activation-direction',
    );

    secondTrigger.click();
    await waitForUpdate();

    expect(getPopup(container)).not.toHaveAttribute('hidden');
    expect(firstTrigger).toHaveAttribute('aria-expanded', 'false');
    expect(secondTrigger).toHaveAttribute('aria-expanded', 'true');
    expect(getViewport(container)).toHaveAttribute(
      'data-activation-direction',
      'right',
    );
    expect(handle.activePayload).toBe('second');
  });

  it('wraps viewport content in current and previous containers when switching triggers', async () => {
    const module = (await import('./index')) as typeof import('./index');
    const handle = module.createPopoverHandle<string>();

    const container = render(html`
      <popover-trigger .handle=${handle} id="trigger-1" .payload=${'first'}>
        First
      </popover-trigger>
      <popover-trigger .handle=${handle} id="trigger-2" .payload=${'second'}>
        Second
      </popover-trigger>
      <popover-root .handle=${handle}>
        <popover-portal>
          <popover-positioner>
            <popover-popup>
              <popover-viewport></popover-viewport>
            </popover-popup>
          </popover-positioner>
        </popover-portal>
      </popover-root>
    `);
    await waitForUpdate();

    const viewport = getViewport(container);
    const root = container.querySelector('popover-root') as HTMLElement;
    const syncViewportContent = () => {
      renderTemplate(html`${handle.activePayload ?? ''}`, viewport);
    };

    root.addEventListener('base-ui-popover-state-change', syncViewportContent);
    syncViewportContent();

    const [firstTrigger, secondTrigger] = Array.from(
      container.querySelectorAll('popover-trigger'),
    ) as HTMLElement[];

    vi.spyOn(firstTrigger, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      width: 24,
      height: 24,
      top: 0,
      left: 0,
      right: 24,
      bottom: 24,
      toJSON: () => ({}),
    });
    vi.spyOn(secondTrigger, 'getBoundingClientRect').mockReturnValue({
      x: 120,
      y: 0,
      width: 24,
      height: 24,
      top: 0,
      left: 120,
      right: 144,
      bottom: 24,
      toJSON: () => ({}),
    });

    firstTrigger.click();
    await waitForUpdate();
    expect(viewport.querySelector('[data-current]')?.textContent).toContain('first');

    secondTrigger.click();
    await waitForUpdate();

    expect(viewport).toHaveAttribute('data-transitioning');
    expect(viewport.querySelector('[data-previous]')?.textContent).toContain('first');
    expect(viewport.querySelector('[data-current]')?.textContent).toContain('second');
  });

  it('avoids reentrant viewport sync loops when the content includes popover titles and descriptions', async () => {
    const module = (await import('./index')) as typeof import('./index');
    const handle = module.createPopoverHandle<string>();

    const container = render(html`
      <popover-trigger .handle=${handle} id="trigger-1" .payload=${'first'}>
        First
      </popover-trigger>
      <popover-trigger .handle=${handle} id="trigger-2" .payload=${'second'}>
        Second
      </popover-trigger>
      <popover-root .handle=${handle}>
        <popover-portal>
          <popover-positioner>
            <popover-popup>
              <popover-viewport></popover-viewport>
            </popover-popup>
          </popover-positioner>
        </popover-portal>
      </popover-root>
    `);
    await waitForUpdate();

    const viewport = getViewport(container);
    const root = container.querySelector('popover-root') as HTMLElement;
    let syncQueued = false;
    const syncViewportContent = () => {
      if (syncQueued) {
        return;
      }

      syncQueued = true;
      queueMicrotask(() => {
        syncQueued = false;
        renderTemplate(
          html`
            <popover-title>${handle.activePayload ?? ''}</popover-title>
            <popover-description>${handle.activePayload ?? ''}</popover-description>
          `,
          viewport,
        );
      });
    };
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    root.addEventListener('base-ui-popover-state-change', syncViewportContent);
    syncViewportContent();

    const [firstTrigger, secondTrigger] = Array.from(
      container.querySelectorAll('popover-trigger'),
    ) as HTMLElement[];

    vi.spyOn(firstTrigger, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      width: 24,
      height: 24,
      top: 0,
      left: 0,
      right: 24,
      bottom: 24,
      toJSON: () => ({}),
    });
    vi.spyOn(secondTrigger, 'getBoundingClientRect').mockReturnValue({
      x: 120,
      y: 0,
      width: 24,
      height: 24,
      top: 0,
      left: 120,
      right: 144,
      bottom: 24,
      toJSON: () => ({}),
    });

    firstTrigger.click();
    await waitForUpdate();
    secondTrigger.click();
    await waitForUpdate();

    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(viewport.querySelector('[data-previous]')?.textContent).toContain('first');
    expect(viewport.querySelector('[data-current]')?.textContent).toContain('second');
  });

  it('combines horizontal and vertical activation directions with movement tolerance', async () => {
    const module = (await import('./index')) as typeof import('./index');
    const handle = module.createPopoverHandle<string>();

    const container = render(html`
      <popover-trigger .handle=${handle} id="trigger-1" .payload=${'first'}>
        First
      </popover-trigger>
      <popover-trigger .handle=${handle} id="trigger-2" .payload=${'second'}>
        Second
      </popover-trigger>
      <popover-root .handle=${handle}>
        <popover-portal>
          <popover-positioner>
            <popover-popup>
              <popover-viewport>Content</popover-viewport>
            </popover-popup>
          </popover-positioner>
        </popover-portal>
      </popover-root>
    `);
    await waitForUpdate();

    const [firstTrigger, secondTrigger] = Array.from(
      container.querySelectorAll('popover-trigger'),
    ) as HTMLElement[];

    vi.spyOn(firstTrigger, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      width: 24,
      height: 24,
      top: 0,
      left: 0,
      right: 24,
      bottom: 24,
      toJSON: () => ({}),
    });
    vi.spyOn(secondTrigger, 'getBoundingClientRect').mockReturnValue({
      x: 120,
      y: 80,
      width: 24,
      height: 24,
      top: 80,
      left: 120,
      right: 144,
      bottom: 104,
      toJSON: () => ({}),
    });

    firstTrigger.click();
    await waitForUpdate();
    secondTrigger.click();
    await waitForUpdate();

    expect(getViewport(container)).toHaveAttribute(
      'data-activation-direction',
      'right down',
    );
  });

  it('exports the Popover runtime namespace', async () => {
    const module = (await import('./index')) as typeof import('./index');

    expect(module.Popover.Root).toBeTypeOf('function');
    expect(module.Popover.Trigger).toBeTypeOf('function');
    expect(module.Popover.Portal).toBeTypeOf('function');
    expect(module.Popover.Positioner).toBeTypeOf('function');
    expect(module.Popover.Popup).toBeTypeOf('function');
    expect(module.Popover.Arrow).toBeTypeOf('function');
    expect(module.Popover.Backdrop).toBeTypeOf('function');
    expect(module.Popover.Title).toBeTypeOf('function');
    expect(module.Popover.Description).toBeTypeOf('function');
    expect(module.Popover.Close).toBeTypeOf('function');
    expect(module.Popover.Viewport).toBeTypeOf('function');
    expect(module.Popover.createHandle).toBe(module.createPopoverHandle);
    expect(module.Popover.Handle).toBe(module.PopoverHandle);
  });
});
