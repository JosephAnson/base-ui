import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  AlertDialog as rootAlertDialog,
  AutocompleteRootElement as rootAutocompleteRootElement,
  type AutocompleteRootState as RootAutocompleteRootState,
  type AutocompleteFilterMode as RootAutocompleteFilterMode,
  type AutocompleteChangeEventReason as RootAutocompleteChangeEventReason,
  type AutocompleteChangeEventDetails as RootAutocompleteChangeEventDetails,
  Button as rootButton,
  ButtonRootElement as rootButtonRootElement,
  CalendarRootElement as rootCalendarRootElement,
  type CalendarRootState as RootCalendarRootState,
  type CalendarDayGridState as RootCalendarDayGridState,
  type CalendarDayGridHeaderState as RootCalendarDayGridHeaderState,
  type CalendarDayGridHeaderRowState as RootCalendarDayGridHeaderRowState,
  type CalendarDayGridHeaderCellState as RootCalendarDayGridHeaderCellState,
  type CalendarDayGridBodyState as RootCalendarDayGridBodyState,
  type CalendarDayGridRowState as RootCalendarDayGridRowState,
  type CalendarDayGridCellState as RootCalendarDayGridCellState,
  type CalendarDayButtonState as RootCalendarDayButtonState,
  type CalendarIncrementMonthState as RootCalendarIncrementMonthState,
  type CalendarDecrementMonthState as RootCalendarDecrementMonthState,
  type CalendarChangeEventDetails as RootCalendarChangeEventDetails,
  Checkbox as rootCheckbox,
  CheckboxGroup as rootCheckboxGroup,
  Collapsible as rootCollapsible,
  ComboboxRootElement as rootComboboxRootElement,
  type ComboboxRootState as RootComboboxRootState,
  type ComboboxInputState as RootComboboxInputState,
  type ComboboxInputGroupState as RootComboboxInputGroupState,
  type ComboboxTriggerState as RootComboboxTriggerState,
  type ComboboxValueState as RootComboboxValueState,
  type ComboboxPopupState as RootComboboxPopupState,
  type ComboboxItemState as RootComboboxItemState,
  type ComboboxItemIndicatorState as RootComboboxItemIndicatorState,
  type ComboboxItemTextState as RootComboboxItemTextState,
  type ComboboxGroupState as RootComboboxGroupState,
  type ComboboxGroupLabelState as RootComboboxGroupLabelState,
  type ComboboxIconState as RootComboboxIconState,
  type ComboboxClearState as RootComboboxClearState,
  type ComboboxEmptyState as RootComboboxEmptyState,
  type ComboboxLabelState as RootComboboxLabelState,
  type ComboboxChangeEventReason as RootComboboxChangeEventReason,
  type ComboboxChangeEventDetails as RootComboboxChangeEventDetails,
  ContextMenuRootElement as rootContextMenuRootElement,
  ContextMenuTriggerElement as rootContextMenuTriggerElement,
  type ContextMenuRootState as RootContextMenuRootState,
  type ContextMenuTriggerState as RootContextMenuTriggerState,
  Dialog as rootDialog,
  DrawerRootElement as rootDrawerRootElement,
  type DrawerRootState as RootDrawerRootState,
  type DrawerTriggerState as RootDrawerTriggerState,
  type DrawerPopupState as RootDrawerPopupState,
  type DrawerBackdropState as RootDrawerBackdropState,
  type DrawerContentState as RootDrawerContentState,
  type DrawerCloseState as RootDrawerCloseState,
  type DrawerViewportState as RootDrawerViewportState,
  type DrawerSwipeAreaState as RootDrawerSwipeAreaState,
  type DrawerProviderState as RootDrawerProviderState,
  type DrawerIndentState as RootDrawerIndentState,
  type DrawerIndentBackgroundState as RootDrawerIndentBackgroundState,
  type AlertDialogBackdropProps as RootAlertDialogBackdropProps,
  type AlertDialogBackdropState as RootAlertDialogBackdropState,
  type AlertDialogCloseProps as RootAlertDialogCloseProps,
  type AlertDialogCloseState as RootAlertDialogCloseState,
  type AlertDialogDescriptionProps as RootAlertDialogDescriptionProps,
  type AlertDialogDescriptionState as RootAlertDialogDescriptionState,
  type AlertDialogPopupProps as RootAlertDialogPopupProps,
  type AlertDialogPopupState as RootAlertDialogPopupState,
  type AlertDialogPortalProps as RootAlertDialogPortalProps,
  type AlertDialogPortalState as RootAlertDialogPortalState,
  type AlertDialogRootChangeEventDetails as RootAlertDialogRootChangeEventDetails,
  type AlertDialogRootProps as RootAlertDialogRootProps,
  type AlertDialogRootState as RootAlertDialogRootState,
  type AlertDialogTitleProps as RootAlertDialogTitleProps,
  type AlertDialogTitleState as RootAlertDialogTitleState,
  type AlertDialogTriggerProps as RootAlertDialogTriggerProps,
  type AlertDialogTriggerState as RootAlertDialogTriggerState,
  type AlertDialogViewportProps as RootAlertDialogViewportProps,
  type AlertDialogViewportState as RootAlertDialogViewportState,
  type CheckboxGroupChangeEventDetails as RootCheckboxGroupChangeEventDetails,
  type CheckboxGroupProps as RootCheckboxGroupProps,
  type CheckboxGroupState as RootCheckboxGroupState,
  type CheckboxIndicatorProps as RootCheckboxIndicatorProps,
  type CheckboxIndicatorState as RootCheckboxIndicatorState,
  type CheckboxRootChangeEventDetails as RootCheckboxRootChangeEventDetails,
  type CheckboxRootProps as RootCheckboxRootProps,
  type CheckboxRootState as RootCheckboxRootState,
  type CollapsiblePanelProps as RootCollapsiblePanelProps,
  type CollapsiblePanelState as RootCollapsiblePanelState,
  type CollapsibleRootChangeEventDetails as RootCollapsibleRootChangeEventDetails,
  type CollapsibleRootChangeEventReason as RootCollapsibleRootChangeEventReason,
  type CollapsibleRootProps as RootCollapsibleRootProps,
  type CollapsibleRootState as RootCollapsibleRootState,
  type CollapsibleTriggerProps as RootCollapsibleTriggerProps,
  type CollapsibleTriggerState as RootCollapsibleTriggerState,
  type DialogBackdropProps as RootDialogBackdropProps,
  type DialogBackdropState as RootDialogBackdropState,
  type DialogCloseProps as RootDialogCloseProps,
  type DialogPopupProps as RootDialogPopupProps,
  type DialogPopupState as RootDialogPopupState,
  type DialogRootChangeEventDetails as RootDialogRootChangeEventDetails,
  type DialogRootProps as RootDialogRootProps,
  type DialogTriggerProps as RootDialogTriggerProps,
  type DialogTriggerState as RootDialogTriggerState,
  type DialogViewportProps as RootDialogViewportProps,
  type DialogViewportState as RootDialogViewportState,
  type BaseUIChangeEventDetails as RootBaseUIChangeEventDetails,
  type BaseUIEvent as RootBaseUIEvent,
  type BaseUIGenericEventDetails as RootBaseUIGenericEventDetails,
  type ButtonProps as RootButtonProps,
  type ButtonRootProps as RootButtonRootProps,
  type ButtonRootState as RootButtonRootState,
  type ButtonState as RootButtonState,
  type ComponentRenderFn as RootComponentRenderFn,
  Field as rootField,
  Fieldset as rootFieldset,
  Form as rootForm,
  type FieldControlChangeEventDetails as RootFieldControlChangeEventDetails,
  type FieldControlProps as RootFieldControlProps,
  type FieldControlState as RootFieldControlState,
  type FieldsetLegendProps as RootFieldsetLegendProps,
  type FieldsetLegendState as RootFieldsetLegendState,
  type FieldsetRootProps as RootFieldsetRootProps,
  type FieldsetRootState as RootFieldsetRootState,
  type FormProps as RootFormProps,
  type FormState as RootFormState,
  type FormSubmitEventDetails as RootFormSubmitEventDetails,
  type FieldRootProps as RootFieldRootProps,
  type FieldRootState as RootFieldRootState,
  type FieldValidityProps as RootFieldValidityProps,
  type FieldValidityState as RootFieldValidityState,
  type HTMLProps as RootHTMLProps,
  Input as rootInput,
  Menu as rootMenu,
  MenubarRootElement as rootMenubarRootElement,
  type InputChangeEventDetails as RootInputChangeEventDetails,
  type InputProps as RootInputProps,
  type InputState as RootInputState,
  type MenubarRootState as RootMenubarRootState,
  MeterRootElement as rootMeterRootElement,
  NavigationMenuRootElement as rootNavigationMenuRootElement,
  type NavigationMenuRootState as RootNavigationMenuRootState,
  type NavigationMenuListState as RootNavigationMenuListState,
  type NavigationMenuItemState as RootNavigationMenuItemState,
  type NavigationMenuTriggerState as RootNavigationMenuTriggerState,
  type NavigationMenuContentState as RootNavigationMenuContentState,
  type NavigationMenuPopupState as RootNavigationMenuPopupState,
  type NavigationMenuViewportState as RootNavigationMenuViewportState,
  type NavigationMenuBackdropState as RootNavigationMenuBackdropState,
  type NavigationMenuArrowState as RootNavigationMenuArrowState,
  type NavigationMenuLinkState as RootNavigationMenuLinkState,
  type NavigationMenuIconState as RootNavigationMenuIconState,
  NumberFieldRootElement as rootNumberFieldRootElement,
  type NumberFieldRootState as RootNumberFieldRootState,
  type NumberFieldChangeEventReason as RootNumberFieldChangeEventReason,
  type NumberFieldChangeEventDetails as RootNumberFieldChangeEventDetails,
  type NumberFieldGroupState as RootNumberFieldGroupState,
  type NumberFieldInputState as RootNumberFieldInputState,
  type NumberFieldIncrementState as RootNumberFieldIncrementState,
  type NumberFieldDecrementState as RootNumberFieldDecrementState,
  type NumberFieldScrubAreaState as RootNumberFieldScrubAreaState,
  type NumberFieldScrubAreaCursorState as RootNumberFieldScrubAreaCursorState,
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
  Popover as rootPopover,
  PreviewCard as rootPreviewCard,
  type PopoverRootChangeEventDetails as RootPopoverRootChangeEventDetails,
  type PopoverRootProps as RootPopoverRootProps,
  type PopoverTriggerProps as RootPopoverTriggerProps,
  type PopoverViewportProps as RootPopoverViewportProps,
  ProgressRootElement as rootProgressRootElement,
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
  ScrollAreaRootElement as rootScrollAreaRootElement,
  type ScrollAreaRootState as RootScrollAreaRootState,
  type ScrollAreaViewportState as RootScrollAreaViewportState,
  type ScrollAreaContentState as RootScrollAreaContentState,
  type ScrollAreaScrollbarState as RootScrollAreaScrollbarState,
  type ScrollAreaThumbState as RootScrollAreaThumbState,
  type ScrollAreaCornerState as RootScrollAreaCornerState,
  SelectRootElement as rootSelectRootElement,
  type SelectRootState as RootSelectRootState,
  type SelectTriggerState as RootSelectTriggerState,
  type SelectValueState as RootSelectValueState,
  type SelectPopupState as RootSelectPopupState,
  type SelectItemState as RootSelectItemState,
  type SelectItemIndicatorState as RootSelectItemIndicatorState,
  type SelectItemTextState as RootSelectItemTextState,
  type SelectGroupState as RootSelectGroupState,
  type SelectGroupLabelState as RootSelectGroupLabelState,
  type SelectIconState as RootSelectIconState,
  type SelectChangeEventReason as RootSelectChangeEventReason,
  type SelectChangeEventDetails as RootSelectChangeEventDetails,
  SeparatorRootElement as rootSeparatorRootElement,
  type SeparatorRootProps as RootSeparatorRootProps,
  type SeparatorRootState as RootSeparatorRootState,
  SliderRootElement as rootSliderRootElement,
  type SliderRootState as RootSliderRootState,
  type SliderControlState as RootSliderControlState,
  type SliderTrackState as RootSliderTrackState,
  type SliderThumbState as RootSliderThumbState,
  type SliderIndicatorState as RootSliderIndicatorState,
  type SliderLabelState as RootSliderLabelState,
  type SliderValueState as RootSliderValueState,
  type SliderChangeEventReason as RootSliderChangeEventReason,
  type SliderChangeEventDetails as RootSliderChangeEventDetails,
  type SliderCommitEventReason as RootSliderCommitEventReason,
  type SliderCommitEventDetails as RootSliderCommitEventDetails,
  type SliderOrientation as RootSliderOrientation,
  Switch as rootSwitch,
  type SwitchRootChangeEventDetails as RootSwitchRootChangeEventDetails,
  type SwitchRootChangeEventReason as RootSwitchRootChangeEventReason,
  type SwitchRootProps as RootSwitchRootProps,
  type SwitchRootState as RootSwitchRootState,
  type SwitchThumbProps as RootSwitchThumbProps,
  type SwitchThumbState as RootSwitchThumbState,
  Tooltip as rootTooltip,
  TabsRootElement as rootTabsRootElement,
  type TabsRootState as RootTabsRootState,
  type TabsListState as RootTabsListState,
  type TabsTabState as RootTabsTabState,
  type TabsPanelState as RootTabsPanelState,
  type TabsIndicatorState as RootTabsIndicatorState,
  ToastProviderElement as rootToastProviderElement,
  type ToastProviderState as RootToastProviderState,
  type ToastViewportState as RootToastViewportState,
  type ToastRootState as RootToastRootState,
  type ToastContentState as RootToastContentState,
  type ToastTitleState as RootToastTitleState,
  type ToastDescriptionState as RootToastDescriptionState,
  type ToastCloseState as RootToastCloseState,
  type ToastActionState as RootToastActionState,
  Toggle as rootToggle,
  ToggleRootElement as rootToggleRootElement,
  type ToggleChangeEventDetails as RootToggleChangeEventDetails,
  type ToggleProps as RootToggleProps,
  type ToggleRootChangeEventDetails as RootToggleRootChangeEventDetails,
  type ToggleRootProps as RootToggleRootProps,
  type ToggleRootState as RootToggleRootState,
  type ToggleState as RootToggleState,
  Toolbar as rootToolbar,
  ToolbarRootElement as rootToolbarRootElement,
  type ToolbarRootState as RootToolbarRootState,
  type ToolbarGroupState as RootToolbarGroupState,
  type ToolbarButtonState as RootToolbarButtonState,
  type ToolbarLinkState as RootToolbarLinkState,
  type ToolbarInputState as RootToolbarInputState,
  type ToolbarSeparatorState as RootToolbarSeparatorState,
  ToggleGroup as rootToggleGroup,
  type ToggleGroupChangeEventDetails as RootToggleGroupChangeEventDetails,
  type ToggleGroupProps as RootToggleGroupProps,
  ToggleGroupRootElement as rootToggleGroupRootElement,
  type ToggleGroupRootChangeEventDetails as RootToggleGroupRootChangeEventDetails,
  type ToggleGroupRootProps as RootToggleGroupRootProps,
  type ToggleGroupRootState as RootToggleGroupRootState,
  type ToggleGroupState as RootToggleGroupState,
  Avatar as rootAvatar,
  AvatarRootElement as rootAvatarRootElement,
  type AvatarRootProps as RootAvatarRootProps,
  type AvatarRootState as RootAvatarRootState,
  type AvatarImageProps as RootAvatarImageProps,
  type AvatarImageState as RootAvatarImageState,
  type AvatarFallbackProps as RootAvatarFallbackProps,
  type AvatarFallbackState as RootAvatarFallbackState,
  type ImageLoadingStatus as RootImageLoadingStatus,
  mergeClassNames as rootMergeClassNames,
  mergeProps as rootMergeProps,
  mergePropsN as rootMergePropsN,
  useRender as rootUseRender,
  // New shared utilities & providers
  getDirection as rootGetDirection,
  DirectionProviderElement as rootDirectionProviderElement,
  type DirectionProviderProps as RootDirectionProviderProps,
  type DirectionProviderState as RootDirectionProviderState,
  type TextDirection as RootTextDirection,
  navigateList as rootNavigateList,
  navigateGrid as rootNavigateGrid,
  findNonDisabledIndex as rootFindNonDisabledIndex,
  getMinListIndex as rootGetMinListIndex,
  getMaxListIndex as rootGetMaxListIndex,
  isListIndexDisabled as rootIsListIndexDisabled,
  isIndexOutOfBounds as rootIsIndexOutOfBounds,
  type CompositeOrientation as RootCompositeOrientation,
  CSPProviderElement as rootCSPProviderElement,
  getCSPContext as rootGetCSPContext,
  type CSPContextValue as RootCSPContextValue,
  type CSPProviderProps as RootCSPProviderProps,
  type CSPProviderState as RootCSPProviderState,
  LabelableProviderElement as rootLabelableProviderElement,
  getLabelableContext as rootGetLabelableContext,
  focusElementWithVisible as rootFocusElementWithVisible,
  LocalizationProviderElement as rootLocalizationProviderElement,
  getLocalizationContext as rootGetLocalizationContext,
  type LocalizationContext as RootLocalizationContext,
  type LocalizationProviderProps as RootLocalizationProviderProps,
  TemporalAdapterProviderElement as rootTemporalAdapterProviderElement,
  getTemporalAdapter as rootGetTemporalAdapter,
  applyButtonBehavior as rootApplyButtonBehavior,
  type ButtonBehaviorOptions as RootButtonBehaviorOptions,
  syncButtonAttributes as rootSyncButtonAttributes,
  removeButtonBehavior as rootRemoveButtonBehavior,
} from '@base-ui/lit';
import { AlertDialog as subpathAlertDialog } from '@base-ui/lit/alert-dialog';
import { AutocompleteRootElement as subpathAutocompleteRootElement } from '@base-ui/lit/autocomplete';
import {
  Button as subpathButton,
  ButtonRootElement as subpathButtonRootElement,
} from '@base-ui/lit/button';
import { CalendarRootElement as subpathCalendarRootElement } from '@base-ui/lit/calendar';
import { Checkbox as subpathCheckbox } from '@base-ui/lit/checkbox';
import { CheckboxGroup as subpathCheckboxGroup } from '@base-ui/lit/checkbox-group';
import { Collapsible as subpathCollapsible } from '@base-ui/lit/collapsible';
import { ComboboxRootElement as subpathComboboxRootElement } from '@base-ui/lit/combobox';
import {
  ContextMenuRootElement as subpathContextMenuRootElement,
  ContextMenuTriggerElement as subpathContextMenuTriggerElement,
} from '@base-ui/lit/context-menu';
import { Dialog as subpathDialog } from '@base-ui/lit/dialog';
import { DrawerRootElement as subpathDrawerRootElement } from '@base-ui/lit/drawer';
import { Field as subpathField } from '@base-ui/lit/field';
import { Fieldset as subpathFieldset } from '@base-ui/lit/fieldset';
import { Form as subpathForm } from '@base-ui/lit/form';
import {
  mergeClassNames as subpathMergeClassNames,
  mergeProps as subpathMergeProps,
  mergePropsN as subpathMergePropsN,
} from '@base-ui/lit/merge-props';
import { Input as subpathInput } from '@base-ui/lit/input';
import { Menu as subpathMenu } from '@base-ui/lit/menu';
import { MenubarRootElement as subpathMenubarRootElement } from '@base-ui/lit/menubar';
import { MeterRootElement as subpathMeterRootElement } from '@base-ui/lit/meter';
import { NavigationMenuRootElement as subpathNavigationMenuRootElement } from '@base-ui/lit/navigation-menu';
import { NumberFieldRootElement as subpathNumberFieldRootElement } from '@base-ui/lit/number-field';
import { Popover as subpathPopover } from '@base-ui/lit/popover';
import { PreviewCard as subpathPreviewCard } from '@base-ui/lit/preview-card';
import { ProgressRootElement as subpathProgressRootElement } from '@base-ui/lit/progress';
import { Radio as subpathRadio } from '@base-ui/lit/radio';
import { RadioGroup as subpathRadioGroup } from '@base-ui/lit/radio-group';
import { ScrollAreaRootElement as subpathScrollAreaRootElement } from '@base-ui/lit/scroll-area';
import { SelectRootElement as subpathSelectRootElement } from '@base-ui/lit/select';
import { SeparatorRootElement as subpathSeparatorRootElement } from '@base-ui/lit/separator';
import { SliderRootElement as subpathSliderRootElement } from '@base-ui/lit/slider';
import { Switch as subpathSwitch } from '@base-ui/lit/switch';
import { Tooltip as subpathTooltip } from '@base-ui/lit/tooltip';
import { TabsRootElement as subpathTabsRootElement } from '@base-ui/lit/tabs';
import { ToastProviderElement as subpathToastProviderElement } from '@base-ui/lit/toast';
import {
  Toggle as subpathToggle,
  ToggleRootElement as subpathToggleRootElement,
} from '@base-ui/lit/toggle';
import {
  Toolbar as subpathToolbar,
  ToolbarRootElement as subpathToolbarRootElement,
} from '@base-ui/lit/toolbar';
import {
  ToggleGroup as subpathToggleGroup,
  ToggleGroupRootElement as subpathToggleGroupRootElement,
} from '@base-ui/lit/toggle-group';
import {
  Avatar as subpathAvatar,
  AvatarRootElement as subpathAvatarRootElement,
} from '@base-ui/lit/avatar';
import { useRender as subpathUseRender } from '@base-ui/lit/use-render';
// New shared utilities & providers — subpath imports
import {
  getDirection as subpathGetDirection,
  DirectionProviderElement as subpathDirectionProviderElement,
  type DirectionProviderProps as SubpathDirectionProviderProps,
  type DirectionProviderState as SubpathDirectionProviderState,
} from '@base-ui/lit/direction-provider';
import {
  navigateList as subpathNavigateList,
  navigateGrid as subpathNavigateGrid,
  findNonDisabledIndex as subpathFindNonDisabledIndex,
} from '@base-ui/lit/composite';
import {
  CSPProviderElement as subpathCSPProviderElement,
  getCSPContext as subpathGetCSPContext,
  type CSPProviderProps as SubpathCSPProviderProps,
  type CSPProviderState as SubpathCSPProviderState,
  type CSPContextValue as SubpathCSPContextValue,
} from '@base-ui/lit/csp-provider';
import {
  LabelableProviderElement as subpathLabelableProviderElement,
  getLabelableContext as subpathGetLabelableContext,
} from '@base-ui/lit/labelable-provider';
import {
  LocalizationProviderElement as subpathLocalizationProviderElement,
  getLocalizationContext as subpathGetLocalizationContext,
  type LocalizationContext as SubpathLocalizationContext,
  type LocalizationProviderProps as SubpathLocalizationProviderProps,
} from '@base-ui/lit/localization-provider';
import {
  TemporalAdapterProviderElement as subpathTemporalAdapterProviderElement,
  getTemporalAdapter as subpathGetTemporalAdapter,
} from '@base-ui/lit/temporal-adapter-provider';
import {
  applyButtonBehavior as subpathApplyButtonBehavior,
  type ButtonBehaviorOptions as SubpathButtonBehaviorOptions,
  syncButtonAttributes as subpathSyncButtonAttributes,
  removeButtonBehavior as subpathRemoveButtonBehavior,
} from '@base-ui/lit/use-button';
import type {
  BaseUIChangeEventDetails as TypesBaseUIChangeEventDetails,
  BaseUIEvent as TypesBaseUIEvent,
  BaseUIGenericEventDetails as TypesBaseUIGenericEventDetails,
  ComponentRenderFn as TypesComponentRenderFn,
  HTMLProps as TypesHTMLProps,
} from '@base-ui/lit/types';
import type {
  AlertDialogBackdropProps as SubpathAlertDialogBackdropProps,
  AlertDialogBackdropState as SubpathAlertDialogBackdropState,
  AlertDialogCloseProps as SubpathAlertDialogCloseProps,
  AlertDialogCloseState as SubpathAlertDialogCloseState,
  AlertDialogDescriptionProps as SubpathAlertDialogDescriptionProps,
  AlertDialogDescriptionState as SubpathAlertDialogDescriptionState,
  AlertDialogPopupProps as SubpathAlertDialogPopupProps,
  AlertDialogPopupState as SubpathAlertDialogPopupState,
  AlertDialogPortalProps as SubpathAlertDialogPortalProps,
  AlertDialogPortalState as SubpathAlertDialogPortalState,
  AlertDialogRootChangeEventDetails as SubpathAlertDialogRootChangeEventDetails,
  AlertDialogRootProps as SubpathAlertDialogRootProps,
  AlertDialogRootState as SubpathAlertDialogRootState,
  AlertDialogTitleProps as SubpathAlertDialogTitleProps,
  AlertDialogTitleState as SubpathAlertDialogTitleState,
  AlertDialogTriggerProps as SubpathAlertDialogTriggerProps,
  AlertDialogTriggerState as SubpathAlertDialogTriggerState,
  AlertDialogViewportProps as SubpathAlertDialogViewportProps,
  AlertDialogViewportState as SubpathAlertDialogViewportState,
} from '@base-ui/lit/alert-dialog';
import type {
  ButtonProps as SubpathButtonProps,
  ButtonRootProps as SubpathButtonRootProps,
  ButtonRootState as SubpathButtonRootState,
  ButtonState as SubpathButtonState,
} from '@base-ui/lit/button';
import type {
  CalendarRootState as SubpathCalendarRootState,
  CalendarDayGridState as SubpathCalendarDayGridState,
  CalendarDayGridHeaderState as SubpathCalendarDayGridHeaderState,
  CalendarDayGridHeaderRowState as SubpathCalendarDayGridHeaderRowState,
  CalendarDayGridHeaderCellState as SubpathCalendarDayGridHeaderCellState,
  CalendarDayGridBodyState as SubpathCalendarDayGridBodyState,
  CalendarDayGridRowState as SubpathCalendarDayGridRowState,
  CalendarDayGridCellState as SubpathCalendarDayGridCellState,
  CalendarDayButtonState as SubpathCalendarDayButtonState,
  CalendarIncrementMonthState as SubpathCalendarIncrementMonthState,
  CalendarDecrementMonthState as SubpathCalendarDecrementMonthState,
  CalendarChangeEventDetails as SubpathCalendarChangeEventDetails,
} from '@base-ui/lit/calendar';
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
  CollapsiblePanelProps as SubpathCollapsiblePanelProps,
  CollapsiblePanelState as SubpathCollapsiblePanelState,
  CollapsibleRootChangeEventDetails as SubpathCollapsibleRootChangeEventDetails,
  CollapsibleRootChangeEventReason as SubpathCollapsibleRootChangeEventReason,
  CollapsibleRootProps as SubpathCollapsibleRootProps,
  CollapsibleRootState as SubpathCollapsibleRootState,
  CollapsibleTriggerProps as SubpathCollapsibleTriggerProps,
  CollapsibleTriggerState as SubpathCollapsibleTriggerState,
} from '@base-ui/lit/collapsible';
import type {
  ComboboxRootState as SubpathComboboxRootState,
  ComboboxInputState as SubpathComboboxInputState,
  ComboboxInputGroupState as SubpathComboboxInputGroupState,
  ComboboxTriggerState as SubpathComboboxTriggerState,
  ComboboxValueState as SubpathComboboxValueState,
  ComboboxPopupState as SubpathComboboxPopupState,
  ComboboxItemState as SubpathComboboxItemState,
  ComboboxItemIndicatorState as SubpathComboboxItemIndicatorState,
  ComboboxItemTextState as SubpathComboboxItemTextState,
  ComboboxGroupState as SubpathComboboxGroupState,
  ComboboxGroupLabelState as SubpathComboboxGroupLabelState,
  ComboboxIconState as SubpathComboboxIconState,
  ComboboxClearState as SubpathComboboxClearState,
  ComboboxEmptyState as SubpathComboboxEmptyState,
  ComboboxLabelState as SubpathComboboxLabelState,
  ComboboxChangeEventReason as SubpathComboboxChangeEventReason,
  ComboboxChangeEventDetails as SubpathComboboxChangeEventDetails,
} from '@base-ui/lit/combobox';
import type {
  ContextMenuRootState as SubpathContextMenuRootState,
  ContextMenuTriggerState as SubpathContextMenuTriggerState,
} from '@base-ui/lit/context-menu';
import type {
  DrawerRootState as SubpathDrawerRootState,
  DrawerTriggerState as SubpathDrawerTriggerState,
  DrawerPopupState as SubpathDrawerPopupState,
  DrawerBackdropState as SubpathDrawerBackdropState,
  DrawerContentState as SubpathDrawerContentState,
  DrawerCloseState as SubpathDrawerCloseState,
  DrawerViewportState as SubpathDrawerViewportState,
  DrawerSwipeAreaState as SubpathDrawerSwipeAreaState,
  DrawerProviderState as SubpathDrawerProviderState,
  DrawerIndentState as SubpathDrawerIndentState,
  DrawerIndentBackgroundState as SubpathDrawerIndentBackgroundState,
} from '@base-ui/lit/drawer';
import type {
  DialogBackdropProps as SubpathDialogBackdropProps,
  DialogBackdropState as SubpathDialogBackdropState,
  DialogCloseProps as SubpathDialogCloseProps,
  DialogPopupProps as SubpathDialogPopupProps,
  DialogPopupState as SubpathDialogPopupState,
  DialogRootChangeEventDetails as SubpathDialogRootChangeEventDetails,
  DialogRootProps as SubpathDialogRootProps,
  DialogTriggerProps as SubpathDialogTriggerProps,
  DialogTriggerState as SubpathDialogTriggerState,
  DialogViewportProps as SubpathDialogViewportProps,
  DialogViewportState as SubpathDialogViewportState,
} from '@base-ui/lit/dialog';
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
  FormProps as SubpathFormProps,
  FormState as SubpathFormState,
  FormSubmitEventDetails as SubpathFormSubmitEventDetails,
} from '@base-ui/lit/form';
import type {
  InputChangeEventDetails as SubpathInputChangeEventDetails,
  InputProps as SubpathInputProps,
  InputState as SubpathInputState,
} from '@base-ui/lit/input';
import type { MenubarRootState as SubpathMenubarRootState } from '@base-ui/lit/menubar';
import type {
  NavigationMenuRootState as SubpathNavigationMenuRootState,
  NavigationMenuListState as SubpathNavigationMenuListState,
  NavigationMenuItemState as SubpathNavigationMenuItemState,
  NavigationMenuTriggerState as SubpathNavigationMenuTriggerState,
  NavigationMenuContentState as SubpathNavigationMenuContentState,
  NavigationMenuPopupState as SubpathNavigationMenuPopupState,
  NavigationMenuViewportState as SubpathNavigationMenuViewportState,
  NavigationMenuBackdropState as SubpathNavigationMenuBackdropState,
  NavigationMenuArrowState as SubpathNavigationMenuArrowState,
  NavigationMenuLinkState as SubpathNavigationMenuLinkState,
  NavigationMenuIconState as SubpathNavigationMenuIconState,
} from '@base-ui/lit/navigation-menu';
import type {
  NumberFieldRootState as SubpathNumberFieldRootState,
  NumberFieldChangeEventReason as SubpathNumberFieldChangeEventReason,
  NumberFieldChangeEventDetails as SubpathNumberFieldChangeEventDetails,
  NumberFieldGroupState as SubpathNumberFieldGroupState,
  NumberFieldInputState as SubpathNumberFieldInputState,
  NumberFieldIncrementState as SubpathNumberFieldIncrementState,
  NumberFieldDecrementState as SubpathNumberFieldDecrementState,
  NumberFieldScrubAreaState as SubpathNumberFieldScrubAreaState,
  NumberFieldScrubAreaCursorState as SubpathNumberFieldScrubAreaCursorState,
} from '@base-ui/lit/number-field';
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
  PopoverRootChangeEventDetails as SubpathPopoverRootChangeEventDetails,
  PopoverRootProps as SubpathPopoverRootProps,
  PopoverTriggerProps as SubpathPopoverTriggerProps,
  PopoverViewportProps as SubpathPopoverViewportProps,
} from '@base-ui/lit/popover';
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
  ScrollAreaRootState as SubpathScrollAreaRootState,
  ScrollAreaViewportState as SubpathScrollAreaViewportState,
  ScrollAreaContentState as SubpathScrollAreaContentState,
  ScrollAreaScrollbarState as SubpathScrollAreaScrollbarState,
  ScrollAreaThumbState as SubpathScrollAreaThumbState,
  ScrollAreaCornerState as SubpathScrollAreaCornerState,
} from '@base-ui/lit/scroll-area';
import type {
  SelectRootState as SubpathSelectRootState,
  SelectTriggerState as SubpathSelectTriggerState,
  SelectValueState as SubpathSelectValueState,
  SelectPopupState as SubpathSelectPopupState,
  SelectItemState as SubpathSelectItemState,
  SelectItemIndicatorState as SubpathSelectItemIndicatorState,
  SelectItemTextState as SubpathSelectItemTextState,
  SelectGroupState as SubpathSelectGroupState,
  SelectGroupLabelState as SubpathSelectGroupLabelState,
  SelectIconState as SubpathSelectIconState,
  SelectChangeEventReason as SubpathSelectChangeEventReason,
  SelectChangeEventDetails as SubpathSelectChangeEventDetails,
} from '@base-ui/lit/select';
import type {
  SeparatorRootProps as SubpathSeparatorRootProps,
  SeparatorRootState as SubpathSeparatorRootState,
} from '@base-ui/lit/separator';
import type {
  SliderRootState as SubpathSliderRootState,
  SliderControlState as SubpathSliderControlState,
  SliderTrackState as SubpathSliderTrackState,
  SliderThumbState as SubpathSliderThumbState,
  SliderIndicatorState as SubpathSliderIndicatorState,
  SliderLabelState as SubpathSliderLabelState,
  SliderValueState as SubpathSliderValueState,
  SliderChangeEventReason as SubpathSliderChangeEventReason,
  SliderChangeEventDetails as SubpathSliderChangeEventDetails,
  SliderCommitEventReason as SubpathSliderCommitEventReason,
  SliderCommitEventDetails as SubpathSliderCommitEventDetails,
  SliderOrientation as SubpathSliderOrientation,
} from '@base-ui/lit/slider';
import type {
  SwitchRootChangeEventDetails as SubpathSwitchRootChangeEventDetails,
  SwitchRootChangeEventReason as SubpathSwitchRootChangeEventReason,
  SwitchRootProps as SubpathSwitchRootProps,
  SwitchRootState as SubpathSwitchRootState,
  SwitchThumbProps as SubpathSwitchThumbProps,
  SwitchThumbState as SubpathSwitchThumbState,
} from '@base-ui/lit/switch';
import type {
  TabsRootState as SubpathTabsRootState,
  TabsListState as SubpathTabsListState,
  TabsTabState as SubpathTabsTabState,
  TabsPanelState as SubpathTabsPanelState,
  TabsIndicatorState as SubpathTabsIndicatorState,
} from '@base-ui/lit/tabs';
import type {
  ToastProviderState as SubpathToastProviderState,
  ToastViewportState as SubpathToastViewportState,
  ToastRootState as SubpathToastRootState,
  ToastContentState as SubpathToastContentState,
  ToastTitleState as SubpathToastTitleState,
  ToastDescriptionState as SubpathToastDescriptionState,
  ToastCloseState as SubpathToastCloseState,
  ToastActionState as SubpathToastActionState,
} from '@base-ui/lit/toast';
import type {
  ToggleChangeEventDetails as SubpathToggleChangeEventDetails,
  ToggleProps as SubpathToggleProps,
  ToggleRootChangeEventDetails as SubpathToggleRootChangeEventDetails,
  ToggleRootProps as SubpathToggleRootProps,
  ToggleRootState as SubpathToggleRootState,
  ToggleState as SubpathToggleState,
} from '@base-ui/lit/toggle';
import type {
  ToolbarRootState as SubpathToolbarRootState,
  ToolbarGroupState as SubpathToolbarGroupState,
  ToolbarButtonState as SubpathToolbarButtonState,
  ToolbarLinkState as SubpathToolbarLinkState,
  ToolbarInputState as SubpathToolbarInputState,
  ToolbarSeparatorState as SubpathToolbarSeparatorState,
} from '@base-ui/lit/toolbar';
import type {
  ToggleGroupChangeEventDetails as SubpathToggleGroupChangeEventDetails,
  ToggleGroupProps as SubpathToggleGroupProps,
  ToggleGroupRootChangeEventDetails as SubpathToggleGroupRootChangeEventDetails,
  ToggleGroupRootProps as SubpathToggleGroupRootProps,
  ToggleGroupRootState as SubpathToggleGroupRootState,
  ToggleGroupState as SubpathToggleGroupState,
} from '@base-ui/lit/toggle-group';
import type {
  AutocompleteRootState as SubpathAutocompleteRootState,
  AutocompleteFilterMode as SubpathAutocompleteFilterMode,
  AutocompleteChangeEventReason as SubpathAutocompleteChangeEventReason,
  AutocompleteChangeEventDetails as SubpathAutocompleteChangeEventDetails,
} from '@base-ui/lit/autocomplete';
import type {
  AvatarFallbackProps as SubpathAvatarFallbackProps,
  AvatarRootState as SubpathAvatarRootState,
  AvatarImageProps as SubpathAvatarImageProps,
  AvatarImageState as SubpathAvatarImageState,
  AvatarRootProps as SubpathAvatarRootProps,
  AvatarFallbackState as SubpathAvatarFallbackState,
  ImageLoadingStatus as SubpathImageLoadingStatus,
} from '@base-ui/lit/avatar';

describe('@base-ui/lit', () => {
  it('does not re-export internal utils from the package root', async () => {
    const module = await import('@base-ui/lit');

    expect('BaseHTMLElement' in module).toBe(false);
    expect('ensureId' in module).toBe(false);
    expect('getFormatter' in module).toBe(false);
    expect('formatNumber' in module).toBe(false);
    expect('formatNumberValue' in module).toBe(false);
    expect('valueToPercent' in module).toBe(false);
  });

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
    expect(module.ButtonRootElement).toBe(subpathButtonRootElement);
    expect(rootButton).toBe(subpathButton);
    expect(rootButtonRootElement).toBe(subpathButtonRootElement);
  });

  it('re-exports calendar from the package root', async () => {
    const module = await import('@base-ui/lit');

    expect(module.CalendarRootElement).toBe(subpathCalendarRootElement);
    expect(rootCalendarRootElement).toBe(subpathCalendarRootElement);
  });

  it('re-exports autocomplete from the package root', async () => {
    const module = await import('@base-ui/lit');

    expect(module.AutocompleteRootElement).toBe(subpathAutocompleteRootElement);
    expect(rootAutocompleteRootElement).toBe(subpathAutocompleteRootElement);
  });

  it('re-exports alert-dialog from the package root', async () => {
    const module = await import('@base-ui/lit');

    expect(module.AlertDialog).toBe(subpathAlertDialog);
    expect(rootAlertDialog).toBe(subpathAlertDialog);
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

  it('re-exports collapsible from the package root', async () => {
    const module = await import('@base-ui/lit');

    expect(module.Collapsible).toBe(subpathCollapsible);
    expect(rootCollapsible).toBe(subpathCollapsible);
  });

  it('re-exports combobox from the package root', async () => {
    const module = await import('@base-ui/lit');

    expect(module.ComboboxRootElement).toBe(subpathComboboxRootElement);
    expect(rootComboboxRootElement).toBe(subpathComboboxRootElement);
  });

  it('re-exports context-menu from the package root', async () => {
    const module = await import('@base-ui/lit');

    expect(module.ContextMenuRootElement).toBe(subpathContextMenuRootElement);
    expect(rootContextMenuRootElement).toBe(subpathContextMenuRootElement);
    expect(module.ContextMenuTriggerElement).toBe(subpathContextMenuTriggerElement);
    expect(rootContextMenuTriggerElement).toBe(subpathContextMenuTriggerElement);
  });

  it('re-exports drawer from the package root', async () => {
    const module = await import('@base-ui/lit');

    expect(module.DrawerRootElement).toBe(subpathDrawerRootElement);
    expect(rootDrawerRootElement).toBe(subpathDrawerRootElement);
  });

  it('re-exports dialog from the package root', async () => {
    const module = await import('@base-ui/lit');

    expect(module.Dialog).toBe(subpathDialog);
    expect(rootDialog).toBe(subpathDialog);
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

  it('re-exports form from the package root', async () => {
    const module = await import('@base-ui/lit');

    expect(module.Form).toBe(subpathForm);
    expect(rootForm).toBe(subpathForm);
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

  it('re-exports scroll-area from the package root', async () => {
    const module = await import('@base-ui/lit');

    expect(module.ScrollAreaRootElement).toBe(subpathScrollAreaRootElement);
    expect(rootScrollAreaRootElement).toBe(subpathScrollAreaRootElement);
  });

  it('re-exports select from the package root', async () => {
    const module = await import('@base-ui/lit');

    expect(module.SelectRootElement).toBe(subpathSelectRootElement);
    expect(rootSelectRootElement).toBe(subpathSelectRootElement);
  });

  it('re-exports separator from the package root', async () => {
    const module = await import('@base-ui/lit');

    expect(module.SeparatorRootElement).toBe(subpathSeparatorRootElement);
    expect(rootSeparatorRootElement).toBe(subpathSeparatorRootElement);
  });

  it('re-exports slider from the package root', async () => {
    const module = await import('@base-ui/lit');

    expect(module.SliderRootElement).toBe(subpathSliderRootElement);
    expect(rootSliderRootElement).toBe(subpathSliderRootElement);
  });

  it('re-exports meter from the package root', async () => {
    const module = await import('@base-ui/lit');

    expect(module.MeterRootElement).toBe(subpathMeterRootElement);
    expect(rootMeterRootElement).toBe(subpathMeterRootElement);
  });

  it('re-exports popover from the package root', async () => {
    const module = await import('@base-ui/lit');

    expect(module.Popover).toBe(subpathPopover);
    expect(rootPopover).toBe(subpathPopover);
  });

  it('re-exports preview-card from the package root', async () => {
    const module = await import('@base-ui/lit');

    expect(module.PreviewCard).toBe(subpathPreviewCard);
    expect(rootPreviewCard).toBe(subpathPreviewCard);
  });

  it('re-exports progress from the package root', async () => {
    const module = await import('@base-ui/lit');

    expect(module.ProgressRootElement).toBe(subpathProgressRootElement);
    expect(rootProgressRootElement).toBe(subpathProgressRootElement);
  });

  it('re-exports navigation-menu from the package root', async () => {
    const module = await import('@base-ui/lit');

    expect(module.NavigationMenuRootElement).toBe(subpathNavigationMenuRootElement);
    expect(rootNavigationMenuRootElement).toBe(subpathNavigationMenuRootElement);
  });

  it('re-exports number-field from the package root', async () => {
    const module = await import('@base-ui/lit');

    expect(module.NumberFieldRootElement).toBe(subpathNumberFieldRootElement);
    expect(rootNumberFieldRootElement).toBe(subpathNumberFieldRootElement);
  });

  it('re-exports menu from the package root', async () => {
    const module = await import('@base-ui/lit');

    expect(module.Menu).toBe(subpathMenu);
    expect(rootMenu).toBe(subpathMenu);
  });

  it('re-exports menubar from the package root', async () => {
    const module = await import('@base-ui/lit');

    expect(module.MenubarRootElement).toBe(subpathMenubarRootElement);
    expect(rootMenubarRootElement).toBe(subpathMenubarRootElement);
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

  it('re-exports tooltip from the package root', async () => {
    const module = await import('@base-ui/lit');

    expect(module.Tooltip).toBe(subpathTooltip);
    expect(rootTooltip).toBe(subpathTooltip);
  });

  it('re-exports tabs from the package root', async () => {
    const module = await import('@base-ui/lit');

    expect(module.TabsRootElement).toBe(subpathTabsRootElement);
    expect(rootTabsRootElement).toBe(subpathTabsRootElement);
  });

  it('re-exports toast from the package root', async () => {
    const module = await import('@base-ui/lit');

    expect(module.ToastProviderElement).toBe(subpathToastProviderElement);
    expect(rootToastProviderElement).toBe(subpathToastProviderElement);
  });

  it('re-exports toggle from the package root', async () => {
    const module = await import('@base-ui/lit');

    expect(module.Toggle).toBe(subpathToggle);
    expect(module.ToggleRootElement).toBe(subpathToggleRootElement);
    expect(rootToggle).toBe(subpathToggle);
    expect(rootToggleRootElement).toBe(subpathToggleRootElement);
  });

  it('re-exports toolbar from the package root', async () => {
    const module = await import('@base-ui/lit');

    expect(module.Toolbar).toBe(subpathToolbar);
    expect(module.ToolbarRootElement).toBe(subpathToolbarRootElement);
    expect(rootToolbar).toBe(subpathToolbar);
    expect(rootToolbarRootElement).toBe(subpathToolbarRootElement);
  });

  it('re-exports toggle-group from the package root', async () => {
    const module = await import('@base-ui/lit');

    expect(module.ToggleGroup).toBe(subpathToggleGroup);
    expect(module.ToggleGroupRootElement).toBe(subpathToggleGroupRootElement);
    expect(rootToggleGroup).toBe(subpathToggleGroup);
    expect(rootToggleGroupRootElement).toBe(subpathToggleGroupRootElement);
  });

  it('re-exports avatar from the package root', async () => {
    const module = await import('@base-ui/lit');

    expect(module.Avatar).toBe(subpathAvatar);
    expect(rootAvatar).toBe(subpathAvatar);
    expect(module.AvatarRootElement).toBe(subpathAvatarRootElement);
    expect(rootAvatarRootElement).toBe(subpathAvatarRootElement);
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
    expectTypeOf<RootDirectionProviderProps>().toEqualTypeOf<SubpathDirectionProviderProps>();
    expectTypeOf<RootDirectionProviderState>().toEqualTypeOf<SubpathDirectionProviderState>();
    expectTypeOf<RootTextDirection>().toEqualTypeOf<RootDirectionProviderProps['direction']>();
    expectTypeOf<RootCSPContextValue>().toEqualTypeOf<SubpathCSPContextValue>();
    expectTypeOf<RootCSPProviderProps>().toEqualTypeOf<SubpathCSPProviderProps>();
    expectTypeOf<RootCSPProviderState>().toEqualTypeOf<SubpathCSPProviderState>();
    expectTypeOf<RootLocalizationContext>().toEqualTypeOf<SubpathLocalizationContext>();
    expectTypeOf<RootLocalizationProviderProps>().toEqualTypeOf<SubpathLocalizationProviderProps>();
    expectTypeOf<RootAlertDialogRootProps>().toEqualTypeOf<SubpathAlertDialogRootProps>();
    expectTypeOf<RootAlertDialogRootState>().toEqualTypeOf<SubpathAlertDialogRootState>();
    expectTypeOf<RootAlertDialogRootChangeEventDetails>().toEqualTypeOf<SubpathAlertDialogRootChangeEventDetails>();
    expectTypeOf<RootAlertDialogTriggerProps>().toEqualTypeOf<SubpathAlertDialogTriggerProps>();
    expectTypeOf<RootAlertDialogTriggerState>().toEqualTypeOf<SubpathAlertDialogTriggerState>();
    expectTypeOf<RootAlertDialogPortalProps>().toEqualTypeOf<SubpathAlertDialogPortalProps>();
    expectTypeOf<RootAlertDialogPortalState>().toEqualTypeOf<SubpathAlertDialogPortalState>();
    expectTypeOf<RootAlertDialogPopupProps>().toEqualTypeOf<SubpathAlertDialogPopupProps>();
    expectTypeOf<RootAlertDialogPopupState>().toEqualTypeOf<SubpathAlertDialogPopupState>();
    expectTypeOf<RootAlertDialogBackdropProps>().toEqualTypeOf<SubpathAlertDialogBackdropProps>();
    expectTypeOf<RootAlertDialogBackdropState>().toEqualTypeOf<SubpathAlertDialogBackdropState>();
    expectTypeOf<RootAlertDialogTitleProps>().toEqualTypeOf<SubpathAlertDialogTitleProps>();
    expectTypeOf<RootAlertDialogTitleState>().toEqualTypeOf<SubpathAlertDialogTitleState>();
    expectTypeOf<RootAlertDialogDescriptionProps>().toEqualTypeOf<SubpathAlertDialogDescriptionProps>();
    expectTypeOf<RootAlertDialogDescriptionState>().toEqualTypeOf<SubpathAlertDialogDescriptionState>();
    expectTypeOf<RootAlertDialogCloseProps>().toEqualTypeOf<SubpathAlertDialogCloseProps>();
    expectTypeOf<RootAlertDialogCloseState>().toEqualTypeOf<SubpathAlertDialogCloseState>();
    expectTypeOf<RootAlertDialogViewportProps>().toEqualTypeOf<SubpathAlertDialogViewportProps>();
    expectTypeOf<RootAlertDialogViewportState>().toEqualTypeOf<SubpathAlertDialogViewportState>();
    // Autocomplete (custom element)
    expectTypeOf<RootAutocompleteRootState>().toEqualTypeOf<SubpathAutocompleteRootState>();
    expectTypeOf<RootAutocompleteFilterMode>().toEqualTypeOf<SubpathAutocompleteFilterMode>();
    expectTypeOf<RootAutocompleteChangeEventReason>().toEqualTypeOf<SubpathAutocompleteChangeEventReason>();
    expectTypeOf<RootAutocompleteChangeEventDetails>().toEqualTypeOf<SubpathAutocompleteChangeEventDetails>();
    // Button
    expectTypeOf<RootButtonProps>().toEqualTypeOf<SubpathButtonProps>();
    expectTypeOf<RootButtonRootProps>().toEqualTypeOf<SubpathButtonRootProps>();
    expectTypeOf<RootButtonRootState>().toEqualTypeOf<SubpathButtonRootState>();
    expectTypeOf<RootButtonState>().toEqualTypeOf<SubpathButtonState>();
    // Calendar (custom element)
    expectTypeOf<RootCalendarRootState>().toEqualTypeOf<SubpathCalendarRootState>();
    expectTypeOf<RootCalendarDayGridState>().toEqualTypeOf<SubpathCalendarDayGridState>();
    expectTypeOf<RootCalendarDayGridHeaderState>().toEqualTypeOf<SubpathCalendarDayGridHeaderState>();
    expectTypeOf<RootCalendarDayGridHeaderRowState>().toEqualTypeOf<SubpathCalendarDayGridHeaderRowState>();
    expectTypeOf<RootCalendarDayGridHeaderCellState>().toEqualTypeOf<SubpathCalendarDayGridHeaderCellState>();
    expectTypeOf<RootCalendarDayGridBodyState>().toEqualTypeOf<SubpathCalendarDayGridBodyState>();
    expectTypeOf<RootCalendarDayGridRowState>().toEqualTypeOf<SubpathCalendarDayGridRowState>();
    expectTypeOf<RootCalendarDayGridCellState>().toEqualTypeOf<SubpathCalendarDayGridCellState>();
    expectTypeOf<RootCalendarDayButtonState>().toEqualTypeOf<SubpathCalendarDayButtonState>();
    expectTypeOf<RootCalendarIncrementMonthState>().toEqualTypeOf<SubpathCalendarIncrementMonthState>();
    expectTypeOf<RootCalendarDecrementMonthState>().toEqualTypeOf<SubpathCalendarDecrementMonthState>();
    expectTypeOf<RootCalendarChangeEventDetails>().toEqualTypeOf<SubpathCalendarChangeEventDetails>();
    expectTypeOf<RootCheckboxGroupProps>().toEqualTypeOf<SubpathCheckboxGroupProps>();
    expectTypeOf<RootCheckboxGroupState>().toEqualTypeOf<SubpathCheckboxGroupState>();
    expectTypeOf<RootCheckboxGroupChangeEventDetails>().toEqualTypeOf<SubpathCheckboxGroupChangeEventDetails>();
    expectTypeOf<RootCheckboxRootProps>().toEqualTypeOf<SubpathCheckboxRootProps>();
    expectTypeOf<RootCheckboxRootState>().toEqualTypeOf<SubpathCheckboxRootState>();
    expectTypeOf<RootCheckboxIndicatorProps>().toEqualTypeOf<SubpathCheckboxIndicatorProps>();
    expectTypeOf<RootCheckboxIndicatorState>().toEqualTypeOf<SubpathCheckboxIndicatorState>();
    expectTypeOf<RootCheckboxRootChangeEventDetails>().toEqualTypeOf<SubpathCheckboxRootChangeEventDetails>();
    expectTypeOf<RootCollapsibleRootProps>().toEqualTypeOf<SubpathCollapsibleRootProps>();
    expectTypeOf<RootCollapsibleRootState>().toEqualTypeOf<SubpathCollapsibleRootState>();
    expectTypeOf<RootCollapsibleRootChangeEventDetails>().toEqualTypeOf<SubpathCollapsibleRootChangeEventDetails>();
    expectTypeOf<RootCollapsibleRootChangeEventReason>().toEqualTypeOf<SubpathCollapsibleRootChangeEventReason>();
    expectTypeOf<RootCollapsibleTriggerProps>().toEqualTypeOf<SubpathCollapsibleTriggerProps>();
    expectTypeOf<RootCollapsibleTriggerState>().toEqualTypeOf<SubpathCollapsibleTriggerState>();
    expectTypeOf<RootCollapsiblePanelProps>().toEqualTypeOf<SubpathCollapsiblePanelProps>();
    expectTypeOf<RootCollapsiblePanelState>().toEqualTypeOf<SubpathCollapsiblePanelState>();
    // Combobox (custom element)
    expectTypeOf<RootComboboxRootState>().toEqualTypeOf<SubpathComboboxRootState>();
    expectTypeOf<RootComboboxInputState>().toEqualTypeOf<SubpathComboboxInputState>();
    expectTypeOf<RootComboboxInputGroupState>().toEqualTypeOf<SubpathComboboxInputGroupState>();
    expectTypeOf<RootComboboxTriggerState>().toEqualTypeOf<SubpathComboboxTriggerState>();
    expectTypeOf<RootComboboxValueState>().toEqualTypeOf<SubpathComboboxValueState>();
    expectTypeOf<RootComboboxPopupState>().toEqualTypeOf<SubpathComboboxPopupState>();
    expectTypeOf<RootComboboxItemState>().toEqualTypeOf<SubpathComboboxItemState>();
    expectTypeOf<RootComboboxItemIndicatorState>().toEqualTypeOf<SubpathComboboxItemIndicatorState>();
    expectTypeOf<RootComboboxItemTextState>().toEqualTypeOf<SubpathComboboxItemTextState>();
    expectTypeOf<RootComboboxGroupState>().toEqualTypeOf<SubpathComboboxGroupState>();
    expectTypeOf<RootComboboxGroupLabelState>().toEqualTypeOf<SubpathComboboxGroupLabelState>();
    expectTypeOf<RootComboboxIconState>().toEqualTypeOf<SubpathComboboxIconState>();
    expectTypeOf<RootComboboxClearState>().toEqualTypeOf<SubpathComboboxClearState>();
    expectTypeOf<RootComboboxEmptyState>().toEqualTypeOf<SubpathComboboxEmptyState>();
    expectTypeOf<RootComboboxLabelState>().toEqualTypeOf<SubpathComboboxLabelState>();
    expectTypeOf<RootComboboxChangeEventReason>().toEqualTypeOf<SubpathComboboxChangeEventReason>();
    expectTypeOf<RootComboboxChangeEventDetails>().toEqualTypeOf<SubpathComboboxChangeEventDetails>();
    // ContextMenu (custom element)
    expectTypeOf<RootContextMenuRootState>().toEqualTypeOf<SubpathContextMenuRootState>();
    expectTypeOf<RootContextMenuTriggerState>().toEqualTypeOf<SubpathContextMenuTriggerState>();
    expectTypeOf<RootDialogRootProps>().toEqualTypeOf<SubpathDialogRootProps>();
    expectTypeOf<RootDialogRootChangeEventDetails>().toEqualTypeOf<SubpathDialogRootChangeEventDetails>();
    expectTypeOf<RootDialogTriggerProps>().toEqualTypeOf<SubpathDialogTriggerProps>();
    expectTypeOf<RootDialogTriggerState>().toEqualTypeOf<SubpathDialogTriggerState>();
    expectTypeOf<RootDialogPopupProps>().toEqualTypeOf<SubpathDialogPopupProps>();
    expectTypeOf<RootDialogPopupState>().toEqualTypeOf<SubpathDialogPopupState>();
    expectTypeOf<RootDialogBackdropProps>().toEqualTypeOf<SubpathDialogBackdropProps>();
    expectTypeOf<RootDialogBackdropState>().toEqualTypeOf<SubpathDialogBackdropState>();
    expectTypeOf<RootDialogCloseProps>().toEqualTypeOf<SubpathDialogCloseProps>();
    expectTypeOf<RootDialogViewportProps>().toEqualTypeOf<SubpathDialogViewportProps>();
    expectTypeOf<RootDialogViewportState>().toEqualTypeOf<SubpathDialogViewportState>();
    // Drawer (custom element)
    expectTypeOf<RootDrawerRootState>().toEqualTypeOf<SubpathDrawerRootState>();
    expectTypeOf<RootDrawerTriggerState>().toEqualTypeOf<SubpathDrawerTriggerState>();
    expectTypeOf<RootDrawerPopupState>().toEqualTypeOf<SubpathDrawerPopupState>();
    expectTypeOf<RootDrawerBackdropState>().toEqualTypeOf<SubpathDrawerBackdropState>();
    expectTypeOf<RootDrawerContentState>().toEqualTypeOf<SubpathDrawerContentState>();
    expectTypeOf<RootDrawerCloseState>().toEqualTypeOf<SubpathDrawerCloseState>();
    expectTypeOf<RootDrawerViewportState>().toEqualTypeOf<SubpathDrawerViewportState>();
    expectTypeOf<RootDrawerSwipeAreaState>().toEqualTypeOf<SubpathDrawerSwipeAreaState>();
    expectTypeOf<RootDrawerProviderState>().toEqualTypeOf<SubpathDrawerProviderState>();
    expectTypeOf<RootDrawerIndentState>().toEqualTypeOf<SubpathDrawerIndentState>();
    expectTypeOf<RootDrawerIndentBackgroundState>().toEqualTypeOf<SubpathDrawerIndentBackgroundState>();
    expectTypeOf<RootFieldRootProps>().toEqualTypeOf<SubpathFieldRootProps>();
    expectTypeOf<RootFieldRootState>().toEqualTypeOf<SubpathFieldRootState>();
    expectTypeOf<RootFieldControlProps>().toEqualTypeOf<SubpathFieldControlProps>();
    expectTypeOf<RootFieldControlState>().toEqualTypeOf<SubpathFieldControlState>();
    expectTypeOf<RootFieldControlChangeEventDetails>().toEqualTypeOf<SubpathFieldControlChangeEventDetails>();
    expectTypeOf<RootFieldsetRootProps>().toEqualTypeOf<SubpathFieldsetRootProps>();
    expectTypeOf<RootFieldsetRootState>().toEqualTypeOf<SubpathFieldsetRootState>();
    expectTypeOf<RootFieldsetLegendProps>().toEqualTypeOf<SubpathFieldsetLegendProps>();
    expectTypeOf<RootFieldsetLegendState>().toEqualTypeOf<SubpathFieldsetLegendState>();
    expectTypeOf<RootFormProps>().toEqualTypeOf<SubpathFormProps>();
    expectTypeOf<RootFormState>().toEqualTypeOf<SubpathFormState>();
    expectTypeOf<RootFormSubmitEventDetails>().toEqualTypeOf<SubpathFormSubmitEventDetails>();
    expectTypeOf<RootFieldValidityProps>().toEqualTypeOf<SubpathFieldValidityProps>();
    expectTypeOf<RootFieldValidityState>().toEqualTypeOf<SubpathFieldValidityState>();
    expectTypeOf<RootInputProps>().toEqualTypeOf<SubpathInputProps>();
    expectTypeOf<RootInputState>().toEqualTypeOf<SubpathInputState>();
    expectTypeOf<RootInputChangeEventDetails>().toEqualTypeOf<SubpathInputChangeEventDetails>();
    expectTypeOf<RootMenubarRootState>().toEqualTypeOf<SubpathMenubarRootState>();
    // NavigationMenu (custom element)
    expectTypeOf<RootNavigationMenuRootState>().toEqualTypeOf<SubpathNavigationMenuRootState>();
    expectTypeOf<RootNavigationMenuListState>().toEqualTypeOf<SubpathNavigationMenuListState>();
    expectTypeOf<RootNavigationMenuItemState>().toEqualTypeOf<SubpathNavigationMenuItemState>();
    expectTypeOf<RootNavigationMenuTriggerState>().toEqualTypeOf<SubpathNavigationMenuTriggerState>();
    expectTypeOf<RootNavigationMenuContentState>().toEqualTypeOf<SubpathNavigationMenuContentState>();
    expectTypeOf<RootNavigationMenuPopupState>().toEqualTypeOf<SubpathNavigationMenuPopupState>();
    expectTypeOf<RootNavigationMenuViewportState>().toEqualTypeOf<SubpathNavigationMenuViewportState>();
    expectTypeOf<RootNavigationMenuBackdropState>().toEqualTypeOf<SubpathNavigationMenuBackdropState>();
    expectTypeOf<RootNavigationMenuArrowState>().toEqualTypeOf<SubpathNavigationMenuArrowState>();
    expectTypeOf<RootNavigationMenuLinkState>().toEqualTypeOf<SubpathNavigationMenuLinkState>();
    expectTypeOf<RootNavigationMenuIconState>().toEqualTypeOf<SubpathNavigationMenuIconState>();
    // NumberField (custom element)
    expectTypeOf<RootNumberFieldRootState>().toEqualTypeOf<SubpathNumberFieldRootState>();
    expectTypeOf<RootNumberFieldChangeEventReason>().toEqualTypeOf<SubpathNumberFieldChangeEventReason>();
    expectTypeOf<RootNumberFieldChangeEventDetails>().toEqualTypeOf<SubpathNumberFieldChangeEventDetails>();
    expectTypeOf<RootNumberFieldGroupState>().toEqualTypeOf<SubpathNumberFieldGroupState>();
    expectTypeOf<RootNumberFieldInputState>().toEqualTypeOf<SubpathNumberFieldInputState>();
    expectTypeOf<RootNumberFieldIncrementState>().toEqualTypeOf<SubpathNumberFieldIncrementState>();
    expectTypeOf<RootNumberFieldDecrementState>().toEqualTypeOf<SubpathNumberFieldDecrementState>();
    expectTypeOf<RootNumberFieldScrubAreaState>().toEqualTypeOf<SubpathNumberFieldScrubAreaState>();
    expectTypeOf<RootNumberFieldScrubAreaCursorState>().toEqualTypeOf<SubpathNumberFieldScrubAreaCursorState>();
    // ScrollArea (custom element)
    expectTypeOf<RootScrollAreaRootState>().toEqualTypeOf<SubpathScrollAreaRootState>();
    expectTypeOf<RootScrollAreaViewportState>().toEqualTypeOf<SubpathScrollAreaViewportState>();
    expectTypeOf<RootScrollAreaContentState>().toEqualTypeOf<SubpathScrollAreaContentState>();
    expectTypeOf<RootScrollAreaScrollbarState>().toEqualTypeOf<SubpathScrollAreaScrollbarState>();
    expectTypeOf<RootScrollAreaThumbState>().toEqualTypeOf<SubpathScrollAreaThumbState>();
    expectTypeOf<RootScrollAreaCornerState>().toEqualTypeOf<SubpathScrollAreaCornerState>();
    // Select (custom element)
    expectTypeOf<RootSelectRootState>().toEqualTypeOf<SubpathSelectRootState>();
    expectTypeOf<RootSelectTriggerState>().toEqualTypeOf<SubpathSelectTriggerState>();
    expectTypeOf<RootSelectValueState>().toEqualTypeOf<SubpathSelectValueState>();
    expectTypeOf<RootSelectPopupState>().toEqualTypeOf<SubpathSelectPopupState>();
    expectTypeOf<RootSelectItemState>().toEqualTypeOf<SubpathSelectItemState>();
    expectTypeOf<RootSelectItemIndicatorState>().toEqualTypeOf<SubpathSelectItemIndicatorState>();
    expectTypeOf<RootSelectItemTextState>().toEqualTypeOf<SubpathSelectItemTextState>();
    expectTypeOf<RootSelectGroupState>().toEqualTypeOf<SubpathSelectGroupState>();
    expectTypeOf<RootSelectGroupLabelState>().toEqualTypeOf<SubpathSelectGroupLabelState>();
    expectTypeOf<RootSelectIconState>().toEqualTypeOf<SubpathSelectIconState>();
    expectTypeOf<RootSelectChangeEventReason>().toEqualTypeOf<SubpathSelectChangeEventReason>();
    expectTypeOf<RootSelectChangeEventDetails>().toEqualTypeOf<SubpathSelectChangeEventDetails>();
    // Separator (custom element)
    expectTypeOf<RootSeparatorRootProps>().toEqualTypeOf<SubpathSeparatorRootProps>();
    expectTypeOf<RootSeparatorRootState>().toEqualTypeOf<SubpathSeparatorRootState>();
    // Slider (custom element)
    expectTypeOf<RootSliderRootState>().toEqualTypeOf<SubpathSliderRootState>();
    expectTypeOf<RootSliderControlState>().toEqualTypeOf<SubpathSliderControlState>();
    expectTypeOf<RootSliderTrackState>().toEqualTypeOf<SubpathSliderTrackState>();
    expectTypeOf<RootSliderThumbState>().toEqualTypeOf<SubpathSliderThumbState>();
    expectTypeOf<RootSliderIndicatorState>().toEqualTypeOf<SubpathSliderIndicatorState>();
    expectTypeOf<RootSliderLabelState>().toEqualTypeOf<SubpathSliderLabelState>();
    expectTypeOf<RootSliderValueState>().toEqualTypeOf<SubpathSliderValueState>();
    expectTypeOf<RootSliderChangeEventReason>().toEqualTypeOf<SubpathSliderChangeEventReason>();
    expectTypeOf<RootSliderChangeEventDetails>().toEqualTypeOf<SubpathSliderChangeEventDetails>();
    expectTypeOf<RootSliderCommitEventReason>().toEqualTypeOf<SubpathSliderCommitEventReason>();
    expectTypeOf<RootSliderCommitEventDetails>().toEqualTypeOf<SubpathSliderCommitEventDetails>();
    expectTypeOf<RootSliderOrientation>().toEqualTypeOf<SubpathSliderOrientation>();
    expectTypeOf<RootSwitchRootProps>().toEqualTypeOf<SubpathSwitchRootProps>();
    expectTypeOf<RootSwitchRootState>().toEqualTypeOf<SubpathSwitchRootState>();
    expectTypeOf<RootSwitchRootChangeEventReason>().toEqualTypeOf<SubpathSwitchRootChangeEventReason>();
    expectTypeOf<RootSwitchRootChangeEventDetails>().toEqualTypeOf<SubpathSwitchRootChangeEventDetails>();
    expectTypeOf<RootSwitchThumbProps>().toEqualTypeOf<SubpathSwitchThumbProps>();
    expectTypeOf<RootSwitchThumbState>().toEqualTypeOf<SubpathSwitchThumbState>();
    // Tabs (custom element)
    expectTypeOf<RootTabsRootState>().toEqualTypeOf<SubpathTabsRootState>();
    expectTypeOf<RootTabsListState>().toEqualTypeOf<SubpathTabsListState>();
    expectTypeOf<RootTabsTabState>().toEqualTypeOf<SubpathTabsTabState>();
    expectTypeOf<RootTabsPanelState>().toEqualTypeOf<SubpathTabsPanelState>();
    expectTypeOf<RootTabsIndicatorState>().toEqualTypeOf<SubpathTabsIndicatorState>();
    // Toast (custom element)
    expectTypeOf<RootToastProviderState>().toEqualTypeOf<SubpathToastProviderState>();
    expectTypeOf<RootToastViewportState>().toEqualTypeOf<SubpathToastViewportState>();
    expectTypeOf<RootToastRootState>().toEqualTypeOf<SubpathToastRootState>();
    expectTypeOf<RootToastContentState>().toEqualTypeOf<SubpathToastContentState>();
    expectTypeOf<RootToastTitleState>().toEqualTypeOf<SubpathToastTitleState>();
    expectTypeOf<RootToastDescriptionState>().toEqualTypeOf<SubpathToastDescriptionState>();
    expectTypeOf<RootToastCloseState>().toEqualTypeOf<SubpathToastCloseState>();
    expectTypeOf<RootToastActionState>().toEqualTypeOf<SubpathToastActionState>();
    // Toggle (custom element)
    expectTypeOf<RootToggleProps>().toEqualTypeOf<SubpathToggleProps>();
    expectTypeOf<RootToggleState>().toEqualTypeOf<SubpathToggleState>();
    expectTypeOf<RootToggleChangeEventDetails>().toEqualTypeOf<SubpathToggleChangeEventDetails>();
    expectTypeOf<RootToggleRootProps>().toEqualTypeOf<SubpathToggleRootProps>();
    expectTypeOf<RootToggleRootState>().toEqualTypeOf<SubpathToggleRootState>();
    expectTypeOf<RootToggleRootChangeEventDetails>().toEqualTypeOf<SubpathToggleRootChangeEventDetails>();
    // ToggleGroup (custom element)
    expectTypeOf<RootToggleGroupProps>().toEqualTypeOf<SubpathToggleGroupProps>();
    expectTypeOf<RootToggleGroupState>().toEqualTypeOf<SubpathToggleGroupState>();
    expectTypeOf<RootToggleGroupChangeEventDetails>().toEqualTypeOf<SubpathToggleGroupChangeEventDetails>();
    expectTypeOf<RootToggleGroupRootProps>().toEqualTypeOf<SubpathToggleGroupRootProps>();
    expectTypeOf<RootToggleGroupRootState>().toEqualTypeOf<SubpathToggleGroupRootState>();
    expectTypeOf<RootToggleGroupRootChangeEventDetails>().toEqualTypeOf<SubpathToggleGroupRootChangeEventDetails>();
    // Toolbar (custom element)
    expectTypeOf<RootToolbarRootState>().toEqualTypeOf<SubpathToolbarRootState>();
    expectTypeOf<RootToolbarGroupState>().toEqualTypeOf<SubpathToolbarGroupState>();
    expectTypeOf<RootToolbarButtonState>().toEqualTypeOf<SubpathToolbarButtonState>();
    expectTypeOf<RootToolbarLinkState>().toEqualTypeOf<SubpathToolbarLinkState>();
    expectTypeOf<RootToolbarInputState>().toEqualTypeOf<SubpathToolbarInputState>();
    expectTypeOf<RootToolbarSeparatorState>().toEqualTypeOf<SubpathToolbarSeparatorState>();
    // Meter (custom element)
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
    expectTypeOf<RootPopoverRootProps>().toEqualTypeOf<SubpathPopoverRootProps>();
    expectTypeOf<RootPopoverRootChangeEventDetails>().toEqualTypeOf<SubpathPopoverRootChangeEventDetails>();
    expectTypeOf<RootPopoverTriggerProps>().toEqualTypeOf<SubpathPopoverTriggerProps>();
    expectTypeOf<RootPopoverViewportProps>().toEqualTypeOf<SubpathPopoverViewportProps>();
    // Progress (custom element)
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
    // Avatar (custom element)
    expectTypeOf<RootAvatarRootProps>().toEqualTypeOf<SubpathAvatarRootProps>();
    expectTypeOf<RootAvatarRootState>().toEqualTypeOf<SubpathAvatarRootState>();
    expectTypeOf<RootAvatarImageProps>().toEqualTypeOf<SubpathAvatarImageProps>();
    expectTypeOf<RootAvatarImageState>().toEqualTypeOf<SubpathAvatarImageState>();
    expectTypeOf<RootAvatarFallbackProps>().toEqualTypeOf<SubpathAvatarFallbackProps>();
    expectTypeOf<RootAvatarFallbackState>().toEqualTypeOf<SubpathAvatarFallbackState>();
    expectTypeOf<RootImageLoadingStatus>().toEqualTypeOf<SubpathImageLoadingStatus>();
  });

  // ─── New shared utilities & providers ───────────────────────────────────

  it('re-exports direction-provider from the package root', async () => {
    const module = await import('@base-ui/lit');

    expect(module.getDirection).toBe(subpathGetDirection);
    expect(rootGetDirection).toBe(subpathGetDirection);
    expect(module.DirectionProviderElement).toBe(subpathDirectionProviderElement);
    expect(rootDirectionProviderElement).toBe(subpathDirectionProviderElement);
  });

  it('re-exports composite from the package root', async () => {
    const module = await import('@base-ui/lit');

    expect(module.navigateList).toBe(subpathNavigateList);
    expect(rootNavigateList).toBe(subpathNavigateList);
    expect(module.navigateGrid).toBe(subpathNavigateGrid);
    expect(rootNavigateGrid).toBe(subpathNavigateGrid);
    expect(module.findNonDisabledIndex).toBe(subpathFindNonDisabledIndex);
    expect(rootFindNonDisabledIndex).toBe(subpathFindNonDisabledIndex);
  });

  it('re-exports csp-provider from the package root', async () => {
    const module = await import('@base-ui/lit');

    expect(module.CSPProviderElement).toBe(subpathCSPProviderElement);
    expect(rootCSPProviderElement).toBe(subpathCSPProviderElement);
    expect(module.getCSPContext).toBe(subpathGetCSPContext);
    expect(rootGetCSPContext).toBe(subpathGetCSPContext);
  });

  it('re-exports labelable-provider from the package root', async () => {
    const module = await import('@base-ui/lit');

    expect(module.LabelableProviderElement).toBe(subpathLabelableProviderElement);
    expect(rootLabelableProviderElement).toBe(subpathLabelableProviderElement);
    expect(module.getLabelableContext).toBe(subpathGetLabelableContext);
    expect(rootGetLabelableContext).toBe(subpathGetLabelableContext);
  });

  it('re-exports localization-provider from the package root', async () => {
    const module = await import('@base-ui/lit');

    expect(module.LocalizationProviderElement).toBe(subpathLocalizationProviderElement);
    expect(rootLocalizationProviderElement).toBe(subpathLocalizationProviderElement);
    expect(module.getLocalizationContext).toBe(subpathGetLocalizationContext);
    expect(rootGetLocalizationContext).toBe(subpathGetLocalizationContext);
  });

  it('re-exports temporal-adapter-provider from the package root', async () => {
    const module = await import('@base-ui/lit');

    expect(module.TemporalAdapterProviderElement).toBe(subpathTemporalAdapterProviderElement);
    expect(rootTemporalAdapterProviderElement).toBe(subpathTemporalAdapterProviderElement);
    expect(module.getTemporalAdapter).toBe(subpathGetTemporalAdapter);
    expect(rootGetTemporalAdapter).toBe(subpathGetTemporalAdapter);
  });

  it('re-exports use-button from the package root', async () => {
    const module = await import('@base-ui/lit');

    expectTypeOf<RootButtonBehaviorOptions>().toEqualTypeOf<SubpathButtonBehaviorOptions>();
    expect(module.applyButtonBehavior).toBe(subpathApplyButtonBehavior);
    expect(rootApplyButtonBehavior).toBe(subpathApplyButtonBehavior);
    expect(module.syncButtonAttributes).toBe(subpathSyncButtonAttributes);
    expect(rootSyncButtonAttributes).toBe(subpathSyncButtonAttributes);
    expect(module.removeButtonBehavior).toBe(subpathRemoveButtonBehavior);
    expect(rootRemoveButtonBehavior).toBe(subpathRemoveButtonBehavior);
  });
});
