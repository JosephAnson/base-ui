import { html, nothing, render as renderTemplate } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import './index.ts';
import '../toggle/index.ts';

describe('ToggleGroupRootElement', () => {
  const containers = new Set<HTMLDivElement>();

  afterEach(async () => {
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
    element.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }),
    );
  }

  function keydown(element: Element, key: string) {
    element.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key }),
    );
  }

  function keyup(element: Element, key: string) {
    element.dispatchEvent(
      new KeyboardEvent('keyup', { bubbles: true, cancelable: true, key }),
    );
  }

  // ── Rendering ──────────────────────────────────────────────────────────

  it('renders a group with role and data attributes', async () => {
    const container = render(html`
      <toggle-group-root>
        <toggle-root value="a">A</toggle-root>
        <toggle-root value="b">B</toggle-root>
      </toggle-group-root>
    `);
    await flush();

    const group = container.querySelector('[role="group"]');
    expect(group).not.toBeNull();
    expect(group).toHaveAttribute('data-orientation', 'horizontal');
    expect(group).not.toHaveAttribute('data-disabled');
    expect(group).not.toHaveAttribute('data-multiple');
  });

  it('sets data-disabled when disabled', async () => {
    const container = render(html`
      <toggle-group-root disabled>
        <toggle-root value="a">A</toggle-root>
      </toggle-group-root>
    `);
    await flush();

    expect(container.querySelector('toggle-group-root')).toHaveAttribute('data-disabled');
  });

  it('sets data-multiple when multiple mode', async () => {
    const container = render(html`
      <toggle-group-root multiple>
        <toggle-root value="a">A</toggle-root>
      </toggle-group-root>
    `);
    await flush();

    expect(container.querySelector('toggle-group-root')).toHaveAttribute('data-multiple');
  });

  // ── Single selection (default) ─────────────────────────────────────────

  it('toggles items in single-select mode', async () => {
    const container = render(html`
      <toggle-group-root>
        <toggle-root value="a" data-testid="a">A</toggle-root>
        <toggle-root value="b" data-testid="b">B</toggle-root>
      </toggle-group-root>
    `);
    await flush();

    const a = container.querySelector('[data-testid="a"]') as HTMLElement;
    const b = container.querySelector('[data-testid="b"]') as HTMLElement;

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
    const container = render(html`
      <toggle-group-root multiple>
        <toggle-root value="a" data-testid="a">A</toggle-root>
        <toggle-root value="b" data-testid="b">B</toggle-root>
        <toggle-root value="c" data-testid="c">C</toggle-root>
      </toggle-group-root>
    `);
    await flush();

    const a = container.querySelector('[data-testid="a"]') as HTMLElement;
    const b = container.querySelector('[data-testid="b"]') as HTMLElement;
    const c = container.querySelector('[data-testid="c"]') as HTMLElement;

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
    const container = render(html`
      <toggle-group-root .defaultValue=${['b']}>
        <toggle-root value="a" data-testid="a">A</toggle-root>
        <toggle-root value="b" data-testid="b">B</toggle-root>
      </toggle-group-root>
    `);
    await flush();

    expect(container.querySelector('[data-testid="a"]')).toHaveAttribute('aria-pressed', 'false');
    expect(container.querySelector('[data-testid="b"]')).toHaveAttribute('aria-pressed', 'true');
  });

  // ── Controlled value ──────────────────────────────────────────────────

  it('respects controlled value', async () => {
    const onChange = vi.fn();
    const container = render(html`
      <toggle-group-root .value=${['a']} .onValueChange=${onChange}>
        <toggle-root value="a" data-testid="a">A</toggle-root>
        <toggle-root value="b" data-testid="b">B</toggle-root>
      </toggle-group-root>
    `);
    await flush();

    const a = container.querySelector('[data-testid="a"]') as HTMLElement;
    const b = container.querySelector('[data-testid="b"]') as HTMLElement;

    expect(a).toHaveAttribute('aria-pressed', 'true');
    expect(b).toHaveAttribute('aria-pressed', 'false');

    // Click B - callback fires but state doesn't change (controlled)
    click(b);
    await flush();

    expect(onChange).toHaveBeenCalledWith(['b'], expect.any(Event));
    // Still controlled by the prop
    expect(a).toHaveAttribute('aria-pressed', 'true');
    expect(b).toHaveAttribute('aria-pressed', 'false');
  });

  // ── onValueChange callback ─────────────────────────────────────────────

  it('fires onValueChange with correct values', async () => {
    const onChange = vi.fn();
    const container = render(html`
      <toggle-group-root multiple .onValueChange=${onChange}>
        <toggle-root value="x" data-testid="x">X</toggle-root>
        <toggle-root value="y" data-testid="y">Y</toggle-root>
      </toggle-group-root>
    `);
    await flush();

    click(container.querySelector('[data-testid="x"]') as HTMLElement);
    await flush();
    expect(onChange).toHaveBeenCalledWith(['x'], expect.any(Event));

    click(container.querySelector('[data-testid="y"]') as HTMLElement);
    await flush();
    expect(onChange).toHaveBeenCalledWith(['x', 'y'], expect.any(Event));

    // Deselect x
    click(container.querySelector('[data-testid="x"]') as HTMLElement);
    await flush();
    expect(onChange).toHaveBeenCalledWith(['y'], expect.any(Event));
  });

  // ── Disabled ──────────────────────────────────────────────────────────

  it('prevents toggle interactions when group is disabled', async () => {
    const container = render(html`
      <toggle-group-root disabled>
        <toggle-root value="a" data-testid="a">A</toggle-root>
      </toggle-group-root>
    `);
    await flush();

    const a = container.querySelector('[data-testid="a"]') as HTMLElement;
    expect(a).toHaveAttribute('data-disabled');

    click(a);
    await flush();
    expect(a).toHaveAttribute('aria-pressed', 'false');
  });

  // ── Keyboard navigation ───────────────────────────────────────────────

  it('navigates between items with arrow keys (horizontal)', async () => {
    const container = render(html`
      <toggle-group-root>
        <toggle-root value="a" data-testid="a">A</toggle-root>
        <toggle-root value="b" data-testid="b">B</toggle-root>
        <toggle-root value="c" data-testid="c">C</toggle-root>
      </toggle-group-root>
    `);
    await flush();

    const a = container.querySelector('[data-testid="a"]') as HTMLElement;
    const b = container.querySelector('[data-testid="b"]') as HTMLElement;
    const c = container.querySelector('[data-testid="c"]') as HTMLElement;

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
    const container = render(html`
      <toggle-group-root .orientation=${'vertical'}>
        <toggle-root value="a" data-testid="a">A</toggle-root>
        <toggle-root value="b" data-testid="b">B</toggle-root>
      </toggle-group-root>
    `);
    await flush();

    const a = container.querySelector('[data-testid="a"]') as HTMLElement;
    const b = container.querySelector('[data-testid="b"]') as HTMLElement;

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
    const container = render(html`
      <toggle-group-root>
        <toggle-root value="a" data-testid="a">A</toggle-root>
        <toggle-root value="b" data-testid="b">B</toggle-root>
        <toggle-root value="c" data-testid="c">C</toggle-root>
      </toggle-group-root>
    `);
    await flush();

    const a = container.querySelector('[data-testid="a"]') as HTMLElement;
    const b = container.querySelector('[data-testid="b"]') as HTMLElement;
    const c = container.querySelector('[data-testid="c"]') as HTMLElement;

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
    const container = render(html`
      <toggle-group-root>
        <toggle-root value="a" data-testid="a">A</toggle-root>
        <toggle-root value="b" data-testid="b">B</toggle-root>
      </toggle-group-root>
    `);
    await flush();

    const a = container.querySelector('[data-testid="a"]') as HTMLElement;
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
    const container = render(html`
      <toggle-group-root>
        <toggle-root value="a" data-testid="a">A</toggle-root>
        <toggle-root value="b" data-testid="b">B</toggle-root>
        <toggle-root value="c" data-testid="c">C</toggle-root>
      </toggle-group-root>
    `);
    await flush();

    const a = container.querySelector('[data-testid="a"]') as HTMLElement;
    const c = container.querySelector('[data-testid="c"]') as HTMLElement;

    a.focus();
    keydown(a, 'End');
    await flush();
    expect(c).toHaveFocus();

    keydown(c, 'Home');
    await flush();
    expect(a).toHaveFocus();
  });
});
