'use client';
import * as React from 'react';
import { html, nothing, render as renderTemplate } from 'lit';
import { Switch } from '@base-ui/lit/switch';
import styles from './index.module.css';

export default function ExampleSwitchNativeButton() {
  const hostRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(
      html`<div class=${styles.Root}>
        <label class=${styles.Label} for="notifications-switch">Notifications</label>
        ${Switch.Root({
          id: 'notifications-switch',
          nativeButton: true,
          render: html`<button></button>`,
          className: styles.Switch,
          children: Switch.Thumb({
            className: styles.Thumb,
          }),
        })}
      </div>`,
      host,
    );

    return () => {
      renderTemplate(nothing, host);
    };
  }, []);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}
