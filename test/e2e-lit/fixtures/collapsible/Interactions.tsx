import * as React from 'react';
import { useIsoLayoutEffect } from '@base-ui/utils/useIsoLayoutEffect';
import { html, nothing, render as renderTemplate } from 'lit';
import { Collapsible } from '@base-ui/lit/collapsible';
import styles from 'docs/src/app/(docs)/react/components/collapsible/demos/hero/css-modules/index.module.css';

export default function CollapsibleInteractions() {
  const hostRef = React.useRef<HTMLDivElement | null>(null);

  useIsoLayoutEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(
      Collapsible.Root({
        className: styles.Collapsible,
        children: [
          Collapsible.Trigger({
            'data-testid': 'trigger',
            className: styles.Trigger,
            children: [chevronIcon(styles.Icon), 'Recovery keys'],
          }),
          Collapsible.Panel({
            'data-testid': 'panel',
            className: styles.Panel,
            children: html`<div class=${styles.Content}>
              <div>alien-bean-pasta</div>
              <div>wild-irish-burrito</div>
              <div>horse-battery-staple</div>
            </div>`,
          }),
        ],
      }),
      host,
    );

    return () => {
      renderTemplate(nothing, host);
    };
  }, []);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}

function chevronIcon(className: string) {
  return html`
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" class=${className}>
      <path d="M3.5 9L7.5 5L3.5 1" stroke="currentcolor" />
    </svg>
  `;
}
