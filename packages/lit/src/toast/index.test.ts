import { afterEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

import {
  ToastProviderElement,
  ToastViewportElement,
  ToastRootElement,
  ToastContentElement,
  ToastTitleElement,
  ToastDescriptionElement,
  ToastCloseElement,
  ToastActionElement,
} from './index.ts';

function createToastProvider(opts: {
  timeout?: number;
  limit?: number;
} = {}): { container: HTMLElement; provider: ToastProviderElement } {
  const container = document.createElement('div');
  const provider = document.createElement('toast-provider') as ToastProviderElement;
  if (opts.timeout !== undefined) provider.timeout = opts.timeout;
  if (opts.limit !== undefined) provider.limit = opts.limit;

  const viewport = document.createElement('toast-viewport') as ToastViewportElement;
  provider.appendChild(viewport);
  container.appendChild(provider);
  document.body.appendChild(container);

  return { container, provider };
}

function createToastRoot(
  provider: ToastProviderElement,
  toastId: string,
  opts: { title?: string; description?: string } = {},
): ToastRootElement {
  const viewport = provider.querySelector('toast-viewport')!;
  const root = document.createElement('toast-root') as ToastRootElement;
  root.toastId = toastId;

  const content = document.createElement('toast-content') as ToastContentElement;
  if (opts.title) {
    const title = document.createElement('toast-title') as ToastTitleElement;
    title.textContent = opts.title;
    content.appendChild(title);
  }
  if (opts.description) {
    const desc = document.createElement('toast-description') as ToastDescriptionElement;
    desc.textContent = opts.description;
    content.appendChild(desc);
  }

  const close = document.createElement('toast-close') as ToastCloseElement;
  close.textContent = 'Close';

  root.appendChild(content);
  root.appendChild(close);
  viewport.appendChild(root);

  return root;
}

async function waitForMicrotask() {
  await new Promise((r) => queueMicrotask(r));
}

describe('Toast', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // ─── Provider ──────────────────────────────────────────────────────────────────

  describe('Provider', () => {
    it('renders with display:contents', () => {
      const { provider } = createToastProvider();
      expect(provider.style.display).toBe('contents');
    });

    it('is an instance of ToastProviderElement', () => {
      const { provider } = createToastProvider();
      expect(provider).toBeInstanceOf(ToastProviderElement);
    });

    it('starts with empty toasts', () => {
      const { provider } = createToastProvider();
      expect(provider.getToasts()).toEqual([]);
    });

    it('adds a toast and returns id', () => {
      const { provider } = createToastProvider();
      const id = provider.add({ title: 'Hello' });
      expect(id).toBeTruthy();
      expect(provider.getToasts()).toHaveLength(1);
      expect(provider.getToasts()[0].title).toBe('Hello');
    });

    it('uses custom id if provided', () => {
      const { provider } = createToastProvider();
      const id = provider.add({ id: 'custom-id', title: 'Test' });
      expect(id).toBe('custom-id');
    });

    it('adds multiple toasts (newest first)', () => {
      const { provider } = createToastProvider();
      provider.add({ title: 'First' });
      provider.add({ title: 'Second' });
      expect(provider.getToasts()[0].title).toBe('Second');
      expect(provider.getToasts()[1].title).toBe('First');
    });

    it('closes a specific toast', async () => {
      vi.useFakeTimers();
      const { provider } = createToastProvider();
      const id = provider.add({ title: 'Test' });

      provider.close(id);

      // Should be in ending state
      expect(provider.getToasts()[0].transitionStatus).toBe('ending');

      // After animation timeout
      vi.advanceTimersByTime(300);
      expect(provider.getToasts()).toHaveLength(0);
    });

    it('closes all toasts when no id provided', async () => {
      vi.useFakeTimers();
      const { provider } = createToastProvider();
      provider.add({ title: 'First' });
      provider.add({ title: 'Second' });

      provider.close();

      // All should be ending
      expect(provider.getToasts().every((t) => t.transitionStatus === 'ending')).toBe(true);

      vi.advanceTimersByTime(300);
      expect(provider.getToasts()).toHaveLength(0);
    });

    it('updates a toast', () => {
      const { provider } = createToastProvider();
      const id = provider.add({ title: 'Old Title' });
      provider.update(id, { title: 'New Title' });
      expect(provider.getToasts()[0].title).toBe('New Title');
    });

    it('does not update ending toast', () => {
      vi.useFakeTimers();
      const { provider } = createToastProvider();
      const id = provider.add({ title: 'Test' });
      provider.close(id);
      provider.update(id, { title: 'Should Not Update' });
      expect(provider.getToasts()[0].title).toBe('Test');
    });

    it('calls onClose when closing', () => {
      vi.useFakeTimers();
      const onClose = vi.fn();
      const { provider } = createToastProvider();
      const id = provider.add({ title: 'Test', onClose });
      provider.close(id);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onRemove after animation', () => {
      vi.useFakeTimers();
      const onRemove = vi.fn();
      const { provider } = createToastProvider();
      const id = provider.add({ title: 'Test', onRemove });
      provider.close(id);
      expect(onRemove).not.toHaveBeenCalled();
      vi.advanceTimersByTime(300);
      expect(onRemove).toHaveBeenCalledTimes(1);
    });

    it('auto-dismisses after timeout', () => {
      vi.useFakeTimers();
      const { provider } = createToastProvider({ timeout: 3000 });
      provider.add({ title: 'Auto dismiss' });

      expect(provider.getToasts()).toHaveLength(1);

      vi.advanceTimersByTime(3000);
      // Should be in ending state
      expect(provider.getToasts()[0]?.transitionStatus).toBe('ending');

      vi.advanceTimersByTime(300);
      expect(provider.getToasts()).toHaveLength(0);
    });

    it('uses per-toast timeout over default', () => {
      vi.useFakeTimers();
      const { provider } = createToastProvider({ timeout: 5000 });
      provider.add({ title: 'Quick', timeout: 1000 });

      vi.advanceTimersByTime(1000);
      expect(provider.getToasts()[0]?.transitionStatus).toBe('ending');
    });

    it('does not auto-dismiss loading toasts', () => {
      vi.useFakeTimers();
      const { provider } = createToastProvider({ timeout: 1000 });
      provider.add({ title: 'Loading...', type: 'loading' });

      vi.advanceTimersByTime(5000);
      // Should still be present
      expect(provider.getToasts()).toHaveLength(1);
      expect(provider.getToasts()[0].transitionStatus).not.toBe('ending');
    });

    it('starts auto-dismiss when loading type changes', () => {
      vi.useFakeTimers();
      const { provider } = createToastProvider({ timeout: 2000 });
      const id = provider.add({ title: 'Loading', type: 'loading' });

      vi.advanceTimersByTime(5000);
      expect(provider.getToasts()).toHaveLength(1);

      provider.update(id, { title: 'Done', type: 'success' });
      vi.advanceTimersByTime(2000);
      expect(provider.getToasts()[0]?.transitionStatus).toBe('ending');
    });

    it('pauses and resumes timers', () => {
      vi.useFakeTimers();
      const { provider } = createToastProvider({ timeout: 5000 });
      provider.add({ title: 'Test' });

      vi.advanceTimersByTime(2000);
      provider.pauseTimers();

      // Advance time while paused
      vi.advanceTimersByTime(10000);
      expect(provider.getToasts()).toHaveLength(1);
      expect(provider.getToasts()[0].transitionStatus).not.toBe('ending');

      // Resume - should dismiss after remaining ~3000ms
      provider.resumeTimers();
      vi.advanceTimersByTime(3000);
      expect(provider.getToasts()[0]?.transitionStatus).toBe('ending');
    });
  });

  // ─── Promise ───────────────────────────────────────────────────────────────────

  describe('promise toast', () => {
    it('transitions from loading to success', async () => {
      const { provider } = createToastProvider();
      const result = provider.promise(Promise.resolve('ok'), {
        loading: { title: 'Loading...' },
        success: { title: 'Done!' },
        error: { title: 'Failed' },
      });

      expect(provider.getToasts()[0].type).toBe('loading');
      expect(provider.getToasts()[0].title).toBe('Loading...');

      await result;

      expect(provider.getToasts()[0].title).toBe('Done!');
      expect(provider.getToasts()[0].type).toBe('success');
    });

    it('transitions from loading to error', async () => {
      const { provider } = createToastProvider();
      const err = new Error('fail');

      try {
        await provider.promise(Promise.reject(err), {
          loading: { title: 'Loading...' },
          success: { title: 'Done!' },
          error: { title: 'Failed' },
        });
      } catch {
        // expected
      }

      expect(provider.getToasts()[0].title).toBe('Failed');
      expect(provider.getToasts()[0].type).toBe('error');
    });

    it('supports function options for success', async () => {
      const { provider } = createToastProvider();
      await provider.promise(Promise.resolve('data'), {
        loading: { title: 'Loading...' },
        success: (result) => ({ title: `Got: ${result}` }),
        error: { title: 'Failed' },
      });

      expect(provider.getToasts()[0].title).toBe('Got: data');
    });
  });

  // ─── Viewport ──────────────────────────────────────────────────────────────────

  describe('Viewport', () => {
    it('has role=region', () => {
      const { container } = createToastProvider();
      const viewport = container.querySelector('toast-viewport')!;
      expect(viewport.getAttribute('role')).toBe('region');
    });

    it('has aria-live=polite', () => {
      const { container } = createToastProvider();
      const viewport = container.querySelector('toast-viewport')!;
      expect(viewport.getAttribute('aria-live')).toBe('polite');
    });

    it('has aria-label=Notifications', () => {
      const { container } = createToastProvider();
      const viewport = container.querySelector('toast-viewport')!;
      expect(viewport.getAttribute('aria-label')).toBe('Notifications');
    });

    it('is an instance of ToastViewportElement', () => {
      const { container } = createToastProvider();
      const viewport = container.querySelector('toast-viewport')!;
      expect(viewport).toBeInstanceOf(ToastViewportElement);
    });

    it('pauses timers on mouseenter', () => {
      vi.useFakeTimers();
      const { container, provider } = createToastProvider({ timeout: 3000 });
      const viewport = container.querySelector('toast-viewport')!;
      provider.add({ title: 'Test' });

      vi.advanceTimersByTime(1000);
      viewport.dispatchEvent(new MouseEvent('mouseenter'));

      vi.advanceTimersByTime(10000);
      expect(provider.getToasts()).toHaveLength(1);
      expect(provider.getToasts()[0].transitionStatus).not.toBe('ending');
    });

    it('resumes timers on mouseleave', () => {
      vi.useFakeTimers();
      const { container, provider } = createToastProvider({ timeout: 3000 });
      const viewport = container.querySelector('toast-viewport')!;
      provider.add({ title: 'Test' });

      vi.advanceTimersByTime(1000);
      viewport.dispatchEvent(new MouseEvent('mouseenter'));
      vi.advanceTimersByTime(5000);

      viewport.dispatchEvent(new MouseEvent('mouseleave'));
      vi.advanceTimersByTime(2000);
      expect(provider.getToasts()[0]?.transitionStatus).toBe('ending');
    });
  });

  // ─── Root ──────────────────────────────────────────────────────────────────────

  describe('Root', () => {
    it('sets role=dialog by default', async () => {
      const { provider } = createToastProvider();
      const id = provider.add({ title: 'Test' });
      const root = createToastRoot(provider, id, { title: 'Test' });
      await waitForMicrotask();
      expect(root.getAttribute('role')).toBe('dialog');
    });

    it('sets role=alertdialog for high priority', async () => {
      const { provider } = createToastProvider();
      const id = provider.add({ title: 'Urgent', priority: 'high' });
      const root = createToastRoot(provider, id, { title: 'Urgent' });
      await waitForMicrotask();
      expect(root.getAttribute('role')).toBe('alertdialog');
    });

    it('sets aria-modal=false', async () => {
      const { provider } = createToastProvider();
      const id = provider.add({ title: 'Test' });
      const root = createToastRoot(provider, id, { title: 'Test' });
      await waitForMicrotask();
      expect(root.getAttribute('aria-modal')).toBe('false');
    });

    it('sets data-type attribute', async () => {
      const { provider } = createToastProvider();
      const id = provider.add({ title: 'Error', type: 'error' });
      const root = createToastRoot(provider, id, { title: 'Error' });
      await waitForMicrotask();
      expect(root.getAttribute('data-type')).toBe('error');
    });

    it('sets data-state to open after mounting', async () => {
      const { provider } = createToastProvider();
      const id = provider.add({ title: 'Test' });
      const root = createToastRoot(provider, id, { title: 'Test' });
      await waitForMicrotask();
      // After microtask, transitionStatus becomes undefined → data-state=open
      expect(root.getAttribute('data-state')).toBe('open');
    });

    it('closes on Escape key', () => {
      vi.useFakeTimers();
      const { provider } = createToastProvider();
      const id = provider.add({ title: 'Test' });
      const root = createToastRoot(provider, id, { title: 'Test' });

      root.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(provider.getToasts()[0].transitionStatus).toBe('ending');
    });

    it('is an instance of ToastRootElement', () => {
      const { provider } = createToastProvider();
      const id = provider.add({ title: 'Test' });
      const root = createToastRoot(provider, id, { title: 'Test' });
      expect(root).toBeInstanceOf(ToastRootElement);
    });

    it('has tabindex=0', () => {
      const { provider } = createToastProvider();
      const id = provider.add({ title: 'Test' });
      const root = createToastRoot(provider, id, { title: 'Test' });
      expect(root.getAttribute('tabindex')).toBe('0');
    });

    it('sets aria-labelledby from title', async () => {
      const { provider } = createToastProvider();
      const id = provider.add({ title: 'Test' });
      const root = createToastRoot(provider, id, { title: 'Test' });
      await waitForMicrotask();
      const title = root.querySelector('toast-title')!;
      expect(root.getAttribute('aria-labelledby')).toBe(title.id);
    });

    it('sets aria-describedby from description', async () => {
      const { provider } = createToastProvider();
      const id = provider.add({ title: 'Test', description: 'Desc' });
      const root = createToastRoot(provider, id, { title: 'Test', description: 'Desc' });
      await waitForMicrotask();
      const desc = root.querySelector('toast-description')!;
      expect(root.getAttribute('aria-describedby')).toBe(desc.id);
    });
  });

  // ─── Content ───────────────────────────────────────────────────────────────────

  describe('Content', () => {
    it('is an instance of ToastContentElement', () => {
      const container = document.createElement('div');
      const content = document.createElement('toast-content') as ToastContentElement;
      container.appendChild(content);
      document.body.appendChild(container);
      expect(content).toBeInstanceOf(ToastContentElement);
    });
  });

  // ─── Title ─────────────────────────────────────────────────────────────────────

  describe('Title', () => {
    it('auto-generates an id', () => {
      const container = document.createElement('div');
      const provider = document.createElement('toast-provider') as ToastProviderElement;
      const title = document.createElement('toast-title') as ToastTitleElement;
      provider.appendChild(title);
      container.appendChild(provider);
      document.body.appendChild(container);

      expect(title.id).toBeTruthy();
      expect(title.id).toContain('base-ui-toast-title');
    });

    it('is an instance of ToastTitleElement', () => {
      const container = document.createElement('div');
      const provider = document.createElement('toast-provider') as ToastProviderElement;
      const title = document.createElement('toast-title') as ToastTitleElement;
      provider.appendChild(title);
      container.appendChild(provider);
      document.body.appendChild(container);
      expect(title).toBeInstanceOf(ToastTitleElement);
    });
  });

  // ─── Description ──────────────────────────────────────────────────────────────

  describe('Description', () => {
    it('auto-generates an id', () => {
      const container = document.createElement('div');
      const provider = document.createElement('toast-provider') as ToastProviderElement;
      const desc = document.createElement('toast-description') as ToastDescriptionElement;
      provider.appendChild(desc);
      container.appendChild(provider);
      document.body.appendChild(container);

      expect(desc.id).toBeTruthy();
      expect(desc.id).toContain('base-ui-toast-description');
    });

    it('is an instance of ToastDescriptionElement', () => {
      const container = document.createElement('div');
      const provider = document.createElement('toast-provider') as ToastProviderElement;
      const desc = document.createElement('toast-description') as ToastDescriptionElement;
      provider.appendChild(desc);
      container.appendChild(provider);
      document.body.appendChild(container);
      expect(desc).toBeInstanceOf(ToastDescriptionElement);
    });
  });

  // ─── Close ─────────────────────────────────────────────────────────────────────

  describe('Close', () => {
    it('closes toast on click', () => {
      vi.useFakeTimers();
      const { provider } = createToastProvider();
      const id = provider.add({ title: 'Test' });
      const root = createToastRoot(provider, id, { title: 'Test' });

      const close = root.querySelector('toast-close')!;
      close.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(provider.getToasts()[0].transitionStatus).toBe('ending');
    });

    it('closes toast on Enter key', () => {
      vi.useFakeTimers();
      const { provider } = createToastProvider();
      const id = provider.add({ title: 'Test' });
      const root = createToastRoot(provider, id, { title: 'Test' });

      const close = root.querySelector('toast-close')!;
      close.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

      expect(provider.getToasts()[0].transitionStatus).toBe('ending');
    });

    it('has role=button and tabindex=0', () => {
      const { provider } = createToastProvider();
      const id = provider.add({ title: 'Test' });
      const root = createToastRoot(provider, id, { title: 'Test' });

      const close = root.querySelector('toast-close')!;
      expect(close.getAttribute('role')).toBe('button');
      expect(close.getAttribute('tabindex')).toBe('0');
    });

    it('is an instance of ToastCloseElement', () => {
      const { provider } = createToastProvider();
      const id = provider.add({ title: 'Test' });
      const root = createToastRoot(provider, id, { title: 'Test' });

      const close = root.querySelector('toast-close')!;
      expect(close).toBeInstanceOf(ToastCloseElement);
    });
  });

  // ─── Action ────────────────────────────────────────────────────────────────────

  describe('Action', () => {
    it('calls onAction and closes on click', () => {
      vi.useFakeTimers();
      const onAction = vi.fn();
      const { provider } = createToastProvider();
      const id = provider.add({ title: 'Test', onAction });
      const root = createToastRoot(provider, id, { title: 'Test' });

      const action = document.createElement('toast-action') as ToastActionElement;
      action.textContent = 'Undo';
      root.appendChild(action);

      action.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(onAction).toHaveBeenCalledTimes(1);
      expect(provider.getToasts()[0].transitionStatus).toBe('ending');
    });

    it('has role=button and tabindex=0', () => {
      const { provider } = createToastProvider();
      const id = provider.add({ title: 'Test' });
      const root = createToastRoot(provider, id, { title: 'Test' });

      const action = document.createElement('toast-action') as ToastActionElement;
      root.appendChild(action);

      expect(action.getAttribute('role')).toBe('button');
      expect(action.getAttribute('tabindex')).toBe('0');
    });

    it('is an instance of ToastActionElement', () => {
      const { provider } = createToastProvider();
      const id = provider.add({ title: 'Test' });
      const root = createToastRoot(provider, id, { title: 'Test' });

      const action = document.createElement('toast-action') as ToastActionElement;
      root.appendChild(action);
      expect(action).toBeInstanceOf(ToastActionElement);
    });
  });

  // ─── Error Handling ────────────────────────────────────────────────────────────

  describe('error handling', () => {
    it('logs error when viewport is outside provider', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const container = document.createElement('div');
      const viewport = document.createElement('toast-viewport') as ToastViewportElement;
      container.appendChild(viewport);
      document.body.appendChild(container);

      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('must be placed within <toast-provider>'),
      );
    });

    it('logs error when root is outside provider', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const container = document.createElement('div');
      const root = document.createElement('toast-root') as ToastRootElement;
      container.appendChild(root);
      document.body.appendChild(container);

      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('must be placed within <toast-provider>'),
      );
    });
  });

  // ─── Integration ──────────────────────────────────────────────────────────────

  describe('integration', () => {
    it('full lifecycle: add, display, close', async () => {
      vi.useFakeTimers();
      const onClose = vi.fn();
      const onRemove = vi.fn();

      const { provider } = createToastProvider({ timeout: 5000 });
      const id = provider.add({ title: 'Hello', description: 'World', onClose, onRemove });

      expect(provider.getToasts()).toHaveLength(1);

      // Create the toast DOM
      const root = createToastRoot(provider, id, { title: 'Hello', description: 'World' });
      await waitForMicrotask();
      expect(root.getAttribute('data-state')).toBe('open');

      // Close via escape
      root.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(onClose).toHaveBeenCalled();
      expect(root.getAttribute('data-state')).toBe('ending');

      // Wait for removal
      vi.advanceTimersByTime(300);
      expect(onRemove).toHaveBeenCalled();
      expect(provider.getToasts()).toHaveLength(0);
    });
  });

  // ─── Cleanup ───────────────────────────────────────────────────────────────────

  describe('cleanup', () => {
    it('clears timers on disconnect', () => {
      vi.useFakeTimers();
      const { container, provider } = createToastProvider({ timeout: 5000 });
      provider.add({ title: 'Test' });

      container.remove();

      // Should not throw
      vi.advanceTimersByTime(10000);
    });
  });
});
