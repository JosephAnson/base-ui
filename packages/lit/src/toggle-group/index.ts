import { ReactiveElement, render as renderTemplate, type TemplateResult } from 'lit';
import type { BaseUIChangeEventDetails, ComponentRenderFn, HTMLProps } from '../types';

// ─── Constants ──────────────────────────────────────────────────────────────────

export const TOGGLE_GROUP_ITEM_ATTRIBUTE = 'data-base-ui-toggle-item';
const TOGGLE_GROUP_ROOT_ATTRIBUTE = 'data-base-ui-toggle-group-root';
export const TOGGLE_GROUP_STATE_CHANGE_EVENT = 'base-ui-toggle-group-state-change';

type ToggleGroupOrientation = 'horizontal' | 'vertical';
type ToggleGroupRootRenderProps = HTMLProps<HTMLElement>;
type ToggleGroupRootRenderProp =
  | TemplateResult
  | ComponentRenderFn<ToggleGroupRootRenderProps, ToggleGroupRootState>;

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface ToggleGroupRootState {
  /**
   * Whether the toggle group should ignore user interaction.
   */
  disabled: boolean;
  /**
   * Whether multiple items can be pressed at the same time.
   */
  multiple: boolean;
  /**
   * The orientation of the toggle group.
   */
  orientation: ToggleGroupOrientation;
}

export type ToggleGroupRootChangeEventDetails = BaseUIChangeEventDetails<'none'>;

// ─── ToggleGroupRootElement ─────────────────────────────────────────────────────

/**
 * Groups related toggle buttons.
 * Renders a `<toggle-group-root>` custom element.
 *
 * Documentation: [Base UI Toggle Group](https://base-ui.com/react/components/toggle-group)
 */
export class ToggleGroupRootElement extends ReactiveElement {
  static properties = {
    disabled: { type: Boolean, reflect: true },
    multiple: { type: Boolean },
    orientation: { type: String, reflect: true },
    loopFocus: { type: Boolean, attribute: 'loop-focus' },
    render: { attribute: false },
  };

  declare disabled: boolean;
  declare multiple: boolean;
  /** Whether arrow key navigation loops back to the start. */
  declare loopFocus: boolean;

  /** The orientation of the toggle group for keyboard navigation. */
  declare orientation: ToggleGroupOrientation;

  /**
   * Allows you to replace the component's HTML element with a different tag,
   * or compose it with a template that has a single root element.
   */
  declare render: ToggleGroupRootRenderProp | undefined;

  /**
   * Controlled value: array of pressed toggle values.
   * When set, the component is controlled and `onValueChange` must be used to update.
   */
  value: readonly string[] | undefined;

  /**
   * Default pressed values for uncontrolled mode.
   */
  defaultValue: readonly string[] | undefined;

  /**
   * Callback fired when the group value changes.
   * Set via `.onValueChange=${fn}`.
   */
  onValueChange:
    | ((groupValue: string[], eventDetails: ToggleGroupRootChangeEventDetails) => void)
    | undefined;

  private internalValue: string[] = [];
  private initialized = false;
  private renderedElement: HTMLElement | null = null;

  constructor() {
    super();
    this.disabled = false;
    this.multiple = false;
    this.orientation = 'horizontal';
    this.loopFocus = true;
  }

  override createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();

    if (!this.initialized) {
      this.initialized = true;
      if (this.value) {
        this.internalValue = [...this.value];
      } else if (this.defaultValue) {
        this.internalValue = [...this.defaultValue];
      } else {
        this.internalValue = [];
      }
    }

    this.setAttribute(TOGGLE_GROUP_ROOT_ATTRIBUTE, '');
    this.setAttribute('role', 'group');
    this.style.display = 'contents';

    this.addEventListener('keydown', this.handleKeyDown);

    this.syncAttributes();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('keydown', this.handleKeyDown);
    this.resetRenderedElement();
  }

  protected override updated() {
    this.syncAttributes();
  }

  // ── Public API ──────────────────────────────────────────────────────────

  /** Returns the current array of pressed values. */
  getValue(): readonly string[] {
    return this.value ?? this.internalValue;
  }

  getState(): ToggleGroupRootState {
    return {
      disabled: this.disabled,
      multiple: this.multiple,
      orientation: this.orientation,
    };
  }

  get isValueInitialized(): boolean {
    return this.value !== undefined || this.defaultValue !== undefined;
  }

  /** Whether a specific value is pressed in the group. */
  isPressed(toggleValue: string): boolean {
    return this.getValue().indexOf(toggleValue) > -1;
  }

  /**
   * Called by child toggle-root elements when they are toggled.
   * Manages single vs multiple selection logic.
   */
  setGroupValue(toggleValue: string, nextPressed: boolean, event: Event) {
    const currentValue = [...this.getValue()];
    let newValue: string[];

    if (this.multiple) {
      if (nextPressed) {
        newValue = [...currentValue, toggleValue];
      } else {
        newValue = currentValue.filter((v) => v !== toggleValue);
      }
    } else if (nextPressed) {
      newValue = [toggleValue];
    } else {
      newValue = [];
    }

    const eventDetails = createChangeEventDetails(event);
    this.onValueChange?.(newValue, eventDetails);

    if (eventDetails.isCanceled) {
      return;
    }

    // Update internal state (uncontrolled mode)
    if (this.value === undefined) {
      this.internalValue = newValue;
    } else {
      this.requestUpdate();
    }

    this.syncAttributes();
    this.publishStateChange();
  }

  // ── Private ─────────────────────────────────────────────────────────────

  private syncAttributes() {
    const group = this.ensureGroupElement();

    this.removeAttribute('role');
    this.removeAttribute('data-orientation');
    this.removeAttribute('data-disabled');
    this.removeAttribute('data-multiple');

    group.setAttribute('role', 'group');
    group.setAttribute('data-orientation', this.orientation);
    group.toggleAttribute('data-disabled', this.disabled);
    group.toggleAttribute('data-multiple', this.multiple);
  }

  private publishStateChange() {
    this.dispatchEvent(
      new CustomEvent(TOGGLE_GROUP_STATE_CHANGE_EVENT, { bubbles: false, cancelable: false }),
    );
  }

  // ── Keyboard navigation (roving tabindex) ─────────────────────────────

  private getToggleItems(): HTMLElement[] {
    return Array.from(
      this.querySelectorAll<HTMLElement>(`toggle-root, [${TOGGLE_GROUP_ITEM_ATTRIBUTE}]`),
    ).filter((el) => !el.hasAttribute('disabled') && el.getAttribute('aria-disabled') !== 'true');
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    if (this.disabled) {
      return;
    }

    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const toggleItem = target.closest<HTMLElement>(`toggle-root, [${TOGGLE_GROUP_ITEM_ATTRIBUTE}]`);
    if (!toggleItem || !this.contains(toggleItem)) {
      return;
    }

    const delta = this.getNavigationDelta(event.key);
    if (delta == null) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const items = this.getToggleItems();
    if (items.length === 0) {
      return;
    }

    const currentIndex = items.indexOf(toggleItem);
    if (currentIndex === -1) {
      return;
    }

    let nextItem: HTMLElement;

    if (delta === Infinity) {
      nextItem = items[items.length - 1];
    } else if (delta === -Infinity) {
      nextItem = items[0];
    } else {
      const proposed = currentIndex + delta;
      if (proposed < 0) {
        nextItem = this.loopFocus ? items[items.length - 1] : items[0];
      } else if (proposed >= items.length) {
        nextItem = this.loopFocus ? items[0] : items[items.length - 1];
      } else {
        nextItem = items[proposed];
      }
    }

    nextItem.focus();
    this.syncTabIndices(nextItem);
  };

  private getNavigationDelta(key: string): number | null {
    if (this.orientation === 'vertical') {
      if (key === 'ArrowDown') {
        return 1;
      }
      if (key === 'ArrowUp') {
        return -1;
      }
      if (key === 'Home') {
        return -Infinity;
      }
      if (key === 'End') {
        return Infinity;
      }
      return null;
    }

    const dir = this.getDirection();
    const forward = dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
    const backward = dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft';

    if (key === forward) {
      return 1;
    }
    if (key === backward) {
      return -1;
    }
    if (key === 'Home') {
      return -Infinity;
    }
    if (key === 'End') {
      return Infinity;
    }
    return null;
  }

  private getDirection(): 'ltr' | 'rtl' {
    const scoped = this.closest('[dir]')?.getAttribute('dir');
    const doc = this.ownerDocument.documentElement.getAttribute('dir');
    return scoped === 'rtl' || doc === 'rtl' ? 'rtl' : 'ltr';
  }

  /** Update tab indices so only one item is tabbable (roving tabindex). */
  syncTabIndices(activeItem?: HTMLElement) {
    const items = this.getToggleItems();
    if (items.length === 0) {
      return;
    }

    const current = activeItem ?? items[0];

    items.forEach((item) => {
      item.tabIndex = item === current ? 0 : -1;
    });
  }

  private ensureGroupElement(): HTMLElement {
    if (this.render == null) {
      this.resetRenderedElement();
      this.renderedElement = this;
      return this;
    }

    const contentNodes =
      this.renderedElement && this.renderedElement !== this
        ? Array.from(this.renderedElement.childNodes)
        : Array.from(this.childNodes).filter((node) => node !== this.renderedElement);

    const state = this.getState();
    const renderProps: ToggleGroupRootRenderProps = {
      role: 'group',
    };
    const template =
      typeof this.render === 'function' ? this.render(renderProps, state) : this.render;

    this.style.display = 'contents';
    const nextGroup = materializeTemplateRoot(template);

    if (nextGroup !== this) {
      this.replaceChildren(nextGroup);
      nextGroup.append(...contentNodes);
    } else {
      this.resetRenderedElement();
    }

    this.renderedElement = nextGroup;
    return nextGroup;
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

if (!customElements.get('toggle-group-root')) {
  customElements.define('toggle-group-root', ToggleGroupRootElement);
}

export const ToggleGroup = ToggleGroupRootElement;

export namespace ToggleGroupRoot {
  export type Props = ToggleGroupRootProps;
  export type State = ToggleGroupRootState;
  export type ChangeEventReason = ToggleGroupChangeEventReason;
  export type ChangeEventDetails = ToggleGroupChangeEventDetails;
}

export interface ToggleGroupRootProps {
  /**
   * The pressed state of the toggle group represented by an array of
   * the values of all pressed toggle buttons.
   * This is the controlled counterpart of `defaultValue`.
   */
  value?: readonly string[] | undefined;
  /**
   * The pressed state of the toggle group represented by an array of
   * the values of all pressed toggle buttons.
   * This is the uncontrolled counterpart of `value`.
   */
  defaultValue?: readonly string[] | undefined;
  /**
   * Callback fired when the pressed states of the toggle group change.
   */
  onValueChange?:
    | ((groupValue: string[], eventDetails: ToggleGroupRootChangeEventDetails) => void)
    | undefined;
  /**
   * Whether the toggle group should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * @default 'horizontal'
   */
  orientation?: ToggleGroupOrientation | undefined;
  /**
   * Whether to loop keyboard focus back to the first item.
   * @default true
   */
  loopFocus?: boolean | undefined;
  /**
   * Whether multiple items can be pressed.
   * @default false
   */
  multiple?: boolean | undefined;
  /**
   * Allows you to replace the component's HTML element with a different tag,
   * or compose it with a template that has a single root element.
   * Accepts a `TemplateResult` or a function that returns the template to render.
   */
  render?: ToggleGroupRootRenderProp | undefined;
}

export type ToggleGroupProps = ToggleGroupRootProps;
export type ToggleGroupState = ToggleGroupRootState;
export type ToggleGroupChangeEventReason = ToggleGroupRootChangeEventDetails['reason'];
export type ToggleGroupChangeEventDetails = ToggleGroupRootChangeEventDetails;

export namespace ToggleGroup {
  export type Props = ToggleGroupProps;
  export type State = ToggleGroupState;
  export type ChangeEventReason = ToggleGroupChangeEventReason;
  export type ChangeEventDetails = ToggleGroupChangeEventDetails;
}

function createChangeEventDetails(event: Event): ToggleGroupRootChangeEventDetails {
  let canceled = false;
  let propagationAllowed = false;

  return {
    event,
    trigger: event.target instanceof Element ? event.target : undefined,
    allowPropagation() {
      propagationAllowed = true;
    },
    cancel() {
      canceled = true;
    },
    get isCanceled() {
      return canceled;
    },
    get isPropagationAllowed() {
      return propagationAllowed;
    },
    reason: 'none',
  };
}

function materializeTemplateRoot(template: TemplateResult): HTMLElement {
  const container = document.createElement('div');
  renderTemplate(template, container);

  return (
    Array.from(container.children).find((child): child is HTMLElement => child instanceof HTMLElement) ??
    container
  );
}

declare global {
  interface HTMLElementTagNameMap {
    'toggle-group-root': ToggleGroupRootElement;
  }
}
