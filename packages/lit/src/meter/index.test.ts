import { html, nothing, render as renderTemplate } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import './index.ts';
import type { MeterRootElement, MeterValueElement } from './index.ts';

describe('meter', () => {
  const containers = new Set<HTMLDivElement>();

  afterEach(() => {
    containers.forEach((container) => {
      renderTemplate(nothing, container);
      container.remove();
    });
    containers.clear();
  });

  function render(result: ReturnType<typeof html>) {
    const container = document.createElement('div');
    document.body.append(container);
    containers.add(container);
    renderTemplate(result, container);
    return container;
  }

  async function waitForUpdate() {
    await new Promise((r) => setTimeout(r, 0));
  }

  it('renders the expected root aria attributes', async () => {
    const container = render(html`
      <meter-root .value=${30}>
        <meter-label>Battery Level</meter-label>
        <meter-track>
          <meter-indicator></meter-indicator>
        </meter-track>
      </meter-root>
    `);
    await waitForUpdate();

    const root = container.querySelector('meter-root')!;

    expect(root).toHaveAttribute('role', 'meter');
    expect(root).toHaveAttribute('aria-valuenow', '30');
    expect(root).toHaveAttribute('aria-valuemin', '0');
    expect(root).toHaveAttribute('aria-valuemax', '100');
    expect(root).toHaveAttribute('aria-valuetext', '30%');
  });

  it('wires up label via aria-labelledby', async () => {
    const container = render(html`
      <meter-root .value=${50}>
        <meter-label>Battery Level</meter-label>
      </meter-root>
    `);
    await waitForUpdate();

    const root = container.querySelector('meter-root')!;
    const label = container.querySelector('meter-label')!;

    expect(root).toHaveAttribute('aria-labelledby', label.id);
    expect(label).toHaveAttribute('role', 'presentation');
  });

  it('displays formatted value in meter-value', async () => {
    const container = render(html`
      <meter-root .value=${30}>
        <meter-value data-testid="value"></meter-value>
      </meter-root>
    `);
    await waitForUpdate();

    const value = container.querySelector('[data-testid="value"]')!;
    expect(value.textContent).toBe(
      (0.3).toLocaleString(undefined, { style: 'percent' }),
    );
    expect(value).toHaveAttribute('aria-hidden', 'true');
  });

  it('computes indicator width from meter range', async () => {
    const container = render(html`
      <meter-root .value=${33}>
        <meter-track>
          <meter-indicator data-testid="indicator"></meter-indicator>
        </meter-track>
      </meter-root>
    `);
    await waitForUpdate();

    const indicator = container.querySelector('[data-testid="indicator"]')! as HTMLElement;
    expect(indicator.style.width).toBe('33%');
    expect(indicator.style.insetInlineStart).toBe('0');
    expect(indicator.style.height).toBe('inherit');
  });

  it('updates root aria value on reactivity', async () => {
    const container = render(html`
      <meter-root .value=${50}>
        <meter-track>
          <meter-indicator></meter-indicator>
        </meter-track>
      </meter-root>
    `);
    await waitForUpdate();

    const root = container.querySelector('meter-root')! as MeterRootElement;
    expect(root).toHaveAttribute('aria-valuenow', '50');

    root.value = 77;
    await waitForUpdate();

    expect(root).toHaveAttribute('aria-valuenow', '77');
  });

  it('formats value and aria-valuetext when format is provided', async () => {
    const format: Intl.NumberFormatOptions = {
      style: 'currency',
      currency: 'USD',
    };
    const expectedValue = new Intl.NumberFormat(undefined, format).format(30);

    const container = render(html`
      <meter-root .value=${30} .format=${format}>
        <meter-value data-testid="value"></meter-value>
      </meter-root>
    `);
    await waitForUpdate();

    expect(container.querySelector('[data-testid="value"]')!.textContent).toBe(expectedValue);
    expect(container.querySelector('meter-root')).toHaveAttribute('aria-valuetext', expectedValue);
  });

  it('uses the provided locale when formatting the value', async () => {
    const format: Intl.NumberFormatOptions = {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    };
    const expectedValue = new Intl.NumberFormat('de-DE', format).format(86.49);

    const container = render(html`
      <meter-root .value=${86.49} .locale=${'de-DE'} .format=${format}>
        <meter-value data-testid="value"></meter-value>
      </meter-root>
    `);
    await waitForUpdate();

    expect(container.querySelector('[data-testid="value"]')!.textContent).toBe(expectedValue);
  });

  it('supports custom renderValue on meter-value', async () => {
    const renderSpy = vi.fn(
      (formattedValue: string, _value: number) => `Custom: ${formattedValue}`,
    );

    const container = render(html`
      <meter-root .value=${30}>
        <meter-value .renderValue=${renderSpy} data-testid="value"></meter-value>
      </meter-root>
    `);
    await waitForUpdate();

    expect(renderSpy).toHaveBeenCalled();
    expect(container.querySelector('[data-testid="value"]')!.textContent).toContain('Custom:');
  });

  it('uses getAriaValueText when provided', async () => {
    const getAriaValueText = vi.fn(
      (_formatted: string, value: number) => `${value} items`,
    );

    const container = render(html`
      <meter-root .value=${42} .getAriaValueText=${getAriaValueText}></meter-root>
    `);
    await waitForUpdate();

    expect(container.querySelector('meter-root')).toHaveAttribute('aria-valuetext', '42 items');
    expect(getAriaValueText).toHaveBeenCalled();
  });

  it('supports custom min/max range', async () => {
    const container = render(html`
      <meter-root .value=${15} .min=${10} .max=${20}>
        <meter-indicator data-testid="indicator"></meter-indicator>
      </meter-root>
    `);
    await waitForUpdate();

    const root = container.querySelector('meter-root')!;
    const indicator = container.querySelector('[data-testid="indicator"]')! as HTMLElement;

    expect(root).toHaveAttribute('aria-valuemin', '10');
    expect(root).toHaveAttribute('aria-valuemax', '20');
    expect(root).toHaveAttribute('aria-valuenow', '15');
    expect(indicator.style.width).toBe('50%');
  });

  it('logs error when parts render outside meter-root', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(html`<meter-track></meter-track>`);
    render(html`<meter-indicator></meter-indicator>`);
    render(html`<meter-label>Label</meter-label>`);
    render(html`<meter-value></meter-value>`);

    expect(errorSpy).toHaveBeenCalledTimes(4);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Meter parts must be placed within <meter-root>'),
    );

    errorSpy.mockRestore();
  });

  it('includes NVDA force-announcement span', async () => {
    const container = render(html`
      <meter-root .value=${50}></meter-root>
    `);
    await waitForUpdate();

    const nvdaSpan = container.querySelector('meter-root span[role="presentation"]');
    expect(nvdaSpan).toBeInTheDocument();
    expect(nvdaSpan?.textContent).toBe('x');
  });
});
