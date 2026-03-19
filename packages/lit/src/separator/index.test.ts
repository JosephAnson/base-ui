/* eslint-disable testing-library/render-result-naming-convention */
import { html, nothing, render as renderTemplate, type TemplateResult } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, expectTypeOf, it } from 'vitest';
import { Separator } from '@base-ui/lit/separator';

describe('Separator', () => {
  const containers = new Set<HTMLDivElement>();

  afterEach(() => {
    containers.forEach((container) => {
      renderTemplate(nothing, container);
      container.remove();
    });
    containers.clear();
  });

  function render(result: TemplateResult) {
    const container = document.createElement('div');
    document.body.append(container);
    containers.add(container);

    renderTemplate(result, container);
    return container;
  }

  async function flushMicrotasks() {
    await Promise.resolve();
  }

  it('preserves the public type contracts', () => {
    const separator = Separator({});

    expectTypeOf(separator).toEqualTypeOf<TemplateResult>();
    expectTypeOf<Separator.Props['orientation']>().toEqualTypeOf<
      'horizontal' | 'vertical' | undefined
    >();
    expectTypeOf<Separator.State['orientation']>().toEqualTypeOf<'horizontal' | 'vertical'>();
  });

  it('renders a div with the separator role', () => {
    const container = render(Separator({}));
    const separator = container.querySelector('[role="separator"]');

    expect(separator).toBeVisible();
    expect(separator?.tagName).toBe('DIV');
    expect(separator).toHaveAttribute('aria-orientation', 'horizontal');
  });

  it('applies the provided orientation', () => {
    const container = render(Separator({ orientation: 'vertical' }));
    const separator = container.querySelector('[role="separator"]');

    expect(separator).toHaveAttribute('aria-orientation', 'vertical');
  });

  it('forwards element props and refs to the default element', async () => {
    const ref = { current: null as HTMLDivElement | null };
    const container = render(
      Separator({
        ref,
        className: 'test-separator',
        id: 'separator-id',
      }),
    );

    await flushMicrotasks();

    const separator = container.querySelector('[role="separator"]');

    expect(separator).toHaveClass('test-separator');
    expect(separator).toHaveAttribute('id', 'separator-id');
    expect(ref.current).toBe(separator);
  });

  it('passes merged props and state to render callbacks', () => {
    const container = render(
      Separator({
        orientation: 'vertical',
        className: 'test-separator',
        render(props, state) {
          return html`<span
            class=${String(props.className)}
            role=${String(props.role)}
            aria-orientation=${String(props['aria-orientation'])}
            data-orientation=${state.orientation}
          ></span>`;
        },
      }),
    );

    const separator = container.querySelector('[role="separator"]');

    expect(separator?.tagName).toBe('SPAN');
    expect(separator).toHaveClass('test-separator');
    expect(separator).toHaveAttribute('aria-orientation', 'vertical');
    expect(separator).toHaveAttribute('data-orientation', 'vertical');
  });
});
