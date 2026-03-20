import { LitTooltipDetachedFull } from '../../shared/LitTooltipDemos';
import styles from 'docs/src/app/(docs)/react/components/tooltip/demos/detached-triggers-full/css-modules/index.module.css';

export default function TooltipDetachedTriggersFullCssModulesDemo() {
  return (
    <LitTooltipDetachedFull
      arrowClassName={styles.Arrow}
      buttonGroupClassName={styles.ButtonGroup}
      iconClassName={styles.Icon}
      popupClassName={styles.Popup}
      positionerClassName={styles.Positioner}
      triggerClassNames={[styles.Button, styles.Button, styles.Button]}
      viewportClassName={styles.Viewport}
    />
  );
}
