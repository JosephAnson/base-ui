---
title: Field
subtitle: Field primitives for labeling, descriptions, and validation.
description: Field primitives for labeling, descriptions, and validation.
---

# Field

Field primitives for labeling, descriptions, and validation.

## Demo

### Tailwind

This example shows how to implement the component using Tailwind CSS.

```tsx
/* index.tsx */
'use client';
import { LitField } from './LitField';

export default function ExampleField() {
  return (
    <LitField
      rootClassName="flex w-full max-w-64 flex-col items-start gap-1"
      labelClassName="text-sm font-medium text-gray-900"
      inputClassName="h-10 w-full rounded-md border border-gray-200 pl-3.5 text-base text-gray-900 focus:outline-2 focus:-outline-offset-1 focus:outline-blue-800"
      errorClassName="text-sm text-red-800"
      descriptionClassName="text-sm text-gray-600"
    />
  );
}
```

```tsx
/* LitField.tsx */
'use client';
import * as React from 'react';
import { nothing, render as renderTemplate } from 'lit';
import { Field } from '@base-ui/lit/field';

export interface LitFieldProps {
  descriptionClassName?: string | undefined;
  errorClassName?: string | undefined;
  inputClassName?: string | undefined;
  labelClassName?: string | undefined;
  rootClassName?: string | undefined;
}

export function LitField(props: LitFieldProps) {
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const { descriptionClassName, errorClassName, inputClassName, labelClassName, rootClassName } =
    props;

  React.useEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(
      Field.Root({
        className: rootClassName,
        children: [
          Field.Label({
            className: labelClassName,
            children: 'Name',
          }),
          Field.Control({
            required: true,
            placeholder: 'Required',
            className: inputClassName,
          }),
          Field.Error({
            className: errorClassName,
            match: 'valueMissing',
            children: 'Please enter your name',
          }),
          Field.Description({
            className: descriptionClassName,
            children: 'Visible on your profile',
          }),
        ],
      }),
      host,
    );

    return () => {
      renderTemplate(nothing, host);
    };
  }, [descriptionClassName, errorClassName, inputClassName, labelClassName, rootClassName]);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}
```

### CSS Modules

This example shows how to implement the component using CSS Modules.

```css
/* index.module.css */
.Field {
  display: flex;
  flex-direction: column;
  align-items: start;
  gap: 0.25rem;
  width: 100%;
  max-width: 16rem;
}

.Label {
  font-size: 0.875rem;
  line-height: 1.25rem;
  font-weight: 500;
  color: var(--color-gray-900);
}

.Input {
  box-sizing: border-box;
  padding-left: 0.875rem;
  margin: 0;
  border: 1px solid var(--color-gray-200);
  width: 100%;
  height: 2.5rem;
  border-radius: 0.375rem;
  font-family: inherit;
  font-size: 1rem;
  background-color: transparent;
  color: var(--color-gray-900);

  &:focus {
    outline: 2px solid var(--color-blue);
    outline-offset: -1px;
  }
}

.Error {
  font-size: 0.875rem;
  line-height: 1.25rem;
  color: var(--color-red-800);
}

.Description {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.25rem;
  color: var(--color-gray-600);
}
```

```tsx
/* index.tsx */
'use client';
import { LitField } from './LitField';
import styles from './index.module.css';

export default function ExampleField() {
  return (
    <LitField
      rootClassName={styles.Field}
      labelClassName={styles.Label}
      inputClassName={styles.Input}
      errorClassName={styles.Error}
      descriptionClassName={styles.Description}
    />
  );
}
```

```tsx
/* LitField.tsx */
'use client';
import * as React from 'react';
import { nothing, render as renderTemplate } from 'lit';
import { Field } from '@base-ui/lit/field';

export interface LitFieldProps {
  descriptionClassName?: string | undefined;
  errorClassName?: string | undefined;
  inputClassName?: string | undefined;
  labelClassName?: string | undefined;
  rootClassName?: string | undefined;
}

export function LitField(props: LitFieldProps) {
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const { descriptionClassName, errorClassName, inputClassName, labelClassName, rootClassName } =
    props;

  React.useEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(
      Field.Root({
        className: rootClassName,
        children: [
          Field.Label({
            className: labelClassName,
            children: 'Name',
          }),
          Field.Control({
            required: true,
            placeholder: 'Required',
            className: inputClassName,
          }),
          Field.Error({
            className: errorClassName,
            match: 'valueMissing',
            children: 'Please enter your name',
          }),
          Field.Description({
            className: descriptionClassName,
            children: 'Visible on your profile',
          }),
        ],
      }),
      host,
    );

    return () => {
      renderTemplate(nothing, host);
    };
  }, [descriptionClassName, errorClassName, inputClassName, labelClassName, rootClassName]);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}
```

## Anatomy

```ts title="Anatomy"
import { render } from 'lit';
import { Field } from '@base-ui/lit/field';

render(
  Field.Root({
    children: [
      Field.Label({ children: 'Name' }),
      Field.Control({ required: true }),
      Field.Error({ match: 'valueMissing', children: 'Required' }),
    ],
  }),
  mountNode,
);
```

## Status

The Lit docs are being wired up around the current package surface. This page focuses on live examples and real package entrypoints.
