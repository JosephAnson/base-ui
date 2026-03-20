import { html, nothing, render as renderTemplate } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import './index.ts';
import type { ToggleRootElement } from './index.ts';

describe('toggle-root', () => {
  const containers = new Set<HTMLDivElement>();

  afterEach(() => {
    containers.forEach((container) => {
      renderTemplate(nothing, container);
      container.remove();
    });
    containers.clear();
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

  it('renders as a custom element in the DOM', () => {
    const container = render(html`<toggle-root>Toggle</toggle-root>`);
    const toggle = container.querySelector('toggle-root');
    expect(toggle).toBeInTheDocument();
    expect(toggle?.textContent).toBe('Toggle');
  });

  it('has role="button" and aria-pressed="false" by default', async () => {
    const container = render(html`<toggle-root></toggle-root>`);
    const toggle = container.querySelector('toggle-root')!;
    await waitForUpdate();
    expect(toggle).toHaveAttribute('role', 'button');
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
  });

  it('toggles uncontrolled state when clicked', async () => {
    const container = render(html`<toggle-root></toggle-root>`);
    const toggle = container.querySelector('toggle-root')! as ToggleRootElement;
    await waitForUpdate();

    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(toggle).not.toHaveAttribute('data-pressed');

    toggle.click();
    await waitForUpdate();

    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(toggle).toHaveAttribute('data-pressed');

    toggle.click();
    await waitForUpdate();

    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(toggle).not.toHaveAttribute('data-pressed');
  });

  it('respects defaultPressed', async () => {
    const container = render(html`<toggle-root default-pressed></toggle-root>`);
    const toggle = container.querySelector('toggle-root')! as ToggleRootElement;
    await waitForUpdate();

    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(toggle).toHaveAttribute('data-pressed');
  });

  it('supports controlled pressed state', async () => {
    const container = render(html`<toggle-root .pressed=${true}></toggle-root>`);
    const toggle = container.querySelector('toggle-root')! as ToggleRootElement;
    await waitForUpdate();

    expect(toggle).toHaveAttribute('aria-pressed', 'true');

    // Clicking in controlled mode does not change state unless parent re-renders
    toggle.click();
    await waitForUpdate();
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
  });

  it('calls onPressedChange callback', async () => {
    const handleChange = vi.fn();
    const container = render(
      html`<toggle-root .onPressedChange=${handleChange}></toggle-root>`,
    );
    const toggle = container.querySelector('toggle-root')! as ToggleRootElement;
    await waitForUpdate();

    toggle.click();

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith(true, expect.any(Event));
  });

  it('does not toggle when disabled', async () => {
    const handleChange = vi.fn();
    const container = render(
      html`<toggle-root disabled .onPressedChange=${handleChange}></toggle-root>`,
    );
    const toggle = container.querySelector('toggle-root')! as ToggleRootElement;
    await waitForUpdate();

    expect(toggle).toHaveAttribute('data-disabled');

    toggle.click();
    await waitForUpdate();

    expect(handleChange).not.toHaveBeenCalled();
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
  });

  it('handles Enter key to toggle', async () => {
    const container = render(html`<toggle-root></toggle-root>`);
    const toggle = container.querySelector('toggle-root')! as ToggleRootElement;
    await waitForUpdate();

    toggle.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter' }),
    );
    await waitForUpdate();

    expect(toggle).toHaveAttribute('aria-pressed', 'true');
  });

  it('handles Space key to toggle', async () => {
    const container = render(html`<toggle-root></toggle-root>`);
    const toggle = container.querySelector('toggle-root')! as ToggleRootElement;
    await waitForUpdate();

    toggle.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: ' ' }),
    );
    toggle.dispatchEvent(
      new KeyboardEvent('keyup', { bubbles: true, cancelable: true, key: ' ' }),
    );
    await waitForUpdate();

    expect(toggle).toHaveAttribute('aria-pressed', 'true');
  });

  it('is focusable via tabindex', async () => {
    const container = render(html`<toggle-root></toggle-root>`);
    const toggle = container.querySelector('toggle-root')! as ToggleRootElement;
    await waitForUpdate();
    expect(toggle.tabIndex).toBe(0);
  });

  it('not focusable when disabled', async () => {
    const container = render(html`<toggle-root disabled></toggle-root>`);
    const toggle = container.querySelector('toggle-root')! as ToggleRootElement;
    await waitForUpdate();
    expect(toggle.tabIndex).toBe(-1);
  });

  it('updates when pressed property changes externally', async () => {
    const container = render(html`<toggle-root .pressed=${false}></toggle-root>`);
    const toggle = container.querySelector('toggle-root')! as ToggleRootElement;
    await waitForUpdate();

    expect(toggle).toHaveAttribute('aria-pressed', 'false');

    renderTemplate(html`<toggle-root .pressed=${true}></toggle-root>`, container);
    await waitForUpdate();

    const updatedToggle = container.querySelector('toggle-root')! as ToggleRootElement;
    expect(updatedToggle).toHaveAttribute('aria-pressed', 'true');
  });
});
