import { html } from 'lit';
import { Checkbox } from '@base-ui/lit/checkbox';

Checkbox.Root({});
Checkbox.Root({ checked: true });
Checkbox.Root({ defaultChecked: true });
Checkbox.Root({ indeterminate: true });
Checkbox.Root({ name: 'notifications', value: 'on', uncheckedValue: 'off' });
Checkbox.Root({
  nativeButton: true,
  render: html`<button></button>`,
});
Checkbox.Root({
  render: (_props, state) => html`<span data-checked=${state.checked ? '' : undefined}></span>`,
});

Checkbox.Indicator({});
Checkbox.Indicator({ keepMounted: true });
Checkbox.Indicator({
  render: (_props, state) =>
    html`<span data-indeterminate=${state.indeterminate ? '' : undefined}></span>`,
});
