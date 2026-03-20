import * as React from 'react';
import { LitSwitch } from 'docs/src/app/(docs)/lit/components/switch/demos/hero/LitSwitch';
import styles from 'docs/src/app/(docs)/lit/components/switch/demos/hero/css-modules/index.module.css';

export default function SwitchInteractions() {
  const [checked, setChecked] = React.useState(false);

  return (
    <div style={{ display: 'grid', gap: '1rem', justifyItems: 'start' }}>
      <label data-testid="label" className={styles.Label}>
        <LitSwitch
          rootProps={{
            checked,
            className: styles.Switch,
            onCheckedChange(nextChecked) {
              setChecked(nextChecked);
            },
          }}
          thumbProps={{ className: styles.Thumb }}
        />
        Notifications
      </label>
      <div role="status">{checked ? 'on' : 'off'}</div>
    </div>
  );
}
