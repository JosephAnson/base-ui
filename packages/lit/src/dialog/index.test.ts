/* eslint-disable testing-library/render-result-naming-convention */
import { html, nothing, render as renderTemplate, type TemplateResult } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import type { BaseUIChangeEventDetails } from '@base-ui/lit/types';

import type {
  DialogBackdropProps,
  DialogBackdropState,
  DialogCloseProps,
  DialogDescriptionProps,
  DialogPopupProps,
  DialogPopupState,
  DialogRootChangeEventDetails,
  DialogRootProps,
  DialogTitleProps,
  DialogTriggerProps,
  DialogTriggerState,
  DialogViewportProps,
  DialogViewportState,
} from '@base-ui/lit/dialog';
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

describe('Dialog', () => {
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

  function focusIn(element: HTMLElement) {
    element.focus();
    element.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
  }

  function getPopup(testId = 'popup') {
    return document.body.querySelector(`[data-testid="${testId}"]`) as HTMLElement | null;
  }

  function renderDialog(props: DialogRootProps = {}) {
    return Dialog.Root({
      ...props,
      children: [
        Dialog.Trigger({
          'data-testid': 'trigger',
          children: 'Trigger',
        }),
        Dialog.Portal({
          children: [
            Dialog.Backdrop({
              'data-testid': 'backdrop',
            }),
            Dialog.Popup({
              'data-testid': 'popup',
              children: [
                Dialog.Title({
                  children: 'Title',
                }),
                Dialog.Description({
                  children: 'Description',
                }),
                Dialog.Close({
                  'data-testid': 'close',
                  children: 'Close',
                }),
              ],
            }),
          ],
        }),
      ],
    });
  }

  it('preserves the public type contracts', () => {
    const root = Dialog.Root({});
    const trigger = Dialog.Trigger({});
    const portal = Dialog.Portal({});
    const popup = Dialog.Popup({});
    const backdrop = Dialog.Backdrop({});
    const title = Dialog.Title({});
    const description = Dialog.Description({});
    const close = Dialog.Close({});
    const viewport = Dialog.Viewport({});

    expectTypeOf(root).toMatchTypeOf<TemplateResult>();
    expectTypeOf(trigger).toMatchTypeOf<TemplateResult>();
    expectTypeOf(portal).toMatchTypeOf<TemplateResult>();
    expectTypeOf(popup).toMatchTypeOf<TemplateResult>();
    expectTypeOf(backdrop).toMatchTypeOf<TemplateResult>();
    expectTypeOf(title).toMatchTypeOf<TemplateResult>();
    expectTypeOf(description).toMatchTypeOf<TemplateResult>();
    expectTypeOf(close).toMatchTypeOf<TemplateResult>();
    expectTypeOf(viewport).toMatchTypeOf<TemplateResult>();
    expectTypeOf<DialogRootProps['modal']>().toEqualTypeOf<boolean | 'trap-focus' | undefined>();
    expectTypeOf<DialogTriggerProps['nativeButton']>().toEqualTypeOf<boolean | undefined>();
    expectTypeOf<DialogPopupProps['initialFocus']>().not.toBeAny();
    expectTypeOf<DialogRootChangeEventDetails>().toEqualTypeOf<
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
    expectTypeOf<DialogTriggerState['open']>().toEqualTypeOf<boolean>();
    expectTypeOf<DialogPopupState['transitionStatus']>().toEqualTypeOf<
      'starting' | 'ending' | undefined
    >();
    expectTypeOf<DialogBackdropState['open']>().toEqualTypeOf<boolean>();
    expectTypeOf<DialogViewportState['nestedDialogOpen']>().toEqualTypeOf<boolean>();
    expectTypeOf<DialogBackdropProps>().not.toBeAny();
    expectTypeOf<DialogCloseProps>().not.toBeAny();
    expectTypeOf<DialogDescriptionProps>().not.toBeAny();
    expectTypeOf<DialogTitleProps>().not.toBeAny();
    expectTypeOf<DialogViewportProps>().not.toBeAny();
  });

  it('only exposes the Dialog namespace at runtime', async () => {
    const module = await import('@base-ui/lit/dialog');

    expect(module.Dialog).toBeDefined();
    expect('DialogRoot' in module).toBe(false);
    expect('DialogTrigger' in module).toBe(false);
    expect('DialogPortal' in module).toBe(false);
    expect('DialogPopup' in module).toBe(false);
    expect('DialogBackdrop' in module).toBe(false);
    expect('DialogTitle' in module).toBe(false);
    expect('DialogDescription' in module).toBe(false);
    expect('DialogClose' in module).toBe(false);
    expect('DialogViewport' in module).toBe(false);
    expect('DialogHandle' in module).toBe(false);
    expect('createDialogHandle' in module).toBe(false);
  });

  it('opens through the trigger and closes through the backdrop and close button', async () => {
    const container = render(renderDialog());
    await flush();

    const trigger = container.querySelector('[data-testid="trigger"]') as HTMLElement;

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(getPopup()).toBeNull();

    click(trigger);
    await flush();

    const popup = getPopup();
    const backdrop = document.body.querySelector('[data-testid="backdrop"]') as HTMLElement;

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(popup).not.toBeNull();
    expect(popup).toHaveAttribute('role', 'dialog');
    expect(popup).toHaveAttribute('data-open');
    expect(backdrop).toHaveAttribute('role', 'presentation');

    click(backdrop);
    await flush();

    expect(getPopup()).toBeNull();

    click(trigger);
    await flush();
    click(document.body.querySelector('[data-testid="close"]') as HTMLElement);
    await flush();

    expect(getPopup()).toBeNull();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('dismisses a user-provided backdrop only once', async () => {
    const onOpenChange = vi.fn();
    const container = render(renderDialog({ onOpenChange }));
    await flush();

    click(container.querySelector('[data-testid="trigger"]') as HTMLElement);
    await flush();
    onOpenChange.mockClear();

    click(document.body.querySelector('[data-testid="backdrop"]') as HTMLElement);
    await flush();

    expect(getPopup()).toBeNull();
    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(onOpenChange.mock.calls[0]?.[0]).toBe(false);
    expect(onOpenChange.mock.calls[0]?.[1]).toMatchObject({ reason: 'outside-press' });
  });

  it('respects disablePointerDismissal for backdrop presses', async () => {
    const container = render(
      renderDialog({
        disablePointerDismissal: true,
      }),
    );
    await flush();

    click(container.querySelector('[data-testid="trigger"]') as HTMLElement);
    await flush();

    click(document.body.querySelector('[data-testid="backdrop"]') as HTMLElement);
    await flush();

    expect(getPopup()).not.toBeNull();
  });

  it('dismisses sibling dialogs one by one on backdrop press', async () => {
    const handles = [
      Dialog.createHandle<void>(),
      Dialog.createHandle<void>(),
      Dialog.createHandle<void>(),
    ];

    render(html`
      ${handles.map((handle, index) =>
        Dialog.Root({
          handle,
          children: Dialog.Portal({
            children: [
              Dialog.Backdrop({
                'data-testid': `backdrop-${index + 1}`,
              }),
              Dialog.Popup({
                'data-testid': `popup-${index + 1}`,
                children: `Dialog ${index + 1}`,
              }),
            ],
          }),
        }),
      )}
    `);
    await flush();

    handles[0].open(null);
    await flush();
    handles[1].open(null);
    await flush();
    handles[2].open(null);
    await flush();

    click(document.body.querySelector('[data-testid="backdrop-3"]') as HTMLElement);
    await flush();

    expect(document.body.querySelector('[data-testid="popup-3"]')).toBeNull();
    expect(document.body.querySelector('[data-testid="popup-2"]')).not.toBeNull();
    expect(document.body.querySelector('[data-testid="popup-1"]')).not.toBeNull();

    click(document.body.querySelector('[data-testid="backdrop-2"]') as HTMLElement);
    await flush();

    expect(document.body.querySelector('[data-testid="popup-2"]')).toBeNull();
    expect(document.body.querySelector('[data-testid="popup-1"]')).not.toBeNull();
  });

  it('dismisses sibling dialogs one by one on Escape', async () => {
    const handles = [
      Dialog.createHandle<void>(),
      Dialog.createHandle<void>(),
      Dialog.createHandle<void>(),
    ];

    render(html`
      ${handles.map((handle, index) =>
        Dialog.Root({
          handle,
          children: Dialog.Portal({
            children: Dialog.Popup({
              'data-testid': `popup-${index + 1}`,
              children: `Dialog ${index + 1}`,
            }),
          }),
        }),
      )}
    `);
    await flush();

    handles[0].open(null);
    await flush();
    handles[1].open(null);
    await flush();
    handles[2].open(null);
    await flush();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await flush();

    expect(document.body.querySelector('[data-testid="popup-3"]')).toBeNull();
    expect(document.body.querySelector('[data-testid="popup-2"]')).not.toBeNull();
    expect(document.body.querySelector('[data-testid="popup-1"]')).not.toBeNull();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await flush();

    expect(document.body.querySelector('[data-testid="popup-2"]')).toBeNull();
    expect(document.body.querySelector('[data-testid="popup-1"]')).not.toBeNull();
  });

  it('does not dismiss on non-main button backdrop clicks', async () => {
    const onOpenChange = vi.fn();
    const container = render(renderDialog({ defaultOpen: true, onOpenChange }));
    await flush();
    onOpenChange.mockClear();

    document.body.querySelector('[data-testid="backdrop"]')?.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        button: 2,
      }),
    );
    await flush();

    expect(getPopup()).not.toBeNull();
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(container.querySelector('[data-testid="trigger"]')).toHaveAttribute('aria-expanded', 'true');
  });

  it('warns and opens without associating a trigger when the handle id is missing', async () => {
    const handle = Dialog.createHandle<string>();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    render(html`
      ${Dialog.Trigger({
        'data-testid': 'detached-trigger',
        handle,
        id: 'trigger',
        payload: 'payload',
        children: 'Trigger',
      })}
      ${Dialog.Root<string>({
        handle,
        children: ({ payload }: { payload: string | undefined }) =>
          Dialog.Portal({
            children: Dialog.Popup({
              'data-testid': 'popup',
              children: payload ?? 'empty',
            }),
          }),
      })}
    `);

    await flush();

    handle.open('missing');
    await flush();
    await flush();

    expect(getPopup()).toHaveTextContent('empty');
    expect(document.body.querySelector('[data-testid="detached-trigger"]')).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(warn).toHaveBeenCalledWith(
      'Base UI: DialogHandle.open: No trigger found with id "missing". The dialog will open, but the trigger will not be associated with the dialog.',
    );
  });

  it('respects disablePointerDismissal for focus leaving a non-modal dialog', async () => {
    const container = render(html`
      <button data-testid="outside">Outside</button>
      ${renderDialog({
        disablePointerDismissal: true,
        modal: false,
      })}
    `);
    await flush();

    click(container.querySelector('[data-testid="trigger"]') as HTMLElement);
    await flush();

    focusIn(container.querySelector('[data-testid="outside"]') as HTMLElement);
    await flush();

    expect(getPopup()).not.toBeNull();
  });

  it('throws when a Dialog.Trigger without a handle is activated outside Dialog.Root', () => {
    const container = render(
      Dialog.Trigger({
        children: 'Trigger',
      }),
    );
    const onError = vi.fn((event: ErrorEvent) => {
      event.preventDefault();
    });

    window.addEventListener('error', onError);
    click(container.querySelector('button') as HTMLElement);
    window.removeEventListener('error', onError);

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0]?.[0].error).toEqual(
      new Error(
        'Base UI: <Dialog.Trigger> must be used within <Dialog.Root> or provided with a handle.',
      ),
    );
  });

  it('supports detached triggers through the handle', async () => {
    const handle = Dialog.createHandle<string>();
    const container = render(html`
      ${Dialog.Trigger({
        'data-testid': 'detached-one',
        handle,
        id: 'one',
        payload: 'first',
        children: 'One',
      })}
      ${Dialog.Trigger({
        'data-testid': 'detached-two',
        handle,
        id: 'two',
        payload: 'second',
        children: 'Two',
      })}
      ${Dialog.Root<string>({
        handle,
        children: ({ payload }: { payload: string | undefined }) => [
          Dialog.Portal({
            children: Dialog.Popup({
              'data-testid': 'popup',
              children: payload ?? 'empty',
            }),
          }),
        ],
      })}
    `);

    await flush();

    click(container.querySelector('[data-testid="detached-two"]') as HTMLElement);
    await flush();

    expect(getPopup()).toHaveTextContent('second');

    handle.close();
    await flush();

    handle.open('one');
    await flush();
    await flush();

    expect(getPopup()).toHaveTextContent('first');
  });

  it('replays imperative opens queued before the root connects', async () => {
    const handle = Dialog.createHandle<number>();

    handle.openWithPayload(8);

    render(html`
      ${Dialog.Trigger({
        'data-testid': 'detached-trigger',
        handle,
        id: 'trigger',
        payload: 1,
        children: 'Trigger',
      })}
      ${Dialog.Root<number>({
        handle,
        children: ({ payload }: { payload: number | undefined }) =>
          Dialog.Portal({
            children: Dialog.Popup({
              'data-testid': 'popup',
              children: payload ?? 'empty',
            }),
          }),
      })}
    `);

    await flush();
    await flush();

    expect(getPopup()).toHaveTextContent('8');

    handle.close();
    await flush();
    handle.open(null);
    await flush();
    await flush();

    expect(getPopup()).toHaveTextContent('empty');
    expect(document.body.querySelector('[data-testid="detached-trigger"]')).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('exposes disabled state attributes on the close part', async () => {
    const container = render(
      Dialog.Root({
        children: [
          Dialog.Trigger({
            'data-testid': 'trigger',
            children: 'Open',
          }),
          Dialog.Portal({
            children: Dialog.Popup({
              children: Dialog.Close({
                'data-testid': 'close',
                disabled: true,
                children: 'Close',
              }),
            }),
          }),
        ],
      }),
    );

    await flush();
    click(container.querySelector('[data-testid="trigger"]') as HTMLElement);
    await flush();

    const close = document.body.querySelector('[data-testid="close"]') as HTMLElement;

    expect(close).not.toBeNull();
    expect(close).toHaveAttribute('data-disabled');
    expect(close).toHaveAttribute('disabled');
  });

  it('stops composite navigation keys from bubbling out of the popup', async () => {
    const container = render(html`
      <div data-testid="ancestor">
        ${Dialog.Root({
          children: [
            Dialog.Trigger({
              'data-testid': 'trigger',
              children: 'Open',
            }),
            Dialog.Portal({
              children: Dialog.Popup({
                'data-testid': 'popup',
                children: html`<button data-testid="inside">Inside</button>`,
              }),
            }),
          ],
        })}
      </div>
    `);
    await flush();

    const ancestor = container.querySelector('[data-testid="ancestor"]') as HTMLElement;
    const onKeyDown = vi.fn();
    ancestor.addEventListener('keydown', onKeyDown);

    click(container.querySelector('[data-testid="trigger"]') as HTMLElement);
    await flush();

    const inside = document.body.querySelector('[data-testid="inside"]') as HTMLElement;

    inside.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await flush();

    expect(onKeyDown).not.toHaveBeenCalled();
  });
});
