import { LitTooltipDetachedSimple } from '../../shared/LitTooltipDemos';
import styles from 'docs/src/app/(docs)/react/components/tooltip/demos/index.module.css';

export default function TooltipDetachedTriggersSimpleCssModulesDemo() {
  return (
    <LitTooltipDetachedSimple
      arrowClassName={styles.Arrow}
      buttonClassName={styles.IconButton}
      iconClassName={styles.Icon}
      popupClassName={styles.Popup}
    />
  );
}
