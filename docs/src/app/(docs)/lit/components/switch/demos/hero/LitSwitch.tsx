'use client';
import * as React from 'react';
import { nothing, render as renderTemplate } from 'lit';
import type { SwitchRootProps, SwitchThumbProps } from '@base-ui/lit/switch';
import { Switch } from '@base-ui/lit/switch';

export interface LitSwitchProps {
  rootProps?: SwitchRootProps | undefined;
  thumbProps?: SwitchThumbProps | undefined;
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
      Switch.Root({
        ...rootProps,
        children: Switch.Thumb(thumbProps ?? {}),
      }),
      host,
    );

    return () => {
      renderTemplate(nothing, host);
    };
  }, [rootProps, thumbProps]);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}
