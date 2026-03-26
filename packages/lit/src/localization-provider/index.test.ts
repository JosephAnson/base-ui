import { afterEach, describe, expect, expectTypeOf, it } from 'vitest';
import { render, html } from 'lit';
import {
  getLocalizationContext,
  LocalizationProviderElement,
  type LocalizationContext,
  type LocalizationProvider,
  type LocalizationProviderProps,
} from './index';

describe('localization-provider', () => {
  let container: HTMLDivElement;

  function mount(template: ReturnType<typeof html>) {
    container = document.createElement('div');
    document.body.appendChild(container);
    render(template, container);
  }

  afterEach(() => {
    container?.remove();
  });

  it('exposes namespace aliases for props', () => {
    expectTypeOf<LocalizationProviderProps>().toEqualTypeOf<LocalizationProvider.Props>();
  });

  it('registers the custom element', () => {
    expect(customElements.get('localization-provider')).toBe(LocalizationProviderElement);
  });

  it('renders with display: contents', () => {
    mount(html`<localization-provider></localization-provider>`);
    const el = container.querySelector('localization-provider')!;
    expect(el.style.display).toBe('contents');
  });

  it('getLocalizationContext returns empty object when no provider', () => {
    mount(html`<div id="target"></div>`);
    const ctx = getLocalizationContext(container.querySelector('#target')!);
    expectTypeOf(ctx).toEqualTypeOf<LocalizationContext>();
    expect(ctx).toEqual({});
  });

  it('getLocalizationContext returns temporalLocale from the provider', () => {
    const mockLocale = { code: 'fr' };
    mount(html`
      <localization-provider>
        <div id="target"></div>
      </localization-provider>
    `);
    const provider = container.querySelector(
      'localization-provider',
    ) as LocalizationProviderElement;
    provider.temporalLocale = mockLocale;

    const ctx = getLocalizationContext(container.querySelector('#target')!);
    expect(ctx.temporalLocale).toBe(mockLocale);
  });

  it('supports locale as a compatibility alias', () => {
    const mockLocale = { code: 'de' };
    mount(html`
      <localization-provider>
        <div id="target"></div>
      </localization-provider>
    `);
    const provider = container.querySelector(
      'localization-provider',
    ) as LocalizationProviderElement;
    provider.locale = mockLocale;

    expect(provider.temporalLocale).toBe(mockLocale);
    expect(getLocalizationContext(container.querySelector('#target')!).temporalLocale).toBe(
      mockLocale,
    );
  });

  it('returns undefined locale when provider has no locale set', () => {
    mount(html`
      <localization-provider>
        <div id="target"></div>
      </localization-provider>
    `);
    const ctx = getLocalizationContext(container.querySelector('#target')!);
    expect(ctx.temporalLocale).toBeUndefined();
  });
});
