/* eslint-disable testing-library/render-result-naming-convention */
import { html, nothing, render as renderTemplate, type TemplateResult } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import type { BaseUIChangeEventDetails } from '@base-ui/lit/types';
import type {
  TooltipArrowProps,
  TooltipArrowState,
  TooltipPopupProps,
  TooltipPopupState,
  TooltipPositionerProps,
  TooltipPositionerState,
  TooltipProviderProps,
  TooltipRootChangeEventDetails,
  TooltipRootProps,
  TooltipTriggerProps,
  TooltipTriggerState,
  TooltipViewportProps,
  TooltipViewportState,
} from '@base-ui/lit/tooltip';
import { Tooltip } from '@base-ui/lit/tooltip';

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

describe('Tooltip', () => {
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

  function mouseEnter(element: Element) {
    element.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, cancelable: true }));
  }

  function mouseMove(element: Element, init?: MouseEventInit) {
    element.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, cancelable: true, ...init }));
  }

  function mouseLeave(element: Element) {
    element.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true, cancelable: true }));
  }

  function click(element: Element) {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  }

  async function advance(ms: number) {
    await vi.advanceTimersByTimeAsync(ms);
    await Promise.resolve();
  }

  async function flushRealTimers() {
    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 50);
    });
    await Promise.resolve();
  }

  function getPopup() {
    return document.body.querySelector('[data-testid="popup"]') as HTMLElement | null;
  }

  function renderTooltip(
    rootProps: TooltipRootProps = {},
    triggerProps: TooltipTriggerProps = {},
    providerProps?: TooltipProviderProps,
  ) {
    const content = Tooltip.Root({
      ...rootProps,
      children: [
        Tooltip.Trigger({
          'data-testid': 'trigger',
          children: 'Trigger',
          ...triggerProps,
        }),
        Tooltip.Portal({
          children: Tooltip.Positioner({
            'data-testid': 'positioner',
            children: Tooltip.Popup({
              'data-testid': 'popup',
              children: 'Popup',
            }),
          }),
        }),
      ],
    });

    if (providerProps == null) {
      return content;
    }

    return Tooltip.Provider({
      ...providerProps,
      children: content,
    });
  }

  it('preserves the public type contracts', () => {
    const provider = Tooltip.Provider({});
    const root = Tooltip.Root({});
    const trigger = Tooltip.Trigger({});
    const portal = Tooltip.Portal({});
    const positioner = Tooltip.Positioner({});
    const popup = Tooltip.Popup({});
    const arrow = Tooltip.Arrow({});
    const viewport = Tooltip.Viewport({});

    expectTypeOf(provider).toMatchTypeOf<TemplateResult>();
    expectTypeOf(root).toMatchTypeOf<TemplateResult>();
    expectTypeOf(trigger).toMatchTypeOf<TemplateResult>();
    expectTypeOf(portal).toMatchTypeOf<TemplateResult>();
    expectTypeOf(positioner).toMatchTypeOf<TemplateResult>();
    expectTypeOf(popup).toMatchTypeOf<TemplateResult>();
    expectTypeOf(arrow).toMatchTypeOf<TemplateResult>();
    expectTypeOf(viewport).toMatchTypeOf<TemplateResult>();
    expectTypeOf<TooltipProviderProps['timeout']>().toEqualTypeOf<number | undefined>();
    expectTypeOf<TooltipTriggerProps['closeOnClick']>().toEqualTypeOf<boolean | undefined>();
    expectTypeOf<TooltipPositionerProps['sideOffset']>().toEqualTypeOf<number | undefined>();
    expectTypeOf<TooltipRootProps['trackCursorAxis']>().toEqualTypeOf<
      'none' | 'x' | 'y' | 'both' | undefined
    >();
    expectTypeOf<TooltipRootChangeEventDetails>().toEqualTypeOf<
      BaseUIChangeEventDetails<
        | 'trigger-hover'
        | 'trigger-focus'
        | 'trigger-press'
        | 'outside-press'
        | 'escape-key'
        | 'disabled'
        | 'imperative-action'
        | 'none',
        { preventUnmountOnClose(): void }
      >
    >();
    expectTypeOf<TooltipTriggerState['open']>().toEqualTypeOf<boolean>();
    expectTypeOf<TooltipPositionerState['side']>().toEqualTypeOf<
      'top' | 'right' | 'bottom' | 'left'
    >();
    expectTypeOf<TooltipPopupState['transitionStatus']>().toEqualTypeOf<
      'starting' | 'ending' | undefined
    >();
    expectTypeOf<TooltipArrowState['uncentered']>().toEqualTypeOf<boolean>();
    expectTypeOf<TooltipViewportState['transitioning']>().toEqualTypeOf<boolean>();
    expectTypeOf<TooltipArrowProps>().not.toBeAny();
    expectTypeOf<TooltipPopupProps>().not.toBeAny();
    expectTypeOf<TooltipViewportProps>().not.toBeAny();
  });

  it('opens on hover and applies tooltip aria semantics', async () => {
    vi.useFakeTimers();
    const container = render(renderTooltip({}, { delay: 0 }));
    await Promise.resolve();

    const trigger = container.querySelector('[data-testid="trigger"]') as HTMLElement;

    expect(trigger).not.toHaveAttribute('aria-expanded');
    expect(trigger).not.toHaveAttribute('aria-controls');
    expect(getPopup()).toBeNull();

    mouseEnter(trigger);
    mouseMove(trigger);
    await advance(0);

    const popup = getPopup();

    expect(popup).not.toBeNull();
    expect(popup).toHaveAttribute('role', 'tooltip');
    expect(trigger).toHaveAttribute('aria-describedby', popup?.id ?? '');

    mouseLeave(trigger);
    await advance(50);

    expect(getPopup()).toBeNull();
    expect(trigger).not.toHaveAttribute('aria-describedby');
  });

  it('opens on focus without stealing trigger focus', async () => {
    const container = render(renderTooltip({}, { delay: 0 }));
    await Promise.resolve();
    const trigger = container.querySelector('[data-testid="trigger"]') as HTMLElement;

    trigger.focus();
    await Promise.resolve();

    expect(document.activeElement).toBe(trigger);
    expect(getPopup()).not.toBeNull();

    trigger.blur();
    await flushRealTimers();

    expect(getPopup()).toBeNull();
  });

  it('maps focus-out close reasons to none in onOpenChange', async () => {
    const handle = Tooltip.createHandle();
    const reasons: TooltipRootChangeEventDetails['reason'][] = [];

    render(html`${Tooltip.Trigger({
        handle,
        id: 'trigger',
        'data-testid': 'trigger',
        children: 'Trigger',
      })}
      ${Tooltip.Root({
        handle,
        onOpenChange(_open, details) {
          reasons.push(details.reason);
        },
        children: Tooltip.Portal({
          children: Tooltip.Positioner({
            children: Tooltip.Popup({
              'data-testid': 'popup',
              children: 'Popup',
            }),
          }),
        }),
      })}
      <button data-testid="outside">Outside</button>`);
    await Promise.resolve();

    handle.open('trigger');
    await Promise.resolve();

    const outside = document.querySelector('[data-testid="outside"]') as HTMLButtonElement;
    outside.focus();
    await flushRealTimers();

    expect(reasons.at(-1)).toBe('none');
  });

  it('keeps the trigger interactive when Tooltip.Trigger is disabled', async () => {
    vi.useFakeTimers();
    const onClick = vi.fn();
    const container = render(renderTooltip({}, { delay: 0, disabled: true, onClick }));
    await Promise.resolve();
    const trigger = container.querySelector('[data-testid="trigger"]') as HTMLElement;

    expect(trigger).toHaveAttribute('data-trigger-disabled');
    expect(trigger).not.toHaveAttribute('disabled');
    expect(trigger).not.toHaveAttribute('aria-disabled');

    mouseEnter(trigger);
    mouseMove(trigger);
    await advance(0);

    expect(getPopup()).toBeNull();

    click(trigger);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('keeps the trigger interactive when Tooltip.Root is disabled', async () => {
    vi.useFakeTimers();
    const onClick = vi.fn();
    const container = render(renderTooltip({ disabled: true }, { delay: 0, onClick }));
    await Promise.resolve();
    const trigger = container.querySelector('[data-testid="trigger"]') as HTMLElement;

    expect(trigger).toHaveAttribute('data-trigger-disabled');
    expect(trigger).not.toHaveAttribute('disabled');
    expect(trigger).not.toHaveAttribute('aria-disabled');

    mouseEnter(trigger);
    mouseMove(trigger);
    await advance(0);

    expect(getPopup()).toBeNull();

    click(trigger);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('cancels scheduled opening on click by default', async () => {
    vi.useFakeTimers();
    const container = render(renderTooltip({}, { delay: 50 }));
    await Promise.resolve();
    const trigger = container.querySelector('[data-testid="trigger"]') as HTMLElement;

    mouseEnter(trigger);
    mouseMove(trigger);
    await advance(25);
    click(trigger);
    await advance(25);

    expect(getPopup()).toBeNull();
  });

  it('keeps the scheduled opening when closeOnClick is false', async () => {
    vi.useFakeTimers();
    const container = render(renderTooltip({}, { delay: 50, closeOnClick: false }));
    await Promise.resolve();
    const trigger = container.querySelector('[data-testid="trigger"]') as HTMLElement;

    mouseEnter(trigger);
    mouseMove(trigger);
    await advance(25);
    click(trigger);
    await advance(25);

    expect(getPopup()).not.toBeNull();
  });

  it('respects provider delays and closeDelay', async () => {
    vi.useFakeTimers();
    const container = render(renderTooltip({}, {}, { delay: 100, closeDelay: 80 }));
    await Promise.resolve();
    const trigger = container.querySelector('[data-testid="trigger"]') as HTMLElement;

    mouseEnter(trigger);
    mouseMove(trigger);
    await advance(99);
    expect(getPopup()).toBeNull();

    await advance(1);
    expect(getPopup()).not.toBeNull();

    mouseLeave(trigger);
    await advance(79);
    expect(getPopup()).not.toBeNull();

    await advance(1);
    await advance(50);
    expect(getPopup()).toBeNull();
  });

  it('opens adjacent tooltips instantly inside a provider', async () => {
    vi.useFakeTimers();
    const container = render(
      Tooltip.Provider({
        children: [
          Tooltip.Root({
            children: [
              Tooltip.Trigger({ 'data-testid': 'trigger-one', children: 'One', delay: 0 }),
              Tooltip.Portal({
                children: Tooltip.Positioner({
                  children: Tooltip.Popup({
                    'data-testid': 'popup-one',
                    children: 'One',
                  }),
                }),
              }),
            ],
          }),
          Tooltip.Root({
            children: [
              Tooltip.Trigger({ 'data-testid': 'trigger-two', children: 'Two', delay: 100 }),
              Tooltip.Portal({
                children: Tooltip.Positioner({
                  children: Tooltip.Popup({
                    'data-testid': 'popup-two',
                    children: 'Two',
                  }),
                }),
              }),
            ],
          }),
        ],
      }),
    );
    await Promise.resolve();

    const triggerOne = container.querySelector('[data-testid="trigger-one"]') as HTMLElement;
    const triggerTwo = container.querySelector('[data-testid="trigger-two"]') as HTMLElement;

    mouseEnter(triggerOne);
    mouseMove(triggerOne);
    await advance(0);
    expect(document.body.querySelector('[data-testid="popup-one"]')).not.toBeNull();

    mouseLeave(triggerOne);
    await advance(0);
    mouseEnter(triggerTwo);
    mouseMove(triggerTwo);
    await advance(0);
    await Promise.resolve();

    const secondPopup = document.body.querySelector('[data-testid="popup-two"]') as HTMLElement;
    expect(secondPopup).not.toBeNull();
  });

  it('supports detached handles and payloads', async () => {
    const handle = Tooltip.createHandle<number>();
    render(
      html`${Tooltip.Trigger({
          handle,
          id: 'one',
          payload: 1,
          children: 'One',
        })}
        ${Tooltip.Trigger({
          handle,
          id: 'two',
          payload: 2,
          children: 'Two',
        })}
        ${Tooltip.Root<number>({
          handle,
          children: ({ payload }: { payload: number | undefined }) =>
            Tooltip.Portal({
              children: Tooltip.Positioner({
                children: Tooltip.Popup({
                  'data-testid': 'popup',
                  children: String(payload),
                }),
              }),
            }),
        })}`,
    );
    await Promise.resolve();

    const [triggerOne, triggerTwo] = Array.from(document.querySelectorAll('button'));

    handle.open('two');
    await Promise.resolve();

    expect(getPopup()).toHaveTextContent('2');
    expect(triggerTwo).toHaveAttribute('data-popup-open');
    expect(triggerOne).not.toHaveAttribute('data-popup-open');

    handle.close();
    await flushRealTimers();

    expect(getPopup()).toBeNull();
    expect(triggerTwo).not.toHaveAttribute('data-popup-open');
  });

  it('removes data-popup-open immediately even when unmount is prevented', async () => {
    vi.useFakeTimers();
    const container = render(
      renderTooltip(
        {
          onOpenChange(open, details) {
            if (!open) {
              details.preventUnmountOnClose();
            }
          },
        },
        { delay: 0, closeDelay: 0 },
      ),
    );
    await Promise.resolve();

    const trigger = container.querySelector('[data-testid="trigger"]') as HTMLElement;

    mouseEnter(trigger);
    mouseMove(trigger);
    await advance(0);

    expect(trigger).toHaveAttribute('data-popup-open');
    expect(getPopup()).not.toBeNull();

    mouseLeave(trigger);
    await advance(0);

    expect(trigger).not.toHaveAttribute('data-popup-open');
    expect(getPopup()).not.toBeNull();
  });

  it('applies pointer-events none when disableHoverablePopup is true', async () => {
    vi.useFakeTimers();
    render(renderTooltip({ disableHoverablePopup: true }, { delay: 0 }));
    await Promise.resolve();

    const trigger = document.querySelector('[data-testid="trigger"]') as HTMLElement;
    mouseEnter(trigger);
    mouseMove(trigger);
    await advance(0);

    expect(document.querySelector('[data-testid="positioner"]')).toHaveStyle({
      pointerEvents: 'none',
    });
  });

  it('uses tooltip-scoped errors when an imperative open references a missing trigger', () => {
    const handle = Tooltip.createHandle();

    expect(() => handle.open('missing-trigger')).toThrow(
      'Base UI: TooltipHandle.open: No trigger found with id "missing-trigger".',
    );
  });
});
