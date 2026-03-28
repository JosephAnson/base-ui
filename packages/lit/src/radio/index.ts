import { ReactiveElement } from 'lit';
import { useRender } from '../use-render';
import { BaseHTMLElement, ensureId } from '../utils';
import {
  RADIO_GROUP_ATTRIBUTE,
  RADIO_GROUP_STATE_CHANGE_EVENT,
  getRadioGroupRuntimeState,
  type RadioGroupRuntimeState,
} from '../radio-group/shared';

// ─── Constants ──────────────────────────────────────────────────────────────────

const STATE_CHANGE_EVENT = 'base-ui-radio-state-change';
const CONTEXT_ERROR =
  'Base UI: RadioRootContext is missing. Radio parts must be placed within <radio-root>.';
const VISUALLY_HIDDEN_INPUT_STYLE =
  'position:absolute;clip-path:inset(50%);overflow:hidden;white-space:nowrap;border:0;padding:0;width:1px;height:1px;margin:-1px';
const VISUALLY_HIDDEN_STYLE =
  'position:fixed;top:0;left:0;clip-path:inset(50%);overflow:hidden;white-space:nowrap;border:0;padding:0;width:1px;height:1px;margin:-1px';

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface RadioRootState {
  /**
   * Whether the radio is currently selected.
   */
  checked: boolean;
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
  /**
   * Whether the user should be unable to select the radio button.
   */
  readOnly: boolean;
  /**
   * Whether the user must choose a value before submitting a form.
   */
  required: boolean;
}

export type RadioTransitionStatus = 'starting' | 'ending' | undefined;

export interface RadioIndicatorState extends RadioRootState {
  /**
   * The transition status of the indicator.
   */
  transitionStatus: RadioTransitionStatus;
}

export interface RadioRootChangeEventDetails {
  event: Event;
  cancel(): void;
  allowPropagation(): void;
  readonly isCanceled: boolean;
  readonly isPropagationAllowed: boolean;
  reason: 'none';
  trigger: Element | undefined;
}

export interface RadioRootProps<Value = unknown> {
  /**
   * The value that identifies this radio within a group.
   */
  value?: Value | undefined;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Whether the user should be unable to select the radio button.
   * @default false
   */
  readOnly?: boolean | undefined;
  /**
   * Whether the user must choose a value before submitting a form.
   * @default false
   */
  required?: boolean | undefined;
}

export interface RadioIndicatorProps {
  /**
   * Whether the indicator should stay mounted when unchecked.
   * @default false
   */
  keepMounted?: boolean | undefined;
}

type RefObject<T> = {
  current: T | null;
};

type RefCallback<T> = (instance: T | null) => void;

type Ref<T> = RefCallback<T> | RefObject<T> | null | undefined;

export interface RadioProps<Value = unknown>
  extends Omit<useRender.ComponentProps<'span', RadioRootState>, 'value'>, RadioRootProps<Value> {
  /**
   * A ref to access the hidden input element.
   */
  inputRef?: Ref<HTMLInputElement> | undefined;
  /**
   * Whether the rendered element should be treated as a native `<button>`.
   * Set to `true` when replacing the default element with a native button via `render`.
   * @default false
   */
  nativeButton?: boolean | undefined;
}

export interface RadioIndicatorHelperProps
  extends RadioIndicatorProps, useRender.ComponentProps<'span', RadioIndicatorState> {}

export type RadioRootChangeEventReason = RadioRootChangeEventDetails['reason'];

// ─── RadioRootElement ───────────────────────────────────────────────────────────

/**
 * Represents the radio button itself.
 * Renders a `<radio-root>` custom element with a hidden `<input>` inside.
 *
 * Documentation: [Base UI Radio](https://base-ui.com/react/components/radio)
 */
export class RadioRootElement extends ReactiveElement {
  static override get observedAttributes() {
    return [...super.observedAttributes, 'id'];
  }

  static properties = {
    disabled: { type: Boolean },
    readOnly: { type: Boolean, attribute: 'read-only' },
    required: { type: Boolean },
  };

  private radioValue: unknown;

  /** The value that identifies this radio within a group. */
  get value(): unknown {
    return this.radioValue;
  }

  set value(val: unknown) {
    const old = this.radioValue;
    this.radioValue = val;
    if (!Object.is(old, val)) {
      this.syncGroupRegistration();
      this.requestUpdate();
    }
  }

  declare disabled: boolean;
  declare readOnly: boolean;
  declare required: boolean;

  private hiddenInput: HTMLInputElement | null = null;
  private groupRoot: Element | null = null;

  constructor() {
    super();
    this.disabled = false;
    this.readOnly = false;
    this.required = false;
  }

  override createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();

    this.ensureHiddenInput();
    this.syncGroupRoot(this.closest(`[${RADIO_GROUP_ATTRIBUTE}]`));
    this.syncGroupRegistration();

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

    this.cleanupGroupRegistration();
    this.syncGroupRoot(null);

    this.hiddenInput?.remove();
    this.hiddenInput = null;
  }

  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ) {
    super.attributeChangedCallback(name, oldValue, newValue);

    if (name === 'id' && oldValue !== newValue) {
      queueMicrotask(() => {
        this.syncAriaLabelledBy();
      });
    }
  }

  protected override updated() {
    this.syncGroupRegistration();
    this.syncAttributes();
  }

  getChecked(): boolean {
    const group = this.getGroupState();
    if (group) {
      return Object.is(group.checkedValue, this.radioValue);
    }
    // Standalone radio: checked when value is empty string (matches React behavior)
    return this.radioValue === '';
  }

  getState(): RadioRootState {
    const group = this.getGroupState();
    return {
      checked: this.getChecked(),
      disabled: Boolean(group?.disabled) || this.disabled,
      readOnly: Boolean(group?.readOnly) || this.readOnly,
      required: Boolean(group?.required) || this.required,
    };
  }

  private ensureHiddenInput() {
    if (!this.hiddenInput) {
      this.hiddenInput = document.createElement('input');
      this.hiddenInput.type = 'radio';
      this.hiddenInput.tabIndex = -1;
      this.hiddenInput.setAttribute('aria-hidden', 'true');
      this.hiddenInput.addEventListener('change', this.handleInputChange);
      this.hiddenInput.addEventListener('focus', () => this.focus());
      this.appendChild(this.hiddenInput);
    }
  }

  private syncHiddenInput() {
    if (!this.hiddenInput) {
      return;
    }

    const group = this.getGroupState();
    const state = this.getState();
    const isChecked = state.checked;

    this.hiddenInput.checked = isChecked;
    this.hiddenInput.disabled = state.disabled;
    this.hiddenInput.required = state.required;

    if (group?.name) {
      this.hiddenInput.name = group.name;
      this.hiddenInput.style.cssText = VISUALLY_HIDDEN_INPUT_STYLE;
    } else {
      this.hiddenInput.removeAttribute('name');
      this.hiddenInput.style.cssText = VISUALLY_HIDDEN_STYLE;
    }

    if (this.radioValue !== undefined) {
      this.hiddenInput.value = serializeValue(this.radioValue);
    }
  }

  private syncAriaLabelledBy() {
    const control = this.hiddenInput;
    if (!control || !('labels' in control)) {
      this.removeAttribute('aria-labelledby');
      return;
    }

    const labels = [...Array.from(control.labels ?? []), ...this.getExplicitLabels()];
    if (labels.length === 0) {
      this.removeAttribute('aria-labelledby');
      return;
    }

    const labelIds = labels.map((label) => ensureId(label, 'base-ui-radio-label')).filter(Boolean);

    if (labelIds.length > 0) {
      this.setAttribute('aria-labelledby', labelIds.join(' '));
    } else {
      this.removeAttribute('aria-labelledby');
    }
  }

  private getExplicitLabels() {
    if (!this.id) {
      return [];
    }

    return Array.from(
      this.ownerDocument?.querySelectorAll<HTMLLabelElement>(
        `label[for="${CSS.escape(this.id)}"]`,
      ) ?? [],
    );
  }

  private syncAttributes() {
    const state = this.getState();
    const group = this.getGroupState();

    // ARIA
    this.setAttribute('role', 'radio');
    this.setAttribute('aria-checked', state.checked ? 'true' : 'false');

    if (state.disabled) {
      this.setAttribute('aria-disabled', 'true');
      this.tabIndex = -1;
    } else {
      this.removeAttribute('aria-disabled');
      // Use group's tabIndex management if available (roving tabindex)
      if (group) {
        this.tabIndex = group.getTabIndex(this.radioValue, state.disabled);
      } else {
        this.tabIndex = 0;
      }
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

    // Data attributes
    this.toggleAttribute('data-checked', state.checked);
    this.toggleAttribute('data-unchecked', !state.checked);
    this.toggleAttribute('data-disabled', state.disabled);
    this.toggleAttribute('data-readonly', state.readOnly);
    this.toggleAttribute('data-required', state.required);

    this.syncHiddenInput();

    queueMicrotask(() => {
      this.syncAriaLabelledBy();
      this.dispatchEvent(new CustomEvent(STATE_CHANGE_EVENT, { bubbles: false }));
    });
  }

  private selectRadio(event: Event) {
    const state = this.getState();
    if (state.disabled || state.readOnly) {
      return;
    }
    if (this.getChecked()) {
      return;
    } // Already checked, radio can't be unchecked

    const group = this.getGroupState();
    if (group) {
      const eventDetails = createChangeEventDetails(event);
      group.setCheckedValue(this.radioValue, eventDetails);
      this.requestUpdate();
      return;
    }
  }

  private handleClick = (event: MouseEvent) => {
    if (event.target === this.hiddenInput) {
      return;
    }
    const state = this.getState();
    if (state.disabled || state.readOnly) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    this.selectRadio(event);
  };

  private handleKeyDown = (event: KeyboardEvent) => {
    const state = this.getState();
    if (state.disabled) {
      return;
    }
    if (event.target !== this) {
      return;
    }

    // Arrow key navigation handled by group
    const group = this.getGroupState();
    if (group) {
      const moveResult = group.moveFocus(this, event.key, event);
      if (moveResult.handled) {
        event.preventDefault();
        if (!moveResult.selectionCommitted) {
          this.forceGroupSync();
        }
        return;
      }
    }

    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
    }

    if (event.key === 'Enter') {
      this.selectRadio(event);
    }
  };

  private handleKeyUp = (event: KeyboardEvent) => {
    const state = this.getState();
    if (state.disabled || state.readOnly) {
      return;
    }
    if (event.target !== this) {
      return;
    }

    if (event.key === ' ') {
      this.selectRadio(event);
    }
  };

  private handleInputChange = (event: Event) => {
    if (event.defaultPrevented) {
      return;
    }

    const input = event.currentTarget as HTMLInputElement;
    const state = this.getState();

    if (state.disabled || state.readOnly) {
      input.checked = this.getChecked();
      return;
    }

    const group = this.getGroupState();
    if (group) {
      const eventDetails = createChangeEventDetails(event);
      const committed = group.setCheckedValue(this.radioValue, eventDetails);
      if (!committed) {
        input.checked = this.getChecked();
        this.forceGroupSync();
      }
      this.requestUpdate();
      return;
    }

    // Without a group, radio input change has no effect
    input.checked = this.getChecked();
  };

  private getGroupState(): RadioGroupRuntimeState | null {
    return getRadioGroupRuntimeState(this.groupRoot);
  }

  private syncGroupRoot(root: Element | null) {
    if (this.groupRoot === root) {
      return;
    }

    this.groupRoot?.removeEventListener(
      RADIO_GROUP_STATE_CHANGE_EVENT,
      this.handleGroupStateChange,
    );
    this.groupRoot = root;
    this.groupRoot?.addEventListener(RADIO_GROUP_STATE_CHANGE_EVENT, this.handleGroupStateChange);
  }

  private syncGroupRegistration() {
    const group = this.getGroupState();
    if (!group) {
      return;
    }

    const disabled = Boolean(group.disabled) || this.disabled;

    group.registerControl(this, this.radioValue, disabled);

    if (this.hiddenInput) {
      group.registerInput(this.hiddenInput, this.radioValue, disabled);
    }
  }

  private cleanupGroupRegistration() {
    const group = this.getGroupState();
    if (!group) {
      return;
    }

    group.unregisterControl(this);
    if (this.hiddenInput) {
      group.unregisterInput(this.hiddenInput);
    }
  }

  private handleGroupStateChange = () => {
    this.syncAttributes();
  };

  private forceGroupSync() {
    this.groupRoot?.dispatchEvent(new CustomEvent(RADIO_GROUP_STATE_CHANGE_EVENT));
  }
}

if (!customElements.get('radio-root')) {
  customElements.define('radio-root', RadioRootElement);
}

// ─── RadioIndicatorElement ──────────────────────────────────────────────────────

/**
 * Indicates whether the radio button is selected.
 * Renders a `<radio-indicator>` custom element.
 */
export class RadioIndicatorElement extends BaseHTMLElement {
  static get observedAttributes() {
    return ['keep-mounted'];
  }

  private rootElement: RadioRootElement | null = null;
  private stateChangeHandler = () => this.syncVisibility();

  connectedCallback() {
    this.rootElement = this.closest('radio-root') as RadioRootElement | null;
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
    if (!this.rootElement) {
      return;
    }
    const state = this.rootElement.getState();
    const shouldShow = state.checked;

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

if (!customElements.get('radio-indicator')) {
  customElements.define('radio-indicator', RadioIndicatorElement);
}

/**
 * Represents the radio button itself.
 * Renders a `<span>` element and a hidden `<input>` beside by default.
 *
 * Documentation: [Base UI Radio](https://base-ui.com/react/components/radio)
 */
function RadioRootHelper<Value = unknown>(props: RadioProps<Value>) {
  const {
    disabled = false,
    inputRef,
    nativeButton = false,
    readOnly = false,
    render,
    required = false,
    value,
    ...elementProps
  } = props;

  const state: RadioRootState = {
    checked: false,
    disabled,
    readOnly,
    required,
  };

  return useRender({
    defaultTagName: nativeButton ? 'button' : 'span',
    render,
    state,
    ref: createRadioBehaviorRef({
      disabled,
      id: typeof elementProps.id === 'string' ? elementProps.id : undefined,
      inputRef,
      nativeButton,
      readOnly,
      required,
      value,
    }),
    props: {
      'data-base-ui-radio-control': '',
      role: 'radio',
      ...elementProps,
    },
  });
}

/**
 * Indicates whether the radio button is selected.
 * Renders a `<span>` element by default.
 */
function RadioIndicatorHelper(props: RadioIndicatorHelperProps) {
  const { keepMounted = false, render, ...elementProps } = props;

  return useRender({
    defaultTagName: 'span',
    render,
    state: {
      checked: false,
      disabled: false,
      readOnly: false,
      required: false,
      transitionStatus: undefined,
    } satisfies RadioIndicatorState,
    props: {
      'data-base-ui-radio-indicator': '',
      'data-keep-mounted': keepMounted ? '' : undefined,
      ...elementProps,
    },
  });
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function serializeValue(value: unknown): string {
  if (value == null) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function createChangeEventDetails(event: Event): RadioRootChangeEventDetails {
  let isCanceled = false;
  let isPropagationAllowed = false;

  return {
    cancel() {
      isCanceled = true;
    },
    allowPropagation() {
      isPropagationAllowed = true;
    },
    event,
    get isCanceled() {
      return isCanceled;
    },
    get isPropagationAllowed() {
      return isPropagationAllowed;
    },
    reason: 'none',
    trigger: event.target instanceof Element ? event.target : undefined,
  };
}

function createRadioBehaviorRef<Value>(options: {
  disabled: boolean;
  id: string | undefined;
  inputRef: Ref<HTMLInputElement> | undefined;
  nativeButton: boolean;
  readOnly: boolean;
  required: boolean;
  value: Value | undefined;
}) {
  let element: HTMLElement | null = null;
  let hiddenInput: HTMLInputElement | null = null;
  let groupRoot: Element | null = null;
  let explicitLabels = new Set<HTMLLabelElement>();

  const assignRef = <T>(ref: Ref<T>, instance: T | null) => {
    if (ref == null) {
      return;
    }

    if (typeof ref === 'function') {
      ref(instance);
      return;
    }

    ref.current = instance;
  };

  const getGroupState = () =>
    getRadioGroupRuntimeState(groupRoot) as RadioGroupRuntimeState<Value> | null;

  const getState = (): RadioRootState => {
    const group = getGroupState();

    return {
      checked: group ? Object.is(group.checkedValue, options.value) : options.value === '',
      disabled: Boolean(group?.disabled) || options.disabled,
      readOnly: Boolean(group?.readOnly) || options.readOnly,
      required: Boolean(group?.required) || options.required,
    };
  };

  const cleanupLabels = () => {
    explicitLabels.forEach((label) => {
      label.removeEventListener('click', handleExplicitLabelClick);
    });
    explicitLabels.clear();
  };

  const getLabelTargetId = () => {
    if (options.id == null || options.id === '') {
      return undefined;
    }

    return options.nativeButton ? element?.id : hiddenInput?.id;
  };

  const getExplicitLabels = () => {
    const targetId = getLabelTargetId();
    if (targetId == null) {
      return [];
    }

    return Array.from(
      element?.ownerDocument?.querySelectorAll<HTMLLabelElement>(
        `label[for="${CSS.escape(targetId)}"]`,
      ) ?? [],
    );
  };

  const syncAriaLabelledBy = () => {
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
      .map((label) => ensureId(label, 'base-ui-radio-label'))
      .filter(Boolean);

    if (labelIds.length > 0) {
      element.setAttribute('aria-labelledby', labelIds.join(' '));
    } else {
      element.removeAttribute('aria-labelledby');
    }
  };

  const syncExplicitLabels = () => {
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
  };

  const ensureHiddenInput = () => {
    if (element == null) {
      return;
    }

    if (hiddenInput == null) {
      hiddenInput = document.createElement('input');
      hiddenInput.type = 'radio';
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
  };

  const syncIndicators = () => {
    if (element == null) {
      return;
    }

    const state = getState();
    const indicators = element.querySelectorAll<HTMLElement>('[data-base-ui-radio-indicator]');

    indicators.forEach((indicator) => {
      const keepMounted = indicator.hasAttribute('data-keep-mounted');

      indicator.toggleAttribute('data-checked', state.checked);
      indicator.toggleAttribute('data-unchecked', !state.checked);
      indicator.toggleAttribute('data-disabled', state.disabled);
      indicator.toggleAttribute('data-readonly', state.readOnly);
      indicator.toggleAttribute('data-required', state.required);

      if (state.checked) {
        indicator.removeAttribute('hidden');
        indicator.style.display = '';
      } else if (!keepMounted) {
        indicator.setAttribute('hidden', '');
        indicator.style.display = 'none';
      }
    });
  };

  const syncHiddenInput = () => {
    if (hiddenInput == null) {
      return;
    }

    const group = getGroupState();
    const state = getState();

    hiddenInput.checked = state.checked;
    hiddenInput.disabled = state.disabled;
    hiddenInput.required = state.required;

    if (group?.name) {
      hiddenInput.name = group.name;
      hiddenInput.style.cssText = VISUALLY_HIDDEN_INPUT_STYLE;
    } else {
      hiddenInput.removeAttribute('name');
      hiddenInput.style.cssText = VISUALLY_HIDDEN_STYLE;
    }

    if (options.value !== undefined) {
      hiddenInput.value = serializeValue(options.value);
    } else {
      hiddenInput.removeAttribute('value');
    }

    if (!options.nativeButton && options.id) {
      hiddenInput.id = options.id;
    } else {
      hiddenInput.removeAttribute('id');
    }

    assignRef(options.inputRef, hiddenInput);
  };

  const syncGroupRegistration = () => {
    const group = getGroupState();
    if (!group || element == null) {
      return;
    }

    const state = getState();
    group.registerControl(element, options.value, state.disabled);

    if (hiddenInput != null) {
      group.registerInput(hiddenInput, options.value, state.disabled);
    }
  };

  const cleanupGroupRegistration = () => {
    const group = getGroupState();
    if (!group || element == null) {
      return;
    }

    group.unregisterControl(element);
    if (hiddenInput != null) {
      group.unregisterInput(hiddenInput);
    }
  };

  const sync = () => {
    if (element == null) {
      return;
    }

    const group = getGroupState();
    const state = getState();

    element.setAttribute('role', 'radio');
    element.setAttribute('aria-checked', state.checked ? 'true' : 'false');
    element.toggleAttribute('data-checked', state.checked);
    element.toggleAttribute('data-unchecked', !state.checked);
    element.toggleAttribute('data-disabled', state.disabled);
    element.toggleAttribute('data-readonly', state.readOnly);
    element.toggleAttribute('data-required', state.required);

    if (state.disabled) {
      element.setAttribute('aria-disabled', 'true');
      element.tabIndex = -1;
    } else {
      element.removeAttribute('aria-disabled');
      element.tabIndex = group ? group.getTabIndex(options.value, state.disabled) : 0;
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

    if (options.nativeButton && options.id && element instanceof HTMLButtonElement) {
      element.id = options.id;
      element.type = 'button';
    }

    ensureHiddenInput();
    syncGroupRegistration();
    syncHiddenInput();
    syncExplicitLabels();
    syncAriaLabelledBy();
    syncIndicators();
  };

  const select = (event: Event) => {
    const state = getState();
    if (state.disabled || state.readOnly || state.checked) {
      return;
    }

    const group = getGroupState();
    if (group == null || options.value === undefined) {
      return;
    }

    group.setCheckedValue(options.value, createChangeEventDetails(event));
  };

  const handleClick = (event: MouseEvent) => {
    if (event.target === hiddenInput) {
      return;
    }

    const state = getState();
    if (state.disabled || state.readOnly) {
      event.preventDefault();
      return;
    }

    event.preventDefault();
    select(event);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    const state = getState();
    if (state.disabled || event.target !== element) {
      return;
    }

    const group = getGroupState();
    if (group != null) {
      const moveResult = group.moveFocus(element as HTMLElement, event.key, event);
      if (moveResult.handled) {
        event.preventDefault();
        return;
      }
    }

    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
    }

    if (event.key === 'Enter') {
      select(event);
    }
  };

  const handleKeyUp = (event: KeyboardEvent) => {
    const state = getState();
    if (state.disabled || state.readOnly || event.target !== element) {
      return;
    }

    if (event.key === ' ') {
      select(event);
    }
  };

  function handleInputChange(event: Event) {
    if (event.defaultPrevented || hiddenInput == null) {
      return;
    }

    const state = getState();
    if (state.disabled || state.readOnly) {
      hiddenInput.checked = state.checked;
      return;
    }

    const group = getGroupState();
    if (group == null || options.value === undefined) {
      hiddenInput.checked = state.checked;
      return;
    }

    const committed = group.setCheckedValue(options.value, createChangeEventDetails(event));
    if (!committed) {
      hiddenInput.checked = state.checked;
    }
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

  const handleGroupStateChange = () => {
    sync();
  };

  return (instance: HTMLElement | null) => {
    cleanupLabels();
    cleanupGroupRegistration();
    groupRoot?.removeEventListener(RADIO_GROUP_STATE_CHANGE_EVENT, handleGroupStateChange);
    element?.removeEventListener('click', handleClick);
    element?.removeEventListener('keydown', handleKeyDown);
    element?.removeEventListener('keyup', handleKeyUp);
    assignRef(options.inputRef, null);
    hiddenInput?.remove();
    hiddenInput = null;
    groupRoot = null;
    element = instance;

    if (element == null) {
      return;
    }

    groupRoot = element.closest(`[${RADIO_GROUP_ATTRIBUTE}]`);
    groupRoot?.addEventListener(RADIO_GROUP_STATE_CHANGE_EVENT, handleGroupStateChange);
    element.addEventListener('click', handleClick);
    element.addEventListener('keydown', handleKeyDown);
    element.addEventListener('keyup', handleKeyUp);
    sync();
  };
}

// ─── Namespace exports ──────────────────────────────────────────────────────────

export const Radio = {
  Root: RadioRootHelper,
  Indicator: RadioIndicatorHelper,
} as const;

export namespace RadioRoot {
  export type Props<Value = unknown> = RadioRootProps<Value>;
  export type State = RadioRootState;
  export type ChangeEventReason = RadioRootChangeEventReason;
  export type ChangeEventDetails = RadioRootChangeEventDetails;
}

export namespace RadioIndicator {
  export type Props = RadioIndicatorHelperProps;
  export type State = RadioIndicatorState;
}

// ─── Global type declarations ───────────────────────────────────────────────────

declare global {
  interface HTMLElementTagNameMap {
    'radio-root': RadioRootElement;
    'radio-indicator': RadioIndicatorElement;
  }
}
