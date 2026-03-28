import { ReactiveElement, render as renderTemplate, type TemplateResult } from 'lit';
import type { ComponentRenderFn, HTMLProps } from '../types';
import { BaseHTMLElement } from '../utils';

// ─── Constants ──────────────────────────────────────────────────────────────────

const STATUS_CHANGE_EVENT = 'base-ui-avatar-status-change';
const CONTEXT_ERROR =
  'Base UI: AvatarRootContext is missing. Avatar parts must be placed within <avatar-root>.';

// ─── Types ──────────────────────────────────────────────────────────────────────

export type ImageLoadingStatus = 'idle' | 'loading' | 'loaded' | 'error';
type AvatarRootRenderProps = HTMLProps<HTMLElement>;
type AvatarRootRenderProp =
  | TemplateResult
  | ComponentRenderFn<AvatarRootRenderProps, AvatarRootState>;
type AvatarImageRenderProps = HTMLProps<HTMLElement>;
type AvatarImageRenderProp =
  | TemplateResult
  | ComponentRenderFn<AvatarImageRenderProps, AvatarImageState>;
type AvatarFallbackRenderProps = HTMLProps<HTMLElement>;
type AvatarFallbackRenderProp =
  | TemplateResult
  | ComponentRenderFn<AvatarFallbackRenderProps, AvatarFallbackState>;

export interface AvatarRootState {
  /**
   * The image loading status.
   */
  imageLoadingStatus: ImageLoadingStatus;
}

export interface AvatarImageState extends AvatarRootState {}
export interface AvatarFallbackState extends AvatarRootState {}

export interface AvatarRootProps {
  /**
   * Allows you to replace the component's HTML element with a different tag,
   * or compose it with a template that has a single root element.
   * Accepts a `TemplateResult` or a function that returns the template to render.
   */
  render?: AvatarRootRenderProp | undefined;
}

export interface AvatarImageProps {
  /**
   * Callback fired when the loading status changes.
   */
  onLoadingStatusChange?: ((status: ImageLoadingStatus) => void) | undefined;
  /**
   * Allows you to replace the component's HTML element with a different tag,
   * or compose it with a template that has a single root element.
   * Accepts a `TemplateResult` or a function that returns the template to render.
   */
  render?: AvatarImageRenderProp | undefined;
}

export interface AvatarFallbackProps {
  /**
   * How long to wait before showing the fallback. Specified in milliseconds.
   */
  delay?: number | undefined;
  /**
   * Allows you to replace the component's HTML element with a different tag,
   * or compose it with a template that has a single root element.
   * Accepts a `TemplateResult` or a function that returns the template to render.
   */
  render?: AvatarFallbackRenderProp | undefined;
}

// ─── AvatarRootElement ───────────────────────────────────────────────────────────

/**
 * Displays a user's profile picture, initials, or fallback icon.
 * Renders an `<avatar-root>` custom element.
 *
 * Documentation: [Base UI Avatar](https://base-ui.com/react/components/avatar)
 */
export class AvatarRootElement extends ReactiveElement {
  static properties = {
    render: { attribute: false },
  };

  declare render: AvatarRootRenderProp | undefined;
  private imageLoadingStatusValue: ImageLoadingStatus = 'idle';
  private renderedElement: HTMLElement | null = null;

  override createRenderRoot() {
    return this;
  }

  getImageLoadingStatus(): ImageLoadingStatus {
    return this.imageLoadingStatusValue;
  }

  setImageLoadingStatus(status: ImageLoadingStatus) {
    if (this.imageLoadingStatusValue === status) {
      return;
    }

    this.imageLoadingStatusValue = status;
    this.dispatchEvent(new CustomEvent(STATUS_CHANGE_EVENT, { bubbles: false }));
  }

  override connectedCallback() {
    super.connectedCallback();
    this.ensureRenderedElement();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.resetRenderedElement();
  }

  getState(): AvatarRootState {
    return {
      imageLoadingStatus: this.getImageLoadingStatus(),
    };
  }

  private ensureRenderedElement(): HTMLElement {
    if (this.render == null) {
      this.resetRenderedElement();
      this.renderedElement = this;
      return this;
    }

    if (this.renderedElement && this.renderedElement !== this && this.contains(this.renderedElement)) {
      return this.renderedElement;
    }

    const contentNodes =
      this.renderedElement && this.renderedElement !== this
        ? Array.from(this.renderedElement.childNodes)
        : Array.from(this.childNodes).filter((node) => node !== this.renderedElement);
    const renderProps: AvatarRootRenderProps = {};
    const template =
      typeof this.render === 'function' ? this.render(renderProps, this.getState()) : this.render;
    const nextRoot = materializeTemplateRoot(template);

    this.style.display = 'contents';
    if (nextRoot !== this) {
      this.replaceChildren(nextRoot);
      nextRoot.append(...contentNodes);
    } else {
      this.resetRenderedElement();
    }

    this.renderedElement = nextRoot;
    return nextRoot;
  }

  private resetRenderedElement() {
    if (this.renderedElement == null || this.renderedElement === this) {
      return;
    }

    const contentNodes = Array.from(this.renderedElement.childNodes);
    this.replaceChildren(...contentNodes);
    this.renderedElement = null;
  }
}

if (!customElements.get('avatar-root')) {
  customElements.define('avatar-root', AvatarRootElement);
}

// ─── AvatarImageElement ──────────────────────────────────────────────────────────

/**
 * The image to be displayed in the avatar.
 * Renders an `<avatar-image>` custom element.
 */
export class AvatarImageElement extends BaseHTMLElement {
  static get observedAttributes() {
    return ['src', 'alt', 'crossorigin', 'referrerpolicy', 'width', 'height'];
  }

  private rootElement: AvatarRootElement | null = null;
  private cleanupImageLoad: (() => void) | null = null;
  private loadingSourceKey: string | null = null;
  private statusHandler = () => this.syncVisibility();
  private imgElement: HTMLImageElement | null = null;
  render: AvatarImageRenderProp | undefined;
  private renderedElement: HTMLElement | null = null;

  /** Callback fired when the loading status changes. Set via `.onLoadingStatusChange=${fn}`. */
  onLoadingStatusChange: ((status: ImageLoadingStatus) => void) | undefined;

  connectedCallback() {
    if (!this.attachRoot()) {
      queueMicrotask(() => {
        if (!this.isConnected || this.rootElement) {
          return;
        }

        if (!this.attachRoot()) {
          console.error(CONTEXT_ERROR);
        }
      });
    }
  }

  disconnectedCallback() {
    this.cleanupImageLoad?.();
    this.cleanupImageLoad = null;
    this.loadingSourceKey = null;
    this.removeImgElement();
    this.rootElement?.removeEventListener(STATUS_CHANGE_EVENT, this.statusHandler);
    this.rootElement = null;
    this.resetRenderedElement();
  }

  attributeChangedCallback(name: string) {
    if (this.rootElement) {
      if (name === 'alt' || name === 'width' || name === 'height') {
        if (this.imgElement) {
          this.ensureImgElement();
        }
        return;
      }

      this.syncImageLoading();
    }
  }

  private syncImageLoading() {
    const src = this.getAttribute('src') || '';
    const referrerPolicy = this.getAttribute('referrerpolicy') || '';
    const crossOrigin = this.getAttribute('crossorigin');
    const sourceKey = `${src}::${referrerPolicy}::${crossOrigin ?? ''}`;

    if (sourceKey === this.loadingSourceKey) {
      return;
    }

    this.loadingSourceKey = sourceKey;

    this.cleanupImageLoad?.();
    this.cleanupImageLoad = null;

    if (!src) {
      this.updateStatus('error');
      return;
    }

    this.updateStatus('loading');

    let active = true;
    const image = new Image();

    image.onload = () => {
      if (!active) {
        return;
      }

      this.updateStatus('loaded');
    };

    image.onerror = () => {
      if (!active) {
        return;
      }

      this.updateStatus('error');
    };

    if (referrerPolicy) {
      image.referrerPolicy = referrerPolicy as ReferrerPolicy;
    }
    image.crossOrigin = crossOrigin;
    image.src = src;

    this.cleanupImageLoad = () => {
      active = false;
    };
  }

  private updateStatus(status: ImageLoadingStatus) {
    this.onLoadingStatusChange?.(status);
    this.rootElement?.setImageLoadingStatus(status);
    this.syncVisibility();
  }

  private syncVisibility() {
    const status = this.rootElement?.getImageLoadingStatus() ?? 'idle';
    const target = this.ensureRenderedElement(status);
    if (status === 'loaded') {
      target.style.display = '';
      target.removeAttribute('hidden');
      this.ensureImgElement();
    } else {
      target.style.display = 'none';
      target.setAttribute('hidden', '');
      this.removeImgElement();
    }
  }

  private ensureImgElement() {
    const container = this.ensureRenderedElement(this.rootElement?.getImageLoadingStatus() ?? 'idle');
    if (!this.imgElement) {
      this.imgElement =
        container instanceof HTMLImageElement ? container : document.createElement('img');
      if (!(container instanceof HTMLImageElement)) {
        this.imgElement.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
        container.appendChild(this.imgElement);
      }
    }
    const src = this.getAttribute('src');
    if (src) {
      this.imgElement.src = src;
    } else {
      this.imgElement.removeAttribute('src');
    }

    const alt = this.getAttribute('alt');
    if (alt != null) {
      this.imgElement.alt = alt;
    } else {
      this.imgElement.removeAttribute('alt');
    }

    const width = this.getAttribute('width');
    if (width != null) {
      this.imgElement.width = Number(width);
    } else {
      this.imgElement.removeAttribute('width');
    }

    const height = this.getAttribute('height');
    if (height != null) {
      this.imgElement.height = Number(height);
    } else {
      this.imgElement.removeAttribute('height');
    }

    const crossorigin = this.getAttribute('crossorigin');
    if (crossorigin != null) {
      this.imgElement.crossOrigin = crossorigin;
    } else {
      this.imgElement.removeAttribute('crossorigin');
    }

    const referrerpolicy = this.getAttribute('referrerpolicy');
    if (referrerpolicy != null) {
      this.imgElement.referrerPolicy = referrerpolicy;
    } else {
      this.imgElement.removeAttribute('referrerpolicy');
    }
  }

  private removeImgElement() {
    if (this.imgElement) {
      if (this.imgElement !== this.renderedElement) {
        this.imgElement.remove();
      }
      this.imgElement = null;
    }
  }

  private attachRoot() {
    this.rootElement = this.closest('avatar-root') as AvatarRootElement | null;
    if (!this.rootElement) {
      return false;
    }

    this.rootElement.addEventListener(STATUS_CHANGE_EVENT, this.statusHandler);
    this.syncImageLoading();
    this.syncVisibility();
    return true;
  }

  private ensureRenderedElement(status: ImageLoadingStatus): HTMLElement {
    if (this.render == null) {
      this.resetRenderedElement();
      this.renderedElement = this;
      return this;
    }

    if (this.renderedElement && this.renderedElement !== this && this.contains(this.renderedElement)) {
      return this.renderedElement;
    }

    const contentNodes =
      this.renderedElement && this.renderedElement !== this
        ? Array.from(this.renderedElement.childNodes).filter((node) => node !== this.imgElement)
        : Array.from(this.childNodes).filter((node) => node !== this.renderedElement && node !== this.imgElement);
    const state: AvatarImageState = { imageLoadingStatus: status };
    const renderProps: AvatarImageRenderProps = {};
    const template =
      typeof this.render === 'function' ? this.render(renderProps, state) : this.render;
    const nextRoot = materializeTemplateRoot(template);

    this.style.display = 'contents';
    if (nextRoot !== this) {
      this.replaceChildren(nextRoot);
      nextRoot.append(...contentNodes);
    } else {
      this.resetRenderedElement();
    }

    if (this.imgElement && this.imgElement !== nextRoot && !nextRoot.contains(this.imgElement)) {
      nextRoot.append(this.imgElement);
    }

    this.renderedElement = nextRoot;
    return nextRoot;
  }

  private resetRenderedElement() {
    if (this.renderedElement == null || this.renderedElement === this) {
      return;
    }

    const contentNodes = Array.from(this.renderedElement.childNodes).filter(
      (node) => node !== this.imgElement,
    );
    this.replaceChildren(...contentNodes);
    if (this.imgElement && this.imgElement !== this.renderedElement) {
      this.appendChild(this.imgElement);
    }
    this.renderedElement = null;
  }
}

if (!customElements.get('avatar-image')) {
  customElements.define('avatar-image', AvatarImageElement);
}

// ─── AvatarFallbackElement ───────────────────────────────────────────────────────

/**
 * Rendered when the image fails to load or when no image is provided.
 * Renders an `<avatar-fallback>` custom element.
 */
export class AvatarFallbackElement extends BaseHTMLElement {
  static get observedAttributes() {
    return ['delay'];
  }

  private rootElement: AvatarRootElement | null = null;
  private delayPassed = true;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private statusHandler = () => this.syncVisibility();
  render: AvatarFallbackRenderProp | undefined;
  private renderedElement: HTMLElement | null = null;

  connectedCallback() {
    if (!this.attachRoot()) {
      queueMicrotask(() => {
        if (!this.isConnected || this.rootElement) {
          return;
        }

        if (!this.attachRoot()) {
          console.error(CONTEXT_ERROR);
        }
      });
    }
  }

  disconnectedCallback() {
    this.clearDelay();
    this.rootElement?.removeEventListener(STATUS_CHANGE_EVENT, this.statusHandler);
    this.rootElement = null;
    this.resetRenderedElement();
  }

  attributeChangedCallback() {
    if (!this.rootElement) {
      return;
    }

    this.syncDelay();
    this.syncVisibility();
  }

  private getDelay(): number | undefined {
    const attr = this.getAttribute('delay');
    if (attr == null) {
      return undefined;
    }

    const num = Number(attr);
    return Number.isFinite(num) ? num : undefined;
  }

  private startDelay(delay: number) {
    this.clearDelay();
    this.timeoutId = setTimeout(() => {
      this.timeoutId = null;
      this.delayPassed = true;
      this.syncVisibility();
    }, delay);
  }

  private clearDelay() {
    if (this.timeoutId != null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  private syncDelay() {
    const delay = this.getDelay();

    if (delay === undefined) {
      this.clearDelay();
      this.delayPassed = true;
      return;
    }

    this.delayPassed = false;
    this.startDelay(delay);
  }

  private syncVisibility() {
    const status = this.rootElement?.getImageLoadingStatus() ?? 'idle';
    const target = this.ensureRenderedElement(status);

    if (status === 'loaded' || !this.delayPassed) {
      target.style.display = 'none';
      target.setAttribute('hidden', '');
    } else {
      target.style.display = '';
      target.removeAttribute('hidden');
    }
  }

  private attachRoot() {
    this.rootElement = this.closest('avatar-root') as AvatarRootElement | null;
    if (!this.rootElement) {
      return false;
    }

    this.rootElement.addEventListener(STATUS_CHANGE_EVENT, this.statusHandler);
    this.syncDelay();
    this.syncVisibility();
    return true;
  }

  private ensureRenderedElement(status: ImageLoadingStatus): HTMLElement {
    if (this.render == null) {
      this.resetRenderedElement();
      this.renderedElement = this;
      return this;
    }

    if (this.renderedElement && this.renderedElement !== this && this.contains(this.renderedElement)) {
      return this.renderedElement;
    }

    const contentNodes =
      this.renderedElement && this.renderedElement !== this
        ? Array.from(this.renderedElement.childNodes)
        : Array.from(this.childNodes).filter((node) => node !== this.renderedElement);
    const state: AvatarFallbackState = { imageLoadingStatus: status };
    const renderProps: AvatarFallbackRenderProps = {};
    const template =
      typeof this.render === 'function' ? this.render(renderProps, state) : this.render;
    const nextRoot = materializeTemplateRoot(template);

    this.style.display = 'contents';
    if (nextRoot !== this) {
      this.replaceChildren(nextRoot);
      nextRoot.append(...contentNodes);
    } else {
      this.resetRenderedElement();
    }

    this.renderedElement = nextRoot;
    return nextRoot;
  }

  private resetRenderedElement() {
    if (this.renderedElement == null || this.renderedElement === this) {
      return;
    }

    const contentNodes = Array.from(this.renderedElement.childNodes);
    this.replaceChildren(...contentNodes);
    this.renderedElement = null;
  }
}

if (!customElements.get('avatar-fallback')) {
  customElements.define('avatar-fallback', AvatarFallbackElement);
}

export const Avatar = {
  Root: AvatarRootElement,
  Image: AvatarImageElement,
  Fallback: AvatarFallbackElement,
} as const;

function materializeTemplateRoot(template: TemplateResult): HTMLElement {
  const container = document.createElement('div');
  renderTemplate(template, container);

  return (
    Array.from(container.children).find((child): child is HTMLElement => child instanceof HTMLElement) ??
    container
  );
}

// ─── Namespace exports ──────────────────────────────────────────────────────────

export namespace AvatarRoot {
  export type Props = AvatarRootProps;
  export type State = AvatarRootState;
}

export namespace AvatarImage {
  export type Props = AvatarImageProps;
  export type State = AvatarImageState;
}

export namespace AvatarFallback {
  export type Props = AvatarFallbackProps;
  export type State = AvatarFallbackState;
}

// ─── Global type declarations ───────────────────────────────────────────────────

declare global {
  interface HTMLElementTagNameMap {
    'avatar-root': AvatarRootElement;
    'avatar-image': AvatarImageElement;
    'avatar-fallback': AvatarFallbackElement;
  }
}
