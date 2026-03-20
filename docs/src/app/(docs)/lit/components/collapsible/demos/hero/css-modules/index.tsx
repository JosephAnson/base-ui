import * as React from 'react';
import styles from 'docs/src/app/(docs)/react/components/collapsible/demos/hero/css-modules/index.module.css';
import { LitCollapsible } from '../LitCollapsible';

export default function ExampleCollapsible() {
  return (
    <LitCollapsible
      contentClassName={styles.Content}
      panelProps={{ className: styles.Panel }}
      rootProps={{ className: styles.Collapsible }}
      triggerProps={{ className: styles.Trigger }}
      triggerIconClassName={styles.Icon}
    />
  );
}
