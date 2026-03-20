import * as React from 'react';
import { html } from 'lit';
import { Dialog } from '@base-ui/lit/dialog';
import { LitTemplateHost } from '../../../../docs/src/app/(docs)/lit/components/popover/demos/shared/LitTemplateHost';
import baseStyles from '../../../../docs/src/app/(docs)/react/components/dialog/demos/_index.module.css';

export default function DialogStates() {
  const closedTemplate = React.useCallback(
    () =>
      Dialog.Root({
        children: [
          Dialog.Trigger({
            className: baseStyles.Button,
            children: 'View notifications',
          }),
          Dialog.Portal({
            children: [
              Dialog.Backdrop({
                className: baseStyles.Backdrop,
              }),
              Dialog.Popup({
                className: baseStyles.Popup,
                children: [
                  Dialog.Title({
                    className: baseStyles.Title,
                    children: 'Notifications',
                  }),
                  Dialog.Description({
                    className: baseStyles.Description,
                    children: 'You are all caught up. Good job!',
                  }),
                  html`<div class=${baseStyles.Actions}>
                    ${Dialog.Close({
                      className: baseStyles.Button,
                      children: 'Close',
                    })}
                  </div>`,
                ],
              }),
            ],
          }),
        ],
      }),
    [],
  );

  const openTemplate = React.useCallback(
    () =>
      Dialog.Root({
        defaultOpen: true,
        children: [
          Dialog.Trigger({
            className: baseStyles.Button,
            children: 'View notifications',
          }),
          Dialog.Portal({
            children: [
              Dialog.Backdrop({
                className: baseStyles.Backdrop,
              }),
              Dialog.Popup({
                className: baseStyles.Popup,
                children: [
                  Dialog.Title({
                    className: baseStyles.Title,
                    children: 'Notifications',
                  }),
                  Dialog.Description({
                    className: baseStyles.Description,
                    children: 'You are all caught up. Good job!',
                  }),
                  html`<div class=${baseStyles.Actions}>
                    ${Dialog.Close({
                      className: baseStyles.Button,
                      children: 'Close',
                    })}
                  </div>`,
                ],
              }),
            ],
          }),
        ],
      }),
    [],
  );

  return (
    <div
      data-testid="screenshot-target"
      style={{
        display: 'grid',
        gap: '24px',
        justifyItems: 'start',
      }}
    >
      <div style={{ display: 'grid', gap: '12px' }}>
        <span>Closed</span>
        <LitTemplateHost template={closedTemplate} />
      </div>

      <div style={{ display: 'grid', gap: '12px' }}>
        <span>Open</span>
        <LitTemplateHost template={openTemplate} />
      </div>
    </div>
  );
}
