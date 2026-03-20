'use client';
import * as React from 'react';
import { nothing, render as renderTemplate } from 'lit';
import { Field } from '@base-ui/lit/field';
import styles from './Input.module.css';

export default function InputValidateOnChange() {
  const hostRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(
      Field.Root({
        validationMode: 'onChange',
        validate: (value) => (value === 'abcd' ? 'custom error' : null),
        className: styles.Root,
        children: [
          Field.Control({
            required: true,
            minLength: 3,
            defaultValue: '',
            className: styles.Control,
          }),
          Field.Error({
            'data-testid': 'error',
            className: styles.Error,
            match: 'valueMissing',
            children: 'valueMissing error',
          }),
          Field.Error({
            'data-testid': 'error',
            className: styles.Error,
            match: 'tooShort',
            children: 'tooShort error',
          }),
          Field.Error({
            'data-testid': 'error',
            className: styles.Error,
            match: 'customError',
          }),
        ],
      }),
      host,
    );

    return () => {
      renderTemplate(nothing, host);
    };
  }, []);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}
