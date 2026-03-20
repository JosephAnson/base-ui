'use client';
import * as React from 'react';
import { html } from 'lit';
import { Checkbox } from '@base-ui/lit/checkbox';
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
          ${Checkbox.Root({
            parent: true,
            className: styles.Checkbox,
            children: Checkbox.Indicator({
              className: styles.Indicator,
              children: parentIsMixed
                ? horizontalRuleIcon(styles.Icon)
                : checkIcon(styles.Icon),
            }),
          })}
          Apples
        </label>

        <label class=${styles.Item}>
          ${Checkbox.Root({
            value: 'fuji-apple',
            className: styles.Checkbox,
            children: Checkbox.Indicator({
              className: styles.Indicator,
              children: checkIcon(styles.Icon),
            }),
          })}
          Fuji
        </label>

        <label class=${styles.Item}>
          ${Checkbox.Root({
            value: 'gala-apple',
            className: styles.Checkbox,
            children: Checkbox.Indicator({
              className: styles.Indicator,
              children: checkIcon(styles.Icon),
            }),
          })}
          Gala
        </label>

        <label class=${styles.Item}>
          ${Checkbox.Root({
            value: 'granny-smith-apple',
            className: styles.Checkbox,
            children: Checkbox.Indicator({
              className: styles.Indicator,
              children: checkIcon(styles.Icon),
            }),
          })}
          Granny Smith
        </label>
      `}
    </LitCheckboxGroup>
  );
}
