import { afterEach, describe, expect, expectTypeOf, it } from 'vitest';
import { render, html } from 'lit';
import '../calendar';
import type { CalendarRootElement } from '../calendar';
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

  it('provides weekStartsOn defaults to descendant calendar roots', () => {
    container = document.createElement('div');
    document.body.appendChild(container);

    const provider = document.createElement('localization-provider') as LocalizationProviderElement;
    const calendar = document.createElement('calendar-root') as CalendarRootElement;
    provider.append(calendar);
    container.append(provider);

    provider.temporalLocale = {
      code: 'en-US',
      options: { weekStartsOn: 1 },
    };

    expect(calendar.getWeeks()[0]?.[0]?.getDay()).toBe(1);
    expect(calendar.getWeekdayNames()[0]?.toLowerCase()).toContain('mon');
  });

  it('uses the nearest provider for descendant calendar roots', () => {
    container = document.createElement('div');
    document.body.appendChild(container);

    const outerProvider = document.createElement(
      'localization-provider',
    ) as LocalizationProviderElement;
    const innerProvider = document.createElement(
      'localization-provider',
    ) as LocalizationProviderElement;
    const outerCalendar = document.createElement('calendar-root') as CalendarRootElement;
    const innerCalendar = document.createElement('calendar-root') as CalendarRootElement;

    outerCalendar.id = 'outer';
    innerCalendar.id = 'inner';

    outerProvider.append(outerCalendar, innerProvider);
    innerProvider.append(innerCalendar);
    container.append(outerProvider);

    outerProvider.temporalLocale = {
      code: 'en-US',
      options: { weekStartsOn: 1 },
    };
    innerProvider.temporalLocale = {
      code: 'en-US',
      options: { weekStartsOn: 0 },
    };

    expect(outerCalendar.getWeeks()[0]?.[0]?.getDay()).toBe(1);
    expect(innerCalendar.getWeeks()[0]?.[0]?.getDay()).toBe(0);
  });
});
