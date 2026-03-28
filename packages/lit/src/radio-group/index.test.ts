import { html, nothing, render as renderTemplate } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import '../radio';
import {
  RadioGroup,
  RadioGroupElement,
  type RadioGroupChangeEventDetails,
  type RadioGroupProps,
  type RadioGroupState,
} from './index';
import './index';
import type { RadioRootElement } from '../radio';
import { RADIO_GROUP_ATTRIBUTE } from './shared';

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

  async function flushUpdates(count = 4) {
    await Array.from({ length: count }).reduce(
      (promise) =>
        promise.then(
          () =>
            new Promise<void>((resolve) => {
              setTimeout(resolve, 0);
            }),
        ),
      Promise.resolve(),
    );
  }

  function getGroup(view: HTMLElement) {
    return view.querySelector('radio-group') as RadioGroupElement;
  }

  function getRadio(view: HTMLElement, value: string) {
    const radios = view.querySelectorAll('radio-root') as NodeListOf<RadioRootElement>;
    for (const radio of radios) {
      if (radio.value === value) {
        return radio;
      }
    }
    return null;
  }

  it('exposes the radio-group runtime export and namespace aliases', () => {
    expect(typeof RadioGroup).toBe('function');
    expect(customElements.get('radio-group')).toBe(RadioGroupElement);
    expectTypeOf<RadioGroup.Props>().toEqualTypeOf<RadioGroupProps>();
    expectTypeOf<RadioGroup.State>().toEqualTypeOf<RadioGroupState>();
    expectTypeOf<RadioGroup.ChangeEventDetails>().toEqualTypeOf<RadioGroupChangeEventDetails>();
  });

  it('renders the helper group API', async () => {
    const view = render(
      html`${RadioGroup({
        defaultValue: 'a',
        children: [html`<radio-root .value=${'a'}></radio-root>`],
      })}`,
    );
    await flushUpdates();

    const group = view.querySelector(`[${RADIO_GROUP_ATTRIBUTE}]`) as HTMLElement;

    expect(group.tagName).toBe('DIV');
    expect(group).toHaveAttribute('role', 'radiogroup');
    expect(group).toHaveAttribute(RADIO_GROUP_ATTRIBUTE);
  });

  it('renders radio-group as a custom element with role=radiogroup', async () => {
    const view = render(html`<radio-group></radio-group>`);
    await flushUpdates();

    const group = getGroup(view);
    expect(group).toBeInTheDocument();
    expect(group).toHaveAttribute('role', 'radiogroup');
  });

  it('supports uncontrolled mode with defaultValue', async () => {
    const view = render(html`
      <radio-group .defaultValue=${'a'}>
        <radio-root .value=${'a'}></radio-root>
        <radio-root .value=${'b'}></radio-root>
      </radio-group>
    `);
    await flushUpdates();

    const radioA = getRadio(view, 'a') as RadioRootElement;
    const radioB = getRadio(view, 'b') as RadioRootElement;

    expect(radioA).toHaveAttribute('aria-checked', 'true');
    expect(radioB).toHaveAttribute('aria-checked', 'false');
    expect(radioA.tabIndex).toBe(0);
    expect(radioB.tabIndex).toBe(-1);
  });

  it('calls onValueChange with the new value and event details', async () => {
    const handleChange = vi.fn();
    const view = render(html`
      <radio-group .defaultValue=${'a'} .onValueChange=${handleChange}>
        <radio-root .value=${'a'}></radio-root>
        <radio-root .value=${'b'}></radio-root>
      </radio-group>
    `);
    await flushUpdates();

    const radioB = getRadio(view, 'b') as RadioRootElement;
    radioB.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true, shiftKey: true }),
    );
    await flushUpdates();

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange.mock.calls[0]?.[0]).toBe('b');
    expect(handleChange.mock.calls[0]?.[1]).toHaveProperty('reason', 'none');
    expect(handleChange.mock.calls[0]?.[1].event.shiftKey).toBe(true);
  });

  it('cancels value change when onValueChange calls cancel()', async () => {
    const handleChange = vi.fn((_value: unknown, eventDetails: RadioGroupChangeEventDetails) => {
      eventDetails.cancel();
    });
    const view = render(html`
      <radio-group .defaultValue=${'a'} .onValueChange=${handleChange}>
        <radio-root .value=${'a'}></radio-root>
        <radio-root .value=${'b'}></radio-root>
      </radio-group>
    `);
    await flushUpdates();

    const radioA = getRadio(view, 'a') as RadioRootElement;
    const radioB = getRadio(view, 'b') as RadioRootElement;

    radioB.click();
    await flushUpdates();

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(radioA).toHaveAttribute('aria-checked', 'true');
    expect(radioB).toHaveAttribute('aria-checked', 'false');
  });

  it('supports controlled mode and snaps back to the controlled value', async () => {
    const handleChange = vi.fn();
    const view = render(html`
      <radio-group .onValueChange=${handleChange}>
        <radio-root .value=${'a'}></radio-root>
        <radio-root .value=${'b'}></radio-root>
      </radio-group>
    `);
    const group = getGroup(view);
    group.value = 'a';
    await flushUpdates();

    const radioA = getRadio(view, 'a') as RadioRootElement;
    const radioB = getRadio(view, 'b') as RadioRootElement;

    expect(radioA).toHaveAttribute('aria-checked', 'true');

    radioB.click();
    await flushUpdates();

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(radioA).toHaveAttribute('aria-checked', 'true');
    expect(radioB).toHaveAttribute('aria-checked', 'false');
  });

  it('navigates with arrow keys and wraps around', async () => {
    const view = render(html`
      <radio-group .defaultValue=${'a'}>
        <radio-root .value=${'a'}></radio-root>
        <radio-root .value=${'b'}></radio-root>
        <radio-root .value=${'c'}></radio-root>
      </radio-group>
    `);
    await flushUpdates();

    const radioA = getRadio(view, 'a') as RadioRootElement;
    radioA.focus();
    radioA.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowRight' }),
    );
    await flushUpdates();

    expect(getRadio(view, 'b')).toHaveAttribute('aria-checked', 'true');

    (getRadio(view, 'b') as RadioRootElement).dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowLeft' }),
    );
    await flushUpdates();

    expect(getRadio(view, 'a')).toHaveAttribute('aria-checked', 'true');

    (getRadio(view, 'a') as RadioRootElement).dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowLeft' }),
    );
    await flushUpdates();

    expect(getRadio(view, 'c')).toHaveAttribute('aria-checked', 'true');
  });

  it('does not change state when disabled', async () => {
    const view = render(html`
      <radio-group .disabled=${true}>
        <radio-root .value=${'a'}></radio-root>
      </radio-group>
    `);
    await flushUpdates();

    const radio = getRadio(view, 'a') as RadioRootElement;
    radio.click();
    await flushUpdates();

    expect(radio).toHaveAttribute('aria-checked', 'false');
    expect(getGroup(view)).toHaveAttribute('aria-disabled', 'true');
  });

  it('does not change state when readOnly', async () => {
    const view = render(html`
      <radio-group .readOnly=${true}>
        <radio-root .value=${'a'}></radio-root>
      </radio-group>
    `);
    await flushUpdates();

    const radio = getRadio(view, 'a') as RadioRootElement;
    radio.click();
    await flushUpdates();

    expect(radio).toHaveAttribute('aria-checked', 'false');
    expect(getGroup(view)).toHaveAttribute('aria-readonly', 'true');
  });

  it('sets name on child hidden inputs and submits the checked value via form data', async () => {
    const view = render(html`
      <form>
        <radio-group name="fruit" .defaultValue=${'b'}>
          <radio-root .value=${'a'}></radio-root>
          <radio-root .value=${'b'}></radio-root>
        </radio-group>
      </form>
    `);
    await flushUpdates();

    const form = view.querySelector('form') as HTMLFormElement;
    const inputs = view.querySelectorAll('input[type="radio"]') as NodeListOf<HTMLInputElement>;

    inputs.forEach((input) => {
      expect(input).toHaveAttribute('name', 'fruit');
    });
    expect(new FormData(form).get('fruit')).toBe('b');

    const radioA = getRadio(view, 'a') as RadioRootElement;
    radioA.click();
    await flushUpdates();

    expect(new FormData(form).get('fruit')).toBe('a');
  });

  it('returns null in form data when no radio is selected', async () => {
    const view = render(html`
      <form>
        <radio-group name="group">
          <radio-root .value=${'a'}></radio-root>
          <radio-root .value=${'b'}></radio-root>
        </radio-group>
      </form>
    `);
    await flushUpdates();

    const form = view.querySelector('form') as HTMLFormElement;
    expect(new FormData(form).get('group')).toBe(null);
  });

  it('does not submit a value when name is omitted', async () => {
    const view = render(html`
      <form>
        <radio-group .defaultValue=${'b'}>
          <radio-root .value=${'a'}></radio-root>
          <radio-root .value=${'b'}></radio-root>
        </radio-group>
      </form>
    `);
    await flushUpdates();

    const inputs = view.querySelectorAll('input[type="radio"]') as NodeListOf<HTMLInputElement>;
    inputs.forEach((input) => {
      expect(input).not.toHaveAttribute('name');
    });
  });

  it('tracks focused and touched state', async () => {
    const view = render(html`
      <radio-group>
        <radio-root .value=${'a'}></radio-root>
      </radio-group>
    `);
    await flushUpdates();

    const group = getGroup(view);
    const radio = getRadio(view, 'a') as RadioRootElement;

    expect(group).not.toHaveAttribute('data-focused');
    expect(group).not.toHaveAttribute('data-touched');

    radio.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await flushUpdates();
    expect(group).toHaveAttribute('data-focused');

    radio.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    await flushUpdates();
    expect(group).not.toHaveAttribute('data-focused');
    expect(group).toHaveAttribute('data-touched');
  });

  it('tracks dirty and filled state', async () => {
    const view = render(html`
      <radio-group>
        <radio-root .value=${'a'}></radio-root>
        <radio-root .value=${'b'}></radio-root>
      </radio-group>
    `);
    await flushUpdates();

    const group = getGroup(view);
    expect(group).not.toHaveAttribute('data-dirty');
    expect(group).not.toHaveAttribute('data-filled');

    const radioA = getRadio(view, 'a') as RadioRootElement;
    radioA.click();
    await flushUpdates();

    expect(group).toHaveAttribute('data-dirty');
    expect(group).toHaveAttribute('data-filled');
  });

  it('inherits disabled state to child radios', async () => {
    const view = render(html`
      <radio-group .disabled=${true} .required=${true}>
        <radio-root .value=${'a'}></radio-root>
      </radio-group>
    `);
    await flushUpdates();

    const group = getGroup(view);
    const radio = getRadio(view, 'a') as RadioRootElement;

    expect(group).toHaveAttribute('aria-disabled', 'true');
    expect(group).toHaveAttribute('aria-required', 'true');
    expect(radio).toHaveAttribute('aria-disabled', 'true');
    expect(radio).toHaveAttribute('data-disabled');
  });
});
