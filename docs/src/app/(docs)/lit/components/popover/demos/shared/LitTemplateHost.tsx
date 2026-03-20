'use client';
import * as React from 'react';
import { nothing, render as renderTemplate, type TemplateResult } from 'lit';

export interface LitTemplateHostProps {
  template: () => TemplateResult;
}

export function LitTemplateHost(props: LitTemplateHostProps) {
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const { template } = props;

  React.useEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(template(), host);

    return () => {
      renderTemplate(nothing, host);
    };
  }, [template]);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}
