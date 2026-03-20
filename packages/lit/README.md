# `@base-ui/lit`

This package is the Lit port of the `@base-ui/react` surface, providing headless, unstyled web components.

## Components

38 components have been ported as custom elements:

Accordion, Alert Dialog, Autocomplete, Avatar, Button, Calendar, Checkbox, Checkbox Group, Collapsible, Combobox, Context Menu, Dialog, Drawer, Field, Fieldset, Form, Input, Menu, Menubar, Meter, Navigation Menu, Number Field, Popover, Preview Card, Progress, Radio, Radio Group, Scroll Area, Select, Separator, Slider, Switch, Tabs, Toast, Toggle, Toggle Group, Toolbar, Tooltip

## Shared Utilities & Providers

- **Composite** — shared keyboard navigation for lists and grids
- **CSP Provider** — provides a CSP nonce for inline style injection
- **Direction Provider** — provides text direction (LTR/RTL) to child components
- **Labelable Provider** — manages label-control ID associations for accessibility
- **Localization Provider** — provides locale configuration to temporal components
- **Temporal Adapter Provider** — pluggable date library adapter interface
- **Temporal Adapter date-fns** — date-fns implementation of TemporalAdapter
- **Temporal Adapter Luxon** — Luxon implementation of TemporalAdapter
- **useButton** — shared button behavior utilities for any element

## Architecture

Components are implemented as custom elements using the "host IS the element" pattern:
- Simple components extend `ReactiveElement` from Lit
- Complex components with lots of internal state extend plain `HTMLElement`
- Provider elements use `display: contents` to avoid affecting layout
- Context propagation uses `element.closest('parent-tag')` + `CustomEvent`

## Installation

```bash
npm install @base-ui/lit
```

## Usage

```html
<accordion-root>
  <accordion-item value="item-1">
    <accordion-header>
      <accordion-trigger>Section title</accordion-trigger>
    </accordion-header>
    <accordion-panel>Section content</accordion-panel>
  </accordion-item>
</accordion-root>
```

The migration goal is to mirror the public `@base-ui/react` export surface with Lit equivalents.
