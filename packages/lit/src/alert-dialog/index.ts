import type { TemplateResult } from 'lit';
import {
  Dialog,
  type DialogBackdropState,
  type DialogBackdropProps,
  type DialogCloseState,
  type DialogCloseProps,
  type DialogDescriptionState,
  type DialogDescriptionProps,
  type DialogHandle,
  type DialogPopupState,
  type DialogPopupProps,
  type DialogPortalState,
  type DialogPortalProps,
  type DialogRootActions,
  type DialogRootChangeEventDetails,
  type DialogRootChangeEventReason,
  type DialogRootProps,
  type DialogRootState,
  type DialogTitleState,
  type DialogTitleProps,
  type DialogTriggerState,
  type DialogTriggerProps,
  type DialogViewportState,
  type DialogViewportProps,
} from '../dialog/index.ts';

declare const ALERT_DIALOG_HANDLE_BRAND: unique symbol;
const DIALOG_POPUP_ROLE_PROPERTY = '__baseUiDialogPopupRole';

export interface AlertDialogHandle<Payload = unknown> {
  readonly [ALERT_DIALOG_HANDLE_BRAND]: (payload: Payload) => Payload;
  open(triggerId: string | null): void;
  openWithPayload(payload: Payload): void;
  close(): void;
  readonly isOpen: boolean;
}

export interface AlertDialogRootState extends DialogRootState {}

export type AlertDialogTriggerProps<Payload = unknown> = Omit<
  DialogTriggerProps<Payload>,
  'handle'
> & {
  handle?: AlertDialogHandle<Payload> | undefined;
};

export interface AlertDialogTriggerState extends DialogTriggerState {}

export namespace AlertDialogTrigger {
  export type State = AlertDialogTriggerState;
  export type Props<Payload = unknown> = AlertDialogTriggerProps<Payload>;
}

export interface AlertDialogPortalState extends DialogPortalState {}

export interface AlertDialogPortalProps extends DialogPortalProps {}

export namespace AlertDialogPortal {
  export type State = AlertDialogPortalState;
  export type Props = AlertDialogPortalProps;
}

export interface AlertDialogPopupState extends DialogPopupState {}

export interface AlertDialogPopupProps extends Omit<DialogPopupProps, 'role'> {
  role?: never | undefined;
}

export namespace AlertDialogPopup {
  export type State = AlertDialogPopupState;
  export type Props = AlertDialogPopupProps;
}

export interface AlertDialogBackdropState extends DialogBackdropState {}

export interface AlertDialogBackdropProps extends DialogBackdropProps {}

export namespace AlertDialogBackdrop {
  export type State = AlertDialogBackdropState;
  export type Props = AlertDialogBackdropProps;
}

export interface AlertDialogTitleState extends DialogTitleState {}

export interface AlertDialogTitleProps extends DialogTitleProps {}

export namespace AlertDialogTitle {
  export type State = AlertDialogTitleState;
  export type Props = AlertDialogTitleProps;
}

export interface AlertDialogDescriptionState extends DialogDescriptionState {}

export interface AlertDialogDescriptionProps extends DialogDescriptionProps {}

export namespace AlertDialogDescription {
  export type State = AlertDialogDescriptionState;
  export type Props = AlertDialogDescriptionProps;
}

export interface AlertDialogCloseState extends DialogCloseState {}

export interface AlertDialogCloseProps extends DialogCloseProps {}

export namespace AlertDialogClose {
  export type State = AlertDialogCloseState;
  export type Props = AlertDialogCloseProps;
}

export interface AlertDialogViewportState extends DialogViewportState {}

export interface AlertDialogViewportProps extends DialogViewportProps {}

export namespace AlertDialogViewport {
  export type State = AlertDialogViewportState;
  export type Props = AlertDialogViewportProps;
}

export interface AlertDialogRootProps<Payload = unknown>
  extends Omit<
    DialogRootProps<Payload>,
    'disablePointerDismissal' | 'handle' | 'modal' | 'onOpenChange'
  > {
  handle?: AlertDialogHandle<Payload> | undefined;
  onOpenChange?:
    | ((open: boolean, eventDetails: AlertDialogRootChangeEventDetails) => void)
    | undefined;
}

export type AlertDialogRootActions = DialogRootActions;
export type AlertDialogRootChangeEventReason = DialogRootChangeEventReason;
export type AlertDialogRootChangeEventDetails = DialogRootChangeEventDetails;

export namespace AlertDialogRoot {
  export type State = AlertDialogRootState;
  export type Props<Payload = unknown> = AlertDialogRootProps<Payload>;
  export type Actions = AlertDialogRootActions;
  export type ChangeEventReason = AlertDialogRootChangeEventReason;
  export type ChangeEventDetails = AlertDialogRootChangeEventDetails;
}

interface AlertDialogNamespace {
  Root<Payload = unknown>(props: AlertDialogRootProps<Payload>): TemplateResult;
  Trigger<Payload>(
    props: Omit<AlertDialogTriggerProps<Payload>, 'handle' | 'payload'> & {
      handle: AlertDialogHandle<Payload>;
      payload?: Payload | undefined;
    },
  ): TemplateResult;
  Trigger<Payload = unknown>(
    props: Omit<AlertDialogTriggerProps<Payload>, 'handle' | 'payload'> & {
      handle?: undefined;
      payload?: Payload | undefined;
    },
  ): TemplateResult;
  Trigger<Payload = unknown>(
    props: Omit<AlertDialogTriggerProps<Payload>, 'handle' | 'payload'> & {
      handle?: AlertDialogHandle<Payload> | undefined;
      payload?: Payload | undefined;
    },
  ): TemplateResult;
  Portal(props: AlertDialogPortalProps): TemplateResult;
  Popup(props: AlertDialogPopupProps): TemplateResult;
  Backdrop(props: AlertDialogBackdropProps): TemplateResult;
  Title(props: AlertDialogTitleProps): TemplateResult;
  Description(props: AlertDialogDescriptionProps): TemplateResult;
  Close(props: AlertDialogCloseProps): TemplateResult;
  Viewport(props: AlertDialogViewportProps): TemplateResult;
  createHandle<Payload = unknown>(): AlertDialogHandle<Payload>;
  Handle: new <Payload = unknown>() => AlertDialogHandle<Payload>;
}

function renderAlertDialogRoot<Payload = unknown>(props: AlertDialogRootProps<Payload>) {
  const {
    disablePointerDismissal: _disablePointerDismissal,
    handle,
    modal: _modal,
    onOpenChange,
    ...rootProps
  } = props as AlertDialogRootProps<Payload> & {
    disablePointerDismissal?: unknown;
    modal?: unknown;
  };

  void _disablePointerDismissal;
  void _modal;

  return Dialog.Root<Payload>(
    {
      ...(rootProps as Omit<
        DialogRootProps<Payload>,
        'disablePointerDismissal' | 'handle' | 'modal' | 'onOpenChange'
      >),
      [DIALOG_POPUP_ROLE_PROPERTY]: 'alertdialog',
      disablePointerDismissal: true,
      handle: handle as DialogRootProps<Payload>['handle'],
      modal: true,
      onOpenChange: ((nextOpen, details) => {
        if (!nextOpen && details.isCanceled) {
          return;
        }

        onOpenChange?.(nextOpen, details as AlertDialogRootChangeEventDetails);
      }) as DialogRootProps<Payload>['onOpenChange'],
    } as DialogRootProps<Payload>,
  );
}

function renderAlertDialogTrigger(
  props: Omit<AlertDialogTriggerProps<any>, 'handle'> & {
    handle?: AlertDialogHandle<any> | undefined;
  },
) {
  return Dialog.Trigger<any>({
    ...(props as Omit<DialogTriggerProps<any>, 'handle'>),
    handle: props.handle as DialogTriggerProps<any>['handle'],
  });
}

function renderAlertDialogPopup(props: AlertDialogPopupProps) {
  return Dialog.Popup({
    ...props,
    role: 'alertdialog',
  });
}

function createAlertDialogHandleInstance<Payload = unknown>() {
  const handle = Dialog.createHandle<Payload>() as DialogHandle<Payload> & {
    [DIALOG_POPUP_ROLE_PROPERTY]?: 'alertdialog' | undefined;
  };

  handle[DIALOG_POPUP_ROLE_PROPERTY] = 'alertdialog';
  return handle as unknown as AlertDialogHandle<Payload>;
}

function createAlertDialogHandle<Payload = unknown>() {
  return createAlertDialogHandleInstance<Payload>();
}

class AlertDialogHandleConstructor<Payload = unknown> {
  declare readonly [ALERT_DIALOG_HANDLE_BRAND]: (payload: Payload) => Payload;

  constructor() {
    return createAlertDialogHandleInstance<Payload>();
  }
}

export const AlertDialog: AlertDialogNamespace = {
  Root: renderAlertDialogRoot,
  Trigger: renderAlertDialogTrigger as AlertDialogNamespace['Trigger'],
  Portal: Dialog.Portal,
  Popup: renderAlertDialogPopup,
  Backdrop: Dialog.Backdrop,
  Title: Dialog.Title,
  Description: Dialog.Description,
  Close: Dialog.Close,
  Viewport: Dialog.Viewport,
  createHandle: createAlertDialogHandle,
  Handle: AlertDialogHandleConstructor as AlertDialogNamespace['Handle'],
};
