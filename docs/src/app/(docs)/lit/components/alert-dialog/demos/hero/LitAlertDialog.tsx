'use client';
import * as React from 'react';
import { html } from 'lit';
import { AlertDialog } from '@base-ui/lit/alert-dialog';
import { LitTemplateHost } from '../../../popover/demos/shared/LitTemplateHost';

export interface LitAlertDialogProps {
  actionsClassName: string;
  backdropClassName: string;
  buttonClassName: string;
  dangerButtonClassName?: string | undefined;
  descriptionClassName: string;
  popupClassName: string;
  titleClassName: string;
}

export function LitAlertDialog(props: LitAlertDialogProps) {
  const {
    actionsClassName,
    backdropClassName,
    buttonClassName,
    dangerButtonClassName,
    descriptionClassName,
    popupClassName,
    titleClassName,
  } = props;

  const template = React.useCallback(
    () =>
      AlertDialog.Root({
        children: [
          AlertDialog.Trigger({
            className: [buttonClassName, dangerButtonClassName].filter(Boolean).join(' '),
            children: 'Discard draft',
          }),
          AlertDialog.Portal({
            children: [
              AlertDialog.Backdrop({
                className: backdropClassName,
              }),
              AlertDialog.Popup({
                className: popupClassName,
                children: [
                  AlertDialog.Title({
                    className: titleClassName,
                    children: 'Discard draft?',
                  }),
                  AlertDialog.Description({
                    className: descriptionClassName,
                    children: "You can’t undo this action.",
                  }),
                  html`<div class=${actionsClassName}>
                    ${AlertDialog.Close({
                      className: buttonClassName,
                      children: 'Cancel',
                    })}
                    ${AlertDialog.Close({
                      className: [buttonClassName, dangerButtonClassName].filter(Boolean).join(' '),
                      children: 'Discard',
                    })}
                  </div>`,
                ],
              }),
            ],
          }),
        ],
      }),
    [
      actionsClassName,
      backdropClassName,
      buttonClassName,
      dangerButtonClassName,
      descriptionClassName,
      popupClassName,
      titleClassName,
    ],
  );

  return <LitTemplateHost template={template} />;
}
