import { html, nothing, render as renderTemplate } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import './index.ts';
import '../menu/index.ts';

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

describe('MenubarRootElement', () => {
  const containers = new Set<HTMLDivElement>();

  afterEach(async () => {
    containers.forEach((container) => {
      renderTemplate(nothing, container);
      container.remove();
    });
    containers.clear();
    await flush();
  });

  function render(result: ReturnType<typeof html>) {
    const container = document.createElement('div');
    document.body.append(container);
    containers.add(container);
    renderTemplate(result, container);
    return container;
  }

  async function flush() {
    await Promise.resolve();
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 50);
    });
    await Promise.resolve();
  }

  function click(element: Element) {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }));
  }

  function hover(element: Element) {
    element.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, cancelable: true }));
    element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, cancelable: true }));
  }

  function keydown(element: Element, key: string) {
    element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key }));
  }

  function renderMenubar(props: { disabled?: boolean; loopFocus?: boolean; orientation?: 'horizontal' | 'vertical'; modal?: boolean } = {}) {
    return html`
      <menubar-root
        ?disabled=${props.disabled}
        .loopFocus=${props.loopFocus ?? true}
        .orientation=${props.orientation ?? 'horizontal'}
        .modal=${props.modal ?? true}
      >
        <menu-root>
          <menu-trigger data-testid="file-trigger">File</menu-trigger>
          <menu-portal>
            <menu-positioner data-testid="file-positioner">
              <menu-popup data-testid="file-menu">
                <menu-item data-testid="file-item-1">Open</menu-item>
              </menu-popup>
            </menu-positioner>
          </menu-portal>
        </menu-root>
        <menu-root>
          <menu-trigger data-testid="edit-trigger">Edit</menu-trigger>
          <menu-portal>
            <menu-positioner>
              <menu-popup data-testid="edit-menu">
                <menu-item data-testid="edit-item-1">Copy</menu-item>
              </menu-popup>
            </menu-positioner>
          </menu-portal>
        </menu-root>
        <menu-root>
          <menu-trigger data-testid="view-trigger">View</menu-trigger>
          <menu-portal>
            <menu-positioner>
              <menu-popup data-testid="view-menu">
                <menu-item data-testid="view-item-1">Zoom In</menu-item>
              </menu-popup>
            </menu-positioner>
          </menu-portal>
        </menu-root>
      </menubar-root>
    `;
  }

  it('renders a menubar root with role and data attributes', async () => {
    const container = render(renderMenubar());
    await flush();

    const menubar = container.querySelector('[role="menubar"]');
    expect(menubar).not.toBeNull();
    expect(menubar).toHaveAttribute('data-orientation', 'horizontal');
    expect(menubar).toHaveAttribute('data-has-submenu-open', 'false');
  });

  it('sets role="menuitem" on top-level triggers', async () => {
    const container = render(renderMenubar());
    await flush();

    const triggers = container.querySelectorAll('[data-testid$="-trigger"]');
    expect(triggers).toHaveLength(3);
    triggers.forEach((trigger) => {
      expect(trigger).toHaveAttribute('role', 'menuitem');
    });
  });

  it('does not open top-level menus on hover when no submenu is open', async () => {
    const container = render(renderMenubar());
    await flush();

    hover(container.querySelector('[data-testid="file-trigger"]') as HTMLElement);
    await flush();

    expect(container.querySelector('[data-testid="file-menu"]')).not.toHaveAttribute('data-open');
  });

  it('tracks when a top-level menu opens', async () => {
    const container = render(renderMenubar());
    await flush();

    click(container.querySelector('[data-testid="file-trigger"]') as HTMLElement);
    await flush();

    const menubar = container.querySelector('[role="menubar"]');
    expect(menubar).toHaveAttribute('data-has-submenu-open', 'true');
  });

  it('switches top-level menus when another trigger is clicked while a menu is open', async () => {
    const container = render(renderMenubar());
    await flush();

    click(container.querySelector('[data-testid="file-trigger"]') as HTMLElement);
    await flush();

    const editTrigger = container.querySelector('[data-testid="edit-trigger"]') as HTMLElement;
    click(editTrigger);
    await flush();

    // Edit menu should be open
    expect(editTrigger).toHaveAttribute('aria-expanded', 'true');
    // File trigger should be closed
    expect(container.querySelector('[data-testid="file-trigger"]')).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('moves focus between top-level triggers with arrow keys', async () => {
    const container = render(renderMenubar());
    await flush();

    const fileTrigger = container.querySelector('[data-testid="file-trigger"]') as HTMLElement;
    const editTrigger = container.querySelector('[data-testid="edit-trigger"]') as HTMLElement;

    fileTrigger.focus();
    keydown(fileTrigger, 'ArrowRight');
    await flush();

    expect(editTrigger).toHaveFocus();
  });

  it('loops focus between top-level triggers when loopFocus is enabled', async () => {
    const container = render(renderMenubar());
    await flush();

    const fileTrigger = container.querySelector('[data-testid="file-trigger"]') as HTMLElement;
    const viewTrigger = container.querySelector('[data-testid="view-trigger"]') as HTMLElement;

    fileTrigger.focus();
    keydown(fileTrigger, 'ArrowLeft');
    await flush();

    expect(viewTrigger).toHaveFocus();
  });

  it('disables child triggers when the menubar is disabled', async () => {
    const container = render(renderMenubar({ disabled: true }));
    await flush();

    const fileTrigger = container.querySelector('[data-testid="file-trigger"]') as HTMLElement;
    expect(fileTrigger).toHaveAttribute('aria-disabled', 'true');

    fileTrigger.click();
    await flush();

    expect(fileTrigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('restores trigger enabled state when the menubar is re-enabled', async () => {
    const container = render(renderMenubar({ disabled: true }));
    await flush();

    expect(container.querySelector('[data-testid="file-trigger"]')).toHaveAttribute(
      'aria-disabled',
      'true',
    );

    renderTemplate(renderMenubar({ disabled: false }), container);
    await flush();

    expect(container.querySelector('[data-testid="file-trigger"]')).not.toHaveAttribute(
      'aria-disabled',
    );
  });

  it('manages roving tabindex on triggers', async () => {
    const container = render(renderMenubar());
    await flush();

    const fileTrigger = container.querySelector('[data-testid="file-trigger"]') as HTMLElement;
    const editTrigger = container.querySelector('[data-testid="edit-trigger"]') as HTMLElement;
    const viewTrigger = container.querySelector('[data-testid="view-trigger"]') as HTMLElement;

    // First trigger should be tabbable
    expect(fileTrigger.tabIndex).toBe(0);
    expect(editTrigger.tabIndex).toBe(-1);
    expect(viewTrigger.tabIndex).toBe(-1);

    // Focus second trigger
    editTrigger.focus();
    editTrigger.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await flush();

    expect(fileTrigger.tabIndex).toBe(-1);
    expect(editTrigger.tabIndex).toBe(0);
    expect(viewTrigger.tabIndex).toBe(-1);
  });
});
