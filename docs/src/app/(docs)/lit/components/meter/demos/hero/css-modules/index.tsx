'use client';
import { LitMeter } from '../LitMeter';
import styles from './index.module.css';

export default function ExampleMeter() {
  return (
    <LitMeter
      className={styles.Meter}
      indicatorClassName={styles.Indicator}
      label="Storage Used"
      labelClassName={styles.Label}
      trackClassName={styles.Track}
      value={24}
      valueClassName={styles.Value}
    />
  );
}
