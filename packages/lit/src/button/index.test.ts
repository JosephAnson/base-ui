import { html, nothing, render as renderTemplate } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import './index';
import type { ButtonRoot, ButtonRootElement, ButtonRootProps, ButtonRootState } from './index';

describe('button-root', () => {
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
      setTimeout(resolve, 0);
    });
  }

  it('exposes namespace aliases for props and state', () => {
    expectTypeOf<ButtonRootProps>().toEqualTypeOf<ButtonRoot.Props>();
    expectTypeOf<ButtonRootState>().toEqualTypeOf<ButtonRoot.State>();
  });

  it('renders as a custom element in the DOM', () => {
    const view = render(html`<button-root>Click me</button-root>`);
    const button = view.querySelector('button-root');
    expect(button).toBeInTheDocument();
    expect(button?.textContent).toBe('Click me');
  });

  it('has role="button"', async () => {
    const view = render(html`<button-root></button-root>`);
    const button = view.querySelector('button-root')!;
    await waitForUpdate();
    expect(button).toHaveAttribute('role', 'button');
  });

  it('is focusable via tabindex', async () => {
    const view = render(html`<button-root></button-root>`);
    const button = view.querySelector('button-root')! as ButtonRootElement;
    await waitForUpdate();
    expect(button.tabIndex).toBe(0);
  });

  it('sets data-disabled when disabled', async () => {
    const view = render(html`<button-root disabled></button-root>`);
    const button = view.querySelector('button-root')!;
    await waitForUpdate();
    expect(button).toHaveAttribute('data-disabled');
  });

  it('sets aria-disabled and removes from tab order when disabled', async () => {
    const view = render(html`<button-root disabled></button-root>`);
    const button = view.querySelector('button-root')! as ButtonRootElement;
    await waitForUpdate();
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button.tabIndex).toBe(-1);
  });

  it('blocks click events when disabled', async () => {
    const handleClick = vi.fn();
    const view = render(html`<button-root disabled></button-root>`);
    const button = view.querySelector('button-root')! as ButtonRootElement;
    await waitForUpdate();

    button.addEventListener('click', handleClick);
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    expect(handleClick).not.toHaveBeenCalled();
  });

  it('handles Enter key to activate', async () => {
    const handleClick = vi.fn();
    const view = render(html`<button-root></button-root>`);
    const button = view.querySelector('button-root')! as ButtonRootElement;
    await waitForUpdate();

    button.addEventListener('click', handleClick);
    button.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter' }),
    );

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('handles Space key to activate', async () => {
    const handleClick = vi.fn();
    const view = render(html`<button-root></button-root>`);
    const button = view.querySelector('button-root')! as ButtonRootElement;
    await waitForUpdate();

    button.addEventListener('click', handleClick);
    button.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: ' ' }),
    );
    button.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, cancelable: true, key: ' ' }));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('remains focusable when disabled with focusableWhenDisabled', async () => {
    const view = render(html`<button-root disabled focusable-when-disabled></button-root>`);
    const button = view.querySelector('button-root')! as ButtonRootElement;
    await waitForUpdate();

    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button.tabIndex).toBe(0);
    expect(button).toHaveAttribute('data-disabled');
  });

  it('prevents non-tab key interactions when focusableWhenDisabled', async () => {
    const handleKeyDown = vi.fn();
    const view = render(html`<button-root disabled focusable-when-disabled></button-root>`);
    const button = view.querySelector('button-root')! as ButtonRootElement;
    await waitForUpdate();

    button.addEventListener('keydown', handleKeyDown);
    const enterEvent = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'Enter',
    });
    button.dispatchEvent(enterEvent);
    expect(enterEvent.defaultPrevented).toBe(true);
    expect(handleKeyDown).not.toHaveBeenCalled();
  });

  it('blocks pointer and mouse interactions when disabled', async () => {
    const handleMouseDown = vi.fn();
    const handlePointerDown = vi.fn();
    const view = render(html`<button-root disabled></button-root>`);
    const button = view.querySelector('button-root')! as ButtonRootElement;
    await waitForUpdate();

    button.addEventListener('mousedown', handleMouseDown);
    button.addEventListener('pointerdown', handlePointerDown);
    button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    button.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));

    expect(handleMouseDown).not.toHaveBeenCalled();
    expect(handlePointerDown).not.toHaveBeenCalled();
  });

  it('updates when disabled property changes', async () => {
    const view = render(html`<button-root></button-root>`);
    const button = view.querySelector('button-root')! as ButtonRootElement;
    await waitForUpdate();

    expect(button).not.toHaveAttribute('data-disabled');

    button.disabled = true;
    await waitForUpdate();

    expect(button).toHaveAttribute('data-disabled');
    expect(button).toHaveAttribute('aria-disabled', 'true');
  });
});
