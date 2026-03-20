'use client';
import * as React from 'react';
import { html } from 'lit';
import '@base-ui/lit/checkbox';
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
          <checkbox-root
            name="apple"
            value="fuji-apple"
            class="flex size-5 items-center justify-center rounded-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800 data-[checked]:bg-gray-900 data-[unchecked]:border data-[unchecked]:border-gray-300"
          >
            <checkbox-indicator class="flex text-gray-50 data-[unchecked]:hidden">
              ${checkIcon('size-3')}
            </checkbox-indicator>
          </checkbox-root>
          Fuji
        </label>

        <label class="flex items-center gap-2">
          <checkbox-root
            name="apple"
            value="gala-apple"
            class="flex size-5 items-center justify-center rounded-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800 data-[checked]:bg-gray-900 data-[unchecked]:border data-[unchecked]:border-gray-300"
          >
            <checkbox-indicator class="flex text-gray-50 data-[unchecked]:hidden">
              ${checkIcon('size-3')}
            </checkbox-indicator>
          </checkbox-root>
          Gala
        </label>

        <label class="flex items-center gap-2">
          <checkbox-root
            name="apple"
            value="granny-smith-apple"
            class="flex size-5 items-center justify-center rounded-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800 data-[checked]:bg-gray-900 data-[unchecked]:border data-[unchecked]:border-gray-300"
          >
            <checkbox-indicator class="flex text-gray-50 data-[unchecked]:hidden">
              ${checkIcon('size-3')}
            </checkbox-indicator>
          </checkbox-root>
          Granny Smith
        </label>
      `}
    </LitCheckboxGroup>
  );
}
