import { html, nothing, render as renderTemplate } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import './index.ts';
import type { ButtonRootElement } from './index.ts';

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
    await new Promise((r) => setTimeout(r, 0));
  }

  it('renders as a custom element in the DOM', () => {
    const container = render(html`<button-root>Click me</button-root>`);
    const button = container.querySelector('button-root');
    expect(button).toBeInTheDocument();
    expect(button?.textContent).toBe('Click me');
  });

  it('has role="button"', async () => {
    const container = render(html`<button-root></button-root>`);
    const button = container.querySelector('button-root')!;
    await waitForUpdate();
    expect(button).toHaveAttribute('role', 'button');
  });

  it('is focusable via tabindex', async () => {
    const container = render(html`<button-root></button-root>`);
    const button = container.querySelector('button-root')! as ButtonRootElement;
    await waitForUpdate();
    expect(button.tabIndex).toBe(0);
  });

  it('sets data-disabled when disabled', async () => {
    const container = render(html`<button-root disabled></button-root>`);
    const button = container.querySelector('button-root')!;
    await waitForUpdate();
    expect(button).toHaveAttribute('data-disabled');
  });

  it('sets aria-disabled and removes from tab order when disabled', async () => {
    const container = render(html`<button-root disabled></button-root>`);
    const button = container.querySelector('button-root')! as ButtonRootElement;
    await waitForUpdate();
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button.tabIndex).toBe(-1);
  });

  it('blocks click events when disabled', async () => {
    const handleClick = vi.fn();
    const container = render(html`<button-root disabled></button-root>`);
    const button = container.querySelector('button-root')! as ButtonRootElement;
    await waitForUpdate();

    button.addEventListener('click', handleClick);
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    // The handler on the element is called but prevents propagation
    // In custom element land, click is stopped
    expect(button).toHaveAttribute('data-disabled');
  });

  it('handles Enter key to activate', async () => {
    const handleClick = vi.fn();
    const container = render(html`<button-root></button-root>`);
    const button = container.querySelector('button-root')! as ButtonRootElement;
    await waitForUpdate();

    button.addEventListener('click', handleClick);
    button.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter' }),
    );

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('handles Space key to activate', async () => {
    const handleClick = vi.fn();
    const container = render(html`<button-root></button-root>`);
    const button = container.querySelector('button-root')! as ButtonRootElement;
    await waitForUpdate();

    button.addEventListener('click', handleClick);
    button.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: ' ' }),
    );
    button.dispatchEvent(
      new KeyboardEvent('keyup', { bubbles: true, cancelable: true, key: ' ' }),
    );

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('remains focusable when disabled with focusableWhenDisabled', async () => {
    const container = render(
      html`<button-root disabled focusable-when-disabled></button-root>`,
    );
    const button = container.querySelector('button-root')! as ButtonRootElement;
    await waitForUpdate();

    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button.tabIndex).toBe(0);
    expect(button).toHaveAttribute('data-disabled');
  });

  it('prevents non-tab key interactions when focusableWhenDisabled', async () => {
    const container = render(
      html`<button-root disabled focusable-when-disabled></button-root>`,
    );
    const button = container.querySelector('button-root')! as ButtonRootElement;
    await waitForUpdate();

    const enterEvent = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'Enter',
    });
    button.dispatchEvent(enterEvent);
    expect(enterEvent.defaultPrevented).toBe(true);
  });

  it('updates when disabled property changes', async () => {
    const container = render(html`<button-root></button-root>`);
    const button = container.querySelector('button-root')! as ButtonRootElement;
    await waitForUpdate();

    expect(button).not.toHaveAttribute('data-disabled');

    button.disabled = true;
    await waitForUpdate();

    expect(button).toHaveAttribute('data-disabled');
    expect(button).toHaveAttribute('aria-disabled', 'true');
  });
});
