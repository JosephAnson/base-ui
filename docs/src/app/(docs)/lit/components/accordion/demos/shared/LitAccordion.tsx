'use client';
import * as React from 'react';
import { html, nothing, render as renderTemplate } from 'lit';
import type { AccordionRootProps } from '@base-ui/lit/accordion';
import { Accordion } from '@base-ui/lit/accordion';

const ITEMS = [
  {
    answer:
      'Base UI is a library of high-quality unstyled React components for design systems and web apps.',
    question: 'What is Base UI?',
    value: 'what-is-base-ui',
  },
  {
    answer:
      'Head to the “Quick start” guide in the docs. If you’ve used unstyled libraries before, you’ll feel at home.',
    question: 'How do I get started?',
    value: 'how-do-i-get-started',
  },
  {
    answer: 'Of course! Base UI is free and open source.',
    question: 'Can I use it for my project?',
    value: 'can-i-use-it-for-my-project',
  },
] as const;

export interface LitAccordionProps {
  contentClassName?: string | undefined;
  headerClassName?: string | undefined;
  itemClassName?: string | undefined;
  panelClassName?: string | undefined;
  rootProps?: AccordionRootProps<string> | undefined;
  triggerClassName?: string | undefined;
  triggerIconClassName?: string | undefined;
}

export function LitAccordion(props: LitAccordionProps) {
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const {
    contentClassName,
    headerClassName,
    itemClassName,
    panelClassName,
    rootProps,
    triggerClassName,
    triggerIconClassName,
  } = props;

  React.useEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(
      Accordion.Root({
        ...rootProps,
        children: ITEMS.map((item) =>
          Accordion.Item({
            className: itemClassName,
            value: item.value,
            children: [
              Accordion.Header({
                className: headerClassName,
                children: Accordion.Trigger({
                  className: triggerClassName,
                  children: [item.question, plusIcon(triggerIconClassName)],
                }),
              }),
              Accordion.Panel({
                className: panelClassName,
                children: html`<div class=${contentClassName ?? ''}>${item.answer}</div>`,
              }),
            ],
          }),
        ),
      }),
      host,
    );

    return () => {
      renderTemplate(nothing, host);
    };
  }, [
    contentClassName,
    headerClassName,
    itemClassName,
    panelClassName,
    rootProps,
    triggerClassName,
    triggerIconClassName,
  ]);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}

function plusIcon(className?: string) {
  return html`
    <svg viewBox="0 0 12 12" fill="currentcolor" class=${className ?? ''}>
      <path d="M6.75 0H5.25V5.25H0V6.75L5.25 6.75V12H6.75V6.75L12 6.75V5.25H6.75V0Z" />
    </svg>
  `;
}
