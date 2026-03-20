import { html } from 'lit';
import { Button } from '@base-ui/lit/button';

Button({});
Button({ type: 'submit', form: 'form-id', name: 'action' });

Button({ nativeButton: false, render: html`<span></span>` });
Button({
  nativeButton: false,
  render: (_props) => html`<div></div>`,
});
Button({ nativeButton: false, disabled: true, render: html`<span></span>` });

Button({ nativeButton: false, type: 'submit' });
