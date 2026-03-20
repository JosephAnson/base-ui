import { html } from 'lit';
import { Switch } from '@base-ui/lit/switch';

Switch.Root({});
Switch.Root({ checked: true });
Switch.Root({ defaultChecked: true });
Switch.Root({ name: 'notifications', value: 'on', uncheckedValue: 'off' });
Switch.Root({
  nativeButton: true,
  render: html`<button></button>`,
});
Switch.Root({
  render: (_props, state) => html`<span data-checked=${state.checked ? '' : undefined}></span>`,
});

Switch.Thumb({});
Switch.Thumb({
  render: (_props, state) => html`<span data-checked=${state.checked ? '' : undefined}></span>`,
});
