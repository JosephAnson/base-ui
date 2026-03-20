import * as React from 'react';
import { html } from 'lit';
import { AlertDialog } from '@base-ui/lit/alert-dialog';
import { LitTemplateHost } from '../../../../docs/src/app/(docs)/lit/components/popover/demos/shared/LitTemplateHost';
import baseStyles from '../../../../docs/src/app/(docs)/react/components/alert-dialog/demos/_index.module.css';

export default function AlertDialogStates() {
  const detachedHandle = React.useMemo(() => AlertDialog.createHandle<string>(), []);

  const closedTemplate = React.useCallback(
    () =>
      AlertDialog.Root({
        children: [
          AlertDialog.Trigger({
            className: `${baseStyles.Button} ${baseStyles.DangerButton}`,
            children: 'Discard draft',
          }),
          AlertDialog.Portal({
            children: [
              AlertDialog.Backdrop({
                className: baseStyles.Backdrop,
              }),
              AlertDialog.Popup({
                className: baseStyles.Popup,
                children: [
                  AlertDialog.Title({
                    className: baseStyles.Title,
                    children: 'Discard draft?',
                  }),
                  AlertDialog.Description({
                    className: baseStyles.Description,
                    children: "You can't undo this action.",
                  }),
                  html`<div class=${baseStyles.Actions}>
                    ${AlertDialog.Close({
                      className: baseStyles.Button,
                      children: 'Cancel',
                    })}
                    ${AlertDialog.Close({
                      className: `${baseStyles.Button} ${baseStyles.DangerButton}`,
                      children: 'Discard',
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
      AlertDialog.Root({
        defaultOpen: true,
        children: [
          AlertDialog.Trigger({
            className: `${baseStyles.Button} ${baseStyles.DangerButton}`,
            children: 'Discard draft',
          }),
          AlertDialog.Portal({
            children: [
              AlertDialog.Backdrop({
                className: baseStyles.Backdrop,
              }),
              AlertDialog.Popup({
                className: baseStyles.Popup,
                children: [
                  AlertDialog.Title({
                    className: baseStyles.Title,
                    children: 'Discard draft?',
                  }),
                  AlertDialog.Description({
                    className: baseStyles.Description,
                    children: "You can't undo this action.",
                  }),
                  html`<div class=${baseStyles.Actions}>
                    ${AlertDialog.Close({
                      className: baseStyles.Button,
                      children: 'Cancel',
                    })}
                    ${AlertDialog.Close({
                      className: `${baseStyles.Button} ${baseStyles.DangerButton}`,
                      children: 'Discard',
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

  const detachedTemplate = React.useCallback(
    () => html`
      <div class=${baseStyles.Container}>
        ${AlertDialog.Trigger({
          className: `${baseStyles.Button} ${baseStyles.DangerButton}`,
          handle: detachedHandle,
          id: 'draft',
          payload: 'draft',
          children: 'Discard draft',
        })}
        ${AlertDialog.Trigger({
          className: `${baseStyles.Button} ${baseStyles.DangerButton}`,
          handle: detachedHandle,
          id: 'project',
          payload: 'project',
          children: 'Delete project',
        })}
      </div>
      ${AlertDialog.Root<string>({
        handle: detachedHandle,
        children: ({ payload }) =>
          AlertDialog.Portal({
            children: [
              AlertDialog.Backdrop({
                className: baseStyles.Backdrop,
              }),
              AlertDialog.Popup({
                className: baseStyles.Popup,
                children: [
                  AlertDialog.Title({
                    className: baseStyles.Title,
                    children:
                      payload === 'project' ? 'Delete project?' : 'Discard draft?',
                  }),
                  AlertDialog.Description({
                    className: baseStyles.Description,
                    children:
                      payload === 'project'
                        ? 'Deleting the project is permanent.'
                        : "You can't undo this action.",
                  }),
                  html`<div class=${baseStyles.Actions}>
                    ${AlertDialog.Close({
                      className: baseStyles.Button,
                      children: 'Cancel',
                    })}
                    ${AlertDialog.Close({
                      className: `${baseStyles.Button} ${baseStyles.DangerButton}`,
                      children: payload === 'project' ? 'Delete' : 'Discard',
                    })}
                  </div>`,
                ],
              }),
            ],
          }),
      })}
    `,
    [detachedHandle],
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

      <div style={{ display: 'grid', gap: '12px' }}>
        <span>Detached Triggers</span>
        <LitTemplateHost template={detachedTemplate} />
      </div>
    </div>
  );
}
