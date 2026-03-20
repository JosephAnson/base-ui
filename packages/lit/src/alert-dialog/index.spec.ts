import type {
  AlertDialogBackdrop,
  AlertDialogBackdropProps,
  AlertDialogBackdropState,
  AlertDialogClose,
  AlertDialogCloseProps,
  AlertDialogCloseState,
  AlertDialogDescription,
  AlertDialogDescriptionProps,
  AlertDialogDescriptionState,
  AlertDialogPopup,
  AlertDialogPopupProps,
  AlertDialogPopupState,
  AlertDialogPortal,
  AlertDialogPortalProps,
  AlertDialogPortalState,
  AlertDialogTitle,
  AlertDialogTitleProps,
  AlertDialogTitleState,
  AlertDialogTrigger,
  AlertDialogTriggerProps,
  AlertDialogTriggerState,
  AlertDialogViewport,
  AlertDialogViewportProps,
  AlertDialogViewportState,
} from '@base-ui/lit/alert-dialog';
import { AlertDialog } from '@base-ui/lit/alert-dialog';

const numberHandle = AlertDialog.createHandle<number>();
const constructedNumberHandle = new AlertDialog.Handle<number>();

declare let triggerProps: AlertDialogTriggerProps<number>;
declare let triggerState: AlertDialogTriggerState;
declare let portalProps: AlertDialogPortalProps;
declare let portalState: AlertDialogPortalState;
declare let popupProps: AlertDialogPopupProps;
declare let popupState: AlertDialogPopupState;
declare let backdropProps: AlertDialogBackdropProps;
declare let backdropState: AlertDialogBackdropState;
declare let titleProps: AlertDialogTitleProps;
declare let titleState: AlertDialogTitleState;
declare let descriptionProps: AlertDialogDescriptionProps;
declare let descriptionState: AlertDialogDescriptionState;
declare let closeProps: AlertDialogCloseProps;
declare let closeState: AlertDialogCloseState;
declare let viewportProps: AlertDialogViewportProps;
declare let viewportState: AlertDialogViewportState;

const triggerNamespaceProps: AlertDialogTrigger.Props<number> = triggerProps;
const triggerNamespaceState: AlertDialogTrigger.State = triggerState;
const portalNamespaceProps: AlertDialogPortal.Props = portalProps;
const portalNamespaceState: AlertDialogPortal.State = portalState;
const popupNamespaceProps: AlertDialogPopup.Props = popupProps;
const popupNamespaceState: AlertDialogPopup.State = popupState;
const backdropNamespaceProps: AlertDialogBackdrop.Props = backdropProps;
const backdropNamespaceState: AlertDialogBackdrop.State = backdropState;
const titleNamespaceProps: AlertDialogTitle.Props = titleProps;
const titleNamespaceState: AlertDialogTitle.State = titleState;
const descriptionNamespaceProps: AlertDialogDescription.Props = descriptionProps;
const descriptionNamespaceState: AlertDialogDescription.State = descriptionState;
const closeNamespaceProps: AlertDialogClose.Props = closeProps;
const closeNamespaceState: AlertDialogClose.State = closeState;
const viewportNamespaceProps: AlertDialogViewport.Props = viewportProps;
const viewportNamespaceState: AlertDialogViewport.State = viewportState;

void triggerNamespaceProps;
void triggerNamespaceState;
void portalNamespaceProps;
void portalNamespaceState;
void popupNamespaceProps;
void popupNamespaceState;
void backdropNamespaceProps;
void backdropNamespaceState;
void titleNamespaceProps;
void titleNamespaceState;
void descriptionNamespaceProps;
void descriptionNamespaceState;
void closeNamespaceProps;
void closeNamespaceState;
void viewportNamespaceProps;
void viewportNamespaceState;

AlertDialog.Root<number>({
  handle: numberHandle,
  children: ({ payload }: { payload: number | undefined }) => {
    payload?.toFixed(0);
    // @ts-expect-error
    payload?.trim();
    return undefined as never;
  },
});

AlertDialog.Trigger({
  handle: numberHandle,
  payload: 42,
});

AlertDialog.Trigger({
  handle: numberHandle,
});

AlertDialog.Trigger({
  handle: constructedNumberHandle,
  payload: 42,
});

AlertDialog.Trigger({
  handle: constructedNumberHandle,
});

// @ts-expect-error
AlertDialog.Trigger({
  handle: numberHandle,
  payload: 'invalid',
});

// @ts-expect-error
AlertDialog.Trigger({
  handle: constructedNumberHandle,
  payload: 'invalid',
});

AlertDialog.Root({
  // @ts-expect-error
  modal: false,
});

AlertDialog.Root({
  // @ts-expect-error
  disablePointerDismissal: false,
});

AlertDialog.Popup({
  // @ts-expect-error
  role: 'dialog',
});
