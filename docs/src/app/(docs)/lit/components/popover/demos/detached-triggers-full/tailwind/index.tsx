'use client';
import * as React from 'react';
import { html, type TemplateResult, nothing, render as renderTemplate, svg } from 'lit';
import '@base-ui/lit/avatar';
import { createPopoverHandle } from '@base-ui/lit/popover';

const demoPopover = createPopoverHandle<() => TemplateResult>();

/**
 * Replaces un-upgraded custom elements with fresh `document.createElement`
 * versions. Works around a browser bug where `document.importNode` on Lit
 * template content intermittently fails to upgrade custom elements when the
 * target container has been moved to a different DOM position by a portal.
 */
function ensureCustomElementUpgrade(root: Element) {
  const toReplace: [Element, Element][] = [];
  root.querySelectorAll('*').forEach((el) => {
    if (
      el.localName.includes('-') &&
      customElements.get(el.localName) &&
      !el.matches(':defined')
    ) {
      const fresh = document.createElement(el.localName);
      for (const attr of Array.from(el.attributes)) {
        fresh.setAttribute(attr.name, attr.value);
      }
      toReplace.push([el, fresh]);
    }
  });
  // Replace bottom-up so children are moved before parents
  for (const [old, fresh] of toReplace.reverse()) {
    while (old.firstChild) {
      fresh.appendChild(old.firstChild);
    }
    old.replaceWith(fresh);
  }
}

export default function PopoverDetachedTriggersFullDemo() {
  const hostRef = React.useRef<HTMLDivElement | null>(null);

  const doRender = React.useCallback(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }

    const payload = demoPopover.activePayload;

    renderTemplate(
      html`
        <div class="flex gap-2">
          <popover-trigger
            class="
              box-border flex size-10 items-center justify-center rounded-md border border-gray-200
              bg-gray-50 text-base font-normal text-gray-900 select-none hover:bg-gray-100
              focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-blue-600
              active:bg-gray-100 data-popup-open:bg-gray-100
            "
            .handle=${demoPopover}
            .payload=${notificationsPanel}
          >
            ${bellIcon('Notifications')}
          </popover-trigger>

          <popover-trigger
            class="
              box-border flex size-10 items-center justify-center rounded-md border border-gray-200
              bg-gray-50 text-base font-normal text-gray-900 select-none hover:bg-gray-100
              focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-blue-600
              active:bg-gray-100 data-popup-open:bg-gray-100
            "
            .handle=${demoPopover}
            .payload=${activityPanel}
          >
            ${listIcon('Activity')}
          </popover-trigger>

          <popover-trigger
            class="
              box-border flex size-10 items-center justify-center rounded-md border border-gray-200
              bg-gray-50 text-base font-normal text-gray-900 select-none hover:bg-gray-100
              focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-blue-600
              active:bg-gray-100 data-popup-open:bg-gray-100
            "
            .handle=${demoPopover}
            .payload=${profilePanel}
          >
            ${userIcon('Profile')}
          </popover-trigger>

          <popover-root .handle=${demoPopover}>
            <popover-portal>
              <popover-positioner
                class="
                  h-(--positioner-height) w-(--positioner-width) max-w-(--available-width)
                  transition-[top,left,right,bottom,transform] duration-[0.35s]
                  ease-[cubic-bezier(0.22,1,0.36,1)] data-instant:transition-none
                "
                .sideOffset=${8}
              >
                <popover-popup
                  class="
                    relative h-(--popup-height,auto) w-(--popup-width,auto) max-w-[500px]
                    origin-(--transform-origin) rounded-lg bg-[canvas] text-gray-900 shadow-lg
                    shadow-gray-200 outline-1 outline-gray-200
                    transition-[width,height,opacity,scale] duration-[0.35s]
                    ease-[cubic-bezier(0.22,1,0.36,1)] data-ending-style:scale-90
                    data-ending-style:opacity-0 data-instant:transition-none
                    data-starting-style:scale-90 data-starting-style:opacity-0
                    dark:shadow-none dark:-outline-offset-1 dark:outline-gray-300
                  "
                >
                  <popover-arrow
                    class="
                      flex transition-[left] duration-[0.35s] ease-[cubic-bezier(0.22,1,0.36,1)]
                      data-[side=bottom]:top-[-8px] data-[side=left]:right-[-13px]
                      data-[side=left]:rotate-90 data-[side=right]:left-[-13px]
                      data-[side=right]:-rotate-90 data-[side=top]:bottom-[-8px]
                      data-[side=top]:rotate-180
                    "
                  >
                    ${arrowSvg()}
                  </popover-arrow>

                  <popover-viewport
                    class="
                      relative h-full w-full overflow-clip p-[1rem_1.5rem]
                      [&_[data-current]]:w-[calc(var(--popup-width)-3rem)]
                      [&_[data-current]]:translate-x-0 [&_[data-current]]:opacity-100
                      [&_[data-current]]:transition-[translate,opacity]
                      [&_[data-current]]:duration-[350ms,175ms]
                      [&_[data-current]]:ease-[cubic-bezier(0.22,1,0.36,1)]
                      data-[activation-direction~='left']:[&_[data-current][data-starting-style]]:-translate-x-1/2
                      data-[activation-direction~='left']:[&_[data-current][data-starting-style]]:opacity-0
                      data-[activation-direction~='right']:[&_[data-current][data-starting-style]]:translate-x-1/2
                      data-[activation-direction~='right']:[&_[data-current][data-starting-style]]:opacity-0
                      [&_[data-previous]]:w-[calc(var(--popup-width)-3rem)]
                      [&_[data-previous]]:translate-x-0 [&_[data-previous]]:opacity-100
                      [&_[data-previous]]:transition-[translate,opacity]
                      [&_[data-previous]]:duration-[350ms,175ms]
                      [&_[data-previous]]:ease-[cubic-bezier(0.22,1,0.36,1)]
                      data-[activation-direction~='left']:[&_[data-previous][data-ending-style]]:translate-x-1/2
                      data-[activation-direction~='left']:[&_[data-previous][data-ending-style]]:opacity-0
                      data-[activation-direction~='right']:[&_[data-previous][data-ending-style]]:-translate-x-1/2
                      data-[activation-direction~='right']:[&_[data-previous][data-ending-style]]:opacity-0
                    "
                  >
                    ${payload ? payload() : nothing}
                  </popover-viewport>
                </popover-popup>
              </popover-positioner>
            </popover-portal>
          </popover-root>
        </div>
      `,
      host,
    );

    // Fix un-upgraded custom elements inside the portal-moved viewport.
    // Must run synchronously after renderTemplate but before MutationObserver
    // microtasks fire, so the viewport's transition logic measures upgraded
    // elements with correct dimensions.
    const portalContainers = document.querySelectorAll('[data-base-ui-popover-portal]');
    for (const portal of portalContainers) {
      const viewport = portal.querySelector('popover-viewport');
      if (viewport) {
        ensureCustomElementUpgrade(viewport);
      }
    }
  }, []);

  React.useEffect(() => {
    doRender();
    const unsubscribe = demoPopover.subscribe(doRender);
    return () => {
      unsubscribe();
      if (hostRef.current) renderTemplate(nothing, hostRef.current);
    };
  }, [doRender]);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}

function notificationsPanel(): TemplateResult {
  return html`
    <popover-title class="m-0 text-base font-bold">Notifications</popover-title>
    <popover-description class="m-0 text-base text-gray-600">
      You are all caught up. Good job!
    </popover-description>
  `;
}

function activityPanel(): TemplateResult {
  return html`
    <popover-title class="m-0 text-base font-bold">Activity</popover-title>
    <popover-description class="m-0 text-base text-gray-600">
      Nothing interesting happened recently.
    </popover-description>
  `;
}

function profilePanel(): TemplateResult {
  return html`
    <div class="-mx-2 grid grid-cols-[auto_auto] gap-x-4">
      <popover-title
        class="col-start-2 col-end-3 row-start-1 row-end-2 m-0 text-base font-bold"
      >
        Jason Eventon
      </popover-title>
      <avatar-root
        class="
          col-start-1 col-end-2 row-start-1 row-end-3 inline-flex h-12 w-12
          items-center justify-center overflow-hidden rounded-full bg-gray-100
          align-middle text-base leading-none font-bold text-gray-900 select-none
        "
      >
        <avatar-image
          src="https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?w=128&h=128&dpr=2&q=80"
          width="48"
          height="48"
          alt="Jason Eventon"
          class="h-full w-full object-cover"
        ></avatar-image>
      </avatar-root>
      <span class="col-start-2 col-end-3 row-start-2 row-end-3 text-sm text-gray-600">
        Pro plan
      </span>
      <div
        class="col-start-1 col-end-3 row-start-3 row-end-4 mt-2 flex flex-col gap-2 border-t border-gray-200 pt-2 text-sm"
      >
        <a href="#" class="text-gray-900 no-underline hover:underline">Profile settings</a>
        <a href="#" class="text-gray-900 no-underline hover:underline">Log out</a>
      </div>
    </div>
  `;
}

function arrowSvg() {
  return svg`
    <svg width="20" height="10" viewBox="0 0 20 10" fill="none">
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
    </svg>
  `;
}

function bellIcon(ariaLabel: string) {
  return svg`
    <svg aria-label=${ariaLabel} class="size-5" fill="currentcolor" width="20" height="20" viewBox="0 0 16 16">
      <path d="M 8 1 C 7.453125 1 7 1.453125 7 2 L 7 3.140625 C 5.28125 3.589844 4 5.144531 4 7 L 4 10.984375 C 4 10.984375 3.984375 11.261719 3.851563 11.519531 C 3.71875 11.78125 3.558594 12 3 12 L 3 13 L 13 13 L 13 12 C 12.40625 12 12.253906 11.78125 12.128906 11.53125 C 12.003906 11.277344 12 11.003906 12 11.003906 L 12 7 C 12 5.144531 10.71875 3.589844 9 3.140625 L 9 2 C 9 1.453125 8.546875 1 8 1 Z M 8 13 C 7.449219 13 7 13.449219 7 14 C 7 14.550781 7.449219 15 8 15 C 8.550781 15 9 14.550781 9 14 C 9 13.449219 8.550781 13 8 13 Z M 8 4 C 9.664063 4 11 5.335938 11 7 L 11 10.996094 C 11 10.996094 10.988281 11.472656 11.234375 11.96875 C 11.238281 11.980469 11.246094 11.988281 11.25 12 L 4.726563 12 C 4.730469 11.992188 4.738281 11.984375 4.742188 11.980469 C 4.992188 11.488281 5 11.015625 5 11.015625 L 5 7 C 5 5.335938 6.335938 4 8 4 Z" />
    </svg>
  `;
}

function userIcon(ariaLabel: string) {
  return svg`
    <svg aria-label=${ariaLabel} class="size-5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 20a6 6 0 0 0-12 0" />
      <circle cx="12" cy="10" r="4" />
      <circle cx="12" cy="12" r="10" />
    </svg>
  `;
}

function listIcon(ariaLabel: string) {
  return svg`
    <svg aria-label=${ariaLabel} class="size-5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 5h.01" />
      <path d="M3 12h.01" />
      <path d="M3 19h.01" />
      <path d="M8 5h13" />
      <path d="M8 12h13" />
      <path d="M8 19h13" />
    </svg>
  `;
}
