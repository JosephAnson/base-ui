import { html } from 'lit';
import { Accordion } from '@base-ui/lit/accordion';

const stringValues = ['a'];
const nullableValues: (string | null)[] = ['a', null];

Accordion.Root({
  value: stringValues,
  onValueChange(value) {
    value.push('b');
  },
});

Accordion.Root({
  defaultValue: [1],
  onValueChange(value) {
    value.push(2);
  },
});

Accordion.Root<'a' | 'b'>({ value: ['a'] });

Accordion.Root<string | null>({
  value: nullableValues,
  onValueChange(value) {
    value.includes(null);
  },
});

// @ts-expect-error value must match explicit generic type
Accordion.Root<'a' | 'b'>({ value: ['c'] });

Accordion.Item({ value: 'a' });
Accordion.Item({
  onOpenChange(open) {
    open.valueOf();
  },
});

Accordion.Header({});

Accordion.Trigger({
  nativeButton: false,
  render: html`<span></span>`,
});

Accordion.Trigger({
  render: (_props, state) => html`<span data-open=${state.open ? '' : undefined}></span>`,
});

Accordion.Panel({ keepMounted: true, hiddenUntilFound: true });
Accordion.Panel({
  render: (_props, state) =>
    html`<span data-transition=${state.transitionStatus ?? undefined}></span>`,
});
