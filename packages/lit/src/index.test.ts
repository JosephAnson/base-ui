import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  Button as rootButton,
  Checkbox as rootCheckbox,
  CheckboxGroup as rootCheckboxGroup,
  type CheckboxGroupChangeEventDetails as RootCheckboxGroupChangeEventDetails,
  type CheckboxGroupProps as RootCheckboxGroupProps,
  type CheckboxGroupState as RootCheckboxGroupState,
  type CheckboxIndicatorProps as RootCheckboxIndicatorProps,
  type CheckboxIndicatorState as RootCheckboxIndicatorState,
  type CheckboxRootChangeEventDetails as RootCheckboxRootChangeEventDetails,
  type CheckboxRootProps as RootCheckboxRootProps,
  type CheckboxRootState as RootCheckboxRootState,
  type BaseUIChangeEventDetails as RootBaseUIChangeEventDetails,
  type BaseUIEvent as RootBaseUIEvent,
  type BaseUIGenericEventDetails as RootBaseUIGenericEventDetails,
  type ButtonProps as RootButtonProps,
  type ButtonState as RootButtonState,
  type ComponentRenderFn as RootComponentRenderFn,
  Field as rootField,
  Fieldset as rootFieldset,
  type FieldControlChangeEventDetails as RootFieldControlChangeEventDetails,
  type FieldControlProps as RootFieldControlProps,
  type FieldControlState as RootFieldControlState,
  type FieldsetLegendProps as RootFieldsetLegendProps,
  type FieldsetLegendState as RootFieldsetLegendState,
  type FieldsetRootProps as RootFieldsetRootProps,
  type FieldsetRootState as RootFieldsetRootState,
  type FieldRootProps as RootFieldRootProps,
  type FieldRootState as RootFieldRootState,
  type FieldValidityProps as RootFieldValidityProps,
  type FieldValidityState as RootFieldValidityState,
  type HTMLProps as RootHTMLProps,
  Input as rootInput,
  type InputChangeEventDetails as RootInputChangeEventDetails,
  type InputProps as RootInputProps,
  type InputState as RootInputState,
  Meter as rootMeter,
  type MeterIndicatorProps as RootMeterIndicatorProps,
  type MeterIndicatorState as RootMeterIndicatorState,
  type MeterLabelProps as RootMeterLabelProps,
  type MeterLabelState as RootMeterLabelState,
  type MeterRootProps as RootMeterRootProps,
  type MeterRootState as RootMeterRootState,
  type MeterTrackProps as RootMeterTrackProps,
  type MeterTrackState as RootMeterTrackState,
  type MeterValueProps as RootMeterValueProps,
  type MeterValueState as RootMeterValueState,
  Progress as rootProgress,
  Radio as rootRadio,
  RadioGroup as rootRadioGroup,
  type RadioGroupChangeEventDetails as RootRadioGroupChangeEventDetails,
  type RadioGroupProps as RootRadioGroupProps,
  type RadioGroupState as RootRadioGroupState,
  type RadioIndicatorProps as RootRadioIndicatorProps,
  type RadioIndicatorState as RootRadioIndicatorState,
  type RadioRootProps as RootRadioRootProps,
  type RadioRootState as RootRadioRootState,
  type ProgressIndicatorProps as RootProgressIndicatorProps,
  type ProgressIndicatorState as RootProgressIndicatorState,
  type ProgressLabelProps as RootProgressLabelProps,
  type ProgressLabelState as RootProgressLabelState,
  type ProgressRootProps as RootProgressRootProps,
  type ProgressRootState as RootProgressRootState,
  type ProgressStatus as RootProgressStatus,
  type ProgressTrackProps as RootProgressTrackProps,
  type ProgressTrackState as RootProgressTrackState,
  type ProgressValueProps as RootProgressValueProps,
  type ProgressValueState as RootProgressValueState,
  type SeparatorProps as RootSeparatorProps,
  type SeparatorState as RootSeparatorState,
  Switch as rootSwitch,
  type SwitchRootProps as RootSwitchRootProps,
  type SwitchRootState as RootSwitchRootState,
  type SwitchThumbProps as RootSwitchThumbProps,
  type SwitchThumbState as RootSwitchThumbState,
  Toggle as rootToggle,
  type ToggleChangeEventDetails as RootToggleChangeEventDetails,
  type ToggleProps as RootToggleProps,
  type ToggleState as RootToggleState,
  mergeClassNames as rootMergeClassNames,
  mergeProps as rootMergeProps,
  mergePropsN as rootMergePropsN,
  Separator as rootSeparator,
  useRender as rootUseRender,
} from '@base-ui/lit';
import { Button as subpathButton } from '@base-ui/lit/button';
import { Checkbox as subpathCheckbox } from '@base-ui/lit/checkbox';
import { CheckboxGroup as subpathCheckboxGroup } from '@base-ui/lit/checkbox-group';
import { Field as subpathField } from '@base-ui/lit/field';
import { Fieldset as subpathFieldset } from '@base-ui/lit/fieldset';
import {
  mergeClassNames as subpathMergeClassNames,
  mergeProps as subpathMergeProps,
  mergePropsN as subpathMergePropsN,
} from '@base-ui/lit/merge-props';
import { Input as subpathInput } from '@base-ui/lit/input';
import { Meter as subpathMeter } from '@base-ui/lit/meter';
import { Progress as subpathProgress } from '@base-ui/lit/progress';
import { Radio as subpathRadio } from '@base-ui/lit/radio';
import { RadioGroup as subpathRadioGroup } from '@base-ui/lit/radio-group';
import { Separator as subpathSeparator } from '@base-ui/lit/separator';
import { Switch as subpathSwitch } from '@base-ui/lit/switch';
import { Toggle as subpathToggle } from '@base-ui/lit/toggle';
import { useRender as subpathUseRender } from '@base-ui/lit/use-render';
import type {
  BaseUIChangeEventDetails as TypesBaseUIChangeEventDetails,
  BaseUIEvent as TypesBaseUIEvent,
  BaseUIGenericEventDetails as TypesBaseUIGenericEventDetails,
  ComponentRenderFn as TypesComponentRenderFn,
  HTMLProps as TypesHTMLProps,
} from '@base-ui/lit/types';
import type {
  ButtonProps as SubpathButtonProps,
  ButtonState as SubpathButtonState,
} from '@base-ui/lit/button';
import type {
  CheckboxIndicatorProps as SubpathCheckboxIndicatorProps,
  CheckboxIndicatorState as SubpathCheckboxIndicatorState,
  CheckboxRootChangeEventDetails as SubpathCheckboxRootChangeEventDetails,
  CheckboxRootProps as SubpathCheckboxRootProps,
  CheckboxRootState as SubpathCheckboxRootState,
} from '@base-ui/lit/checkbox';
import type {
  CheckboxGroupChangeEventDetails as SubpathCheckboxGroupChangeEventDetails,
  CheckboxGroupProps as SubpathCheckboxGroupProps,
  CheckboxGroupState as SubpathCheckboxGroupState,
} from '@base-ui/lit/checkbox-group';
import type {
  FieldControlChangeEventDetails as SubpathFieldControlChangeEventDetails,
  FieldControlProps as SubpathFieldControlProps,
  FieldControlState as SubpathFieldControlState,
  FieldRootProps as SubpathFieldRootProps,
  FieldRootState as SubpathFieldRootState,
  FieldValidityProps as SubpathFieldValidityProps,
  FieldValidityState as SubpathFieldValidityState,
} from '@base-ui/lit/field';
import type {
  FieldsetLegendProps as SubpathFieldsetLegendProps,
  FieldsetLegendState as SubpathFieldsetLegendState,
  FieldsetRootProps as SubpathFieldsetRootProps,
  FieldsetRootState as SubpathFieldsetRootState,
} from '@base-ui/lit/fieldset';
import type {
  InputChangeEventDetails as SubpathInputChangeEventDetails,
  InputProps as SubpathInputProps,
  InputState as SubpathInputState,
} from '@base-ui/lit/input';
import type {
  MeterIndicatorProps as SubpathMeterIndicatorProps,
  MeterIndicatorState as SubpathMeterIndicatorState,
  MeterLabelProps as SubpathMeterLabelProps,
  MeterLabelState as SubpathMeterLabelState,
  MeterRootProps as SubpathMeterRootProps,
  MeterRootState as SubpathMeterRootState,
  MeterTrackProps as SubpathMeterTrackProps,
  MeterTrackState as SubpathMeterTrackState,
  MeterValueProps as SubpathMeterValueProps,
  MeterValueState as SubpathMeterValueState,
} from '@base-ui/lit/meter';
import type {
  ProgressIndicatorProps as SubpathProgressIndicatorProps,
  ProgressIndicatorState as SubpathProgressIndicatorState,
  ProgressLabelProps as SubpathProgressLabelProps,
  ProgressLabelState as SubpathProgressLabelState,
  ProgressRootProps as SubpathProgressRootProps,
  ProgressRootState as SubpathProgressRootState,
  ProgressStatus as SubpathProgressStatus,
  ProgressTrackProps as SubpathProgressTrackProps,
  ProgressTrackState as SubpathProgressTrackState,
  ProgressValueProps as SubpathProgressValueProps,
  ProgressValueState as SubpathProgressValueState,
} from '@base-ui/lit/progress';
import type {
  RadioIndicatorProps as SubpathRadioIndicatorProps,
  RadioIndicatorState as SubpathRadioIndicatorState,
  RadioRootProps as SubpathRadioRootProps,
  RadioRootState as SubpathRadioRootState,
} from '@base-ui/lit/radio';
import type {
  RadioGroupChangeEventDetails as SubpathRadioGroupChangeEventDetails,
  RadioGroupProps as SubpathRadioGroupProps,
  RadioGroupState as SubpathRadioGroupState,
} from '@base-ui/lit/radio-group';
import type {
  SeparatorProps as SubpathSeparatorProps,
  SeparatorState as SubpathSeparatorState,
} from '@base-ui/lit/separator';
import type {
  SwitchRootProps as SubpathSwitchRootProps,
  SwitchRootState as SubpathSwitchRootState,
  SwitchThumbProps as SubpathSwitchThumbProps,
  SwitchThumbState as SubpathSwitchThumbState,
} from '@base-ui/lit/switch';
import type {
  ToggleChangeEventDetails as SubpathToggleChangeEventDetails,
  ToggleProps as SubpathToggleProps,
  ToggleState as SubpathToggleState,
} from '@base-ui/lit/toggle';

describe('@base-ui/lit', () => {
  it('re-exports merge-props from the package root', async () => {
    const module = await import('@base-ui/lit');

    expect(module.mergeProps).toBe(subpathMergeProps);
    expect(module.mergePropsN).toBe(subpathMergePropsN);
    expect(module.mergeClassNames).toBe(subpathMergeClassNames);
    expect(rootMergeProps).toBe(subpathMergeProps);
    expect(rootMergePropsN).toBe(subpathMergePropsN);
    expect(rootMergeClassNames).toBe(subpathMergeClassNames);
  });

  it('re-exports button from the package root', async () => {
    const module = await import('@base-ui/lit');

    expect(module.Button).toBe(subpathButton);
    expect(rootButton).toBe(subpathButton);
  });

  it('re-exports checkbox from the package root', async () => {
    const module = await import('@base-ui/lit');

    expect(module.Checkbox).toBe(subpathCheckbox);
    expect(rootCheckbox).toBe(subpathCheckbox);
  });

  it('re-exports checkbox-group from the package root', async () => {
    const module = await import('@base-ui/lit');

    expect(module.CheckboxGroup).toBe(subpathCheckboxGroup);
    expect(rootCheckboxGroup).toBe(subpathCheckboxGroup);
  });

  it('re-exports field from the package root', async () => {
    const module = await import('@base-ui/lit');

    expect(module.Field).toBe(subpathField);
    expect(rootField).toBe(subpathField);
  });

  it('re-exports fieldset from the package root', async () => {
    const module = await import('@base-ui/lit');

    expect(module.Fieldset).toBe(subpathFieldset);
    expect(rootFieldset).toBe(subpathFieldset);
  });

  it('re-exports input from the package root', async () => {
    const module = await import('@base-ui/lit');

    expect(module.Input).toBe(subpathInput);
    expect(rootInput).toBe(subpathInput);
  });

  it('re-exports useRender from the package root', async () => {
    const module = await import('@base-ui/lit');

    expect(module.useRender).toBe(subpathUseRender);
    expect(rootUseRender).toBe(subpathUseRender);
  });

  it('re-exports separator from the package root', async () => {
    const module = await import('@base-ui/lit');

    expect(module.Separator).toBe(subpathSeparator);
    expect(rootSeparator).toBe(subpathSeparator);
  });

  it('re-exports meter from the package root', async () => {
    const module = await import('@base-ui/lit');

    expect(module.Meter).toBe(subpathMeter);
    expect(rootMeter).toBe(subpathMeter);
  });

  it('re-exports progress from the package root', async () => {
    const module = await import('@base-ui/lit');

    expect(module.Progress).toBe(subpathProgress);
    expect(rootProgress).toBe(subpathProgress);
  });

  it('re-exports radio from the package root', async () => {
    const module = await import('@base-ui/lit');

    expect(module.Radio).toBe(subpathRadio);
    expect(rootRadio).toBe(subpathRadio);
  });

  it('re-exports radio-group from the package root', async () => {
    const module = await import('@base-ui/lit');

    expect(module.RadioGroup).toBe(subpathRadioGroup);
    expect(rootRadioGroup).toBe(subpathRadioGroup);
  });

  it('re-exports switch from the package root', async () => {
    const module = await import('@base-ui/lit');

    expect(module.Switch).toBe(subpathSwitch);
    expect(rootSwitch).toBe(subpathSwitch);
  });

  it('re-exports toggle from the package root', async () => {
    const module = await import('@base-ui/lit');

    expect(module.Toggle).toBe(subpathToggle);
    expect(rootToggle).toBe(subpathToggle);
  });

  it('re-exports the types entrypoint from the package root', () => {
    expectTypeOf<RootHTMLProps<HTMLButtonElement>>().toEqualTypeOf<
      TypesHTMLProps<HTMLButtonElement>
    >();
    expectTypeOf<RootComponentRenderFn<{ id: string }, { pressed: boolean }>>().toEqualTypeOf<
      TypesComponentRenderFn<{ id: string }, { pressed: boolean }>
    >();
    expectTypeOf<RootBaseUIEvent<PointerEvent>>().toEqualTypeOf<TypesBaseUIEvent<PointerEvent>>();
    expectTypeOf<RootBaseUIChangeEventDetails<'input-blur', { value: string }>>().toEqualTypeOf<
      TypesBaseUIChangeEventDetails<'input-blur', { value: string }>
    >();
    expectTypeOf<RootBaseUIGenericEventDetails<'keyboard', { active: boolean }>>().toEqualTypeOf<
      TypesBaseUIGenericEventDetails<'keyboard', { active: boolean }>
    >();
    expectTypeOf<RootButtonProps>().toEqualTypeOf<SubpathButtonProps>();
    expectTypeOf<RootButtonState>().toEqualTypeOf<SubpathButtonState>();
    expectTypeOf<RootCheckboxGroupProps>().toEqualTypeOf<SubpathCheckboxGroupProps>();
    expectTypeOf<RootCheckboxGroupState>().toEqualTypeOf<SubpathCheckboxGroupState>();
    expectTypeOf<RootCheckboxGroupChangeEventDetails>().toEqualTypeOf<SubpathCheckboxGroupChangeEventDetails>();
    expectTypeOf<RootCheckboxRootProps>().toEqualTypeOf<SubpathCheckboxRootProps>();
    expectTypeOf<RootCheckboxRootState>().toEqualTypeOf<SubpathCheckboxRootState>();
    expectTypeOf<RootCheckboxIndicatorProps>().toEqualTypeOf<SubpathCheckboxIndicatorProps>();
    expectTypeOf<RootCheckboxIndicatorState>().toEqualTypeOf<SubpathCheckboxIndicatorState>();
    expectTypeOf<RootCheckboxRootChangeEventDetails>().toEqualTypeOf<SubpathCheckboxRootChangeEventDetails>();
    expectTypeOf<RootFieldRootProps>().toEqualTypeOf<SubpathFieldRootProps>();
    expectTypeOf<RootFieldRootState>().toEqualTypeOf<SubpathFieldRootState>();
    expectTypeOf<RootFieldControlProps>().toEqualTypeOf<SubpathFieldControlProps>();
    expectTypeOf<RootFieldControlState>().toEqualTypeOf<SubpathFieldControlState>();
    expectTypeOf<RootFieldControlChangeEventDetails>().toEqualTypeOf<SubpathFieldControlChangeEventDetails>();
    expectTypeOf<RootFieldsetRootProps>().toEqualTypeOf<SubpathFieldsetRootProps>();
    expectTypeOf<RootFieldsetRootState>().toEqualTypeOf<SubpathFieldsetRootState>();
    expectTypeOf<RootFieldsetLegendProps>().toEqualTypeOf<SubpathFieldsetLegendProps>();
    expectTypeOf<RootFieldsetLegendState>().toEqualTypeOf<SubpathFieldsetLegendState>();
    expectTypeOf<RootFieldValidityProps>().toEqualTypeOf<SubpathFieldValidityProps>();
    expectTypeOf<RootFieldValidityState>().toEqualTypeOf<SubpathFieldValidityState>();
    expectTypeOf<RootInputProps>().toEqualTypeOf<SubpathInputProps>();
    expectTypeOf<RootInputState>().toEqualTypeOf<SubpathInputState>();
    expectTypeOf<RootInputChangeEventDetails>().toEqualTypeOf<SubpathInputChangeEventDetails>();
    expectTypeOf<RootSeparatorProps>().toEqualTypeOf<SubpathSeparatorProps>();
    expectTypeOf<RootSeparatorState>().toEqualTypeOf<SubpathSeparatorState>();
    expectTypeOf<RootSwitchRootProps>().toEqualTypeOf<SubpathSwitchRootProps>();
    expectTypeOf<RootSwitchRootState>().toEqualTypeOf<SubpathSwitchRootState>();
    expectTypeOf<RootSwitchThumbProps>().toEqualTypeOf<SubpathSwitchThumbProps>();
    expectTypeOf<RootSwitchThumbState>().toEqualTypeOf<SubpathSwitchThumbState>();
    expectTypeOf<RootToggleProps>().toEqualTypeOf<SubpathToggleProps>();
    expectTypeOf<RootToggleState>().toEqualTypeOf<SubpathToggleState>();
    expectTypeOf<RootToggleChangeEventDetails>().toEqualTypeOf<SubpathToggleChangeEventDetails>();
    expectTypeOf<RootMeterRootProps>().toEqualTypeOf<SubpathMeterRootProps>();
    expectTypeOf<RootMeterRootState>().toEqualTypeOf<SubpathMeterRootState>();
    expectTypeOf<RootMeterTrackProps>().toEqualTypeOf<SubpathMeterTrackProps>();
    expectTypeOf<RootMeterTrackState>().toEqualTypeOf<SubpathMeterTrackState>();
    expectTypeOf<RootMeterIndicatorProps>().toEqualTypeOf<SubpathMeterIndicatorProps>();
    expectTypeOf<RootMeterIndicatorState>().toEqualTypeOf<SubpathMeterIndicatorState>();
    expectTypeOf<RootMeterLabelProps>().toEqualTypeOf<SubpathMeterLabelProps>();
    expectTypeOf<RootMeterLabelState>().toEqualTypeOf<SubpathMeterLabelState>();
    expectTypeOf<RootMeterValueProps>().toEqualTypeOf<SubpathMeterValueProps>();
    expectTypeOf<RootMeterValueState>().toEqualTypeOf<SubpathMeterValueState>();
    expectTypeOf<RootProgressRootProps>().toEqualTypeOf<SubpathProgressRootProps>();
    expectTypeOf<RootProgressRootState>().toEqualTypeOf<SubpathProgressRootState>();
    expectTypeOf<RootProgressStatus>().toEqualTypeOf<SubpathProgressStatus>();
    expectTypeOf<RootProgressTrackProps>().toEqualTypeOf<SubpathProgressTrackProps>();
    expectTypeOf<RootProgressTrackState>().toEqualTypeOf<SubpathProgressTrackState>();
    expectTypeOf<RootProgressIndicatorProps>().toEqualTypeOf<SubpathProgressIndicatorProps>();
    expectTypeOf<RootProgressIndicatorState>().toEqualTypeOf<SubpathProgressIndicatorState>();
    expectTypeOf<RootProgressLabelProps>().toEqualTypeOf<SubpathProgressLabelProps>();
    expectTypeOf<RootProgressLabelState>().toEqualTypeOf<SubpathProgressLabelState>();
    expectTypeOf<RootProgressValueProps>().toEqualTypeOf<SubpathProgressValueProps>();
    expectTypeOf<RootProgressValueState>().toEqualTypeOf<SubpathProgressValueState>();
    expectTypeOf<RootRadioRootProps>().toEqualTypeOf<SubpathRadioRootProps>();
    expectTypeOf<RootRadioRootState>().toEqualTypeOf<SubpathRadioRootState>();
    expectTypeOf<RootRadioIndicatorProps>().toEqualTypeOf<SubpathRadioIndicatorProps>();
    expectTypeOf<RootRadioIndicatorState>().toEqualTypeOf<SubpathRadioIndicatorState>();
    expectTypeOf<RootRadioGroupProps>().toEqualTypeOf<SubpathRadioGroupProps>();
    expectTypeOf<RootRadioGroupState>().toEqualTypeOf<SubpathRadioGroupState>();
    expectTypeOf<RootRadioGroupChangeEventDetails>().toEqualTypeOf<SubpathRadioGroupChangeEventDetails>();
  });
});
