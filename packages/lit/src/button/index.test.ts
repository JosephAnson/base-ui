/* eslint-disable testing-library/render-result-naming-convention */
import { html, nothing, render as renderTemplate, type TemplateResult } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import { Button } from '@base-ui/lit/button';

describe('Button', () => {
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

  async function flushMicrotasks() {
    await Promise.resolve();
  }

  it('preserves the public type contracts', () => {
    const button = Button({});

    expectTypeOf(button).toEqualTypeOf<TemplateResult>();
    expectTypeOf<Button.Props['focusableWhenDisabled']>().toEqualTypeOf<boolean | undefined>();
    expectTypeOf<Button.Props['nativeButton']>().toEqualTypeOf<boolean | undefined>();
    expectTypeOf<Button.State['disabled']>().toEqualTypeOf<boolean>();
  });

  it('renders a native button by default', () => {
    const container = render(Button({ children: 'Submit' }));
    const button = container.querySelector('button');

    expect(button).toBeVisible();
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveTextContent('Submit');
  });

  it('native button: uses the disabled attribute and suppresses interaction handlers', () => {
    const handleClick = vi.fn();
    const handleMouseDown = vi.fn();
    const handlePointerDown = vi.fn();
    const handleKeyDown = vi.fn();

    const container = render(
      Button({
        disabled: true,
        onClick: handleClick,
        onMouseDown: handleMouseDown,
        onPointerDown: handlePointerDown,
        onKeyDown: handleKeyDown,
      }),
    );
    const button = container.querySelector('button') as HTMLButtonElement;

    button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    button.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
    button.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: ' ' }),
    );
    button.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter' }),
    );

    expect(button).toHaveAttribute('disabled');
    expect(button).toHaveAttribute('data-disabled');
    expect(button).not.toHaveAttribute('aria-disabled');
    expect(handleClick).not.toHaveBeenCalled();
    expect(handleMouseDown).not.toHaveBeenCalled();
    expect(handlePointerDown).not.toHaveBeenCalled();
    expect(handleKeyDown).not.toHaveBeenCalled();
  });

  it('warns when nativeButton is true but the rendered element is not a button', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      Button({
        render: html`<span></span>`,
      }),
    );

    await flushMicrotasks();

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Base UI: A component that acts as a button expected a native <button> because the ' +
          '`nativeButton` prop is true.',
      ),
    );
  });

  it('warns when nativeButton is false but the rendered element is a button', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      Button({
        nativeButton: false,
        render: html`<button></button>`,
      }),
    );

    await flushMicrotasks();

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Base UI: A component that acts as a button expected a non-<button> because the ' +
          '`nativeButton` prop is false.',
      ),
    );
  });

  it('custom element: applies aria-disabled and is not focusable', () => {
    const handleClick = vi.fn();
    const handleMouseDown = vi.fn();
    const handlePointerDown = vi.fn();
    const handleKeyDown = vi.fn();

    const container = render(
      Button({
        disabled: true,
        nativeButton: false,
        render: html`<span></span>`,
        onClick: handleClick,
        onMouseDown: handleMouseDown,
        onPointerDown: handlePointerDown,
        onKeyDown: handleKeyDown,
      }),
    );
    const button = container.querySelector('[role="button"]') as HTMLElement;

    button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    button.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
    button.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: ' ' }),
    );
    button.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter' }),
    );

    expect(button).not.toHaveAttribute('disabled');
    expect(button).toHaveAttribute('data-disabled');
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button.tabIndex).toBe(-1);
    expect(handleClick).not.toHaveBeenCalled();
    expect(handleMouseDown).not.toHaveBeenCalled();
    expect(handlePointerDown).not.toHaveBeenCalled();
    expect(handleKeyDown).not.toHaveBeenCalled();
  });

  it('native button: prevents interactions but remains focusable when focusableWhenDisabled is true', () => {
    const handleClick = vi.fn();
    const handleMouseDown = vi.fn();
    const handlePointerDown = vi.fn();
    const handleKeyDown = vi.fn();

    const container = render(
      Button({
        disabled: true,
        focusableWhenDisabled: true,
        onClick: handleClick,
        onMouseDown: handleMouseDown,
        onPointerDown: handlePointerDown,
        onKeyDown: handleKeyDown,
      }),
    );
    const button = container.querySelector('button') as HTMLButtonElement;

    button.focus();
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    button.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
    button.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: ' ' }),
    );
    button.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter' }),
    );

    expect(button).not.toHaveAttribute('disabled');
    expect(button).toHaveAttribute('data-disabled');
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button.tabIndex).toBe(0);
    expect(document.activeElement).toBe(button);
    expect(handleClick).not.toHaveBeenCalled();
    expect(handleMouseDown).not.toHaveBeenCalled();
    expect(handlePointerDown).not.toHaveBeenCalled();
    expect(handleKeyDown).not.toHaveBeenCalled();
  });

  it('custom element: prevents interactions but remains focusable when focusableWhenDisabled is true', () => {
    const handleClick = vi.fn();
    const handleMouseDown = vi.fn();
    const handlePointerDown = vi.fn();
    const handleKeyDown = vi.fn();

    const container = render(
      Button({
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
    const button = container.querySelector('[role="button"]') as HTMLElement;

    button.focus();
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    button.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
    button.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: ' ' }),
    );
    button.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter' }),
    );

    expect(button).not.toHaveAttribute('disabled');
    expect(button).toHaveAttribute('data-disabled');
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button.tabIndex).toBe(0);
    expect(document.activeElement).toBe(button);
    expect(handleClick).not.toHaveBeenCalled();
    expect(handleMouseDown).not.toHaveBeenCalled();
    expect(handlePointerDown).not.toHaveBeenCalled();
    expect(handleKeyDown).not.toHaveBeenCalled();
  });

  it('adds keyboard activation semantics for custom elements', () => {
    const handleClick = vi.fn();
    const handleKeyDown = vi.fn();
    const handleKeyUp = vi.fn();

    const container = render(
      Button({
        nativeButton: false,
        render: html`<span></span>`,
        onClick: handleClick,
        onKeyDown: handleKeyDown,
        onKeyUp: handleKeyUp,
      }),
    );
    const button = container.querySelector('[role="button"]') as HTMLElement;
    const enterEvent = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'Enter',
    });
    const spaceDownEvent = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: ' ',
    });
    const spaceUpEvent = new KeyboardEvent('keyup', {
      bubbles: true,
      cancelable: true,
      key: ' ',
    });

    button.dispatchEvent(enterEvent);
    button.dispatchEvent(spaceDownEvent);
    button.dispatchEvent(spaceUpEvent);

    expect(handleKeyDown).toHaveBeenCalledTimes(2);
    expect(handleKeyUp).toHaveBeenCalledTimes(1);
    expect(handleClick).toHaveBeenCalledTimes(2);
    expect(enterEvent.defaultPrevented).toBe(true);
    expect(spaceDownEvent.defaultPrevented).toBe(true);
  });

  it('forwards refs to the default element and passes merged props and state to render callbacks', async () => {
    const ref = { current: null as HTMLButtonElement | null };
    const renderSpy = vi.fn((props: Record<string, unknown>, state: Button.State) => {
      return html`<span
        class=${String(props.className)}
        type=${String(props.type)}
        data-disabled=${state.disabled ? '' : nothing}
      ></span>`;
    });

    const container = render(Button({ ref, className: 'default-button' }));

    await flushMicrotasks();

    expect(ref.current).toBe(container.querySelector('.default-button'));
    expect(ref.current).toHaveAttribute('type', 'button');

    const renderContainer = render(
      Button({
        className: 'test-button',
        render: renderSpy,
      }),
    );
    const button = renderContainer.querySelector('.test-button');

    expect(button?.tagName).toBe('SPAN');
    expect(button).toHaveAttribute('type', 'button');
    expect(renderSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        className: 'test-button',
        type: 'button',
      }),
      {
        disabled: false,
      },
    );
  });
});
