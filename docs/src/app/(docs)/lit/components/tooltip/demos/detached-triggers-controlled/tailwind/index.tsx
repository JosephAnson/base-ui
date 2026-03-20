import { LitTooltipDetachedControlled } from '../../shared/LitTooltipDemos';

export default function TooltipDetachedTriggersControlledTailwindDemo() {
  return (
    <LitTooltipDetachedControlled
      arrowClassName="
        flex
        data-[side=bottom]:-top-2 data-[side=bottom]:rotate-0
        data-[side=left]:right-[-13px] data-[side=left]:rotate-90
        data-[side=right]:left-[-13px] data-[side=right]:-rotate-90
        data-[side=top]:-bottom-2 data-[side=top]:rotate-180"
      containerClassName="flex gap-2 flex-wrap justify-center"
      popupClassName="
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
      positionerClassName="
        h-(--positioner-height)
        w-(--positioner-width)
        max-w-(--available-width)"
      programmaticButtonClassName="
        flex h-10 items-center justify-center
        border border-gray-200 rounded-md
        bg-gray-50
        px-3.5
        text-base font-medium text-gray-900
        select-none
        focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-blue-800
        hover:bg-gray-100
        active:bg-gray-100"
      triggerClassNames={[
        `
          flex size-10 items-center justify-center
          border border-gray-200 rounded-l-md
          bg-gray-50
          text-gray-900
          select-none
          data-popup-open:bg-gray-100
          focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-blue-800
          hover:bg-gray-100
          active:bg-gray-100`,
        `
          flex size-10 items-center justify-center
          border-y border-r border-gray-200
          bg-gray-50
          text-gray-900
          select-none
          data-popup-open:bg-gray-100
          focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-blue-800
          hover:bg-gray-100
          active:bg-gray-100`,
        `
          flex size-10 items-center justify-center
          border-y border-r border-gray-200 rounded-r-md
          bg-gray-50
          text-gray-900
          select-none
          data-popup-open:bg-gray-100
          focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-blue-800
          hover:bg-gray-100
          active:bg-gray-100`,
      ]}
      triggerGroupClassName="flex"
    />
  );
}
