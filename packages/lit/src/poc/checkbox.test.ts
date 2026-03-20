import { html, nothing, render as renderTemplate } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import './checkbox.ts';
import type { CheckboxRootElement } from './checkbox.ts';

describe('Checkbox Web Component POC', () => {
  const containers = new Set<HTMLDivElement>();

  afterEach(() => {
    containers.forEach((container) => {
      renderTemplate(nothing, container);
      container.remove();
    });
    containers.clear();
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
    await new Promise((r) => setTimeout(r, 0));
  }

  // ─── 1. Children Composition ──────────────────────────────────────────────

  describe('children composition', () => {
    it('renders checkbox-root with nested indicator', async () => {
      const container = render(html`
        <checkbox-root>
          <checkbox-indicator>✓</checkbox-indicator>
          Accept
        </checkbox-root>
      `);

      await waitForUpdate();

      expect(container.querySelector('checkbox-root')).toBeInTheDocument();
      expect(container.querySelector('checkbox-indicator')).toBeInTheDocument();
    });
  });

  // ─── 2. Styling ──────────────────────────────────────────────────────────

  describe('styling', () => {
    it('applies data-checked/data-unchecked attributes', async () => {
      const container = render(html`
        <checkbox-root>
          <checkbox-indicator>✓</checkbox-indicator>
        </checkbox-root>
      `);

      await waitForUpdate();

      const root = container.querySelector('checkbox-root')!;
      expect(root).toHaveAttribute('data-unchecked');
      expect(root).not.toHaveAttribute('data-checked');
    });

    it('supports class attribute', () => {
      const container = render(html`
        <checkbox-root class="my-checkbox">
          <checkbox-indicator>✓</checkbox-indicator>
        </checkbox-root>
      `);

      expect(container.querySelector('checkbox-root')).toHaveClass('my-checkbox');
    });
  });

  // ─── 3. State Propagation ────────────────────────────────────────────────

  describe('state propagation', () => {
    it('indicator reflects parent checked state', async () => {
      const container = render(html`
        <checkbox-root default-checked>
          <checkbox-indicator>✓</checkbox-indicator>
        </checkbox-root>
      `);

      await waitForUpdate();

      const indicator = container.querySelector('checkbox-indicator')!;
      expect(indicator).toHaveAttribute('data-checked');
    });

    it('indicator hidden when unchecked', async () => {
      const container = render(html`
        <checkbox-root>
          <checkbox-indicator>✓</checkbox-indicator>
        </checkbox-root>
      `);

      await waitForUpdate();

      const indicator = container.querySelector('checkbox-indicator')!;
      // Indicator should be hidden when unchecked
      expect(indicator).toHaveAttribute('hidden');
    });
  });

  // ─── 4. Form Integration ─────────────────────────────────────────────────

  describe('form integration', () => {
    it('creates a hidden checkbox input for form submission', async () => {
      const container = render(html`
        <form>
          <checkbox-root name="agree" value="yes">
            <checkbox-indicator>✓</checkbox-indicator>
          </checkbox-root>
        </form>
      `);

      await waitForUpdate();

      // Hidden input should be created as a sibling
      const hiddenInput = container.querySelector(
        'input[type="checkbox"]',
      ) as HTMLInputElement;
      expect(hiddenInput).toBeInTheDocument();
      expect(hiddenInput.name).toBe('agree');
      expect(hiddenInput.value).toBe('yes');
    });

    it('hidden input checked state syncs with checkbox', async () => {
      const container = render(html`
        <checkbox-root name="agree" default-checked>
          <checkbox-indicator>✓</checkbox-indicator>
        </checkbox-root>
      `);

      await waitForUpdate();

      const hiddenInput = container.querySelector(
        'input[type="checkbox"]',
      ) as HTMLInputElement;
      expect(hiddenInput.checked).toBe(true);
    });
  });

  // ─── 5. Reactivity ───────────────────────────────────────────────────────

  describe('reactivity', () => {
    it('toggles checked state on click', async () => {
      const container = render(html`
        <checkbox-root>
          <checkbox-indicator>✓</checkbox-indicator>
        </checkbox-root>
      `);

      await waitForUpdate();

      const root = container.querySelector('checkbox-root')! as CheckboxRootElement;
      expect(root.getChecked()).toBe(false);
      expect(root).toHaveAttribute('data-unchecked');

      // Click to check
      root.click();
      await waitForUpdate();

      expect(root.getChecked()).toBe(true);
      expect(root).toHaveAttribute('data-checked');
      expect(root).not.toHaveAttribute('data-unchecked');
    });

    it('indicator shows/hides on toggle', async () => {
      const container = render(html`
        <checkbox-root>
          <checkbox-indicator>✓</checkbox-indicator>
        </checkbox-root>
      `);

      await waitForUpdate();

      const root = container.querySelector('checkbox-root')! as CheckboxRootElement;
      const indicator = container.querySelector('checkbox-indicator')!;

      // Initially hidden
      expect(indicator).toHaveAttribute('hidden');

      // Click to check
      root.click();
      await waitForUpdate();

      // Now visible
      expect(indicator).not.toHaveAttribute('hidden');
    });
  });

  // ─── 6. Accessibility ────────────────────────────────────────────────────

  describe('accessibility', () => {
    it('has role="checkbox"', async () => {
      const container = render(html`<checkbox-root></checkbox-root>`);
      await waitForUpdate();
      expect(container.querySelector('checkbox-root')).toHaveAttribute(
        'role',
        'checkbox',
      );
    });

    it('has aria-checked reflecting state', async () => {
      const container = render(html`<checkbox-root></checkbox-root>`);
      await waitForUpdate();

      const root = container.querySelector('checkbox-root')! as CheckboxRootElement;
      expect(root).toHaveAttribute('aria-checked', 'false');

      root.click();
      await waitForUpdate();

      expect(root).toHaveAttribute('aria-checked', 'true');
    });

    it('sets aria-checked="mixed" when indeterminate', async () => {
      const container = render(html`
        <checkbox-root indeterminate></checkbox-root>
      `);
      await waitForUpdate();

      expect(container.querySelector('checkbox-root')).toHaveAttribute(
        'aria-checked',
        'mixed',
      );
    });

    it('sets aria-disabled when disabled', async () => {
      const container = render(html`
        <checkbox-root disabled></checkbox-root>
      `);
      await waitForUpdate();

      expect(container.querySelector('checkbox-root')).toHaveAttribute(
        'aria-disabled',
        'true',
      );
    });

    it('is keyboard accessible with tabindex', async () => {
      const container = render(html`<checkbox-root></checkbox-root>`);
      await waitForUpdate();

      const root = container.querySelector('checkbox-root')! as CheckboxRootElement;
      expect(root.tabIndex).toBe(0);
    });
  });

  // ─── 7. Event Handling ────────────────────────────────────────────────────

  describe('event handling', () => {
    it('calls onCheckedChange callback', async () => {
      const onChange = vi.fn();

      const container = render(html`
        <checkbox-root .onCheckedChange=${onChange}>
          <checkbox-indicator>✓</checkbox-indicator>
        </checkbox-root>
      `);

      await waitForUpdate();

      const root = container.querySelector('checkbox-root')! as CheckboxRootElement;
      root.click();

      expect(onChange).toHaveBeenCalledWith(true, expect.any(Event));
    });

    it('toggles on Enter key', async () => {
      const container = render(html`<checkbox-root></checkbox-root>`);
      await waitForUpdate();

      const root = container.querySelector('checkbox-root')! as CheckboxRootElement;
      expect(root.getChecked()).toBe(false);

      root.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await waitForUpdate();

      expect(root.getChecked()).toBe(true);
    });

    it('toggles on Space key', async () => {
      const container = render(html`<checkbox-root></checkbox-root>`);
      await waitForUpdate();

      const root = container.querySelector('checkbox-root')! as CheckboxRootElement;
      expect(root.getChecked()).toBe(false);

      root.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true }));
      await waitForUpdate();

      expect(root.getChecked()).toBe(true);
    });

    it('does not toggle when disabled', async () => {
      const container = render(html`<checkbox-root disabled></checkbox-root>`);
      await waitForUpdate();

      const root = container.querySelector('checkbox-root')! as CheckboxRootElement;
      root.click();
      await waitForUpdate();

      expect(root.getChecked()).toBe(false);
    });

    it('does not toggle when readonly', async () => {
      const container = render(html`<checkbox-root read-only></checkbox-root>`);
      await waitForUpdate();

      const root = container.querySelector('checkbox-root')! as CheckboxRootElement;
      root.click();
      await waitForUpdate();

      expect(root.getChecked()).toBe(false);
    });
  });

  // ─── 8. Controlled vs Uncontrolled ────────────────────────────────────────

  describe('controlled vs uncontrolled', () => {
    it('supports uncontrolled mode with defaultChecked', async () => {
      const container = render(html`
        <checkbox-root default-checked></checkbox-root>
      `);
      await waitForUpdate();

      const root = container.querySelector('checkbox-root')! as CheckboxRootElement;
      expect(root.getChecked()).toBe(true);

      // Can toggle
      root.click();
      await waitForUpdate();
      expect(root.getChecked()).toBe(false);
    });

    it('supports controlled mode with checked property', async () => {
      const container = render(html`
        <checkbox-root .checked=${true}></checkbox-root>
      `);
      await waitForUpdate();

      const root = container.querySelector('checkbox-root')! as CheckboxRootElement;
      expect(root.getChecked()).toBe(true);
    });
  });

  // ─── 9. Dirty/Touched State ──────────────────────────────────────────────

  describe('dirty and touched state', () => {
    it('tracks dirty state', async () => {
      const container = render(html`<checkbox-root></checkbox-root>`);
      await waitForUpdate();

      const root = container.querySelector('checkbox-root')! as CheckboxRootElement;
      expect(root.getState().dirty).toBe(false);

      root.click();
      await waitForUpdate();

      expect(root.getState().dirty).toBe(true);
      expect(root).toHaveAttribute('data-dirty');
    });

    it('tracks touched state after blur', async () => {
      const container = render(html`<checkbox-root></checkbox-root>`);
      await waitForUpdate();

      const root = container.querySelector('checkbox-root')! as CheckboxRootElement;
      expect(root.getState().touched).toBe(false);

      root.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
      root.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
      await waitForUpdate();

      expect(root.getState().touched).toBe(true);
      expect(root).toHaveAttribute('data-touched');
    });
  });
});
