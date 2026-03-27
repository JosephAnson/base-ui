/* eslint-disable testing-library/render-result-naming-convention */
import { html, nothing, render as renderTemplate, type TemplateResult } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import type { ComponentRenderFn, HTMLProps } from '@base-ui/lit/use-render';
import { useRender } from '@base-ui/lit/use-render';

describe('useRender', () => {
  const containers = new Set<HTMLDivElement>();

  afterEach(() => {
    containers.forEach((container) => {
      renderTemplate(nothing, container);
      container.remove();
    });
    containers.clear();
  });

  function render(result: TemplateResult | null) {
    const container = document.createElement('div');
    document.body.append(container);
    containers.add(container);

    renderTemplate(result ?? nothing, container);
    return container;
  }

  async function flushMicrotasks() {
    await Promise.resolve();
  }

  it('preserves the public type contracts', () => {
    const element1 = useRender({
      render: () => html`<div>Test</div>`,
    });

    const element2 = useRender({
      render: () => html`<div>Test</div>`,
      enabled: true,
    });

    const element3 = useRender({
      render: () => html`<div>Test</div>`,
      enabled: false,
    });

    const element4 = useRender({
      render: () => html`<div>Test</div>`,
      enabled: Math.random() > 0.5,
    });

    const props: HTMLProps<HTMLButtonElement> = {
      className: 'btn-primary',
      type: 'button',
      onclick(event) {
        event.preventDefault();
      },
    };

    const renderProp: ComponentRenderFn<{ id: string }, { pressed: boolean }> = (
      renderProps,
      state,
    ) => html`<button id=${renderProps.id} aria-pressed=${String(state.pressed)}></button>`;

    expectTypeOf(element1).toEqualTypeOf<TemplateResult>();
    expectTypeOf(element2).toEqualTypeOf<TemplateResult>();
    expectTypeOf(element3).toEqualTypeOf<null>();
    expectTypeOf(element4).toEqualTypeOf<TemplateResult | null>();
    expectTypeOf(props.ref).toEqualTypeOf<
      | { current: HTMLButtonElement | null }
      | ((instance: HTMLButtonElement | null) => void)
      | null
      | undefined
    >();
    expectTypeOf(renderProp).returns.toEqualTypeOf<TemplateResult>();
  });

  it('render props does not overwrite className in a render function when unspecified', () => {
    const container = render(
      useRender({
        render: (props) => html`<span class=${`my-span ${props.className ?? ''}`}></span>`,
      }),
    );

    expect(container.firstElementChild).toHaveAttribute('class', 'my-span ');
  });

  it('refs are handled as expected for static templates', async () => {
    const ref1 = { current: null as HTMLElement | null };
    const ref2 = { current: null as HTMLElement | null };

    const container = render(
      useRender({
        render: html`<span></span>`,
        ref: [ref1, ref2],
      }),
    );

    await flushMicrotasks();

    expect(ref1.current).toBe(container.firstElementChild);
    expect(ref2.current).toBe(container.firstElementChild);
  });

  it('assigns refs after the element is connected', async () => {
    const ref = vi.fn<(instance: HTMLElement | null) => void>();
    const container = document.createElement('div');
    document.body.append(container);
    containers.add(container);

    renderTemplate(
      useRender({
        defaultTagName: 'div',
        ref,
      }),
      container,
    );

    await flushMicrotasks();

    expect(ref).toHaveBeenCalledWith(container.firstElementChild);
    expect((ref.mock.calls[0]?.[0] as HTMLElement | null)?.isConnected).toBe(true);
  });

  it('cleans up refs when a rendered template is removed', async () => {
    const ref = { current: null as HTMLElement | null };
    const container = document.createElement('div');
    document.body.append(container);
    containers.add(container);

    renderTemplate(
      useRender({
        render: html`<span></span>`,
        ref,
      }),
      container,
    );

    await flushMicrotasks();

    expect(ref.current).toBe(container.firstElementChild);

    renderTemplate(nothing, container);

    expect(ref.current).toBe(null);
  });

  it('returns null at runtime when disabled', () => {
    const container = render(
      useRender({
        enabled: false,
      }),
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('preserves default elements across rerenders', () => {
    const container = document.createElement('div');
    document.body.append(container);
    containers.add(container);

    renderTemplate(
      useRender({
        defaultTagName: 'button',
        props: {
          id: 'first',
        },
      }),
      container,
    );

    const first = container.firstElementChild as HTMLButtonElement | null;
    first?.focus();

    renderTemplate(
      useRender({
        defaultTagName: 'button',
        props: {
          id: 'second',
        },
      }),
      container,
    );

    const second = container.firstElementChild;

    expect(second).toBe(first);
    expect(second).toHaveAttribute('id', 'second');
    expect(document.activeElement).toBe(second);
  });

  it('updates default-element event handlers without leaking listeners', () => {
    const firstHandler = vi.fn();
    const secondHandler = vi.fn();
    const container = document.createElement('div');
    document.body.append(container);
    containers.add(container);

    renderTemplate(
      useRender({
        defaultTagName: 'button',
        props: {
          children: 'First',
          onclick: firstHandler,
        },
      }),
      container,
    );

    (container.firstElementChild as HTMLButtonElement).click();
    expect(firstHandler).toHaveBeenCalledTimes(1);

    renderTemplate(
      useRender({
        defaultTagName: 'button',
        props: {
          children: 'Second',
          onclick: secondHandler,
        },
      }),
      container,
    );

    (container.firstElementChild as HTMLButtonElement).click();

    expect(firstHandler).toHaveBeenCalledTimes(1);
    expect(secondHandler).toHaveBeenCalledTimes(1);
    expect(container.firstElementChild).toHaveTextContent('Second');
  });

  it('preserves static-template roots across rerenders', () => {
    const container = document.createElement('div');
    document.body.append(container);
    containers.add(container);

    renderTemplate(
      useRender({
        render: html`<button id="first">First</button>`,
      }),
      container,
    );

    const first = container.firstElementChild as HTMLButtonElement | null;
    first?.focus();

    renderTemplate(
      useRender({
        render: html`<button id="second">Second</button>`,
      }),
      container,
    );

    const second = container.firstElementChild;

    expect(second).toBe(first);
    expect(second).toHaveAttribute('id', 'second');
    expect(document.activeElement).toBe(second);
  });

  describe('param: defaultTagName', () => {
    it('renders div by default if no defaultTagName and no render params are provided', () => {
      const container = render(useRender({}));

      expect(container.firstElementChild).toHaveProperty('tagName', 'DIV');
    });

    it('renders the element with the default tag with no render prop', () => {
      const container = document.createElement('div');
      document.body.append(container);
      containers.add(container);

      renderTemplate(useRender({ defaultTagName: 'div' }), container);
      expect(container.firstElementChild).toHaveProperty('tagName', 'DIV');

      renderTemplate(useRender({ defaultTagName: 'span' }), container);
      expect(container.firstElementChild).toHaveProperty('tagName', 'SPAN');
    });

    it('is overwritten by the render prop', () => {
      const container = document.createElement('div');
      document.body.append(container);
      containers.add(container);

      renderTemplate(useRender({ defaultTagName: 'div', render: html`<span></span>` }), container);
      expect(container.firstElementChild).toHaveProperty('tagName', 'SPAN');

      renderTemplate(useRender({ defaultTagName: 'a', render: html`<span></span>` }), container);
      expect(container.firstElementChild).toHaveProperty('tagName', 'SPAN');
    });

    it('creates SVG elements in the SVG namespace', () => {
      const container = render(
        useRender({
          defaultTagName: 'svg',
          props: {
            viewBox: '0 0 10 10',
            style: {
              stroke: 'red',
            },
          },
        }),
      );

      const svg = container.firstElementChild;

      expect(svg).toBeInstanceOf(SVGElement);
      expect(svg?.namespaceURI).toBe('http://www.w3.org/2000/svg');
      expect(svg).toHaveAttribute('viewBox', '0 0 10 10');
      expect((svg as SVGSVGElement).style.getPropertyValue('stroke')).toBe('red');
    });
  });

  describe('state to data attributes', () => {
    it('converts state to data attributes automatically', () => {
      const container = render(
        useRender({
          render: html`<button type="button"></button>`,
          state: {
            active: true,
            index: 42,
          },
        }),
      );

      const button = container.firstElementChild;

      expect(button).toHaveAttribute('data-active', '');
      expect(button).toHaveAttribute('data-index', '42');
    });

    it('handles undefined values in state', () => {
      const container = render(
        useRender({
          render: html`<div></div>`,
          state: {
            defined: 'value',
            notDefined: undefined,
          },
        }),
      );

      const div = container.firstElementChild;

      expect(div).toHaveAttribute('data-defined', 'value');
      expect(div).not.toHaveAttribute('data-notdefined');
    });

    it('merges state-based data attributes with existing props', () => {
      const container = render(
        useRender({
          render: html`<button type="button"></button>`,
          state: {
            form: 'login',
          },
          props: {
            className: 'btn-primary',
            id: 'submit-btn',
            'data-existing': 'prop',
          },
        }),
      );

      const button = container.firstElementChild;

      expect(button).toHaveAttribute('data-form', 'login');
      expect(button).toHaveAttribute('class', 'btn-primary');
      expect(button).toHaveAttribute('id', 'submit-btn');
      expect(button).toHaveAttribute('data-existing', 'prop');
    });

    it('props override state-based data attributes', () => {
      const container = render(
        useRender({
          render: html`<button type="button"></button>`,
          state: {
            active: true,
          },
          props: {
            'data-active': 'false',
          },
        }),
      );

      expect(container.firstElementChild).toHaveAttribute('data-active', 'false');
    });

    it('preserves attributes provided by the render template', () => {
      const container = render(
        useRender({
          render: html`<button id="render-id" class="render-class"></button>`,
          props: {
            id: 'props-id',
            className: 'props-class',
          },
        }),
      );

      expect(container.firstElementChild).toHaveAttribute('id', 'render-id');
      expect(container.firstElementChild).toHaveAttribute('class', 'render-class props-class');
    });

    it('preserves template-authored property bindings', () => {
      const container = render(
        useRender({
          render: html`<input .value=${'template value'} />`,
          props: {
            value: 'props value',
          },
        }),
      );

      expect((container.firstElementChild as HTMLInputElement).value).toBe('template value');
    });

    it('falls back to attributes when a DOM property setter throws', () => {
      const container = render(
        useRender({
          render: html`<button></button>`,
          props: {
            type: 'submit',
            form: 'external-form',
          },
        }),
      );

      const button = container.firstElementChild;

      expect(button).toHaveAttribute('type', 'submit');
      expect(button).toHaveAttribute('form', 'external-form');
    });

    it('replaces static-template children when props.children is provided', () => {
      const container = render(
        useRender({
          render: html`<button><span>Original</span></button>`,
          props: {
            children: 'Updated',
          },
        }),
      );

      expect(container.firstElementChild).toHaveTextContent('Updated');
      expect(container.querySelector('span')).toBe(null);
    });

    it('ignores boolean and lit-nothing children and flattens nested arrays', () => {
      const container = render(
        useRender({
          render: html`<button></button>`,
          props: {
            children: ['Hello', true, [' ', html`<span>world</span>`], nothing],
          },
        }),
      );

      expect(container.firstElementChild).toHaveTextContent('Hello world');
      expect(container.querySelector('span')).toHaveTextContent('world');
    });

    it('handles empty state', () => {
      const container = render(
        useRender({
          render: html`<span></span>`,
          state: {},
          props: {
            className: 'test-class',
          },
        }),
      );

      const span = container.firstElementChild;

      expect(span).toHaveAttribute('class', 'test-class');

      const attributes = span?.attributes;
      if (attributes != null) {
        for (let index = 0; index < attributes.length; index += 1) {
          expect(attributes[index].name).not.toMatch(/^data-/);
        }
      }
    });

    it('handles undefined state', () => {
      const container = render(
        useRender({
          render: html`<div></div>`,
          state: undefined,
          props: {
            className: 'test-class',
            'data-from-props': 'value',
          },
        }),
      );

      const div = container.firstElementChild;

      expect(div).toHaveAttribute('class', 'test-class');
      expect(div).toHaveAttribute('data-from-props', 'value');
    });

    it('converts boolean values in state to data attributes', () => {
      const container = render(
        useRender({
          render: html`<button type="button"></button>`,
          state: {
            active: true,
            disabled: false,
          },
        }),
      );

      const button = container.firstElementChild;

      expect(button).toHaveAttribute('data-active', '');
      expect(button).not.toHaveAttribute('data-disabled');
    });

    it('converts number values in state to data attributes', () => {
      const container = render(
        useRender({
          render: html`<div></div>`,
          state: {
            count: 0,
            index: 42,
            percentage: 99.9,
          },
        }),
      );

      const div = container.firstElementChild;

      expect(div).not.toHaveAttribute('data-count');
      expect(div).toHaveAttribute('data-index', '42');
      expect(div).toHaveAttribute('data-percentage', '99.9');
    });

    it('supports custom stateAttributesMapping for kebab-case conversion', () => {
      const container = render(
        useRender({
          render: html`<button type="button"></button>`,
          state: {
            isActive: true,
            itemCount: 5,
            userName: 'John',
          },
          stateAttributesMapping: {
            isActive: (value) => (value ? { 'data-is-active': '' } : null),
            itemCount: (value) => ({ 'data-item-count': String(value) }),
            userName: (value) => ({ 'data-user-name': String(value) }),
          },
        }),
      );

      const button = container.firstElementChild;

      expect(button).toHaveAttribute('data-is-active', '');
      expect(button).toHaveAttribute('data-item-count', '5');
      expect(button).toHaveAttribute('data-user-name', 'John');
    });

    it('rethrows missing custom stateAttributesMapping handlers', () => {
      expect(() =>
        render(
          useRender({
            render: html`<button type="button"></button>`,
            state: {
              isActive: true,
            },
            stateAttributesMapping: {
              isActive: undefined as unknown as (value: boolean) => Record<string, string> | null,
            },
          }),
        ),
      ).toThrow();
    });

    it('throws when a static render template does not resolve to a single element root', () => {
      expect(() =>
        render(
          useRender({
            render: html`<span>One</span><span>Two</span>`,
          }),
        ),
      ).toThrow(/must resolve to exactly one element root/i);
    });

    it('throws when props.children contains unsupported object values', () => {
      expect(() =>
        render(
          useRender({
            render: html`<div></div>`,
            props: {
              children: { label: 'invalid' },
            },
          }),
        ),
      ).toThrow(/unsupported child value/i);
    });

    it('rethrows property assignment failures', () => {
      Object.defineProperty(HTMLDivElement.prototype, 'failingProp', {
        configurable: true,
        set() {
          throw new Error('setter failed');
        },
      });

      try {
        expect(() =>
          render(
            useRender({
              defaultTagName: 'div',
              props: {
                failingProp: 'value',
              },
            }),
          ),
        ).toThrow('setter failed');
      } finally {
        delete (HTMLDivElement.prototype as HTMLDivElement & { failingProp?: unknown }).failingProp;
      }
    });

    it('rethrows property cleanup failures during rerenders', () => {
      Object.defineProperty(HTMLDivElement.prototype, 'cleanupProp', {
        configurable: true,
        set(value) {
          if (value === undefined) {
            throw new Error('cleanup failed');
          }
        },
      });

      const container = document.createElement('div');
      document.body.append(container);
      containers.add(container);

      try {
        renderTemplate(
          useRender({
            defaultTagName: 'div',
            props: {
              cleanupProp: 'value',
            },
          }),
          container,
        );

        expect(() =>
          renderTemplate(
            useRender({
              defaultTagName: 'div',
            }),
            container,
          ),
        ).toThrow('cleanup failed');
      } finally {
        delete (HTMLDivElement.prototype as HTMLDivElement & { cleanupProp?: unknown }).cleanupProp;
      }
    });
  });
});
