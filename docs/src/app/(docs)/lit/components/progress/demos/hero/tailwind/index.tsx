'use client';
import * as React from 'react';
import { LitProgress } from '../LitProgress';

export default function ExampleProgress() {
  const [value, setValue] = React.useState(20);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setValue((current) => Math.min(100, Math.round(current + Math.random() * 25)));
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return (
    <LitProgress
      className="grid w-48 grid-cols-2 gap-y-2"
      indicatorClassName="block bg-gray-500 transition-all duration-500"
      label="Export data"
      labelClassName="text-sm font-medium text-gray-900"
      trackClassName="col-span-full h-1 overflow-hidden rounded-sm bg-gray-200 shadow-[inset_0_0_0_1px] shadow-gray-200"
      value={value}
      valueClassName="col-start-2 text-right text-sm text-gray-900"
    />
  );
}
