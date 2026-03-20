---
title: Input
subtitle: A Lit input primitive with Base UI form behavior.
description: A Lit input primitive with Base UI form behavior.
---

# Input

A Lit input primitive with Base UI form behavior.

## Demo

### Tailwind

This example shows how to implement the component using Tailwind CSS.

```tsx
/* index.tsx */
'use client';
import { LitInput } from './LitInput';

export default function ExampleInput() {
  return (
    <label className="flex flex-col items-start gap-1">
      <span className="text-sm font-medium text-gray-900">Name</span>
      <LitInput
        placeholder="Enter your name"
        className="h-10 w-56 rounded-md border border-gray-200 pl-3.5 text-base text-gray-900 focus:outline-2 focus:-outline-offset-1 focus:outline-blue-800"
      />
    </label>
  );
}
```

```tsx
/* LitInput.tsx */
'use client';
import * as React from 'react';
import { nothing, render as renderTemplate } from 'lit';
import { Input } from '@base-ui/lit/input';

export function LitInput(props: Input.Props) {
  const hostRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(Input(props), host);

    return () => {
      renderTemplate(nothing, host);
    };
  }, [props]);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}
```

### CSS Modules

This example shows how to implement the component using CSS Modules.

```css
/* index.module.css */
.Label {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.25rem;
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
  width: 14rem;
  height: 2.5rem;
  border-radius: 0.375rem;
  font-family: inherit;
  font-size: 1rem;
  font-weight: normal;
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
'use client';
import { LitInput } from './LitInput';
import styles from './index.module.css';

export default function ExampleInput() {
  return (
    <label className={styles.Label}>
      Name
      <LitInput placeholder="Enter your name" className={styles.Input} />
    </label>
  );
}
```

```tsx
/* LitInput.tsx */
'use client';
import * as React from 'react';
import { nothing, render as renderTemplate } from 'lit';
import { Input } from '@base-ui/lit/input';

export function LitInput(props: Input.Props) {
  const hostRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(Input(props), host);

    return () => {
      renderTemplate(nothing, host);
    };
  }, [props]);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}
```

## Anatomy

```ts title="Anatomy"
import { render } from 'lit';
import { Input } from '@base-ui/lit/input';

render(Input({ placeholder: 'Email address' }), mountNode);
```

## Status

The Lit docs are being wired up around the current package surface. This page focuses on live examples and real package entrypoints.
