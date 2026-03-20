---
title: Progress
subtitle: A progress indicator for determinate loading states.
description: A progress indicator for determinate loading states.
---

# Progress

A progress indicator for determinate loading states.

## Demo

### Tailwind

This example shows how to implement the component using Tailwind CSS.

```tsx
/* index.tsx */
'use client';
import * as React from 'react';
import { LitProgress } from './LitProgress';

export default function ExampleProgress() {
  const [value, setValue] = React.useState(20);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setValue((current) => Math.min(100, Math.round(current + Math.random() * 25)));
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return (
    <LitProgress
      className="grid w-48 grid-cols-2 gap-y-2"
      indicatorClassName="block bg-gray-500 transition-all duration-500"
      label="Export data"
      labelClassName="text-sm font-medium text-gray-900"
      trackClassName="col-span-full h-1 overflow-hidden rounded-sm bg-gray-200 shadow-[inset_0_0_0_1px] shadow-gray-200"
      value={value}
      valueClassName="col-start-2 text-right text-sm text-gray-900"
    />
  );
}
```

```tsx
/* LitProgress.tsx */
'use client';
import * as React from 'react';
import { html, nothing, render as renderTemplate } from 'lit';
import type { ProgressRootProps } from '@base-ui/lit/progress';
import { Progress } from '@base-ui/lit/progress';

interface LitProgressProps extends Pick<ProgressRootProps, 'value'> {
  className?: string | undefined;
  indicatorClassName?: string | undefined;
  label: string;
  labelClassName?: string | undefined;
  trackClassName?: string | undefined;
  valueClassName?: string | undefined;
}

export function LitProgress(props: LitProgressProps) {
  const {
    className,
    indicatorClassName,
    label,
    labelClassName,
    trackClassName,
    value,
    valueClassName,
  } = props;
  const hostRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(
      Progress.Root({
        className,
        value,
        children: html`
          ${Progress.Label({
            className: labelClassName,
            children: label,
          })}
          ${Progress.Value({
            className: valueClassName,
          })}
          ${Progress.Track({
            className: trackClassName,
            children: Progress.Indicator({
              className: indicatorClassName,
            }),
          })}
        `,
      }),
      host,
    );

    return () => {
      renderTemplate(nothing, host);
    };
  }, [className, indicatorClassName, label, labelClassName, trackClassName, value, valueClassName]);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}
```

### CSS Modules

This example shows how to implement the component using CSS Modules.

```css
/* index.module.css */
.Progress {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-gap: 0.25rem;
  grid-row-gap: 0.5rem;
  width: 12rem;
}

.Label {
  font-size: 0.875rem;
  line-height: 1.25rem;
  font-weight: 500;
  color: var(--color-gray-900);
}

.Value {
  grid-column-start: 2;
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.25rem;
  color: var(--color-gray-900);
  text-align: right;
}

.Track {
  grid-column: 1 / 3;
  overflow: hidden;
  background-color: var(--color-gray-200);
  box-shadow: inset 0 0 0 1px var(--color-gray-200);
  height: 0.25rem;
  border-radius: 0.25rem;
}

.Indicator {
  display: block;
  background-color: var(--color-gray-500);
  transition: width 500ms;
}
```

```tsx
/* index.tsx */
'use client';
import * as React from 'react';
import { LitProgress } from './LitProgress';
import styles from './index.module.css';

export default function ExampleProgress() {
  const [value, setValue] = React.useState(20);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setValue((current) => Math.min(100, Math.round(current + Math.random() * 25)));
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return (
    <LitProgress
      className={styles.Progress}
      indicatorClassName={styles.Indicator}
      label="Export data"
      labelClassName={styles.Label}
      trackClassName={styles.Track}
      value={value}
      valueClassName={styles.Value}
    />
  );
}
```

```tsx
/* LitProgress.tsx */
'use client';
import * as React from 'react';
import { html, nothing, render as renderTemplate } from 'lit';
import type { ProgressRootProps } from '@base-ui/lit/progress';
import { Progress } from '@base-ui/lit/progress';

interface LitProgressProps extends Pick<ProgressRootProps, 'value'> {
  className?: string | undefined;
  indicatorClassName?: string | undefined;
  label: string;
  labelClassName?: string | undefined;
  trackClassName?: string | undefined;
  valueClassName?: string | undefined;
}

export function LitProgress(props: LitProgressProps) {
  const {
    className,
    indicatorClassName,
    label,
    labelClassName,
    trackClassName,
    value,
    valueClassName,
  } = props;
  const hostRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(
      Progress.Root({
        className,
        value,
        children: html`
          ${Progress.Label({
            className: labelClassName,
            children: label,
          })}
          ${Progress.Value({
            className: valueClassName,
          })}
          ${Progress.Track({
            className: trackClassName,
            children: Progress.Indicator({
              className: indicatorClassName,
            }),
          })}
        `,
      }),
      host,
    );

    return () => {
      renderTemplate(nothing, host);
    };
  }, [className, indicatorClassName, label, labelClassName, trackClassName, value, valueClassName]);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}
```

## Anatomy

```ts title="Anatomy"
import { render } from 'lit';
import { Progress } from '@base-ui/lit/progress';

render(
  Progress.Root({
    value: 60,
    children: [Progress.Track({ children: Progress.Indicator() }), Progress.Value()],
  }),
  mountNode,
);
```

## Status

The Lit docs are being wired up around the current package surface. This page focuses on live examples and real package entrypoints.
