import { html } from 'lit';
import { Checkbox } from '@base-ui/lit/checkbox';
import { Field } from '@base-ui/lit/field';

Field.Root({});
Field.Root({
  validationMode: 'onChange',
  validate: (value) => (value ? null : 'Required'),
});

Field.Label({});
Field.Label({
  nativeLabel: false,
  render: html`<div></div>`,
});

Field.Control({});
Field.Control({
  defaultValue: 'Alice',
  onValueChange(value) {
    value.toUpperCase();
  },
});
Field.Control({
  render: (props) =>
    html`<textarea
      @blur=${props.onBlur}
      @change=${props.onChange}
      @focus=${props.onFocus}
      @input=${props.onInput}
      .value=${String(props.value ?? '')}
    ></textarea>`,
});

Field.Description({});
Field.Error({ match: 'valueMissing' });
Field.Validity({
  children(validity) {
    return html`<div>${String(validity.validity.valid)}</div>`;
  },
});
Field.Item({
  children: Checkbox.Root({}),
});
