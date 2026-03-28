'use client';
import * as React from 'react';
import { html, nothing, render as renderTemplate, svg } from 'lit';
import '@base-ui/lit/checkbox';
import '@base-ui/lit/checkbox-group';

export default function ExampleCheckboxGroup() {
  const id = React.useId();
  const hostRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(
      html`<checkbox-group
        aria-labelledby=${id}
        class="flex flex-col items-start gap-1 text-gray-900"
        .defaultValue=${['fuji-apple']}
      >
        <div class="font-bold" id=${id}>Apples</div>

        <label class="flex items-center gap-2 font-normal">
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

        <label class="flex items-center gap-2 font-normal">
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

        <label class="flex items-center gap-2 font-normal">
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
      </checkbox-group>`,
      host,
    );

    return () => {
      renderTemplate(nothing, host);
    };
  }, [id]);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}

function checkIcon(className?: string) {
  return svg`<svg fill="currentcolor" width="10" height="10" viewBox="0 0 10 10" class=${className ?? nothing}>
    <path d="M9.1603 1.12218C9.50684 1.34873 9.60427 1.81354 9.37792 2.16038L5.13603 8.66012C5.01614 8.8438 4.82192 8.96576 4.60451 8.99384C4.3871 9.02194 4.1683 8.95335 4.00574 8.80615L1.24664 6.30769C0.939709 6.02975 0.916013 5.55541 1.19372 5.24822C1.47142 4.94102 1.94536 4.91731 2.2523 5.19524L4.36085 7.10461L8.12299 1.33999C8.34934 0.993152 8.81376 0.895638 9.1603 1.12218Z" />
  </svg>`;
}
