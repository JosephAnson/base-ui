'use client';
import * as React from 'react';
import { html, nothing, render as renderTemplate, svg } from 'lit';
import '@base-ui/lit/select';
import '@base-ui/lit/toggle';
import '@base-ui/lit/toggle-group';
import '@base-ui/lit/toolbar';
import styles from './index.module.css';

export default function ExampleToolbar() {
  const hostRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(
      html`<toolbar-root .render=${html`<div class=${styles.Toolbar}></div>`}>
        <toggle-group-root
          aria-label="Alignment"
          .defaultValue=${['align-left']}
          .render=${html`<div class=${styles.Group}></div>`}
        >
          <toolbar-button
            aria-label="Align left"
            value="align-left"
            .render=${html`<toggle-root class=${styles.Button}></toggle-root>`}
          >
            Align Left
          </toolbar-button>
          <toolbar-button
            aria-label="Align right"
            value="align-right"
            .render=${html`<toggle-root class=${styles.Button}></toggle-root>`}
          >
            Align Right
          </toolbar-button>
        </toggle-group-root>
        <toolbar-separator class=${styles.Separator}></toolbar-separator>
        <toolbar-group
          aria-label="Numerical format"
          .render=${html`<div class=${styles.Group}></div>`}
        >
          <toolbar-button
            aria-label="Format as currency"
            .render=${html`<button class=${styles.Button} type="button"></button>`}
          >
            $
          </toolbar-button>
          <toolbar-button
            aria-label="Format as percent"
            .render=${html`<button class=${styles.Button} type="button"></button>`}
          >
            %
          </toolbar-button>
        </toolbar-group>
        <toolbar-separator class=${styles.Separator}></toolbar-separator>
        <select-root .defaultValue=${'Helvetica'}>
          <toolbar-button
            .render=${html`<select-trigger class=${styles.Button}></select-trigger>`}
          >
            <select-value></select-value>
            <select-icon class=${styles.SelectIcon}>${chevronUpDownIcon()}</select-icon>
          </toolbar-button>
          <select-popup>
            <select-positioner class=${styles.Positioner} .sideOffset=${8}>
              <select-list class=${styles.Popup}>
                <select-item class=${styles.Item} value="Helvetica">
                  <select-item-indicator class=${styles.ItemIndicator}>
                    ${checkIcon(styles.ItemIndicatorIcon)}
                  </select-item-indicator>
                  <select-item-text class=${styles.ItemText}>Helvetica</select-item-text>
                </select-item>
                <select-item class=${styles.Item} value="Arial">
                  <select-item-indicator class=${styles.ItemIndicator}>
                    ${checkIcon(styles.ItemIndicatorIcon)}
                  </select-item-indicator>
                  <select-item-text class=${styles.ItemText}>Arial</select-item-text>
                </select-item>
              </select-list>
            </select-positioner>
          </select-popup>
        </select-root>
        <toolbar-separator class=${styles.Separator}></toolbar-separator>
        <toolbar-link
          href="#"
          .render=${html`<a class=${styles.Link}></a>`}
        >
          Edited 51m ago
        </toolbar-link>
      </toolbar-root>`,
      host,
    );

    return () => {
      renderTemplate(nothing, host);
    };
  }, []);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}

function chevronUpDownIcon() {
  return svg`<svg width="8" height="12" viewBox="0 0 8 12" fill="none" stroke="currentcolor" stroke-width="1.5">
    <path d="M0.5 4.5L4 1.5L7.5 4.5" />
    <path d="M0.5 7.5L4 10.5L7.5 7.5" />
  </svg>`;
}

function checkIcon(className: string) {
  return svg`<svg fill="currentcolor" width="10" height="10" viewBox="0 0 10 10" class=${className}>
    <path d="M9.1603 1.12218C9.50684 1.34873 9.60427 1.81354 9.37792 2.16038L5.13603 8.66012C5.01614 8.8438 4.82192 8.96576 4.60451 8.99384C4.3871 9.02194 4.1683 8.95335 4.00574 8.80615L1.24664 6.30769C0.939709 6.02975 0.916013 5.55541 1.19372 5.24822C1.47142 4.94102 1.94536 4.91731 2.2523 5.19524L4.36085 7.10461L8.12299 1.33999C8.34934 0.993152 8.81376 0.895638 9.1603 1.12218Z" />
  </svg>`;
}
