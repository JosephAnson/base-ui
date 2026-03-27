'use client';
import { html, svg } from 'lit';
import { LitToggleGroup } from '../../LitToggleGroup';

export default function ExampleToggleGroup() {
  return (
    <LitToggleGroup
      className="flex gap-px rounded-md border border-gray-200 bg-gray-50 p-0.5"
      defaultValue={['left']}
    >
      {html`
        <toggle-root
          aria-label="Align left"
          value="left"
          class="flex size-8 items-center justify-center rounded-sm text-gray-600 select-none focus-visible:bg-none focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-blue-800 active:bg-gray-200 data-[pressed]:bg-gray-100 data-[pressed]:text-gray-900"
        >
          ${alignLeftIcon('size-4')}
        </toggle-root>
        <toggle-root
          aria-label="Align center"
          value="center"
          class="flex size-8 items-center justify-center rounded-sm text-gray-600 select-none focus-visible:bg-none focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-blue-800 active:bg-gray-200 data-[pressed]:bg-gray-100 data-[pressed]:text-gray-900"
        >
          ${alignCenterIcon('size-4')}
        </toggle-root>
        <toggle-root
          aria-label="Align right"
          value="right"
          class="flex size-8 items-center justify-center rounded-sm text-gray-600 select-none focus-visible:bg-none focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-blue-800 active:bg-gray-200 data-[pressed]:bg-gray-100 data-[pressed]:text-gray-900"
        >
          ${alignRightIcon('size-4')}
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
