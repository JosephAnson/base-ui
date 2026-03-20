import * as React from 'react';
import { useIsoLayoutEffect } from '@base-ui/utils/useIsoLayoutEffect';
import { html, nothing, render as renderTemplate } from 'lit';
import { Radio } from '@base-ui/lit/radio';
import { RadioGroup } from '@base-ui/lit/radio-group';
import styles from 'docs/src/app/(docs)/lit/components/radio/demos/hero/css-modules/index.module.css';

export default function RadioStates() {
  const hostRef = React.useRef<HTMLDivElement | null>(null);

  useIsoLayoutEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(
      RadioGroup({
        'aria-labelledby': 'apples-caption',
        className: styles.RadioGroup,
        defaultValue: 'gala-apple',
        children: [
          html`<div class=${styles.Caption} id="apples-caption">Best apple</div>`,
          html`<label class=${styles.Item}>
            ${Radio.Root({
              className: styles.Radio,
              value: 'fuji-apple',
              children: Radio.Indicator({ className: styles.Indicator }),
            })}
            Fuji
          </label>`,
          html`<label class=${styles.Item}>
            ${Radio.Root({
              className: styles.Radio,
              value: 'gala-apple',
              children: Radio.Indicator({ className: styles.Indicator }),
            })}
            Gala
          </label>`,
          html`<label class=${styles.Item}>
            ${Radio.Root({
              className: styles.Radio,
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

  return (
    <div data-testid="screenshot-target" style={{ padding: '1rem' }}>
      <div ref={hostRef} style={{ display: 'contents' }} />
    </div>
  );
}
