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

  function rerender(container: HTMLDivElement, result: ReturnType<typeof html>) {
    renderTemplate(result, container);
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

  function getRoot(view: HTMLElement) {
    return view.querySelector('form-root') as FormRootElement;
  }

  function getInputs(view: HTMLElement) {
    return Array.from(view.querySelectorAll('input')) as HTMLInputElement[];
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

    const root = getRoot(view);
    expect(root).toBeInTheDocument();
    expect(root).toHaveAttribute('data-base-ui-form-context');
  });

  it('supports a static render template on the root', async () => {
    const view = render(html`
      <form-root .render=${html`<section data-testid="root"></section>`}>
        <form></form>
      </form-root>
    `);
    await waitForUpdate();

    const root = view.querySelector('[data-testid="root"]') as HTMLElement;
    expect(root).not.toBeNull();
    expect(root.querySelector('form')).not.toBeNull();
  });

  it('supports a render function on the root', async () => {
    let receivedProps: Record<string, unknown> | null = null;
    let receivedState: Record<string, unknown> | null = null;

    const view = render(html`
      <form-root
        .render=${(props: Record<string, unknown>, state: Record<string, unknown>) => {
          receivedProps = props;
          receivedState = state;
          return html`<div data-testid="root"></div>`;
        }}
      >
        <form></form>
      </form-root>
    `);
    await waitForUpdate();

    expect(receivedProps).toEqual({});
    expect(receivedState).toEqual({});
    expect(view.querySelector('[data-testid="root"] form')).not.toBeNull();
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

  it('allows native validation when noValidate is false', async () => {
    const view = render(html`
      <form-root .noValidate=${false}>
        <form data-testid="native-form"></form>
      </form-root>
    `);
    await waitForUpdate();

    expect(view.querySelector('[data-testid="native-form"]')).not.toHaveAttribute('novalidate');
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

  it('removes unmounted fields from validation', async () => {
    const onSubmit = vi.fn((event: SubmitEvent) => event.preventDefault());

    function template(withEmail: boolean) {
      return html`
        <form-root .onSubmit=${onSubmit}>
          <form>
            <field-root .name=${'name'}>
              <field-control .defaultValue=${'Alice'}></field-control>
            </field-root>
            ${withEmail
              ? html`
                  <field-root .name=${'email'} .validate=${() => 'Email is required'}>
                    <field-control data-testid="email"></field-control>
                    <field-error data-testid="email-error"></field-error>
                  </field-root>
                `
              : nothing}
            <button type="submit">Submit</button>
          </form>
        </form-root>
      `;
    }

    const view = render(template(true));
    await waitForUpdate();

    submit(view);
    await waitForUpdate();

    expect(onSubmit).not.toHaveBeenCalled();
    expect(getInputs(view)[1]).toHaveAttribute('aria-invalid', 'true');

    rerender(view, template(false));
    await waitForUpdate();

    submit(view);
    await waitForUpdate();

    expect(onSubmit).toHaveBeenCalledTimes(1);
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

  it('focuses the first invalid field only on submit', async () => {
    const view = render(html`
      <form-root>
        <form>
          <field-root .name=${'name'}>
            <field-control data-testid="name"></field-control>
            <field-error data-testid="name-error"></field-error>
          </field-root>
          <field-root .name=${'age'}>
            <field-control data-testid="age"></field-control>
            <field-error data-testid="age-error"></field-error>
          </field-root>
          <button type="submit">Submit</button>
        </form>
      </form-root>
    `);
    await waitForUpdate();

    const root = getRoot(view);
    root.onSubmit = (event) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget as HTMLFormElement);
      const name = String(formData.get('name') ?? '');
      const age = String(formData.get('age') ?? '');

      root.errors = {
        ...(name === '' ? { name: 'Name is required' } : {}),
        ...(age === '' ? { age: 'Age is required' } : {}),
      };
    };

    const [name, age] = getInputs(view);

    submit(view);
    await waitForUpdate();

    expect(name).toHaveFocus();

    name.value = 'John';
    name.dispatchEvent(new Event('input', { bubbles: true }));
    await waitForUpdate();

    expect(age).not.toHaveFocus();

    submit(view);
    await waitForUpdate();

    expect(age).toHaveFocus();

    age.value = '42';
    age.dispatchEvent(new Event('input', { bubbles: true }));
    await waitForUpdate();

    const submitButton = view.querySelector('button[type="submit"]') as HTMLButtonElement;
    submitButton.focus();
    submit(view);
    await waitForUpdate();

    expect(age).not.toHaveFocus();
  });

  it('does not swap focus immediately on change after two submissions', async () => {
    const view = render(html`
      <form-root>
        <form>
          <field-root .name=${'name'}>
            <field-control></field-control>
            <field-error data-testid="name-error"></field-error>
          </field-root>
          <field-root .name=${'age'}>
            <field-control></field-control>
            <field-error data-testid="age-error"></field-error>
          </field-root>
          <button type="submit">Submit</button>
        </form>
      </form-root>
    `);
    await waitForUpdate();

    const root = getRoot(view);
    root.onSubmit = (event) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget as HTMLFormElement);
      const name = String(formData.get('name') ?? '');
      const age = String(formData.get('age') ?? '');

      root.errors = {
        ...(name === '' ? { name: 'Name is required' } : {}),
        ...(age === '' ? { age: 'Age is required' } : {}),
      };
    };

    const [name, age] = getInputs(view);

    submit(view);
    await waitForUpdate();

    expect(name).toHaveFocus();

    submit(view);
    await waitForUpdate();

    name.value = 'John';
    name.dispatchEvent(new Event('input', { bubbles: true }));
    await waitForUpdate();

    expect(age).not.toHaveFocus();
  });

  it('runs field validation on first change after a form error is set', async () => {
    const validate = vi.fn((value: unknown) => (value === 'abcd' ? 'field error' : null));
    const view = render(html`
      <form-root>
        <form>
          <field-root .name=${'name'} .validate=${validate}>
            <field-control data-testid="name"></field-control>
            <field-error data-testid="name-error"></field-error>
          </field-root>
          <button type="submit">Submit</button>
        </form>
      </form-root>
    `);
    await waitForUpdate();

    const root = getRoot(view);
    root.onSubmit = (event) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget as HTMLFormElement);
      const name = String(formData.get('name') ?? '');

      root.errors = name === 'abcde' ? { name: 'submit error' } : {};
    };

    const [input] = getInputs(view);
    input.value = 'abcde';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await waitForUpdate();

    submit(view);
    await waitForUpdate();

    expect(view.querySelector('[data-testid="name-error"]')).toHaveTextContent('submit error');

    validate.mockClear();

    input.value = 'abcd';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await waitForUpdate();

    expect(validate).toHaveBeenCalledTimes(1);
    expect(view.querySelector('[data-testid="name-error"]')).toHaveTextContent('field error');
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

    const inputs = getInputs(view);
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
    expect(onFormSubmit.mock.calls[0]?.[1].event.defaultPrevented).toBe(true);
  });

  it('does not run onFormSubmit when the form is invalid', async () => {
    const onFormSubmit = vi.fn();
    const view = render(html`
      <form-root .onFormSubmit=${onFormSubmit}>
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

    expect(onFormSubmit).not.toHaveBeenCalled();
    expect(view.querySelector('[data-testid="error"]')).toHaveTextContent('Required');
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

    const [input] = getInputs(view);
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

    const [input] = getInputs(view);
    input.value = 'alice';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await waitForUpdate();

    expect(validate.mock.calls.length).toBeGreaterThan(1);
    expect(view.querySelector('[data-testid="error"]')).toHaveAttribute('hidden');
  });

  it('does not submit when invalid remains true even if validate returns null', async () => {
    const onSubmit = vi.fn();
    const validate = vi.fn(() => null);
    const view = render(html`
      <form-root .onSubmit=${onSubmit}>
        <form>
          <field-root
            .name=${'name'}
            .invalid=${true}
            .validate=${validate}
            .validationMode=${'onChange'}
          >
            <field-control data-testid="name"></field-control>
            <field-error data-testid="name-error"></field-error>
          </field-root>
          <button type="submit">Submit</button>
        </form>
      </form-root>
    `);
    await waitForUpdate();

    const [input] = getInputs(view);
    input.value = 'o';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await waitForUpdate();

    expect(validate).toHaveBeenCalledTimes(1);

    submit(view);
    await waitForUpdate();

    expect(onSubmit).not.toHaveBeenCalled();
    expect(input).toHaveAttribute('aria-invalid', 'true');
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

    const inputs = getInputs(view);
    expect(inputs[1]).toHaveAttribute('aria-invalid', 'true');
    expect(inputs[0]).not.toHaveAttribute('aria-invalid');

    actionsRef.current?.validate();
    await waitForUpdate();

    expect(inputs[0]).toHaveAttribute('aria-invalid', 'true');
    expect(inputs[1]).toHaveAttribute('aria-invalid', 'true');
  });
});
