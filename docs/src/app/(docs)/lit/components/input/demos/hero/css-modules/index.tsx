'use client';
import * as React from 'react';
import { nothing, render as renderTemplate } from 'lit';
import { Input } from '@base-ui/lit/input';
import styles from './index.module.css';

interface LitInputProps {
  className?: string | undefined;
  placeholder?: string | undefined;
}

function LitInput(props: LitInputProps) {
  const { className, placeholder } = props;
  const hostRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(Input({ className, placeholder: placeholder ?? nothing }), host);

    return () => {
      renderTemplate(nothing, host);
    };
  }, [className, placeholder]);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}

export default function ExampleInput() {
  return (
    <label className={styles.Label}>
      Name
      <LitInput placeholder="Enter your name" className={styles.Input} />
    </label>
  );
}
