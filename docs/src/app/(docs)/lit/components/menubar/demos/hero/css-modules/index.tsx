'use client';
import * as React from 'react';
import { svg } from 'lit';
import { Menubar } from '@base-ui/lit/menubar';
import { Menu } from '@base-ui/lit/menu';
import { LitTemplateHost } from '../../../../popover/demos/shared/LitTemplateHost';
import styles from '../../../../../../react/components/menubar/demos/hero/css-modules/index.module.css';

export default function HeroDemo() {
  const template = React.useCallback(
    () =>
      Menubar({
        className: styles.Menubar,
        children: [
          Menu.Root({
            children: [
              Menu.Trigger({
                className: styles.MenuTrigger,
                children: 'File',
              }),
              Menu.Portal({
                children: Menu.Positioner({
                  className: styles.MenuPositioner,
                  sideOffset: 6,
                  alignOffset: -2,
                  children: Menu.Popup({
                    className: styles.MenuPopup,
                    children: [
                      Menu.Item({ className: styles.MenuItem, children: 'New' }),
                      Menu.Item({ className: styles.MenuItem, children: 'Open' }),
                      Menu.Item({ className: styles.MenuItem, children: 'Save' }),
                      Menu.SubmenuRoot({
                        children: [
                          Menu.SubmenuTrigger({
                            className: styles.MenuItem,
                            children: ['Export', chevronRightIcon()],
                          }),
                          Menu.Portal({
                            children: Menu.Positioner({
                              alignOffset: -4,
                              children: Menu.Popup({
                                className: styles.MenuPopup,
                                children: [
                                  Menu.Item({ className: styles.MenuItem, children: 'PDF' }),
                                  Menu.Item({ className: styles.MenuItem, children: 'PNG' }),
                                  Menu.Item({ className: styles.MenuItem, children: 'SVG' }),
                                ],
                              }),
                            }),
                          }),
                        ],
                      }),
                      Menu.Separator({
                        className: styles.MenuSeparator,
                      }),
                      Menu.Item({ className: styles.MenuItem, children: 'Print' }),
                    ],
                  }),
                }),
              }),
            ],
          }),
          Menu.Root({
            children: [
              Menu.Trigger({
                className: styles.MenuTrigger,
                children: 'Edit',
              }),
              Menu.Portal({
                children: Menu.Positioner({
                  className: styles.MenuPositioner,
                  sideOffset: 6,
                  children: Menu.Popup({
                    className: styles.MenuPopup,
                    children: [
                      Menu.Item({ className: styles.MenuItem, children: 'Cut' }),
                      Menu.Item({ className: styles.MenuItem, children: 'Copy' }),
                      Menu.Item({ className: styles.MenuItem, children: 'Paste' }),
                    ],
                  }),
                }),
              }),
            ],
          }),
          Menu.Root({
            children: [
              Menu.Trigger({
                className: styles.MenuTrigger,
                children: 'View',
              }),
              Menu.Portal({
                children: Menu.Positioner({
                  className: styles.MenuPositioner,
                  sideOffset: 6,
                  children: Menu.Popup({
                    className: styles.MenuPopup,
                    children: [
                      Menu.Item({ className: styles.MenuItem, children: 'Zoom In' }),
                      Menu.Item({ className: styles.MenuItem, children: 'Zoom Out' }),
                      Menu.SubmenuRoot({
                        children: [
                          Menu.SubmenuTrigger({
                            className: styles.MenuItem,
                            children: ['Layout', chevronRightIcon()],
                          }),
                          Menu.Portal({
                            children: Menu.Positioner({
                              alignOffset: -4,
                              children: Menu.Popup({
                                className: styles.MenuPopup,
                                children: [
                                  Menu.Item({
                                    className: styles.MenuItem,
                                    children: 'Single Page',
                                  }),
                                  Menu.Item({
                                    className: styles.MenuItem,
                                    children: 'Two Pages',
                                  }),
                                  Menu.Item({
                                    className: styles.MenuItem,
                                    children: 'Continuous',
                                  }),
                                ],
                              }),
                            }),
                          }),
                        ],
                      }),
                      Menu.Separator({
                        className: styles.MenuSeparator,
                      }),
                      Menu.Item({ className: styles.MenuItem, children: 'Full Screen' }),
                    ],
                  }),
                }),
              }),
            ],
          }),
          Menu.Root({
            disabled: true,
            children: Menu.Trigger({
              className: styles.MenuTrigger,
              children: 'Help',
            }),
          }),
        ],
      }),
    [],
  );

  return <LitTemplateHost template={template} />;
}

function chevronRightIcon() {
  return svg`<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M6 12L10 8L6 4"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>`;
}
