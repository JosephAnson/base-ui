import { html, nothing, render as renderTemplate } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import './index.ts';
import type { RadioRootElement } from './index.ts';
import {
  RADIO_GROUP_ATTRIBUTE,
  setRadioGroupRuntimeState,
  type RadioGroupRuntimeState,
} from '../radio-group/shared.ts';

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

  async function waitForUpdate() {
    await new Promise((r) => setTimeout(r, 0));
  }

  function getRadio(container: HTMLElement) {
    return container.querySelector('radio-root') as RadioRootElement;
  }

  function getHiddenInput(container: HTMLElement) {
    return container.querySelector('input[type="radio"]') as HTMLInputElement;
  }

  /**
   * Creates a mock radio group element with the given state.
   */
  function createMockGroup(overrides: Partial<RadioGroupRuntimeState> = {}): HTMLDivElement {
    const groupEl = document.createElement('div');
    groupEl.setAttribute(RADIO_GROUP_ATTRIBUTE, '');
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
    setRadioGroupRuntimeState(groupEl, state);
    return groupEl;
  }

  it('renders radio-root as a custom element with role=radio', async () => {
    const container = render(html`<radio-root></radio-root>`);
    await waitForUpdate();

    const el = getRadio(container);
    expect(el).toBeInTheDocument();
    expect(el).toHaveAttribute('role', 'radio');
    expect(el).toHaveAttribute('aria-checked', 'false');
  });

  it('renders a hidden radio input inside the element', async () => {
    const container = render(html`<radio-root></radio-root>`);
    await waitForUpdate();

    const input = getHiddenInput(container);
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'radio');
    expect(input).toHaveAttribute('aria-hidden', 'true');
    expect(input.tabIndex).toBe(-1);
  });

  it('uses aria-disabled instead of html disabled', async () => {
    const container = render(html`<radio-root .disabled=${true}></radio-root>`);
    await waitForUpdate();

    const el = getRadio(container);
    expect(el).not.toHaveAttribute('disabled');
    expect(el).toHaveAttribute('aria-disabled', 'true');
    expect(el).toHaveAttribute('data-disabled');
  });

  it('sets aria-readonly when readOnly', async () => {
    const container = render(html`<radio-root .readOnly=${true}></radio-root>`);
    await waitForUpdate();

    const el = getRadio(container);
    expect(el).toHaveAttribute('aria-readonly', 'true');
    expect(el).toHaveAttribute('data-readonly');
  });

  it('sets aria-required when required', async () => {
    const container = render(html`<radio-root .required=${true}></radio-root>`);
    await waitForUpdate();

    const el = getRadio(container);
    expect(el).toHaveAttribute('aria-required', 'true');
    expect(el).toHaveAttribute('data-required');
  });

  it('is focusable with tabindex=0 and unfocusable when disabled', async () => {
    const container = render(html`<radio-root></radio-root>`);
    await waitForUpdate();

    const el = getRadio(container);
    expect(el.tabIndex).toBe(0);

    el.disabled = true;
    await el.updateComplete;
    expect(el.tabIndex).toBe(-1);
  });

  it('logs error when radio-indicator is rendered outside radio-root', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(html`<radio-indicator></radio-indicator>`);

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Radio parts must be placed within <radio-root>'),
    );

    errorSpy.mockRestore();
  });

  describe('within a group', () => {
    function renderInGroup(
      radioHtml: ReturnType<typeof html>,
      groupOverrides: Partial<RadioGroupRuntimeState> = {},
    ) {
      const groupEl = createMockGroup(groupOverrides);
      const container = document.createElement('div');
      document.body.append(container);
      containers.add(container);
      container.append(groupEl);
      renderTemplate(radioHtml, groupEl);
      return { container, groupEl };
    }

    it('shows as checked when group value matches', async () => {
      const { groupEl } = renderInGroup(
        html`<radio-root .value=${'a'}></radio-root>`,
        { checkedValue: 'a' },
      );
      await waitForUpdate();

      const el = groupEl.querySelector('radio-root') as RadioRootElement;
      expect(el).toHaveAttribute('aria-checked', 'true');
      expect(el).toHaveAttribute('data-checked');
    });

    it('shows as unchecked when group value does not match', async () => {
      const { groupEl } = renderInGroup(
        html`<radio-root .value=${'a'}></radio-root>`,
        { checkedValue: 'b' },
      );
      await waitForUpdate();

      const el = groupEl.querySelector('radio-root') as RadioRootElement;
      expect(el).toHaveAttribute('aria-checked', 'false');
      expect(el).toHaveAttribute('data-unchecked');
    });

    it('calls group setCheckedValue on click', async () => {
      const setCheckedValue = vi.fn(() => true);
      const { groupEl } = renderInGroup(
        html`<radio-root .value=${'a'}></radio-root>`,
        { setCheckedValue },
      );
      await waitForUpdate();

      const el = groupEl.querySelector('radio-root') as RadioRootElement;
      el.click();
      await waitForUpdate();

      expect(setCheckedValue).toHaveBeenCalledTimes(1);
      expect(setCheckedValue).toHaveBeenCalledWith(
        'a',
        expect.objectContaining({ reason: 'none' }),
      );
    });

    it('does not call setCheckedValue when already checked', async () => {
      const setCheckedValue = vi.fn(() => true);
      const { groupEl } = renderInGroup(
        html`<radio-root .value=${'a'}></radio-root>`,
        { checkedValue: 'a', setCheckedValue },
      );
      await waitForUpdate();

      const el = groupEl.querySelector('radio-root') as RadioRootElement;
      el.click();
      await waitForUpdate();

      expect(setCheckedValue).not.toHaveBeenCalled();
    });

    it('registers with the group on connect and unregisters on disconnect', async () => {
      const registerControl = vi.fn();
      const unregisterControl = vi.fn();
      const registerInput = vi.fn();
      const unregisterInput = vi.fn();

      const { groupEl } = renderInGroup(
        html`<radio-root .value=${'a'}></radio-root>`,
        { registerControl, unregisterControl, registerInput, unregisterInput },
      );
      await waitForUpdate();

      expect(registerControl).toHaveBeenCalled();
      expect(registerInput).toHaveBeenCalled();

      const el = groupEl.querySelector('radio-root') as RadioRootElement;
      el.remove();

      expect(unregisterControl).toHaveBeenCalled();
      expect(unregisterInput).toHaveBeenCalled();
    });

    it('inherits disabled state from group', async () => {
      const { groupEl } = renderInGroup(
        html`<radio-root .value=${'a'}></radio-root>`,
        { disabled: true },
      );
      await waitForUpdate();

      const el = groupEl.querySelector('radio-root') as RadioRootElement;
      expect(el).toHaveAttribute('aria-disabled', 'true');
      expect(el).toHaveAttribute('data-disabled');
    });

    it('inherits readOnly state from group', async () => {
      const { groupEl } = renderInGroup(
        html`<radio-root .value=${'a'}></radio-root>`,
        { readOnly: true },
      );
      await waitForUpdate();

      const el = groupEl.querySelector('radio-root') as RadioRootElement;
      expect(el).toHaveAttribute('aria-readonly', 'true');
    });

    it('uses group tabIndex management', async () => {
      const getTabIndex = vi.fn(() => -1);
      const { groupEl } = renderInGroup(
        html`<radio-root .value=${'a'}></radio-root>`,
        { getTabIndex },
      );
      await waitForUpdate();

      const el = groupEl.querySelector('radio-root') as RadioRootElement;
      expect(el.tabIndex).toBe(-1);
      expect(getTabIndex).toHaveBeenCalled();
    });

    it('sets name on hidden input from group', async () => {
      const { groupEl } = renderInGroup(
        html`<radio-root .value=${'a'}></radio-root>`,
        { name: 'color' },
      );
      await waitForUpdate();

      const input = groupEl.querySelector('input[type="radio"]') as HTMLInputElement;
      expect(input).toHaveAttribute('name', 'color');
    });
  });

  describe('indicator', () => {
    it('indicator shows when checked and hides when unchecked', async () => {
      const groupEl = createMockGroup({ checkedValue: 'a' });
      const container = document.createElement('div');
      document.body.append(container);
      containers.add(container);
      container.append(groupEl);
      renderTemplate(
        html`<radio-root .value=${'a'}>
          <radio-indicator></radio-indicator>
        </radio-root>`,
        groupEl,
      );
      await waitForUpdate();

      const indicator = groupEl.querySelector('radio-indicator') as HTMLElement;
      expect(indicator).not.toHaveAttribute('hidden');

      // Change group to select a different value
      setRadioGroupRuntimeState(groupEl, {
        ...createMockGroup().dataset,
        id: 'test-group',
        name: undefined,
        checkedValue: 'b',
        disabled: false,
        readOnly: false,
        required: false,
        registerControl: vi.fn(),
        unregisterControl: vi.fn(),
        registerInput: vi.fn(),
        unregisterInput: vi.fn(),
        setCheckedValue: vi.fn(() => true),
        getTabIndex: vi.fn(() => 0),
        moveFocus: vi.fn(() => ({ handled: false, selectionCommitted: false })),
      } as unknown as RadioGroupRuntimeState);

      // Dispatch group state change
      groupEl.dispatchEvent(new CustomEvent('base-ui-radio-group-state-change'));
      await waitForUpdate();
      await waitForUpdate();

      expect(indicator).toHaveAttribute('hidden');
    });

    it('indicator stays in DOM when keep-mounted', async () => {
      const container = render(html`
        <radio-root>
          <radio-indicator keep-mounted></radio-indicator>
        </radio-root>
      `);
      await waitForUpdate();

      const indicator = container.querySelector('radio-indicator') as HTMLElement;
      expect(indicator).toBeInTheDocument();
      expect(indicator).not.toHaveAttribute('hidden');
    });

    it('indicator mirrors data attributes from parent', async () => {
      const groupEl = createMockGroup({
        checkedValue: 'a',
        disabled: true,
        readOnly: true,
        required: true,
      });
      const container = document.createElement('div');
      document.body.append(container);
      containers.add(container);
      container.append(groupEl);
      renderTemplate(
        html`<radio-root .value=${'a'}>
          <radio-indicator keep-mounted></radio-indicator>
        </radio-root>`,
        groupEl,
      );
      await waitForUpdate();

      const indicator = groupEl.querySelector('radio-indicator') as HTMLElement;

      expect(indicator).toHaveAttribute('data-checked');
      expect(indicator).not.toHaveAttribute('data-unchecked');
      expect(indicator).toHaveAttribute('data-disabled');
      expect(indicator).toHaveAttribute('data-readonly');
      expect(indicator).toHaveAttribute('data-required');
    });
  });
});
