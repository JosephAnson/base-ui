import * as React from 'react';
import { LitQuickStartCard } from '../LitQuickStartCard';
import styles from './index.module.css';

export default function ExampleQuickStartCard() {
  return (
    <LitQuickStartCard
      buttonClassName={styles.Button}
      cardClassName={styles.Card}
      descriptionClassName={styles.Description}
      errorClassName={styles.Error}
      fieldClassName={styles.Field}
      inputClassName={styles.Input}
      labelClassName={styles.Label}
      surfaceClassName={styles.Surface}
    />
  );
}
