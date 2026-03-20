import { afterEach, describe, expect, it } from 'vitest';
import { render, html } from 'lit';
import {
  getLabelableContext,
  LabelableProviderElement,
  focusElementWithVisible,
} from './index.ts';

describe('labelable-provider', () => {
  let container: HTMLDivElement;

  function mount(template: ReturnType<typeof html>) {
    container = document.createElement('div');
    document.body.appendChild(container);
    render(template, container);
  }

  afterEach(() => {
    container?.remove();
  });

  describe('LabelableProviderElement', () => {
    it('registers the custom element', () => {
      expect(customElements.get('labelable-provider')).toBe(LabelableProviderElement);
    });

    it('renders with display: contents', () => {
      mount(html`<labelable-provider></labelable-provider>`);
      const el = container.querySelector('labelable-provider')!;
      expect(el.style.display).toBe('contents');
    });
  });

  describe('getLabelableContext', () => {
    it('returns null when no provider exists', () => {
      mount(html`<div id="target"></div>`);
      const target = container.querySelector('#target')!;
      expect(getLabelableContext(target)).toBeNull();
    });

    it('returns a context object from the nearest provider', () => {
      mount(html`
        <labelable-provider>
          <div id="target"></div>
        </labelable-provider>
      `);
      const target = container.querySelector('#target')!;
      const ctx = getLabelableContext(target);
      expect(ctx).not.toBeNull();
      expect(ctx!.controlId).toBeUndefined();
    });
  });

  describe('control ID registration', () => {
    it('registers and resolves a control ID', () => {
      mount(html`
        <labelable-provider>
          <div id="target"></div>
        </labelable-provider>
      `);
      const target = container.querySelector('#target')!;
      const ctx = getLabelableContext(target)!;

      const source = Symbol('test');
      ctx.registerControlId(source, 'my-input');
      expect(ctx.controlId).toBe('my-input');
    });

    it('unregisters a control ID', () => {
      mount(html`
        <labelable-provider>
          <div id="target"></div>
        </labelable-provider>
      `);
      const target = container.querySelector('#target')!;
      const ctx = getLabelableContext(target)!;

      const source = Symbol('test');
      ctx.registerControlId(source, 'my-input');
      ctx.registerControlId(source, undefined);
      expect(ctx.controlId).toBeUndefined();
    });

    it('supports multiple control ID sources', () => {
      mount(html`
        <labelable-provider>
          <div id="target"></div>
        </labelable-provider>
      `);
      const target = container.querySelector('#target')!;
      const ctx = getLabelableContext(target)!;

      const s1 = Symbol('s1');
      const s2 = Symbol('s2');
      ctx.registerControlId(s1, 'id-1');
      ctx.registerControlId(s2, 'id-2');
      // Last non-null wins
      expect(ctx.controlId).toBe('id-2');

      ctx.registerControlId(s2, undefined);
      expect(ctx.controlId).toBe('id-1');
    });
  });

  describe('label ID registration', () => {
    it('registers a label ID', () => {
      mount(html`
        <labelable-provider>
          <div id="target"></div>
        </labelable-provider>
      `);
      const ctx = getLabelableContext(container.querySelector('#target')!)!;
      ctx.registerLabelId('my-label');
      expect(ctx.labelId).toBe('my-label');
    });
  });

  describe('message ID registration', () => {
    it('registers and tracks message IDs', () => {
      mount(html`
        <labelable-provider>
          <div id="target"></div>
        </labelable-provider>
      `);
      const ctx = getLabelableContext(container.querySelector('#target')!)!;

      ctx.registerMessageId('msg-1', true);
      ctx.registerMessageId('msg-2', true);
      expect(ctx.messageIds).toEqual(['msg-1', 'msg-2']);
    });

    it('removes message IDs', () => {
      mount(html`
        <labelable-provider>
          <div id="target"></div>
        </labelable-provider>
      `);
      const ctx = getLabelableContext(container.querySelector('#target')!)!;

      ctx.registerMessageId('msg-1', true);
      ctx.registerMessageId('msg-2', true);
      ctx.registerMessageId('msg-1', false);
      expect(ctx.messageIds).toEqual(['msg-2']);
    });

    it('does not add duplicates', () => {
      mount(html`
        <labelable-provider>
          <div id="target"></div>
        </labelable-provider>
      `);
      const ctx = getLabelableContext(container.querySelector('#target')!)!;

      ctx.registerMessageId('msg-1', true);
      ctx.registerMessageId('msg-1', true);
      expect(ctx.messageIds).toEqual(['msg-1']);
    });
  });

  describe('getDescriptionProps', () => {
    it('returns aria-describedby with joined message IDs', () => {
      mount(html`
        <labelable-provider>
          <div id="target"></div>
        </labelable-provider>
      `);
      const ctx = getLabelableContext(container.querySelector('#target')!)!;

      ctx.registerMessageId('err-1', true);
      ctx.registerMessageId('desc-1', true);

      const props = ctx.getDescriptionProps();
      expect(props['aria-describedby']).toBe('err-1 desc-1');
    });

    it('returns undefined aria-describedby when no messages', () => {
      mount(html`
        <labelable-provider>
          <div id="target"></div>
        </labelable-provider>
      `);
      const ctx = getLabelableContext(container.querySelector('#target')!)!;

      const props = ctx.getDescriptionProps();
      expect(props['aria-describedby']).toBeUndefined();
    });
  });

  describe('focusElementWithVisible', () => {
    it('focuses an element', () => {
      mount(html`<button id="btn">Test</button>`);
      const btn = container.querySelector('#btn') as HTMLButtonElement;
      focusElementWithVisible(btn);
      expect(document.activeElement).toBe(btn);
    });
  });
});
