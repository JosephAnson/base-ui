'use client';
import * as React from 'react';
import { html, nothing, render as renderTemplate, svg } from 'lit';
import '@base-ui/lit/checkbox';
import styles from './index.module.css';

export default function ExampleCheckbox() {
  const hostRef = React.useRef<HTMLLabelElement | null>(null);

  React.useEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(
      html`<checkbox-root class=${styles.Checkbox} .defaultChecked=${true}>
        <checkbox-indicator class=${styles.Indicator}>${checkIcon()}</checkbox-indicator>
      </checkbox-root>`,
      host,
    );

    return () => {
      renderTemplate(nothing, host);
    };
  }, []);

  return (
    <label className={styles.Label} ref={hostRef}>
      Enable notifications
    </label>
  );
}

function checkIcon() {
  return svg`<svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
    <path d="M9.1603 1.12218C9.50684 1.34873 9.60427 1.81354 9.37792 2.16038L5.13603 8.66012C5.01614 8.8438 4.82192 8.96576 4.60451 8.99384C4.3871 9.02194 4.1683 8.95335 4.00574 8.80615L1.24664 6.30769C0.939709 6.02975 0.916013 5.55541 1.19372 5.24822C1.47142 4.94102 1.94536 4.91731 2.2523 5.19524L4.36085 7.10461L8.12299 1.33999C8.34934 0.993152 8.81376 0.895638 9.1603 1.12218Z" />
  </svg>`;
}
