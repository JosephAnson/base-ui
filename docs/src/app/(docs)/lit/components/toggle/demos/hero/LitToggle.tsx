'use client';
import * as React from 'react';
import { html, nothing, render as renderTemplate, type TemplateResult } from 'lit';
import '@base-ui/lit/toggle';

interface LitToggleProps {
  'aria-label'?: string | undefined;
  children?: TemplateResult | undefined;
  className?: string | undefined;
  onPressedChange?: ((pressed: boolean) => void) | undefined;
  pressed?: boolean | undefined;
  value?: string | undefined;
}

export function LitToggle(props: LitToggleProps) {
  const { children, className, onPressedChange, pressed, value } = props;
  const ariaLabel = props['aria-label'];
  const hostRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(
      html`<toggle-root
        class=${className ?? ''}
        ?pressed=${pressed ?? false}
        aria-label=${ariaLabel ?? nothing}
        value=${value ?? nothing}
        .onPressedChange=${onPressedChange}
      >${children}</toggle-root>`,
      host,
    );

    return () => {
      renderTemplate(nothing, host);
    };
  }, [ariaLabel, children, className, onPressedChange, pressed, value]);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}
