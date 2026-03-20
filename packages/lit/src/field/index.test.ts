import { html, nothing, render as renderTemplate } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../checkbox/index.ts';
import '../fieldset/index.ts';
import './index.ts';
import type { FieldRootElement, FieldValidityState } from './index.ts';

describe('field', () => {
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
  }

  it('renders field-root as a custom element', async () => {
    const container = render(html`<field-root></field-root>`);
    await waitForUpdate();

    const root = container.querySelector('field-root') as FieldRootElement;
    expect(root).toBeInTheDocument();
    expect(root).toHaveAttribute('data-base-ui-field-root');
  });

  it('field-control creates an input inside itself', async () => {
    const container = render(html`
      <field-root>
        <field-control></field-control>
      </field-root>
    `);
    await waitForUpdate();

    const input = container.querySelector('input') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.id).not.toBe('');
  });

  it('field-label focuses the control when clicked', async () => {
    const container = render(html`
      <field-root>
        <field-control></field-control>
        <field-label>Name</field-label>
      </field-root>
    `);
    await waitForUpdate();

    const label = container.querySelector('field-label') as HTMLElement;
    const input = container.querySelector('input') as HTMLInputElement;

    label.click();
    await waitForUpdate();

    expect(input).toHaveFocus();
  });

  it('field-description applies aria-describedby to the control', async () => {
    const container = render(html`
      <field-root>
        <field-control></field-control>
        <field-description>Visible on your profile</field-description>
      </field-root>
    `);
    await waitForUpdate();

    const input = container.querySelector('input') as HTMLInputElement;
    const description = container.querySelector('field-description') as HTMLElement;

    expect(description.id).not.toBe('');
    expect(input).toHaveAttribute('aria-describedby', description.id);
  });

  it('shows error content after submit validation and wires aria-describedby', async () => {
    const container = render(html`
      <form>
        <field-root .validate=${() => 'Required'}>
          <field-control></field-control>
          <field-error></field-error>
        </field-root>
      </form>
    `);
    await waitForUpdate();

    const form = container.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await waitForUpdate();

    const input = container.querySelector('input') as HTMLInputElement;
    const error = container.querySelector('field-error') as HTMLElement;

    expect(error).not.toHaveAttribute('hidden');
    expect(error).toHaveTextContent('Required');
    expect(error.id).not.toBe('');
    expect(input).toHaveAttribute('aria-describedby', error.id);
  });

  it('passes validity updates to the render callback', async () => {
    const handleValidity = vi.fn();
    const container = render(html`
      <field-root .validationMode=${'onBlur'} .validate=${() => ['one', 'two']}>
        <field-control></field-control>
        <field-validity .renderValidity=${handleValidity}></field-validity>
      </field-root>
    `);
    await waitForUpdate();

    const input = container.querySelector('input') as HTMLInputElement;
    input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    await waitForUpdate();

    expect(handleValidity).toHaveBeenCalled();
    const latestCall = handleValidity.mock.lastCall?.[0] as FieldValidityState;
    expect(latestCall?.error).toBe('one');
    expect(latestCall?.errors).toEqual(['one', 'two']);
    expect(latestCall).toHaveProperty('transitionStatus');
  });

  it('blocks interaction inside a disabled field-item', async () => {
    const container = render(html`
      <field-root>
        <field-item disabled>
          <checkbox-root></checkbox-root>
        </field-item>
        <checkbox-root data-testid="allowed"></checkbox-root>
      </field-root>
    `);
    await waitForUpdate();

    const blocked = container.querySelector('field-item checkbox-root') as HTMLElement;
    const allowed = container.querySelector('[data-testid="allowed"]') as HTMLElement;

    blocked.click();
    await waitForUpdate();
    expect(blocked).toHaveAttribute('aria-checked', 'false');

    allowed.click();
    await waitForUpdate();
    expect(allowed).toHaveAttribute('aria-checked', 'true');
  });

  it('inherits disabled state from a surrounding fieldset', async () => {
    const container = render(html`
      <fieldset-root .disabled=${true}>
        <field-root>
          <field-control></field-control>
        </field-root>
      </fieldset-root>
    `);
    await waitForUpdate();

    const field = container.querySelector('field-root') as FieldRootElement;
    expect(field).toHaveAttribute('data-disabled');
  });
});
