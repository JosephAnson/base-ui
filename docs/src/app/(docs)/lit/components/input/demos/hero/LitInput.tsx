'use client';
import * as React from 'react';
import { nothing, render as renderTemplate } from 'lit';
import { Input } from '@base-ui/lit/input';

export function LitInput(props: Input.Props) {
  const hostRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(Input(props), host);

    return () => {
      renderTemplate(nothing, host);
    };
  }, [props]);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}
