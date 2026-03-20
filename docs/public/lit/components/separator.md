---
title: Separator
subtitle: A visual or semantic separator primitive.
description: A visual or semantic separator primitive.
---

# Separator

A visual or semantic separator primitive.

## Demo

### Tailwind

This example shows how to implement the component using Tailwind CSS.

```tsx
/* index.tsx */
'use client';
import { LitSeparator } from './LitSeparator';

export default function ExampleSeparator() {
  return (
    <div className="flex gap-4 text-nowrap">
      <a
        href="#"
        className="text-sm text-gray-900 decoration-gray-400 decoration-1 underline-offset-2 outline-hidden hover:underline focus-visible:rounded-xs focus-visible:no-underline focus-visible:outline-2 focus-visible:outline-blue-800"
      >
        Home
      </a>
      <a
        href="#"
        className="text-sm text-gray-900 decoration-gray-400 decoration-1 underline-offset-2 outline-hidden hover:underline focus-visible:rounded-xs focus-visible:no-underline focus-visible:outline-2 focus-visible:outline-blue-800"
      >
        Pricing
      </a>
      <a
        href="#"
        className="text-sm text-gray-900 decoration-gray-400 decoration-1 underline-offset-2 outline-hidden hover:underline focus-visible:rounded-xs focus-visible:no-underline focus-visible:outline-2 focus-visible:outline-blue-800"
      >
        Blog
      </a>
      <a
        href="#"
        className="text-sm text-gray-900 decoration-gray-400 decoration-1 underline-offset-2 outline-hidden hover:underline focus-visible:rounded-xs focus-visible:no-underline focus-visible:outline-2 focus-visible:outline-blue-800"
      >
        Support
      </a>

      <LitSeparator orientation="vertical" className="w-px bg-gray-300" />

      <a
        href="#"
        className="text-sm text-gray-900 decoration-gray-400 decoration-1 underline-offset-2 outline-hidden hover:underline focus-visible:rounded-xs focus-visible:no-underline focus-visible:outline-2 focus-visible:outline-blue-800"
      >
        Log in
      </a>
      <a
        href="#"
        className="text-sm text-gray-900 decoration-gray-400 decoration-1 underline-offset-2 outline-hidden hover:underline focus-visible:rounded-xs focus-visible:no-underline focus-visible:outline-2 focus-visible:outline-blue-800"
      >
        Sign up
      </a>
    </div>
  );
}
```

```tsx
/* LitSeparator.tsx */
'use client';
import * as React from 'react';
import { nothing, render as renderTemplate } from 'lit';
import { Separator } from '@base-ui/lit/separator';

export function LitSeparator(props: Separator.Props) {
  const hostRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(Separator(props), host);

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
.Container {
  display: flex;
  gap: 1rem;
  text-wrap: nowrap;
}

.Separator {
  width: 1px;
  background-color: var(--color-gray-300);
}

.Link {
  font-size: 0.875rem;
  line-height: 1.25rem;
  color: var(--color-gray-900);
  text-decoration-color: var(--color-gray-400);
  text-decoration-thickness: 1px;
  text-decoration-line: none;
  text-underline-offset: 2px;

  @media (hover: hover) {
    &:hover {
      text-decoration-line: underline;
    }
  }

  &:focus-visible {
    border-radius: 0.125rem;
    outline: 2px solid var(--color-blue);
    text-decoration-line: none;
  }
}
```

```tsx
/* index.tsx */
'use client';
import { LitSeparator } from './LitSeparator';
import styles from './index.module.css';

export default function ExampleSeparator() {
  return (
    <div className={styles.Container}>
      <a href="#" className={styles.Link}>
        Home
      </a>
      <a href="#" className={styles.Link}>
        Pricing
      </a>
      <a href="#" className={styles.Link}>
        Blog
      </a>
      <a href="#" className={styles.Link}>
        Support
      </a>

      <LitSeparator orientation="vertical" className={styles.Separator} />

      <a href="#" className={styles.Link}>
        Log in
      </a>
      <a href="#" className={styles.Link}>
        Sign up
      </a>
    </div>
  );
}
```

```tsx
/* LitSeparator.tsx */
'use client';
import * as React from 'react';
import { nothing, render as renderTemplate } from 'lit';
import { Separator } from '@base-ui/lit/separator';

export function LitSeparator(props: Separator.Props) {
  const hostRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(Separator(props), host);

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
import { Separator } from '@base-ui/lit/separator';

render(Separator({ orientation: 'horizontal' }), mountNode);
```

## Status

The Lit docs are being wired up around the current package surface. This page focuses on live examples and real package entrypoints.
