'use client';
import { LitField } from '../LitField';
import styles from './index.module.css';

export default function ExampleField() {
  return (
    <LitField
      rootClassName={styles.Field}
      labelClassName={styles.Label}
      inputClassName={styles.Input}
      errorClassName={styles.Error}
      descriptionClassName={styles.Description}
    />
  );
}
