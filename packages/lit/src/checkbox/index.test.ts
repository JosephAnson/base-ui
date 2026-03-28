import { html, nothing, render as renderTemplate } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import {
  Checkbox,
  CheckboxIndicator,
  CheckboxIndicatorElement,
  CheckboxRoot,
  type CheckboxIndicatorHelperProps,
  type CheckboxIndicatorState,
  type CheckboxRootChangeEventDetails,
  CheckboxRootElement,
  type CheckboxRootProps,
  type CheckboxRootState,
} from './index.ts';
import './index.ts';

describe('checkbox', () => {
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

  function getCheckbox(container: HTMLElement) {
    return container.querySelector('checkbox-root') as CheckboxRootElement;
  }

  function getHiddenInput(container: HTMLElement) {
    return container.querySelector('input[type="checkbox"]') as HTMLInputElement;
  }

  it('exposes the checkbox runtime export and namespace aliases', () => {
    expect(typeof Checkbox.Root).toBe('function');
    expect(typeof Checkbox.Indicator).toBe('function');
    expect(customElements.get('checkbox-root')).toBe(CheckboxRootElement);
    expect(customElements.get('checkbox-indicator')).toBe(CheckboxIndicatorElement);
    expectTypeOf<CheckboxRoot.Props>().toEqualTypeOf<CheckboxRootProps>();
    expectTypeOf<CheckboxRoot.State>().toEqualTypeOf<CheckboxRootState>();
    expectTypeOf<CheckboxRoot.ChangeEventDetails>().toEqualTypeOf<CheckboxRootChangeEventDetails>();
    expectTypeOf<CheckboxIndicator.Props>().toEqualTypeOf<CheckboxIndicatorHelperProps>();
    expectTypeOf<CheckboxIndicator.State>().toEqualTypeOf<CheckboxIndicatorState>();
  });

  it('renders the helper root and indicator APIs', async () => {
    const container = render(
      html`${Checkbox.Root({
        children: Checkbox.Indicator({ keepMounted: true }),
      })}`,
    );
    await waitForUpdate();

    const root = container.querySelector('[data-base-ui-checkbox-control]') as HTMLElement;
    const indicator = root.querySelector('[data-base-ui-checkbox-indicator]') as HTMLElement;

    expect(root.tagName).toBe('SPAN');
    expect(root).toHaveAttribute('role', 'checkbox');
    expect(root).toHaveAttribute('aria-checked', 'false');
    expect(indicator).toHaveAttribute('data-unchecked');
  });

  it('supports a native button helper checkbox with a sibling label', async () => {
    const container = render(html`
      <div>
        <label for="notifications-checkbox">Enable notifications</label>
        ${Checkbox.Root({
          id: 'notifications-checkbox',
          nativeButton: true,
          render: html`<button data-testid="checkbox"></button>`,
          children: Checkbox.Indicator({ keepMounted: true }),
        })}
      </div>
    `);
    await waitForUpdate();

    const checkbox = container.querySelector('[data-testid="checkbox"]') as HTMLButtonElement;

    expect(checkbox).toHaveAttribute('id', 'notifications-checkbox');
    expect(checkbox).toHaveAttribute('aria-checked', 'false');

    (container.querySelector('label') as HTMLLabelElement).click();
    await waitForUpdate();

    expect(checkbox).toHaveAttribute('aria-checked', 'true');
  });

  it('renders checkbox-root as a custom element with role=checkbox', async () => {
    const container = render(html`<checkbox-root></checkbox-root>`);
    await waitForUpdate();

    const el = getCheckbox(container);
    expect(el).toBeInTheDocument();
    expect(el).toHaveAttribute('role', 'checkbox');
    expect(el).toHaveAttribute('aria-checked', 'false');
  });

  it('toggles uncontrolled state when clicked', async () => {
    const container = render(html`<checkbox-root></checkbox-root>`);
    await waitForUpdate();

    const el = getCheckbox(container);
    expect(el).toHaveAttribute('aria-checked', 'false');
    expect(el).toHaveAttribute('data-unchecked');

    el.click();
    await waitForUpdate();
    expect(el).toHaveAttribute('aria-checked', 'true');
    expect(el).toHaveAttribute('data-checked');

    el.click();
    await waitForUpdate();
    expect(el).toHaveAttribute('aria-checked', 'false');
    expect(el).toHaveAttribute('data-unchecked');
  });

  it('supports keyboard activation (Enter and Space)', async () => {
    const container = render(html`
      <checkbox-root>
        <checkbox-indicator>✓</checkbox-indicator>
      </checkbox-root>
    `);
    await waitForUpdate();

    const el = getCheckbox(container);

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
    const container = render(html`<checkbox-root .checked=${false}></checkbox-root>`);
    await waitForUpdate();

    const el = getCheckbox(container);
    expect(el).toHaveAttribute('aria-checked', 'false');

    el.checked = true;
    await el.updateComplete;
    expect(el).toHaveAttribute('aria-checked', 'true');

    el.checked = false;
    await el.updateComplete;
    expect(el).toHaveAttribute('aria-checked', 'false');
  });

  it('updates its state if the hidden input is toggled', async () => {
    const container = render(html`<checkbox-root></checkbox-root>`);
    await waitForUpdate();

    const el = getCheckbox(container);
    const input = getHiddenInput(container);

    input.click();
    await waitForUpdate();
    expect(el).toHaveAttribute('aria-checked', 'true');
  });

  it('calls onCheckedChange with change details and supports cancellation', async () => {
    const handleChange = vi.fn(
      (checked: boolean, eventDetails: CheckboxRootChangeEventDetails) => {
        if (checked) {
          eventDetails.cancel();
        }
        return eventDetails;
      },
    );

    const container = render(html`
      <checkbox-root .onCheckedChange=${handleChange}></checkbox-root>
    `);
    await waitForUpdate();

    const el = getCheckbox(container);
    el.click();
    await waitForUpdate();

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange.mock.calls[0]?.[0]).toBe(true);
    expect(handleChange.mock.results[0]?.value.isCanceled).toBe(true);
    expect(el).toHaveAttribute('aria-checked', 'false');
  });

  it('snaps a controlled checkbox back to controlled state after user activation', async () => {
    const handleChange = vi.fn();
    const container = render(html`
      <checkbox-root .checked=${false} .onCheckedChange=${handleChange}></checkbox-root>
    `);
    await waitForUpdate();

    const el = getCheckbox(container);
    const input = getHiddenInput(container);

    el.click();
    await waitForUpdate();

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange.mock.calls[0]?.[0]).toBe(true);
    expect(el).toHaveAttribute('aria-checked', 'false');
    expect(input.checked).toBe(false);
  });

  it('places state data attributes on the root and the indicator', async () => {
    const container = render(html`
      <checkbox-root default-checked .disabled=${true} .readOnly=${true} .required=${true}>
        <checkbox-indicator keep-mounted>✓</checkbox-indicator>
      </checkbox-root>
    `);
    await waitForUpdate();

    const el = getCheckbox(container);
    const indicator = container.querySelector('checkbox-indicator') as HTMLElement;

    expect(el).toHaveAttribute('data-checked');
    expect(el).not.toHaveAttribute('data-unchecked');
    expect(el).toHaveAttribute('data-disabled');
    expect(el).toHaveAttribute('data-readonly');
    expect(el).toHaveAttribute('data-required');

    expect(indicator).toHaveAttribute('data-checked');
    expect(indicator).not.toHaveAttribute('data-unchecked');
    expect(indicator).toHaveAttribute('data-disabled');
    expect(indicator).toHaveAttribute('data-readonly');
    expect(indicator).toHaveAttribute('data-required');
  });

  it('keeps name and value on the hidden input only', async () => {
    const container = render(html`
      <checkbox-root name="checkbox-name" value="1"></checkbox-root>
    `);
    await waitForUpdate();

    const input = getHiddenInput(container);

    expect(input).toHaveAttribute('name', 'checkbox-name');
    expect(input).toHaveAttribute('value', '1');
  });

  it('submits uncheckedValue when provided', async () => {
    const container = render(html`
      <form>
        <checkbox-root name="test-checkbox" unchecked-value="off"></checkbox-root>
      </form>
    `);
    await waitForUpdate();

    const form = container.querySelector('form') as HTMLFormElement;
    const el = getCheckbox(container);

    expect(new FormData(form).get('test-checkbox')).toBe('off');

    el.click();
    await waitForUpdate();
    expect(new FormData(form).get('test-checkbox')).toBe('on');

    el.click();
    await waitForUpdate();
    expect(new FormData(form).get('test-checkbox')).toBe('off');
  });

  it('uses aria-disabled and aria-readonly semantics', async () => {
    const disabledContainer = render(html`
      <checkbox-root .disabled=${true}></checkbox-root>
    `);
    await waitForUpdate();

    const disabledCheckbox = getCheckbox(disabledContainer);
    expect(disabledCheckbox).toHaveAttribute('aria-disabled', 'true');
    expect(disabledCheckbox).not.toHaveAttribute('disabled');

    disabledCheckbox.click();
    await waitForUpdate();
    expect(disabledCheckbox).toHaveAttribute('aria-checked', 'false');

    const readOnlyContainer = render(html`
      <checkbox-root .readOnly=${true}></checkbox-root>
    `);
    await waitForUpdate();

    const readOnlyCheckbox = getCheckbox(readOnlyContainer);
    const readOnlyInput = getHiddenInput(readOnlyContainer);

    expect(readOnlyCheckbox).toHaveAttribute('aria-readonly', 'true');

    readOnlyCheckbox.click();
    await waitForUpdate();
    expect(readOnlyCheckbox).toHaveAttribute('aria-checked', 'false');

    readOnlyInput.click();
    await waitForUpdate();
    expect(readOnlyCheckbox).toHaveAttribute('aria-checked', 'false');
  });

  it('renders a hidden checkbox input inside the element', async () => {
    const container = render(html`<checkbox-root></checkbox-root>`);
    await waitForUpdate();

    const input = getHiddenInput(container);
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'checkbox');
    expect(input).toHaveAttribute('aria-hidden', 'true');
    expect(input.tabIndex).toBe(-1);
  });

  it('logs error when checkbox-indicator is rendered outside checkbox-root', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(html`<checkbox-indicator>✓</checkbox-indicator>`);

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Checkbox parts must be placed within <checkbox-root>'),
    );

    errorSpy.mockRestore();
  });

  it('updates indicator data attributes when state changes', async () => {
    const container = render(html`
      <checkbox-root>
        <checkbox-indicator keep-mounted>✓</checkbox-indicator>
      </checkbox-root>
    `);
    await waitForUpdate();

    const el = getCheckbox(container);
    const indicator = container.querySelector('checkbox-indicator') as HTMLElement;

    expect(indicator).toHaveAttribute('data-unchecked');
    expect(indicator).not.toHaveAttribute('data-checked');

    el.click();
    await waitForUpdate();

    expect(indicator).toHaveAttribute('data-checked');
    expect(indicator).not.toHaveAttribute('data-unchecked');
  });

  it('supports defaultChecked attribute', async () => {
    const container = render(html`
      <checkbox-root default-checked></checkbox-root>
    `);
    await waitForUpdate();

    const el = getCheckbox(container);
    expect(el).toHaveAttribute('aria-checked', 'true');
    expect(el).toHaveAttribute('data-checked');
  });

  it('supports indeterminate state with aria-checked="mixed"', async () => {
    const container = render(html`
      <checkbox-root indeterminate>
        <checkbox-indicator keep-mounted>–</checkbox-indicator>
      </checkbox-root>
    `);
    await waitForUpdate();

    const el = getCheckbox(container);
    const indicator = container.querySelector('checkbox-indicator') as HTMLElement;
    const input = getHiddenInput(container);

    expect(el).toHaveAttribute('aria-checked', 'mixed');
    expect(el).toHaveAttribute('data-indeterminate');
    expect(el).not.toHaveAttribute('data-checked');
    expect(el).not.toHaveAttribute('data-unchecked');
    expect(input.indeterminate).toBe(true);

    expect(indicator).toHaveAttribute('data-indeterminate');
    expect(indicator).not.toHaveAttribute('data-checked');
    expect(indicator).not.toHaveAttribute('data-unchecked');
  });

  it('indicator is visible when indeterminate', async () => {
    const container = render(html`
      <checkbox-root indeterminate>
        <checkbox-indicator>–</checkbox-indicator>
      </checkbox-root>
    `);
    await waitForUpdate();

    const indicator = container.querySelector('checkbox-indicator') as HTMLElement;
    expect(indicator).not.toHaveAttribute('hidden');
  });

  it('indicator hides when unchecked and not keep-mounted', async () => {
    const container = render(html`
      <checkbox-root>
        <checkbox-indicator>✓</checkbox-indicator>
      </checkbox-root>
    `);
    await waitForUpdate();

    const indicator = container.querySelector('checkbox-indicator') as HTMLElement;
    expect(indicator).toHaveAttribute('hidden');
    expect(indicator.style.display).toBe('none');
  });

  it('indicator stays in DOM when keep-mounted and unchecked', async () => {
    const container = render(html`
      <checkbox-root>
        <checkbox-indicator keep-mounted>✓</checkbox-indicator>
      </checkbox-root>
    `);
    await waitForUpdate();

    const indicator = container.querySelector('checkbox-indicator') as HTMLElement;
    expect(indicator).toBeInTheDocument();
    expect(indicator).not.toHaveAttribute('hidden');
  });

  it('sets aria-required when required', async () => {
    const container = render(html`
      <checkbox-root .required=${true}></checkbox-root>
    `);
    await waitForUpdate();

    const el = getCheckbox(container);
    expect(el).toHaveAttribute('aria-required', 'true');
  });

  it('is focusable with tabindex=0 and unfocusable when disabled', async () => {
    const container = render(html`<checkbox-root></checkbox-root>`);
    await waitForUpdate();

    const el = getCheckbox(container);
    expect(el.tabIndex).toBe(0);

    el.disabled = true;
    await el.updateComplete;
    expect(el.tabIndex).toBe(-1);
  });

  it('does not toggle when readonly', async () => {
    const container = render(html`<checkbox-root read-only></checkbox-root>`);
    await waitForUpdate();

    const el = getCheckbox(container);
    el.click();
    await waitForUpdate();

    expect(el.getChecked()).toBe(false);
  });
});
