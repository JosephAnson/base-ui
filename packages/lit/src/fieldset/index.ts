import { ReactiveElement } from 'lit';
import { BaseHTMLElement, ensureId } from '../utils';
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
} from './shared';

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

export interface FieldsetRootProps {
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
}

export interface FieldsetLegendProps {}

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

  private legendIdValue: string | undefined;
  private lastPublishedStateKey: string | null = null;

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
      this.syncLegendFromDom();
      this.publishStateChange();
    });
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    setFieldsetRuntime(this, null);
    this.lastPublishedStateKey = null;
  }

  protected override updated() {
    this.syncAttributes();
    this.publishStateChange();
  }

  getContext(): FieldsetContext {
    return {
      disabled: this.disabled,
      legendId: this.legendIdValue,
    };
  }

  setLegendId(id: string | undefined) {
    if (this.legendIdValue === id) {
      return;
    }

    this.legendIdValue = id;
    this.syncAttributes();
    this.publishStateChange();
  }

  getState(): FieldsetRootState {
    return {
      disabled: this.disabled,
    };
  }

  private syncAttributes() {
    this.toggleAttribute('data-disabled', this.disabled);

    if (this.legendIdValue) {
      this.setAttribute(FIELDSET_LEGEND_ID_ATTRIBUTE, this.legendIdValue);
      this.setAttribute('aria-labelledby', this.legendIdValue);
    } else {
      this.removeAttribute(FIELDSET_LEGEND_ID_ATTRIBUTE);
      this.removeAttribute('aria-labelledby');
    }
  }

  private publishStateChange() {
    const nextStateKey = JSON.stringify(this.getContext());

    if (nextStateKey === this.lastPublishedStateKey) {
      return;
    }

    this.lastPublishedStateKey = nextStateKey;
    this.dispatchEvent(new CustomEvent(FIELDSET_STATE_CHANGE_EVENT));
  }

  private syncLegendFromDom() {
    const legends = this.querySelectorAll<HTMLElement>(`[${FIELDSET_LEGEND_ATTRIBUTE}]`);
    const nextLegendId =
      Array.from(legends).find((legend) => getClosestFieldsetRoot(legend) === this)?.id ??
      undefined;

    if (this.legendIdValue === nextLegendId) {
      return;
    }

    this.legendIdValue = nextLegendId;
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
  private rootElement: FieldsetRootElement | null = null;
  private stateHandler = () => this.syncDataAttributes();

  connectedCallback() {
    const root = getClosestFieldsetRoot(this);
    if (!root) {
      console.error(FIELDSET_CONTEXT_ERROR);
      return;
    }

    this.rootElement = root as FieldsetRootElement;
    this.setAttribute(FIELDSET_LEGEND_ATTRIBUTE, '');

    // Auto-generate an ID if none exists
    ensureId(this, 'base-ui-fieldset-legend');

    // Register legend ID with the root
    if (this.rootElement) {
      this.rootElement.setLegendId(this.id);
    }

    this.rootElement.addEventListener(FIELDSET_STATE_CHANGE_EVENT, this.stateHandler);
    this.syncDataAttributes();
  }

  disconnectedCallback() {
    this.rootElement?.removeEventListener(FIELDSET_STATE_CHANGE_EVENT, this.stateHandler);

    // Unregister legend ID
    if (this.rootElement) {
      this.rootElement.setLegendId(undefined);
    }

    this.rootElement = null;
  }

  private syncDataAttributes() {
    if (!this.rootElement) {
      return;
    }
    const context = this.rootElement.getContext();
    this.toggleAttribute('data-disabled', context.disabled);
  }
}

if (!customElements.get('fieldset-legend')) {
  customElements.define('fieldset-legend', FieldsetLegendElement);
}

export const Fieldset = {
  Root: FieldsetRootElement,
  Legend: FieldsetLegendElement,
} as const;

// ─── Namespace exports ──────────────────────────────────────────────────────────

export namespace FieldsetRoot {
  export type Props = FieldsetRootProps;
  export type State = FieldsetRootState;
}

export namespace FieldsetLegend {
  export type Props = FieldsetLegendProps;
  export type State = FieldsetLegendState;
}

// ─── Global type declarations ───────────────────────────────────────────────────

declare global {
  interface HTMLElementTagNameMap {
    'fieldset-root': FieldsetRootElement;
    'fieldset-legend': FieldsetLegendElement;
  }
}
