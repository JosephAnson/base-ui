import { afterEach, describe, expect, expectTypeOf, it } from 'vitest';
import { render, html } from 'lit';
import {
  getLabelableContext,
  LabelableProviderElement,
  LabelableProvider,
  focusElementWithVisible,
  type LabelableProviderProps,
  type LabelableProviderState,
} from './index';

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
    it('exposes namespace aliases for props and state', () => {
      expectTypeOf<LabelableProviderProps>().toEqualTypeOf<LabelableProvider.Props>();
      expectTypeOf<LabelableProviderState>().toEqualTypeOf<LabelableProvider.State>();
    });

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
      expect(ctx!.controlId).toMatch(/^base-ui-labelable-control-/);
    });

    it('reads initial control-id and label-id attributes from the provider', () => {
      mount(html`
        <labelable-provider control-id="my-input" label-id="my-label">
          <div id="target"></div>
        </labelable-provider>
      `);
      const ctx = getLabelableContext(container.querySelector('#target')!)!;

      expect(ctx.controlId).toBe('my-input');
      expect(ctx.labelId).toBe('my-label');
    });

    it('preserves an explicit null controlId', () => {
      mount(html`
        <labelable-provider>
          <div id="target"></div>
        </labelable-provider>
      `);
      const provider = container.querySelector('labelable-provider') as LabelableProviderElement;
      const ctx = getLabelableContext(container.querySelector('#target')!)!;

      provider.controlId = null;

      expect(ctx.controlId).toBeNull();
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
      expect(ctx.controlId).toMatch(/^base-ui-labelable-control-/);
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

    it('preserves null registrations instead of treating them as unregistered', () => {
      mount(html`
        <labelable-provider>
          <div id="target"></div>
        </labelable-provider>
      `);
      const ctx = getLabelableContext(container.querySelector('#target')!)!;
      const source = Symbol('implicit');

      ctx.registerControlId(source, null);

      expect(ctx.controlId).toBeNull();

      ctx.registerControlId(source, undefined);

      expect(ctx.controlId).toMatch(/^base-ui-labelable-control-/);
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

    it('merges parent message ids and external aria-describedby values', () => {
      mount(html`
        <labelable-provider id="outer">
          <labelable-provider id="inner">
            <div id="target"></div>
          </labelable-provider>
        </labelable-provider>
      `);

      const outer = container.querySelector('#outer')!;
      const inner = container.querySelector('#inner')!;
      const outerContext = getLabelableContext(outer)!;
      const innerContext = getLabelableContext(inner)!;

      outerContext.registerMessageId('parent-msg', true);
      innerContext.registerMessageId('child-msg', true);

      const props = innerContext.getDescriptionProps({
        'aria-describedby': 'external-msg child-msg',
      });

      expect(props['aria-describedby']).toBe('parent-msg child-msg external-msg');
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
