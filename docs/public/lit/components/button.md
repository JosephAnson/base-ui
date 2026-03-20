---
title: Button
subtitle: A Lit button primitive with Base UI interaction behavior.
description: A Lit button primitive with Base UI interaction behavior.
---

# Button

A Lit button primitive with Base UI interaction behavior.

## Demo

### Tailwind

This example shows how to implement the component using Tailwind CSS.

```tsx
/* index.tsx */
import * as React from 'react';
import { LitButton } from './LitButton';

export default function ExampleButton() {
  return (
    <LitButton className="flex items-center justify-center h-10 px-3.5 m-0 outline-0 border border-gray-200 rounded-md bg-gray-50 font-inherit text-base font-medium leading-6 text-gray-900 select-none hover:data-[disabled]:bg-gray-50 hover:bg-gray-100 active:data-[disabled]:bg-gray-50 active:bg-gray-200 active:shadow-[inset_0_1px_3px_rgba(0,0,0,0.1)] active:border-t-gray-300 active:data-[disabled]:shadow-none active:data-[disabled]:border-t-gray-200 focus-visible:outline-2 focus-visible:outline-blue-800 focus-visible:-outline-offset-1 data-[disabled]:text-gray-500">
      Submit
    </LitButton>
  );
}
```

```tsx
/* LitButton.tsx */
'use client';
import * as React from 'react';
import { nothing, render as renderTemplate } from 'lit';
import { Button } from '@base-ui/lit/button';

export function LitButton(props: Button.Props) {
  const hostRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(Button(props), host);

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
.Button {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 2.5rem;
  padding: 0 0.875rem;
  margin: 0;
  outline: 0;
  border: 1px solid var(--color-gray-200);
  border-radius: 0.375rem;
  background-color: var(--color-gray-50);
  font-family: inherit;
  font-size: 1rem;
  font-weight: 500;
  line-height: 1.5rem;
  color: var(--color-gray-900);
  user-select: none;

  @media (hover: hover) {
    &:hover:not([data-disabled]) {
      background-color: var(--color-gray-100);
    }
  }

  &:active:not([data-disabled]) {
    background-color: var(--color-gray-200);
    box-shadow: inset 0 1px 3px var(--color-gray-200);
    border-top-color: var(--color-gray-300);
  }

  &:focus-visible {
    outline: 2px solid var(--color-blue);
    outline-offset: -1px;
  }

  &[data-disabled] {
    color: var(--color-gray-500);
  }
}
```

```tsx
/* index.tsx */
import * as React from 'react';
import { LitButton } from './LitButton';
import styles from './index.module.css';

export default function ExampleButton() {
  return <LitButton className={styles.Button}>Submit</LitButton>;
}
```

```tsx
/* LitButton.tsx */
'use client';
import * as React from 'react';
import { nothing, render as renderTemplate } from 'lit';
import { Button } from '@base-ui/lit/button';

export function LitButton(props: Button.Props) {
  const hostRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(Button(props), host);

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
import { Button } from '@base-ui/lit/button';

render(Button({ children: 'Save changes' }), mountNode);
```

## Examples

### Loading states

## Status

The Lit docs are being wired up around the current package surface. This page focuses on live examples and real package entrypoints.
