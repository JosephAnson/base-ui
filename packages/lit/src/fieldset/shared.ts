// eslint-disable-next-line import/extensions
import type { AsyncDirective } from 'lit/async-directive.js';

export const FIELDSET_ROOT_ATTRIBUTE = 'data-base-ui-fieldset-root';
export const FIELDSET_CONTEXT_ATTRIBUTE = 'data-base-ui-fieldset-context';
export const FIELDSET_LEGEND_ID_ATTRIBUTE = 'data-base-ui-fieldset-legend-id';
export const FIELDSET_STATE_CHANGE_EVENT = 'base-ui-fieldset-state-change';
export const FIELDSET_RUNTIME = Symbol('base-ui-fieldset-runtime');
export const FIELDSET_CONTEXT_ERROR =
  'Base UI: FieldsetRootContext is missing. Fieldset parts must be placed within <Fieldset.Root>.';

export interface FieldsetContext {
  disabled: boolean;
  legendId: string | undefined;
}

export interface FieldsetRuntime {
  getContext(): FieldsetContext;
  setLegendId(id: string | undefined): void;
}

export function setFieldsetRuntime(element: Element | null, runtime: FieldsetRuntime | null) {
  if (element == null) {
    return;
  }

  const target = element as Element & { [FIELDSET_RUNTIME]?: FieldsetRuntime | null };

  if (runtime == null) {
    delete target[FIELDSET_RUNTIME];
    return;
  }

  target[FIELDSET_RUNTIME] = runtime;
}

export function getFieldsetContext(part: Parameters<AsyncDirective['update']>[0]): FieldsetContext {
  const context = getFieldsetContextOrNull(part);

  if (context == null) {
    throw new Error(FIELDSET_CONTEXT_ERROR);
  }

  return context;
}

export function getFieldsetContextOrNull(
  part: Parameters<AsyncDirective['update']>[0],
): FieldsetContext | null {
  const parentNode = (part as { parentNode?: Node | null | undefined }).parentNode ?? null;
  const parentElement = getParentElement(parentNode);
  const carrier = getClosestFieldsetRoot(parentElement);

  if (carrier == null) {
    return null;
  }

  return getFieldsetContextFromElement(carrier);
}

export function getFieldsetContextFromElement(element: Element): FieldsetContext {
  return {
    disabled: element.hasAttribute('data-disabled'),
    legendId: element.getAttribute(FIELDSET_LEGEND_ID_ATTRIBUTE) ?? undefined,
  };
}

export function getClosestFieldsetRoot(element: Element | null) {
  return element?.closest(`[${FIELDSET_CONTEXT_ATTRIBUTE}]`) ?? null;
}

export function getFieldsetRoot(part: Parameters<AsyncDirective['update']>[0]) {
  const parentNode = (part as { parentNode?: Node | null | undefined }).parentNode ?? null;
  const parentElement = getParentElement(parentNode);
  const root = getClosestFieldsetRoot(parentElement);

  if (root == null) {
    throw new Error(FIELDSET_CONTEXT_ERROR);
  }

  return root;
}

export function getFieldsetRuntime(element: Element): FieldsetRuntime {
  const runtime = getFieldsetRuntimeOrNull(element);

  if (runtime == null) {
    throw new Error(FIELDSET_CONTEXT_ERROR);
  }

  return runtime;
}

export function getFieldsetRuntimeOrNull(element: Element) {
  return (element as Element & { [FIELDSET_RUNTIME]?: FieldsetRuntime | null })[
    FIELDSET_RUNTIME
  ] ?? null;
}

export function getParentElement(node: Node | null) {
  if (node == null) {
    return null;
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    return node as Element;
  }

  return node.parentElement;
}
