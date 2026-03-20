/* eslint-disable testing-library/render-result-naming-convention */
import { html, nothing, render as renderTemplate, type TemplateResult } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import type { BaseUIChangeEventDetails } from '@base-ui/lit/types';
import type {
  CheckboxGroupChangeEventDetails,
  CheckboxGroupProps,
  CheckboxGroupState,
} from '@base-ui/lit/checkbox-group';
import { CheckboxGroup } from '@base-ui/lit/checkbox-group';
import { Checkbox } from '@base-ui/lit/checkbox';

describe('CheckboxGroup', () => {
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
    await Array.from({ length: iterations }).reduce<Promise<void>>((promise) => {
      return promise.then(() => Promise.resolve());
    }, Promise.resolve());
  }

  async function flushUpdates(iterations = 4) {
    await flushMicrotasks(iterations);
  }

  function click(element: Element) {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  }

  function getCheckbox(container: HTMLElement, testId: string) {
    return container.querySelector(`[data-testid="${testId}"]`) as HTMLElement;
  }

  it('preserves the public type contracts', () => {
    const checkboxGroup = CheckboxGroup({});

    expectTypeOf(checkboxGroup).toEqualTypeOf<TemplateResult>();
    expectTypeOf<CheckboxGroupProps['value']>().toEqualTypeOf<string[] | undefined>();
    expectTypeOf<CheckboxGroupProps['defaultValue']>().toEqualTypeOf<string[] | undefined>();
    expectTypeOf<CheckboxGroupProps['allValues']>().toEqualTypeOf<string[] | undefined>();
    expectTypeOf<CheckboxGroupProps['disabled']>().toEqualTypeOf<boolean | undefined>();
    expectTypeOf<CheckboxGroupChangeEventDetails>().toEqualTypeOf<BaseUIChangeEventDetails<'none'>>();
    expectTypeOf<CheckboxGroupState['disabled']>().toEqualTypeOf<boolean>();
  });

  it('controls child checkboxes with value and onValueChange', async () => {
    let value = ['red'];
    const handleValueChange = vi.fn(
      (nextValue: string[], eventDetails: CheckboxGroupChangeEventDetails) => {
        value = nextValue;
        rerender();
        return { eventDetails, nextValue };
      },
    );
    const container = render(html``);

    function rerender() {
      renderTemplate(
        CheckboxGroup({
          value,
          onValueChange: handleValueChange,
          children: [
            Checkbox.Root({ value: 'red', 'data-testid': 'red' }),
            Checkbox.Root({ value: 'green', 'data-testid': 'green' }),
            Checkbox.Root({ value: 'blue', 'data-testid': 'blue' }),
          ],
        }),
        container,
      );
    }

    rerender();
    await flushUpdates();

    let red = getCheckbox(container, 'red');
    let green = getCheckbox(container, 'green');
    let blue = getCheckbox(container, 'blue');

    expect(red).toHaveAttribute('aria-checked', 'true');
    expect(green).toHaveAttribute('aria-checked', 'false');
    expect(blue).toHaveAttribute('aria-checked', 'false');

    click(green);
    await flushUpdates();

    red = getCheckbox(container, 'red');
    green = getCheckbox(container, 'green');
    blue = getCheckbox(container, 'blue');

    expect(handleValueChange).toHaveBeenCalledTimes(1);
    expect(handleValueChange.mock.calls[0]?.[0]).toEqual(['red', 'green']);
    expect(handleValueChange.mock.results[0]?.value.eventDetails.reason).toBe('none');
    expect(red).toHaveAttribute('aria-checked', 'true');
    expect(green).toHaveAttribute('aria-checked', 'true');
    expect(blue).toHaveAttribute('aria-checked', 'false');

    click(blue);
    await flushUpdates();

    blue = getCheckbox(container, 'blue');

    expect(handleValueChange).toHaveBeenCalledTimes(2);
    expect(handleValueChange.mock.calls[1]?.[0]).toEqual(['red', 'green', 'blue']);
    expect(blue).toHaveAttribute('aria-checked', 'true');
  });

  it('uses defaultValue for uncontrolled groups', async () => {
    const container = render(
      CheckboxGroup({
        defaultValue: ['red'],
        children: [
          Checkbox.Root({ value: 'red', 'data-testid': 'red' }),
          Checkbox.Root({ value: 'green', 'data-testid': 'green' }),
          Checkbox.Root({ value: 'blue', 'data-testid': 'blue' }),
        ],
      }),
    );
    await flushUpdates();

    let red = getCheckbox(container, 'red');
    let green = getCheckbox(container, 'green');
    let blue = getCheckbox(container, 'blue');

    expect(red).toHaveAttribute('aria-checked', 'true');
    expect(green).toHaveAttribute('aria-checked', 'false');
    expect(blue).toHaveAttribute('aria-checked', 'false');

    click(green);
    await flushUpdates();

    red = getCheckbox(container, 'red');
    green = getCheckbox(container, 'green');
    blue = getCheckbox(container, 'blue');

    expect(red).toHaveAttribute('aria-checked', 'true');
    expect(green).toHaveAttribute('aria-checked', 'true');
    expect(blue).toHaveAttribute('aria-checked', 'false');
  });

  it('disables all checkboxes in the group', async () => {
    const container = render(
      CheckboxGroup({
        disabled: true,
        children: [
          Checkbox.Root({ value: 'red', 'data-testid': 'red' }),
          Checkbox.Root({ value: 'green', 'data-testid': 'green', disabled: false }),
          Checkbox.Root({ value: 'blue', 'data-testid': 'blue' }),
        ],
      }),
    );
    await flushUpdates();

    expect(getCheckbox(container, 'red')).toHaveAttribute('aria-disabled', 'true');
    expect(getCheckbox(container, 'green')).toHaveAttribute('aria-disabled', 'true');
    expect(getCheckbox(container, 'blue')).toHaveAttribute('aria-disabled', 'true');
  });

  it('lets a parent checkbox control the children', async () => {
    let value: string[] = [];
    const allValues = ['a', 'b', 'c'];
    const container = render(html``);

    function rerender() {
      renderTemplate(
        CheckboxGroup({
          value,
          allValues,
          onValueChange(nextValue) {
            value = nextValue;
            rerender();
          },
          children: [
            Checkbox.Root({ parent: true, 'data-testid': 'parent' }),
            Checkbox.Root({ value: 'a', 'data-testid': 'a' }),
            Checkbox.Root({ value: 'b', 'data-testid': 'b' }),
            Checkbox.Root({ value: 'c', 'data-testid': 'c' }),
          ],
        }),
        container,
      );
    }

    rerender();
    await flushUpdates();

    let parent = getCheckbox(container, 'parent');
    expect(parent).toHaveAttribute('aria-controls', `${parent.id}-a ${parent.id}-b ${parent.id}-c`);

    click(parent);
    await flushUpdates();

    parent = getCheckbox(container, 'parent');
    expect(parent).toHaveAttribute('aria-checked', 'true');
    expect(getCheckbox(container, 'a')).toHaveAttribute('aria-checked', 'true');
    expect(getCheckbox(container, 'b')).toHaveAttribute('aria-checked', 'true');
    expect(getCheckbox(container, 'c')).toHaveAttribute('aria-checked', 'true');

    click(parent);
    await flushUpdates();

    parent = getCheckbox(container, 'parent');
    expect(parent).toHaveAttribute('aria-checked', 'false');
    expect(getCheckbox(container, 'a')).toHaveAttribute('aria-checked', 'false');
    expect(getCheckbox(container, 'b')).toHaveAttribute('aria-checked', 'false');
    expect(getCheckbox(container, 'c')).toHaveAttribute('aria-checked', 'false');
  });

  it('preserves the mixed selection cycle for parent checkboxes', async () => {
    let value: string[] = [];
    const allValues = ['a', 'b', 'c'];
    const container = render(html``);

    function rerender() {
      renderTemplate(
        CheckboxGroup({
          value,
          allValues,
          onValueChange(nextValue) {
            value = nextValue;
            rerender();
          },
          children: [
            Checkbox.Root({ parent: true, 'data-testid': 'parent' }),
            Checkbox.Root({ value: 'a', 'data-testid': 'a' }),
            Checkbox.Root({ value: 'b', 'data-testid': 'b' }),
            Checkbox.Root({ value: 'c', 'data-testid': 'c' }),
          ],
        }),
        container,
      );
    }

    rerender();
    await flushUpdates();

    let parent = getCheckbox(container, 'parent');
    const checkboxA = getCheckbox(container, 'a');

    click(checkboxA);
    await flushUpdates();
    parent = getCheckbox(container, 'parent');
    expect(parent).toHaveAttribute('aria-checked', 'mixed');

    click(parent);
    await flushUpdates();
    parent = getCheckbox(container, 'parent');
    expect(getCheckbox(container, 'a')).toHaveAttribute('aria-checked', 'true');
    expect(getCheckbox(container, 'b')).toHaveAttribute('aria-checked', 'true');
    expect(getCheckbox(container, 'c')).toHaveAttribute('aria-checked', 'true');

    click(parent);
    await flushUpdates();
    parent = getCheckbox(container, 'parent');
    expect(getCheckbox(container, 'a')).toHaveAttribute('aria-checked', 'false');
    expect(getCheckbox(container, 'b')).toHaveAttribute('aria-checked', 'false');
    expect(getCheckbox(container, 'c')).toHaveAttribute('aria-checked', 'false');

    click(parent);
    await flushUpdates();
    parent = getCheckbox(container, 'parent');
    expect(parent).toHaveAttribute('aria-checked', 'mixed');
    expect(getCheckbox(container, 'a')).toHaveAttribute('aria-checked', 'true');
    expect(getCheckbox(container, 'b')).toHaveAttribute('aria-checked', 'false');
    expect(getCheckbox(container, 'c')).toHaveAttribute('aria-checked', 'false');
  });

  it('supports parent mixed state, wrapping label clicks, and keyboard activation', async () => {
    let value: string[] = [];
    const allValues = ['fuji-apple', 'gala-apple', 'granny-smith-apple'];
    const container = render(html``);

    function rerender() {
      renderTemplate(
        html`<div>
          ${CheckboxGroup({
            value,
            allValues,
            onValueChange(nextValue) {
              value = nextValue;
              rerender();
            },
            children: html`
              <label data-testid="parent-label">
                ${Checkbox.Root({ parent: true, 'data-testid': 'parent' })}
                Apples
              </label>
              <label>
                ${Checkbox.Root({ value: 'fuji-apple', 'data-testid': 'fuji' })}
                Fuji
              </label>
              <label data-testid="gala-label">
                ${Checkbox.Root({ value: 'gala-apple', 'data-testid': 'gala' })}
                Gala
              </label>
              <label>
                ${Checkbox.Root({ value: 'granny-smith-apple', 'data-testid': 'granny' })}
                Granny Smith
              </label>
            `,
          })}
          <output data-testid="status">${value.length === 0 ? 'none' : value.join(', ')}</output>
        </div>`,
        container,
      );
    }

    rerender();
    await flushUpdates();

    const getStatus = () => container.querySelector('[data-testid="status"]') as HTMLOutputElement;
    let parent = getCheckbox(container, 'parent');
    const galaLabel = container.querySelector('[data-testid="gala-label"]') as HTMLLabelElement;

    expect(getStatus()).toHaveTextContent('none');

    galaLabel.click();
    await flushUpdates();

    parent = getCheckbox(container, 'parent');
    expect(getStatus()).toHaveTextContent('gala-apple');
    expect(parent).toHaveAttribute('aria-checked', 'mixed');

    parent.focus();
    expect(parent).toHaveFocus();

    parent.dispatchEvent(
      new KeyboardEvent('keyup', { bubbles: true, cancelable: true, key: ' ' }),
    );
    await flushUpdates();

    parent = getCheckbox(container, 'parent');
    expect(getStatus()).toHaveTextContent('fuji-apple, gala-apple, granny-smith-apple');
    expect(parent).toHaveAttribute('aria-checked', 'true');
    expect(parent).toHaveFocus();

    (document.activeElement as HTMLElement).dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter' }),
    );
    await flushUpdates();

    parent = getCheckbox(container, 'parent');
    expect(getStatus()).toHaveTextContent('none');
    expect(parent).toHaveAttribute('aria-checked', 'false');
  });

  it('keeps disabled children out of parent toggles unless they were already checked', async () => {
    let value: string[] = ['a'];
    const allValues = ['a', 'b', 'c'];
    const container = render(html``);

    function rerender() {
      renderTemplate(
        CheckboxGroup({
          value,
          allValues,
          onValueChange(nextValue) {
            value = nextValue;
            rerender();
          },
          children: [
            Checkbox.Root({ parent: true, 'data-testid': 'parent' }),
            Checkbox.Root({ value: 'a', 'data-testid': 'a', disabled: true }),
            Checkbox.Root({ value: 'b', 'data-testid': 'b' }),
            Checkbox.Root({ value: 'c', 'data-testid': 'c' }),
          ],
        }),
        container,
      );
    }

    rerender();
    await flushUpdates();

    const parent = getCheckbox(container, 'parent');

    click(parent);
    await flushUpdates();

    expect(getCheckbox(container, 'a')).toHaveAttribute('aria-checked', 'true');
    expect(getCheckbox(container, 'b')).toHaveAttribute('aria-checked', 'true');
    expect(getCheckbox(container, 'c')).toHaveAttribute('aria-checked', 'true');

    click(parent);
    await flushUpdates();

    expect(getCheckbox(container, 'a')).toHaveAttribute('aria-checked', 'true');
    expect(getCheckbox(container, 'b')).toHaveAttribute('aria-checked', 'false');
    expect(getCheckbox(container, 'c')).toHaveAttribute('aria-checked', 'false');
  });

  it('excludes parent checkboxes from form submission', async () => {
    let value = ['fuji-apple', 'gala-apple'];
    const allValues = ['fuji-apple', 'gala-apple', 'granny-smith-apple'];
    const container = render(html``);

    function rerender() {
      renderTemplate(
        html`<form>
          ${CheckboxGroup({
            value,
            allValues,
            onValueChange(nextValue) {
              value = nextValue;
              rerender();
            },
            children: [
              Checkbox.Root({ parent: true, 'data-testid': 'parent' }),
              Checkbox.Root({ name: 'apple', value: 'fuji-apple' }),
              Checkbox.Root({ name: 'apple', value: 'gala-apple' }),
              Checkbox.Root({ name: 'apple', value: 'granny-smith-apple', 'data-testid': 'third' }),
            ],
          })}
        </form>`,
        container,
      );
    }

    rerender();
    await flushUpdates();

    click(getCheckbox(container, 'third'));
    await flushUpdates();

    const form = container.querySelector('form') as HTMLFormElement;
    const formData = new FormData(form);

    expect(formData.getAll('apple')).toEqual([
      'fuji-apple',
      'gala-apple',
      'granny-smith-apple',
    ]);
  });
});
