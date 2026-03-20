import { html, nothing, render as renderTemplate } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import './index.ts';
import type { InputRootElement } from './index.ts';

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
    await new Promise((r) => setTimeout(r, 0));
  }

  it('renders input-root with a native input child', () => {
    const container = render(html`
      <input-root>
        <input placeholder="Enter your name" />
      </input-root>
    `);
    const root = container.querySelector('input-root') as InputRootElement;
    const input = container.querySelector('input') as HTMLInputElement;

    expect(root).toBeInTheDocument();
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('placeholder', 'Enter your name');
  });

  it('applies disabled state and data-disabled attribute', async () => {
    const container = render(html`
      <input-root .disabled=${true}>
        <input />
      </input-root>
    `);
    await waitForUpdate();

    const input = container.querySelector('input') as HTMLInputElement;
    expect(input).toHaveAttribute('data-disabled');
  });

  it('calls onValueChange when input value changes', () => {
    const handleValueChange = vi.fn();
    const container = render(html`
      <input-root .onValueChange=${handleValueChange}>
        <input />
      </input-root>
    `);
    const input = container.querySelector('input') as HTMLInputElement;

    input.value = 'Alice';
    const event = new InputEvent('input', { bubbles: true });
    input.dispatchEvent(event);

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

  it('tracks focus and blur state with data attributes', async () => {
    const container = render(html`
      <input-root>
        <input />
      </input-root>
    `);
    const input = container.querySelector('input') as HTMLInputElement;

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
    const container = render(html`
      <input-root>
        <input />
      </input-root>
    `);
    const input = container.querySelector('input') as HTMLInputElement;

    expect(input).not.toHaveAttribute('data-dirty');
    expect(input).not.toHaveAttribute('data-filled');

    input.value = 'Alice';
    input.dispatchEvent(new InputEvent('input', { bubbles: true }));
    await waitForUpdate();

    expect(input).toHaveAttribute('data-dirty');
    expect(input).toHaveAttribute('data-filled');
  });

  it('tracks validity state with data-valid and data-invalid', async () => {
    const container = render(html`
      <input-root>
        <input required />
      </input-root>
    `);
    await waitForUpdate();

    const input = container.querySelector('input') as HTMLInputElement;

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
    const container = render(html`
      <input-root .value=${'Alice'} .onValueChange=${handleValueChange}>
        <input />
      </input-root>
    `);
    const input = container.querySelector('input') as HTMLInputElement;

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

  it('works with textarea elements', async () => {
    const handleValueChange = vi.fn();
    const container = render(html`
      <input-root .onValueChange=${handleValueChange}>
        <textarea></textarea>
      </input-root>
    `);
    await waitForUpdate();

    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;

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
    const container = render(html`
      <input-root>
        <input />
      </input-root>
    `);
    const root = container.querySelector('input-root') as InputRootElement;
    expect(root.style.display).toBe('contents');
  });

  it('cleans up event listeners on disconnect', async () => {
    const handleValueChange = vi.fn();
    const container = render(html`
      <input-root .onValueChange=${handleValueChange}>
        <input />
      </input-root>
    `);
    const input = container.querySelector('input') as HTMLInputElement;

    const root = container.querySelector('input-root') as InputRootElement;
    root.remove();

    input.value = 'test';
    input.dispatchEvent(new InputEvent('input', { bubbles: true }));

    // Should not fire after disconnect
    expect(handleValueChange).not.toHaveBeenCalled();
  });

  it('reports initial state via getState()', async () => {
    const container = render(html`
      <input-root>
        <input />
      </input-root>
    `);
    await waitForUpdate();

    const root = container.querySelector('input-root') as InputRootElement;
    const state = root.getState();

    expect(state.disabled).toBe(false);
    expect(state.touched).toBe(false);
    expect(state.dirty).toBe(false);
    expect(state.filled).toBe(false);
    expect(state.focused).toBe(false);
  });
});
