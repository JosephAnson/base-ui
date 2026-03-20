'use client';
import * as React from 'react';
import { html, svg } from 'lit';
import { Tooltip } from '@base-ui/lit/tooltip';
import { LitTemplateHost } from '../../../popover/demos/shared/LitTemplateHost';

type TriggerConfig = {
  ariaLabel: string;
  className: string;
  icon: 'alert' | 'bold' | 'help' | 'info' | 'italic' | 'underline';
  id?: string | undefined;
  payload?: string | undefined;
};

export interface LitTooltipHeroProps {
  arrowClassName: string;
  buttonClassName: string;
  iconClassName: string;
  panelClassName: string;
  popupClassName: string;
}

export function LitTooltipHero(props: LitTooltipHeroProps) {
  const { arrowClassName, buttonClassName, iconClassName, panelClassName, popupClassName } = props;

  const template = React.useCallback(
    () =>
      Tooltip.Provider({
        children: html`<div class=${panelClassName}>
          ${renderContainedTooltip({
            arrowClassName,
            buttonClassName,
            iconClassName,
            iconName: 'bold',
            label: 'Bold',
            popupClassName,
          })}
          ${renderContainedTooltip({
            arrowClassName,
            buttonClassName,
            iconClassName,
            iconName: 'italic',
            label: 'Italic',
            popupClassName,
          })}
          ${renderContainedTooltip({
            arrowClassName,
            buttonClassName,
            iconClassName,
            iconName: 'underline',
            label: 'Underline',
            popupClassName,
          })}
        </div>`,
      }),
    [arrowClassName, buttonClassName, iconClassName, panelClassName, popupClassName],
  );

  return <LitTemplateHost template={template} />;
}

export interface LitTooltipDetachedSimpleProps {
  arrowClassName: string;
  buttonClassName: string;
  iconClassName?: string | undefined;
  popupClassName: string;
}

export function LitTooltipDetachedSimple(props: LitTooltipDetachedSimpleProps) {
  const { arrowClassName, buttonClassName, iconClassName, popupClassName } = props;
  const handle = React.useMemo(() => Tooltip.createHandle(), []);

  const template = React.useCallback(
    () =>
      Tooltip.Provider({
        children: [
          Tooltip.Trigger({
            className: buttonClassName,
            handle,
            children: iconTemplate('info', 'This is a detached tooltip', iconClassName),
          }),
          Tooltip.Root({
            handle,
            children: Tooltip.Portal({
              children: Tooltip.Positioner({
                sideOffset: 10,
                children: Tooltip.Popup({
                  className: popupClassName,
                  children: [
                    Tooltip.Arrow({
                      className: arrowClassName,
                      children: arrowSvg(),
                    }),
                    'This is a detached tooltip',
                  ],
                }),
              }),
            }),
          }),
        ],
      }),
    [arrowClassName, buttonClassName, handle, iconClassName, popupClassName],
  );

  return <LitTemplateHost template={template} />;
}

export interface LitTooltipDetachedFullProps {
  arrowClassName: string;
  buttonGroupClassName: string;
  iconClassName?: string | undefined;
  popupClassName: string;
  positionerClassName?: string | undefined;
  triggerClassNames: [string, string, string];
  viewportClassName: string;
}

export function LitTooltipDetachedFull(props: LitTooltipDetachedFullProps) {
  const {
    arrowClassName,
    buttonGroupClassName,
    iconClassName,
    popupClassName,
    positionerClassName,
    triggerClassNames,
    viewportClassName,
  } = props;
  const handle = React.useMemo(() => Tooltip.createHandle<string>(), []);

  const template = React.useCallback(
    () =>
      Tooltip.Provider({
        children: [
          html`<div class=${buttonGroupClassName}>
            ${Tooltip.Trigger({
              className: triggerClassNames[0],
              handle,
              payload: 'This is information about the feature',
              children: iconTemplate('info', 'This is information about the feature', iconClassName),
            })}
            ${Tooltip.Trigger({
              className: triggerClassNames[1],
              handle,
              payload: 'Need help?',
              children: iconTemplate('help', 'Need help?', iconClassName),
            })}
            ${Tooltip.Trigger({
              className: triggerClassNames[2],
              handle,
              payload: 'Warning: This action cannot be undone',
              children: iconTemplate(
                'alert',
                'Warning: This action cannot be undone',
                iconClassName,
              ),
            })}
          </div>`,
          Tooltip.Root<string>({
            handle,
            children: ({ payload }) =>
              Tooltip.Portal({
                children: Tooltip.Positioner({
                  className: positionerClassName,
                  sideOffset: 10,
                  children: Tooltip.Popup({
                    className: popupClassName,
                    children: [
                      Tooltip.Arrow({
                        className: arrowClassName,
                        children: arrowSvg(),
                      }),
                      Tooltip.Viewport({
                        className: viewportClassName,
                        children: payload ?? '',
                      }),
                    ],
                  }),
                }),
              }),
          }),
        ],
      }),
    [
      arrowClassName,
      buttonGroupClassName,
      handle,
      iconClassName,
      popupClassName,
      positionerClassName,
      triggerClassNames,
      viewportClassName,
    ],
  );

  return <LitTemplateHost template={template} />;
}

export interface LitTooltipDetachedControlledProps {
  arrowClassName: string;
  containerClassName: string;
  iconClassName?: string | undefined;
  popupClassName: string;
  positionerClassName?: string | undefined;
  programmaticButtonClassName: string;
  triggerGroupClassName: string;
  triggerClassNames: [string, string, string];
}

export function LitTooltipDetachedControlled(props: LitTooltipDetachedControlledProps) {
  const {
    arrowClassName,
    containerClassName,
    iconClassName,
    popupClassName,
    positionerClassName,
    programmaticButtonClassName,
    triggerGroupClassName,
    triggerClassNames,
  } = props;
  const handle = React.useMemo(() => Tooltip.createHandle(), []);
  const [open, setOpen] = React.useState(false);
  const [triggerId, setTriggerId] = React.useState<string | null>(null);

  const template = React.useCallback(
    () =>
      Tooltip.Provider({
        children: [
          html`<div class=${containerClassName}>
            <div class=${triggerGroupClassName}>
              ${renderControlledTrigger({
                ariaLabel: 'Controlled tooltip',
                className: triggerClassNames[0],
                handle,
                iconClassName,
                id: 'trigger-1',
              })}
              ${renderControlledTrigger({
                ariaLabel: 'Controlled tooltip',
                className: triggerClassNames[1],
                handle,
                iconClassName,
                id: 'trigger-2',
              })}
              ${renderControlledTrigger({
                ariaLabel: 'Controlled tooltip',
                className: triggerClassNames[2],
                handle,
                iconClassName,
                id: 'trigger-3',
              })}
            </div>

            <button
              type="button"
              class=${programmaticButtonClassName}
              @click=${() => {
                setTriggerId('trigger-2');
                setOpen(true);
              }}
            >
              Open programmatically
            </button>
          </div>`,
          Tooltip.Root({
            handle,
            open,
            onOpenChange(nextOpen, eventDetails) {
              setOpen(nextOpen);
              setTriggerId(eventDetails.trigger?.id ?? null);
            },
            triggerId,
            children: Tooltip.Portal({
              children: Tooltip.Positioner({
                className: positionerClassName,
                sideOffset: 10,
                children: Tooltip.Popup({
                  className: popupClassName,
                  children: [
                    Tooltip.Arrow({
                      className: arrowClassName,
                      children: arrowSvg(),
                    }),
                    'Controlled tooltip',
                  ],
                }),
              }),
            }),
          }),
        ],
      }),
    [
      arrowClassName,
      containerClassName,
      handle,
      iconClassName,
      open,
      popupClassName,
      positionerClassName,
      programmaticButtonClassName,
      triggerClassNames,
      triggerGroupClassName,
      triggerId,
    ],
  );

  return <LitTemplateHost template={template} />;
}

function renderContainedTooltip(props: {
  arrowClassName: string;
  buttonClassName: string;
  iconClassName: string;
  iconName: TriggerConfig['icon'];
  label: string;
  popupClassName: string;
}) {
  const { arrowClassName, buttonClassName, iconClassName, iconName, label, popupClassName } = props;

  return Tooltip.Root({
    children: [
      Tooltip.Trigger({
        className: buttonClassName,
        children: iconTemplate(iconName, label, iconClassName),
      }),
      Tooltip.Portal({
        children: Tooltip.Positioner({
          sideOffset: 10,
          children: Tooltip.Popup({
            className: popupClassName,
            children: [
              Tooltip.Arrow({
                className: arrowClassName,
                children: arrowSvg(),
              }),
              label,
            ],
          }),
        }),
      }),
    ],
  });
}

function renderControlledTrigger(props: {
  ariaLabel: string;
  className: string;
  handle: ReturnType<typeof Tooltip.createHandle>;
  iconClassName?: string | undefined;
  id: string;
}) {
  const { ariaLabel, className, handle, iconClassName, id } = props;

  return Tooltip.Trigger({
    className,
    handle,
    id,
    children: iconTemplate('info', ariaLabel, iconClassName),
  });
}

function iconTemplate(
  name: TriggerConfig['icon'],
  ariaLabel: string,
  className?: string | undefined,
) {
  switch (name) {
    case 'alert':
      return alertIcon(ariaLabel, className);
    case 'bold':
      return boldIcon(ariaLabel, className);
    case 'help':
      return helpIcon(ariaLabel, className);
    case 'italic':
      return italicIcon(ariaLabel, className);
    case 'underline':
      return underlineIcon(ariaLabel, className);
    case 'info':
    default:
      return infoIcon(ariaLabel, className);
  }
}

function arrowSvg() {
  return svg`<svg width="20" height="10" viewBox="0 0 20 10" fill="none">
    <path
      d="M9.66437 2.60207L4.80758 6.97318C4.07308 7.63423 3.11989 8 2.13172 8H0V10H20V8H18.5349C17.5468 8 16.5936 7.63423 15.8591 6.97318L11.0023 2.60207C10.622 2.2598 10.0447 2.25979 9.66437 2.60207Z"
      class="fill-[canvas]"
    />
    <path
      d="M8.99542 1.85876C9.75604 1.17425 10.9106 1.17422 11.6713 1.85878L16.5281 6.22989C17.0789 6.72568 17.7938 7.00001 18.5349 7.00001L15.89 7L11.0023 2.60207C10.622 2.2598 10.0447 2.2598 9.66436 2.60207L4.77734 7L2.13171 7.00001C2.87284 7.00001 3.58774 6.72568 4.13861 6.22989L8.99542 1.85876Z"
      class="fill-gray-200 dark:fill-none"
    />
    <path
      d="M10.3333 3.34539L5.47654 7.71648C4.55842 8.54279 3.36693 9 2.13172 9H0V8H2.13172C3.11989 8 4.07308 7.63423 4.80758 6.97318L9.66437 2.60207C10.0447 2.25979 10.622 2.2598 11.0023 2.60207L15.8591 6.97318C16.5936 7.63423 17.5468 8 18.5349 8H20V9H18.5349C17.2998 9 16.1083 8.54278 15.1901 7.71648L10.3333 3.34539Z"
      class="dark:fill-gray-300"
    />
  </svg>`;
}

function infoIcon(ariaLabel: string, className?: string | undefined) {
  return svg`<svg
    aria-label=${ariaLabel}
    class=${className ?? ''}
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4" />
    <path d="M12 8h.01" />
  </svg>`;
}

function helpIcon(ariaLabel: string, className?: string | undefined) {
  return svg`<svg
    aria-label=${ariaLabel}
    class=${className ?? ''}
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <path d="M12 17h.01" />
  </svg>`;
}

function alertIcon(ariaLabel: string, className?: string | undefined) {
  return svg`<svg
    aria-label=${ariaLabel}
    class=${className ?? ''}
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </svg>`;
}

function boldIcon(ariaLabel: string, className?: string | undefined) {
  return svg`<svg
    aria-label=${ariaLabel}
    class=${className ?? ''}
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="currentcolor"
  >
    <path d="M3.73353 2.13333C3.4386 2.13333 3.2002 2.37226 3.2002 2.66666C3.2002 2.96106 3.4386 3.2 3.73353 3.2H4.26686V12.8H3.73353C3.4386 12.8 3.2002 13.0389 3.2002 13.3333C3.2002 13.6277 3.4386 13.8667 3.73353 13.8667H9.86686C11.7783 13.8667 13.3335 12.3115 13.3335 10.4C13.3335 8.9968 12.4945 7.78881 11.2929 7.24375C11.8897 6.70615 12.2669 5.93066 12.2669 5.06666C12.2669 3.44906 10.9506 2.13333 9.33353 2.13333H3.73353ZM6.93353 3.2H8.26686C9.29619 3.2 10.1335 4.03733 10.1335 5.06666C10.1335 6.096 9.29619 6.93333 8.26686 6.93333H6.93353V3.2ZM6.93353 8H7.73353H8.26686C9.59006 8 10.6669 9.0768 10.6669 10.4C10.6669 11.7232 9.59006 12.8 8.26686 12.8H6.93353V8Z" />
  </svg>`;
}

function italicIcon(ariaLabel: string, className?: string | undefined) {
  return svg`<svg
    aria-label=${ariaLabel}
    class=${className ?? ''}
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="currentcolor"
  >
    <path d="M8.52599 2.12186C8.48583 2.12267 8.44578 2.1265 8.4062 2.13332H6.93328C6.86261 2.13232 6.79244 2.14538 6.72686 2.17173C6.66127 2.19808 6.60158 2.23721 6.55125 2.28683C6.50092 2.33646 6.46096 2.39559 6.43368 2.46079C6.4064 2.526 6.39235 2.59597 6.39235 2.66665C6.39235 2.73733 6.4064 2.80731 6.43368 2.87251C6.46096 2.93772 6.50092 2.99685 6.55125 3.04647C6.60158 3.0961 6.66127 3.13522 6.72686 3.16157C6.79244 3.18793 6.86261 3.20099 6.93328 3.19999H7.70099L6.69057 12.8H5.86661C5.79594 12.799 5.72577 12.812 5.66019 12.8384C5.59461 12.8648 5.53492 12.9039 5.48459 12.9535C5.43425 13.0031 5.39429 13.0623 5.36701 13.1275C5.33973 13.1927 5.32568 13.2626 5.32568 13.3333C5.32568 13.404 5.33973 13.474 5.36701 13.5392C5.39429 13.6044 5.43425 13.6635 5.48459 13.7131C5.53492 13.7628 5.59461 13.8019 5.66019 13.8282C5.72577 13.8546 5.79594 13.8677 5.86661 13.8667H9.06661C9.13729 13.8677 9.20745 13.8546 9.27304 13.8282C9.33862 13.8019 9.39831 13.7628 9.44864 13.7131C9.49897 13.6635 9.53894 13.6044 9.56622 13.5392C9.5935 13.474 9.60754 13.404 9.60754 13.3333C9.60754 13.2626 9.5935 13.1927 9.56622 13.1275C9.53894 13.0623 9.49897 13.0031 9.44864 12.9535C9.39831 12.9039 9.33862 12.8648 9.27304 12.8384C9.20745 12.812 9.13729 12.799 9.06661 12.8H8.2989L9.30932 3.19999H10.1333C10.204 3.20099 10.2741 3.18793 10.3397 3.16157C10.4053 3.13522 10.465 3.0961 10.5153 3.04647C10.5656 2.99685 10.6056 2.93772 10.6329 2.87251C10.6602 2.80731 10.6742 2.73733 10.6742 2.66665C10.6742 2.59597 10.6602 2.526 10.6329 2.46079C10.6056 2.39559 10.5656 2.33646 10.5153 2.28683C10.465 2.23721 10.4053 2.19808 10.3397 2.17173C10.2741 2.14538 10.204 2.13232 10.1333 2.13332H8.66349C8.61807 2.12555 8.57207 2.12171 8.52599 2.12186Z" />
  </svg>`;
}

function underlineIcon(ariaLabel: string, className?: string | undefined) {
  return svg`<svg
    aria-label=${ariaLabel}
    class=${className ?? ''}
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="currentcolor"
  >
    <path d="M3.73331 2.13332C3.66264 2.13232 3.59247 2.14538 3.52689 2.17173C3.46131 2.19809 3.40161 2.23721 3.35128 2.28684C3.30095 2.33646 3.26099 2.39559 3.23371 2.4608C3.20643 2.526 3.19238 2.59598 3.19238 2.66666C3.19238 2.73734 3.20643 2.80731 3.23371 2.87252C3.26099 2.93772 3.30095 2.99685 3.35128 3.04648C3.40161 3.0961 3.46131 3.13523 3.52689 3.16158C3.59247 3.18793 3.66264 3.20099 3.73331 3.19999V7.99999C3.73331 10.224 5.55144 12.2667 7.99998 12.2667C10.4485 12.2667 12.2666 10.224 12.2666 7.99999V3.19999C12.3373 3.20099 12.4075 3.18793 12.4731 3.16158C12.5386 3.13523 12.5983 3.0961 12.6487 3.04648C12.699 2.99685 12.739 2.93772 12.7662 2.87252C12.7935 2.80731 12.8076 2.73734 12.8076 2.66666C12.8076 2.59598 12.7935 2.526 12.7662 2.4608C12.739 2.39559 12.699 2.33646 12.6487 2.28684C12.5983 2.23721 12.5386 2.19809 12.4731 2.17173C12.4075 2.14538 12.3373 2.13232 12.2666 2.13332H10.1333C10.0626 2.13232 9.99247 2.14538 9.92689 2.17173C9.8613 2.19809 9.80161 2.23721 9.75128 2.28684C9.70095 2.33646 9.66099 2.39559 9.63371 2.4608C9.60643 2.526 9.59238 2.59598 9.59238 2.66666C9.59238 2.73734 9.60643 2.80731 9.63371 2.87252C9.66099 2.93772 9.70095 2.99685 9.75128 3.04648C9.80161 3.0961 9.8613 3.13523 9.92689 3.16158C9.99247 3.18793 10.0626 3.20099 10.1333 3.19999V8.97187C10.1333 10.0855 9.32179 11.0818 8.21352 11.1896C6.94152 11.3138 5.86665 10.3136 5.86665 9.06666V3.19999C5.93732 3.20099 6.00748 3.18793 6.07307 3.16158C6.13865 3.13523 6.19834 3.0961 6.24867 3.04648C6.299 2.99685 6.33897 2.93772 6.36625 2.87252C6.39353 2.80731 6.40757 2.73734 6.40757 2.66666C6.40757 2.59598 6.39353 2.526 6.36625 2.4608C6.33897 2.39559 6.299 2.33646 6.24867 2.28684C6.19834 2.23721 6.13865 2.19809 6.07307 2.17173C6.00748 2.14538 5.93732 2.13232 5.86665 2.13332H3.73331ZM3.73331 13.3333C3.66264 13.3323 3.59247 13.3454 3.52689 13.3717C3.46131 13.3981 3.40161 13.4372 3.35128 13.4868C3.30095 13.5365 3.26099 13.5956 3.23371 13.6608C3.20643 13.726 3.19238 13.796 3.19238 13.8667C3.19238 13.9373 3.20643 14.0073 3.23371 14.0725C3.26099 14.1377 3.30095 14.1969 3.35128 14.2465C3.40161 14.2961 3.46131 14.3352 3.52689 14.3616C3.59247 14.3879 3.66264 14.401 3.73331 14.4H12.2666C12.3373 14.401 12.4075 14.3879 12.4731 14.3616C12.5386 14.3352 12.5983 14.2961 12.6487 14.2465C12.699 14.1969 12.739 14.1377 12.7662 14.0725C12.7935 14.0073 12.8076 13.9373 12.8076 13.8667C12.8076 13.796 12.7935 13.726 12.7662 13.6608C12.739 13.5956 12.699 13.5365 12.6487 13.4868C12.5983 13.4372 12.5386 13.3981 12.4731 13.3717C12.4075 13.3454 12.3373 13.3323 12.2666 13.3333H3.73331Z" />
  </svg>`;
}
