import * as React from 'react';
import { LitButton } from '../LitButton';
import styles from './index.module.css';

export default function ExampleButton() {
  return <LitButton className={styles.Button}>Submit</LitButton>;
}
