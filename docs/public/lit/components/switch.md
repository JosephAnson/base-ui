---
title: Switch
subtitle: A two-state switch for Lit templates.
description: A two-state switch for Lit templates.
---

# Switch

A two-state switch for Lit templates.

## Demo

### Tailwind

This example shows how to implement the component using Tailwind CSS.

```tsx
/* index.tsx */
import * as React from 'react';
import { LitSwitch } from './LitSwitch';

export default function ExampleSwitch() {
  return (
    <label className="flex items-center gap-2 text-base text-gray-900">
      <LitSwitch
        rootProps={{
          className:
            'relative flex h-6 w-10 rounded-full bg-gradient-to-r from-gray-700 from-35% to-gray-200 to-65% bg-[length:6.5rem_100%] bg-[100%_0%] bg-no-repeat p-px shadow-[inset_0_1.5px_2px] shadow-gray-200 outline-1 -outline-offset-1 outline-gray-200 transition-[background-position,box-shadow] duration-[125ms] ease-[cubic-bezier(0.26,0.75,0.38,0.45)] before:absolute before:rounded-full before:outline-offset-2 before:outline-blue-800 focus-visible:before:inset-0 focus-visible:before:outline focus-visible:before:outline-2 active:bg-gray-100 data-[checked]:bg-[0%_0%] data-[checked]:active:bg-gray-500 dark:from-gray-500 dark:shadow-black/75 dark:outline-white/15 dark:data-[checked]:shadow-none',
          defaultChecked: true,
        }}
        thumbProps={{
          className:
            'aspect-square h-full rounded-full bg-white shadow-[0_0_1px_1px,0_1px_1px,1px_2px_4px_-1px] shadow-gray-100 transition-transform duration-150 data-[checked]:translate-x-4 dark:shadow-black/25',
        }}
      />
      Notifications
    </label>
  );
}
```

```tsx
/* LitSwitch.tsx */
'use client';
import * as React from 'react';
import { nothing, render as renderTemplate } from 'lit';
import type { SwitchRootProps, SwitchThumbProps } from '@base-ui/lit/switch';
import { Switch } from '@base-ui/lit/switch';

export interface LitSwitchProps {
  rootProps?: SwitchRootProps | undefined;
  thumbProps?: SwitchThumbProps | undefined;
}

export function LitSwitch(props: LitSwitchProps) {
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const { rootProps, thumbProps } = props;

  React.useEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(
      Switch.Root({
        ...rootProps,
        children: Switch.Thumb(thumbProps ?? {}),
      }),
      host,
    );

    return () => {
      renderTemplate(nothing, host);
    };
  }, [rootProps, thumbProps]);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}
```

### CSS Modules

This example shows how to implement the component using CSS Modules.

```css
/* index.module.css */
.Label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  line-height: 1.5rem;
  color: var(--color-gray-900);
}

.Switch {
  box-sizing: border-box;
  position: relative;
  display: flex;
  appearance: none;
  border: 0;
  margin: 0;
  padding: 1px;
  width: 2.5rem;
  height: 1.5rem;
  border-radius: 1.5rem;
  outline: 1px solid;
  outline-offset: -1px;
  background-color: transparent;
  background-image: linear-gradient(to right, var(--color-gray-700) 35%, var(--color-gray-200) 65%);
  background-size: 6.5rem 100%;
  background-position-x: 100%;
  background-repeat: no-repeat;
  transition-property: background-position, box-shadow;
  transition-timing-function: cubic-bezier(0.26, 0.75, 0.38, 0.45);
  transition-duration: 125ms;

  &:active {
    background-color: var(--color-gray-100);
  }

  &[data-checked] {
    background-position-x: 0%;
  }

  &[data-checked]:active {
    background-color: var(--color-gray-500);
  }

  @media (prefers-color-scheme: light) {
    box-shadow: var(--color-gray-200) 0 1.5px 2px inset;
    outline-color: var(--color-gray-200);
  }

  @media (prefers-color-scheme: dark) {
    box-shadow: rgb(0 0 0 / 75%) 0 1.5px 2px inset;
    outline-color: rgb(255 255 255 / 15%);
    background-image: linear-gradient(
      to right,
      var(--color-gray-500) 35%,
      var(--color-gray-200) 65%
    );

    &[data-checked] {
      box-shadow: none;
    }
  }

  &:focus-visible {
    &::before {
      content: '';
      inset: 0;
      position: absolute;
      border-radius: inherit;
      outline: 2px solid var(--color-blue);
      outline-offset: 2px;
    }
  }
}

.Thumb {
  aspect-ratio: 1 / 1;
  height: 100%;
  border-radius: 100%;
  background-color: white;
  transition: translate 150ms ease;

  &[data-checked] {
    translate: 1rem 0;
  }

  @media (prefers-color-scheme: light) {
    box-shadow:
      0 0 1px 1px var(--color-gray-100),
      0 1px 1px var(--color-gray-100),
      1px 2px 4px -1px var(--color-gray-100);
  }

  @media (prefers-color-scheme: dark) {
    box-shadow:
      0 0 1px 1px rgb(0 0 0 / 25%),
      0 1px 1px rgb(0 0 0 / 25%),
      1px 2px 4px -1px rgb(0 0 0 / 25%);
  }
}
```

```tsx
/* index.tsx */
import * as React from 'react';
import { LitSwitch } from './LitSwitch';
import styles from './index.module.css';

export default function ExampleSwitch() {
  return (
    <label className={styles.Label}>
      <LitSwitch
        rootProps={{ defaultChecked: true, className: styles.Switch }}
        thumbProps={{ className: styles.Thumb }}
      />
      Notifications
    </label>
  );
}
```

```tsx
/* LitSwitch.tsx */
'use client';
import * as React from 'react';
import { nothing, render as renderTemplate } from 'lit';
import type { SwitchRootProps, SwitchThumbProps } from '@base-ui/lit/switch';
import { Switch } from '@base-ui/lit/switch';

export interface LitSwitchProps {
  rootProps?: SwitchRootProps | undefined;
  thumbProps?: SwitchThumbProps | undefined;
}

export function LitSwitch(props: LitSwitchProps) {
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const { rootProps, thumbProps } = props;

  React.useEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(
      Switch.Root({
        ...rootProps,
        children: Switch.Thumb(thumbProps ?? {}),
      }),
      host,
    );

    return () => {
      renderTemplate(nothing, host);
    };
  }, [rootProps, thumbProps]);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}
```

## Anatomy

```ts title="Anatomy"
import { render } from 'lit';
import { Switch } from '@base-ui/lit/switch';

render(
  Switch.Root({
    children: Switch.Thumb(),
  }),
  mountNode,
);
```

## Status

The Lit docs are being wired up around the current package surface. This page focuses on live examples and real package entrypoints.
