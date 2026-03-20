'use client';
import * as React from 'react';
import { html, nothing, render as renderTemplate } from 'lit';
import '@base-ui/lit/button';

interface LitButtonProps {
  children?: string | undefined;
  className?: string | undefined;
  disabled?: boolean | undefined;
}

export function LitButton(props: LitButtonProps) {
  const { children, className, disabled } = props;
  const hostRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(
      html`<button-root class=${className ?? ''} ?disabled=${disabled ?? false}>${children}</button-root>`,
      host,
    );

    return () => {
      renderTemplate(nothing, host);
    };
  }, [children, className, disabled]);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}
