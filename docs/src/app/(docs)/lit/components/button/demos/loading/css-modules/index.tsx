import * as React from 'react';
import { LitLoadingButton } from '../LitLoadingButton';
import styles from './index.module.css';

export default function ExampleButton() {
  return <LitLoadingButton className={styles.Button} />;
}
