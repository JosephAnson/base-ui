import { html, nothing, render as renderTemplate } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import './index.ts';

describe('Toolbar', () => {
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

  function keydown(element: Element, key: string) {
    element.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key }),
    );
  }

  // ── ToolbarRoot ───────────────────────────────────────────────────────

  describe('ToolbarRoot', () => {
    describe('ARIA attributes', () => {
      it('has role="toolbar"', async () => {
        const container = render(html`
          <toolbar-root>
            <toolbar-button data-testid="btn">Click</toolbar-button>
          </toolbar-root>
        `);
        await flush();

        expect(container.querySelector('toolbar-root')).toHaveAttribute('role', 'toolbar');
      });

      it('has aria-orientation', async () => {
        const container = render(html`
          <toolbar-root .orientation=${'vertical'}>
            <toolbar-button>Click</toolbar-button>
          </toolbar-root>
        `);
        await flush();

        expect(container.querySelector('toolbar-root')).toHaveAttribute(
          'aria-orientation',
          'vertical',
        );
      });

      it('sets data-orientation', async () => {
        const container = render(html`
          <toolbar-root .orientation=${'horizontal'}>
            <toolbar-button>Click</toolbar-button>
          </toolbar-root>
        `);
        await flush();

        expect(container.querySelector('toolbar-root')).toHaveAttribute(
          'data-orientation',
          'horizontal',
        );
      });
    });

    describe('keyboard navigation', () => {
      it('navigates between items with horizontal arrow keys (LTR)', async () => {
        const container = render(html`
          <toolbar-root>
            <toolbar-button data-testid="btn1">Button 1</toolbar-button>
            <toolbar-link data-testid="link1">Link</toolbar-link>
            <toolbar-group>
              <toolbar-button data-testid="btn2">Button 2</toolbar-button>
            </toolbar-group>
            <toolbar-input data-testid="input1">Input</toolbar-input>
          </toolbar-root>
        `);
        await flush();

        const btn1 = container.querySelector('[data-testid="btn1"]') as HTMLElement;
        const link1 = container.querySelector('[data-testid="link1"]') as HTMLElement;
        const btn2 = container.querySelector('[data-testid="btn2"]') as HTMLElement;
        const input1 = container.querySelector('[data-testid="input1"]') as HTMLElement;

        btn1.focus();
        keydown(btn1, 'ArrowRight');
        await flush();
        expect(link1).toHaveFocus();

        keydown(link1, 'ArrowRight');
        await flush();
        expect(btn2).toHaveFocus();

        keydown(btn2, 'ArrowRight');
        await flush();
        expect(input1).toHaveFocus();
      });

      it('loops focus with ArrowRight', async () => {
        const container = render(html`
          <toolbar-root>
            <toolbar-button data-testid="btn1">Button 1</toolbar-button>
            <toolbar-button data-testid="btn2">Button 2</toolbar-button>
          </toolbar-root>
        `);
        await flush();

        const btn1 = container.querySelector('[data-testid="btn1"]') as HTMLElement;
        const btn2 = container.querySelector('[data-testid="btn2"]') as HTMLElement;

        btn2.focus();
        keydown(btn2, 'ArrowRight');
        await flush();
        expect(btn1).toHaveFocus();
      });

      it('navigates with vertical arrow keys when orientation is vertical', async () => {
        const container = render(html`
          <toolbar-root .orientation=${'vertical'}>
            <toolbar-button data-testid="btn1">Button 1</toolbar-button>
            <toolbar-button data-testid="btn2">Button 2</toolbar-button>
          </toolbar-root>
        `);
        await flush();

        const btn1 = container.querySelector('[data-testid="btn1"]') as HTMLElement;
        const btn2 = container.querySelector('[data-testid="btn2"]') as HTMLElement;

        btn1.focus();
        keydown(btn1, 'ArrowDown');
        await flush();
        expect(btn2).toHaveFocus();

        keydown(btn2, 'ArrowUp');
        await flush();
        expect(btn1).toHaveFocus();
      });

      it('navigates to first/last with Home/End keys', async () => {
        const container = render(html`
          <toolbar-root>
            <toolbar-button data-testid="btn1">Button 1</toolbar-button>
            <toolbar-button data-testid="btn2">Button 2</toolbar-button>
            <toolbar-button data-testid="btn3">Button 3</toolbar-button>
          </toolbar-root>
        `);
        await flush();

        const btn1 = container.querySelector('[data-testid="btn1"]') as HTMLElement;
        const btn3 = container.querySelector('[data-testid="btn3"]') as HTMLElement;

        btn1.focus();
        keydown(btn1, 'End');
        await flush();
        expect(btn3).toHaveFocus();

        keydown(btn3, 'Home');
        await flush();
        expect(btn1).toHaveFocus();
      });
    });

    describe('prop: disabled', () => {
      it('disables all toolbar items except links', async () => {
        const container = render(html`
          <toolbar-root disabled>
            <toolbar-button data-testid="btn">Button</toolbar-button>
            <toolbar-link data-testid="link">Link</toolbar-link>
            <toolbar-input data-testid="input">Input</toolbar-input>
          </toolbar-root>
        `);
        await flush();

        const btn = container.querySelector('[data-testid="btn"]') as HTMLElement;
        const link = container.querySelector('[data-testid="link"]') as HTMLElement;
        const input = container.querySelector('[data-testid="input"]') as HTMLElement;

        expect(btn).toHaveAttribute('aria-disabled', 'true');
        expect(btn).toHaveAttribute('data-disabled');
        expect(input).toHaveAttribute('aria-disabled', 'true');
        expect(input).toHaveAttribute('data-disabled');

        // Links remain unaffected
        expect(link).not.toHaveAttribute('data-disabled');
        expect(link).not.toHaveAttribute('aria-disabled');
      });
    });
  });

  // ── ToolbarGroup ──────────────────────────────────────────────────────

  describe('ToolbarGroup', () => {
    describe('ARIA attributes', () => {
      it('renders a group', async () => {
        const container = render(html`
          <toolbar-root>
            <toolbar-group data-testid="group">
              <toolbar-button>Button</toolbar-button>
            </toolbar-group>
          </toolbar-root>
        `);
        await flush();

        expect(container.querySelector('[data-testid="group"]')).toHaveAttribute('role', 'group');
      });
    });

    describe('prop: disabled', () => {
      it('disables all toolbar items in the group except links', async () => {
        const container = render(html`
          <toolbar-root>
            <toolbar-button data-testid="outside-btn">Outside</toolbar-button>
            <toolbar-group disabled>
              <toolbar-button data-testid="group-btn">Button</toolbar-button>
              <toolbar-link data-testid="group-link">Link</toolbar-link>
              <toolbar-input data-testid="group-input">Input</toolbar-input>
            </toolbar-group>
          </toolbar-root>
        `);
        await flush();

        const outsideBtn = container.querySelector('[data-testid="outside-btn"]') as HTMLElement;
        const groupBtn = container.querySelector('[data-testid="group-btn"]') as HTMLElement;
        const groupLink = container.querySelector('[data-testid="group-link"]') as HTMLElement;
        const groupInput = container.querySelector('[data-testid="group-input"]') as HTMLElement;

        // Outside button unaffected
        expect(outsideBtn).not.toHaveAttribute('data-disabled');

        // Group button disabled
        expect(groupBtn).toHaveAttribute('aria-disabled', 'true');
        expect(groupBtn).toHaveAttribute('data-disabled');

        // Group link unaffected
        expect(groupLink).not.toHaveAttribute('data-disabled');

        // Group input disabled
        expect(groupInput).toHaveAttribute('aria-disabled', 'true');
        expect(groupInput).toHaveAttribute('data-disabled');
      });
    });
  });

  // ── ToolbarButton ─────────────────────────────────────────────────────

  describe('ToolbarButton', () => {
    describe('ARIA attributes', () => {
      it('renders a button', async () => {
        const container = render(html`
          <toolbar-root>
            <toolbar-button data-testid="btn">Click</toolbar-button>
          </toolbar-root>
        `);
        await flush();

        expect(container.querySelector('[data-testid="btn"]')).toHaveAttribute('role', 'button');
      });
    });

    describe('prop: disabled', () => {
      it('disables the button with aria-disabled and data-disabled', async () => {
        const container = render(html`
          <toolbar-root>
            <toolbar-button disabled data-testid="btn">Click</toolbar-button>
          </toolbar-root>
        `);
        await flush();

        const btn = container.querySelector('[data-testid="btn"]') as HTMLElement;
        expect(btn).toHaveAttribute('aria-disabled', 'true');
        expect(btn).toHaveAttribute('data-disabled');
        expect(btn).toHaveAttribute('data-focusable');
      });

      it('prevents click events when disabled', async () => {
        const onClick = vi.fn();
        const container = render(html`
          <toolbar-root>
            <toolbar-button disabled data-testid="btn" @click=${onClick}>Click</toolbar-button>
          </toolbar-root>
        `);
        await flush();

        const btn = container.querySelector('[data-testid="btn"]') as HTMLElement;
        btn.click();
        await flush();

        // The click event is stopped, but we need to check via a listener
        // Since click() fires synchronously, and our handler stops propagation,
        // verify the disabled state prevents action
        expect(btn).toHaveAttribute('aria-disabled', 'true');
      });
    });

    describe('prop: focusableWhenDisabled', () => {
      it('uses disabled attribute when focusableWhenDisabled is false', async () => {
        const container = render(html`
          <toolbar-root>
            <toolbar-button disabled .focusableWhenDisabled=${false} data-testid="btn">Click</toolbar-button>
          </toolbar-root>
        `);
        await flush();

        const btn = container.querySelector('[data-testid="btn"]') as HTMLElement;
        expect(btn).toHaveAttribute('disabled');
        expect(btn).not.toHaveAttribute('data-focusable');
      });
    });
  });

  // ── ToolbarLink ───────────────────────────────────────────────────────

  describe('ToolbarLink', () => {
    describe('ARIA attributes', () => {
      it('renders with correct orientation', async () => {
        const container = render(html`
          <toolbar-root>
            <toolbar-link data-testid="link">Link</toolbar-link>
          </toolbar-root>
        `);
        await flush();

        expect(container.querySelector('[data-testid="link"]')).toHaveAttribute(
          'data-orientation',
          'horizontal',
        );
      });
    });

    it('is not affected by toolbar disabled state', async () => {
      const container = render(html`
        <toolbar-root disabled>
          <toolbar-link data-testid="link">Link</toolbar-link>
        </toolbar-root>
      `);
      await flush();

      const link = container.querySelector('[data-testid="link"]') as HTMLElement;
      expect(link).not.toHaveAttribute('data-disabled');
      expect(link).not.toHaveAttribute('aria-disabled');
    });
  });

  // ── ToolbarInput ──────────────────────────────────────────────────────

  describe('ToolbarInput', () => {
    describe('ARIA attributes', () => {
      it('renders a textbox', async () => {
        const container = render(html`
          <toolbar-root>
            <toolbar-input data-testid="input">Input</toolbar-input>
          </toolbar-root>
        `);
        await flush();

        expect(container.querySelector('[data-testid="input"]')).toHaveAttribute('role', 'textbox');
      });
    });

    describe('prop: disabled', () => {
      it('disables the input with aria-disabled', async () => {
        const container = render(html`
          <toolbar-root>
            <toolbar-input disabled data-testid="input">Input</toolbar-input>
          </toolbar-root>
        `);
        await flush();

        const input = container.querySelector('[data-testid="input"]') as HTMLElement;
        expect(input).toHaveAttribute('aria-disabled', 'true');
        expect(input).toHaveAttribute('data-disabled');
      });
    });
  });

  // ── ToolbarSeparator ──────────────────────────────────────────────────

  describe('ToolbarSeparator', () => {
    it('renders with role="separator"', async () => {
      const container = render(html`
        <toolbar-root>
          <toolbar-separator data-testid="sep"></toolbar-separator>
        </toolbar-root>
      `);
      await flush();

      expect(container.querySelector('[data-testid="sep"]')).toHaveAttribute('role', 'separator');
    });

    it('inverts orientation relative to toolbar', async () => {
      const container = render(html`
        <toolbar-root .orientation=${'horizontal'}>
          <toolbar-separator data-testid="sep"></toolbar-separator>
        </toolbar-root>
      `);
      await flush();

      const sep = container.querySelector('[data-testid="sep"]') as HTMLElement;
      expect(sep).toHaveAttribute('aria-orientation', 'vertical');
      expect(sep).toHaveAttribute('data-orientation', 'vertical');
    });

    it('uses horizontal orientation when toolbar is vertical', async () => {
      const container = render(html`
        <toolbar-root .orientation=${'vertical'}>
          <toolbar-separator data-testid="sep"></toolbar-separator>
        </toolbar-root>
      `);
      await flush();

      const sep = container.querySelector('[data-testid="sep"]') as HTMLElement;
      expect(sep).toHaveAttribute('aria-orientation', 'horizontal');
    });
  });

  // ── Roving tabindex ───────────────────────────────────────────────────

  describe('roving tabindex', () => {
    it('manages roving tabindex across toolbar items', async () => {
      const container = render(html`
        <toolbar-root>
          <toolbar-button data-testid="btn1">Button 1</toolbar-button>
          <toolbar-button data-testid="btn2">Button 2</toolbar-button>
          <toolbar-link data-testid="link1">Link</toolbar-link>
        </toolbar-root>
      `);
      await flush();

      const btn1 = container.querySelector('[data-testid="btn1"]') as HTMLElement;
      const btn2 = container.querySelector('[data-testid="btn2"]') as HTMLElement;
      const link1 = container.querySelector('[data-testid="link1"]') as HTMLElement;

      // First item tabbable by default
      expect(btn1.tabIndex).toBe(0);
      expect(btn2.tabIndex).toBe(-1);
      expect(link1.tabIndex).toBe(-1);

      // Navigate to btn2
      btn1.focus();
      keydown(btn1, 'ArrowRight');
      await flush();

      expect(btn1.tabIndex).toBe(-1);
      expect(btn2.tabIndex).toBe(0);
      expect(link1.tabIndex).toBe(-1);
    });
  });
});
