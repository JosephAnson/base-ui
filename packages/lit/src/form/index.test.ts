import { html, nothing, render as renderTemplate } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import '../field';
import {
  Form,
  FormRootElement,
  type FormActions,
  type FormProps,
  type FormRoot,
  type FormState,
  type FormSubmitEventDetails,
  type FormValidationMode,
} from './index';

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
    await flushTimers(8);
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

  function submit(view: HTMLElement) {
    const form = view.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }));
  }

  it('exposes runtime and namespace aliases', () => {
    expect(Form).toBe(FormRootElement);
    expectTypeOf<FormProps>().toEqualTypeOf<Form.Props>();
    expectTypeOf<FormProps>().toEqualTypeOf<FormRoot.Props>();
    expectTypeOf<FormState>().toEqualTypeOf<Form.State>();
    expectTypeOf<FormState>().toEqualTypeOf<FormRoot.State>();
    expectTypeOf<FormActions>().toEqualTypeOf<Form.Actions>();
    expectTypeOf<FormActions>().toEqualTypeOf<FormRoot.Actions>();
    expectTypeOf<FormSubmitEventDetails>().toEqualTypeOf<Form.SubmitEventDetails>();
    expectTypeOf<FormSubmitEventDetails>().toEqualTypeOf<FormRoot.SubmitEventDetails>();
    expectTypeOf<FormValidationMode>().toEqualTypeOf<Form.ValidationMode>();
    expectTypeOf<FormValidationMode>().toEqualTypeOf<FormRoot.ValidationMode>();
  });

  it('renders form-root as a custom element', async () => {
    const view = render(html`
      <form-root>
        <form></form>
      </form-root>
    `);
    await waitForUpdate();

    const root = view.querySelector('form-root') as FormRootElement;
    expect(root).toBeInTheDocument();
    expect(root).toHaveAttribute('data-base-ui-form-context');
  });

  it('sets novalidate on the nested form by default', async () => {
    const view = render(html`
      <form-root>
        <form data-testid="default-form"></form>
      </form-root>
    `);
    await waitForUpdate();

    expect(view.querySelector('[data-testid="default-form"]')).toHaveAttribute('novalidate');
  });

  it('blocks submission when a field is invalid', async () => {
    const onSubmit = vi.fn();
    const view = render(html`
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

    submit(view);
    await waitForUpdate();

    expect(view.querySelector('[data-testid="error"]')).toHaveTextContent('Required');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows external errors on field-error and clears on input', async () => {
    const view = render(html`
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

    const error = view.querySelector('[data-testid="error"]') as HTMLElement;
    expect(error).toHaveTextContent('Name is required');

    const input = view.querySelector('input') as HTMLInputElement;
    input.value = 'John';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await waitForUpdate();

    expect(view.querySelector('[data-testid="error"]')).toHaveAttribute('hidden');
  });

  it('runs onFormSubmit with collected form values', async () => {
    const onFormSubmit = vi.fn();
    const view = render(html`
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

    const inputs = view.querySelectorAll('input') as NodeListOf<HTMLInputElement>;
    inputs[0].value = 'alice132';
    inputs[1].value = '42';

    submit(view);
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
    const view = render(html`
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

    const input = view.querySelector('input') as HTMLInputElement;
    input.value = 'a';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await waitForUpdate();

    expect(validate).not.toHaveBeenCalled();

    input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    await waitForUpdate();

    expect(validate).toHaveBeenCalledTimes(1);
    expect(view.querySelector('[data-testid="error"]')).toHaveTextContent('field error');
  });

  it('revalidates on change after a submit attempt in onSubmit mode', async () => {
    const validate = vi.fn((value: unknown) => (value ? null : 'field error'));
    const view = render(html`
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

    submit(view);
    await waitForUpdate();

    expect(validate).toHaveBeenCalledTimes(1);
    expect(view.querySelector('[data-testid="error"]')).toHaveTextContent('field error');

    const input = view.querySelector('input') as HTMLInputElement;
    input.value = 'alice';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await waitForUpdate();

    expect(validate.mock.calls.length).toBeGreaterThan(1);
    expect(view.querySelector('[data-testid="error"]')).toHaveAttribute('hidden');
  });

  it('supports imperative validation via actionsRef', async () => {
    const actionsRef = { current: null as FormActions | null };
    const view = render(html`
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

    actionsRef.current?.validate('email');
    await waitForUpdate();

    const inputs = view.querySelectorAll('input');
    expect(inputs[1]).toHaveAttribute('aria-invalid', 'true');
    expect(inputs[0]).not.toHaveAttribute('aria-invalid');

    actionsRef.current?.validate();
    await waitForUpdate();

    expect(inputs[0]).toHaveAttribute('aria-invalid', 'true');
    expect(inputs[1]).toHaveAttribute('aria-invalid', 'true');
  });
});
