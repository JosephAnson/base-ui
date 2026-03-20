/* eslint-disable testing-library/render-result-naming-convention */
import { html, nothing, render as renderTemplate, type TemplateResult } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import type { BaseUIChangeEventDetails } from '@base-ui/lit/types';

import type {
  PopoverArrowProps,
  PopoverArrowState,
  PopoverBackdropProps,
  PopoverBackdropState,
  PopoverCloseProps,
  PopoverDescriptionProps,
  PopoverPopupProps,
  PopoverPopupState,
  PopoverPositionerProps,
  PopoverPositionerState,
  PopoverRootChangeEventDetails,
  PopoverRootProps,
  PopoverTitleProps,
  PopoverTriggerProps,
  PopoverTriggerState,
  PopoverViewportProps,
  PopoverViewportState,
} from '@base-ui/lit/popover';
import { Popover } from '@base-ui/lit/popover';

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

describe('Popover', () => {
  const containers = new Set<HTMLDivElement>();

  afterEach(async () => {
    containers.forEach((container) => {
      renderTemplate(nothing, container);
      container.remove();
    });
    containers.clear();

    document.body.querySelectorAll('[data-base-ui-popover-portal]').forEach((element) => {
      element.parentElement?.remove();
    });

    await flush();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  function render(result: TemplateResult) {
    const container = document.createElement('div');
    document.body.append(container);
    containers.add(container);

    renderTemplate(result, container);
    return container;
  }

  async function flush() {
    await Promise.resolve();
    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 50);
    });
    await Promise.resolve();
  }

  function click(element: Element) {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  }

  function mouseEnter(element: Element) {
    element.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, cancelable: true }));
  }

  function mouseLeave(element: Element) {
    element.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true, cancelable: true }));
  }

  function getPopup() {
    return document.body.querySelector('[data-testid="popup"]') as HTMLElement | null;
  }

  function renderPopover(props: PopoverRootProps = {}) {
    return Popover.Root({
      ...props,
      children: [
        Popover.Trigger({
          'data-testid': 'trigger',
          children: 'Trigger',
        }),
        Popover.Portal({
          children: Popover.Positioner({
            children: Popover.Popup({
              'data-testid': 'popup',
              children: 'Popup',
            }),
          }),
        }),
      ],
    });
  }

  it('preserves the public type contracts', () => {
    const root = Popover.Root({});
    const trigger = Popover.Trigger({});
    const portal = Popover.Portal({});
    const positioner = Popover.Positioner({});
    const popup = Popover.Popup({});
    const arrow = Popover.Arrow({});
    const backdrop = Popover.Backdrop({});
    const title = Popover.Title({});
    const description = Popover.Description({});
    const close = Popover.Close({});
    const viewport = Popover.Viewport({});

    expectTypeOf(root).toMatchTypeOf<TemplateResult>();
    expectTypeOf(trigger).toMatchTypeOf<TemplateResult>();
    expectTypeOf(portal).toMatchTypeOf<TemplateResult>();
    expectTypeOf(positioner).toMatchTypeOf<TemplateResult>();
    expectTypeOf(popup).toMatchTypeOf<TemplateResult>();
    expectTypeOf(arrow).toMatchTypeOf<TemplateResult>();
    expectTypeOf(backdrop).toMatchTypeOf<TemplateResult>();
    expectTypeOf(title).toMatchTypeOf<TemplateResult>();
    expectTypeOf(description).toMatchTypeOf<TemplateResult>();
    expectTypeOf(close).toMatchTypeOf<TemplateResult>();
    expectTypeOf(viewport).toMatchTypeOf<TemplateResult>();
    expectTypeOf<PopoverRootProps['open']>().toEqualTypeOf<boolean | undefined>();
    expectTypeOf<PopoverTriggerProps['nativeButton']>().toEqualTypeOf<boolean | undefined>();
    expectTypeOf<PopoverPositionerProps['sideOffset']>().toEqualTypeOf<number | undefined>();
    expectTypeOf<PopoverPopupProps['initialFocus']>().not.toBeAny();
    expectTypeOf<PopoverRootChangeEventDetails>().toEqualTypeOf<
      BaseUIChangeEventDetails<
        | 'trigger-hover'
        | 'trigger-focus'
        | 'trigger-press'
        | 'outside-press'
        | 'escape-key'
        | 'close-press'
        | 'focus-out'
        | 'imperative-action'
        | 'none',
        { preventUnmountOnClose(): void }
      >
    >();
    expectTypeOf<PopoverTriggerState['open']>().toEqualTypeOf<boolean>();
    expectTypeOf<PopoverPositionerState['side']>().toEqualTypeOf<
      'top' | 'right' | 'bottom' | 'left'
    >();
    expectTypeOf<PopoverPopupState['transitionStatus']>().toEqualTypeOf<
      'starting' | 'ending' | undefined
    >();
    expectTypeOf<PopoverArrowState['uncentered']>().toEqualTypeOf<boolean>();
    expectTypeOf<PopoverBackdropState['open']>().toEqualTypeOf<boolean>();
    expectTypeOf<PopoverViewportState['transitioning']>().toEqualTypeOf<boolean>();
    expectTypeOf<PopoverArrowProps>().not.toBeAny();
    expectTypeOf<PopoverBackdropProps>().not.toBeAny();
    expectTypeOf<PopoverCloseProps>().not.toBeAny();
    expectTypeOf<PopoverDescriptionProps>().not.toBeAny();
    expectTypeOf<PopoverTitleProps>().not.toBeAny();
    expectTypeOf<PopoverViewportProps>().not.toBeAny();
  });

  it('opens and closes uncontrolled state through the trigger', async () => {
    const container = render(renderPopover());
    await flush();

    const trigger = container.querySelector('[data-testid="trigger"]') as HTMLElement;

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(getPopup()).toBeNull();

    click(trigger);
    await flush();

    const popup = getPopup();

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(trigger).toHaveAttribute('aria-controls');
    expect(popup).not.toBeNull();
    expect(popup).toHaveAttribute('role', 'dialog');
    expect(popup).toHaveAttribute('data-open');

    click(trigger);
    await flush();

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(getPopup()).toBeNull();
  });

  it('supports controlled state and cancelable onOpenChange', async () => {
    let open = false;
    const handleOpenChange = vi.fn(
      (nextOpen: boolean, eventDetails: PopoverRootChangeEventDetails) => {
        if (nextOpen) {
          eventDetails.cancel();
        }
      },
    );
    const container = render(html``);

    function rerender() {
      renderTemplate(
        renderPopover({
          open,
          onOpenChange(nextOpen, details) {
            handleOpenChange(nextOpen, details);
            open = nextOpen;
          },
        }),
        container,
      );
    }

    rerender();
    await flush();

    const trigger = container.querySelector('[data-testid="trigger"]') as HTMLElement;
    click(trigger);
    await flush();

    expect(handleOpenChange).toHaveBeenCalledTimes(1);
    expect(handleOpenChange.mock.calls[0]?.[0]).toBe(true);
    expect(handleOpenChange.mock.calls[0]?.[1].reason).toBe('trigger-press');
    expect(getPopup()).toBeNull();
  });

  it('supports finalFocus refs when the popup closes', async () => {
    const finalFocusTarget = document.createElement('input');
    document.body.append(finalFocusTarget);

    const container = render(
      Popover.Root({
        children: [
          Popover.Trigger({
            'data-testid': 'trigger',
            children: 'Trigger',
          }),
          Popover.Portal({
            children: Popover.Positioner({
              children: Popover.Popup({
                finalFocus: { current: finalFocusTarget },
                children: Popover.Close({
                  'data-testid': 'close',
                  children: 'Close',
                }),
              }),
            }),
          }),
        ],
      }),
    );
    await flush();

    click(container.querySelector('[data-testid="trigger"]') as HTMLElement);
    await flush();
    click(document.body.querySelector('[data-testid="close"]') as HTMLElement);
    await flush();

    expect(finalFocusTarget).toHaveFocus();
    finalFocusTarget.remove();
  });

  it('supports finalFocus={false} without restoring focus to the trigger', async () => {
    const container = render(
      Popover.Root({
        children: [
          Popover.Trigger({
            'data-testid': 'trigger',
            children: 'Trigger',
          }),
          Popover.Portal({
            children: Popover.Positioner({
              children: Popover.Popup({
                finalFocus: false,
                children: Popover.Close({
                  'data-testid': 'close',
                  children: 'Close',
                }),
              }),
            }),
          }),
        ],
      }),
    );
    await flush();

    const trigger = container.querySelector('[data-testid="trigger"]') as HTMLElement;
    click(trigger);
    await flush();
    click(document.body.querySelector('[data-testid="close"]') as HTMLElement);
    await flush();

    expect(trigger).not.toHaveFocus();
  });

  it('supports detached triggers through a handle', async () => {
    const handle = Popover.createHandle<{ label: string }>();
    const container = render(html`
      ${Popover.Trigger({
        handle,
        id: 'alpha',
        payload: { label: 'Alpha' },
        'data-testid': 'detached-trigger',
        children: 'Detached trigger',
      })}
      ${Popover.Root<{ label: string }>({
        handle,
        children: ({ payload }: { payload: { label: string } | undefined }) =>
          Popover.Portal({
            children: Popover.Positioner({
              children: Popover.Popup({
                'data-testid': 'popup',
                children: payload?.label ?? 'Empty',
              }),
            }),
          }),
      })}
    `);
    await flush();

    const trigger = container.querySelector('[data-testid="detached-trigger"]') as HTMLElement;

    click(trigger);
    await flush();

    expect(getPopup()).toHaveTextContent('Alpha');
    expect(handle.isOpen).toBe(true);
  });

  it('closes through a user-rendered backdrop on click, not on mousedown', async () => {
    const container = render(
      Popover.Root({
        children: [
          Popover.Trigger({
            'data-testid': 'trigger',
            children: 'Trigger',
          }),
          Popover.Portal({
            children: [
              Popover.Backdrop({
                'data-testid': 'backdrop',
              }),
              Popover.Positioner({
                children: Popover.Popup({
                  'data-testid': 'popup',
                  children: 'Popup',
                }),
              }),
            ],
          }),
        ],
      }),
    );
    await flush();

    click(container.querySelector('[data-testid="trigger"]') as HTMLElement);
    await flush();

    const backdrop = document.body.querySelector('[data-testid="backdrop"]') as HTMLElement;

    backdrop.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    await flush();
    expect(getPopup()).not.toBeNull();

    click(backdrop);
    await flush();
    expect(getPopup()).toBeNull();
    expect(container.querySelector('[data-testid="trigger"]')).toHaveFocus();
  });

  it('renders an internal backdrop for modal popovers and closes on click', async () => {
    const container = render(
      Popover.Root({
        modal: true,
        children: [
          Popover.Trigger({
            'data-testid': 'trigger',
            children: 'Trigger',
          }),
          Popover.Portal({
            children: Popover.Positioner({
              children: Popover.Popup({
                'data-testid': 'popup',
                children: 'Popup',
              }),
            }),
          }),
        ],
      }),
    );
    await flush();

    click(container.querySelector('[data-testid="trigger"]') as HTMLElement);
    await flush();

    const backdrop = document.body.querySelector(
      '[data-base-ui-popover-internal-backdrop]',
    ) as HTMLElement;

    expect(backdrop).not.toBeNull();

    backdrop.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    await flush();
    expect(getPopup()).not.toBeNull();

    click(backdrop);
    await flush();
    expect(getPopup()).toBeNull();
  });

  it('keeps the portal content mounted during close transitions when keepMounted is set', async () => {
    const container = render(
      Popover.Root({
        children: [
          Popover.Trigger({
            'data-testid': 'trigger',
            children: 'Trigger',
          }),
          Popover.Portal({
            keepMounted: true,
            children: Popover.Positioner({
              children: Popover.Popup({
                'data-testid': 'popup',
                children: 'Popup',
              }),
            }),
          }),
        ],
      }),
    );
    await flush();

    click(container.querySelector('[data-testid="trigger"]') as HTMLElement);
    await flush();
    click(container.querySelector('[data-testid="trigger"]') as HTMLElement);
    await Promise.resolve();

    expect(getPopup()).not.toBeNull();
    expect(getPopup()).toHaveAttribute('data-closed');
    expect(getPopup()).not.toHaveAttribute('hidden');

    await flush();

    expect(getPopup()).not.toBeNull();
    expect(getPopup()).toHaveAttribute('hidden');
  });

  it('keeps the portal content mounted when preventUnmountOnClose is requested', async () => {
    const actionsRef = { current: null as { close(): void; unmount(): void } | null };
    let preventUnmountRequested = false;
    const container = render(
      renderPopover({
        defaultOpen: true,
        actionsRef,
        onOpenChange(nextOpen, details) {
          if (!nextOpen) {
            preventUnmountRequested = true;
            details.preventUnmountOnClose();
          }
        },
      }),
    );
    await flush();

    click(container.querySelector('[data-testid="trigger"]') as HTMLElement);
    await Promise.resolve();

    expect(preventUnmountRequested).toBe(true);
    expect(getPopup()).not.toBeNull();
    expect(getPopup()).toHaveAttribute('data-closed');
    expect(getPopup()).not.toHaveAttribute('hidden');

    await flush();

    expect(getPopup()).not.toBeNull();
    expect(getPopup()).not.toHaveAttribute('hidden');

    actionsRef.current?.unmount();
    await flush();

    expect(getPopup()).toBeNull();
  });

  it('uses the only trigger as the implicit active trigger for initially open popovers', async () => {
    const container = render(renderPopover({ defaultOpen: true }));
    await flush();

    const trigger = container.querySelector('[data-testid="trigger"]') as HTMLElement;

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(trigger).toHaveAttribute('aria-controls');

    click(trigger);
    await Promise.resolve();

    expect(getPopup()).toHaveAttribute('data-closed');
  });

  it('respects collisionAvoidance="none" by omitting flip and shift middleware', async () => {
    const container = render(
      Popover.Root({
        children: [
          Popover.Trigger({
            'data-testid': 'trigger',
            children: 'Trigger',
          }),
          Popover.Portal({
            children: Popover.Positioner({
              collisionAvoidance: 'none',
              children: Popover.Popup({
                'data-testid': 'popup',
                children: 'Popup',
              }),
            }),
          }),
        ],
      }),
    );
    await flush();

    click(container.querySelector('[data-testid="trigger"]') as HTMLElement);
    await flush();

    const computePositionCall = floatingUiMocks.computePosition.mock.calls[0] as unknown as
      | [Element, Element, { middleware?: Array<{ name?: string }> }]
      | undefined;
    const middlewareNames = computePositionCall?.[2]?.middleware?.map((entry) => entry.name) ?? [];

    expect(middlewareNames).toContain('offset');
    expect(middlewareNames).toContain('hide');
    expect(middlewareNames).not.toContain('flip');
    expect(middlewareNames).not.toContain('shift');
  });

  it('passes disableAnchorTracking to autoUpdate', async () => {
    const container = render(
      Popover.Root({
        children: [
          Popover.Trigger({
            'data-testid': 'trigger',
            children: 'Trigger',
          }),
          Popover.Portal({
            children: Popover.Positioner({
              disableAnchorTracking: true,
              children: Popover.Popup({
                'data-testid': 'popup',
                children: 'Popup',
              }),
            }),
          }),
        ],
      }),
    );
    await flush();

    click(container.querySelector('[data-testid="trigger"]') as HTMLElement);
    await flush();

    const autoUpdateCall = floatingUiMocks.autoUpdate.mock.calls[0] as
      | [Element, Element, () => void, { elementResize?: boolean; layoutShift?: boolean }]
      | undefined;

    expect(autoUpdateCall?.[3]).toMatchObject({
      elementResize: false,
      layoutShift: false,
    });
  });

  it('renders viewport children inside the current container', async () => {
    render(
      Popover.Root({
        defaultOpen: true,
        children: [
          Popover.Trigger({
            'data-testid': 'trigger',
            children: 'Trigger',
          }),
          Popover.Portal({
            children: Popover.Positioner({
              children: Popover.Popup({
                children: Popover.Viewport({
                  children: html`<div data-testid="viewport-content">Viewport content</div>`,
                }),
              }),
            }),
          }),
        ],
      }),
    );
    await flush();

    const content = document.body.querySelector('[data-testid="viewport-content"]') as HTMLElement;
    const currentContainer = content.closest('[data-current]');

    expect(currentContainer).not.toBeNull();
    expect(currentContainer).toHaveTextContent('Viewport content');
  });

  it('creates viewport transition containers and activation direction when the active trigger changes', async () => {
    const container = render(
      Popover.Root<string>({
        children: ({ payload }: { payload: string | undefined }) => [
          Popover.Trigger({
            'data-testid': 'trigger-1',
            payload: 'first',
            children: 'Trigger 1',
          }),
          Popover.Trigger({
            'data-testid': 'trigger-2',
            payload: 'second',
            children: 'Trigger 2',
          }),
          Popover.Portal({
            children: Popover.Positioner({
              children: Popover.Popup({
                children: Popover.Viewport({
                  'data-testid': 'viewport',
                  children: html`<div data-testid="viewport-content">${payload ?? 'none'}</div>`,
                }),
              }),
            }),
          }),
        ],
      }),
    );
    await flush();

    const trigger1 = container.querySelector('[data-testid="trigger-1"]') as HTMLElement;
    const trigger2 = container.querySelector('[data-testid="trigger-2"]') as HTMLElement;

    vi.spyOn(trigger1, 'getBoundingClientRect').mockImplementation(
      () => new DOMRect(10, 10, 100, 50),
    );
    vi.spyOn(trigger2, 'getBoundingClientRect').mockImplementation(
      () => new DOMRect(200, 100, 100, 50),
    );

    click(trigger1);
    await flush();

    const firstCurrent = document.body.querySelector('[data-current]');
    expect(firstCurrent).toHaveTextContent('first');

    click(trigger2);
    await Promise.resolve();

    const viewport = document.body.querySelector('[data-testid="viewport"]') as HTMLElement;
    const previousContainer = viewport.querySelector('[data-previous]');
    const currentContainer = viewport.querySelector('[data-current]');

    expect(viewport).toHaveAttribute('data-transitioning');
    expect(viewport.getAttribute('data-activation-direction')).toContain('right');
    expect(viewport.getAttribute('data-activation-direction')).toContain('down');
    expect(previousContainer).not.toBeNull();
    expect(previousContainer).toHaveTextContent('first');
    expect(currentContainer).not.toBe(firstCurrent);
    expect(currentContainer).toHaveTextContent('second');

    await flush();

    expect(viewport.querySelector('[data-previous]')).toBeNull();
  });

  it('wires title, description, and close parts to the popup', async () => {
    const container = render(
      Popover.Root({
        children: [
          Popover.Trigger({
            'data-testid': 'trigger',
            children: 'Trigger',
          }),
          Popover.Portal({
            children: Popover.Positioner({
              children: Popover.Popup({
                'data-testid': 'popup',
                children: [
                  Popover.Title({
                    'data-testid': 'title',
                    children: 'Title',
                  }),
                  Popover.Description({
                    'data-testid': 'description',
                    children: 'Description',
                  }),
                  Popover.Close({
                    'data-testid': 'close',
                    children: 'Close',
                  }),
                ],
              }),
            }),
          }),
        ],
      }),
    );
    await flush();

    click(container.querySelector('[data-testid="trigger"]') as HTMLElement);
    await flush();

    const popup = getPopup() as HTMLElement;
    const title = document.body.querySelector('[data-testid="title"]') as HTMLElement;
    const description = document.body.querySelector('[data-testid="description"]') as HTMLElement;
    const close = document.body.querySelector('[data-testid="close"]') as HTMLElement;

    expect(popup).toHaveAttribute('aria-labelledby', title.id);
    expect(popup).toHaveAttribute('aria-describedby', description.id);

    click(close);
    await flush();

    expect(getPopup()).toBeNull();
    expect(container.querySelector('[data-testid="trigger"]')).toHaveFocus();
  });

  it('supports hover opening and closing', async () => {
    const container = render(
      Popover.Root({
        children: [
          Popover.Trigger({
            'data-testid': 'trigger',
            openOnHover: true,
            delay: 0,
            closeDelay: 0,
            children: 'Hover trigger',
          }),
          Popover.Portal({
            children: Popover.Positioner({
              children: Popover.Popup({
                'data-testid': 'popup',
                children: 'Hover popup',
              }),
            }),
          }),
        ],
      }),
    );
    await flush();

    const trigger = container.querySelector('[data-testid="trigger"]') as HTMLElement;
    mouseEnter(trigger);
    await flush();

    expect(getPopup()).not.toBeNull();

    mouseLeave(trigger);
    await flush();

    expect(getPopup()).toBeNull();
  });
});
