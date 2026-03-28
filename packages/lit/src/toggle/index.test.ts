import { html, nothing, render as renderTemplate, type TemplateResult } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import * as toggleModule from './index';

describe('toggle-root', () => {
  const containers = new Set<HTMLDivElement>();

  afterEach(() => {
    containers.forEach((container) => {
      renderTemplate(nothing, container);
      container.remove();
    });
    containers.clear();
  });

  function render(result: TemplateResult) {
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
    expect(customElements.get('toggle-root')).toBe(toggleModule.ToggleRootElement);
    expectTypeOf<
      import('./index').ToggleRootProps
    >().toEqualTypeOf<toggleModule.ToggleRoot.Props>();
    expectTypeOf<
      import('./index').ToggleRootState
    >().toEqualTypeOf<toggleModule.ToggleRoot.State>();
    expectTypeOf<
      import('./index').ToggleRootChangeEventDetails
    >().toEqualTypeOf<toggleModule.ToggleRoot.ChangeEventDetails>();
    expectTypeOf<import('./index').ToggleProps>().toEqualTypeOf<toggleModule.Toggle.Props>();
    expectTypeOf<import('./index').ToggleState>().toEqualTypeOf<toggleModule.Toggle.State>();
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
    const toggle = view.querySelector('toggle-root')! as toggleModule.ToggleRootElement;
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
    const toggle = view.querySelector('toggle-root')! as toggleModule.ToggleRootElement;
    await waitForUpdate();

    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(toggle).toHaveAttribute('data-pressed');
  });

  it('supports controlled pressed state', async () => {
    const view = render(html`<toggle-root .pressed=${true}></toggle-root>`);
    const toggle = view.querySelector('toggle-root')! as toggleModule.ToggleRootElement;
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
    const toggle = view.querySelector('toggle-root')! as toggleModule.ToggleRootElement;
    await waitForUpdate();

    toggle.click();

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith(
      true,
      expect.objectContaining({
        reason: 'none',
        event: expect.any(Event),
        trigger: toggle,
        isPropagationAllowed: false,
      }),
    );
  });

  it('does not change state when onPressedChange cancels the update', async () => {
    const handleChange = vi.fn((_: boolean, details: toggleModule.ToggleRootChangeEventDetails) => {
      details.cancel();
    });
    const view = render(html`<toggle-root .onPressedChange=${handleChange}></toggle-root>`);
    const toggle = view.querySelector('toggle-root')! as toggleModule.ToggleRootElement;
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
    const toggle = view.querySelector('toggle-root')! as toggleModule.ToggleRootElement;
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
    const toggle = view.querySelector('toggle-root')! as toggleModule.ToggleRootElement;
    await waitForUpdate();

    toggle.addEventListener('click', handleClick);
    toggle.click();

    expect(handleClick).not.toHaveBeenCalled();
  });

  it('handles Enter key to toggle', async () => {
    const view = render(html`<toggle-root></toggle-root>`);
    const toggle = view.querySelector('toggle-root')! as toggleModule.ToggleRootElement;
    await waitForUpdate();

    toggle.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter' }),
    );
    await waitForUpdate();

    expect(toggle).toHaveAttribute('aria-pressed', 'true');
  });

  it('handles Space key to toggle', async () => {
    const view = render(html`<toggle-root></toggle-root>`);
    const toggle = view.querySelector('toggle-root')! as toggleModule.ToggleRootElement;
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
    const toggle = view.querySelector('toggle-root')! as toggleModule.ToggleRootElement;
    await waitForUpdate();
    expect(toggle.tabIndex).toBe(0);
  });

  it('not focusable when disabled', async () => {
    const view = render(html`<toggle-root disabled></toggle-root>`);
    const toggle = view.querySelector('toggle-root')! as toggleModule.ToggleRootElement;
    await waitForUpdate();
    expect(toggle.tabIndex).toBe(-1);
  });

  it('updates when pressed property changes externally', async () => {
    const view = render(html`<toggle-root .pressed=${false}></toggle-root>`);
    const toggle = view.querySelector('toggle-root')! as toggleModule.ToggleRootElement;
    await waitForUpdate();

    expect(toggle).toHaveAttribute('aria-pressed', 'false');

    renderTemplate(html`<toggle-root .pressed=${true}></toggle-root>`, view);
    await waitForUpdate();

    const updatedToggle = view.querySelector('toggle-root')! as toggleModule.ToggleRootElement;
    expect(updatedToggle).toHaveAttribute('aria-pressed', 'true');
  });

  it('toggle helper supports uncontrolled pressed state', async () => {
    const view = render(toggleModule.Toggle({ defaultPressed: false }));
    const toggle = view.querySelector('button') as HTMLButtonElement;
    await waitForUpdate();

    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    toggle.click();
    await waitForUpdate();
    expect(toggle).toHaveAttribute('aria-pressed', 'true');

    toggle.click();
    await waitForUpdate();
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
  });

  it('toggle helper supports controlled pressed state', async () => {
    const view = render(toggleModule.Toggle({ pressed: false }));
    const toggle = view.querySelector('button') as HTMLButtonElement;
    await waitForUpdate();

    expect(toggle).toHaveAttribute('aria-pressed', 'false');

    renderTemplate(toggleModule.Toggle({ pressed: true }), view);
    await waitForUpdate();

    expect(toggle).toHaveAttribute('aria-pressed', 'true');
  });

  it('toggle helper calls onPressedChange when the pressed state changes', async () => {
    const handlePressed = vi.fn();
    const view = render(
      toggleModule.Toggle({
        defaultPressed: false,
        onPressedChange: handlePressed,
      }),
    );
    const toggle = view.querySelector('button') as HTMLButtonElement;
    await waitForUpdate();

    toggle.click();

    expect(handlePressed).toHaveBeenCalledTimes(1);
    expect(handlePressed.mock.calls[0]?.[0]).toBe(true);
  });

  it('toggle helper disables the component', async () => {
    const handlePressed = vi.fn();
    const view = render(
      toggleModule.Toggle({
        disabled: true,
        onPressedChange: handlePressed,
      }),
    );
    const toggle = view.querySelector('button') as HTMLButtonElement;
    await waitForUpdate();

    expect(toggle).toHaveAttribute('disabled');
    expect(toggle).toHaveAttribute('data-disabled');
    expect(toggle).toHaveAttribute('aria-pressed', 'false');

    toggle.click();

    expect(handlePressed).not.toHaveBeenCalled();
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
  });

  it('toggle helper render callback receives composite props in a toggle group', async () => {
    const renderSpy = vi.fn();

    render(html`
      <toggle-group-root .defaultValue=${['left']}>
        ${toggleModule.Toggle({
          value: 'left',
          render: (props) => {
            renderSpy(props);
            return html`<button type="button"></button>`;
          },
        })}
      </toggle-group-root>
    `);
    await waitForUpdate();

    expect(renderSpy.mock.lastCall?.[0]).toHaveProperty('tabIndex', 0);
  });
});
