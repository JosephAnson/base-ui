import { LitAlertDialog } from '../LitAlertDialog';
import styles from 'docs/src/app/(docs)/react/components/alert-dialog/demos/hero/css-modules/index.module.css';

export default function AlertDialogCssModulesDemo() {
  return (
    <LitAlertDialog
      actionsClassName={styles.Actions}
      backdropClassName={styles.Backdrop}
      buttonClassName={styles.Button}
      dangerButtonClassName={styles.DangerButton}
      descriptionClassName={styles.Description}
      popupClassName={styles.Popup}
      titleClassName={styles.Title}
    />
  );
}
