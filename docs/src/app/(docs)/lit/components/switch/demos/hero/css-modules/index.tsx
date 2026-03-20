import * as React from 'react';
import { LitSwitch } from '../LitSwitch';
import styles from './index.module.css';

export default function ExampleSwitch() {
  return (
    <label className={styles.Label}>
      <LitSwitch
        rootProps={{ defaultChecked: true, className: styles.Switch }}
        thumbProps={{ className: styles.Thumb }}
      />
      Notifications
    </label>
  );
}
