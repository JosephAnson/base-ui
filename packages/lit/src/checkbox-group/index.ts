import { ReactiveElement } from 'lit';
import { useRender } from '../use-render';
import {
  CHECKBOX_GROUP_ATTRIBUTE,
  CHECKBOX_GROUP_STATE_CHANGE_EVENT,
  createCheckboxGroupId,
  setCheckboxGroupRuntimeState,
  type CheckboxGroupRuntimeState,
} from './shared';
import type { BaseUIChangeEventDetails } from '../types';

// ─── Types ──────────────────────────────────────────────────────────────────────

type ParentStatus = 'on' | 'off' | 'mixed';

export interface CheckboxGroupState {
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
}

export interface CheckboxGroupChangeEventDetails {
  event: Event;
  cancel(): void;
  readonly isCanceled: boolean;
  reason: 'none';
}

export interface CheckboxGroupProps extends useRender.ComponentProps<'div', CheckboxGroupState> {
  /**
   * Controlled selected values.
   */
  value?: string[] | undefined;
  /**
   * Default selected values for uncontrolled mode.
   */
  defaultValue?: string[] | undefined;
  /**
   * All possible values of child checkboxes. Required for parent checkbox support.
   */
  allValues?: string[] | undefined;
  /**
   * Whether the group is disabled.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Callback fired when the selected values change.
   */
  onValueChange?:
    | ((value: string[], eventDetails: CheckboxGroupChangeEventDetails) => void)
    | undefined;
}

// ─── CheckboxGroupElement ────────────────────────────────────────────────────────

/**
 * Provides a shared state to a series of checkboxes.
 * Renders a `<checkbox-group>` custom element.
 *
 * Documentation: [Base UI Checkbox Group](https://base-ui.com/react/components/checkbox-group)
 */
export class CheckboxGroupElement extends ReactiveElement {
  static properties = {
    disabled: { type: Boolean },
  };

  declare disabled: boolean;

  /** All possible values of child checkboxes. Required for parent checkbox support. */
  allValues: string[] = [];

  /** Callback fired when the group value changes. Set via `.onValueChange=${fn}`. */
  onValueChange:
    | ((value: string[], eventDetails: CheckboxGroupChangeEventDetails) => void)
    | undefined;

  private controlledValue: string[] | undefined;
  private isValueControlled = false;
  private internalValue: string[] = [];
  private initialized = false;
  private groupId = '';
  private parentCycleValue: string[] = [];
  private parentStatus: ParentStatus = 'mixed';
  private disabledStates = new Map<string, boolean>();
  private syncQueued = false;
  private lastPublishedStateKey: string | null = null;

  /** Controlled value. When set, the group becomes controlled. */
  get value(): string[] | undefined {
    return this.isValueControlled ? this.controlledValue : undefined;
  }

  set value(val: string[] | undefined) {
    if (val === undefined) {
      this.isValueControlled = false;
      this.controlledValue = undefined;
    } else {
      this.isValueControlled = true;
      this.controlledValue = val;
    }
    this.requestUpdate();
  }

  /** Default value for uncontrolled mode. */
  get defaultValue(): string[] {
    return this.internalValue;
  }

  set defaultValue(val: string[]) {
    if (!this.initialized) {
      this.internalValue = [...val];
    }
  }

  constructor() {
    super();
    this.disabled = false;
  }

  override createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();

    if (!this.initialized) {
      this.initialized = true;
      const initialValue = this.isValueControlled
        ? [...(this.controlledValue ?? [])]
        : [...this.internalValue];
      this.parentCycleValue = [...initialValue];
      this.groupId = createCheckboxGroupId();
    }

    this.setAttribute(CHECKBOX_GROUP_ATTRIBUTE, '');
    this.setAttribute('role', 'group');
    this.toggleAttribute('data-disabled', this.disabled);
    // Publish runtime state immediately so child checkboxes can find it during connectedCallback
    setCheckboxGroupRuntimeState(this, this.getRuntimeState());
    this.scheduleDomSync();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    setCheckboxGroupRuntimeState(this, null);
    this.lastPublishedStateKey = null;
  }

  protected override updated() {
    this.setAttribute(CHECKBOX_GROUP_ATTRIBUTE, '');
    this.setAttribute('role', 'group');
    this.toggleAttribute('data-disabled', this.disabled);
    this.scheduleDomSync();
  }

  getState(): CheckboxGroupState {
    return {
      disabled: this.disabled,
    };
  }

  private getCurrentValue(): string[] {
    if (this.isValueControlled) {
      return [...(this.controlledValue ?? [])];
    }
    return [...this.internalValue];
  }

  private getRuntimeState(): CheckboxGroupRuntimeState {
    return {
      id: this.groupId,
      allValues: [...this.allValues],
      value: this.getCurrentValue(),
      disabled: this.disabled,
      disabledStates: this.disabledStates,
      toggleChild: (
        value: string,
        checked: boolean,
        eventDetails: BaseUIChangeEventDetails<'none'>,
      ) => {
        this.toggleChild(value, checked, eventDetails);
      },
      toggleParent: (eventDetails: BaseUIChangeEventDetails<'none'>) => {
        this.toggleParent(eventDetails);
      },
    };
  }

  private toggleChild(
    value: string,
    checked: boolean,
    eventDetails: BaseUIChangeEventDetails<'none'>,
  ) {
    const nextValue = this.getCurrentValue();

    if (checked) {
      if (!nextValue.includes(value)) {
        nextValue.push(value);
      }
    } else {
      const valueIndex = nextValue.indexOf(value);
      if (valueIndex !== -1) {
        nextValue.splice(valueIndex, 1);
      }
    }

    this.parentCycleValue = [...nextValue];
    this.parentStatus = 'mixed';
    this.commitValue(nextValue, eventDetails);
  }

  private toggleParent(eventDetails: BaseUIChangeEventDetails<'none'>) {
    const allValues = [...this.allValues];
    const value = this.getCurrentValue();

    // "none" = disabled items that were already checked (they stay checked when toggling off)
    const none = allValues.filter(
      (itemValue) =>
        this.disabledStates.get(itemValue) === true &&
        this.parentCycleValue.includes(itemValue),
    );

    // "all" = everything except disabled-unchecked items
    const all = allValues.filter(
      (itemValue) =>
        this.disabledStates.get(itemValue) !== true ||
        this.parentCycleValue.includes(itemValue),
    );

    const allOnOrOff =
      this.parentCycleValue.length === all.length ||
      this.parentCycleValue.length === 0;

    if (allOnOrOff) {
      this.commitValue(value.length === all.length ? none : all, eventDetails);
      return;
    }

    if (this.parentStatus === 'mixed') {
      this.parentStatus = 'on';
      this.commitValue(all, eventDetails);
      return;
    }

    if (this.parentStatus === 'on') {
      this.parentStatus = 'off';
      this.commitValue(none, eventDetails);
      return;
    }

    this.parentStatus = 'mixed';
    this.commitValue(this.parentCycleValue, eventDetails);
  }

  private commitValue(
    nextValue: string[],
    eventDetails: BaseUIChangeEventDetails<'none'> | CheckboxGroupChangeEventDetails,
  ) {
    this.onValueChange?.(nextValue, eventDetails as CheckboxGroupChangeEventDetails);

    if (eventDetails.isCanceled) {
      this.scheduleDomSync();
      return;
    }

    if (!this.isValueControlled) {
      this.internalValue = [...nextValue];
    }

    this.scheduleDomSync();
  }

  private scheduleDomSync() {
    if (this.syncQueued) {return;}

    this.syncQueued = true;
    queueMicrotask(() => {
      queueMicrotask(() => {
        this.syncQueued = false;
        this.publishStateChange();
      });
    });
  }

  private publishStateChange() {
    const runtimeState = this.getRuntimeState();
    setCheckboxGroupRuntimeState(this, runtimeState);

    const nextStateKey = JSON.stringify({
      allValues: runtimeState.allValues,
      disabled: runtimeState.disabled,
      id: runtimeState.id,
      value: runtimeState.value,
    });

    if (nextStateKey === this.lastPublishedStateKey) {return;}

    this.lastPublishedStateKey = nextStateKey;
    this.dispatchEvent(new CustomEvent(CHECKBOX_GROUP_STATE_CHANGE_EVENT));
  }
}

if (!customElements.get('checkbox-group')) {
  customElements.define('checkbox-group', CheckboxGroupElement);
}

// ─── Namespace exports ──────────────────────────────────────────────────────────

/**
 * Provides a shared state to a series of checkboxes.
 * Renders a `<div>` element by default.
 *
 * Documentation: [Base UI Checkbox Group](https://base-ui.com/react/components/checkbox-group)
 */
export function CheckboxGroup(props: CheckboxGroup.Props) {
  const {
    allValues = [],
    defaultValue = [],
    disabled = false,
    onValueChange,
    render,
    value,
    ...elementProps
  } = props;

  return useRender({
    defaultTagName: 'div',
    render,
    state: { disabled },
    ref: createCheckboxGroupBehaviorRef({
      allValues,
      defaultValue,
      disabled,
      onValueChange,
      value,
    }),
    props: {
      [CHECKBOX_GROUP_ATTRIBUTE]: '',
      'data-disabled': disabled ? '' : undefined,
      role: 'group',
      ...elementProps,
    },
  });
}

export namespace CheckboxGroup {
  export type Props = CheckboxGroupProps;
  export type State = CheckboxGroupState;
  export type ChangeEventDetails = CheckboxGroupChangeEventDetails;
}

// ─── Re-export shared types for consumers ───────────────────────────────────────

export type { CheckboxGroupRuntimeState } from './shared';

function createCheckboxGroupBehaviorRef(options: {
  allValues: string[];
  defaultValue: string[];
  disabled: boolean;
  onValueChange:
    | ((value: string[], eventDetails: CheckboxGroupChangeEventDetails) => void)
    | undefined;
  value: string[] | undefined;
}) {
  let element: HTMLElement | null = null;
  let internalValue = [...options.defaultValue];
  let parentCycleValue = [...(options.value ?? options.defaultValue)];
  let parentStatus: ParentStatus = 'mixed';
  const disabledStates = new Map<string, boolean>();
  const groupId = createCheckboxGroupId();
  let lastPublishedStateKey: string | null = null;

  function getCurrentValue() {
    return options.value !== undefined ? [...options.value] : [...internalValue];
  }

  function getRuntimeState(): CheckboxGroupRuntimeState {
    return {
      id: groupId,
      allValues: [...options.allValues],
      value: getCurrentValue(),
      disabled: options.disabled,
      disabledStates,
      toggleChild: (value, checked, eventDetails) => {
        toggleChild(value, checked, eventDetails);
      },
      toggleParent: (eventDetails) => {
        toggleParent(eventDetails);
      },
    };
  }

  function commitValue(
    nextValue: string[],
    eventDetails: BaseUIChangeEventDetails<'none'> | CheckboxGroupChangeEventDetails,
  ) {
    options.onValueChange?.(nextValue, eventDetails as CheckboxGroupChangeEventDetails);

    if (eventDetails.isCanceled) {
      sync();
      return;
    }

    if (options.value === undefined) {
      internalValue = [...nextValue];
    }

    sync();
  }

  function toggleChild(
    value: string,
    checked: boolean,
    eventDetails: BaseUIChangeEventDetails<'none'>,
  ) {
    const nextValue = getCurrentValue();

    if (checked) {
      if (!nextValue.includes(value)) {
        nextValue.push(value);
      }
    } else {
      const valueIndex = nextValue.indexOf(value);
      if (valueIndex !== -1) {
        nextValue.splice(valueIndex, 1);
      }
    }

    parentCycleValue = [...nextValue];
    parentStatus = 'mixed';
    commitValue(nextValue, eventDetails);
  }

  function toggleParent(eventDetails: BaseUIChangeEventDetails<'none'>) {
    const value = getCurrentValue();

    const none = options.allValues.filter(
      (itemValue) =>
        disabledStates.get(itemValue) === true && parentCycleValue.includes(itemValue),
    );

    const all = options.allValues.filter(
      (itemValue) =>
        disabledStates.get(itemValue) !== true || parentCycleValue.includes(itemValue),
    );

    const allOnOrOff = parentCycleValue.length === all.length || parentCycleValue.length === 0;

    if (allOnOrOff) {
      commitValue(value.length === all.length ? none : all, eventDetails);
      return;
    }

    if (parentStatus === 'mixed') {
      parentStatus = 'on';
      commitValue(all, eventDetails);
      return;
    }

    if (parentStatus === 'on') {
      parentStatus = 'off';
      commitValue(none, eventDetails);
      return;
    }

    parentStatus = 'mixed';
    commitValue(parentCycleValue, eventDetails);
  }

  function sync() {
    if (element == null) {
      return;
    }

    element.setAttribute(CHECKBOX_GROUP_ATTRIBUTE, '');
    element.setAttribute('role', 'group');
    element.toggleAttribute('data-disabled', options.disabled);
    setCheckboxGroupRuntimeState(element, getRuntimeState());

    const nextStateKey = JSON.stringify({
      allValues: options.allValues,
      disabled: options.disabled,
      id: groupId,
      value: getCurrentValue(),
    });

    if (nextStateKey === lastPublishedStateKey) {
      return;
    }

    lastPublishedStateKey = nextStateKey;
    element.dispatchEvent(new CustomEvent(CHECKBOX_GROUP_STATE_CHANGE_EVENT));
  }

  return (instance: HTMLElement | null) => {
    if (element != null) {
      setCheckboxGroupRuntimeState(element, null);
    }

    disabledStates.clear();
    lastPublishedStateKey = null;
    element = instance;

    if (element == null) {
      return;
    }

    sync();
  };
}

// ─── Global type declarations ───────────────────────────────────────────────────

declare global {
  interface HTMLElementTagNameMap {
    'checkbox-group': CheckboxGroupElement;
  }
}
