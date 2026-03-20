/* eslint-disable testing-library/render-result-naming-convention */
import { html, nothing, render as renderTemplate, type TemplateResult } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import { type BaseUIChangeEventDetails } from '@base-ui/lit/types';
import type { ToggleChangeEventDetails, ToggleProps, ToggleState } from '@base-ui/lit/toggle';
import { Toggle } from '@base-ui/lit/toggle';

describe('Toggle', () => {
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

  async function flushMicrotasks(iterations = 4) {
    for (let index = 0; index < iterations; index += 1) {
      await Promise.resolve();
    }
  }

  function getButton(container: HTMLElement) {
    return container.querySelector('[aria-pressed]') as HTMLElement;
  }

  it('preserves the public type contracts', () => {
    const toggle = Toggle({});

    expectTypeOf(toggle).toEqualTypeOf<TemplateResult>();
    expectTypeOf<ToggleProps['pressed']>().toEqualTypeOf<boolean | undefined>();
    expectTypeOf<ToggleProps['defaultPressed']>().toEqualTypeOf<boolean | undefined>();
    expectTypeOf<ToggleProps['nativeButton']>().toEqualTypeOf<boolean | undefined>();
    expectTypeOf<ToggleProps['value']>().toEqualTypeOf<string | undefined>();
    expectTypeOf<ToggleChangeEventDetails>().toEqualTypeOf<BaseUIChangeEventDetails<'none'>>();
    expectTypeOf<ToggleState['pressed']>().toEqualTypeOf<boolean>();
  });

  it('toggles uncontrolled state when clicked', async () => {
    const container = render(Toggle({ defaultPressed: false }));
    const button = getButton(container);

    expect(button).toHaveAttribute('aria-pressed', 'false');

    button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await flushMicrotasks();

    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button).toHaveAttribute('data-pressed');

    button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await flushMicrotasks();

    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button).not.toHaveAttribute('data-pressed');
  });

  it('updates controlled state when re-rendered from outside', async () => {
    const container = render(Toggle({ pressed: false }));
    const button = getButton(container);

    expect(button).toHaveAttribute('aria-pressed', 'false');

    renderTemplate(Toggle({ pressed: true }), container);
    await flushMicrotasks();

    expect(button).toHaveAttribute('aria-pressed', 'true');

    renderTemplate(Toggle({ pressed: false }), container);
    await flushMicrotasks();

    expect(button).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onPressedChange with change details and supports cancellation', async () => {
    const handlePressedChange = vi.fn(
      (pressed: boolean, eventDetails: ToggleChangeEventDetails) => {
        if (pressed) {
          eventDetails.cancel();
        }

        return eventDetails;
      },
    );
    const container = render(Toggle({ onPressedChange: handlePressedChange }));
    const button = getButton(container);

    button.dispatchEvent(
      new MouseEvent('click', {
        altKey: true,
        bubbles: true,
        cancelable: true,
        shiftKey: true,
      }),
    );
    await flushMicrotasks();

    expect(handlePressedChange).toHaveBeenCalledTimes(1);
    expect(handlePressedChange.mock.calls[0]?.[0]).toBe(true);
    expect(handlePressedChange.mock.results[0]?.value.event.shiftKey).toBe(true);
    expect(handlePressedChange.mock.results[0]?.value.isCanceled).toBe(true);
    expect(button).toHaveAttribute('aria-pressed', 'false');
  });

  it('disables the component', async () => {
    const handlePressedChange = vi.fn();
    const container = render(Toggle({ disabled: true, onPressedChange: handlePressedChange }));
    const button = container.querySelector('button') as HTMLButtonElement;

    expect(button).toHaveAttribute('disabled');
    expect(button).toHaveAttribute('data-disabled');
    expect(button).toHaveAttribute('aria-pressed', 'false');

    button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await flushMicrotasks();

    expect(handlePressedChange).not.toHaveBeenCalled();
    expect(button).toHaveAttribute('aria-pressed', 'false');
  });

  it('does not forward type, form, or value to the DOM', () => {
    const container = render(
      Toggle({
        form: 'favorite-form',
        type: 'submit',
        value: 'favorite',
      }),
    );
    const button = container.querySelector('button') as HTMLButtonElement;

    expect(button).toHaveAttribute('type', 'button');
    expect(button).not.toHaveAttribute('form');
    expect(button).not.toHaveAttribute('value');
  });

  it('adds keyboard activation semantics for custom elements', async () => {
    const container = render(
      Toggle({
        nativeButton: false,
        render: html`<span></span>`,
        children: 'Favorite',
      }),
    );
    const button = container.querySelector('[role="button"]') as HTMLElement;

    button.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter' }),
    );
    await flushMicrotasks();

    expect(button).toHaveAttribute('aria-pressed', 'true');

    button.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, cancelable: true, key: ' ' }));
    await flushMicrotasks();

    expect(button).toHaveAttribute('aria-pressed', 'false');
  });

  it('warns when nativeButton is true but the rendered element is not a button', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      Toggle({
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

  it('passes the current pressed state to the render callback', async () => {
    const renderSpy = vi.fn((props: Record<string, unknown>, state: ToggleState) => {
      return html`<span
        aria-pressed=${String(props['aria-pressed'] ?? 'false')}
        class=${String(props.className ?? '')}
        data-pressed=${state.pressed ? '' : nothing}
      ></span>`;
    });
    const container = render(
      Toggle({
        className: 'toggle-root',
        pressed: false,
        render(props, state) {
          return renderSpy(props as Record<string, unknown>, state);
        },
      }),
    );
    const button = getButton(container);

    expect(renderSpy.mock.lastCall?.[1]).toEqual({ disabled: false, pressed: false });
    renderTemplate(
      Toggle({
        className: 'toggle-root',
        pressed: true,
        render(props, state) {
          return renderSpy(props as Record<string, unknown>, state);
        },
      }),
      container,
    );
    await flushMicrotasks();

    expect(renderSpy.mock.lastCall?.[1]).toEqual({ disabled: false, pressed: true });
    expect(button).toHaveClass('toggle-root');
    expect(button).toHaveAttribute('data-pressed');
  });
});
