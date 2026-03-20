'use client';
import * as React from 'react';
import { html } from 'lit';
import { Checkbox } from '@base-ui/lit/checkbox';
import { CheckboxGroup } from '@base-ui/lit/checkbox-group';
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
          ${Checkbox.Root({
            parent: true,
            indeterminate: mainParentIsMixed,
            className: styles.Checkbox,
            children: Checkbox.Indicator({
              className: styles.Indicator,
              children: mainParentIsMixed
                ? horizontalRuleIcon(styles.Icon)
                : checkIcon(styles.Icon),
            }),
          })}
          User Permissions
        </label>

        <label class=${styles.Item}>
          ${Checkbox.Root({
            value: 'view-dashboard',
            className: styles.Checkbox,
            children: Checkbox.Indicator({
              className: styles.Indicator,
              children: checkIcon(styles.Icon),
            }),
          })}
          View Dashboard
        </label>

        <label class=${styles.Item}>
          ${Checkbox.Root({
            value: 'access-reports',
            className: styles.Checkbox,
            children: Checkbox.Indicator({
              className: styles.Indicator,
              children: checkIcon(styles.Icon),
            }),
          })}
          Access Reports
        </label>

        ${CheckboxGroup({
          'aria-labelledby': 'manage-users-caption',
          allValues: userManagementPermissions,
          className: styles.CheckboxGroup,
          onValueChange(nextValue) {
            if (nextValue.length === userManagementPermissions.length) {
              setMainValue((previous) => Array.from(new Set([...previous, 'manage-users'])));
            } else {
              setMainValue((previous) => previous.filter((value) => value !== 'manage-users'));
            }

            setManagementValue(nextValue);
          },
          style: { marginLeft: '1rem' },
          value: managementValue,
          children: html`
            <label class=${styles.Item} id="manage-users-caption" style="margin-left: -1rem;">
              ${Checkbox.Root({
                parent: true,
                className: styles.Checkbox,
                children: Checkbox.Indicator({
                  className: styles.Indicator,
                  children: managementParentIsMixed
                    ? horizontalRuleIcon(styles.Icon)
                    : checkIcon(styles.Icon),
                }),
              })}
              Manage Users
            </label>

            <label class=${styles.Item}>
              ${Checkbox.Root({
                value: 'create-user',
                className: styles.Checkbox,
                children: Checkbox.Indicator({
                  className: styles.Indicator,
                  children: checkIcon(styles.Icon),
                }),
              })}
              Create User
            </label>

            <label class=${styles.Item}>
              ${Checkbox.Root({
                value: 'edit-user',
                className: styles.Checkbox,
                children: Checkbox.Indicator({
                  className: styles.Indicator,
                  children: checkIcon(styles.Icon),
                }),
              })}
              Edit User
            </label>

            <label class=${styles.Item}>
              ${Checkbox.Root({
                value: 'delete-user',
                className: styles.Checkbox,
                children: Checkbox.Indicator({
                  className: styles.Indicator,
                  children: checkIcon(styles.Icon),
                }),
              })}
              Delete User
            </label>

            <label class=${styles.Item}>
              ${Checkbox.Root({
                value: 'assign-roles',
                className: styles.Checkbox,
                children: Checkbox.Indicator({
                  className: styles.Indicator,
                  children: checkIcon(styles.Icon),
                }),
              })}
              Assign Roles
            </label>
          `,
        })}
      `}
    </LitCheckboxGroup>
  );
}
