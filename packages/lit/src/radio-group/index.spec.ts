import { html } from 'lit';
import { Radio } from '@base-ui/lit/radio';
import { RadioGroup } from '@base-ui/lit/radio-group';

RadioGroup({});
RadioGroup({ value: 'one' });
RadioGroup({ defaultValue: 'one' });
RadioGroup<string | null>({
  value: null,
  onValueChange(value) {
    value;
  },
});
RadioGroup({
  name: 'fruit',
  render: (_props, state) =>
    html`<div
      data-disabled=${state.disabled ? '' : undefined}
      data-dirty=${state.dirty ? '' : undefined}
      data-focused=${state.focused ? '' : undefined}
    ></div>`,
});
RadioGroup({
  children: [Radio.Root({ value: 'one' }), Radio.Root({ value: 'two' })],
});
