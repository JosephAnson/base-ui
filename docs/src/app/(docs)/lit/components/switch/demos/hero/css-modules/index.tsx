'use client';
import * as React from 'react';
import { html, nothing, render as renderTemplate } from 'lit';
import '@base-ui/lit/switch';
import styles from './index.module.css';

export default function ExampleSwitch() {
  const hostRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(
      html`<label class=${styles.Label}>
        <switch-root class=${styles.Switch} default-checked>
          <switch-thumb class=${styles.Thumb}></switch-thumb>
        </switch-root>
        Notifications
      </label>`,
      host,
    );

    return () => {
      renderTemplate(nothing, host);
    };
  }, []);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}
