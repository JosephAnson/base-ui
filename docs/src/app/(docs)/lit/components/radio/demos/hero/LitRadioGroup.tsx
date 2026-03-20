'use client';
import * as React from 'react';
import { useIsoLayoutEffect } from '@base-ui/utils/useIsoLayoutEffect';
import { html, nothing, render as renderTemplate } from 'lit';
import '@base-ui/lit/radio';
import '@base-ui/lit/radio-group';

export interface LitRadioGroupItem {
  label: string;
  value: string;
  testId?: string | undefined;
}

export interface LitRadioGroupProps {
  caption: string;
  captionClassName?: string | undefined;
  groupClassName?: string | undefined;
  groupProps?: {
    className?: string;
    defaultValue?: string;
    'aria-labelledby'?: string;
  } | undefined;
  indicatorProps?: {
    className?: string;
  } | undefined;
  itemClassName?: string | undefined;
  items: LitRadioGroupItem[];
  rootProps?: {
    className?: string;
  } | undefined;
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
      html`<radio-group
        class=${mergeClassNames(groupClassName, groupProps?.className) ?? ''}
        aria-labelledby=${captionId}
        .defaultValue=${groupProps?.defaultValue}
      >
        <div class=${captionClassName ?? nothing} id=${captionId}>${caption}</div>
        ${items.map(
          (item) => html`<label class=${itemClassName ?? nothing}>
            <radio-root
              class=${rootProps?.className ?? ''}
              .value=${item.value}
              data-testid=${item.testId ?? nothing}
            >
              <radio-indicator class=${indicatorProps?.className ?? ''}></radio-indicator>
            </radio-root>
            ${item.label}
          </label>`,
        )}
      </radio-group>`,
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
