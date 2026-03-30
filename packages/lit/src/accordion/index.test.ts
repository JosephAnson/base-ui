/* eslint-disable import/extensions, no-plusplus, no-await-in-loop, no-promise-executor-return */
/* eslint-disable testing-library/render-result-naming-convention */
import { html, nothing, render as renderTemplate } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import './index.ts';
import type {
  AccordionRootElement,
  AccordionRootChangeEventDetails,
  AccordionItemElement,
} from './index.ts';

describe('accordion', () => {
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

  function getRoot(container: HTMLElement) {
    return container.querySelector('accordion-root') as AccordionRootElement;
  }

  function getTrigger(container: HTMLElement, index: number) {
    return container.querySelectorAll('accordion-trigger')[index] as HTMLElement;
  }

  function getPanel(container: HTMLElement, index: number) {
    return container.querySelectorAll('accordion-panel')[index] as HTMLElement;
  }

  function renderThreeItems(rootProps: Record<string, unknown> = {}) {
    return html`
      <accordion-root
        .multiple=${rootProps.multiple ?? false}
        .loopFocus=${rootProps.loopFocus ?? true}
        .defaultValue=${rootProps.defaultValue ?? []}
        .value=${rootProps.value}
        .onValueChange=${rootProps.onValueChange}
        .orientation=${rootProps.orientation ?? 'vertical'}
        .disabled=${rootProps.disabled ?? false}
        .keepMounted=${rootProps.keepMounted ?? false}
        .hiddenUntilFound=${rootProps.hiddenUntilFound ?? false}
      >
        <accordion-item .itemValue=${'a'}>
          <accordion-header>
            <accordion-trigger>Trigger A</accordion-trigger>
          </accordion-header>
          <accordion-panel>Panel A</accordion-panel>
        </accordion-item>
        <accordion-item .itemValue=${'b'}>
          <accordion-header>
            <accordion-trigger>Trigger B</accordion-trigger>
          </accordion-header>
          <accordion-panel>Panel B</accordion-panel>
        </accordion-item>
        <accordion-item .itemValue=${'c'}>
          <accordion-header>
            <accordion-trigger>Trigger C</accordion-trigger>
          </accordion-header>
          <accordion-panel>Panel C</accordion-panel>
        </accordion-item>
      </accordion-root>
    `;
  }

  it('renders accordion-root as a custom element with role=region', async () => {
    const container = render(html`
      <accordion-root>
        <accordion-item .itemValue=${'a'}>
          <accordion-header>
            <accordion-trigger>Toggle</accordion-trigger>
          </accordion-header>
          <accordion-panel>Content</accordion-panel>
        </accordion-item>
      </accordion-root>
    `);
    await waitForUpdate();

    const root = getRoot(container);
    expect(root).toBeInTheDocument();
    expect(root).toHaveAttribute('data-base-ui-accordion-root');
    expect(root).toHaveAttribute('role', 'region');
  });

  it('wires ARIA attributes and toggles open on trigger click', async () => {
    const container = render(html`
      <accordion-root>
        <accordion-item .itemValue=${'a'}>
          <accordion-header>
            <accordion-trigger>Toggle</accordion-trigger>
          </accordion-header>
          <accordion-panel>Content</accordion-panel>
        </accordion-item>
      </accordion-root>
    `);
    await waitForUpdate();

    const trigger = getTrigger(container, 0);
    const panel = getPanel(container, 0);

    // Initially closed
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).not.toHaveAttribute('aria-controls');
    expect(panel).toHaveAttribute('hidden');

    // Click to open
    trigger.click();
    await waitForUpdate();

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(trigger).toHaveAttribute('aria-controls', panel.id);
    expect(trigger).toHaveAttribute('data-panel-open');
    expect(panel).not.toHaveAttribute('hidden');
    expect(panel).toHaveAttribute('data-open');
    expect(panel).toHaveAttribute('role', 'region');
    expect(panel).toHaveAttribute('aria-labelledby', trigger.id);

    // Click to close
    trigger.click();
    await waitForUpdate();

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).not.toHaveAttribute('aria-controls');
    expect(panel).toHaveAttribute('hidden');
  });

  it('supports controlled value and onValueChange', async () => {
    let value: string[] = ['a'];
    const handleValueChange = vi.fn(
      (nextValue: string[], _details: AccordionRootChangeEventDetails) => {
        value = nextValue;
      },
    );
    const container = render(html``);

    function rerender() {
      renderTemplate(
        html`
          <accordion-root .value=${value} .onValueChange=${handleValueChange}>
            <accordion-item .itemValue=${'a'}>
              <accordion-header>
                <accordion-trigger>Trigger A</accordion-trigger>
              </accordion-header>
              <accordion-panel>Panel A</accordion-panel>
            </accordion-item>
            <accordion-item .itemValue=${'b'}>
              <accordion-header>
                <accordion-trigger>Trigger B</accordion-trigger>
              </accordion-header>
              <accordion-panel>Panel B</accordion-panel>
            </accordion-item>
          </accordion-root>
        `,
        container,
      );
    }

    rerender();
    await waitForUpdate();

    const triggerA = getTrigger(container, 0);
    const triggerB = getTrigger(container, 1);
    const panelA = getPanel(container, 0);
    const panelB = getPanel(container, 1);

    // Item A is open
    expect(triggerA).toHaveAttribute('aria-expanded', 'true');
    expect(panelA).not.toHaveAttribute('hidden');
    expect(panelB).toHaveAttribute('hidden');

    // Click trigger B
    triggerB.click();
    rerender();
    await waitForUpdate();

    expect(handleValueChange).toHaveBeenCalledTimes(1);
    expect(handleValueChange.mock.calls[0]?.[0]).toEqual(['b']);

    // After rerender, B is open, A is closed
    expect(getTrigger(container, 1)).toHaveAttribute('aria-expanded', 'true');
    expect(getPanel(container, 1)).not.toHaveAttribute('hidden');

    // Close B
    getTrigger(container, 1).click();
    rerender();
    await waitForUpdate();

    expect(handleValueChange).toHaveBeenCalledTimes(2);
    expect(handleValueChange.mock.calls[1]?.[0]).toEqual([]);
  });

  it('supports multiple open items', async () => {
    const container = render(renderThreeItems({ multiple: true }));
    await waitForUpdate();

    const triggerA = getTrigger(container, 0);
    const triggerB = getTrigger(container, 1);

    triggerA.click();
    await waitForUpdate();
    triggerB.click();
    await waitForUpdate();

    expect(getPanel(container, 0)).not.toHaveAttribute('hidden');
    expect(getPanel(container, 1)).not.toHaveAttribute('hidden');
    expect(triggerA).toHaveAttribute('data-panel-open');
    expect(triggerB).toHaveAttribute('data-panel-open');
  });

  it('propagates disabled state from root', async () => {
    const container = render(html`
      <accordion-root .disabled=${true} .defaultValue=${['a']}>
        <accordion-item .itemValue=${'a'}>
          <accordion-header>
            <accordion-trigger>Toggle</accordion-trigger>
          </accordion-header>
          <accordion-panel>Content</accordion-panel>
        </accordion-item>
      </accordion-root>
    `);
    await waitForUpdate();

    const root = getRoot(container);
    const item = container.querySelector('accordion-item') as HTMLElement;
    const header = container.querySelector('accordion-header') as HTMLElement;
    const trigger = getTrigger(container, 0);
    const panel = getPanel(container, 0);

    expect(root).toHaveAttribute('data-disabled');
    expect(item).toHaveAttribute('data-disabled');
    expect(header).toHaveAttribute('data-disabled');
    expect(trigger).toHaveAttribute('data-disabled');
    expect(panel).toHaveAttribute('data-disabled');

    // Click should not toggle because disabled
    trigger.click();
    await waitForUpdate();

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(panel).toHaveAttribute('data-open');
  });

  it('moves focus between triggers with arrow keys and skips disabled items', async () => {
    const container = render(html`
      <accordion-root>
        <accordion-item .itemValue=${'a'}>
          <accordion-header>
            <accordion-trigger>Trigger A</accordion-trigger>
          </accordion-header>
          <accordion-panel>Panel A</accordion-panel>
        </accordion-item>
        <accordion-item .itemValue=${'b'} .disabled=${true}>
          <accordion-header>
            <accordion-trigger>Trigger B</accordion-trigger>
          </accordion-header>
          <accordion-panel>Panel B</accordion-panel>
        </accordion-item>
        <accordion-item .itemValue=${'c'}>
          <accordion-header>
            <accordion-trigger>Trigger C</accordion-trigger>
          </accordion-header>
          <accordion-panel>Panel C</accordion-panel>
        </accordion-item>
      </accordion-root>
    `);
    await waitForUpdate();

    const triggerA = getTrigger(container, 0);
    const triggerC = getTrigger(container, 2);

    triggerA.focus();
    triggerA.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowDown' }),
    );
    await waitForUpdate();

    // Should skip disabled B and land on C
    expect(triggerC).toHaveFocus();

    // ArrowDown from C should loop back to A
    triggerC.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowDown' }),
    );
    await waitForUpdate();
    expect(triggerA).toHaveFocus();
  });

  it('supports horizontal RTL navigation', async () => {
    const container = render(
      html`<div dir="rtl">${renderThreeItems({ orientation: 'horizontal' })}</div>`,
    );
    await waitForUpdate();

    const triggerA = getTrigger(container, 0);
    const triggerB = getTrigger(container, 1);

    triggerA.focus();
    // ArrowLeft in RTL horizontal = next
    triggerA.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowLeft' }),
    );
    await waitForUpdate();
    expect(triggerB).toHaveFocus();

    // ArrowRight in RTL horizontal = previous
    triggerB.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowRight' }),
    );
    await waitForUpdate();
    expect(triggerA).toHaveFocus();
  });

  it('supports keyboard activation with Enter and Space', async () => {
    const container = render(html`
      <accordion-root>
        <accordion-item .itemValue=${'a'}>
          <accordion-header>
            <accordion-trigger>Toggle</accordion-trigger>
          </accordion-header>
          <accordion-panel>Content</accordion-panel>
        </accordion-item>
      </accordion-root>
    `);
    await waitForUpdate();

    const trigger = getTrigger(container, 0);

    // Space opens
    trigger.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: ' ' }),
    );
    await waitForUpdate();
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    // Enter closes
    trigger.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter' }),
    );
    await waitForUpdate();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('keeps panels mounted when keepMounted is set', async () => {
    const container = render(html`
      <accordion-root>
        <accordion-item .itemValue=${'a'}>
          <accordion-header>
            <accordion-trigger>Toggle</accordion-trigger>
          </accordion-header>
          <accordion-panel .keepMounted=${true}>Content</accordion-panel>
        </accordion-item>
      </accordion-root>
    `);
    await waitForUpdate();

    const trigger = getTrigger(container, 0);
    const panel = getPanel(container, 0);

    // Closed but still in DOM with hidden
    expect(panel).toBeInTheDocument();
    expect(panel).toHaveAttribute('hidden');
    expect(panel).toHaveAttribute('data-closed');

    // Open
    trigger.click();
    await waitForUpdate();
    expect(panel).not.toHaveAttribute('hidden');
    expect(panel).toHaveAttribute('data-open');

    // Close — still in DOM
    trigger.click();
    await waitForUpdate();
    expect(panel).toBeInTheDocument();
    expect(panel).toHaveAttribute('hidden');
    expect(panel).toHaveAttribute('data-closed');
  });

  it('supports hiddenUntilFound at root level', async () => {
    const container = render(html`
      <accordion-root .hiddenUntilFound=${true} .keepMounted=${true}>
        <accordion-item .itemValue=${'a'}>
          <accordion-header>
            <accordion-trigger>Toggle</accordion-trigger>
          </accordion-header>
          <accordion-panel>Content</accordion-panel>
        </accordion-item>
      </accordion-root>
    `);
    await waitForUpdate();

    const panel = getPanel(container, 0);
    expect(panel).toHaveAttribute('hidden', 'until-found');
  });

  it('opens on beforematch event', async () => {
    const handleValueChange = vi.fn();
    const container = render(html`
      <accordion-root
        .hiddenUntilFound=${true}
        .keepMounted=${true}
        .onValueChange=${handleValueChange}
      >
        <accordion-item .itemValue=${'a'}>
          <accordion-header>
            <accordion-trigger>Toggle</accordion-trigger>
          </accordion-header>
          <accordion-panel>Content</accordion-panel>
        </accordion-item>
      </accordion-root>
    `);
    await waitForUpdate();

    // Simulate beforematch by toggling the item via the item element
    const item = container.querySelector('accordion-item') as AccordionItemElement;
    item.toggle(true, new Event('beforematch'), 'none');
    await waitForUpdate();

    expect(handleValueChange).toHaveBeenCalledTimes(1);
    expect(handleValueChange.mock.calls[0]?.[0]).toEqual(['a']);
    expect(getPanel(container, 0)).not.toHaveAttribute('hidden');
  });

  it('supports defaultOpen via defaultValue on root', async () => {
    const container = render(html`
      <accordion-root .defaultValue=${['a']}>
        <accordion-item .itemValue=${'a'}>
          <accordion-header>
            <accordion-trigger>Toggle</accordion-trigger>
          </accordion-header>
          <accordion-panel>Content</accordion-panel>
        </accordion-item>
      </accordion-root>
    `);
    await waitForUpdate();

    const trigger = getTrigger(container, 0);
    const panel = getPanel(container, 0);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(panel).not.toHaveAttribute('hidden');
    expect(panel).toHaveAttribute('data-open');
  });

  it('honors manual panel ids in trigger aria-controls', async () => {
    const container = render(html`
      <accordion-root .defaultValue=${['a']}>
        <accordion-item .itemValue=${'a'}>
          <accordion-header>
            <accordion-trigger>Toggle</accordion-trigger>
          </accordion-header>
          <accordion-panel id="custom-panel-id">Content</accordion-panel>
        </accordion-item>
      </accordion-root>
    `);
    await waitForUpdate();

    const trigger = getTrigger(container, 0);
    const panel = getPanel(container, 0);

    expect(trigger).toHaveAttribute('aria-controls', 'custom-panel-id');
    expect(panel).toHaveAttribute('id', 'custom-panel-id');
  });

  it('logs error when parts are used outside root', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(html`
      <accordion-item .itemValue=${'a'}>
        <accordion-trigger>Orphan</accordion-trigger>
      </accordion-item>
    `);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Accordion parts must be placed within'),
    );

    errorSpy.mockRestore();
  });

  it('supports Home and End keys', async () => {
    const container = render(renderThreeItems());
    await waitForUpdate();

    const triggerA = getTrigger(container, 0);
    const triggerC = getTrigger(container, 2);

    triggerA.focus();
    triggerA.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'End' }),
    );
    await waitForUpdate();
    expect(triggerC).toHaveFocus();

    triggerC.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Home' }),
    );
    await waitForUpdate();
    expect(triggerA).toHaveFocus();
  });

  it('supports `value` as an attribute alias on items', async () => {
    const container = render(html`
      <accordion-root .defaultValue=${['a']}>
        <accordion-item value="a">
          <accordion-header>
            <accordion-trigger>Toggle</accordion-trigger>
          </accordion-header>
          <accordion-panel>Content</accordion-panel>
        </accordion-item>
      </accordion-root>
    `);
    await waitForUpdate();

    expect(getTrigger(container, 0)).toHaveAttribute('aria-expanded', 'true');
    expect(getPanel(container, 0)).not.toHaveAttribute('hidden');
  });

  it('supports a rendered trigger target for keyboard and pointer interaction', async () => {
    const container = render(html`
      <accordion-root>
        <accordion-item value="a">
          <accordion-header>
            <accordion-trigger .render=${html`<button class="rendered-trigger"></button>`}>
              Toggle
            </accordion-trigger>
          </accordion-header>
          <accordion-panel>Content</accordion-panel>
        </accordion-item>
      </accordion-root>
    `);
    await waitForUpdate();

    const renderedTrigger = container.querySelector('.rendered-trigger') as HTMLButtonElement;
    renderedTrigger.click();
    await waitForUpdate();
    expect(getPanel(container, 0)).not.toHaveAttribute('hidden');

    renderedTrigger.focus();
    renderedTrigger.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: ' ' }),
    );
    await waitForUpdate();
    expect(getPanel(container, 0)).toHaveAttribute('hidden');
  });

  it('exports the Accordion runtime namespace', async () => {
    const module = (await import('./index.ts')) as typeof import('./index.ts');

    expect(module.Accordion.Root).toBeTypeOf('function');
    expect(module.Accordion.Item).toBeTypeOf('function');
    expect(module.Accordion.Header).toBeTypeOf('function');
    expect(module.Accordion.Trigger).toBeTypeOf('function');
    expect(module.Accordion.Panel).toBeTypeOf('function');
  });
});
