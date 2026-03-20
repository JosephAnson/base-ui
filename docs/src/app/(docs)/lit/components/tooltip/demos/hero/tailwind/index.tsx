import { LitTooltipHero } from '../../shared/LitTooltipDemos';

export default function TooltipHeroTailwindDemo() {
  return (
    <LitTooltipHero
      arrowClassName="
        flex
        data-[side=bottom]:-top-2 data-[side=bottom]:rotate-0
        data-[side=left]:right-[-13px] data-[side=left]:rotate-90
        data-[side=right]:left-[-13px] data-[side=right]:-rotate-90
        data-[side=top]:-bottom-2 data-[side=top]:rotate-180"
      buttonClassName="
        flex size-8 items-center justify-center
        border-0 rounded-sm
        bg-transparent
        text-gray-900
        select-none
        data-popup-open:bg-gray-100
        focus-visible:bg-none
        focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-blue-800
        hover:bg-gray-100
        active:bg-gray-200
        focus-visible:not-[&:hover]:bg-transparent"
      iconClassName="size-4"
      panelClassName="flex border border-gray-200 rounded-md bg-gray-50 p-0.5"
      popupClassName="
        flex flex-col
        px-2 py-1
        rounded-md
        bg-[canvas]
        text-sm
        origin-(--transform-origin)
        shadow-lg shadow-gray-200 outline-1 outline-gray-200
        transition-[transform,scale,opacity]
        data-ending-style:opacity-0 data-ending-style:scale-90
        data-instant:transition-none
        data-starting-style:opacity-0 data-starting-style:scale-90
        dark:shadow-none dark:outline-gray-300 dark:-outline-offset-1"
    />
  );
}
