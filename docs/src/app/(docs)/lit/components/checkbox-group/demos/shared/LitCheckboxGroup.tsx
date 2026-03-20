'use client';
import * as React from 'react';
import { html, nothing, render as renderTemplate, type TemplateResult } from 'lit';
import '@base-ui/lit/checkbox-group';

export interface LitCheckboxGroupProps {
  children?: TemplateResult | TemplateResult[] | undefined;
  groupProps?: {
    className?: string;
    defaultValue?: string[];
    allValues?: string[];
    value?: string[];
    onValueChange?: (value: string[]) => void;
    'aria-labelledby'?: string;
    style?: Record<string, string>;
  } | undefined;
}

export function LitCheckboxGroup(props: LitCheckboxGroupProps) {
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const { children, groupProps } = props;

  React.useEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(
      html`<checkbox-group
        class=${groupProps?.className ?? ''}
        aria-labelledby=${groupProps?.['aria-labelledby'] ?? nothing}
        .defaultValue=${groupProps?.defaultValue}
        .allValues=${groupProps?.allValues}
        .value=${groupProps?.value}
        .onValueChange=${groupProps?.onValueChange}
        style=${groupProps?.style ? Object.entries(groupProps.style).map(([k, v]) => `${k}: ${v}`).join('; ') : nothing}
      >${children}</checkbox-group>`,
      host,
    );

    return () => {
      renderTemplate(nothing, host);
    };
  }, [children, groupProps]);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}
