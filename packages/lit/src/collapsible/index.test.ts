import { html, nothing, render as renderTemplate } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import {
  Collapsible,
  CollapsiblePanelElement,
  CollapsibleRootElement,
  CollapsibleTriggerElement,
  type CollapsibleChangeEventDetails,
  type CollapsibleRoot,
  type CollapsibleRootChangeEventDetails,
  type CollapsibleRootChangeEventReason,
  type CollapsibleRootProps,
  type CollapsibleRootState,
  type CollapsiblePanel,
  type CollapsiblePanelProps,
  type CollapsiblePanelState,
  type CollapsibleTrigger,
  type CollapsibleTriggerProps,
  type CollapsibleTriggerState,
} from './index';

describe('collapsible', () => {
  const containers = new Set<HTMLDivElement>();

  afterEach(() => {
    containers.forEach((container) => {
      renderTemplate(nothing, container);
      container.remove();
    });
    containers.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function render(result: ReturnType<typeof html>) {
    const container = document.createElement('div');
    document.body.append(container);
    containers.add(container);
    renderTemplate(result, container);
    return container;
  }

  async function waitForUpdate() {
    await flushTimers(6);
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
    await flushTimers(6);
  }

  function flushTimers(count: number) {
    return Array.from({ length: count }).reduce<Promise<void>>((promise) => {
      return promise.then(
        () =>
          new Promise<void>((resolve) => {
            setTimeout(resolve, 0);
          }),
      );
    }, Promise.resolve());
  }

  function getRoot(view: HTMLElement) {
    return view.querySelector('collapsible-root') as CollapsibleRootElement;
  }

  function getTrigger(view: HTMLElement) {
    return view.querySelector('collapsible-trigger') as HTMLElement;
  }

  function getPanel(view: HTMLElement) {
    return view.querySelector('collapsible-panel') as HTMLElement;
  }

  it('exposes runtime parts and namespace aliases', () => {
    expect(Collapsible.Root).toBe(CollapsibleRootElement);
    expect(Collapsible.Trigger).toBe(CollapsibleTriggerElement);
    expect(Collapsible.Panel).toBe(CollapsiblePanelElement);
    expectTypeOf<CollapsibleRootProps>().toEqualTypeOf<CollapsibleRoot.Props>();
    expectTypeOf<CollapsibleRootState>().toEqualTypeOf<CollapsibleRoot.State>();
    expectTypeOf<CollapsibleRootChangeEventReason>().toEqualTypeOf<CollapsibleRoot.ChangeEventReason>();
    expectTypeOf<CollapsibleRootChangeEventDetails>().toEqualTypeOf<CollapsibleRoot.ChangeEventDetails>();
    expectTypeOf<CollapsibleTriggerProps>().toEqualTypeOf<CollapsibleTrigger.Props>();
    expectTypeOf<CollapsibleTriggerState>().toEqualTypeOf<CollapsibleTrigger.State>();
    expectTypeOf<CollapsiblePanelProps>().toEqualTypeOf<CollapsiblePanel.Props>();
    expectTypeOf<CollapsiblePanelState>().toEqualTypeOf<CollapsiblePanel.State>();
  });

  it('renders collapsible-root as a custom element', async () => {
    const view = render(html`
      <collapsible-root>
        <collapsible-trigger>Toggle</collapsible-trigger>
        <collapsible-panel>Content</collapsible-panel>
      </collapsible-root>
    `);
    await waitForUpdate();

    const root = getRoot(view);
    expect(root).toBeInTheDocument();
    expect(root).toHaveAttribute('data-base-ui-collapsible-root');
  });

  it('wires ARIA attributes and toggles open on trigger click', async () => {
    const view = render(html`
      <collapsible-root>
        <collapsible-trigger>Toggle</collapsible-trigger>
        <collapsible-panel>Content</collapsible-panel>
      </collapsible-root>
    `);
    await waitForUpdate();

    const trigger = getTrigger(view);
    const panel = getPanel(view);

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).not.toHaveAttribute('aria-controls');
    expect(panel).toHaveAttribute('hidden');

    trigger.click();
    await waitForUpdate();

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(trigger).toHaveAttribute('aria-controls', panel.id);
    expect(trigger).toHaveAttribute('data-panel-open');
    expect(panel).not.toHaveAttribute('hidden');
    expect(panel).toHaveAttribute('data-open');

    trigger.click();
    await waitForUpdate();

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).not.toHaveAttribute('aria-controls');
    expect(panel).toHaveAttribute('hidden');
  });

  it('supports controlled open state', async () => {
    const view = render(html``);

    function rerender(open: boolean) {
      renderTemplate(
        html`
          <collapsible-root .open=${open}>
            <collapsible-trigger>Toggle</collapsible-trigger>
            <collapsible-panel>Content</collapsible-panel>
          </collapsible-root>
        `,
        view,
      );
    }

    rerender(false);
    await waitForUpdate();

    expect(getTrigger(view)).toHaveAttribute('aria-expanded', 'false');
    expect(getPanel(view)).toHaveAttribute('hidden');

    rerender(true);
    await waitForUpdate();

    expect(getTrigger(view)).toHaveAttribute('aria-expanded', 'true');
    expect(getPanel(view)).not.toHaveAttribute('hidden');

    rerender(false);
    await waitForUpdate();

    expect(getTrigger(view)).toHaveAttribute('aria-expanded', 'false');
    expect(getPanel(view)).toHaveAttribute('hidden');
  });

  it('calls onOpenChange with Base UI-style event details', async () => {
    const handleOpenChange = vi.fn(
      (_open: boolean, details: CollapsibleChangeEventDetails) => details,
    );
    const view = render(html`
      <collapsible-root .onOpenChange=${handleOpenChange}>
        <collapsible-trigger>Toggle</collapsible-trigger>
        <collapsible-panel>Content</collapsible-panel>
      </collapsible-root>
    `);
    await waitForUpdate();

    getTrigger(view).click();
    await waitForUpdate();

    expect(handleOpenChange).toHaveBeenCalledTimes(1);
    expect(handleOpenChange.mock.calls[0]?.[0]).toBe(true);
    const details = handleOpenChange.mock.results[0]?.value as CollapsibleChangeEventDetails;
    expect(details.reason).toBe('trigger-press');
    expect(details.event).toBeInstanceOf(MouseEvent);
    expect(details.isCanceled).toBe(false);
    expect(details.isPropagationAllowed).toBe(false);
    expect(typeof details.cancel).toBe('function');
    expect(typeof details.allowPropagation).toBe('function');
  });

  it('supports cancellation in onOpenChange', async () => {
    const handleOpenChange = vi.fn((_open: boolean, details: CollapsibleChangeEventDetails) => {
      details.cancel();
    });
    const view = render(html`
      <collapsible-root .onOpenChange=${handleOpenChange}>
        <collapsible-trigger>Toggle</collapsible-trigger>
        <collapsible-panel>Content</collapsible-panel>
      </collapsible-root>
    `);
    await waitForUpdate();

    getTrigger(view).click();
    await waitForUpdate();

    expect(handleOpenChange).toHaveBeenCalledTimes(1);
    expect(getPanel(view)).toHaveAttribute('hidden');
    expect(getTrigger(view)).toHaveAttribute('aria-expanded', 'false');
  });

  it('applies disabled state and prevents toggle', async () => {
    const view = render(html`
      <collapsible-root .defaultOpen=${true} .disabled=${true}>
        <collapsible-trigger>Toggle</collapsible-trigger>
        <collapsible-panel>Content</collapsible-panel>
      </collapsible-root>
    `);
    await waitForUpdate();

    const root = getRoot(view);
    const trigger = getTrigger(view);
    const panel = getPanel(view);

    expect(root).toHaveAttribute('data-disabled');
    expect(trigger).toHaveAttribute('data-disabled');
    expect(trigger).toHaveAttribute('aria-disabled', 'true');
    expect(panel).toHaveAttribute('data-disabled');

    trigger.click();
    await waitForUpdate();

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(panel).toHaveAttribute('data-open');
  });

  it('blocks same-target click listeners when disabled', async () => {
    const handleClick = vi.fn();
    const view = render(html`
      <collapsible-root .disabled=${true}>
        <collapsible-trigger>Toggle</collapsible-trigger>
        <collapsible-panel>Content</collapsible-panel>
      </collapsible-root>
    `);
    await waitForUpdate();

    const trigger = getTrigger(view);
    trigger.addEventListener('click', handleClick);
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    expect(handleClick).not.toHaveBeenCalled();
  });

  it('supports keyboard activation with Enter and Space', async () => {
    const view = render(html`
      <collapsible-root>
        <collapsible-trigger>Toggle</collapsible-trigger>
        <collapsible-panel>Content</collapsible-panel>
      </collapsible-root>
    `);
    await waitForUpdate();

    const trigger = getTrigger(view);

    trigger.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter' }),
    );
    await waitForUpdate();
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    trigger.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: ' ' }),
    );
    await waitForUpdate();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('keeps panel mounted when keepMounted is set', async () => {
    const view = render(html`
      <collapsible-root>
        <collapsible-trigger>Toggle</collapsible-trigger>
        <collapsible-panel .keepMounted=${true}>Content</collapsible-panel>
      </collapsible-root>
    `);
    await waitForUpdate();

    const trigger = getTrigger(view);
    const panel = getPanel(view);

    expect(panel).toBeInTheDocument();
    expect(panel).toHaveAttribute('hidden');
    expect(panel).toHaveAttribute('data-closed');

    trigger.click();
    await waitForUpdate();
    expect(panel).not.toHaveAttribute('hidden');
    expect(panel).toHaveAttribute('data-open');

    trigger.click();
    await waitForUpdate();
    expect(panel).toBeInTheDocument();
    expect(panel).toHaveAttribute('hidden');
    expect(panel).toHaveAttribute('data-closed');
  });

  it('supports hiddenUntilFound', async () => {
    const view = render(html`
      <collapsible-root>
        <collapsible-trigger>Toggle</collapsible-trigger>
        <collapsible-panel .hiddenUntilFound=${true}>Content</collapsible-panel>
      </collapsible-root>
    `);
    await waitForUpdate();

    const panel = getPanel(view);
    expect(panel).toHaveAttribute('hidden', 'until-found');
  });

  it('opens on beforematch event with hiddenUntilFound', async () => {
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    const handleOpenChange = vi.fn();
    const view = render(html`
      <collapsible-root .onOpenChange=${handleOpenChange}>
        <collapsible-trigger>Toggle</collapsible-trigger>
        <collapsible-panel .hiddenUntilFound=${true}>Content</collapsible-panel>
      </collapsible-root>
    `);
    await waitForUpdate();

    const panel = getPanel(view);
    panel.dispatchEvent(new Event('beforematch'));
    await waitForUpdate();

    expect(handleOpenChange).toHaveBeenCalledTimes(1);
    expect(handleOpenChange.mock.calls[0]?.[0]).toBe(true);
    expect(getPanel(view)).not.toHaveAttribute('hidden');
  });

  it('wires aria-controls with panel id', async () => {
    const view = render(html`
      <collapsible-root .defaultOpen=${true}>
        <collapsible-trigger>Toggle</collapsible-trigger>
        <collapsible-panel id="my-panel">Content</collapsible-panel>
      </collapsible-root>
    `);
    await waitForUpdate();

    const trigger = getTrigger(view);
    expect(trigger).toHaveAttribute('aria-controls', 'my-panel');
    expect(getPanel(view)).toHaveAttribute('id', 'my-panel');
  });

  it('logs error when parts are used outside root', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(html`<collapsible-trigger>Orphan</collapsible-trigger>`);
    render(html`<collapsible-panel>Orphan panel</collapsible-panel>`);

    expect(errorSpy).toHaveBeenCalledTimes(2);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Collapsible parts must be placed within'),
    );

    errorSpy.mockRestore();
  });

  it('starts closed by default and opens with defaultOpen', async () => {
    {
      const view = render(html`
        <collapsible-root>
          <collapsible-trigger>Toggle</collapsible-trigger>
          <collapsible-panel>Content</collapsible-panel>
        </collapsible-root>
      `);
      await waitForUpdate();

      expect(getRoot(view)).toHaveAttribute('data-closed');
    }

    {
      const view = render(html`
        <collapsible-root .defaultOpen=${true}>
          <collapsible-trigger>Toggle</collapsible-trigger>
          <collapsible-panel>Content</collapsible-panel>
        </collapsible-root>
      `);
      await waitForUpdate();

      expect(getRoot(view)).toHaveAttribute('data-open');
      expect(getPanel(view)).not.toHaveAttribute('hidden');
    }
  });
});
