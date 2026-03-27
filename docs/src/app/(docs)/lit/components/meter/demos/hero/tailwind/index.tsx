'use client';
import * as React from 'react';
import { html, nothing, render as renderTemplate } from 'lit';
import '@base-ui/lit/meter';

export default function ExampleMeter() {
  const hostRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(
      html`<meter-root class="box-border grid w-48 grid-cols-2 gap-y-2" .value=${24}>
        <meter-label class="text-sm font-normal text-gray-900">Storage Used</meter-label>
        <meter-value
          class="col-start-2 m-0 text-right text-sm leading-5 text-gray-900"
        ></meter-value>
        <meter-track
          class="col-span-2 block h-2 w-48 overflow-hidden bg-gray-100 shadow-[inset_0_0_0_1px] shadow-gray-200"
        >
          <meter-indicator class="block bg-gray-500 transition-all duration-500"></meter-indicator>
        </meter-track>
      </meter-root>`,
      host,
    );

    return () => {
      renderTemplate(nothing, host);
    };
  }, []);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}
