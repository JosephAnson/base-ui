'use client';
import * as React from 'react';
import { html, nothing, render as renderTemplate } from 'lit';
import '@base-ui/lit/collapsible';
import styles from 'docs/src/app/(docs)/react/components/collapsible/demos/hero/css-modules/index.module.css';

export default function ExampleCollapsible() {
  const hostRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(
      html`<collapsible-root class=${styles.Collapsible}>
        <collapsible-trigger class=${styles.Trigger}>
          ${chevronIcon(styles.Icon)} Recovery keys
        </collapsible-trigger>
        <collapsible-panel class=${styles.Panel}>
          <div class=${styles.Content}>
            <div>alien-bean-pasta</div>
            <div>wild-irish-burrito</div>
            <div>horse-battery-staple</div>
          </div>
        </collapsible-panel>
      </collapsible-root>`,
      host,
    );

    return () => {
      renderTemplate(nothing, host);
    };
  }, []);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}

function chevronIcon(className?: string) {
  return html`
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" class=${className ?? ''}>
      <path d="M3.5 9L7.5 5L3.5 1" stroke="currentcolor" />
    </svg>
  `;
}
