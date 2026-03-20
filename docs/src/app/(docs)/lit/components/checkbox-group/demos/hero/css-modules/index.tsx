'use client';
import * as React from 'react';
import { html } from 'lit';
import { Checkbox } from '@base-ui/lit/checkbox';
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
          ${Checkbox.Root({
            name: 'apple',
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
            name: 'apple',
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
            name: 'apple',
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
