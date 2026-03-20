'use client';
import * as React from 'react';
import { html, nothing, render as renderTemplate } from 'lit';
import '@base-ui/lit/avatar';

interface LitAvatarProps {
  alt?: string | undefined;
  className?: string | undefined;
  fallback?: string | undefined;
  fallbackClassName?: string | undefined;
  height?: string | undefined;
  imageClassName?: string | undefined;
  src?: string | undefined;
  width?: string | undefined;
}

export function LitAvatar(props: LitAvatarProps) {
  const { alt, className, fallback, fallbackClassName, height, imageClassName, src, width } = props;
  const hostRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(
      html`<avatar-root class=${className ?? ''}>
        ${src
          ? html`<avatar-image
              alt=${alt ?? nothing}
              class=${imageClassName ?? ''}
              height=${height ?? nothing}
              src=${src}
              width=${width ?? nothing}
            ></avatar-image>`
          : nothing}
        ${fallback
          ? html`<avatar-fallback class=${fallbackClassName ?? ''}>${fallback}</avatar-fallback>`
          : nothing}
      </avatar-root>`,
      host,
    );

    return () => {
      renderTemplate(nothing, host);
    };
  }, [alt, className, fallback, fallbackClassName, height, imageClassName, src, width]);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}
