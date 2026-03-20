# POC Decision: Web Component Architecture for Base UI Lit

## Summary

We tested three architecture options for porting Base UI React components to Lit Web Components. **Option C (Host IS the element)** is recommended as the primary approach, with **Option A (display: contents)** as a targeted supplement for components that must wrap native form elements.

## Options Tested

### Option A: `display: contents` Host
The custom element stays in the DOM but is invisible to layout. Children pass through naturally.

### Option B: Replace Host Element
The custom element renders content then removes itself from the DOM. **Rejected immediately** — no reactivity after self-removal, no lifecycle, no property updates.

### Option C: Host IS the Element (Recommended)
The custom element tag itself IS the styled element. Users style it directly.

## Test Matrix Results

| Criterion | Option A | Option C | Notes |
|-----------|----------|----------|-------|
| Children composition | ✅ Pass | ✅ Pass | Both support nested custom elements |
| Styling (class, data-*) | ⚠️ Partial | ✅ Pass | A: class on host doesn't style content; C: direct styling works |
| State propagation | ✅ Pass | ✅ Pass | Both use `closest()` + CustomEvent pattern |
| Form integration | ✅ Pass | ✅ Pass | A: wraps native input; C: sibling hidden input |
| Reactivity | ✅ Pass | ✅ Pass | Both support property changes updating attributes |
| Accessibility | ✅ Pass | ✅ Pass | ARIA attributes work correctly on both |
| Event handling | ✅ Pass | ✅ Pass | Callbacks via `.prop=${fn}` Lit syntax |
| Complex props | ✅ Pass | ✅ Pass | Functions passed via Lit property binding |

## Architecture Decision

### Primary: Option C (Host IS the Element)

Used for: `separator-root`, `field-root`, `field-label`, `field-description`, `field-error`, `checkbox-root`, `checkbox-indicator`

**Why:**
- Single DOM node — no wrapper overhead
- Users can style the element directly: `separator-root { display: block; }`
- Full reactivity through the custom element lifecycle
- Simplest implementation (~50 lines for separator vs ~950 for useRender)
- Natural for container/wrapper components

**Trade-offs:**
- Custom elements are `display: inline` by default — each component sets its own display
- Tag names appear in CSS selectors (`separator-root` instead of `div`)
- Cannot be native `<label>` or `<input>` elements

### Supplement: Option A (display: contents)

Used for: `field-control`

**Why:**
- `field-control` needs to wrap a native `<input>` for form participation
- `display: contents` makes the wrapper invisible to layout
- The native input inside is what the user sees and styles
- Preserves form semantics (name, validation, submit)

## Context/State Propagation: DOM Walking

Children find their parent context via `this.closest('parent-tag')`, which returns the actual custom element instance. This is dramatically simpler than the current Symbol-on-DOM + AsyncDirective approach.

```ts
// Child finding parent context
connectedCallback() {
  this._fieldRoot = this.closest('field-root') as FieldRootElement;
  this._fieldRoot?.registerLabel(this);
}
```

State changes are communicated via `CustomEvent` dispatched on the parent:
```ts
// Parent notifies children
private publishStateChange() {
  this.dispatchEvent(new CustomEvent('base-ui-field-state-change', { bubbles: false }));
}

// Child listens
this._fieldRoot?.addEventListener('base-ui-field-state-change', this._handleStateChange);
```

### Why not `@lit/context`?

The `closest()` + `CustomEvent` pattern is:
- Zero dependencies (no `@lit/context` needed)
- Works with plain `HTMLElement` subclasses (no Lit dependency required)
- Same pattern used in the existing implementation
- Simpler to understand and debug

`@lit/context` remains an option for Phase 1 if we find edge cases, but the current approach handles all tested scenarios.

## Function Props / Callbacks

Function props (like `validate`, `onCheckedChange`) are passed via Lit's property binding syntax:

```ts
html`<field-root .validate=${myValidateFn}>`
html`<checkbox-root .onCheckedChange=${handleChange}>`
```

This works naturally because Lit's `.prop` syntax sets JavaScript properties (not attributes), so functions pass through correctly.

## Render Prop Pattern

The React `render` prop pattern (e.g., `<Field.Root render={(props) => <div {...props} />}>`) does **not** survive directly. Instead, Web Components use:

1. **Slotted content** — children in light DOM
2. **CSS styling** — users style the custom element directly
3. **Templates** — Lit `html` templates for complex rendering

This is actually simpler for users — they style elements with CSS instead of render functions.

## Children API

Children work via light DOM (no Shadow DOM). Content placed inside a custom element appears naturally:

```html
<checkbox-root>
  <checkbox-indicator>✓</checkbox-indicator>
  I agree to terms
</checkbox-root>
```

No slots needed. No shadow DOM boundary. CSS applies directly.

## Key Findings

### Massive Complexity Reduction

| Component | Current (AsyncDirective) | POC (Custom Element) | Reduction |
|-----------|--------------------------|----------------------|-----------|
| Separator | ~50 lines + 949 (useRender) | ~55 lines | ~95% less supporting code |
| Field | 2,338 lines | ~350 lines | ~85% (simplified for POC) |
| Checkbox | 1,338 lines | ~280 lines | ~79% (simplified for POC) |

The `useRender` utility (949 lines) is **not needed** — custom elements handle rendering natively.

### What Works Well

1. **`closest()` for context** — cleaner than Symbol-on-DOM
2. **Native `HTMLElement`** — no Lit dependency needed for simple components (field uses plain HTMLElement)
3. **Attribute observation** — `static observedAttributes` + `attributeChangedCallback` is sufficient
4. **`ReactiveElement`** — useful for components needing reactive properties (separator, checkbox)
5. **Data attributes for state** — `data-checked`, `data-disabled`, etc. work identically to React

### Gotchas Found

1. **Infinite loops** — `field-error`'s visibility sync triggered parent state changes, causing re-entry. Fixed with guard flags.
2. **Custom element lifecycle ordering** — children may connect before parents finish initialization. Fixed with deferred sync (`Promise.resolve().then()`).
3. **`ReactiveElement` with `reflect: true`** — can cause infinite update loops if `updated()` modifies reflected attributes. Solution: use plain `HTMLElement` for complex components.

## Recommendation

Proceed with Phase 1 using:
- **Option C** as the default for all components
- **Option A** (`display: contents`) only where a native form element wrapper is needed
- **Plain `HTMLElement`** for complex components with many internal state changes
- **`ReactiveElement`** for simpler components needing reactive properties
- **`closest()` + `CustomEvent`** for context propagation
- **No Shadow DOM** — all components use light DOM

## Next Steps

1. Adapt core utilities (`merge-props`, `types`) for the custom element pattern
2. Begin rewriting simple components (separator, progress, meter, avatar, button, toggle)
3. Replace `@floating-ui/react-dom` with `@floating-ui/dom`
4. Update package.json exports as components are rewritten
