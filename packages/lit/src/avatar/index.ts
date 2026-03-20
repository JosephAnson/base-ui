import { ReactiveElement } from 'lit';
import { BaseHTMLElement } from '../utils/index.ts';

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

// ─── AvatarRootElement ───────────────────────────────────────────────────────────

/**
 * Displays a user's profile picture, initials, or fallback icon.
 * Renders an `<avatar-root>` custom element.
 *
 * Documentation: [Base UI Avatar](https://base-ui.com/react/components/avatar)
 */
export class AvatarRootElement extends ReactiveElement {
  private _imageLoadingStatus: ImageLoadingStatus = 'idle';

  override createRenderRoot() {
    return this;
  }

  getImageLoadingStatus(): ImageLoadingStatus {
    return this._imageLoadingStatus;
  }

  setImageLoadingStatus(status: ImageLoadingStatus) {
    if (this._imageLoadingStatus === status) return;
    this._imageLoadingStatus = status;
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

  private _root: AvatarRootElement | null = null;
  private _cleanupImageLoad: (() => void) | null = null;
  private _loadingSourceKey: string | null = null;
  private _statusHandler = () => this._syncVisibility();
  private _imgEl: HTMLImageElement | null = null;

  /** Callback fired when the loading status changes. Set via `.onLoadingStatusChange=${fn}`. */
  onLoadingStatusChange: ((status: ImageLoadingStatus) => void) | undefined;

  connectedCallback() {
    this._root = this.closest('avatar-root') as AvatarRootElement | null;
    if (!this._root) {
      console.error(CONTEXT_ERROR);
      return;
    }

    this._root.addEventListener(STATUS_CHANGE_EVENT, this._statusHandler);
    this._syncImageLoading();
    this._syncVisibility();
  }

  disconnectedCallback() {
    this._cleanupImageLoad?.();
    this._cleanupImageLoad = null;
    this._loadingSourceKey = null;
    this._removeImgElement();
    this._root?.removeEventListener(STATUS_CHANGE_EVENT, this._statusHandler);
    this._root = null;
  }

  attributeChangedCallback() {
    if (this._root) {
      this._syncImageLoading();
    }
  }

  private _syncImageLoading() {
    const src = this.getAttribute('src') || '';
    const referrerPolicy = this.getAttribute('referrerpolicy') || '';
    const crossOrigin = this.getAttribute('crossorigin');
    const sourceKey = `${src}::${referrerPolicy}::${crossOrigin ?? ''}`;

    if (sourceKey === this._loadingSourceKey) return;
    this._loadingSourceKey = sourceKey;

    this._cleanupImageLoad?.();
    this._cleanupImageLoad = null;

    if (!src) {
      this._updateStatus('error');
      return;
    }

    this._updateStatus('loading');

    let active = true;
    const image = new Image();

    image.onload = () => {
      if (!active) return;
      this._updateStatus('loaded');
    };

    image.onerror = () => {
      if (!active) return;
      this._updateStatus('error');
    };

    if (referrerPolicy) {
      image.referrerPolicy = referrerPolicy as ReferrerPolicy;
    }
    image.crossOrigin = crossOrigin;
    image.src = src;

    this._cleanupImageLoad = () => {
      active = false;
    };
  }

  private _updateStatus(status: ImageLoadingStatus) {
    this.onLoadingStatusChange?.(status);
    this._root?.setImageLoadingStatus(status);
    this._syncVisibility();
  }

  private _syncVisibility() {
    const status = this._root?.getImageLoadingStatus() ?? 'idle';
    if (status === 'loaded') {
      this.style.display = '';
      this.removeAttribute('hidden');
      this._ensureImgElement();
    } else {
      this.style.display = 'none';
      this.setAttribute('hidden', '');
      this._removeImgElement();
    }
  }

  private _ensureImgElement() {
    if (!this._imgEl) {
      this._imgEl = document.createElement('img');
      this._imgEl.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
      this.appendChild(this._imgEl);
    }
    const src = this.getAttribute('src');
    if (src) this._imgEl.src = src;
    else this._imgEl.removeAttribute('src');

    const alt = this.getAttribute('alt');
    if (alt != null) this._imgEl.alt = alt;
    else this._imgEl.removeAttribute('alt');

    const width = this.getAttribute('width');
    if (width != null) this._imgEl.width = Number(width);
    else this._imgEl.removeAttribute('width');

    const height = this.getAttribute('height');
    if (height != null) this._imgEl.height = Number(height);
    else this._imgEl.removeAttribute('height');

    const crossorigin = this.getAttribute('crossorigin');
    if (crossorigin != null) this._imgEl.crossOrigin = crossorigin;
    else this._imgEl.removeAttribute('crossorigin');

    const referrerpolicy = this.getAttribute('referrerpolicy');
    if (referrerpolicy != null) this._imgEl.referrerPolicy = referrerpolicy;
    else this._imgEl.removeAttribute('referrerpolicy');
  }

  private _removeImgElement() {
    if (this._imgEl) {
      this._imgEl.remove();
      this._imgEl = null;
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

  private _root: AvatarRootElement | null = null;
  private _delayPassed = true;
  private _timeoutId: ReturnType<typeof setTimeout> | null = null;
  private _statusHandler = () => this._syncVisibility();

  connectedCallback() {
    this._root = this.closest('avatar-root') as AvatarRootElement | null;
    if (!this._root) {
      console.error(CONTEXT_ERROR);
      return;
    }

    this._root.addEventListener(STATUS_CHANGE_EVENT, this._statusHandler);

    const delay = this._getDelay();
    if (delay !== undefined) {
      this._delayPassed = false;
      this._startDelay(delay);
    }

    this._syncVisibility();
  }

  disconnectedCallback() {
    this._clearDelay();
    this._root?.removeEventListener(STATUS_CHANGE_EVENT, this._statusHandler);
    this._root = null;
  }

  attributeChangedCallback() {
    // Delay changed — only relevant if we haven't passed it yet
  }

  private _getDelay(): number | undefined {
    const attr = this.getAttribute('delay');
    if (attr == null) return undefined;
    const num = Number(attr);
    return Number.isFinite(num) ? num : undefined;
  }

  private _startDelay(delay: number) {
    this._clearDelay();
    this._timeoutId = setTimeout(() => {
      this._timeoutId = null;
      this._delayPassed = true;
      this._syncVisibility();
    }, delay);
  }

  private _clearDelay() {
    if (this._timeoutId != null) {
      clearTimeout(this._timeoutId);
      this._timeoutId = null;
    }
  }

  private _syncVisibility() {
    const status = this._root?.getImageLoadingStatus() ?? 'idle';

    if (status === 'loaded' || !this._delayPassed) {
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

// ─── Namespace exports ──────────────────────────────────────────────────────────

export namespace AvatarRoot {
  export type State = AvatarRootState;
}

export namespace AvatarImage {
  export type State = AvatarImageState;
}

export namespace AvatarFallback {
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
