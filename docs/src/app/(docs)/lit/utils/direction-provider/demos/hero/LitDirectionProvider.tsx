'use client';
import * as React from 'react';
import { html, nothing, render as renderTemplate } from 'lit';
import '@base-ui/lit/direction-provider';
import '@base-ui/lit/slider';

interface LitDirectionProviderProps {
  controlClassName?: string | undefined;
  indicatorClassName?: string | undefined;
  thumbClassName?: string | undefined;
  trackClassName?: string | undefined;
}

export function LitDirectionProvider(props: LitDirectionProviderProps) {
  const { controlClassName, indicatorClassName, thumbClassName, trackClassName } = props;
  const hostRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(
      html`<div dir="rtl">
        <direction-provider direction="rtl">
          <slider-root .defaultValue=${25}>
            <slider-control class=${controlClassName ?? ''}>
              <slider-track class=${trackClassName ?? ''}>
                <slider-indicator class=${indicatorClassName ?? ''}></slider-indicator>
                <slider-thumb class=${thumbClassName ?? ''}></slider-thumb>
              </slider-track>
            </slider-control>
          </slider-root>
        </direction-provider>
      </div>`,
      host,
    );

    return () => {
      renderTemplate(nothing, host);
    };
  }, [controlClassName, indicatorClassName, thumbClassName, trackClassName]);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}
