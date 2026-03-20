---
title: Meter
subtitle: A semantic meter for bounded values.
description: A semantic meter for bounded values.
---

# Meter

A semantic meter for bounded values.

## Demo

### Tailwind

This example shows how to implement the component using Tailwind CSS.

```tsx
/* index.tsx */
'use client';
import { LitMeter } from './LitMeter';

export default function ExampleMeter() {
  return (
    <LitMeter
      className="box-border grid w-48 grid-cols-2 gap-y-2"
      indicatorClassName="block bg-gray-500 transition-all duration-500"
      label="Storage Used"
      labelClassName="text-sm font-medium text-gray-900"
      trackClassName="col-span-2 block h-2 w-48 overflow-hidden bg-gray-100 shadow-[inset_0_0_0_1px] shadow-gray-200"
      value={24}
      valueClassName="col-start-2 m-0 text-right text-sm leading-5 text-gray-900"
    />
  );
}
```

```tsx
/* LitMeter.tsx */
'use client';
import * as React from 'react';
import { html, nothing, render as renderTemplate } from 'lit';
import type { MeterRootProps } from '@base-ui/lit/meter';
import { Meter } from '@base-ui/lit/meter';

interface LitMeterProps extends Pick<MeterRootProps, 'value'> {
  className?: string | undefined;
  indicatorClassName?: string | undefined;
  label: string;
  labelClassName?: string | undefined;
  trackClassName?: string | undefined;
  valueClassName?: string | undefined;
}

export function LitMeter(props: LitMeterProps) {
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
      Meter.Root({
        className,
        value,
        children: html`
          ${Meter.Label({
            className: labelClassName,
            children: label,
          })}
          ${Meter.Value({
            className: valueClassName,
          })}
          ${Meter.Track({
            className: trackClassName,
            children: Meter.Indicator({
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
.Meter {
  box-sizing: border-box;
  display: grid;
  grid-template-columns: 1fr 1fr;
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
  background-color: var(--color-gray-100);
  box-shadow: inset 0 0 0 1px var(--color-gray-200);
  height: 0.5rem;
}

.Indicator {
  background-color: var(--color-gray-500);
  transition: width 500ms;
}
```

```tsx
/* index.tsx */
'use client';
import { LitMeter } from './LitMeter';
import styles from './index.module.css';

export default function ExampleMeter() {
  return (
    <LitMeter
      className={styles.Meter}
      indicatorClassName={styles.Indicator}
      label="Storage Used"
      labelClassName={styles.Label}
      trackClassName={styles.Track}
      value={24}
      valueClassName={styles.Value}
    />
  );
}
```

```tsx
/* LitMeter.tsx */
'use client';
import * as React from 'react';
import { html, nothing, render as renderTemplate } from 'lit';
import type { MeterRootProps } from '@base-ui/lit/meter';
import { Meter } from '@base-ui/lit/meter';

interface LitMeterProps extends Pick<MeterRootProps, 'value'> {
  className?: string | undefined;
  indicatorClassName?: string | undefined;
  label: string;
  labelClassName?: string | undefined;
  trackClassName?: string | undefined;
  valueClassName?: string | undefined;
}

export function LitMeter(props: LitMeterProps) {
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
      Meter.Root({
        className,
        value,
        children: html`
          ${Meter.Label({
            className: labelClassName,
            children: label,
          })}
          ${Meter.Value({
            className: valueClassName,
          })}
          ${Meter.Track({
            className: trackClassName,
            children: Meter.Indicator({
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
import { Meter } from '@base-ui/lit/meter';

render(
  Meter.Root({
    value: 72,
    children: [Meter.Track({ children: Meter.Indicator() }), Meter.Value(), Meter.Label()],
  }),
  mountNode,
);
```

## Status

The Lit docs are being wired up around the current package surface. This page focuses on live examples and real package entrypoints.
