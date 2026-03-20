'use client';
import * as React from 'react';
import { html, nothing, render as renderTemplate } from 'lit';
import '@base-ui/lit/field';

export interface LitFieldProps {
  descriptionClassName?: string | undefined;
  errorClassName?: string | undefined;
  inputClassName?: string | undefined;
  labelClassName?: string | undefined;
  rootClassName?: string | undefined;
}

export function LitField(props: LitFieldProps) {
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const { descriptionClassName, errorClassName, inputClassName, labelClassName, rootClassName } =
    props;

  React.useEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(
      html`<field-root class=${rootClassName ?? ''}>
        <field-label class=${labelClassName ?? ''}>Name</field-label>
        <field-control
          class=${inputClassName ?? ''}
          required
          placeholder="Required"
        ></field-control>
        <field-error class=${errorClassName ?? ''} match="valueMissing">
          Please enter your name
        </field-error>
        <field-description class=${descriptionClassName ?? ''}>
          Visible on your profile
        </field-description>
      </field-root>`,
      host,
    );

    return () => {
      renderTemplate(nothing, host);
    };
  }, [descriptionClassName, errorClassName, inputClassName, labelClassName, rootClassName]);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}
