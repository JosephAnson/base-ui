import * as React from 'react';
import { html } from 'lit';
import { LitButton } from 'docs/src/app/(docs)/lit/components/button/demos/hero/LitButton';
import styles from 'docs/src/app/(docs)/lit/components/button/demos/hero/css-modules/index.module.css';

export default function ButtonKeyboard() {
  const [customPressCount, setCustomPressCount] = React.useState(0);
  const [disabledPressCount, setDisabledPressCount] = React.useState(0);

  return (
    <div style={{ display: 'grid', gap: '1rem', justifyItems: 'start' }}>
      <div>
        <p>Custom button press count</p>
        <output aria-live="polite" data-testid="custom-count">
          {customPressCount}
        </output>
      </div>
      <LitButton
        className={styles.Button}
        nativeButton={false}
        render={html`<span></span>`}
        onClick={() => {
          setCustomPressCount((value) => value + 1);
        }}
      >
        Custom action
      </LitButton>

      <div>
        <p>Disabled button press count</p>
        <output aria-live="polite" data-testid="disabled-count">
          {disabledPressCount}
        </output>
      </div>
      <LitButton
        className={styles.Button}
        disabled
        focusableWhenDisabled
        onClick={() => {
          setDisabledPressCount((value) => value + 1);
        }}
      >
        Unavailable action
      </LitButton>
    </div>
  );
}
