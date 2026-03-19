/* eslint-disable testing-library/render-result-naming-convention */
import { html, nothing, render as renderTemplate, type TemplateResult } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import { Progress } from '@base-ui/lit/progress';
import type {
  ProgressLabelProps,
  ProgressRootProps,
  ProgressStatus,
  ProgressValueProps,
} from '@base-ui/lit/progress';

const ProgressContextError =
  'Base UI: ProgressRootContext is missing. Progress parts must be placed within <Progress.Root>.';

describe('Progress', () => {
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
    const root = Progress.Root({ value: 50 });
    const indicator = Progress.Indicator({});
    const label = Progress.Label({});
    const track = Progress.Track({});
    const value = Progress.Value({});

    expectTypeOf(root).toEqualTypeOf<TemplateResult>();
    expectTypeOf(indicator).toEqualTypeOf<TemplateResult>();
    expectTypeOf(label).toEqualTypeOf<TemplateResult>();
    expectTypeOf(track).toEqualTypeOf<TemplateResult>();
    expectTypeOf(value).toEqualTypeOf<TemplateResult>();
    expectTypeOf<ProgressRootProps['value']>().toEqualTypeOf<number | null>();
    expectTypeOf<ProgressLabelProps['id']>().toEqualTypeOf<string | undefined>();
    expectTypeOf<ProgressStatus>().toEqualTypeOf<'indeterminate' | 'progressing' | 'complete'>();
    expectTypeOf<ProgressValueProps['children']>().toEqualTypeOf<
      ((formattedValue: string | null, value: number | null) => unknown) | null | undefined
    >();
  });

  it('renders the expected root aria attributes and label wiring', () => {
    const container = render(
      Progress.Root({
        value: 30,
        children: html`
          ${Progress.Label({ children: 'Downloading' })}
          ${Progress.Value({ 'data-testid': 'value' })}
          ${Progress.Track({
            children: Progress.Indicator({}),
          })}
        `,
      }),
    );

    const progressbar = container.querySelector('[role="progressbar"]');
    const label = Array.from(container.querySelectorAll('span[role="presentation"]')).find(
      (element) => element.textContent === 'Downloading',
    );

    expect(progressbar).toBeVisible();
    expect(progressbar?.tagName).toBe('DIV');
    expect(progressbar).toHaveAttribute('aria-valuenow', '30');
    expect(progressbar).toHaveAttribute('aria-valuemin', '0');
    expect(progressbar).toHaveAttribute('aria-valuemax', '100');
    expect(progressbar).toHaveAttribute(
      'aria-valuetext',
      (0.3).toLocaleString(undefined, { style: 'percent' }),
    );
    expect(progressbar).toHaveAttribute('aria-labelledby', label?.getAttribute('id') ?? '');
    expect(container.querySelector('[data-testid="value"]')).toHaveTextContent(
      (0.3).toLocaleString(undefined, { style: 'percent' }),
    );
    expect(progressbar).toHaveAttribute('data-progressing');
  });

  it('updates the root aria value when the root rerenders', () => {
    const container = render(
      Progress.Root({
        value: 50,
        children: Progress.Track({ children: Progress.Indicator({}) }),
      }),
    );

    renderTemplate(
      Progress.Root({
        value: 77,
        children: Progress.Track({ children: Progress.Indicator({}) }),
      }),
      container,
    );

    expect(container.querySelector('[role="progressbar"]')).toHaveAttribute('aria-valuenow', '77');
    expect(container.querySelector('[role="progressbar"]')).toHaveAttribute('data-progressing');
  });

  it('formats the value and aria-valuetext when format is provided', () => {
    const format: Intl.NumberFormatOptions = {
      style: 'currency',
      currency: 'USD',
    };
    const expectedValue = new Intl.NumberFormat(undefined, format).format(30);
    const container = render(
      Progress.Root({
        value: 30,
        format,
        children: html`
          ${Progress.Value({ 'data-testid': 'value' })}
          ${Progress.Track({
            children: Progress.Indicator({}),
          })}
        `,
      }),
    );

    expect(container.querySelector('[data-testid="value"]')).toHaveTextContent(expectedValue);
    expect(container.querySelector('[role="progressbar"]')).toHaveAttribute(
      'aria-valuetext',
      expectedValue,
    );
  });

  it('uses the provided locale when formatting the value', () => {
    const expectedValue = new Intl.NumberFormat('de-DE', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(70.51);
    const container = render(
      Progress.Root({
        value: 70.51,
        locale: 'de-DE',
        format: {
          style: 'decimal',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        },
        children: Progress.Value({ 'data-testid': 'value' }),
      }),
    );

    expect(container.querySelector('[data-testid="value"]')).toHaveTextContent(expectedValue);
  });

  it('marks indeterminate progress and omits aria-valuenow', () => {
    const container = render(
      Progress.Root({
        value: null,
        children: html`
          ${Progress.Value({ 'data-testid': 'value' })}
          ${Progress.Track({
            children: Progress.Indicator({ 'data-testid': 'indicator' }),
          })}
        `,
      }),
    );

    const progressbar = container.querySelector('[role="progressbar"]');
    const indicator = container.querySelector('[data-testid="indicator"]') as HTMLElement;

    expect(progressbar).not.toHaveAttribute('aria-valuenow');
    expect(progressbar).toHaveAttribute('aria-valuetext', 'indeterminate progress');
    expect(progressbar).toHaveAttribute('data-indeterminate');
    expect(container.querySelector('[data-testid="value"]')).toBeEmptyDOMElement();
    expect(indicator.style.width).toBe('');
  });

  it('passes formatted and raw values to Progress.Value render functions', () => {
    const renderSpy = vi.fn((formattedValue: string | null, _value: number | null) => {
      return formattedValue;
    });
    const format: Intl.NumberFormatOptions = {
      style: 'currency',
      currency: 'USD',
    };
    const expectedValue = new Intl.NumberFormat(undefined, format).format(30);

    render(
      Progress.Root({
        value: 30,
        format,
        children: Progress.Value({ children: renderSpy }),
      }),
    );

    expect(renderSpy).toHaveBeenCalledWith(expectedValue, 30);
  });

  it('passes indeterminate markers to Progress.Value render functions', () => {
    const renderSpy = vi.fn((formattedValue: string | null) => formattedValue);

    render(
      Progress.Root({
        value: null,
        children: Progress.Value({ children: renderSpy }),
      }),
    );

    expect(renderSpy).toHaveBeenCalledWith('indeterminate', null);
  });

  it('computes the indicator width from the progress range', () => {
    const container = render(
      Progress.Root({
        value: 33,
        children: Progress.Track({
          children: Progress.Indicator({ 'data-testid': 'indicator' }),
        }),
      }),
    );
    const indicator = container.querySelector('[data-testid="indicator"]') as HTMLElement;

    expect(indicator.style.insetInlineStart).toBe('0px');
    expect(indicator.style.height).toBe('inherit');
    expect(indicator.style.width).toBe('33%');
    expect(indicator).toHaveAttribute('data-progressing');
  });

  it('marks every default part with the complete state when value reaches max', () => {
    const container = render(
      Progress.Root({
        value: 100,
        children: html`
          ${Progress.Label({ 'data-testid': 'label', children: 'Export data' })}
          ${Progress.Value({ 'data-testid': 'value' })}
          ${Progress.Track({
            'data-testid': 'track',
            children: Progress.Indicator({ 'data-testid': 'indicator' }),
          })}
        `,
      }),
    );

    expect(container.querySelector('[role="progressbar"]')).toHaveAttribute('data-complete');
    expect(container.querySelector('[data-testid="label"]')).toHaveAttribute('data-complete');
    expect(container.querySelector('[data-testid="value"]')).toHaveAttribute('data-complete');
    expect(container.querySelector('[data-testid="track"]')).toHaveAttribute('data-complete');
    expect(container.querySelector('[data-testid="indicator"]')).toHaveAttribute('data-complete');
  });

  it('passes state to root render callbacks', () => {
    const renderSpy = vi.fn(
      (_props: Record<string, unknown>, _state: { status: ProgressStatus }) => {
        return html`<section data-testid="root"></section>`;
      },
    );

    render(
      Progress.Root({
        value: 100,
        render: renderSpy,
      }),
    );

    expect(renderSpy.mock.lastCall?.[1]).toEqual({ status: 'complete' });
  });

  it('lets explicit aria-labelledby override auto label registration', () => {
    const container = render(
      Progress.Root({
        value: 42,
        'aria-labelledby': 'external-label',
        children: Progress.Label({ children: 'Downloading' }),
      }),
    );

    expect(container.querySelector('[role="progressbar"]')).toHaveAttribute(
      'aria-labelledby',
      'external-label',
    );
  });

  it('forwards refs to every default rendered element', async () => {
    const rootRef = { current: null as HTMLDivElement | null };
    const trackRef = { current: null as HTMLDivElement | null };
    const indicatorRef = { current: null as HTMLDivElement | null };
    const labelRef = { current: null as HTMLSpanElement | null };
    const valueRef = { current: null as HTMLSpanElement | null };

    const container = render(
      Progress.Root({
        ref: rootRef,
        value: 24,
        children: html`
          ${Progress.Label({ ref: labelRef, children: 'Export data' })}
          ${Progress.Value({ ref: valueRef })}
          ${Progress.Track({
            ref: trackRef,
            children: Progress.Indicator({ ref: indicatorRef }),
          })}
        `,
      }),
    );

    await flushMicrotasks();

    expect(rootRef.current).toBe(container.querySelector('[role="progressbar"]'));
    expect(trackRef.current).toBe(container.querySelector('div[role="progressbar"] > div'));
    expect(indicatorRef.current).toBe(
      container.querySelector('div[role="progressbar"] > div > div'),
    );
    expect(labelRef.current).toBe(container.querySelector('span[role="presentation"]'));
    expect(valueRef.current).toBe(container.querySelector('span[aria-hidden]'));
  });

  it('passes merged props to render callbacks', () => {
    const renderSpy = vi.fn(
      (props: Record<string, unknown>, _state: { status: ProgressStatus }) => {
        return html`<span
          class=${String(props.className)}
          style=${styleAttribute(props.style)}
          data-testid="indicator"
        ></span>`;
      },
    );
    const container = render(
      Progress.Root({
        value: 25,
        children: Progress.Indicator({
          className: 'progress-indicator',
          render: renderSpy,
        }),
      }),
    );
    const indicator = container.querySelector('[data-testid="indicator"]') as HTMLElement;
    const props = renderSpy.mock.lastCall?.[0] as { style?: Record<string, unknown> } | undefined;
    const state = renderSpy.mock.lastCall?.[1] as { status: ProgressStatus } | undefined;

    expect(indicator.tagName).toBe('SPAN');
    expect(props?.style).toMatchObject({
      insetInlineStart: 0,
      height: 'inherit',
      width: '25%',
    });
    expect(state).toEqual({ status: 'progressing' });
  });

  it('throws when context-dependent parts render outside Progress.Root', () => {
    expect(() => render(Progress.Track({}))).toThrow(ProgressContextError);
    expect(() => render(Progress.Indicator({}))).toThrow(ProgressContextError);
    expect(() => render(Progress.Label({ children: 'Downloading' }))).toThrow(ProgressContextError);
    expect(() => render(Progress.Value({}))).toThrow(ProgressContextError);
  });
});

function styleAttribute(style: unknown) {
  if (style == null || typeof style !== 'object') {
    return '';
  }

  return Object.entries(style as Record<string, unknown>)
    .map(([name, value]) => `${name}:${String(value)}`)
    .join(';');
}
