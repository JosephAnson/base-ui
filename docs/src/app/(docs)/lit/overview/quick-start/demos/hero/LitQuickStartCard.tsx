'use client';
import * as React from 'react';
import { html, nothing, render as renderTemplate } from 'lit';
import '@base-ui/lit/button';
import '@base-ui/lit/field';

export interface LitQuickStartCardProps {
  buttonClassName?: string | undefined;
  cardClassName?: string | undefined;
  descriptionClassName?: string | undefined;
  errorClassName?: string | undefined;
  fieldClassName?: string | undefined;
  inputClassName?: string | undefined;
  labelClassName?: string | undefined;
  surfaceClassName?: string | undefined;
}

export function LitQuickStartCard(props: LitQuickStartCardProps) {
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const {
    buttonClassName,
    cardClassName,
    descriptionClassName,
    errorClassName,
    fieldClassName,
    inputClassName,
    labelClassName,
    surfaceClassName,
  } = props;

  React.useEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(
      html`
        <div class=${surfaceClassName ?? ''}>
          <div class=${cardClassName ?? ''}>
            <field-root class=${fieldClassName ?? ''}>
              <field-label class=${labelClassName ?? ''}>Project name</field-label>
              <field-control
                class=${inputClassName ?? ''}
                placeholder="Required"
                required
              ></field-control>
              <field-description class=${descriptionClassName ?? ''}>
                Visible to your whole team.
              </field-description>
              <field-error class=${errorClassName ?? ''} match="valueMissing">
                Enter a project name
              </field-error>
            </field-root>
            <button-root class=${buttonClassName ?? ''}>Create workspace</button-root>
          </div>
        </div>
      `,
      host,
    );

    return () => {
      renderTemplate(nothing, host);
    };
  }, [
    buttonClassName,
    cardClassName,
    descriptionClassName,
    errorClassName,
    fieldClassName,
    inputClassName,
    labelClassName,
    surfaceClassName,
  ]);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}
