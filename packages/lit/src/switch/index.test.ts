/* eslint-disable testing-library/render-result-naming-convention */
import { html, nothing, render as renderTemplate, type TemplateResult } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import { type BaseUIChangeEventDetails } from '@base-ui/lit/types';
import type {
  SwitchRootChangeEventDetails,
  SwitchRootProps,
  SwitchThumbState,
} from '@base-ui/lit/switch';
import { Switch } from '@base-ui/lit/switch';

describe('Switch', () => {
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

  function getSwitch(container: HTMLElement) {
    return container.querySelector('[role="switch"]') as HTMLElement;
  }

  function getCheckbox(container: HTMLElement) {
    return container.querySelector('input[type="checkbox"]') as HTMLInputElement;
  }

  it('preserves the public type contracts', () => {
    const switchRoot = Switch.Root({});
    const switchThumb = Switch.Thumb({});

    expectTypeOf(switchRoot).toEqualTypeOf<TemplateResult>();
    expectTypeOf(switchThumb).toEqualTypeOf<TemplateResult>();
    expectTypeOf<SwitchRootProps['checked']>().toEqualTypeOf<boolean | undefined>();
    expectTypeOf<SwitchRootProps['nativeButton']>().toEqualTypeOf<boolean | undefined>();
    expectTypeOf<SwitchRootProps['uncheckedValue']>().toEqualTypeOf<string | undefined>();
    expectTypeOf<SwitchRootChangeEventDetails>().toEqualTypeOf<BaseUIChangeEventDetails<'none'>>();
    expectTypeOf<SwitchThumbState['checked']>().toEqualTypeOf<boolean>();
  });

  it('toggles uncontrolled state when clicked', async () => {
    const container = render(Switch.Root({}));
    const switchElement = getSwitch(container);

    expect(switchElement).toHaveAttribute('aria-checked', 'false');

    switchElement.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await flushMicrotasks();

    expect(switchElement).toHaveAttribute('aria-checked', 'true');
  });

  it('supports keyboard activation for non-native elements', async () => {
    const container = render(Switch.Root({ children: Switch.Thumb({}) }));
    const switchElement = getSwitch(container);

    switchElement.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter' }),
    );
    await flushMicrotasks();
    expect(switchElement).toHaveAttribute('aria-checked', 'true');

    switchElement.dispatchEvent(
      new KeyboardEvent('keyup', { bubbles: true, cancelable: true, key: ' ' }),
    );
    await flushMicrotasks();
    expect(switchElement).toHaveAttribute('aria-checked', 'false');
  });

  it('updates controlled state when re-rendered from outside', async () => {
    const container = render(Switch.Root({ checked: false }));
    const switchElement = getSwitch(container);

    expect(switchElement).toHaveAttribute('aria-checked', 'false');

    renderTemplate(Switch.Root({ checked: true }), container);
    await flushMicrotasks();

    expect(switchElement).toHaveAttribute('aria-checked', 'true');

    renderTemplate(Switch.Root({ checked: false }), container);
    await flushMicrotasks();

    expect(switchElement).toHaveAttribute('aria-checked', 'false');
  });

  it('updates its state if the hidden input is toggled', async () => {
    const container = render(Switch.Root({}));
    const switchElement = getSwitch(container);
    const input = getCheckbox(container);

    input.click();
    await flushMicrotasks();

    expect(switchElement).toHaveAttribute('aria-checked', 'true');
  });

  it('calls onCheckedChange with change details and supports cancellation', async () => {
    const handleChange = vi.fn((checked: boolean, eventDetails: SwitchRootChangeEventDetails) => {
      if (checked) {
        eventDetails.cancel();
      }

      return eventDetails;
    });
    const container = render(Switch.Root({ onCheckedChange: handleChange }));
    const switchElement = getSwitch(container);

    switchElement.dispatchEvent(
      new MouseEvent('click', {
        altKey: true,
        bubbles: true,
        cancelable: true,
        shiftKey: true,
      }),
    );
    await flushMicrotasks();

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange.mock.calls[0]?.[0]).toBe(true);
    expect(handleChange.mock.results[0]?.value.event.shiftKey).toBe(true);
    expect(handleChange.mock.results[0]?.value.isCanceled).toBe(true);
    expect(switchElement).toHaveAttribute('aria-checked', 'false');
  });

  it('supports explicit labels and updates aria-labelledby', async () => {
    const container = render(
      html`<label for="switch-input">Label</label>${Switch.Root({ id: 'switch-input' })}`,
    );
    await flushMicrotasks();

    const label = container.querySelector('label') as HTMLLabelElement;
    const switchElement = getSwitch(container);

    expect(label.id).not.toBe('');
    expect(switchElement).toHaveAttribute('aria-labelledby', label.id);

    renderTemplate(
      html`<label for="switch-input-b">Label B</label>${Switch.Root({ id: 'switch-input-b' })}`,
      container,
    );
    await flushMicrotasks();

    const updatedLabel = container.querySelector('label') as HTMLLabelElement;
    const updatedSwitch = getSwitch(container);
    expect(updatedLabel.id).not.toBe('');
    expect(updatedSwitch).toHaveAttribute('aria-labelledby', updatedLabel.id);
  });

  it('toggles when a wrapping or explicitly linked label is clicked', async () => {
    const wrappedContainer = render(
      html`<label data-testid="wrapped">${Switch.Root({})} Notifications</label>`,
    );
    const wrappedSwitch = getSwitch(wrappedContainer);
    const wrappedLabel = wrappedContainer.querySelector(
      '[data-testid="wrapped"]',
    ) as HTMLLabelElement;

    wrappedLabel.click();
    await flushMicrotasks();
    expect(wrappedSwitch).toHaveAttribute('aria-checked', 'true');

    const explicitContainer = render(
      html`<label data-testid="explicit" for="switch-id">Notifications</label>${Switch.Root({
          id: 'switch-id',
        })}`,
    );
    const explicitSwitch = getSwitch(explicitContainer);
    const explicitLabel = explicitContainer.querySelector(
      '[data-testid="explicit"]',
    ) as HTMLLabelElement;

    explicitLabel.click();
    await flushMicrotasks();
    expect(explicitSwitch).toHaveAttribute('aria-checked', 'true');
  });

  it('associates the id with the rendered button when nativeButton is true', async () => {
    const container = render(
      html`<label for="native-switch">Notifications</label>${Switch.Root({
          id: 'native-switch',
          nativeButton: true,
          render: html`<button></button>`,
        })}`,
    );
    await flushMicrotasks();

    const switchElement = getSwitch(container);
    const hiddenInput = getCheckbox(container);

    expect(switchElement).toHaveAttribute('id', 'native-switch');
    expect(hiddenInput).not.toHaveAttribute('id', 'native-switch');

    (container.querySelector('label') as HTMLLabelElement).click();
    await flushMicrotasks();

    expect(switchElement).toHaveAttribute('aria-checked', 'true');
  });

  it('places state data attributes on the root and the thumb', async () => {
    const container = render(
      Switch.Root({
        defaultChecked: true,
        disabled: true,
        readOnly: true,
        required: true,
        children: Switch.Thumb({}),
      }),
    );
    await flushMicrotasks();

    const switchElement = getSwitch(container);
    const thumb = container.querySelector('[data-base-ui-switch-thumb]') as HTMLElement;

    expect(switchElement).toHaveAttribute('data-checked');
    expect(switchElement).toHaveAttribute('data-disabled');
    expect(switchElement).toHaveAttribute('data-readonly');
    expect(switchElement).toHaveAttribute('data-required');

    expect(thumb).toHaveAttribute('data-checked');
    expect(thumb).toHaveAttribute('data-disabled');
    expect(thumb).toHaveAttribute('data-readonly');
    expect(thumb).toHaveAttribute('data-required');

    renderTemplate(
      Switch.Root({
        defaultChecked: true,
        disabled: false,
        readOnly: false,
        required: true,
        children: Switch.Thumb({}),
      }),
      container,
    );
    await flushMicrotasks();

    switchElement.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await flushMicrotasks();

    expect(switchElement).toHaveAttribute('data-unchecked');
    expect(switchElement).not.toHaveAttribute('data-checked');
    expect(thumb).toHaveAttribute('data-unchecked');
    expect(thumb).not.toHaveAttribute('data-checked');
  });

  it('keeps name and value on the hidden input only', async () => {
    const inputRef = { current: null as HTMLInputElement | null };
    const container = render(
      Switch.Root({
        inputRef,
        name: 'switch-name',
        value: '1',
      }),
    );
    await flushMicrotasks();

    const switchElement = getSwitch(container);
    const input = getCheckbox(container);

    expect(inputRef.current).toBe(input);
    expect(input).toHaveAttribute('name', 'switch-name');
    expect(input).toHaveAttribute('value', '1');
    expect(switchElement).not.toHaveAttribute('name');
    expect(switchElement).not.toHaveAttribute('value');
  });

  it('submits uncheckedValue when provided', async () => {
    const container = render(
      html`<form>${Switch.Root({ name: 'test-switch', uncheckedValue: 'off' })}</form>`,
    );
    await flushMicrotasks();

    const form = container.querySelector('form') as HTMLFormElement;
    const switchElement = getSwitch(container);

    expect(new FormData(form).get('test-switch')).toBe('off');

    switchElement.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await flushMicrotasks();
    expect(new FormData(form).get('test-switch')).toBe('on');

    switchElement.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await flushMicrotasks();
    expect(new FormData(form).get('test-switch')).toBe('off');
  });

  it('uses aria-disabled and aria-readonly semantics', async () => {
    const disabledContainer = render(Switch.Root({ disabled: true }));
    const disabledSwitch = getSwitch(disabledContainer);

    expect(disabledSwitch).toHaveAttribute('aria-disabled', 'true');
    expect(disabledSwitch).not.toHaveAttribute('disabled');

    disabledSwitch.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await flushMicrotasks();
    expect(disabledSwitch).toHaveAttribute('aria-checked', 'false');

    const readOnlyContainer = render(Switch.Root({ readOnly: true }));
    const readOnlySwitch = getSwitch(readOnlyContainer);
    const readOnlyInput = getCheckbox(readOnlyContainer);

    expect(readOnlySwitch).toHaveAttribute('aria-readonly', 'true');

    readOnlySwitch.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await flushMicrotasks();
    expect(readOnlySwitch).toHaveAttribute('aria-checked', 'false');

    readOnlyInput.click();
    await flushMicrotasks();
    expect(readOnlySwitch).toHaveAttribute('aria-checked', 'false');
  });

  it('allows extra props to override built-in attributes', async () => {
    const container = render(Switch.Root({ role: 'checkbox', 'data-testid': 'switch' }));
    const switchElement = container.querySelector('[data-testid="switch"]') as HTMLElement;

    expect(switchElement).toHaveAttribute('role', 'checkbox');
  });

  it('throws when Switch.Thumb is rendered outside Switch.Root', () => {
    expect(() => {
      render(Switch.Thumb({}));
    }).toThrow(
      'Base UI: SwitchRootContext is missing. Switch parts must be placed within <Switch.Root>.',
    );
  });
});
