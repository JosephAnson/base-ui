import * as React from 'react';
import { Menu } from '@base-ui/lit/menu';
import { LitTemplateHost } from 'docs/src/app/(docs)/lit/components/popover/demos/shared/LitTemplateHost';
import styles from './LinkItemNavigation.module.css';

export default function ReactRouterLinkItemNavigation() {
  const template = React.useCallback(
    () =>
      Menu.Root({
        children: [
          Menu.Trigger({
            'data-testid': 'menu-trigger',
            className: styles.Trigger,
            children: 'Open Menu',
          }),
          Menu.Portal({
            children: Menu.Positioner({
              children: Menu.Popup({
                className: styles.Popup,
                children: [
                  Menu.LinkItem({
                    'data-testid': 'link-one',
                    href: '/e2e-fixtures/menu/PageOne',
                    className: styles.LinkItem,
                    children: 'Page one',
                  }),
                  Menu.LinkItem({
                    'data-testid': 'link-two',
                    href: '/e2e-fixtures/menu/PageTwo',
                    className: styles.LinkItem,
                    children: 'Page two',
                  }),
                ],
              }),
            }),
          }),
        ],
      }),
    [],
  );

  return (
    <div className={styles.Page}>
      <h1 data-testid="page-heading" className={styles.Heading}>
        Menu with React Router Link Items
      </h1>
      <LitTemplateHost template={template} />
    </div>
  );
}
