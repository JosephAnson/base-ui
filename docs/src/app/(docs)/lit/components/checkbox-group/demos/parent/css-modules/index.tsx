'use client';
import * as React from 'react';
import { html } from 'lit';
import '@base-ui/lit/checkbox';
import styles from 'docs/src/app/(docs)/react/components/checkbox-group/demos/parent/css-modules/index.module.css';
import { LitCheckboxGroup } from '../../shared/LitCheckboxGroup';
import { checkIcon, horizontalRuleIcon } from '../../shared/icons';

const fruits = ['fuji-apple', 'gala-apple', 'granny-smith-apple'];

export default function ExampleCheckboxGroup() {
  const id = React.useId();
  const [value, setValue] = React.useState<string[]>([]);
  const parentIsMixed = value.length > 0 && value.length !== fruits.length;

  return (
    <LitCheckboxGroup
      groupProps={{
        'aria-labelledby': id,
        allValues: fruits,
        className: styles.CheckboxGroup,
        onValueChange: setValue,
        style: { marginLeft: '1rem' },
        value,
      }}
    >
      {html`
        <label class=${styles.Item} id=${id} style="margin-left: -1rem;">
          <checkbox-root
            ?parent=${true}
            class=${styles.Checkbox}
          >
            <checkbox-indicator class=${styles.Indicator}>
              ${parentIsMixed
                ? horizontalRuleIcon(styles.Icon)
                : checkIcon(styles.Icon)}
            </checkbox-indicator>
          </checkbox-root>
          Apples
        </label>

        <label class=${styles.Item}>
          <checkbox-root
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
