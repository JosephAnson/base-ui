import { html, nothing, render as renderTemplate } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import './index';
import type {
  ToggleRoot,
  ToggleRootChangeEventDetails,
  ToggleRootElement,
  ToggleRootProps,
  ToggleRootState,
} from './index';

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
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });
  }

  it('exposes namespace aliases for props, state, and change event details', () => {
    expectTypeOf<ToggleRootProps>().toEqualTypeOf<ToggleRoot.Props>();
    expectTypeOf<ToggleRootState>().toEqualTypeOf<ToggleRoot.State>();
    expectTypeOf<ToggleRootChangeEventDetails>().toEqualTypeOf<ToggleRoot.ChangeEventDetails>();
  });

  it('renders as a custom element in the DOM', () => {
    const view = render(html`<toggle-root>Toggle</toggle-root>`);
    const toggle = view.querySelector('toggle-root');
    expect(toggle).toBeInTheDocument();
    expect(toggle?.textContent).toBe('Toggle');
  });

  it('has role="button" and aria-pressed="false" by default', async () => {
    const view = render(html`<toggle-root></toggle-root>`);
    const toggle = view.querySelector('toggle-root')!;
    await waitForUpdate();
    expect(toggle).toHaveAttribute('role', 'button');
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
  });

  it('toggles uncontrolled state when clicked', async () => {
    const view = render(html`<toggle-root></toggle-root>`);
    const toggle = view.querySelector('toggle-root')! as ToggleRootElement;
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
    const view = render(html`<toggle-root default-pressed></toggle-root>`);
    const toggle = view.querySelector('toggle-root')! as ToggleRootElement;
    await waitForUpdate();

    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(toggle).toHaveAttribute('data-pressed');
  });

  it('supports controlled pressed state', async () => {
    const view = render(html`<toggle-root .pressed=${true}></toggle-root>`);
    const toggle = view.querySelector('toggle-root')! as ToggleRootElement;
    await waitForUpdate();

    expect(toggle).toHaveAttribute('aria-pressed', 'true');

    // Clicking in controlled mode does not change state unless parent re-renders
    toggle.click();
    await waitForUpdate();
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
  });

  it('calls onPressedChange callback', async () => {
    const handleChange = vi.fn();
    const view = render(html`<toggle-root .onPressedChange=${handleChange}></toggle-root>`);
    const toggle = view.querySelector('toggle-root')! as ToggleRootElement;
    await waitForUpdate();

    toggle.click();

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith(
      true,
      expect.objectContaining({ reason: 'none', event: expect.any(Event) }),
    );
  });

  it('does not change state when onPressedChange cancels the update', async () => {
    const handleChange = vi.fn((_: boolean, details: ToggleRootChangeEventDetails) => {
      details.cancel();
    });
    const view = render(html`<toggle-root .onPressedChange=${handleChange}></toggle-root>`);
    const toggle = view.querySelector('toggle-root')! as ToggleRootElement;
    await waitForUpdate();

    toggle.click();
    await waitForUpdate();

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(toggle).not.toHaveAttribute('data-pressed');
  });

  it('does not toggle when disabled', async () => {
    const handleChange = vi.fn();
    const view = render(
      html`<toggle-root disabled .onPressedChange=${handleChange}></toggle-root>`,
    );
    const toggle = view.querySelector('toggle-root')! as ToggleRootElement;
    await waitForUpdate();

    expect(toggle).toHaveAttribute('data-disabled');

    toggle.click();
    await waitForUpdate();

    expect(handleChange).not.toHaveBeenCalled();
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
  });

  it('blocks same-target click listeners when disabled', async () => {
    const handleClick = vi.fn();
    const view = render(html`<toggle-root disabled></toggle-root>`);
    const toggle = view.querySelector('toggle-root')! as ToggleRootElement;
    await waitForUpdate();

    toggle.addEventListener('click', handleClick);
    toggle.click();

    expect(handleClick).not.toHaveBeenCalled();
  });

  it('handles Enter key to toggle', async () => {
    const view = render(html`<toggle-root></toggle-root>`);
    const toggle = view.querySelector('toggle-root')! as ToggleRootElement;
    await waitForUpdate();

    toggle.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter' }),
    );
    await waitForUpdate();

    expect(toggle).toHaveAttribute('aria-pressed', 'true');
  });

  it('handles Space key to toggle', async () => {
    const view = render(html`<toggle-root></toggle-root>`);
    const toggle = view.querySelector('toggle-root')! as ToggleRootElement;
    await waitForUpdate();

    toggle.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: ' ' }),
    );
    toggle.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, cancelable: true, key: ' ' }));
    await waitForUpdate();

    expect(toggle).toHaveAttribute('aria-pressed', 'true');
  });

  it('is focusable via tabindex', async () => {
    const view = render(html`<toggle-root></toggle-root>`);
    const toggle = view.querySelector('toggle-root')! as ToggleRootElement;
    await waitForUpdate();
    expect(toggle.tabIndex).toBe(0);
  });

  it('not focusable when disabled', async () => {
    const view = render(html`<toggle-root disabled></toggle-root>`);
    const toggle = view.querySelector('toggle-root')! as ToggleRootElement;
    await waitForUpdate();
    expect(toggle.tabIndex).toBe(-1);
  });

  it('updates when pressed property changes externally', async () => {
    const view = render(html`<toggle-root .pressed=${false}></toggle-root>`);
    const toggle = view.querySelector('toggle-root')! as ToggleRootElement;
    await waitForUpdate();

    expect(toggle).toHaveAttribute('aria-pressed', 'false');

    renderTemplate(html`<toggle-root .pressed=${true}></toggle-root>`, view);
    await waitForUpdate();

    const updatedToggle = view.querySelector('toggle-root')! as ToggleRootElement;
    expect(updatedToggle).toHaveAttribute('aria-pressed', 'true');
  });
});
