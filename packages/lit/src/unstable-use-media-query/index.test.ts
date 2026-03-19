import { LitElement, html } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import { useMediaQuery } from '@base-ui/lit/unstable-use-media-query';

class MockMediaQueryList implements MediaQueryList {
  media: string;
  matches: boolean;
  onchange: ((this: MediaQueryList, event: MediaQueryListEvent) => unknown) | null = null;

  private listeners = new Set<(event: MediaQueryListEvent) => void>();

  constructor(media: string, matches: boolean) {
    this.media = media;
    this.matches = matches;
  }

  get listenerCount() {
    return this.listeners.size;
  }

  addEventListener(_type: string, listener: EventListenerOrEventListenerObject | null) {
    if (!listener) {
      return;
    }

    this.listeners.add(toListener(listener));
  }

  removeEventListener(_type: string, listener: EventListenerOrEventListenerObject | null) {
    if (!listener) {
      return;
    }

    this.listeners.delete(toListener(listener));
  }

  addListener(listener: ((this: MediaQueryList, event: MediaQueryListEvent) => unknown) | null) {
    if (!listener) {
      return;
    }

    this.listeners.add(listener.bind(this));
  }

  removeListener(
    listener: ((this: MediaQueryList, event: MediaQueryListEvent) => unknown) | null,
  ) {
    if (!listener) {
      return;
    }

    this.listeners.delete(listener.bind(this));
  }

  dispatchEvent(event: Event) {
    const mediaQueryListEvent = event as MediaQueryListEvent;

    this.listeners.forEach((listener) => {
      listener(mediaQueryListEvent);
    });

    this.onchange?.call(this, mediaQueryListEvent);
    return true;
  }

  setMatches(matches: boolean) {
    this.matches = matches;

    const event = { matches, media: this.media } as MediaQueryListEvent;
    this.dispatchEvent(event as Event);
  }
}

class MediaQueryHost extends LitElement {
  options: useMediaQuery.Options = {
    defaultMatches: false,
  };
  query = '(min-width: 600px)';

  override render() {
    return html`<span>${String(useMediaQuery(this.query, this.options))}</span>`;
  }
}

const hostTagName = 'test-use-media-query-host';

if (!customElements.get(hostTagName)) {
  customElements.define(hostTagName, MediaQueryHost);
}

describe('useMediaQuery', () => {
  const restoreWindowMatchMedia = window.matchMedia;

  afterEach(() => {
    document.body.innerHTML = '';
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: restoreWindowMatchMedia,
      writable: true,
    });
  });

  it('preserves the public type contracts', () => {
    const result = useMediaQuery('(min-width: 1px)', {
      defaultMatches: false,
      matchMedia: () => new MockMediaQueryList('(min-width: 1px)', true),
    });

    expectTypeOf(result).toEqualTypeOf<boolean>();
    expectTypeOf<useMediaQuery.Options>().toEqualTypeOf<{
      defaultMatches?: boolean | undefined;
      matchMedia?: typeof window.matchMedia | undefined;
      noSsr?: boolean | undefined;
      ssrMatchMedia?: ((query: string) => { matches: boolean }) | undefined;
    }>();
  });

  it('strips an @media prefix before calling matchMedia', () => {
    const matchMedia = vi.fn((query: string) => new MockMediaQueryList(query, true));

    expect(
      useMediaQuery('@media (prefers-color-scheme: dark)', {
        matchMedia,
      }),
    ).toBe(true);

    expect(matchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
  });

  it('returns defaultMatches when matchMedia is unavailable', () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: undefined,
      writable: true,
    });

    expect(useMediaQuery('(min-width: 1px)', { defaultMatches: true })).toBe(true);
    expect(useMediaQuery('(min-width: 1px)', { defaultMatches: false })).toBe(false);
  });

  it('returns a direct snapshot without subscribing outside a LitElement render', () => {
    const mediaQueryList = new MockMediaQueryList('(min-width: 1px)', true);
    const matchMedia = vi.fn(() => mediaQueryList);

    expect(useMediaQuery('(min-width: 1px)', { matchMedia })).toBe(true);
    expect(mediaQueryList.listenerCount).toBe(0);
  });

  it('uses the server-side options when window is unavailable', () => {
    const originalWindow = globalThis.window;
    const serverMatchMedia = vi.fn((query: string) => new MockMediaQueryList(query, true));
    const ssrMatchMedia = vi.fn((query: string) => ({ matches: query === '(min-width: 1px)' }));

    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: undefined,
      writable: true,
    });

    try {
      expect(
        useMediaQuery('(min-width: 1px)', {
          defaultMatches: false,
          noSsr: true,
          matchMedia: serverMatchMedia,
        }),
      ).toBe(true);

      expect(
        useMediaQuery('(min-width: 1px)', {
          defaultMatches: false,
          ssrMatchMedia,
        }),
      ).toBe(true);

      expect(useMediaQuery('(min-width: 1px)', { defaultMatches: true })).toBe(true);
    } finally {
      Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: originalWindow,
        writable: true,
      });
    }
  });

  it('reactively updates the calling LitElement when the media query changes', async () => {
    const queries = new Map<string, MockMediaQueryList>();
    const matchMedia = vi.fn((query: string) => {
      let mediaQueryList = queries.get(query);

      if (!mediaQueryList) {
        mediaQueryList = new MockMediaQueryList(query, true);
        queries.set(query, mediaQueryList);
      }

      return mediaQueryList;
    });

    const host = document.createElement(hostTagName) as MediaQueryHost;
    host.options = {
      defaultMatches: false,
      matchMedia,
    };
    document.body.append(host);
    await host.updateComplete;

    const mediaQueryList = queries.get('(min-width: 600px)');

    expect(mediaQueryList).toBeDefined();
    expect(mediaQueryList?.listenerCount).toBe(1);
    expect(host.shadowRoot?.textContent).toBe('true');

    mediaQueryList?.setMatches(false);
    await Promise.resolve();
    await host.updateComplete;

    expect(host.shadowRoot?.textContent).toBe('false');
  });

  it('moves subscriptions when the query changes and cleans them up on disconnect', async () => {
    const queries = new Map<string, MockMediaQueryList>();
    const matchMedia = (query: string) => {
      let mediaQueryList = queries.get(query);

      if (!mediaQueryList) {
        mediaQueryList = new MockMediaQueryList(query, true);
        queries.set(query, mediaQueryList);
      }

      return mediaQueryList;
    };

    const host = document.createElement(hostTagName) as MediaQueryHost;
    host.options = {
      defaultMatches: false,
      matchMedia,
    };
    document.body.append(host);
    await host.updateComplete;

    const initialList = queries.get('(min-width: 600px)');

    expect(initialList?.listenerCount).toBe(1);

    host.query = '(orientation: portrait)';
    host.requestUpdate();
    await host.updateComplete;

    const nextList = queries.get('(orientation: portrait)');

    expect(initialList?.listenerCount).toBe(0);
    expect(nextList?.listenerCount).toBe(1);

    host.remove();

    expect(nextList?.listenerCount).toBe(0);
  });

  it('preserves the server snapshot for the first hydrated render', async () => {
    const queries = new Map<string, MockMediaQueryList>();
    const matchMedia = (query: string) => {
      let mediaQueryList = queries.get(query);

      if (!mediaQueryList) {
        mediaQueryList = new MockMediaQueryList(query, false);
        queries.set(query, mediaQueryList);
      }

      return mediaQueryList;
    };

    class HydratingMediaQueryHost extends MediaQueryHost {
      renderedValues: boolean[] = [];

      override createRenderRoot() {
        const root = super.createRenderRoot();

        if (!root.hasChildNodes()) {
          root.append(document.createElement('span'));
        }

        return root;
      }

      override render() {
        const value = useMediaQuery(this.query, this.options);
        this.renderedValues.push(value);
        return html`<span>${String(value)}</span>`;
      }
    }

    const hydratingHostTagName = 'test-use-media-query-hydrating-host';

    if (!customElements.get(hydratingHostTagName)) {
      customElements.define(hydratingHostTagName, HydratingMediaQueryHost);
    }

    const host = document.createElement(hydratingHostTagName) as HydratingMediaQueryHost;
    host.options = {
      defaultMatches: true,
      matchMedia,
      ssrMatchMedia: () => ({ matches: true }),
    };
    document.body.append(host);
    await host.updateComplete;
    await host.updateComplete;

    expect(host.renderedValues).toEqual([true, false]);
    expect(host.shadowRoot?.textContent).toBe('false');
  });

  it('re-subscribes when the same host instance is reattached', async () => {
    const queries = new Map<string, MockMediaQueryList>();
    const matchMedia = (query: string) => {
      let mediaQueryList = queries.get(query);

      if (!mediaQueryList) {
        mediaQueryList = new MockMediaQueryList(query, true);
        queries.set(query, mediaQueryList);
      }

      return mediaQueryList;
    };

    const host = document.createElement(hostTagName) as MediaQueryHost;
    host.options = {
      defaultMatches: false,
      matchMedia,
    };
    document.body.append(host);
    await host.updateComplete;

    const mediaQueryList = queries.get('(min-width: 600px)');

    expect(mediaQueryList?.listenerCount).toBe(1);

    host.remove();
    expect(mediaQueryList?.listenerCount).toBe(0);

    document.body.append(host);
    await host.updateComplete;

    expect(mediaQueryList?.listenerCount).toBe(1);

    mediaQueryList?.setMatches(false);
    await Promise.resolve();
    await host.updateComplete;

    expect(host.shadowRoot?.textContent).toBe('false');
  });

  it('shares subscriptions across hosts until the last host disconnects', async () => {
    const queries = new Map<string, MockMediaQueryList>();
    const matchMedia = (query: string) => {
      let mediaQueryList = queries.get(query);

      if (!mediaQueryList) {
        mediaQueryList = new MockMediaQueryList(query, true);
        queries.set(query, mediaQueryList);
      }

      return mediaQueryList;
    };

    const firstHost = document.createElement(hostTagName) as MediaQueryHost;
    firstHost.options = {
      defaultMatches: false,
      matchMedia,
    };
    document.body.append(firstHost);
    await firstHost.updateComplete;

    const secondHost = document.createElement(hostTagName) as MediaQueryHost;
    secondHost.options = {
      defaultMatches: false,
      matchMedia,
    };
    document.body.append(secondHost);
    await secondHost.updateComplete;

    const mediaQueryList = queries.get('(min-width: 600px)');

    expect(mediaQueryList?.listenerCount).toBe(1);

    firstHost.remove();
    expect(mediaQueryList?.listenerCount).toBe(1);

    mediaQueryList?.setMatches(false);
    await Promise.resolve();
    await secondHost.updateComplete;

    expect(secondHost.shadowRoot?.textContent).toBe('false');

    secondHost.remove();
    expect(mediaQueryList?.listenerCount).toBe(0);
  });
});

function toListener(
  listener: EventListenerOrEventListenerObject,
): (event: MediaQueryListEvent) => void {
  if (typeof listener === 'function') {
    return listener as (event: MediaQueryListEvent) => void;
  }

  return (event) => {
    listener.handleEvent(event);
  };
}
