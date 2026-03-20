import * as React from 'react';
import { LitQuickStartCard } from '../LitQuickStartCard';

export default function ExampleQuickStartCard() {
  return (
    <LitQuickStartCard
      buttonClassName="inline-flex h-10 items-center justify-center rounded-[0.625rem] bg-blue-900 px-4 text-sm font-medium text-white outline-none focus-visible:outline-2 focus-visible:outline-blue-800 focus-visible:outline-offset-2"
      cardClassName="flex w-full max-w-[22rem] flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)]"
      descriptionClassName="text-sm text-gray-600"
      errorClassName="text-sm text-red-800"
      fieldClassName="flex flex-col gap-1"
      inputClassName="box-border h-10 rounded-lg border border-gray-200 bg-white px-3.5 text-base text-gray-900 outline-none focus:border-blue-800"
      labelClassName="text-sm font-medium text-gray-900"
      surfaceClassName="flex min-h-[20rem] items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(191,219,254,0.6),_transparent_46%),linear-gradient(180deg,_#f8fafc,_white)] p-8"
    />
  );
}
