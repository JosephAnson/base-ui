import {
  html,
  noChange,
  nothing as litNothing,
  render as renderTemplate,
  type TemplateResult,
} from 'lit';
// eslint-disable-next-line import/extensions
import { AsyncDirective, directive } from 'lit/async-directive.js';
import type { HTMLProps, ComponentRenderFn } from '../types/index.ts';

export type { HTMLProps, ComponentRenderFn } from '../types/index.ts';

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

type RenderPayload = {
  defaultTagName: IntrinsicElementTagName;
  render: UseRenderRenderProp<any> | undefined;
  props: HTMLProps<any>;
  state: Record<string, unknown>;
};

const HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const EMPTY_SET = new Set<string>();
const SVG_TAG_NAMES = new Set<IntrinsicElementTagName>([
  'animate',
  'animateMotion',
  'animateTransform',
  'circle',
  'clipPath',
  'defs',
  'desc',
  'ellipse',
  'feBlend',
  'feColorMatrix',
  'feComponentTransfer',
  'feComposite',
  'feConvolveMatrix',
  'feDiffuseLighting',
  'feDisplacementMap',
  'feDistantLight',
  'feDropShadow',
  'feFlood',
  'feFuncA',
  'feFuncB',
  'feFuncG',
  'feFuncR',
  'feGaussianBlur',
  'feImage',
  'feMerge',
  'feMergeNode',
  'feMorphology',
  'feOffset',
  'fePointLight',
  'feSpecularLighting',
  'feSpotLight',
  'feTile',
  'feTurbulence',
  'filter',
  'foreignObject',
  'g',
  'image',
  'line',
  'linearGradient',
  'marker',
  'mask',
  'metadata',
  'mpath',
  'path',
  'pattern',
  'polygon',
  'polyline',
  'radialGradient',
  'rect',
  'set',
  'stop',
  'svg',
  'switch',
  'symbol',
  'text',
  'textPath',
  'tspan',
  'use',
  'view',
]);

/**
 * Renders a Base UI element.
 *
 * @public
 */
export function useRender<
  State extends object,
  RenderedElementType extends Element,
  Enabled extends boolean | undefined = undefined,
>(
  params: useRender.Parameters<State, RenderedElementType, Enabled>,
): useRender.ReturnValue<Enabled> {
  if (params.enabled === false) {
    return null as useRender.ReturnValue<Enabled>;
  }

  const state = (params.state ?? {}) as State;
  const props = resolveRenderProps(params);

  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  return html`${renderResolved({
    defaultTagName: params.defaultTagName ?? 'div',
    render: params.render as UseRenderRenderProp<any> | undefined,
    props: props as HTMLProps<Element>,
    state: state as Record<string, unknown>,
  })}` as useRender.ReturnValue<Enabled>;
}

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
  render?: UseRenderRenderProp<State> | undefined;
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

class RenderResolvedDirective extends AsyncDirective {
  private refCleanup: (() => void) | null = null;
  private defaultElement: Element | null = null;
  private defaultElementProps: HTMLProps<Element> | null = null;
  private defaultElementTagName: IntrinsicElementTagName | null = null;
  private staticTemplateRoot: Element | null = null;
  private staticTemplateBoundProperties: ReadonlySet<string> = EMPTY_SET;
  private staticTemplateHasRootEventBindings = false;

  render(_payload: RenderPayload) {
    return noChange;
  }

  override update(_part: Parameters<AsyncDirective['update']>[0], [payload]: [RenderPayload]) {
    if (typeof payload.render === 'function') {
      this.resetDefaultElement();
      this.clearRefs();
      this.resetStaticTemplateRoot();
      return payload.render(payload.props, payload.state);
    }

    if (payload.render != null) {
      this.resetDefaultElement();
      const fragment = materializeTemplate(payload.render);
      const rootElement = getSingleRootElement(fragment);
      const preservedProperties = getTemplateBoundPropertyNames(payload.render);
      const hasRootEventBindings = hasTemplateRootEventBindings(payload.render);
      const canReuseRoot = canReuseStaticTemplateRoot(
        this.staticTemplateRoot,
        rootElement,
        this.staticTemplateHasRootEventBindings,
        hasRootEventBindings,
      );

      this.clearRefs();

      if (canReuseRoot) {
        syncStaticTemplateRoot(this.staticTemplateRoot!, rootElement, {
          previousBoundProperties: this.staticTemplateBoundProperties,
          nextBoundProperties: preservedProperties,
        });

        this.refCleanup = applyProps(this.staticTemplateRoot!, payload.props, {
          preserveExisting: true,
          preservedProperties,
        });

        if (hasOwnProperty(payload.props, 'children')) {
          replaceChildren(this.staticTemplateRoot!, payload.props.children);
        }

        this.staticTemplateBoundProperties = preservedProperties;
        this.staticTemplateHasRootEventBindings = hasRootEventBindings;
        return this.staticTemplateRoot!;
      }

      this.refCleanup = applyProps(rootElement, payload.props, {
        preserveExisting: true,
        preservedProperties,
      });

      if (hasOwnProperty(payload.props, 'children')) {
        replaceChildren(rootElement, payload.props.children);
      }

      this.staticTemplateRoot = rootElement;
      this.staticTemplateBoundProperties = preservedProperties;
      this.staticTemplateHasRootEventBindings = hasRootEventBindings;
      return rootElement;
    }

    this.resetStaticTemplateRoot();
    const previousProps = this.defaultElementProps;
    const element = this.getOrCreateDefaultElement(payload.defaultTagName);

    if (previousProps != null) {
      clearAppliedProps(element, previousProps);
    }

    this.clearRefs();
    applyDefaultElementAttributes(element, payload.defaultTagName, payload.props);
    this.refCleanup = applyProps(element, payload.props);
    if (
      hasOwnProperty(payload.props, 'children') ||
      (previousProps != null && hasOwnProperty(previousProps, 'children'))
    ) {
      replaceChildren(element, payload.props.children);
    }

    this.defaultElementProps = payload.props;
    return element;
  }

  override disconnected() {
    this.resetDefaultElement();
    this.clearRefs();
    this.resetStaticTemplateRoot();
  }

  private clearRefs() {
    this.refCleanup?.();
    this.refCleanup = null;
  }

  private getOrCreateDefaultElement(tagName: IntrinsicElementTagName) {
    if (canReuseDefaultElement(this.defaultElement, this.defaultElementTagName, tagName)) {
      return this.defaultElement!;
    }

    this.resetDefaultElement();

    const element = createDefaultElement(tagName);
    this.defaultElement = element;
    this.defaultElementTagName = tagName;
    return element;
  }

  private resetDefaultElement() {
    this.clearRefs();
    this.defaultElement = null;
    this.defaultElementProps = null;
    this.defaultElementTagName = null;
  }

  private resetStaticTemplateRoot() {
    this.staticTemplateRoot = null;
    this.staticTemplateBoundProperties = EMPTY_SET;
    this.staticTemplateHasRootEventBindings = false;
  }
}

const renderResolved = directive(RenderResolvedDirective);

function resolveRenderProps<
  State extends object,
  RenderedElementType extends Element,
  Enabled extends boolean | undefined,
>(
  params: UseRenderParameters<State, RenderedElementType, Enabled>,
): HTMLProps<RenderedElementType> {
  const stateProps = getStateAttributesProps(
    params.state ?? ({} as State),
    params.stateAttributesMapping,
  );
  const explicitProps = (params.props ?? {}) as HTMLProps<RenderedElementType>;
  const mergedProps = {
    ...stateProps,
    ...explicitProps,
  } as HTMLProps<RenderedElementType>;
  const refs = [explicitProps.ref, ...normalizeRefs(params.ref)] as Ref<RenderedElementType>[];
  const mergedRef = mergeRefs(refs);

  if (mergedRef != null) {
    mergedProps.ref = mergedRef;
  }

  return mergedProps;
}

function createDefaultElement(tagName: IntrinsicElementTagName) {
  const element = SVG_TAG_NAMES.has(tagName)
    ? document.createElementNS(SVG_NAMESPACE, tagName)
    : document.createElement(tagName as string);

  return element;
}

function applyDefaultElementAttributes(
  element: Element,
  tagName: IntrinsicElementTagName,
  props: HTMLProps<Element>,
) {
  if (tagName === 'button' && props.type == null) {
    element.setAttribute('type', 'button');
  }

  if (tagName === 'img' && props.alt == null) {
    element.setAttribute('alt', '');
  }

  return element;
}

function materializeTemplate(template: TemplateResult) {
  const container = document.createElement('div');
  renderTemplate(template, container);

  const fragment = document.createDocumentFragment();
  while (container.firstChild != null) {
    fragment.append(container.firstChild);
  }

  return fragment;
}

function getSingleRootElement(fragment: DocumentFragment) {
  const meaningfulNodes = Array.from(fragment.childNodes).filter((node) => {
    if (node.nodeType === Node.COMMENT_NODE) {
      return false;
    }

    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent?.trim().length;
    }

    return true;
  });

  if (meaningfulNodes.length !== 1 || meaningfulNodes[0].nodeType !== Node.ELEMENT_NODE) {
    throwInvalidRenderTemplate();
  }

  return meaningfulNodes[0] as Element;
}

function syncStaticTemplateRoot(
  currentRoot: Element,
  nextRoot: Element,
  options: {
    previousBoundProperties: ReadonlySet<string>;
    nextBoundProperties: ReadonlySet<string>;
  },
) {
  const { previousBoundProperties, nextBoundProperties } = options;

  syncElementAttributes(currentRoot, nextRoot);

  previousBoundProperties.forEach((propertyName) => {
    if (!nextBoundProperties.has(propertyName)) {
      resetElementProperty(currentRoot, propertyName);
    }
  });

  nextBoundProperties.forEach((propertyName) => {
    setElementProperty(
      currentRoot,
      propertyName,
      (nextRoot as unknown as Record<string, unknown>)[propertyName],
    );
  });

  currentRoot.replaceChildren();
  while (nextRoot.firstChild != null) {
    currentRoot.append(nextRoot.firstChild);
  }
}

function syncElementAttributes(currentElement: Element, nextElement: Element) {
  Array.from(currentElement.attributes).forEach((attribute) => {
    if (!nextElement.hasAttribute(attribute.name)) {
      currentElement.removeAttribute(attribute.name);
    }
  });

  Array.from(nextElement.attributes).forEach((attribute) => {
    currentElement.setAttribute(attribute.name, attribute.value);
  });
}

function applyChildren(target: Element, children: unknown) {
  if (children == null || children === false) {
    return;
  }

  if (isTemplateResult(children)) {
    renderTemplate(children, target as unknown as HTMLElement);
    return;
  }

  if (Array.isArray(children)) {
    const fragment = document.createDocumentFragment();

    children.forEach((child) => {
      appendChild(fragment, child);
    });

    target.append(fragment);
    return;
  }

  appendChild(target, children);
}

function replaceChildren(target: Element, children: unknown) {
  if (isTemplateResult(children)) {
    renderTemplate(children, target as unknown as HTMLElement);
    return;
  }

  target.replaceChildren();
  applyChildren(target, children);
}

function appendChild(target: Element | DocumentFragment, child: unknown) {
  if (child == null || child === false || child === true || child === litNothing) {
    return;
  }

  if (Array.isArray(child)) {
    child.forEach((nestedChild) => {
      appendChild(target, nestedChild);
    });
    return;
  }

  if (isTemplateResult(child)) {
    const fragment = materializeTemplate(child);
    target.append(fragment);
    return;
  }

  if (child instanceof Node) {
    target.append(child);
    return;
  }

  if (typeof child === 'object' || typeof child === 'symbol') {
    throwInvalidChildren();
  }

  target.append(document.createTextNode(String(child)));
}

function clearAppliedProps(element: Element, props: HTMLProps<Element>) {
  const className = props.className ?? props.class;
  if (className != null) {
    element.removeAttribute('class');
  }

  const styleValue = props.style;
  if (styleValue != null) {
    if (typeof styleValue === 'object' && supportsInlineStyle(element)) {
      Object.keys(styleValue as Record<string, unknown>).forEach((name) => {
        element.style.removeProperty(normalizeStylePropertyName(name));
      });

      if (element.getAttribute('style')?.length === 0) {
        element.removeAttribute('style');
      }
    } else {
      element.removeAttribute('style');
    }
  }

  Object.entries(props).forEach(([name, value]) => {
    if (
      name === 'children' ||
      name === 'class' ||
      name === 'className' ||
      name === 'style' ||
      name === 'ref'
    ) {
      return;
    }

    if (isEventHandler(name, value)) {
      return;
    }

    if (shouldSetProperty(element, name, value)) {
      resetElementProperty(element, name);
    }

    element.removeAttribute(getAttributeName(element, name));
  });
}

function applyProps(
  element: Element,
  props: HTMLProps<Element>,
  options: {
    preserveExisting?: boolean | undefined;
    preservedProperties?: ReadonlySet<string> | undefined;
  } = {},
) {
  const { preserveExisting = false, preservedProperties = EMPTY_SET } = options;
  const previousElement = element;
  const mergedRef = props.ref;
  const listeners: Array<{ eventName: string; listener: EventListener }> = [];
  let isActive = true;
  const className = props.className ?? props.class;
  const existingClassName = element.getAttribute('class');

  if (className != null) {
    const classList = [preserveExisting ? existingClassName : null, String(className)]
      .filter((value) => value != null && value.length > 0)
      .join(' ');

    if (classList.length > 0) {
      element.setAttribute('class', classList);
    }
  }

  const styleValue = props.style;
  if (styleValue != null && typeof styleValue === 'object') {
    const existingStyleNames = new Set<string>();

    if (preserveExisting && supportsInlineStyle(element)) {
      for (let index = 0; index < element.style.length; index += 1) {
        existingStyleNames.add(element.style[index]);
      }
    }

    Object.entries(styleValue as Record<string, unknown>).forEach(([name, value]) => {
      const propertyName = normalizeStylePropertyName(name);

      if (preserveExisting && existingStyleNames.has(propertyName)) {
        return;
      }

      if (value == null) {
        if (supportsInlineStyle(element)) {
          element.style.removeProperty(propertyName);
        }
        return;
      }

      if (supportsInlineStyle(element)) {
        element.style.setProperty(propertyName, String(value));
      }
    });
  }

  Object.entries(props).forEach(([name, value]) => {
    if (
      name === 'children' ||
      name === 'class' ||
      name === 'className' ||
      name === 'style' ||
      name === 'ref'
    ) {
      return;
    }

    if (isEventHandler(name, value)) {
      const eventName = getEventName(name);
      const listener = value as EventListener;
      element.addEventListener(eventName, listener);
      listeners.push({ eventName, listener });
      return;
    }

    const attributeName = getAttributeName(element, name);
    const hasExistingValue = preserveExisting && element.hasAttribute(attributeName);

    if (hasExistingValue) {
      return;
    }

    if (value == null || value === false) {
      element.removeAttribute(attributeName);
      return;
    }

    if (value === true) {
      element.setAttribute(attributeName, '');
      setElementProperty(element, name, true);
      return;
    }

    if (preserveExisting && preservedProperties.has(name)) {
      return;
    }

    if (shouldSetProperty(element, name, value)) {
      setElementProperty(element, name, value);
      return;
    }

    element.setAttribute(attributeName, String(value));
  });

  if (mergedRef != null) {
    queueMicrotask(() => {
      if (isActive) {
        assignRef(mergedRef, previousElement);
      }
    });
  }

  return () => {
    isActive = false;
    listeners.forEach(({ eventName, listener }) => {
      previousElement.removeEventListener(eventName, listener);
    });
    assignRef(mergedRef, null);
  };
}

function normalizeRefs<T>(ref: Ref<T> | Ref<T>[] | undefined) {
  if (Array.isArray(ref)) {
    return ref;
  }

  return ref == null ? [] : [ref];
}

function mergeRefs<T>(refs: Ref<T>[]) {
  const filteredRefs = refs.filter((ref): ref is Exclude<Ref<T>, null | undefined> => ref != null);

  if (filteredRefs.length === 0) {
    return undefined;
  }

  return (instance: T | null) => {
    filteredRefs.forEach((ref) => {
      assignRef(ref, instance);
    });
  };
}

function assignRef<T>(ref: Ref<T>, instance: T | null) {
  if (ref == null) {
    return;
  }

  if (typeof ref === 'function') {
    ref(instance);
    return;
  }

  ref.current = instance;
}

function isEventHandler(name: string, value: unknown) {
  return name.startsWith('on') && name.length > 2 && typeof value === 'function';
}

function getEventName(name: string) {
  return name.slice(2).toLowerCase();
}

function getAttributeName(element: Element, name: string) {
  if (name === 'className') {
    return 'class';
  }

  if (name === 'htmlFor') {
    return 'for';
  }

  if (element.namespaceURI === SVG_NAMESPACE) {
    return name;
  }

  if (name.includes('-')) {
    return name;
  }

  return name.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}

function shouldSetProperty(element: Element, name: string, value: unknown) {
  if (element.namespaceURI === SVG_NAMESPACE) {
    return false;
  }

  if (name.startsWith('data-') || name.startsWith('aria-') || name.includes('-')) {
    return false;
  }

  return name in element && typeof value !== 'symbol';
}

function setElementProperty(element: Element, name: string, value: unknown) {
  const propertyName = name === 'class' ? 'className' : name;
  (element as unknown as Record<string, unknown>)[propertyName] = value;
}

function resetElementProperty(element: Element, name: string) {
  const propertyName = name === 'class' ? 'className' : name;
  const target = element as unknown as Record<string, unknown>;

  if (!(propertyName in target)) {
    return;
  }

  if (propertyName === 'value') {
    target[propertyName] = '';
    return;
  }

  if (typeof target[propertyName] === 'boolean') {
    target[propertyName] = false;
    return;
  }

  target[propertyName] = undefined;
}

function normalizeStylePropertyName(name: string) {
  if (name.startsWith('--')) {
    return name;
  }

  return name.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}

function supportsInlineStyle(element: Element): element is Element & ElementCSSInlineStyle {
  return 'style' in element;
}

function hasOwnProperty(object: object, key: string) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function canReuseDefaultElement(
  element: Element | null,
  currentTagName: IntrinsicElementTagName | null,
  nextTagName: IntrinsicElementTagName,
) {
  return (
    element != null &&
    currentTagName === nextTagName &&
    element.namespaceURI === getNamespaceForTagName(nextTagName)
  );
}

function canReuseStaticTemplateRoot(
  currentRoot: Element | null,
  nextRoot: Element,
  previousHasRootEventBindings: boolean,
  nextHasRootEventBindings: boolean,
) {
  return (
    currentRoot != null &&
    !previousHasRootEventBindings &&
    !nextHasRootEventBindings &&
    currentRoot.tagName === nextRoot.tagName &&
    currentRoot.namespaceURI === nextRoot.namespaceURI
  );
}

function getNamespaceForTagName(tagName: IntrinsicElementTagName) {
  return SVG_TAG_NAMES.has(tagName) ? SVG_NAMESPACE : HTML_NAMESPACE;
}

function getTemplateBoundPropertyNames(template: TemplateResult) {
  const preservedProperties = new Set<string>();
  const strings = 'strings' in template && Array.isArray(template.strings) ? template.strings : [];

  strings.slice(0, -1).forEach((stringPart) => {
    const match = /(?:^|[\s<])\.([A-Za-z0-9_$-]+)\s*=\s*$/.exec(stringPart);
    if (match != null) {
      preservedProperties.add(match[1]);
    }
  });

  return preservedProperties;
}

function hasTemplateRootEventBindings(template: TemplateResult) {
  const strings = 'strings' in template && Array.isArray(template.strings) ? template.strings : [];
  let openingTag = '';

  for (const stringPart of strings) {
    openingTag += stringPart;

    const closingIndex = openingTag.indexOf('>');
    if (closingIndex !== -1) {
      openingTag = openingTag.slice(0, closingIndex);
      break;
    }
  }

  return /(?:^|[\s<])@[A-Za-z0-9_$-]+\s*=\s*$/.test(openingTag);
}

function throwInvalidRenderTemplate(): never {
  throw new Error(
    'Base UI: The `render` prop template must resolve to exactly one element root.' +
      ' `useRender` applies merged props, refs, and state attributes to a single rendered element, so multi-root or text-only templates cannot be used here.' +
      ' Provide a template with one root element or use a render callback instead.' +
      ' https://base-ui.com/r/invalid-render-prop',
  );
}

function throwInvalidChildren(): never {
  throw new Error(
    'Base UI: `props.children` received an unsupported child value.' +
      ' `useRender` can only render strings, numbers, Nodes, Lit templates, or arrays of those values as children.' +
      ' Provide supported child content or render it directly from the template.' +
      ' https://base-ui.com/r/invalid-render-prop',
  );
}

function isTemplateResult(value: unknown): value is TemplateResult {
  return value != null && typeof value === 'object' && '_$litType$' in value;
}

function getStateAttributesProps<State extends object>(
  state: State,
  customMapping?: StateAttributesMapping<State>,
) {
  const props: Record<string, string> = {};
  const stateRecord = state as Record<string, unknown>;

  /* eslint-disable-next-line guard-for-in */
  for (const key in stateRecord) {
    const stateKey = key as keyof State;
    const value = stateRecord[key] as State[typeof stateKey];

    if (Object.prototype.hasOwnProperty.call(customMapping ?? {}, stateKey)) {
      const customProps = customMapping![stateKey]!(value);
      if (customProps != null) {
        Object.assign(props, customProps);
      }

      continue;
    }

    if (value === true) {
      props[`data-${key.toLowerCase()}`] = '';
    } else if (value) {
      props[`data-${key.toLowerCase()}`] = String(value);
    }
  }

  return props;
}
