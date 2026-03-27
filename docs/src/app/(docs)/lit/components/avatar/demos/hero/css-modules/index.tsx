import * as React from 'react';
import { html, nothing, render as renderTemplate } from 'lit';
import '@base-ui/lit/avatar';
import styles from './index.module.css';

interface LitAvatarProps {
  className?: string | undefined;
  fallback?: string | undefined;
  fallbackClassName?: string | undefined;
  height?: string | undefined;
  imageClassName?: string | undefined;
  src?: string | undefined;
  width?: string | undefined;
}

function LitAvatar(props: LitAvatarProps) {
  const { className, fallback, fallbackClassName, height, imageClassName, src, width } = props;
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
  }, [className, fallback, fallbackClassName, height, imageClassName, src, width]);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}

export default function ExampleAvatar() {
  return (
    <div style={{ display: 'flex', gap: 20 }}>
      <LitAvatar
        className={styles.Root}
        fallback="LT"
        fallbackClassName={styles.Fallback}
        height="48"
        imageClassName={styles.Image}
        src="https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?w=128&h=128&dpr=2&q=80"
        width="48"
      />
      <LitAvatar className={styles.Root} fallback="LT" fallbackClassName={styles.Fallback} />
    </div>
  );
}
