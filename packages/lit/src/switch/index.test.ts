import { html, nothing, render as renderTemplate } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import './index';
import {
  Switch,
  SwitchRootElement,
  type SwitchRoot,
  type SwitchRootChangeEventDetails,
  type SwitchRootChangeEventReason,
  type SwitchRootProps,
  type SwitchRootState,
  type SwitchThumb,
  type SwitchThumbProps,
  type SwitchThumbState,
} from './index';

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
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });
  }

  function getSwitch(view: HTMLElement) {
    return view.querySelector('switch-root') as SwitchRootElement;
  }

  function getCheckbox(view: HTMLElement) {
    return view.querySelector('input[type="checkbox"]') as HTMLInputElement;
  }

  it('exposes namespace aliases for runtime parts and props/state aliases', () => {
    expect(Switch.Root).toBe(SwitchRootElement);
    expectTypeOf<SwitchRootProps>().toEqualTypeOf<SwitchRoot.Props>();
    expectTypeOf<SwitchRootState>().toEqualTypeOf<SwitchRoot.State>();
    expectTypeOf<SwitchRootChangeEventReason>().toEqualTypeOf<SwitchRoot.ChangeEventReason>();
    expectTypeOf<SwitchRootChangeEventDetails>().toEqualTypeOf<SwitchRoot.ChangeEventDetails>();
    expectTypeOf<SwitchThumbProps>().toEqualTypeOf<SwitchThumb.Props>();
    expectTypeOf<SwitchThumbState>().toEqualTypeOf<SwitchThumb.State>();
  });

  it('renders switch-root as a custom element with role=switch', async () => {
    const view = render(html`<switch-root></switch-root>`);
    await waitForUpdate();

    const el = getSwitch(view);
    expect(el).toBeInTheDocument();
    expect(el).toHaveAttribute('role', 'switch');
    expect(el).toHaveAttribute('aria-checked', 'false');
  });

  it('toggles uncontrolled state when clicked', async () => {
    const view = render(html`<switch-root></switch-root>`);
    await waitForUpdate();

    const el = getSwitch(view);
    expect(el).toHaveAttribute('aria-checked', 'false');

    el.click();
    await waitForUpdate();
    expect(el).toHaveAttribute('aria-checked', 'true');

    el.click();
    await waitForUpdate();
    expect(el).toHaveAttribute('aria-checked', 'false');
  });

  it('supports keyboard activation (Enter and Space)', async () => {
    const view = render(html`
      <switch-root>
        <switch-thumb></switch-thumb>
      </switch-root>
    `);
    await waitForUpdate();

    const el = getSwitch(view);

    el.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter' }),
    );
    await waitForUpdate();
    expect(el).toHaveAttribute('aria-checked', 'true');

    el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, cancelable: true, key: ' ' }));
    await waitForUpdate();
    expect(el).toHaveAttribute('aria-checked', 'false');
  });

  it('updates controlled state when property changes', async () => {
    const view = render(html`<switch-root .checked=${false}></switch-root>`);
    await waitForUpdate();

    const el = getSwitch(view);
    expect(el).toHaveAttribute('aria-checked', 'false');

    el.checked = true;
    await el.updateComplete;
    expect(el).toHaveAttribute('aria-checked', 'true');

    el.checked = false;
    await el.updateComplete;
    expect(el).toHaveAttribute('aria-checked', 'false');
  });

  it('updates its state if the hidden input is toggled', async () => {
    const view = render(html`<switch-root></switch-root>`);
    await waitForUpdate();

    const el = getSwitch(view);
    const input = getCheckbox(view);

    input.click();
    await waitForUpdate();
    expect(el).toHaveAttribute('aria-checked', 'true');
  });

  it('calls onCheckedChange with change details and supports cancellation', async () => {
    const handleChange = vi.fn((checked: boolean, eventDetails: SwitchRootChangeEventDetails) => {
      if (checked) {
        eventDetails.cancel();
      }
      return eventDetails;
    });

    const view = render(html` <switch-root .onCheckedChange=${handleChange}></switch-root> `);
    await waitForUpdate();

    const el = getSwitch(view);
    el.click();
    await waitForUpdate();

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange.mock.calls[0]?.[0]).toBe(true);
    expect(handleChange.mock.results[0]?.value.isCanceled).toBe(true);
    expect(handleChange.mock.results[0]?.value.isPropagationAllowed).toBe(false);
    expect(el).toHaveAttribute('aria-checked', 'false');
  });

  it('reports modifier event properties when calling onCheckedChange', async () => {
    const handleChange = vi.fn(
      (_checked: boolean, eventDetails: SwitchRootChangeEventDetails) => eventDetails,
    );
    const view = render(html` <switch-root .onCheckedChange=${handleChange}></switch-root> `);
    await waitForUpdate();

    const el = getSwitch(view);
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, shiftKey: true }));
    await waitForUpdate();

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect((handleChange.mock.results[0]?.value.event as MouseEvent).shiftKey).toBe(true);
  });

  it('sets aria-labelledby from an explicitly linked label and toggles on label click', async () => {
    const view = render(html`
      <label for="notifications-switch">Notifications</label>
      <switch-root id="notifications-switch"></switch-root>
    `);
    await waitForUpdate();
    await waitForUpdate();

    const label = view.querySelector('label') as HTMLLabelElement;
    const el = getSwitch(view);

    expect(label.id).not.toBe('');
    expect(el).toHaveAttribute('aria-labelledby', label.id);

    label.click();
    await waitForUpdate();
    expect(el).toHaveAttribute('aria-checked', 'true');
  });

  it('updates fallback aria-labelledby when the linked id changes', async () => {
    const view = render(html`
      <label for="switch-input-a">Label A</label>
      <label for="switch-input-b">Label B</label>
      <switch-root id="switch-input-a"></switch-root>
    `);
    await waitForUpdate();
    await waitForUpdate();

    const el = getSwitch(view);
    const labelA = view.querySelector('label[for="switch-input-a"]') as HTMLLabelElement;
    const labelB = view.querySelector('label[for="switch-input-b"]') as HTMLLabelElement;

    expect(labelA.id).not.toBe('');
    expect(el).toHaveAttribute('aria-labelledby', labelA.id);

    el.id = 'switch-input-b';
    await waitForUpdate();
    await waitForUpdate();

    expect(labelB.id).not.toBe('');
    expect(labelA.id).not.toBe(labelB.id);
    expect(el).toHaveAttribute('aria-labelledby', labelB.id);
  });

  it('places state data attributes on the root and the thumb', async () => {
    const view = render(html`
      <switch-root default-checked .disabled=${true} .readOnly=${true} .required=${true}>
        <switch-thumb></switch-thumb>
      </switch-root>
    `);
    await waitForUpdate();

    const el = getSwitch(view);
    const thumb = view.querySelector('switch-thumb') as HTMLElement;

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

  it('mirrors name and value onto the hidden input', async () => {
    const view = render(html` <switch-root name="switch-name" value="1"></switch-root> `);
    await waitForUpdate();

    const input = getCheckbox(view);

    expect(input).toHaveAttribute('name', 'switch-name');
    expect(input).toHaveAttribute('value', '1');
  });

  it('submits uncheckedValue when provided', async () => {
    const view = render(html`
      <form>
        <switch-root name="test-switch" unchecked-value="off"></switch-root>
      </form>
    `);
    await waitForUpdate();

    const form = view.querySelector('form') as HTMLFormElement;
    const el = getSwitch(view);

    expect(new FormData(form).get('test-switch')).toBe('off');

    el.click();
    await waitForUpdate();
    expect(new FormData(form).get('test-switch')).toBe('on');

    el.click();
    await waitForUpdate();
    expect(new FormData(form).get('test-switch')).toBe('off');
  });

  it('submits to an external form when form is provided', async () => {
    const view = render(html`
      <form id="external-form"></form>
      <switch-root name="test-switch" form="external-form" unchecked-value="off"></switch-root>
    `);
    await waitForUpdate();

    const form = view.querySelector('form') as HTMLFormElement;
    const el = getSwitch(view);

    expect(new FormData(form).get('test-switch')).toBe('off');

    el.click();
    await waitForUpdate();
    expect(new FormData(form).get('test-switch')).toBe('on');
  });

  it('uses aria-disabled and aria-readonly semantics', async () => {
    {
      const view = render(html` <switch-root .disabled=${true}></switch-root> `);
      await waitForUpdate();

      const disabledSwitch = getSwitch(view);
      expect(disabledSwitch).toHaveAttribute('aria-disabled', 'true');
      expect(disabledSwitch).not.toHaveAttribute('disabled');

      disabledSwitch.click();
      await waitForUpdate();
      expect(disabledSwitch).toHaveAttribute('aria-checked', 'false');
    }

    {
      const view = render(html` <switch-root .readOnly=${true}></switch-root> `);
      await waitForUpdate();

      const readOnlySwitch = getSwitch(view);
      const readOnlyInput = getCheckbox(view);

      expect(readOnlySwitch).toHaveAttribute('aria-readonly', 'true');

      readOnlySwitch.click();
      await waitForUpdate();
      expect(readOnlySwitch).toHaveAttribute('aria-checked', 'false');

      readOnlyInput.click();
      await waitForUpdate();
      expect(readOnlySwitch).toHaveAttribute('aria-checked', 'false');
    }
  });

  it('blocks same-target click listeners when disabled', async () => {
    const handleClick = vi.fn();
    const view = render(html` <switch-root .disabled=${true}></switch-root> `);
    await waitForUpdate();

    const el = getSwitch(view);
    el.addEventListener('click', handleClick);
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    expect(handleClick).not.toHaveBeenCalled();
  });

  it('renders a hidden checkbox input inside the element', async () => {
    const view = render(html`<switch-root></switch-root>`);
    await waitForUpdate();

    const input = getCheckbox(view);
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
    const view = render(html`
      <switch-root>
        <switch-thumb></switch-thumb>
      </switch-root>
    `);
    await waitForUpdate();

    const el = getSwitch(view);
    const thumb = view.querySelector('switch-thumb') as HTMLElement;

    expect(thumb).toHaveAttribute('data-unchecked');
    expect(thumb).not.toHaveAttribute('data-checked');

    el.click();
    await waitForUpdate();

    expect(thumb).toHaveAttribute('data-checked');
    expect(thumb).not.toHaveAttribute('data-unchecked');
  });

  it('supports defaultChecked attribute', async () => {
    const view = render(html` <switch-root default-checked></switch-root> `);
    await waitForUpdate();

    const el = getSwitch(view);
    expect(el).toHaveAttribute('aria-checked', 'true');
    expect(el).toHaveAttribute('data-checked');
  });
});
