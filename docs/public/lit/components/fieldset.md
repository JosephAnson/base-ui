---
title: Fieldset
subtitle: Fieldset primitives for grouped controls in Lit.
description: Fieldset primitives for grouped controls in Lit.
---

# Fieldset

Fieldset primitives for grouped controls in Lit.

## Demo

### Tailwind

This example shows how to implement the component using Tailwind CSS.

```tsx
/* index.tsx */
import * as React from 'react';
import { LitFieldset } from './LitFieldset';

export default function ExampleFieldset() {
  return (
    <LitFieldset
      fieldClassName="flex flex-col items-start gap-1"
      fieldsetClassName="flex w-full max-w-64 flex-col gap-4"
      inputClassName="h-10 w-full rounded-md border border-gray-200 pl-3.5 text-base text-gray-900 focus:outline-2 focus:-outline-offset-1 focus:outline-blue-800"
      labelClassName="text-sm font-medium text-gray-900"
      legendClassName="border-b border-gray-200 pb-3 text-lg font-medium text-gray-900"
    />
  );
}
```

```tsx
/* LitFieldset.tsx */
'use client';
import * as React from 'react';
import { html, nothing, render as renderTemplate } from 'lit';
import { Fieldset } from '@base-ui/lit/fieldset';

interface LitFieldsetProps {
  fieldClassName?: string | undefined;
  fieldsetClassName?: string | undefined;
  inputClassName?: string | undefined;
  labelClassName?: string | undefined;
  legendClassName?: string | undefined;
}

export function LitFieldset(props: LitFieldsetProps) {
  const { fieldClassName, fieldsetClassName, inputClassName, labelClassName, legendClassName } =
    props;
  const hostRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(
      Fieldset.Root({
        className: fieldsetClassName,
        children: [
          Fieldset.Legend({
            className: legendClassName,
            children: 'Billing details',
          }),
          html`
            <div class=${fieldClassName ?? ''}>
              <label class=${labelClassName ?? ''} for="fieldset-company">Company</label>
              <input
                id="fieldset-company"
                class=${inputClassName ?? ''}
                placeholder="Enter company name"
              />
            </div>
          `,
          html`
            <div class=${fieldClassName ?? ''}>
              <label class=${labelClassName ?? ''} for="fieldset-tax-id">Tax ID</label>
              <input
                id="fieldset-tax-id"
                class=${inputClassName ?? ''}
                placeholder="Enter fiscal number"
              />
            </div>
          `,
        ],
      }),
      host,
    );

    return () => {
      renderTemplate(nothing, host);
    };
  }, [fieldClassName, fieldsetClassName, inputClassName, labelClassName, legendClassName]);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}
```

### CSS Modules

This example shows how to implement the component using CSS Modules.

```css
/* index.module.css */
.Fieldset {
  border: 0;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  max-width: 16rem;
}

.Legend {
  border-bottom: 1px solid var(--color-gray-200);
  padding-bottom: 0.75rem;
  font-weight: 500;
  font-size: 1.125rem;
  line-height: 1.75rem;
  letter-spacing: -0.0025em;
  color: var(--color-gray-900);
}

.Field {
  display: flex;
  flex-direction: column;
  align-items: start;
  gap: 0.25rem;
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
```

```tsx
/* index.tsx */
import * as React from 'react';
import { LitFieldset } from './LitFieldset';
import styles from './index.module.css';

export default function ExampleFieldset() {
  return (
    <LitFieldset
      fieldClassName={styles.Field}
      fieldsetClassName={styles.Fieldset}
      inputClassName={styles.Input}
      labelClassName={styles.Label}
      legendClassName={styles.Legend}
    />
  );
}
```

```tsx
/* LitFieldset.tsx */
'use client';
import * as React from 'react';
import { html, nothing, render as renderTemplate } from 'lit';
import { Fieldset } from '@base-ui/lit/fieldset';

interface LitFieldsetProps {
  fieldClassName?: string | undefined;
  fieldsetClassName?: string | undefined;
  inputClassName?: string | undefined;
  labelClassName?: string | undefined;
  legendClassName?: string | undefined;
}

export function LitFieldset(props: LitFieldsetProps) {
  const { fieldClassName, fieldsetClassName, inputClassName, labelClassName, legendClassName } =
    props;
  const hostRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(
      Fieldset.Root({
        className: fieldsetClassName,
        children: [
          Fieldset.Legend({
            className: legendClassName,
            children: 'Billing details',
          }),
          html`
            <div class=${fieldClassName ?? ''}>
              <label class=${labelClassName ?? ''} for="fieldset-company">Company</label>
              <input
                id="fieldset-company"
                class=${inputClassName ?? ''}
                placeholder="Enter company name"
              />
            </div>
          `,
          html`
            <div class=${fieldClassName ?? ''}>
              <label class=${labelClassName ?? ''} for="fieldset-tax-id">Tax ID</label>
              <input
                id="fieldset-tax-id"
                class=${inputClassName ?? ''}
                placeholder="Enter fiscal number"
              />
            </div>
          `,
        ],
      }),
      host,
    );

    return () => {
      renderTemplate(nothing, host);
    };
  }, [fieldClassName, fieldsetClassName, inputClassName, labelClassName, legendClassName]);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}
```

## Anatomy

```ts title="Anatomy"
import { render } from 'lit';
import { Fieldset } from '@base-ui/lit/fieldset';

render(
  Fieldset.Root({
    children: [Fieldset.Legend({ children: 'Notifications' })],
  }),
  mountNode,
);
```

## Status

The Lit docs are being wired up around the current package surface. This page focuses on live examples and real package entrypoints.
