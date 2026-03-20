'use client';
import * as React from 'react';
import { useIsoLayoutEffect } from '@base-ui/utils/useIsoLayoutEffect';
import { html, nothing, render as renderTemplate } from 'lit';
import type { RadioIndicatorProps, RadioRootProps } from '@base-ui/lit/radio';
import { Radio } from '@base-ui/lit/radio';
import type { RadioGroupProps } from '@base-ui/lit/radio-group';
import { RadioGroup } from '@base-ui/lit/radio-group';

export interface LitRadioGroupItem {
  label: string;
  value: string;
  testId?: string | undefined;
}

export interface LitRadioGroupProps {
  caption: string;
  captionClassName?: string | undefined;
  groupClassName?: string | undefined;
  groupProps?: Omit<RadioGroupProps<string>, 'children' | 'render'> | undefined;
  indicatorProps?: RadioIndicatorProps | undefined;
  itemClassName?: string | undefined;
  items: LitRadioGroupItem[];
  rootProps?: Omit<RadioRootProps<string>, 'children' | 'value'> | undefined;
}

export function LitRadioGroup(props: LitRadioGroupProps) {
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const generatedCaptionId = React.useId();
  const {
    caption,
    captionClassName,
    groupClassName,
    groupProps,
    indicatorProps,
    itemClassName,
    items,
    rootProps,
  } = props;
  const captionId = (groupProps?.['aria-labelledby'] as string | undefined) ?? generatedCaptionId;

  useIsoLayoutEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(
      RadioGroup({
        ...groupProps,
        'aria-labelledby': captionId,
        className: mergeClassNames(groupClassName, groupProps?.className as string | undefined),
        children: [
          html`<div class=${captionClassName ?? nothing} id=${captionId}>${caption}</div>`,
          ...items.map((item) => {
            return html`<label class=${itemClassName ?? nothing}>
              ${Radio.Root({
                ...rootProps,
                'data-testid': item.testId,
                className: rootProps?.className,
                value: item.value,
                children: Radio.Indicator(indicatorProps ?? {}),
              })}
              ${item.label}
            </label>`;
          }),
        ],
      }),
      host,
    );

    return () => {
      renderTemplate(nothing, host);
    };
  }, [
    caption,
    captionClassName,
    captionId,
    groupClassName,
    groupProps,
    indicatorProps,
    itemClassName,
    items,
    rootProps,
  ]);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}

function mergeClassNames(...classNames: Array<string | undefined>) {
  return classNames.filter(Boolean).join(' ') || undefined;
}
