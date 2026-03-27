import { html, nothing, render as renderTemplate } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import './index';
import {
  Input,
  InputRootElement,
  type Input,
  type InputChangeEventDetails,
  type InputChangeEventReason,
  type InputProps,
  type InputRoot,
  type InputRootProps,
  type InputState,
} from './index';

describe('input', () => {
  const containers = new Set<HTMLDivElement>();

  afterEach(() => {
    containers.forEach((container) => {
      renderTemplate(nothing, container);
      container.remove();
    });
    containers.clear();
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
      setTimeout(() => resolve(), 0);
    });
  }

  it('exposes input and input-root namespace aliases', () => {
    expectTypeOf<InputProps>().toEqualTypeOf<Input.Props>();
    expectTypeOf<InputState>().toEqualTypeOf<Input.State>();
    expectTypeOf<InputChangeEventReason>().toEqualTypeOf<Input.ChangeEventReason>();
    expectTypeOf<InputChangeEventDetails>().toEqualTypeOf<Input.ChangeEventDetails>();
    expectTypeOf<InputRootProps>().toEqualTypeOf<InputRoot.Props>();
    expectTypeOf<InputState>().toEqualTypeOf<InputRoot.State>();
    expectTypeOf<InputChangeEventReason>().toEqualTypeOf<InputRoot.ChangeEventReason>();
    expectTypeOf<InputChangeEventDetails>().toEqualTypeOf<InputRoot.ChangeEventDetails>();
  });

  it('renders a native input by default from the helper', async () => {
    const view = render(html`${Input({ placeholder: 'Enter your name' })}`);
    await waitForUpdate();

    const input = view.querySelector('input') as HTMLInputElement;

    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('placeholder', 'Enter your name');
  });

  it('supports rendering a textarea from the helper and assigns refs', async () => {
    const ref = { current: null as HTMLTextAreaElement | null };
    const view = render(html`${Input({ ref, render: html`<textarea></textarea>` })}`);
    await waitForUpdate();

    const textarea = view.querySelector('textarea') as HTMLTextAreaElement;

    expect(textarea).toBeInTheDocument();
    expect(ref.current).toBe(textarea);
  });

  it('calls onValueChange when helper input value changes', async () => {
    const handleValueChange = vi.fn();
    const view = render(html`${Input({ onValueChange: handleValueChange })}`);
    await waitForUpdate();

    const input = view.querySelector('input') as HTMLInputElement;
    input.value = 'Alice';
    const event = new InputEvent('input', { bubbles: true });
    input.dispatchEvent(event);

    expect(handleValueChange).toHaveBeenCalledOnce();
    expect(handleValueChange).toHaveBeenCalledWith(
      'Alice',
      expect.objectContaining({
        event,
        isCanceled: false,
        isPropagationAllowed: false,
        reason: 'none',
        trigger: input,
      }),
    );
  });

  it('preserves the controlled helper value after input', async () => {
    const handleValueChange = vi.fn();
    const view = render(html`${Input({ value: 'Alice', onValueChange: handleValueChange })}`);
    await waitForUpdate();

    const input = view.querySelector('input') as HTMLInputElement;

    expect(input.value).toBe('Alice');

    input.value = 'Alicia';
    input.dispatchEvent(new InputEvent('input', { bubbles: true }));

    expect(handleValueChange).toHaveBeenCalledWith(
      'Alicia',
      expect.objectContaining({ reason: 'none' }),
    );
    expect(input.value).toBe('Alice');
    expect(input).toHaveAttribute('data-filled');
    expect(input).not.toHaveAttribute('data-dirty');
  });

  it('supports defaultValue on the helper', async () => {
    const view = render(html`${Input({ defaultValue: 'Default email' })}`);
    await waitForUpdate();

    const input = view.querySelector('input') as HTMLInputElement;

    expect(input.value).toBe('Default email');
    expect(input).toHaveAttribute('data-filled');
  });

  it('applies disabled helper state to the rendered control', async () => {
    const view = render(html`${Input({ disabled: true })}`);
    await waitForUpdate();

    const input = view.querySelector('input') as HTMLInputElement;

    expect(input.disabled).toBe(true);
    expect(input).toHaveAttribute('data-disabled');
  });

  it('tracks focus, touch, dirty, filled, and validity on the helper control', async () => {
    const view = render(html`${Input({ required: true })}`);
    await waitForUpdate();

    const input = view.querySelector('input') as HTMLInputElement;

    expect(input).not.toHaveAttribute('data-focused');
    expect(input).not.toHaveAttribute('data-touched');

    input.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
    await waitForUpdate();

    expect(input).toHaveAttribute('data-focused');
    expect(input).toHaveAttribute('data-invalid');

    input.value = 'Alice';
    input.dispatchEvent(new InputEvent('input', { bubbles: true }));
    await waitForUpdate();

    expect(input).toHaveAttribute('data-dirty');
    expect(input).toHaveAttribute('data-filled');
    expect(input).toHaveAttribute('data-valid');
    expect(input).not.toHaveAttribute('data-invalid');

    input.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    await waitForUpdate();

    expect(input).not.toHaveAttribute('data-focused');
    expect(input).toHaveAttribute('data-touched');
  });

  it('supports textarea rendering from the low-level root element', async () => {
    const handleValueChange = vi.fn();
    const view = render(html`
      <input-root .onValueChange=${handleValueChange}>
        <textarea></textarea>
      </input-root>
    `);
    await waitForUpdate();

    const textarea = view.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = 'Notes';
    const event = new InputEvent('input', { bubbles: true });
    textarea.dispatchEvent(event);

    expect(handleValueChange).toHaveBeenCalledWith(
      'Notes',
      expect.objectContaining({
        event,
        trigger: textarea,
      }),
    );
  });

  it('uses display:contents on the low-level root element', () => {
    const view = render(html`
      <input-root>
        <input />
      </input-root>
    `);
    const root = view.querySelector('input-root') as InputRootElement;

    expect(root.style.display).toBe('contents');
  });

  it('cleans up low-level root listeners on disconnect', () => {
    const handleValueChange = vi.fn();
    const view = render(html`
      <input-root .onValueChange=${handleValueChange}>
        <input />
      </input-root>
    `);
    const input = view.querySelector('input') as HTMLInputElement;
    const root = view.querySelector('input-root') as InputRootElement;

    root.remove();

    input.value = 'test';
    input.dispatchEvent(new InputEvent('input', { bubbles: true }));

    expect(handleValueChange).not.toHaveBeenCalled();
  });
});
