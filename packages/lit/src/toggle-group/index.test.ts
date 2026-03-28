import { html, nothing, render as renderTemplate } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import { reset as resetErrors } from '@base-ui/utils/error';
import * as toggleGroupModule from './index';
import '../toggle/index';
import type { ToggleGroupRootChangeEventDetails } from './index';

describe('ToggleGroupRootElement', () => {
  const containers = new Set<HTMLDivElement>();

  afterEach(async () => {
    resetErrors();
    containers.forEach((container) => {
      renderTemplate(nothing, container);
      container.remove();
    });
    containers.clear();
    await flush();
  });

  function render(result: ReturnType<typeof html>) {
    const container = document.createElement('div');
    document.body.append(container);
    containers.add(container);
    renderTemplate(result, container);
    return container;
  }

  async function flush() {
    await Promise.resolve();
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 50);
    });
    await Promise.resolve();
  }

  function click(element: Element) {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }));
  }

  function keydown(element: Element, key: string) {
    element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key }));
  }

  function keyup(element: Element, key: string) {
    element.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, cancelable: true, key }));
  }

  it('exposes namespace aliases for props, state, and change event details', () => {
    expect(customElements.get('toggle-group-root')).toBe(toggleGroupModule.ToggleGroupRootElement);
    expect(toggleGroupModule.ToggleGroup).toBe(toggleGroupModule.ToggleGroupRootElement);
    expectTypeOf<import('./index').ToggleGroupRootProps>().toEqualTypeOf<
      toggleGroupModule.ToggleGroupRoot.Props
    >();
    expectTypeOf<import('./index').ToggleGroupRootState>().toEqualTypeOf<
      toggleGroupModule.ToggleGroupRoot.State
    >();
    expectTypeOf<ToggleGroupRootChangeEventDetails>().toEqualTypeOf<
      toggleGroupModule.ToggleGroupRoot.ChangeEventDetails
    >();
    expectTypeOf<import('./index').ToggleGroupProps>().toEqualTypeOf<toggleGroupModule.ToggleGroup.Props>();
    expectTypeOf<import('./index').ToggleGroupState>().toEqualTypeOf<toggleGroupModule.ToggleGroup.State>();
  });

  // ── Rendering ──────────────────────────────────────────────────────────

  it('renders a group with role and data attributes', async () => {
    const view = render(html`
      <toggle-group-root>
        <toggle-root value="a">A</toggle-root>
        <toggle-root value="b">B</toggle-root>
      </toggle-group-root>
    `);
    await flush();

    const group = view.querySelector('[role="group"]');
    expect(group).not.toBeNull();
    expect(group).toHaveAttribute('data-orientation', 'horizontal');
    expect(group).not.toHaveAttribute('data-disabled');
    expect(group).not.toHaveAttribute('data-multiple');
  });

  it('sets data-disabled when disabled', async () => {
    const view = render(html`
      <toggle-group-root disabled>
        <toggle-root value="a">A</toggle-root>
      </toggle-group-root>
    `);
    await flush();

    expect(view.querySelector('toggle-group-root')).toHaveAttribute('data-disabled');
  });

  it('sets data-multiple when multiple mode', async () => {
    const view = render(html`
      <toggle-group-root multiple>
        <toggle-root value="a">A</toggle-root>
      </toggle-group-root>
    `);
    await flush();

    expect(view.querySelector('toggle-group-root')).toHaveAttribute('data-multiple');
  });

  it('supports a static render template on the root', async () => {
    const view = render(html`
      <toggle-group-root .render=${html`<div data-testid="group"></div>`}>
        <toggle-root value="a" data-testid="a">A</toggle-root>
        <toggle-root value="b" data-testid="b">B</toggle-root>
      </toggle-group-root>
    `);
    await flush();

    const group = view.querySelector('[data-testid="group"]') as HTMLElement;
    expect(group).toHaveAttribute('role', 'group');
    expect(group).toHaveAttribute('data-orientation', 'horizontal');
    expect(group.querySelector('[data-testid="a"]')).not.toBeNull();
    expect(group.querySelector('[data-testid="b"]')).not.toBeNull();
  });

  it('passes render function props and state to the root', async () => {
    let receivedProps: Record<string, unknown> | null = null;
    let receivedState: Record<string, unknown> | null = null;

    const view = render(html`
      <toggle-group-root
        multiple
        orientation="vertical"
        .render=${(props: Record<string, unknown>, state: Record<string, unknown>) => {
          receivedProps = props;
          receivedState = state;
          return html`<section data-testid="group"></section>`;
        }}
      >
        <toggle-root value="a">A</toggle-root>
      </toggle-group-root>
    `);
    await flush();

    expect(receivedProps).toEqual(expect.objectContaining({ role: 'group' }));
    expect(receivedState).toEqual(
      expect.objectContaining({
        disabled: false,
        multiple: true,
        orientation: 'vertical',
      }),
    );
    expect(view.querySelector('[data-testid="group"]')).toHaveAttribute('role', 'group');
    expect(view.querySelector('[data-testid="group"]')).toHaveAttribute(
      'data-orientation',
      'vertical',
    );
  });

  // ── Single selection (default) ─────────────────────────────────────────

  it('toggles items in single-select mode', async () => {
    const view = render(html`
      <toggle-group-root>
        <toggle-root value="a" data-testid="a">A</toggle-root>
        <toggle-root value="b" data-testid="b">B</toggle-root>
      </toggle-group-root>
    `);
    await flush();

    const a = view.querySelector('[data-testid="a"]') as HTMLElement;
    const b = view.querySelector('[data-testid="b"]') as HTMLElement;

    // Press A
    click(a);
    await flush();
    expect(a).toHaveAttribute('aria-pressed', 'true');
    expect(b).toHaveAttribute('aria-pressed', 'false');

    // Press B → A should deselect
    click(b);
    await flush();
    expect(a).toHaveAttribute('aria-pressed', 'false');
    expect(b).toHaveAttribute('aria-pressed', 'true');

    // Press B again → deselects
    click(b);
    await flush();
    expect(b).toHaveAttribute('aria-pressed', 'false');
  });

  // ── Multiple selection ─────────────────────────────────────────────────

  it('allows multiple items to be pressed simultaneously', async () => {
    const view = render(html`
      <toggle-group-root multiple>
        <toggle-root value="a" data-testid="a">A</toggle-root>
        <toggle-root value="b" data-testid="b">B</toggle-root>
        <toggle-root value="c" data-testid="c">C</toggle-root>
      </toggle-group-root>
    `);
    await flush();

    const a = view.querySelector('[data-testid="a"]') as HTMLElement;
    const b = view.querySelector('[data-testid="b"]') as HTMLElement;
    const c = view.querySelector('[data-testid="c"]') as HTMLElement;

    click(a);
    click(b);
    await flush();

    expect(a).toHaveAttribute('aria-pressed', 'true');
    expect(b).toHaveAttribute('aria-pressed', 'true');
    expect(c).toHaveAttribute('aria-pressed', 'false');

    // Deselect A
    click(a);
    await flush();
    expect(a).toHaveAttribute('aria-pressed', 'false');
    expect(b).toHaveAttribute('aria-pressed', 'true');
  });

  // ── Default value (uncontrolled) ───────────────────────────────────────

  it('initializes with defaultValue', async () => {
    const view = render(html`
      <toggle-group-root .defaultValue=${['b']}>
        <toggle-root value="a" data-testid="a">A</toggle-root>
        <toggle-root value="b" data-testid="b">B</toggle-root>
      </toggle-group-root>
    `);
    await flush();

    expect(view.querySelector('[data-testid="a"]')).toHaveAttribute('aria-pressed', 'false');
    expect(view.querySelector('[data-testid="b"]')).toHaveAttribute('aria-pressed', 'true');
  });

  // ── Controlled value ──────────────────────────────────────────────────

  it('respects controlled value', async () => {
    const onChange = vi.fn();
    const view = render(html`
      <toggle-group-root .value=${['a']} .onValueChange=${onChange}>
        <toggle-root value="a" data-testid="a">A</toggle-root>
        <toggle-root value="b" data-testid="b">B</toggle-root>
      </toggle-group-root>
    `);
    await flush();

    const a = view.querySelector('[data-testid="a"]') as HTMLElement;
    const b = view.querySelector('[data-testid="b"]') as HTMLElement;

    expect(a).toHaveAttribute('aria-pressed', 'true');
    expect(b).toHaveAttribute('aria-pressed', 'false');

    // Click B - callback fires but state doesn't change (controlled)
    click(b);
    await flush();

    expect(onChange).toHaveBeenCalledWith(
      ['b'],
      expect.objectContaining({ reason: 'none', event: expect.any(Event) }),
    );
    // Still controlled by the prop
    expect(a).toHaveAttribute('aria-pressed', 'true');
    expect(b).toHaveAttribute('aria-pressed', 'false');
  });

  // ── onValueChange callback ─────────────────────────────────────────────

  it('fires onValueChange with correct values', async () => {
    const onChange = vi.fn();
    const view = render(html`
      <toggle-group-root multiple .onValueChange=${onChange}>
        <toggle-root value="x" data-testid="x">X</toggle-root>
        <toggle-root value="y" data-testid="y">Y</toggle-root>
      </toggle-group-root>
    `);
    await flush();

    click(view.querySelector('[data-testid="x"]') as HTMLElement);
    await flush();
    expect(onChange).toHaveBeenCalledWith(
      ['x'],
      expect.objectContaining({ reason: 'none', event: expect.any(Event) }),
    );

    click(view.querySelector('[data-testid="y"]') as HTMLElement);
    await flush();
    expect(onChange).toHaveBeenCalledWith(
      ['x', 'y'],
      expect.objectContaining({ reason: 'none', event: expect.any(Event) }),
    );

    // Deselect x
    click(view.querySelector('[data-testid="x"]') as HTMLElement);
    await flush();
    expect(onChange).toHaveBeenCalledWith(
      ['y'],
      expect.objectContaining({ reason: 'none', event: expect.any(Event) }),
    );
  });

  it('does not change internal value when onValueChange cancels the update', async () => {
    const onChange = vi.fn((_: string[], details: ToggleGroupRootChangeEventDetails) => {
      details.cancel();
    });
    const view = render(html`
      <toggle-group-root .onValueChange=${onChange}>
        <toggle-root value="a" data-testid="a">A</toggle-root>
        <toggle-root value="b" data-testid="b">B</toggle-root>
      </toggle-group-root>
    `);
    await flush();

    const a = view.querySelector('[data-testid="a"]') as HTMLElement;

    click(a);
    await flush();

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(a).toHaveAttribute('aria-pressed', 'false');
  });

  // ── Disabled ──────────────────────────────────────────────────────────

  it('prevents toggle interactions when group is disabled', async () => {
    const view = render(html`
      <toggle-group-root disabled>
        <toggle-root value="a" data-testid="a">A</toggle-root>
      </toggle-group-root>
    `);
    await flush();

    const a = view.querySelector('[data-testid="a"]') as HTMLElement;
    expect(a).toHaveAttribute('data-disabled');
    expect(a).toHaveAttribute('aria-disabled', 'true');

    click(a);
    await flush();
    expect(a).toHaveAttribute('aria-pressed', 'false');
  });

  it('keeps enabled items interactive when only sibling items are disabled', async () => {
    const view = render(html`
      <toggle-group-root>
        <toggle-root value="a" data-testid="a">A</toggle-root>
        <toggle-root value="b" data-testid="b" disabled>B</toggle-root>
      </toggle-group-root>
    `);
    await flush();

    const a = view.querySelector('[data-testid="a"]') as HTMLElement;
    const b = view.querySelector('[data-testid="b"]') as HTMLElement;

    expect(a).toHaveAttribute('aria-disabled', 'false');
    expect(a).not.toHaveAttribute('data-disabled');
    expect(b).toHaveAttribute('aria-disabled', 'true');
    expect(b).toHaveAttribute('data-disabled');
  });

  it('supports toggles without explicit group values', async () => {
    const view = render(html`
      <toggle-group-root>
        <toggle-root data-testid="a">A</toggle-root>
        <toggle-root value="" data-testid="b">B</toggle-root>
      </toggle-group-root>
    `);
    await flush();

    const a = view.querySelector('[data-testid="a"]') as HTMLElement;
    const b = view.querySelector('[data-testid="b"]') as HTMLElement;

    click(a);
    await flush();
    expect(a).toHaveAttribute('aria-pressed', 'true');
    expect(b).toHaveAttribute('aria-pressed', 'false');

    click(b);
    await flush();
    expect(a).toHaveAttribute('aria-pressed', 'false');
    expect(b).toHaveAttribute('aria-pressed', 'true');
  });

  it('warns once when group values are initialized and toggles omit explicit values', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(html`
      <toggle-group-root .defaultValue=${['one']}>
        <toggle-root>A</toggle-root>
        <toggle-root>B</toggle-root>
      </toggle-group-root>
    `);
    await flush();

    expect(errorSpy).toHaveBeenCalledExactlyOnceWith(
      'Base UI: A `<Toggle>` component rendered in a `<ToggleGroup>` has no explicit `value` prop. This will cause issues between the Toggle Group and Toggle values. Provide the `<Toggle>` with a `value` prop matching the `<ToggleGroup>` values prop type.',
    );
    errorSpy.mockRestore();
  });

  // ── Keyboard navigation ───────────────────────────────────────────────

  it('navigates between items with arrow keys (horizontal)', async () => {
    const view = render(html`
      <toggle-group-root>
        <toggle-root value="a" data-testid="a">A</toggle-root>
        <toggle-root value="b" data-testid="b">B</toggle-root>
        <toggle-root value="c" data-testid="c">C</toggle-root>
      </toggle-group-root>
    `);
    await flush();

    const a = view.querySelector('[data-testid="a"]') as HTMLElement;
    const b = view.querySelector('[data-testid="b"]') as HTMLElement;
    const c = view.querySelector('[data-testid="c"]') as HTMLElement;

    a.focus();
    keydown(a, 'ArrowRight');
    await flush();
    expect(b).toHaveFocus();

    keydown(b, 'ArrowRight');
    await flush();
    expect(c).toHaveFocus();

    // Loop back to first
    keydown(c, 'ArrowRight');
    await flush();
    expect(a).toHaveFocus();
  });

  it('navigates with arrow keys (vertical)', async () => {
    const view = render(html`
      <toggle-group-root .orientation=${'vertical'}>
        <toggle-root value="a" data-testid="a">A</toggle-root>
        <toggle-root value="b" data-testid="b">B</toggle-root>
      </toggle-group-root>
    `);
    await flush();

    const a = view.querySelector('[data-testid="a"]') as HTMLElement;
    const b = view.querySelector('[data-testid="b"]') as HTMLElement;

    a.focus();
    keydown(a, 'ArrowDown');
    await flush();
    expect(b).toHaveFocus();

    keydown(b, 'ArrowUp');
    await flush();
    expect(a).toHaveFocus();
  });

  // ── Roving tabindex ───────────────────────────────────────────────────

  it('manages roving tabindex across items', async () => {
    const view = render(html`
      <toggle-group-root>
        <toggle-root value="a" data-testid="a">A</toggle-root>
        <toggle-root value="b" data-testid="b">B</toggle-root>
        <toggle-root value="c" data-testid="c">C</toggle-root>
      </toggle-group-root>
    `);
    await flush();

    const a = view.querySelector('[data-testid="a"]') as HTMLElement;
    const b = view.querySelector('[data-testid="b"]') as HTMLElement;
    const c = view.querySelector('[data-testid="c"]') as HTMLElement;

    // First item should be tabbable by default
    expect(a.tabIndex).toBe(0);
    expect(b.tabIndex).toBe(-1);
    expect(c.tabIndex).toBe(-1);

    // Navigate to B
    a.focus();
    keydown(a, 'ArrowRight');
    await flush();

    expect(a.tabIndex).toBe(-1);
    expect(b.tabIndex).toBe(0);
    expect(c.tabIndex).toBe(-1);
  });

  // ── Toggle pressed via keyboard ───────────────────────────────────────

  it('toggles items with Enter and Space keys', async () => {
    const view = render(html`
      <toggle-group-root>
        <toggle-root value="a" data-testid="a">A</toggle-root>
        <toggle-root value="b" data-testid="b">B</toggle-root>
      </toggle-group-root>
    `);
    await flush();

    const a = view.querySelector('[data-testid="a"]') as HTMLElement;
    a.focus();

    // Enter toggles
    keydown(a, 'Enter');
    await flush();
    expect(a).toHaveAttribute('aria-pressed', 'true');

    // Space toggles (on keyup)
    keydown(a, ' ');
    keyup(a, ' ');
    await flush();
    expect(a).toHaveAttribute('aria-pressed', 'false');
  });

  // ── Home/End keys ─────────────────────────────────────────────────────

  it('navigates to first/last items with Home/End keys', async () => {
    const view = render(html`
      <toggle-group-root>
        <toggle-root value="a" data-testid="a">A</toggle-root>
        <toggle-root value="b" data-testid="b">B</toggle-root>
        <toggle-root value="c" data-testid="c">C</toggle-root>
      </toggle-group-root>
    `);
    await flush();

    const a = view.querySelector('[data-testid="a"]') as HTMLElement;
    const c = view.querySelector('[data-testid="c"]') as HTMLElement;

    a.focus();
    keydown(a, 'End');
    await flush();
    expect(c).toHaveFocus();

    keydown(c, 'Home');
    await flush();
    expect(a).toHaveFocus();
  });
});
