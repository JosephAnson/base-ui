'use client';
import * as React from 'react';
import { nothing, render as renderTemplate } from 'lit';
import { Separator } from '@base-ui/lit/separator';

export function LitSeparator(props: Separator.Props) {
  const hostRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(Separator(props), host);

    return () => {
      renderTemplate(nothing, host);
    };
  }, [props]);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}
