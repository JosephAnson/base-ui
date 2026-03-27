import { ReactiveElement } from 'lit';
import { useRender } from '../use-render';
import { applyButtonBehavior } from '../use-button';
import { BaseHTMLElement, ensureId } from '../utils';

// ─── Constants ──────────────────────────────────────────────────────────────────

const STATE_CHANGE_EVENT = 'base-ui-switch-state-change';
const FIELD_STATE_CHANGE_EVENT = 'base-ui-field-state-change';
const BOOLEAN_CONTROL_ATTRIBUTE = 'data-base-ui-boolean-control';
const CONTEXT_ERROR =
  'Base UI: SwitchRootContext is missing. Switch parts must be placed within <switch-root>.';
const VISUALLY_HIDDEN_INPUT_STYLE =
  'position:absolute;clip-path:inset(50%);overflow:hidden;white-space:nowrap;border:0;padding:0;width:1px;height:1px;margin:-1px';
const VISUALLY_HIDDEN_STYLE =
  'position:fixed;top:0;left:0;clip-path:inset(50%);overflow:hidden;white-space:nowrap;border:0;padding:0;width:1px;height:1px;margin:-1px';

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface SwitchRootState {
  /**
   * Whether the field has been touched.
   */
  touched: boolean;
  /**
   * Whether the value differs from the initial value.
   */
  dirty: boolean;
  /**
   * Whether the control is currently focused.
   */
  focused: boolean;
  /**
   * Whether the field currently has a value.
   */
  filled: boolean;
  /**
   * The field validity state.
   */
  valid: boolean | null;
  /**
   * Whether the switch is currently active.
   */
  checked: boolean;
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
  /**
   * Whether the user should be unable to activate or deactivate the switch.
   */
  readOnly: boolean;
  /**
   * Whether the user must activate the switch before submitting a form.
   */
  required: boolean;
}

export interface SwitchThumbState extends SwitchRootState {}

export interface SwitchRootChangeEventDetails {
  event: Event;
  cancel(): void;
  allowPropagation(): void;
  readonly isCanceled: boolean;
  readonly isPropagationAllowed: boolean;
  reason: 'none';
}

export interface SwitchRootProps {
  /**
   * Whether the switch is currently active.
   * This is the controlled counterpart of `defaultChecked`.
   */
  checked?: boolean | undefined;
  /**
   * Whether the switch is initially active.
   * This is the uncontrolled counterpart of `checked`.
   * @default false
   */
  defaultChecked?: boolean | undefined;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * A ref to access the hidden `<input>` element.
   */
  inputRef?: Ref<HTMLInputElement> | undefined;
  /**
   * Identifies the field when a form is submitted.
   */
  name?: string | undefined;
  /**
   * Identifies the form that owns the hidden input.
   * Useful when the switch is rendered outside the form.
   */
  form?: string | undefined;
  /**
   * Event handler called when the switch is activated or deactivated.
   */
  onCheckedChange?:
    | ((checked: boolean, eventDetails: SwitchRootChangeEventDetails) => void)
    | undefined;
  /**
   * Whether the user should be unable to activate or deactivate the switch.
   * @default false
   */
  readOnly?: boolean | undefined;
  /**
   * Whether the user must activate the switch before submitting a form.
   * @default false
   */
  required?: boolean | undefined;
  /**
   * The value submitted with the form when the switch is on.
   * By default, switch submits the "on" value, matching native checkbox behavior.
   */
  value?: string | undefined;
  /**
   * The value submitted with the form when the switch is off.
   * By default, unchecked switches do not submit any value, matching native checkbox behavior.
   */
  uncheckedValue?: string | undefined;
}

export interface SwitchThumbProps {}

type RefObject<T> = {
  current: T | null;
};

type RefCallback<T> = (instance: T | null) => void;

type Ref<T> = RefCallback<T> | RefObject<T> | null | undefined;

type FieldState = {
  disabled: boolean;
  touched: boolean;
  dirty: boolean;
  focused: boolean;
  filled: boolean;
  valid: boolean | null;
};

type FieldRuntimeLike = {
  name?: string | undefined;
  getFieldState(): FieldState;
  registerControl(element: HTMLElement | null): void;
  unregisterControl(element: HTMLElement | null): void;
  handleControlFocus(): void;
  handleControlBlur(element: HTMLInputElement): void;
  handleControlInput(element: HTMLInputElement, currentValue: unknown, nativeEvent: Event): void;
};

interface SwitchHelperRootProps
  extends SwitchRootProps, useRender.ComponentProps<'span', SwitchRootState> {
  /**
   * Whether the rendered element should be treated as a native `<button>`.
   * Set to `true` when replacing the default element with a native button via `render`.
   * @default false
   */
  nativeButton?: boolean | undefined;
}

interface SwitchHelperThumbProps extends useRender.ComponentProps<'span', SwitchThumbState> {}

export type SwitchRootChangeEventReason = SwitchRootChangeEventDetails['reason'];

// ─── SwitchRootElement ──────────────────────────────────────────────────────────

/**
 * Represents the switch itself.
 * Renders a `<switch-root>` custom element with a hidden `<input>` inside.
 *
 * Documentation: [Base UI Switch](https://base-ui.com/react/components/switch)
 */
export class SwitchRootElement extends ReactiveElement {
  static properties = {
    defaultChecked: { type: Boolean, attribute: 'default-checked' },
    disabled: { type: Boolean },
    readOnly: { type: Boolean, attribute: 'read-only' },
    required: { type: Boolean },
    name: { type: String },
    form: { type: String },
    value: { type: String },
    uncheckedValue: { type: String, attribute: 'unchecked-value' },
  };

  private checkedValue: boolean | undefined;

  /** Whether the switch is currently active. When defined, switch is controlled. */
  get checked(): boolean | undefined {
    return this.checkedValue;
  }

  set checked(val: boolean | undefined) {
    const old = this.checkedValue;
    this.checkedValue = val;
    if (old !== val) {
      this.requestUpdate();
    }
  }

  declare defaultChecked: boolean;
  declare disabled: boolean;
  declare readOnly: boolean;
  declare required: boolean;
  declare name: string | undefined;
  declare form: string | undefined;
  declare value: string | undefined;
  declare uncheckedValue: string | undefined;

  /** Callback fired when the switch is toggled. Set via `.onCheckedChange=${fn}`. */
  onCheckedChange:
    | ((checked: boolean, eventDetails: SwitchRootChangeEventDetails) => void)
    | undefined;

  private internalChecked = false;
  private initialized = false;
  private inputElement: HTMLInputElement | null = null;
  private uncheckedInputElement: HTMLInputElement | null = null;
  private explicitLabels = new Set<HTMLLabelElement>();
  private idObserver: MutationObserver | null = null;

  constructor() {
    super();
    this.defaultChecked = false;
    this.disabled = false;
    this.readOnly = false;
    this.required = false;
  }

  override createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();

    if (!this.initialized) {
      this.initialized = true;
      this.internalChecked = this.checked ?? this.defaultChecked;
    }

    this.ensureHiddenInput();
    this.addEventListener('click', this.handleClick);
    this.addEventListener('keydown', this.handleKeyDown);
    this.addEventListener('keyup', this.handleKeyUp);
    this.idObserver = new MutationObserver(() => {
      this.syncAssociatedLabels();
      this.syncAriaLabelledBy();
    });
    this.idObserver.observe(this, { attributes: true, attributeFilter: ['id'] });
    this.syncAttributes();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('click', this.handleClick);
    this.removeEventListener('keydown', this.handleKeyDown);
    this.removeEventListener('keyup', this.handleKeyUp);
    this.idObserver?.disconnect();
    this.idObserver = null;
    this.cleanupAssociatedLabels();
    this.inputElement?.remove();
    this.inputElement = null;
    this.uncheckedInputElement?.remove();
    this.uncheckedInputElement = null;
  }

  protected override updated() {
    this.syncAttributes();
  }

  getChecked(): boolean {
    return this.checked ?? this.internalChecked;
  }

  getState(): SwitchRootState {
    return {
      touched: false,
      dirty: false,
      focused: false,
      filled: this.getChecked(),
      valid: null,
      checked: this.getChecked(),
      disabled: this.disabled,
      readOnly: this.readOnly,
      required: this.required,
    };
  }

  private ensureHiddenInput() {
    if (!this.inputElement) {
      this.inputElement = document.createElement('input');
      this.inputElement.type = 'checkbox';
      this.inputElement.tabIndex = -1;
      this.inputElement.setAttribute('aria-hidden', 'true');
      this.inputElement.setAttribute(BOOLEAN_CONTROL_ATTRIBUTE, '');
      this.inputElement.addEventListener('change', this.handleInputChange);
      this.inputElement.addEventListener('focus', () => this.focus());
      this.inputElement.addEventListener('click', (event) => {
        if (this.disabled || this.readOnly) {
          event.preventDefault();
        }
      });
      this.appendChild(this.inputElement);
    }
  }

  private syncHiddenInput() {
    if (!this.inputElement) {
      return;
    }

    const isChecked = this.getChecked();
    this.inputElement.checked = isChecked;
    this.inputElement.disabled = this.disabled;
    this.inputElement.required = this.required;

    if (this.name) {
      this.inputElement.name = this.name;
      this.inputElement.style.cssText = VISUALLY_HIDDEN_INPUT_STYLE;
    } else {
      this.inputElement.removeAttribute('name');
      this.inputElement.style.cssText = VISUALLY_HIDDEN_STYLE;
    }

    if (this.form) {
      this.inputElement.setAttribute('form', this.form);
    } else {
      this.inputElement.removeAttribute('form');
    }

    if (this.value !== undefined) {
      this.inputElement.value = this.value;
    } else {
      this.inputElement.removeAttribute('value');
    }

    // Manage unchecked hidden input
    if (!isChecked && this.name && this.uncheckedValue !== undefined) {
      if (!this.uncheckedInputElement) {
        this.uncheckedInputElement = document.createElement('input');
        this.uncheckedInputElement.type = 'hidden';
        this.appendChild(this.uncheckedInputElement);
      }
      this.uncheckedInputElement.name = this.name;
      this.uncheckedInputElement.value = this.uncheckedValue;
      if (this.form) {
        this.uncheckedInputElement.setAttribute('form', this.form);
      } else {
        this.uncheckedInputElement.removeAttribute('form');
      }
    } else if (this.uncheckedInputElement) {
      this.uncheckedInputElement.remove();
      this.uncheckedInputElement = null;
    }
  }

  private syncAriaLabelledBy() {
    const control = this.inputElement;
    if (!control || !('labels' in control)) {
      this.removeAttribute('aria-labelledby');
      return;
    }

    const labels = [...Array.from(control.labels ?? []), ...this.getExplicitLabels()];
    if (labels.length === 0) {
      this.removeAttribute('aria-labelledby');
      return;
    }

    const labelIds = [...new Set(labels)]
      .map((label) => ensureId(label, 'base-ui-switch-label'))
      .filter(Boolean);

    if (labelIds.length > 0) {
      this.setAttribute('aria-labelledby', labelIds.join(' '));
    } else {
      this.removeAttribute('aria-labelledby');
    }
  }

  private syncAttributes() {
    const isChecked = this.getChecked();

    // ARIA
    this.setAttribute('role', 'switch');
    this.setAttribute('aria-checked', isChecked ? 'true' : 'false');

    if (this.disabled) {
      this.setAttribute('aria-disabled', 'true');
      this.tabIndex = -1;
    } else {
      this.removeAttribute('aria-disabled');
      this.tabIndex = 0;
    }

    if (this.readOnly) {
      this.setAttribute('aria-readonly', 'true');
    } else {
      this.removeAttribute('aria-readonly');
    }

    if (this.required) {
      this.setAttribute('aria-required', 'true');
    } else {
      this.removeAttribute('aria-required');
    }

    // Data attributes
    this.toggleAttribute('data-checked', isChecked);
    this.toggleAttribute('data-unchecked', !isChecked);
    this.toggleAttribute('data-disabled', this.disabled);
    this.toggleAttribute('data-readonly', this.readOnly);
    this.toggleAttribute('data-required', this.required);

    this.syncHiddenInput();
    this.syncAssociatedLabels();

    queueMicrotask(() => {
      this.syncAriaLabelledBy();
      this.dispatchEvent(new CustomEvent(STATE_CHANGE_EVENT, { bubbles: false }));
    });
  }

  private toggle(event: Event) {
    if (this.disabled || this.readOnly) {
      return;
    }

    const nextChecked = !this.getChecked();
    const eventDetails = createChangeEventDetails(event);
    this.onCheckedChange?.(nextChecked, eventDetails);

    if (eventDetails.isCanceled) {
      return;
    }

    if (this.checked === undefined) {
      this.internalChecked = nextChecked;
    }

    this.syncAttributes();
    this.requestUpdate();
  }

  private handleClick = (event: MouseEvent) => {
    if (event.target === this.inputElement) {
      return;
    }

    if (this.disabled) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }

    if (this.readOnly) {
      event.preventDefault();
      return;
    }

    event.preventDefault();
    this.toggle(event);
  };

  private handleKeyDown = (event: KeyboardEvent) => {
    if (this.disabled) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }

    if (event.target !== this) {
      return;
    }

    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
    }

    if (this.readOnly) {
      return;
    }

    if (event.key === 'Enter') {
      this.toggle(event);
    }
  };

  private handleKeyUp = (event: KeyboardEvent) => {
    if (this.disabled) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }

    if (event.target !== this) {
      return;
    }

    if (this.readOnly) {
      if (event.key === ' ') {
        event.preventDefault();
      }
      return;
    }

    if (event.key === ' ') {
      this.toggle(event);
    }
  };

  private handleInputChange = (event: Event) => {
    if (event.defaultPrevented) {
      return;
    }

    const input = event.currentTarget as HTMLInputElement;

    if (this.disabled || this.readOnly) {
      input.checked = this.getChecked();
      return;
    }

    const nextChecked = input.checked;
    const eventDetails = createChangeEventDetails(event);
    this.onCheckedChange?.(nextChecked, eventDetails);

    if (eventDetails.isCanceled) {
      input.checked = this.getChecked();
      return;
    }

    if (this.checked === undefined) {
      this.internalChecked = nextChecked;
    }

    this.syncAttributes();
    this.requestUpdate();
  };

  private getExplicitLabels(): HTMLLabelElement[] {
    if (!this.id) {
      return [];
    }

    const escapedId = globalThis.CSS?.escape?.(this.id) ?? this.id;
    return Array.from(
      this.ownerDocument.querySelectorAll<HTMLLabelElement>(`label[for="${escapedId}"]`),
    );
  }

  private syncAssociatedLabels() {
    const nextLabels = new Set(this.getExplicitLabels());

    this.explicitLabels.forEach((label) => {
      if (!nextLabels.has(label)) {
        label.removeEventListener('click', this.handleExplicitLabelClick);
      }
    });

    nextLabels.forEach((label) => {
      if (!this.explicitLabels.has(label)) {
        label.addEventListener('click', this.handleExplicitLabelClick);
      }
    });

    this.explicitLabels = nextLabels;
  }

  private cleanupAssociatedLabels() {
    this.explicitLabels.forEach((label) => {
      label.removeEventListener('click', this.handleExplicitLabelClick);
    });
    this.explicitLabels.clear();
  }

  private handleExplicitLabelClick = (event: MouseEvent) => {
    if (event.defaultPrevented) {
      return;
    }

    event.preventDefault();

    if (this.disabled || this.readOnly) {
      return;
    }

    this.toggle(event);
  };
}

if (!customElements.get('switch-root')) {
  customElements.define('switch-root', SwitchRootElement);
}

// ─── SwitchThumbElement ─────────────────────────────────────────────────────────

/**
 * The movable part of the switch that indicates whether the switch is on or off.
 * Renders a `<switch-thumb>` custom element.
 */
export class SwitchThumbElement extends BaseHTMLElement {
  private rootElement: SwitchRootElement | null = null;
  private stateHandler = () => this.syncAttributes();

  connectedCallback() {
    this.rootElement = this.closest('switch-root') as SwitchRootElement | null;
    if (!this.rootElement) {
      console.error(CONTEXT_ERROR);
      return;
    }

    this.rootElement.addEventListener(STATE_CHANGE_EVENT, this.stateHandler);
    queueMicrotask(() => this.syncAttributes());
  }

  disconnectedCallback() {
    this.rootElement?.removeEventListener(STATE_CHANGE_EVENT, this.stateHandler);
    this.rootElement = null;
  }

  private syncAttributes() {
    if (!this.rootElement) {
      return;
    }

    const state = this.rootElement.getState();

    this.toggleAttribute('data-checked', state.checked);
    this.toggleAttribute('data-unchecked', !state.checked);
    this.toggleAttribute('data-disabled', state.disabled);
    this.toggleAttribute('data-readonly', state.readOnly);
    this.toggleAttribute('data-required', state.required);
  }
}

if (!customElements.get('switch-thumb')) {
  customElements.define('switch-thumb', SwitchThumbElement);
}

/**
 * Represents the switch itself.
 * Renders a `<span>` element by default and manages a hidden checkbox input.
 *
 * Documentation: [Base UI Switch](https://base-ui.com/react/components/switch)
 */
function SwitchRootHelper(props: SwitchHelperRootProps) {
  const {
    'aria-labelledby': ariaLabelledBy,
    checked,
    defaultChecked = false,
    disabled = false,
    form,
    id,
    inputRef,
    name,
    nativeButton = false,
    onCheckedChange,
    readOnly = false,
    render,
    role,
    required = false,
    uncheckedValue,
    value,
    ...elementProps
  } = props;

  const state: SwitchRootState = {
    touched: false,
    dirty: false,
    focused: false,
    filled: checked ?? defaultChecked,
    valid: null,
    checked: checked ?? defaultChecked,
    disabled,
    readOnly,
    required,
  };

  return useRender({
    defaultTagName: nativeButton ? 'button' : 'span',
    render,
    state,
    ref: createSwitchBehaviorRef({
      ariaLabelledBy,
      checked,
      defaultChecked,
      disabled,
      form,
      id,
      inputRef,
      name,
      nativeButton,
      onCheckedChange,
      role,
      readOnly,
      required,
      uncheckedValue,
      value,
    }),
    props: {
      'data-base-ui-switch-root': '',
      ...elementProps,
    },
  });
}

/**
 * The movable part of the switch that indicates whether the switch is on or off.
 * Renders a `<span>` by default.
 */
function SwitchThumbHelper(props: SwitchHelperThumbProps) {
  const { render, ...elementProps } = props;

  return useRender({
    defaultTagName: 'span',
    render,
    state: {
      checked: false,
      disabled: false,
      readOnly: false,
      required: false,
    } satisfies SwitchThumbState,
    props: {
      'data-base-ui-switch-thumb': '',
      ...elementProps,
    },
  });
}

export const Switch = {
  Root: SwitchRootHelper,
  Thumb: SwitchThumbHelper,
} as const;

// ─── Helpers ────────────────────────────────────────────────────────────────────

function createChangeEventDetails(event: Event): SwitchRootChangeEventDetails {
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
  };
}

function createSwitchBehaviorRef(options: {
  ariaLabelledBy: string | undefined;
  checked: boolean | undefined;
  defaultChecked: boolean;
  disabled: boolean;
  form: string | undefined;
  id: string | undefined;
  inputRef: Ref<HTMLInputElement> | undefined;
  name: string | undefined;
  nativeButton: boolean;
  onCheckedChange:
    | ((checked: boolean, eventDetails: SwitchRootChangeEventDetails) => void)
    | undefined;
  role: string | undefined;
  readOnly: boolean;
  required: boolean;
  uncheckedValue: string | undefined;
  value: string | undefined;
}) {
  let cleanupButtonBehavior: (() => void) | null = null;
  let element: HTMLElement | null = null;
  let hiddenInput: HTMLInputElement | null = null;
  let uncheckedInput: HTMLInputElement | null = null;
  let internalChecked = options.defaultChecked;
  let explicitLabels = new Set<HTMLElement>();
  let fieldRoot: FieldRuntimeLike | null = null;
  let fieldRootElement: HTMLElement | null = null;
  let lastFieldValue: boolean | null = null;
  let ignoreNextHiddenInputChange = false;

  const defaultFieldState: FieldState = {
    disabled: false,
    touched: false,
    dirty: false,
    focused: false,
    filled: false,
    valid: null,
  };

  function assignRef<T>(ref: Ref<T>, instance: T | null) {
    if (ref == null) {
      return;
    }

    if (typeof ref === 'function') {
      ref(instance);
      return;
    }

    ref.current = instance;
  }

  function getChecked() {
    return options.checked ?? internalChecked;
  }

  function getFieldState() {
    return fieldRoot?.getFieldState() ?? defaultFieldState;
  }

  function getDisabled() {
    return options.disabled || getFieldState().disabled;
  }

  function getName() {
    return options.name ?? fieldRoot?.name;
  }

  function getState(): SwitchRootState {
    const fieldState = getFieldState();
    return {
      ...fieldState,
      checked: getChecked(),
      disabled: getDisabled(),
      readOnly: options.readOnly,
      required: options.required,
    };
  }

  function handleExplicitLabelClick(event: MouseEvent) {
    if (event.defaultPrevented || getDisabled() || options.readOnly) {
      return;
    }

    if (event.target === hiddenInput) {
      return;
    }

    event.preventDefault();
    element?.click();
  }

  function handleHiddenInputChange(event: Event) {
    if (event.defaultPrevented) {
      return;
    }

    const input = event.currentTarget as HTMLInputElement;

    if (ignoreNextHiddenInputChange) {
      ignoreNextHiddenInputChange = false;
      input.checked = getChecked();
      return;
    }

    if (getDisabled() || options.readOnly) {
      input.checked = getChecked();
      return;
    }

    const nextChecked = input.checked;
    const eventDetails = createChangeEventDetails(event);
    options.onCheckedChange?.(nextChecked, eventDetails);

    if (eventDetails.isCanceled) {
      input.checked = getChecked();
      return;
    }

    if (options.checked === undefined) {
      internalChecked = nextChecked;
    }

    sync();
    syncFieldValue(event);
  }

  function handleFieldStateChange() {
    sync();
  }

  function handleFocus() {
    fieldRoot?.handleControlFocus();
  }

  function handleBlur() {
    if (hiddenInput != null) {
      fieldRoot?.handleControlBlur(hiddenInput);
    }
  }

  const cleanupExplicitLabels = () => {
    explicitLabels.forEach((label) => {
      label.removeEventListener('click', handleExplicitLabelClick);
    });
    explicitLabels.clear();
  };

  const removeManagedInputs = () => {
    if (fieldRoot != null && hiddenInput != null) {
      fieldRoot.unregisterControl(hiddenInput);
    }

    assignRef(options.inputRef, null);
    hiddenInput?.remove();
    hiddenInput = null;
    uncheckedInput?.remove();
    uncheckedInput = null;
    lastFieldValue = null;
  };

  function getLabelTargetId() {
    if (options.id == null || options.id === '') {
      return undefined;
    }

    return options.nativeButton ? element?.id : hiddenInput?.id;
  }

  function syncThumbState() {
    if (element == null) {
      return;
    }

    const state = getState();
    const thumbs = element.querySelectorAll<HTMLElement>('[data-base-ui-switch-thumb]');

    thumbs.forEach((thumb) => {
      thumb.toggleAttribute('data-checked', state.checked);
      thumb.toggleAttribute('data-unchecked', !state.checked);
      thumb.toggleAttribute('data-disabled', state.disabled);
      thumb.toggleAttribute('data-readonly', state.readOnly);
      thumb.toggleAttribute('data-required', state.required);
    });
  }

  function syncAriaLabelledBy() {
    if (element == null) {
      return;
    }

    const labels = new Set<HTMLElement>();
    const wrappingLabel = element.closest('label');

    if (wrappingLabel instanceof HTMLLabelElement) {
      labels.add(wrappingLabel);
    }

    if (hiddenInput?.labels != null) {
      Array.from(hiddenInput.labels).forEach((label) => labels.add(label));
    }

    fieldRootElement
      ?.querySelectorAll<HTMLElement>('field-label[id]')
      .forEach((label) => labels.add(label));

    const labelTargetId = getLabelTargetId();
    if (labelTargetId) {
      const escapedId = globalThis.CSS?.escape?.(labelTargetId) ?? labelTargetId;
      document
        .querySelectorAll<HTMLElement>(`[for="${escapedId}"]`)
        .forEach((label) => labels.add(label));
    }

    labels.forEach((label) => {
      explicitLabels.add(label);
    });

    const labelIds = Array.from(labels)
      .map((label) => ensureId(label, 'base-ui-switch-label'))
      .filter(Boolean);
    const explicitIds =
      options.ariaLabelledBy
        ?.split(/\s+/)
        .map((value) => value.trim())
        .filter(Boolean) ?? [];
    const mergedIds = [...new Set([...explicitIds, ...labelIds])];

    if (mergedIds.length > 0) {
      element.setAttribute('aria-labelledby', mergedIds.join(' '));
    } else {
      element.removeAttribute('aria-labelledby');
    }
  }

  function syncExplicitLabels() {
    if (element == null) {
      cleanupExplicitLabels();
      return;
    }

    const nextLabels = new Set<HTMLElement>();
    const targetId = getLabelTargetId();

    if (targetId) {
      const escapedId = globalThis.CSS?.escape?.(targetId) ?? targetId;
      document
        .querySelectorAll<HTMLElement>(`[for="${escapedId}"]`)
        .forEach((label) => nextLabels.add(label));
    }

    explicitLabels.forEach((label) => {
      if (label instanceof HTMLLabelElement && !nextLabels.has(label)) {
        label.removeEventListener('click', handleExplicitLabelClick);
      }
    });

    nextLabels.forEach((label) => {
      if (label instanceof HTMLLabelElement && !explicitLabels.has(label)) {
        label.addEventListener('click', handleExplicitLabelClick);
      }
    });

    explicitLabels = nextLabels;
  }

  function syncHiddenInput() {
    if (element == null || element.parentNode == null) {
      removeManagedInputs();
      return;
    }

    if (hiddenInput == null) {
      hiddenInput = document.createElement('input');
      hiddenInput.type = 'checkbox';
      hiddenInput.tabIndex = -1;
      hiddenInput.setAttribute('aria-hidden', 'true');
      hiddenInput.setAttribute(BOOLEAN_CONTROL_ATTRIBUTE, '');
      hiddenInput.addEventListener('change', handleHiddenInputChange);
      hiddenInput.addEventListener('focus', () => element?.focus());
      hiddenInput.addEventListener('click', (event) => {
        if (getDisabled() || options.readOnly) {
          event.preventDefault();
        }
      });
    }

    if (hiddenInput.parentNode !== element.parentNode) {
      element.parentNode.insertBefore(hiddenInput, element.nextSibling);
    } else if (hiddenInput.previousSibling !== element) {
      element.parentNode.insertBefore(hiddenInput, element.nextSibling);
    }

    hiddenInput.checked = getChecked();
    hiddenInput.disabled = getDisabled();
    hiddenInput.required = options.required;
    hiddenInput.style.cssText = getName() ? VISUALLY_HIDDEN_INPUT_STYLE : VISUALLY_HIDDEN_STYLE;

    if (getName()) {
      hiddenInput.name = getName() as string;
    } else {
      hiddenInput.removeAttribute('name');
    }

    if (options.form) {
      hiddenInput.setAttribute('form', options.form);
    } else {
      hiddenInput.removeAttribute('form');
    }

    if (options.value !== undefined) {
      hiddenInput.value = options.value;
    } else {
      hiddenInput.removeAttribute('value');
    }

    if (!options.nativeButton && options.id) {
      hiddenInput.id = options.id;
    } else {
      hiddenInput.removeAttribute('id');
    }

    assignRef(options.inputRef, hiddenInput);

    if (!getChecked() && getName() && options.uncheckedValue !== undefined) {
      if (uncheckedInput == null) {
        uncheckedInput = document.createElement('input');
        uncheckedInput.type = 'hidden';
      }

      if (uncheckedInput.parentNode !== element.parentNode) {
        element.parentNode.insertBefore(uncheckedInput, hiddenInput.nextSibling);
      } else if (uncheckedInput.previousSibling !== hiddenInput) {
        element.parentNode.insertBefore(uncheckedInput, hiddenInput.nextSibling);
      }

      uncheckedInput.name = getName() as string;
      uncheckedInput.value = options.uncheckedValue;

      if (options.form) {
        uncheckedInput.setAttribute('form', options.form);
      } else {
        uncheckedInput.removeAttribute('form');
      }
    } else {
      uncheckedInput?.remove();
      uncheckedInput = null;
    }
  }

  function syncFieldRoot() {
    const nextFieldRootElement = element?.closest('field-root') as HTMLElement | null;
    const nextFieldRoot = nextFieldRootElement as FieldRuntimeLike | null;

    if (fieldRootElement === nextFieldRootElement && fieldRoot === nextFieldRoot) {
      if (fieldRoot != null && hiddenInput != null) {
        fieldRoot.registerControl(hiddenInput);
      }
      return;
    }

    if (fieldRoot != null && hiddenInput != null) {
      fieldRoot.unregisterControl(hiddenInput);
    }

    fieldRootElement?.removeEventListener(FIELD_STATE_CHANGE_EVENT, handleFieldStateChange);
    fieldRootElement = nextFieldRootElement;
    fieldRoot = nextFieldRoot;
    fieldRootElement?.addEventListener(FIELD_STATE_CHANGE_EVENT, handleFieldStateChange);

    if (fieldRoot != null && hiddenInput != null) {
      fieldRoot.registerControl(hiddenInput);
    }
  }

  function syncFieldValue(event: Event) {
    if (hiddenInput == null || fieldRoot == null) {
      return;
    }

    const nextValue = getChecked();
    if (lastFieldValue === nextValue) {
      return;
    }

    lastFieldValue = nextValue;
    fieldRoot.handleControlInput(hiddenInput, nextValue, event);
  }

  function sync() {
    if (element == null) {
      return;
    }

    syncFieldRoot();
    cleanupButtonBehavior?.();
    cleanupButtonBehavior = applyButtonBehavior(element, {
      disabled: getDisabled(),
      native: options.nativeButton,
      onAction(event) {
        if (options.readOnly) {
          return;
        }

        const nextChecked = !getChecked();
        const eventDetails = createChangeEventDetails(event);
        options.onCheckedChange?.(nextChecked, eventDetails);

        if (eventDetails.isCanceled) {
          return;
        }

        if (options.checked === undefined) {
          internalChecked = nextChecked;
        }

        ignoreNextHiddenInputChange = true;
        queueMicrotask(() => {
          ignoreNextHiddenInputChange = false;
        });
        sync();
        syncFieldValue(event);
      },
    });

    if (options.nativeButton && options.id) {
      element.id = options.id;
    } else if (options.id && element.id === options.id) {
      element.removeAttribute('id');
    }

    const fieldState = getFieldState();
    element.setAttribute('role', options.role ?? 'switch');
    element.setAttribute('aria-checked', getChecked() ? 'true' : 'false');
    element.toggleAttribute('data-checked', getChecked());
    element.toggleAttribute('data-unchecked', !getChecked());
    element.toggleAttribute('data-disabled', getDisabled());
    element.toggleAttribute('data-readonly', options.readOnly);
    element.toggleAttribute('data-required', options.required);
    element.toggleAttribute('data-touched', fieldState.touched);
    element.toggleAttribute('data-dirty', fieldState.dirty);
    element.toggleAttribute('data-focused', fieldState.focused);
    element.toggleAttribute('data-filled', fieldState.filled);

    if (fieldState.valid === true) {
      element.setAttribute('data-valid', '');
      element.removeAttribute('data-invalid');
      element.removeAttribute('aria-invalid');
    } else if (fieldState.valid === false) {
      element.removeAttribute('data-valid');
      element.setAttribute('data-invalid', '');
      element.setAttribute('aria-invalid', 'true');
    } else {
      element.removeAttribute('data-valid');
      element.removeAttribute('data-invalid');
      element.removeAttribute('aria-invalid');
    }

    if (options.readOnly) {
      element.setAttribute('aria-readonly', 'true');
    } else {
      element.removeAttribute('aria-readonly');
    }

    if (options.required) {
      element.setAttribute('aria-required', 'true');
    } else {
      element.removeAttribute('aria-required');
    }

    syncHiddenInput();
    syncFieldRoot();
    syncExplicitLabels();
    syncAriaLabelledBy();
    syncThumbState();

    queueMicrotask(() => {
      if (element == null) {
        return;
      }

      syncExplicitLabels();
      syncAriaLabelledBy();
    });
  }

  return (instance: HTMLElement | null) => {
    cleanupButtonBehavior?.();
    cleanupButtonBehavior = null;
    element?.removeEventListener('focus', handleFocus);
    element?.removeEventListener('blur', handleBlur);
    cleanupExplicitLabels();
    fieldRootElement?.removeEventListener(FIELD_STATE_CHANGE_EVENT, handleFieldStateChange);
    fieldRootElement = null;
    fieldRoot = null;
    removeManagedInputs();
    element = instance;

    if (element == null) {
      return;
    }

    element.addEventListener('focus', handleFocus);
    element.addEventListener('blur', handleBlur);
    sync();
  };
}

// ─── Namespace exports ──────────────────────────────────────────────────────────

export namespace SwitchRoot {
  export type Props = SwitchRootProps;
  export type State = SwitchRootState;
  export type ChangeEventReason = SwitchRootChangeEventReason;
  export type ChangeEventDetails = SwitchRootChangeEventDetails;
}

export namespace SwitchThumb {
  export type Props = SwitchThumbProps;
  export type State = SwitchThumbState;
}

// ─── Global type declarations ───────────────────────────────────────────────────

declare global {
  interface HTMLElementTagNameMap {
    'switch-root': SwitchRootElement;
    'switch-thumb': SwitchThumbElement;
  }
}
