---
title: Checkbox
subtitle: An easily stylable checkbox for Lit templates.
description: An easily stylable checkbox for Lit templates.
---

# Checkbox

An easily stylable checkbox for Lit templates.

## Demo

### Tailwind

This example shows how to implement the component using Tailwind CSS.

```tsx
/* index.tsx */
import * as React from 'react';
import { LitCheckbox } from './LitCheckbox';

export default function ExampleCheckbox() {
  return (
    <label className="flex items-center gap-2 text-base text-gray-900">
      <LitCheckbox
        rootProps={{
          className:
            'flex size-5 items-center justify-center rounded border border-gray-300 bg-transparent text-gray-50 outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 data-[checked]:border-gray-900 data-[checked]:bg-gray-900 data-[indeterminate]:border-gray-900 data-[indeterminate]:bg-gray-900',
          defaultChecked: true,
        }}
        indicatorProps={{ className: 'flex data-[unchecked]:hidden' }}
      />
      Enable notifications
    </label>
  );
}
```

```tsx
/* LitCheckbox.tsx */
'use client';
import * as React from 'react';
import { nothing, render as renderTemplate, svg, type TemplateResult } from 'lit';
import type { CheckboxIndicatorProps, CheckboxRootProps } from '@base-ui/lit/checkbox';
import { Checkbox } from '@base-ui/lit/checkbox';

export interface LitCheckboxProps {
  rootProps?: CheckboxRootProps | undefined;
  indicatorProps?: CheckboxIndicatorProps | undefined;
  indicatorChildren?: TemplateResult | undefined;
}

export function LitCheckbox(props: LitCheckboxProps) {
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const { indicatorChildren, indicatorProps, rootProps } = props;

  React.useEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(
      Checkbox.Root({
        ...rootProps,
        children: Checkbox.Indicator({
          ...indicatorProps,
          children: indicatorChildren ?? checkIcon(),
        }),
      }),
      host,
    );

    return () => {
      renderTemplate(nothing, host);
    };
  }, [indicatorChildren, indicatorProps, rootProps]);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}

function checkIcon() {
  return svg`<svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
    <path d="M9.1603 1.12218C9.50684 1.34873 9.60427 1.81354 9.37792 2.16038L5.13603 8.66012C5.01614 8.8438 4.82192 8.96576 4.60451 8.99384C4.3871 9.02194 4.1683 8.95335 4.00574 8.80615L1.24664 6.30769C0.939709 6.02975 0.916013 5.55541 1.19372 5.24822C1.47142 4.94102 1.94536 4.91731 2.2523 5.19524L4.36085 7.10461L8.12299 1.33999C8.34934 0.993152 8.81376 0.895638 9.1603 1.12218Z" />
  </svg>`;
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

.Checkbox {
  box-sizing: border-box;
  display: flex;
  width: 1.25rem;
  height: 1.25rem;
  align-items: center;
  justify-content: center;
  border-radius: 0.25rem;
  outline: 0;
  padding: 0;
  margin: 0;
  border: none;

  &[data-unchecked] {
    border: 1px solid var(--color-gray-300);
    background-color: transparent;
  }

  &[data-checked],
  &[data-indeterminate] {
    background-color: var(--color-gray-900);
  }

  &:focus-visible {
    outline: 2px solid var(--color-blue);
    outline-offset: 2px;
  }
}

.Indicator {
  display: flex;
  color: var(--color-gray-50);

  &[data-unchecked] {
    display: none;
  }
}
```

```tsx
/* index.tsx */
import * as React from 'react';
import { LitCheckbox } from './LitCheckbox';
import styles from './index.module.css';

export default function ExampleCheckbox() {
  return (
    <label className={styles.Label}>
      <LitCheckbox
        rootProps={{ defaultChecked: true, className: styles.Checkbox }}
        indicatorProps={{ className: styles.Indicator }}
      />
      Enable notifications
    </label>
  );
}
```

```tsx
/* LitCheckbox.tsx */
'use client';
import * as React from 'react';
import { nothing, render as renderTemplate, svg, type TemplateResult } from 'lit';
import type { CheckboxIndicatorProps, CheckboxRootProps } from '@base-ui/lit/checkbox';
import { Checkbox } from '@base-ui/lit/checkbox';

export interface LitCheckboxProps {
  rootProps?: CheckboxRootProps | undefined;
  indicatorProps?: CheckboxIndicatorProps | undefined;
  indicatorChildren?: TemplateResult | undefined;
}

export function LitCheckbox(props: LitCheckboxProps) {
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const { indicatorChildren, indicatorProps, rootProps } = props;

  React.useEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(
      Checkbox.Root({
        ...rootProps,
        children: Checkbox.Indicator({
          ...indicatorProps,
          children: indicatorChildren ?? checkIcon(),
        }),
      }),
      host,
    );

    return () => {
      renderTemplate(nothing, host);
    };
  }, [indicatorChildren, indicatorProps, rootProps]);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}

function checkIcon() {
  return svg`<svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
    <path d="M9.1603 1.12218C9.50684 1.34873 9.60427 1.81354 9.37792 2.16038L5.13603 8.66012C5.01614 8.8438 4.82192 8.96576 4.60451 8.99384C4.3871 9.02194 4.1683 8.95335 4.00574 8.80615L1.24664 6.30769C0.939709 6.02975 0.916013 5.55541 1.19372 5.24822C1.47142 4.94102 1.94536 4.91731 2.2523 5.19524L4.36085 7.10461L8.12299 1.33999C8.34934 0.993152 8.81376 0.895638 9.1603 1.12218Z" />
  </svg>`;
}
```

## Anatomy

```ts title="Anatomy"
import { html, render } from 'lit';
import { Checkbox } from '@base-ui/lit/checkbox';

render(
  Checkbox.Root({
    children: Checkbox.Indicator({ children: html`<span>✓</span>` }),
  }),
  mountNode,
);
```

## Status

The Lit docs are being wired up around the current package surface. This page focuses on live examples and real package entrypoints.
