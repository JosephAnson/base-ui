import { ReactiveElement } from 'lit';
import { BaseHTMLElement } from '../utils';

// ─── Constants ──────────────────────────────────────────────────────────────────

const STATUS_CHANGE_EVENT = 'base-ui-avatar-status-change';
const CONTEXT_ERROR =
  'Base UI: AvatarRootContext is missing. Avatar parts must be placed within <avatar-root>.';

// ─── Types ──────────────────────────────────────────────────────────────────────

export type ImageLoadingStatus = 'idle' | 'loading' | 'loaded' | 'error';

export interface AvatarRootState {
  /**
   * The image loading status.
   */
  imageLoadingStatus: ImageLoadingStatus;
}

export interface AvatarImageState extends AvatarRootState {}
export interface AvatarFallbackState extends AvatarRootState {}

export interface AvatarRootProps {}

export interface AvatarImageProps {
  /**
   * Callback fired when the loading status changes.
   */
  onLoadingStatusChange?: ((status: ImageLoadingStatus) => void) | undefined;
}

export interface AvatarFallbackProps {
  /**
   * How long to wait before showing the fallback. Specified in milliseconds.
   */
  delay?: number | undefined;
}

// ─── AvatarRootElement ───────────────────────────────────────────────────────────

/**
 * Displays a user's profile picture, initials, or fallback icon.
 * Renders an `<avatar-root>` custom element.
 *
 * Documentation: [Base UI Avatar](https://base-ui.com/react/components/avatar)
 */
export class AvatarRootElement extends ReactiveElement {
  private imageLoadingStatusValue: ImageLoadingStatus = 'idle';

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

  /** Callback fired when the loading status changes. Set via `.onLoadingStatusChange=${fn}`. */
  onLoadingStatusChange: ((status: ImageLoadingStatus) => void) | undefined;

  connectedCallback() {
    this.rootElement = this.closest('avatar-root') as AvatarRootElement | null;
    if (!this.rootElement) {
      console.error(CONTEXT_ERROR);
      return;
    }

    this.rootElement.addEventListener(STATUS_CHANGE_EVENT, this.statusHandler);
    this.syncImageLoading();
    this.syncVisibility();
  }

  disconnectedCallback() {
    this.cleanupImageLoad?.();
    this.cleanupImageLoad = null;
    this.loadingSourceKey = null;
    this.removeImgElement();
    this.rootElement?.removeEventListener(STATUS_CHANGE_EVENT, this.statusHandler);
    this.rootElement = null;
  }

  attributeChangedCallback() {
    if (this.rootElement) {
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
    if (status === 'loaded') {
      this.style.display = '';
      this.removeAttribute('hidden');
      this.ensureImgElement();
    } else {
      this.style.display = 'none';
      this.setAttribute('hidden', '');
      this.removeImgElement();
    }
  }

  private ensureImgElement() {
    if (!this.imgElement) {
      this.imgElement = document.createElement('img');
      this.imgElement.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
      this.appendChild(this.imgElement);
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
      this.imgElement.remove();
      this.imgElement = null;
    }
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

  connectedCallback() {
    this.rootElement = this.closest('avatar-root') as AvatarRootElement | null;
    if (!this.rootElement) {
      console.error(CONTEXT_ERROR);
      return;
    }

    this.rootElement.addEventListener(STATUS_CHANGE_EVENT, this.statusHandler);

    const delay = this.getDelay();
    if (delay !== undefined) {
      this.delayPassed = false;
      this.startDelay(delay);
    }

    this.syncVisibility();
  }

  disconnectedCallback() {
    this.clearDelay();
    this.rootElement?.removeEventListener(STATUS_CHANGE_EVENT, this.statusHandler);
    this.rootElement = null;
  }

  attributeChangedCallback() {
    // Delay changed — only relevant if we haven't passed it yet
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

  private syncVisibility() {
    const status = this.rootElement?.getImageLoadingStatus() ?? 'idle';

    if (status === 'loaded' || !this.delayPassed) {
      this.style.display = 'none';
      this.setAttribute('hidden', '');
    } else {
      this.style.display = '';
      this.removeAttribute('hidden');
    }
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
