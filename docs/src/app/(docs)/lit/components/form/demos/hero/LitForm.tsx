'use client';
import * as React from 'react';
import { html, nothing, render as renderTemplate } from 'lit';
import { Field } from '@base-ui/lit/field';
import { Form } from '@base-ui/lit/form';

export interface LitFormProps {
  buttonClassName?: string | undefined;
  errorClassName?: string | undefined;
  fieldClassName?: string | undefined;
  inputClassName?: string | undefined;
  labelClassName?: string | undefined;
  rootClassName?: string | undefined;
}

export function LitForm(props: LitFormProps) {
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(false);
  const {
    buttonClassName,
    errorClassName,
    fieldClassName,
    inputClassName,
    labelClassName,
    rootClassName,
  } = props;

  React.useEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(
      Form({
        className: rootClassName,
        errors,
        onSubmit: async (event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          const value = String(formData.get('url') ?? '');

          setLoading(true);
          const response = await submitForm(value);
          setErrors({
            ...(response.error ? { url: response.error } : {}),
          });
          setLoading(false);
        },
        children: [
          Field.Root({
            name: 'url',
            className: fieldClassName,
            children: [
              Field.Label({
                className: labelClassName,
                children: 'Homepage',
              }),
              Field.Control({
                className: inputClassName,
                defaultValue: 'https://example.com',
                pattern: 'https?://.*',
                placeholder: 'https://example.com',
                required: true,
                type: 'url',
              }),
              Field.Error({
                className: errorClassName,
              }),
            ],
          }),
          html`<button class=${buttonClassName ?? ''} ?disabled=${loading} type="submit">
            ${loading ? 'Submitting...' : 'Submit'}
          </button>`,
        ],
      }),
      host,
    );

    return () => {
      renderTemplate(nothing, host);
    };
  }, [
    buttonClassName,
    errorClassName,
    errors,
    fieldClassName,
    inputClassName,
    labelClassName,
    loading,
    rootClassName,
  ]);

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
