---
title: Avatar
subtitle: An avatar primitive for Lit templates.
description: An avatar primitive for Lit templates.
---

# Avatar

An avatar primitive for Lit templates.

## Demo

### Tailwind

This example shows how to implement the component using Tailwind CSS.

```tsx
/* index.tsx */
import * as React from 'react';
import { LitAvatar } from './LitAvatar';

export default function ExampleAvatar() {
  return (
    <div style={{ display: 'flex', gap: 20 }}>
      <LitAvatar
        className="inline-flex size-12 items-center justify-center overflow-hidden rounded-full bg-gray-100 align-middle text-base font-medium text-gray-900 select-none"
        fallback="LT"
        fallbackClassName="flex size-full items-center justify-center text-base"
        height="48"
        imageClassName="size-full object-cover"
        src="https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?w=128&h=128&dpr=2&q=80"
        width="48"
      />
      <LitAvatar
        className="inline-flex size-12 items-center justify-center overflow-hidden rounded-full bg-gray-100 align-middle text-base font-medium text-gray-900 select-none"
        fallback="LT"
        fallbackClassName="flex size-full items-center justify-center text-base"
      />
    </div>
  );
}
```

```tsx
/* LitAvatar.tsx */
'use client';
import * as React from 'react';
import { html, nothing, render as renderTemplate } from 'lit';
import { Avatar } from '@base-ui/lit/avatar';

interface LitAvatarProps {
  alt?: string | undefined;
  className?: string | undefined;
  fallback?: string | undefined;
  fallbackClassName?: string | undefined;
  height?: string | undefined;
  imageClassName?: string | undefined;
  src?: string | undefined;
  width?: string | undefined;
}

export function LitAvatar(props: LitAvatarProps) {
  const { alt, className, fallback, fallbackClassName, height, imageClassName, src, width } = props;
  const hostRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(
      Avatar.Root({
        className,
        children: html`
          ${src
            ? Avatar.Image({
                alt,
                className: imageClassName,
                height,
                src,
                width,
              })
            : nothing}
          ${fallback
            ? Avatar.Fallback({
                className: fallbackClassName,
                children: fallback,
              })
            : nothing}
        `,
      }),
      host,
    );

    return () => {
      renderTemplate(nothing, host);
    };
  }, [alt, className, fallback, fallbackClassName, height, imageClassName, src, width]);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}
```

### CSS Modules

This example shows how to implement the component using CSS Modules.

```css
/* index.module.css */
.Root {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  vertical-align: middle;
  border-radius: 100%;
  user-select: none;
  font-weight: 500;
  color: var(--color-gray-900);
  background-color: var(--color-gray-100);
  font-size: 1rem;
  line-height: 1;
  overflow: hidden;
  height: 3rem;
  width: 3rem;
}

.Image {
  object-fit: cover;
  height: 100%;
  width: 100%;
}

.Fallback {
  align-items: center;
  display: flex;
  justify-content: center;
  height: 100%;
  width: 100%;
  font-size: 1rem;
}
```

```tsx
/* index.tsx */
import * as React from 'react';
import { LitAvatar } from './LitAvatar';
import styles from './index.module.css';

export default function ExampleAvatar() {
  return (
    <div style={{ display: 'flex', gap: 20 }}>
      <LitAvatar
        className={styles.Root}
        fallback="LT"
        fallbackClassName={styles.Fallback}
        height="48"
        imageClassName={styles.Image}
        src="https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?w=128&h=128&dpr=2&q=80"
        width="48"
      />
      <LitAvatar className={styles.Root} fallback="LT" fallbackClassName={styles.Fallback} />
    </div>
  );
}
```

```tsx
/* LitAvatar.tsx */
'use client';
import * as React from 'react';
import { html, nothing, render as renderTemplate } from 'lit';
import { Avatar } from '@base-ui/lit/avatar';

interface LitAvatarProps {
  alt?: string | undefined;
  className?: string | undefined;
  fallback?: string | undefined;
  fallbackClassName?: string | undefined;
  height?: string | undefined;
  imageClassName?: string | undefined;
  src?: string | undefined;
  width?: string | undefined;
}

export function LitAvatar(props: LitAvatarProps) {
  const { alt, className, fallback, fallbackClassName, height, imageClassName, src, width } = props;
  const hostRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(
      Avatar.Root({
        className,
        children: html`
          ${src
            ? Avatar.Image({
                alt,
                className: imageClassName,
                height,
                src,
                width,
              })
            : nothing}
          ${fallback
            ? Avatar.Fallback({
                className: fallbackClassName,
                children: fallback,
              })
            : nothing}
        `,
      }),
      host,
    );

    return () => {
      renderTemplate(nothing, host);
    };
  }, [alt, className, fallback, fallbackClassName, height, imageClassName, src, width]);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}
```

## Anatomy

```ts title="Anatomy"
import { html, render } from 'lit';
import { Avatar } from '@base-ui/lit/avatar';

render(
  Avatar.Root({
    children: html`
      ${Avatar.Image({ src: '/avatar.jpg', alt: 'Ada Lovelace' })}
      ${Avatar.Fallback({ children: 'AL' })}
    `,
  }),
  mountNode,
);
```

## Status

The Lit docs are being wired up around the current package surface. This page focuses on live examples and real package entrypoints.
