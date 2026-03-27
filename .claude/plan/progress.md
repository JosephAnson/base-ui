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

- [ ] `switch` (#15)
- [ ] `progress` (#16)
- [ ] `meter` (#17)
- [ ] `collapsible` (#18)
- [ ] `fieldset` (#19)
- [ ] `form` (#20)
- [ ] `field` (#21)

## Tier 3: Composite / Keyboard Navigation

- [ ] `composite` (#22)
- [ ] `radio-group` (#23)
- [ ] `radio` (#24)
- [ ] `checkbox-group` (#25)
- [ ] `checkbox` (#26)
- [ ] `tabs` (#27)
- [ ] `toolbar` (#28)
- [ ] `accordion` (#29)

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

- Status: restarted from beginning under strict validation gate
- Verified entries: 15 / 52
