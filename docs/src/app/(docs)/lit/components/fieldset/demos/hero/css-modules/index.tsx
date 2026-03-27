'use client';
import * as React from 'react';
import { html, nothing, render as renderTemplate } from 'lit';
import '@base-ui/lit/fieldset';
import styles from './index.module.css';

export default function ExampleFieldset() {
  const hostRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(
      html`<fieldset-root class=${styles.Fieldset}>
        <fieldset-legend class=${styles.Legend}>Billing details</fieldset-legend>
        <div class=${styles.Field}>
          <label class=${styles.Label} for="fieldset-company">Company</label>
          <input id="fieldset-company" class=${styles.Input} placeholder="Enter company name" />
        </div>
        <div class=${styles.Field}>
          <label class=${styles.Label} for="fieldset-tax-id">Tax ID</label>
          <input id="fieldset-tax-id" class=${styles.Input} placeholder="Enter fiscal number" />
        </div>
      </fieldset-root>`,
      host,
    );

    return () => {
      renderTemplate(nothing, host);
    };
  }, []);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}
