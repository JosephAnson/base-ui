'use client';
import * as React from 'react';
import { html, nothing, render as renderTemplate } from 'lit';
import '@base-ui/lit/field';

export default function ExampleField() {
  const hostRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(
      html`<field-root class="flex w-full max-w-64 flex-col items-start gap-1">
        <field-label class="text-sm font-bold text-gray-900">Name</field-label>
        <field-control
          class="h-10 w-full rounded-md border border-gray-200 pl-3.5 text-base font-normal text-gray-900 focus:outline-2 focus:-outline-offset-1 focus:outline-blue-800"
          required
          placeholder="Required"
        ></field-control>
        <field-error class="text-sm text-red-800" match="valueMissing">
          Please enter your name
        </field-error>
        <field-description class="text-sm text-gray-600">Visible on your profile</field-description>
      </field-root>`,
      host,
    );

    return () => {
      renderTemplate(nothing, host);
    };
  }, []);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}
