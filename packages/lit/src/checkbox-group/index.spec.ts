import { html } from 'lit';
import { CheckboxGroup } from '@base-ui/lit/checkbox-group';
import { Checkbox } from '@base-ui/lit/checkbox';

CheckboxGroup({});
CheckboxGroup({ value: ['one'] });
CheckboxGroup({ defaultValue: ['one'] });
CheckboxGroup({ allValues: ['one', 'two'], disabled: true });
CheckboxGroup({
  render: (_props, state) => html`<div data-disabled=${state.disabled ? '' : undefined}></div>`,
});
CheckboxGroup({
  children: [
    Checkbox.Root({ parent: true }),
    Checkbox.Root({ value: 'one' }),
    Checkbox.Root({ value: 'two' }),
  ],
});
