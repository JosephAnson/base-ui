import * as React from 'react';
import { LitAccordion } from '../../shared/LitAccordion';

export default function ExampleAccordion() {
  return (
    <LitAccordion
      contentClassName="p-3"
      itemClassName="border-b border-gray-200"
      panelClassName="h-[var(--accordion-panel-height)] overflow-hidden text-base text-gray-600 transition-[height] ease-out data-[ending-style]:h-0 data-[starting-style]:h-0"
      rootProps={{
        className: 'flex w-96 max-w-[calc(100vw-8rem)] flex-col justify-center text-gray-900',
      }}
      triggerClassName="group relative flex w-full items-baseline justify-between gap-4 bg-gray-50 py-2 pr-1 pl-3 text-left font-medium hover:bg-gray-100 focus-visible:z-1 focus-visible:outline-2 focus-visible:outline-blue-800"
      triggerIconClassName="mr-2 size-3 shrink-0 transition-all ease-out group-data-[panel-open]:scale-110 group-data-[panel-open]:rotate-45"
    />
  );
}
