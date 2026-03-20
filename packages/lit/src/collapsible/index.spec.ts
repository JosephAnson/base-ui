import { html } from 'lit';
import { Collapsible } from '@base-ui/lit/collapsible';

Collapsible.Root({
  defaultOpen: true,
  onOpenChange(open) {
    open.valueOf();
  },
});

Collapsible.Root({
  open: true,
  render: (_props, state) => html`<div data-open=${state.open ? '' : undefined}></div>`,
});

Collapsible.Trigger({
  nativeButton: false,
  render: html`<span></span>`,
});

Collapsible.Trigger({
  render: (_props, state) => html`<span data-status=${state.transitionStatus ?? undefined}></span>`,
});

Collapsible.Panel({ keepMounted: true, hiddenUntilFound: true });
Collapsible.Panel({
  render: (_props, state) =>
    html`<div data-transition=${state.transitionStatus ?? undefined}></div>`,
});
