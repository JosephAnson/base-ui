/* eslint-disable testing-library/render-result-naming-convention */
import { html, nothing, render as renderTemplate, type TemplateResult } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import type { BaseUIGenericEventDetails } from '@base-ui/lit/types';
import { Field } from '@base-ui/lit/field';
import { Form, type FormValidationMode } from '@base-ui/lit/form';

describe('Form', () => {
  const containers = new Set<HTMLDivElement>();

  afterEach(() => {
    containers.forEach((container) => {
      renderTemplate(nothing, container);
      container.remove();
    });
    containers.clear();
    vi.restoreAllMocks();
  });

  function render(result: TemplateResult) {
    const container = document.createElement('div');
    document.body.append(container);
    containers.add(container);

    renderTemplate(result, container);
    return container;
  }

  async function flushMicrotasks(iterations = 10) {
    for (let index = 0; index < iterations; index += 1) {
      await Promise.resolve();
    }
  }

  function submit(container: HTMLDivElement) {
    const form = container.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }));
  }

  it('preserves the public type contracts', () => {
    const form = Form({});

    expectTypeOf(form).toEqualTypeOf<TemplateResult>();
    expectTypeOf<Form.Props['validationMode']>().toEqualTypeOf<
      'onSubmit' | 'onBlur' | 'onChange' | undefined
    >();
    expectTypeOf<Form.Actions['validate']>().parameters.toEqualTypeOf<
      [fieldName?: string | undefined]
    >();
    expectTypeOf<Form.SubmitEventDetails>().toEqualTypeOf<BaseUIGenericEventDetails<'none'>>();
    expectTypeOf<FormValidationMode>().toEqualTypeOf<'onSubmit' | 'onBlur' | 'onChange'>();
  });

  it('blocks submission when a field is invalid', async () => {
    const onSubmit = vi.fn();
    const container = render(
      Form({
        onSubmit,
        children: [
          Field.Root({
            validate: () => 'Required',
            children: [Field.Control({}), Field.Error({ 'data-testid': 'error' })],
          }),
          html`<button type="submit">Submit</button>`,
        ],
      }),
    );

    await flushMicrotasks();
    submit(container);
    await flushMicrotasks();

    expect(container.querySelector('[data-testid="error"]')).toHaveTextContent('Required');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('removes unmounted fields from form validation', async () => {
    let checked = true;
    const onSubmit = vi.fn();
    const container = render(html``);

    const update = () => {
      renderTemplate(
        Form({
          onSubmit,
          children: [
            Field.Root({
              name: 'name',
              children: [Field.Control({ defaultValue: 'Alice' })],
            }),
            html`<input
              type="checkbox"
              .checked=${checked}
              @change=${() => {
                checked = !checked;
                update();
              }}
            />`,
            checked
              ? Field.Root({
                  name: 'email',
                  validate: (value) => (value ? null : 'Email is required'),
                  children: [
                    Field.Control({ defaultValue: '', 'data-testid': 'email' }),
                    Field.Error({ 'data-testid': 'email-error' }),
                  ],
                })
              : nothing,
            html`<button type="submit">Submit</button>`,
          ],
        }),
        container,
      );
    };

    update();
    await flushMicrotasks(20);

    submit(container);
    await flushMicrotasks();

    expect(onSubmit).not.toHaveBeenCalled();
    expect(container.querySelector('[data-testid="email"]')).toHaveAttribute(
      'aria-invalid',
      'true',
    );

    const toggle = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    toggle.click();
    await flushMicrotasks();

    submit(container);
    await flushMicrotasks();

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('uses external errors and clears them on input', async () => {
    const container = render(
      Form({
        errors: { name: 'Name is required' },
        children: Field.Root({
          name: 'name',
          children: [
            Field.Control({ 'data-testid': 'name' }),
            Field.Error({ 'data-testid': 'name-error' }),
          ],
        }),
      }),
    );

    await flushMicrotasks();

    const input = container.querySelector('[data-testid="name"]') as HTMLInputElement;
    expect(container.querySelector('[data-testid="name-error"]')).toHaveTextContent(
      'Name is required',
    );
    expect(input).toHaveAttribute('aria-invalid', 'true');

    input.value = 'John';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await flushMicrotasks();

    expect(container.querySelector('[data-testid="name-error"]')).toBe(null);
  });

  it('runs onFormSubmit with collected values and prevents the native submit event', async () => {
    const onFormSubmit =
      vi.fn<
        (values: { age: string; username: string }, details: Form.SubmitEventDetails) => void
      >();
    const container = render(
      Form<{ age: string; username: string }>({
        onFormSubmit,
        children: [
          Field.Root({
            name: 'username',
            children: [Field.Control({ defaultValue: 'alice132' })],
          }),
          Field.Root({
            name: 'age',
            children: [Field.Control({ defaultValue: '42' })],
          }),
          html`<button type="submit">Submit</button>`,
        ],
      }),
    );

    await flushMicrotasks(20);
    submit(container);
    await flushMicrotasks();

    expect(onFormSubmit).toHaveBeenCalledTimes(1);
    expect(onFormSubmit.mock.calls[0]?.[0]).toEqual({
      age: '42',
      username: 'alice132',
    });
    expect(onFormSubmit.mock.calls[0]?.[1].event.defaultPrevented).toBe(true);
  });

  it('collects values from registered fields instead of FormData semantics', async () => {
    const onFormSubmit = vi.fn<
      (
        values: {
          disabledName: string;
          username: string;
        },
        details: Form.SubmitEventDetails,
      ) => void
    >();
    const container = render(
      Form<{ disabledName: string; username: string }>({
        onFormSubmit,
        children: [
          Field.Root({
            name: 'username',
            children: [Field.Control({ defaultValue: 'alice132' })],
          }),
          Field.Root({
            name: 'disabledName',
            children: [Field.Control({ defaultValue: 'kept', disabled: true })],
          }),
          Field.Root({
            name: 'username',
            children: [Field.Control({ defaultValue: 'latest' })],
          }),
          html`<button type="submit">Submit</button>`,
        ],
      }),
    );

    await flushMicrotasks(20);
    submit(container);
    await flushMicrotasks();

    expect(onFormSubmit).toHaveBeenCalledTimes(1);
    expect(onFormSubmit.mock.calls[0]?.[0]).toEqual({
      disabledName: 'kept',
      username: 'latest',
    });
  });

  it('passes the same registered-field values to validators that onFormSubmit receives', async () => {
    const validate = vi.fn((value: unknown, formValues: Record<string, unknown>) => {
      void value;
      void formValues;
      return null;
    });
    const onFormSubmit = vi.fn<
      (
        values: {
          disabledName: string;
          username: string;
        },
        details: Form.SubmitEventDetails,
      ) => void
    >();
    const container = render(
      Form<{ disabledName: string; username: string }>({
        onFormSubmit,
        children: [
          Field.Root({
            name: 'username',
            children: [Field.Control({ defaultValue: 'alice132' })],
          }),
          Field.Root({
            name: 'disabledName',
            children: [Field.Control({ defaultValue: 'kept', disabled: true })],
          }),
          Field.Root({
            name: 'username',
            validate,
            children: [Field.Control({ defaultValue: 'latest' })],
          }),
          html`<button type="submit">Submit</button>`,
        ],
      }),
    );

    await flushMicrotasks(20);
    submit(container);
    await flushMicrotasks();

    expect(validate).toHaveBeenCalledTimes(1);
    const validatorValues = validate.mock.calls[0]?.[1];

    expect(validatorValues).toEqual({
      disabledName: 'kept',
      username: 'latest',
    });
    expect(onFormSubmit.mock.calls[0]?.[0]).toEqual(validatorValues);
  });

  it('inherits validationMode from the parent form', async () => {
    const validate = vi.fn(() => 'field error');
    const container = render(
      Form({
        errors: { name: 'server error' },
        validationMode: 'onBlur',
        children: Field.Root({
          invalid: true,
          name: 'name',
          validate,
          children: [
            Field.Control({ 'data-testid': 'name' }),
            Field.Error({ 'data-testid': 'name-error' }),
          ],
        }),
      }),
    );

    await flushMicrotasks();

    const input = container.querySelector('[data-testid="name"]') as HTMLInputElement;
    expect(container.querySelector('[data-testid="name-error"]')).toHaveTextContent('server error');

    input.value = 'a';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await flushMicrotasks();

    expect(validate).not.toHaveBeenCalled();
    expect(container.querySelector('[data-testid="name-error"]')).toBe(null);

    input.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    await flushMicrotasks();

    expect(validate).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[data-testid="name-error"]')).toHaveTextContent('field error');
  });

  it('revalidates on change after a submit attempt in onSubmit mode', async () => {
    const validate = vi.fn((value: unknown) => (value ? null : 'field error'));
    const container = render(
      Form({
        children: [
          Field.Root({
            name: 'username',
            validate,
            children: [
              Field.Control({ 'data-testid': 'username' }),
              Field.Error({ 'data-testid': 'username-error' }),
            ],
          }),
          html`<button type="submit">Submit</button>`,
        ],
      }),
    );

    await flushMicrotasks();
    submit(container);
    await flushMicrotasks();

    expect(validate).toHaveBeenCalledTimes(1);

    const input = container.querySelector('[data-testid="username"]') as HTMLInputElement;
    input.value = 'alice';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await flushMicrotasks();

    expect(validate.mock.calls.length).toBeGreaterThan(1);
    expect(container.querySelector('[data-testid="username-error"]')).toBe(null);
  });

  it('supports imperative validation for all fields and named fields', async () => {
    const actionsRef = { current: null as Form.Actions | null };
    const container = render(
      Form({
        actionsRef,
        children: [
          Field.Root({
            name: 'username',
            validate: () => 'Username is required',
            children: [Field.Control({}), Field.Error({ 'data-testid': 'error' })],
          }),
          Field.Root({
            name: 'quantity',
            validate: () => 'Number field error',
            children: [Field.Control({}), Field.Error({ 'data-testid': 'error' })],
          }),
        ],
      }),
    );

    await flushMicrotasks();

    actionsRef.current?.validate('quantity');
    await flushMicrotasks(20);

    expect(container.querySelector('input[name="quantity"]')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(container.querySelector('input[name="username"]')).not.toHaveAttribute('aria-invalid');

    actionsRef.current?.validate();
    await flushMicrotasks(20);

    expect(container.querySelector('input[name="quantity"]')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(container.querySelector('input[name="username"]')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  it('does not switch onSubmit validation into validate-on-change mode after imperative validation', async () => {
    const validate = vi.fn(() => 'field error');
    const actionsRef = { current: null as Form.Actions | null };
    const container = render(
      Form({
        actionsRef,
        children: Field.Root({
          name: 'username',
          validate,
          children: [
            Field.Control({ 'data-testid': 'username' }),
            Field.Error({ 'data-testid': 'username-error' }),
          ],
        }),
      }),
    );

    await flushMicrotasks();

    actionsRef.current?.validate('username');
    await flushMicrotasks(20);

    expect(validate).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[data-testid="username-error"]')).toHaveTextContent(
      'field error',
    );

    const input = container.querySelector('[data-testid="username"]') as HTMLInputElement;
    input.value = 'alice';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await flushMicrotasks();

    expect(validate).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[data-testid="username-error"]')).toBe(null);
  });

  it('sets novalidate by default and allows opting out', async () => {
    const defaultContainer = render(Form({ 'data-testid': 'default-form' }));
    const nativeContainer = render(Form({ 'data-testid': 'native-form', noValidate: false }));

    await flushMicrotasks();

    expect(defaultContainer.querySelector('[data-testid="default-form"]')).toHaveAttribute(
      'novalidate',
    );
    expect(nativeContainer.querySelector('[data-testid="native-form"]')).not.toHaveAttribute(
      'novalidate',
    );
  });
});
