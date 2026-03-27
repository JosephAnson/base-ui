'use client';
import * as React from 'react';
import { html, nothing, render as renderTemplate, type TemplateResult } from 'lit';
import '@base-ui/lit/toggle';
import '@base-ui/lit/toggle-group';

interface LitToggleGroupProps {
  'aria-label'?: string | undefined;
  children?: TemplateResult | undefined;
  className?: string | undefined;
  defaultValue?: readonly string[] | undefined;
  multiple?: boolean | undefined;
}

export function LitToggleGroup(props: LitToggleGroupProps) {
  const { children, className, defaultValue, multiple } = props;
  const ariaLabel = props['aria-label'];
  const hostRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(
      html`<toggle-group-root
        class=${className ?? ''}
        aria-label=${ariaLabel ?? nothing}
        .defaultValue=${defaultValue == null ? undefined : [...defaultValue]}
        ?multiple=${multiple ?? false}
      >
        ${children}
      </toggle-group-root>`,
      host,
    );

    return () => {
      renderTemplate(nothing, host);
    };
  }, [ariaLabel, children, className, defaultValue, multiple]);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}
