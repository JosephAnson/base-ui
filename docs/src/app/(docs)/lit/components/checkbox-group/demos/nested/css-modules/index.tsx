'use client';
import * as React from 'react';
import { html } from 'lit';
import '@base-ui/lit/checkbox';
import '@base-ui/lit/checkbox-group';
import styles from 'docs/src/app/(docs)/react/components/checkbox-group/demos/nested/css-modules/index.module.css';
import { LitCheckboxGroup } from '../../shared/LitCheckboxGroup';
import { checkIcon, horizontalRuleIcon } from '../../shared/icons';

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

  return (
    <LitCheckboxGroup
      groupProps={{
        'aria-labelledby': id,
        allValues: mainPermissions,
        className: styles.CheckboxGroup,
        onValueChange(nextValue) {
          if (nextValue.includes('manage-users')) {
            setManagementValue(userManagementPermissions);
          } else if (managementValue.length === userManagementPermissions.length) {
            setManagementValue([]);
          }

          setMainValue(nextValue);
        },
        style: { marginLeft: '1rem' },
        value: mainValue,
      }}
    >
      {html`
        <label class=${styles.Item} id=${id} style="margin-left: -1rem;">
          <checkbox-root
            ?parent=${true}
            ?indeterminate=${mainParentIsMixed}
            class=${styles.Checkbox}
          >
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
      `}
    </LitCheckboxGroup>
  );
}
