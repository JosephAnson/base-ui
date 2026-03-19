import { LitElement, ReactiveElement, type PropertyValues } from 'lit';

type MatchMediaImplementation = (query: string) => MediaQueryList;

type MediaQuerySubscription = {
  detach: () => void;
  hosts: Set<ReactiveElement>;
  mediaQueryList: MediaQueryList;
};

type HostState = {
  activeSubscriptions: Set<MediaQuerySubscription>;
  hasRendered: boolean;
  needsHydrationSyncUpdate: boolean;
  needsReconnectUpdate: boolean;
  observedSubscriptions: Set<MediaQuerySubscription>;
};

const subscriptionsByMatchMedia = new WeakMap<
  MatchMediaImplementation,
  Map<string, MediaQuerySubscription>
>();
const hostStates = new WeakMap<ReactiveElement, HostState>();

let currentHost: ReactiveElement | null = null;
let patchesInstalled = false;

ensureReactiveHostTracking();

export function useMediaQuery(query: string, options: useMediaQuery.Options): boolean {
  const supportMatchMedia =
    typeof window !== 'undefined' && typeof window.matchMedia !== 'undefined';

  query = query.replace(/^@media( ?)/m, '');

  const {
    defaultMatches = false,
    matchMedia = supportMatchMedia ? window.matchMedia : undefined,
    ssrMatchMedia = null,
    noSsr = false,
  } = options;

  const serverSnapshot = getServerSnapshot(query, {
    defaultMatches,
    matchMedia,
    noSsr,
    ssrMatchMedia,
  });

  if (typeof window === 'undefined') {
    return serverSnapshot;
  }

  if (!matchMedia) {
    return defaultMatches;
  }

  if (!currentHost) {
    return matchMedia(query).matches;
  }

  const subscription = getSubscription(matchMedia, query);

  const hostState = getHostState(currentHost);
  hostState.observedSubscriptions.add(subscription);

  if (!hostState.activeSubscriptions.has(subscription)) {
    hostState.activeSubscriptions.add(subscription);
    subscription.hosts.add(currentHost);
  }

  if (shouldUseServerSnapshot(hostState, currentHost, noSsr)) {
    hostState.needsHydrationSyncUpdate = serverSnapshot !== subscription.mediaQueryList.matches;
    return serverSnapshot;
  }

  return subscription.mediaQueryList.matches;
}

export interface UseMediaQueryOptions {
  /**
   * Returned when rendering on the server and when `matchMedia` is unavailable.
   * @default false
   */
  defaultMatches?: boolean | undefined;
  /**
   * You can provide your own implementation of matchMedia.
   * This can be used for handling an iframe content window.
   */
  matchMedia?: typeof window.matchMedia | undefined;
  /**
   * When rendering on the server, prefer `matchMedia(query).matches`
   * over `defaultMatches` when a custom `matchMedia` implementation is provided.
   * @default false
   */
  noSsr?: boolean | undefined;
  /**
   * You can provide your own implementation of `matchMedia`, it's used when rendering server-side.
   */
  ssrMatchMedia?: ((query: string) => { matches: boolean }) | undefined;
}

export interface UseMediaQueryState {}

export namespace useMediaQuery {
  export type State = UseMediaQueryState;
  export type Options = UseMediaQueryOptions;
}

function ensureReactiveHostTracking() {
  if (patchesInstalled) {
    return;
  }

  patchesInstalled = true;

  const litElementPrototype = LitElement.prototype as LitElement & {
    update(changedProperties: PropertyValues): void;
  };
  const originalUpdate = litElementPrototype.update;

  litElementPrototype.update = function updateWithMediaQueryTracking(
    this: LitElement,
    changedProperties: PropertyValues,
  ) {
    const previousHost = currentHost;
    currentHost = this;

    const hostState = getHostState(this);
    hostState.observedSubscriptions.clear();

    try {
      return originalUpdate.call(this, changedProperties);
    } finally {
      cleanupStaleSubscriptions(this, hostState);
      hostState.hasRendered = true;

      if (hostState.needsHydrationSyncUpdate) {
        hostState.needsHydrationSyncUpdate = false;
        queueMicrotask(() => {
          if (this.isConnected) {
            this.requestUpdate();
          }
        });
      }

      currentHost = previousHost;
    }
  };

  const reactiveElementPrototype = ReactiveElement.prototype as ReactiveElement & {
    connectedCallback(): void;
    disconnectedCallback(): void;
  };
  const originalConnected = reactiveElementPrototype.connectedCallback;
  const originalDisconnected = reactiveElementPrototype.disconnectedCallback;

  reactiveElementPrototype.connectedCallback = function connectedWithMediaQueryTracking(
    this: ReactiveElement,
  ) {
    originalConnected.call(this);

    const hostState = hostStates.get(this);

    if (hostState?.needsReconnectUpdate) {
      hostState.needsReconnectUpdate = false;
      this.requestUpdate();
    }
  };

  reactiveElementPrototype.disconnectedCallback = function disconnectedWithMediaQueryCleanup(
    this: ReactiveElement,
  ) {
    cleanupHostSubscriptions(this);
    originalDisconnected.call(this);
  };
}

function getHostState(host: ReactiveElement): HostState {
  const existingState = hostStates.get(host);

  if (existingState) {
    return existingState;
  }

  const newState: HostState = {
    activeSubscriptions: new Set(),
    hasRendered: false,
    needsHydrationSyncUpdate: false,
    needsReconnectUpdate: false,
    observedSubscriptions: new Set(),
  };

  hostStates.set(host, newState);
  return newState;
}

function getSubscription(
  matchMedia: MatchMediaImplementation,
  query: string,
): MediaQuerySubscription {
  let subscriptions = subscriptionsByMatchMedia.get(matchMedia);

  if (!subscriptions) {
    subscriptions = new Map();
    subscriptionsByMatchMedia.set(matchMedia, subscriptions);
  }

  const existingSubscription = subscriptions.get(query);

  if (existingSubscription) {
    return existingSubscription;
  }

  const mediaQueryList = matchMedia(query);

  const subscription: MediaQuerySubscription = {
    detach: () => {
      mediaQueryList.removeEventListener('change', notifyHosts);
      subscriptions.delete(query);
    },
    hosts: new Set(),
    mediaQueryList,
  };

  function notifyHosts() {
    subscription.hosts.forEach((host) => {
      host.requestUpdate();
    });
  }

  mediaQueryList.addEventListener('change', notifyHosts);
  subscriptions.set(query, subscription);

  return subscription;
}

function cleanupStaleSubscriptions(host: ReactiveElement, hostState: HostState) {
  hostState.activeSubscriptions.forEach((subscription) => {
    if (hostState.observedSubscriptions.has(subscription)) {
      return;
    }

    releaseSubscription(host, hostState, subscription);
  });

  hostState.observedSubscriptions.clear();
}

function cleanupHostSubscriptions(host: ReactiveElement) {
  const hostState = hostStates.get(host);

  if (!hostState) {
    return;
  }

  hostState.needsReconnectUpdate = hostState.activeSubscriptions.size > 0;

  hostState.activeSubscriptions.forEach((subscription) => {
    releaseSubscription(host, hostState, subscription);
  });

  hostState.observedSubscriptions.clear();
}

function releaseSubscription(
  host: ReactiveElement,
  hostState: HostState,
  subscription: MediaQuerySubscription,
) {
  hostState.activeSubscriptions.delete(subscription);
  subscription.hosts.delete(host);

  if (subscription.hosts.size === 0) {
    subscription.detach();
  }
}

function getServerSnapshot(
  query: string,
  options: {
    defaultMatches: boolean;
    matchMedia: MatchMediaImplementation | undefined;
    noSsr: boolean;
    ssrMatchMedia: ((query: string) => { matches: boolean }) | null;
  },
) {
  const { defaultMatches, matchMedia, noSsr, ssrMatchMedia } = options;

  if (noSsr && matchMedia) {
    return matchMedia(query).matches;
  }

  if (ssrMatchMedia !== null) {
    return ssrMatchMedia(query).matches;
  }

  return defaultMatches;
}

function shouldUseServerSnapshot(
  hostState: HostState,
  host: ReactiveElement,
  noSsr: boolean,
) {
  if (noSsr || hostState.hasRendered) {
    return false;
  }

  return host instanceof LitElement && host.renderRoot.hasChildNodes();
}
