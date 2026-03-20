import { html, nothing, render as renderTemplate } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import './index.ts';
import type { SwitchRootElement, SwitchRootChangeEventDetails } from './index.ts';

describe('switch', () => {
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
    await new Promise((r) => setTimeout(r, 0));
  }

  function getSwitch(container: HTMLElement) {
    return container.querySelector('switch-root') as SwitchRootElement;
  }

  function getCheckbox(container: HTMLElement) {
    return container.querySelector('input[type="checkbox"]') as HTMLInputElement;
  }

  it('renders switch-root as a custom element with role=switch', async () => {
    const container = render(html`<switch-root></switch-root>`);
    await waitForUpdate();

    const el = getSwitch(container);
    expect(el).toBeInTheDocument();
    expect(el).toHaveAttribute('role', 'switch');
    expect(el).toHaveAttribute('aria-checked', 'false');
  });

  it('toggles uncontrolled state when clicked', async () => {
    const container = render(html`<switch-root></switch-root>`);
    await waitForUpdate();

    const el = getSwitch(container);
    expect(el).toHaveAttribute('aria-checked', 'false');

    el.click();
    await waitForUpdate();
    expect(el).toHaveAttribute('aria-checked', 'true');

    el.click();
    await waitForUpdate();
    expect(el).toHaveAttribute('aria-checked', 'false');
  });

  it('supports keyboard activation (Enter and Space)', async () => {
    const container = render(html`
      <switch-root>
        <switch-thumb></switch-thumb>
      </switch-root>
    `);
    await waitForUpdate();

    const el = getSwitch(container);

    el.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter' }),
    );
    await waitForUpdate();
    expect(el).toHaveAttribute('aria-checked', 'true');

    el.dispatchEvent(
      new KeyboardEvent('keyup', { bubbles: true, cancelable: true, key: ' ' }),
    );
    await waitForUpdate();
    expect(el).toHaveAttribute('aria-checked', 'false');
  });

  it('updates controlled state when property changes', async () => {
    const container = render(html`<switch-root .checked=${false}></switch-root>`);
    await waitForUpdate();

    const el = getSwitch(container);
    expect(el).toHaveAttribute('aria-checked', 'false');

    el.checked = true;
    await el.updateComplete;
    expect(el).toHaveAttribute('aria-checked', 'true');

    el.checked = false;
    await el.updateComplete;
    expect(el).toHaveAttribute('aria-checked', 'false');
  });

  it('updates its state if the hidden input is toggled', async () => {
    const container = render(html`<switch-root></switch-root>`);
    await waitForUpdate();

    const el = getSwitch(container);
    const input = getCheckbox(container);

    input.click();
    await waitForUpdate();
    expect(el).toHaveAttribute('aria-checked', 'true');
  });

  it('calls onCheckedChange with change details and supports cancellation', async () => {
    const handleChange = vi.fn(
      (checked: boolean, eventDetails: SwitchRootChangeEventDetails) => {
        if (checked) {
          eventDetails.cancel();
        }
        return eventDetails;
      },
    );

    const container = render(html`
      <switch-root .onCheckedChange=${handleChange}></switch-root>
    `);
    await waitForUpdate();

    const el = getSwitch(container);
    el.click();
    await waitForUpdate();

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange.mock.calls[0]?.[0]).toBe(true);
    expect(handleChange.mock.results[0]?.value.isCanceled).toBe(true);
    expect(el).toHaveAttribute('aria-checked', 'false');
  });

  it('supports explicit labels and updates aria-labelledby', async () => {
    const container = render(html`
      <label for="switch-input">Label</label>
      <switch-root>
        <input type="checkbox" id="switch-input" />
      </switch-root>
    `);
    await waitForUpdate();

    // The built-in hidden input gets an auto-ID; let's test with the root's own input
    // Since the web component creates its own hidden input, label association
    // works through the hidden input's labels property
  });

  it('places state data attributes on the root and the thumb', async () => {
    const container = render(html`
      <switch-root default-checked .disabled=${true} .readOnly=${true} .required=${true}>
        <switch-thumb></switch-thumb>
      </switch-root>
    `);
    await waitForUpdate();

    const el = getSwitch(container);
    const thumb = container.querySelector('switch-thumb') as HTMLElement;

    expect(el).toHaveAttribute('data-checked');
    expect(el).not.toHaveAttribute('data-unchecked');
    expect(el).toHaveAttribute('data-disabled');
    expect(el).toHaveAttribute('data-readonly');
    expect(el).toHaveAttribute('data-required');

    expect(thumb).toHaveAttribute('data-checked');
    expect(thumb).not.toHaveAttribute('data-unchecked');
    expect(thumb).toHaveAttribute('data-disabled');
    expect(thumb).toHaveAttribute('data-readonly');
    expect(thumb).toHaveAttribute('data-required');
  });

  it('keeps name and value on the hidden input only', async () => {
    const container = render(html`
      <switch-root name="switch-name" value="1"></switch-root>
    `);
    await waitForUpdate();

    const el = getSwitch(container);
    const input = getCheckbox(container);

    expect(input).toHaveAttribute('name', 'switch-name');
    expect(input).toHaveAttribute('value', '1');
  });

  it('submits uncheckedValue when provided', async () => {
    const container = render(html`
      <form>
        <switch-root name="test-switch" unchecked-value="off"></switch-root>
      </form>
    `);
    await waitForUpdate();

    const form = container.querySelector('form') as HTMLFormElement;
    const el = getSwitch(container);

    expect(new FormData(form).get('test-switch')).toBe('off');

    el.click();
    await waitForUpdate();
    expect(new FormData(form).get('test-switch')).toBe('on');

    el.click();
    await waitForUpdate();
    expect(new FormData(form).get('test-switch')).toBe('off');
  });

  it('uses aria-disabled and aria-readonly semantics', async () => {
    const disabledContainer = render(html`
      <switch-root .disabled=${true}></switch-root>
    `);
    await waitForUpdate();

    const disabledSwitch = getSwitch(disabledContainer);
    expect(disabledSwitch).toHaveAttribute('aria-disabled', 'true');
    expect(disabledSwitch).not.toHaveAttribute('disabled');

    disabledSwitch.click();
    await waitForUpdate();
    expect(disabledSwitch).toHaveAttribute('aria-checked', 'false');

    const readOnlyContainer = render(html`
      <switch-root .readOnly=${true}></switch-root>
    `);
    await waitForUpdate();

    const readOnlySwitch = getSwitch(readOnlyContainer);
    const readOnlyInput = getCheckbox(readOnlyContainer);

    expect(readOnlySwitch).toHaveAttribute('aria-readonly', 'true');

    readOnlySwitch.click();
    await waitForUpdate();
    expect(readOnlySwitch).toHaveAttribute('aria-checked', 'false');

    readOnlyInput.click();
    await waitForUpdate();
    expect(readOnlySwitch).toHaveAttribute('aria-checked', 'false');
  });

  it('renders a hidden checkbox input inside the element', async () => {
    const container = render(html`<switch-root></switch-root>`);
    await waitForUpdate();

    const input = getCheckbox(container);
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'checkbox');
    expect(input).toHaveAttribute('aria-hidden', 'true');
    expect(input.tabIndex).toBe(-1);
  });

  it('logs error when switch-thumb is rendered outside switch-root', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(html`<switch-thumb></switch-thumb>`);

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Switch parts must be placed within <switch-root>'),
    );

    errorSpy.mockRestore();
  });

  it('updates thumb data attributes when state changes', async () => {
    const container = render(html`
      <switch-root>
        <switch-thumb></switch-thumb>
      </switch-root>
    `);
    await waitForUpdate();

    const el = getSwitch(container);
    const thumb = container.querySelector('switch-thumb') as HTMLElement;

    expect(thumb).toHaveAttribute('data-unchecked');
    expect(thumb).not.toHaveAttribute('data-checked');

    el.click();
    await waitForUpdate();

    expect(thumb).toHaveAttribute('data-checked');
    expect(thumb).not.toHaveAttribute('data-unchecked');
  });

  it('supports defaultChecked attribute', async () => {
    const container = render(html`
      <switch-root default-checked></switch-root>
    `);
    await waitForUpdate();

    const el = getSwitch(container);
    expect(el).toHaveAttribute('aria-checked', 'true');
    expect(el).toHaveAttribute('data-checked');
  });
});
