import { html } from 'lit';
import { Input } from '@base-ui/lit/input';

Input({});
Input({ placeholder: 'Enter your name' });
Input({ defaultValue: 'Alice' });
Input({
  value: 'Alice',
  onValueChange(value) {
    value.toUpperCase();
  },
});
Input({ render: html`<textarea></textarea>` });
Input({
  render: (props) =>
    html`<textarea
      @change=${props.onChange}
      @input=${props.onInput}
      class=${String(props.className ?? '')}
      .value=${String(props.value ?? '')}
    ></textarea>`,
});

const textareaRef = { current: null as HTMLTextAreaElement | null };

Input({ ref: textareaRef, render: html`<textarea></textarea>` });
