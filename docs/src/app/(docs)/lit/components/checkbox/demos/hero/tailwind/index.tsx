import * as React from 'react';
import { LitCheckbox } from '../LitCheckbox';

export default function ExampleCheckbox() {
  return (
    <label className="flex items-center gap-2 text-base text-gray-900">
      <LitCheckbox
        rootProps={{
          className:
            'flex size-5 items-center justify-center rounded border border-gray-300 bg-transparent text-gray-50 outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 data-[checked]:border-gray-900 data-[checked]:bg-gray-900 data-[indeterminate]:border-gray-900 data-[indeterminate]:bg-gray-900',
          defaultChecked: true,
        }}
        indicatorProps={{ className: 'flex data-[unchecked]:hidden' }}
      />
      Enable notifications
    </label>
  );
}
