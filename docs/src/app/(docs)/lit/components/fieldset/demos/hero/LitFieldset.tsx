'use client';
import * as React from 'react';
import { html, nothing, render as renderTemplate } from 'lit';
import '@base-ui/lit/fieldset';

interface LitFieldsetProps {
  fieldClassName?: string | undefined;
  fieldsetClassName?: string | undefined;
  inputClassName?: string | undefined;
  labelClassName?: string | undefined;
  legendClassName?: string | undefined;
}

export function LitFieldset(props: LitFieldsetProps) {
  const { fieldClassName, fieldsetClassName, inputClassName, labelClassName, legendClassName } =
    props;
  const hostRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(
      html`<fieldset-root class=${fieldsetClassName ?? ''}>
        <fieldset-legend class=${legendClassName ?? ''}>Billing details</fieldset-legend>
        <div class=${fieldClassName ?? ''}>
          <label class=${labelClassName ?? ''} for="fieldset-company">Company</label>
          <input
            id="fieldset-company"
            class=${inputClassName ?? ''}
            placeholder="Enter company name"
          />
        </div>
        <div class=${fieldClassName ?? ''}>
          <label class=${labelClassName ?? ''} for="fieldset-tax-id">Tax ID</label>
          <input
            id="fieldset-tax-id"
            class=${inputClassName ?? ''}
            placeholder="Enter fiscal number"
          />
        </div>
      </fieldset-root>`,
      host,
    );

    return () => {
      renderTemplate(nothing, host);
    };
  }, [fieldClassName, fieldsetClassName, inputClassName, labelClassName, legendClassName]);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}
