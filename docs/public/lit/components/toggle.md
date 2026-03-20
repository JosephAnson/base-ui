---
title: Toggle
subtitle: A pressable toggle primitive.
description: A pressable toggle primitive.
---

# Toggle

A pressable toggle primitive.

## Demo

### Tailwind

This example shows how to implement the component using Tailwind CSS.

```tsx
/* index.tsx */
'use client';
import * as React from 'react';
import { svg } from 'lit';
import { LitToggle } from './LitToggle';

export default function ExampleToggle() {
  const [pressed, setPressed] = React.useState(false);

  return (
    <div className="flex gap-px rounded-md border border-gray-200 bg-gray-50 p-0.5">
      <LitToggle
        aria-label="Favorite"
        className="flex size-8 items-center justify-center rounded-xs text-gray-600 select-none hover:bg-gray-100 focus-visible:bg-none focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-blue-800 active:bg-gray-200 data-[pressed]:text-gray-900"
        pressed={pressed}
        onPressedChange={setPressed}
      >
        {pressed ? heartFilledIcon() : heartOutlineIcon()}
      </LitToggle>
    </div>
  );
}

function heartFilledIcon() {
  return svg`<svg class="size-5" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M7.99961 13.8667C7.88761 13.8667 7.77561 13.8315 7.68121 13.7611C7.43321 13.5766 1.59961 9.1963 1.59961 5.8667C1.59961 3.80856 3.27481 2.13336 5.33294 2.13336C6.59054 2.13336 7.49934 2.81176 7.99961 3.3131C8.49988 2.81176 9.40868 2.13336 10.6663 2.13336C12.7244 2.13336 14.3996 3.80803 14.3996 5.8667C14.3996 9.1963 8.56601 13.5766 8.31801 13.7616C8.22361 13.8315 8.11161 13.8667 7.99961 13.8667Z" />
  </svg>`;
}

function heartOutlineIcon() {
  return svg`<svg class="size-5" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M7.99961 4.8232L7.24456 4.06654C6.84123 3.66235 6.18866 3.20003 5.33294 3.20003C3.86391 3.20003 2.66628 4.39767 2.66628 5.8667C2.66628 6.4079 2.91276 7.1023 3.41967 7.91383C3.91548 8.70759 4.59649 9.51244 5.31278 10.2503C6.38267 11.3525 7.47318 12.2465 7.99983 12.6605C8.52734 12.2456 9.61718 11.352 10.6864 10.2504C11.4027 9.51248 12.0837 8.70762 12.5796 7.91384C13.0865 7.1023 13.3329 6.4079 13.3329 5.8667C13.3329 4.39723 12.1354 3.20003 10.6663 3.20003C9.81056 3.20003 9.15799 3.66235 8.75466 4.06654L7.99961 4.8232ZM7.98574 3.29926C7.48264 2.79938 6.57901 2.13336 5.33294 2.13336C3.27481 2.13336 1.59961 3.80856 1.59961 5.8667C1.59961 9.1963 7.43321 13.5766 7.68121 13.7611C7.77561 13.8315 7.88761 13.8667 7.99961 13.8667C8.11161 13.8667 8.22361 13.8315 8.31801 13.7616C8.56601 13.5766 14.3996 9.1963 14.3996 5.8667C14.3996 3.80803 12.7244 2.13336 10.6663 2.13336C9.42013 2.13336 8.51645 2.79947 8.01337 3.29936C8.00877 3.30393 8.00421 3.30849 7.99967 3.31303C7.99965 3.31305 7.99963 3.31307 7.99961 3.3131C7.99502 3.3085 7.9904 3.30389 7.98574 3.29926Z"
    />
  </svg>`;
}
```

```tsx
/* LitToggle.tsx */
'use client';
import * as React from 'react';
import { nothing, render as renderTemplate } from 'lit';
import type { ToggleProps } from '@base-ui/lit/toggle';
import { Toggle } from '@base-ui/lit/toggle';

export function LitToggle(props: ToggleProps<string>) {
  const hostRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(Toggle(props), host);

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
.Panel {
  display: flex;
  gap: 1px;
  border: 1px solid var(--color-gray-200);
  background-color: var(--color-gray-50);
  border-radius: 0.375rem;
  padding: 0.125rem;
}

.Button {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
  margin: 0;
  outline: 0;
  border: 0;
  border-radius: 0.25rem;
  background-color: transparent;
  color: var(--color-gray-600);
  user-select: none;

  &:focus-visible {
    background-color: transparent;
    outline: 2px solid var(--color-blue);
    outline-offset: -1px;
  }

  @media (hover: hover) {
    &:hover {
      background-color: var(--color-gray-100);
    }
  }

  &:active {
    background-color: var(--color-gray-200);
  }

  &[data-pressed] {
    color: var(--color-gray-900);
  }
}

.Icon {
  width: 1.25rem;
  height: 1.25rem;
}
```

```tsx
/* index.tsx */
'use client';
import * as React from 'react';
import { svg } from 'lit';
import { LitToggle } from './LitToggle';
import styles from './index.module.css';

export default function ExampleToggle() {
  const [pressed, setPressed] = React.useState(false);

  return (
    <div className={styles.Panel}>
      <LitToggle
        aria-label="Favorite"
        className={styles.Button}
        pressed={pressed}
        onPressedChange={setPressed}
      >
        {pressed ? heartFilledIcon(styles.Icon) : heartOutlineIcon(styles.Icon)}
      </LitToggle>
    </div>
  );
}

function heartFilledIcon(className: string) {
  return svg`<svg class=${className} width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M7.99961 13.8667C7.88761 13.8667 7.77561 13.8315 7.68121 13.7611C7.43321 13.5766 1.59961 9.1963 1.59961 5.8667C1.59961 3.80856 3.27481 2.13336 5.33294 2.13336C6.59054 2.13336 7.49934 2.81176 7.99961 3.3131C8.49988 2.81176 9.40868 2.13336 10.6663 2.13336C12.7244 2.13336 14.3996 3.80803 14.3996 5.8667C14.3996 9.1963 8.56601 13.5766 8.31801 13.7616C8.22361 13.8315 8.11161 13.8667 7.99961 13.8667Z" />
  </svg>`;
}

function heartOutlineIcon(className: string) {
  return svg`<svg class=${className} width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M7.99961 4.8232L7.24456 4.06654C6.84123 3.66235 6.18866 3.20003 5.33294 3.20003C3.86391 3.20003 2.66628 4.39767 2.66628 5.8667C2.66628 6.4079 2.91276 7.1023 3.41967 7.91383C3.91548 8.70759 4.59649 9.51244 5.31278 10.2503C6.38267 11.3525 7.47318 12.2465 7.99983 12.6605C8.52734 12.2456 9.61718 11.352 10.6864 10.2504C11.4027 9.51248 12.0837 8.70762 12.5796 7.91384C13.0865 7.1023 13.3329 6.4079 13.3329 5.8667C13.3329 4.39723 12.1354 3.20003 10.6663 3.20003C9.81056 3.20003 9.15799 3.66235 8.75466 4.06654L7.99961 4.8232ZM7.98574 3.29926C7.48264 2.79938 6.57901 2.13336 5.33294 2.13336C3.27481 2.13336 1.59961 3.80856 1.59961 5.8667C1.59961 9.1963 7.43321 13.5766 7.68121 13.7611C7.77561 13.8315 7.88761 13.8667 7.99961 13.8667C8.11161 13.8667 8.22361 13.8315 8.31801 13.7616C8.56601 13.5766 14.3996 9.1963 14.3996 5.8667C14.3996 3.80803 12.7244 2.13336 10.6663 2.13336C9.42013 2.13336 8.51645 2.79947 8.01337 3.29936C8.00877 3.30393 8.00421 3.30849 7.99967 3.31303C7.99965 3.31305 7.99963 3.31307 7.99961 3.3131C7.99502 3.3085 7.9904 3.30389 7.98574 3.29926Z"
    />
  </svg>`;
}
```

```tsx
/* LitToggle.tsx */
'use client';
import * as React from 'react';
import { nothing, render as renderTemplate } from 'lit';
import type { ToggleProps } from '@base-ui/lit/toggle';
import { Toggle } from '@base-ui/lit/toggle';

export function LitToggle(props: ToggleProps<string>) {
  const hostRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(Toggle(props), host);

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
import { Toggle } from '@base-ui/lit/toggle';

render(Toggle({ children: 'Bold' }), mountNode);
```

## Status

The Lit docs are being wired up around the current package surface. This page focuses on live examples and real package entrypoints.
