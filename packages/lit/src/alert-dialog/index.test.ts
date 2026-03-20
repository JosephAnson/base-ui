/* eslint-disable testing-library/render-result-naming-convention */
import { html, nothing, render as renderTemplate, type TemplateResult } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import type { BaseUIChangeEventDetails } from '@base-ui/lit/types';

import type {
  AlertDialogBackdrop,
  AlertDialogBackdropProps,
  AlertDialogBackdropState,
  AlertDialogClose,
  AlertDialogCloseProps,
  AlertDialogCloseState,
  AlertDialogDescription,
  AlertDialogDescriptionProps,
  AlertDialogDescriptionState,
  AlertDialogHandle,
  AlertDialogPopup,
  AlertDialogPopupProps,
  AlertDialogPopupState,
  AlertDialogPortal,
  AlertDialogPortalProps,
  AlertDialogPortalState,
  AlertDialogRootChangeEventDetails,
  AlertDialogRootProps,
  AlertDialogTitle,
  AlertDialogTitleProps,
  AlertDialogTitleState,
  AlertDialogTrigger,
  AlertDialogTriggerProps,
  AlertDialogTriggerState,
  AlertDialogViewport,
  AlertDialogViewportProps,
  AlertDialogViewportState,
} from '@base-ui/lit/alert-dialog';
import { AlertDialog } from '@base-ui/lit/alert-dialog';
import { Dialog } from '@base-ui/lit/dialog';

const floatingUiMocks = vi.hoisted(() => ({
  arrow: vi.fn((options: unknown) => ({ name: 'arrow', options })),
  autoUpdate: vi.fn(
    (
      _anchor: Element,
      _floating: Element,
      update: () => void,
      _options?: {
        elementResize?: boolean;
        layoutShift?: boolean;
      },
    ) => {
      update();
      return () => {};
    },
  ),
  computePosition: vi.fn(async () => ({
    x: 0,
    y: 0,
    placement: 'bottom',
    middlewareData: {
      arrow: {},
      hide: {},
    },
  })),
  flip: vi.fn((options: unknown) => ({ name: 'flip', options })),
  hide: vi.fn((options: unknown) => ({ name: 'hide', options })),
  limitShift: vi.fn(() => ({ name: 'limitShift' })),
  offset: vi.fn((options: unknown) => ({ name: 'offset', options })),
  shift: vi.fn((options: unknown) => ({ name: 'shift', options })),
}));

vi.mock('@floating-ui/react-dom', () => floatingUiMocks);

describe('AlertDialog', () => {
  const containers = new Set<HTMLDivElement>();

  afterEach(async () => {
    containers.forEach((container) => {
      renderTemplate(nothing, container);
      container.remove();
    });
    containers.clear();

    document.body.querySelectorAll('[data-base-ui-popover-portal]').forEach((element) => {
      element.parentElement?.remove();
    });

    await flush();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  function render(result: TemplateResult) {
    const container = document.createElement('div');
    document.body.append(container);
    containers.add(container);

    renderTemplate(result, container);
    return container;
  }

  async function flush() {
    await Promise.resolve();
    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 50);
    });
    await Promise.resolve();
  }

  function click(element: Element) {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  }

  function getPopup(testId = 'popup') {
    return document.body.querySelector(`[data-testid="${testId}"]`) as HTMLElement | null;
  }

  function renderAlertDialog(props: AlertDialogRootProps = {}) {
    return AlertDialog.Root({
      ...props,
      children: [
        AlertDialog.Trigger({
          'data-testid': 'trigger',
          children: 'Trigger',
        }),
        AlertDialog.Portal({
          children: [
            AlertDialog.Backdrop({
              'data-testid': 'backdrop',
            }),
            AlertDialog.Popup({
              'data-testid': 'popup',
              children: [
                AlertDialog.Title({
                  children: 'Discard draft?',
                }),
                AlertDialog.Description({
                  children: "You can't undo this action.",
                }),
                AlertDialog.Close({
                  'data-testid': 'close',
                  children: 'Discard',
                }),
              ],
            }),
          ],
        }),
      ],
    });
  }

  it('preserves the public type contracts', () => {
    const root = AlertDialog.Root({});
    const trigger = AlertDialog.Trigger({});
    const portal = AlertDialog.Portal({});
    const popup = AlertDialog.Popup({});
    const backdrop = AlertDialog.Backdrop({});
    const title = AlertDialog.Title({});
    const description = AlertDialog.Description({});
    const close = AlertDialog.Close({});
    const viewport = AlertDialog.Viewport({});

    expectTypeOf(root).toMatchTypeOf<TemplateResult>();
    expectTypeOf(trigger).toMatchTypeOf<TemplateResult>();
    expectTypeOf(portal).toMatchTypeOf<TemplateResult>();
    expectTypeOf(popup).toMatchTypeOf<TemplateResult>();
    expectTypeOf(backdrop).toMatchTypeOf<TemplateResult>();
    expectTypeOf(title).toMatchTypeOf<TemplateResult>();
    expectTypeOf(description).toMatchTypeOf<TemplateResult>();
    expectTypeOf(close).toMatchTypeOf<TemplateResult>();
    expectTypeOf(viewport).toMatchTypeOf<TemplateResult>();
    expectTypeOf<AlertDialogRootChangeEventDetails>().toEqualTypeOf<
      BaseUIChangeEventDetails<
        | 'trigger-press'
        | 'outside-press'
        | 'escape-key'
        | 'close-press'
        | 'focus-out'
        | 'imperative-action'
        | 'none',
        { preventUnmountOnClose(): void }
      >
    >();
    expectTypeOf<AlertDialogTrigger.Props<number>>().toEqualTypeOf<
      AlertDialogTriggerProps<number>
    >();
    expectTypeOf<AlertDialogTriggerProps<number>['handle']>().toEqualTypeOf<
      AlertDialogHandle<number> | undefined
    >();
    expectTypeOf<AlertDialogTrigger.State>().toEqualTypeOf<AlertDialogTriggerState>();
    expectTypeOf<AlertDialogPortal.Props>().toEqualTypeOf<AlertDialogPortalProps>();
    expectTypeOf<AlertDialogPortal.State>().toEqualTypeOf<AlertDialogPortalState>();
    expectTypeOf<AlertDialogPopup.Props>().toEqualTypeOf<AlertDialogPopupProps>();
    expectTypeOf<AlertDialogPopupProps['role']>().toEqualTypeOf<never | undefined>();
    expectTypeOf<AlertDialogPopup.State>().toEqualTypeOf<AlertDialogPopupState>();
    expectTypeOf<AlertDialogBackdrop.Props>().toEqualTypeOf<AlertDialogBackdropProps>();
    expectTypeOf<AlertDialogBackdrop.State>().toEqualTypeOf<AlertDialogBackdropState>();
    expectTypeOf<AlertDialogTitle.Props>().toEqualTypeOf<AlertDialogTitleProps>();
    expectTypeOf<AlertDialogTitle.State>().toEqualTypeOf<AlertDialogTitleState>();
    expectTypeOf<AlertDialogDescription.Props>().toEqualTypeOf<AlertDialogDescriptionProps>();
    expectTypeOf<AlertDialogDescription.State>().toEqualTypeOf<AlertDialogDescriptionState>();
    expectTypeOf<AlertDialogClose.Props>().toEqualTypeOf<AlertDialogCloseProps>();
    expectTypeOf<AlertDialogClose.State>().toEqualTypeOf<AlertDialogCloseState>();
    expectTypeOf<AlertDialogViewport.Props>().toEqualTypeOf<AlertDialogViewportProps>();
    expectTypeOf<AlertDialogViewport.State>().toEqualTypeOf<AlertDialogViewportState>();
  });

  it('only exposes the AlertDialog namespace at runtime', async () => {
    const module = await import('@base-ui/lit/alert-dialog');

    expect(module.AlertDialog).toBeDefined();
    expect('AlertDialogRoot' in module).toBe(false);
    expect('AlertDialogTrigger' in module).toBe(false);
    expect('AlertDialogPortal' in module).toBe(false);
    expect('AlertDialogPopup' in module).toBe(false);
    expect('AlertDialogBackdrop' in module).toBe(false);
    expect('AlertDialogTitle' in module).toBe(false);
    expect('AlertDialogDescription' in module).toBe(false);
    expect('AlertDialogClose' in module).toBe(false);
    expect('AlertDialogViewport' in module).toBe(false);
    expect('AlertDialogHandle' in module).toBe(false);
  });

  it('renders an alertdialog popup with title and description wiring', async () => {
    const container = render(renderAlertDialog({ defaultOpen: true }));
    await flush();

    const popup = getPopup();
    const title = document.body.querySelector('[data-base-ui-popover-title]');
    const description = document.body.querySelector('[data-base-ui-popover-description]');
    const trigger = container.querySelector('[data-testid="trigger"]');

    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    expect(popup).not.toBeNull();
    expect(popup).toHaveAttribute('role', 'alertdialog');
    expect(title?.id).toBe(popup?.getAttribute('aria-labelledby'));
    expect(description?.id).toBe(popup?.getAttribute('aria-describedby'));
  });

  it('keeps alertdialog semantics when composed with Dialog.Popup', async () => {
    const container = render(
      AlertDialog.Root({
        defaultOpen: true,
        children: [
          AlertDialog.Trigger({
            'data-testid': 'trigger',
            children: 'Trigger',
          }),
          Dialog.Portal({
            children: Dialog.Popup({
              'data-testid': 'popup',
              children: 'Content',
            }),
          }),
        ],
      }),
    );
    await flush();
    await flush();

    expect(getPopup()).toHaveAttribute('role', 'alertdialog');
  });

  it('does not close when the backdrop is clicked', async () => {
    const onOpenChange = vi.fn();
    const container = render(
      renderAlertDialog({
        defaultOpen: true,
        onOpenChange,
      }),
    );
    await flush();
    onOpenChange.mockClear();

    click(document.body.querySelector('[data-testid="backdrop"]') as HTMLElement);
    await flush();

    expect(getPopup()).not.toBeNull();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('forces modal and pointer-dismissal semantics on Dialog.Root', () => {
    const dialogRootSpy = vi.spyOn(Dialog, 'Root');

    AlertDialog.Root({
      children: 'Content',
    });

    const forwardedProps = dialogRootSpy.mock.calls[0]?.[0];

    expect(forwardedProps?.modal).toBe(true);
    expect(forwardedProps?.disablePointerDismissal).toBe(true);
  });

  it('reports trigger and close reasons through onOpenChange', async () => {
    const onOpenChange = vi.fn();
    const container = render(renderAlertDialog({ onOpenChange }));
    await flush();

    click(container.querySelector('[data-testid="trigger"]') as HTMLElement);
    await flush();
    click(document.body.querySelector('[data-testid="close"]') as HTMLElement);
    await flush();

    expect(onOpenChange).toHaveBeenCalledTimes(2);
    expect(onOpenChange.mock.calls[0]?.[0]).toBe(true);
    expect(onOpenChange.mock.calls[0]?.[1]).toMatchObject({ reason: 'trigger-press' });
    expect(onOpenChange.mock.calls[1]?.[0]).toBe(false);
    expect(onOpenChange.mock.calls[1]?.[1]).toMatchObject({ reason: 'close-press' });
  });

  it('reports escape-key when dismissed with Escape', async () => {
    const onOpenChange = vi.fn();
    render(renderAlertDialog({ defaultOpen: true, onOpenChange }));
    await flush();
    onOpenChange.mockClear();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await flush();

    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(onOpenChange.mock.calls[0]?.[0]).toBe(false);
    expect(onOpenChange.mock.calls[0]?.[1]).toMatchObject({ reason: 'escape-key' });
  });

  it('forwards controlled open and onOpenChangeComplete props to Dialog.Root', () => {
    const dialogRootSpy = vi.spyOn(Dialog, 'Root');
    const onOpenChangeComplete = vi.fn();

    AlertDialog.Root({
      open: true,
      onOpenChangeComplete,
      children: 'Content',
    });

    const forwardedProps = dialogRootSpy.mock.calls[0]?.[0];

    expect(forwardedProps?.open).toBe(true);
    expect(forwardedProps?.onOpenChangeComplete).toBe(onOpenChangeComplete);
  });

  it('calls onOpenChangeComplete after controlled open and close updates', async () => {
    const onOpenChangeComplete = vi.fn();
    const container = render(
      renderAlertDialog({
        open: true,
        onOpenChangeComplete,
      }),
    );

    await flush();
    await flush();

    expect(getPopup()).not.toBeNull();
    expect(onOpenChangeComplete.mock.calls.map(([open]) => open)).toEqual([true]);

    renderTemplate(
      renderAlertDialog({
        open: false,
        onOpenChangeComplete,
      }),
      container,
    );
    await flush();
    await flush();

    expect(getPopup()).toBeNull();
    expect(onOpenChangeComplete.mock.calls.map(([open]) => open)).toEqual([true, false]);
  });

  it('keeps the popup mounted when preventUnmountOnClose is requested', async () => {
    const actionsRef = { current: null as { close(): void; unmount(): void } | null };
    let preventUnmountRequested = false;
    const container = render(
      renderAlertDialog({
        defaultOpen: true,
        actionsRef,
        onOpenChange(nextOpen, details) {
          if (!nextOpen) {
            preventUnmountRequested = true;
            details.preventUnmountOnClose();
          }
        },
      }),
    );
    await flush();

    click(container.querySelector('[data-testid="trigger"]') as HTMLElement);
    await Promise.resolve();

    expect(preventUnmountRequested).toBe(true);
    expect(getPopup()).not.toBeNull();
    expect(getPopup()).toHaveAttribute('data-closed');
    expect(getPopup()).not.toHaveAttribute('hidden');

    await flush();

    expect(getPopup()).not.toBeNull();
    expect(getPopup()).not.toHaveAttribute('hidden');

    actionsRef.current?.unmount();
    await flush();

    expect(getPopup()).toBeNull();
  });

  it('switches payloads and active ARIA attributes between Root-scoped triggers', async () => {
    const container = render(
      AlertDialog.Root<number>({
        children: ({ payload }: { payload: number | undefined }) => [
          AlertDialog.Trigger({
            'data-testid': 'trigger-one',
            payload: 1,
            children: 'Trigger 1',
          }),
          AlertDialog.Trigger({
            'data-testid': 'trigger-two',
            payload: 2,
            children: 'Trigger 2',
          }),
          AlertDialog.Portal({
            children: AlertDialog.Popup({
              'data-testid': 'popup',
              children: html`<span data-testid="payload">${payload ?? 'empty'}</span>`,
            }),
          }),
        ],
      }),
    );
    await flush();

    const triggerOne = container.querySelector('[data-testid="trigger-one"]') as HTMLElement;
    const triggerTwo = container.querySelector('[data-testid="trigger-two"]') as HTMLElement;

    click(triggerOne);
    await flush();

    const popup = getPopup();

    expect(document.body.querySelector('[data-testid="payload"]')).toHaveTextContent('1');
    expect(triggerOne).toHaveAttribute('aria-expanded', 'true');
    expect(triggerTwo).toHaveAttribute('aria-expanded', 'false');
    expect(triggerOne.getAttribute('aria-controls')).toBe(popup?.getAttribute('id'));

    click(triggerTwo);
    await flush();

    expect(getPopup()).toBe(popup);
    expect(document.body.querySelector('[data-testid="payload"]')).toHaveTextContent('2');
    expect(triggerOne).toHaveAttribute('aria-expanded', 'false');
    expect(triggerTwo).toHaveAttribute('aria-expanded', 'true');
    expect(triggerTwo.getAttribute('aria-controls')).toBe(popup?.getAttribute('id'));
  });

  it('supports detached triggers and payloads through the shared handle', async () => {
    const handle = AlertDialog.createHandle<number>();

    const container = render(html`
      ${AlertDialog.Trigger({
        'data-testid': 'trigger-one',
        handle,
        id: 'one',
        payload: 1,
        children: 'Trigger 1',
      })}
      ${AlertDialog.Trigger({
        'data-testid': 'trigger-two',
        handle,
        id: 'two',
        payload: 2,
        children: 'Trigger 2',
      })}
      ${AlertDialog.Root<number>({
        handle,
        children: ({ payload }: { payload: number | undefined }) =>
          AlertDialog.Portal({
            children: AlertDialog.Popup({
              'data-testid': 'popup',
              children: [
                AlertDialog.Title({
                  children: 'Payload',
                }),
                html`<div data-testid="payload">${payload ?? 'empty'}</div>`,
              ],
            }),
          }),
      })}
    `);
    await flush();

    const triggerOne = container.querySelector('[data-testid="trigger-one"]') as HTMLElement;
    const triggerTwo = container.querySelector('[data-testid="trigger-two"]') as HTMLElement;

    click(document.body.querySelector('[data-testid="trigger-two"]') as HTMLElement);
    await flush();

    const popup = getPopup();

    expect(popup).toHaveAttribute('role', 'alertdialog');
    expect(document.body.querySelector('[data-testid="payload"]')).toHaveTextContent('2');
    expect(triggerOne).toHaveAttribute('aria-expanded', 'false');
    expect(triggerTwo).toHaveAttribute('aria-expanded', 'true');
    expect(triggerTwo.getAttribute('aria-controls')).toBe(popup?.getAttribute('id'));

    handle.close();
    await flush();
    handle.open('one');
    await flush();
    await flush();

    const reopenedPopup = getPopup();

    expect(reopenedPopup).toHaveAttribute('role', 'alertdialog');
    expect(document.body.querySelector('[data-testid="payload"]')).toHaveTextContent('1');
    expect(triggerOne).toHaveAttribute('aria-expanded', 'true');
    expect(triggerTwo).toHaveAttribute('aria-expanded', 'false');
    expect(triggerOne.getAttribute('aria-controls')).toBe(reopenedPopup?.getAttribute('id'));
  });

  it('supports imperative payload opens, empty opens, close, and isOpen on the handle', async () => {
    const handle = AlertDialog.createHandle<number>();

    render(html`
      ${AlertDialog.Trigger({
        'data-testid': 'trigger-one',
        handle,
        id: 'one',
        payload: 1,
        children: 'Trigger 1',
      })}
      ${AlertDialog.Trigger({
        'data-testid': 'trigger-two',
        handle,
        id: 'two',
        payload: 2,
        children: 'Trigger 2',
      })}
      ${AlertDialog.Root<number>({
        handle,
        children: ({ payload }: { payload: number | undefined }) =>
          AlertDialog.Portal({
            children: AlertDialog.Popup({
              'data-testid': 'popup',
              children: html`<div data-testid="payload">${payload ?? 'empty'}</div>`,
            }),
          }),
      })}
    `);
    await flush();

    const triggerOne = document.body.querySelector('[data-testid="trigger-one"]');
    const triggerTwo = document.body.querySelector('[data-testid="trigger-two"]');

    expect(handle.isOpen).toBe(false);

    handle.openWithPayload(8);
    await flush();
    await flush();

    expect(handle.isOpen).toBe(true);
    expect(document.body.querySelector('[data-testid="payload"]')).toHaveTextContent('8');
    expect(triggerOne).not.toHaveAttribute('aria-expanded', 'true');
    expect(triggerTwo).not.toHaveAttribute('aria-expanded', 'true');

    handle.close();
    await flush();

    expect(handle.isOpen).toBe(false);
    expect(getPopup()).toBeNull();

    handle.open(null);
    await flush();
    await flush();

    expect(handle.isOpen).toBe(true);
    expect(document.body.querySelector('[data-testid="payload"]')).toHaveTextContent('empty');
    expect(triggerOne).not.toHaveAttribute('aria-expanded', 'true');
    expect(triggerTwo).not.toHaveAttribute('aria-expanded', 'true');
  });

  it('supports the Handle constructor at runtime', async () => {
    const handle = new AlertDialog.Handle<number>();

    render(html`
      ${AlertDialog.Trigger({
        'data-testid': 'trigger-one',
        handle,
        id: 'one',
        payload: 1,
        children: 'Trigger 1',
      })}
      ${AlertDialog.Root<number>({
        handle,
        children: ({ payload }: { payload: number | undefined }) =>
          AlertDialog.Portal({
            children: AlertDialog.Popup({
              'data-testid': 'popup',
              children: html`<div data-testid="payload">${payload ?? 'empty'}</div>`,
            }),
          }),
      })}
    `);
    await flush();

    handle.open('one');
    await flush();
    await flush();

    expect(handle.isOpen).toBe(true);
    expect(getPopup()).toHaveAttribute('role', 'alertdialog');
    expect(document.body.querySelector('[data-testid="payload"]')).toHaveTextContent('1');

    handle.close();
    await flush();

    expect(handle.isOpen).toBe(false);
    expect(getPopup()).toBeNull();
  });
});
