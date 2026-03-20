import * as React from 'react';
import { useIsoLayoutEffect } from '@base-ui/utils/useIsoLayoutEffect';
import { html, nothing, render as renderTemplate } from 'lit';
import { Radio } from '@base-ui/lit/radio';
import { RadioGroup } from '@base-ui/lit/radio-group';
import styles from './Radio.module.css';

export default function ExampleRadioGroup() {
  const hostRef = React.useRef<HTMLDivElement | null>(null);

  useIsoLayoutEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(
      RadioGroup({
        'aria-labelledby': 'apples-caption',
        className: styles.Root,
        defaultValue: 'fuji-apple',
        children: [
          html`<div class=${styles.Caption} id="apples-caption">Best apple</div>`,
          html`<label class=${styles.Label}>
            ${Radio.Root({
              className: styles.RadioRoot,
              'data-testid': 'one',
              value: 'fuji-apple',
              children: Radio.Indicator({ className: styles.Indicator }),
            })}
            Fuji
          </label>`,
          html`<label class=${styles.Label}>
            ${Radio.Root({
              className: styles.RadioRoot,
              'data-testid': 'two',
              value: 'gala-apple',
              children: Radio.Indicator({ className: styles.Indicator }),
            })}
            Gala
          </label>`,
          html`<label class=${styles.Label}>
            ${Radio.Root({
              className: styles.RadioRoot,
              'data-testid': 'three',
              value: 'granny-smith-apple',
              children: Radio.Indicator({ className: styles.Indicator }),
            })}
            Granny Smith
          </label>`,
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
