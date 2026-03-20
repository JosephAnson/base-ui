import * as React from 'react';
import { LitAvatar } from '../LitAvatar';
import styles from './index.module.css';

export default function ExampleAvatar() {
  return (
    <div style={{ display: 'flex', gap: 20 }}>
      <LitAvatar
        className={styles.Root}
        fallback="LT"
        fallbackClassName={styles.Fallback}
        height="48"
        imageClassName={styles.Image}
        src="https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?w=128&h=128&dpr=2&q=80"
        width="48"
      />
      <LitAvatar className={styles.Root} fallback="LT" fallbackClassName={styles.Fallback} />
    </div>
  );
}
