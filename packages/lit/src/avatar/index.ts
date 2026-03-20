import { html, noChange, nothing, type TemplateResult } from 'lit';
// eslint-disable-next-line import/extensions
import { AsyncDirective, directive } from 'lit/async-directive.js';
import type { ComponentRenderFn, HTMLProps } from '../types/index.ts';
import { useRender } from '../use-render/index.ts';

const AVATAR_ROOT_ATTRIBUTE = 'data-base-ui-avatar-root';
const AVATAR_IMAGE_LOADING_STATUS_ATTRIBUTE = 'data-base-ui-avatar-image-loading-status';
const AVATAR_STATUS_CHANGE_EVENT = 'base-ui-avatar-loading-status-change';
const AVATAR_CONTEXT_ERROR =
  'Base UI: AvatarRootContext is missing. Avatar parts must be placed within <Avatar.Root>.';
const STARTING_STYLE_ATTRIBUTE = 'data-starting-style';
const ENDING_STYLE_ATTRIBUTE = 'data-ending-style';
const STARTING_STYLE_HOOK: Record<string, string> = { [STARTING_STYLE_ATTRIBUTE]: '' };
const ENDING_STYLE_HOOK: Record<string, string> = { [ENDING_STYLE_ATTRIBUTE]: '' };

type ComponentPropsWithChildren<
  ElementType extends keyof HTMLElementTagNameMap,
  State,
  Children = unknown,
> = Omit<useRender.ComponentProps<ElementType, State>, 'children'> & {
  children?: Children | undefined;
};

const avatarStateAttributesMapping: useRender.Parameters<
  AvatarRootState,
  HTMLSpanElement,
  undefined
>['stateAttributesMapping'] = {
  imageLoadingStatus() {
    return null;
  },
};

const avatarImageStateAttributesMapping: useRender.Parameters<
  AvatarImageState,
  HTMLImageElement,
  undefined
>['stateAttributesMapping'] = {
  ...avatarStateAttributesMapping,
  transitionStatus(value) {
    if (value === 'starting') {
      return STARTING_STYLE_HOOK;
    }

    if (value === 'ending') {
      return ENDING_STYLE_HOOK;
    }

    return null;
  },
};

export type ImageLoadingStatus = 'idle' | 'loading' | 'loaded' | 'error';
export type TransitionStatus = 'starting' | 'ending' | 'idle' | undefined;

/**
 * Displays a user's profile picture, initials, or fallback icon.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Avatar](https://base-ui.com/react/components/avatar)
 */
function AvatarRoot(componentProps: AvatarRootProps): TemplateResult {
  const { render, children, ...elementProps } = componentProps;

  return useRender<AvatarRootState, HTMLSpanElement>({
    defaultTagName: 'span',
    render,
    state: {
      imageLoadingStatus: 'idle',
    },
    stateAttributesMapping: avatarStateAttributesMapping,
    props: {
      [AVATAR_ROOT_ATTRIBUTE]: '',
      children,
      ...elementProps,
    },
  });
}

class AvatarImageDirective extends AsyncDirective {
  private latestProps: AvatarImageProps | null = null;
  private root: Element | null = null;
  private imageElement: HTMLImageElement | null = null;
  private loadingStatus: ImageLoadingStatus = 'idle';
  private transitionStatus: TransitionStatus = undefined;
  private mounted = false;
  private loadingSourceKey: string | null = null;
  private cleanupImageLoad: (() => void) | null = null;
  private frameId: number | null = null;
  private exitRunId = 0;
  private isUpdating = false;

  render(_componentProps: AvatarImageProps) {
    return noChange;
  }

  override update(
    part: Parameters<AsyncDirective['update']>[0],
    [componentProps]: [AvatarImageProps],
  ) {
    this.isUpdating = true;

    try {
      this.latestProps = componentProps;
      this.root = getAvatarRoot(part);

      this.syncImageLoadingStatus();
      this.syncTransitionState();

      return this.renderCurrent();
    } finally {
      this.isUpdating = false;
    }
  }

  override disconnected() {
    this.cleanupImageLoad?.();
    this.cleanupImageLoad = null;
    this.clearScheduledFrame();
    this.root = null;
    this.imageElement = null;
  }

  override reconnected() {}

  private renderCurrent() {
    if (this.latestProps == null || !this.mounted) {
      return nothing;
    }

    const {
      onLoadingStatusChange: _onLoadingStatusChange,
      render,
      ...elementProps
    } = this.latestProps;

    return useRender<AvatarImageState, HTMLImageElement>({
      defaultTagName: 'img',
      render,
      ref: this.handleImageRef,
      state: {
        imageLoadingStatus: this.loadingStatus,
        transitionStatus: this.transitionStatus,
      },
      stateAttributesMapping: avatarImageStateAttributesMapping,
      props: elementProps,
    });
  }

  private handleImageRef = (element: HTMLImageElement | null) => {
    this.imageElement = element;
  };

  private syncImageLoadingStatus() {
    if (this.latestProps == null) {
      return;
    }

    const nextSourceKey = [
      this.latestProps.src ?? '',
      this.latestProps.referrerPolicy ?? '',
      this.latestProps.crossOrigin ?? '',
    ].join('::');

    if (nextSourceKey === this.loadingSourceKey) {
      return;
    }

    this.loadingSourceKey = nextSourceKey;
    this.cleanupImageLoad?.();
    this.cleanupImageLoad = null;

    const src = this.latestProps.src as string | undefined;

    if (!src) {
      this.updateLoadingStatus('error');
      return;
    }

    this.updateLoadingStatus('loading');

    let active = true;
    const image = new window.Image();

    image.onload = () => {
      if (!active) {
        return;
      }

      this.updateLoadingStatus('loaded');
    };

    image.onerror = () => {
      if (!active) {
        return;
      }

      this.updateLoadingStatus('error');
    };

    const referrerPolicy = this.latestProps.referrerPolicy as string | undefined;
    const crossOrigin = (this.latestProps.crossOrigin ?? null) as string | null;

    if (referrerPolicy) {
      image.referrerPolicy = referrerPolicy;
    }

    image.crossOrigin = crossOrigin;
    image.src = src;

    this.cleanupImageLoad = () => {
      active = false;
    };
  }

  private updateLoadingStatus(nextStatus: ImageLoadingStatus) {
    if (this.loadingStatus === nextStatus) {
      return;
    }

    this.loadingStatus = nextStatus;
    this.latestProps?.onLoadingStatusChange?.(nextStatus);

    if (this.root != null) {
      setAvatarRootLoadingStatus(this.root, nextStatus);
    }

    this.syncTransitionState();

    if (!this.isUpdating) {
      this.requestComponentUpdate();
    }
  }

  private syncTransitionState() {
    const isVisible = this.loadingStatus === 'loaded';

    if (isVisible) {
      this.exitRunId += 1;

      if (!this.mounted) {
        this.mounted = true;
        this.transitionStatus = 'starting';
        this.scheduleStartingStyleCleanup();
        return;
      }

      if (this.transitionStatus === 'ending') {
        this.transitionStatus = undefined;
      }

      return;
    }

    if (this.mounted && this.transitionStatus !== 'ending') {
      this.transitionStatus = 'ending';
      this.scheduleExitCleanup();
      return;
    }

    if (!this.mounted && this.transitionStatus === 'ending') {
      this.transitionStatus = undefined;
    }
  }

  private scheduleStartingStyleCleanup() {
    this.clearScheduledFrame();

    this.frameId = requestAnimationFrame(() => {
      this.frameId = null;

      if (
        !this.mounted ||
        this.loadingStatus !== 'loaded' ||
        this.transitionStatus !== 'starting'
      ) {
        return;
      }

      this.transitionStatus = undefined;
      this.requestComponentUpdate();
    });
  }

  private scheduleExitCleanup() {
    this.clearScheduledFrame();
    const runId = ++this.exitRunId;

    this.frameId = requestAnimationFrame(() => {
      this.frameId = null;
      this.waitForExitAnimations(runId);
    });
  }

  private waitForExitAnimations(runId: number) {
    if (runId !== this.exitRunId || this.loadingStatus === 'loaded') {
      return;
    }

    const imageElement = this.imageElement;

    if (
      imageElement == null ||
      typeof imageElement.getAnimations !== 'function' ||
      (
        globalThis as typeof globalThis & {
          BASE_UI_ANIMATIONS_DISABLED?: boolean | undefined;
        }
      ).BASE_UI_ANIMATIONS_DISABLED
    ) {
      this.finishExit(runId);
      return;
    }

    Promise.all(imageElement.getAnimations().map((animation) => animation.finished))
      .then(() => {
        this.finishExit(runId);
      })
      .catch(() => {
        if (runId !== this.exitRunId || this.loadingStatus === 'loaded') {
          return;
        }

        const activeAnimations = imageElement.getAnimations();

        if (
          activeAnimations.length > 0 &&
          activeAnimations.some(
            (animation) => animation.pending || animation.playState !== 'finished',
          )
        ) {
          this.waitForExitAnimations(runId);
          return;
        }

        this.finishExit(runId);
      });
  }

  private finishExit(runId: number) {
    if (runId !== this.exitRunId || this.loadingStatus === 'loaded') {
      return;
    }

    this.mounted = false;
    this.transitionStatus = undefined;
    this.requestComponentUpdate();
  }

  private requestComponentUpdate() {
    this.setValue(this.renderCurrent());
  }

  private clearScheduledFrame() {
    if (this.frameId != null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
  }
}

class AvatarFallbackDirective extends AsyncDirective {
  private latestProps: AvatarFallbackProps | null = null;
  private root: Element | null = null;
  private delayPassed = true;
  private lastDelay: number | undefined = undefined;
  private initialized = false;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  render(_componentProps: AvatarFallbackProps) {
    return noChange;
  }

  override update(
    part: Parameters<AsyncDirective['update']>[0],
    [componentProps]: [AvatarFallbackProps],
  ) {
    this.latestProps = componentProps;
    this.syncRoot(getAvatarRoot(part));
    this.syncDelay(componentProps.delay);

    return this.renderCurrent();
  }

  override disconnected() {
    this.clearDelay();
    this.syncRoot(null);
  }

  override reconnected() {}

  private renderCurrent() {
    if (this.latestProps == null || this.root == null) {
      return nothing;
    }

    const { delay: _delay, render, ...elementProps } = this.latestProps;
    const imageLoadingStatus = getAvatarRootLoadingStatus(this.root);

    if (imageLoadingStatus === 'loaded' || !this.delayPassed) {
      return nothing;
    }

    return useRender<AvatarFallbackState, HTMLSpanElement>({
      defaultTagName: 'span',
      render,
      state: {
        imageLoadingStatus,
      },
      stateAttributesMapping: avatarStateAttributesMapping,
      props: elementProps,
    });
  }

  private syncRoot(root: Element | null) {
    if (this.root === root) {
      return;
    }

    this.root?.removeEventListener(AVATAR_STATUS_CHANGE_EVENT, this.handleStatusChange);
    this.root = root;
    this.root?.addEventListener(AVATAR_STATUS_CHANGE_EVENT, this.handleStatusChange);
  }

  private syncDelay(delay: number | undefined) {
    if (!this.initialized) {
      this.initialized = true;
      this.lastDelay = delay;
      this.delayPassed = delay === undefined;

      if (delay !== undefined && !this.delayPassed) {
        this.startDelay(delay);
      }

      return;
    }

    if (delay === this.lastDelay) {
      return;
    }

    this.lastDelay = delay;

    if (delay === undefined) {
      this.clearDelay();
      this.delayPassed = true;
      return;
    }

    if (this.delayPassed) {
      return;
    }

    this.clearDelay();
    this.startDelay(delay);
  }

  private startDelay(delay: number) {
    this.timeoutId = setTimeout(() => {
      this.timeoutId = null;
      this.delayPassed = true;
      this.requestComponentUpdate();
    }, delay);
  }

  private clearDelay() {
    if (this.timeoutId != null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  private handleStatusChange = () => {
    this.requestComponentUpdate();
  };

  private requestComponentUpdate() {
    this.setValue(this.renderCurrent());
  }
}

const avatarImageDirective = directive(AvatarImageDirective);
const avatarFallbackDirective = directive(AvatarFallbackDirective);

/**
 * The image to be displayed in the avatar.
 * Renders an `<img>` element.
 *
 * Documentation: [Base UI Avatar](https://base-ui.com/react/components/avatar)
 */
function AvatarImage(componentProps: AvatarImageProps): TemplateResult {
  return html`${avatarImageDirective(componentProps)}`;
}

/**
 * Rendered when the image fails to load or when no image is provided.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Avatar](https://base-ui.com/react/components/avatar)
 */
function AvatarFallback(componentProps: AvatarFallbackProps): TemplateResult {
  return html`${avatarFallbackDirective(componentProps)}`;
}

function getAvatarRoot(part: Parameters<AsyncDirective['update']>[0]) {
  const parentNode = (part as { parentNode?: Node | null | undefined }).parentNode ?? null;
  const parentElement = getParentElement(parentNode);
  const root = parentElement?.closest(`[${AVATAR_ROOT_ATTRIBUTE}]`);

  if (root == null) {
    throw new Error(AVATAR_CONTEXT_ERROR);
  }

  return root;
}

function getAvatarRootLoadingStatus(root: Element): ImageLoadingStatus {
  const status = root.getAttribute(AVATAR_IMAGE_LOADING_STATUS_ATTRIBUTE);

  if (status === 'loading' || status === 'loaded' || status === 'error' || status === 'idle') {
    return status;
  }

  return 'idle';
}

function setAvatarRootLoadingStatus(root: Element, status: ImageLoadingStatus) {
  if (getAvatarRootLoadingStatus(root) === status) {
    return;
  }

  if (status === 'idle') {
    root.removeAttribute(AVATAR_IMAGE_LOADING_STATUS_ATTRIBUTE);
  } else {
    root.setAttribute(AVATAR_IMAGE_LOADING_STATUS_ATTRIBUTE, status);
  }

  root.dispatchEvent(new CustomEvent(AVATAR_STATUS_CHANGE_EVENT));
}

function getParentElement(node: Node | null) {
  if (node == null) {
    return null;
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    return node as Element;
  }

  return node.parentElement;
}

export interface AvatarRootState {
  /**
   * The image loading status.
   */
  imageLoadingStatus: ImageLoadingStatus;
}

export interface AvatarImageState extends AvatarRootState {
  /**
   * The transition status of the component.
   */
  transitionStatus: TransitionStatus;
}

export interface AvatarFallbackState extends AvatarRootState {}

type AvatarRootRenderProp =
  | TemplateResult
  | ComponentRenderFn<HTMLProps<HTMLSpanElement>, AvatarRootState>;
type AvatarImageRenderProp =
  | TemplateResult
  | ComponentRenderFn<HTMLProps<HTMLImageElement>, AvatarImageState>;
type AvatarFallbackRenderProp =
  | TemplateResult
  | ComponentRenderFn<HTMLProps<HTMLSpanElement>, AvatarFallbackState>;

export interface AvatarRootProps extends Omit<
  ComponentPropsWithChildren<'span', AvatarRootState>,
  'render'
> {
  render?: AvatarRootRenderProp | undefined;
}

export interface AvatarImageProps extends Omit<
  ComponentPropsWithChildren<'img', AvatarImageState>,
  'render'
> {
  /**
   * Callback fired when the loading status changes.
   */
  onLoadingStatusChange?: ((status: ImageLoadingStatus) => void) | undefined;
  render?: AvatarImageRenderProp | undefined;
}

export interface AvatarFallbackProps extends Omit<
  ComponentPropsWithChildren<'span', AvatarFallbackState>,
  'render'
> {
  /**
   * How long to wait before showing the fallback. Specified in milliseconds.
   */
  delay?: number | undefined;
  render?: AvatarFallbackRenderProp | undefined;
}

export namespace AvatarRoot {
  export type State = AvatarRootState;
  export type Props = AvatarRootProps;
}

export namespace AvatarImage {
  export type State = AvatarImageState;
  export type Props = AvatarImageProps;
}

export namespace AvatarFallback {
  export type State = AvatarFallbackState;
  export type Props = AvatarFallbackProps;
}

export const Avatar = {
  Root: AvatarRoot,
  Image: AvatarImage,
  Fallback: AvatarFallback,
};
