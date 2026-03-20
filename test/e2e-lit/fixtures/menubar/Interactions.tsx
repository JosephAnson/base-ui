import * as React from 'react';
import { Menubar } from '@base-ui/lit/menubar';
import { Menu } from '@base-ui/lit/menu';
import { LitTemplateHost } from 'docs/src/app/(docs)/lit/components/popover/demos/shared/LitTemplateHost';

const triggerStyle = {
  background: 'none',
  border: 0,
  borderRadius: '4px',
  height: '32px',
  padding: '0 12px',
} satisfies React.CSSProperties;

const popupStyle = {
  background: 'white',
  border: '1px solid rgb(209 213 219)',
  borderRadius: '6px',
  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
  padding: '4px 0',
} satisfies React.CSSProperties;

const itemStyle = {
  padding: '8px 16px',
} satisfies React.CSSProperties;

export default function MenubarInteractions() {
  const template = React.useCallback(
    () =>
      Menubar({
        style: {
          alignItems: 'center',
          border: '1px solid rgb(229 231 235)',
          borderRadius: '6px',
          display: 'flex',
          gap: '2px',
          padding: '2px',
          width: 'fit-content',
        },
        children: [
          Menu.Root({
            children: [
              Menu.Trigger({
                'data-testid': 'file-trigger',
                style: triggerStyle,
                children: 'File',
              }),
              Menu.Portal({
                children: Menu.Positioner({
                  align: 'start',
                  side: 'bottom',
                  sideOffset: 4,
                  children: Menu.Popup({
                    'data-testid': 'file-menu',
                    style: popupStyle,
                    children: [
                      Menu.Item({
                        'data-testid': 'file-item-1',
                        style: itemStyle,
                        children: 'Open',
                      }),
                      Menu.SubmenuRoot({
                        children: [
                          Menu.SubmenuTrigger({
                            'data-testid': 'share-trigger',
                            style: itemStyle,
                            children: 'Share',
                          }),
                          Menu.Portal({
                            children: Menu.Positioner({
                              children: Menu.Popup({
                                'data-testid': 'share-menu',
                                style: popupStyle,
                                children: Menu.Item({
                                  'data-testid': 'share-item-1',
                                  style: itemStyle,
                                  children: 'Email',
                                }),
                              }),
                            }),
                          }),
                        ],
                      }),
                    ],
                  }),
                }),
              }),
            ],
          }),
          Menu.Root({
            children: [
              Menu.Trigger({
                'data-testid': 'edit-trigger',
                style: triggerStyle,
                children: 'Edit',
              }),
              Menu.Portal({
                children: Menu.Positioner({
                  align: 'start',
                  side: 'bottom',
                  sideOffset: 4,
                  children: Menu.Popup({
                    'data-testid': 'edit-menu',
                    style: popupStyle,
                    children: Menu.Item({
                      'data-testid': 'edit-item-1',
                      style: itemStyle,
                      children: 'Copy',
                    }),
                  }),
                }),
              }),
            ],
          }),
          Menu.Root({
            children: [
              Menu.Trigger({
                'data-testid': 'view-trigger',
                style: triggerStyle,
                children: 'View',
              }),
              Menu.Portal({
                children: Menu.Positioner({
                  align: 'start',
                  side: 'bottom',
                  sideOffset: 4,
                  children: Menu.Popup({
                    'data-testid': 'view-menu',
                    style: popupStyle,
                    children: Menu.Item({
                      'data-testid': 'view-item-1',
                      style: itemStyle,
                      children: 'Zoom In',
                    }),
                  }),
                }),
              }),
            ],
          }),
        ],
      }),
    [],
  );

  return <LitTemplateHost template={template} />;
}
