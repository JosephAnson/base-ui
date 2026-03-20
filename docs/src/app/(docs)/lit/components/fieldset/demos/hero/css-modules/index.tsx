import * as React from 'react';
import { LitFieldset } from '../LitFieldset';
import styles from './index.module.css';

export default function ExampleFieldset() {
  return (
    <LitFieldset
      fieldClassName={styles.Field}
      fieldsetClassName={styles.Fieldset}
      inputClassName={styles.Input}
      labelClassName={styles.Label}
      legendClassName={styles.Legend}
    />
  );
}
