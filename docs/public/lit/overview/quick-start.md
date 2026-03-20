---
title: Quick start
subtitle: A quick guide to getting started with Base UI for Lit.
description: A quick guide to getting started with Base UI for Lit.
---

# Quick start

A quick guide to getting started with Base UI for Lit.

## Install the library

Install Lit and the Base UI Lit package with your package manager of choice.

```bash title="Terminal"
npm i lit @base-ui/lit
```

Base UI for Lit exposes tree-shakable component entrypoints, so you can import only the primitives you use.

## Set up

### Create an application root

Lit renders templates into a DOM container. Start with a dedicated mount node for your app.

```html title="index.html"
<div id="app"></div>
```

### Render a component

Base UI for Lit exposes template helpers that you render with Lit's `render()` API.

```ts title="main.ts"
import { render } from 'lit';
import { Button } from '@base-ui/lit/button';

const app = document.querySelector('#app');

if (app == null) {
  throw new Error('Missing #app container');
}

render(Button({ children: 'Submit' }), app);
```

### Styling

Like Base UI for React, the Lit package is unstyled. The examples below use CSS Modules and Tailwind, but you can use plain CSS or any styling solution that fits your stack.

## Assemble a component

This demo shows how to compose a field from multiple Lit primitives and apply styles. It includes a label, input, validation message, and description.

### Compose primitives

Complex controls are assembled from parts in the same render tree. For example, `Field` is composed from `Root`, `Label`, `Control`, `Error`, and `Description`:

```ts title="field.ts"
import { render } from 'lit';
import { Field } from '@base-ui/lit/field';

render(
  Field.Root({
    children: [
      Field.Label({ children: 'Name' }),
      Field.Control({ required: true }),
      Field.Error({ match: 'valueMissing', children: 'Required' }),
      Field.Description({ children: 'Visible on your profile' }),
    ],
  }),
  app,
);
```

## Next steps

This walkthrough covers the basics of installing Base UI for Lit, rendering a primitive, and composing a more complete control.
Start with the [Button docs](/lit/components/button.md), [Field docs](/lit/components/field.md), and [Checkbox docs](/lit/components/checkbox.md) to explore the current Lit surface area.

## Working with LLMs

Each docs page includes a "View as Markdown" link. The docs build also generates Lit markdown exports and includes them in `llms.txt` and `llms-full.txt`.
