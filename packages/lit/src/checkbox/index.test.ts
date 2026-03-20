/* eslint-disable testing-library/render-result-naming-convention */
import { html, nothing, render as renderTemplate, svg, type TemplateResult } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import { type BaseUIChangeEventDetails } from '@base-ui/lit/types';
import type {
  CheckboxIndicatorProps,
  CheckboxIndicatorState,
  CheckboxRootChangeEventDetails,
  CheckboxRootProps,
} from '@base-ui/lit/checkbox';
import { Checkbox } from '@base-ui/lit/checkbox';

describe('Checkbox', () => {
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

  async function flushUpdates(iterations = 4) {
    await flushMicrotasks(iterations);
  }

  function getCheckbox(container: HTMLElement) {
    return container.querySelector('[role="checkbox"]') as HTMLElement;
  }

  function getInput(container: HTMLElement) {
    return container.querySelector('input[type="checkbox"]') as HTMLInputElement;
  }

  it('preserves the public type contracts', () => {
    const checkboxRoot = Checkbox.Root({});
    const checkboxIndicator = Checkbox.Indicator({});

    expectTypeOf(checkboxRoot).toEqualTypeOf<TemplateResult>();
    expectTypeOf(checkboxIndicator).toEqualTypeOf<TemplateResult>();
    expectTypeOf<CheckboxRootProps['checked']>().toEqualTypeOf<boolean | undefined>();
    expectTypeOf<CheckboxRootProps['indeterminate']>().toEqualTypeOf<boolean | undefined>();
    expectTypeOf<CheckboxRootProps['parent']>().toEqualTypeOf<boolean | undefined>();
    expectTypeOf<CheckboxRootProps['uncheckedValue']>().toEqualTypeOf<string | undefined>();
    expectTypeOf<CheckboxRootChangeEventDetails>().toEqualTypeOf<
      BaseUIChangeEventDetails<'none'>
    >();
    expectTypeOf<CheckboxIndicatorProps['keepMounted']>().toEqualTypeOf<boolean | undefined>();
    expectTypeOf<CheckboxIndicatorState['indeterminate']>().toEqualTypeOf<boolean>();
  });

  it('toggles uncontrolled state when clicked', async () => {
    const container = render(Checkbox.Root({}));
    const checkbox = getCheckbox(container);
    const input = getInput(container);

    expect(checkbox).toHaveAttribute('aria-checked', 'false');
    expect(input.checked).toBe(false);

    checkbox.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await flushUpdates();

    expect(checkbox).toHaveAttribute('aria-checked', 'true');
    expect(input.checked).toBe(true);

    checkbox.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await flushUpdates();

    expect(checkbox).toHaveAttribute('aria-checked', 'false');
    expect(input.checked).toBe(false);
  });

  it('supports keyboard activation for non-native elements', async () => {
    const container = render(Checkbox.Root({}));
    const checkbox = getCheckbox(container);

    checkbox.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter' }),
    );
    await flushUpdates();
    expect(checkbox).toHaveAttribute('aria-checked', 'true');

    checkbox.dispatchEvent(
      new KeyboardEvent('keyup', { bubbles: true, cancelable: true, key: ' ' }),
    );
    await flushUpdates();
    expect(checkbox).toHaveAttribute('aria-checked', 'false');
  });

  it('updates controlled state when re-rendered from outside', async () => {
    const container = render(Checkbox.Root({ checked: false }));
    const checkbox = getCheckbox(container);

    expect(checkbox).toHaveAttribute('aria-checked', 'false');

    renderTemplate(Checkbox.Root({ checked: true }), container);
    await flushUpdates();
    expect(checkbox).toHaveAttribute('aria-checked', 'true');

    renderTemplate(Checkbox.Root({ checked: false }), container);
    await flushUpdates();
    expect(checkbox).toHaveAttribute('aria-checked', 'false');
  });

  it('updates its state if the hidden input is toggled', async () => {
    const container = render(Checkbox.Root({}));
    const checkbox = getCheckbox(container);
    const input = getInput(container);

    input.click();
    await flushUpdates();

    expect(checkbox).toHaveAttribute('aria-checked', 'true');
  });

  it('calls onCheckedChange with change details', async () => {
    const handleChange = vi.fn((checked: boolean, eventDetails: CheckboxRootChangeEventDetails) => {
      return { checked, eventDetails };
    });
    const container = render(Checkbox.Root({ onCheckedChange: handleChange }));
    const checkbox = getCheckbox(container);

    checkbox.dispatchEvent(
      new MouseEvent('click', {
        altKey: true,
        bubbles: true,
        cancelable: true,
        shiftKey: true,
      }),
    );
    await flushUpdates();

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange.mock.calls[0]?.[0]).toBe(true);
    expect(handleChange.mock.results[0]?.value.eventDetails.event.shiftKey).toBe(true);
    expect(handleChange.mock.results[0]?.value.eventDetails.reason).toBe('none');
  });

  it('keeps uncontrolled state unchanged when onCheckedChange cancels the toggle', async () => {
    const handleChange = vi.fn((_checked: boolean, eventDetails: CheckboxRootChangeEventDetails) => {
      eventDetails.cancel();
    });
    const container = render(Checkbox.Root({ onCheckedChange: handleChange }));
    const checkbox = getCheckbox(container);
    const input = getInput(container);

    checkbox.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await flushUpdates();

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(checkbox).toHaveAttribute('aria-checked', 'false');
    expect(input.checked).toBe(false);
  });

  it('snaps a controlled checkbox back to the controlled state after user activation', async () => {
    const handleChange = vi.fn();
    const container = render(Checkbox.Root({ checked: false, onCheckedChange: handleChange }));
    const checkbox = getCheckbox(container);
    const input = getInput(container);

    checkbox.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await flushUpdates();

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange.mock.calls[0]?.[0]).toBe(true);
    expect(checkbox).toHaveAttribute('aria-checked', 'false');
    expect(input.checked).toBe(false);
  });

  it('supports explicit labels and updates aria-labelledby', async () => {
    const container = render(
      html`<label for="checkbox-input">Label</label>${Checkbox.Root({ id: 'checkbox-input' })}`,
    );
    await flushUpdates();

    const label = container.querySelector('label') as HTMLLabelElement;
    const checkbox = getCheckbox(container);

    expect(label.id).not.toBe('');
    expect(checkbox).toHaveAttribute('aria-labelledby', label.id);

    renderTemplate(
      html`<label for="checkbox-input-b">Label B</label>${Checkbox.Root({ id: 'checkbox-input-b' })}`,
      container,
    );
    await flushUpdates();

    const updatedLabel = container.querySelector('label') as HTMLLabelElement;
    expect(updatedLabel.id).not.toBe('');
    expect(getCheckbox(container)).toHaveAttribute('aria-labelledby', updatedLabel.id);
  });

  it('toggles when a wrapping or explicitly linked label is clicked', async () => {
    const wrappedContainer = render(
      html`<label data-testid="wrapped">${Checkbox.Root({})} Notifications</label>`,
    );
    const wrappedCheckbox = getCheckbox(wrappedContainer);
    const wrappedLabel = wrappedContainer.querySelector(
      '[data-testid="wrapped"]',
    ) as HTMLLabelElement;

    wrappedLabel.click();
    await flushUpdates();
    expect(wrappedCheckbox).toHaveAttribute('aria-checked', 'true');

    const explicitContainer = render(
      html`<label data-testid="explicit" for="checkbox-id">Notifications</label>${Checkbox.Root({
          id: 'checkbox-id',
        })}`,
    );
    const explicitCheckbox = getCheckbox(explicitContainer);
    const explicitLabel = explicitContainer.querySelector(
      '[data-testid="explicit"]',
    ) as HTMLLabelElement;

    explicitLabel.click();
    await flushUpdates();
    expect(explicitCheckbox).toHaveAttribute('aria-checked', 'true');
  });

  it('associates the id with the rendered button when nativeButton is true', async () => {
    const container = render(
      html`<label for="native-checkbox">Notifications</label>${Checkbox.Root({
          id: 'native-checkbox',
          nativeButton: true,
          render: html`<button></button>`,
        })}`,
    );
    await flushUpdates();

    const checkbox = getCheckbox(container);
    const hiddenInput = getInput(container);

    expect(checkbox).toHaveAttribute('id', 'native-checkbox');
    expect(hiddenInput).not.toHaveAttribute('id', 'native-checkbox');

    (container.querySelector('label') as HTMLLabelElement).click();
    await flushUpdates();

    expect(checkbox).toHaveAttribute('aria-checked', 'true');
  });

  it('places state data attributes on the root and the indicator', async () => {
    const container = render(
      Checkbox.Root({
        defaultChecked: true,
        disabled: true,
        readOnly: true,
        required: true,
        children: Checkbox.Indicator({}),
      }),
    );
    await flushUpdates();

    const checkbox = getCheckbox(container);
    const indicator = container.querySelector('[data-base-ui-checkbox-indicator]') as HTMLElement;

    expect(checkbox).toHaveAttribute('data-checked');
    expect(checkbox).toHaveAttribute('data-disabled');
    expect(checkbox).toHaveAttribute('data-readonly');
    expect(checkbox).toHaveAttribute('data-required');

    expect(indicator).toHaveAttribute('data-checked');
    expect(indicator).toHaveAttribute('data-disabled');
    expect(indicator).toHaveAttribute('data-readonly');
    expect(indicator).toHaveAttribute('data-required');

    renderTemplate(
      Checkbox.Root({
        defaultChecked: true,
        disabled: false,
        readOnly: false,
        required: true,
        children: Checkbox.Indicator({}),
      }),
      container,
    );
    await flushUpdates();

    checkbox.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await flushUpdates();

    expect(checkbox).toHaveAttribute('data-unchecked');
    expect(checkbox).not.toHaveAttribute('data-checked');
    expect(indicator).toHaveAttribute('data-unchecked');
    expect(indicator).not.toHaveAttribute('data-checked');
  });

  it('keeps name and value on the hidden input only', async () => {
    const inputRef = { current: null as HTMLInputElement | null };
    const container = render(
      Checkbox.Root({
        inputRef,
        name: 'checkbox-name',
        value: '1',
      }),
    );
    await flushUpdates();

    const checkbox = getCheckbox(container);
    const input = getInput(container);

    expect(inputRef.current).toBe(input);
    expect(input).toHaveAttribute('name', 'checkbox-name');
    expect(input).toHaveAttribute('value', '1');
    expect(checkbox).not.toHaveAttribute('name');
    expect(checkbox).not.toHaveAttribute('value');
  });

  it('submits uncheckedValue when provided', async () => {
    const container = render(
      html`<form>${Checkbox.Root({ name: 'test-checkbox', uncheckedValue: 'off' })}</form>`,
    );
    await flushUpdates();

    const form = container.querySelector('form') as HTMLFormElement;
    const checkbox = getCheckbox(container);

    expect(new FormData(form).get('test-checkbox')).toBe('off');

    checkbox.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await flushUpdates();
    expect(new FormData(form).get('test-checkbox')).toBe('on');

    checkbox.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await flushUpdates();
    expect(new FormData(form).get('test-checkbox')).toBe('off');
  });

  it('uses aria-disabled and aria-readonly semantics', async () => {
    const disabledContainer = render(Checkbox.Root({ disabled: true }));
    const disabledCheckbox = getCheckbox(disabledContainer);

    expect(disabledCheckbox).toHaveAttribute('aria-disabled', 'true');
    expect(disabledCheckbox).not.toHaveAttribute('disabled');

    disabledCheckbox.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await flushUpdates();
    expect(disabledCheckbox).toHaveAttribute('aria-checked', 'false');

    const readOnlyContainer = render(Checkbox.Root({ readOnly: true }));
    const readOnlyCheckbox = getCheckbox(readOnlyContainer);

    expect(readOnlyCheckbox).toHaveAttribute('aria-readonly', 'true');

    readOnlyCheckbox.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await flushUpdates();
    expect(readOnlyCheckbox).toHaveAttribute('aria-checked', 'false');
  });

  it('does not toggle when a readOnly checkbox is activated through its label', async () => {
    const handleChange = vi.fn();
    const container = render(
      html`<label for="readonly-checkbox">Label</label>${Checkbox.Root({
          id: 'readonly-checkbox',
          onCheckedChange: handleChange,
          readOnly: true,
        })}`,
    );
    await flushUpdates();

    const label = container.querySelector('label') as HTMLLabelElement;
    const checkbox = getCheckbox(container);
    const input = getInput(container);

    label.click();
    await flushUpdates();

    expect(handleChange).not.toHaveBeenCalled();
    expect(checkbox).toHaveAttribute('aria-checked', 'false');
    expect(input.checked).toBe(false);
  });

  it('supports the indeterminate state', async () => {
    const container = render(
      Checkbox.Root({
        indeterminate: true,
        children: Checkbox.Indicator({ 'data-testid': 'indicator' }),
      }),
    );
    await flushUpdates();

    const checkbox = getCheckbox(container);
    const input = getInput(container);

    expect(checkbox).toHaveAttribute('aria-checked', 'mixed');
    expect(checkbox).toHaveAttribute('data-indeterminate');
    expect(input.indeterminate).toBe(true);
    expect(container.querySelector('[data-testid="indicator"]')).not.toBe(null);

    checkbox.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await flushUpdates();

    expect(checkbox).toHaveAttribute('aria-checked', 'mixed');
  });

  it('does not render the indicator by default, but does when checked', async () => {
    const container = render(
      Checkbox.Root({
        children: Checkbox.Indicator({ 'data-testid': 'indicator' }),
      }),
    );
    await flushUpdates();

    expect(container.querySelector('[data-testid="indicator"]')).toBe(null);

    renderTemplate(
      Checkbox.Root({
        checked: true,
        children: Checkbox.Indicator({ 'data-testid': 'indicator' }),
      }),
      container,
    );
    await flushUpdates();

    expect(container.querySelector('[data-testid="indicator"]')).not.toBe(null);
  });

  it('keeps the indicator mounted when requested', async () => {
    const container = render(
      Checkbox.Root({
        children: Checkbox.Indicator({ 'data-testid': 'indicator', keepMounted: true }),
      }),
    );
    await flushUpdates();

    expect(container.querySelector('[data-testid="indicator"]')).not.toBe(null);

    renderTemplate(
      Checkbox.Root({
        indeterminate: true,
        children: Checkbox.Indicator({ 'data-testid': 'indicator', keepMounted: true }),
      }),
      container,
    );
    await flushUpdates();

    expect(container.querySelector('[data-testid="indicator"]')).toHaveAttribute(
      'data-indeterminate',
    );
  });

  it('preserves the checked render-prop state for an indeterminate indicator', async () => {
    const container = render(
      Checkbox.Root({
        checked: true,
        indeterminate: true,
        children: Checkbox.Indicator({
          render: (_props, state) =>
            html`<span
              data-testid="indicator"
              data-checked=${String(state.checked)}
              data-indeterminate=${String(state.indeterminate)}
            ></span>`,
        }),
      }),
    );
    await flushUpdates();

    expect(container.querySelector('[data-testid="indicator"]')).toHaveAttribute(
      'data-checked',
      'true',
    );
    expect(container.querySelector('[data-testid="indicator"]')).toHaveAttribute(
      'data-indeterminate',
      'true',
    );
  });

  it('applies data-starting-style when the indicator becomes visible', async () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame'] });

    const container = render(
      Checkbox.Root({
        children: Checkbox.Indicator({
          className: 'indicator',
          'data-testid': 'indicator',
        }),
      }),
    );
    await flushUpdates();

    renderTemplate(
      Checkbox.Root({
        checked: true,
        children: Checkbox.Indicator({
          className: 'indicator',
          'data-testid': 'indicator',
        }),
      }),
      container,
    );
    await flushUpdates();

    expect(container.querySelector('[data-testid="indicator"]')).toHaveAttribute(
      'data-starting-style',
    );

    vi.advanceTimersByTime(16);
    await flushUpdates();

    expect(container.querySelector('[data-testid="indicator"]')).not.toHaveAttribute(
      'data-starting-style',
    );
  });

  it('applies data-ending-style before the indicator unmounts', async () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame'] });

    const container = render(
      Checkbox.Root({
        checked: true,
        children: Checkbox.Indicator({
          className: 'indicator',
          'data-testid': 'indicator',
        }),
      }),
    );
    await flushUpdates();
    vi.advanceTimersByTime(16);
    await flushUpdates();

    const indicator = container.querySelector('[data-testid="indicator"]') as HTMLSpanElement;
    let resolveFinished!: () => void;
    const finished = new Promise<void>((resolve) => {
      resolveFinished = resolve;
    });

    Object.defineProperty(indicator, 'getAnimations', {
      configurable: true,
      value: () => [
        {
          finished,
          pending: false,
          playState: 'running',
        },
      ],
    });

    renderTemplate(
      Checkbox.Root({
        checked: false,
        children: Checkbox.Indicator({
          className: 'indicator',
          'data-testid': 'indicator',
        }),
      }),
      container,
    );
    await flushUpdates();

    expect(container.querySelector('[data-testid="indicator"]')).toHaveAttribute(
      'data-ending-style',
    );

    vi.advanceTimersByTime(16);
    resolveFinished();
    await flushUpdates();

    expect(container.querySelector('[data-testid="indicator"]')).toBe(null);
  });

  it('supports custom indicator children', async () => {
    const container = render(
      Checkbox.Root({
        checked: true,
        children: Checkbox.Indicator({
          children: svg`<svg data-testid="icon" viewBox="0 0 10 10"><path d="M0 0h10v10H0z" /></svg>`,
        }),
      }),
    );
    await flushUpdates();

    expect(container.querySelector('[data-testid="icon"]')).not.toBe(null);
  });
});
