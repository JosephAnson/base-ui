'use client';
import { LitForm } from '../LitForm';

export default function ExampleForm() {
  return (
    <LitForm
      rootClassName="flex w-full max-w-64 flex-col gap-4"
      fieldClassName="flex flex-col items-start gap-1"
      labelClassName="text-sm font-medium text-gray-900"
      inputClassName="h-10 w-full rounded-md border border-gray-200 pl-3.5 text-base text-gray-900 focus:outline-2 focus:-outline-offset-1 focus:outline-blue-800"
      errorClassName="text-sm text-red-800"
      buttonClassName="flex items-center justify-center h-10 px-3.5 m-0 outline-0 border border-gray-200 rounded-md bg-gray-50 font-inherit text-base font-medium leading-6 text-gray-900 select-none hover:enabled:bg-gray-100 active:enabled:bg-gray-200 active:enabled:shadow-[inset_0_1px_3px_rgba(0,0,0,0.1)] active:enabled:border-t-gray-300 focus-visible:outline-2 focus-visible:outline-blue-800 focus-visible:-outline-offset-1 disabled:text-gray-500"
    />
  );
}
