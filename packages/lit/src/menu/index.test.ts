import { html, nothing, render, type TemplateResult } from 'lit';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import './index.ts';

const floatingUiMocks = vi.hoisted(() => ({
  arrow: vi.fn((options: unknown) => ({ name: 'arrow', options })),
  autoUpdate: vi.fn(
    (_anchor: Element, _floating: Element, update: () => void) => {
      update();
      return () => {};
    },
  ),
  computePosition: vi.fn(async () => ({
    x: 0,
    y: 0,
    placement: 'bottom',
    middlewareData: { arrow: {}, hide: {} },
  })),
  flip: vi.fn((options: unknown) => ({ name: 'flip', options })),
  hide: vi.fn((options: unknown) => ({ name: 'hide', options })),
  limitShift: vi.fn(() => ({ name: 'limitShift' })),
  offset: vi.fn((options: unknown) => ({ name: 'offset', options })),
  shift: vi.fn((options: unknown) => ({ name: 'shift', options })),
}));

vi.mock('@floating-ui/react-dom', () => floatingUiMocks);

describe('Menu', () => {
  const containers = new Set<HTMLDivElement>();

  afterEach(async () => {
    containers.forEach((container) => {
      render(nothing, container);
      container.remove();
    });
    containers.clear();
    document.documentElement.removeAttribute('dir');
    await flush();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  function mount(result: TemplateResult) {
    const container = document.createElement('div');
    document.body.append(container);
    containers.add(container);
    render(result, container);
    return container;
  }

  async function flush() {
    await Promise.resolve();
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
    await Promise.resolve();
  }

  function click(element: Element) {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }));
  }

  function keydown(element: Element, key: string) {
    element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  }

  function mouseenter(element: Element) {
    element.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, cancelable: true }));
  }

  function renderMenu(children: TemplateResult | TemplateResult[]) {
    return html`
      <menu-root>
        <menu-trigger data-testid="trigger">Open menu</menu-trigger>
        <menu-portal>
          <menu-positioner>
            <menu-popup data-testid="popup">
              ${children}
            </menu-popup>
          </menu-positioner>
        </menu-portal>
      </menu-root>
    `;
  }

  it('opens and closes when an item is clicked', async () => {
    const container = mount(renderMenu(
      html`<menu-item data-testid="item">First action</menu-item>`,
    ));
    await flush();

    const trigger = container.querySelector('[data-testid="trigger"]') as HTMLElement;
    click(trigger);
    await flush();

    const popup = document.body.querySelector('[data-testid="popup"]') as HTMLElement;
    const item = document.body.querySelector('[data-testid="item"]') as HTMLElement;

    expect(popup).toHaveAttribute('role', 'menu');
    expect(item).toHaveAttribute('role', 'menuitem');

    click(item);
    await flush();

    expect(document.body.querySelector('[data-testid="popup"]')?.hasAttribute('hidden')).toBe(true);
  });

  it('reports item-press when an item closes the menu', async () => {
    const onOpenChange = vi.fn();
    mount(html`
      <menu-root .onOpenChange=${onOpenChange}>
        <menu-trigger data-testid="trigger">Open menu</menu-trigger>
        <menu-portal>
          <menu-positioner>
            <menu-popup data-testid="popup">
              <menu-item data-testid="item">First action</menu-item>
            </menu-popup>
          </menu-positioner>
        </menu-portal>
      </menu-root>
    `);
    await flush();

    click(document.body.querySelector('[data-testid="trigger"]') as HTMLElement);
    await flush();
    onOpenChange.mockClear();

    click(document.body.querySelector('[data-testid="item"]') as HTMLElement);
    await flush();

    expect(onOpenChange).toHaveBeenCalledWith(
      false,
      expect.objectContaining({ reason: 'item-press' }),
    );
  });

  it('does not open when trigger click prevents the Base UI handler', async () => {
    mount(html`
      <menu-root>
        <menu-trigger
          data-testid="trigger"
          @click=${(event: MouseEvent & { preventBaseUIHandler?: () => void; baseUIHandlerPrevented?: boolean }) => {
            event.preventBaseUIHandler?.();
            Object.defineProperty(event, 'baseUIHandlerPrevented', { configurable: true, value: true });
          }}
        >Open menu</menu-trigger>
        <menu-portal>
          <menu-positioner>
            <menu-popup data-testid="popup">
              <menu-item data-testid="item">Blocked action</menu-item>
            </menu-popup>
          </menu-positioner>
        </menu-portal>
      </menu-root>
    `);
    await flush();

    click(document.body.querySelector('[data-testid="trigger"]') as HTMLElement);
    await flush();

    expect(document.body.querySelector('[data-testid="popup"]')?.hasAttribute('hidden')).toBe(true);
  });

  it('toggles checkbox items and indicator visibility', async () => {
    mount(renderMenu(html`
      <menu-checkbox-item data-testid="checkbox-item">
        <menu-checkbox-item-indicator data-testid="checkbox-indicator">x</menu-checkbox-item-indicator>
        Checkbox
      </menu-checkbox-item>
    `));
    await flush();

    click(document.body.querySelector('[data-testid="trigger"]') as HTMLElement);
    await flush();

    const item = document.body.querySelector('[data-testid="checkbox-item"]') as HTMLElement;
    const indicator = document.body.querySelector('[data-testid="checkbox-indicator"]') as HTMLElement;

    expect(item).toHaveAttribute('aria-checked', 'false');
    expect(indicator.hidden).toBe(true);

    click(item);
    await flush();

    expect(item).toHaveAttribute('aria-checked', 'true');
    expect(indicator.hidden).toBe(false);
    expect(item).toHaveAttribute('data-checked');
  });

  it('does not drift controlled checkbox state before the parent rerenders', async () => {
    const onCheckedChange = vi.fn();
    mount(renderMenu(html`
      <menu-checkbox-item
        data-testid="checkbox-item"
        .checked=${false}
        .onCheckedChange=${onCheckedChange}
      >Checkbox</menu-checkbox-item>
    `));
    await flush();

    click(document.body.querySelector('[data-testid="trigger"]') as HTMLElement);
    await flush();

    const item = document.body.querySelector('[data-testid="checkbox-item"]') as HTMLElement;
    click(item);
    await flush();

    expect(onCheckedChange).toHaveBeenCalledWith(
      true,
      expect.objectContaining({ reason: 'item-press' }),
    );
    expect(item).toHaveAttribute('aria-checked', 'false');
    expect(item).toHaveAttribute('data-unchecked');
    expect(item).not.toHaveAttribute('data-checked');
  });

  it('keeps checkbox state unchanged when the change is canceled', async () => {
    mount(renderMenu(html`
      <menu-checkbox-item
        data-testid="checkbox-item"
        .defaultChecked=${true}
        .onCheckedChange=${(_checked: boolean, details: { cancel(): void }) => {
          details.cancel();
        }}
      >Checkbox</menu-checkbox-item>
    `));
    await flush();

    click(document.body.querySelector('[data-testid="trigger"]') as HTMLElement);
    await flush();

    const item = document.body.querySelector('[data-testid="checkbox-item"]') as HTMLElement;
    click(item);
    await flush();

    expect(item).toHaveAttribute('aria-checked', 'true');
    expect(item).toHaveAttribute('data-checked');
  });

  it('updates group labelling when the group label mounts, changes, and unmounts', async () => {
    const container = mount(html`
      <menu-group data-testid="group">
        <menu-group-label data-testid="group-label">Settings</menu-group-label>
      </menu-group>
    `);
    await flush();

    const group = container.querySelector('[data-testid="group"]') as HTMLElement;
    const label = container.querySelector('[data-testid="group-label"]') as HTMLElement;

    expect(group).toHaveAttribute('aria-labelledby', label.id);

    // Re-render with custom id
    render(html`
      <menu-group data-testid="group">
        <menu-group-label id="custom-group-label" data-testid="group-label">Settings</menu-group-label>
      </menu-group>
    `, container);
    await flush();

    expect(container.querySelector('[data-testid="group"]')).toHaveAttribute(
      'aria-labelledby',
      'custom-group-label',
    );

    // Remove label
    render(html`
      <menu-group data-testid="group">
        <div data-testid="group-item">One</div>
      </menu-group>
    `, container);
    await flush();

    expect(container.querySelector('[data-testid="group"]')).not.toHaveAttribute('aria-labelledby');
  });

  it('updates uncontrolled radio group selection', async () => {
    mount(renderMenu(html`
      <menu-radio-group .defaultValue=${'one'}>
        <menu-radio-item data-testid="radio-one" .value=${'one'}>One</menu-radio-item>
        <menu-radio-item data-testid="radio-two" .value=${'two'}>Two</menu-radio-item>
      </menu-radio-group>
    `));
    await flush();

    click(document.body.querySelector('[data-testid="trigger"]') as HTMLElement);
    await flush();

    const radioOne = document.body.querySelector('[data-testid="radio-one"]') as HTMLElement;
    const radioTwo = document.body.querySelector('[data-testid="radio-two"]') as HTMLElement;

    expect(radioOne).toHaveAttribute('aria-checked', 'true');
    expect(radioTwo).toHaveAttribute('aria-checked', 'false');

    click(radioTwo);
    await flush();

    expect(radioTwo).toHaveAttribute('aria-checked', 'true');
  });

  it('does not drift controlled radio group selection before the parent rerenders', async () => {
    const onValueChange = vi.fn();
    mount(renderMenu(html`
      <menu-radio-group .value=${'one'} .onValueChange=${onValueChange}>
        <menu-radio-item data-testid="radio-one" .value=${'one'}>One</menu-radio-item>
        <menu-radio-item data-testid="radio-two" .value=${'two'}>Two</menu-radio-item>
      </menu-radio-group>
    `));
    await flush();

    click(document.body.querySelector('[data-testid="trigger"]') as HTMLElement);
    await flush();

    const radioOne = document.body.querySelector('[data-testid="radio-one"]') as HTMLElement;
    const radioTwo = document.body.querySelector('[data-testid="radio-two"]') as HTMLElement;
    click(radioTwo);
    await flush();

    expect(onValueChange).toHaveBeenCalledWith(
      'two',
      expect.objectContaining({ reason: 'item-press' }),
    );
    expect(radioOne).toHaveAttribute('aria-checked', 'true');
    expect(radioTwo).toHaveAttribute('aria-checked', 'false');
  });

  it('keeps a controlled null radio group value distinct from the uncontrolled path', async () => {
    const onValueChange = vi.fn();
    mount(renderMenu(html`
      <menu-radio-group .value=${null} .defaultValue=${'one'} .onValueChange=${onValueChange}>
        <menu-radio-item data-testid="radio-one" .value=${'one'}>One</menu-radio-item>
        <menu-radio-item data-testid="radio-two" .value=${'two'}>Two</menu-radio-item>
      </menu-radio-group>
    `));
    await flush();

    click(document.body.querySelector('[data-testid="trigger"]') as HTMLElement);
    await flush();

    const radioOne = document.body.querySelector('[data-testid="radio-one"]') as HTMLElement;
    const radioTwo = document.body.querySelector('[data-testid="radio-two"]') as HTMLElement;

    expect(radioOne).toHaveAttribute('aria-checked', 'false');
    expect(radioTwo).toHaveAttribute('aria-checked', 'false');

    click(radioOne);
    await flush();

    expect(onValueChange).toHaveBeenCalledWith(
      'one',
      expect.objectContaining({ reason: 'item-press' }),
    );
    expect(radioOne).toHaveAttribute('aria-checked', 'false');
    expect(radioTwo).toHaveAttribute('aria-checked', 'false');
  });

  it('keeps disabled radio items inert', async () => {
    const onValueChange = vi.fn();
    mount(html`
      <menu-root .open=${true}>
        <menu-portal>
          <menu-positioner>
            <menu-popup>
              <menu-radio-group .defaultValue=${'one'} .onValueChange=${onValueChange}>
                <menu-radio-item data-testid="radio-one" .value=${'one'}>One</menu-radio-item>
                <menu-radio-item data-testid="radio-two" .value=${'two'} .disabled=${true}>Two</menu-radio-item>
              </menu-radio-group>
            </menu-popup>
          </menu-positioner>
        </menu-portal>
      </menu-root>
    `);
    await flush();

    const radioOne = document.body.querySelector('[data-testid="radio-one"]') as HTMLElement;
    const radioTwo = document.body.querySelector('[data-testid="radio-two"]') as HTMLElement;

    mouseenter(radioTwo);
    click(radioTwo);
    await flush();

    expect(onValueChange).not.toHaveBeenCalled();
    expect(radioOne).toHaveAttribute('aria-checked', 'true');
    expect(radioTwo).toHaveAttribute('aria-checked', 'false');
    expect(radioTwo).toHaveAttribute('aria-disabled', 'true');
    expect(radioTwo).not.toHaveAttribute('data-highlighted');
  });

  it('does not highlight radio items on hover when highlightItemOnHover is false', async () => {
    mount(html`
      <menu-root .open=${true} .highlightItemOnHover=${false}>
        <menu-portal>
          <menu-positioner>
            <menu-popup>
              <menu-radio-group .defaultValue=${'one'}>
                <menu-radio-item data-testid="radio-one" .value=${'one'}>One</menu-radio-item>
                <menu-radio-item data-testid="radio-two" .value=${'two'}>Two</menu-radio-item>
              </menu-radio-group>
            </menu-popup>
          </menu-positioner>
        </menu-portal>
      </menu-root>
    `);
    await flush();

    const radioTwo = document.body.querySelector('[data-testid="radio-two"]') as HTMLElement;
    mouseenter(radioTwo);
    await flush();

    expect(radioTwo).not.toHaveAttribute('data-highlighted');
  });

  it('wires submenu trigger semantics onto a nested trigger', async () => {
    mount(html`
      <menu-root>
        <menu-trigger data-testid="trigger">Open menu</menu-trigger>
        <menu-portal>
          <menu-positioner>
            <menu-popup data-testid="popup">
              <menu-submenu-root>
                <menu-submenu-trigger data-testid="submenu-trigger" .openOnHover=${false}>More actions</menu-submenu-trigger>
                <menu-portal>
                  <menu-positioner .side=${'right'} .align=${'start'}>
                    <menu-popup data-testid="submenu-popup">
                      <menu-item data-testid="submenu-item">Nested action</menu-item>
                    </menu-popup>
                  </menu-positioner>
                </menu-portal>
              </menu-submenu-root>
            </menu-popup>
          </menu-positioner>
        </menu-portal>
      </menu-root>
    `);
    await flush();

    click(document.body.querySelector('[data-testid="trigger"]') as HTMLElement);
    await flush();

    const submenuTrigger = document.body.querySelector('[data-testid="submenu-trigger"]') as HTMLElement;

    expect(submenuTrigger).toHaveAttribute('role', 'menuitem');
    expect(submenuTrigger).toHaveAttribute('aria-haspopup', 'menu');
  });

  it('does not open a disabled submenu trigger', async () => {
    mount(html`
      <menu-root>
        <menu-trigger data-testid="trigger">Open menu</menu-trigger>
        <menu-portal>
          <menu-positioner>
            <menu-popup data-testid="popup">
              <menu-submenu-root>
                <menu-submenu-trigger data-testid="submenu-trigger" .disabled=${true} .openOnHover=${false}>More actions</menu-submenu-trigger>
                <menu-portal>
                  <menu-positioner>
                    <menu-popup data-testid="submenu-popup">
                      <menu-item data-testid="submenu-item">Nested action</menu-item>
                    </menu-popup>
                  </menu-positioner>
                </menu-portal>
              </menu-submenu-root>
            </menu-popup>
          </menu-positioner>
        </menu-portal>
      </menu-root>
    `);
    await flush();

    click(document.body.querySelector('[data-testid="trigger"]') as HTMLElement);
    await flush();

    const submenuTrigger = document.body.querySelector('[data-testid="submenu-trigger"]') as HTMLElement;
    click(submenuTrigger);
    await flush();

    expect(submenuTrigger).toHaveAttribute('aria-disabled', 'true');
    expect(submenuTrigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('uses ArrowLeft to open vertical RTL submenus', async () => {
    document.documentElement.setAttribute('dir', 'rtl');
    mount(html`
      <menu-root>
        <menu-trigger data-testid="trigger">Open menu</menu-trigger>
        <menu-portal>
          <menu-positioner>
            <menu-popup data-testid="popup">
              <menu-submenu-root>
                <menu-submenu-trigger data-testid="submenu-trigger" .openOnHover=${false}>More actions</menu-submenu-trigger>
                <menu-portal>
                  <menu-positioner>
                    <menu-popup data-testid="submenu-popup">
                      <menu-item data-testid="submenu-item-one">Nested one</menu-item>
                      <menu-item data-testid="submenu-item-two">Nested two</menu-item>
                    </menu-popup>
                  </menu-positioner>
                </menu-portal>
              </menu-submenu-root>
            </menu-popup>
          </menu-positioner>
        </menu-portal>
      </menu-root>
    `);
    await flush();

    click(document.body.querySelector('[data-testid="trigger"]') as HTMLElement);
    await flush();

    const submenuTrigger = document.body.querySelector('[data-testid="submenu-trigger"]') as HTMLElement;
    const clickSpy = vi.spyOn(submenuTrigger, 'click');

    keydown(submenuTrigger, 'ArrowLeft');
    await flush();

    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('uses ArrowDown to open horizontal submenus', async () => {
    mount(html`
      <menu-root .orientation=${'horizontal'}>
        <menu-trigger data-testid="trigger">Open menu</menu-trigger>
        <menu-portal>
          <menu-positioner>
            <menu-popup data-testid="popup">
              <menu-submenu-root .orientation=${'horizontal'}>
                <menu-submenu-trigger data-testid="submenu-trigger" .openOnHover=${false}>More actions</menu-submenu-trigger>
                <menu-portal>
                  <menu-positioner>
                    <menu-popup data-testid="submenu-popup">
                      <menu-item data-testid="submenu-item-one">Nested one</menu-item>
                      <menu-item data-testid="submenu-item-two">Nested two</menu-item>
                    </menu-popup>
                  </menu-positioner>
                </menu-portal>
              </menu-submenu-root>
            </menu-popup>
          </menu-positioner>
        </menu-portal>
      </menu-root>
    `);
    await flush();

    click(document.body.querySelector('[data-testid="trigger"]') as HTMLElement);
    await flush();

    const submenuTrigger = document.body.querySelector('[data-testid="submenu-trigger"]') as HTMLElement;
    const clickSpy = vi.spyOn(submenuTrigger, 'click');

    keydown(submenuTrigger, 'ArrowDown');
    await flush();

    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('supports popup keyboard navigation', async () => {
    mount(renderMenu(html`
      <menu-item data-testid="one">One</menu-item>
      <menu-item data-testid="two">Two</menu-item>
    `));
    await flush();

    click(document.body.querySelector('[data-testid="trigger"]') as HTMLElement);
    await flush();

    const popup = document.body.querySelector('[data-testid="popup"]') as HTMLElement;
    const first = document.body.querySelector('[data-testid="one"]') as HTMLElement;
    const second = document.body.querySelector('[data-testid="two"]') as HTMLElement;

    keydown(popup, 'ArrowDown');
    await flush();

    expect(first).toHaveFocus();

    keydown(first, 'ArrowDown');
    await flush();

    expect(second).toHaveFocus();
  });

  it('opens from the trigger with ArrowDown and highlights the first item', async () => {
    mount(renderMenu(html`
      <menu-item data-testid="one">One</menu-item>
      <menu-item data-testid="two">Two</menu-item>
    `));
    await flush();

    const trigger = document.body.querySelector('[data-testid="trigger"]') as HTMLElement;
    trigger.focus();

    keydown(trigger, 'ArrowDown');
    await flush();

    expect(document.body.querySelector('[data-testid="one"]')).toHaveFocus();
  });

  it('opens from the trigger with ArrowUp', async () => {
    mount(renderMenu(html`
      <menu-item data-testid="one">One</menu-item>
      <menu-item data-testid="two">Two</menu-item>
    `));
    await flush();

    const trigger = document.body.querySelector('[data-testid="trigger"]') as HTMLElement;
    trigger.focus();

    keydown(trigger, 'ArrowUp');
    await flush();

    expect(document.body.querySelector('[data-testid="popup"]')?.hasAttribute('hidden')).toBe(false);
  });

  it('focuses the first item when opened from a native trigger keyboard click', async () => {
    mount(renderMenu(html`
      <menu-item data-testid="one">One</menu-item>
      <menu-item data-testid="two">Two</menu-item>
    `));
    await flush();

    const trigger = document.body.querySelector('[data-testid="trigger"]') as HTMLElement;
    trigger.focus();

    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 0 }));
    await flush();

    expect(document.body.querySelector('[data-testid="one"]')).toHaveFocus();
  });

  it('does not activate the first link when a native trigger opens from a keyboard click', async () => {
    const onLinkOneClick = vi.fn();

    mount(renderMenu(html`
      <menu-link-item data-testid="link-one" href="#page-one" @click=${onLinkOneClick}>Page one</menu-link-item>
      <menu-link-item data-testid="link-two" href="#page-two">Page two</menu-link-item>
    `));
    await flush();

    const trigger = document.body.querySelector('[data-testid="trigger"]') as HTMLElement;
    trigger.focus();

    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 0 }));
    await flush();

    expect(document.body.querySelector('[data-testid="link-one"]')).toHaveFocus();
    expect(onLinkOneClick).not.toHaveBeenCalled();
  });

  it('does not prevent native Enter handling on link items', async () => {
    mount(renderMenu(html`
      <menu-link-item data-testid="link-one" href="#one">Page one</menu-link-item>
    `));
    await flush();

    click(document.body.querySelector('[data-testid="trigger"]') as HTMLElement);
    await flush();

    const link = document.body.querySelector('[data-testid="link-one"]') as HTMLElement;
    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    link.focus();
    link.dispatchEvent(enterEvent);

    expect(enterEvent.defaultPrevented).toBe(false);
  });

  it('does not open when the root is disabled', async () => {
    mount(html`
      <menu-root .disabled=${true}>
        <menu-trigger data-testid="trigger">Open menu</menu-trigger>
        <menu-portal>
          <menu-positioner>
            <menu-popup data-testid="popup">
              <menu-item data-testid="item">Blocked action</menu-item>
            </menu-popup>
          </menu-positioner>
        </menu-portal>
      </menu-root>
    `);
    await flush();

    click(document.body.querySelector('[data-testid="trigger"]') as HTMLElement);
    await flush();

    expect(document.body.querySelector('[data-testid="popup"]')?.hasAttribute('hidden')).toBe(true);
  });

  it('respects loopFocus=false', async () => {
    mount(html`
      <menu-root .loopFocus=${false}>
        <menu-trigger data-testid="trigger">Open menu</menu-trigger>
        <menu-portal>
          <menu-positioner>
            <menu-popup data-testid="popup">
              <menu-item data-testid="one">One</menu-item>
              <menu-item data-testid="two">Two</menu-item>
            </menu-popup>
          </menu-positioner>
        </menu-portal>
      </menu-root>
    `);
    await flush();

    click(document.body.querySelector('[data-testid="trigger"]') as HTMLElement);
    await flush();

    const popup = document.body.querySelector('[data-testid="popup"]') as HTMLElement;
    const second = document.body.querySelector('[data-testid="two"]') as HTMLElement;

    keydown(popup, 'End');
    await flush();
    expect(second).toHaveFocus();

    keydown(second, 'ArrowDown');
    await flush();
    expect(second).toHaveFocus();
  });

  it('supports horizontal root navigation', async () => {
    mount(html`
      <menu-root .orientation=${'horizontal'}>
        <menu-trigger data-testid="trigger">Open menu</menu-trigger>
        <menu-portal>
          <menu-positioner>
            <menu-popup data-testid="popup">
              <menu-item data-testid="one">One</menu-item>
              <menu-item data-testid="two">Two</menu-item>
            </menu-popup>
          </menu-positioner>
        </menu-portal>
      </menu-root>
    `);
    await flush();

    click(document.body.querySelector('[data-testid="trigger"]') as HTMLElement);
    await flush();

    const popup = document.body.querySelector('[data-testid="popup"]') as HTMLElement;
    const first = document.body.querySelector('[data-testid="one"]') as HTMLElement;
    const second = document.body.querySelector('[data-testid="two"]') as HTMLElement;

    keydown(popup, 'Home');
    await flush();
    expect(first).toHaveFocus();

    keydown(first, 'ArrowRight');
    await flush();
    expect(second).toHaveFocus();

    keydown(second, 'ArrowLeft');
    await flush();
    expect(first).toHaveFocus();
  });

  it('does not highlight items on hover when highlightItemOnHover is false', async () => {
    mount(html`
      <menu-root .highlightItemOnHover=${false}>
        <menu-trigger data-testid="trigger">Open menu</menu-trigger>
        <menu-portal>
          <menu-positioner>
            <menu-popup data-testid="popup">
              <menu-item data-testid="one">One</menu-item>
              <menu-item data-testid="two">Two</menu-item>
            </menu-popup>
          </menu-positioner>
        </menu-portal>
      </menu-root>
    `);
    await flush();

    click(document.body.querySelector('[data-testid="trigger"]') as HTMLElement);
    await flush();

    const popup = document.body.querySelector('[data-testid="popup"]') as HTMLElement;
    const first = document.body.querySelector('[data-testid="one"]') as HTMLElement;
    const second = document.body.querySelector('[data-testid="two"]') as HTMLElement;

    keydown(popup, 'Home');
    await flush();
    expect(first).toHaveFocus();

    mouseenter(second);
    await flush();

    expect(first).toHaveAttribute('data-highlighted');
    expect(second).not.toHaveAttribute('data-highlighted');
  });

  it('includes disabled items during keyboard navigation', async () => {
    mount(renderMenu(html`
      <menu-item data-testid="one">One</menu-item>
      <menu-item data-testid="two">Two</menu-item>
      <menu-item data-testid="three" .disabled=${true}>Three</menu-item>
    `));
    await flush();

    click(document.body.querySelector('[data-testid="trigger"]') as HTMLElement);
    await flush();

    const popup = document.body.querySelector('[data-testid="popup"]') as HTMLElement;
    const first = document.body.querySelector('[data-testid="one"]') as HTMLElement;
    const second = document.body.querySelector('[data-testid="two"]') as HTMLElement;
    const third = document.body.querySelector('[data-testid="three"]') as HTMLElement;

    keydown(popup, 'ArrowDown');
    await flush();
    expect(first).toHaveFocus();

    keydown(first, 'ArrowDown');
    await flush();
    expect(second).toHaveFocus();

    keydown(second, 'ArrowDown');
    await flush();
    expect(third).toHaveFocus();
    expect(third).toHaveAttribute('aria-disabled', 'true');
  });

  it('reports nested positioner state for submenus', async () => {
    mount(html`
      <menu-root>
        <menu-trigger data-testid="trigger">Open menu</menu-trigger>
        <menu-portal>
          <menu-positioner>
            <menu-popup data-testid="popup">
              <menu-submenu-root>
                <menu-submenu-trigger data-testid="submenu-trigger" .openOnHover=${false}>More actions</menu-submenu-trigger>
                <menu-portal>
                  <menu-positioner data-testid="submenu-positioner">
                    <menu-popup data-testid="submenu-popup">
                      <menu-item data-testid="submenu-item">Nested action</menu-item>
                    </menu-popup>
                  </menu-positioner>
                </menu-portal>
              </menu-submenu-root>
            </menu-popup>
          </menu-positioner>
        </menu-portal>
      </menu-root>
    `);
    await flush();

    click(document.body.querySelector('[data-testid="trigger"]') as HTMLElement);
    await flush();
    click(document.body.querySelector('[data-testid="submenu-trigger"]') as HTMLElement);
    await flush();

    const submenuPositioner = document.body.querySelector('[data-testid="submenu-positioner"]') as HTMLElement;
    const submenuPopup = document.body.querySelector('[data-testid="submenu-popup"]') as HTMLElement;

    expect(submenuPositioner).toHaveAttribute('data-nested');
    expect(submenuPopup).toHaveAttribute('data-nested');
  });
});
