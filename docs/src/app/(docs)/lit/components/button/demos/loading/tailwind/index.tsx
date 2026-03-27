'use client';
import * as React from 'react';
import { useTimeout } from '@base-ui/utils/useTimeout';
import { html, nothing, render as renderTemplate } from 'lit';
import '@base-ui/lit/button';

export default function ExampleButton() {
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
        class="flex items-center justify-center h-10 px-3.5 m-0 outline-0 border border-gray-200 rounded-md bg-gray-50 font-inherit text-base font-medium leading-6 text-gray-900 select-none hover:data-[disabled]:bg-gray-50 hover:bg-gray-100 active:data-[disabled]:bg-gray-50 active:bg-gray-200 active:shadow-[inset_0_1px_3px_rgba(0,0,0,0.1)] active:border-t-gray-300 active:data-[disabled]:shadow-none active:data-[disabled]:border-t-gray-200 focus-visible:outline-2 focus-visible:outline-blue-800 focus-visible:-outline-offset-1 data-[disabled]:text-gray-500"
        ?disabled=${loading}
        .focusableWhenDisabled=${true}
        @click=${() => {
          setLoading(true);
          timeout.start(4000, () => {
            setLoading(false);
          });
        }}
        >${loading ? 'Submitting' : 'Submit'}</button-root
      >`,
      host,
    );

    return () => {
      renderTemplate(nothing, host);
    };
  }, [loading, timeout]);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}
