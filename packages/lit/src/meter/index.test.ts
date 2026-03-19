/* eslint-disable testing-library/render-result-naming-convention */
import { html, nothing, render as renderTemplate, type TemplateResult } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import { Meter } from '@base-ui/lit/meter';
import type { MeterLabelProps, MeterRootProps, MeterValueProps } from '@base-ui/lit/meter';

const MeterContextError =
  'Base UI: MeterRootContext is missing. Meter parts must be placed within <Meter.Root>.';

describe('Meter', () => {
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
    const root = Meter.Root({ value: 50 });
    const indicator = Meter.Indicator({});
    const label = Meter.Label({});
    const track = Meter.Track({});
    const value = Meter.Value({});

    expectTypeOf(root).toEqualTypeOf<TemplateResult>();
    expectTypeOf(indicator).toEqualTypeOf<TemplateResult>();
    expectTypeOf(label).toEqualTypeOf<TemplateResult>();
    expectTypeOf(track).toEqualTypeOf<TemplateResult>();
    expectTypeOf(value).toEqualTypeOf<TemplateResult>();
    expectTypeOf<MeterRootProps['value']>().toEqualTypeOf<number>();
    expectTypeOf<MeterLabelProps['id']>().toEqualTypeOf<string | undefined>();
    expectTypeOf<MeterValueProps['children']>().toEqualTypeOf<
      (((formattedValue: string, value: number) => unknown) | null | undefined)
    >();
  });

  it('renders the expected root aria attributes and label wiring', () => {
    const container = render(
      Meter.Root({
        value: 30,
        children: html`
          ${Meter.Label({ children: 'Battery Level' })}
          ${Meter.Track({
            children: Meter.Indicator({}),
          })}
        `,
      }),
    );

    const meter = container.querySelector('[role="meter"]');
    const label = Array.from(container.querySelectorAll('span[role="presentation"]')).find(
      (element) => element.textContent === 'Battery Level',
    );

    expect(meter).toBeVisible();
    expect(meter?.tagName).toBe('DIV');
    expect(meter).toHaveAttribute('aria-valuenow', '30');
    expect(meter).toHaveAttribute('aria-valuemin', '0');
    expect(meter).toHaveAttribute('aria-valuemax', '100');
    expect(meter).toHaveAttribute('aria-valuetext', '30%');
    expect(meter).toHaveAttribute('aria-labelledby', label?.getAttribute('id') ?? '');
  });

  it('updates the root aria value when the root rerenders', () => {
    const container = render(
      Meter.Root({
        value: 50,
        children: Meter.Track({ children: Meter.Indicator({}) }),
      }),
    );

    renderTemplate(
      Meter.Root({
        value: 77,
        children: Meter.Track({ children: Meter.Indicator({}) }),
      }),
      container,
    );

    expect(container.querySelector('[role="meter"]')).toHaveAttribute('aria-valuenow', '77');
  });

  it('formats the value and aria-valuetext when format is provided', () => {
    const format: Intl.NumberFormatOptions = {
      style: 'currency',
      currency: 'USD',
    };
    const expectedValue = new Intl.NumberFormat(undefined, format).format(30);
    const container = render(
      Meter.Root({
        value: 30,
        format,
        children: html`
          ${Meter.Value({ 'data-testid': 'value' })}
          ${Meter.Track({
            children: Meter.Indicator({}),
          })}
        `,
      }),
    );

    expect(container.querySelector('[data-testid="value"]')).toHaveTextContent(expectedValue);
    expect(container.querySelector('[role="meter"]')).toHaveAttribute('aria-valuetext', expectedValue);
  });

  it('uses the provided locale when formatting the value', () => {
    const expectedValue = new Intl.NumberFormat('de-DE', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(86.49);
    const container = render(
      Meter.Root({
        value: 86.49,
        locale: 'de-DE',
        format: {
          style: 'decimal',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        },
        children: Meter.Value({ 'data-testid': 'value' }),
      }),
    );

    expect(container.querySelector('[data-testid="value"]')).toHaveTextContent(expectedValue);
  });

  it('renders the default formatted value when Meter.Value has no children', () => {
    const container = render(
      Meter.Root({
        value: 30,
        children: Meter.Value({ 'data-testid': 'value' }),
      }),
    );

    expect(container.querySelector('[data-testid="value"]')).toHaveTextContent(
      (0.3).toLocaleString(undefined, { style: 'percent' }),
    );
  });

  it('passes formatted and raw values to Meter.Value render functions', () => {
    const renderSpy = vi.fn((formattedValue: string) => formattedValue);
    const format: Intl.NumberFormatOptions = {
      style: 'currency',
      currency: 'USD',
    };
    const expectedValue = new Intl.NumberFormat(undefined, format).format(30);

    render(
      Meter.Root({
        value: 30,
        format,
        children: Meter.Value({ children: renderSpy }),
      }),
    );

    expect(renderSpy).toHaveBeenCalledWith(expectedValue, 30);
  });

  it('computes the indicator width from the meter range', () => {
    const container = render(
      Meter.Root({
        value: 33,
        children: Meter.Track({
          children: Meter.Indicator({ 'data-testid': 'indicator' }),
        }),
      }),
    );
    const indicator = container.querySelector('[data-testid="indicator"]') as HTMLElement;

    expect(indicator.style.insetInlineStart).toBe('0px');
    expect(indicator.style.height).toBe('inherit');
    expect(indicator.style.width).toBe('33%');
  });

  it('lets explicit aria-labelledby override auto label registration', () => {
    const container = render(
      Meter.Root({
        value: 42,
        'aria-labelledby': 'external-label',
        children: Meter.Label({ children: 'Battery Level' }),
      }),
    );

    expect(container.querySelector('[role="meter"]')).toHaveAttribute('aria-labelledby', 'external-label');
  });

  it('forwards refs to every default rendered element', async () => {
    const rootRef = { current: null as HTMLDivElement | null };
    const trackRef = { current: null as HTMLDivElement | null };
    const indicatorRef = { current: null as HTMLDivElement | null };
    const labelRef = { current: null as HTMLSpanElement | null };
    const valueRef = { current: null as HTMLSpanElement | null };

    const container = render(
      Meter.Root({
        ref: rootRef,
        value: 24,
        children: html`
          ${Meter.Label({ ref: labelRef, children: 'Storage Used' })}
          ${Meter.Value({ ref: valueRef })}
          ${Meter.Track({
            ref: trackRef,
            children: Meter.Indicator({ ref: indicatorRef }),
          })}
        `,
      }),
    );

    await flushMicrotasks();

    expect(rootRef.current).toBe(container.querySelector('[role="meter"]'));
    expect(trackRef.current).toBe(container.querySelector('div[role="meter"] > div'));
    expect(indicatorRef.current).toBe(container.querySelector('div[role="meter"] > div > div'));
    expect(labelRef.current).toBe(container.querySelector('span[role="presentation"]'));
    expect(valueRef.current).toBe(container.querySelector('span[aria-hidden]'));
  });

  it('passes merged props to render callbacks', () => {
    const renderSpy = vi.fn((props: Record<string, unknown>) => {
      return html`<span class=${String(props.className)} role="presentation"></span>`;
    });
    const container = render(
      Meter.Root({
        value: 25,
        children: Meter.Indicator({
          className: 'meter-indicator',
          render: renderSpy,
        }),
      }),
    );
    const indicator = container.querySelector('.meter-indicator') as HTMLElement;
    const props = renderSpy.mock.lastCall?.[0] as { style?: Record<string, unknown> } | undefined;

    expect(indicator.tagName).toBe('SPAN');
    expect(props?.style).toMatchObject({
      insetInlineStart: 0,
      height: 'inherit',
      width: '25%',
    });
  });

  it('throws when context-dependent parts render outside Meter.Root', () => {
    expect(() => render(Meter.Label({ children: 'Label' }))).toThrow(MeterContextError);
    expect(() => render(Meter.Value({}))).toThrow(MeterContextError);
    expect(() => render(Meter.Indicator({}))).toThrow(MeterContextError);
  });
});
