import { html, noChange, nothing, type TemplateResult } from 'lit';
// eslint-disable-next-line import/extensions
import { AsyncDirective, directive } from 'lit/async-directive.js';
import {
  FIELDSET_STATE_CHANGE_EVENT,
  getClosestFieldsetRoot,
  getFieldsetContextFromElement,
} from '../fieldset/shared.ts';
import { makeEventPreventable, mergeProps } from '../merge-props/index.ts';
import type {
  BaseUIChangeEventDetails,
  BaseUIEvent,
  ComponentRenderFn,
  HTMLProps,
} from '../types/index.ts';
import { useRender } from '../use-render/index.ts';

const FIELD_ROOT_ATTRIBUTE = 'data-base-ui-field-root';
const FIELD_ITEM_ATTRIBUTE = 'data-base-ui-field-item';
const FIELD_STATE_CHANGE_EVENT = 'base-ui-field-state-change';
const FIELD_RUNTIME = Symbol('base-ui-field-runtime');

const DEFAULT_VALIDITY_STATE = {
  badInput: false,
  customError: false,
  patternMismatch: false,
  rangeOverflow: false,
  rangeUnderflow: false,
  stepMismatch: false,
  tooLong: false,
  tooShort: false,
  typeMismatch: false,
  valid: null,
  valueMissing: false,
};

const DEFAULT_FIELD_ROOT_STATE = {
  disabled: false,
  touched: false,
  dirty: false,
  valid: null,
  filled: false,
  focused: false,
};

let generatedElementId = 0;

type FieldEventHandler<EventType extends Event> = (event: BaseUIEvent<EventType>) => void;
type TransitionStatus = 'starting' | 'ending' | undefined;
type InputLikeElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
type LabelableElement = InputLikeElement | HTMLButtonElement | HTMLElement;
type ValidityStateObject = {
  badInput: boolean;
  customError: boolean;
  patternMismatch: boolean;
  rangeOverflow: boolean;
  rangeUnderflow: boolean;
  stepMismatch: boolean;
  tooLong: boolean;
  tooShort: boolean;
  typeMismatch: boolean;
  valid: boolean | null;
  valueMissing: boolean;
};
type FieldControlValue = string | number | readonly string[];

type ComponentPropsWithChildren<
  ElementType extends keyof HTMLElementTagNameMap,
  State,
  Children = unknown,
  RenderFunctionProps = HTMLProps,
> = Omit<useRender.ComponentProps<ElementType, State, RenderFunctionProps>, 'children'> & {
  children?: Children | undefined;
};

type FieldRootRenderProps = HTMLProps<HTMLDivElement> & {
  children?: unknown;
};

type FieldLabelRenderProps = Omit<HTMLProps<HTMLElement>, 'children' | 'onClick'> & {
  children?: unknown;
  onClick?: FieldEventHandler<MouseEvent> | undefined;
};

type FieldDescriptionRenderProps = HTMLProps<HTMLParagraphElement> & {
  children?: unknown;
};

type FieldErrorRenderProps = HTMLProps<HTMLDivElement> & {
  children?: unknown;
};

type FieldItemRenderProps = HTMLProps<HTMLDivElement> & {
  children?: unknown;
};

type FieldControlRenderProps = Omit<
  HTMLProps<HTMLElement>,
  'defaultValue' | 'disabled' | 'onBlur' | 'onChange' | 'onFocus' | 'onInput' | 'value'
> & {
  defaultValue?: FieldControlValue | undefined;
  disabled?: boolean | undefined;
  onBlur?: FieldEventHandler<FocusEvent> | undefined;
  onChange?: FieldEventHandler<InputEvent | Event> | undefined;
  onFocus?: FieldEventHandler<FocusEvent> | undefined;
  onInput?: FieldEventHandler<InputEvent | Event> | undefined;
  value?: FieldControlValue | undefined;
};

type FieldRootRenderProp =
  | TemplateResult
  | ComponentRenderFn<FieldRootRenderProps, FieldRootState>;
type FieldLabelRenderProp =
  | TemplateResult
  | ComponentRenderFn<FieldLabelRenderProps, FieldLabelState>;
type FieldDescriptionRenderProp =
  | TemplateResult
  | ComponentRenderFn<FieldDescriptionRenderProps, FieldDescriptionState>;
type FieldErrorRenderProp =
  | TemplateResult
  | ComponentRenderFn<FieldErrorRenderProps, FieldErrorState>;
type FieldItemRenderProp =
  | TemplateResult
  | ComponentRenderFn<FieldItemRenderProps, FieldItemState>;
type FieldControlRenderProp =
  | TemplateResult
  | ComponentRenderFn<FieldControlRenderProps, FieldControlState>;

interface FieldControlTargets {
  focusTarget: HTMLElement | null;
  labelTarget: LabelableElement | null;
  validityTarget: InputLikeElement | null;
}

interface FieldLabelEntry {
  element: HTMLElement | null;
  nativeLabel: boolean;
}

interface FieldRuntime {
  clearLabel(element: HTMLElement | null): void;
  getControlTargets(): FieldControlTargets;
  getFieldState(): FieldRootState;
  getValidityState(): FieldValidityState;
  handleControlBlur(element: InputLikeElement): void;
  handleControlFocus(): void;
  handleControlInput(
    element: InputLikeElement,
    currentValue: unknown,
    nativeEvent: Event,
  ): void;
  handleControlKeyDown(element: InputLikeElement, key: string): void;
  registerControl(element: HTMLElement | null): void;
  registerDescription(id: string): void;
  registerError(id: string, rendered: boolean): void;
  registerLabel(element: HTMLElement | null, nativeLabel: boolean): void;
  setErrorRendered(id: string, rendered: boolean): void;
  syncAssociations(): void;
  unregisterControl(element: HTMLElement | null): void;
  unregisterDescription(id: string): void;
  unregisterError(id: string): void;
}

function isInputLikeElement(element: Element | null): element is InputLikeElement {
  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  );
}

function isLabelableElement(element: Element | null): element is LabelableElement {
  return isInputLikeElement(element) || element instanceof HTMLButtonElement || element instanceof HTMLElement;
}

function createGeneratedId(prefix: string) {
  generatedElementId += 1;
  return `${prefix}-${generatedElementId}`;
}

function ensureElementId(element: Element | null, prefix: string) {
  if (!(element instanceof HTMLElement)) {
    return undefined;
  }

  if (element.id) {
    return element.id;
  }

  element.id = createGeneratedId(prefix);
  return element.id;
}

function assignRef<T>(ref: HTMLProps<T>['ref'], value: T | null) {
  if (typeof ref === 'function') {
    ref(value);
    return;
  }

  if (ref != null && typeof ref === 'object') {
    ref.current = value;
  }
}

function stringifyInputValue(value: FieldControlValue | undefined) {
  if (value == null) {
    return '';
  }

  if (Array.isArray(value)) {
    return value.join(',');
  }

  return String(value);
}

function cloneValidityState(validity: ValidityState): ValidityStateObject {
  return {
    badInput: validity.badInput,
    customError: validity.customError,
    patternMismatch: validity.patternMismatch,
    rangeOverflow: validity.rangeOverflow,
    rangeUnderflow: validity.rangeUnderflow,
    stepMismatch: validity.stepMismatch,
    tooLong: validity.tooLong,
    tooShort: validity.tooShort,
    typeMismatch: validity.typeMismatch,
    valid: validity.valid,
    valueMissing: validity.valueMissing,
  };
}

function readValidityState(element: InputLikeElement | null): ValidityStateObject {
  if (element == null) {
    return { ...DEFAULT_VALIDITY_STATE };
  }

  return cloneValidityState(element.validity);
}

function hasOnlyValueMissing(state: ValidityStateObject) {
  if (state.valid || !state.valueMissing) {
    return false;
  }

  const keys = Object.keys(DEFAULT_VALIDITY_STATE) as Array<keyof ValidityStateObject>;

  for (const key of keys) {
    if (key === 'valid' || key === 'valueMissing') {
      continue;
    }

    if (state[key]) {
      return false;
    }
  }

  return true;
}

function getElementValue(element: InputLikeElement | null): unknown {
  if (element == null) {
    return null;
  }

  if (element instanceof HTMLSelectElement && element.multiple) {
    return Array.from(element.selectedOptions).map((option) => option.value);
  }

  if (element instanceof HTMLInputElement) {
    if (element.type === 'checkbox' || element.type === 'radio') {
      return element.checked ? element.value || 'on' : '';
    }
  }

  return element.value;
}

function isElementFilled(element: InputLikeElement | null) {
  if (element == null) {
    return false;
  }

  if (element instanceof HTMLSelectElement && element.multiple) {
    return element.selectedOptions.length > 0;
  }

  if (element instanceof HTMLInputElement) {
    if (element.type === 'checkbox' || element.type === 'radio') {
      return element.checked;
    }
  }

  return element.value !== '';
}

function createChangeEventDetails(
  event: Event,
  trigger: Element | undefined,
): BaseUIChangeEventDetails<'none'> {
  let isCanceled = false;
  let isPropagationAllowed = false;

  return {
    allowPropagation() {
      isPropagationAllowed = true;
    },
    cancel() {
      isCanceled = true;
    },
    event,
    get isCanceled() {
      return isCanceled;
    },
    get isPropagationAllowed() {
      return isPropagationAllowed;
    },
    reason: 'none',
    trigger,
  };
}

function getClosestFieldRoot(node: Node | null) {
  let current: Node | null = node;

  while (current != null) {
    if (current instanceof HTMLElement && current.hasAttribute(FIELD_ROOT_ATTRIBUTE)) {
      return current;
    }

    current = current.parentNode;
  }

  return null;
}

function getFallbackFieldRoot() {
  return document.querySelector(`[${FIELD_ROOT_ATTRIBUTE}]`) as HTMLElement | null;
}

function getFieldRuntime(root: Element | null): FieldRuntime | null {
  if (!(root instanceof HTMLElement)) {
    return null;
  }

  return ((root as HTMLElement & { [FIELD_RUNTIME]?: FieldRuntime })[FIELD_RUNTIME] ?? null) as FieldRuntime | null;
}

function setFieldRuntime(root: HTMLElement | null, runtime: FieldRuntime | null) {
  if (root == null) {
    return;
  }

  const rootWithRuntime = root as HTMLElement & { [FIELD_RUNTIME]?: FieldRuntime };

  if (runtime == null) {
    delete rootWithRuntime[FIELD_RUNTIME];
    return;
  }

  rootWithRuntime[FIELD_RUNTIME] = runtime;
}

function getCombinedFieldValidityData(
  validityData: FieldValidityData,
  invalid: boolean | undefined,
): FieldValidityData {
  return {
    ...validityData,
    state: {
      ...validityData.state,
      valid: !invalid && validityData.state.valid,
    },
  };
}

function createFieldStateAttributesMapping() {
  return {
    valid(value: boolean | null) {
      if (value === true) {
        const props: Record<string, string> = { 'data-valid': '' };
        return props;
      }

      if (value === false) {
        const props: Record<string, string> = { 'data-invalid': '' };
        return props;
      }

      return null;
    },
  };
}

function getNearestLabelableControl(root: HTMLElement): FieldControlTargets {
  const registeredControl = root.querySelector('[data-base-ui-field-control]') as HTMLElement | null;

  if (registeredControl != null) {
    const validityTarget = isInputLikeElement(registeredControl)
      ? registeredControl
      : (registeredControl.querySelector('input, textarea, select') as InputLikeElement | null);

    return {
      focusTarget: registeredControl,
      labelTarget: isLabelableElement(registeredControl) ? registeredControl : validityTarget,
      validityTarget,
    };
  }

  const toggleRoot = root.querySelector(
    '[data-base-ui-checkbox-root], [data-base-ui-radio-root], [data-base-ui-switch-root]',
  ) as HTMLElement | null;

  if (toggleRoot != null) {
    const hiddenInput =
      toggleRoot.nextElementSibling instanceof HTMLInputElement ? toggleRoot.nextElementSibling : null;

    if (toggleRoot instanceof HTMLButtonElement) {
      return {
        focusTarget: toggleRoot,
        labelTarget: toggleRoot,
        validityTarget: hiddenInput,
      };
    }

    return {
      focusTarget: toggleRoot,
      labelTarget: hiddenInput ?? toggleRoot,
      validityTarget: hiddenInput,
    };
  }

  const nativeControl = root.querySelector(
    'input:not([type="hidden"]):not([type="submit"]):not([type="reset"]):not([type="button"]), textarea, select, button',
  ) as HTMLElement | null;

  if (nativeControl != null) {
    return {
      focusTarget: nativeControl,
      labelTarget: isLabelableElement(nativeControl) ? nativeControl : null,
      validityTarget: isInputLikeElement(nativeControl) ? nativeControl : null,
    };
  }

  return {
    focusTarget: null,
    labelTarget: null,
    validityTarget: null,
  };
}

class FieldRootDirective extends AsyncDirective implements FieldRuntime {
  private latestProps: FieldRootProps | null = null;
  private root: HTMLDivElement | null = null;
  private fieldsetRoot: Element | null = null;
  private initialized = false;
  private descriptionIds = new Set<string>();
  private errorIds = new Map<string, boolean>();
  private labelEntry: FieldLabelEntry | null = null;
  private controlElement: HTMLElement | null = null;
  private validityData: FieldValidityData = {
    state: { ...DEFAULT_VALIDITY_STATE },
    error: '',
    errors: [],
    value: null,
    initialValue: null,
  };
  private touchedState = false;
  private dirtyState = false;
  private filled = false;
  private focused = false;
  private submitAttempted = false;
  private markedDirty = false;
  private lastPublishedStateKey: string | null = null;
  private domSyncQueued = false;
  private validationTimer: number | null = null;
  private observer: MutationObserver | null = null;
  private form: HTMLFormElement | null = null;
  private disabledCaptureCleanup: (() => void) | null = null;

  render(_componentProps: FieldRootProps) {
    return noChange;
  }

  override update(
    _part: Parameters<AsyncDirective['update']>[0],
    [componentProps]: [FieldRootProps],
  ) {
    this.latestProps = componentProps;

    if (!this.initialized) {
      this.initialized = true;
      if (componentProps.actionsRef != null) {
        componentProps.actionsRef.current = { validate: () => this.validateCurrentControl() };
      }
    } else if (componentProps.actionsRef != null) {
      componentProps.actionsRef.current = { validate: () => this.validateCurrentControl() };
    }

    this.scheduleDomSync();

    return this.renderCurrent();
  }

  override disconnected() {
    this.clearValidationTimer();
    this.teardownObserver();
    this.detachForm();
    this.syncFieldsetRoot(null);
    this.disabledCaptureCleanup?.();
    this.disabledCaptureCleanup = null;
    setFieldRuntime(this.root, null);
    if (this.latestProps?.actionsRef != null) {
      this.latestProps.actionsRef.current = null;
    }
    this.root = null;
    this.controlElement = null;
    this.labelEntry = null;
    this.descriptionIds.clear();
    this.errorIds.clear();
    this.lastPublishedStateKey = null;
  }

  override reconnected() {}

  registerControl(element: HTMLElement | null) {
    if (element == null) {
      return;
    }

    this.controlElement = element;
    this.captureInitialValue();
    this.scheduleDomSync();
  }

  unregisterControl(element: HTMLElement | null) {
    if (this.controlElement === element) {
      this.controlElement = null;
      this.scheduleDomSync();
    }
  }

  registerDescription(id: string) {
    this.descriptionIds.add(id);
    this.scheduleDomSync();
  }

  unregisterDescription(id: string) {
    if (this.descriptionIds.delete(id)) {
      this.scheduleDomSync();
    }
  }

  registerError(id: string, rendered: boolean) {
    this.errorIds.set(id, rendered);
    this.scheduleDomSync();
  }

  unregisterError(id: string) {
    if (this.errorIds.delete(id)) {
      this.scheduleDomSync();
    }
  }

  setErrorRendered(id: string, rendered: boolean) {
    if (this.errorIds.get(id) === rendered) {
      return;
    }

    this.errorIds.set(id, rendered);
    this.scheduleDomSync();
  }

  registerLabel(element: HTMLElement | null, nativeLabel: boolean) {
    this.labelEntry = {
      element,
      nativeLabel,
    };
    this.scheduleDomSync();
  }

  clearLabel(element: HTMLElement | null) {
    if (this.labelEntry?.element === element) {
      this.labelEntry = null;
      this.scheduleDomSync();
    }
  }

  getControlTargets() {
    if (this.root == null) {
      return {
        focusTarget: null,
        labelTarget: null,
        validityTarget: null,
      };
    }

    if (this.controlElement != null && this.root.contains(this.controlElement)) {
      return {
        focusTarget: this.controlElement,
        labelTarget: isLabelableElement(this.controlElement) ? this.controlElement : null,
        validityTarget: isInputLikeElement(this.controlElement) ? this.controlElement : null,
      };
    }

    return getNearestLabelableControl(this.root);
  }

  getFieldState(): FieldRootState {
    const invalid = this.latestProps?.invalid;
    const disabled = this.getDisabled();
    const dirty = this.latestProps?.dirty ?? this.dirtyState;
    const touched = this.latestProps?.touched ?? this.touchedState;
    const combined = getCombinedFieldValidityData(this.validityData, invalid);

    return {
      disabled,
      dirty,
      filled: this.filled,
      focused: this.focused,
      touched,
      valid: combined.state.valid,
    };
  }

  getValidityState(): FieldValidityState {
    const combined = getCombinedFieldValidityData(this.validityData, this.latestProps?.invalid);

    return {
      ...combined,
      validity: combined.state,
      transitionStatus: undefined,
    };
  }

  handleControlFocus() {
    if (this.focused) {
      return;
    }

    this.focused = true;
    this.publishStateChange();
  }

  handleControlBlur(element: InputLikeElement) {
    const touchedChanged = !(this.latestProps?.touched ?? false) || !this.touchedState;
    this.focused = false;

    if (this.latestProps?.touched === undefined) {
      this.touchedState = true;
    }

    if (touchedChanged) {
      this.publishStateChange();
    }

    if (this.latestProps?.validationMode === 'onBlur') {
      void this.commit(getElementValue(element));
    }
  }

  handleControlInput(element: InputLikeElement, currentValue: unknown, nativeEvent: Event) {
    this.captureInitialValue();
    this.updateFieldValueState(element, currentValue);

    const shouldValidateOnChange = this.shouldValidateOnChange();

    if (!shouldValidateOnChange) {
      if (this.getFieldState().valid === false) {
        void this.commit(currentValue, true);
      }
      return;
    }

    if (this.validationDebounceTime() > 0 && currentValue !== '') {
      this.clearValidationTimer();
      this.validationTimer = window.setTimeout(() => {
        this.validationTimer = null;
        void this.commit(currentValue);
      }, this.validationDebounceTime());
      return;
    }

    void this.commit(currentValue);
    void nativeEvent;
  }

  handleControlKeyDown(element: InputLikeElement, key: string) {
    if (element instanceof HTMLInputElement && key === 'Enter') {
      if (this.latestProps?.touched === undefined) {
        this.touchedState = true;
      }
      this.publishStateChange();
      void this.commit(getElementValue(element));
    }
  }

  syncAssociations() {
    if (this.root == null) {
      return;
    }

    this.syncDisabledCapture();
    this.captureInitialValue();

    const { focusTarget, labelTarget } = this.getControlTargets();
    const messageIds = this.getMessageIds();

    if (focusTarget != null) {
      if (messageIds.length > 0) {
        focusTarget.setAttribute('aria-describedby', messageIds.join(' '));
      } else {
        focusTarget.removeAttribute('aria-describedby');
      }
    }

    if (this.labelEntry?.element != null && focusTarget != null) {
      const labelId = ensureElementId(this.labelEntry.element, 'base-ui-field-label');

      if (this.labelEntry.nativeLabel && this.labelEntry.element instanceof HTMLLabelElement) {
        const controlId = ensureElementId(labelTarget, 'base-ui-field-control');

        if (controlId != null) {
          this.labelEntry.element.htmlFor = controlId;
        }

        focusTarget.removeAttribute('aria-labelledby');
      } else {
        if (this.labelEntry.element instanceof HTMLLabelElement) {
          this.labelEntry.element.htmlFor = '';
        }

        if (labelId != null) {
          focusTarget.setAttribute('aria-labelledby', labelId);
        } else {
          focusTarget.removeAttribute('aria-labelledby');
        }
      }

      return;
    }

    if (this.labelEntry?.element instanceof HTMLLabelElement) {
      this.labelEntry.element.htmlFor = '';
    }
  }

  private renderCurrent() {
    if (this.latestProps == null) {
      return nothing;
    }

    const {
      actionsRef: _actionsRef,
      children,
      className,
      defaultValue: _defaultValue,
      dirty: _dirty,
      disabled: _disabled,
      invalid: _invalid,
      name: _name,
      touched: _touched,
      validate: _validate,
      validationDebounceTime: _validationDebounceTime,
      validationMode: _validationMode,
      render,
      ...elementProps
    } = this.latestProps;
    void className;
    void _defaultValue;
    void _dirty;
    void _disabled;
    void _invalid;
    void _name;
    void _touched;
    void _validate;
    void _validationDebounceTime;
    void _validationMode;

    const state = this.getFieldState();
    const rootProps = mergeProps<HTMLDivElement>(
      {
        [FIELD_ROOT_ATTRIBUTE]: '',
        onFocusIn: (event: FocusEvent) => {
          if (this.controlElement != null) {
            return;
          }

          const targets = this.getControlTargets();
          if (event.target === targets.focusTarget && !this.focused) {
            this.focused = true;
            this.publishStateChange();
          }
        },
        onFocusOut: (event: FocusEvent) => {
          if (this.controlElement != null) {
            return;
          }

          if (this.root?.contains(event.relatedTarget as Node | null)) {
            return;
          }

          const targets = this.getControlTargets();
          if (event.target === targets.focusTarget) {
            this.focused = false;
            if (this.latestProps?.touched === undefined) {
              this.touchedState = true;
            }
            this.publishStateChange();

            if (targets.validityTarget != null && this.latestProps?.validationMode === 'onBlur') {
              void this.commit(getElementValue(targets.validityTarget));
            }
          }
        },
        onInput: (event: InputEvent | Event) => {
          if (this.controlElement != null) {
            return;
          }

          const targets = this.getControlTargets();
          if (event.target === targets.validityTarget && targets.validityTarget != null) {
            this.handleControlInput(
              targets.validityTarget,
              getElementValue(targets.validityTarget),
              event,
            );
          }
        },
        onChange: (event: Event) => {
          if (this.controlElement != null) {
            return;
          }

          const targets = this.getControlTargets();
          if (event.target === targets.validityTarget && targets.validityTarget != null) {
            this.handleControlInput(
              targets.validityTarget,
              getElementValue(targets.validityTarget),
              event,
            );
          }
        },
        onKeyDown: (event: KeyboardEvent) => {
          if (this.controlElement != null) {
            return;
          }

          const targets = this.getControlTargets();
          if (event.target === targets.validityTarget && targets.validityTarget != null) {
            this.handleControlKeyDown(targets.validityTarget, event.key);
          }
        },
      },
      (children === undefined ? elementProps : { ...elementProps, children }) as Parameters<
        typeof mergeProps<HTMLDivElement>
      >[0],
    );

    return useRender<FieldRootState, HTMLDivElement>({
      defaultTagName: 'div',
      render,
      ref: this.handleRootRef,
      state,
      stateAttributesMapping: createFieldStateAttributesMapping(),
      props: rootProps,
    });
  }

  private handleRootRef = (element: HTMLDivElement | null) => {
    if (this.root === element) {
      return;
    }

    setFieldRuntime(this.root, null);
    this.teardownObserver();
    this.detachForm();
    this.syncFieldsetRoot(null);
    this.disabledCaptureCleanup?.();
    this.disabledCaptureCleanup = null;

    this.root = element;

    if (element == null) {
      return;
    }

    setFieldRuntime(element, this);
    this.setupObserver(element);
    const fieldsetRoot = getClosestFieldsetRoot(element);
    this.syncFieldsetRoot(fieldsetRoot);
    if (fieldsetRoot != null) {
      queueMicrotask(() => {
        this.requestComponentUpdate();
      });
    }
    this.syncFormOwner();
    this.syncDisabledCapture();
    this.scheduleDomSync();
  };

  private setupObserver(element: HTMLElement) {
    this.observer = new MutationObserver(() => {
      this.scheduleDomSync();
    });

    this.observer.observe(element, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ['id', 'aria-hidden'],
    });
  }

  private teardownObserver() {
    this.observer?.disconnect();
    this.observer = null;
  }

  private shouldValidateOnChange() {
    const validationMode = this.latestProps?.validationMode ?? 'onSubmit';
    return validationMode === 'onChange' || (validationMode === 'onSubmit' && this.submitAttempted);
  }

  private validationDebounceTime() {
    return this.latestProps?.validationDebounceTime ?? 0;
  }

  private clearValidationTimer() {
    if (this.validationTimer != null) {
      window.clearTimeout(this.validationTimer);
      this.validationTimer = null;
    }
  }

  private getDisabled() {
    return Boolean(this.latestProps?.disabled) || this.getFieldsetContext()?.disabled === true;
  }

  private getFieldsetContext() {
    if (this.fieldsetRoot == null) {
      return null;
    }

    return getFieldsetContextFromElement(this.fieldsetRoot);
  }

  private syncFieldsetRoot(element: Element | null) {
    if (this.fieldsetRoot === element) {
      return;
    }

    this.fieldsetRoot?.removeEventListener(
      FIELDSET_STATE_CHANGE_EVENT,
      this.handleFieldsetStateChange,
    );
    this.fieldsetRoot = element;
    this.fieldsetRoot?.addEventListener(FIELDSET_STATE_CHANGE_EVENT, this.handleFieldsetStateChange);
  }

  private handleFieldsetStateChange = () => {
    this.syncDisabledCapture();
    this.requestComponentUpdate();
    this.scheduleDomSync();
  };

  private requestComponentUpdate() {
    this.setValue(this.renderCurrent());
  }

  private getMessageIds() {
    return Array.from(this.descriptionIds).concat(
      Array.from(this.errorIds.entries())
        .filter(([, rendered]) => rendered)
        .map(([id]) => id),
    );
  }

  private publishStateChange() {
    if (this.root == null) {
      return;
    }

    const nextStateKey = JSON.stringify({
      descriptions: Array.from(this.descriptionIds),
      errors: Array.from(this.errorIds.entries()),
      fieldState: this.getFieldState(),
      label: this.labelEntry?.element?.id ?? null,
      validity: this.getValidityState(),
    });

    if (nextStateKey === this.lastPublishedStateKey) {
      return;
    }

    this.lastPublishedStateKey = nextStateKey;
    this.root.dispatchEvent(new CustomEvent(FIELD_STATE_CHANGE_EVENT));
  }

  private scheduleDomSync() {
    if (this.domSyncQueued) {
      return;
    }

    this.domSyncQueued = true;
    queueMicrotask(() => {
      this.domSyncQueued = false;
      this.syncFormOwner();
      this.syncAssociations();
      this.publishStateChange();
    });
  }

  private captureInitialValue() {
    if (this.validityData.initialValue !== null) {
      return;
    }

    const { validityTarget } = this.getControlTargets();
    const initialValue = getElementValue(validityTarget);

    if (initialValue !== null) {
      this.validityData = {
        ...this.validityData,
        initialValue,
      };
    }
  }

  private updateFieldValueState(element: InputLikeElement, currentValue: unknown) {
    const initialValue = this.validityData.initialValue;

    if (this.latestProps?.dirty === undefined) {
      this.dirtyState = currentValue !== initialValue;
    }

    this.markedDirty = this.markedDirty || currentValue !== initialValue;
    this.filled = isElementFilled(element);
    this.validityData = {
      ...this.validityData,
      value: currentValue,
      state: readValidityState(element),
    };

    this.publishStateChange();
  }

  private getFormValues() {
    const form = this.form;

    if (form == null) {
      return {};
    }

    const formData = new FormData(form);
    const result: Record<string, unknown> = {};

    formData.forEach((value, key) => {
      if (Object.hasOwn(result, key)) {
        const currentValue = result[key];
        if (Array.isArray(currentValue)) {
          currentValue.push(value);
        } else {
          result[key] = [currentValue, value];
        }
      } else {
        result[key] = value;
      }
    });

    return result;
  }

  private async commit(value: unknown, revalidate = false) {
    const { validityTarget } = this.getControlTargets();

    if (validityTarget == null) {
      return;
    }

    if (revalidate && this.getFieldState().valid !== false) {
      return;
    }

    let nextState = readValidityState(validityTarget);

    if (revalidate) {
      if (!nextState.valueMissing) {
        const nextValidityData = {
          value,
          state: { ...DEFAULT_VALIDITY_STATE, valid: true },
          error: '',
          errors: [],
          initialValue: this.validityData.initialValue,
        };

        validityTarget.setCustomValidity('');
        this.validityData = nextValidityData;
        this.publishStateChange();
        return;
      }

      if (!nextState.valid && !hasOnlyValueMissing(nextState)) {
        return;
      }
    }

    if (nextState.valueMissing && !this.markedDirty) {
      nextState = {
        ...nextState,
        valid: true,
        valueMissing: false,
      };
    }

    let result: string | string[] | null = null;
    let validationErrors: string[] = [];
    let defaultValidationMessage = '';
    const validateOnChange = this.shouldValidateOnChange();

    if (validityTarget.validationMessage && !validateOnChange) {
      defaultValidationMessage = validityTarget.validationMessage;
      validationErrors = [validityTarget.validationMessage];
    } else {
      const validate = this.latestProps?.validate ?? (() => null);
      const resultOrPromise = validate(value, this.getFormValues());

      result =
        typeof resultOrPromise === 'object' &&
        resultOrPromise !== null &&
        'then' in resultOrPromise
          ? await resultOrPromise
          : resultOrPromise;

      if (result !== null) {
        nextState = {
          ...nextState,
          valid: false,
          customError: true,
        };

        if (Array.isArray(result)) {
          validationErrors = result;
          validityTarget.setCustomValidity(result.join('\n'));
        } else if (result) {
          validationErrors = [result];
          validityTarget.setCustomValidity(result);
        }
      } else if (validateOnChange) {
        validityTarget.setCustomValidity('');
        nextState = {
          ...nextState,
          customError: false,
        };

        if (validityTarget.validationMessage) {
          defaultValidationMessage = validityTarget.validationMessage;
          validationErrors = [validityTarget.validationMessage];
        } else if (validityTarget.validity.valid && nextState.valid === false) {
          nextState = {
            ...nextState,
            valid: true,
          };
        }
      } else {
        validityTarget.setCustomValidity('');
      }
    }

    this.validityData = {
      value,
      state: nextState,
      error: defaultValidationMessage || (Array.isArray(result) ? (result[0] ?? '') : (result ?? '')),
      errors: validationErrors,
      initialValue: this.validityData.initialValue,
    };

    this.publishStateChange();
  }

  private validateCurrentControl() {
    this.markedDirty = true;
    this.submitAttempted = true;
    const { validityTarget } = this.getControlTargets();
    void this.commit(getElementValue(validityTarget));
  }

  private syncFormOwner() {
    const { validityTarget } = this.getControlTargets();
    const nextForm = validityTarget?.form ?? this.root?.closest('form') ?? null;

    if (this.form === nextForm) {
      return;
    }

    this.detachForm();
    this.form = nextForm;
    this.form?.addEventListener('submit', this.handleFormSubmit);
  }

  private detachForm() {
    this.form?.removeEventListener('submit', this.handleFormSubmit);
    this.form = null;
  }

  private handleFormSubmit = () => {
    this.submitAttempted = true;
    this.markedDirty = true;
    const { validityTarget } = this.getControlTargets();
    void this.commit(getElementValue(validityTarget));
  };

  private syncDisabledCapture() {
    this.disabledCaptureCleanup?.();
    this.disabledCaptureCleanup = null;

    if (this.root == null || !this.getFieldState().disabled) {
      return;
    }

    const stopInteraction = (event: Event) => {
      if (event.target === this.root) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      event.stopPropagation();
    };

    const events: Array<keyof HTMLElementEventMap> = ['click', 'change', 'input', 'keydown', 'keyup'];

    events.forEach((eventName) => {
      this.root?.addEventListener(eventName, stopInteraction, true);
    });

    this.disabledCaptureCleanup = () => {
      events.forEach((eventName) => {
        this.root?.removeEventListener(eventName, stopInteraction, true);
      });
    };
  }
}

const fieldRootDirective = directive(FieldRootDirective);

class FieldControlDirective extends AsyncDirective {
  private latestProps: FieldControlProps | null = null;
  private root: HTMLElement | null = null;
  private fieldRoot: HTMLElement | null = null;
  private initialized = false;
  private initialValue = '';
  private lastFieldStateKey: string | null = null;
  private fieldRootLookupQueued = false;

  render(_componentProps: FieldControlProps) {
    return nothing;
  }

  override update(
    part: Parameters<AsyncDirective['update']>[0],
    [componentProps]: [FieldControlProps],
  ) {
    this.latestProps = componentProps;
    const anchor = (part as { parentNode?: Node | null }).parentNode ?? null;
    this.syncFieldRoot(getClosestFieldRoot(anchor));
    this.scheduleFieldRootLookup(anchor);

    if (!this.initialized) {
      this.initialized = true;
      this.initialValue = stringifyInputValue(
        componentProps.value !== undefined ? componentProps.value : componentProps.defaultValue,
      );
    }

    return this.renderCurrent();
  }

  override disconnected() {
    this.getRuntime()?.unregisterControl(this.root);
    this.fieldRoot?.removeEventListener(FIELD_STATE_CHANGE_EVENT, this.handleFieldStateChange);
    this.root = null;
    this.fieldRoot = null;
    this.lastFieldStateKey = null;
  }

  override reconnected() {}

  private renderCurrent() {
    if (this.latestProps == null) {
      return nothing;
    }

    const autoFocus = Boolean(this.latestProps.autoFocus);
    const defaultValue = this.latestProps.defaultValue;
    const disabledProp = Boolean(this.latestProps.disabled);
    const id = this.latestProps.id as string | undefined;
    const name = this.latestProps.name as string | undefined;
    const onValueChange = this.latestProps.onValueChange;
    const render = this.latestProps.render as FieldControlRenderProp | undefined;
    const value = this.latestProps.value;
    const externalOnBlur = this.latestProps.onBlur as FieldEventHandler<FocusEvent> | undefined;
    const externalOnChange = this.latestProps.onChange as
      | FieldEventHandler<InputEvent | Event>
      | undefined;
    const externalOnFocus = this.latestProps.onFocus as FieldEventHandler<FocusEvent> | undefined;
    const externalOnInput = this.latestProps.onInput as
      | FieldEventHandler<InputEvent | Event>
      | undefined;
    const externalOnKeyDown = this.latestProps.onKeyDown as
      | FieldEventHandler<KeyboardEvent>
      | undefined;
    const externalRef = this.latestProps.ref as HTMLProps<HTMLElement>['ref'] | undefined;
    const { ...elementProps } = this.latestProps;
    delete elementProps.autoFocus;
    delete elementProps.defaultValue;
    delete elementProps.disabled;
    delete elementProps.id;
    delete elementProps.name;
    delete elementProps.onBlur;
    delete elementProps.onChange;
    delete elementProps.onFocus;
    delete elementProps.onInput;
    delete elementProps.onKeyDown;
    delete elementProps.onValueChange;
    delete elementProps.ref;
    delete elementProps.render;
    delete elementProps.value;

    const runtime = this.getRuntime();
    const fieldState = runtime?.getFieldState() ?? DEFAULT_FIELD_ROOT_STATE;
    const controlled = value !== undefined;
    const disabled = fieldState.disabled || disabledProp;
    const resolvedName = this.getFieldName() ?? name;

    const handleInputEvent = (event: InputEvent | Event) => {
      const baseUIEvent = makeEventPreventable(event as BaseUIEvent<InputEvent | Event>);

      externalOnInput?.(baseUIEvent);
      externalOnChange?.(baseUIEvent);

      if (baseUIEvent.baseUIHandlerPrevented) {
        return;
      }

      const currentTarget = event.currentTarget as Element | null;

      if (isInputLikeElement(currentTarget)) {
        const nextValue = currentTarget.value;
        onValueChange?.(nextValue, createChangeEventDetails(event, currentTarget));

        if (controlled) {
          currentTarget.value = stringifyInputValue(value);
        }

        runtime?.handleControlInput(currentTarget, nextValue, event);
      }
    };

    return useRender<FieldControlState, HTMLElement>({
      defaultTagName: 'input',
      render: this.resolveRenderProp(render, fieldState),
      ref: this.createRootRef(externalRef),
      state: {
        ...fieldState,
        disabled,
      },
      stateAttributesMapping: createFieldStateAttributesMapping(),
      props: {
        'data-base-ui-field-control': '',
        autoFocus,
        disabled,
        id,
        name: resolvedName,
        ...(controlled ? { value } : { defaultValue: this.initialValue || defaultValue }),
        onBlur: (event: FocusEvent) => {
          const baseUIEvent = makeEventPreventable(event as BaseUIEvent<FocusEvent>);

          externalOnBlur?.(baseUIEvent);

          if (baseUIEvent.baseUIHandlerPrevented) {
            return;
          }

          const currentTarget = event.currentTarget as Element | null;
          if (isInputLikeElement(currentTarget)) {
            runtime?.handleControlBlur(currentTarget);
          }
        },
        onFocus: (event: FocusEvent) => {
          const baseUIEvent = makeEventPreventable(event as BaseUIEvent<FocusEvent>);

          externalOnFocus?.(baseUIEvent);

          if (baseUIEvent.baseUIHandlerPrevented) {
            return;
          }

          runtime?.handleControlFocus();
        },
        onInput: handleInputEvent,
        onChange: handleInputEvent,
        onKeyDown: (event: KeyboardEvent) => {
          const baseUIEvent = makeEventPreventable(event as BaseUIEvent<KeyboardEvent>);

          externalOnKeyDown?.(baseUIEvent);

          if (baseUIEvent.baseUIHandlerPrevented) {
            return;
          }

          const currentTarget = event.currentTarget as Element | null;
          if (isInputLikeElement(currentTarget)) {
            runtime?.handleControlKeyDown(currentTarget, event.key);
          }
        },
        ...(elementProps as HTMLProps<HTMLElement>),
      },
    });
  }

  private syncFieldRoot(nextFieldRoot: HTMLElement | null) {
    if (this.fieldRoot === nextFieldRoot) {
      return;
    }

    this.fieldRoot?.removeEventListener(FIELD_STATE_CHANGE_EVENT, this.handleFieldStateChange);
    this.fieldRoot = nextFieldRoot;
    this.fieldRoot?.addEventListener(FIELD_STATE_CHANGE_EVENT, this.handleFieldStateChange);
  }

  private handleFieldStateChange = () => {
    const runtime = this.getRuntime();
    const nextStateKey = JSON.stringify(runtime?.getFieldState() ?? DEFAULT_FIELD_ROOT_STATE);

    if (nextStateKey === this.lastFieldStateKey) {
      return;
    }

    this.lastFieldStateKey = nextStateKey;
    this.setValue(this.renderCurrent());
  };

  private createRootRef(externalRef: HTMLProps<HTMLElement>['ref'] | undefined) {
    return (element: HTMLElement | null) => {
      this.syncFieldRoot(getClosestFieldRoot(element) ?? getFallbackFieldRoot());
      this.getRuntime()?.unregisterControl(this.root);
      this.root = element;
      assignRef(externalRef, element);
      this.getRuntime()?.registerControl(element);
    };
  }

  private resolveRenderProp(
    render: FieldControlRenderProp | undefined,
    state: FieldRootState,
  ) {
    if (typeof render !== 'function') {
      return render;
    }

    return (props: FieldControlRenderProps) => render(props, state);
  }

  private getRuntime() {
    return getFieldRuntime(this.fieldRoot);
  }

  private getFieldName() {
    const runtime = this.getRuntime();
    const rootProps = (runtime as FieldRootDirective | null)?.['latestProps'] as FieldRootProps | null;
    return rootProps?.name;
  }

  private scheduleFieldRootLookup(anchor: Node | null) {
    if (this.fieldRoot != null || this.fieldRootLookupQueued) {
      return;
    }

    this.fieldRootLookupQueued = true;
    queueMicrotask(() => {
      this.fieldRootLookupQueued = false;
      this.syncFieldRoot(getClosestFieldRoot(anchor) ?? getFallbackFieldRoot());

      if (this.fieldRoot != null) {
        this.setValue(this.renderCurrent());
      }
    });
  }
}

const fieldControlDirective = directive(FieldControlDirective);

abstract class BaseFieldPartDirective<State, Props> extends AsyncDirective {
  protected latestProps: Props | null = null;
  protected fieldRoot: HTMLElement | null = null;
  protected lastFieldStateKey: string | null = null;
  private fieldRootLookupQueued = false;

  override disconnected() {
    this.fieldRoot?.removeEventListener(FIELD_STATE_CHANGE_EVENT, this.handleFieldStateChange);
    this.fieldRoot = null;
    this.lastFieldStateKey = null;
  }

  override reconnected() {}

  protected syncFieldRoot(nextFieldRoot: HTMLElement | null) {
    if (this.fieldRoot === nextFieldRoot) {
      return;
    }

    this.fieldRoot?.removeEventListener(FIELD_STATE_CHANGE_EVENT, this.handleFieldStateChange);
    this.fieldRoot = nextFieldRoot;
    this.fieldRoot?.addEventListener(FIELD_STATE_CHANGE_EVENT, this.handleFieldStateChange);
  }

  protected getRuntime() {
    return getFieldRuntime(this.fieldRoot);
  }

  protected getFieldState() {
    return this.getRuntime()?.getFieldState() ?? DEFAULT_FIELD_ROOT_STATE;
  }

  protected scheduleFieldRootLookup(anchor: Node | null) {
    if (this.fieldRoot != null || this.fieldRootLookupQueued) {
      return;
    }

    this.fieldRootLookupQueued = true;
    queueMicrotask(() => {
      this.fieldRootLookupQueued = false;
      this.syncFieldRoot(getClosestFieldRoot(anchor) ?? getFallbackFieldRoot());

      if (this.fieldRoot != null) {
        this.setValue(this.renderCurrent());
      }
    });
  }

  protected abstract renderCurrent(): unknown;

  private handleFieldStateChange = () => {
    const runtime = this.getRuntime();
    const nextStateKey = JSON.stringify({
      fieldState: runtime?.getFieldState() ?? DEFAULT_FIELD_ROOT_STATE,
      validity: runtime?.getValidityState() ?? null,
    });

    if (nextStateKey === this.lastFieldStateKey) {
      return;
    }

    this.lastFieldStateKey = nextStateKey;
    this.setValue(this.renderCurrent());
  };
}

class FieldLabelDirective extends BaseFieldPartDirective<FieldLabelState, FieldLabelProps> {
  private labelElement: HTMLElement | null = null;
  private generatedId = createGeneratedId('base-ui-field-label');

  render(_componentProps: FieldLabelProps) {
    return nothing;
  }

  override update(
    part: Parameters<AsyncDirective['update']>[0],
    [componentProps]: [FieldLabelProps],
  ) {
    this.latestProps = componentProps;
    const anchor = (part as { parentNode?: Node | null }).parentNode ?? null;
    this.syncFieldRoot(getClosestFieldRoot(anchor));
    this.scheduleFieldRootLookup(anchor);

    return this.renderCurrent();
  }

  override disconnected() {
    this.getRuntime()?.clearLabel(this.labelElement);
    super.disconnected();
    this.labelElement = null;
  }

  protected renderCurrent() {
    if (this.latestProps == null) {
      return nothing;
    }

    const nativeLabel = this.latestProps.nativeLabel ?? true;
    const externalOnClick = this.latestProps.onClick as FieldEventHandler<MouseEvent> | undefined;
    const externalRef = this.latestProps.ref as HTMLProps<HTMLElement>['ref'] | undefined;
    const render = this.latestProps.render as FieldLabelRenderProp | undefined;
    const { ...elementProps } = this.latestProps;
    delete elementProps.nativeLabel;
    delete elementProps.onClick;
    delete elementProps.ref;
    delete elementProps.render;
    const state = this.getFieldState();

    return useRender<FieldLabelState, HTMLElement>({
      defaultTagName: 'label',
      render: typeof render === 'function' ? (props) => render(props, state) : render,
      ref: (element) => {
        this.syncFieldRoot(getClosestFieldRoot(element) ?? getFallbackFieldRoot());
        this.labelElement = element;
        assignRef(externalRef, element);
        this.getRuntime()?.registerLabel(element, nativeLabel);

        if (element != null && !element.id) {
          element.id = this.generatedId;
        }

        if (process.env.NODE_ENV !== 'production' && element != null) {
          const isLabelTag = element.tagName === 'LABEL';

          if (nativeLabel && !isLabelTag) {
            console.error(
              'Base UI: <Field.Label> expected a <label> element because the `nativeLabel` prop is true.' +
                ' Rendering a non-<label> disables native label association, so `htmlFor` will not work.' +
                ' Use a real <label> in the `render` prop, or set `nativeLabel` to `false`.',
            );
          } else if (!nativeLabel && isLabelTag) {
            console.error(
              'Base UI: <Field.Label> expected a non-<label> element because the `nativeLabel` prop is false.' +
                ' Rendering a <label> assumes native label behavior while Base UI treats it as non-native,' +
                ' which can cause unexpected pointer behavior.' +
                ' Use a non-<label> in the `render` prop, or set `nativeLabel` to `true`.',
            );
          }
        }
      },
      state,
      stateAttributesMapping: createFieldStateAttributesMapping(),
      props: {
        onClick: (event: BaseUIEvent<MouseEvent>) => {
          externalOnClick?.(event);

          if (event.baseUIHandlerPrevented || nativeLabel) {
            return;
          }

          const focusTarget = this.getRuntime()?.getControlTargets().focusTarget;
          focusTarget?.focus();
        },
        ...(elementProps as HTMLProps<HTMLElement>),
      },
    });
  }
}

const fieldLabelDirective = directive(FieldLabelDirective);

class FieldDescriptionDirective extends BaseFieldPartDirective<
  FieldDescriptionState,
  FieldDescriptionProps
> {
  private id: string | null = null;
  private generatedId = createGeneratedId('base-ui-field-description');

  render(_componentProps: FieldDescriptionProps) {
    return nothing;
  }

  override update(
    part: Parameters<AsyncDirective['update']>[0],
    [componentProps]: [FieldDescriptionProps],
  ) {
    this.latestProps = componentProps;
    const anchor = (part as { parentNode?: Node | null }).parentNode ?? null;
    this.syncFieldRoot(getClosestFieldRoot(anchor));
    this.scheduleFieldRootLookup(anchor);

    return this.renderCurrent();
  }

  override disconnected() {
    if (this.id != null) {
      this.getRuntime()?.unregisterDescription(this.id);
    }
    super.disconnected();
    this.id = null;
  }

  protected renderCurrent() {
    if (this.latestProps == null) {
      return nothing;
    }

    const id = this.latestProps.id as string | undefined;
    const externalRef = this.latestProps.ref as HTMLProps<HTMLParagraphElement>['ref'] | undefined;
    const render = this.latestProps.render as FieldDescriptionRenderProp | undefined;
    const { ...elementProps } = this.latestProps;
    delete elementProps.id;
    delete elementProps.ref;
    delete elementProps.render;
    const state = this.getFieldState();

    return useRender<FieldDescriptionState, HTMLParagraphElement>({
      defaultTagName: 'p',
      render: typeof render === 'function' ? (props) => render(props, state) : render,
      ref: (element) => {
        this.syncFieldRoot(getClosestFieldRoot(element) ?? getFallbackFieldRoot());
        if (this.id != null) {
          this.getRuntime()?.unregisterDescription(this.id);
        }

        const resolvedId = id ?? this.generatedId;

        if (element != null && !element.id) {
          element.id = resolvedId;
        }

        this.id = element?.id ?? resolvedId;

        if (this.id != null) {
          this.getRuntime()?.registerDescription(this.id);
        }

        assignRef(externalRef, element);
      },
      state,
      stateAttributesMapping: createFieldStateAttributesMapping(),
      props: {
        id,
        ...(elementProps as HTMLProps<HTMLParagraphElement>),
      },
    });
  }
}

const fieldDescriptionDirective = directive(FieldDescriptionDirective);

class FieldErrorDirective extends BaseFieldPartDirective<FieldErrorState, FieldErrorProps> {
  private id: string | null = null;
  private generatedId = createGeneratedId('base-ui-field-error');

  render(_componentProps: FieldErrorProps) {
    return nothing;
  }

  override update(
    part: Parameters<AsyncDirective['update']>[0],
    [componentProps]: [FieldErrorProps],
  ) {
    this.latestProps = componentProps;
    const anchor = (part as { parentNode?: Node | null }).parentNode ?? null;
    this.syncFieldRoot(getClosestFieldRoot(anchor));
    this.scheduleFieldRootLookup(anchor);

    return this.renderCurrent();
  }

  override disconnected() {
    if (this.id != null) {
      this.getRuntime()?.unregisterError(this.id);
    }
    super.disconnected();
    this.id = null;
  }

  protected renderCurrent() {
    if (this.latestProps == null) {
      return nothing;
    }

    const runtime = this.getRuntime();
    const fieldValidity = runtime?.getValidityState();
    const fieldState = this.getFieldState();
    const id = this.latestProps.id as string | undefined;
    const match = this.latestProps.match;
    const externalRef = this.latestProps.ref as HTMLProps<HTMLDivElement>['ref'] | undefined;
    const render = this.latestProps.render as FieldErrorRenderProp | undefined;
    const children = this.latestProps.children;
    const { ...elementProps } = this.latestProps;
    delete elementProps.id;
    delete elementProps.match;
    delete elementProps.ref;
    delete elementProps.render;

    let rendered = false;
    if (match === true) {
      rendered = true;
    } else if (match) {
      rendered = Boolean(fieldValidity?.validity[match]);
    } else {
      rendered = fieldValidity?.validity.valid === false;
    }

    if (!rendered) {
      if (this.id != null) {
        runtime?.setErrorRendered(this.id, false);
      }
      return nothing;
    }

    const content =
      children !== undefined
        ? children
        : fieldValidity != null && fieldValidity.errors.length > 1
          ? html`<ul>
              ${fieldValidity.errors.map((message) => html`<li>${message}</li>`)}
            </ul>`
          : (fieldValidity?.error ?? '');

    return useRender<FieldErrorState, HTMLDivElement>({
      defaultTagName: 'div',
      render: typeof render === 'function'
        ? (props) =>
            render(props, {
              ...fieldState,
              transitionStatus: undefined,
            })
        : render,
      ref: (element) => {
        this.syncFieldRoot(getClosestFieldRoot(element) ?? getFallbackFieldRoot());
        if (this.id != null) {
          runtime?.unregisterError(this.id);
        }

        const resolvedId = id ?? this.generatedId;

        if (element != null && !element.id) {
          element.id = resolvedId;
        }

        this.id = element?.id ?? resolvedId;

        if (this.id != null) {
          runtime?.registerError(this.id, true);
        }

        assignRef(externalRef, element);
      },
      state: {
        ...fieldState,
        transitionStatus: undefined,
      },
      stateAttributesMapping: createFieldStateAttributesMapping(),
      props: {
        id,
        children: content,
        ...(elementProps as HTMLProps<HTMLDivElement>),
      },
    });
  }
}

const fieldErrorDirective = directive(FieldErrorDirective);

class FieldValidityDirective extends BaseFieldPartDirective<FieldValidityState, FieldValidityProps> {
  render(_componentProps: FieldValidityProps) {
    return nothing;
  }

  override update(
    part: Parameters<AsyncDirective['update']>[0],
    [componentProps]: [FieldValidityProps],
  ) {
    this.latestProps = componentProps;
    const anchor = (part as { parentNode?: Node | null }).parentNode ?? null;
    this.syncFieldRoot(getClosestFieldRoot(anchor));
    this.scheduleFieldRootLookup(anchor);

    return this.renderCurrent();
  }

  protected renderCurrent() {
    if (this.latestProps == null) {
      return nothing;
    }

    const validityState = this.getRuntime()?.getValidityState();

    if (validityState == null) {
      return nothing;
    }

    return this.latestProps.children(validityState);
  }
}

const fieldValidityDirective = directive(FieldValidityDirective);

class FieldItemDirective extends BaseFieldPartDirective<FieldItemState, FieldItemProps> {
  private root: HTMLDivElement | null = null;
  private captureCleanup: (() => void) | null = null;

  render(_componentProps: FieldItemProps) {
    return nothing;
  }

  override update(
    part: Parameters<AsyncDirective['update']>[0],
    [componentProps]: [FieldItemProps],
  ) {
    this.latestProps = componentProps;
    const anchor = (part as { parentNode?: Node | null }).parentNode ?? null;
    this.syncFieldRoot(getClosestFieldRoot(anchor));
    this.scheduleFieldRootLookup(anchor);

    return this.renderCurrent();
  }

  override disconnected() {
    this.captureCleanup?.();
    this.captureCleanup = null;
    this.root = null;
    super.disconnected();
  }

  protected renderCurrent() {
    if (this.latestProps == null) {
      return nothing;
    }

    const disabled = Boolean(this.latestProps.disabled);
    const externalRef = this.latestProps.ref as HTMLProps<HTMLDivElement>['ref'] | undefined;
    const render = this.latestProps.render as FieldItemRenderProp | undefined;
    const { ...elementProps } = this.latestProps;
    delete elementProps.disabled;
    delete elementProps.ref;
    delete elementProps.render;
    const fieldState = this.getFieldState();
    const itemDisabled = fieldState.disabled || disabled;

    return useRender<FieldItemState, HTMLDivElement>({
      defaultTagName: 'div',
      render: typeof render === 'function' ? (props) => render(props, fieldState) : render,
      ref: (element) => {
        this.syncFieldRoot(getClosestFieldRoot(element) ?? getFallbackFieldRoot());
        this.captureCleanup?.();
        this.captureCleanup = null;
        this.root = element;
        assignRef(externalRef, element);

        if (element == null || !itemDisabled) {
          return;
        }

        const stopInteraction = (event: Event) => {
          if (event.target === element) {
            return;
          }

          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
        };

        const events: Array<keyof HTMLElementEventMap> = ['click', 'change', 'input', 'keydown', 'keyup'];
        events.forEach((eventName) => {
          element.addEventListener(eventName, stopInteraction, true);
        });

        this.captureCleanup = () => {
          events.forEach((eventName) => {
            element.removeEventListener(eventName, stopInteraction, true);
          });
        };
      },
      state: {
        ...fieldState,
        disabled: itemDisabled,
      },
      stateAttributesMapping: createFieldStateAttributesMapping(),
      props: {
        [FIELD_ITEM_ATTRIBUTE]: '',
        ...(elementProps as HTMLProps<HTMLDivElement>),
      },
    });
  }
}

const fieldItemDirective = directive(FieldItemDirective);

/**
 * Groups all parts of the field.
 * Renders a `<div>` element.
 */
export function FieldRoot(componentProps: FieldRoot.Props): TemplateResult {
  return html`${fieldRootDirective(componentProps)}`;
}

/**
 * An accessible label that is automatically associated with the field control.
 * Renders a `<label>` element.
 */
export function FieldLabel(componentProps: FieldLabel.Props): TemplateResult {
  return html`${fieldLabelDirective(componentProps)}`;
}

/**
 * A paragraph with additional information about the field.
 * Renders a `<p>` element.
 */
export function FieldDescription(componentProps: FieldDescription.Props): TemplateResult {
  return html`${fieldDescriptionDirective(componentProps)}`;
}

/**
 * An error message displayed if the field control fails validation.
 * Renders a `<div>` element.
 */
export function FieldError(componentProps: FieldError.Props): TemplateResult {
  return html`${fieldErrorDirective(componentProps)}`;
}

/**
 * The form control to label and validate.
 * Renders an `<input>` element.
 */
export function FieldControl(componentProps: FieldControl.Props): TemplateResult {
  return html`${fieldControlDirective(componentProps)}`;
}

/**
 * Used to display a custom message based on the field’s validity.
 */
export function FieldValidity(componentProps: FieldValidity.Props): TemplateResult {
  return html`${fieldValidityDirective(componentProps)}`;
}

/**
 * Groups individual items in a checkbox group or radio group with a label and description.
 * Renders a `<div>` element.
 */
export function FieldItem(componentProps: FieldItem.Props): TemplateResult {
  return html`${fieldItemDirective(componentProps)}`;
}

export interface FieldValidityData {
  state: ValidityStateObject;
  error: string;
  errors: string[];
  value: unknown;
  initialValue: unknown;
}

export interface FieldRootActions {
  validate: () => void;
}

export interface FieldRootState {
  disabled: boolean;
  touched: boolean;
  dirty: boolean;
  valid: boolean | null;
  filled: boolean;
  focused: boolean;
}

export interface FieldRootProps
  extends ComponentPropsWithChildren<'div', FieldRootState, unknown, FieldRootRenderProps> {
  actionsRef?: { current: FieldRoot.Actions | null } | undefined;
  dirty?: boolean | undefined;
  disabled?: boolean | undefined;
  invalid?: boolean | undefined;
  name?: string | undefined;
  render?: FieldRootRenderProp | undefined;
  touched?: boolean | undefined;
  validate?:
    | ((
        value: unknown,
        formValues: Record<string, unknown>,
      ) => string | string[] | null | Promise<string | string[] | null>)
    | undefined;
  validationDebounceTime?: number | undefined;
  validationMode?: 'onSubmit' | 'onBlur' | 'onChange' | undefined;
}

export interface FieldLabelState extends FieldRootState {}

export interface FieldLabelProps
  extends ComponentPropsWithChildren<'label', FieldLabelState, unknown, FieldLabelRenderProps> {
  nativeLabel?: boolean | undefined;
  render?: FieldLabelRenderProp | undefined;
}

export interface FieldDescriptionState extends FieldRootState {}

export interface FieldDescriptionProps
  extends ComponentPropsWithChildren<
    'p',
    FieldDescriptionState,
    unknown,
    FieldDescriptionRenderProps
  > {
  render?: FieldDescriptionRenderProp | undefined;
}

export interface FieldErrorState extends FieldRootState {
  transitionStatus: TransitionStatus;
}

export interface FieldErrorProps
  extends ComponentPropsWithChildren<'div', FieldErrorState, unknown, FieldErrorRenderProps> {
  match?: boolean | keyof ValidityState | undefined;
  render?: FieldErrorRenderProp | undefined;
}

export interface FieldControlState extends FieldRootState {}

export interface FieldControlProps
  extends Omit<
    ComponentPropsWithChildren<'input', FieldControlState, unknown, FieldControlRenderProps>,
    'defaultValue' | 'value'
  > {
  autoFocus?: boolean | undefined;
  defaultValue?: FieldControlValue | undefined;
  onValueChange?:
    | ((value: string, eventDetails: FieldControl.ChangeEventDetails) => void)
    | undefined;
  render?: FieldControlRenderProp | undefined;
  value?: FieldControlValue | undefined;
}

export interface FieldItemState extends FieldRootState {}

export interface FieldItemProps
  extends ComponentPropsWithChildren<'div', FieldItemState, unknown, FieldItemRenderProps> {
  disabled?: boolean | undefined;
  render?: FieldItemRenderProp | undefined;
}

export interface FieldValidityState extends Omit<FieldValidityData, 'state'> {
  validity: FieldValidityData['state'];
  transitionStatus: TransitionStatus;
}

export interface FieldValidityProps {
  children: (state: FieldValidityState) => unknown;
}

export type FieldControlChangeEventReason = 'none';
export type FieldControlChangeEventDetails =
  BaseUIChangeEventDetails<FieldControl.ChangeEventReason>;

export namespace FieldRoot {
  export type Actions = FieldRootActions;
  export type Props = FieldRootProps;
  export type State = FieldRootState;
}

export namespace FieldLabel {
  export type Props = FieldLabelProps;
  export type State = FieldLabelState;
}

export namespace FieldDescription {
  export type Props = FieldDescriptionProps;
  export type State = FieldDescriptionState;
}

export namespace FieldError {
  export type Props = FieldErrorProps;
  export type State = FieldErrorState;
}

export namespace FieldControl {
  export type ChangeEventDetails = FieldControlChangeEventDetails;
  export type ChangeEventReason = FieldControlChangeEventReason;
  export type Props = FieldControlProps;
  export type State = FieldControlState;
}

export namespace FieldItem {
  export type Props = FieldItemProps;
  export type State = FieldItemState;
}

export namespace FieldValidity {
  export type Props = FieldValidityProps;
  export type State = FieldValidityState;
}

export const Field = {
  Root: FieldRoot,
  Label: FieldLabel,
  Description: FieldDescription,
  Error: FieldError,
  Control: FieldControl,
  Validity: FieldValidity,
  Item: FieldItem,
} as const;
