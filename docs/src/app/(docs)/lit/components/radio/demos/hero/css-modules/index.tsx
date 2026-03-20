import * as React from 'react';
import { LitRadioGroup } from '../LitRadioGroup';
import styles from './index.module.css';

export default function ExampleRadioGroup() {
  return (
    <LitRadioGroup
      caption="Best apple"
      captionClassName={styles.Caption}
      groupClassName={styles.RadioGroup}
      groupProps={{ defaultValue: 'fuji-apple' }}
      indicatorProps={{ className: styles.Indicator }}
      itemClassName={styles.Item}
      items={[
        { label: 'Fuji', value: 'fuji-apple' },
        { label: 'Gala', value: 'gala-apple' },
        { label: 'Granny Smith', value: 'granny-smith-apple' },
      ]}
      rootProps={{ className: styles.Radio }}
    />
  );
}
