import { LitPreviewCardDetachedFull } from '../../shared/LitPreviewCardDemos';
import styles from 'docs/src/app/(docs)/react/components/preview-card/demos/detached-triggers-full/css-modules/index.module.css';

export default function PreviewCardDetachedTriggersFullCssModulesDemo() {
  return (
    <LitPreviewCardDetachedFull
      arrowClassName={styles.Arrow}
      arrowFillClassName={styles.ArrowFill}
      arrowInnerStrokeClassName={styles.ArrowInnerStroke}
      arrowOuterStrokeClassName={styles.ArrowOuterStroke}
      imageClassName={styles.Image}
      linkClassName={styles.Link}
      paragraphClassName={styles.Paragraph}
      popupClassName={styles.Popup}
      popupContentClassName={styles.PopupContent}
      positionerClassName={styles.Positioner}
      summaryClassName={styles.Summary}
      viewportClassName={styles.Viewport}
    />
  );
}
