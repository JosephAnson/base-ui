import { html, nothing, render as renderTemplate } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import {
  Radio,
  RadioIndicator,
  RadioIndicatorElement,
  type RadioIndicatorProps,
  type RadioIndicatorState,
  RadioRoot,
  RadioRootElement,
  type RadioRootChangeEventDetails,
  type RadioRootProps,
  type RadioRootState,
} from './index';
import './index';
import {
  RADIO_GROUP_ATTRIBUTE,
  setRadioGroupRuntimeState,
  type RadioGroupRuntimeState,
} from '../radio-group/shared';

describe('radio', () => {
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

  async function flushUpdates(count = 2) {
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

  function getRadio(view: HTMLElement) {
    return view.querySelector('radio-root') as RadioRootElement;
  }

  function getHiddenInput(view: HTMLElement) {
    return view.querySelector('input[type="radio"]') as HTMLInputElement;
  }

  function createMockGroup(overrides: Partial<RadioGroupRuntimeState> = {}) {
    const groupElement = document.createElement('div');
    groupElement.setAttribute(RADIO_GROUP_ATTRIBUTE, '');
    const state: RadioGroupRuntimeState = {
      id: 'test-group',
      name: undefined,
      checkedValue: undefined,
      disabled: false,
      readOnly: false,
      required: false,
      registerControl: vi.fn(),
      unregisterControl: vi.fn(),
      registerInput: vi.fn(),
      unregisterInput: vi.fn(),
      setCheckedValue: vi.fn(() => true),
      getTabIndex: vi.fn((_value, disabled) => (disabled ? -1 : 0)),
      moveFocus: vi.fn(() => ({ handled: false, selectionCommitted: false })),
      ...overrides,
    };

    setRadioGroupRuntimeState(groupElement, state);
    return { groupElement, state };
  }

  function renderInGroup(
    radioTemplate: ReturnType<typeof html>,
    overrides: Partial<RadioGroupRuntimeState> = {},
  ) {
    const { groupElement, state } = createMockGroup(overrides);
    const container = document.createElement('div');
    document.body.append(container);
    containers.add(container);
    container.append(groupElement);
    renderTemplate(radioTemplate, groupElement);
    return { groupElement, state };
  }

  it('exposes the radio runtime export and namespace aliases', () => {
    expect(Radio.Root).toBe(RadioRootElement);
    expect(Radio.Indicator).toBe(RadioIndicatorElement);
    expectTypeOf<RadioRoot.Props>().toEqualTypeOf<RadioRootProps>();
    expectTypeOf<RadioRoot.State>().toEqualTypeOf<RadioRootState>();
    expectTypeOf<RadioRoot.ChangeEventDetails>().toEqualTypeOf<RadioRootChangeEventDetails>();
    expectTypeOf<RadioIndicator.Props>().toEqualTypeOf<RadioIndicatorProps>();
    expectTypeOf<RadioIndicator.State>().toEqualTypeOf<RadioIndicatorState>();
  });

  it('renders radio-root as a custom element with a hidden radio input', async () => {
    const view = render(html`<radio-root></radio-root>`);
    await flushUpdates();

    const radio = getRadio(view);
    const input = getHiddenInput(view);

    expect(radio).toBeInTheDocument();
    expect(radio).toHaveAttribute('role', 'radio');
    expect(radio).toHaveAttribute('aria-checked', 'false');
    expect(input).toHaveAttribute('type', 'radio');
    expect(input).toHaveAttribute('aria-hidden', 'true');
    expect(input.tabIndex).toBe(-1);
  });

  it('uses aria-disabled instead of HTML disabled and mirrors readOnly and required', async () => {
    const view = render(html`
      <radio-root .disabled=${true} .readOnly=${true} .required=${true}></radio-root>
    `);
    await flushUpdates();

    const radio = getRadio(view);

    expect(radio).not.toHaveAttribute('disabled');
    expect(radio).toHaveAttribute('aria-disabled', 'true');
    expect(radio).toHaveAttribute('aria-readonly', 'true');
    expect(radio).toHaveAttribute('aria-required', 'true');
    expect(radio).toHaveAttribute('data-disabled');
    expect(radio).toHaveAttribute('data-readonly');
    expect(radio).toHaveAttribute('data-required');
  });

  it('associates aria-labelledby from explicit and implicit labels', async () => {
    const view = render(html`
      <div>
        <label for="radio-explicit">Explicit label</label>
        <radio-root id="radio-explicit"></radio-root>
      </div>
    `);
    const utils = render(html`
      <label>
        Implicit label
        <radio-root></radio-root>
      </label>
    `);
    await flushUpdates();

    const explicitRadio = getRadio(view);
    const implicitRadio = getRadio(utils);

    expect(explicitRadio).toHaveAttribute('aria-labelledby');
    expect(implicitRadio).toHaveAttribute('aria-labelledby');
  });

  it('shows as checked when group value matches, including null values', async () => {
    const { groupElement: nullGroup } = renderInGroup(
      html`<radio-root .value=${null}></radio-root>`,
      { checkedValue: null },
    );
    const { groupElement: stringGroup } = renderInGroup(
      html`<radio-root .value=${'a'}></radio-root>`,
      { checkedValue: 'a' },
    );
    await flushUpdates();

    expect(nullGroup.querySelector('radio-root') as RadioRootElement).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(stringGroup.querySelector('radio-root') as RadioRootElement).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('calls group setCheckedValue on click with change details', async () => {
    const setCheckedValue = vi.fn(() => true);
    const { groupElement } = renderInGroup(html`<radio-root .value=${'a'}></radio-root>`, {
      setCheckedValue,
    });
    await flushUpdates();

    const radio = groupElement.querySelector('radio-root') as RadioRootElement;
    radio.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true, shiftKey: true }),
    );
    await flushUpdates();

    expect(setCheckedValue).toHaveBeenCalledTimes(1);
    expect(setCheckedValue).toHaveBeenCalledWith(
      'a',
      expect.objectContaining({ reason: 'none', trigger: radio }),
    );
    expect(setCheckedValue.mock.calls[0]?.[1].event.shiftKey).toBe(true);
  });

  it('does not call setCheckedValue when already checked', async () => {
    const setCheckedValue = vi.fn(() => true);
    const { groupElement } = renderInGroup(html`<radio-root .value=${'a'}></radio-root>`, {
      checkedValue: 'a',
      setCheckedValue,
    });
    await flushUpdates();

    const radio = groupElement.querySelector('radio-root') as RadioRootElement;
    radio.click();
    await flushUpdates();

    expect(setCheckedValue).not.toHaveBeenCalled();
  });

  it('registers with the group on connect and unregisters on disconnect', async () => {
    const registerControl = vi.fn();
    const unregisterControl = vi.fn();
    const registerInput = vi.fn();
    const unregisterInput = vi.fn();
    const { groupElement } = renderInGroup(html`<radio-root .value=${'a'}></radio-root>`, {
      registerControl,
      unregisterControl,
      registerInput,
      unregisterInput,
    });
    await flushUpdates();

    expect(registerControl).toHaveBeenCalled();
    expect(registerInput).toHaveBeenCalled();

    const radio = groupElement.querySelector('radio-root') as RadioRootElement;
    radio.remove();

    expect(unregisterControl).toHaveBeenCalled();
    expect(unregisterInput).toHaveBeenCalled();
  });

  it('inherits disabled and readOnly state from the group and uses group tabindex management', async () => {
    const getTabIndex = vi.fn(() => -1);
    const { groupElement } = renderInGroup(html`<radio-root .value=${'a'}></radio-root>`, {
      disabled: true,
      readOnly: true,
      required: true,
      getTabIndex,
      name: 'color',
    });
    await flushUpdates();

    const radio = groupElement.querySelector('radio-root') as RadioRootElement;
    const input = groupElement.querySelector('input[type="radio"]') as HTMLInputElement;

    expect(radio).toHaveAttribute('aria-disabled', 'true');
    expect(radio).toHaveAttribute('aria-readonly', 'true');
    expect(radio).toHaveAttribute('aria-required', 'true');
    expect(radio.tabIndex).toBe(-1);
    expect(input).toHaveAttribute('name', 'color');
  });

  it('indicator visibility and data attributes follow the radio state', async () => {
    const { groupElement, state } = renderInGroup(
      html`<radio-root .value=${'a'}>
        <radio-indicator keep-mounted></radio-indicator>
      </radio-root>`,
      {
        checkedValue: 'a',
        disabled: true,
        readOnly: true,
        required: true,
      },
    );
    await flushUpdates();

    const indicator = groupElement.querySelector('radio-indicator') as HTMLElement;
    expect(indicator).not.toHaveAttribute('hidden');
    expect(indicator).toHaveAttribute('data-checked');
    expect(indicator).toHaveAttribute('data-disabled');
    expect(indicator).toHaveAttribute('data-readonly');
    expect(indicator).toHaveAttribute('data-required');

    setRadioGroupRuntimeState(groupElement, { ...state, checkedValue: 'b' });
    groupElement.dispatchEvent(new CustomEvent('base-ui-radio-group-state-change'));
    await flushUpdates();

    expect(indicator).not.toHaveAttribute('hidden');
    expect(indicator).toHaveAttribute('data-unchecked');
  });

  it('logs an error when radio-indicator is rendered outside radio-root', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(html`<radio-indicator></radio-indicator>`);

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Radio parts must be placed within <radio-root>'),
    );
  });
});
