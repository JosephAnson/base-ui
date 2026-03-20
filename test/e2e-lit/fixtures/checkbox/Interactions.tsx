import * as React from 'react';
import { LitCheckbox } from 'docs/src/app/(docs)/lit/components/checkbox/demos/hero/LitCheckbox';
import styles from 'docs/src/app/(docs)/lit/components/checkbox/demos/hero/css-modules/index.module.css';

export default function CheckboxInteractions() {
  const [checked, setChecked] = React.useState(false);

  return (
    <div style={{ display: 'grid', gap: '1rem', justifyItems: 'start' }}>
      <label data-testid="label" className={styles.Label}>
        <LitCheckbox
          rootProps={{
            checked,
            className: styles.Checkbox,
            onCheckedChange(nextChecked) {
              setChecked(nextChecked);
            },
          }}
          indicatorProps={{ className: styles.Indicator }}
        />
        Enable notifications
      </label>
      <div role="status">{checked ? 'on' : 'off'}</div>
    </div>
  );
}
