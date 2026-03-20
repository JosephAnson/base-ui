import { html, nothing, render as renderTemplate } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import './index.ts';

describe('Tabs', () => {
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

  function keydown(element: Element, key: string, options: Record<string, unknown> = {}) {
    element.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key, ...options }),
    );
  }

  function keyup(element: Element, key: string) {
    element.dispatchEvent(
      new KeyboardEvent('keyup', { bubbles: true, cancelable: true, key }),
    );
  }

  // ── TabsRoot ──────────────────────────────────────────────────────────

  describe('TabsRoot', () => {
    describe('prop: children', () => {
      it('puts the selected child in tab order', async () => {
        render(html`
          <tabs-root .value=${1}>
            <tabs-list>
              <tabs-tab value="0"></tabs-tab>
              <tabs-tab value="1"></tabs-tab>
            </tabs-list>
          </tabs-root>
        `);
        await flush();

        const tabs = document.querySelectorAll<HTMLElement>('[role="tab"]');
        expect(tabs[0].tabIndex).toBe(-1);
        expect(tabs[1].tabIndex).toBe(0);
      });

      it('sets the aria-labelledby attribute on tab panels to the corresponding tab id', async () => {
        render(html`
          <tabs-root .defaultValue=${'tab-0'}>
            <tabs-list>
              <tabs-tab value="tab-0"></tabs-tab>
              <tabs-tab value="tab-1" id="explicit-tab-id-1"></tabs-tab>
              <tabs-tab value="tab-2"></tabs-tab>
              <tabs-tab value="tab-3" id="explicit-tab-id-3"></tabs-tab>
            </tabs-list>
            <tabs-panel value="tab-1" .keepMounted=${true}></tabs-panel>
            <tabs-panel value="tab-0" .keepMounted=${true}></tabs-panel>
            <tabs-panel value="tab-2" .keepMounted=${true}></tabs-panel>
            <tabs-panel value="tab-3" .keepMounted=${true}></tabs-panel>
          </tabs-root>
        `);
        await flush();

        const tabs = Array.from(document.querySelectorAll<HTMLElement>('[role="tab"]'));
        const panels = Array.from(document.querySelectorAll<HTMLElement>('[role="tabpanel"]'));

        expect(panels[0]).toHaveAttribute('aria-labelledby', tabs[1].id);
        expect(panels[1]).toHaveAttribute('aria-labelledby', tabs[0].id);
        expect(panels[2]).toHaveAttribute('aria-labelledby', tabs[2].id);
        expect(panels[3]).toHaveAttribute('aria-labelledby', tabs[3].id);
      });

      it('sets the aria-controls attribute on tabs to the corresponding tab panel id', async () => {
        render(html`
          <tabs-root .defaultValue=${'tab-0'}>
            <tabs-list>
              <tabs-tab value="tab-0"></tabs-tab>
              <tabs-tab value="tab-1" id="explicit-tab-id-1"></tabs-tab>
              <tabs-tab value="tab-2"></tabs-tab>
              <tabs-tab value="tab-3" id="explicit-tab-id-3"></tabs-tab>
            </tabs-list>
            <tabs-panel value="tab-1" .keepMounted=${true}></tabs-panel>
            <tabs-panel value="tab-0" .keepMounted=${true}></tabs-panel>
            <tabs-panel value="tab-2" .keepMounted=${true}></tabs-panel>
            <tabs-panel value="tab-3" .keepMounted=${true}></tabs-panel>
          </tabs-root>
        `);
        await flush();

        const tabs = Array.from(document.querySelectorAll<HTMLElement>('[role="tab"]'));
        const panels = Array.from(document.querySelectorAll<HTMLElement>('[role="tabpanel"]'));

        expect(tabs[0]).toHaveAttribute('aria-controls', panels[1].id);
        expect(tabs[1]).toHaveAttribute('aria-controls', panels[0].id);
        expect(tabs[2]).toHaveAttribute('aria-controls', panels[2].id);
        expect(tabs[3]).toHaveAttribute('aria-controls', panels[3].id);
      });

      it('sets aria-controls on the first tab when no value is provided', async () => {
        render(html`
          <tabs-root>
            <tabs-list>
              <tabs-tab value="0"></tabs-tab>
              <tabs-tab value="1"></tabs-tab>
            </tabs-list>
            <tabs-panel value="0" .keepMounted=${true}></tabs-panel>
            <tabs-panel value="1" .keepMounted=${true}></tabs-panel>
          </tabs-root>
        `);
        await flush();

        const tabs = Array.from(document.querySelectorAll<HTMLElement>('[role="tab"]'));
        const panels = Array.from(document.querySelectorAll<HTMLElement>('[role="tabpanel"]'));

        expect(tabs[0]).toHaveAttribute('aria-controls', panels[0].id);
        expect(tabs[1]).toHaveAttribute('aria-controls', panels[1].id);
        expect(panels[0]).toHaveAttribute('aria-labelledby', tabs[0].id);
        expect(panels[1]).toHaveAttribute('aria-labelledby', tabs[1].id);
      });
    });

    describe('prop: value', () => {
      it('should pass selected prop to children', async () => {
        render(html`
          <tabs-root .value=${1}>
            <tabs-list>
              <tabs-tab value="0"></tabs-tab>
              <tabs-tab value="1"></tabs-tab>
            </tabs-list>
          </tabs-root>
        `);
        await flush();

        const tabs = document.querySelectorAll<HTMLElement>('[role="tab"]');
        expect(tabs[0]).toHaveAttribute('aria-selected', 'false');
        expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
      });
    });

    describe('disabled tabs', () => {
      it('should honor explicit defaultValue even if it points to a disabled tab', async () => {
        render(html`
          <tabs-root .defaultValue=${0}>
            <tabs-list>
              <tabs-tab value="0" disabled></tabs-tab>
              <tabs-tab value="1"></tabs-tab>
              <tabs-tab value="2"></tabs-tab>
            </tabs-list>
          </tabs-root>
        `);
        await flush();

        const tabs = document.querySelectorAll<HTMLElement>('[role="tab"]');
        expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
        expect(tabs[1]).toHaveAttribute('aria-selected', 'false');
        expect(tabs[2]).toHaveAttribute('aria-selected', 'false');
      });

      it('should honor explicit value prop even if it points to a disabled tab', async () => {
        render(html`
          <tabs-root .value=${0}>
            <tabs-list>
              <tabs-tab value="0" disabled></tabs-tab>
              <tabs-tab value="1"></tabs-tab>
              <tabs-tab value="2"></tabs-tab>
            </tabs-list>
          </tabs-root>
        `);
        await flush();

        const tabs = document.querySelectorAll<HTMLElement>('[role="tab"]');
        expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
        expect(tabs[1]).toHaveAttribute('aria-selected', 'false');
        expect(tabs[2]).toHaveAttribute('aria-selected', 'false');
      });
    });

    describe('prop: onValueChange', () => {
      it('should call onValueChange when clicking', async () => {
        const handleChange = vi.fn();

        render(html`
          <tabs-root .value=${0} .onValueChange=${handleChange}>
            <tabs-list>
              <tabs-tab value="0"></tabs-tab>
              <tabs-tab value="1"></tabs-tab>
            </tabs-list>
          </tabs-root>
        `);
        await flush();

        const tabs = document.querySelectorAll<HTMLElement>('[role="tab"]');
        tabs[1].click();
        await flush();

        expect(handleChange).toHaveBeenCalledTimes(1);
        expect(handleChange.mock.calls[0][0]).toBe(1);
      });

      it('should not call onValueChange when already active', async () => {
        const handleChange = vi.fn();

        render(html`
          <tabs-root .value=${0} .onValueChange=${handleChange}>
            <tabs-list>
              <tabs-tab value="0"></tabs-tab>
              <tabs-tab value="1"></tabs-tab>
            </tabs-list>
          </tabs-root>
        `);
        await flush();

        const tabs = document.querySelectorAll<HTMLElement>('[role="tab"]');
        tabs[0].click();
        await flush();

        expect(handleChange).not.toHaveBeenCalled();
      });

      it('when activateOnFocus = true should call onValueChange on keyboard navigation', async () => {
        const handleChange = vi.fn();

        render(html`
          <tabs-root .value=${0} .onValueChange=${handleChange}>
            <tabs-list .activateOnFocus=${true}>
              <tabs-tab value="0"></tabs-tab>
              <tabs-tab value="1"></tabs-tab>
            </tabs-list>
          </tabs-root>
        `);
        await flush();

        const firstTab = document.querySelector<HTMLElement>('[role="tab"]')!;
        firstTab.focus();

        keydown(firstTab, 'ArrowRight');
        await flush();

        expect(handleChange).toHaveBeenCalledTimes(1);
        expect(handleChange.mock.calls[0][0]).toBe(1);
      });

      it('when activateOnFocus = false should not call onValueChange on keyboard navigation', async () => {
        const handleChange = vi.fn();

        render(html`
          <tabs-root .value=${1} .onValueChange=${handleChange}>
            <tabs-list .activateOnFocus=${false}>
              <tabs-tab value="0"></tabs-tab>
              <tabs-tab value="1"></tabs-tab>
            </tabs-list>
          </tabs-root>
        `);
        await flush();

        const secondTab = document.querySelectorAll<HTMLElement>('[role="tab"]')[1];
        secondTab.focus();
        keydown(secondTab, 'ArrowLeft');
        await flush();

        expect(handleChange).not.toHaveBeenCalled();
      });
    });

    describe('prop: orientation', () => {
      it('does not add aria-orientation by default', async () => {
        render(html`
          <tabs-root .value=${0}>
            <tabs-list>
              <tabs-tab value="0"></tabs-tab>
            </tabs-list>
          </tabs-root>
        `);
        await flush();

        expect(document.querySelector('[role="tablist"]')).not.toHaveAttribute('aria-orientation');
      });

      it('adds the proper aria-orientation when vertical', async () => {
        render(html`
          <tabs-root .value=${0} orientation="vertical">
            <tabs-list>
              <tabs-tab value="0"></tabs-tab>
            </tabs-list>
          </tabs-root>
        `);
        await flush();

        expect(document.querySelector('[role="tablist"]')).toHaveAttribute(
          'aria-orientation',
          'vertical',
        );
      });
    });

    describe('pointer navigation', () => {
      it('selects the clicked tab', async () => {
        render(html`
          <tabs-root .defaultValue=${0}>
            <tabs-list .activateOnFocus=${false}>
              <tabs-tab value="0">Tab 1</tabs-tab>
              <tabs-tab value="1">Tab 2</tabs-tab>
              <tabs-tab value="2">Tab 3</tabs-tab>
            </tabs-list>
            <tabs-panel value="0" .keepMounted=${true}>Panel 1</tabs-panel>
            <tabs-panel value="1" .keepMounted=${true}>Panel 2</tabs-panel>
            <tabs-panel value="2" .keepMounted=${true}>Panel 3</tabs-panel>
          </tabs-root>
        `);
        await flush();

        const tabs = document.querySelectorAll<HTMLElement>('[role="tab"]');
        tabs[1].click();
        await flush();

        const panels = document.querySelectorAll<HTMLElement>('[role="tabpanel"]');
        expect(panels[0]).toHaveAttribute('hidden');
        expect(panels[1]).not.toHaveAttribute('hidden');
        expect(panels[2]).toHaveAttribute('hidden');
      });

      it('does not select the clicked disabled tab', async () => {
        render(html`
          <tabs-root .defaultValue=${0}>
            <tabs-list .activateOnFocus=${false}>
              <tabs-tab value="0">Tab 1</tabs-tab>
              <tabs-tab value="1" disabled>Tab 2</tabs-tab>
              <tabs-tab value="2">Tab 3</tabs-tab>
            </tabs-list>
            <tabs-panel value="0" .keepMounted=${true}>Panel 1</tabs-panel>
            <tabs-panel value="1" .keepMounted=${true}>Panel 2</tabs-panel>
            <tabs-panel value="2" .keepMounted=${true}>Panel 3</tabs-panel>
          </tabs-root>
        `);
        await flush();

        const tabs = document.querySelectorAll<HTMLElement>('[role="tab"]');
        tabs[1].click();
        await flush();

        const panels = document.querySelectorAll<HTMLElement>('[role="tabpanel"]');
        expect(panels[0]).not.toHaveAttribute('hidden');
        expect(panels[1]).toHaveAttribute('hidden');
        expect(panels[2]).toHaveAttribute('hidden');
      });
    });
  });

  // ── Keyboard navigation ───────────────────────────────────────────────

  describe('keyboard navigation when focus is on a tab', () => {
    describe('horizontal LTR', () => {
      describe('ArrowLeft', () => {
        it('moves focus to the last tab if focus is on the first tab (loop)', async () => {
          render(html`
            <tabs-root .value=${0}>
              <tabs-list .activateOnFocus=${false}>
                <tabs-tab value="0"></tabs-tab>
                <tabs-tab value="1"></tabs-tab>
                <tabs-tab value="2"></tabs-tab>
              </tabs-list>
            </tabs-root>
          `);
          await flush();

          const tabs = document.querySelectorAll<HTMLElement>('[role="tab"]');
          tabs[0].focus();
          keydown(tabs[0], 'ArrowLeft');
          await flush();

          expect(document.activeElement).toBe(tabs[2]);
        });

        it('moves focus to the previous tab', async () => {
          render(html`
            <tabs-root .value=${1}>
              <tabs-list .activateOnFocus=${false}>
                <tabs-tab value="0"></tabs-tab>
                <tabs-tab value="1"></tabs-tab>
                <tabs-tab value="2"></tabs-tab>
              </tabs-list>
            </tabs-root>
          `);
          await flush();

          const tabs = document.querySelectorAll<HTMLElement>('[role="tab"]');
          tabs[1].focus();
          keydown(tabs[1], 'ArrowLeft');
          await flush();

          expect(document.activeElement).toBe(tabs[0]);
        });

        it('moves focus to a disabled tab without activating it', async () => {
          const handleChange = vi.fn();
          render(html`
            <tabs-root .value=${2} .onValueChange=${handleChange}>
              <tabs-list .activateOnFocus=${true}>
                <tabs-tab value="0"></tabs-tab>
                <tabs-tab value="1" disabled></tabs-tab>
                <tabs-tab value="2"></tabs-tab>
              </tabs-list>
            </tabs-root>
          `);
          await flush();

          const tabs = document.querySelectorAll<HTMLElement>('[role="tab"]');
          tabs[2].focus();
          keydown(tabs[2], 'ArrowLeft');
          await flush();

          expect(document.activeElement).toBe(tabs[1]);
          expect(handleChange).not.toHaveBeenCalled();
        });
      });

      describe('ArrowRight', () => {
        it('moves focus to the first tab if focus is on the last tab (loop)', async () => {
          render(html`
            <tabs-root .value=${2}>
              <tabs-list .activateOnFocus=${false}>
                <tabs-tab value="0"></tabs-tab>
                <tabs-tab value="1"></tabs-tab>
                <tabs-tab value="2"></tabs-tab>
              </tabs-list>
            </tabs-root>
          `);
          await flush();

          const tabs = document.querySelectorAll<HTMLElement>('[role="tab"]');
          tabs[2].focus();
          keydown(tabs[2], 'ArrowRight');
          await flush();

          expect(document.activeElement).toBe(tabs[0]);
        });

        it('moves focus to the next tab', async () => {
          render(html`
            <tabs-root .value=${1}>
              <tabs-list .activateOnFocus=${false}>
                <tabs-tab value="0"></tabs-tab>
                <tabs-tab value="1"></tabs-tab>
                <tabs-tab value="2"></tabs-tab>
              </tabs-list>
            </tabs-root>
          `);
          await flush();

          const tabs = document.querySelectorAll<HTMLElement>('[role="tab"]');
          tabs[1].focus();
          keydown(tabs[1], 'ArrowRight');
          await flush();

          expect(document.activeElement).toBe(tabs[2]);
        });

        it('moves focus to a disabled tab without activating it', async () => {
          const handleChange = vi.fn();
          render(html`
            <tabs-root .value=${0} .onValueChange=${handleChange}>
              <tabs-list .activateOnFocus=${true}>
                <tabs-tab value="0"></tabs-tab>
                <tabs-tab value="1" disabled></tabs-tab>
                <tabs-tab value="2"></tabs-tab>
              </tabs-list>
            </tabs-root>
          `);
          await flush();

          const tabs = document.querySelectorAll<HTMLElement>('[role="tab"]');
          tabs[0].focus();
          keydown(tabs[0], 'ArrowRight');
          await flush();

          expect(document.activeElement).toBe(tabs[1]);
          expect(handleChange).not.toHaveBeenCalled();

          // Continue past disabled tab
          keydown(tabs[1], 'ArrowRight');
          await flush();
          expect(document.activeElement).toBe(tabs[2]);
        });
      });

      describe('with activateOnFocus = true', () => {
        it('moves focus to the next tab while activating it', async () => {
          const handleChange = vi.fn();
          render(html`
            <tabs-root .value=${1} .onValueChange=${handleChange}>
              <tabs-list .activateOnFocus=${true}>
                <tabs-tab value="0"></tabs-tab>
                <tabs-tab value="1"></tabs-tab>
                <tabs-tab value="2"></tabs-tab>
              </tabs-list>
            </tabs-root>
          `);
          await flush();

          const tabs = document.querySelectorAll<HTMLElement>('[role="tab"]');
          tabs[1].focus();
          keydown(tabs[1], 'ArrowRight');
          await flush();

          expect(document.activeElement).toBe(tabs[2]);
          expect(handleChange).toHaveBeenCalledTimes(1);
          expect(handleChange.mock.calls[0][0]).toBe(2);
        });

        it('moves focus to the previous tab while activating it', async () => {
          const handleChange = vi.fn();
          render(html`
            <tabs-root .value=${1} .onValueChange=${handleChange}>
              <tabs-list .activateOnFocus=${true}>
                <tabs-tab value="0"></tabs-tab>
                <tabs-tab value="1"></tabs-tab>
                <tabs-tab value="2"></tabs-tab>
              </tabs-list>
            </tabs-root>
          `);
          await flush();

          const tabs = document.querySelectorAll<HTMLElement>('[role="tab"]');
          tabs[1].focus();
          keydown(tabs[1], 'ArrowLeft');
          await flush();

          expect(document.activeElement).toBe(tabs[0]);
          expect(handleChange).toHaveBeenCalledTimes(1);
          expect(handleChange.mock.calls[0][0]).toBe(0);
        });
      });
    });

    describe('vertical', () => {
      it('ArrowDown moves focus to the next tab', async () => {
        render(html`
          <tabs-root .value=${0} orientation="vertical">
            <tabs-list .activateOnFocus=${false}>
              <tabs-tab value="0"></tabs-tab>
              <tabs-tab value="1"></tabs-tab>
              <tabs-tab value="2"></tabs-tab>
            </tabs-list>
          </tabs-root>
        `);
        await flush();

        const tabs = document.querySelectorAll<HTMLElement>('[role="tab"]');
        tabs[0].focus();
        keydown(tabs[0], 'ArrowDown');
        await flush();

        expect(document.activeElement).toBe(tabs[1]);
      });

      it('ArrowUp moves focus to the previous tab', async () => {
        render(html`
          <tabs-root .value=${1} orientation="vertical">
            <tabs-list .activateOnFocus=${false}>
              <tabs-tab value="0"></tabs-tab>
              <tabs-tab value="1"></tabs-tab>
              <tabs-tab value="2"></tabs-tab>
            </tabs-list>
          </tabs-root>
        `);
        await flush();

        const tabs = document.querySelectorAll<HTMLElement>('[role="tab"]');
        tabs[1].focus();
        keydown(tabs[1], 'ArrowUp');
        await flush();

        expect(document.activeElement).toBe(tabs[0]);
      });

      it('ArrowDown wraps to first tab from last tab', async () => {
        render(html`
          <tabs-root .value=${2} orientation="vertical">
            <tabs-list .activateOnFocus=${false}>
              <tabs-tab value="0"></tabs-tab>
              <tabs-tab value="1"></tabs-tab>
              <tabs-tab value="2"></tabs-tab>
            </tabs-list>
          </tabs-root>
        `);
        await flush();

        const tabs = document.querySelectorAll<HTMLElement>('[role="tab"]');
        tabs[2].focus();
        keydown(tabs[2], 'ArrowDown');
        await flush();

        expect(document.activeElement).toBe(tabs[0]);
      });
    });

    describe('Home and End', () => {
      it('Home moves focus to the first tab without activating it', async () => {
        const handleChange = vi.fn();
        render(html`
          <tabs-root .value=${2} .onValueChange=${handleChange}>
            <tabs-list .activateOnFocus=${false}>
              <tabs-tab value="0"></tabs-tab>
              <tabs-tab value="1"></tabs-tab>
              <tabs-tab value="2"></tabs-tab>
            </tabs-list>
          </tabs-root>
        `);
        await flush();

        const tabs = document.querySelectorAll<HTMLElement>('[role="tab"]');
        tabs[2].focus();
        keydown(tabs[2], 'Home');
        await flush();

        expect(document.activeElement).toBe(tabs[0]);
        expect(handleChange).not.toHaveBeenCalled();
      });

      it('Home moves focus to the first tab while activating it when activateOnFocus = true', async () => {
        const handleChange = vi.fn();
        render(html`
          <tabs-root .value=${2} .onValueChange=${handleChange}>
            <tabs-list .activateOnFocus=${true}>
              <tabs-tab value="0"></tabs-tab>
              <tabs-tab value="1"></tabs-tab>
              <tabs-tab value="2"></tabs-tab>
            </tabs-list>
          </tabs-root>
        `);
        await flush();

        const tabs = document.querySelectorAll<HTMLElement>('[role="tab"]');
        tabs[2].focus();
        keydown(tabs[2], 'Home');
        await flush();

        expect(document.activeElement).toBe(tabs[0]);
        expect(handleChange).toHaveBeenCalledTimes(1);
        expect(handleChange.mock.calls[0][0]).toBe(0);
      });

      it('Home moves focus to a disabled tab without activating it', async () => {
        const handleChange = vi.fn();
        render(html`
          <tabs-root .value=${2} .onValueChange=${handleChange}>
            <tabs-list .activateOnFocus=${true}>
              <tabs-tab value="0" disabled></tabs-tab>
              <tabs-tab value="1"></tabs-tab>
              <tabs-tab value="2"></tabs-tab>
            </tabs-list>
          </tabs-root>
        `);
        await flush();

        const tabs = document.querySelectorAll<HTMLElement>('[role="tab"]');
        tabs[2].focus();
        keydown(tabs[2], 'Home');
        await flush();

        expect(document.activeElement).toBe(tabs[0]);
        expect(handleChange).not.toHaveBeenCalled();
      });

      it('End moves focus to the last tab without activating it', async () => {
        const handleChange = vi.fn();
        render(html`
          <tabs-root .value=${0} .onValueChange=${handleChange}>
            <tabs-list .activateOnFocus=${false}>
              <tabs-tab value="0"></tabs-tab>
              <tabs-tab value="1"></tabs-tab>
              <tabs-tab value="2"></tabs-tab>
            </tabs-list>
          </tabs-root>
        `);
        await flush();

        const tabs = document.querySelectorAll<HTMLElement>('[role="tab"]');
        tabs[0].focus();
        keydown(tabs[0], 'End');
        await flush();

        expect(document.activeElement).toBe(tabs[2]);
        expect(handleChange).not.toHaveBeenCalled();
      });

      it('End moves focus to the last tab while activating it when activateOnFocus = true', async () => {
        const handleChange = vi.fn();
        render(html`
          <tabs-root .value=${0} .onValueChange=${handleChange}>
            <tabs-list .activateOnFocus=${true}>
              <tabs-tab value="0"></tabs-tab>
              <tabs-tab value="1"></tabs-tab>
              <tabs-tab value="2"></tabs-tab>
            </tabs-list>
          </tabs-root>
        `);
        await flush();

        const tabs = document.querySelectorAll<HTMLElement>('[role="tab"]');
        tabs[0].focus();
        keydown(tabs[0], 'End');
        await flush();

        expect(document.activeElement).toBe(tabs[2]);
        expect(handleChange).toHaveBeenCalledTimes(1);
        expect(handleChange.mock.calls[0][0]).toBe(2);
      });

      it('End moves focus to a disabled tab without activating it', async () => {
        const handleChange = vi.fn();
        render(html`
          <tabs-root .value=${0} .onValueChange=${handleChange}>
            <tabs-list .activateOnFocus=${true}>
              <tabs-tab value="0"></tabs-tab>
              <tabs-tab value="1"></tabs-tab>
              <tabs-tab value="2" disabled></tabs-tab>
            </tabs-list>
          </tabs-root>
        `);
        await flush();

        const tabs = document.querySelectorAll<HTMLElement>('[role="tab"]');
        tabs[0].focus();
        keydown(tabs[0], 'End');
        await flush();

        expect(document.activeElement).toBe(tabs[2]);
        expect(handleChange).not.toHaveBeenCalled();
      });
    });

    describe('modifier keys', () => {
      (['shiftKey', 'ctrlKey', 'altKey', 'metaKey'] as const).forEach((modifierKey) => {
        it(`does not move focus when ${modifierKey} is pressed`, async () => {
          const handleChange = vi.fn();
          render(html`
            <tabs-root .value=${0} .onValueChange=${handleChange}>
              <tabs-list .activateOnFocus=${true}>
                <tabs-tab value="0"></tabs-tab>
                <tabs-tab value="1"></tabs-tab>
                <tabs-tab value="2"></tabs-tab>
              </tabs-list>
            </tabs-root>
          `);
          await flush();

          const tabs = document.querySelectorAll<HTMLElement>('[role="tab"]');
          tabs[0].focus();

          keydown(tabs[0], 'ArrowRight', { [modifierKey]: true });
          await flush();

          expect(document.activeElement).toBe(tabs[0]);
          expect(handleChange).not.toHaveBeenCalled();
        });
      });
    });

    it('should allow to focus first tab when there are no active tabs', async () => {
      render(html`
        <tabs-root .defaultValue=${0}>
          <tabs-list>
            <tabs-tab value="0"></tabs-tab>
            <tabs-tab value="1"></tabs-tab>
          </tabs-list>
        </tabs-root>
      `);
      await flush();

      const tabs = document.querySelectorAll<HTMLElement>('[role="tab"]');
      expect(tabs[0].getAttribute('tabindex')).toBe('0');
      expect(tabs[1].getAttribute('tabindex')).toBe('-1');
    });
  });

  // ── TabsList ──────────────────────────────────────────────────────────

  describe('TabsList', () => {
    it('has role="tablist"', async () => {
      render(html`
        <tabs-root .defaultValue=${0}>
          <tabs-list>
            <tabs-tab value="0"></tabs-tab>
          </tabs-list>
        </tabs-root>
      `);
      await flush();

      expect(document.querySelector('tabs-list')).toHaveAttribute('role', 'tablist');
    });

    it('sets the aria-selected attribute on the active tab', async () => {
      render(html`
        <tabs-root .defaultValue=${1}>
          <tabs-list>
            <tabs-tab value="1">Tab 1</tabs-tab>
            <tabs-tab value="2">Tab 2</tabs-tab>
            <tabs-tab value="3">Tab 3</tabs-tab>
          </tabs-list>
        </tabs-root>
      `);
      await flush();

      const tab1 = document.querySelectorAll<HTMLElement>('[role="tab"]')[0];
      const tab2 = document.querySelectorAll<HTMLElement>('[role="tab"]')[1];
      const tab3 = document.querySelectorAll<HTMLElement>('[role="tab"]')[2];

      expect(tab1).toHaveAttribute('aria-selected', 'true');
      expect(tab2).toHaveAttribute('aria-selected', 'false');
      expect(tab3).toHaveAttribute('aria-selected', 'false');

      tab2.click();
      await flush();

      expect(tab1).toHaveAttribute('aria-selected', 'false');
      expect(tab2).toHaveAttribute('aria-selected', 'true');
      expect(tab3).toHaveAttribute('aria-selected', 'false');

      tab3.click();
      await flush();

      expect(tab1).toHaveAttribute('aria-selected', 'false');
      expect(tab2).toHaveAttribute('aria-selected', 'false');
      expect(tab3).toHaveAttribute('aria-selected', 'true');

      tab1.click();
      await flush();

      expect(tab1).toHaveAttribute('aria-selected', 'true');
      expect(tab2).toHaveAttribute('aria-selected', 'false');
      expect(tab3).toHaveAttribute('aria-selected', 'false');
    });

    it('can be named via aria-label', async () => {
      render(html`
        <tabs-root .defaultValue=${0}>
          <tabs-list aria-label="string label">
            <tabs-tab value="0"></tabs-tab>
          </tabs-list>
        </tabs-root>
      `);
      await flush();

      expect(document.querySelector('[role="tablist"]')).toHaveAttribute(
        'aria-label',
        'string label',
      );
    });
  });

  // ── TabsTab ───────────────────────────────────────────────────────────

  describe('TabsTab', () => {
    it('has role="tab"', async () => {
      render(html`
        <tabs-root .defaultValue=${0}>
          <tabs-list>
            <tabs-tab value="0"></tabs-tab>
          </tabs-list>
        </tabs-root>
      `);
      await flush();

      expect(document.querySelector('tabs-tab')).toHaveAttribute('role', 'tab');
    });

    it('sets data-disabled when disabled', async () => {
      render(html`
        <tabs-root .defaultValue=${0}>
          <tabs-list>
            <tabs-tab value="0" disabled></tabs-tab>
          </tabs-list>
        </tabs-root>
      `);
      await flush();

      expect(document.querySelector('tabs-tab')).toHaveAttribute('data-disabled');
    });

    it('activates on Enter key', async () => {
      const handleChange = vi.fn();
      render(html`
        <tabs-root .value=${0} .onValueChange=${handleChange}>
          <tabs-list .activateOnFocus=${false}>
            <tabs-tab value="0"></tabs-tab>
            <tabs-tab value="1"></tabs-tab>
          </tabs-list>
        </tabs-root>
      `);
      await flush();

      const tabs = document.querySelectorAll<HTMLElement>('[role="tab"]');
      tabs[0].focus();
      keydown(tabs[0], 'ArrowRight');
      await flush();

      // Tab 1 is focused but not activated yet
      expect(document.activeElement).toBe(tabs[1]);
      expect(handleChange).not.toHaveBeenCalled();

      // Press Enter to activate
      keydown(tabs[1], 'Enter');
      await flush();

      expect(handleChange).toHaveBeenCalledTimes(1);
      expect(handleChange.mock.calls[0][0]).toBe(1);
    });

    it('activates on Space keyup', async () => {
      const handleChange = vi.fn();
      render(html`
        <tabs-root .value=${0} .onValueChange=${handleChange}>
          <tabs-list .activateOnFocus=${false}>
            <tabs-tab value="0"></tabs-tab>
            <tabs-tab value="1"></tabs-tab>
          </tabs-list>
        </tabs-root>
      `);
      await flush();

      const tabs = document.querySelectorAll<HTMLElement>('[role="tab"]');
      tabs[0].focus();
      keydown(tabs[0], 'ArrowRight');
      await flush();

      expect(document.activeElement).toBe(tabs[1]);

      // Press Space (keydown prevents default, keyup activates)
      keydown(tabs[1], ' ');
      keyup(tabs[1], ' ');
      await flush();

      expect(handleChange).toHaveBeenCalledTimes(1);
      expect(handleChange.mock.calls[0][0]).toBe(1);
    });
  });

  // ── TabsPanel ─────────────────────────────────────────────────────────

  describe('TabsPanel', () => {
    it('has role="tabpanel"', async () => {
      render(html`
        <tabs-root .defaultValue=${0}>
          <tabs-list>
            <tabs-tab value="0"></tabs-tab>
          </tabs-list>
          <tabs-panel value="0">Panel content</tabs-panel>
        </tabs-root>
      `);
      await flush();

      expect(document.querySelector('tabs-panel')).toHaveAttribute('role', 'tabpanel');
    });

    it('shows the active panel and hides inactive panels', async () => {
      render(html`
        <tabs-root .defaultValue=${0}>
          <tabs-list>
            <tabs-tab value="0">Tab 1</tabs-tab>
            <tabs-tab value="1">Tab 2</tabs-tab>
          </tabs-list>
          <tabs-panel value="0" .keepMounted=${true}>Panel 1</tabs-panel>
          <tabs-panel value="1" .keepMounted=${true}>Panel 2</tabs-panel>
        </tabs-root>
      `);
      await flush();

      const panels = document.querySelectorAll<HTMLElement>('[role="tabpanel"]');
      expect(panels[0]).not.toHaveAttribute('hidden');
      expect(panels[1]).toHaveAttribute('hidden');

      // Click second tab
      const tabs = document.querySelectorAll<HTMLElement>('[role="tab"]');
      tabs[1].click();
      await flush();

      expect(panels[0]).toHaveAttribute('hidden');
      expect(panels[1]).not.toHaveAttribute('hidden');
    });

    it('has tabindex=0 when active and tabindex=-1 when hidden', async () => {
      render(html`
        <tabs-root .defaultValue=${0}>
          <tabs-list>
            <tabs-tab value="0"></tabs-tab>
            <tabs-tab value="1"></tabs-tab>
          </tabs-list>
          <tabs-panel value="0" .keepMounted=${true}>Panel 1</tabs-panel>
          <tabs-panel value="1" .keepMounted=${true}>Panel 2</tabs-panel>
        </tabs-root>
      `);
      await flush();

      const panels = document.querySelectorAll<HTMLElement>('[role="tabpanel"]');
      expect(panels[0].tabIndex).toBe(0);
      expect(panels[1].tabIndex).toBe(-1);
    });
  });

  // ── TabsIndicator ─────────────────────────────────────────────────────

  describe('TabsIndicator', () => {
    it('has role="presentation" and aria-hidden="true"', async () => {
      render(html`
        <tabs-root .defaultValue=${0}>
          <tabs-list>
            <tabs-tab value="0"></tabs-tab>
            <tabs-indicator></tabs-indicator>
          </tabs-list>
        </tabs-root>
      `);
      await flush();

      const indicator = document.querySelector('tabs-indicator')!;
      expect(indicator).toHaveAttribute('role', 'presentation');
      expect(indicator).toHaveAttribute('aria-hidden', 'true');
    });

    it('sets data-orientation matching root orientation', async () => {
      render(html`
        <tabs-root .defaultValue=${0} orientation="vertical">
          <tabs-list>
            <tabs-tab value="0"></tabs-tab>
            <tabs-indicator></tabs-indicator>
          </tabs-list>
        </tabs-root>
      `);
      await flush();

      const indicator = document.querySelector('tabs-indicator')!;
      expect(indicator).toHaveAttribute('data-orientation', 'vertical');
    });
  });

  // ── Activation direction ──────────────────────────────────────────────

  describe('activation direction', () => {
    it('sets data-activation-direction to none initially', async () => {
      render(html`
        <tabs-root .defaultValue=${0}>
          <tabs-list>
            <tabs-tab value="0"></tabs-tab>
            <tabs-tab value="1"></tabs-tab>
          </tabs-list>
        </tabs-root>
      `);
      await flush();

      const root = document.querySelector('tabs-root')!;
      expect(root).toHaveAttribute('data-activation-direction', 'none');
    });
  });

  // ── Uncontrolled mode ─────────────────────────────────────────────────

  describe('uncontrolled mode', () => {
    it('selects the tab with defaultValue', async () => {
      render(html`
        <tabs-root .defaultValue=${1}>
          <tabs-list>
            <tabs-tab value="0">Tab 1</tabs-tab>
            <tabs-tab value="1">Tab 2</tabs-tab>
          </tabs-list>
          <tabs-panel value="0" .keepMounted=${true}>Panel 1</tabs-panel>
          <tabs-panel value="1" .keepMounted=${true}>Panel 2</tabs-panel>
        </tabs-root>
      `);
      await flush();

      const tabs = document.querySelectorAll<HTMLElement>('[role="tab"]');
      const panels = document.querySelectorAll<HTMLElement>('[role="tabpanel"]');

      expect(tabs[0]).toHaveAttribute('aria-selected', 'false');
      expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
      expect(panels[0]).toHaveAttribute('hidden');
      expect(panels[1]).not.toHaveAttribute('hidden');
    });

    it('updates active tab when clicked', async () => {
      render(html`
        <tabs-root .defaultValue=${0}>
          <tabs-list>
            <tabs-tab value="0">Tab 1</tabs-tab>
            <tabs-tab value="1">Tab 2</tabs-tab>
          </tabs-list>
          <tabs-panel value="0" .keepMounted=${true}>Panel 1</tabs-panel>
          <tabs-panel value="1" .keepMounted=${true}>Panel 2</tabs-panel>
        </tabs-root>
      `);
      await flush();

      const tabs = document.querySelectorAll<HTMLElement>('[role="tab"]');
      const panels = document.querySelectorAll<HTMLElement>('[role="tabpanel"]');

      tabs[1].click();
      await flush();

      expect(tabs[0]).toHaveAttribute('aria-selected', 'false');
      expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
      expect(panels[0]).toHaveAttribute('hidden');
      expect(panels[1]).not.toHaveAttribute('hidden');
    });
  });

  // ── String values ─────────────────────────────────────────────────────

  describe('string tab values', () => {
    it('supports string tab values', async () => {
      render(html`
        <tabs-root .defaultValue=${'overview'}>
          <tabs-list>
            <tabs-tab value="overview">Overview</tabs-tab>
            <tabs-tab value="projects">Projects</tabs-tab>
            <tabs-tab value="account">Account</tabs-tab>
          </tabs-list>
          <tabs-panel value="overview" .keepMounted=${true}>Overview content</tabs-panel>
          <tabs-panel value="projects" .keepMounted=${true}>Projects content</tabs-panel>
          <tabs-panel value="account" .keepMounted=${true}>Account content</tabs-panel>
        </tabs-root>
      `);
      await flush();

      const tabs = document.querySelectorAll<HTMLElement>('[role="tab"]');
      const panels = document.querySelectorAll<HTMLElement>('[role="tabpanel"]');

      expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
      expect(panels[0]).not.toHaveAttribute('hidden');
      expect(panels[1]).toHaveAttribute('hidden');

      tabs[1].click();
      await flush();

      expect(tabs[0]).toHaveAttribute('aria-selected', 'false');
      expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
      expect(panels[0]).toHaveAttribute('hidden');
      expect(panels[1]).not.toHaveAttribute('hidden');
    });
  });
});
