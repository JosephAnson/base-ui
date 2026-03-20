import * as React from 'react';
import { LitCollapsible } from 'docs/src/app/(docs)/lit/components/collapsible/demos/hero/LitCollapsible';
import styles from 'docs/src/app/(docs)/react/components/collapsible/demos/hero/css-modules/index.module.css';

export default function CollapsibleHero() {
  return (
    <div data-testid="screenshot-target" style={{ padding: '1rem' }}>
      <LitCollapsible
        contentClassName={styles.Content}
        panelProps={{ className: styles.Panel }}
        rootProps={{ className: styles.Collapsible }}
        triggerProps={{ className: styles.Trigger }}
        triggerIconClassName={styles.Icon}
      />
    </div>
  );
}
