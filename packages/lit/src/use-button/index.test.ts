import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  applyButtonBehavior,
  syncButtonAttributes,
  removeButtonBehavior,
} from './index.ts';

describe('use-button', () => {
  let container: HTMLDivElement;

  function createEl(tag = 'div'): HTMLElement {
    const el = document.createElement(tag);
    container.appendChild(el);
    return el;
  }

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container?.remove();
  });

  describe('applyButtonBehavior', () => {
    it('sets role="button" on non-native elements', () => {
      const el = createEl('div');
      applyButtonBehavior(el);
      expect(el.getAttribute('role')).toBe('button');
    });

    it('sets tabindex on non-native elements', () => {
      const el = createEl('div');
      applyButtonBehavior(el);
      expect(el.tabIndex).toBe(0);
    });

    it('does not set role on native button', () => {
      const el = createEl('button');
      applyButtonBehavior(el, { native: true });
      expect(el.getAttribute('role')).toBeNull();
    });

    it('returns a cleanup function that removes listeners', () => {
      const el = createEl('div');
      const action = vi.fn();
      const cleanup = applyButtonBehavior(el, { onAction: action });

      el.click();
      expect(action).toHaveBeenCalledTimes(1);

      cleanup();
      el.click();
      expect(action).toHaveBeenCalledTimes(1);
    });

    it('prevents click when disabled', () => {
      const el = createEl('div');
      const action = vi.fn();
      applyButtonBehavior(el, { disabled: true, onAction: action });

      el.click();
      expect(action).not.toHaveBeenCalled();
    });

    it('sets aria-disabled when disabled', () => {
      const el = createEl('div');
      applyButtonBehavior(el, { disabled: true });
      expect(el.getAttribute('aria-disabled')).toBe('true');
    });

    it('sets data-disabled when disabled', () => {
      const el = createEl('div');
      applyButtonBehavior(el, { disabled: true });
      expect(el.hasAttribute('data-disabled')).toBe(true);
    });

    it('sets tabindex=-1 when disabled and not focusable', () => {
      const el = createEl('div');
      applyButtonBehavior(el, { disabled: true });
      expect(el.tabIndex).toBe(-1);
    });

    it('keeps tabindex=0 when disabled but focusableWhenDisabled', () => {
      const el = createEl('div');
      applyButtonBehavior(el, { disabled: true, focusableWhenDisabled: true });
      expect(el.tabIndex).toBe(0);
    });

    it('triggers click on Enter keydown for non-native elements', () => {
      const el = createEl('div');
      const clickSpy = vi.fn();
      el.addEventListener('click', clickSpy);
      applyButtonBehavior(el);

      const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
      el.dispatchEvent(event);

      expect(clickSpy).toHaveBeenCalled();
    });

    it('triggers click on Space keyup for non-native elements', () => {
      const el = createEl('div');
      const clickSpy = vi.fn();
      el.addEventListener('click', clickSpy);
      applyButtonBehavior(el);

      const event = new KeyboardEvent('keyup', { key: ' ', bubbles: true });
      el.dispatchEvent(event);

      expect(clickSpy).toHaveBeenCalled();
    });

    it('does not trigger keyboard actions when disabled', () => {
      const el = createEl('div');
      const clickSpy = vi.fn();
      el.addEventListener('click', clickSpy);
      applyButtonBehavior(el, { disabled: true, focusableWhenDisabled: true });

      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      el.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true }));

      expect(clickSpy).not.toHaveBeenCalled();
    });

    it('handles native button with focusableWhenDisabled', () => {
      const el = createEl('button') as HTMLButtonElement;
      applyButtonBehavior(el, { disabled: true, focusableWhenDisabled: true, native: true });

      expect(el.getAttribute('aria-disabled')).toBe('true');
      expect(el.disabled).toBe(false);
    });
  });

  describe('syncButtonAttributes', () => {
    it('syncs role and tabindex for non-native', () => {
      const el = createEl('span');
      syncButtonAttributes(el, { native: false });
      expect(el.getAttribute('role')).toBe('button');
      expect(el.tabIndex).toBe(0);
    });

    it('syncs disabled state for non-native', () => {
      const el = createEl('span');
      syncButtonAttributes(el, { native: false, disabled: true });
      expect(el.getAttribute('aria-disabled')).toBe('true');
      expect(el.hasAttribute('data-disabled')).toBe(true);
    });
  });

  describe('removeButtonBehavior', () => {
    it('removes all button-related attributes', () => {
      const el = createEl('div');
      applyButtonBehavior(el);

      expect(el.getAttribute('role')).toBe('button');

      removeButtonBehavior(el);

      expect(el.getAttribute('role')).toBeNull();
      expect(el.getAttribute('aria-disabled')).toBeNull();
      expect(el.hasAttribute('data-disabled')).toBe(false);
    });
  });
});
