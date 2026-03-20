'use client';
import { LitForm } from '../LitForm';
import styles from './index.module.css';

export default function ExampleForm() {
  return (
    <LitForm
      rootClassName={styles.Form}
      fieldClassName={styles.Field}
      labelClassName={styles.Label}
      inputClassName={styles.Input}
      errorClassName={styles.Error}
      buttonClassName={styles.Button}
    />
  );
}
