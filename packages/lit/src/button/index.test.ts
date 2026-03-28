import { html, nothing, render as renderTemplate, type TemplateResult } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import * as buttonModule from './index';

describe('button-root', () => {
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

  async function waitForUpdate() {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });
  }

  it('exposes namespace aliases for props and state', () => {
    expect(customElements.get('button-root')).toBe(buttonModule.ButtonRootElement);
    expectTypeOf<
      import('./index').ButtonRootProps
    >().toEqualTypeOf<buttonModule.ButtonRoot.Props>();
    expectTypeOf<
      import('./index').ButtonRootState
    >().toEqualTypeOf<buttonModule.ButtonRoot.State>();
    expectTypeOf<import('./index').ButtonProps>().toEqualTypeOf<buttonModule.Button.Props>();
    expectTypeOf<import('./index').ButtonState>().toEqualTypeOf<buttonModule.Button.State>();
  });

  it('button helper renders a native button by default', () => {
    const view = render(buttonModule.Button({}));
    const element = view.querySelector('button');

    expect(element).toBeInTheDocument();
    expect(element).toHaveAttribute('type', 'button');
    expect(element).not.toHaveAttribute('aria-disabled');
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
    const button = view.querySelector('button-root')! as buttonModule.ButtonRootElement;
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
    const button = view.querySelector('button-root')! as buttonModule.ButtonRootElement;
    await waitForUpdate();
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button.tabIndex).toBe(-1);
  });

  it('blocks click events when disabled', async () => {
    const handleClick = vi.fn();
    const view = render(html`<button-root disabled></button-root>`);
    const button = view.querySelector('button-root')! as buttonModule.ButtonRootElement;
    await waitForUpdate();

    button.addEventListener('click', handleClick);
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    expect(handleClick).not.toHaveBeenCalled();
  });

  it('handles Enter key to activate', async () => {
    const handleClick = vi.fn();
    const view = render(html`<button-root></button-root>`);
    const button = view.querySelector('button-root')! as buttonModule.ButtonRootElement;
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
    const button = view.querySelector('button-root')! as buttonModule.ButtonRootElement;
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
    const button = view.querySelector('button-root')! as buttonModule.ButtonRootElement;
    await waitForUpdate();

    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button.tabIndex).toBe(0);
    expect(button).toHaveAttribute('data-disabled');
  });

  it('prevents non-tab key interactions when focusableWhenDisabled', async () => {
    const handleKeyDown = vi.fn();
    const view = render(html`<button-root disabled focusable-when-disabled></button-root>`);
    const button = view.querySelector('button-root')! as buttonModule.ButtonRootElement;
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
    const button = view.querySelector('button-root')! as buttonModule.ButtonRootElement;
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
    const button = view.querySelector('button-root')! as buttonModule.ButtonRootElement;
    await waitForUpdate();

    expect(button).not.toHaveAttribute('data-disabled');

    button.disabled = true;
    await waitForUpdate();

    expect(button).toHaveAttribute('data-disabled');
    expect(button).toHaveAttribute('aria-disabled', 'true');
  });

  it('button helper mirrors submit-related attributes on native buttons', async () => {
    const view = render(buttonModule.Button({ type: 'submit', form: 'save-form', name: 'action' }));
    const element = view.querySelector('button');
    await waitForUpdate();

    expect(element).toHaveAttribute('type', 'submit');
    expect(element).toHaveAttribute('form', 'save-form');
    expect(element).toHaveAttribute('name', 'action');
  });

  it('button helper: disabled native button uses disabled and blocks interaction', async () => {
    const handleClick = vi.fn();
    const handleMouseDown = vi.fn();
    const handlePointerDown = vi.fn();
    const handleKeyDown = vi.fn();

    const view = render(
      buttonModule.Button({
        disabled: true,
        onClick: handleClick,
        onMouseDown: handleMouseDown,
        onPointerDown: handlePointerDown,
        onKeyDown: handleKeyDown,
      }),
    );
    const element = view.querySelector('button') as HTMLButtonElement;
    await waitForUpdate();

    expect(element).toHaveAttribute('disabled');
    expect(element).toHaveAttribute('data-disabled');
    expect(element).not.toHaveAttribute('aria-disabled');

    element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
    element.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: ' ' }),
    );
    element.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter' }),
    );

    expect(handleClick).not.toHaveBeenCalled();
    expect(handleMouseDown).not.toHaveBeenCalled();
    expect(handlePointerDown).not.toHaveBeenCalled();
    expect(handleKeyDown).not.toHaveBeenCalled();
  });

  it('button helper: disabled custom render uses aria-disabled and blocks interaction', async () => {
    const handleClick = vi.fn();
    const handleMouseDown = vi.fn();
    const handlePointerDown = vi.fn();
    const handleKeyDown = vi.fn();

    const view = render(
      buttonModule.Button({
        disabled: true,
        nativeButton: false,
        render: html`<span></span>`,
        onClick: handleClick,
        onMouseDown: handleMouseDown,
        onPointerDown: handlePointerDown,
        onKeyDown: handleKeyDown,
      }),
    );
    const element = view.querySelector('span') as HTMLSpanElement;
    await waitForUpdate();

    expect(element).not.toHaveAttribute('disabled');
    expect(element).toHaveAttribute('role', 'button');
    expect(element).toHaveAttribute('data-disabled');
    expect(element).toHaveAttribute('aria-disabled', 'true');
    expect(element).toHaveAttribute('tabindex', '-1');

    element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
    element.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: ' ' }),
    );
    element.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter' }),
    );

    expect(handleClick).not.toHaveBeenCalled();
    expect(handleMouseDown).not.toHaveBeenCalled();
    expect(handlePointerDown).not.toHaveBeenCalled();
    expect(handleKeyDown).not.toHaveBeenCalled();
  });

  it('button helper: focusableWhenDisabled keeps native button focusable and inert', async () => {
    const handleClick = vi.fn();
    const handleMouseDown = vi.fn();
    const handlePointerDown = vi.fn();
    const handleKeyDown = vi.fn();

    const view = render(
      buttonModule.Button({
        disabled: true,
        focusableWhenDisabled: true,
        onClick: handleClick,
        onMouseDown: handleMouseDown,
        onPointerDown: handlePointerDown,
        onKeyDown: handleKeyDown,
      }),
    );
    const element = view.querySelector('button') as HTMLButtonElement;
    await waitForUpdate();

    expect(element).not.toHaveAttribute('disabled');
    expect(element).toHaveAttribute('data-disabled');
    expect(element).toHaveAttribute('aria-disabled', 'true');
    expect(element).toHaveAttribute('tabindex', '0');

    element.focus();
    expect(element).toHaveFocus();

    element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
    element.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: ' ' }),
    );
    element.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter' }),
    );

    expect(handleClick).not.toHaveBeenCalled();
    expect(handleMouseDown).not.toHaveBeenCalled();
    expect(handlePointerDown).not.toHaveBeenCalled();
    expect(handleKeyDown).not.toHaveBeenCalled();
  });

  it('button helper: focusableWhenDisabled keeps custom render focusable and inert', async () => {
    const handleClick = vi.fn();
    const handleMouseDown = vi.fn();
    const handlePointerDown = vi.fn();
    const handleKeyDown = vi.fn();

    const view = render(
      buttonModule.Button({
        disabled: true,
        focusableWhenDisabled: true,
        nativeButton: false,
        render: html`<span></span>`,
        onClick: handleClick,
        onMouseDown: handleMouseDown,
        onPointerDown: handlePointerDown,
        onKeyDown: handleKeyDown,
      }),
    );
    const element = view.querySelector('span') as HTMLSpanElement;
    await waitForUpdate();

    expect(element).not.toHaveAttribute('disabled');
    expect(element).toHaveAttribute('data-disabled');
    expect(element).toHaveAttribute('aria-disabled', 'true');
    expect(element).toHaveAttribute('tabindex', '0');

    element.focus();
    expect(element).toHaveFocus();

    element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
    element.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: ' ' }),
    );
    element.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter' }),
    );

    expect(handleClick).not.toHaveBeenCalled();
    expect(handleMouseDown).not.toHaveBeenCalled();
    expect(handlePointerDown).not.toHaveBeenCalled();
    expect(handleKeyDown).not.toHaveBeenCalled();
  });
});
