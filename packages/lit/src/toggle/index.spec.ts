import { html } from 'lit';
import { Toggle } from '@base-ui/lit/toggle';

Toggle({});
Toggle({ pressed: true });
Toggle({ defaultPressed: true });
Toggle({ value: 'favorite' });
Toggle({
  nativeButton: false,
  render: html`<span></span>`,
});
Toggle({
  render: (props, state) =>
    html`<button
      class=${String(props.className ?? '')}
      aria-pressed=${state.pressed ? 'true' : 'false'}
    ></button>`,
});
