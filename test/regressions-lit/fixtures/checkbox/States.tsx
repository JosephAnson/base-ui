import * as React from 'react';
import { LitCheckbox } from 'docs/src/app/(docs)/lit/components/checkbox/demos/hero/LitCheckbox';
import styles from 'docs/src/app/(docs)/lit/components/checkbox/demos/hero/css-modules/index.module.css';

export default function CheckboxStates() {
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
      <label className={styles.Label}>
        <LitCheckbox
          rootProps={{ defaultChecked: true, className: styles.Checkbox }}
          indicatorProps={{ className: styles.Indicator }}
        />
        On
      </label>
      <label className={styles.Label}>
        <LitCheckbox
          rootProps={{ className: styles.Checkbox }}
          indicatorProps={{ className: styles.Indicator }}
        />
        Off
      </label>
      <label className={styles.Label}>
        <LitCheckbox
          rootProps={{ className: styles.Checkbox, indeterminate: true }}
          indicatorProps={{ className: styles.Indicator }}
        />
        Mixed
      </label>
      <label className={styles.Label}>
        <LitCheckbox
          rootProps={{ className: styles.Checkbox, disabled: true }}
          indicatorProps={{ className: styles.Indicator }}
        />
        Disabled
      </label>
    </div>
  );
}
