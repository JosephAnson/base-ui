import { Form, type FormValidationMode } from '@base-ui/lit/form';

interface Values {
  age: number;
  name: string;
}

Form<Values>({
  onFormSubmit(values) {
    values.name.toUpperCase();
    values.age.toFixed(0);
    // @ts-expect-error
    values.email.startsWith('a');
  },
});

const validationMode: FormValidationMode = 'onSubmit';

// @ts-expect-error
const invalidValidationMode: FormValidationMode = 'onMount';

void validationMode;
void invalidValidationMode;
