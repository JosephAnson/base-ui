import { html, nothing, render as renderTemplate } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import './index';
import {
  Input,
  InputRootElement,
  type InputChangeEventDetails,
  type InputChangeEventReason,
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

  it('exposes the runtime input export and namespace aliases', () => {
    expect(Input).toBe(InputRootElement);
    expectTypeOf<InputRootProps>().toEqualTypeOf<InputRoot.Props>();
    expectTypeOf<InputState>().toEqualTypeOf<InputRoot.State>();
    expectTypeOf<InputChangeEventReason>().toEqualTypeOf<InputRoot.ChangeEventReason>();
    expectTypeOf<InputChangeEventDetails>().toEqualTypeOf<InputRoot.ChangeEventDetails>();
  });

  it('renders input-root with a native input child', () => {
    const view = render(html`
      <input-root>
        <input placeholder="Enter your name" />
      </input-root>
    `);
    const root = view.querySelector('input-root') as InputRootElement;
    const input = view.querySelector('input') as HTMLInputElement;

    expect(root).toBeInTheDocument();
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('placeholder', 'Enter your name');
  });

  it('applies disabled state and data-disabled attribute', async () => {
    const view = render(html`
      <input-root .disabled=${true}>
        <input />
      </input-root>
    `);
    await waitForUpdate();

    const input = view.querySelector('input') as HTMLInputElement;
    expect(input.disabled).toBe(true);
    expect(input).toHaveAttribute('data-disabled');
  });

  it('calls onValueChange when input value changes', () => {
    const handleValueChange = vi.fn();
    const view = render(html`
      <input-root .onValueChange=${handleValueChange}>
        <input />
      </input-root>
    `);
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

  it('tracks focus and blur state with data attributes', async () => {
    const view = render(html`
      <input-root>
        <input />
      </input-root>
    `);
    const input = view.querySelector('input') as HTMLInputElement;

    expect(input).not.toHaveAttribute('data-focused');
    expect(input).not.toHaveAttribute('data-touched');

    input.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
    await waitForUpdate();
    expect(input).toHaveAttribute('data-focused');

    input.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    await waitForUpdate();
    expect(input).not.toHaveAttribute('data-focused');
    expect(input).toHaveAttribute('data-touched');
  });

  it('tracks dirty and filled state', async () => {
    const view = render(html`
      <input-root>
        <input />
      </input-root>
    `);
    const input = view.querySelector('input') as HTMLInputElement;

    expect(input).not.toHaveAttribute('data-dirty');
    expect(input).not.toHaveAttribute('data-filled');

    input.value = 'Alice';
    input.dispatchEvent(new InputEvent('input', { bubbles: true }));
    await waitForUpdate();

    expect(input).toHaveAttribute('data-dirty');
    expect(input).toHaveAttribute('data-filled');
  });

  it('tracks validity state with data-valid and data-invalid', async () => {
    const view = render(html`
      <input-root>
        <input required />
      </input-root>
    `);
    await waitForUpdate();

    const input = view.querySelector('input') as HTMLInputElement;

    // Focus to trigger state update
    input.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
    await waitForUpdate();

    expect(input).toHaveAttribute('data-invalid');

    input.value = 'Alice';
    input.dispatchEvent(new InputEvent('input', { bubbles: true }));
    await waitForUpdate();

    expect(input).toHaveAttribute('data-valid');
    expect(input).not.toHaveAttribute('data-invalid');
  });

  it('preserves controlled value after input', () => {
    const handleValueChange = vi.fn();
    const view = render(html`
      <input-root .value=${'Alice'} .onValueChange=${handleValueChange}>
        <input />
      </input-root>
    `);
    const input = view.querySelector('input') as HTMLInputElement;

    expect(input.value).toBe('Alice');

    input.value = 'Alicia';
    input.dispatchEvent(new InputEvent('input', { bubbles: true }));

    expect(handleValueChange).toHaveBeenCalledWith(
      'Alicia',
      expect.objectContaining({ reason: 'none' }),
    );
    // Value should be restored to controlled value
    expect(input.value).toBe('Alice');
  });

  it('supports defaultValue on the root element', async () => {
    const view = render(html`
      <input-root .defaultValue=${'Default email'}>
        <input />
      </input-root>
    `);
    await waitForUpdate();

    const input = view.querySelector('input') as HTMLInputElement;

    expect(input.value).toBe('Default email');
  });

  it('updates the rendered input when the controlled value changes', async () => {
    const view = render(html`
      <input-root .value=${'Alice'}>
        <input />
      </input-root>
    `);
    await waitForUpdate();

    const root = view.querySelector('input-root') as InputRootElement;
    const input = view.querySelector('input') as HTMLInputElement;

    expect(input.value).toBe('Alice');

    root.value = 'Bob';
    await waitForUpdate();

    expect(input.value).toBe('Bob');
    expect(root.getState().filled).toBe(true);
  });

  it('works with textarea elements', async () => {
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

  it('uses display:contents on the root element', () => {
    const view = render(html`
      <input-root>
        <input />
      </input-root>
    `);
    const root = view.querySelector('input-root') as InputRootElement;
    expect(root.style.display).toBe('contents');
  });

  it('cleans up event listeners on disconnect', async () => {
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

    // Should not fire after disconnect
    expect(handleValueChange).not.toHaveBeenCalled();
  });

  it('reports initial state via getState()', async () => {
    const view = render(html`
      <input-root>
        <input />
      </input-root>
    `);
    await waitForUpdate();

    const root = view.querySelector('input-root') as InputRootElement;
    const state = root.getState();

    expect(state.disabled).toBe(false);
    expect(state.touched).toBe(false);
    expect(state.dirty).toBe(false);
    expect(state.filled).toBe(false);
    expect(state.focused).toBe(false);
  });
});
