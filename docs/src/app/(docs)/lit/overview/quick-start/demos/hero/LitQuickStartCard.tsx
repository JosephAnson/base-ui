'use client';
import * as React from 'react';
import { html, nothing, render as renderTemplate } from 'lit';
import { Button } from '@base-ui/lit/button';
import { Field } from '@base-ui/lit/field';

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
            ${Field.Root({
              className: fieldClassName,
              children: [
                Field.Label({
                  className: labelClassName,
                  children: 'Project name',
                }),
                Field.Control({
                  className: inputClassName,
                  defaultValue: '',
                  placeholder: 'Required',
                  required: true,
                }),
                Field.Description({
                  className: descriptionClassName,
                  children: 'Visible to your whole team.',
                }),
                Field.Error({
                  className: errorClassName,
                  match: 'valueMissing',
                  children: 'Enter a project name',
                }),
              ],
            })}
            ${Button({
              className: buttonClassName,
              children: 'Create workspace',
            })}
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
