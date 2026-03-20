import { LitTooltipDetachedControlled } from '../../shared/LitTooltipDemos';
import styles from 'docs/src/app/(docs)/react/components/tooltip/demos/index.module.css';

export default function TooltipDetachedTriggersControlledCssModulesDemo() {
  return (
    <LitTooltipDetachedControlled
      arrowClassName={styles.Arrow}
      containerClassName={styles.Container}
      iconClassName={styles.Icon}
      popupClassName={styles.Popup}
      positionerClassName={styles.Positioner}
      programmaticButtonClassName={styles.Button}
      triggerClassNames={[styles.IconButton, styles.IconButton, styles.IconButton]}
      triggerGroupClassName={styles.ButtonGroup}
    />
  );
}
