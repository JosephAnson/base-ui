'use client';
import * as React from 'react';
import { html, nothing, render as renderTemplate } from 'lit';
import type { MeterRootProps } from '@base-ui/lit/meter';
import { Meter } from '@base-ui/lit/meter';

interface LitMeterProps extends Pick<MeterRootProps, 'value'> {
  className?: string | undefined;
  indicatorClassName?: string | undefined;
  label: string;
  labelClassName?: string | undefined;
  trackClassName?: string | undefined;
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
      Meter.Root({
        className,
        value,
        children: html`
          ${Meter.Label({
            className: labelClassName,
            children: label,
          })}
          ${Meter.Value({
            className: valueClassName,
          })}
          ${Meter.Track({
            className: trackClassName,
            children: Meter.Indicator({
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
