'use client';
import * as React from 'react';
import { useIsoLayoutEffect } from '@base-ui/utils/useIsoLayoutEffect';
import { html, nothing, render as renderTemplate } from 'lit';
import '@base-ui/lit/radio';
import '@base-ui/lit/radio-group';

export default function ExampleRadioGroup() {
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const id = React.useId();

  useIsoLayoutEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(
      html`<radio-group
        class="flex flex-col items-start gap-1 text-gray-900"
        aria-labelledby=${id}
        .defaultValue=${'fuji-apple'}
      >
        <div class="font-bold" id=${id}>Best apple</div>

        <label class="flex items-center gap-2 font-normal">
          <radio-root
            class="flex size-5 items-center justify-center rounded-full border-0 p-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800 data-[checked]:bg-gray-900 data-[unchecked]:border data-[unchecked]:border-gray-300"
            .value=${'fuji-apple'}
          >
            <radio-indicator
              class="flex before:size-2 before:rounded-full before:bg-gray-50 data-[unchecked]:hidden"
            ></radio-indicator>
          </radio-root>
          Fuji
        </label>

        <label class="flex items-center gap-2 font-normal">
          <radio-root
            class="flex size-5 items-center justify-center rounded-full border-0 p-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800 data-[checked]:bg-gray-900 data-[unchecked]:border data-[unchecked]:border-gray-300"
            .value=${'gala-apple'}
          >
            <radio-indicator
              class="flex before:size-2 before:rounded-full before:bg-gray-50 data-[unchecked]:hidden"
            ></radio-indicator>
          </radio-root>
          Gala
        </label>

        <label class="flex items-center gap-2 font-normal">
          <radio-root
            class="flex size-5 items-center justify-center rounded-full border-0 p-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800 data-[checked]:bg-gray-900 data-[unchecked]:border data-[unchecked]:border-gray-300"
            .value=${'granny-smith-apple'}
          >
            <radio-indicator
              class="flex before:size-2 before:rounded-full before:bg-gray-50 data-[unchecked]:hidden"
            ></radio-indicator>
          </radio-root>
          Granny Smith
        </label>
      </radio-group>`,
      host,
    );

    return () => {
      renderTemplate(nothing, host);
    };
  }, [id]);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}
