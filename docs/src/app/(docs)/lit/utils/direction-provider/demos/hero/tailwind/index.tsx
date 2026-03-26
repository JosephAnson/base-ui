import { LitDirectionProvider } from '../LitDirectionProvider';

export default function ExampleDirectionProvider() {
  return (
    <LitDirectionProvider
      controlClassName="flex w-56 items-center py-3"
      indicatorClassName="rounded-sm bg-gray-700"
      thumbClassName="size-4 rounded-full bg-white outline-1 outline-gray-300 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-blue-800"
      trackClassName="relative h-1 w-full rounded-sm bg-gray-200 shadow-[inset_0_0_0_1px] shadow-gray-200"
    />
  );
}
