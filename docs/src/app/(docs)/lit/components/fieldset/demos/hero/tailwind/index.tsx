import * as React from 'react';
import { LitFieldset } from '../LitFieldset';

export default function ExampleFieldset() {
  return (
    <LitFieldset
      fieldClassName="flex flex-col items-start gap-1"
      fieldsetClassName="flex w-full max-w-64 flex-col gap-4"
      inputClassName="h-10 w-full rounded-md border border-gray-200 pl-3.5 text-base text-gray-900 focus:outline-2 focus:-outline-offset-1 focus:outline-blue-800"
      labelClassName="text-sm font-medium text-gray-900"
      legendClassName="border-b border-gray-200 pb-3 text-lg font-medium text-gray-900"
    />
  );
}
