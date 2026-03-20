'use client';
import * as React from 'react';
import { html, nothing, render as renderTemplate } from 'lit';
import '@base-ui/lit/input';

interface LitInputProps {
  className?: string | undefined;
  placeholder?: string | undefined;
}

export function LitInput(props: LitInputProps) {
  const { className, placeholder } = props;
  const hostRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(
      html`<input-root><input class=${className ?? ''} placeholder=${placeholder ?? nothing} /></input-root>`,
      host,
    );

    return () => {
      renderTemplate(nothing, host);
    };
  }, [className, placeholder]);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}
