import { afterEach, describe, expect, expectTypeOf, it } from 'vitest';
import { render, html } from 'lit';
import {
  getDirection,
  DirectionProviderElement,
  DirectionProvider,
  type DirectionProviderProps,
  type DirectionProviderState,
} from './index';

describe('direction-provider', () => {
  let container: HTMLDivElement;

  function mount(template: ReturnType<typeof html>) {
    container = document.createElement('div');
    document.body.appendChild(container);
    render(template, container);
  }

  afterEach(() => {
    container?.remove();
    document.documentElement.removeAttribute('dir');
  });

  describe('getDirection', () => {
    it('returns "ltr" by default', () => {
      mount(html`<div id="target"></div>`);
      const target = container.querySelector('#target')!;
      expect(getDirection(target)).toBe('ltr');
    });

    it('returns "rtl" when document element has dir="rtl"', () => {
      document.documentElement.setAttribute('dir', 'rtl');
      mount(html`<div id="target"></div>`);
      const target = container.querySelector('#target')!;
      expect(getDirection(target)).toBe('rtl');
    });

    it('returns "rtl" when nearest ancestor has dir="rtl"', () => {
      mount(html`<div dir="rtl"><div id="target"></div></div>`);
      const target = container.querySelector('#target')!;
      expect(getDirection(target)).toBe('rtl');
    });

    it('nearest ancestor dir overrides document dir', () => {
      document.documentElement.setAttribute('dir', 'rtl');
      mount(html`<div dir="ltr"><div id="target"></div></div>`);
      const target = container.querySelector('#target')!;
      expect(getDirection(target)).toBe('ltr');
    });

    it('reads dir from the element itself', () => {
      mount(html`<div id="target" dir="rtl"></div>`);
      const target = container.querySelector('#target')!;
      expect(getDirection(target)).toBe('rtl');
    });

    it('returns "ltr" for invalid dir values', () => {
      mount(html`<div dir="auto"><div id="target"></div></div>`);
      const target = container.querySelector('#target')!;
      expect(getDirection(target)).toBe('ltr');
    });
  });

  describe('DirectionProviderElement', () => {
    it('exposes namespace aliases for props and state', () => {
      expectTypeOf<DirectionProviderProps>().toEqualTypeOf<DirectionProvider.Props>();
      expectTypeOf<DirectionProviderState>().toEqualTypeOf<DirectionProvider.State>();
    });

    it('registers the custom element', () => {
      expect(customElements.get('direction-provider')).toBe(DirectionProviderElement);
    });

    it('renders with display: contents', () => {
      mount(html`<direction-provider></direction-provider>`);
      const el = container.querySelector('direction-provider')!;
      expect(el.style.display).toBe('contents');
    });

    it('defaults direction to "ltr"', () => {
      mount(html`<direction-provider></direction-provider>`);
      const el = container.querySelector('direction-provider') as DirectionProviderElement;
      expect(el.direction).toBe('ltr');
      expect(el.dir).toBe('ltr');
      expect(el.getAttribute('dir')).toBe('ltr');
    });

    it('sets the direction attribute on the element and mirrors dir', async () => {
      mount(html`<direction-provider direction="rtl"></direction-provider>`);
      const el = container.querySelector('direction-provider') as DirectionProviderElement;

      await el.updateComplete;

      expect(el.direction).toBe('rtl');
      expect(el.dir).toBe('rtl');
      expect(el.getAttribute('direction')).toBe('rtl');
      expect(el.getAttribute('dir')).toBe('rtl');
    });

    it('maps a legacy dir attribute to the public direction property', async () => {
      mount(html`<direction-provider dir="rtl"></direction-provider>`);
      const el = container.querySelector('direction-provider') as DirectionProviderElement;

      await el.updateComplete;

      expect(el.direction).toBe('rtl');
      expect(el.getAttribute('direction')).toBe('rtl');
      expect(el.getAttribute('dir')).toBe('rtl');
    });

    it('children resolve direction from the provider', () => {
      mount(html`
        <direction-provider direction="rtl">
          <div id="child"></div>
        </direction-provider>
      `);
      const child = container.querySelector('#child')!;
      expect(getDirection(child)).toBe('rtl');
    });

    it('nested providers override parent direction', () => {
      mount(html`
        <direction-provider direction="rtl">
          <direction-provider direction="ltr">
            <div id="inner"></div>
          </direction-provider>
          <div id="outer"></div>
        </direction-provider>
      `);
      const inner = container.querySelector('#inner')!;
      const outer = container.querySelector('#outer')!;
      expect(getDirection(inner)).toBe('ltr');
      expect(getDirection(outer)).toBe('rtl');
    });
  });
});
