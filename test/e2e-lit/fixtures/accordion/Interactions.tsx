import * as React from 'react';
import { useIsoLayoutEffect } from '@base-ui/utils/useIsoLayoutEffect';
import { html, nothing, render as renderTemplate } from 'lit';
import { Accordion } from '@base-ui/lit/accordion';
import styles from 'docs/src/app/(docs)/react/components/accordion/demos/_index.module.css';

export default function AccordionInteractions() {
  const hostRef = React.useRef<HTMLDivElement | null>(null);

  useIsoLayoutEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(
      Accordion.Root({
        className: styles.Accordion,
        children: [
          createItem('one', 'What is Base UI?', 'Base UI is an unstyled component library.'),
          createItem('two', 'How do I get started?', 'Read the quick start guide in the docs.'),
          createItem('three', 'Can I use it in production?', 'Yes, it is intended for real apps.'),
        ],
      }),
      host,
    );

    return () => {
      renderTemplate(nothing, host);
    };
  }, []);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}

function createItem(value: string, question: string, answer: string) {
  return Accordion.Item({
    className: styles.Item,
    value,
    children: [
      Accordion.Header({
        className: styles.Header,
        children: Accordion.Trigger({
          className: styles.Trigger,
          'data-testid': value,
          children: [
            question,
            html`<svg class=${styles.TriggerIcon} viewBox="0 0 12 12" fill="currentcolor">
              <path d="M6.75 0H5.25V5.25H0V6.75L5.25 6.75V12H6.75V6.75L12 6.75V5.25H6.75V0Z" />
            </svg>`,
          ],
        }),
      }),
      Accordion.Panel({
        className: styles.Panel,
        children: html`<div class=${styles.Content}>${answer}</div>`,
      }),
    ],
  });
}
