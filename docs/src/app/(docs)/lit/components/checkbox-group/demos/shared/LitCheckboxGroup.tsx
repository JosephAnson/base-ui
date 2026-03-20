'use client';
import * as React from 'react';
import { nothing, render as renderTemplate, type TemplateResult } from 'lit';
import type { CheckboxGroupProps } from '@base-ui/lit/checkbox-group';
import { CheckboxGroup } from '@base-ui/lit/checkbox-group';

export interface LitCheckboxGroupProps {
  children?: TemplateResult | TemplateResult[] | undefined;
  groupProps?: CheckboxGroupProps | undefined;
}

export function LitCheckboxGroup(props: LitCheckboxGroupProps) {
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const { children, groupProps } = props;

  React.useEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(CheckboxGroup({ ...groupProps, children }), host);

    return () => {
      renderTemplate(nothing, host);
    };
  }, [children, groupProps]);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}
