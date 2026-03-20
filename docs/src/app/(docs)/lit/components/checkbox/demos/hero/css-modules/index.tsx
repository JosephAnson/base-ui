import * as React from 'react';
import { LitCheckbox } from '../LitCheckbox';
import styles from './index.module.css';

export default function ExampleCheckbox() {
  return (
    <label className={styles.Label}>
      <LitCheckbox
        rootProps={{ defaultChecked: true, className: styles.Checkbox }}
        indicatorProps={{ className: styles.Indicator }}
      />
      Enable notifications
    </label>
  );
}
