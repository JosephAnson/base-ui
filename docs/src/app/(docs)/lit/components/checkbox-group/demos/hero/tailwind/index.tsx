'use client';
import * as React from 'react';
import { html } from 'lit';
import { Checkbox } from '@base-ui/lit/checkbox';
import { LitCheckboxGroup } from '../../shared/LitCheckboxGroup';
import { checkIcon } from '../../shared/icons';

export default function ExampleCheckboxGroup() {
  const id = React.useId();

  return (
    <LitCheckboxGroup
      groupProps={{
        'aria-labelledby': id,
        className: 'flex flex-col items-start gap-1 text-gray-900',
        defaultValue: ['fuji-apple'],
      }}
    >
      {html`
        <div class="font-medium" id=${id}>Apples</div>

        <label class="flex items-center gap-2">
          ${Checkbox.Root({
            name: 'apple',
            value: 'fuji-apple',
            className:
              'flex size-5 items-center justify-center rounded-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800 data-[checked]:bg-gray-900 data-[unchecked]:border data-[unchecked]:border-gray-300',
            children: Checkbox.Indicator({
              className: 'flex text-gray-50 data-[unchecked]:hidden',
              children: checkIcon('size-3'),
            }),
          })}
          Fuji
        </label>

        <label class="flex items-center gap-2">
          ${Checkbox.Root({
            name: 'apple',
            value: 'gala-apple',
            className:
              'flex size-5 items-center justify-center rounded-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800 data-[checked]:bg-gray-900 data-[unchecked]:border data-[unchecked]:border-gray-300',
            children: Checkbox.Indicator({
              className: 'flex text-gray-50 data-[unchecked]:hidden',
              children: checkIcon('size-3'),
            }),
          })}
          Gala
        </label>

        <label class="flex items-center gap-2">
          ${Checkbox.Root({
            name: 'apple',
            value: 'granny-smith-apple',
            className:
              'flex size-5 items-center justify-center rounded-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800 data-[checked]:bg-gray-900 data-[unchecked]:border data-[unchecked]:border-gray-300',
            children: Checkbox.Indicator({
              className: 'flex text-gray-50 data-[unchecked]:hidden',
              children: checkIcon('size-3'),
            }),
          })}
          Granny Smith
        </label>
      `}
    </LitCheckboxGroup>
  );
}
