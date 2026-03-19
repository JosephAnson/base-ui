'use client';
import { LitMeter } from '../LitMeter';

export default function ExampleMeter() {
  return (
    <LitMeter
      className="box-border grid w-48 grid-cols-2 gap-y-2"
      indicatorClassName="block bg-gray-500 transition-all duration-500"
      label="Storage Used"
      labelClassName="text-sm font-medium text-gray-900"
      trackClassName="col-span-2 block h-2 w-48 overflow-hidden bg-gray-100 shadow-[inset_0_0_0_1px] shadow-gray-200"
      value={24}
      valueClassName="col-start-2 m-0 text-right text-sm leading-5 text-gray-900"
    />
  );
}
