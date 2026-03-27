import { html, nothing, render as renderTemplate } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import '../checkbox';
import '../fieldset';
import {
  Field,
  FieldControl,
  FieldControlElement,
  type FieldControlChangeEventDetails,
  type FieldControlProps,
  type FieldControlState,
  FieldDescription,
  type FieldDescriptionProps,
  type FieldDescriptionState,
  FieldError,
  type FieldErrorProps,
  type FieldErrorState,
  FieldItem,
  type FieldItemProps,
  type FieldItemState,
  FieldLabel,
  type FieldLabelProps,
  type FieldLabelState,
  FieldRoot,
  FieldRootElement,
  type FieldRootActions,
  type FieldRootProps,
  type FieldRootState,
  FieldValidity,
  type FieldValidityProps,
  type FieldValidityState,
} from './index';
import './index';

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

  async function flushUpdates(count = 6) {
    await Array.from({ length: count }).reduce(
      (promise) =>
        promise.then(
          () =>
            new Promise<void>((resolve) => {
              setTimeout(resolve, 0);
            }),
        ),
      Promise.resolve(),
    );
  }

  it('exposes the field runtime export and namespace aliases', () => {
    expect(Field.Root).toBe(FieldRootElement);
    expect(Field.Label).toBeDefined();
    expect(Field.Control).toBe(FieldControlElement);
    expect(Field.Description).toBeDefined();
    expect(Field.Error).toBeDefined();
    expect(Field.Validity).toBeDefined();
    expect(Field.Item).toBeDefined();

    expectTypeOf<FieldRoot.Props>().toEqualTypeOf<FieldRootProps>();
    expectTypeOf<FieldRoot.Actions>().toEqualTypeOf<FieldRootActions>();
    expectTypeOf<FieldRoot.State>().toEqualTypeOf<FieldRootState>();
    expectTypeOf<FieldLabel.Props>().toEqualTypeOf<FieldLabelProps>();
    expectTypeOf<FieldLabel.State>().toEqualTypeOf<FieldLabelState>();
    expectTypeOf<FieldDescription.Props>().toEqualTypeOf<FieldDescriptionProps>();
    expectTypeOf<FieldDescription.State>().toEqualTypeOf<FieldDescriptionState>();
    expectTypeOf<FieldError.Props>().toEqualTypeOf<FieldErrorProps>();
    expectTypeOf<FieldError.State>().toEqualTypeOf<FieldErrorState>();
    expectTypeOf<FieldControl.Props>().toEqualTypeOf<FieldControlProps>();
    expectTypeOf<FieldControl.State>().toEqualTypeOf<FieldControlState>();
    expectTypeOf<FieldControl.ChangeEventDetails>().toEqualTypeOf<FieldControlChangeEventDetails>();
    expectTypeOf<FieldValidity.Props>().toEqualTypeOf<FieldValidityProps>();
    expectTypeOf<FieldValidity.State>().toEqualTypeOf<FieldValidityState>();
    expectTypeOf<FieldItem.Props>().toEqualTypeOf<FieldItemProps>();
    expectTypeOf<FieldItem.State>().toEqualTypeOf<FieldItemState>();
  });

  it('renders field-root as a custom element', async () => {
    const view = render(html`<field-root></field-root>`);
    await flushUpdates();

    const root = view.querySelector('field-root') as FieldRootElement;
    expect(root).toBeInTheDocument();
    expect(root).toHaveAttribute('data-base-ui-field-root');
  });

  it('field-control creates an input, applies defaultValue, and emits value changes', async () => {
    const handleValueChange = vi.fn();
    const view = render(html`
      <field-root>
        <field-control
          .defaultValue=${'initial'}
          .onValueChange=${handleValueChange}
        ></field-control>
      </field-root>
    `);
    await flushUpdates();

    const input = view.querySelector('input') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.id).not.toBe('');
    expect(input.value).toBe('initial');

    input.value = 'updated';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await flushUpdates();

    expect(handleValueChange).toHaveBeenCalledTimes(1);
    expect(handleValueChange.mock.calls[0]?.[0]).toBe('updated');
    expect(handleValueChange.mock.calls[0]?.[1]).toMatchObject({
      reason: 'none',
      trigger: input,
    });
  });

  it('forwards styling and native input attributes from field-control to the generated input', async () => {
    const view = render(html`
      <field-root>
        <field-control
          class="hero-input"
          placeholder="Required"
          required
          style="color: red;"
          type="email"
        ></field-control>
      </field-root>
    `);
    await flushUpdates();

    const input = view.querySelector('input') as HTMLInputElement;
    const control = view.querySelector('field-control') as HTMLElement;
    expect(control).not.toHaveAttribute('class');
    expect(input).toHaveClass('hero-input');
    expect(input).toHaveAttribute('placeholder', 'Required');
    expect(input).toHaveAttribute('required');
    expect(input).toHaveAttribute('type', 'email');
    expect(input).toHaveStyle({ color: 'rgb(255, 0, 0)' });
    expect(input).not.toHaveStyle({ display: 'contents' });
  });

  it('field-label focuses the control when clicked', async () => {
    const view = render(html`
      <field-root>
        <field-control></field-control>
        <field-label>Label</field-label>
      </field-root>
    `);
    await flushUpdates();

    const label = view.querySelector('field-label') as HTMLElement;
    const input = view.querySelector('input') as HTMLInputElement;

    label.click();
    await flushUpdates();

    expect(input).toHaveFocus();
  });

  it('field-description applies aria-describedby to the control automatically', async () => {
    const view = render(html`
      <field-root>
        <field-control></field-control>
        <field-description>Visible on your profile</field-description>
      </field-root>
    `);
    await flushUpdates();

    const input = view.querySelector('input') as HTMLInputElement;
    const description = view.querySelector('field-description') as HTMLElement;

    expect(description.id).not.toBe('');
    expect(input).toHaveAttribute('aria-describedby', description.id);
  });

  it('shows error content after submit validation and wires aria-describedby', async () => {
    const view = render(html`
      <form>
        <field-root .validate=${() => 'Required'}>
          <field-control></field-control>
          <field-error></field-error>
        </field-root>
      </form>
    `);
    await flushUpdates();

    const form = view.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await flushUpdates();

    const input = view.querySelector('input') as HTMLInputElement;
    const error = view.querySelector('field-error') as HTMLElement;

    expect(error).not.toHaveAttribute('hidden');
    expect(error).toHaveTextContent('Required');
    expect(error.id).not.toBe('');
    expect(input).toHaveAttribute('aria-describedby', error.id);
    expect(error).toHaveAttribute('data-invalid', '');
  });

  it('shows authored field-error content when match=true', async () => {
    const view = render(html`
      <field-root>
        <field-control required></field-control>
        <field-error match>Message</field-error>
      </field-root>
    `);
    await flushUpdates();

    const error = view.querySelector('field-error') as HTMLElement;
    expect(error).not.toHaveAttribute('hidden');
    expect(error).toHaveTextContent('Message');
  });

  it('only renders a matched error for the active validity state', async () => {
    const view = render(html`
      <form>
        <field-root>
          <field-control required minlength="2"></field-control>
          <field-error match="valueMissing">Message</field-error>
        </field-root>
      </form>
    `);
    await flushUpdates();

    const form = view.querySelector('form') as HTMLFormElement;
    const input = view.querySelector('input') as HTMLInputElement;
    const error = view.querySelector('field-error') as HTMLElement;

    expect(error).toHaveAttribute('hidden');

    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await flushUpdates();
    expect(error).not.toHaveAttribute('hidden');
    expect(error).toHaveTextContent('Message');

    input.value = 'a';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await flushUpdates();
    expect(error).toHaveAttribute('hidden');

    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await flushUpdates();
    expect(error).not.toHaveAttribute('hidden');
    expect(error).toHaveTextContent('Message');
  });

  it('renders a custom-error match after native validation has passed', async () => {
    const view = render(html`
      <form>
        <field-root .validate=${() => 'error'}>
          <field-control></field-control>
          <field-error match="customError">Message</field-error>
        </field-root>
      </form>
    `);
    await flushUpdates();

    const form = view.querySelector('form') as HTMLFormElement;
    const error = view.querySelector('field-error') as HTMLElement;

    expect(error).toHaveAttribute('hidden');

    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await flushUpdates();
    expect(error).not.toHaveAttribute('hidden');
    expect(error).toHaveTextContent('Message');
  });

  it('passes validity updates to the render callback', async () => {
    const handleValidity = vi.fn();
    const view = render(html`
      <field-root .validationMode=${'onBlur'} .validate=${() => ['one', 'two']}>
        <field-control></field-control>
        <field-validity .renderValidity=${handleValidity}></field-validity>
      </field-root>
    `);
    await flushUpdates();

    const input = view.querySelector('input') as HTMLInputElement;
    input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    await flushUpdates();

    expect(handleValidity).toHaveBeenCalled();
    const latestCall = handleValidity.mock.lastCall?.[0] as FieldValidityState;
    expect(latestCall.error).toBe('one');
    expect(latestCall.errors).toEqual(['one', 'two']);
    expect(latestCall).toHaveProperty('transitionStatus');
  });

  it('applies touched, dirty, filled, and focused state hooks to field parts', async () => {
    const view = render(html`
      <field-root data-testid="root">
        <field-control data-testid="control"></field-control>
        <field-label data-testid="label">Name</field-label>
        <field-description data-testid="description">Description</field-description>
      </field-root>
    `);
    await flushUpdates();

    const root = view.querySelector('[data-testid="root"]') as HTMLElement;
    const control = view.querySelector('[data-testid="control"]') as HTMLElement;
    const label = view.querySelector('[data-testid="label"]') as HTMLElement;
    const description = view.querySelector('[data-testid="description"]') as HTMLElement;
    const input = view.querySelector('input') as HTMLInputElement;

    input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await flushUpdates();

    [root, control, label, description, input].forEach((element) => {
      expect(element).toHaveAttribute('data-focused', '');
    });

    input.value = 'value';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await flushUpdates();

    [root, control, label, description, input].forEach((element) => {
      expect(element).toHaveAttribute('data-dirty', '');
      expect(element).toHaveAttribute('data-filled', '');
    });

    input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    await flushUpdates();

    [root, control, label, description, input].forEach((element) => {
      expect(element).toHaveAttribute('data-touched', '');
      expect(element).not.toHaveAttribute('data-focused');
    });
  });

  it('supports controlled dirty and touched state props', async () => {
    const view = render(html`
      <field-root .dirty=${true} .touched=${true}>
        <field-control data-testid="control"></field-control>
        <field-label data-testid="label">Name</field-label>
        <field-description data-testid="description">Description</field-description>
      </field-root>
    `);
    await flushUpdates();

    const elements = [
      view.querySelector('field-root'),
      view.querySelector('[data-testid="control"]'),
      view.querySelector('[data-testid="label"]'),
      view.querySelector('[data-testid="description"]'),
    ];

    elements.forEach((element) => {
      expect(element).toHaveAttribute('data-dirty', '');
      expect(element).toHaveAttribute('data-touched', '');
    });
  });

  it('validates the field when actionsRef.validate is called', async () => {
    const actionsRef: { current: FieldRootActions | null } = { current: null };
    const view = render(html`
      <field-root .actionsRef=${actionsRef} .validate=${() => 'Required'}>
        <field-control .defaultValue=${''}></field-control>
        <field-error data-testid="error"></field-error>
      </field-root>
    `);
    await flushUpdates();

    const error = view.querySelector('[data-testid="error"]') as HTMLElement;
    expect(error).toHaveAttribute('hidden');

    actionsRef.current?.validate();
    await flushUpdates();

    expect(error).not.toHaveAttribute('hidden');
    expect(error).toHaveTextContent('Required');
  });

  it('does not run validate by default when the field is outside a form', async () => {
    const validate = vi.fn(() => 'error');
    const view = render(html`
      <field-root .validate=${validate}>
        <field-control></field-control>
        <field-error></field-error>
      </field-root>
    `);
    await flushUpdates();

    const input = view.querySelector('input') as HTMLInputElement;

    input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    input.value = 'abc';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    await flushUpdates();

    expect(validate).not.toHaveBeenCalled();
    expect(view.querySelector('field-error')).toHaveAttribute('hidden');
  });

  it('runs custom validation after native validation on revalidation', async () => {
    const view = render(html`
      <form>
        <field-root .validate=${(value: unknown) => (value === 'ab' ? 'custom error' : null)}>
          <field-control required></field-control>
          <field-error match="valueMissing">value missing</field-error>
          <field-error match="customError"></field-error>
        </field-root>
      </form>
    `);
    await flushUpdates();

    const form = view.querySelector('form') as HTMLFormElement;
    const input = view.querySelector('input') as HTMLInputElement;
    const errors = Array.from(view.querySelectorAll('field-error'));

    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await flushUpdates();

    expect(errors[0]).not.toHaveAttribute('hidden');
    expect(errors[0]).toHaveTextContent('value missing');
    expect(errors[1]).toHaveAttribute('hidden');

    input.value = 'ab';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await flushUpdates();

    expect(errors[0]).toHaveAttribute('hidden');
    expect(errors[1]).not.toHaveAttribute('hidden');
    expect(errors[1]).toHaveTextContent('custom error');

    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await flushUpdates();

    expect(errors[0]).not.toHaveAttribute('hidden');
  });

  it('applies aria-invalid to the generated input once validation finishes', async () => {
    const view = render(html`
      <form>
        <field-root .validate=${() => 'error'}>
          <field-control></field-control>
          <field-error></field-error>
        </field-root>
      </form>
    `);
    await flushUpdates();

    const form = view.querySelector('form') as HTMLFormElement;
    const input = view.querySelector('input') as HTMLInputElement;

    expect(input).not.toHaveAttribute('aria-invalid');

    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await flushUpdates();

    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('passes form values to validate as the second argument', async () => {
    const validate = vi.fn(() => null);
    const view = render(html`
      <form>
        <field-root .name=${'first'}>
          <field-control .defaultValue=${'one'}></field-control>
        </field-root>
        <field-root .name=${'second'} .validate=${validate}>
          <field-control .defaultValue=${'two'}></field-control>
        </field-root>
      </form>
    `);
    await flushUpdates();

    const form = view.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await flushUpdates();

    expect(validate).toHaveBeenCalledTimes(1);
    expect(validate.mock.calls[0]?.[1]).toEqual({
      first: 'one',
      second: 'two',
    });
  });

  it('blocks interaction inside a disabled field-item', async () => {
    const view = render(html`
      <field-root>
        <field-item disabled>
          <checkbox-root></checkbox-root>
        </field-item>
        <checkbox-root data-testid="allowed"></checkbox-root>
      </field-root>
    `);
    await flushUpdates();

    const blocked = view.querySelector('field-item checkbox-root') as HTMLElement;
    const allowed = view.querySelector('[data-testid="allowed"]') as HTMLElement;

    blocked.click();
    await flushUpdates();
    expect(blocked).toHaveAttribute('aria-checked', 'false');

    allowed.click();
    await flushUpdates();
    expect(allowed).toHaveAttribute('aria-checked', 'true');
  });

  it('inherits disabled state from a surrounding fieldset', async () => {
    const view = render(html`
      <fieldset-root .disabled=${true}>
        <field-root>
          <field-control></field-control>
        </field-root>
      </fieldset-root>
    `);
    await flushUpdates();

    const field = view.querySelector('field-root') as FieldRootElement;
    expect(field).toHaveAttribute('data-disabled');
  });
});
