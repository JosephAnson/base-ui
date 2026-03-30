'use client';
import * as React from 'react';
import { html, nothing, render as renderTemplate } from 'lit';
import '@base-ui/lit/accordion';

const ITEMS = [
  {
    answer:
      'Base UI is a library of high-quality unstyled React components for design systems and web apps.',
    question: 'What is Base UI?',
    value: 'what-is-base-ui',
  },
  {
    answer:
      'Head to the "Quick start" guide in the docs. If you\'ve used unstyled libraries before, you\'ll feel at home.',
    question: 'How do I get started?',
    value: 'how-do-i-get-started',
  },
  {
    answer: 'Of course! Base UI is free and open source.',
    question: 'Can I use it for my project?',
    value: 'can-i-use-it-for-my-project',
  },
] as const;

export default function ExampleAccordion() {
  const hostRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(
      html`<accordion-root
        class="flex w-96 max-w-[calc(100vw-8rem)] flex-col justify-center text-gray-900"
        .multiple=${true}
      >
        ${ITEMS.map(
          (item) => html`
            <accordion-item value=${item.value} class="border-b border-gray-200">
              <accordion-header>
                <accordion-trigger
                  class="group relative flex w-full items-baseline justify-between gap-4 bg-gray-50 py-2 pr-1 pl-3 text-left font-normal hover:bg-gray-100 focus-visible:z-1 focus-visible:outline-2 focus-visible:outline-blue-800"
                >
                  ${item.question}
                  ${plusIcon(
                    'mr-2 size-3 shrink-0 transition-all ease-out group-data-[panel-open]:scale-110 group-data-[panel-open]:rotate-45',
                  )}
                </accordion-trigger>
              </accordion-header>
              <accordion-panel
                class="h-[var(--accordion-panel-height)] overflow-hidden text-base text-gray-600 transition-[height] ease-out data-[ending-style]:h-0 data-[starting-style]:h-0"
              >
                <div class="p-3">${item.answer}</div>
              </accordion-panel>
            </accordion-item>
          `,
        )}
      </accordion-root>`,
      host,
    );

    return () => {
      renderTemplate(nothing, host);
    };
  }, []);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}

function plusIcon(className: string) {
  return html`
    <svg viewBox="0 0 12 12" fill="currentcolor" class=${className}>
      <path d="M6.75 0H5.25V5.25H0V6.75L5.25 6.75V12H6.75V6.75L12 6.75V5.25H6.75V0Z" />
    </svg>
  `;
}
