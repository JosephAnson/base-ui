import { BaseHTMLElement } from '../utils';

/**
 * Context for label-control associations.
 */
export interface LabelableContext {
  controlId: string | null | undefined;
  labelId: string | undefined;
  messageIds: string[];
  registerControlId: (source: symbol, id: string | null | undefined) => void;
  registerLabelId: (id: string | undefined) => void;
  registerMessageId: (id: string, add: boolean) => void;
  getDescriptionProps: (
    externalProps?: Record<string, string | undefined>,
  ) => Record<string, string | undefined>;
}

let labelableControlIdCounter = 0;

function createDefaultControlId() {
  labelableControlIdCounter += 1;
  return `base-ui-labelable-control-${labelableControlIdCounter}`;
}

function mergeDescribedByIds(...values: Array<string | undefined>) {
  const ids = values
    .flatMap((value) => value?.split(/\s+/).filter(Boolean) ?? [])
    .filter((value, index, array) => array.indexOf(value) === index);

  return ids.join(' ') || undefined;
}

/**
 * Finds the nearest `<labelable-provider>` ancestor and returns its context.
 * Returns `null` when no provider is found.
 */
export function getLabelableContext(element: Element): LabelableContext | null {
  const provider = element.closest('labelable-provider') as LabelableProviderElement | null;
  return provider?.contextValue ?? null;
}

/**
 * Focuses an element using the visible focus algorithm.
 * When the element supports `focus({ focusVisible: true })`, uses that;
 * otherwise falls back to plain `focus()`.
 */
export function focusElementWithVisible(element: HTMLElement): void {
  try {
    element.focus({ focusVisible: true } as FocusOptions);
  } catch {
    element.focus();
  }
}

/**
 * A provider element that manages label-control ID associations for
 * accessibility. Registers control IDs, label IDs, and message IDs
 * (for `aria-describedby`) used by child form elements.
 * Renders with `display: contents`.
 *
 * Documentation: [Base UI LabelableProvider](https://base-ui.com/react/utils/labelable-provider)
 */
export class LabelableProviderElement extends BaseHTMLElement {
  static get observedAttributes() {
    return ['control-id', 'label-id'];
  }

  private defaultControlId = createDefaultControlId();
  private controlIds = new Map<symbol, string | null | undefined>();
  private controlIdValue: string | null | undefined;
  private labelIdValue: string | undefined;
  private messageIdsValue: string[] = [];

  get controlId(): string | null | undefined {
    return this.controlIdValue;
  }

  set controlId(value: string | null | undefined) {
    this.controlIdValue = value;
    this.syncStringAttribute('control-id', value);
    this.syncContext();
  }

  get labelId(): string | undefined {
    return this.labelIdValue;
  }

  set labelId(value: string | undefined) {
    this.labelIdValue = value;
    this.syncStringAttribute('label-id', value);
    this.syncContext();
  }

  /** @internal — exposed for getLabelableContext */
  contextValue: LabelableContext = {
    controlId: this.resolveControlId(),
    labelId: undefined,
    messageIds: [],
    registerControlId: (source, id) => this.registerControlIdInternal(source, id),
    registerLabelId: (id) => this.registerLabelIdInternal(id),
    registerMessageId: (id, add) => this.registerMessageIdInternal(id, add),
    getDescriptionProps: (externalProps) => this.getDescriptionPropsInternal(externalProps),
  };

  connectedCallback() {
    this.style.display = 'contents';
    this.syncContext();
  }

  attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null) {
    if (name === 'control-id') {
      this.controlIdValue = newValue;
    }

    if (name === 'label-id') {
      this.labelIdValue = newValue ?? undefined;
    }

    this.syncContext();
  }

  private registerControlIdInternal(source: symbol, id: string | null | undefined) {
    if (id === undefined) {
      this.controlIds.delete(source);
    } else {
      this.controlIds.set(source, id);
    }

    this.syncContext();
  }

  private registerLabelIdInternal(id: string | undefined) {
    this.labelId = id;
  }

  private registerMessageIdInternal(id: string, add: boolean) {
    if (add) {
      if (!this.messageIdsValue.includes(id)) {
        this.messageIdsValue.push(id);
      }
    } else {
      this.messageIdsValue = this.messageIdsValue.filter((mid) => mid !== id);
    }

    this.syncContext();
  }

  private getDescriptionPropsInternal(
    externalProps: Record<string, string | undefined> = {},
  ): Record<string, string | undefined> {
    const describedBy = mergeDescribedByIds(
      this.getParentMessageIds().join(' '),
      this.messageIdsValue.join(' '),
      externalProps['aria-describedby'],
    );

    return {
      ...externalProps,
      'aria-describedby': describedBy,
    };
  }

  private getParentMessageIds() {
    const parentProvider = this.parentElement?.closest(
      'labelable-provider',
    ) as LabelableProviderElement | null;

    return parentProvider?.contextValue.messageIds ?? [];
  }

  private resolveControlId(): string | null | undefined {
    let resolved: string | null | undefined;

    for (const id of this.controlIds.values()) {
      if (id !== undefined) {
        resolved = id;
      }
    }

    if (resolved !== undefined) {
      return resolved;
    }

    if (this.controlIdValue !== undefined) {
      return this.controlIdValue;
    }

    return this.defaultControlId;
  }

  private syncContext() {
    this.contextValue.controlId = this.resolveControlId();
    this.contextValue.labelId = this.labelIdValue;
    this.contextValue.messageIds = [...this.messageIdsValue];
  }

  private syncStringAttribute(name: string, value: string | null | undefined) {
    const nextValue = value ?? null;

    if (nextValue === null) {
      if (this.hasAttribute(name)) {
        this.removeAttribute(name);
      }
      return;
    }

    if (this.getAttribute(name) !== nextValue) {
      this.setAttribute(name, nextValue);
    }
  }
}

if (!customElements.get('labelable-provider')) {
  customElements.define('labelable-provider', LabelableProviderElement);
}

export interface LabelableProviderState {}

export interface LabelableProviderProps {
  controlId?: string | null | undefined;
  labelId?: string | undefined;
}

export namespace LabelableProvider {
  export type Props = LabelableProviderProps;
  export type State = LabelableProviderState;
}

declare global {
  interface HTMLElementTagNameMap {
    'labelable-provider': LabelableProviderElement;
  }
}
