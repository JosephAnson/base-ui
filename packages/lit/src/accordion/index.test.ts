/* eslint-disable testing-library/render-result-naming-convention */
import { html, nothing, render as renderTemplate, type TemplateResult } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import type { BaseUIChangeEventDetails } from '@base-ui/lit/types';
import {
  Accordion,
  type AccordionItemChangeEventDetails,
  type AccordionPanelProps,
  type AccordionPanelState,
  type AccordionRootChangeEventDetails,
  type AccordionRootProps,
  type AccordionRootState,
  type AccordionTriggerProps,
  type AccordionTriggerState,
} from '@base-ui/lit/accordion';

describe('Accordion', () => {
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

  function getTrigger(container: HTMLElement, testId = 'trigger') {
    return container.querySelector(`[data-testid="${testId}"]`) as HTMLElement;
  }

  function getPanel(container: HTMLElement, testId = 'panel') {
    return container.querySelector(`[data-testid="${testId}"]`) as HTMLElement | null;
  }

  function renderAccordion(props: AccordionRootProps<string> = {}) {
    return Accordion.Root({
      ...props,
      children: [
        Accordion.Item({
          'data-testid': 'item-a',
          value: 'a',
          children: [
            Accordion.Header({
              'data-testid': 'header-a',
              children: Accordion.Trigger({
                'data-testid': 'trigger-a',
                children: 'Trigger A',
              }),
            }),
            Accordion.Panel({
              'data-testid': 'panel-a',
              children: 'Panel A',
            }),
          ],
        }),
        Accordion.Item({
          'data-testid': 'item-b',
          value: 'b',
          children: [
            Accordion.Header({
              'data-testid': 'header-b',
              children: Accordion.Trigger({
                'data-testid': 'trigger-b',
                children: 'Trigger B',
              }),
            }),
            Accordion.Panel({
              'data-testid': 'panel-b',
              children: 'Panel B',
            }),
          ],
        }),
        Accordion.Item({
          'data-testid': 'item-c',
          value: 'c',
          children: [
            Accordion.Header({
              'data-testid': 'header-c',
              children: Accordion.Trigger({
                'data-testid': 'trigger-c',
                children: 'Trigger C',
              }),
            }),
            Accordion.Panel({
              'data-testid': 'panel-c',
              children: 'Panel C',
            }),
          ],
        }),
      ],
    });
  }

  it('preserves the public type contracts', () => {
    const root = Accordion.Root({});
    const item = Accordion.Item({});
    const header = Accordion.Header({});
    const trigger = Accordion.Trigger({});
    const panel = Accordion.Panel({});

    expectTypeOf(root).toEqualTypeOf<TemplateResult>();
    expectTypeOf(item).toEqualTypeOf<TemplateResult>();
    expectTypeOf(header).toEqualTypeOf<TemplateResult>();
    expectTypeOf(trigger).toEqualTypeOf<TemplateResult>();
    expectTypeOf(panel).toEqualTypeOf<TemplateResult>();

    expectTypeOf<AccordionRootProps['value']>().toEqualTypeOf<any[] | undefined>();
    expectTypeOf<AccordionRootProps['defaultValue']>().toEqualTypeOf<any[] | undefined>();
    expectTypeOf<AccordionRootProps['orientation']>().toEqualTypeOf<
      'horizontal' | 'vertical' | undefined
    >();
    expectTypeOf<AccordionTriggerProps['nativeButton']>().toEqualTypeOf<boolean | undefined>();
    expectTypeOf<AccordionPanelProps['keepMounted']>().toEqualTypeOf<boolean | undefined>();
    expectTypeOf<AccordionPanelProps['hiddenUntilFound']>().toEqualTypeOf<boolean | undefined>();
    expectTypeOf<AccordionRootChangeEventDetails>().toEqualTypeOf<
      BaseUIChangeEventDetails<'trigger-press' | 'none'>
    >();
    expectTypeOf<AccordionItemChangeEventDetails>().toEqualTypeOf<
      BaseUIChangeEventDetails<'trigger-press' | 'none'>
    >();
    expectTypeOf<AccordionRootState['disabled']>().toEqualTypeOf<boolean>();
    expectTypeOf<AccordionRootState['orientation']>().toEqualTypeOf<'horizontal' | 'vertical'>();
    expectTypeOf<AccordionTriggerState['index']>().toEqualTypeOf<number>();
    expectTypeOf<AccordionTriggerState['open']>().toEqualTypeOf<boolean>();
    expectTypeOf<AccordionPanelState['transitionStatus']>().toEqualTypeOf<
      'starting' | 'ending' | undefined
    >();
  });

  it('wires ARIA attributes and uncontrolled open state', async () => {
    const container = render(
      Accordion.Root({
        children: Accordion.Item({
          value: 'a',
          children: [
            Accordion.Header({
              children: Accordion.Trigger({
                'data-testid': 'trigger',
                children: 'Trigger',
              }),
            }),
            Accordion.Panel({
              'data-testid': 'panel',
              children: 'Panel',
            }),
          ],
        }),
      }),
    );
    await flushUpdates();

    const root = container.querySelector('[data-base-ui-accordion-root]');
    const trigger = getTrigger(container);

    expect(root).toHaveAttribute('role', 'region');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).not.toHaveAttribute('aria-controls');
    expect(getPanel(container)).toBeNull();

    click(trigger);
    await flushUpdates();

    const panel = getPanel(container);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(trigger).toHaveAttribute('data-panel-open');
    expect(panel).not.toBeNull();
    expect(panel).toHaveAttribute('role', 'region');
    expect(panel?.getAttribute('id')).toBe(trigger.getAttribute('aria-controls'));
    expect(panel).toHaveAttribute('aria-labelledby', trigger.getAttribute('id') ?? '');
    expect(panel).toHaveAttribute('data-open');

    click(trigger);
    await flushUpdates();

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).not.toHaveAttribute('aria-controls');
    expect(getPanel(container)).toBeNull();
  });

  it('supports controlled value and onValueChange semantics', async () => {
    let value: string[] = ['a'];
    const handleValueChange = vi.fn(
      (nextValue: string[], eventDetails: AccordionRootChangeEventDetails) => {
        value = nextValue;
        rerender();
        return { eventDetails, nextValue };
      },
    );
    const container = render(html``);

    function rerender() {
      renderTemplate(renderAccordion({ onValueChange: handleValueChange, value }), container);
    }

    rerender();
    await flushUpdates();

    const triggerA = getTrigger(container, 'trigger-a');
    const triggerB = getTrigger(container, 'trigger-b');

    expect(getPanel(container, 'panel-a')).not.toBeNull();
    expect(getPanel(container, 'panel-b')).toBeNull();

    click(triggerB);
    await flushUpdates();

    expect(handleValueChange).toHaveBeenCalledTimes(1);
    expect(handleValueChange.mock.calls[0]?.[0]).toEqual(['b']);
    expect(handleValueChange.mock.results[0]?.value.eventDetails.reason).toBe('none');
    expect(getPanel(container, 'panel-a')).toBeNull();
    expect(getPanel(container, 'panel-b')).not.toBeNull();

    click(triggerB);
    await flushUpdates();

    expect(handleValueChange).toHaveBeenCalledTimes(2);
    expect(handleValueChange.mock.calls[1]?.[0]).toEqual([]);
    expect(getPanel(container, 'panel-b')).toBeNull();
    expect(triggerA).toHaveAttribute('aria-expanded', 'false');
  });

  it('supports multiple open items', async () => {
    const container = render(renderAccordion({ multiple: true }));
    await flushUpdates();

    const triggerA = getTrigger(container, 'trigger-a');
    const triggerB = getTrigger(container, 'trigger-b');

    click(triggerA);
    click(triggerB);
    await flushUpdates();

    expect(getPanel(container, 'panel-a')).not.toBeNull();
    expect(getPanel(container, 'panel-b')).not.toBeNull();
    expect(triggerA).toHaveAttribute('data-panel-open');
    expect(triggerB).toHaveAttribute('data-panel-open');
  });

  it('propagates disabled state to the default parts', async () => {
    const container = render(
      Accordion.Root({
        defaultValue: ['a'],
        disabled: true,
        children: Accordion.Item({
          'data-testid': 'item',
          value: 'a',
          children: [
            Accordion.Header({
              'data-testid': 'header',
              children: Accordion.Trigger({
                'data-testid': 'trigger',
                children: 'Trigger',
              }),
            }),
            Accordion.Panel({
              'data-testid': 'panel',
              children: 'Panel',
            }),
          ],
        }),
      }),
    );
    await flushUpdates();

    expect(container.querySelector('[data-testid="item"]')).toHaveAttribute('data-disabled');
    expect(container.querySelector('[data-testid="header"]')).toHaveAttribute('data-disabled');
    expect(container.querySelector('[data-testid="trigger"]')).toHaveAttribute('data-disabled');
    expect(container.querySelector('[data-testid="panel"]')).toHaveAttribute('data-disabled');
  });

  it('moves focus between triggers with arrow keys and skips disabled items', async () => {
    const container = render(
      Accordion.Root({
        children: [
          Accordion.Item({
            value: 'a',
            children: [
              Accordion.Header({
                children: Accordion.Trigger({
                  'data-testid': 'trigger-a',
                  children: 'Trigger A',
                }),
              }),
              Accordion.Panel({
                children: 'Panel A',
              }),
            ],
          }),
          Accordion.Item({
            disabled: true,
            value: 'b',
            children: [
              Accordion.Header({
                children: Accordion.Trigger({
                  'data-testid': 'trigger-b',
                  children: 'Trigger B',
                }),
              }),
              Accordion.Panel({
                children: 'Panel B',
              }),
            ],
          }),
          Accordion.Item({
            value: 'c',
            children: [
              Accordion.Header({
                children: Accordion.Trigger({
                  'data-testid': 'trigger-c',
                  children: 'Trigger C',
                }),
              }),
              Accordion.Panel({
                children: 'Panel C',
              }),
            ],
          }),
        ],
      }),
    );
    await flushUpdates();

    const triggerA = getTrigger(container, 'trigger-a');
    const triggerC = getTrigger(container, 'trigger-c');

    triggerA.focus();
    keyDown(triggerA, 'ArrowDown');
    await flushUpdates();
    expect(triggerC).toHaveFocus();

    keyDown(triggerC, 'ArrowDown');
    await flushUpdates();
    expect(triggerA).toHaveFocus();
  });

  it('supports horizontal RTL roving focus', async () => {
    const container = render(
      html`<div dir="rtl">${renderAccordion({ orientation: 'horizontal' })}</div>`,
    );
    await flushUpdates();

    const triggerA = getTrigger(container, 'trigger-a');
    const triggerB = getTrigger(container, 'trigger-b');

    triggerA.focus();
    keyDown(triggerA, 'ArrowLeft');
    await flushUpdates();
    expect(triggerB).toHaveFocus();

    keyDown(triggerB, 'ArrowRight');
    await flushUpdates();
    expect(triggerA).toHaveFocus();
  });

  it('keeps non-native triggers tabbable and toggles on keyboard keydown', async () => {
    const container = render(
      Accordion.Root({
        children: Accordion.Item({
          value: 'a',
          children: [
            Accordion.Header({
              children: Accordion.Trigger({
                'data-testid': 'trigger',
                nativeButton: false,
                render: html`<span></span>`,
                children: 'Trigger',
              }),
            }),
            Accordion.Panel({
              'data-testid': 'panel',
              children: 'Panel',
            }),
          ],
        }),
      }),
    );
    await flushUpdates();

    const trigger = getTrigger(container);

    expect(trigger).toHaveAttribute('role', 'button');
    expect(trigger).toHaveAttribute('tabindex', '0');

    trigger.focus();
    keyDown(trigger, ' ');
    await flushUpdates();

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(getPanel(container)).not.toBeNull();

    keyUp(trigger, ' ');
    await flushUpdates();

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('keeps panels mounted when keepMounted is true', async () => {
    const container = render(
      Accordion.Root({
        children: Accordion.Item({
          value: 'a',
          children: [
            Accordion.Header({
              children: Accordion.Trigger({
                'data-testid': 'trigger',
                children: 'Trigger',
              }),
            }),
            Accordion.Panel({
              'data-testid': 'panel',
              keepMounted: true,
              children: 'Panel',
            }),
          ],
        }),
      }),
    );
    await flushUpdates();

    const trigger = getTrigger(container);
    const panel = getPanel(container);

    expect(panel).not.toBeNull();
    expect(panel).toHaveAttribute('hidden');
    expect(panel).toHaveAttribute('data-closed');

    click(trigger);
    await flushUpdates();
    expect(getPanel(container)).not.toHaveAttribute('hidden');

    click(trigger);
    await flushUpdates();
    expect(getPanel(container)).not.toBeNull();
    expect(getPanel(container)).toHaveAttribute('hidden');
  });

  it('supports hiddenUntilFound and opens on beforematch', async () => {
    const handleValueChange = vi.fn();
    const container = render(
      Accordion.Root({
        hiddenUntilFound: true,
        keepMounted: true,
        onValueChange: handleValueChange,
        children: Accordion.Item({
          value: 'a',
          children: [
            Accordion.Header({
              children: Accordion.Trigger({
                'data-testid': 'trigger',
                children: 'Trigger',
              }),
            }),
            Accordion.Panel({
              'data-testid': 'panel',
              children: 'Panel',
            }),
          ],
        }),
      }),
    );
    await flushUpdates();

    const panel = getPanel(container);

    expect(panel).not.toBeNull();
    expect(panel).toHaveAttribute('hidden', 'until-found');

    panel?.dispatchEvent(new Event('beforematch', { bubbles: true }));
    await flushUpdates();

    expect(handleValueChange).toHaveBeenCalledTimes(1);
    expect(handleValueChange.mock.calls[0]?.[0]).toEqual(['a']);
    expect(getPanel(container)).not.toHaveAttribute('hidden');
    expect(getPanel(container)).toHaveAttribute('data-open');
  });

  it('honors manual panel ids in trigger aria-controls', async () => {
    const container = render(
      Accordion.Root({
        defaultValue: ['a'],
        children: Accordion.Item({
          value: 'a',
          children: [
            Accordion.Header({
              children: Accordion.Trigger({
                'data-testid': 'trigger',
                children: 'Trigger',
              }),
            }),
            Accordion.Panel({
              'data-testid': 'panel',
              id: 'custom-panel-id',
              children: 'Panel',
            }),
          ],
        }),
      }),
    );
    await flushUpdates();

    const trigger = getTrigger(container);
    const panel = getPanel(container);

    expect(trigger).toHaveAttribute('aria-controls', 'custom-panel-id');
    expect(panel).toHaveAttribute('id', 'custom-panel-id');
  });

  it('throws when Accordion.Item renders outside Accordion.Root', () => {
    expect(() => {
      render(Accordion.Item({ children: 'Item' }));
    }).toThrow(
      'Base UI: AccordionRootContext is missing. Accordion parts must be placed within <Accordion.Root>.',
    );
  });
});
