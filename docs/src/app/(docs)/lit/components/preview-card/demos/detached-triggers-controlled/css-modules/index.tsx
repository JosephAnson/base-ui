import { LitPreviewCardDetachedControlled } from '../../shared/LitPreviewCardDemos';
import styles from 'docs/src/app/(docs)/react/components/preview-card/demos/index.module.css';

export default function PreviewCardDetachedTriggersControlledCssModulesDemo() {
  return (
    <LitPreviewCardDetachedControlled
      arrowClassName={styles.Arrow}
      arrowFillClassName={styles.ArrowFill}
      arrowInnerStrokeClassName={styles.ArrowInnerStroke}
      arrowOuterStrokeClassName={styles.ArrowOuterStroke}
      buttonClassName={styles.Button}
      containerClassName={styles.Container}
      imageClassName={styles.Image}
      linkClassName={styles.Link}
      paragraphClassName={styles.Paragraph}
      popupClassName={styles.Popup}
      popupContentClassName={styles.PopupContent}
      positionerClassName={styles.Positioner}
      summaryClassName={styles.Summary}
    />
  );
}
