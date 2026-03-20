import * as React from 'react';
import { html, nothing, render as renderTemplate } from 'lit';
import { useIsoLayoutEffect } from '@base-ui/utils/useIsoLayoutEffect';
import { AlertDialog } from '@base-ui/lit/alert-dialog';
import styles from 'docs/src/app/(docs)/react/components/alert-dialog/demos/_index.module.css';

const alertHandle = AlertDialog.createHandle<string>();

export default function AlertDialogInteractions() {
  const hostRef = React.useRef<HTMLDivElement | null>(null);

  useIsoLayoutEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(
      html`<div class=${styles.Container}>
          ${AlertDialog.Trigger({
            className: `${styles.Button} ${styles.DangerButton}`,
            handle: alertHandle,
            id: 'draft',
            payload: 'draft',
            children: 'Discard draft',
          })}
          ${AlertDialog.Trigger({
            className: `${styles.Button} ${styles.DangerButton}`,
            handle: alertHandle,
            id: 'project',
            payload: 'project',
            children: 'Delete project',
          })}
        </div>
        ${AlertDialog.Root<string>({
          handle: alertHandle,
          children: ({ payload }: { payload: string | undefined }) =>
            AlertDialog.Portal({
              children: [
                AlertDialog.Backdrop({
                  className: styles.Backdrop,
                  'data-testid': 'backdrop',
                }),
                AlertDialog.Popup({
                  className: styles.Popup,
                  'data-testid': 'popup',
                  children: [
                    AlertDialog.Title({
                      className: styles.Title,
                      children:
                        payload === 'project' ? 'Delete project?' : 'Discard draft?',
                    }),
                    AlertDialog.Description({
                      className: styles.Description,
                      children:
                        payload === 'project'
                          ? 'Deleting the project is permanent.'
                          : "You can't undo this action.",
                    }),
                    html`<div class=${styles.Actions}>
                      <div data-testid="payload">${payload ?? 'empty'}</div>
                      ${AlertDialog.Close({
                        className: styles.Button,
                        children: 'Cancel',
                      })}
                      ${AlertDialog.Close({
                        className: `${styles.Button} ${styles.DangerButton}`,
                        children: payload === 'project' ? 'Delete' : 'Discard',
                      })}
                    </div>`,
                  ],
                }),
              ],
            }),
        })}`,
      host,
    );

    return () => {
      renderTemplate(nothing, host);
    };
  }, []);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}
