import { html, nothing, render as renderTemplate } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import '../checkbox/index.ts';
import './index.ts';
import {
  CHECKBOX_GROUP_ATTRIBUTE,
} from './shared.ts';
import {
  CheckboxGroup,
  type CheckboxGroupChangeEventDetails,
  CheckboxGroupElement,
  type CheckboxGroupProps,
  type CheckboxGroupState,
} from './index.ts';
import type { CheckboxRootElement } from '../checkbox/index.ts';

describe('checkbox-group', () => {
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
    for (let i = 0; i < 4; i++) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  function getGroup(container: HTMLElement) {
    return container.querySelector('checkbox-group') as CheckboxGroupElement;
  }

  function getCheckbox(container: HTMLElement, value: string) {
    const checkboxes = container.querySelectorAll('checkbox-root') as NodeListOf<CheckboxRootElement>;
    for (const cb of checkboxes) {
      if (cb.value === value) return cb;
    }
    return null;
  }

  function getParentCheckbox(container: HTMLElement) {
    const checkboxes = container.querySelectorAll('checkbox-root') as NodeListOf<CheckboxRootElement>;
    for (const cb of checkboxes) {
      if (cb.parent) return cb;
    }
    return null;
  }

  it('exposes the checkbox-group runtime export and namespace aliases', () => {
    expect(typeof CheckboxGroup).toBe('function');
    expect(customElements.get('checkbox-group')).toBe(CheckboxGroupElement);
    expectTypeOf<CheckboxGroup.Props>().toEqualTypeOf<CheckboxGroupProps>();
    expectTypeOf<CheckboxGroup.State>().toEqualTypeOf<CheckboxGroupState>();
    expectTypeOf<CheckboxGroup.ChangeEventDetails>().toEqualTypeOf<CheckboxGroupChangeEventDetails>();
  });

  it('renders the helper group API', async () => {
    const container = render(html`${CheckboxGroup({
      defaultValue: ['red'],
      children: html`<checkbox-root .value=${'red'}></checkbox-root>`,
    })}`);
    await waitForUpdate();

    const group = container.querySelector(`[${CHECKBOX_GROUP_ATTRIBUTE}]`) as HTMLElement;

    expect(group.tagName).toBe('DIV');
    expect(group).toHaveAttribute('role', 'group');
    expect(group).toHaveAttribute(CHECKBOX_GROUP_ATTRIBUTE);
  });

  it('adds data-disabled to the helper group when disabled', async () => {
    const container = render(html`${CheckboxGroup({
      disabled: true,
      children: html`<checkbox-root .value=${'red'}></checkbox-root>`,
    })}`);
    await waitForUpdate();

    const group = container.querySelector(`[${CHECKBOX_GROUP_ATTRIBUTE}]`) as HTMLElement;

    expect(group).toHaveAttribute('data-disabled');
  });

  it('renders checkbox-group as a custom element with role=group', async () => {
    const container = render(html`<checkbox-group></checkbox-group>`);
    await waitForUpdate();

    const group = getGroup(container);
    expect(group).toBeInTheDocument();
    expect(group).toHaveAttribute('role', 'group');
  });

  it('controls child checkboxes with defaultValue', async () => {
    const container = render(html`
      <checkbox-group .defaultValue=${['red']}>
        <checkbox-root .value=${'red'}></checkbox-root>
        <checkbox-root .value=${'green'}></checkbox-root>
        <checkbox-root .value=${'blue'}></checkbox-root>
      </checkbox-group>
    `);
    await waitForUpdate();

    expect(getCheckbox(container, 'red')).toHaveAttribute('aria-checked', 'true');
    expect(getCheckbox(container, 'green')).toHaveAttribute('aria-checked', 'false');
    expect(getCheckbox(container, 'blue')).toHaveAttribute('aria-checked', 'false');
  });

  it('toggles child checkboxes in uncontrolled mode', async () => {
    const container = render(html`
      <checkbox-group .defaultValue=${['red']}>
        <checkbox-root .value=${'red'}></checkbox-root>
        <checkbox-root .value=${'green'}></checkbox-root>
      </checkbox-group>
    `);
    await waitForUpdate();

    const green = getCheckbox(container, 'green')!;
    green.click();
    await waitForUpdate();

    expect(getCheckbox(container, 'red')).toHaveAttribute('aria-checked', 'true');
    expect(getCheckbox(container, 'green')).toHaveAttribute('aria-checked', 'true');
  });

  it('calls onValueChange with the new value array', async () => {
    const handleChange = vi.fn();
    const container = render(html`
      <checkbox-group .defaultValue=${['red']} .onValueChange=${handleChange}>
        <checkbox-root .value=${'red'}></checkbox-root>
        <checkbox-root .value=${'green'}></checkbox-root>
      </checkbox-group>
    `);
    await waitForUpdate();

    const green = getCheckbox(container, 'green')!;
    green.click();
    await waitForUpdate();

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange.mock.calls[0]?.[0]).toEqual(['red', 'green']);
    expect(handleChange.mock.calls[0]?.[1]).toHaveProperty('reason', 'none');
  });

  it('supports controlled mode', async () => {
    const handleChange = vi.fn();
    const container = render(html`
      <checkbox-group .onValueChange=${handleChange}>
        <checkbox-root .value=${'red'}></checkbox-root>
        <checkbox-root .value=${'green'}></checkbox-root>
      </checkbox-group>
    `);
    const group = getGroup(container);
    group.value = ['red'];
    await waitForUpdate();

    expect(getCheckbox(container, 'red')).toHaveAttribute('aria-checked', 'true');
    expect(getCheckbox(container, 'green')).toHaveAttribute('aria-checked', 'false');

    // Click green — controlled mode, value won't change without external update
    const green = getCheckbox(container, 'green')!;
    green.click();
    await waitForUpdate();

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange.mock.calls[0]?.[0]).toEqual(['red', 'green']);
  });

  it('disables all checkboxes in the group', async () => {
    const container = render(html`
      <checkbox-group .disabled=${true}>
        <checkbox-root .value=${'red'}></checkbox-root>
        <checkbox-root .value=${'green'}></checkbox-root>
      </checkbox-group>
    `);
    await waitForUpdate();

    expect(getCheckbox(container, 'red')).toHaveAttribute('aria-disabled', 'true');
    expect(getCheckbox(container, 'green')).toHaveAttribute('aria-disabled', 'true');
    expect(getGroup(container)).toHaveAttribute('data-disabled');
  });

  it('unchecks a child checkbox when clicked again', async () => {
    const container = render(html`
      <checkbox-group .defaultValue=${['red']}>
        <checkbox-root .value=${'red'}></checkbox-root>
        <checkbox-root .value=${'green'}></checkbox-root>
      </checkbox-group>
    `);
    await waitForUpdate();

    const red = getCheckbox(container, 'red')!;
    red.click();
    await waitForUpdate();

    expect(getCheckbox(container, 'red')).toHaveAttribute('aria-checked', 'false');
  });

  describe('parent checkbox', () => {
    it('lets a parent checkbox select all children', async () => {
      const handleChange = vi.fn();
      const container = render(html``);

      function rerender(value: string[]) {
        renderTemplate(html`
          <checkbox-group
            .value=${value}
            .allValues=${['a', 'b', 'c']}
            .onValueChange=${(nextValue: string[]) => {
              handleChange(nextValue);
              rerender(nextValue);
            }}
          >
            <checkbox-root .parent=${true}></checkbox-root>
            <checkbox-root .value=${'a'}></checkbox-root>
            <checkbox-root .value=${'b'}></checkbox-root>
            <checkbox-root .value=${'c'}></checkbox-root>
          </checkbox-group>
        `, container);
      }

      rerender([]);
      await waitForUpdate();

      const parent = getParentCheckbox(container)!;
      expect(parent).toHaveAttribute('aria-checked', 'false');

      // Click parent → select all
      parent.click();
      await waitForUpdate();

      expect(getCheckbox(container, 'a')).toHaveAttribute('aria-checked', 'true');
      expect(getCheckbox(container, 'b')).toHaveAttribute('aria-checked', 'true');
      expect(getCheckbox(container, 'c')).toHaveAttribute('aria-checked', 'true');

      // Click parent again → deselect all
      getParentCheckbox(container)!.click();
      await waitForUpdate();

      expect(getCheckbox(container, 'a')).toHaveAttribute('aria-checked', 'false');
      expect(getCheckbox(container, 'b')).toHaveAttribute('aria-checked', 'false');
      expect(getCheckbox(container, 'c')).toHaveAttribute('aria-checked', 'false');
    });

    it('shows mixed state when some children are checked', async () => {
      const container = render(html``);

      function rerender(value: string[]) {
        renderTemplate(html`
          <checkbox-group
            .value=${value}
            .allValues=${['a', 'b', 'c']}
            .onValueChange=${(nextValue: string[]) => {
              rerender(nextValue);
            }}
          >
            <checkbox-root .parent=${true}></checkbox-root>
            <checkbox-root .value=${'a'}></checkbox-root>
            <checkbox-root .value=${'b'}></checkbox-root>
            <checkbox-root .value=${'c'}></checkbox-root>
          </checkbox-group>
        `, container);
      }

      rerender([]);
      await waitForUpdate();

      // Check child 'a'
      getCheckbox(container, 'a')!.click();
      await waitForUpdate();

      const parent = getParentCheckbox(container)!;
      expect(parent).toHaveAttribute('aria-checked', 'mixed');
    });

    it('preserves the mixed selection cycle', async () => {
      const container = render(html``);

      function rerender(value: string[]) {
        renderTemplate(html`
          <checkbox-group
            .value=${value}
            .allValues=${['a', 'b', 'c']}
            .onValueChange=${(nextValue: string[]) => {
              rerender(nextValue);
            }}
          >
            <checkbox-root .parent=${true}></checkbox-root>
            <checkbox-root .value=${'a'}></checkbox-root>
            <checkbox-root .value=${'b'}></checkbox-root>
            <checkbox-root .value=${'c'}></checkbox-root>
          </checkbox-group>
        `, container);
      }

      rerender([]);
      await waitForUpdate();

      // Check child 'a' → mixed
      getCheckbox(container, 'a')!.click();
      await waitForUpdate();
      expect(getParentCheckbox(container)!).toHaveAttribute('aria-checked', 'mixed');

      // Click parent → all on
      getParentCheckbox(container)!.click();
      await waitForUpdate();
      expect(getCheckbox(container, 'a')).toHaveAttribute('aria-checked', 'true');
      expect(getCheckbox(container, 'b')).toHaveAttribute('aria-checked', 'true');
      expect(getCheckbox(container, 'c')).toHaveAttribute('aria-checked', 'true');

      // Click parent → all off
      getParentCheckbox(container)!.click();
      await waitForUpdate();
      expect(getCheckbox(container, 'a')).toHaveAttribute('aria-checked', 'false');
      expect(getCheckbox(container, 'b')).toHaveAttribute('aria-checked', 'false');
      expect(getCheckbox(container, 'c')).toHaveAttribute('aria-checked', 'false');

      // Click parent → back to mixed (original selection of just 'a')
      getParentCheckbox(container)!.click();
      await waitForUpdate();
      expect(getParentCheckbox(container)!).toHaveAttribute('aria-checked', 'mixed');
      expect(getCheckbox(container, 'a')).toHaveAttribute('aria-checked', 'true');
      expect(getCheckbox(container, 'b')).toHaveAttribute('aria-checked', 'false');
      expect(getCheckbox(container, 'c')).toHaveAttribute('aria-checked', 'false');
    });

    it('sets aria-controls on the parent checkbox', async () => {
      const container = render(html`
        <checkbox-group .allValues=${['a', 'b', 'c']} .defaultValue=${[]}>
          <checkbox-root .parent=${true}></checkbox-root>
          <checkbox-root .value=${'a'}></checkbox-root>
          <checkbox-root .value=${'b'}></checkbox-root>
          <checkbox-root .value=${'c'}></checkbox-root>
        </checkbox-group>
      `);
      await waitForUpdate();

      const parent = getParentCheckbox(container)!;
      const parentId = parent.id;
      expect(parent).toHaveAttribute(
        'aria-controls',
        `${parentId}-a ${parentId}-b ${parentId}-c`,
      );
    });

    it('excludes parent checkboxes from form submission', async () => {
      const container = render(html``);

      function rerender(value: string[]) {
        renderTemplate(html`
          <form>
            <checkbox-group
              .value=${value}
              .allValues=${['a', 'b']}
              .onValueChange=${(nextValue: string[]) => {
                rerender(nextValue);
              }}
            >
              <checkbox-root .parent=${true} name="item"></checkbox-root>
              <checkbox-root .value=${'a'} name="item"></checkbox-root>
              <checkbox-root .value=${'b'} name="item"></checkbox-root>
            </checkbox-group>
          </form>
        `, container);
      }

      rerender(['a', 'b']);
      await waitForUpdate();

      const form = container.querySelector('form') as HTMLFormElement;
      const formData = new FormData(form);

      // Parent checkbox should NOT be in form data, only children
      expect(formData.getAll('item')).toEqual(['a', 'b']);
    });

    it('keeps disabled children out of parent toggles unless already checked', async () => {
      const container = render(html``);

      function rerender(value: string[]) {
        renderTemplate(html`
          <checkbox-group
            .value=${value}
            .allValues=${['a', 'b', 'c']}
            .onValueChange=${(nextValue: string[]) => {
              rerender(nextValue);
            }}
          >
            <checkbox-root .parent=${true}></checkbox-root>
            <checkbox-root .value=${'a'} .disabled=${true}></checkbox-root>
            <checkbox-root .value=${'b'}></checkbox-root>
            <checkbox-root .value=${'c'}></checkbox-root>
          </checkbox-group>
        `, container);
      }

      rerender(['a']);
      await waitForUpdate();

      // Click parent → all on (including disabled 'a' that was already checked)
      getParentCheckbox(container)!.click();
      await waitForUpdate();

      expect(getCheckbox(container, 'a')).toHaveAttribute('aria-checked', 'true');
      expect(getCheckbox(container, 'b')).toHaveAttribute('aria-checked', 'true');
      expect(getCheckbox(container, 'c')).toHaveAttribute('aria-checked', 'true');

      // Click parent → all off (but disabled 'a' stays checked because it was in the initial selection)
      getParentCheckbox(container)!.click();
      await waitForUpdate();

      expect(getCheckbox(container, 'a')).toHaveAttribute('aria-checked', 'true');
      expect(getCheckbox(container, 'b')).toHaveAttribute('aria-checked', 'false');
      expect(getCheckbox(container, 'c')).toHaveAttribute('aria-checked', 'false');
    });

    it('supports keyboard activation on parent checkbox', async () => {
      const container = render(html``);

      function rerender(value: string[]) {
        renderTemplate(html`
          <checkbox-group
            .value=${value}
            .allValues=${['a', 'b']}
            .onValueChange=${(nextValue: string[]) => {
              rerender(nextValue);
            }}
          >
            <checkbox-root .parent=${true}></checkbox-root>
            <checkbox-root .value=${'a'}></checkbox-root>
            <checkbox-root .value=${'b'}></checkbox-root>
          </checkbox-group>
        `, container);
      }

      rerender([]);
      await waitForUpdate();

      const parent = getParentCheckbox(container)!;
      parent.focus();

      // Space key activates parent
      parent.dispatchEvent(
        new KeyboardEvent('keyup', { bubbles: true, cancelable: true, key: ' ' }),
      );
      await waitForUpdate();

      expect(getCheckbox(container, 'a')).toHaveAttribute('aria-checked', 'true');
      expect(getCheckbox(container, 'b')).toHaveAttribute('aria-checked', 'true');
    });
  });
});
