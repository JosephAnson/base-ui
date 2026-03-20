import * as React from 'react';
import { html } from 'lit';
import { LitButton } from 'docs/src/app/(docs)/lit/components/button/demos/hero/LitButton';
import { LitLoadingButton } from 'docs/src/app/(docs)/lit/components/button/demos/loading/LitLoadingButton';
import styles from 'docs/src/app/(docs)/lit/components/button/demos/hero/css-modules/index.module.css';

export default function ButtonStates() {
  return (
    <div
      data-testid="screenshot-target"
      style={{
        display: 'flex',
        gap: '1rem',
        alignItems: 'center',
        flexWrap: 'wrap',
        padding: '1rem',
      }}
    >
      <LitButton className={styles.Button}>Submit</LitButton>
      <LitButton className={styles.Button} disabled>
        Disabled
      </LitButton>
      <LitButton className={styles.Button} disabled focusableWhenDisabled>
        Focusable disabled
      </LitButton>
      <LitButton className={styles.Button} nativeButton={false} render={html`<span></span>`}>
        Custom element
      </LitButton>
      <LitLoadingButton className={styles.Button} />
    </div>
  );
}
