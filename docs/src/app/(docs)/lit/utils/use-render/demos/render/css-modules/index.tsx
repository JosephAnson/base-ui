'use client';
import * as React from 'react';
import { html, nothing, render as renderTemplate, type TemplateResult } from 'lit';
import { useRender } from '@base-ui/lit/use-render';
import styles from './index.module.css';

interface TextProps {
  children: string;
  render?: TemplateResult | undefined;
}

function Text(props: TextProps) {
  const { children, render } = props;
  const hostRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (hostRef.current == null) {
      return undefined;
    }

    const template = useRender({
      defaultTagName: 'p',
      render,
      props: {
        className: styles.Text,
        children,
      },
    });

    renderTemplate(template, hostRef.current);

    return () => {
      renderTemplate(nothing, hostRef.current!);
    };
  }, [children, render]);

  return <div ref={hostRef} />;
}

export default function ExampleText() {
  return (
    <div>
      <Text>Text component rendered as a paragraph tag</Text>
      <Text render={html`<strong></strong>`}>Text component rendered as a strong tag</Text>
    </div>
  );
}
