import { Menu, MenuRoot } from '@base-ui/lit/menu';

const stringHandle = Menu.createHandle<string>();
const menuOrientation: MenuRoot.Orientation = 'horizontal';

menuOrientation satisfies 'horizontal' | 'vertical';

Menu.Root<string>({
  handle: stringHandle,
  children: ({ payload }: { payload: string | undefined }) => {
    payload?.trim();
    // @ts-expect-error
    payload?.toFixed(0);
    return undefined as never;
  },
});

Menu.Trigger({
  handle: stringHandle,
  payload: 'payload',
});

Menu.Positioner({
  sideOffset({ side }) {
    return side === 'right' ? 8 : 4;
  },
  alignOffset({ align }) {
    return align === 'start' ? 4 : 0;
  },
});

Menu.SubmenuTrigger({
  disabled: true,
  nativeButton: true,
  openOnHover: false,
});

Menu.SubmenuRoot({
  // @ts-expect-error
  modal: true,
});
