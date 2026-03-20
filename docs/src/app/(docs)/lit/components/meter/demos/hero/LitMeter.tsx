'use client';
import * as React from 'react';
import { html, nothing, render as renderTemplate } from 'lit';
import '@base-ui/lit/meter';

interface LitMeterProps {
  className?: string | undefined;
  indicatorClassName?: string | undefined;
  label: string;
  labelClassName?: string | undefined;
  trackClassName?: string | undefined;
  value?: number | undefined;
  valueClassName?: string | undefined;
}

export function LitMeter(props: LitMeterProps) {
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
      html`<meter-root class=${className ?? ''} .value=${value}>
        <meter-label class=${labelClassName ?? ''}>${label}</meter-label>
        <meter-value class=${valueClassName ?? ''}></meter-value>
        <meter-track class=${trackClassName ?? ''}>
          <meter-indicator class=${indicatorClassName ?? ''}></meter-indicator>
        </meter-track>
      </meter-root>`,
      host,
    );

    return () => {
      renderTemplate(nothing, host);
    };
  }, [className, indicatorClassName, label, labelClassName, trackClassName, value, valueClassName]);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}
