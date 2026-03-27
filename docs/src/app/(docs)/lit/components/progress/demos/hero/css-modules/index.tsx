'use client';
import * as React from 'react';
import { html, nothing, render as renderTemplate } from 'lit';
import '@base-ui/lit/progress';
import styles from './index.module.css';

export default function ExampleProgress() {
  const [value, setValue] = React.useState(20);
  const hostRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setValue((current) => Math.min(100, Math.round(current + Math.random() * 25)));
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  React.useEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(
      html`<progress-root class=${styles.Progress} .value=${value}>
        <progress-label class=${styles.Label}>Export data</progress-label>
        <progress-value class=${styles.Value}></progress-value>
        <progress-track class=${styles.Track}>
          <progress-indicator class=${styles.Indicator}></progress-indicator>
        </progress-track>
      </progress-root>`,
      host,
    );

    return () => {
      renderTemplate(nothing, host);
    };
  }, [value]);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}
