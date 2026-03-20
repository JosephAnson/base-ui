'use client';
import * as React from 'react';
import { html } from 'lit';
import '@base-ui/lit/checkbox';
import styles from 'docs/src/app/(docs)/react/components/checkbox-group/demos/hero/css-modules/index.module.css';
import { LitCheckboxGroup } from '../../shared/LitCheckboxGroup';
import { checkIcon } from '../../shared/icons';

export default function ExampleCheckboxGroup() {
  const id = React.useId();

  return (
    <LitCheckboxGroup
      groupProps={{
        'aria-labelledby': id,
        className: styles.CheckboxGroup,
        defaultValue: ['fuji-apple'],
      }}
    >
      {html`
        <div class=${styles.Caption} id=${id}>Apples</div>

        <label class=${styles.Item}>
          <checkbox-root
            name="apple"
            value="fuji-apple"
            class=${styles.Checkbox}
          >
            <checkbox-indicator class=${styles.Indicator}>
              ${checkIcon(styles.Icon)}
            </checkbox-indicator>
          </checkbox-root>
          Fuji
        </label>

        <label class=${styles.Item}>
          <checkbox-root
            name="apple"
            value="gala-apple"
            class=${styles.Checkbox}
          >
            <checkbox-indicator class=${styles.Indicator}>
              ${checkIcon(styles.Icon)}
            </checkbox-indicator>
          </checkbox-root>
          Gala
        </label>

        <label class=${styles.Item}>
          <checkbox-root
            name="apple"
            value="granny-smith-apple"
            class=${styles.Checkbox}
          >
            <checkbox-indicator class=${styles.Indicator}>
              ${checkIcon(styles.Icon)}
            </checkbox-indicator>
          </checkbox-root>
          Granny Smith
        </label>
      `}
    </LitCheckboxGroup>
  );
}
