/**
 * POC: Checkbox custom elements
 *
 * Architecture: Option C (host IS the element) for checkbox-root
 * with a hidden input sibling for form participation.
 *
 * checkbox-root: The interactive toggle element (renders as the host)
 * checkbox-indicator: Visual check indicator inside checkbox-root
 *
 * Usage:
 *   html`
 *     <checkbox-root name="agree" value="yes">
 *       <checkbox-indicator>✓</checkbox-indicator>
 *       I agree
 *     </checkbox-root>
 *   `
 */
import { ReactiveElement } from 'lit';

// ─── Constants ──────────────────────────────────────────────────────────────────

const CHECKBOX_STATE_CHANGE_EVENT = 'base-ui-checkbox-state-change';

const VISUALLY_HIDDEN_STYLE = [
  'position: absolute',
  'clip-path: inset(50%)',
  'overflow: hidden',
  'white-space: nowrap',
  'border: 0',
  'padding: 0',
  'width: 1px',
  'height: 1px',
  'margin: -1px',
].join(';');

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface CheckboxState {
  checked: boolean;
  disabled: boolean;
  readOnly: boolean;
  required: boolean;
  indeterminate: boolean;
  dirty: boolean;
  touched: boolean;
  focused: boolean;
}

// ─── CheckboxRootElement ────────────────────────────────────────────────────────

export class CheckboxRootElement extends ReactiveElement {
  static properties = {
    checked: { type: Boolean, reflect: true },
    defaultChecked: { type: Boolean, attribute: 'default-checked' },
    disabled: { type: Boolean, reflect: true },
    readOnly: { type: Boolean, attribute: 'read-only', reflect: true },
    required: { type: Boolean, reflect: true },
    indeterminate: { type: Boolean, reflect: true },
    name: { type: String },
    value: { type: String },
  };

  declare checked: boolean | undefined;
  declare defaultChecked: boolean;
  declare disabled: boolean;
  declare readOnly: boolean;
  declare required: boolean;
  declare indeterminate: boolean;
  declare name: string | undefined;
  declare value: string;

  // Callback property - set via .onCheckedChange=${fn}
  onCheckedChange: ((checked: boolean, event: Event) => void) | undefined;

  private _internalChecked = false;
  private _initialChecked = false;
  private _initialized = false;
  private _touched = false;
  private _focused = false;
  private _hiddenInput: HTMLInputElement | null = null;

  constructor() {
    super();
    this.defaultChecked = false;
    this.disabled = false;
    this.readOnly = false;
    this.required = false;
    this.indeterminate = false;
    this.value = 'on';
  }

  override createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();

    // Initialize checked state
    if (!this._initialized) {
      this._initialized = true;
      this._internalChecked = this.checked ?? this.defaultChecked;
      this._initialChecked = this._internalChecked;
    }

    // Set up accessibility
    this.setAttribute('role', 'checkbox');
    this.tabIndex = this.disabled ? -1 : 0;

    // Create hidden input for form participation
    this._createHiddenInput();

    // Bind events
    this.addEventListener('click', this._handleClick);
    this.addEventListener('keydown', this._handleKeyDown);
    this.addEventListener('keyup', this._handleKeyUp);
    this.addEventListener('focus', this._handleFocus);
    this.addEventListener('blur', this._handleBlur);

    this.syncState();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('click', this._handleClick);
    this.removeEventListener('keydown', this._handleKeyDown);
    this.removeEventListener('keyup', this._handleKeyUp);
    this.removeEventListener('focus', this._handleFocus);
    this.removeEventListener('blur', this._handleBlur);
    this._hiddenInput?.remove();
    this._hiddenInput = null;
  }

  protected override updated(changed: Map<string, unknown>) {
    super.updated(changed);
    this.syncState();
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  getState(): CheckboxState {
    const isChecked = this.getChecked();
    return {
      checked: isChecked,
      disabled: this.disabled,
      readOnly: this.readOnly,
      required: this.required,
      indeterminate: this.indeterminate,
      dirty: isChecked !== this._initialChecked,
      touched: this._touched,
      focused: this._focused,
    };
  }

  getChecked(): boolean {
    return this.checked ?? this._internalChecked;
  }

  toggle(event?: Event) {
    if (this.disabled || this.readOnly) return;

    const nextChecked = !this.getChecked();

    // Call callback
    this.onCheckedChange?.(nextChecked, event ?? new Event('change'));

    // Update internal state (uncontrolled)
    if (this.checked === undefined) {
      this._internalChecked = nextChecked;
    }

    this.syncState();
  }

  // ─── Event handlers ─────────────────────────────────────────────────────────

  private _handleClick = (event: MouseEvent) => {
    // Don't toggle if clicking on the hidden input
    if (event.target === this._hiddenInput) return;
    event.preventDefault();
    this.toggle(event);
  };

  private _handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.toggle(event);
    } else if (event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault(); // Prevent scroll
    }
  };

  private _handleKeyUp = (event: KeyboardEvent) => {
    if (event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      this.toggle(event);
    }
  };

  private _handleFocus = () => {
    if (!this._focused) {
      this._focused = true;
      this.syncState();
    }
  };

  private _handleBlur = () => {
    this._focused = false;
    this._touched = true;
    this.syncState();
  };

  // ─── Internal ───────────────────────────────────────────────────────────────

  private _createHiddenInput() {
    if (this._hiddenInput) return;

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('aria-hidden', 'true');
    input.tabIndex = -1;
    input.style.cssText = VISUALLY_HIDDEN_STYLE;

    // Insert after the custom element
    this.after(input);
    this._hiddenInput = input;
  }

  private syncState() {
    const isChecked = this.getChecked();
    const state = this.getState();

    // ARIA attributes on host
    this.setAttribute(
      'aria-checked',
      this.indeterminate ? 'mixed' : isChecked ? 'true' : 'false',
    );
    this.setAttribute('aria-disabled', this.disabled ? 'true' : 'false');
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

    this.tabIndex = this.disabled ? -1 : 0;

    // Data attributes for styling
    if (this.indeterminate) {
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
    this.toggleAttribute('data-dirty', state.dirty);
    this.toggleAttribute('data-touched', state.touched);
    this.toggleAttribute('data-focused', state.focused);

    // Sync hidden input
    if (this._hiddenInput) {
      this._hiddenInput.checked = isChecked;
      this._hiddenInput.disabled = this.disabled;
      this._hiddenInput.required = this.required;
      this._hiddenInput.indeterminate = this.indeterminate;
      if (this.name) this._hiddenInput.name = this.name;
      if (this.value) this._hiddenInput.value = this.value;
    }

    this.publishStateChange();
  }

  private publishStateChange() {
    this.dispatchEvent(
      new CustomEvent(CHECKBOX_STATE_CHANGE_EVENT, { bubbles: false }),
    );
  }
}

customElements.define('checkbox-root', CheckboxRootElement);

// ─── CheckboxIndicatorElement ─────────────────────────────────────────────────

export class CheckboxIndicatorElement extends ReactiveElement {
  static properties = {
    keepMounted: { type: Boolean, attribute: 'keep-mounted' },
  };

  declare keepMounted: boolean;

  private _checkboxRoot: CheckboxRootElement | null = null;
  private _mounted = false;
  private _transitionStatus: 'starting' | 'ending' | undefined;

  constructor() {
    super();
    this.keepMounted = false;
  }

  override createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();
    this._checkboxRoot = this.closest('checkbox-root') as CheckboxRootElement | null;

    if (!this._checkboxRoot) {
      throw new Error(
        'Base UI: <checkbox-indicator> must be placed inside a <checkbox-root>.',
      );
    }

    this._checkboxRoot.addEventListener(CHECKBOX_STATE_CHANGE_EVENT, this._handleStateChange);

    // Initial sync - check state and hide if unchecked
    // Defer slightly to ensure checkbox-root has run its connectedCallback
    Promise.resolve().then(() => this.syncVisibility());
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this._checkboxRoot?.removeEventListener(CHECKBOX_STATE_CHANGE_EVENT, this._handleStateChange);
    this._checkboxRoot = null;
  }

  private _handleStateChange = () => {
    this.syncVisibility();
  };

  private syncVisibility() {
    const root = this._checkboxRoot;
    if (!root) return;

    const state = root.getState();
    const shouldShow = state.checked || state.indeterminate;

    if (shouldShow) {
      if (!this._mounted) {
        this._mounted = true;
        this._transitionStatus = 'starting';
        this.removeAttribute('hidden');
        this.style.display = '';
        this.setAttribute('data-starting-style', '');

        // Clear starting style after one frame
        requestAnimationFrame(() => {
          this._transitionStatus = undefined;
          this.removeAttribute('data-starting-style');
          this.syncDataAttributes();
        });
      } else if (this._transitionStatus === 'ending') {
        this._transitionStatus = undefined;
        this.removeAttribute('data-ending-style');
      }
    } else if (this._mounted) {
      // Was showing, now needs to hide (with transition)
      this._transitionStatus = 'ending';
      this.setAttribute('data-ending-style', '');

      // Wait for animations to finish, then unmount
      if (typeof this.getAnimations === 'function') {
        const animations = this.getAnimations();
        if (animations.length > 0) {
          Promise.all(animations.map((a) => a.finished))
            .then(() => this.finishExit())
            .catch(() => this.finishExit());
          return;
        }
      }

      this.finishExit();
    } else {
      // Never mounted and shouldn't show - hide immediately
      if (!this.keepMounted) {
        this.setAttribute('hidden', '');
        this.style.display = 'none';
      }
    }

    this.syncDataAttributes();
  }

  private finishExit() {
    this._mounted = false;
    this._transitionStatus = undefined;
    this.removeAttribute('data-ending-style');

    if (!this.keepMounted) {
      this.setAttribute('hidden', '');
      this.style.display = 'none';
    }

    this.syncDataAttributes();
  }

  private syncDataAttributes() {
    const state = this._checkboxRoot?.getState();
    if (!state) return;

    // Mirror parent state
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
  }
}

customElements.define('checkbox-indicator', CheckboxIndicatorElement);

// ─── Global type declarations ─────────────────────────────────────────────────

declare global {
  interface HTMLElementTagNameMap {
    'checkbox-root': CheckboxRootElement;
    'checkbox-indicator': CheckboxIndicatorElement;
  }
}
