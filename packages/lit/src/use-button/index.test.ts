import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applyButtonBehavior,
  removeButtonBehavior,
  syncButtonAttributes,
  type ButtonBehaviorOptions,
} from './index';

describe('use-button', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
  });

  afterEach(() => {
    container.remove();
  });

  function createElement<K extends keyof HTMLElementTagNameMap>(tag: K) {
    const element = document.createElement(tag);
    container.append(element);
    return element;
  }

  function dispatchKeyEvent(
    element: HTMLElement,
    type: 'keydown' | 'keyup',
    key: string,
    init: KeyboardEventInit = {},
  ) {
    return element.dispatchEvent(
      new KeyboardEvent(type, {
        bubbles: true,
        cancelable: true,
        key,
        ...init,
      }),
    );
  }

  function dispatchPointerEvent(
    element: HTMLElement,
    type: 'pointerdown' | 'mousedown',
    init: MouseEventInit = {},
  ) {
    const EventCtor = type === 'pointerdown' ? (window.PointerEvent ?? MouseEvent) : MouseEvent;

    return element.dispatchEvent(
      new EventCtor(type, {
        bubbles: true,
        cancelable: true,
        ...init,
      }),
    );
  }

  function createClickRecorder(element: HTMLElement) {
    const onAction = vi.fn();
    const onClick = vi.fn();

    element.addEventListener('click', onClick);

    return { onAction, onClick };
  }

  describe('applyButtonBehavior', () => {
    it('applies button semantics to non-native elements', () => {
      const element = createElement('div');

      applyButtonBehavior(element, { native: false });

      expect(element).toHaveAttribute('role', 'button');
      expect(element.tabIndex).toBe(0);
    });

    it('preserves native button semantics', () => {
      const element = createElement('button');

      applyButtonBehavior(element, { native: true });

      expect(element).not.toHaveAttribute('role');
      expect(element).toHaveProperty('type', 'button');
      expect(element.tabIndex).toBe(0);
    });

    it('returns a cleanup function that removes listeners', () => {
      const element = createElement('div');
      const onAction = vi.fn();
      const cleanup = applyButtonBehavior(element, { native: false, onAction });

      element.click();
      expect(onAction).toHaveBeenCalledTimes(1);

      cleanup();
      element.click();
      expect(onAction).toHaveBeenCalledTimes(1);
    });

    it('activates non-native buttons with Enter on keydown', () => {
      const element = createElement('div');
      const { onAction, onClick } = createClickRecorder(element);

      applyButtonBehavior(element, { native: false, onAction });

      dispatchKeyEvent(element, 'keydown', 'Enter');

      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onAction).toHaveBeenCalledTimes(1);
    });

    it('activates non-native buttons with Space on keyup', () => {
      const element = createElement('div');
      const { onAction, onClick } = createClickRecorder(element);

      applyButtonBehavior(element, { native: false, onAction });

      dispatchKeyEvent(element, 'keydown', ' ');
      expect(onClick).toHaveBeenCalledTimes(0);
      expect(onAction).toHaveBeenCalledTimes(0);

      dispatchKeyEvent(element, 'keyup', ' ');
      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onAction).toHaveBeenCalledTimes(1);
    });

    it('activates composite non-native buttons with Space on keydown', () => {
      const element = createElement('div');
      const { onAction, onClick } = createClickRecorder(element);

      applyButtonBehavior(element, { native: false, composite: true, onAction });

      dispatchKeyEvent(element, 'keydown', ' ');
      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onAction).toHaveBeenCalledTimes(1);

      dispatchKeyEvent(element, 'keyup', ' ');
      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onAction).toHaveBeenCalledTimes(1);
    });

    it('activates native composite buttons with Space only once', () => {
      const element = createElement('button');
      const onAction = vi.fn();
      const onClick = vi.fn();

      element.addEventListener('click', onClick);
      applyButtonBehavior(element, { composite: true, onAction });

      dispatchKeyEvent(element, 'keydown', ' ');
      dispatchKeyEvent(element, 'keyup', ' ');

      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onAction).toHaveBeenCalledTimes(1);
    });

    it('does not activate composite menuitems when Space was prevented for text navigation', () => {
      const element = createElement('a');
      const onAction = vi.fn();
      const onClick = vi.fn();

      element.href = '#test';
      element.addEventListener('click', onClick);
      element.addEventListener('keydown', (event) => event.preventDefault());
      applyButtonBehavior(element, {
        native: false,
        composite: true,
        role: 'menuitem',
        onAction,
      });

      dispatchKeyEvent(element, 'keydown', ' ');

      expect(onClick).toHaveBeenCalledTimes(0);
      expect(onAction).toHaveBeenCalledTimes(0);
    });

    it('activates composite switches even when Space is prevented', () => {
      const element = createElement('div');
      const onAction = vi.fn();
      const onClick = vi.fn();

      element.addEventListener('click', onClick);
      applyButtonBehavior(element, {
        native: false,
        composite: true,
        role: 'switch',
        onAction,
      });

      const event = new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: ' ',
      });
      event.preventDefault();
      element.dispatchEvent(event);

      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onAction).toHaveBeenCalledTimes(1);
    });

    it('suppresses duplicate keyboard-driven activation when applied multiple times', () => {
      const element = createElement('div');
      const onAction = vi.fn();
      const onClick = vi.fn();

      element.addEventListener('click', onClick);
      applyButtonBehavior(element, { native: false, composite: true, onAction });
      applyButtonBehavior(element, { native: false, composite: true, onAction });

      dispatchKeyEvent(element, 'keydown', ' ');

      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onAction).toHaveBeenCalledTimes(1);
    });

    it('prevents interactions while focusableWhenDisabled still allows focus', () => {
      const element = createElement('div');
      const onAction = vi.fn();
      const onClick = vi.fn();
      const onKeyDown = vi.fn();
      const onKeyUp = vi.fn();
      const onMouseDown = vi.fn();
      const onPointerDown = vi.fn();

      element.addEventListener('click', onClick);
      element.addEventListener('keydown', onKeyDown);
      element.addEventListener('keyup', onKeyUp);
      element.addEventListener('mousedown', onMouseDown);
      element.addEventListener('pointerdown', onPointerDown);

      applyButtonBehavior(element, {
        native: false,
        disabled: true,
        focusableWhenDisabled: true,
        onAction,
      });

      expect(element.tabIndex).toBe(0);

      element.focus();
      expect(element).toHaveFocus();

      element.click();
      dispatchPointerEvent(element, 'mousedown');
      dispatchPointerEvent(element, 'pointerdown');
      dispatchKeyEvent(element, 'keydown', 'Enter');
      dispatchKeyEvent(element, 'keyup', ' ');

      expect(onAction).not.toHaveBeenCalled();
      expect(onClick).not.toHaveBeenCalled();
      expect(onKeyDown).not.toHaveBeenCalled();
      expect(onKeyUp).not.toHaveBeenCalled();
      expect(onMouseDown).not.toHaveBeenCalled();
      expect(onPointerDown).not.toHaveBeenCalled();
    });
  });

  describe('syncButtonAttributes', () => {
    it('syncs role and tabIndex for non-native buttons', () => {
      const element = createElement('span');

      syncButtonAttributes(element, { native: false });

      expect(element).toHaveAttribute('role', 'button');
      expect(element.tabIndex).toBe(0);
    });

    it('syncs disabled state for non-native buttons', () => {
      const element = createElement('span');

      syncButtonAttributes(element, { native: false, disabled: true });

      expect(element).toHaveAttribute('aria-disabled', 'true');
      expect(element).toHaveAttribute('data-disabled');
      expect(element.tabIndex).toBe(-1);
    });

    it('keeps native composite buttons focusable when disabled by default', () => {
      const element = createElement('button');

      syncButtonAttributes(element, { disabled: true, composite: true });

      expect(element).toHaveAttribute('aria-disabled', 'true');
      expect(element.disabled).toBe(false);
    });

    it('uses a custom role for non-native buttons', () => {
      const element = createElement('div');

      syncButtonAttributes(element, { native: false, role: 'switch' });

      expect(element).toHaveAttribute('role', 'switch');
    });
  });

  describe('removeButtonBehavior', () => {
    it('removes button behavior attributes', () => {
      const element = createElement('div');

      applyButtonBehavior(element, { native: false } satisfies ButtonBehaviorOptions);

      removeButtonBehavior(element);

      expect(element).not.toHaveAttribute('role');
      expect(element).not.toHaveAttribute('aria-disabled');
      expect(element).not.toHaveAttribute('data-disabled');
      expect(element).not.toHaveAttribute('tabindex');
    });
  });
});
