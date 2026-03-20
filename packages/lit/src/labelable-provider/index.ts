import { BaseHTMLElement, ensureId } from '../utils/index.ts';

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
  getDescriptionProps: () => Record<string, string | undefined>;
}

/**
 * Finds the nearest `<labelable-provider>` ancestor and returns its context.
 * Returns `null` when no provider is found.
 */
export function getLabelableContext(element: Element): LabelableContext | null {
  const provider = element.closest('labelable-provider') as LabelableProviderElement | null;
  return provider?._context ?? null;
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
  private _controlIds = new Map<symbol, string | null | undefined>();
  private _labelId: string | undefined;
  private _messageIds: string[] = [];

  /** @internal — exposed for getLabelableContext */
  _context: LabelableContext = {
    controlId: undefined,
    labelId: undefined,
    messageIds: [],
    registerControlId: (source, id) => this._registerControlId(source, id),
    registerLabelId: (id) => this._registerLabelId(id),
    registerMessageId: (id, add) => this._registerMessageId(id, add),
    getDescriptionProps: () => this._getDescriptionProps(),
  };

  connectedCallback() {
    this.style.display = 'contents';
  }

  private _registerControlId(source: symbol, id: string | null | undefined) {
    if (id === undefined || id === null) {
      this._controlIds.delete(source);
    } else {
      this._controlIds.set(source, id);
    }
    // Use the most recently registered non-null ID
    this._context.controlId = this._resolveControlId();
  }

  private _registerLabelId(id: string | undefined) {
    this._labelId = id;
    this._context.labelId = id;
  }

  private _registerMessageId(id: string, add: boolean) {
    if (add) {
      if (!this._messageIds.includes(id)) {
        this._messageIds.push(id);
      }
    } else {
      this._messageIds = this._messageIds.filter((mid) => mid !== id);
    }
    this._context.messageIds = [...this._messageIds];
  }

  private _getDescriptionProps(): Record<string, string | undefined> {
    const describedBy = this._messageIds.length > 0
      ? this._messageIds.join(' ')
      : undefined;
    return { 'aria-describedby': describedBy };
  }

  private _resolveControlId(): string | null | undefined {
    let resolved: string | null | undefined;
    for (const id of this._controlIds.values()) {
      if (id != null) {
        resolved = id;
      }
    }
    return resolved;
  }
}

if (!customElements.get('labelable-provider')) {
  customElements.define('labelable-provider', LabelableProviderElement);
}

export namespace LabelableProvider {
  export interface Props {
    controlId?: string;
    labelId?: string;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'labelable-provider': LabelableProviderElement;
  }
}
