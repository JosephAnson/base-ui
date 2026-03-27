'use client';
import * as React from 'react';
import { useIsoLayoutEffect } from '@base-ui/utils/useIsoLayoutEffect';
import { html, nothing, render as renderTemplate } from 'lit';
import '@base-ui/lit/radio';
import '@base-ui/lit/radio-group';
import styles from './index.module.css';

export default function ExampleRadioGroup() {
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const id = React.useId();

  useIsoLayoutEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(
      html`<radio-group
        class=${styles.RadioGroup}
        aria-labelledby=${id}
        .defaultValue=${'fuji-apple'}
      >
        <div class=${styles.Caption} id=${id}>Best apple</div>

        <label class=${styles.Item}>
          <radio-root class=${styles.Radio} .value=${'fuji-apple'}>
            <radio-indicator class=${styles.Indicator}></radio-indicator>
          </radio-root>
          Fuji
        </label>

        <label class=${styles.Item}>
          <radio-root class=${styles.Radio} .value=${'gala-apple'}>
            <radio-indicator class=${styles.Indicator}></radio-indicator>
          </radio-root>
          Gala
        </label>

        <label class=${styles.Item}>
          <radio-root class=${styles.Radio} .value=${'granny-smith-apple'}>
            <radio-indicator class=${styles.Indicator}></radio-indicator>
          </radio-root>
          Granny Smith
        </label>
      </radio-group>`,
      host,
    );

    return () => {
      renderTemplate(nothing, host);
    };
  }, [id]);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}
