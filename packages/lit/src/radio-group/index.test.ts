import { html, nothing, render as renderTemplate } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../radio/index.ts';
import './index.ts';
import type { RadioGroupElement, RadioGroupChangeEventDetails } from './index.ts';
import type { RadioRootElement } from '../radio/index.ts';

describe('radio-group', () => {
  const containers = new Set<HTMLDivElement>();

  afterEach(() => {
    containers.forEach((container) => {
      renderTemplate(nothing, container);
      container.remove();
    });
    containers.clear();
    vi.restoreAllMocks();
  });

  function render(result: ReturnType<typeof html>) {
    const container = document.createElement('div');
    document.body.append(container);
    containers.add(container);
    renderTemplate(result, container);
    return container;
  }

  async function waitForUpdate() {
    // RadioGroup uses double-nested queueMicrotask for state publishing.
    // We need enough async ticks for the chain to complete.
    for (let i = 0; i < 4; i++) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  function getGroup(container: HTMLElement) {
    return container.querySelector('radio-group') as RadioGroupElement;
  }

  function getRadio(container: HTMLElement, value: string) {
    const radios = container.querySelectorAll('radio-root') as NodeListOf<RadioRootElement>;
    for (const radio of radios) {
      if (radio.value === value) return radio;
    }
    return null;
  }

  it('renders radio-group as a custom element with role=radiogroup', async () => {
    const container = render(html`<radio-group></radio-group>`);
    await waitForUpdate();

    const group = getGroup(container);
    expect(group).toBeInTheDocument();
    expect(group).toHaveAttribute('role', 'radiogroup');
  });

  it('supports uncontrolled mode with defaultValue', async () => {
    const container = render(html`
      <radio-group .defaultValue=${'a'}>
        <radio-root .value=${'a'}></radio-root>
        <radio-root .value=${'b'}></radio-root>
      </radio-group>
    `);
    await waitForUpdate();

    const radioA = getRadio(container, 'a')!;
    const radioB = getRadio(container, 'b')!;

    expect(radioA).toHaveAttribute('aria-checked', 'true');
    expect(radioB).toHaveAttribute('aria-checked', 'false');
  });

  it('toggles selection when a radio is clicked', async () => {
    const container = render(html`
      <radio-group .defaultValue=${'a'}>
        <radio-root .value=${'a'}></radio-root>
        <radio-root .value=${'b'}></radio-root>
      </radio-group>
    `);
    await waitForUpdate();

    const radioA = getRadio(container, 'a')!;
    const radioB = getRadio(container, 'b')!;

    expect(radioA).toHaveAttribute('aria-checked', 'true');

    radioB.click();
    await waitForUpdate();

    expect(radioA).toHaveAttribute('aria-checked', 'false');
    expect(radioB).toHaveAttribute('aria-checked', 'true');
  });

  it('calls onValueChange with the new value and event details', async () => {
    const handleChange = vi.fn();
    const container = render(html`
      <radio-group .defaultValue=${'a'} .onValueChange=${handleChange}>
        <radio-root .value=${'a'}></radio-root>
        <radio-root .value=${'b'}></radio-root>
      </radio-group>
    `);
    await waitForUpdate();

    const radioB = getRadio(container, 'b')!;
    radioB.click();
    await waitForUpdate();

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange.mock.calls[0]?.[0]).toBe('b');
    expect(handleChange.mock.calls[0]?.[1]).toHaveProperty('reason', 'none');
  });

  it('cancels value change when onValueChange calls cancel()', async () => {
    const handleChange = vi.fn(
      (_value: unknown, eventDetails: RadioGroupChangeEventDetails) => {
        eventDetails.cancel();
      },
    );

    const container = render(html`
      <radio-group .defaultValue=${'a'} .onValueChange=${handleChange}>
        <radio-root .value=${'a'}></radio-root>
        <radio-root .value=${'b'}></radio-root>
      </radio-group>
    `);
    await waitForUpdate();

    const radioA = getRadio(container, 'a')!;
    const radioB = getRadio(container, 'b')!;

    radioB.click();
    await waitForUpdate();

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(radioA).toHaveAttribute('aria-checked', 'true');
    expect(radioB).toHaveAttribute('aria-checked', 'false');
  });

  it('supports controlled mode and snaps back to controlled value', async () => {
    const handleChange = vi.fn();
    const container = render(html`
      <radio-group .onValueChange=${handleChange}>
        <radio-root .value=${'a'}></radio-root>
        <radio-root .value=${'b'}></radio-root>
      </radio-group>
    `);
    const group = getGroup(container);
    group.value = 'a';
    await waitForUpdate();

    const radioA = getRadio(container, 'a')!;
    const radioB = getRadio(container, 'b')!;

    expect(radioA).toHaveAttribute('aria-checked', 'true');

    radioB.click();
    await waitForUpdate();

    expect(handleChange).toHaveBeenCalledTimes(1);
    // Value snaps back since it's controlled and we didn't update it
    expect(radioA).toHaveAttribute('aria-checked', 'true');
    expect(radioB).toHaveAttribute('aria-checked', 'false');
  });

  it('manages roving tabindex', async () => {
    const container = render(html`
      <radio-group .defaultValue=${'a'}>
        <radio-root .value=${'a'}></radio-root>
        <radio-root .value=${'b'}></radio-root>
        <radio-root .value=${'c'}></radio-root>
      </radio-group>
    `);
    await waitForUpdate();

    const radioA = getRadio(container, 'a')!;
    const radioB = getRadio(container, 'b')!;
    const radioC = getRadio(container, 'c')!;

    expect(radioA.tabIndex).toBe(0);
    expect(radioB.tabIndex).toBe(-1);
    expect(radioC.tabIndex).toBe(-1);
  });

  it('navigates with arrow keys and wraps around', async () => {
    const container = render(html`
      <radio-group .defaultValue=${'a'}>
        <radio-root .value=${'a'}></radio-root>
        <radio-root .value=${'b'}></radio-root>
        <radio-root .value=${'c'}></radio-root>
      </radio-group>
    `);
    await waitForUpdate();

    const radioA = getRadio(container, 'a')!;

    radioA.focus();
    radioA.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowRight' }),
    );
    await waitForUpdate();

    const radioB = getRadio(container, 'b')!;
    expect(radioB).toHaveAttribute('aria-checked', 'true');

    radioB.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowLeft' }),
    );
    await waitForUpdate();

    expect(getRadio(container, 'a')!).toHaveAttribute('aria-checked', 'true');

    getRadio(container, 'a')!.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowLeft' }),
    );
    await waitForUpdate();

    // Should wrap to the last radio
    expect(getRadio(container, 'c')!).toHaveAttribute('aria-checked', 'true');
  });

  it('sets name on child hidden inputs', async () => {
    const container = render(html`
      <radio-group name="color" .defaultValue=${'red'}>
        <radio-root .value=${'red'}></radio-root>
        <radio-root .value=${'blue'}></radio-root>
      </radio-group>
    `);
    await waitForUpdate();

    const inputs = container.querySelectorAll(
      'input[type="radio"]',
    ) as NodeListOf<HTMLInputElement>;

    for (const input of inputs) {
      expect(input).toHaveAttribute('name', 'color');
    }
  });

  it('submits the checked value via form', async () => {
    const container = render(html`
      <form>
        <radio-group name="fruit" .defaultValue=${'b'}>
          <radio-root .value=${'a'}></radio-root>
          <radio-root .value=${'b'}></radio-root>
        </radio-group>
      </form>
    `);
    await waitForUpdate();

    const form = container.querySelector('form') as HTMLFormElement;
    expect(new FormData(form).get('fruit')).toBe('b');

    const radioA = getRadio(container, 'a')!;
    radioA.click();
    await waitForUpdate();

    expect(new FormData(form).get('fruit')).toBe('a');
  });

  it('inherits disabled state to child radios', async () => {
    const container = render(html`
      <radio-group .disabled=${true}>
        <radio-root .value=${'a'}></radio-root>
      </radio-group>
    `);
    await waitForUpdate();

    const radio = getRadio(container, 'a')!;
    expect(radio).toHaveAttribute('aria-disabled', 'true');
    expect(radio).toHaveAttribute('data-disabled');
  });

  it('does not submit value when name is omitted', async () => {
    const container = render(html`
      <form>
        <radio-group .defaultValue=${'b'}>
          <radio-root .value=${'a'}></radio-root>
          <radio-root .value=${'b'}></radio-root>
        </radio-group>
      </form>
    `);
    await waitForUpdate();

    const inputs = container.querySelectorAll(
      'input[type="radio"]',
    ) as NodeListOf<HTMLInputElement>;

    for (const input of inputs) {
      expect(input).not.toHaveAttribute('name');
    }
  });

  it('tracks focused and touched state', async () => {
    const container = render(html`
      <radio-group>
        <radio-root .value=${'a'}></radio-root>
      </radio-group>
    `);
    await waitForUpdate();

    const group = getGroup(container);
    expect(group).not.toHaveAttribute('data-focused');
    expect(group).not.toHaveAttribute('data-touched');

    const radio = getRadio(container, 'a')!;
    radio.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await waitForUpdate();
    expect(group).toHaveAttribute('data-focused');

    radio.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    await waitForUpdate();
    expect(group).not.toHaveAttribute('data-focused');
    expect(group).toHaveAttribute('data-touched');
  });

  it('tracks dirty and filled state', async () => {
    const container = render(html`
      <radio-group>
        <radio-root .value=${'a'}></radio-root>
        <radio-root .value=${'b'}></radio-root>
      </radio-group>
    `);
    await waitForUpdate();

    const group = getGroup(container);
    expect(group).not.toHaveAttribute('data-dirty');
    expect(group).not.toHaveAttribute('data-filled');

    const radioA = getRadio(container, 'a')!;
    radioA.click();
    await waitForUpdate();

    expect(group).toHaveAttribute('data-dirty');
    expect(group).toHaveAttribute('data-filled');
  });

  it('sets aria-disabled and aria-readonly on the group', async () => {
    const container = render(html`
      <radio-group .disabled=${true} .readOnly=${true} .required=${true}>
        <radio-root .value=${'a'}></radio-root>
      </radio-group>
    `);
    await waitForUpdate();

    const group = getGroup(container);
    expect(group).toHaveAttribute('aria-disabled', 'true');
    expect(group).toHaveAttribute('aria-readonly', 'true');
    expect(group).toHaveAttribute('aria-required', 'true');
  });
});
