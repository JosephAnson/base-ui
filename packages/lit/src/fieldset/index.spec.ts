import { html } from 'lit';
import { Fieldset } from '@base-ui/lit/fieldset';

Fieldset.Root({});
Fieldset.Root({
  disabled: true,
  render: html`<div></div>`,
});

Fieldset.Legend({});
Fieldset.Legend({
  id: 'legend-id',
});
