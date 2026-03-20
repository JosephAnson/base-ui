import * as React from 'react';
import { LitAccordion } from '../../shared/LitAccordion';
import styles from '../../_index.module.css';

export default function ExampleAccordion() {
  return (
    <LitAccordion
      contentClassName={styles.Content}
      headerClassName={styles.Header}
      itemClassName={styles.Item}
      panelClassName={styles.Panel}
      rootProps={{ className: styles.Accordion, multiple: true }}
      triggerClassName={styles.Trigger}
      triggerIconClassName={styles.TriggerIcon}
    />
  );
}
