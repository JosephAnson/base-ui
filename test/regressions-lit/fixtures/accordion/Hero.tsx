import * as React from 'react';
import { useIsoLayoutEffect } from '@base-ui/utils/useIsoLayoutEffect';
import { html, nothing, render as renderTemplate } from 'lit';
import { Accordion } from '@base-ui/lit/accordion';
import styles from 'docs/src/app/(docs)/react/components/accordion/demos/_index.module.css';

export default function AccordionHero() {
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
          createItem({
            answer:
              'Base UI is a library of high-quality unstyled React components for design systems and web apps.',
            question: 'What is Base UI?',
          }),
          createItem({
            answer:
              'Head to the “Quick start” guide in the docs. If you’ve used unstyled libraries before, you’ll feel at home.',
            question: 'How do I get started?',
          }),
          createItem({
            answer: 'Of course! Base UI is free and open source.',
            question: 'Can I use it for my project?',
          }),
        ],
      }),
      host,
    );

    return () => {
      renderTemplate(nothing, host);
    };
  }, []);

  return (
    <div data-testid="screenshot-target" style={{ padding: '1rem' }}>
      <div ref={hostRef} style={{ display: 'contents' }} />
    </div>
  );
}

function createItem(props: { answer: string; question: string }) {
  const { answer, question } = props;

  return Accordion.Item({
    className: styles.Item,
    children: [
      Accordion.Header({
        className: styles.Header,
        children: Accordion.Trigger({
          className: styles.Trigger,
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
