import { ReactiveElement } from 'lit';
import { BaseHTMLElement, ensureId } from '../utils/index.ts';
import {
  FIELDSET_CONTEXT_ATTRIBUTE,
  FIELDSET_CONTEXT_ERROR,
  FIELDSET_LEGEND_ID_ATTRIBUTE,
  FIELDSET_ROOT_ATTRIBUTE,
  FIELDSET_STATE_CHANGE_EVENT,
  getClosestFieldsetRoot,
  setFieldsetRuntime,
  type FieldsetContext,
  type FieldsetRuntime,
} from './shared.ts';

// ─── Constants ──────────────────────────────────────────────────────────────────

const FIELDSET_LEGEND_ATTRIBUTE = 'data-base-ui-fieldset-legend';

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface FieldsetRootState {
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
}

export interface FieldsetLegendState {
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
}

// ─── FieldsetRootElement ─────────────────────────────────────────────────────────

/**
 * Groups a shared legend with related controls.
 * Renders a `<fieldset-root>` custom element.
 *
 * Documentation: [Base UI Fieldset](https://base-ui.com/react/components/fieldset)
 */
export class FieldsetRootElement extends ReactiveElement implements FieldsetRuntime {
  static properties = {
    disabled: { type: Boolean },
  };

  declare disabled: boolean;

  private _legendId: string | undefined;
  private _lastPublishedStateKey: string | null = null;

  constructor() {
    super();
    this.disabled = false;
  }

  override createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();

    this.setAttribute(FIELDSET_ROOT_ATTRIBUTE, '');
    this.setAttribute(FIELDSET_CONTEXT_ATTRIBUTE, '');
    setFieldsetRuntime(this, this);
    this.syncAttributes();

    queueMicrotask(() => {
      this._syncLegendFromDom();
      this._publishStateChange();
    });
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    setFieldsetRuntime(this, null);
    this._lastPublishedStateKey = null;
  }

  protected override updated() {
    this.syncAttributes();
    this._publishStateChange();
  }

  getContext(): FieldsetContext {
    return {
      disabled: this.disabled,
      legendId: this._legendId,
    };
  }

  setLegendId(id: string | undefined) {
    if (this._legendId === id) return;

    this._legendId = id;
    this.syncAttributes();
    this._publishStateChange();
  }

  getState(): FieldsetRootState {
    return {
      disabled: this.disabled,
    };
  }

  private syncAttributes() {
    this.toggleAttribute('data-disabled', this.disabled);

    if (this._legendId) {
      this.setAttribute(FIELDSET_LEGEND_ID_ATTRIBUTE, this._legendId);
      this.setAttribute('aria-labelledby', this._legendId);
    } else {
      this.removeAttribute(FIELDSET_LEGEND_ID_ATTRIBUTE);
      this.removeAttribute('aria-labelledby');
    }
  }

  private _publishStateChange() {
    const nextStateKey = JSON.stringify(this.getContext());

    if (nextStateKey === this._lastPublishedStateKey) return;

    this._lastPublishedStateKey = nextStateKey;
    this.dispatchEvent(new CustomEvent(FIELDSET_STATE_CHANGE_EVENT));
  }

  private _syncLegendFromDom() {
    const legends = this.querySelectorAll<HTMLElement>(`[${FIELDSET_LEGEND_ATTRIBUTE}]`);
    const nextLegendId =
      Array.from(legends).find(
        (legend) => getClosestFieldsetRoot(legend) === this,
      )?.id ?? undefined;

    if (this._legendId === nextLegendId) return;

    this._legendId = nextLegendId;
    this.syncAttributes();
  }
}

if (!customElements.get('fieldset-root')) {
  customElements.define('fieldset-root', FieldsetRootElement);
}

// ─── FieldsetLegendElement ───────────────────────────────────────────────────────

/**
 * An accessible label that is automatically associated with the fieldset.
 * Renders a `<fieldset-legend>` custom element.
 *
 * Documentation: [Base UI Fieldset](https://base-ui.com/react/components/fieldset)
 */
export class FieldsetLegendElement extends BaseHTMLElement {
  private _root: FieldsetRootElement | null = null;
  private _handler = () => this._syncDataAttributes();

  connectedCallback() {
    const root = getClosestFieldsetRoot(this);
    if (!root) {
      console.error(FIELDSET_CONTEXT_ERROR);
      return;
    }

    this._root = root as FieldsetRootElement;
    this.setAttribute(FIELDSET_LEGEND_ATTRIBUTE, '');

    // Auto-generate an ID if none exists
    ensureId(this, 'base-ui-fieldset-legend');

    // Register legend ID with the root
    if (this._root && 'setLegendId' in this._root) {
      (this._root as FieldsetRootElement).setLegendId(this.id);
    }

    this._root.addEventListener(FIELDSET_STATE_CHANGE_EVENT, this._handler);
    this._syncDataAttributes();
  }

  disconnectedCallback() {
    this._root?.removeEventListener(FIELDSET_STATE_CHANGE_EVENT, this._handler);

    // Unregister legend ID
    if (this._root && 'setLegendId' in this._root) {
      (this._root as FieldsetRootElement).setLegendId(undefined);
    }

    this._root = null;
  }

  private _syncDataAttributes() {
    if (!this._root) return;
    const context = this._root.getContext();
    this.toggleAttribute('data-disabled', context.disabled);
  }
}

if (!customElements.get('fieldset-legend')) {
  customElements.define('fieldset-legend', FieldsetLegendElement);
}

// ─── Namespace exports ──────────────────────────────────────────────────────────

export namespace FieldsetRoot {
  export type State = FieldsetRootState;
}

export namespace FieldsetLegend {
  export type State = FieldsetLegendState;
}

// ─── Global type declarations ───────────────────────────────────────────────────

declare global {
  interface HTMLElementTagNameMap {
    'fieldset-root': FieldsetRootElement;
    'fieldset-legend': FieldsetLegendElement;
  }
}
