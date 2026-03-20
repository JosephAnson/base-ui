'use client';
import * as React from 'react';
import { html, nothing, render as renderTemplate } from 'lit';
import '@base-ui/lit/switch';

export interface LitSwitchProps {
  rootProps?: {
    className?: string;
    checked?: boolean;
    defaultChecked?: boolean;
    disabled?: boolean;
    name?: string;
    required?: boolean;
  } | undefined;
  thumbProps?: {
    className?: string;
  } | undefined;
}

export function LitSwitch(props: LitSwitchProps) {
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const { rootProps, thumbProps } = props;

  React.useEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(
      html`<switch-root
        class=${rootProps?.className ?? ''}
        ?checked=${rootProps?.defaultChecked ?? false}
        ?disabled=${rootProps?.disabled ?? false}
        ?required=${rootProps?.required ?? false}
        name=${rootProps?.name ?? nothing}
      >
        <switch-thumb class=${thumbProps?.className ?? ''}></switch-thumb>
      </switch-root>`,
      host,
    );

    return () => {
      renderTemplate(nothing, host);
    };
  }, [rootProps, thumbProps]);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}
