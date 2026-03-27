'use client';
import * as React from 'react';
import { html, nothing, render as renderTemplate } from 'lit';
import '@base-ui/lit/fieldset';

export default function ExampleFieldset() {
  const hostRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(
      html`<fieldset-root class="flex w-full max-w-64 flex-col gap-4">
        <fieldset-legend class="border-b border-gray-200 pb-3 text-lg font-medium text-gray-900">
          Billing details
        </fieldset-legend>
        <div class="flex flex-col items-start gap-1">
          <label class="text-sm font-medium text-gray-900" for="fieldset-company">Company</label>
          <input
            id="fieldset-company"
            class="h-10 w-full rounded-md border border-gray-200 pl-3.5 text-base text-gray-900 focus:outline-2 focus:-outline-offset-1 focus:outline-blue-800"
            placeholder="Enter company name"
          />
        </div>
        <div class="flex flex-col items-start gap-1">
          <label class="text-sm font-medium text-gray-900" for="fieldset-tax-id">Tax ID</label>
          <input
            id="fieldset-tax-id"
            class="h-10 w-full rounded-md border border-gray-200 pl-3.5 text-base text-gray-900 focus:outline-2 focus:-outline-offset-1 focus:outline-blue-800"
            placeholder="Enter fiscal number"
          />
        </div>
      </fieldset-root>`,
      host,
    );

    return () => {
      renderTemplate(nothing, host);
    };
  }, []);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}
