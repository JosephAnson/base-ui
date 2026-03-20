import * as React from 'react';
import { html, nothing, render as renderTemplate } from 'lit';
import type { ToggleProps } from '@base-ui/lit/toggle';
import { Toggle } from '@base-ui/lit/toggle';
import styles from 'docs/src/app/(docs)/lit/components/toggle/demos/hero/css-modules/index.module.css';

export default function ToggleInteractions() {
  const [pressed, setPressed] = React.useState(false);
  const [disabledPressCount, setDisabledPressCount] = React.useState(0);

  return (
    <div style={{ display: 'grid', gap: '1rem', justifyItems: 'start' }}>
      <div className={styles.Panel}>
        <LitFixtureToggle
          aria-label="Favorite"
          className={styles.Button}
          nativeButton={false}
          pressed={pressed}
          render={html`<span></span>`}
          onPressedChange={(nextPressed) => {
            setPressed(nextPressed);
          }}
        >
          Favorite
        </LitFixtureToggle>
      </div>

      <output aria-live="polite" data-testid="pressed-state">
        {pressed ? 'on' : 'off'}
      </output>

      <div className={styles.Panel}>
        <LitFixtureToggle
          aria-label="Disabled toggle"
          className={styles.Button}
          disabled
          nativeButton={false}
          render={html`<span></span>`}
          onPressedChange={() => {
            setDisabledPressCount((value) => value + 1);
          }}
        >
          Disabled
        </LitFixtureToggle>
      </div>

      <output aria-live="polite" data-testid="disabled-count">
        {disabledPressCount}
      </output>
    </div>
  );
}

function LitFixtureToggle(props: ToggleProps<string>) {
  const hostRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(Toggle(props), host);

    return () => {
      renderTemplate(nothing, host);
    };
  }, [props]);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}
