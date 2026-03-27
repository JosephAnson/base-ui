import type { TemplateResult } from 'lit';
import type { HTMLProps } from '@base-ui/lit/types';

type RefObject<T> = {
  current: T | null;
};

type RefCallback<T> = (instance: T | null) => void;

type Ref<T> = RefCallback<T> | RefObject<T> | null | undefined;

type IntrinsicElementTagName = keyof HTMLElementTagNameMap | keyof SVGElementTagNameMap;

type IntrinsicElementForTag<ElementType> = ElementType extends keyof HTMLElementTagNameMap
  ? HTMLElementTagNameMap[ElementType]
  : ElementType extends keyof SVGElementTagNameMap
    ? SVGElementTagNameMap[ElementType]
    : Element;

/**
 * Shape of the render prop: a function that takes props to be spread on the
 * element and component state and returns a Lit template.
 */
export type ComponentRenderFn<Props = HTMLProps, State = {}> = (
  props: Props,
  state: State,
) => TemplateResult;

export type UseRenderRenderProp<State = {}> = TemplateResult | ComponentRenderFn<HTMLProps, State>;

export type UseRenderElementProps<ElementType extends IntrinsicElementTagName> = HTMLProps<
  IntrinsicElementForTag<ElementType>
>;

export type UseRenderComponentProps<
  ElementType extends IntrinsicElementTagName,
  State = {},
  RenderFunctionProps = HTMLProps,
> = HTMLProps<IntrinsicElementForTag<ElementType>> & {
  /**
   * Allows you to replace the component's HTML element
   * with a different tag, or compose it with a template that has a single root element.
   *
   * Accepts a `TemplateResult` or a function that returns the template to render.
   */
  render?: TemplateResult | ComponentRenderFn<RenderFunctionProps, State> | undefined;
};

export type StateAttributesMapping<State> = {
  [Property in keyof State]?: (state: State[Property]) => Record<string, string> | null;
};

export interface UseRenderParameters<
  State,
  RenderedElementType extends Element,
  Enabled extends boolean | undefined,
> {
  /**
   * The template or render callback used to override the default element.
   * Static templates must resolve to exactly one root element.
   * Render callbacks receive the merged `props` and `state`, and must apply them manually.
   */
  render?: TemplateResult | ComponentRenderFn<HTMLProps, State> | undefined;
  /**
   * The ref to apply to the rendered element.
   * Render callbacks receive it in the `props` bag and must apply it manually.
   */
  ref?: Ref<RenderedElementType> | Ref<RenderedElementType>[] | undefined;
  /**
   * The state of the component, passed as the second argument to the `render` callback.
   * State properties are automatically converted to data-* attributes.
   */
  state?: State | undefined;
  /**
   * Custom mapping for converting state properties to data-* attributes.
   * @example
   * { isActive: (value) => (value ? { 'data-is-active': '' } : null) }
   */
  stateAttributesMapping?: StateAttributesMapping<State> | undefined;
  /**
   * Props to be applied to the rendered element.
   * Internal state-based attributes are merged first and explicit props override them.
   * Static templates keep template-authored attributes, styles, and property bindings.
   * Render callbacks receive the merged props bag and must spread or apply it manually.
   */
  props?: Record<string, unknown> | undefined;
  /**
   * If `false`, the hook will skip most of its internal logic and return `null`.
   * This is useful for rendering a component conditionally.
   * @default true
   */
  enabled?: Enabled | undefined;
  /**
   * The default tag name to use for the rendered element when `render` is not provided.
   * @default 'div'
   */
  defaultTagName?: IntrinsicElementTagName | undefined;
}

export type UseRenderReturnValue<Enabled extends boolean | undefined> = Enabled extends false
  ? null
  : TemplateResult;

export interface UseRenderState {}

/**
 * Renders a Base UI element.
 */
export function useRender<
  State extends Record<string, unknown>,
  RenderedElementType extends Element,
  Enabled extends boolean | undefined = undefined,
>(
  _params: useRender.Parameters<State, RenderedElementType, Enabled>,
): useRender.ReturnValue<Enabled> {
  return null as useRender.ReturnValue<Enabled>;
}

export namespace useRender {
  export type State = UseRenderState;
  export type RenderProp<TState = {}> = UseRenderRenderProp<TState>;

  export type ElementProps<ElementType extends IntrinsicElementTagName> =
    UseRenderElementProps<ElementType>;

  export type ComponentProps<
    ElementType extends IntrinsicElementTagName,
    TState = {},
    RenderFunctionProps = HTMLProps,
  > = UseRenderComponentProps<ElementType, TState, RenderFunctionProps>;

  export type Parameters<
    TState,
    RenderedElementType extends Element,
    Enabled extends boolean | undefined,
  > = UseRenderParameters<TState, RenderedElementType, Enabled>;

  export type ReturnValue<Enabled extends boolean | undefined> = UseRenderReturnValue<Enabled>;
}
