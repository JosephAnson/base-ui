import { ReactiveElement } from 'lit';
import {
  CHECKBOX_GROUP_ATTRIBUTE,
  CHECKBOX_GROUP_STATE_CHANGE_EVENT,
  createCheckboxGroupId,
  setCheckboxGroupRuntimeState,
  type CheckboxGroupRuntimeState,
} from './shared.ts';
import type { BaseUIChangeEventDetails } from '../types/index.ts';

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

  private _value: string[] | undefined;
  private _valueIsControlled = false;
  private _internalValue: string[] = [];
  private _initialized = false;
  private _groupId = '';
  private _parentCycleValue: string[] = [];
  private _parentStatus: ParentStatus = 'mixed';
  private _disabledStates = new Map<string, boolean>();
  private _syncQueued = false;
  private _lastPublishedStateKey: string | null = null;

  /** Controlled value. When set, the group becomes controlled. */
  get value(): string[] | undefined {
    return this._valueIsControlled ? this._value : undefined;
  }

  set value(val: string[] | undefined) {
    if (val === undefined) {
      this._valueIsControlled = false;
      this._value = undefined;
    } else {
      this._valueIsControlled = true;
      this._value = val;
    }
    this.requestUpdate();
  }

  /** Default value for uncontrolled mode. */
  get defaultValue(): string[] {
    return this._internalValue;
  }

  set defaultValue(val: string[]) {
    if (!this._initialized) {
      this._internalValue = [...val];
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

    if (!this._initialized) {
      this._initialized = true;
      const initialValue = this._valueIsControlled
        ? [...(this._value ?? [])]
        : [...this._internalValue];
      this._parentCycleValue = [...initialValue];
      this._groupId = createCheckboxGroupId();
    }

    this.setAttribute(CHECKBOX_GROUP_ATTRIBUTE, '');
    this.setAttribute('role', 'group');
    // Publish runtime state immediately so child checkboxes can find it during connectedCallback
    setCheckboxGroupRuntimeState(this, this._getRuntimeState());
    this._scheduleDomSync();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    setCheckboxGroupRuntimeState(this, null);
    this._lastPublishedStateKey = null;
  }

  protected override updated() {
    this.setAttribute(CHECKBOX_GROUP_ATTRIBUTE, '');
    this.setAttribute('role', 'group');
    this._scheduleDomSync();
  }

  getState(): CheckboxGroupState {
    return {
      disabled: this.disabled,
    };
  }

  private _getCurrentValue(): string[] {
    if (this._valueIsControlled) {
      return [...(this._value ?? [])];
    }
    return [...this._internalValue];
  }

  private _getRuntimeState(): CheckboxGroupRuntimeState {
    return {
      id: this._groupId,
      allValues: [...this.allValues],
      value: this._getCurrentValue(),
      disabled: this.disabled,
      disabledStates: this._disabledStates,
      toggleChild: (
        value: string,
        checked: boolean,
        eventDetails: BaseUIChangeEventDetails<'none'>,
      ) => {
        this._toggleChild(value, checked, eventDetails);
      },
      toggleParent: (eventDetails: BaseUIChangeEventDetails<'none'>) => {
        this._toggleParent(eventDetails);
      },
    };
  }

  private _toggleChild(
    value: string,
    checked: boolean,
    eventDetails: BaseUIChangeEventDetails<'none'>,
  ) {
    const nextValue = this._getCurrentValue();

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

    this._parentCycleValue = [...nextValue];
    this._parentStatus = 'mixed';
    this._commitValue(nextValue, eventDetails);
  }

  private _toggleParent(eventDetails: BaseUIChangeEventDetails<'none'>) {
    const allValues = [...this.allValues];
    const value = this._getCurrentValue();

    // "none" = disabled items that were already checked (they stay checked when toggling off)
    const none = allValues.filter(
      (itemValue) =>
        this._disabledStates.get(itemValue) === true &&
        this._parentCycleValue.includes(itemValue),
    );

    // "all" = everything except disabled-unchecked items
    const all = allValues.filter(
      (itemValue) =>
        this._disabledStates.get(itemValue) !== true ||
        this._parentCycleValue.includes(itemValue),
    );

    const allOnOrOff =
      this._parentCycleValue.length === all.length ||
      this._parentCycleValue.length === 0;

    if (allOnOrOff) {
      this._commitValue(value.length === all.length ? none : all, eventDetails);
      return;
    }

    if (this._parentStatus === 'mixed') {
      this._parentStatus = 'on';
      this._commitValue(all, eventDetails);
      return;
    }

    if (this._parentStatus === 'on') {
      this._parentStatus = 'off';
      this._commitValue(none, eventDetails);
      return;
    }

    this._parentStatus = 'mixed';
    this._commitValue(this._parentCycleValue, eventDetails);
  }

  private _commitValue(
    nextValue: string[],
    eventDetails: BaseUIChangeEventDetails<'none'> | CheckboxGroupChangeEventDetails,
  ) {
    this.onValueChange?.(nextValue, eventDetails as CheckboxGroupChangeEventDetails);

    if (eventDetails.isCanceled) {
      this._scheduleDomSync();
      return;
    }

    if (!this._valueIsControlled) {
      this._internalValue = [...nextValue];
    }

    this._scheduleDomSync();
  }

  private _scheduleDomSync() {
    if (this._syncQueued) return;

    this._syncQueued = true;
    queueMicrotask(() => {
      queueMicrotask(() => {
        this._syncQueued = false;
        this._publishStateChange();
      });
    });
  }

  private _publishStateChange() {
    const runtimeState = this._getRuntimeState();
    setCheckboxGroupRuntimeState(this, runtimeState);

    const nextStateKey = JSON.stringify({
      allValues: runtimeState.allValues,
      disabled: runtimeState.disabled,
      id: runtimeState.id,
      value: runtimeState.value,
    });

    if (nextStateKey === this._lastPublishedStateKey) return;

    this._lastPublishedStateKey = nextStateKey;
    this.dispatchEvent(new CustomEvent(CHECKBOX_GROUP_STATE_CHANGE_EVENT));
  }
}

if (!customElements.get('checkbox-group')) {
  customElements.define('checkbox-group', CheckboxGroupElement);
}

// ─── Namespace exports ──────────────────────────────────────────────────────────

export namespace CheckboxGroup {
  export type State = CheckboxGroupState;
  export type ChangeEventDetails = CheckboxGroupChangeEventDetails;
}

// ─── Re-export shared types for consumers ───────────────────────────────────────

export type { CheckboxGroupRuntimeState } from './shared.ts';

// ─── Global type declarations ───────────────────────────────────────────────────

declare global {
  interface HTMLElementTagNameMap {
    'checkbox-group': CheckboxGroupElement;
  }
}
