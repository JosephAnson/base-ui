import { ReactiveElement, nothing, render as renderTemplate, type TemplateResult } from 'lit';
import type { ComponentRenderFn, HTMLProps } from '../types';

export type Orientation = 'horizontal' | 'vertical';
type SeparatorRenderProps = HTMLProps<HTMLElement>;
type SeparatorRenderProp =
  | TemplateResult
  | ComponentRenderFn<SeparatorRenderProps, SeparatorRootState>;

/**
 * A separator element accessible to screen readers.
 * Renders a `<separator-root>` custom element.
 *
 * Documentation: [Base UI Separator](https://base-ui.com/react/components/separator)
 */
export class SeparatorRootElement extends ReactiveElement {
  static properties = {
    orientation: { type: String, reflect: true },
  };

  declare orientation: Orientation;
  render: SeparatorRenderProp | undefined;
  private renderedElement: HTMLElement | null = null;

  constructor() {
    super();
    this.orientation = 'horizontal';
  }

  override createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();
    this.syncAttributes();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    if (this.render != null) {
      renderTemplate(nothing, this);
      this.style.removeProperty('display');
      this.renderedElement = null;
    }
  }

  protected override updated() {
    this.syncAttributes();
  }

  private syncAttributes() {
    const state: SeparatorRootState = {
      orientation: this.orientation,
    };
    const element = this.ensureRenderedElement(state);

    this.removeAttribute('role');
    this.removeAttribute('aria-orientation');
    delete this.dataset.orientation;

    element.setAttribute('role', 'separator');
    element.setAttribute('aria-orientation', this.orientation);
    element.dataset.orientation = this.orientation;
  }

  private ensureRenderedElement(state: SeparatorRootState) {
    if (this.render == null) {
      this.style.removeProperty('display');
      if (this.renderedElement && this.renderedElement !== this) {
        renderTemplate(nothing, this);
      }
      this.renderedElement = this;
      return this;
    }

    const props: SeparatorRenderProps = {
      'aria-orientation': this.orientation,
      role: 'separator',
    };
    const template = typeof this.render === 'function' ? this.render(props, state) : this.render;

    this.style.display = 'contents';
    renderTemplate(template, this);

    const nextElement = Array.from(this.children).find(
      (child): child is HTMLElement => child instanceof HTMLElement,
    ) ?? this;
    this.renderedElement = nextElement;
    return nextElement;
  }
}

if (!customElements.get('separator-root')) {
  customElements.define('separator-root', SeparatorRootElement);
}

export interface SeparatorRootProps {
  /**
   * The orientation of the separator.
   * @default 'horizontal'
   */
  orientation?: Orientation | undefined;
  /**
   * Allows you to replace the separator's rendered element with a custom template.
   */
  render?: SeparatorRenderProp | undefined;
}

export interface SeparatorRootState {
  /**
   * The orientation of the separator.
   */
  orientation: Orientation;
}

export namespace SeparatorRoot {
  export type Props = SeparatorRootProps;
  export type State = SeparatorRootState;
}

declare global {
  interface HTMLElementTagNameMap {
    'separator-root': SeparatorRootElement;
  }
}
