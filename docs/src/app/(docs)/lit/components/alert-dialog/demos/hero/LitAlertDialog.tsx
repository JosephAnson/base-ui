'use client';
import * as React from 'react';
import { html } from 'lit';
import '@base-ui/lit/alert-dialog';
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
      html`<alert-dialog-root>
        <alert-dialog-trigger class=${[buttonClassName, dangerButtonClassName].filter(Boolean).join(' ')}>
          Discard draft
        </alert-dialog-trigger>
        <alert-dialog-portal>
          <alert-dialog-backdrop class=${backdropClassName}></alert-dialog-backdrop>
          <alert-dialog-popup class=${popupClassName}>
            <alert-dialog-title class=${titleClassName}>Discard draft?</alert-dialog-title>
            <alert-dialog-description class=${descriptionClassName}>
              You can't undo this action.
            </alert-dialog-description>
            <div class=${actionsClassName}>
              <alert-dialog-close class=${buttonClassName}>Cancel</alert-dialog-close>
              <alert-dialog-close class=${[buttonClassName, dangerButtonClassName].filter(Boolean).join(' ')}>
                Discard
              </alert-dialog-close>
            </div>
          </alert-dialog-popup>
        </alert-dialog-portal>
      </alert-dialog-root>`,
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
