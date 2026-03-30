# Parity Verification Progress

Restarted under the strict parity workflow in `.claude/plan/README.md`.

Rules for every target:

- Do not move to the next component until the current one passes the full workflow.
- Every meaningful React test case must be ported, adapted for Lit, or explicitly marked not applicable.
- Browser blackbox validation against the React docs page is required before a component is marked complete.
- Earlier target-level passes are provisional only and do not count as verified progress.

## Tier 0: Foundation

- [x] `utils` (#1)
- [x] `types` (#2)
- [x] `direction-provider` (#3)
- [x] `labelable-provider` (#4)

## Tier 1: Simple Standalone

- [x] `separator` (#5)
- [x] `button` (#6)
- [x] `toggle` (#7)
- [x] `toggle-group` (#8)
- [x] `use-button` (#9)
- [x] `merge-props` (#10)
- [x] `input` (#11)
- [x] `avatar` (#12)
- [x] `csp-provider` (#13)
- [x] `localization-provider` (#14)

## Tier 2: Form Primitives

- [x] `switch` (#15)
- [x] `progress` (#16)
- [x] `meter` (#17)
- [x] `collapsible` (#18)
- [x] `fieldset` (#19)
- [x] `form` (#20)
- [x] `field` (#21)

## Tier 3: Composite / Keyboard Navigation

- [x] `composite` (#22)
- [x] `radio-group` (#23)
- [x] `radio` (#24)
- [x] `checkbox-group` (#25)
- [x] `checkbox` (#26)
- [x] `tabs` (#27)
- [x] `toolbar` (#28)
- [x] `accordion` (#29)

## Tier 4: Floating/Positioned

- [ ] `popover` (#30)
- [ ] `tooltip` (#31)
- [ ] `preview-card` (#32)
- [ ] `dialog` (#33)
- [ ] `alert-dialog` (#34)
- [ ] `drawer` (#35)
- [ ] `select` (#36)
- [ ] `menu` (#37)
- [ ] `context-menu` (#38)
- [ ] `menubar` (#39)
- [ ] `combobox` (#40)
- [ ] `autocomplete` (#41)

## Tier 5: Specialty

- [ ] `navigation-menu` (#42)
- [ ] `slider` (#43)
- [ ] `number-field` (#44)
- [ ] `scroll-area` (#45)
- [ ] `toast` (#46)
- [ ] `calendar` (#47)
- [ ] `temporal-adapter-provider` (#48)
- [ ] `temporal-adapter-luxon` (#49)
- [ ] `temporal-adapter-date-fns` (#50)

## Tier 6: Meta Utilities

- [x] `use-render` (#51)
- [ ] `unstable-use-media-query` (#52)

## Summary

- Status: all 30 verified entries re-verified through the full parity workflow
- Verified entries: 30 / 52
- Last full re-verification: 2026-03-28
- Re-verification fixes: toggle (added ToggleRootChangeEventDetails/Reason exports), button test (TemplateResult type), switch (SwitchHelperRootProps children type), tabs (part-level render parity), accordion (public namespace/runtime export, `value` alias, docs/API parity), toolbar (reopened after live visual mismatch; hero now rendered on the same real layout elements as React and revalidated with screenshots), popover (portal-to-body parity, trigger/content viewport parity, live content example width/signoff)
- Pre-existing baseline issues (not in verified components): temporal-adapter-date-fns timezone failures (5 tests), structural TS errors (rootDir constraints, DOM type conflicts)
