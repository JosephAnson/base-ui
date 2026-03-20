import { LitPreviewCardHero } from '../../shared/LitPreviewCardDemos';
import styles from 'docs/src/app/(docs)/react/components/preview-card/demos/index.module.css';

export default function PreviewCardHeroCssModulesDemo() {
  return (
    <LitPreviewCardHero
      arrowClassName={styles.Arrow}
      arrowFillClassName={styles.ArrowFill}
      arrowInnerStrokeClassName={styles.ArrowInnerStroke}
      arrowOuterStrokeClassName={styles.ArrowOuterStroke}
      imageClassName={styles.Image}
      linkClassName={styles.Link}
      paragraphClassName={styles.Paragraph}
      popupClassName={styles.Popup}
      popupContentClassName={styles.PopupContent}
      summaryClassName={styles.Summary}
    />
  );
}
