import { html, nothing, render as renderTemplate } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import './index';
import {
  Avatar,
  AvatarFallbackElement,
  AvatarImageElement,
  AvatarRootElement,
  type AvatarFallback,
  type AvatarFallbackProps,
  type AvatarFallbackState,
  type AvatarImage,
  type AvatarImageProps,
  type AvatarImageState,
  type AvatarRoot,
  type AvatarRootProps,
  type AvatarRootState,
  type ImageLoadingStatus,
} from './index';

class MockImage {
  static instances: MockImage[] = [];

  onerror: ((this: GlobalEventHandlers, ev: Event | string) => any) | null = null;
  onload: ((this: GlobalEventHandlers, ev: Event | string) => any) | null = null;
  crossOrigin: string | null = null;
  referrerPolicy = '';
  src = '';

  constructor() {
    MockImage.instances.push(this);
  }

  emitLoad() {
    this.onload?.call(this as unknown as GlobalEventHandlers, new Event('load'));
  }

  emitError() {
    this.onerror?.call(this as unknown as GlobalEventHandlers, new Event('error'));
  }
}

describe('avatar', () => {
  const containers = new Set<HTMLDivElement>();
  const nativeImage = globalThis.Image;

  beforeEach(() => {
    MockImage.instances = [];
    globalThis.Image = MockImage as unknown as typeof Image;
  });

  afterEach(() => {
    containers.forEach((container) => {
      renderTemplate(nothing, container);
      container.remove();
    });
    containers.clear();
    globalThis.Image = nativeImage;
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  function render(result: ReturnType<typeof html>) {
    const container = document.createElement('div');
    document.body.append(container);
    containers.add(container);
    renderTemplate(result, container);
    return container;
  }

  async function waitForUpdate() {
    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 0);
    });
  }

  it('exposes namespace exports for runtime parts and props/state aliases', () => {
    expect(Avatar.Root).toBe(AvatarRootElement);
    expect(Avatar.Image).toBe(AvatarImageElement);
    expect(Avatar.Fallback).toBe(AvatarFallbackElement);
    expectTypeOf<AvatarRootProps>().toEqualTypeOf<AvatarRoot.Props>();
    expectTypeOf<AvatarRootState>().toEqualTypeOf<AvatarRoot.State>();
    expectTypeOf<AvatarImageProps>().toEqualTypeOf<AvatarImage.Props>();
    expectTypeOf<AvatarImageState>().toEqualTypeOf<AvatarImage.State>();
    expectTypeOf<AvatarFallbackProps>().toEqualTypeOf<AvatarFallback.Props>();
    expectTypeOf<AvatarFallbackState>().toEqualTypeOf<AvatarFallback.State>();
    expectTypeOf<ImageLoadingStatus>().toEqualTypeOf<AvatarRootState['imageLoadingStatus']>();
  });

  it('renders avatar-root as a custom element', () => {
    const view = render(html`<avatar-root>LT</avatar-root>`);
    const root = view.querySelector('avatar-root');
    expect(root).toBeInTheDocument();
    expect(root?.textContent).toBe('LT');
  });

  it('supports a static render template on the root', async () => {
    const view = render(html`
      <avatar-root .render=${html`<span data-testid="root"></span>`}>
        <avatar-fallback>LT</avatar-fallback>
      </avatar-root>
    `);
    await waitForUpdate();

    expect(view.querySelector('[data-testid="root"] avatar-fallback')).not.toBeNull();
  });

  it('tracks image loading status', async () => {
    const handleStatusChange = vi.fn();
    const view = render(html`
      <avatar-root>
        <avatar-image src="avatar.png" .onLoadingStatusChange=${handleStatusChange}></avatar-image>
        <avatar-fallback>LT</avatar-fallback>
      </avatar-root>
    `);
    await waitForUpdate();

    // Image is hidden while loading
    const image = view.querySelector('avatar-image')! as HTMLElement;
    expect(image).toHaveAttribute('hidden');
    expect(handleStatusChange).toHaveBeenCalledWith('loading');

    // Fallback is visible
    const fallback = view.querySelector('avatar-fallback')! as HTMLElement;
    expect(fallback).not.toHaveAttribute('hidden');
    expect(fallback.textContent).toBe('LT');
  });

  it('shows image and hides fallback when image loads', async () => {
    const view = render(html`
      <avatar-root>
        <avatar-image src="avatar.png"></avatar-image>
        <avatar-fallback>LT</avatar-fallback>
      </avatar-root>
    `);
    await waitForUpdate();

    // Simulate successful load
    MockImage.instances[0].emitLoad();
    await waitForUpdate();

    const image = view.querySelector('avatar-image')! as HTMLElement;
    const fallback = view.querySelector('avatar-fallback')! as HTMLElement;

    expect(image).not.toHaveAttribute('hidden');
    expect(fallback).toHaveAttribute('hidden');
  });

  it('supports a rendered image container', async () => {
    const view = render(html`
      <avatar-root>
        <avatar-image
          src="avatar.png"
          .render=${html`<div data-testid="image"></div>`}
        ></avatar-image>
      </avatar-root>
    `);
    await waitForUpdate();

    MockImage.instances[0].emitLoad();
    await waitForUpdate();

    const image = view.querySelector('[data-testid="image"]') as HTMLElement;
    expect(image).not.toHaveAttribute('hidden');
    expect(image.querySelector('img')).not.toBeNull();
  });

  it('updates rendered image attributes after the image has loaded', async () => {
    const view = render(html`
      <avatar-root>
        <avatar-image src="avatar.png" alt="Ada" width="48" height="48"></avatar-image>
      </avatar-root>
    `);
    await waitForUpdate();

    MockImage.instances[0].emitLoad();
    await waitForUpdate();

    const avatarImage = view.querySelector('avatar-image') as AvatarImageElement;
    const img = avatarImage.querySelector('img') as HTMLImageElement;

    expect(img.alt).toBe('Ada');
    expect(img.width).toBe(48);
    expect(img.height).toBe(48);

    avatarImage.setAttribute('alt', 'Grace');
    avatarImage.setAttribute('width', '64');
    avatarImage.setAttribute('height', '64');
    await waitForUpdate();

    expect(img.alt).toBe('Grace');
    expect(img.width).toBe(64);
    expect(img.height).toBe(64);
  });

  it('shows fallback when image fails to load', async () => {
    const view = render(html`
      <avatar-root>
        <avatar-image src="bad-url.png"></avatar-image>
        <avatar-fallback>LT</avatar-fallback>
      </avatar-root>
    `);
    await waitForUpdate();

    MockImage.instances[0].emitError();
    await waitForUpdate();

    const fallback = view.querySelector('avatar-fallback')! as HTMLElement;
    expect(fallback).not.toHaveAttribute('hidden');
  });

  it('shows fallback when no src is provided', async () => {
    const view = render(html`
      <avatar-root>
        <avatar-image></avatar-image>
        <avatar-fallback>LT</avatar-fallback>
      </avatar-root>
    `);
    await waitForUpdate();

    const fallback = view.querySelector('avatar-fallback')! as HTMLElement;
    expect(fallback).not.toHaveAttribute('hidden');
  });

  it('supports fallback delay', async () => {
    vi.useFakeTimers();

    const view = render(html`
      <avatar-root>
        <avatar-fallback delay="100">LT</avatar-fallback>
      </avatar-root>
    `);

    // Fallback should be hidden until delay passes
    const fallback = view.querySelector('avatar-fallback')! as HTMLElement;
    expect(fallback).toHaveAttribute('hidden');

    vi.advanceTimersByTime(100);

    expect(fallback).not.toHaveAttribute('hidden');
  });

  it('supports a rendered fallback container', async () => {
    const view = render(html`
      <avatar-root>
        <avatar-fallback .render=${html`<div data-testid="fallback"></div>`}>LT</avatar-fallback>
      </avatar-root>
    `);
    await waitForUpdate();

    expect(view.querySelector('[data-testid="fallback"]')?.textContent).toBe('LT');
  });

  it('updates fallback visibility when delay changes after mount', async () => {
    vi.useFakeTimers();

    const view = render(html`
      <avatar-root>
        <avatar-fallback delay="100">LT</avatar-fallback>
      </avatar-root>
    `);

    const fallback = view.querySelector('avatar-fallback') as HTMLElement;

    expect(fallback).toHaveAttribute('hidden');

    fallback.removeAttribute('delay');

    expect(fallback).not.toHaveAttribute('hidden');
  });

  it('calls onLoadingStatusChange with each status', async () => {
    const handleStatusChange = vi.fn();
    render(html`
      <avatar-root>
        <avatar-image src="avatar.png" .onLoadingStatusChange=${handleStatusChange}></avatar-image>
      </avatar-root>
    `);
    await waitForUpdate();

    expect(handleStatusChange).toHaveBeenCalledWith('loading');

    MockImage.instances[0].emitLoad();
    await waitForUpdate();

    expect(handleStatusChange).toHaveBeenCalledWith('loaded');
  });

  it('updates when src changes', async () => {
    const handleStatusChange = vi.fn();
    const view = render(html`
      <avatar-root>
        <avatar-image src="avatar1.png" .onLoadingStatusChange=${handleStatusChange}></avatar-image>
      </avatar-root>
    `);
    await waitForUpdate();

    expect(handleStatusChange).toHaveBeenCalledWith('loading');
    MockImage.instances[0].emitLoad();
    await waitForUpdate();

    // Change src
    const imageEl = view.querySelector('avatar-image')!;
    imageEl.setAttribute('src', 'avatar2.png');
    await waitForUpdate();

    expect(handleStatusChange).toHaveBeenCalledWith('loading');
    expect(MockImage.instances).toHaveLength(2);
    expect(MockImage.instances[1].src).toBe('avatar2.png');
  });

  it('cleans up image listeners on disconnect', async () => {
    const view = render(html`
      <avatar-root>
        <avatar-image src="avatar.png"></avatar-image>
      </avatar-root>
    `);
    await waitForUpdate();

    const mockImage = MockImage.instances[0];
    const imageEl = view.querySelector('avatar-image')!;
    imageEl.remove();

    // Loading after disconnect should not cause errors
    mockImage.emitLoad();
  });

  it('logs error when parts render outside avatar-root', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(html`<avatar-image src="avatar.png"></avatar-image>`);
    render(html`<avatar-fallback>LT</avatar-fallback>`);
    await waitForUpdate();

    expect(errorSpy).toHaveBeenCalledTimes(2);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Avatar parts must be placed within <avatar-root>'),
    );

    errorSpy.mockRestore();
  });

  it('passes crossOrigin and referrerPolicy to image probe', async () => {
    render(html`
      <avatar-root>
        <avatar-image
          src="avatar.png"
          crossorigin="anonymous"
          referrerpolicy="no-referrer"
        ></avatar-image>
      </avatar-root>
    `);
    await waitForUpdate();

    const mockImage = MockImage.instances[0];
    expect(mockImage.crossOrigin).toBe('anonymous');
    expect(mockImage.referrerPolicy).toBe('no-referrer');
  });

  it('root reports initial idle status', () => {
    const view = render(html`<avatar-root></avatar-root>`);
    const root = view.querySelector('avatar-root')! as AvatarRootElement;
    expect(root.getImageLoadingStatus()).toBe('idle');
  });
});
