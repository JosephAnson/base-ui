import { afterEach, describe, expect, it } from 'vitest';
import { render, html } from 'lit';
import { getCSPContext, CSPProviderElement } from './index.ts';

describe('csp-provider', () => {
  let container: HTMLDivElement;

  function mount(template: ReturnType<typeof html>) {
    container = document.createElement('div');
    document.body.appendChild(container);
    render(template, container);
  }

  afterEach(() => {
    container?.remove();
  });

  describe('CSPProviderElement', () => {
    it('registers the custom element', () => {
      expect(customElements.get('csp-provider')).toBe(CSPProviderElement);
    });

    it('renders with display: contents', () => {
      mount(html`<csp-provider></csp-provider>`);
      const el = container.querySelector('csp-provider')!;
      expect(el.style.display).toBe('contents');
    });

    it('defaults disableStyleElements to false', () => {
      mount(html`<csp-provider></csp-provider>`);
      const el = container.querySelector('csp-provider') as CSPProviderElement;
      expect(el.disableStyleElements).toBe(false);
    });

    it('accepts nonce attribute', () => {
      mount(html`<csp-provider nonce="abc123"></csp-provider>`);
      const el = container.querySelector('csp-provider') as CSPProviderElement;
      expect(el.nonce).toBe('abc123');
    });

    it('accepts disable-style-elements attribute', () => {
      mount(html`<csp-provider disable-style-elements></csp-provider>`);
      const el = container.querySelector('csp-provider') as CSPProviderElement;
      expect(el.disableStyleElements).toBe(true);
    });
  });

  describe('getCSPContext', () => {
    it('returns default context when no provider exists', () => {
      mount(html`<div id="target"></div>`);
      const target = container.querySelector('#target')!;
      expect(getCSPContext(target)).toEqual({ disableStyleElements: false });
    });

    it('returns nonce from the nearest provider', () => {
      mount(html`
        <csp-provider nonce="xyz789">
          <div id="target"></div>
        </csp-provider>
      `);
      const target = container.querySelector('#target')!;
      const ctx = getCSPContext(target);
      expect(ctx.nonce).toBe('xyz789');
    });

    it('returns disableStyleElements from the provider', () => {
      mount(html`
        <csp-provider disable-style-elements>
          <div id="target"></div>
        </csp-provider>
      `);
      const target = container.querySelector('#target')!;
      const ctx = getCSPContext(target);
      expect(ctx.disableStyleElements).toBe(true);
    });

    it('finds the nearest provider when nested', () => {
      mount(html`
        <csp-provider nonce="outer">
          <csp-provider nonce="inner">
            <div id="inner-target"></div>
          </csp-provider>
          <div id="outer-target"></div>
        </csp-provider>
      `);
      const inner = container.querySelector('#inner-target')!;
      const outer = container.querySelector('#outer-target')!;
      expect(getCSPContext(inner).nonce).toBe('inner');
      expect(getCSPContext(outer).nonce).toBe('outer');
    });

    it('returns undefined nonce when provider has empty nonce', () => {
      mount(html`
        <csp-provider>
          <div id="target"></div>
        </csp-provider>
      `);
      const target = container.querySelector('#target')!;
      expect(getCSPContext(target).nonce).toBeUndefined();
    });
  });
});
