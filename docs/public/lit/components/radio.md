---
title: Radio
subtitle: Radio and radio group primitives for Lit templates.
description: Radio and radio group primitives for Lit templates.
---

# Radio

Radio and radio group primitives for Lit templates.

## Demo

### Tailwind

This example shows how to implement the component using Tailwind CSS.

```tsx
/* index.tsx */
import * as React from 'react';
import { LitRadioGroup } from './LitRadioGroup';

export default function ExampleRadioGroup() {
  return (
    <LitRadioGroup
      caption="Best apple"
      captionClassName="font-medium"
      groupClassName="flex flex-col items-start gap-1 text-gray-900"
      groupProps={{ defaultValue: 'fuji-apple' }}
      indicatorProps={{
        className:
          'flex items-center justify-center data-[unchecked]:hidden before:size-2 before:rounded-full before:bg-gray-50',
      }}
      itemClassName="flex items-center gap-2"
      items={[
        { label: 'Fuji', value: 'fuji-apple' },
        { label: 'Gala', value: 'gala-apple' },
        { label: 'Granny Smith', value: 'granny-smith-apple' },
      ]}
      rootProps={{
        className:
          'flex size-5 items-center justify-center rounded-full border-0 p-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800 data-[checked]:bg-gray-900 data-[unchecked]:border data-[unchecked]:border-gray-300',
      }}
    />
  );
}
```

```tsx
/* LitRadioGroup.tsx */
'use client';
import * as React from 'react';
import { useIsoLayoutEffect } from '@base-ui/utils/useIsoLayoutEffect';
import { html, nothing, render as renderTemplate } from 'lit';
import type { RadioIndicatorProps, RadioRootProps } from '@base-ui/lit/radio';
import { Radio } from '@base-ui/lit/radio';
import type { RadioGroupProps } from '@base-ui/lit/radio-group';
import { RadioGroup } from '@base-ui/lit/radio-group';

export interface LitRadioGroupItem {
  label: string;
  value: string;
  testId?: string | undefined;
}

export interface LitRadioGroupProps {
  caption: string;
  captionClassName?: string | undefined;
  groupClassName?: string | undefined;
  groupProps?: Omit<RadioGroupProps<string>, 'children' | 'render'> | undefined;
  indicatorProps?: RadioIndicatorProps | undefined;
  itemClassName?: string | undefined;
  items: LitRadioGroupItem[];
  rootProps?: Omit<RadioRootProps<string>, 'children' | 'value'> | undefined;
}

export function LitRadioGroup(props: LitRadioGroupProps) {
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const generatedCaptionId = React.useId();
  const {
    caption,
    captionClassName,
    groupClassName,
    groupProps,
    indicatorProps,
    itemClassName,
    items,
    rootProps,
  } = props;
  const captionId = (groupProps?.['aria-labelledby'] as string | undefined) ?? generatedCaptionId;

  useIsoLayoutEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(
      RadioGroup({
        ...groupProps,
        'aria-labelledby': captionId,
        className: mergeClassNames(groupClassName, groupProps?.className as string | undefined),
        children: [
          html`<div class=${captionClassName ?? nothing} id=${captionId}>${caption}</div>`,
          ...items.map((item) => {
            return html`<label class=${itemClassName ?? nothing}>
              ${Radio.Root({
                ...rootProps,
                'data-testid': item.testId,
                className: rootProps?.className,
                value: item.value,
                children: Radio.Indicator(indicatorProps ?? {}),
              })}
              ${item.label}
            </label>`;
          }),
        ],
      }),
      host,
    );

    return () => {
      renderTemplate(nothing, host);
    };
  }, [
    caption,
    captionClassName,
    captionId,
    groupClassName,
    groupProps,
    indicatorProps,
    itemClassName,
    items,
    rootProps,
  ]);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}

function mergeClassNames(...classNames: Array<string | undefined>) {
  return classNames.filter(Boolean).join(' ') || undefined;
}
```

### CSS Modules

This example shows how to implement the component using CSS Modules.

```css
/* index.module.css */
.RadioGroup {
  display: flex;
  flex-direction: column;
  align-items: start;
  gap: 0.25rem;
  color: var(--color-gray-900);
}

.Caption {
  font-weight: 500;
}

.Item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.Radio {
  box-sizing: border-box;
  display: flex;
  width: 1.25rem;
  height: 1.25rem;
  align-items: center;
  justify-content: center;
  border-radius: 100%;
  outline: 0;
  padding: 0;
  margin: 0;
  border: none;

  &[data-unchecked] {
    border: 1px solid var(--color-gray-300);
    background-color: transparent;
  }

  &[data-checked] {
    background-color: var(--color-gray-900);
  }

  &:focus-visible {
    outline: 2px solid var(--color-blue);
    outline-offset: 2px;
  }
}

.Indicator {
  display: flex;
  align-items: center;
  justify-content: center;

  &[data-unchecked] {
    display: none;
  }

  &::before {
    content: '';
    border-radius: 100%;
    width: 0.5rem;
    height: 0.5rem;
    background-color: var(--color-gray-50);
  }
}
```

```tsx
/* index.tsx */
import * as React from 'react';
import { LitRadioGroup } from './LitRadioGroup';
import styles from './index.module.css';

export default function ExampleRadioGroup() {
  return (
    <LitRadioGroup
      caption="Best apple"
      captionClassName={styles.Caption}
      groupClassName={styles.RadioGroup}
      groupProps={{ defaultValue: 'fuji-apple' }}
      indicatorProps={{ className: styles.Indicator }}
      itemClassName={styles.Item}
      items={[
        { label: 'Fuji', value: 'fuji-apple' },
        { label: 'Gala', value: 'gala-apple' },
        { label: 'Granny Smith', value: 'granny-smith-apple' },
      ]}
      rootProps={{ className: styles.Radio }}
    />
  );
}
```

```tsx
/* LitRadioGroup.tsx */
'use client';
import * as React from 'react';
import { useIsoLayoutEffect } from '@base-ui/utils/useIsoLayoutEffect';
import { html, nothing, render as renderTemplate } from 'lit';
import type { RadioIndicatorProps, RadioRootProps } from '@base-ui/lit/radio';
import { Radio } from '@base-ui/lit/radio';
import type { RadioGroupProps } from '@base-ui/lit/radio-group';
import { RadioGroup } from '@base-ui/lit/radio-group';

export interface LitRadioGroupItem {
  label: string;
  value: string;
  testId?: string | undefined;
}

export interface LitRadioGroupProps {
  caption: string;
  captionClassName?: string | undefined;
  groupClassName?: string | undefined;
  groupProps?: Omit<RadioGroupProps<string>, 'children' | 'render'> | undefined;
  indicatorProps?: RadioIndicatorProps | undefined;
  itemClassName?: string | undefined;
  items: LitRadioGroupItem[];
  rootProps?: Omit<RadioRootProps<string>, 'children' | 'value'> | undefined;
}

export function LitRadioGroup(props: LitRadioGroupProps) {
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const generatedCaptionId = React.useId();
  const {
    caption,
    captionClassName,
    groupClassName,
    groupProps,
    indicatorProps,
    itemClassName,
    items,
    rootProps,
  } = props;
  const captionId = (groupProps?.['aria-labelledby'] as string | undefined) ?? generatedCaptionId;

  useIsoLayoutEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(
      RadioGroup({
        ...groupProps,
        'aria-labelledby': captionId,
        className: mergeClassNames(groupClassName, groupProps?.className as string | undefined),
        children: [
          html`<div class=${captionClassName ?? nothing} id=${captionId}>${caption}</div>`,
          ...items.map((item) => {
            return html`<label class=${itemClassName ?? nothing}>
              ${Radio.Root({
                ...rootProps,
                'data-testid': item.testId,
                className: rootProps?.className,
                value: item.value,
                children: Radio.Indicator(indicatorProps ?? {}),
              })}
              ${item.label}
            </label>`;
          }),
        ],
      }),
      host,
    );

    return () => {
      renderTemplate(nothing, host);
    };
  }, [
    caption,
    captionClassName,
    captionId,
    groupClassName,
    groupProps,
    indicatorProps,
    itemClassName,
    items,
    rootProps,
  ]);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}

function mergeClassNames(...classNames: Array<string | undefined>) {
  return classNames.filter(Boolean).join(' ') || undefined;
}
```

## Anatomy

```ts title="Anatomy"
import { html, render } from 'lit';
import { Radio } from '@base-ui/lit/radio';
import { RadioGroup } from '@base-ui/lit/radio-group';

render(
  RadioGroup({
    children: html`${Radio.Root({ value: 'system', children: Radio.Indicator() })}`,
  }),
  mountNode,
);
```

## Status

The Lit docs are being wired up around the current package surface. This page focuses on live examples and real package entrypoints.
