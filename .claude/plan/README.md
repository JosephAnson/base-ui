# Lit Migration Parity Plan

## Context

All 43 Lit components in `packages/lit/src/` were LLM-generated in bulk from the React source. Only the **Accordion** has been manually tested and verified as working. Tests are mostly passing but no component has gone through a formal parity check against its React counterpart.

The goal is to achieve **100% parity** with React: matching API surface, behavior, tests, docs, visuals, and accessibility for every component. We work **one component at a time**, fully verifying before moving to the next.

All earlier Lit-target passes are now treated as **provisional only**. We restart from the beginning of the ordered list below and do not count a component as complete until it passes the full workflow in this document.

---

## Per-Component Verification Workflow

For each component, follow these steps in order:

### 1. React Baseline Audit
- Read the React source, React docs page, and React test file first
- Enumerate every meaningful React `describe` / `it` scenario
- Map each scenario to one of:
  - `ported` -- direct Lit equivalent exists
  - `adapted` -- same behavior covered with Lit-specific assertions
  - `not-applicable` -- truly React-only and intentionally skipped
- Do not silently omit React scenarios
- Record any `not-applicable` cases and why they do not apply to Lit

### 2. API Audit
- Compare all React props/sub-components against Lit properties/attributes/elements
- Verify controlled/uncontrolled patterns (getter/setter + `defaultX` attribute)
- Verify custom element registration + `HTMLElementTagNameMap` declaration
- Verify runtime namespace exports and state/type namespace exports (e.g. `Accordion.Root`, `AccordionRoot.State`)
- Verify root package exports and subpath exports both match the intended public surface

### 3. Run Tests & Gap Analysis
- Run the focused Lit test file and relevant root export/type tests
- Compare Lit coverage against the React scenario list from step 1
- Identify every missing behavior, assertion, docs example, and API alias
- Decide whether each missing item belongs in Lit tests, browser blackbox checks, or both

### 4. Fix Source & Add Tests
- Fix behavioral discrepancies and test failures
- Write Lit equivalents for all meaningful React test scenarios
- Keep the same test intent and coverage as React, adapted only where Lit mechanics differ
- Add Lit-specific tests when custom elements, shadow DOM, or form association require them
- Follow the test pattern in `packages/lit/src/accordion/index.test.ts`

### 5. Automated Validation Gate
- Run the focused Lit test file
- Run any related Chromium-only test file when browser layout/interaction behavior matters
- Run `packages/lit/src/index.test.ts` when the public surface changed
- Run `pnpm docs:api` whenever public API types or JSDoc changed
- Run direct lint/format checks on every touched source, test, and docs file
- Run broader verification commands when the local baseline allows it
- Do not proceed to browser validation until the target-level automated checks are green, or any remaining failures are explicitly identified as pre-existing baseline issues outside the current target

### 6. Blackbox Testing via Browser
Use browser automation to test each component's live behavior before moving on:
- Start the docs dev server (`pnpm docs:dev`)
- Navigate to the Lit component page (e.g. `http://localhost:3005/lit/components/{name}`)
- Navigate to the React component page for the same component (e.g. `http://localhost:3005/react/components/{name}`)
- **Visual verification**: compare the Lit hero demo and React hero demo; docs should look nearly identical unless there is a deliberate, documented difference
- **API reference verification**: compare the Lit page and React page `#api-reference` sections directly and ensure the docs structure and API surface are nearly identical unless Lit genuinely differs
- **Interaction testing**: Click triggers, type in inputs, use keyboard navigation (Tab, Arrow keys, Enter, Space, Escape)
- **State verification**: Read the DOM to check data attributes (`data-open`, `data-disabled`, etc.), ARIA attributes, and element visibility
- **Accessibility check**: Inspect ARIA roles, labels, expanded states, focus management via the accessibility tree
- **Cross-reference**: compare behavior against the React version step-by-step, not just visually
- **Form behavior**: verify submission payload, reset behavior, disabled/readOnly semantics, and labeling when applicable
- Record GIFs of key interactions for documentation/review when useful

### 7. Docs & Demo Verification
- Verify the MDX page at `docs/src/app/(docs)/lit/components/{name}/page.mdx`
- Verify hero demo renders and functions (confirmed via browser testing in step 6)
- Add missing demos that exist in the React docs
- Ensure docs copy, anatomy, API tables, examples, and `#api-reference` content closely match the React page unless Lit genuinely differs
- Do not leave placeholder status blocks once a component enters active verification

### 8. Update Inventory & Commit
- Update `.claude/plan/migration-inventory.json`: status `"pending"` -> `"verified"`
- Update `.claude/plan/progress.md`
- Commit: `[lit/{name}] Verify parity with React`
- Do not start the next component until the current one is updated in tracking files

---

## Component Order (by dependency and complexity)

### Tier 0: Foundation (verify first)
| # | Component | Lines | Why first |
|---|-----------|-------|-----------|
| 1 | `utils` | 84 | Imported by nearly everything |
| 2 | `types` | 139 | Used by merge-props, use-render, groups |
| 3 | `direction-provider` | 62 | Used by accordion, tabs, menu, composite |
| 4 | `labelable-provider` | 125 | Used by field |

### Tier 1: Simple Standalone
| # | Component | Lit src | Lit test | React test |
|---|-----------|---------|----------|------------|
| 5 | `separator` | 65 | 96 | 28 |
| 6 | `button` | 162 | 152 | 167 |
| 7 | `toggle` | 211 | 175 | 127 |
| 8 | `toggle-group` | 268 | 377 | 484 |
| 9 | `use-button` | 147 | 166 | 807 |
| 10 | `merge-props` | 437 | -- | 517 |
| 11 | `input` | 294 | 236 | 12 |
| 12 | `avatar` | 312 | 248 | 330 |
| 13 | `csp-provider` | 73 | 102 | 76 |
| 14 | `localization-provider` | 55 | 59 | -- |

### Tier 2: Form Primitives
| # | Component | Lit src | Lit test | React test |
|---|-----------|---------|----------|------------|
| 15 | `switch` | 423 | 302 | 1009 |
| 16 | `progress` | 393 | 291 | 279 |
| 17 | `meter` | 336 | 224 | 240 |
| 18 | `collapsible` | 549 | 345 | 309 |
| 19 | `fieldset` | 220 | 155 | 80 |
| 20 | `form` | 304 | 239 | 468 |
| 21 | `field` | 1184 | 173 | 1871 |

> `field` depends on `fieldset/shared.ts` + `form/shared.ts` -- verify those first.

### Tier 3: Composite / Keyboard Navigation
| # | Component | Lit src | Lit test | React test |
|---|-----------|---------|----------|------------|
| 22 | `composite` | 400 | 465 | 766 |
| 23 | `radio-group` | 509 | 351 | 1158 |
| 24 | `radio` | 521 | 371 | 372 |
| 25 | `checkbox-group` | 298 | 421 | 958 |
| 26 | `checkbox` | 638 | 403 | 1408 |
| 27 | `tabs` | 670 | 1159 | 2118 |
| 28 | `toolbar` | 600 | 466 | 1438 |
| 29 | `accordion` | 878 | 528 | 942 |

> Accordion is already verified -- re-confirm with formal checklist and update inventory.

### Tier 4: Floating/Positioned (hardest tier)
| # | Component | Lit src | Lit test | React test |
|---|-----------|---------|----------|------------|
| 30 | `popover` | 1511 | 627 | 4469 |
| 31 | `tooltip` | 1083 | 780 | 2927 |
| 32 | `preview-card` | 1078 | 591 | 2808 |
| 33 | `dialog` | 897 | 406 | 3281 |
| 34 | `alert-dialog` | 754 | 254 | 791 |
| 35 | `drawer` | 1546 | 644 | 4093 |
| 36 | `select` | 844 | 766 | 6373 |
| 37 | `menu` | 2130 | 851 | 6714 |
| 38 | `context-menu` | 293 | 376 | 698 |
| 39 | `menubar` | 500 | 266 | 1117 |
| 40 | `combobox` | 1311 | 1010 | 10960 |
| 41 | `autocomplete` | 208 | 375 | 2006 |

> Order within tier: popover first (establishes floating pattern), then tooltip/preview-card, dialog/alert-dialog/drawer, select, menu/context-menu/menubar, combobox/autocomplete.

### Tier 5: Specialty
| # | Component | Lit src | Lit test | React test |
|---|-----------|---------|----------|------------|
| 42 | `navigation-menu` | 1176 | 692 | 3626 |
| 43 | `slider` | 931 | 896 | 3960 |
| 44 | `number-field` | 938 | 885 | 4701 |
| 45 | `scroll-area` | 737 | 411 | 1138 |
| 46 | `toast` | 798 | 668 | 3788 |
| 47 | `calendar` | 917 | 852 | 3470 |
| 48 | `temporal-adapter-provider` | 219 | 78 | -- |
| 49 | `temporal-adapter-luxon` | 215 | -- | 16 |
| 50 | `temporal-adapter-date-fns` | 291 | -- | 13 |

### Tier 6: Meta Utilities
| # | Component | Lit src | Lit test | React test |
|---|-----------|---------|----------|------------|
| 51 | `use-render` | 948 | 646 | 318 |
| 52 | `unstable-use-media-query` | 311 | 410 | -- |

---

## Key Risks

1. **`@floating-ui/react-dom` dependency** -- The Lit package imports from the React-specific binding. May need to switch to `@floating-ui/dom` for Tier 4 components.
2. **Test coverage gaps** -- Some components have massive discrepancies (combobox: 10960 React vs 1010 Lit lines). Every meaningful React case must be mapped, even if the final Lit assertion is adapted.
3. **LLM-generated subtle bugs** -- Event ordering, race conditions, controlled/uncontrolled edge cases, and form-association details are likely. Browser blackbox testing is required.
4. **Docs drift** -- Lit docs can look complete while still diverging from the React page structure or hero behavior. Visual comparison is required.

---

## Definition of Done (per component)

- Every meaningful React test case is either ported, adapted, or explicitly marked not applicable
- All exported classes/types/interfaces match React API surface
- All focused Lit tests pass (0 failures)
- All relevant Chromium/browser-specific tests pass where applicable
- Root export/type coverage passes when public surface changed
- `pnpm docs:api` passes when public API changed
- TypeScript compiles cleanly, or any remaining failures are confirmed to be outside the current target
- Lint passes for touched files, or any remaining failures are confirmed to be pre-existing baseline issues outside the current target
- Hero demo renders and behaves in browser, and looks nearly identical to React
- Keyboard navigation matches React
- ARIA attributes and accessibility tree match React output
- Form behavior matches React where applicable
- Docs page and demos are updated and verified in browser
- `.claude/plan/migration-inventory.json` updated to `"verified"`
- `.claude/plan/progress.md` updated before moving on

---

## Verification Commands

```bash
# Run tests for a specific component
cd packages/lit && pnpm test {component-name} --no-watch

# TypeScript check
pnpm typescript

# Lint
pnpm eslint

# Start docs dev server (for blackbox browser testing)
pnpm docs:dev
```

### Browser Testing (Chrome CDP)
For each component with a visual demo:
1. Start `pnpm docs:dev` (background)
2. Use `mcp__claude-in-chrome__navigate` to open `http://localhost:3000/lit/components/{name}`
3. Use `mcp__claude-in-chrome__read_page` to inspect the accessibility tree
4. Use `mcp__claude-in-chrome__computer` for click/keyboard interactions
5. Use `mcp__claude-in-chrome__javascript_tool` to query DOM state (data attributes, ARIA)
6. Compare against `http://localhost:3000/react/components/{name}` for parity

---

## Critical Files

- `.claude/plan/migration-inventory.json` -- Tracking file to update per component
- `packages/lit/src/utils/index.ts` -- Foundation utilities
- `packages/lit/src/accordion/index.test.ts` -- Reference test pattern
- `packages/react/src/{component}/` -- React source to compare against
- `docs/src/app/(docs)/lit/components/{name}/` -- Lit documentation pages

---

## Starting Point

We restart with **Tier 0: Foundation** (#1-4), then move through **Tier 1** (#5-14). No previously touched component is considered complete until it is re-run through the full workflow above. The first concrete component to verify after foundation is still `separator`.
