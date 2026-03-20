import { html, noChange, nothing, type TemplateResult } from 'lit';
// eslint-disable-next-line import/extensions
import { AsyncDirective, directive } from 'lit/async-directive.js';
import type { BaseUIGenericEventDetails, ComponentRenderFn, HTMLProps } from '../types/index.ts';
import { useRender } from '../use-render/index.ts';
import {
  FORM_CONTEXT_ATTRIBUTE,
  FORM_STATE_CHANGE_EVENT,
  type Errors,
  type FormFieldEntry,
  type FormRuntime,
  type FormValidationMode as SharedFormValidationMode,
  setFormRuntime,
} from './shared.ts';

type ComponentPropsWithChildren<
  ElementType extends keyof HTMLElementTagNameMap,
  State,
  Children = unknown,
  RenderFunctionProps = HTMLProps,
> = Omit<useRender.ComponentProps<ElementType, State, RenderFunctionProps>, 'children'> & {
  children?: Children | undefined;
};

type FormRenderProps = HTMLProps<HTMLFormElement> & {
  children?: unknown;
};

type FormRenderProp = TemplateResult | ComponentRenderFn<FormRenderProps, FormState>;

class FormDirective<FormValues extends Record<string, any> = Record<string, any>>
  extends AsyncDirective
  implements FormRuntime
{
  private latestProps: FormProps<FormValues> | null = null;
  private root: HTMLFormElement | null = null;
  private errors: Errors = {};
  private externalErrors: Errors | undefined = undefined;
  private fields = new Map<Element, FormFieldEntry>();
  private initialized = false;
  private lastPublishedStateKey: string | null = null;
  private submitted = false;
  private pendingFocusInvalidField = false;
  private pendingFocusInvalidFieldQueued = false;

  render(_componentProps: FormProps<FormValues>) {
    return noChange;
  }

  override update(
    _part: Parameters<AsyncDirective['update']>[0],
    [componentProps]: [FormProps<FormValues>],
  ) {
    this.latestProps = componentProps;

    if (!this.initialized) {
      this.initialized = true;
      this.syncExternalErrors(componentProps.errors);
      if (componentProps.actionsRef != null) {
        componentProps.actionsRef.current = { validate: (fieldName) => this.validate(fieldName) };
      }
    } else {
      this.syncExternalErrors(componentProps.errors);
      if (componentProps.actionsRef != null) {
        componentProps.actionsRef.current = { validate: (fieldName) => this.validate(fieldName) };
      }
    }

    return this.renderCurrent();
  }

  override disconnected() {
    setFormRuntime(this.root, null);
    if (this.latestProps?.actionsRef != null) {
      this.latestProps.actionsRef.current = null;
    }
    this.root = null;
    this.fields.clear();
    this.lastPublishedStateKey = null;
  }

  override reconnected() {}

  clearErrors(name: string | undefined) {
    if (name == null || !Object.hasOwn(this.errors, name)) {
      return;
    }

    const nextErrors = { ...this.errors };
    delete nextErrors[name];
    this.errors = nextErrors;
    this.publishStateChange();
  }

  getErrors() {
    return this.errors;
  }

  getFormValues() {
    return this.getConnectedFields().reduce(
      (values, field) => {
        if (field.name) {
          values[field.name] = field.getValue();
        }

        return values;
      },
      {} as Record<string, unknown>,
    );
  }

  getValidationMode(): FormValidationMode {
    return this.latestProps?.validationMode ?? 'onSubmit';
  }

  registerField(element: Element, entry: FormFieldEntry) {
    this.fields.set(element, entry);
    this.queueFocusInvalidField();
  }

  unregisterField(element: Element) {
    this.fields.delete(element);
  }

  private renderCurrent() {
    if (this.latestProps == null) {
      return nothing;
    }

    const {
      actionsRef: _actionsRef,
      children,
      errors: _errors,
      onFormSubmit: _onFormSubmit,
      onSubmit: _onSubmit,
      render,
      validationMode: _validationMode,
      ...elementProps
    } = this.latestProps;
    void _actionsRef;
    void _errors;
    void _onFormSubmit;
    void _onSubmit;
    void _validationMode;

    const noValidate = this.latestProps.noValidate ?? true;

    return useRender<FormState, HTMLFormElement>({
      defaultTagName: 'form',
      render: render as FormRenderProp | undefined,
      ref: this.handleRootRef,
      state: {},
      props: {
        [FORM_CONTEXT_ATTRIBUTE]: '',
        noValidate,
        onSubmit: (event: SubmitEvent) => {
          this.handleSubmit(event);
        },
        ...(children === undefined ? elementProps : { ...elementProps, children }),
      },
    });
  }

  private handleRootRef = (element: HTMLFormElement | null) => {
    if (this.root === element) {
      return;
    }

    setFormRuntime(this.root, null);
    this.root = element;
    setFormRuntime(this.root, this);
    this.publishStateChange();
  };

  private handleSubmit(event: SubmitEvent) {
    this.validate(undefined, true);

    const invalidField = this.getFirstInvalidField();

    if (invalidField != null) {
      event.preventDefault();
      this.focusControl(invalidField.getControl());
      return;
    }

    this.submitted = true;

    const onSubmit = this.latestProps?.onSubmit as ((event: SubmitEvent) => void) | undefined;
    onSubmit?.(event);

    if (this.latestProps?.onFormSubmit != null) {
      event.preventDefault();
      this.latestProps.onFormSubmit(this.getTypedFormValues(), createSubmitEventDetails(event));
    }
  }

  private syncExternalErrors(nextErrors: Errors | undefined) {
    if (this.externalErrors === nextErrors) {
      return;
    }

    this.externalErrors = nextErrors;
    this.errors = nextErrors ?? {};
    this.publishStateChange();

    if (!this.submitted) {
      return;
    }

    this.submitted = false;
    queueMicrotask(() => {
      this.pendingFocusInvalidField = true;
      this.queueFocusInvalidField();
    });
  }

  private publishStateChange() {
    if (this.root == null) {
      return;
    }

    const nextStateKey = JSON.stringify({
      errors: this.errors,
      validationMode: this.getValidationMode(),
    });

    if (nextStateKey === this.lastPublishedStateKey) {
      return;
    }

    this.lastPublishedStateKey = nextStateKey;
    this.root.dispatchEvent(new CustomEvent(FORM_STATE_CHANGE_EVENT));
  }

  private validate(fieldName?: string, submitAttempted = false) {
    const fields = this.getConnectedFields();

    if (fieldName != null) {
      const namedField = fields.find((field) => field.name === fieldName);
      namedField?.validate(submitAttempted);
      return;
    }

    fields.forEach((field) => {
      field.validate(submitAttempted);
    });
  }

  private getFirstInvalidField() {
    return this.getConnectedFields().find((field) => {
      return field.getValidityData().state.valid === false;
    });
  }

  private getConnectedFields() {
    const connectedFields: FormFieldEntry[] = [];

    this.fields.forEach((field, element) => {
      if (!element.isConnected) {
        this.fields.delete(element);
        return;
      }

      connectedFields.push(field);
    });

    return connectedFields;
  }

  private queueFocusInvalidField() {
    if (!this.pendingFocusInvalidField || this.pendingFocusInvalidFieldQueued) {
      return;
    }

    this.pendingFocusInvalidFieldQueued = true;
    queueMicrotask(() => {
      this.pendingFocusInvalidFieldQueued = false;

      if (!this.pendingFocusInvalidField) {
        return;
      }

      const invalidField = this.getFirstInvalidField();
      const invalidControl = invalidField?.getControl() ?? this.getFirstInvalidControlFromDom();

      if (invalidControl == null) {
        return;
      }

      this.pendingFocusInvalidField = false;
      this.focusControl(invalidControl);
    });
  }

  private getFirstInvalidControlFromDom() {
    return (
      this.root?.querySelector<HTMLElement>(
        '[data-base-ui-field-control][aria-invalid="true"], [data-base-ui-field-control][data-invalid]',
      ) ?? null
    );
  }

  private focusControl(control: HTMLElement | null) {
    if (control == null) {
      return;
    }

    control.focus();

    if (control instanceof HTMLInputElement) {
      control.select();
    }
  }

  private getTypedFormValues() {
    return this.getFormValues() as FormValues;
  }
}

const formDirective = directive(FormDirective);

/**
 * A native form element with consolidated error handling.
 * Renders a `<form>` element.
 *
 * Documentation: [Base UI Form](https://base-ui.com/react/components/form)
 */
export function Form<FormValues extends Record<string, any> = Record<string, any>>(
  componentProps: Form.Props<FormValues>,
): TemplateResult {
  return html`${formDirective(componentProps as FormProps<Record<string, any>>)}`;
}

function createSubmitEventDetails(
  event: SubmitEvent,
): BaseUIGenericEventDetails<FormSubmitEventReason> {
  return {
    reason: 'none',
    event,
  };
}

export type FormSubmitEventReason = 'none';
export type FormSubmitEventDetails = BaseUIGenericEventDetails<Form.SubmitEventReason>;
export type FormActions = {
  validate: (fieldName?: string | undefined) => void;
};
export type FormState = {};
export type FormValidationMode = SharedFormValidationMode;

export interface FormProps<
  FormValues extends Record<string, any> = Record<string, any>,
> extends ComponentPropsWithChildren<'form', FormState, unknown, FormRenderProps> {
  actionsRef?: { current: Form.Actions | null } | undefined;
  errors?: Errors | undefined;
  onFormSubmit?:
    | ((formValues: FormValues, eventDetails: Form.SubmitEventDetails) => void)
    | undefined;
  validationMode?: Form.ValidationMode | undefined;
}

export namespace Form {
  export type Actions = FormActions;
  export type Props<FormValues extends Record<string, any> = Record<string, any>> =
    FormProps<FormValues>;
  export type State = FormState;
  export type SubmitEventDetails = FormSubmitEventDetails;
  export type SubmitEventReason = FormSubmitEventReason;
  export type ValidationMode = FormValidationMode;
  export type Values<FormValues extends Record<string, any> = Record<string, any>> = FormValues;
}
