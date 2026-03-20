'use client';
import * as React from 'react';
import { useTimeout } from '@base-ui/utils/useTimeout';
import { nothing, render as renderTemplate } from 'lit';
import { Button } from '@base-ui/lit/button';

interface LitLoadingButtonProps extends Pick<Button.Props, 'className'> {}

export function LitLoadingButton(props: LitLoadingButtonProps) {
  const { className } = props;
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const timeout = useTimeout();
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    renderTemplate(
      Button({
        className,
        disabled: loading,
        focusableWhenDisabled: true,
        onClick() {
          setLoading(true);
          timeout.start(4000, () => {
            setLoading(false);
          });
        },
        children: loading ? 'Submitting' : 'Submit',
      }),
      host,
    );

    return () => {
      renderTemplate(nothing, host);
    };
  }, [className, loading, timeout]);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}
