'use client';
import * as React from 'react';
import { html, nothing, render as renderTemplate } from 'lit';
import type {
  CollapsiblePanelProps,
  CollapsibleRootProps,
  CollapsibleTriggerProps,
} from '@base-ui/lit/collapsible';
import { Collapsible } from '@base-ui/lit/collapsible';

export interface LitCollapsibleProps {
  contentClassName?: string | undefined;
  panelProps?: CollapsiblePanelProps | undefined;
  rootProps?: CollapsibleRootProps | undefined;
  triggerProps?: CollapsibleTriggerProps | undefined;
  triggerIconClassName?: string | undefined;
}

export function LitCollapsible(props: LitCollapsibleProps) {
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const { contentClassName, panelProps, rootProps, triggerProps, triggerIconClassName } = props;

  React.useEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(
      Collapsible.Root({
        ...rootProps,
        children: [
          Collapsible.Trigger({
            ...triggerProps,
            children: [chevronIcon(triggerIconClassName), 'Recovery keys'],
          }),
          Collapsible.Panel({
            ...panelProps,
            children: html`<div class=${contentClassName ?? ''}>
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
  }, [contentClassName, panelProps, rootProps, triggerIconClassName, triggerProps]);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}

function chevronIcon(className?: string) {
  return html`
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" class=${className ?? ''}>
      <path d="M3.5 9L7.5 5L3.5 1" stroke="currentcolor" />
    </svg>
  `;
}
