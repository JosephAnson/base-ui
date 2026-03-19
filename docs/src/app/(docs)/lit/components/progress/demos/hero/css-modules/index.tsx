'use client';
import * as React from 'react';
import { LitProgress } from '../LitProgress';
import styles from './index.module.css';

export default function ExampleProgress() {
  const [value, setValue] = React.useState(20);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setValue((current) => Math.min(100, Math.round(current + Math.random() * 25)));
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return (
    <LitProgress
      className={styles.Progress}
      indicatorClassName={styles.Indicator}
      label="Export data"
      labelClassName={styles.Label}
      trackClassName={styles.Track}
      value={value}
      valueClassName={styles.Value}
    />
  );
}
