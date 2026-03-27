'use client';
import * as React from 'react';
import { html, nothing, render as renderTemplate } from 'lit';
import '@base-ui/lit/progress';

export default function ExampleProgress() {
  const [value, setValue] = React.useState(20);
  const hostRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setValue((current) => Math.min(100, Math.round(current + Math.random() * 25)));
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  React.useEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(
      html`<progress-root class="grid w-48 grid-cols-2 gap-y-2" .value=${value}>
        <progress-label class="text-sm font-normal text-gray-900">Export data</progress-label>
        <progress-value class="col-start-2 text-right text-sm text-gray-900"></progress-value>
        <progress-track
          class="col-span-full h-1 overflow-hidden rounded-sm bg-gray-200 shadow-[inset_0_0_0_1px] shadow-gray-200"
        >
          <progress-indicator
            class="block bg-gray-500 transition-all duration-500"
          ></progress-indicator>
        </progress-track>
      </progress-root>`,
      host,
    );

    return () => {
      renderTemplate(nothing, host);
    };
  }, [value]);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}
