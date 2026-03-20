import { html, noChange, nothing, type TemplateResult } from 'lit';
// eslint-disable-next-line import/extensions
import { AsyncDirective, directive } from 'lit/async-directive.js';
// eslint-disable-next-line import/extensions
import type { BaseUIChangeEventDetails, ComponentRenderFn, HTMLProps } from '../types/index.ts';
// eslint-disable-next-line import/extensions
import { useRender } from '../use-render/index.ts';
import {
  CHECKBOX_GROUP_ATTRIBUTE,
  CHECKBOX_GROUP_STATE_CHANGE_EVENT,
  createCheckboxGroupId,
  setCheckboxGroupRuntimeState,
  type CheckboxGroupRuntimeState,
  // eslint-disable-next-line import/extensions
} from './shared.ts';

type ComponentPropsWithChildren<
  ElementType extends keyof HTMLElementTagNameMap,
  State,
  Children = unknown,
  RenderFunctionProps = HTMLProps,
> = Omit<useRender.ComponentProps<ElementType, State, RenderFunctionProps>, 'children'> & {
  children?: Children | undefined;
};

type CheckboxGroupRenderProps = HTMLProps<HTMLDivElement> & {
  children?: unknown;
};

type CheckboxGroupRenderProp =
  | TemplateResult
  | ComponentRenderFn<CheckboxGroupRenderProps, CheckboxGroupState>;

type ParentStatus = 'on' | 'off' | 'mixed';

const EMPTY_VALUES: string[] = [];

class CheckboxGroupDirective extends AsyncDirective {
  private latestProps: CheckboxGroupProps | null = null;
  private root: HTMLDivElement | null = null;
  private initialized = false;
  private defaultValue = EMPTY_VALUES;
  private parentCycleValue = EMPTY_VALUES;
  private parentStatus: ParentStatus = 'mixed';
  private disabledStates = new Map<string, boolean>();
  private syncQueued = false;
  private groupId = '';
  private lastPublishedStateKey: string | null = null;

  render(_componentProps: CheckboxGroupProps) {
    return noChange;
  }

  override update(
    _part: Parameters<AsyncDirective['update']>[0],
    [componentProps]: [CheckboxGroupProps],
  ) {
    this.latestProps = componentProps;

    if (!this.initialized) {
      const initialValue = componentProps.value ?? componentProps.defaultValue ?? EMPTY_VALUES;

      this.initialized = true;
      this.defaultValue = [...(componentProps.defaultValue ?? EMPTY_VALUES)];
      this.parentCycleValue = [...initialValue];
      this.groupId = createCheckboxGroupId();
    }

    this.scheduleDomSync();

    return this.renderCurrent();
  }

  override disconnected() {
    setCheckboxGroupRuntimeState(this.root, null);
    this.root = null;
    this.lastPublishedStateKey = null;
  }

  override reconnected() {}

  private renderCurrent() {
    if (this.latestProps == null) {
      return nothing;
    }

    const {
      allValues: allValuesProp,
      children,
      defaultValue: defaultValueProp,
      disabled = false,
      onValueChange: onValueChangeProp,
      render,
      value: valueProp,
      ...elementProps
    } = this.latestProps;
    void allValuesProp;
    void defaultValueProp;
    void onValueChangeProp;
    void valueProp;

    const state: CheckboxGroupState = {
      disabled,
    };

    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useRender<CheckboxGroupState, HTMLDivElement>({
      defaultTagName: 'div',
      render,
      ref: this.handleRootRef,
      state,
      props: {
        [CHECKBOX_GROUP_ATTRIBUTE]: '',
        role: 'group',
        ...elementProps,
        ...(children === undefined ? {} : { children }),
      },
    });
  }

  private getValue() {
    return [...(this.latestProps?.value ?? this.defaultValue)];
  }

  private getAllValues() {
    return [...(this.latestProps?.allValues ?? EMPTY_VALUES)];
  }

  private getRuntimeState(): CheckboxGroupRuntimeState {
    return {
      id: this.groupId,
      allValues: this.getAllValues(),
      value: this.getValue(),
      disabled: Boolean(this.latestProps?.disabled),
      disabledStates: this.disabledStates,
      toggleChild: (value, checked, eventDetails) => {
        this.toggleChild(value, checked, eventDetails);
      },
      toggleParent: (eventDetails) => {
        this.toggleParent(eventDetails);
      },
    };
  }

  private toggleChild(
    value: string,
    checked: boolean,
    eventDetails: BaseUIChangeEventDetails<'none'>,
  ) {
    const nextValue = this.getValue();

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
    const allValues = this.getAllValues();
    const value = this.getValue();
    const none = allValues.filter(
      (itemValue) =>
        this.disabledStates.get(itemValue) === true && this.parentCycleValue.includes(itemValue),
    );
    const all = allValues.filter(
      (itemValue) =>
        this.disabledStates.get(itemValue) !== true || this.parentCycleValue.includes(itemValue),
    );
    const allOnOrOff =
      this.parentCycleValue.length === all.length || this.parentCycleValue.length === 0;

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

  private commitValue(nextValue: string[], eventDetails: BaseUIChangeEventDetails<'none'>) {
    this.latestProps?.onValueChange?.(nextValue, eventDetails);

    if (eventDetails.isCanceled) {
      this.requestComponentUpdate();
      return;
    }

    if (this.latestProps?.value === undefined) {
      this.defaultValue = [...nextValue];
    }

    this.requestComponentUpdate();
  }

  private requestComponentUpdate() {
    if (!this.isConnected) {
      return;
    }

    try {
      this.setValue(this.renderCurrent());
    } catch (error) {
      if (isDetachedChildPartError(error)) {
        return;
      }

      throw error;
    }

    this.scheduleDomSync();
  }

  private scheduleDomSync() {
    if (this.syncQueued) {
      return;
    }

    this.syncQueued = true;
    queueMicrotask(() => {
      queueMicrotask(() => {
        this.syncQueued = false;
        this.publishStateChange();
      });
    });
  }

  private publishStateChange() {
    if (this.root == null) {
      return;
    }

    const runtimeState = this.getRuntimeState();
    setCheckboxGroupRuntimeState(this.root, runtimeState);

    const nextStateKey = JSON.stringify({
      allValues: runtimeState.allValues,
      disabled: runtimeState.disabled,
      id: runtimeState.id,
      value: runtimeState.value,
    });

    if (nextStateKey === this.lastPublishedStateKey) {
      return;
    }

    this.lastPublishedStateKey = nextStateKey;
    this.root.dispatchEvent(new CustomEvent(CHECKBOX_GROUP_STATE_CHANGE_EVENT));
  }

  private handleRootRef = (element: HTMLDivElement | null) => {
    setCheckboxGroupRuntimeState(this.root, null);
    this.root = element;
    setCheckboxGroupRuntimeState(this.root, this.getRuntimeState());
    this.scheduleDomSync();
  };
}

const checkboxGroupDirective = directive(CheckboxGroupDirective);

/**
 * Provides a shared state to a series of checkboxes.
 *
 * Documentation: [Base UI Checkbox Group](https://base-ui.com/react/components/checkbox-group)
 */
export function CheckboxGroup(componentProps: CheckboxGroup.Props): TemplateResult {
  return html`${checkboxGroupDirective(componentProps)}`;
}

export interface CheckboxGroupState {
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
}

export interface CheckboxGroupProps extends ComponentPropsWithChildren<'div', CheckboxGroupState> {
  /**
   * Names of the checkboxes in the group that should be ticked.
   *
   * To render an uncontrolled checkbox group, use the `defaultValue` prop instead.
   */
  value?: string[] | undefined;
  /**
   * Names of the checkboxes in the group that should be initially ticked.
   *
   * To render a controlled checkbox group, use the `value` prop instead.
   */
  defaultValue?: string[] | undefined;
  /**
   * Event handler called when a checkbox in the group is ticked or unticked.
   * Provides the new value as an argument.
   */
  onValueChange?:
    | ((value: string[], eventDetails: CheckboxGroup.ChangeEventDetails) => void)
    | undefined;
  /**
   * Names of all checkboxes in the group. Use this when creating a parent checkbox.
   */
  allValues?: string[] | undefined;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  render?: CheckboxGroupRenderProp | undefined;
}

export type CheckboxGroupChangeEventReason = 'none';
export type CheckboxGroupChangeEventDetails =
  BaseUIChangeEventDetails<CheckboxGroup.ChangeEventReason>;

export namespace CheckboxGroup {
  export type Props = CheckboxGroupProps;
  export type State = CheckboxGroupState;
  export type ChangeEventReason = CheckboxGroupChangeEventReason;
  export type ChangeEventDetails = CheckboxGroupChangeEventDetails;
}

function isDetachedChildPartError(error: unknown) {
  return (
    error instanceof Error &&
    error.message.includes('ChildPart') &&
    error.message.includes('no `parentNode`')
  );
}
