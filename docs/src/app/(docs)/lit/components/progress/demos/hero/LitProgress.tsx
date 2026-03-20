'use client';
import * as React from 'react';
import { html, nothing, render as renderTemplate } from 'lit';
import '@base-ui/lit/progress';

interface LitProgressProps {
  className?: string | undefined;
  indicatorClassName?: string | undefined;
  label: string;
  labelClassName?: string | undefined;
  trackClassName?: string | undefined;
  value?: number | undefined;
  valueClassName?: string | undefined;
}

export function LitProgress(props: LitProgressProps) {
  const {
    className,
    indicatorClassName,
    label,
    labelClassName,
    trackClassName,
    value,
    valueClassName,
  } = props;
  const hostRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(
      html`<progress-root class=${className ?? ''} .value=${value}>
        <progress-label class=${labelClassName ?? ''}>${label}</progress-label>
        <progress-value class=${valueClassName ?? ''}></progress-value>
        <progress-track class=${trackClassName ?? ''}>
          <progress-indicator class=${indicatorClassName ?? ''}></progress-indicator>
        </progress-track>
      </progress-root>`,
      host,
    );

    return () => {
      renderTemplate(nothing, host);
    };
  }, [className, indicatorClassName, label, labelClassName, trackClassName, value, valueClassName]);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}
