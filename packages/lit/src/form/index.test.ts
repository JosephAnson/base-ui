import { html, nothing, render as renderTemplate } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../field/index.ts';
import './index.ts';
import type { FormRootElement, FormActions } from './index.ts';

describe('form', () => {
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
    for (let i = 0; i < 8; i++) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  function submit(container: HTMLElement) {
    const form = container.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }));
  }

  it('renders form-root as a custom element', async () => {
    const container = render(html`
      <form-root>
        <form></form>
      </form-root>
    `);
    await waitForUpdate();

    const root = container.querySelector('form-root') as FormRootElement;
    expect(root).toBeInTheDocument();
    expect(root).toHaveAttribute('data-base-ui-form-context');
  });

  it('sets novalidate on the nested form by default', async () => {
    const container = render(html`
      <form-root>
        <form data-testid="default-form"></form>
      </form-root>
    `);
    await waitForUpdate();

    expect(container.querySelector('[data-testid="default-form"]')).toHaveAttribute('novalidate');
  });

  it('blocks submission when a field is invalid', async () => {
    const onSubmit = vi.fn();
    const container = render(html`
      <form-root .onSubmit=${onSubmit}>
        <form>
          <field-root .validate=${() => 'Required'}>
            <field-control></field-control>
            <field-error data-testid="error"></field-error>
          </field-root>
          <button type="submit">Submit</button>
        </form>
      </form-root>
    `);
    await waitForUpdate();

    submit(container);
    await waitForUpdate();

    expect(container.querySelector('[data-testid="error"]')).toHaveTextContent('Required');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows external errors on field-error and clears on input', async () => {
    const container = render(html`
      <form-root .errors=${{ username: 'Name is required' }}>
        <form>
          <field-root .name=${'username'}>
            <field-control></field-control>
            <field-error data-testid="error"></field-error>
          </field-root>
        </form>
      </form-root>
    `);
    await waitForUpdate();

    const error = container.querySelector('[data-testid="error"]') as HTMLElement;
    expect(error).toHaveTextContent('Name is required');

    // Typing should clear the external error
    const input = container.querySelector('input') as HTMLInputElement;
    input.value = 'John';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await waitForUpdate();

    expect(container.querySelector('[data-testid="error"]')).toHaveAttribute('hidden');
  });

  it('runs onFormSubmit with collected form values', async () => {
    const onFormSubmit = vi.fn();
    const container = render(html`
      <form-root .onFormSubmit=${onFormSubmit}>
        <form>
          <field-root .name=${'username'}>
            <field-control></field-control>
          </field-root>
          <field-root .name=${'age'}>
            <field-control></field-control>
          </field-root>
          <button type="submit">Submit</button>
        </form>
      </form-root>
    `);
    await waitForUpdate();

    // Set values on the inputs
    const inputs = container.querySelectorAll('input') as NodeListOf<HTMLInputElement>;
    inputs[0].value = 'alice132';
    inputs[1].value = '42';

    submit(container);
    await waitForUpdate();

    expect(onFormSubmit).toHaveBeenCalledTimes(1);
    expect(onFormSubmit.mock.calls[0]?.[0]).toEqual({
      username: 'alice132',
      age: '42',
    });
    expect(onFormSubmit.mock.calls[0]?.[1]).toHaveProperty('reason', 'none');
  });

  it('inherits validationMode from form-root', async () => {
    const validate = vi.fn(() => 'field error');
    const container = render(html`
      <form-root .validationMode=${'onBlur'}>
        <form>
          <field-root .name=${'username'} .validate=${validate}>
            <field-control></field-control>
            <field-error data-testid="error"></field-error>
          </field-root>
        </form>
      </form-root>
    `);
    await waitForUpdate();

    const input = container.querySelector('input') as HTMLInputElement;

    // Input change should NOT trigger validation in onBlur mode
    input.value = 'a';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await waitForUpdate();

    expect(validate).not.toHaveBeenCalled();

    // Blur should trigger validation
    input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    await waitForUpdate();

    expect(validate).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[data-testid="error"]')).toHaveTextContent('field error');
  });

  it('revalidates on change after a submit attempt in onSubmit mode', async () => {
    const validate = vi.fn((value: unknown) => (value ? null : 'field error'));
    const container = render(html`
      <form-root>
        <form>
          <field-root .name=${'username'} .validate=${validate}>
            <field-control></field-control>
            <field-error data-testid="error"></field-error>
          </field-root>
          <button type="submit">Submit</button>
        </form>
      </form-root>
    `);
    await waitForUpdate();

    // Submit with empty input → validation error
    submit(container);
    await waitForUpdate();

    expect(validate).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[data-testid="error"]')).toHaveTextContent('field error');

    // Now typing should re-validate (because submit was attempted)
    const input = container.querySelector('input') as HTMLInputElement;
    input.value = 'alice';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await waitForUpdate();

    expect(validate.mock.calls.length).toBeGreaterThan(1);
    expect(container.querySelector('[data-testid="error"]')).toHaveAttribute('hidden');
  });

  it('supports imperative validation via actionsRef', async () => {
    const actionsRef = { current: null as FormActions | null };
    const container = render(html`
      <form-root .actionsRef=${actionsRef}>
        <form>
          <field-root .name=${'username'} .validate=${() => 'Username required'}>
            <field-control></field-control>
            <field-error data-testid="username-error"></field-error>
          </field-root>
          <field-root .name=${'email'} .validate=${() => 'Email required'}>
            <field-control></field-control>
            <field-error data-testid="email-error"></field-error>
          </field-root>
        </form>
      </form-root>
    `);
    await waitForUpdate();

    // Validate single field
    actionsRef.current?.validate('email');
    await waitForUpdate();

    const inputs = container.querySelectorAll('input');
    expect(inputs[1]).toHaveAttribute('aria-invalid', 'true');
    expect(inputs[0]).not.toHaveAttribute('aria-invalid');

    // Validate all fields
    actionsRef.current?.validate();
    await waitForUpdate();

    expect(inputs[0]).toHaveAttribute('aria-invalid', 'true');
    expect(inputs[1]).toHaveAttribute('aria-invalid', 'true');
  });
});
