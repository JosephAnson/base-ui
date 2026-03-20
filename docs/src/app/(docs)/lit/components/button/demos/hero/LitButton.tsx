'use client';
import * as React from 'react';
import { nothing, render as renderTemplate } from 'lit';
import { Button } from '@base-ui/lit/button';

export function LitButton(props: Button.Props) {
  const hostRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(Button(props), host);

    return () => {
      renderTemplate(nothing, host);
    };
  }, [props]);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}
