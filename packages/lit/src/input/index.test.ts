/* eslint-disable testing-library/render-result-naming-convention */
import { html, nothing, render as renderTemplate, type TemplateResult } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import { Input } from '@base-ui/lit/input';
import type { BaseUIChangeEventDetails } from '@base-ui/lit/types';

describe('Input', () => {
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

  async function flushMicrotasks() {
    await Promise.resolve();
  }

  it('preserves the public type contracts', () => {
    const input = Input({});

    expectTypeOf(input).toEqualTypeOf<TemplateResult>();
    expectTypeOf<Input.Props['value']>().toEqualTypeOf<
      string | number | readonly string[] | undefined
    >();
    expectTypeOf<Input.Props['defaultValue']>().toEqualTypeOf<
      string | number | readonly string[] | undefined
    >();
    expectTypeOf<Input.Props['onValueChange']>().toEqualTypeOf<
      ((value: string, eventDetails: BaseUIChangeEventDetails<'none'>) => void) | undefined
    >();
    expectTypeOf<Input.State['disabled']>().toEqualTypeOf<boolean>();
    expectTypeOf<Input.State['valid']>().toEqualTypeOf<boolean | null>();
    expectTypeOf<Input.ChangeEventReason>().toEqualTypeOf<'none'>();
    expectTypeOf<Input.ChangeEventDetails>().toEqualTypeOf<BaseUIChangeEventDetails<'none'>>();
  });

  it('renders a native input by default', () => {
    const container = render(Input({ placeholder: 'Enter your name' }));
    const input = container.querySelector('input');

    expect(input).toBeVisible();
    expect(input).toHaveAttribute('placeholder', 'Enter your name');
  });

  it('applies disabled semantics and the data-disabled state hook', () => {
    const container = render(Input({ disabled: true }));
    const input = container.querySelector('input');

    expect(input).toHaveAttribute('disabled');
    expect(input).toHaveAttribute('data-disabled', '');
    expect(input).not.toHaveAttribute('data-focused');
  });

  it('calls onChange and onValueChange from the native input event', () => {
    const handleChange = vi.fn();
    const handleValueChange = vi.fn();
    const container = render(
      Input({
        onChange: handleChange,
        onValueChange: handleValueChange,
      }),
    );
    const input = container.querySelector('input') as HTMLInputElement;

    input.value = 'Alice';
    const event = new InputEvent('input', { bubbles: true });
    input.dispatchEvent(event);

    expect(handleChange).toHaveBeenCalledOnce();
    expect(handleChange.mock.calls[0]?.[0]).toBe(event);
    expect(handleValueChange).toHaveBeenCalledOnce();
    expect(handleValueChange).toHaveBeenCalledWith(
      'Alice',
      expect.objectContaining({
        event,
        reason: 'none',
        trigger: input,
      }),
    );
  });

  it('prevents internal focus and blur state handling when preventBaseUIHandler() is called', async () => {
    const container = render(
      Input({
        onBlur(event) {
          event.preventBaseUIHandler();
        },
        onFocus(event) {
          event.preventBaseUIHandler();
        },
      }),
    );
    const input = container.querySelector('input') as HTMLInputElement;

    input.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
    await flushMicrotasks();

    expect(input).not.toHaveAttribute('data-focused');

    input.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    await flushMicrotasks();

    expect(input).not.toHaveAttribute('data-touched');
  });

  it('updates state data attributes as the input state changes', async () => {
    const container = render(
      Input({
        defaultValue: '',
        required: true,
      }),
    );
    const input = container.querySelector('input') as HTMLInputElement;

    expect(input).not.toHaveAttribute('data-focused');
    expect(input).not.toHaveAttribute('data-filled');
    expect(input).not.toHaveAttribute('data-dirty');
    expect(input).not.toHaveAttribute('data-touched');

    input.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
    await flushMicrotasks();

    expect(input).toHaveAttribute('data-focused', '');
    expect(input).toHaveAttribute('data-invalid', '');

    input.value = 'Alice';
    input.dispatchEvent(new InputEvent('input', { bubbles: true }));
    await flushMicrotasks();

    expect(input).toHaveAttribute('data-focused', '');
    expect(input).toHaveAttribute('data-filled', '');
    expect(input).toHaveAttribute('data-dirty', '');
    expect(input).toHaveAttribute('data-valid', '');
    expect(input).not.toHaveAttribute('data-invalid');

    input.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    await flushMicrotasks();

    expect(input).not.toHaveAttribute('data-focused');
    expect(input).toHaveAttribute('data-touched', '');
  });

  it('preserves controlled value semantics until the parent rerenders', () => {
    const handleValueChange = vi.fn();
    const container = render(
      Input({
        value: 'Alice',
        onValueChange: handleValueChange,
      }),
    );
    const input = container.querySelector('input') as HTMLInputElement;

    expect(input.value).toBe('Alice');

    input.value = 'Alicia';
    input.dispatchEvent(new InputEvent('input', { bubbles: true }));

    expect(handleValueChange).toHaveBeenCalledWith(
      'Alicia',
      expect.objectContaining({ reason: 'none' }),
    );
    expect(input.value).toBe('Alice');
  });

  it('prevents internal input handling when preventBaseUIHandler() is called', async () => {
    const handleValueChange = vi.fn();
    const container = render(
      Input({
        value: 'Alice',
        onChange(event) {
          event.preventBaseUIHandler();
        },
        onValueChange: handleValueChange,
      }),
    );
    const input = container.querySelector('input') as HTMLInputElement;

    await flushMicrotasks();

    input.value = 'Alicia';
    input.dispatchEvent(new InputEvent('input', { bubbles: true }));
    await flushMicrotasks();

    expect(handleValueChange).not.toHaveBeenCalled();
    expect(input.value).toBe('Alicia');
    expect(input).not.toHaveAttribute('data-dirty');
    expect(input).toHaveAttribute('data-filled', '');
  });

  it('supports replacing the element with a static textarea template', async () => {
    const ref = { current: null as HTMLElement | null };
    const handleValueChange = vi.fn();
    const container = render(
      Input({
        ref,
        render: html`<textarea></textarea>`,
        onValueChange: handleValueChange,
      }),
    );

    await flushMicrotasks();

    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;

    textarea.value = 'Notes';
    const event = new InputEvent('input', { bubbles: true });
    textarea.dispatchEvent(event);
    await flushMicrotasks();

    expect(ref.current).toBe(textarea);
    expect(handleValueChange).toHaveBeenCalledWith(
      'Notes',
      expect.objectContaining({
        event,
        trigger: textarea,
      }),
    );
  });

  it('passes the merged props and state to render callbacks', () => {
    const container = render(
      Input({
        className: 'custom-input',
        defaultValue: 'Alice',
        render(props, state) {
          return html`<textarea
            class=${String(props.className)}
            ?disabled=${Boolean(props.disabled)}
            data-disabled=${state.disabled ? '' : nothing}
            data-filled=${state.filled ? '' : nothing}
          ></textarea>`;
        },
      }),
    );
    const textarea = container.querySelector('textarea');

    expect(textarea).toHaveClass('custom-input');
    expect(textarea).not.toHaveAttribute('disabled');
    expect(textarea).toHaveAttribute('data-filled', '');
  });

  it('passes onChange through the render callback props', () => {
    const handleChange = vi.fn();
    const container = render(
      Input({
        onChange: handleChange,
        render(props) {
          return html`<textarea @input=${props.onChange}></textarea>`;
        },
      }),
    );
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;

    const event = new InputEvent('input', { bubbles: true });
    textarea.dispatchEvent(event);

    expect(handleChange).toHaveBeenCalledOnce();
    expect(handleChange.mock.calls[0]?.[0]).toBe(event);
  });
});
