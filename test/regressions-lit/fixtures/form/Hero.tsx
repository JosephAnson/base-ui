'use client';
import * as React from 'react';
import { html, nothing, render as renderTemplate } from 'lit';
import { Field } from '@base-ui/lit/field';
import { Form } from '@base-ui/lit/form';

export default function FormHero() {
  const hostRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(
      Form({
        className:
          'flex w-full max-w-[22rem] flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)]',
        children: [
          Field.Root({
            name: 'projectName',
            className: 'flex flex-col gap-1',
            children: [
              Field.Label({
                className: 'text-sm font-medium text-gray-900',
                children: 'Project name',
              }),
              Field.Control({
                className:
                  'h-10 rounded-md border border-gray-200 px-3 text-base text-gray-900 outline-none focus:border-blue-800',
                defaultValue: '',
                placeholder: 'Required',
                required: true,
              }),
              Field.Description({
                className: 'text-sm text-gray-600',
                children: 'Visible to your whole team.',
              }),
              Field.Error({
                className: 'text-sm text-red-800',
                match: 'valueMissing',
                children: 'Enter a project name',
              }),
            ],
          }),
          Field.Root({
            name: 'ownerEmail',
            className: 'flex flex-col gap-1',
            children: [
              Field.Label({
                className: 'text-sm font-medium text-gray-900',
                children: 'Owner email',
              }),
              Field.Control({
                className:
                  'h-10 rounded-md border border-gray-200 px-3 text-base text-gray-900 outline-none focus:border-blue-800',
                defaultValue: 'jane@example.com',
                type: 'email',
              }),
            ],
          }),
          html`<button
            class="mt-2 h-10 rounded-md bg-blue-900 px-4 text-sm font-medium text-white"
            type="submit"
          >
            Create workspace
          </button>`,
        ],
      }),
      host,
    );

    return () => {
      renderTemplate(nothing, host);
    };
  }, []);

  return (
    <div
      data-testid="screenshot-target"
      className="flex min-h-[22rem] items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(191,219,254,0.6),_transparent_45%),linear-gradient(180deg,_#f8fafc,_#eef2ff)] p-8"
    >
      <div ref={hostRef} style={{ display: 'contents' }} />
    </div>
  );
}
