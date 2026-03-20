'use client';
import * as React from 'react';
import { nothing, render as renderTemplate } from 'lit';
import { Field } from '@base-ui/lit/field';

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
      Field.Root({
        className: rootClassName,
        children: [
          Field.Label({
            className: labelClassName,
            children: 'Name',
          }),
          Field.Control({
            required: true,
            defaultValue: '',
            placeholder: 'Required',
            className: inputClassName,
          }),
          Field.Error({
            className: errorClassName,
            match: 'valueMissing',
            children: 'Please enter your name',
          }),
          Field.Description({
            className: descriptionClassName,
            children: 'Visible on your profile',
          }),
        ],
      }),
      host,
    );

    return () => {
      renderTemplate(nothing, host);
    };
  }, [descriptionClassName, errorClassName, inputClassName, labelClassName, rootClassName]);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}
