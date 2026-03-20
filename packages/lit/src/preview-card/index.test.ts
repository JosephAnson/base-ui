/* eslint-disable testing-library/render-result-naming-convention */
import { html, nothing, render as renderTemplate, type TemplateResult } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import type { BaseUIChangeEventDetails } from '@base-ui/lit/types';
import type {
  PreviewCardArrowProps,
  PreviewCardArrowState,
  PreviewCardBackdropProps,
  PreviewCardBackdropState,
  PreviewCardPopupProps,
  PreviewCardPopupState,
  PreviewCardPositionerProps,
  PreviewCardPositionerState,
  PreviewCardRootChangeEventDetails,
  PreviewCardRootProps,
  PreviewCardTriggerProps,
  PreviewCardTriggerState,
  PreviewCardViewportProps,
  PreviewCardViewportState,
} from '@base-ui/lit/preview-card';
import { PreviewCard } from '@base-ui/lit/preview-card';

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

describe('PreviewCard', () => {
  const containers = new Set<HTMLDivElement>();

  beforeEach(() => {
    (globalThis as typeof globalThis & { BASE_UI_ANIMATIONS_DISABLED?: boolean })
      .BASE_UI_ANIMATIONS_DISABLED = true;
  });

  afterEach(async () => {
    containers.forEach((container) => {
      renderTemplate(nothing, container);
      container.remove();
    });
    containers.clear();

    document.body.querySelectorAll('[data-base-ui-popover-portal]').forEach((element) => {
      element.parentElement?.remove();
    });

    vi.useRealTimers();
    await Promise.resolve();
    vi.clearAllMocks();
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
    await Promise.resolve();
  }

  async function advance(ms: number) {
    await vi.advanceTimersByTimeAsync(ms);
    await flush();
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

  function renderPreviewCard(
    rootProps: PreviewCardRootProps = {},
    triggerProps: PreviewCardTriggerProps = {},
  ) {
    return PreviewCard.Root({
      ...rootProps,
      children: [
        PreviewCard.Trigger({
          'data-testid': 'trigger',
          href: '#',
          children: 'Trigger',
          ...triggerProps,
        }),
        PreviewCard.Portal({
          children: [
            PreviewCard.Backdrop({
              'data-testid': 'backdrop',
            }),
            PreviewCard.Positioner({
              'data-testid': 'positioner',
              children: PreviewCard.Popup({
                'data-testid': 'popup',
                children: [
                  PreviewCard.Arrow({
                    'data-testid': 'arrow',
                  }),
                  PreviewCard.Viewport({
                    'data-testid': 'viewport',
                    children: 'Popup',
                  }),
                ],
              }),
            }),
          ],
        }),
      ],
    });
  }

  it('preserves the public type contracts', () => {
    const root = PreviewCard.Root({});
    const trigger = PreviewCard.Trigger({});
    const portal = PreviewCard.Portal({});
    const positioner = PreviewCard.Positioner({});
    const popup = PreviewCard.Popup({});
    const arrow = PreviewCard.Arrow({});
    const backdrop = PreviewCard.Backdrop({});
    const viewport = PreviewCard.Viewport({});

    expectTypeOf(root).toMatchTypeOf<TemplateResult>();
    expectTypeOf(trigger).toMatchTypeOf<TemplateResult>();
    expectTypeOf(portal).toMatchTypeOf<TemplateResult>();
    expectTypeOf(positioner).toMatchTypeOf<TemplateResult>();
    expectTypeOf(popup).toMatchTypeOf<TemplateResult>();
    expectTypeOf(arrow).toMatchTypeOf<TemplateResult>();
    expectTypeOf(backdrop).toMatchTypeOf<TemplateResult>();
    expectTypeOf(viewport).toMatchTypeOf<TemplateResult>();
    expectTypeOf<PreviewCardTriggerProps['delay']>().toEqualTypeOf<number | undefined>();
    expectTypeOf<PreviewCardPositionerProps['sideOffset']>().toEqualTypeOf<number | undefined>();
    expectTypeOf<PreviewCardRootChangeEventDetails>().toEqualTypeOf<
      BaseUIChangeEventDetails<
        | 'trigger-hover'
        | 'trigger-focus'
        | 'trigger-press'
        | 'outside-press'
        | 'escape-key'
        | 'imperative-action'
        | 'none',
        { preventUnmountOnClose(): void }
      >
    >();
    expectTypeOf<PreviewCardTriggerState['open']>().toEqualTypeOf<boolean>();
    expectTypeOf<PreviewCardPositionerState['side']>().toEqualTypeOf<
      'top' | 'right' | 'bottom' | 'left'
    >();
    expectTypeOf<PreviewCardPopupState['transitionStatus']>().toEqualTypeOf<
      'starting' | 'ending' | undefined
    >();
    expectTypeOf<PreviewCardArrowState['uncentered']>().toEqualTypeOf<boolean>();
    expectTypeOf<PreviewCardBackdropState['open']>().toEqualTypeOf<boolean>();
    expectTypeOf<PreviewCardViewportState['transitioning']>().toEqualTypeOf<boolean>();
    expectTypeOf<PreviewCardArrowProps>().not.toBeAny();
    expectTypeOf<PreviewCardBackdropProps>().not.toBeAny();
    expectTypeOf<PreviewCardPopupProps>().not.toBeAny();
    expectTypeOf<PreviewCardViewportProps>().not.toBeAny();
  });

  it('opens on hover after the configured delay and closes after closeDelay', async () => {
    vi.useFakeTimers();
    const container = render(renderPreviewCard({}, { delay: 10, closeDelay: 20 }));
    await flush();

    const trigger = container.querySelector('[data-testid="trigger"]') as HTMLElement;

    expect(getPopup()).toBeNull();

    mouseEnter(trigger);
    await advance(9);
    expect(getPopup()).toBeNull();

    await advance(1);
    expect(getPopup()).not.toBeNull();

    mouseLeave(trigger);
    await advance(19);
    expect(getPopup()).not.toBeNull();

    await advance(1);
    expect(getPopup()).not.toBeNull();

    await advance(32);
    expect(getPopup()).toBeNull();
  });

  it('opens on focus after the default delay and reports trigger-focus', async () => {
    vi.useFakeTimers();
    const reasons: PreviewCardRootChangeEventDetails['reason'][] = [];
    const container = render(
      renderPreviewCard(
        {
          onOpenChange(_open, details) {
            reasons.push(details.reason);
          },
        },
        {},
      ),
    );
    await flush();

    const trigger = container.querySelector('[data-testid="trigger"]') as HTMLElement;

    trigger.focus();
    await advance(599);
    expect(getPopup()).toBeNull();

    await advance(1);
    expect(getPopup()).not.toBeNull();
    expect(reasons).toEqual(['trigger-focus']);
  });

  it('keeps the popup open when focus moves from the trigger into popup content', async () => {
    vi.useFakeTimers();
    const container = render(
      PreviewCard.Root({
        children: [
          PreviewCard.Trigger({
            'data-testid': 'trigger',
            href: '#',
            delay: 0,
            closeDelay: 20,
            children: 'Trigger',
          }),
          PreviewCard.Portal({
            children: PreviewCard.Positioner({
              children: PreviewCard.Popup({
                'data-testid': 'popup',
                children: html`<button data-testid="inside-button">Inside</button>`,
              }),
            }),
          }),
        ],
      }),
    );
    await flush();

    const trigger = container.querySelector('[data-testid="trigger"]') as HTMLElement;

    trigger.focus();
    await advance(0);
    expect(getPopup()).not.toBeNull();

    const insideButton = document.body.querySelector('[data-testid="inside-button"]') as HTMLElement;
    insideButton.focus();
    await advance(20);

    expect(getPopup()).not.toBeNull();
  });

  it('closes immediately with trigger-focus when focus leaves the trigger', async () => {
    vi.useFakeTimers();
    const reasons: PreviewCardRootChangeEventDetails['reason'][] = [];
    const container = render(
      html`${renderPreviewCard(
        {
          onOpenChange(open, details) {
            if (!open) {
              reasons.push(details.reason);
            }
          },
        },
        { delay: 0, closeDelay: 50 },
      )}
      <button data-testid="outside">Outside</button>`,
    );
    await flush();

    const trigger = container.querySelector('[data-testid="trigger"]') as HTMLElement;
    const outside = container.querySelector('[data-testid="outside"]') as HTMLElement;

    trigger.focus();
    await advance(0);
    expect(getPopup()).not.toBeNull();

    outside.focus();
    await advance(0);

    expect(getPopup()).toHaveAttribute('data-closed');
    expect(reasons).toEqual(['trigger-focus']);
  });

  it('switches detached trigger payload immediately while already open', async () => {
    vi.useFakeTimers();
    const handle = PreviewCard.createHandle<number>();

    render(html`${PreviewCard.Trigger({
        handle,
        id: 'trigger-1',
        href: '#',
        delay: 0,
        payload: 1,
        'data-testid': 'trigger-1',
        children: 'Trigger 1',
      })}
      ${PreviewCard.Trigger({
        handle,
        id: 'trigger-2',
        href: '#',
        delay: 2000,
        payload: 2,
        'data-testid': 'trigger-2',
        children: 'Trigger 2',
      })}
      ${PreviewCard.Root<number>({
        handle,
        children: ({ payload }: { payload: number | undefined }) =>
          PreviewCard.Portal({
            children: PreviewCard.Positioner({
              children: PreviewCard.Popup({
                'data-testid': 'popup',
                children: payload == null ? 'empty' : `Content: ${payload}`,
              }),
            }),
          }),
      })}`);
    await flush();

    const trigger1 = document.body.querySelector('[data-testid="trigger-1"]') as HTMLElement;
    const trigger2 = document.body.querySelector('[data-testid="trigger-2"]') as HTMLElement;

    mouseEnter(trigger1);
    await advance(0);
    expect(getPopup()).toHaveTextContent('Content: 1');

    mouseLeave(trigger1);
    mouseEnter(trigger2);
    await advance(0);
    expect(getPopup()).toHaveTextContent('Content: 2');
  });

  it('supports defaultOpen together with defaultTriggerId on detached handles', async () => {
    const handle = PreviewCard.createHandle<number>();

    render(html`${PreviewCard.Trigger({
        handle,
        href: '#',
        payload: 1,
        children: 'Trigger 1',
      })}
      ${PreviewCard.Trigger({
        handle,
        id: 'trigger-2',
        href: '#',
        payload: 2,
        children: 'Trigger 2',
      })}
      ${PreviewCard.Root<number>({
        handle,
        defaultOpen: true,
        defaultTriggerId: 'trigger-2',
        children: ({ payload }: { payload: number | undefined }) =>
          PreviewCard.Portal({
            children: PreviewCard.Positioner({
              children: PreviewCard.Popup({
                'data-testid': 'popup',
                children: payload == null ? 'empty' : `Content: ${payload}`,
              }),
            }),
          }),
      })}`);
    await flush();

    expect(getPopup()).toHaveTextContent('Content: 2');
  });

  it('keeps popup semantics passive by default', async () => {
    vi.useFakeTimers();
    const container = render(renderPreviewCard({}, { delay: 0 }));
    await flush();

    const trigger = container.querySelector('[data-testid="trigger"]') as HTMLElement;
    mouseEnter(trigger);
    await advance(0);

    const popup = getPopup();

    expect(popup).not.toBeNull();
    expect(popup).not.toHaveAttribute('role');
    expect(popup).not.toHaveAttribute('tabindex');
    expect(popup).not.toHaveAttribute('aria-labelledby');
    expect(popup).not.toHaveAttribute('aria-describedby');
  });

  it('keeps the backdrop inert and exposes closed arrow state when keepMounted is enabled', async () => {
    const container = render(
      PreviewCard.Root({
        children: [
          PreviewCard.Trigger({
            'data-testid': 'trigger',
            href: '#',
            children: 'Trigger',
          }),
          PreviewCard.Portal({
            keepMounted: true,
            children: [
              PreviewCard.Backdrop({
                'data-testid': 'backdrop',
              }),
              PreviewCard.Positioner({
                children: PreviewCard.Popup({
                  'data-testid': 'popup',
                  children: PreviewCard.Arrow({
                    'data-testid': 'arrow',
                  }),
                }),
              }),
            ],
          }),
        ],
      }),
    );
    await flush();

    expect(document.body.querySelector('[data-testid="backdrop"]')).toHaveStyle({
      pointerEvents: 'none',
    });
    expect(document.body.querySelector('[data-testid="arrow"]')).toHaveAttribute('data-closed');
  });

  it('renames imperative handle errors to PreviewCardHandle', () => {
    const handle = PreviewCard.createHandle();

    expect(() => {
      handle.open('missing-trigger');
    }).toThrow('Base UI: PreviewCardHandle.open: No trigger found with id "missing-trigger".');
  });

});
