import { html } from 'lit';
import { Radio } from '@base-ui/lit/radio';

const value = 'a';

Radio.Root({ value });
Radio.Root({ value: 1 });
Radio.Root({ value: null });
Radio.Root<string | null>({ value: null });
// @ts-expect-error value must match explicit generic type
Radio.Root<'a' | 'b'>({ value: 'c' });
Radio.Root({
  nativeButton: true,
  render: html`<button></button>`,
  value: 'a',
});
Radio.Root({
  render: (_props, state) => html`<span data-checked=${state.checked ? '' : undefined}></span>`,
  value: 'a',
});

Radio.Indicator({});
Radio.Indicator({ keepMounted: true });
Radio.Indicator({
  render: (_props, state) =>
    html`<span data-starting=${state.transitionStatus === 'starting' ? '' : undefined}></span>`,
});
