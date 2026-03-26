import { LitDirectionProvider } from '../LitDirectionProvider';
import styles from './index.module.css';

export default function ExampleDirectionProvider() {
  return (
    <LitDirectionProvider
      controlClassName={styles.Control}
      indicatorClassName={styles.Indicator}
      thumbClassName={styles.Thumb}
      trackClassName={styles.Track}
    />
  );
}
