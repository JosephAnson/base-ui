'use client';
import * as React from 'react';
import { html, nothing, render as renderTemplate } from 'lit';
import '@base-ui/lit/separator';

interface LitSeparatorProps {
  className?: string | undefined;
  orientation?: 'horizontal' | 'vertical' | undefined;
}

export function LitSeparator(props: LitSeparatorProps) {
  const { className, orientation } = props;
  const hostRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(
      html`<separator-root class=${className ?? ''} orientation=${orientation ?? nothing}></separator-root>`,
      host,
    );

    return () => {
      renderTemplate(nothing, host);
    };
  }, [className, orientation]);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}
