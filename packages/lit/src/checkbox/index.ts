import { ReactiveElement } from 'lit';
import { useRender } from '../use-render';
import { BaseHTMLElement, ensureId } from '../utils';
import {
  CHECKBOX_GROUP_ATTRIBUTE,
  CHECKBOX_GROUP_STATE_CHANGE_EVENT,
  getCheckboxGroupRuntimeState,
  type CheckboxGroupRuntimeState,
} from '../checkbox-group/shared';

// ─── Constants ──────────────────────────────────────────────────────────────────

const STATE_CHANGE_EVENT = 'base-ui-checkbox-state-change';
const CONTEXT_ERROR =
  'Base UI: CheckboxRootContext is missing. Checkbox parts must be placed within <checkbox-root>.';
const VISUALLY_HIDDEN_INPUT_STYLE =
  'position:absolute;clip-path:inset(50%);overflow:hidden;white-space:nowrap;border:0;padding:0;width:1px;height:1px;margin:-1px';
const VISUALLY_HIDDEN_STYLE =
  'position:fixed;top:0;left:0;clip-path:inset(50%);overflow:hidden;white-space:nowrap;border:0;padding:0;width:1px;height:1px;margin:-1px';

function getAriaCheckedValue(indeterminate: boolean, checked: boolean) {
  if (indeterminate) {
    return 'mixed';
  }

  return checked ? 'true' : 'false';
}

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface CheckboxRootState {
  /**
   * Whether the checkbox is currently checked.
   */
  checked: boolean;
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
  /**
   * Whether the user should be unable to check or uncheck the checkbox.
   */
  readOnly: boolean;
  /**
   * Whether the user must check the checkbox before submitting a form.
   */
  required: boolean;
  /**
   * Whether the checkbox is in an indeterminate state.
   */
  indeterminate: boolean;
}

export interface CheckboxIndicatorState extends CheckboxRootState {}

export interface CheckboxRootChangeEventDetails {
  event: Event;
  cancel(): void;
  readonly isCanceled: boolean;
  reason: 'none';
}

export interface CheckboxRootProps {
  checked?: boolean | undefined;
  defaultChecked?: boolean | undefined;
  disabled?: boolean | undefined;
  readOnly?: boolean | undefined;
  required?: boolean | undefined;
  indeterminate?: boolean | undefined;
  name?: string | undefined;
  value?: string | undefined;
  uncheckedValue?: string | undefined;
  parent?: boolean | undefined;
  form?: string | undefined;
  id?: string | undefined;
  onCheckedChange?:
    | ((checked: boolean, eventDetails: CheckboxRootChangeEventDetails) => void)
    | undefined;
}

export interface CheckboxIndicatorProps {
  keepMounted?: boolean | undefined;
}

type RefObject<T> = {
  current: T | null;
};

type RefCallback<T> = (instance: T | null) => void;

type Ref<T> = RefCallback<T> | RefObject<T> | null | undefined;

export interface CheckboxProps
  extends Omit<useRender.ComponentProps<'span', CheckboxRootState>, 'checked'>,
    CheckboxRootProps {
  inputRef?: Ref<HTMLInputElement> | undefined;
  nativeButton?: boolean | undefined;
}

export interface CheckboxIndicatorHelperProps
  extends CheckboxIndicatorProps,
    useRender.ComponentProps<'span', CheckboxIndicatorState> {}

// ─── CheckboxRootElement ────────────────────────────────────────────────────────

/**
 * Represents the checkbox itself.
 * Renders a `<checkbox-root>` custom element with a hidden `<input>` inside.
 *
 * Documentation: [Base UI Checkbox](https://base-ui.com/react/components/checkbox)
 */
export class CheckboxRootElement extends ReactiveElement {
  static properties = {
    defaultChecked: { type: Boolean, attribute: 'default-checked' },
    disabled: { type: Boolean },
    readOnly: { type: Boolean, attribute: 'read-only' },
    required: { type: Boolean },
    indeterminate: { type: Boolean },
    name: { type: String },
    value: { type: String },
    uncheckedValue: { type: String, attribute: 'unchecked-value' },
    parent: { type: Boolean },
  };

  private controlledChecked: boolean | undefined;

  /** Whether the checkbox is checked. When defined, checkbox is controlled. */
  get checked(): boolean | undefined {
    return this.controlledChecked;
  }

  set checked(val: boolean | undefined) {
    const old = this.controlledChecked;
    this.controlledChecked = val;
    if (old !== val) {
      this.requestUpdate();
    }
  }

  declare defaultChecked: boolean;
  declare disabled: boolean;
  declare readOnly: boolean;
  declare required: boolean;
  declare indeterminate: boolean;
  declare name: string | undefined;
  declare value: string;
  declare uncheckedValue: string | undefined;
  /** Whether this checkbox acts as a parent "select all" for the group. */
  declare parent: boolean;

  /** Callback fired when the checked state changes. Set via `.onCheckedChange=${fn}`. */
  onCheckedChange:
    | ((checked: boolean, eventDetails: CheckboxRootChangeEventDetails) => void)
    | undefined;

  private internalChecked = false;
  private initialized = false;
  private hiddenInput: HTMLInputElement | null = null;
  private uncheckedInput: HTMLInputElement | null = null;
  private groupRoot: Element | null = null;

  constructor() {
    super();
    this.defaultChecked = false;
    this.disabled = false;
    this.readOnly = false;
    this.required = false;
    this.indeterminate = false;
    this.value = 'on';
    this.parent = false;
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
    this.syncGroupRoot(
      this.closest(`[${CHECKBOX_GROUP_ATTRIBUTE}]`),
    );
    this.syncGroupDisabledState();
    this.addEventListener('click', this.handleClick);
    this.addEventListener('keydown', this.handleKeyDown);
    this.addEventListener('keyup', this.handleKeyUp);
    this.syncAttributes();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('click', this.handleClick);
    this.removeEventListener('keydown', this.handleKeyDown);
    this.removeEventListener('keyup', this.handleKeyUp);

    this.cleanupGroupDisabledState();
    this.syncGroupRoot(null);

    this.hiddenInput?.remove();
    this.hiddenInput = null;
    this.uncheckedInput?.remove();
    this.uncheckedInput = null;
  }

  protected override updated() {
    this.syncGroupDisabledState();
    this.syncAttributes();
  }

  getChecked(): boolean {
    const group = this.getGroupState();

    // If in a group with parent support
    if (group && group.allValues.length > 0) {
      if (this.parent) {
        // Parent checkbox: checked if ALL values are checked
        return group.value.length === group.allValues.length;
      }
      // Child in a group: checked if value is in the group's value array
      return group.value.includes(this.value);
    }

    // If in a group without parent support (no allValues)
    if (group) {
      return group.value.includes(this.value);
    }

    // Standalone: use own controlled/uncontrolled state
    return this.checked ?? this.internalChecked;
  }

  getIndeterminate(): boolean {
    const group = this.getGroupState();

    // Parent checkbox shows indeterminate when some (but not all/none) are checked
    if (group && group.allValues.length > 0 && this.parent) {
      const checkedCount = group.value.length;
      return checkedCount > 0 && checkedCount < group.allValues.length;
    }

    return this.indeterminate;
  }

  getState(): CheckboxRootState {
    const group = this.getGroupState();
    return {
      checked: this.getChecked(),
      disabled: Boolean(group?.disabled) || this.disabled,
      readOnly: this.readOnly,
      required: this.required,
      indeterminate: this.getIndeterminate(),
    };
  }

  private ensureHiddenInput() {
    if (!this.hiddenInput) {
      this.hiddenInput = document.createElement('input');
      this.hiddenInput.type = 'checkbox';
      this.hiddenInput.tabIndex = -1;
      this.hiddenInput.setAttribute('aria-hidden', 'true');
      this.hiddenInput.addEventListener('change', this.handleInputChange);
      this.hiddenInput.addEventListener('focus', () => this.focus());
      this.appendChild(this.hiddenInput);
    }
  }

  private syncHiddenInput() {
    if (!this.hiddenInput) {return;}

    const state = this.getState();
    const isChecked = state.checked;

    this.hiddenInput.checked = isChecked;
    this.hiddenInput.disabled = state.disabled;
    this.hiddenInput.required = state.required;
    this.hiddenInput.indeterminate = state.indeterminate;

    // Parent checkboxes are excluded from form submission
    const effectiveName = this.parent ? undefined : this.name;

    if (effectiveName) {
      this.hiddenInput.name = effectiveName;
      this.hiddenInput.style.cssText = VISUALLY_HIDDEN_INPUT_STYLE;
    } else {
      this.hiddenInput.removeAttribute('name');
      this.hiddenInput.style.cssText = VISUALLY_HIDDEN_STYLE;
    }

    if (this.value !== undefined) {
      this.hiddenInput.value = this.value;
    }

    // Manage unchecked hidden input (not for parent checkboxes)
    if (!isChecked && effectiveName && this.uncheckedValue !== undefined) {
      if (!this.uncheckedInput) {
        this.uncheckedInput = document.createElement('input');
        this.uncheckedInput.type = 'hidden';
        this.appendChild(this.uncheckedInput);
      }
      this.uncheckedInput.name = effectiveName;
      this.uncheckedInput.value = this.uncheckedValue;
    } else if (this.uncheckedInput) {
      this.uncheckedInput.remove();
      this.uncheckedInput = null;
    }
  }

  private syncAriaLabelledBy() {
    const control = this.hiddenInput;
    if (!control || !('labels' in control)) {
      this.removeAttribute('aria-labelledby');
      return;
    }

    const labels = Array.from(control.labels ?? []);
    if (labels.length === 0) {
      this.removeAttribute('aria-labelledby');
      return;
    }

    const labelIds = labels
      .map((label) => ensureId(label, 'base-ui-checkbox-label'))
      .filter(Boolean);

    if (labelIds.length > 0) {
      this.setAttribute('aria-labelledby', labelIds.join(' '));
    } else {
      this.removeAttribute('aria-labelledby');
    }
  }

  private syncAttributes() {
    const state = this.getState();
    const isChecked = state.checked;
    const isIndeterminate = state.indeterminate;

    // ARIA
    this.setAttribute('role', 'checkbox');
    this.setAttribute(
      'aria-checked',
      getAriaCheckedValue(isIndeterminate, isChecked),
    );

    if (state.disabled) {
      this.setAttribute('aria-disabled', 'true');
      this.tabIndex = -1;
    } else {
      this.removeAttribute('aria-disabled');
      this.tabIndex = 0;
    }

    if (state.readOnly) {
      this.setAttribute('aria-readonly', 'true');
    } else {
      this.removeAttribute('aria-readonly');
    }

    if (state.required) {
      this.setAttribute('aria-required', 'true');
    } else {
      this.removeAttribute('aria-required');
    }

    // aria-controls for parent checkbox
    this.syncAriaControls();

    // Data attributes
    if (isIndeterminate) {
      this.setAttribute('data-indeterminate', '');
      this.removeAttribute('data-checked');
      this.removeAttribute('data-unchecked');
    } else if (isChecked) {
      this.setAttribute('data-checked', '');
      this.removeAttribute('data-unchecked');
      this.removeAttribute('data-indeterminate');
    } else {
      this.setAttribute('data-unchecked', '');
      this.removeAttribute('data-checked');
      this.removeAttribute('data-indeterminate');
    }

    this.toggleAttribute('data-disabled', state.disabled);
    this.toggleAttribute('data-readonly', state.readOnly);
    this.toggleAttribute('data-required', state.required);

    this.syncHiddenInput();

    queueMicrotask(() => {
      this.syncAriaLabelledBy();
      this.dispatchEvent(new CustomEvent(STATE_CHANGE_EVENT, { bubbles: false }));
    });
  }

  private syncAriaControls() {
    const group = this.getGroupState();
    if (!this.parent || !group || group.allValues.length === 0) {
      this.removeAttribute('aria-controls');
      return;
    }

    const myId = ensureId(this, 'base-ui-checkbox-parent');
    const childIds = group.allValues.map((v) => `${myId}-${v}`).join(' ');
    this.setAttribute('aria-controls', childIds);
  }

  private toggleCheckbox(event: Event) {
    const state = this.getState();
    if (state.disabled || state.readOnly) {return;}

    const group = this.getGroupState();

    // Parent checkbox uses group's toggleParent
    if (group && this.parent) {
      const eventDetails = createChangeEventDetails(event);
      group.toggleParent(eventDetails);
      return;
    }

    // Child checkbox in a group uses group's toggleChild
    if (group) {
      const nextChecked = !this.getChecked();
      const eventDetails = createChangeEventDetails(event);
      group.toggleChild(this.value, nextChecked, eventDetails);
      return;
    }

    // Standalone checkbox
    const nextChecked = !this.getChecked();
    const eventDetails = createChangeEventDetails(event);
    this.onCheckedChange?.(nextChecked, eventDetails);

    if (eventDetails.isCanceled) {return;}

    if (this.checked === undefined) {
      this.internalChecked = nextChecked;
    }

    this.syncAttributes();
    this.requestUpdate();
  }

  private handleClick = (event: MouseEvent) => {
    if (event.target === this.hiddenInput) {return;}
    const state = this.getState();
    if (state.disabled || state.readOnly) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    this.toggleCheckbox(event);
  };

  private handleKeyDown = (event: KeyboardEvent) => {
    if (this.getState().disabled) {return;}
    if (event.target !== this) {return;}

    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
    }

    if (event.key === 'Enter') {
      this.toggleCheckbox(event);
    }
  };

  private handleKeyUp = (event: KeyboardEvent) => {
    if (this.getState().disabled || this.readOnly) {return;}
    if (event.target !== this) {return;}

    if (event.key === ' ') {
      this.toggleCheckbox(event);
    }
  };

  private handleInputChange = (event: Event) => {
    if (event.defaultPrevented) {return;}

    const input = event.currentTarget as HTMLInputElement;
    const state = this.getState();

    if (state.disabled || state.readOnly) {
      input.checked = this.getChecked();
      return;
    }

    const group = this.getGroupState();

    if (group && this.parent) {
      const eventDetails = createChangeEventDetails(event);
      group.toggleParent(eventDetails);
      input.checked = this.getChecked();
      return;
    }

    if (group) {
      const nextChecked = input.checked;
      const eventDetails = createChangeEventDetails(event);
      group.toggleChild(this.value, nextChecked, eventDetails);
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

  private getGroupState(): CheckboxGroupRuntimeState | null {
    return getCheckboxGroupRuntimeState(this.groupRoot);
  }

  private syncGroupRoot(root: Element | null) {
    if (this.groupRoot === root) {return;}

    this.groupRoot?.removeEventListener(
      CHECKBOX_GROUP_STATE_CHANGE_EVENT,
      this.handleGroupStateChange,
    );
    this.groupRoot = root;
    this.groupRoot?.addEventListener(
      CHECKBOX_GROUP_STATE_CHANGE_EVENT,
      this.handleGroupStateChange,
    );
  }

  private syncGroupDisabledState() {
    const group = this.getGroupState();
    if (!group || this.parent || !this.value) {return;}

    group.disabledStates.set(this.value, this.disabled);
  }

  private cleanupGroupDisabledState() {
    const group = this.getGroupState();
    if (!group || this.parent || !this.value) {return;}

    group.disabledStates.delete(this.value);
  }

  private handleGroupStateChange = () => {
    this.syncAttributes();
  };
}

if (!customElements.get('checkbox-root')) {
  customElements.define('checkbox-root', CheckboxRootElement);
}

// ─── CheckboxIndicatorElement ───────────────────────────────────────────────────

/**
 * Indicates whether the checkbox is checked.
 * Renders a `<checkbox-indicator>` custom element.
 */
export class CheckboxIndicatorElement extends BaseHTMLElement {
  static get observedAttributes() {
    return ['keep-mounted'];
  }

  private rootElement: CheckboxRootElement | null = null;
  private stateChangeHandler = () => this.syncVisibility();

  connectedCallback() {
    this.rootElement = this.closest('checkbox-root') as CheckboxRootElement | null;
    if (!this.rootElement) {
      console.error(CONTEXT_ERROR);
      return;
    }

    this.rootElement.addEventListener(STATE_CHANGE_EVENT, this.stateChangeHandler);
    queueMicrotask(() => this.syncVisibility());
  }

  disconnectedCallback() {
    this.rootElement?.removeEventListener(STATE_CHANGE_EVENT, this.stateChangeHandler);
    this.rootElement = null;
  }

  attributeChangedCallback() {
    this.syncVisibility();
  }

  get keepMounted(): boolean {
    return this.hasAttribute('keep-mounted');
  }

  set keepMounted(val: boolean) {
    this.toggleAttribute('keep-mounted', val);
  }

  private syncVisibility() {
    if (!this.rootElement) {return;}
    const state = this.rootElement.getState();
    const shouldShow = state.checked || state.indeterminate;

    if (shouldShow) {
      this.removeAttribute('hidden');
      this.style.display = '';
    } else if (!this.keepMounted) {
      this.setAttribute('hidden', '');
      this.style.display = 'none';
    }

    this.syncDataAttributes();
  }

  private syncDataAttributes() {
    if (!this.rootElement) {return;}
    const state = this.rootElement.getState();

    if (state.indeterminate) {
      this.setAttribute('data-indeterminate', '');
      this.removeAttribute('data-checked');
      this.removeAttribute('data-unchecked');
    } else if (state.checked) {
      this.setAttribute('data-checked', '');
      this.removeAttribute('data-unchecked');
      this.removeAttribute('data-indeterminate');
    } else {
      this.setAttribute('data-unchecked', '');
      this.removeAttribute('data-checked');
      this.removeAttribute('data-indeterminate');
    }

    this.toggleAttribute('data-disabled', state.disabled);
    this.toggleAttribute('data-readonly', state.readOnly);
    this.toggleAttribute('data-required', state.required);
  }
}

if (!customElements.get('checkbox-indicator')) {
  customElements.define('checkbox-indicator', CheckboxIndicatorElement);
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function createChangeEventDetails(event: Event): CheckboxRootChangeEventDetails {
  let isCanceled = false;

  return {
    cancel() {
      isCanceled = true;
    },
    event,
    get isCanceled() {
      return isCanceled;
    },
    reason: 'none',
  };
}

/**
 * Represents the checkbox itself.
 * Renders a `<span>` element and a hidden `<input>` beside by default.
 *
 * Documentation: [Base UI Checkbox](https://base-ui.com/react/components/checkbox)
 */
function CheckboxRootHelper(props: CheckboxProps) {
  const {
    checked,
    defaultChecked = false,
    disabled = false,
    form,
    id,
    indeterminate = false,
    inputRef,
    name,
    nativeButton = false,
    onCheckedChange,
    parent = false,
    readOnly = false,
    render,
    required = false,
    uncheckedValue,
    value = 'on',
    ...elementProps
  } = props;

  return useRender({
    defaultTagName: nativeButton ? 'button' : 'span',
    render,
    state: {
      checked: Boolean(checked),
      disabled,
      indeterminate,
      readOnly,
      required,
    },
    ref: createCheckboxBehaviorRef({
      checked,
      defaultChecked,
      disabled,
      form,
      id,
      indeterminate,
      inputRef,
      name,
      nativeButton,
      onCheckedChange,
      parent,
      readOnly,
      required,
      uncheckedValue,
      value,
    }),
    props: {
      'data-base-ui-checkbox-control': '',
      role: 'checkbox',
      ...elementProps,
    },
  });
}

/**
 * Indicates whether the checkbox is checked.
 * Renders a `<span>` element by default.
 */
function CheckboxIndicatorHelper(props: CheckboxIndicatorHelperProps) {
  const { keepMounted = false, render, ...elementProps } = props;

  return useRender({
    defaultTagName: 'span',
    render,
    state: {
      checked: false,
      disabled: false,
      indeterminate: false,
      readOnly: false,
      required: false,
    } satisfies CheckboxIndicatorState,
    props: {
      'data-base-ui-checkbox-indicator': '',
      'data-keep-mounted': keepMounted ? '' : undefined,
      ...elementProps,
    },
  });
}

function createCheckboxBehaviorRef(options: {
  checked: boolean | undefined;
  defaultChecked: boolean;
  disabled: boolean;
  form: string | undefined;
  id: string | undefined;
  indeterminate: boolean;
  inputRef: Ref<HTMLInputElement> | undefined;
  name: string | undefined;
  nativeButton: boolean;
  onCheckedChange:
    | ((checked: boolean, eventDetails: CheckboxRootChangeEventDetails) => void)
    | undefined;
  parent: boolean;
  readOnly: boolean;
  required: boolean;
  uncheckedValue: string | undefined;
  value: string;
}) {
  let element: HTMLElement | null = null;
  let hiddenInput: HTMLInputElement | null = null;
  let uncheckedInput: HTMLInputElement | null = null;
  let groupRoot: Element | null = null;
  let internalChecked = options.defaultChecked;
  let explicitLabels = new Set<HTMLLabelElement>();

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

  function getGroupState() {
    return getCheckboxGroupRuntimeState(groupRoot) as CheckboxGroupRuntimeState | null;
  }

  function getChecked() {
    const group = getGroupState();

    if (group && group.allValues.length > 0) {
      if (options.parent) {
        return group.value.length === group.allValues.length;
      }

      return group.value.includes(options.value);
    }

    if (group) {
      return group.value.includes(options.value);
    }

    return options.checked ?? internalChecked;
  }

  function getIndeterminate() {
    const group = getGroupState();

    if (group && group.allValues.length > 0 && options.parent) {
      const checkedCount = group.value.length;
      return checkedCount > 0 && checkedCount < group.allValues.length;
    }

    return options.indeterminate;
  }

  function getState(): CheckboxRootState {
    const group = getGroupState();

    return {
      checked: getChecked(),
      disabled: Boolean(group?.disabled) || options.disabled,
      indeterminate: getIndeterminate(),
      readOnly: options.readOnly,
      required: options.required,
    };
  }

  function getLabelTargetId() {
    if (options.id == null || options.id === '') {
      return undefined;
    }

    return options.nativeButton ? element?.id : hiddenInput?.id;
  }

  function getExplicitLabels() {
    const targetId = getLabelTargetId();
    if (targetId == null) {
      return [];
    }

    return Array.from(
      element?.ownerDocument?.querySelectorAll<HTMLLabelElement>(
        `label[for="${CSS.escape(targetId)}"]`,
      ) ?? [],
    );
  }

  function cleanupLabels() {
    explicitLabels.forEach((label) => {
      label.removeEventListener('click', handleExplicitLabelClick);
    });
    explicitLabels.clear();
  }

  function syncExplicitLabels() {
    const nextLabels = new Set(getExplicitLabels());

    explicitLabels.forEach((label) => {
      if (!nextLabels.has(label)) {
        label.removeEventListener('click', handleExplicitLabelClick);
      }
    });

    nextLabels.forEach((label) => {
      if (!explicitLabels.has(label)) {
        label.addEventListener('click', handleExplicitLabelClick);
      }
    });

    explicitLabels = nextLabels;
  }

  function syncAriaLabelledBy() {
    if (element == null) {
      return;
    }

    const labels = new Set<HTMLLabelElement>();
    const wrappingLabel = element.closest('label');
    if (wrappingLabel instanceof HTMLLabelElement) {
      labels.add(wrappingLabel);
    }

    (hiddenInput?.labels ?? []).forEach((label) => labels.add(label));
    getExplicitLabels().forEach((label) => labels.add(label));

    const labelIds = Array.from(labels)
      .map((label) => ensureId(label, 'base-ui-checkbox-label'))
      .filter(Boolean);

    if (labelIds.length > 0) {
      element.setAttribute('aria-labelledby', labelIds.join(' '));
    } else {
      element.removeAttribute('aria-labelledby');
    }
  }

  function syncAriaControls() {
    if (element == null) {
      return;
    }

    const group = getGroupState();
    if (!options.parent || !group || group.allValues.length === 0) {
      element.removeAttribute('aria-controls');
      return;
    }

    const checkboxId = ensureId(element, 'base-ui-checkbox-parent');
    const childIds = group.allValues.map((itemValue) => `${checkboxId}-${itemValue}`).join(' ');
    element.setAttribute('aria-controls', childIds);
  }

  function ensureHiddenInputs() {
    if (element == null) {
      return;
    }

    if (hiddenInput == null) {
      hiddenInput = document.createElement('input');
      hiddenInput.type = 'checkbox';
      hiddenInput.tabIndex = -1;
      hiddenInput.setAttribute('aria-hidden', 'true');
      hiddenInput.addEventListener('change', handleInputChange);
      hiddenInput.addEventListener('focus', () => element?.focus());
    }

    if (element.parentNode != null && hiddenInput.parentNode !== element.parentNode) {
      element.parentNode.insertBefore(hiddenInput, element.nextSibling);
    } else if (element.parentNode != null && hiddenInput.previousSibling !== element) {
      element.parentNode.insertBefore(hiddenInput, element.nextSibling);
    }
  }

  function syncHiddenInputs() {
    if (hiddenInput == null) {
      return;
    }

    const state = getState();
    const isChecked = state.checked;
    const effectiveName = options.parent ? undefined : options.name;

    hiddenInput.checked = isChecked;
    hiddenInput.disabled = state.disabled;
    hiddenInput.required = state.required;
    hiddenInput.indeterminate = state.indeterminate;

    if (effectiveName) {
      hiddenInput.name = effectiveName;
      hiddenInput.style.cssText = VISUALLY_HIDDEN_INPUT_STYLE;
    } else {
      hiddenInput.removeAttribute('name');
      hiddenInput.style.cssText = VISUALLY_HIDDEN_STYLE;
    }

    hiddenInput.value = options.value;

    if (options.form) {
      hiddenInput.setAttribute('form', options.form);
    } else {
      hiddenInput.removeAttribute('form');
    }

    if (!options.nativeButton && options.id) {
      hiddenInput.id = options.id;
    } else {
      hiddenInput.removeAttribute('id');
    }

    if (!isChecked && effectiveName && options.uncheckedValue !== undefined) {
      if (uncheckedInput == null) {
        uncheckedInput = document.createElement('input');
        uncheckedInput.type = 'hidden';
      }

      uncheckedInput.name = effectiveName;
      uncheckedInput.value = options.uncheckedValue;

      if (options.form) {
        uncheckedInput.setAttribute('form', options.form);
      } else {
        uncheckedInput.removeAttribute('form');
      }

      if (
        element?.parentNode != null &&
        uncheckedInput.parentNode !== element.parentNode
      ) {
        element.parentNode.insertBefore(uncheckedInput, hiddenInput.nextSibling);
      } else if (
        element?.parentNode != null &&
        uncheckedInput.previousSibling !== hiddenInput
      ) {
        element.parentNode.insertBefore(uncheckedInput, hiddenInput.nextSibling);
      }
    } else if (uncheckedInput != null) {
      uncheckedInput.remove();
      uncheckedInput = null;
    }

    assignRef(options.inputRef, hiddenInput);
  }

  function syncGroupDisabledState() {
    const group = getGroupState();
    if (!group || options.parent || !options.value) {
      return;
    }

    group.disabledStates.set(options.value, options.disabled);
  }

  function cleanupGroupDisabledState() {
    const group = getGroupState();
    if (!group || options.parent || !options.value) {
      return;
    }

    group.disabledStates.delete(options.value);
  }

  function syncIndicators() {
    if (element == null) {
      return;
    }

    const state = getState();
    const indicators = element.querySelectorAll<HTMLElement>('[data-base-ui-checkbox-indicator]');

    indicators.forEach((indicator) => {
      const keepMounted = indicator.hasAttribute('data-keep-mounted');

      if (state.indeterminate) {
        indicator.setAttribute('data-indeterminate', '');
        indicator.removeAttribute('data-checked');
        indicator.removeAttribute('data-unchecked');
      } else if (state.checked) {
        indicator.setAttribute('data-checked', '');
        indicator.removeAttribute('data-indeterminate');
        indicator.removeAttribute('data-unchecked');
      } else {
        indicator.setAttribute('data-unchecked', '');
        indicator.removeAttribute('data-indeterminate');
        indicator.removeAttribute('data-checked');
      }

      indicator.toggleAttribute('data-disabled', state.disabled);
      indicator.toggleAttribute('data-readonly', state.readOnly);
      indicator.toggleAttribute('data-required', state.required);

      if (state.checked || state.indeterminate) {
        indicator.removeAttribute('hidden');
        indicator.style.display = '';
      } else if (!keepMounted) {
        indicator.setAttribute('hidden', '');
        indicator.style.display = 'none';
      }
    });
  }

  function sync() {
    if (element == null) {
      return;
    }

    const state = getState();

    element.setAttribute('role', 'checkbox');
    element.setAttribute(
      'aria-checked',
      getAriaCheckedValue(state.indeterminate, state.checked),
    );

    if (state.disabled) {
      element.setAttribute('aria-disabled', 'true');
      element.tabIndex = -1;
    } else {
      element.removeAttribute('aria-disabled');
      element.tabIndex = 0;
    }

    if (state.readOnly) {
      element.setAttribute('aria-readonly', 'true');
    } else {
      element.removeAttribute('aria-readonly');
    }

    if (state.required) {
      element.setAttribute('aria-required', 'true');
    } else {
      element.removeAttribute('aria-required');
    }

    if (state.indeterminate) {
      element.setAttribute('data-indeterminate', '');
      element.removeAttribute('data-checked');
      element.removeAttribute('data-unchecked');
    } else if (state.checked) {
      element.setAttribute('data-checked', '');
      element.removeAttribute('data-indeterminate');
      element.removeAttribute('data-unchecked');
    } else {
      element.setAttribute('data-unchecked', '');
      element.removeAttribute('data-indeterminate');
      element.removeAttribute('data-checked');
    }

    element.toggleAttribute('data-disabled', state.disabled);
    element.toggleAttribute('data-readonly', state.readOnly);
    element.toggleAttribute('data-required', state.required);

    if (options.nativeButton && options.id && element instanceof HTMLButtonElement) {
      element.id = options.id;
      element.type = 'button';
    }

    ensureHiddenInputs();
    syncGroupDisabledState();
    syncHiddenInputs();
    syncExplicitLabels();
    syncAriaLabelledBy();
    syncAriaControls();
    syncIndicators();
  }

  function toggle(event: Event) {
    const state = getState();
    if (state.disabled || state.readOnly || state.indeterminate) {
      return;
    }

    const nextChecked = !getChecked();
    const eventDetails = createChangeEventDetails(event);
    const group = getGroupState();

    if (group && options.parent) {
      group.toggleParent(eventDetails);
      return;
    }

    if (group) {
      group.toggleChild(options.value, nextChecked, eventDetails);
      return;
    }

    options.onCheckedChange?.(nextChecked, eventDetails);
    if (eventDetails.isCanceled) {
      sync();
      return;
    }

    if (options.checked === undefined) {
      internalChecked = nextChecked;
    }

    sync();
  }

  function handleClick(event: MouseEvent) {
    if (event.target === hiddenInput) {
      return;
    }

    const state = getState();
    if (state.disabled || state.readOnly) {
      event.preventDefault();
      return;
    }

    event.preventDefault();
    toggle(event);
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (getState().disabled || event.target !== element) {
      return;
    }

    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
    }

    if (event.key === 'Enter') {
      toggle(event);
    }
  }

  function handleKeyUp(event: KeyboardEvent) {
    const state = getState();
    if (state.disabled || state.readOnly || event.target !== element) {
      return;
    }

    if (event.key === ' ') {
      toggle(event);
    }
  }

  function handleInputChange(event: Event) {
    if (event.defaultPrevented || hiddenInput == null) {
      return;
    }

    const state = getState();
    if (state.disabled || state.readOnly || state.indeterminate) {
      hiddenInput.checked = getChecked();
      return;
    }

    const nextChecked = hiddenInput.checked;
    const eventDetails = createChangeEventDetails(event);
    const group = getGroupState();

    if (group && options.parent) {
      group.toggleParent(eventDetails);
      hiddenInput.checked = getChecked();
      return;
    }

    if (group) {
      group.toggleChild(options.value, nextChecked, eventDetails);
      hiddenInput.checked = getChecked();
      return;
    }

    options.onCheckedChange?.(nextChecked, eventDetails);
    if (eventDetails.isCanceled) {
      hiddenInput.checked = getChecked();
      return;
    }

    if (options.checked === undefined) {
      internalChecked = nextChecked;
    }

    sync();
  }

  function handleExplicitLabelClick(event: MouseEvent) {
    if (event.defaultPrevented || hiddenInput == null) {
      return;
    }

    if (event.target === hiddenInput) {
      return;
    }

    event.preventDefault();
    element?.click();
  }

  function handleGroupStateChange() {
    sync();
  }

  return (instance: HTMLElement | null) => {
    cleanupLabels();
    cleanupGroupDisabledState();
    groupRoot?.removeEventListener(CHECKBOX_GROUP_STATE_CHANGE_EVENT, handleGroupStateChange);
    element?.removeEventListener('click', handleClick);
    element?.removeEventListener('keydown', handleKeyDown);
    element?.removeEventListener('keyup', handleKeyUp);
    assignRef(options.inputRef, null);
    hiddenInput?.remove();
    uncheckedInput?.remove();
    hiddenInput = null;
    uncheckedInput = null;
    groupRoot = null;
    element = instance;

    if (element == null) {
      return;
    }

    groupRoot = element.closest(`[${CHECKBOX_GROUP_ATTRIBUTE}]`);
    groupRoot?.addEventListener(CHECKBOX_GROUP_STATE_CHANGE_EVENT, handleGroupStateChange);
    element.addEventListener('click', handleClick);
    element.addEventListener('keydown', handleKeyDown);
    element.addEventListener('keyup', handleKeyUp);
    sync();
  };
}

// ─── Namespace exports ──────────────────────────────────────────────────────────

export const Checkbox = {
  Root: CheckboxRootHelper,
  Indicator: CheckboxIndicatorHelper,
} as const;

export namespace CheckboxRoot {
  export type Props = CheckboxRootProps;
  export type State = CheckboxRootState;
  export type ChangeEventDetails = CheckboxRootChangeEventDetails;
}

export namespace CheckboxIndicator {
  export type Props = CheckboxIndicatorHelperProps;
  export type State = CheckboxIndicatorState;
}

// ─── Global type declarations ───────────────────────────────────────────────────

declare global {
  interface HTMLElementTagNameMap {
    'checkbox-root': CheckboxRootElement;
    'checkbox-indicator': CheckboxIndicatorElement;
  }
}
