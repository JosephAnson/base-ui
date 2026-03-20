'use client';
import * as React from 'react';
import { useTimeout } from '@base-ui/utils/useTimeout';
import { html, nothing, render as renderTemplate } from 'lit';
import '@base-ui/lit/button';

interface LitLoadingButtonProps {
  className?: string | undefined;
}

export function LitLoadingButton(props: LitLoadingButtonProps) {
  const { className } = props;
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const timeout = useTimeout();
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(
      html`<button-root
        class=${className ?? ''}
        ?disabled=${loading}
        .focusableWhenDisabled=${true}
        @click=${() => {
          setLoading(true);
          timeout.start(4000, () => {
            setLoading(false);
          });
        }}
      >${loading ? 'Submitting' : 'Submit'}</button-root>`,
      host,
    );

    return () => {
      renderTemplate(nothing, host);
    };
  }, [className, loading, timeout]);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}
