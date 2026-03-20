---
title: useRender
subtitle: Utility for building renderable Lit primitives with overridable roots.
description: Utility for building renderable Lit primitives with overridable roots.
---

# useRender

Utility for building renderable Lit primitives with overridable roots.

The `useRender` utility lets Lit primitives expose a `render` override while keeping Base UI state attributes and merged props behavior.

## Demo

### CSS Modules

This example shows how to implement the component using CSS Modules.

```css
/* index.module.css */
.Text {
  font-size: 0.875rem;
  line-height: 1rem;
  color: var(--color-gray-900);

  strong& {
    font-weight: 500;
  }
}
```

```tsx
/* index.tsx */
'use client';
import * as React from 'react';
import { html, nothing, render as renderTemplate, type TemplateResult } from 'lit';
import { useRender } from '@base-ui/lit/use-render';
import styles from './index.module.css';

interface TextProps {
  children: string;
  render?: TemplateResult | undefined;
}

function Text(props: TextProps) {
  const { children, render } = props;
  const hostRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (hostRef.current == null) {
      return undefined;
    }

    const template = useRender({
      defaultTagName: 'p',
      render,
      props: {
        className: styles.Text,
        children,
      },
    });

    renderTemplate(template, hostRef.current);

    return () => {
      renderTemplate(nothing, hostRef.current!);
    };
  }, [children, render]);

  return <div ref={hostRef} />;
}

export default function ExampleText() {
  return (
    <div>
      <Text>Text component rendered as a paragraph tag</Text>
      <Text render={html`<strong></strong>`}>Text component rendered as a strong tag</Text>
    </div>
  );
}
```

## Examples

The callback form receives the merged props bag and state so the caller can control exactly how the final root is assembled.

## Merging props

`useRender` is designed to work with `mergeProps`, so package primitives can combine their internal props with caller-supplied props before the final template is rendered.

```ts title="Using useRender"
import { html } from 'lit';
import { mergeProps } from '@base-ui/lit/merge-props';
import { useRender } from '@base-ui/lit/use-render';

const template = useRender({
  defaultTagName: 'button',
  props: mergeProps({ className: 'Button', type: 'button' }, { children: 'Click me' }),
  render: (props) =>
    html`<button class=${String(props.className ?? '')}>${props.children}</button>`,
});
```

## Status

The Lit docs are being wired up around the current package surface. This page focuses on the current API shape and usage patterns already used by the package.
