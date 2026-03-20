import * as React from 'react';
import { LitSwitch } from 'docs/src/app/(docs)/lit/components/switch/demos/hero/LitSwitch';
import styles from 'docs/src/app/(docs)/lit/components/switch/demos/hero/css-modules/index.module.css';

export default function SwitchStates() {
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
        <LitSwitch
          rootProps={{ defaultChecked: true, className: styles.Switch }}
          thumbProps={{ className: styles.Thumb }}
        />
        On
      </label>
      <label className={styles.Label}>
        <LitSwitch
          rootProps={{ className: styles.Switch }}
          thumbProps={{ className: styles.Thumb }}
        />
        Off
      </label>
      <label className={styles.Label}>
        <LitSwitch
          rootProps={{ className: styles.Switch, disabled: true }}
          thumbProps={{ className: styles.Thumb }}
        />
        Disabled
      </label>
    </div>
  );
}
