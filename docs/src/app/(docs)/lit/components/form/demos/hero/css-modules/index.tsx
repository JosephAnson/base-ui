'use client';
import * as React from 'react';
import { html, nothing, render as renderTemplate } from 'lit';
import '@base-ui/lit/field';
import '@base-ui/lit/form';
import styles from './index.module.css';

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
        class=${styles.Form}
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
        <field-root name="url" class=${styles.Field}>
          <field-label class=${styles.Label}>Homepage</field-label>
          <field-control
            class=${styles.Input}
            .defaultValue=${'https://example.com'}
            pattern="https?://.*"
            placeholder="https://example.com"
            required
            type="url"
          ></field-control>
          <field-error class=${styles.Error}></field-error>
        </field-root>
        <button class=${styles.Button} ?disabled=${loading} type="submit">
          ${loading ? 'Submitting...' : 'Submit'}
        </button>
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
