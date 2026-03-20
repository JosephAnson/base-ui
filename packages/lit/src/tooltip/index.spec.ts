import { Tooltip } from '@base-ui/lit/tooltip';

const numberPayloadHandle = Tooltip.createHandle<number>();

Tooltip.Root<number>({
  handle: numberPayloadHandle,
  children: ({ payload }: { payload: number | undefined }) => {
    payload?.toFixed(0);
    // @ts-expect-error
    payload?.trim();
    return undefined as never;
  },
});

Tooltip.Trigger({
  handle: numberPayloadHandle,
  payload: 42,
});

Tooltip.Trigger({
  handle: numberPayloadHandle,
});

Tooltip.Trigger({
  handle: numberPayloadHandle,
  // @ts-expect-error
  payload: 'invalid',
});
