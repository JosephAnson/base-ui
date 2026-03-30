'use client';
import * as React from 'react';
import { html, nothing, render as renderTemplate, svg } from 'lit';
import '@base-ui/lit/select';
import '@base-ui/lit/toggle';
import '@base-ui/lit/toggle-group';
import '@base-ui/lit/toolbar';

export default function ExampleToolbar() {
  const hostRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(
      html`<toolbar-root
        .render=${html`<div class="flex w-150 items-center gap-px rounded-md border border-gray-200 bg-gray-50 p-0.5"></div>`}
      >
        <toggle-group-root
          aria-label="Alignment"
          .defaultValue=${['align-left']}
          .render=${html`<div class="flex gap-1"></div>`}
        >
          <toolbar-button
            aria-label="Align left"
            value="align-left"
            .render=${html`<toggle-root class="flex h-8 items-center justify-center rounded-xs px-[0.75rem] font-[inherit] text-sm font-normal text-gray-600 select-none hover:bg-gray-100 focus-visible:bg-none focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-blue-800 active:bg-gray-200 data-[pressed]:bg-gray-100 data-[pressed]:text-gray-900"></toggle-root>`}
          >
            Align Left
          </toolbar-button>
          <toolbar-button
            aria-label="Align right"
            value="align-right"
            .render=${html`<toggle-root class="flex h-8 items-center justify-center rounded-xs px-[0.75rem] font-[inherit] text-sm font-normal text-gray-600 select-none hover:bg-gray-100 focus-visible:bg-none focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-blue-800 active:bg-gray-200 data-[pressed]:bg-gray-100 data-[pressed]:text-gray-900"></toggle-root>`}
          >
            Align Right
          </toolbar-button>
        </toggle-group-root>
        <toolbar-separator class="m-1 h-4 w-px bg-gray-300"></toolbar-separator>
        <toolbar-group
          aria-label="Numerical format"
          .render=${html`<div class="flex gap-1"></div>`}
        >
          <toolbar-button
            aria-label="Format as currency"
            .render=${html`<button class="flex size-8 items-center justify-center rounded-xs px-[0.75rem] font-[inherit] text-sm font-normal text-gray-600 select-none hover:bg-gray-100 focus-visible:bg-none focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-blue-800 active:bg-gray-200 data-[pressed]:bg-gray-100 data-[pressed]:text-gray-900" type="button"></button>`}
          >
            $
          </toolbar-button>
          <toolbar-button
            aria-label="Format as percent"
            .render=${html`<button class="flex size-8 items-center justify-center rounded-xs px-[0.75rem] font-[inherit] text-sm font-normal text-gray-600 select-none hover:bg-gray-100 focus-visible:bg-none focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-blue-800 active:bg-gray-200 data-[pressed]:bg-gray-100 data-[pressed]:text-gray-900" type="button"></button>`}
          >
            %
          </toolbar-button>
        </toolbar-group>
        <toolbar-separator class="m-1 h-4 w-px bg-gray-300"></toolbar-separator>
        <select-root .defaultValue=${'Helvetica'}>
          <toolbar-button
            .render=${html`<select-trigger class="flex min-w-[8rem] h-8 items-center justify-between gap-3 rounded-md pr-3 pl-3 text-sm font-normal text-gray-600 select-none hover:bg-gray-100 focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-blue-800 data-[popup-open]:bg-gray-100 cursor-default"></select-trigger>`}
          >
            <select-value></select-value>
            <select-icon class="flex">${chevronUpDownIcon()}</select-icon>
          </toolbar-button>
          <select-popup>
            <select-positioner class="z-1 outline-hidden select-none" .sideOffset=${8}>
              <select-list
                class="max-h-[var(--available-height)] overflow-y-auto rounded-md bg-[canvas] py-1 text-gray-900 outline outline-gray-200 transition-[transform,opacity] duration-150 data-[ending-style]:scale-90 data-[ending-style]:opacity-0 data-[side=none]:transform-none data-[side=none]:opacity-100 data-[starting-style]:scale-90 data-[starting-style]:opacity-0"
              >
                <select-item
                  class="flex min-w-32 items-center gap-2.5 px-3 py-2 outline-hidden select-none data-[highlighted]:relative data-[highlighted]:z-0 data-[highlighted]:text-gray-50 before:data-[highlighted]:absolute before:data-[highlighted]:inset-x-1 before:data-[highlighted]:inset-y-0.5 before:data-[highlighted]:-z-1 before:data-[highlighted]:rounded-sm before:data-[highlighted]:bg-gray-900"
                  value="Helvetica"
                >
                  <select-item-indicator class="w-3">${checkIcon('block')}</select-item-indicator>
                  <select-item-text class="flex-1">Helvetica</select-item-text>
                </select-item>
                <select-item
                  class="flex min-w-32 items-center gap-2.5 px-3 py-2 outline-hidden select-none data-[highlighted]:relative data-[highlighted]:z-0 data-[highlighted]:text-gray-50 before:data-[highlighted]:absolute before:data-[highlighted]:inset-x-1 before:data-[highlighted]:inset-y-0.5 before:data-[highlighted]:-z-1 before:data-[highlighted]:rounded-sm before:data-[highlighted]:bg-gray-900"
                  value="Arial"
                >
                  <select-item-indicator class="w-3">${checkIcon('block')}</select-item-indicator>
                  <select-item-text class="flex-1">Arial</select-item-text>
                </select-item>
              </select-list>
            </select-positioner>
          </select-popup>
        </select-root>
        <toolbar-separator class="m-1 h-4 w-px bg-gray-300"></toolbar-separator>
        <toolbar-link
          href="#"
          .render=${html`<a class="mr-[0.875rem] ml-auto flex-none self-center text-sm text-gray-500 no-underline hover:text-blue-800 focus-visible:rounded-xs focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-800"></a>`}
        >
          Edited 51m ago
        </toolbar-link>
      </toolbar-root>`,
      host,
    );

    return () => {
      renderTemplate(nothing, host);
    };
  }, []);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}

function chevronUpDownIcon() {
  return svg`<svg width="8" height="12" viewBox="0 0 8 12" fill="none" stroke="currentcolor" stroke-width="1.5">
    <path d="M0.5 4.5L4 1.5L7.5 4.5" />
    <path d="M0.5 7.5L4 10.5L7.5 7.5" />
  </svg>`;
}

function checkIcon(className: string) {
  return svg`<svg fill="currentcolor" width="10" height="10" viewBox="0 0 10 10" class=${className}>
    <path d="M9.1603 1.12218C9.50684 1.34873 9.60427 1.81354 9.37792 2.16038L5.13603 8.66012C5.01614 8.8438 4.82192 8.96576 4.60451 8.99384C4.3871 9.02194 4.1683 8.95335 4.00574 8.80615L1.24664 6.30769C0.939709 6.02975 0.916013 5.55541 1.19372 5.24822C1.47142 4.94102 1.94536 4.91731 2.2523 5.19524L4.36085 7.10461L8.12299 1.33999C8.34934 0.993152 8.81376 0.895638 9.1603 1.12218Z" />
  </svg>`;
}
