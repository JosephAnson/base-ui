'use client';
import * as React from 'react';
import { html, nothing, render as renderTemplate } from 'lit';
import { Fieldset } from '@base-ui/lit/fieldset';

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
      Fieldset.Root({
        className: fieldsetClassName,
        children: [
          Fieldset.Legend({
            className: legendClassName,
            children: 'Billing details',
          }),
          html`
            <div class=${fieldClassName ?? ''}>
              <label class=${labelClassName ?? ''} for="fieldset-company">Company</label>
              <input
                id="fieldset-company"
                class=${inputClassName ?? ''}
                placeholder="Enter company name"
              />
            </div>
          `,
          html`
            <div class=${fieldClassName ?? ''}>
              <label class=${labelClassName ?? ''} for="fieldset-tax-id">Tax ID</label>
              <input
                id="fieldset-tax-id"
                class=${inputClassName ?? ''}
                placeholder="Enter fiscal number"
              />
            </div>
          `,
        ],
      }),
      host,
    );

    return () => {
      renderTemplate(nothing, host);
    };
  }, [fieldClassName, fieldsetClassName, inputClassName, labelClassName, legendClassName]);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}
