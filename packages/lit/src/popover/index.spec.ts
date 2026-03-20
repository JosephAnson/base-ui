import { Popover } from '@base-ui/lit/popover';

const numberPayloadHandle = Popover.createHandle<number>();

Popover.Root<number>({
  handle: numberPayloadHandle,
  children: ({ payload }: { payload: number | undefined }) => {
    payload?.toFixed(0);
    // @ts-expect-error
    payload?.trim();
    return undefined as never;
  },
});

Popover.Trigger({
  handle: numberPayloadHandle,
  payload: 42,
});

Popover.Trigger({
  handle: numberPayloadHandle,
});

Popover.Trigger({
  handle: numberPayloadHandle,
  // @ts-expect-error
  payload: 'invalid',
});
