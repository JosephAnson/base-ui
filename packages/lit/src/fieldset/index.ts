import { ReactiveElement, render as renderTemplate, type TemplateResult } from 'lit';
import type { ComponentRenderFn, HTMLProps } from '../types';
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
type FieldsetRootRenderProps = HTMLProps<HTMLElement>;
type FieldsetRootRenderProp =
  | TemplateResult
  | ComponentRenderFn<FieldsetRootRenderProps, FieldsetRootState>;
type FieldsetLegendRenderProps = HTMLProps<HTMLElement>;
type FieldsetLegendRenderProp =
  | TemplateResult
  | ComponentRenderFn<FieldsetLegendRenderProps, FieldsetLegendState>;

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
  /**
   * Allows you to replace the component's HTML element with a different tag,
   * or compose it with a template that has a single root element.
   * Accepts a `TemplateResult` or a function that returns the template to render.
   */
  render?: FieldsetRootRenderProp | undefined;
}

export interface FieldsetLegendProps {
  /**
   * Allows you to replace the component's HTML element with a different tag,
   * or compose it with a template that has a single root element.
   * Accepts a `TemplateResult` or a function that returns the template to render.
   */
  render?: FieldsetLegendRenderProp | undefined;
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
    render: { attribute: false },
  };

  declare disabled: boolean;
  declare render: FieldsetRootRenderProp | undefined;

  private legendIdValue: string | undefined;
  private lastPublishedStateKey: string | null = null;
  private renderedElement: HTMLElement | null = null;

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
    const root = this.ensureRenderedElement();

    this.removeAttribute('data-disabled');
    this.removeAttribute('aria-labelledby');
    root.toggleAttribute('data-disabled', this.disabled);

    if (this.legendIdValue) {
      this.setAttribute(FIELDSET_LEGEND_ID_ATTRIBUTE, this.legendIdValue);
      root.setAttribute('aria-labelledby', this.legendIdValue);
    } else {
      this.removeAttribute(FIELDSET_LEGEND_ID_ATTRIBUTE);
      root.removeAttribute('aria-labelledby');
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
    const renderProps: FieldsetRootRenderProps = {
      'aria-labelledby': this.legendIdValue,
    };
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
  render: FieldsetLegendRenderProp | undefined;
  private renderedElement: HTMLElement | null = null;

  connectedCallback() {
    if (!this.attachRoot()) {
      queueMicrotask(() => {
        if (!this.isConnected || this.rootElement) {
          return;
        }

        if (!this.attachRoot()) {
          console.error(FIELDSET_CONTEXT_ERROR);
        }
      });
    }
  }

  disconnectedCallback() {
    this.rootElement?.removeEventListener(FIELDSET_STATE_CHANGE_EVENT, this.stateHandler);

    // Unregister legend ID
    if (this.rootElement) {
      this.rootElement.setLegendId(undefined);
    }

    this.rootElement = null;
    this.resetRenderedElement();
  }

  private syncDataAttributes() {
    if (!this.rootElement) {
      return;
    }
    const context = this.rootElement.getContext();
    const legend = this.ensureRenderedElement(context.disabled);

    this.removeAttribute('data-disabled');
    legend.toggleAttribute('data-disabled', context.disabled);
  }

  private ensureRenderedElement(disabled: boolean): HTMLElement {
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
    const state: FieldsetLegendState = { disabled };
    const renderProps: FieldsetLegendRenderProps = {};
    const template = typeof this.render === 'function' ? this.render(renderProps, state) : this.render;
    const nextLegend = materializeTemplateRoot(template);

    this.style.display = 'contents';
    if (nextLegend !== this) {
      this.replaceChildren(nextLegend);
      nextLegend.append(...contentNodes);
    } else {
      this.resetRenderedElement();
    }

    this.renderedElement = nextLegend;
    return nextLegend;
  }

  private resetRenderedElement() {
    if (this.renderedElement == null || this.renderedElement === this) {
      return;
    }

    const contentNodes = Array.from(this.renderedElement.childNodes);
    this.replaceChildren(...contentNodes);
    this.renderedElement = null;
  }

  private attachRoot(): boolean {
    const root = getClosestFieldsetRoot(this);
    if (!root) {
      return false;
    }

    this.rootElement = root as FieldsetRootElement;
    this.setAttribute(FIELDSET_LEGEND_ATTRIBUTE, '');
    ensureId(this, 'base-ui-fieldset-legend');
    this.rootElement.setLegendId(this.id);
    this.rootElement.addEventListener(FIELDSET_STATE_CHANGE_EVENT, this.stateHandler);
    this.syncDataAttributes();
    return true;
  }
}

if (!customElements.get('fieldset-legend')) {
  customElements.define('fieldset-legend', FieldsetLegendElement);
}

export const Fieldset = {
  Root: FieldsetRootElement,
  Legend: FieldsetLegendElement,
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
