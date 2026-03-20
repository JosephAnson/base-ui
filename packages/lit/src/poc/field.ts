/**
 * POC: Field custom elements
 *
 * Architecture:
 * - field-root: Option C (host IS the element, acts as container)
 * - field-label: Option C (host IS the element)
 * - field-control: Option A hybrid (display: contents, wraps native input)
 * - field-description: Option C (host IS the element)
 * - field-error: Option C (host IS the element)
 *
 * Context pattern: Children find parent via `closest('field-root')`
 * and call methods on the FieldRootElement instance directly.
 * State change notifications via CustomEvent on the field-root element.
 *
 * Usage:
 *   html`
 *     <field-root>
 *       <field-label>Name</field-label>
 *       <field-control required placeholder="Enter name"></field-control>
 *       <field-description>Your full legal name</field-description>
 *       <field-error>This field is required</field-error>
 *     </field-root>
 *   `
 */

// ─── Constants ──────────────────────────────────────────────────────────────────

const FIELD_STATE_CHANGE_EVENT = 'base-ui-field-state-change';

let generatedId = 0;
function createId(prefix: string) {
  generatedId += 1;
  return `${prefix}-${generatedId}`;
}

function ensureId(element: HTMLElement, prefix: string) {
  if (!element.id) {
    element.id = createId(prefix);
  }
  return element.id;
}

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface FieldState {
  disabled: boolean;
  touched: boolean;
  dirty: boolean;
  valid: boolean | null;
  filled: boolean;
  focused: boolean;
}

const DEFAULT_STATE: FieldState = {
  disabled: false,
  touched: false,
  dirty: false,
  valid: null,
  filled: false,
  focused: false,
};

type InputLikeElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

function isInputLike(el: Element | null): el is InputLikeElement {
  return (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement
  );
}

function getElementValue(el: InputLikeElement | null): unknown {
  if (el == null) return null;
  if (el instanceof HTMLSelectElement && el.multiple) {
    return Array.from(el.selectedOptions).map((o) => o.value);
  }
  if (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio')) {
    return el.checked ? el.value || 'on' : '';
  }
  return el.value;
}

// ─── FieldRootElement ───────────────────────────────────────────────────────────

/**
 * Groups all parts of the field.
 * Uses Option C: the custom element host IS the container element.
 *
 * Children find this element via `closest('field-root')` and call methods directly.
 */
export class FieldRootElement extends HTMLElement {
  // Observed attributes
  static observedAttributes = ['disabled', 'name'];

  // Validate callback - set via property binding: .validate=${fn}
  validate:
    | ((value: unknown) => string | string[] | null | Promise<string | string[] | null>)
    | undefined;

  // Public properties
  private _disabled = false;
  get disabled() {
    return this._disabled;
  }
  set disabled(value: boolean) {
    this._disabled = value;
    this.syncDataAttributes();
    this.scheduleDomSync();
  }

  name: string | undefined;

  // Internal state
  private _touched = false;
  private _dirty = false;
  private _filled = false;
  private _focused = false;
  private _valid: boolean | null = null;
  private _initialValue: unknown = null;

  // Registered children
  private _labelElement: HTMLElement | null = null;
  private _controlInput: InputLikeElement | null = null;
  private _descriptionIds = new Set<string>();
  private _errorIds = new Map<string, boolean>();
  private _domSyncQueued = false;

  connectedCallback() {
    this.syncDataAttributes();
    this.addEventListener('focusin', this._handleFocusIn);
    this.addEventListener('focusout', this._handleFocusOut);
    this.addEventListener('input', this._handleInput);
    this.addEventListener('change', this._handleChange);
  }

  disconnectedCallback() {
    this.removeEventListener('focusin', this._handleFocusIn);
    this.removeEventListener('focusout', this._handleFocusOut);
    this.removeEventListener('input', this._handleInput);
    this.removeEventListener('change', this._handleChange);
  }

  attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null) {
    if (name === 'disabled') {
      this._disabled = newValue !== null;
      this.syncDataAttributes();
      this.scheduleDomSync();
    } else if (name === 'name') {
      this.name = newValue ?? undefined;
    }
  }

  // ─── Public API for children ────────────────────────────────────────────────

  getFieldState(): FieldState {
    return {
      disabled: this._disabled,
      touched: this._touched,
      dirty: this._dirty,
      valid: this._valid,
      filled: this._filled,
      focused: this._focused,
    };
  }

  registerLabel(element: HTMLElement) {
    this._labelElement = element;
    this.scheduleDomSync();
  }

  unregisterLabel(element: HTMLElement) {
    if (this._labelElement === element) {
      this._labelElement = null;
      this.scheduleDomSync();
    }
  }

  registerControl(input: InputLikeElement) {
    this._controlInput = input;
    this._initialValue = getElementValue(input);
    this.scheduleDomSync();
  }

  unregisterControl(input: InputLikeElement) {
    if (this._controlInput === input) {
      this._controlInput = null;
      this.scheduleDomSync();
    }
  }

  registerDescription(id: string) {
    this._descriptionIds.add(id);
    this.scheduleDomSync();
  }

  unregisterDescription(id: string) {
    this._descriptionIds.delete(id);
    this.scheduleDomSync();
  }

  registerError(id: string, rendered: boolean) {
    this._errorIds.set(id, rendered);
    this.scheduleDomSync();
  }

  unregisterError(id: string) {
    this._errorIds.delete(id);
    this.scheduleDomSync();
  }

  setErrorRendered(id: string, rendered: boolean) {
    if (this._errorIds.get(id) !== rendered) {
      this._errorIds.set(id, rendered);
      this.scheduleDomSync();
    }
  }

  getControlInput(): InputLikeElement | null {
    return this._controlInput ?? this.findNativeControl();
  }

  getValidationError(): string {
    const input = this.getControlInput();
    if (!input) return '';
    return input.validationMessage || '';
  }

  isInvalid(): boolean {
    return this._valid === false;
  }

  // ─── Event handlers ─────────────────────────────────────────────────────────

  private _handleFocusIn = (event: FocusEvent) => {
    const control = this.getControlInput();
    if (control && (event.target === control || this.contains(event.target as Node))) {
      if (!this._focused) {
        this._focused = true;
        this.syncDataAttributes();
        this.publishStateChange();
      }
    }
  };

  private _handleFocusOut = (event: FocusEvent) => {
    if (this.contains(event.relatedTarget as Node | null)) {
      return;
    }
    if (this._focused) {
      this._focused = false;
      this._touched = true;
      this.syncDataAttributes();
      this.publishStateChange();
      this.commitValidation();
    }
  };

  private _handleInput = (event: Event) => {
    const target = event.target;
    if (isInputLike(target)) {
      this.updateValueState(target);
    }
  };

  private _handleChange = (event: Event) => {
    const target = event.target;
    if (isInputLike(target)) {
      this.updateValueState(target);
    }
  };

  // ─── Internal ───────────────────────────────────────────────────────────────

  private findNativeControl(): InputLikeElement | null {
    return this.querySelector(
      'input:not([type="hidden"]):not([type="submit"]), textarea, select',
    ) as InputLikeElement | null;
  }

  private updateValueState(input: InputLikeElement) {
    const currentValue = getElementValue(input);
    this._dirty = currentValue !== this._initialValue;
    this._filled = input.value !== '';

    if (input.validity) {
      this._valid = input.validity.valid;
    }

    this.syncDataAttributes();
    this.publishStateChange();
  }

  private async commitValidation() {
    const input = this.getControlInput();
    if (!input) return;

    const value = getElementValue(input);

    if (input.validity && !input.validity.valid) {
      this._valid = false;
      this.syncDataAttributes();
      this.syncAssociations();
      this.publishStateChange();
      return;
    }

    if (this.validate) {
      const result = await Promise.resolve(this.validate(value));
      if (result !== null) {
        this._valid = false;
        if (typeof result === 'string') {
          input.setCustomValidity(result);
        } else if (Array.isArray(result)) {
          input.setCustomValidity(result.join('\n'));
        }
      } else {
        this._valid = true;
        input.setCustomValidity('');
      }
    } else {
      this._valid = input.validity?.valid ?? null;
    }

    this.syncDataAttributes();
    this.syncAssociations();
    this.publishStateChange();
  }

  private syncDataAttributes() {
    const state = this.getFieldState();
    this.toggleAttribute('data-disabled', state.disabled);
    this.toggleAttribute('data-touched', state.touched);
    this.toggleAttribute('data-dirty', state.dirty);
    this.toggleAttribute('data-filled', state.filled);
    this.toggleAttribute('data-focused', state.focused);

    if (state.valid === true) {
      this.setAttribute('data-valid', '');
      this.removeAttribute('data-invalid');
    } else if (state.valid === false) {
      this.setAttribute('data-invalid', '');
      this.removeAttribute('data-valid');
    } else {
      this.removeAttribute('data-valid');
      this.removeAttribute('data-invalid');
    }
  }

  private scheduleDomSync() {
    if (this._domSyncQueued) return;
    this._domSyncQueued = true;
    queueMicrotask(() => {
      this._domSyncQueued = false;
      this.syncAssociations();
      this.publishStateChange();
    });
  }

  private syncAssociations() {
    const control = this.getControlInput();
    if (!control) return;

    // Associate label with control
    if (this._labelElement) {
      const labelId = ensureId(this._labelElement, 'base-ui-field-label');

      if (this._labelElement instanceof HTMLLabelElement) {
        const controlId = ensureId(control, 'base-ui-field-control');
        this._labelElement.htmlFor = controlId;
      } else {
        control.setAttribute('aria-labelledby', labelId);
      }
    }

    // Associate descriptions with control
    const messageIds = [
      ...this._descriptionIds,
      ...Array.from(this._errorIds.entries())
        .filter(([, rendered]) => rendered)
        .map(([id]) => id),
    ];

    if (messageIds.length > 0) {
      control.setAttribute('aria-describedby', messageIds.join(' '));
    } else {
      control.removeAttribute('aria-describedby');
    }

    // Set aria-invalid
    if (this._valid === false) {
      control.setAttribute('aria-invalid', 'true');
    } else {
      control.removeAttribute('aria-invalid');
    }
  }

  private publishStateChange() {
    this.dispatchEvent(
      new CustomEvent(FIELD_STATE_CHANGE_EVENT, { bubbles: false }),
    );
  }
}

customElements.define('field-root', FieldRootElement);

// ─── FieldLabelElement ────────────────────────────────────────────────────────

/**
 * An accessible label automatically associated with the field control.
 * Uses Option C: the custom element host IS the label element.
 *
 * Supports `as-child` attribute: when present, the custom element becomes
 * invisible (display: contents) and forwards all behavior to its first
 * child element (click-to-focus, ARIA, data-* state attributes).
 *
 * Usage:
 *   <field-label>Name</field-label>
 *
 *   <!-- as-child: host is invisible, <label> gets the behavior -->
 *   <field-label as-child>
 *     <label class="custom-label">Name</label>
 *   </field-label>
 */
export class FieldLabelElement extends HTMLElement {
  static observedAttributes = ['as-child'];

  private _fieldRoot: FieldRootElement | null = null;
  private _asChild = false;

  get asChild() {
    return this._asChild;
  }

  connectedCallback() {
    this._asChild = this.hasAttribute('as-child');
    this._fieldRoot = this.closest('field-root') as FieldRootElement | null;
    this._fieldRoot?.registerLabel(this.getTarget());
    this._fieldRoot?.addEventListener(FIELD_STATE_CHANGE_EVENT, this._handleStateChange);

    // Non-native-label click-to-focus behavior
    this.getTarget().addEventListener('click', this._handleClick);

    if (this._asChild) {
      this.style.display = 'contents';
    }

    this.syncAttributes();
  }

  disconnectedCallback() {
    this._fieldRoot?.unregisterLabel(this.getTarget());
    this._fieldRoot?.removeEventListener(FIELD_STATE_CHANGE_EVENT, this._handleStateChange);
    this.getTarget().removeEventListener('click', this._handleClick);
    this._fieldRoot = null;
  }

  attributeChangedCallback(name: string) {
    if (name === 'as-child') {
      const wasAsChild = this._asChild;
      this._asChild = this.hasAttribute('as-child');

      if (wasAsChild !== this._asChild && this._fieldRoot) {
        // Re-register with the correct target
        this._fieldRoot.unregisterLabel(wasAsChild ? (this.firstElementChild as HTMLElement ?? this) : this);
        this._fieldRoot.registerLabel(this.getTarget());

        if (this._asChild) {
          this.style.display = 'contents';
          // Clean state attrs from host
          this.removeAttribute('data-disabled');
          this.removeAttribute('data-focused');
          this.removeAttribute('data-valid');
          this.removeAttribute('data-invalid');
        } else {
          this.style.display = '';
        }

        this.syncAttributes();
      }
    }
  }

  /** The element that receives data-* state attributes and click handler. */
  private getTarget(): HTMLElement {
    if (this._asChild) {
      const child = this.firstElementChild;
      if (child instanceof HTMLElement) return child;
    }
    return this;
  }

  private _handleClick = () => {
    const control = this._fieldRoot?.getControlInput();
    control?.focus();
  };

  private _handleStateChange = () => {
    this.syncAttributes();
  };

  private syncAttributes() {
    const target = this.getTarget();
    const state = this._fieldRoot?.getFieldState() ?? DEFAULT_STATE;

    target.toggleAttribute('data-disabled', state.disabled);
    target.toggleAttribute('data-focused', state.focused);

    if (state.valid === true) {
      target.setAttribute('data-valid', '');
      target.removeAttribute('data-invalid');
    } else if (state.valid === false) {
      target.setAttribute('data-invalid', '');
      target.removeAttribute('data-valid');
    } else {
      target.removeAttribute('data-valid');
      target.removeAttribute('data-invalid');
    }

    // When as-child with a native <label>, use htmlFor for association
    if (this._asChild && target instanceof HTMLLabelElement && this._fieldRoot) {
      const control = this._fieldRoot.getControlInput();
      if (control) {
        target.htmlFor = ensureId(control, 'base-ui-field-control');
      }
    }
  }
}

customElements.define('field-label', FieldLabelElement);

// ─── FieldControlElement ────────────────────────────────────────────────────────

/**
 * The form control to label and validate.
 * Uses Option A hybrid: display:contents, finds or creates a native <input> inside.
 *
 * Usage:
 *   <!-- Auto-creates input -->
 *   <field-control required placeholder="Enter name"></field-control>
 *
 *   <!-- User provides their own input -->
 *   <field-control>
 *     <textarea required></textarea>
 *   </field-control>
 */
export class FieldControlElement extends HTMLElement {
  static observedAttributes = ['required', 'placeholder', 'type', 'value', 'disabled', 'name'];

  private _fieldRoot: FieldRootElement | null = null;
  private _input: InputLikeElement | null = null;

  connectedCallback() {
    this.style.display = 'contents';

    this._fieldRoot = this.closest('field-root') as FieldRootElement | null;

    // Find existing input or create one
    this._input = this.querySelector('input, textarea, select') as InputLikeElement | null;

    if (!this._input) {
      const input = document.createElement('input');
      this.appendChild(input);
      this._input = input;
    }

    this.forwardAttributes();
    this._fieldRoot?.registerControl(this._input);
  }

  disconnectedCallback() {
    if (this._input) {
      this._fieldRoot?.unregisterControl(this._input);
    }
    this._fieldRoot = null;
    this._input = null;
  }

  attributeChangedCallback() {
    this.forwardAttributes();
  }

  private forwardAttributes() {
    const input = this._input;
    if (!input) return;

    if (input instanceof HTMLInputElement) {
      input.required = this.hasAttribute('required');
      input.placeholder = this.getAttribute('placeholder') ?? '';
      const type = this.getAttribute('type');
      if (type) input.type = type;
      const value = this.getAttribute('value');
      if (value !== null) input.value = value;
      input.disabled =
        this.hasAttribute('disabled') || (this._fieldRoot?.disabled ?? false);
      const name = this.getAttribute('name');
      if (name) input.name = name;
    } else if (input instanceof HTMLTextAreaElement) {
      input.required = this.hasAttribute('required');
      input.placeholder = this.getAttribute('placeholder') ?? '';
      const value = this.getAttribute('value');
      if (value !== null) input.value = value;
      input.disabled =
        this.hasAttribute('disabled') || (this._fieldRoot?.disabled ?? false);
    }
  }
}

customElements.define('field-control', FieldControlElement);

// ─── FieldDescriptionElement ──────────────────────────────────────────────────

/**
 * A paragraph with additional information about the field.
 * Uses Option C: the custom element host IS the description element.
 */
export class FieldDescriptionElement extends HTMLElement {
  private _fieldRoot: FieldRootElement | null = null;
  private _descriptionId: string = '';

  connectedCallback() {
    this._fieldRoot = this.closest('field-root') as FieldRootElement | null;
    this._descriptionId = ensureId(this, 'base-ui-field-desc');
    this._fieldRoot?.registerDescription(this._descriptionId);
    this._fieldRoot?.addEventListener(FIELD_STATE_CHANGE_EVENT, this._handleStateChange);
    this.syncAttributes();
  }

  disconnectedCallback() {
    this._fieldRoot?.unregisterDescription(this._descriptionId);
    this._fieldRoot?.removeEventListener(FIELD_STATE_CHANGE_EVENT, this._handleStateChange);
    this._fieldRoot = null;
  }

  private _handleStateChange = () => {
    this.syncAttributes();
  };

  private syncAttributes() {
    const state = this._fieldRoot?.getFieldState() ?? DEFAULT_STATE;
    this.toggleAttribute('data-disabled', state.disabled);
  }
}

customElements.define('field-description', FieldDescriptionElement);

// ─── FieldErrorElement ────────────────────────────────────────────────────────

/**
 * An error message displayed if the field control fails validation.
 * Uses Option C: the custom element host IS the error element.
 * Hidden by default, shown when the field is invalid.
 */
export class FieldErrorElement extends HTMLElement {
  static observedAttributes = ['force-show'];

  private _fieldRoot: FieldRootElement | null = null;
  private _errorId: string = '';
  private _forceShow = false;
  private _syncing = false;
  private _lastShown: boolean | null = null;

  get forceShow() {
    return this._forceShow;
  }
  set forceShow(value: boolean) {
    this._forceShow = value;
    this.syncVisibility();
  }

  connectedCallback() {
    this._fieldRoot = this.closest('field-root') as FieldRootElement | null;
    this._errorId = ensureId(this, 'base-ui-field-error');
    this._fieldRoot?.addEventListener(FIELD_STATE_CHANGE_EVENT, this._handleStateChange);
    this.syncVisibility();
  }

  disconnectedCallback() {
    this._fieldRoot?.unregisterError(this._errorId);
    this._fieldRoot?.removeEventListener(FIELD_STATE_CHANGE_EVENT, this._handleStateChange);
    this._fieldRoot = null;
    this._lastShown = null;
  }

  attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null) {
    if (name === 'force-show') {
      this._forceShow = newValue !== null;
      this.syncVisibility();
    }
  }

  private _handleStateChange = () => {
    if (!this._syncing) {
      this.syncVisibility();
    }
  };

  private syncVisibility() {
    const fieldRoot = this._fieldRoot;
    if (!fieldRoot) return;

    const state = fieldRoot.getFieldState();
    const shouldShow = this._forceShow || state.valid === false;

    // Avoid re-entry and unnecessary updates
    if (shouldShow === this._lastShown) return;
    this._lastShown = shouldShow;
    this._syncing = true;

    try {
      if (shouldShow) {
        this.style.display = '';
        this.removeAttribute('hidden');
        fieldRoot.registerError(this._errorId, true);

        // If no explicit children, show validation message
        if (this.childNodes.length === 0) {
          const msg = fieldRoot.getValidationError();
          if (msg) {
            this.textContent = msg;
          }
        }
      } else {
        this.style.display = 'none';
        this.setAttribute('hidden', '');
        fieldRoot.registerError(this._errorId, false);
      }
    } finally {
      this._syncing = false;
    }
  }
}

customElements.define('field-error', FieldErrorElement);

// ─── Global type declarations ─────────────────────────────────────────────────

declare global {
  interface HTMLElementTagNameMap {
    'field-root': FieldRootElement;
    'field-label': FieldLabelElement;
    'field-control': FieldControlElement;
    'field-description': FieldDescriptionElement;
    'field-error': FieldErrorElement;
  }
}
