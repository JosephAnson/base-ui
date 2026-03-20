import * as React from 'react';
import { LitRadioGroup } from '../LitRadioGroup';

export default function ExampleRadioGroup() {
  return (
    <LitRadioGroup
      caption="Best apple"
      captionClassName="font-medium"
      groupClassName="flex flex-col items-start gap-1 text-gray-900"
      groupProps={{ defaultValue: 'fuji-apple' }}
      indicatorProps={{
        className:
          'flex items-center justify-center data-[unchecked]:hidden before:size-2 before:rounded-full before:bg-gray-50',
      }}
      itemClassName="flex items-center gap-2"
      items={[
        { label: 'Fuji', value: 'fuji-apple' },
        { label: 'Gala', value: 'gala-apple' },
        { label: 'Granny Smith', value: 'granny-smith-apple' },
      ]}
      rootProps={{
        className:
          'flex size-5 items-center justify-center rounded-full border-0 p-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800 data-[checked]:bg-gray-900 data-[unchecked]:border data-[unchecked]:border-gray-300',
      }}
    />
  );
}
