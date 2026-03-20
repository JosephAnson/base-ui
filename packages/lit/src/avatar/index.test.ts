/* eslint-disable testing-library/render-result-naming-convention */
import { html, nothing, render as renderTemplate, type TemplateResult } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import {
  Avatar,
  type AvatarFallbackProps,
  type AvatarImageProps,
  type AvatarRootProps,
  type ImageLoadingStatus,
} from '@base-ui/lit/avatar';

const AVATAR_CONTEXT_ERROR =
  'Base UI: AvatarRootContext is missing. Avatar parts must be placed within <Avatar.Root>.';

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

describe('Avatar', () => {
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

  function render(result: TemplateResult) {
    const container = document.createElement('div');
    document.body.append(container);
    containers.add(container);

    renderTemplate(result, container);
    return container;
  }

  async function flushUpdates() {
    await Promise.resolve();
    await Promise.resolve();
  }

  it('preserves the public type contracts', () => {
    const root = Avatar.Root({});
    const image = Avatar.Image({});
    const fallback = Avatar.Fallback({});

    expectTypeOf(root).toEqualTypeOf<TemplateResult>();
    expectTypeOf(image).toEqualTypeOf<TemplateResult>();
    expectTypeOf(fallback).toEqualTypeOf<TemplateResult>();
    expectTypeOf<AvatarImageProps['onLoadingStatusChange']>().toEqualTypeOf<
      ((status: ImageLoadingStatus) => void) | undefined
    >();
    expectTypeOf<AvatarFallbackProps['delay']>().toEqualTypeOf<number | undefined>();
  });

  it('renders a span root by default', () => {
    const container = render(Avatar.Root({ children: 'LT' }));
    const root = container.querySelector('span');

    expect(root).toBeVisible();
    expect(root).toHaveTextContent('LT');
  });

  it('throws when Avatar.Image is rendered outside Avatar.Root', () => {
    expect(() => {
      render(Avatar.Image({ src: 'avatar.png' }));
    }).toThrow(AVATAR_CONTEXT_ERROR);
  });

  it('throws when Avatar.Fallback is rendered outside Avatar.Root', () => {
    expect(() => {
      render(Avatar.Fallback({ children: 'LT' }));
    }).toThrow(AVATAR_CONTEXT_ERROR);
  });

  it('keeps the fallback mounted while the image is loading and swaps it out once loaded', async () => {
    const handleStatusChange = vi.fn();
    const container = render(
      Avatar.Root({
        children: html`
          ${Avatar.Image({
            src: 'avatar.png',
            'data-testid': 'image',
            onLoadingStatusChange: handleStatusChange,
          })}
          ${Avatar.Fallback({ 'data-testid': 'fallback', children: 'LT' })}
        `,
      }),
    );

    expect(container.querySelector('[data-testid="image"]')).toBe(null);
    expect(container.querySelector('[data-testid="fallback"]')).toHaveTextContent('LT');
    expect(handleStatusChange).toHaveBeenCalledWith('loading');

    MockImage.instances[0].emitLoad();
    await flushUpdates();

    expect(container.querySelector('[data-testid="image"]')).toHaveAttribute('src', 'avatar.png');
    expect(container.querySelector('[data-testid="fallback"]')).toBe(null);
    expect(handleStatusChange).toHaveBeenLastCalledWith('loaded');
  });

  it('shows the fallback after its delay elapses', async () => {
    vi.useFakeTimers();

    const container = render(
      Avatar.Root({
        children: Avatar.Fallback({
          delay: 100,
          'data-testid': 'fallback',
          children: 'LT',
        }),
      }),
    );

    expect(container.querySelector('[data-testid="fallback"]')).toBe(null);

    vi.advanceTimersByTime(100);
    await flushUpdates();

    expect(container.querySelector('[data-testid="fallback"]')).toHaveTextContent('LT');
  });

  it('applies data-starting-style when the image becomes visible', async () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame'] });

    const container = render(
      Avatar.Root({
        children: Avatar.Image({
          src: 'avatar.png',
          className: 'avatar-image',
          'data-testid': 'image',
        }),
      }),
    );

    MockImage.instances[0].emitLoad();
    await flushUpdates();

    expect(container.querySelector('[data-testid="image"]')).toHaveAttribute('data-starting-style');

    vi.advanceTimersByTime(16);
    await flushUpdates();

    expect(container.querySelector('[data-testid="image"]')).not.toHaveAttribute(
      'data-starting-style',
    );
  });

  it('applies data-ending-style before the image unmounts', async () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame'] });

    const container = render(
      Avatar.Root({
        children: Avatar.Image({
          src: 'avatar.png',
          className: 'avatar-image',
          'data-testid': 'image',
        }),
      }),
    );

    MockImage.instances[0].emitLoad();
    await flushUpdates();
    vi.advanceTimersByTime(16);
    await flushUpdates();

    const image = container.querySelector('[data-testid="image"]') as HTMLImageElement;
    let resolveFinished!: () => void;
    const finished = new Promise<void>((resolve) => {
      resolveFinished = resolve;
    });

    Object.defineProperty(image, 'getAnimations', {
      configurable: true,
      value: () => [
        {
          finished,
          pending: false,
          playState: 'running',
        },
      ],
    });

    renderTemplate(
      Avatar.Root({
        children: Avatar.Image({
          'data-testid': 'image',
        }),
      }),
      container,
    );
    await flushUpdates();

    expect(container.querySelector('[data-testid="image"]')).toHaveAttribute('data-ending-style');

    vi.advanceTimersByTime(16);
    resolveFinished();
    await flushUpdates();

    expect(container.querySelector('[data-testid="image"]')).toBe(null);
  });
});
