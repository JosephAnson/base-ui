import * as React from 'react';
import styles from 'docs/src/app/(docs)/react/components/popover/demos/_index.module.css';
import { LitPopover } from '../../shared/LitPopover';

export default function ExamplePopover() {
  return (
    <LitPopover
      arrowClassName={styles.Arrow}
      arrowFillClassName={styles.ArrowFill}
      arrowInnerStrokeClassName={styles.ArrowInnerStroke}
      arrowOuterStrokeClassName={styles.ArrowOuterStroke}
      descriptionClassName={styles.Description}
      iconButtonClassName={styles.IconButton}
      iconClassName={styles.Icon}
      popupClassName={styles.Popup}
      titleClassName={styles.Title}
    />
  );
}
