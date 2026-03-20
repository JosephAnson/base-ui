import { html, noChange, nothing, type TemplateResult } from 'lit';
// eslint-disable-next-line import/extensions
import { AsyncDirective, directive } from 'lit/async-directive.js';
/* eslint-disable import/extensions */
import { useRender } from '../use-render/index.ts';
import {
  FIELDSET_CONTEXT_ERROR,
  FIELDSET_CONTEXT_ATTRIBUTE,
  FIELDSET_LEGEND_ID_ATTRIBUTE,
  FIELDSET_ROOT_ATTRIBUTE,
  FIELDSET_STATE_CHANGE_EVENT,
  getClosestFieldsetRoot,
  getFieldsetContextOrNull,
  setFieldsetRuntime,
  type FieldsetContext,
  type FieldsetRuntime,
} from './shared.ts';
/* eslint-enable import/extensions */

let generatedLegendId = 0;
const FIELDSET_LEGEND_ATTRIBUTE = 'data-base-ui-fieldset-legend';

type ComponentPropsWithChildren<
  ElementType extends keyof HTMLElementTagNameMap,
  State,
  Children = unknown,
> = Omit<useRender.ComponentProps<ElementType, State>, 'children' | 'render'> & {
  children?: Children | undefined;
  render?: useRender.RenderProp<State> | undefined;
};

class FieldsetRootDirective extends AsyncDirective implements FieldsetRuntime {
  private latestProps: FieldsetRootProps | null = null;
  private root: HTMLElement | null = null;
  private legendId: string | undefined = undefined;
  private lastPublishedStateKey: string | null = null;

  render(_componentProps: FieldsetRootProps) {
    return noChange;
  }

  override update(
    _part: Parameters<AsyncDirective['update']>[0],
    [componentProps]: [FieldsetRootProps],
  ) {
    this.latestProps = componentProps;
    const result = this.renderCurrent();
    queueMicrotask(() => {
      this.syncLegendFromDom();
      this.publishStateChange();
    });
    return result;
  }

  override disconnected() {
    setFieldsetRuntime(this.root, null);
    this.root = null;
    this.lastPublishedStateKey = null;
  }

  override reconnected() {}

  getContext(): FieldsetContext {
    return {
      disabled: Boolean(this.latestProps?.disabled),
      legendId: this.legendId,
    };
  }

  setLegendId(id: string | undefined) {
    if (this.legendId === id) {
      return;
    }

    this.legendId = id;
    this.syncRootAttributes();
    this.publishStateChange();
  }

  private renderCurrent() {
    if (this.latestProps == null) {
      return nothing;
    }

    const { children, disabled = false, render, ...elementProps } = this.latestProps;
    const state: FieldsetRootState = {
      disabled,
    };
    const ariaLabelledBy = (elementProps['aria-labelledby'] as string | undefined) ?? this.legendId;

    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useRender<FieldsetRootState, HTMLElement>({
      defaultTagName: 'fieldset',
      render,
      ref: this.handleRootRef,
      state,
      props: {
        [FIELDSET_ROOT_ATTRIBUTE]: '',
        [FIELDSET_CONTEXT_ATTRIBUTE]: '',
        [FIELDSET_LEGEND_ID_ATTRIBUTE]: this.legendId,
        'aria-labelledby': ariaLabelledBy,
        ...(children === undefined ? elementProps : { ...elementProps, children }),
      },
    });
  }

  private handleRootRef = (element: HTMLElement | null) => {
    if (this.root === element) {
      return;
    }

    setFieldsetRuntime(this.root, null);
    this.root = element;
    setFieldsetRuntime(element, this);
    this.syncRootAttributes();
    queueMicrotask(() => {
      this.syncLegendFromDom();
      this.publishStateChange();
    });
  };

  private syncRootAttributes() {
    if (this.root == null) {
      return;
    }

    if (this.legendId == null) {
      this.root.removeAttribute(FIELDSET_LEGEND_ID_ATTRIBUTE);
    } else {
      this.root.setAttribute(FIELDSET_LEGEND_ID_ATTRIBUTE, this.legendId);
    }

    if (this.latestProps?.['aria-labelledby'] != null) {
      return;
    }

    if (this.legendId == null) {
      this.root.removeAttribute('aria-labelledby');
    } else {
      this.root.setAttribute('aria-labelledby', this.legendId);
    }
  }

  private publishStateChange() {
    if (this.root == null) {
      return;
    }

    const nextStateKey = JSON.stringify(this.getContext());

    if (nextStateKey === this.lastPublishedStateKey) {
      return;
    }

    this.lastPublishedStateKey = nextStateKey;
    this.root.dispatchEvent(new CustomEvent(FIELDSET_STATE_CHANGE_EVENT));
  }

  private syncLegendFromDom() {
    if (this.root == null) {
      return;
    }

    const nextLegendId =
      Array.from(this.root.querySelectorAll<HTMLElement>(`[${FIELDSET_LEGEND_ATTRIBUTE}]`)).find(
        (legend) => getClosestFieldsetRoot(legend) === this.root,
      )?.id ?? undefined;

    if (this.legendId === nextLegendId) {
      return;
    }

    this.legendId = nextLegendId;
    this.syncRootAttributes();
  }
}

class FieldsetLegendDirective extends AsyncDirective {
  private generatedId = `base-ui-fieldset-legend-${(generatedLegendId += 1)}`;

  render(_componentProps: FieldsetLegendProps) {
    return noChange;
  }

  override update(
    part: Parameters<AsyncDirective['update']>[0],
    [componentProps]: [FieldsetLegendProps],
  ) {
    const { id: idProp, render, ...elementProps } = componentProps;
    const context = getFieldsetContextOrNull(part);
    const id = idProp ?? this.generatedId;

    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useRender<FieldsetLegendState, HTMLDivElement>({
      defaultTagName: 'div',
      render,
      ref: this.handleLegendRef,
      state: {
        disabled: context?.disabled ?? false,
      },
      props: {
        [FIELDSET_LEGEND_ATTRIBUTE]: '',
        id,
        ...elementProps,
      },
    });
  }

  override disconnected() {}

  override reconnected() {}

  private handleLegendRef = (element: HTMLDivElement | null) => {
    if (element != null && getClosestFieldsetRoot(element) == null) {
      throw new Error(FIELDSET_CONTEXT_ERROR);
    }
  };
}

const fieldsetRootDirective = directive(FieldsetRootDirective);
const fieldsetLegendDirective = directive(FieldsetLegendDirective);

/**
 * Groups a shared legend with related controls.
 * Renders a `<fieldset>` element.
 *
 * Documentation: [Base UI Fieldset](https://base-ui.com/react/components/fieldset)
 */
export function FieldsetRoot(componentProps: FieldsetRoot.Props): TemplateResult {
  return html`${fieldsetRootDirective(componentProps)}`;
}

/**
 * An accessible label that is automatically associated with the fieldset.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Fieldset](https://base-ui.com/react/components/fieldset)
 */
export function FieldsetLegend(componentProps: FieldsetLegend.Props): TemplateResult {
  return html`${fieldsetLegendDirective(componentProps)}`;
}

export interface FieldsetRootState {
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
}

export interface FieldsetRootProps extends ComponentPropsWithChildren<
  'fieldset',
  FieldsetRootState
> {
  disabled?: boolean | undefined;
}

export interface FieldsetLegendState {
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
}

export interface FieldsetLegendProps extends ComponentPropsWithChildren<
  'div',
  FieldsetLegendState
> {
  id?: string | undefined;
}

export namespace FieldsetRoot {
  export type Props = FieldsetRootProps;
  export type State = FieldsetRootState;
}

export namespace FieldsetLegend {
  export type Props = FieldsetLegendProps;
  export type State = FieldsetLegendState;
}

export const Fieldset = {
  Root: FieldsetRoot,
  Legend: FieldsetLegend,
} as const;
