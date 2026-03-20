/* eslint-disable testing-library/render-result-naming-convention */
import { html, nothing, render as renderTemplate, type TemplateResult } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import type { BaseUIChangeEventDetails } from '@base-ui/lit/types';
import type {
  CollapsiblePanelProps,
  CollapsiblePanelState,
  CollapsibleRootChangeEventDetails,
  CollapsibleRootProps,
  CollapsibleRootState,
  CollapsibleTriggerProps,
  CollapsibleTriggerState,
} from '@base-ui/lit/collapsible';
import { Collapsible } from '@base-ui/lit/collapsible';

describe('Collapsible', () => {
  const containers = new Set<HTMLDivElement>();

  afterEach(() => {
    containers.forEach((container) => {
      renderTemplate(nothing, container);
      container.remove();
    });
    containers.clear();
    vi.restoreAllMocks();
  });

  function render(result: TemplateResult) {
    const container = document.createElement('div');
    document.body.append(container);
    containers.add(container);

    renderTemplate(result, container);
    return container;
  }

  async function flushMicrotasks(iterations = 6) {
    await Array.from({ length: iterations }).reduce<Promise<void>>((promise) => {
      return promise.then(() => Promise.resolve());
    }, Promise.resolve());
  }

  async function flushUpdates(iterations = 6) {
    await flushMicrotasks(iterations);
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
    await flushMicrotasks(iterations);
  }

  function click(element: Element) {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  }

  function keyDown(element: Element, key: string) {
    element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key }));
  }

  function keyUp(element: Element, key: string) {
    element.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, cancelable: true, key }));
  }

  function getTrigger(container: HTMLElement) {
    return container.querySelector('[data-testid="trigger"]') as HTMLElement;
  }

  function getPanel(container: HTMLElement) {
    return container.querySelector('[data-testid="panel"]') as HTMLElement | null;
  }

  function renderCollapsible(props: CollapsibleRootProps = {}) {
    return Collapsible.Root({
      ...props,
      children: [
        Collapsible.Trigger({
          'data-testid': 'trigger',
          children: 'Trigger',
        }),
        Collapsible.Panel({
          'data-testid': 'panel',
          children: 'Panel',
        }),
      ],
    });
  }

  it('preserves the public type contracts', () => {
    const root = Collapsible.Root({});
    const trigger = Collapsible.Trigger({});
    const panel = Collapsible.Panel({});

    expectTypeOf(root).toEqualTypeOf<TemplateResult>();
    expectTypeOf(trigger).toEqualTypeOf<TemplateResult>();
    expectTypeOf(panel).toEqualTypeOf<TemplateResult>();
    expectTypeOf<CollapsibleRootProps['open']>().toEqualTypeOf<boolean | undefined>();
    expectTypeOf<CollapsibleRootProps['defaultOpen']>().toEqualTypeOf<boolean | undefined>();
    expectTypeOf<CollapsibleTriggerProps['nativeButton']>().toEqualTypeOf<boolean | undefined>();
    expectTypeOf<CollapsiblePanelProps['keepMounted']>().toEqualTypeOf<boolean | undefined>();
    expectTypeOf<CollapsiblePanelProps['hiddenUntilFound']>().toEqualTypeOf<boolean | undefined>();
    expectTypeOf<CollapsibleRootChangeEventDetails>().toEqualTypeOf<
      BaseUIChangeEventDetails<'trigger-press' | 'none'>
    >();
    expectTypeOf<CollapsibleRootState['open']>().toEqualTypeOf<boolean>();
    expectTypeOf<CollapsibleTriggerState['transitionStatus']>().toEqualTypeOf<
      'starting' | 'ending' | undefined
    >();
    expectTypeOf<CollapsiblePanelState['transitionStatus']>().toEqualTypeOf<
      'starting' | 'ending' | undefined
    >();
  });

  it('wires ARIA attributes and uncontrolled open state', async () => {
    const container = render(renderCollapsible());
    await flushUpdates();

    const trigger = getTrigger(container);

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).not.toHaveAttribute('aria-controls');
    expect(getPanel(container)).toBeNull();

    click(trigger);
    await flushUpdates();

    const panel = getPanel(container);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(trigger).toHaveAttribute('data-panel-open');
    expect(panel).not.toBeNull();
    expect(panel?.getAttribute('id')).toBe(trigger.getAttribute('aria-controls'));
    expect(panel).toHaveAttribute('data-open');

    click(trigger);
    await flushUpdates();

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).not.toHaveAttribute('aria-controls');
    expect(getPanel(container)).toBeNull();
  });

  it('supports controlled state updates from outside', async () => {
    let open = false;
    const container = render(html``);

    function rerender() {
      renderTemplate(renderCollapsible({ open }), container);
    }

    rerender();
    await flushUpdates();

    const trigger = getTrigger(container);

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(getPanel(container)).toBeNull();

    open = true;
    rerender();
    await flushUpdates();

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(getPanel(container)).not.toBeNull();

    open = false;
    rerender();
    await flushUpdates();

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(getPanel(container)).toBeNull();
  });

  it('calls onOpenChange with change details and supports cancellation', async () => {
    const handleOpenChange = vi.fn(
      (open: boolean, eventDetails: CollapsibleRootChangeEventDetails) => {
        if (open) {
          eventDetails.cancel();
        }

        return eventDetails;
      },
    );
    const container = render(renderCollapsible({ onOpenChange: handleOpenChange }));
    await flushUpdates();

    click(getTrigger(container));
    await flushUpdates();

    expect(handleOpenChange).toHaveBeenCalledTimes(1);
    expect(handleOpenChange.mock.calls[0]?.[0]).toBe(true);
    expect(handleOpenChange.mock.results[0]?.value.reason).toBe('trigger-press');
    expect(handleOpenChange.mock.results[0]?.value.event).toBeInstanceOf(MouseEvent);
    expect(handleOpenChange.mock.results[0]?.value.isCanceled).toBe(true);
    expect(getPanel(container)).toBeNull();
  });

  it('applies disabled state attributes and keeps the trigger inert', async () => {
    const container = render(
      renderCollapsible({
        defaultOpen: true,
        disabled: true,
      }),
    );
    await flushUpdates();

    const root = container.querySelector('[data-base-ui-collapsible-root]');
    const trigger = getTrigger(container);
    const panel = getPanel(container);

    expect(root).toHaveAttribute('data-disabled');
    expect(trigger).toHaveAttribute('data-disabled');
    expect(trigger).toHaveAttribute('aria-disabled', 'true');
    expect(panel).toHaveAttribute('data-disabled');

    click(trigger);
    await flushUpdates();

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(panel).toHaveAttribute('data-open');
  });

  it('supports keyboard activation for native and non-native triggers', async () => {
    const nativeContainer = render(renderCollapsible());
    await flushUpdates();

    const nativeTrigger = getTrigger(nativeContainer);

    keyDown(nativeTrigger, 'Enter');
    await flushUpdates();
    expect(nativeTrigger).toHaveAttribute('aria-expanded', 'true');

    keyDown(nativeTrigger, ' ');
    await flushUpdates();
    expect(nativeTrigger).toHaveAttribute('aria-expanded', 'false');

    const customContainer = render(
      Collapsible.Root({
        children: [
          Collapsible.Trigger({
            'data-testid': 'trigger',
            nativeButton: false,
            render: html`<span></span>`,
            children: 'Trigger',
          }),
          Collapsible.Panel({
            'data-testid': 'panel',
            children: 'Panel',
          }),
        ],
      }),
    );
    await flushUpdates();

    const customTrigger = getTrigger(customContainer);

    expect(customTrigger).toHaveAttribute('role', 'button');
    expect(customTrigger).toHaveAttribute('tabindex', '0');

    keyDown(customTrigger, ' ');
    await flushUpdates();
    expect(customTrigger).toHaveAttribute('aria-expanded', 'true');

    keyUp(customTrigger, ' ');
    await flushUpdates();
    expect(customTrigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('keeps the panel mounted when keepMounted is true', async () => {
    const container = render(
      Collapsible.Root({
        children: [
          Collapsible.Trigger({
            'data-testid': 'trigger',
            children: 'Trigger',
          }),
          Collapsible.Panel({
            'data-testid': 'panel',
            keepMounted: true,
            children: 'Panel',
          }),
        ],
      }),
    );
    await flushUpdates();

    const trigger = getTrigger(container);

    expect(getPanel(container)).not.toBeNull();
    expect(getPanel(container)).toHaveAttribute('hidden');
    expect(getPanel(container)).toHaveAttribute('data-closed');

    click(trigger);
    await flushUpdates();
    expect(getPanel(container)).not.toHaveAttribute('hidden');

    click(trigger);
    await flushUpdates();
    expect(getPanel(container)).not.toBeNull();
    expect(getPanel(container)).toHaveAttribute('hidden');
    expect(getPanel(container)).toHaveAttribute('data-closed');
  });

  it('supports hiddenUntilFound and opens on beforematch', async () => {
    const handleOpenChange = vi.fn();
    const container = render(
      Collapsible.Root({
        onOpenChange: handleOpenChange,
        children: [
          Collapsible.Trigger({
            'data-testid': 'trigger',
            children: 'Trigger',
          }),
          Collapsible.Panel({
            'data-testid': 'panel',
            hiddenUntilFound: true,
            keepMounted: true,
            children: 'Panel',
          }),
        ],
      }),
    );
    await flushUpdates();

    const panel = getPanel(container);

    expect(panel).not.toBeNull();
    expect(panel).toHaveAttribute('hidden', 'until-found');

    panel?.dispatchEvent(new Event('beforematch', { bubbles: true }));
    await flushUpdates();

    expect(handleOpenChange).toHaveBeenCalledTimes(1);
    expect(handleOpenChange.mock.calls[0]?.[0]).toBe(true);
    expect(handleOpenChange.mock.calls[0]?.[1].reason).toBe('none');
    expect(getPanel(container)).not.toHaveAttribute('hidden');
    expect(getPanel(container)).toHaveAttribute('data-open');
  });

  it('honors manual panel ids in trigger aria-controls', async () => {
    const container = render(
      Collapsible.Root({
        defaultOpen: true,
        children: [
          Collapsible.Trigger({
            'data-testid': 'trigger',
            children: 'Trigger',
          }),
          Collapsible.Panel({
            'data-testid': 'panel',
            id: 'custom-panel-id',
            children: 'Panel',
          }),
        ],
      }),
    );
    await flushUpdates();

    const trigger = getTrigger(container);
    const panel = getPanel(container);

    expect(trigger).toHaveAttribute('aria-controls', 'custom-panel-id');
    expect(panel).toHaveAttribute('id', 'custom-panel-id');
  });

  it('throws when a part renders outside Collapsible.Root', () => {
    expect(() => {
      render(Collapsible.Trigger({ children: 'Trigger' }));
    }).toThrow(
      'Base UI: CollapsibleRootContext is missing. Collapsible parts must be placed within <Collapsible.Root>.',
    );
  });
});
