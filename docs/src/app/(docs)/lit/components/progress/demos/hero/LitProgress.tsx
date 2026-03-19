'use client';
import * as React from 'react';
import { html, nothing, render as renderTemplate } from 'lit';
import type { ProgressRootProps } from '@base-ui/lit/progress';
import { Progress } from '@base-ui/lit/progress';

interface LitProgressProps extends Pick<ProgressRootProps, 'value'> {
  className?: string | undefined;
  indicatorClassName?: string | undefined;
  label: string;
  labelClassName?: string | undefined;
  trackClassName?: string | undefined;
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
      Progress.Root({
        className,
        value,
        children: html`
          ${Progress.Label({
            className: labelClassName,
            children: label,
          })}
          ${Progress.Value({
            className: valueClassName,
          })}
          ${Progress.Track({
            className: trackClassName,
            children: Progress.Indicator({
              className: indicatorClassName,
            }),
          })}
        `,
      }),
      host,
    );

    return () => {
      renderTemplate(nothing, host);
    };
  }, [className, indicatorClassName, label, labelClassName, trackClassName, value, valueClassName]);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}
