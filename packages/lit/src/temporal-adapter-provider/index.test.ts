import { afterEach, describe, expect, it } from 'vitest';
import { render, html } from 'lit';
import {
  getTemporalAdapter,
  TemporalAdapterProviderElement,
  type TemporalAdapter,
} from './index.ts';

const mockAdapter = {
  lib: 'mock',
  isTimezoneCompatible: false,
  formats: {} as any,
  escapedCharacters: { start: "'", end: "'" },
} as TemporalAdapter;

describe('temporal-adapter-provider', () => {
  let container: HTMLDivElement;

  function mount(template: ReturnType<typeof html>) {
    container = document.createElement('div');
    document.body.appendChild(container);
    render(template, container);
  }

  afterEach(() => {
    container?.remove();
  });

  it('registers the custom element', () => {
    expect(customElements.get('temporal-adapter-provider')).toBe(
      TemporalAdapterProviderElement,
    );
  });

  it('renders with display: contents', () => {
    mount(html`<temporal-adapter-provider></temporal-adapter-provider>`);
    const el = container.querySelector('temporal-adapter-provider')!;
    expect(el.style.display).toBe('contents');
  });

  it('getTemporalAdapter returns null when no provider', () => {
    mount(html`<div id="target"></div>`);
    expect(getTemporalAdapter(container.querySelector('#target')!)).toBeNull();
  });

  it('getTemporalAdapter returns the adapter from the nearest provider', () => {
    mount(html`
      <temporal-adapter-provider>
        <div id="target"></div>
      </temporal-adapter-provider>
    `);
    const provider = container.querySelector(
      'temporal-adapter-provider',
    ) as TemporalAdapterProviderElement;
    provider.adapter = mockAdapter;

    expect(getTemporalAdapter(container.querySelector('#target')!)).toBe(mockAdapter);
  });

  it('nested providers resolve to the nearest one', () => {
    const innerAdapter = { ...mockAdapter, lib: 'inner' } as TemporalAdapter;
    mount(html`
      <temporal-adapter-provider>
        <temporal-adapter-provider>
          <div id="inner"></div>
        </temporal-adapter-provider>
        <div id="outer"></div>
      </temporal-adapter-provider>
    `);

    const providers = container.querySelectorAll('temporal-adapter-provider');
    (providers[0] as TemporalAdapterProviderElement).adapter = mockAdapter;
    (providers[1] as TemporalAdapterProviderElement).adapter = innerAdapter;

    expect(getTemporalAdapter(container.querySelector('#inner')!)!.lib).toBe('inner');
    expect(getTemporalAdapter(container.querySelector('#outer')!)!.lib).toBe('mock');
  });
});
