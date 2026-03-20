'use client';
import { LitInput } from '../LitInput';
import styles from './index.module.css';

export default function ExampleInput() {
  return (
    <label className={styles.Label}>
      Name
      <LitInput placeholder="Enter your name" className={styles.Input} />
    </label>
  );
}
