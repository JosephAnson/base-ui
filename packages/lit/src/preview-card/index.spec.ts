import { PreviewCard } from '@base-ui/lit/preview-card';

const numberPayloadHandle = PreviewCard.createHandle<number>();

PreviewCard.Root<number>({
  handle: numberPayloadHandle,
  children: ({ payload }: { payload: number | undefined }) => {
    payload?.toFixed(0);
    // @ts-expect-error
    payload?.trim();
    return undefined as never;
  },
});

PreviewCard.Trigger({
  handle: numberPayloadHandle,
  payload: 42,
});

PreviewCard.Trigger({
  handle: numberPayloadHandle,
});

PreviewCard.Trigger({
  handle: numberPayloadHandle,
  // @ts-expect-error
  payload: 'invalid',
});
