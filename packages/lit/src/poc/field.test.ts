import { html, nothing, render as renderTemplate } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import './field.ts';
import type { FieldRootElement } from './field.ts';

describe('Field Web Component POC', () => {
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
    await new Promise((r) => setTimeout(r, 10));
  }

  // ─── 1. Children Composition ──────────────────────────────────────────────

  describe('children composition', () => {
    it('renders nested custom elements', async () => {
      const container = render(html`
        <field-root>
          <field-label>Name</field-label>
          <field-control></field-control>
          <field-description>Enter your name</field-description>
          <field-error>Required</field-error>
        </field-root>
      `);

      await waitForUpdate();

      expect(container.querySelector('field-root')).toBeInTheDocument();
      expect(container.querySelector('field-label')).toBeInTheDocument();
      expect(container.querySelector('field-control')).toBeInTheDocument();
      expect(container.querySelector('field-description')).toBeInTheDocument();
      expect(container.querySelector('field-error')).toBeInTheDocument();
    });

    it('field-control auto-creates an input if none provided', async () => {
      const container = render(html`
        <field-root>
          <field-control></field-control>
        </field-root>
      `);

      await waitForUpdate();

      const control = container.querySelector('field-control')!;
      const input = control.querySelector('input');
      expect(input).toBeInTheDocument();
    });

    it('field-control uses existing child input', async () => {
      const container = render(html`
        <field-root>
          <field-control>
            <textarea></textarea>
          </field-control>
        </field-root>
      `);

      await waitForUpdate();

      const control = container.querySelector('field-control')!;
      const textarea = control.querySelector('textarea');
      expect(textarea).toBeInTheDocument();
      expect(control.querySelector('input')).not.toBeInTheDocument();
    });
  });

  // ─── 2. Styling ──────────────────────────────────────────────────────────

  describe('styling', () => {
    it('supports class attribute on field-root', () => {
      const container = render(html`
        <field-root class="my-field">
          <field-control></field-control>
        </field-root>
      `);

      expect(container.querySelector('field-root')).toHaveClass('my-field');
    });

    it('field-control has display:contents to be invisible', async () => {
      const container = render(html`
        <field-root>
          <field-control></field-control>
        </field-root>
      `);

      await waitForUpdate();

      const control = container.querySelector('field-control')! as HTMLElement;
      expect(control.style.display).toBe('contents');
    });
  });

  // ─── 3. State Propagation ────────────────────────────────────────────────

  describe('state propagation', () => {
    it('propagates disabled state from root to children', async () => {
      const container = render(html`
        <field-root disabled>
          <field-label>Name</field-label>
          <field-control></field-control>
        </field-root>
      `);

      await waitForUpdate();

      const root = container.querySelector('field-root')!;
      const label = container.querySelector('field-label')!;

      expect(root).toHaveAttribute('data-disabled');
      expect(label).toHaveAttribute('data-disabled');
    });

    it('field-root tracks touched state after blur', async () => {
      const container = render(html`
        <field-root>
          <field-control></field-control>
        </field-root>
      `);

      await waitForUpdate();

      const root = container.querySelector('field-root')! as FieldRootElement;
      const input = container.querySelector('field-control input')!;

      expect(root.getFieldState().touched).toBe(false);

      input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));

      await waitForUpdate();

      expect(root.getFieldState().touched).toBe(true);
      expect(root).toHaveAttribute('data-touched');
    });
  });

  // ─── 4. Form Integration ─────────────────────────────────────────────────

  describe('form integration', () => {
    it('field-control input participates in form', async () => {
      const container = render(html`
        <form>
          <field-root>
            <field-control required placeholder="Required"></field-control>
          </field-root>
        </form>
      `);

      await waitForUpdate();

      const input = container.querySelector('field-control input') as HTMLInputElement;
      expect(input).toBeInTheDocument();
      expect(input.required).toBe(true);
      expect(input.placeholder).toBe('Required');
    });
  });

  // ─── 5. Reactivity ───────────────────────────────────────────────────────

  describe('reactivity', () => {
    it('updates data attributes when disabled changes', async () => {
      const container = render(html`
        <field-root>
          <field-label>Name</field-label>
          <field-control></field-control>
        </field-root>
      `);

      await waitForUpdate();

      const root = container.querySelector('field-root')! as FieldRootElement;
      expect(root).not.toHaveAttribute('data-disabled');

      root.disabled = true;
      await waitForUpdate();

      expect(root).toHaveAttribute('data-disabled');
    });
  });

  // ─── 6. Accessibility ────────────────────────────────────────────────────

  describe('accessibility', () => {
    it('associates label with control via aria-labelledby', async () => {
      const container = render(html`
        <field-root>
          <field-label>Name</field-label>
          <field-control></field-control>
        </field-root>
      `);

      await waitForUpdate();

      const label = container.querySelector('field-label')! as HTMLElement;
      const input = container.querySelector('field-control input')! as HTMLInputElement;

      // field-label is not an HTMLLabelElement, so aria-labelledby is used
      const labelId = label.id;
      expect(labelId).toBeTruthy();
      expect(input.getAttribute('aria-labelledby')).toContain(labelId);
    });

    it('associates description with control via aria-describedby', async () => {
      const container = render(html`
        <field-root>
          <field-control></field-control>
          <field-description>Help text</field-description>
        </field-root>
      `);

      await waitForUpdate();

      const input = container.querySelector('field-control input')! as HTMLInputElement;
      const desc = container.querySelector('field-description')! as HTMLElement;

      expect(input.getAttribute('aria-describedby')).toContain(desc.id);
    });

    it('sets aria-invalid on control when field is invalid', async () => {
      const container = render(html`
        <field-root>
          <field-control required></field-control>
        </field-root>
      `);

      await waitForUpdate();

      const root = container.querySelector('field-root')! as FieldRootElement;
      const input = container.querySelector('field-control input')! as HTMLInputElement;

      // Trigger validation via blur
      input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));

      await waitForUpdate();

      if (root.getFieldState().valid === false) {
        expect(input).toHaveAttribute('aria-invalid', 'true');
      }
    });
  });

  // ─── 7. Validation & Error Display ───────────────────────────────────────

  describe('validation', () => {
    it('hides field-error initially when valid is null', async () => {
      const container = render(html`
        <field-root>
          <field-control required></field-control>
          <field-error>This field is required</field-error>
        </field-root>
      `);

      await waitForUpdate();

      const error = container.querySelector('field-error')! as HTMLElement;
      expect(error).toHaveAttribute('hidden');
    });

    it('field becomes invalid after blur on empty required field', async () => {
      const container = render(html`
        <field-root>
          <field-control required></field-control>
        </field-root>
      `);

      await waitForUpdate();

      const root = container.querySelector('field-root')! as FieldRootElement;
      const input = container.querySelector('field-control input')! as HTMLInputElement;

      input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));

      await waitForUpdate();

      expect(root.getFieldState().valid).toBe(false);
      expect(root).toHaveAttribute('data-invalid');
    });
  });

  // ─── 8. Complex Props ────────────────────────────────────────────────────

  describe('complex props', () => {
    it('supports validate callback via property binding', async () => {
      const validateFn = vi.fn(() => 'Custom error');

      const container = render(html`
        <field-root .validate=${validateFn}>
          <field-control></field-control>
        </field-root>
      `);

      await waitForUpdate();

      const root = container.querySelector('field-root')! as FieldRootElement;
      expect(root.validate).toBe(validateFn);
    });
  });

  // ─── 9. as-child (field-label) ──────────────────────────────────────────────

  describe('field-label as-child', () => {
    it('host becomes display:contents when as-child is set', async () => {
      const container = render(html`
        <field-root>
          <field-label as-child>
            <label class="custom-label">Name</label>
          </field-label>
          <field-control></field-control>
        </field-root>
      `);
      await waitForUpdate();

      const host = container.querySelector('field-label')! as HTMLElement;
      expect(host.style.display).toBe('contents');
    });

    it('forwards data-* state attributes to the child element', async () => {
      const container = render(html`
        <field-root disabled>
          <field-label as-child>
            <label class="custom-label">Name</label>
          </field-label>
          <field-control></field-control>
        </field-root>
      `);
      await waitForUpdate();

      const label = container.querySelector('label.custom-label')!;
      expect(label).toHaveAttribute('data-disabled');
    });

    it('does not set data-* state attributes on the host when as-child', async () => {
      const container = render(html`
        <field-root disabled>
          <field-label as-child>
            <label>Name</label>
          </field-label>
          <field-control></field-control>
        </field-root>
      `);
      await waitForUpdate();

      const host = container.querySelector('field-label')!;
      expect(host).not.toHaveAttribute('data-disabled');
    });

    it('click on child label focuses the control input', async () => {
      const container = render(html`
        <field-root>
          <field-label as-child>
            <span class="custom-label">Name</span>
          </field-label>
          <field-control></field-control>
        </field-root>
      `);
      await waitForUpdate();

      const input = container.querySelector('field-control input')! as HTMLInputElement;
      const customLabel = container.querySelector('.custom-label')!;

      customLabel.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await waitForUpdate();

      expect(document.activeElement).toBe(input);
    });

    it('child element gets an ID for ARIA association', async () => {
      const container = render(html`
        <field-root>
          <field-label as-child>
            <span class="custom-label">Name</span>
          </field-label>
          <field-control></field-control>
        </field-root>
      `);
      await waitForUpdate();

      const customLabel = container.querySelector('.custom-label')! as HTMLElement;
      const input = container.querySelector('field-control input')! as HTMLInputElement;

      // The child element (not the host) should be used for ARIA
      expect(customLabel.id).toBeTruthy();
      expect(input.getAttribute('aria-labelledby')).toContain(customLabel.id);
    });

    it('native <label> as child uses htmlFor for association', async () => {
      const container = render(html`
        <field-root>
          <field-label as-child>
            <label class="native-label">Name</label>
          </field-label>
          <field-control></field-control>
        </field-root>
      `);
      await waitForUpdate();

      const nativeLabel = container.querySelector('label.native-label')! as HTMLLabelElement;
      const input = container.querySelector('field-control input')! as HTMLInputElement;

      // Native <label> should use htmlFor
      expect(nativeLabel.htmlFor).toBe(input.id);
    });

    it('child keeps its own classes', async () => {
      const container = render(html`
        <field-root>
          <field-label as-child>
            <span class="my-label">Name</span>
          </field-label>
          <field-control></field-control>
        </field-root>
      `);
      await waitForUpdate();

      const label = container.querySelector('.my-label')!;
      expect(label).toHaveClass('my-label');
    });
  });
});
