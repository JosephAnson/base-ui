'use client';
import { LitField } from '../LitField';

export default function ExampleField() {
  return (
    <LitField
      rootClassName="flex w-full max-w-64 flex-col items-start gap-1"
      labelClassName="text-sm font-medium text-gray-900"
      inputClassName="h-10 w-full rounded-md border border-gray-200 pl-3.5 text-base text-gray-900 focus:outline-2 focus:-outline-offset-1 focus:outline-blue-800"
      errorClassName="text-sm text-red-800"
      descriptionClassName="text-sm text-gray-600"
    />
  );
}
