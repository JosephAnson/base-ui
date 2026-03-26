import { html, nothing, render as renderTemplate } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import {
  ProgressIndicatorElement,
  ProgressLabelElement,
  ProgressRootElement,
  ProgressTrackElement,
  ProgressValueElement,
  type ProgressIndicator,
  type ProgressIndicatorProps,
  type ProgressIndicatorState,
  type ProgressLabel,
  type ProgressLabelProps,
  type ProgressLabelState,
  type ProgressRoot,
  type ProgressRootProps,
  type ProgressRootState,
  type ProgressStatus,
  type ProgressTrack,
  type ProgressTrackProps,
  type ProgressTrackState,
  type ProgressValue,
  type ProgressValueProps,
  type ProgressValueState,
} from './index';

describe('progress', () => {
  const containers = new Set<HTMLDivElement>();

  afterEach(() => {
    containers.forEach((container) => {
      renderTemplate(nothing, container);
      container.remove();
    });
    containers.clear();
    vi.restoreAllMocks();
  });

  function render(result: ReturnType<typeof html>) {
    const container = document.createElement('div');
    document.body.append(container);
    containers.add(container);
    renderTemplate(result, container);
    return container;
  }

  async function waitForUpdate() {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });
  }

  it('exposes namespace aliases for props and state', () => {
    expect(customElements.get('progress-root')).toBe(ProgressRootElement);
    expect(customElements.get('progress-track')).toBe(ProgressTrackElement);
    expect(customElements.get('progress-indicator')).toBe(ProgressIndicatorElement);
    expect(customElements.get('progress-label')).toBe(ProgressLabelElement);
    expect(customElements.get('progress-value')).toBe(ProgressValueElement);
    expectTypeOf<ProgressRootProps>().toEqualTypeOf<ProgressRoot.Props>();
    expectTypeOf<ProgressRootState>().toEqualTypeOf<ProgressRoot.State>();
    expectTypeOf<ProgressTrackProps>().toEqualTypeOf<ProgressTrack.Props>();
    expectTypeOf<ProgressTrackState>().toEqualTypeOf<ProgressTrack.State>();
    expectTypeOf<ProgressIndicatorProps>().toEqualTypeOf<ProgressIndicator.Props>();
    expectTypeOf<ProgressIndicatorState>().toEqualTypeOf<ProgressIndicator.State>();
    expectTypeOf<ProgressLabelProps>().toEqualTypeOf<ProgressLabel.Props>();
    expectTypeOf<ProgressLabelState>().toEqualTypeOf<ProgressLabel.State>();
    expectTypeOf<ProgressValueProps>().toEqualTypeOf<ProgressValue.Props>();
    expectTypeOf<ProgressValueState>().toEqualTypeOf<ProgressValue.State>();
    expectTypeOf<ProgressStatus>().toEqualTypeOf<ProgressRootState['status']>();
  });

  it('renders the expected root aria attributes', async () => {
    const view = render(html`
      <progress-root .value=${30}>
        <progress-label>Downloading</progress-label>
        <progress-value data-testid="value"></progress-value>
        <progress-track>
          <progress-indicator></progress-indicator>
        </progress-track>
      </progress-root>
    `);
    await waitForUpdate();

    const root = view.querySelector('progress-root') as HTMLElement;

    expect(root).toHaveAttribute('role', 'progressbar');
    expect(root).toHaveAttribute('aria-valuenow', '30');
    expect(root).toHaveAttribute('aria-valuemin', '0');
    expect(root).toHaveAttribute('aria-valuemax', '100');
    expect(root).toHaveAttribute(
      'aria-valuetext',
      (0.3).toLocaleString(undefined, { style: 'percent' }),
    );
    expect(root).toHaveAttribute('data-progressing');
  });

  it('wires up label via aria-labelledby', async () => {
    const view = render(html`
      <progress-root .value=${50}>
        <progress-label>Downloading</progress-label>
      </progress-root>
    `);
    await waitForUpdate();

    const root = view.querySelector('progress-root') as HTMLElement;
    const label = view.querySelector('progress-label') as HTMLElement;

    expect(root).toHaveAttribute('aria-labelledby', label.id);
    expect(label).toHaveAttribute('role', 'presentation');
  });

  it('preserves an explicit aria-labelledby attribute', async () => {
    const view = render(html`
      <span id="external-progress-label">Downloading</span>
      <progress-root aria-labelledby="external-progress-label" .value=${50}>
        <progress-label>Ignored auto label</progress-label>
      </progress-root>
    `);
    await waitForUpdate();

    const root = view.querySelector('progress-root') as HTMLElement;
    expect(root).toHaveAttribute('aria-labelledby', 'external-progress-label');
  });

  it('preserves an explicit aria-valuetext attribute', async () => {
    const view = render(html`
      <progress-root aria-valuetext="30 files uploaded" .value=${30}></progress-root>
    `);
    await waitForUpdate();

    expect(view.querySelector('progress-root')).toHaveAttribute(
      'aria-valuetext',
      '30 files uploaded',
    );
  });

  it('displays formatted value in progress-value', async () => {
    const view = render(html`
      <progress-root .value=${30}>
        <progress-value data-testid="value"></progress-value>
      </progress-root>
    `);
    await waitForUpdate();

    const value = view.querySelector('[data-testid="value"]') as HTMLElement;
    expect(value.textContent).toBe((0.3).toLocaleString(undefined, { style: 'percent' }));
    expect(value).toHaveAttribute('aria-hidden', 'true');
  });

  it('computes indicator width from progress range', async () => {
    const view = render(html`
      <progress-root .value=${33}>
        <progress-track>
          <progress-indicator data-testid="indicator"></progress-indicator>
        </progress-track>
      </progress-root>
    `);
    await waitForUpdate();

    const indicator = view.querySelector('[data-testid="indicator"]') as HTMLElement;
    expect(indicator.style.width).toBe('33%');
    expect(indicator.style.insetInlineStart).toBe('0');
    expect(indicator.style.height).toBe('inherit');
    expect(indicator).toHaveAttribute('data-progressing');
  });

  it('sets zero width when value is 0', async () => {
    const view = render(html`
      <progress-root .value=${0}>
        <progress-indicator data-testid="indicator"></progress-indicator>
      </progress-root>
    `);
    await waitForUpdate();

    const indicator = view.querySelector('[data-testid="indicator"]') as HTMLElement;
    expect(indicator.style.width).toBe('0%');
  });

  it('marks indeterminate progress and omits aria-valuenow', async () => {
    const view = render(html`
      <progress-root .value=${null}>
        <progress-value data-testid="value"></progress-value>
        <progress-track>
          <progress-indicator data-testid="indicator"></progress-indicator>
        </progress-track>
      </progress-root>
    `);
    await waitForUpdate();

    const root = view.querySelector('progress-root') as HTMLElement;
    const indicator = view.querySelector('[data-testid="indicator"]') as HTMLElement;

    expect(root).not.toHaveAttribute('aria-valuenow');
    expect(root).toHaveAttribute('aria-valuetext', 'indeterminate progress');
    expect(root).toHaveAttribute('data-indeterminate');
    expect(view.querySelector('[data-testid="value"]')?.textContent).toBe('');
    expect(indicator.style.width).toBe('');
  });

  it('marks every part with complete state when value reaches max', async () => {
    const view = render(html`
      <progress-root .value=${100}>
        <progress-label data-testid="label">Export</progress-label>
        <progress-value data-testid="value"></progress-value>
        <progress-track data-testid="track">
          <progress-indicator data-testid="indicator"></progress-indicator>
        </progress-track>
      </progress-root>
    `);
    await waitForUpdate();

    expect(view.querySelector('progress-root')).toHaveAttribute('data-complete');
    expect(view.querySelector('[data-testid="label"]')).toHaveAttribute('data-complete');
    expect(view.querySelector('[data-testid="value"]')).toHaveAttribute('data-complete');
    expect(view.querySelector('[data-testid="track"]')).toHaveAttribute('data-complete');
    expect(view.querySelector('[data-testid="indicator"]')).toHaveAttribute('data-complete');
  });

  it('updates root aria value on reactivity', async () => {
    const view = render(html`
      <progress-root .value=${50}>
        <progress-track>
          <progress-indicator></progress-indicator>
        </progress-track>
      </progress-root>
    `);
    await waitForUpdate();

    const root = view.querySelector('progress-root') as ProgressRootElement;
    expect(root).toHaveAttribute('aria-valuenow', '50');

    root.value = 77;
    await waitForUpdate();

    expect(root).toHaveAttribute('aria-valuenow', '77');
    expect(root).toHaveAttribute('data-progressing');
  });

  it('formats value and aria-valuetext when format is provided', async () => {
    const format: Intl.NumberFormatOptions = {
      style: 'currency',
      currency: 'USD',
    };
    const expectedValue = new Intl.NumberFormat(undefined, format).format(30);

    const view = render(html`
      <progress-root .value=${30} .format=${format}>
        <progress-value data-testid="value"></progress-value>
      </progress-root>
    `);
    await waitForUpdate();

    expect(view.querySelector('[data-testid="value"]')?.textContent).toBe(expectedValue);
    expect(view.querySelector('progress-root')).toHaveAttribute('aria-valuetext', expectedValue);
  });

  it('uses the provided locale when formatting the value', async () => {
    const format: Intl.NumberFormatOptions = {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    };
    const expectedValue = new Intl.NumberFormat('de-DE', format).format(70.51);

    const view = render(html`
      <progress-root .value=${70.51} .locale=${'de-DE'} .format=${format}>
        <progress-value data-testid="value"></progress-value>
      </progress-root>
    `);
    await waitForUpdate();

    expect(view.querySelector('[data-testid="value"]')?.textContent).toBe(expectedValue);
  });

  it('supports custom renderValue on progress-value', async () => {
    const renderSpy = vi.fn(
      (formattedValue: string | null, _value: number | null) => `Custom: ${formattedValue}`,
    );

    const view = render(html`
      <progress-root .value=${30}>
        <progress-value .renderValue=${renderSpy} data-testid="value"></progress-value>
      </progress-root>
    `);
    await waitForUpdate();

    const value = view.querySelector('[data-testid="value"]') as ProgressValueElement;
    expect(renderSpy).toHaveBeenCalled();
    expect(value.textContent).toContain('Custom:');
  });

  it('passes indeterminate markers to renderValue', async () => {
    const renderSpy = vi.fn((formattedValue: string | null) => formattedValue);

    render(html`
      <progress-root .value=${null}>
        <progress-value .renderValue=${renderSpy}></progress-value>
      </progress-root>
    `);
    await waitForUpdate();

    expect(renderSpy).toHaveBeenCalledWith('indeterminate', null);
  });

  it('logs error when parts render outside progress-root', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(html`<progress-track></progress-track>`);
    render(html`<progress-indicator></progress-indicator>`);
    render(html`<progress-label>Label</progress-label>`);
    render(html`<progress-value></progress-value>`);

    expect(errorSpy).toHaveBeenCalledTimes(4);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Progress parts must be placed within <progress-root>'),
    );

    errorSpy.mockRestore();
  });

  it('supports custom min/max range', async () => {
    const view = render(html`
      <progress-root .value=${15} .min=${10} .max=${20}>
        <progress-indicator data-testid="indicator"></progress-indicator>
      </progress-root>
    `);
    await waitForUpdate();

    const root = view.querySelector('progress-root') as HTMLElement;
    const indicator = view.querySelector('[data-testid="indicator"]') as HTMLElement;

    expect(root).toHaveAttribute('aria-valuemin', '10');
    expect(root).toHaveAttribute('aria-valuemax', '20');
    expect(root).toHaveAttribute('aria-valuenow', '15');
    expect(indicator.style.width).toBe('50%');
  });

  it('uses getAriaValueText when provided', async () => {
    const getAriaValueText = vi.fn(
      (_formatted: string | null, value: number | null) => `${value} items`,
    );

    const view = render(html`
      <progress-root .value=${42} .getAriaValueText=${getAriaValueText}></progress-root>
    `);
    await waitForUpdate();

    expect(view.querySelector('progress-root')).toHaveAttribute('aria-valuetext', '42 items');
    expect(getAriaValueText).toHaveBeenCalled();
  });

  it('includes NVDA force-announcement span', async () => {
    const view = render(html` <progress-root .value=${50}></progress-root> `);
    await waitForUpdate();

    const nvdaSpan = view.querySelector('progress-root span[role="presentation"]');
    expect(nvdaSpan).toBeInTheDocument();
    expect(nvdaSpan?.textContent).toBe('x');
  });
});
