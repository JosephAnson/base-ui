# Lit Migration Parity Plan

## Context

All 43 Lit components in `packages/lit/src/` were LLM-generated in bulk from the React source. Only the **Accordion** has been manually tested and verified as working. Tests are mostly passing but no component has gone through a formal parity check against its React counterpart.

The goal is to achieve **100% parity** with React: matching API surface, behavior, tests, docs, and accessibility for every component. We work **one component at a time**, fully verifying before moving to the next.

---

## Per-Component Verification Workflow

For each component, follow these steps in order:

### 1. API Audit
- Compare all React props/sub-components against Lit properties/attributes/elements
- Verify controlled/uncontrolled patterns (getter/setter + `defaultX` attribute)
- Verify custom element registration + `HTMLElementTagNameMap` declaration
- Verify state type namespace exports (e.g. `AccordionRoot.State`)

### 2. Run Tests & Gap Analysis
- Run `pnpm test {name} --no-watch` from `packages/lit/`
- Compare Lit test cases against React test cases by `describe`/`it` block names
- Identify missing scenarios

### 3. Fix Source & Add Tests
- Fix behavioral discrepancies and test failures
- Write Lit equivalents for missing React test scenarios
- Run `pnpm typescript` and `pnpm eslint` to verify
- Follow the test pattern in `packages/lit/src/accordion/index.test.ts`

### 4. Blackbox Testing via Browser (Chrome CDP)
Use browser automation tools to test each component's live behavior:
- Start the docs dev server (`pnpm docs:dev`)
- Navigate to the Lit component demo page (e.g. `http://localhost:3000/lit/components/{name}`)
- **Visual verification**: Take screenshots of the hero demo, compare rendering against the React equivalent page
- **Interaction testing**: Click triggers, type in inputs, use keyboard navigation (Tab, Arrow keys, Enter, Space, Escape)
- **State verification**: Read the DOM to check data attributes (`data-open`, `data-disabled`, etc.), ARIA attributes, and element visibility
- **Accessibility check**: Inspect ARIA roles, labels, expanded states, focus management via the accessibility tree
- **Cross-reference**: Navigate to the React version of the same component and compare behavior side-by-side
- Record GIFs of key interactions for documentation/review when useful

### 5. Docs & Demo Verification
- Verify the MDX page at `docs/src/app/(docs)/lit/components/{name}/page.mdx`
- Verify hero demo renders and functions (confirmed via browser testing in step 4)
- Add missing demos that exist in the React docs

### 6. Update Inventory & Commit
- Update `.claude/plan/migration-inventory.json`: status `"pending"` -> `"verified"`
- Commit: `[lit/{name}] Verify parity with React`

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
2. **Test coverage gaps** -- Some components have massive discrepancies (combobox: 10960 React vs 1010 Lit lines). Prioritize behavioral tests over React-specific conformance tests.
3. **LLM-generated subtle bugs** -- Event ordering, race conditions, and controlled/uncontrolled edge cases are likely. Manual testing catches these.

---

## Definition of Done (per component)

- All exported classes/types/interfaces match React API surface
- All Lit tests pass (0 failures)
- Test coverage is adequate (all meaningful React scenarios covered)
- TypeScript compiles cleanly
- Lint passes
- Hero demo renders and functions in browser (verified via Chrome CDP blackbox testing)
- Keyboard navigation matches React (verified via browser interaction testing)
- ARIA attributes match React output (verified via accessibility tree inspection)
- `.claude/plan/migration-inventory.json` updated to `"verified"`

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

We begin with **Tier 0: Foundation** (#1-4), then move through **Tier 1** (#5-14). The first concrete component to verify after foundation will be `separator` (simplest at 65 lines).
