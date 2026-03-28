'use client';
import * as React from 'react';
import { html, nothing, render as renderTemplate, svg } from 'lit';
import '@base-ui/lit/checkbox';
import '@base-ui/lit/checkbox-group';
import styles from 'docs/src/app/(docs)/react/components/checkbox-group/demos/nested/css-modules/index.module.css';

const mainPermissions = ['view-dashboard', 'manage-users', 'access-reports'];
const userManagementPermissions = ['create-user', 'edit-user', 'delete-user', 'assign-roles'];

export default function PermissionsForm() {
  const id = React.useId();
  const [mainValue, setMainValue] = React.useState<string[]>([]);
  const [managementValue, setManagementValue] = React.useState<string[]>([]);
  const mainParentIsMixed =
    managementValue.length > 0 && managementValue.length !== userManagementPermissions.length;
  const managementParentIsMixed =
    managementValue.length > 0 && managementValue.length !== userManagementPermissions.length;
  const hostRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(
      html`<checkbox-group
        aria-labelledby=${id}
        .allValues=${mainPermissions}
        class=${styles.CheckboxGroup}
        .onValueChange=${(nextValue: string[]) => {
          if (nextValue.includes('manage-users')) {
            setManagementValue(userManagementPermissions);
          } else if (managementValue.length === userManagementPermissions.length) {
            setManagementValue([]);
          }

          setMainValue(nextValue);
        }}
        style="margin-left: 1rem;"
        .value=${mainValue}
      >
        <label class=${styles.Item} id=${id} style="margin-left: -1rem;">
          <checkbox-root ?parent=${true} ?indeterminate=${mainParentIsMixed} class=${styles.Checkbox}>
            <checkbox-indicator class=${styles.Indicator}>
              ${mainParentIsMixed
                ? horizontalRuleIcon(styles.Icon)
                : checkIcon(styles.Icon)}
            </checkbox-indicator>
          </checkbox-root>
          User Permissions
        </label>

        <label class=${styles.Item}>
          <checkbox-root
            value="view-dashboard"
            class=${styles.Checkbox}
          >
            <checkbox-indicator class=${styles.Indicator}>
              ${checkIcon(styles.Icon)}
            </checkbox-indicator>
          </checkbox-root>
          View Dashboard
        </label>

        <label class=${styles.Item}>
          <checkbox-root
            value="access-reports"
            class=${styles.Checkbox}
          >
            <checkbox-indicator class=${styles.Indicator}>
              ${checkIcon(styles.Icon)}
            </checkbox-indicator>
          </checkbox-root>
          Access Reports
        </label>

        <checkbox-group
          aria-labelledby="manage-users-caption"
          .allValues=${userManagementPermissions}
          class=${styles.CheckboxGroup}
          .onValueChange=${(nextValue: string[]) => {
            if (nextValue.length === userManagementPermissions.length) {
              setMainValue((previous) => Array.from(new Set([...previous, 'manage-users'])));
            } else {
              setMainValue((previous) => previous.filter((v) => v !== 'manage-users'));
            }

            setManagementValue(nextValue);
          }}
          style="margin-left: 1rem;"
          .value=${managementValue}
        >
          <label class=${styles.Item} id="manage-users-caption" style="margin-left: -1rem;">
            <checkbox-root
              ?parent=${true}
              class=${styles.Checkbox}
            >
              <checkbox-indicator class=${styles.Indicator}>
                ${managementParentIsMixed
                  ? horizontalRuleIcon(styles.Icon)
                  : checkIcon(styles.Icon)}
              </checkbox-indicator>
            </checkbox-root>
            Manage Users
          </label>

          <label class=${styles.Item}>
            <checkbox-root
              value="create-user"
              class=${styles.Checkbox}
            >
              <checkbox-indicator class=${styles.Indicator}>
                ${checkIcon(styles.Icon)}
              </checkbox-indicator>
            </checkbox-root>
            Create User
          </label>

          <label class=${styles.Item}>
            <checkbox-root
              value="edit-user"
              class=${styles.Checkbox}
            >
              <checkbox-indicator class=${styles.Indicator}>
                ${checkIcon(styles.Icon)}
              </checkbox-indicator>
            </checkbox-root>
            Edit User
          </label>

          <label class=${styles.Item}>
            <checkbox-root
              value="delete-user"
              class=${styles.Checkbox}
            >
              <checkbox-indicator class=${styles.Indicator}>
                ${checkIcon(styles.Icon)}
              </checkbox-indicator>
            </checkbox-root>
            Delete User
          </label>

          <label class=${styles.Item}>
            <checkbox-root
              value="assign-roles"
              class=${styles.Checkbox}
            >
              <checkbox-indicator class=${styles.Indicator}>
                ${checkIcon(styles.Icon)}
              </checkbox-indicator>
            </checkbox-root>
            Assign Roles
          </label>
        </checkbox-group>
      </checkbox-group>`,
      host,
    );

    return () => {
      renderTemplate(nothing, host);
    };
  }, [id, mainParentIsMixed, mainValue, managementParentIsMixed, managementValue]);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}

function checkIcon(className?: string) {
  return svg`<svg fill="currentcolor" width="10" height="10" viewBox="0 0 10 10" class=${className ?? nothing}>
    <path d="M9.1603 1.12218C9.50684 1.34873 9.60427 1.81354 9.37792 2.16038L5.13603 8.66012C5.01614 8.8438 4.82192 8.96576 4.60451 8.99384C4.3871 9.02194 4.1683 8.95335 4.00574 8.80615L1.24664 6.30769C0.939709 6.02975 0.916013 5.55541 1.19372 5.24822C1.47142 4.94102 1.94536 4.91731 2.2523 5.19524L4.36085 7.10461L8.12299 1.33999C8.34934 0.993152 8.81376 0.895638 9.1603 1.12218Z" />
  </svg>`;
}

function horizontalRuleIcon(className?: string) {
  return svg`<svg
    width="10"
    height="10"
    viewBox="0 0 24 24"
    fill="currentcolor"
    xmlns="http://www.w3.org/2000/svg"
    class=${className ?? nothing}
  >
    <line
      x1="3"
      y1="12"
      x2="21"
      y2="12"
      stroke="currentColor"
      stroke-width="3"
      stroke-linecap="round"
    />
  </svg>`;
}
