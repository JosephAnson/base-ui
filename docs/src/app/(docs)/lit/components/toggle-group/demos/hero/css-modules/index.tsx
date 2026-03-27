'use client';
import { html, svg } from 'lit';
import { LitToggleGroup } from '../../LitToggleGroup';
import styles from './index.module.css';

export default function ExampleToggleGroup() {
  return (
    <LitToggleGroup className={styles.Panel} defaultValue={['left']}>
      {html`
        <toggle-root aria-label="Align left" value="left" class=${styles.Button}>
          ${alignLeftIcon(styles.Icon)}
        </toggle-root>
        <toggle-root aria-label="Align center" value="center" class=${styles.Button}>
          ${alignCenterIcon(styles.Icon)}
        </toggle-root>
        <toggle-root aria-label="Align right" value="right" class=${styles.Button}>
          ${alignRightIcon(styles.Icon)}
        </toggle-root>
      `}
    </LitToggleGroup>
  );
}

function alignLeftIcon(className: string) {
  return svg`<svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    stroke="currentcolor"
    stroke-linecap="round"
    class=${className}
  >
    <path d="M2.5 3.5H13.5" />
    <path d="M2.5 9.5H13.5" />
    <path d="M2.5 6.5H10.5" />
    <path d="M2.5 12.5H10.5" />
  </svg>`;
}

function alignCenterIcon(className: string) {
  return svg`<svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    stroke="currentcolor"
    stroke-linecap="round"
    class=${className}
  >
    <path d="M3 3.5H14" />
    <path d="M3 9.5H14" />
    <path d="M4.5 6.5H12.5" />
    <path d="M4.5 12.5H12.5" />
  </svg>`;
}

function alignRightIcon(className: string) {
  return svg`<svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    stroke="currentcolor"
    stroke-linecap="round"
    class=${className}
  >
    <path d="M2.5 3.5H13.5" />
    <path d="M2.5 9.5H13.5" />
    <path d="M5.5 6.5H13.5" />
    <path d="M5.5 12.5H13.5" />
  </svg>`;
}
