import { describe, it, beforeAll, afterAll } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { chromium, expect, Page, Browser } from '@playwright/test';
import '@mui/internal-test-utils/initPlaywrightMatchers';

const BASE_URL = 'http://localhost:5174';
const staticRoot = process.env.BASE_UI_LOCAL_BUILD_ROOT;
const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH;

function delay(duration: number): Promise<void> {
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve();
    }, duration);
  });
}

/**
 * Attempts page.goto with retries
 *
 * @remarks The server and runner can be started up simultaneously
 * @param page
 * @param url
 */
async function attemptGoto(page: Page, url: string): Promise<boolean> {
  const maxAttempts = 10;
  const retryTimeoutMS = 250;

  let didNavigate = false;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await page.goto(url);
      didNavigate = true;
    } catch (error) {
      // eslint-disable-next-line no-await-in-loop
      await delay(retryTimeoutMS);
    }
  }

  return didNavigate;
}

describe('e2e', () => {
  let browser: Browser;
  let page: Page;
  let fixtureRunId = 0;

  async function renderFixture(fixturePath: string) {
    fixtureRunId += 1;
    await page.goto(`${BASE_URL}/e2e-fixtures/${fixturePath}?run=${fixtureRunId}#no-dev`);
    await page.waitForSelector('[data-testid="testcase"]:not([aria-busy="true"])');
  }

  async function settleFixture() {
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resolve();
          });
        });
      });
    });
  }

  async function waitForPopoverTriggerRegistration(testId: string) {
    await page.waitForFunction(
      (currentTestId) => {
        const trigger = document.querySelector(`[data-testid="${currentTestId}"]`);
        if (!(trigger instanceof HTMLElement) || trigger.id === '') {
          return false;
        }

        const root = trigger.closest('[data-base-ui-popover-root]') as
          | (HTMLElement & {
              __baseUiPopoverRuntime?: {
                getTriggerEntry(id: string): { element?: Element | null } | undefined;
              };
            })
          | null;
        const runtime = root?.__baseUiPopoverRuntime;
        return runtime?.getTriggerEntry(trigger.id)?.element === trigger;
      },
      testId,
      { timeout: 1000 },
    );
  }

  beforeAll(async function beforeHook() {
    browser = await chromium.launch({
      args: ['--disable-crash-reporter', '--disable-crashpad', '--font-render-hinting=none'],
      executablePath,
      headless: true,
    });
    page = await browser.newPage();

    await page.route(/./, async (route, request) => {
      if (staticRoot != null && request.url().startsWith(BASE_URL)) {
        await fulfillFromBuild(route, request.url());
        return;
      }

      route.continue();
    });

    const isServerRunning = await attemptGoto(page, `${BASE_URL}#no-dev`);
    if (!isServerRunning) {
      throw new Error(
        `Unable to navigate to ${BASE_URL} after multiple attempts. ` +
          'Did you forget to run `pnpm test:e2e:lit:server` and `pnpm test:e2e:lit:build`, ' +
          'or set `BASE_UI_LOCAL_BUILD_ROOT` to the built fixture directory?',
      );
    }
  }, 20000);

  afterAll(async () => {
    if (browser != null) {
      await browser.close();
    }
  });

  describe('<Field />', () => {
    describe('validationMode=onChange', () => {
      it('<Field.Control />', async () => {
        await renderFixture('field/validate-on-change/Input');

        const valueMissingError = page.getByText('valueMissing error');
        const tooShortError = page.getByText('tooShort error');
        const customError = page.getByText('custom error');

        await expect(valueMissingError).toBeHidden();
        await expect(tooShortError).toBeHidden();
        await expect(customError).toBeHidden();

        const input = page.getByRole('textbox');

        await input.press('a');
        await expect(tooShortError).toBeVisible();

        // clear the input
        await input.press('Backspace');
        await expect(valueMissingError).toBeVisible();

        await input.pressSequentially('abc');
        await expect(input).toHaveValue('abc');
        await expect(valueMissingError).toBeHidden();
        await expect(tooShortError).toBeHidden();
        await expect(customError).toBeHidden();

        await input.press('d');
        await expect(input).toHaveValue('abcd');
        await expect(customError).toBeVisible();

        await input.press('Backspace');
        await expect(input).toHaveValue('abc');
        await expect(valueMissingError).toBeHidden();
        await expect(tooShortError).toBeHidden();
        await expect(customError).toBeHidden();

        await input.press('Backspace');
        await expect(input).toHaveValue('ab');
        await expect(tooShortError).toBeVisible();

        await input.press('Backspace');
        await input.press('Backspace');
        await expect(input).toHaveValue('');
        await expect(valueMissingError).toBeVisible();
      });

      it('<Select />', async () => {
        // options one & three returns errors
        // options two and four are valid
        // the field is required
        await renderFixture('field/validate-on-change/Select');

        const valueMissingError = page.getByText('valueMissing error');
        const errorOne = page.getByText('error one');
        const errorThree = page.getByText('error three');

        await expect(valueMissingError).toBeHidden();
        await expect(errorOne).toBeHidden();
        await expect(errorThree).toBeHidden();

        const trigger = await page.getByRole('combobox');
        await expect(trigger).toHaveText('select');

        const options = page.getByRole('option');

        await trigger.click();
        await options.filter({ hasText: 'one' }).click();
        await expect(trigger).toHaveText('one');
        await expect(errorOne).toBeVisible();

        await trigger.click();
        await options.filter({ hasText: 'two' }).click();
        await expect(trigger).toHaveText('two');
        await expect(valueMissingError).toBeHidden();
        await expect(errorOne).toBeHidden();
        await expect(errorThree).toBeHidden();

        await trigger.click();
        // clear the value
        await options.filter({ hasText: 'select' }).click();
        await expect(trigger).toHaveText('select');
        await expect(valueMissingError).toBeVisible();

        await trigger.click();
        await options.filter({ hasText: 'three' }).click();
        await expect(trigger).toHaveText('three');
        await expect(errorThree).toBeVisible();

        await trigger.click();
        await options.filter({ hasText: 'four' }).click();
        await expect(trigger).toHaveText('four');
        await expect(valueMissingError).toBeHidden();
        await expect(errorOne).toBeHidden();
        await expect(errorThree).toBeHidden();
      });
    });
  });

  describe('button', () => {
    it('supports keyboard activation for custom elements and keeps focusable disabled buttons inert', async () => {
      await renderFixture('button/Keyboard');

      const customButton = page.getByRole('button', { name: 'Custom action' });
      const customCount = page.getByTestId('custom-count');
      const disabledButton = page.getByRole('button', { name: 'Unavailable action' });
      const disabledCount = page.getByTestId('disabled-count');

      await page.keyboard.press('Tab');
      await expect(customButton).toBeFocused();

      await page.keyboard.press('Enter');
      await expect(customCount).toHaveText('1');

      await page.keyboard.press('Space');
      await expect(customCount).toHaveText('2');

      await page.keyboard.press('Tab');
      await expect(disabledButton).toBeFocused();
      await expect(disabledButton).toHaveAttribute('aria-disabled', 'true');

      await page.keyboard.press('Enter');
      await page.keyboard.press('Space');
      await expect(disabledCount).toHaveText('0');
    });
  });

  describe('menubar', () => {
    it('opens sibling menus on hover when another top-level menu is open', async () => {
      await renderFixture('menubar/Interactions');
      await settleFixture();
      await waitForPopoverTriggerRegistration('file-trigger');
      await waitForPopoverTriggerRegistration('edit-trigger');

      const fileTrigger = page.getByTestId('file-trigger');
      const editTrigger = page.getByTestId('edit-trigger');

      await fileTrigger.click();
      await expect(fileTrigger).toHaveAttribute('aria-expanded', 'true', { timeout: 1000 });
      await expect(page.getByTestId('file-menu')).toBeVisible({ timeout: 1000 });

      await editTrigger.evaluate((element) => {
        element.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, cancelable: true }));
        element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, cancelable: true }));
      });

      await expect(editTrigger).toHaveAttribute('aria-expanded', 'true', { timeout: 1000 });
      await expect(page.getByTestId('edit-menu')).toBeVisible({ timeout: 1000 });
      await expect(page.getByTestId('file-menu')).toBeHidden({ timeout: 1000 });
    }, 10000);

    it('supports keyboard navigation between open menus', async () => {
      await renderFixture('menubar/Interactions');
      await settleFixture();
      await waitForPopoverTriggerRegistration('file-trigger');
      await waitForPopoverTriggerRegistration('edit-trigger');

      const fileTrigger = page.getByTestId('file-trigger');
      const editTrigger = page.getByTestId('edit-trigger');

      await fileTrigger.click();
      await expect(fileTrigger).toHaveAttribute('aria-expanded', 'true', { timeout: 1000 });
      await expect(page.getByTestId('file-menu')).toBeVisible({ timeout: 1000 });

      await page.getByTestId('file-item-1').focus();
      await page.keyboard.press('ArrowRight');

      await expect(editTrigger).toHaveAttribute('aria-expanded', 'true', { timeout: 1000 });
      await expect(page.getByTestId('edit-menu')).toBeVisible({ timeout: 1000 });
      await expect(page.getByTestId('file-menu')).toBeHidden({ timeout: 1000 });
    }, 10000);
  });

  describe('accordion', () => {
    it('supports keyboard activation and roving focus', async () => {
      await renderFixture('accordion/Interactions');

      await page.keyboard.press('Tab');
      await expect(page.getByTestId('one')).toBeFocused();

      await page.keyboard.press('Enter');
      await expect(page.getByTestId('one')).toHaveAttribute('aria-expanded', 'true');
      await expect(page.getByText('Base UI is an unstyled component library.')).toBeVisible();

      await page.keyboard.press('ArrowDown');
      await expect(page.getByTestId('two')).toBeFocused();

      await page.keyboard.press(' ');
      await expect(page.getByTestId('two')).toHaveAttribute('aria-expanded', 'true');
      await expect(page.getByText('Read the quick start guide in the docs.')).toBeVisible();
    });
  });

  describe('alert-dialog', () => {
    it('keeps backdrop clicks inert', async () => {
      await renderFixture('alert-dialog/Interactions');

      await page.getByRole('button', { name: 'Discard draft' }).click();

      const popup = page.getByRole('alertdialog');

      await expect(popup).toBeVisible();
      await expect(page.getByTestId('payload')).toHaveText('draft');

      await page.getByTestId('backdrop').click({ force: true });
      await expect(popup).toBeVisible();
    });

    it(
      'renders the second detached trigger payload',
      { timeout: 5000 },
      async () => {
      await renderFixture('alert-dialog/Interactions');

      const popup = page.getByRole('alertdialog');

      await page.getByRole('button', { name: 'Delete project' }).click();
      await expect(popup).toBeVisible();
      await expect(page.getByTestId('payload')).toHaveText('project');
      await expect(page.getByText('Delete project?')).toBeVisible();
      },
    );
  });

  describe('<Menu />', () => {
    describe('<Menu.LinkItem />', () => {
      it('navigates on click', async () => {
        await renderFixture('menu/LinkItemNavigation');

        const trigger = page.getByTestId('menu-trigger');
        await trigger.click();

        const linkOne = page.getByTestId('link-one');
        await linkOne.click();

        await expect(page).toHaveURL(/\/e2e-fixtures\/menu\/PageOne/);
        await expect(page.getByTestId('test-page')).toHaveText('Page one');

        await page.goBack();
        await expect(page.getByTestId('page-heading')).toHaveText('Menu with Link Items');

        await trigger.click();
        const linkTwo = page.getByTestId('link-two');
        await linkTwo.click();

        await expect(page).toHaveURL(/\/e2e-fixtures\/menu\/PageTwo/);
        await expect(page.getByTestId('test-page')).toHaveText('Page two');
      });

      it('navigates on Enter key press', async () => {
        await renderFixture('menu/LinkItemNavigation');

        await page.keyboard.press('Tab');
        await page.keyboard.press('Enter');
        await expect(page.getByTestId('link-one')).toBeFocused();
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');

        await expect(page).toHaveURL(/\/e2e-fixtures\/menu\/PageTwo/);
        await expect(page.getByTestId('test-page')).toHaveText('Page two');
      });

      it('navigates when rendering React Router Link component', async () => {
        await renderFixture('menu/ReactRouterLinkItemNavigation');

        const trigger = page.getByTestId('menu-trigger');
        await trigger.click();

        const linkOne = page.getByTestId('link-one');
        await linkOne.click();

        await expect(page).toHaveURL(/\/e2e-fixtures\/menu\/PageOne/);
        await expect(page.getByTestId('test-page')).toHaveText('Page one');

        await page.goBack();
        await expect(page.getByTestId('page-heading')).toHaveText(
          'Menu with React Router Link Items',
        );

        await trigger.click();
        const linkTwo = page.getByTestId('link-two');
        await linkTwo.click();

        await expect(page).toHaveURL(/\/e2e-fixtures\/menu\/PageTwo/);
        await expect(page.getByTestId('test-page')).toHaveText('Page two');
      });
    });
  });

  describe('collapsible', () => {
    it('supports click and keyboard activation', async () => {
      await renderFixture('collapsible/Interactions');

      const trigger = page.getByRole('button', { name: 'Recovery keys' });

      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
      await expect(page.getByText('alien-bean-pasta')).toBeHidden();

      await trigger.click();
      await expect(trigger).toHaveAttribute('aria-expanded', 'true');
      await expect(page.getByText('alien-bean-pasta')).toBeVisible();

      await trigger.focus();
      await page.keyboard.press('Enter');
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');

      await page.keyboard.press('Space');
      await expect(trigger).toHaveAttribute('aria-expanded', 'true');
      await expect(page.getByText('horse-battery-staple')).toBeVisible();
    });
  });

  describe('radio', () => {
    it('loops focus by default', async () => {
      await renderFixture('Radio');

      await page.keyboard.press('Tab');
      await expect(page.getByTestId('one')).toBeFocused();

      await page.keyboard.press('ArrowRight');
      await expect(page.getByTestId('two')).toBeFocused();

      await page.keyboard.press('ArrowLeft');
      await expect(page.getByTestId('one')).toBeFocused();

      await page.keyboard.press('ArrowLeft');
      await expect(page.getByTestId('three')).toBeFocused();
    });
  });

  describe('switch', () => {
    it('supports label clicks and keyboard activation', async () => {
      await renderFixture('switch/Interactions');

      const switchElement = page.getByRole('switch');
      const label = page.getByTestId('label');
      const status = page.getByRole('status');

      await expect(status).toHaveText('off');

      await label.click();
      await expect(status).toHaveText('on');

      await switchElement.focus();
      await page.keyboard.press('Space');
      await expect(status).toHaveText('off');

      await page.keyboard.press('Enter');
      await expect(status).toHaveText('on');
    });
  });

  describe('checkbox', () => {
    it('supports label clicks and keyboard activation', async () => {
      await renderFixture('checkbox/Interactions');

      const checkbox = page.getByRole('checkbox');
      const label = page.getByTestId('label');
      const status = page.getByRole('status');

      await expect(status).toHaveText('off');

      await label.click();
      await expect(status).toHaveText('on');

      await checkbox.focus();
      await page.keyboard.press('Space');
      await expect(status).toHaveText('off');

      await page.keyboard.press('Enter');
      await expect(status).toHaveText('on');
    });
  });

  describe('checkbox-group', () => {
    it(
      'supports parent mixed state, label clicks, and keyboard activation',
      { timeout: 10000 },
      async () => {
        await renderFixture('checkbox-group/Interactions');

        const parent = page.getByRole('checkbox', { name: 'Apples' });
        const galaLabel = page.getByTestId('gala-label');
        const status = page.getByRole('status');

        await expect(status).toHaveText('none');

        await galaLabel.click();
        await expect(status).toHaveText('gala-apple');
        await expect(parent).toHaveAttribute('aria-checked', 'mixed');

        await parent.press('Space');
        await expect(status).toHaveText('fuji-apple, gala-apple, granny-smith-apple');
        await expect(parent).toHaveAttribute('aria-checked', 'true');

        await parent.press('Enter');
        await expect(status).toHaveText('none');
        await expect(parent).toHaveAttribute('aria-checked', 'false');
      },
    );
  });

  describe('toggle', () => {
    it(
      'supports custom-element keyboard activation and keeps disabled toggles inert',
      { timeout: 10000 },
      async () => {
        await renderFixture('toggle/Interactions');

        const toggle = page.getByRole('button', { exact: true, name: 'Favorite' });
        const pressedState = page.getByTestId('pressed-state');
        const disabledToggle = page.getByRole('button', {
          exact: true,
          name: 'Disabled toggle',
        });
        const disabledCount = page.getByTestId('disabled-count');

        await expect(pressedState).toHaveText('off');

        await toggle.click();
        await expect(pressedState).toHaveText('on');

        await toggle.press('Space');
        await expect(pressedState).toHaveText('off');

        await toggle.press('Enter');
        await expect(pressedState).toHaveText('on');

        await disabledToggle.dispatchEvent('click');
        await expect(disabledToggle).toHaveAttribute('aria-disabled', 'true');
        await expect(disabledCount).toHaveText('0');
      },
    );
  });

  describe('<Radio />', () => {
    it('loops focus by default', async () => {
      await renderFixture('Radio');

      await page.keyboard.press('Tab');
      await expect(page.getByTestId('one')).toBeFocused();

      await page.keyboard.press('ArrowRight');
      await expect(page.getByTestId('two')).toBeFocused();

      await page.keyboard.press('ArrowLeft');
      await expect(page.getByTestId('one')).toBeFocused();

      await page.keyboard.press('ArrowLeft');
      await expect(page.getByTestId('three')).toBeFocused();
    });
  });

  describe('<Slider />', () => {
    it('overlapping thumbs', async () => {
      await renderFixture('slider/Range');

      // mouse down at the center of the lower thumb but the upper thumb
      // is moved due to overlap
      await page.mouse.move(25, 10);
      await page.mouse.down();
      await page.mouse.move(100, 10);
      await page.mouse.up();

      await expect(page.getByRole('status')).toHaveText('25 – 100');
    });

    it('overlapping thumbs at max', async () => {
      await renderFixture('slider/RangeSliderMax');

      // both thumbs are at max with the upper thumb completely covering the
      // lower one; the lower one will be moved by the pointer instead so the
      // slider doesn't get stuck
      await page.mouse.move(100, 10);
      await page.mouse.down();
      await page.mouse.move(50, 10);
      await page.mouse.up();

      await expect(page.getByRole('status')).toHaveText('50 – 100');
    });

    it('inset thumbs', async () => {
      await renderFixture('slider/Inset');
      await expect(page.getByRole('status')).toHaveText('30');

      // click the left inset offset region
      await page.mouse.click(10, 10);
      await expect(page.getByRole('status')).toHaveText('0');
      // click the right inset offset region
      await page.mouse.click(110, 10);
      await expect(page.getByRole('status')).toHaveText('100');
      // drag from the center of the thumb
      await page.mouse.move(110, 10);
      await page.mouse.down();
      await page.mouse.move(90, 10);
      await page.mouse.up();
      await expect(page.getByRole('status')).toHaveText('80');
    });
  });

  describe('<Menu />', () => {
    describe('<Menu.LinkItem />', () => {
      it('navigates on click', async () => {
        await renderFixture('menu/LinkItemNavigation');

        const trigger = page.getByTestId('menu-trigger');
        await trigger.click();

        const linkOne = page.getByTestId('link-one');
        await linkOne.click();

        await expect(page).toHaveURL(/\/e2e-fixtures\/menu\/PageOne/);
        await expect(page.getByTestId('test-page')).toHaveText('Page one');

        await page.goBack();
        await expect(page.getByTestId('page-heading')).toHaveText('Menu with Link Items');

        await trigger.click();
        const linkTwo = page.getByTestId('link-two');
        await linkTwo.click();

        await expect(page).toHaveURL(/\/e2e-fixtures\/menu\/PageTwo/);
        await expect(page.getByTestId('test-page')).toHaveText('Page two');
      });

      it('navigates on Enter key press', async () => {
        await renderFixture('menu/LinkItemNavigation');

        await page.keyboard.press('Tab');
        await page.keyboard.press('Enter');
        await expect(page.getByTestId('link-one')).toBeFocused();
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');

        await expect(page).toHaveURL(/\/e2e-fixtures\/menu\/PageTwo/);
        await expect(page.getByTestId('test-page')).toHaveText('Page two');
      });

      it('navigates when rendering React Router Link component', async () => {
        await renderFixture('menu/ReactRouterLinkItemNavigation');

        const trigger = page.getByTestId('menu-trigger');
        await trigger.click();

        const linkOne = page.getByTestId('link-one');
        await linkOne.click();

        await expect(page).toHaveURL(/\/e2e-fixtures\/menu\/PageOne/);
        await expect(page.getByTestId('test-page')).toHaveText('Page one');

        await page.goBack();
        await expect(page.getByTestId('page-heading')).toHaveText(
          'Menu with React Router Link Items',
        );

        await trigger.click();
        const linkTwo = page.getByTestId('link-two');
        await linkTwo.click();

        await expect(page).toHaveURL(/\/e2e-fixtures\/menu\/PageTwo/);
        await expect(page.getByTestId('test-page')).toHaveText('Page two');
      });
    });
  });
});

async function fulfillFromBuild(route: Parameters<typeof page.route>[1], requestUrl: string) {
  const url = new URL(requestUrl);
  const pathname = decodeURIComponent(url.pathname);
  const relativePath = pathname === '/' ? 'index.html' : pathname.slice(1);
  const filePath = path.join(staticRoot!, relativePath);
  const fallbackPath = path.join(staticRoot!, 'index.html');

  let responsePath = filePath;
  try {
    await fs.access(responsePath);
  } catch {
    responsePath = fallbackPath;
  }

  await route.fulfill({
    body: await fs.readFile(responsePath),
    contentType: getContentType(responsePath),
    status: 200,
  });
}

function getContentType(filePath: string) {
  switch (path.extname(filePath)) {
    case '.css':
      return 'text/css';
    case '.html':
      return 'text/html';
    case '.js':
      return 'text/javascript';
    case '.json':
      return 'application/json';
    case '.png':
      return 'image/png';
    case '.woff2':
      return 'font/woff2';
    default:
      return 'application/octet-stream';
  }
}
