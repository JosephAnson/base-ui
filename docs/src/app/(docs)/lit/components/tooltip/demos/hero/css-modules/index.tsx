import { LitTooltipHero } from '../../shared/LitTooltipDemos';
import styles from 'docs/src/app/(docs)/react/components/tooltip/demos/hero/css-modules/index.module.css';

export default function TooltipHeroCssModulesDemo() {
  return (
    <LitTooltipHero
      arrowClassName={styles.Arrow}
      buttonClassName={styles.Button}
      iconClassName={styles.Icon}
      panelClassName={styles.Panel}
      popupClassName={styles.Popup}
    />
  );
}
