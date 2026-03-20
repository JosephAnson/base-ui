import { Dialog } from '@base-ui/lit/dialog';

const stringHandle = Dialog.createHandle<string>();

Dialog.Root<string>({
  handle: stringHandle,
  children: ({ payload }: { payload: string | undefined }) => {
    payload?.trim();
    // @ts-expect-error
    payload?.toFixed(0);
    return undefined as never;
  },
});

Dialog.Trigger({
  handle: stringHandle,
  payload: 'payload',
});

Dialog.Trigger({
  handle: stringHandle,
});

Dialog.Trigger({
  handle: stringHandle,
  // @ts-expect-error
  payload: 42,
});
