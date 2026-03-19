'use client';
import * as React from 'react';
import { html, render as renderTemplate } from 'lit';
import { useRender } from '@base-ui/lit/use-render';
import styles from './index.module.css';

function Counter() {
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const [count, setCount] = React.useState(0);
  const odd = count % 2 === 1;

  React.useEffect(() => {
    if (hostRef.current == null) {
      return undefined;
    }

    const template = useRender({
      defaultTagName: 'button',
      state: { odd },
      props: {
        className: styles.Button,
        type: 'button',
        onclick: () => setCount((previous) => previous + 1),
        'aria-label': `Count is ${count}, click to increase.`,
        children: html`Counter: <span>${count}</span>`,
      },
      render: (props, state) => html`
        <button
          class=${String(props.className ?? '')}
          type=${String(props.type ?? 'button')}
          aria-label=${String(props['aria-label'] ?? '')}
          @click=${props.onclick as (event: Event) => void}
        >
          ${props.children}
          <span class=${styles.suffix}>${state.odd ? '👎' : '👍'}</span>
        </button>
      `,
    });

    renderTemplate(template, hostRef.current);

    return () => {
      renderTemplate(html``, hostRef.current!);
    };
  }, [count, odd]);

  return <div ref={hostRef} />;
}

export default function ExampleCounter() {
  return <Counter />;
}
