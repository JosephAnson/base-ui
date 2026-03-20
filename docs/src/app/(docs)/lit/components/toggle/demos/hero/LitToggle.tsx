'use client';
import * as React from 'react';
import { nothing, render as renderTemplate } from 'lit';
import type { ToggleProps } from '@base-ui/lit/toggle';
import { Toggle } from '@base-ui/lit/toggle';

export function LitToggle(props: ToggleProps<string>) {
  const hostRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(Toggle(props), host);

    return () => {
      renderTemplate(nothing, host);
    };
  }, [props]);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}
