import * as React from 'react';
import { LitCollapsible } from '../LitCollapsible';

export default function ExampleCollapsible() {
  return (
    <LitCollapsible
      contentClassName="mt-1 flex cursor-text flex-col gap-2 rounded-xs bg-gray-100 py-2 pl-7"
      panelProps={{
        className:
          "flex [&[hidden]:not([hidden='until-found'])]:hidden h-[var(--collapsible-panel-height)] flex-col justify-end overflow-hidden text-sm transition-all ease-out data-[ending-style]:h-0 data-[starting-style]:h-0 duration-150",
      }}
      rootProps={{ className: 'flex min-h-36 w-56 flex-col justify-center text-gray-900' }}
      triggerProps={{
        className:
          'group flex items-center gap-2 rounded-xs bg-gray-100 px-2 py-1 text-sm font-medium hover:bg-gray-200 focus-visible:outline-2 focus-visible:outline-blue-800 active:bg-gray-200',
      }}
      triggerIconClassName="size-3 transition-all ease-out group-data-[panel-open]:rotate-90"
    />
  );
}
