'use client';
import * as React from 'react';
import { html, nothing, render as renderTemplate } from 'lit';
import '@base-ui/lit/field';
import styles from './index.module.css';

export default function ExampleField() {
  const hostRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(
      html`<field-root class=${styles.Field}>
        <field-label class=${styles.Label}>Name</field-label>
        <field-control class=${styles.Input} required placeholder="Required"></field-control>
        <field-error class=${styles.Error} match="valueMissing">Please enter your name</field-error>
        <field-description class=${styles.Description}>Visible on your profile</field-description>
      </field-root>`,
      host,
    );

    return () => {
      renderTemplate(nothing, host);
    };
  }, []);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}
