import { Menubar } from '@base-ui/lit/menubar';

const orientation: Menubar.State['orientation'] = 'horizontal';

orientation satisfies 'horizontal' | 'vertical';

Menubar({
  loopFocus: false,
  modal: true,
  orientation: 'vertical',
});
