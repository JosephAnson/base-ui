---
title: Checkbox Group
subtitle: A shared-state checkbox group for Lit templates.
description: A shared-state checkbox group for Lit templates.
---

# Checkbox Group

A shared-state checkbox group for Lit templates.

## Demo

### Tailwind

This example shows how to implement the component using Tailwind CSS.

```tsx
/* index.tsx */
'use client';
import * as React from 'react';
import { html } from 'lit';
import { Checkbox } from '@base-ui/lit/checkbox';
import { LitCheckboxGroup } from './LitCheckboxGroup';
import { checkIcon } from './icons';

export default function ExampleCheckboxGroup() {
  const id = React.useId();

  return (
    <LitCheckboxGroup
      groupProps={{
        'aria-labelledby': id,
        className: 'flex flex-col items-start gap-1 text-gray-900',
        defaultValue: ['fuji-apple'],
      }}
    >
      {html`
        <div class="font-medium" id=${id}>Apples</div>

        <label class="flex items-center gap-2">
          ${Checkbox.Root({
            name: 'apple',
            value: 'fuji-apple',
            className:
              'flex size-5 items-center justify-center rounded-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800 data-[checked]:bg-gray-900 data-[unchecked]:border data-[unchecked]:border-gray-300',
            children: Checkbox.Indicator({
              className: 'flex text-gray-50 data-[unchecked]:hidden',
              children: checkIcon('size-3'),
            }),
          })}
          Fuji
        </label>

        <label class="flex items-center gap-2">
          ${Checkbox.Root({
            name: 'apple',
            value: 'gala-apple',
            className:
              'flex size-5 items-center justify-center rounded-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800 data-[checked]:bg-gray-900 data-[unchecked]:border data-[unchecked]:border-gray-300',
            children: Checkbox.Indicator({
              className: 'flex text-gray-50 data-[unchecked]:hidden',
              children: checkIcon('size-3'),
            }),
          })}
          Gala
        </label>

        <label class="flex items-center gap-2">
          ${Checkbox.Root({
            name: 'apple',
            value: 'granny-smith-apple',
            className:
              'flex size-5 items-center justify-center rounded-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800 data-[checked]:bg-gray-900 data-[unchecked]:border data-[unchecked]:border-gray-300',
            children: Checkbox.Indicator({
              className: 'flex text-gray-50 data-[unchecked]:hidden',
              children: checkIcon('size-3'),
            }),
          })}
          Granny Smith
        </label>
      `}
    </LitCheckboxGroup>
  );
}
```

```tsx
/* LitCheckboxGroup.tsx */
'use client';
import * as React from 'react';
import { nothing, render as renderTemplate, type TemplateResult } from 'lit';
import type { CheckboxGroupProps } from '@base-ui/lit/checkbox-group';
import { CheckboxGroup } from '@base-ui/lit/checkbox-group';

export interface LitCheckboxGroupProps {
  children?: TemplateResult | TemplateResult[] | undefined;
  groupProps?: CheckboxGroupProps | undefined;
}

export function LitCheckboxGroup(props: LitCheckboxGroupProps) {
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const { children, groupProps } = props;

  React.useEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(CheckboxGroup({ ...groupProps, children }), host);

    return () => {
      renderTemplate(nothing, host);
    };
  }, [children, groupProps]);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}
```

```ts
/* icons.ts */
import { svg } from 'lit';

export function checkIcon(className?: string) {
  return svg`<svg
    fill="currentcolor"
    width="10"
    height="10"
    viewBox="0 0 10 10"
    class=${className ?? ''}
  >
    <path
      d="M9.1603 1.12218C9.50684 1.34873 9.60427 1.81354 9.37792 2.16038L5.13603 8.66012C5.01614 8.8438 4.82192 8.96576 4.60451 8.99384C4.3871 9.02194 4.1683 8.95335 4.00574 8.80615L1.24664 6.30769C0.939709 6.02975 0.916013 5.55541 1.19372 5.24822C1.47142 4.94102 1.94536 4.91731 2.2523 5.19524L4.36085 7.10461L8.12299 1.33999C8.34934 0.993152 8.81376 0.895638 9.1603 1.12218Z"
    />
  </svg>`;
}

export function horizontalRuleIcon(className?: string) {
  return svg`<svg
    width="10"
    height="10"
    viewBox="0 0 24 24"
    fill="currentcolor"
    xmlns="http://www.w3.org/2000/svg"
    class=${className ?? ''}
  >
    <line
      x1="3"
      y1="12"
      x2="21"
      y2="12"
      stroke="currentColor"
      stroke-width="3"
      stroke-linecap="round"
    />
  </svg>`;
}
```

### CSS Modules

This example shows how to implement the component using CSS Modules.

```tsx
/* index.tsx */
'use client';
import * as React from 'react';
import { html } from 'lit';
import { Checkbox } from '@base-ui/lit/checkbox';
import styles from 'docs/src/app/(docs)/react/components/checkbox-group/demos/hero/css-modules/index.module.css';
import { LitCheckboxGroup } from './LitCheckboxGroup';
import { checkIcon } from './icons';

export default function ExampleCheckboxGroup() {
  const id = React.useId();

  return (
    <LitCheckboxGroup
      groupProps={{
        'aria-labelledby': id,
        className: styles.CheckboxGroup,
        defaultValue: ['fuji-apple'],
      }}
    >
      {html`
        <div class=${styles.Caption} id=${id}>Apples</div>

        <label class=${styles.Item}>
          ${Checkbox.Root({
            name: 'apple',
            value: 'fuji-apple',
            className: styles.Checkbox,
            children: Checkbox.Indicator({
              className: styles.Indicator,
              children: checkIcon(styles.Icon),
            }),
          })}
          Fuji
        </label>

        <label class=${styles.Item}>
          ${Checkbox.Root({
            name: 'apple',
            value: 'gala-apple',
            className: styles.Checkbox,
            children: Checkbox.Indicator({
              className: styles.Indicator,
              children: checkIcon(styles.Icon),
            }),
          })}
          Gala
        </label>

        <label class=${styles.Item}>
          ${Checkbox.Root({
            name: 'apple',
            value: 'granny-smith-apple',
            className: styles.Checkbox,
            children: Checkbox.Indicator({
              className: styles.Indicator,
              children: checkIcon(styles.Icon),
            }),
          })}
          Granny Smith
        </label>
      `}
    </LitCheckboxGroup>
  );
}
```

```tsx
/* LitCheckboxGroup.tsx */
'use client';
import * as React from 'react';
import { nothing, render as renderTemplate, type TemplateResult } from 'lit';
import type { CheckboxGroupProps } from '@base-ui/lit/checkbox-group';
import { CheckboxGroup } from '@base-ui/lit/checkbox-group';

export interface LitCheckboxGroupProps {
  children?: TemplateResult | TemplateResult[] | undefined;
  groupProps?: CheckboxGroupProps | undefined;
}

export function LitCheckboxGroup(props: LitCheckboxGroupProps) {
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const { children, groupProps } = props;

  React.useEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(CheckboxGroup({ ...groupProps, children }), host);

    return () => {
      renderTemplate(nothing, host);
    };
  }, [children, groupProps]);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}
```

```ts
/* icons.ts */
import { svg } from 'lit';

export function checkIcon(className?: string) {
  return svg`<svg
    fill="currentcolor"
    width="10"
    height="10"
    viewBox="0 0 10 10"
    class=${className ?? ''}
  >
    <path
      d="M9.1603 1.12218C9.50684 1.34873 9.60427 1.81354 9.37792 2.16038L5.13603 8.66012C5.01614 8.8438 4.82192 8.96576 4.60451 8.99384C4.3871 9.02194 4.1683 8.95335 4.00574 8.80615L1.24664 6.30769C0.939709 6.02975 0.916013 5.55541 1.19372 5.24822C1.47142 4.94102 1.94536 4.91731 2.2523 5.19524L4.36085 7.10461L8.12299 1.33999C8.34934 0.993152 8.81376 0.895638 9.1603 1.12218Z"
    />
  </svg>`;
}

export function horizontalRuleIcon(className?: string) {
  return svg`<svg
    width="10"
    height="10"
    viewBox="0 0 24 24"
    fill="currentcolor"
    xmlns="http://www.w3.org/2000/svg"
    class=${className ?? ''}
  >
    <line
      x1="3"
      y1="12"
      x2="21"
      y2="12"
      stroke="currentColor"
      stroke-width="3"
      stroke-linecap="round"
    />
  </svg>`;
}
```

## Anatomy

```ts title="Anatomy"
import { html, render } from 'lit';
import { Checkbox } from '@base-ui/lit/checkbox';
import { CheckboxGroup } from '@base-ui/lit/checkbox-group';

render(
  CheckboxGroup({
    children: html` ${Checkbox.Root({ value: 'apple' })} ${Checkbox.Root({ value: 'orange' })} `,
  }),
  mountNode,
);
```

## Status

The Lit docs are being wired up around the current package surface. This page focuses on live examples and real package entrypoints.
