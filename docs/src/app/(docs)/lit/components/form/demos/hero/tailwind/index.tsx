'use client';
import * as React from 'react';
import { html, nothing, render as renderTemplate } from 'lit';
import '@base-ui/lit/field';
import '@base-ui/lit/form';

export default function ExampleForm() {
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(
      html`<form-root
        .errors=${errors}
        .onSubmit=${async (event: SubmitEvent) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget as HTMLFormElement);
          const value = String(formData.get('url') ?? '');

          setLoading(true);
          const response = await submitForm(value);
          setErrors({
            ...(response.error ? { url: response.error } : {}),
          });
          setLoading(false);
        }}
      >
        <form class="flex w-full max-w-64 flex-col gap-4">
          <field-root name="url" class="flex flex-col items-start gap-1">
            <field-label class="text-sm font-bold text-gray-900">Homepage</field-label>
            <field-control
              class="h-10 w-full rounded-md border border-gray-200 pl-3.5 text-base font-normal text-gray-900 focus:outline-2 focus:-outline-offset-1 focus:outline-blue-800"
              .defaultValue=${'https://example.com'}
              pattern="https?://.*"
              placeholder="https://example.com"
              required
              type="url"
            ></field-control>
            <field-error class="text-sm text-red-800"></field-error>
          </field-root>
          <button
            class="flex h-10 items-center justify-center rounded-md border border-gray-200 bg-gray-50 px-3.5 text-base font-normal leading-6 text-gray-900 outline-0 select-none hover:enabled:bg-gray-100 active:enabled:border-t-gray-300 active:enabled:bg-gray-200 active:enabled:shadow-[inset_0_1px_3px_rgba(0,0,0,0.1)] focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-blue-800 disabled:text-gray-500"
            ?disabled=${loading}
            type="submit"
          >
            ${loading ? 'Submitting...' : 'Submit'}
          </button>
        </form>
      </form-root>`,
      host,
    );

    return () => {
      renderTemplate(nothing, host);
    };
  }, [errors, loading]);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}

async function submitForm(value: string) {
  await new Promise((resolve) => {
    setTimeout(resolve, 1000);
  });

  try {
    const url = new URL(value);

    if (url.hostname.endsWith('example.com')) {
      return { error: 'The example domain is not allowed' };
    }
  } catch {
    return { error: 'This is not a valid URL' };
  }

  return { success: true };
}
