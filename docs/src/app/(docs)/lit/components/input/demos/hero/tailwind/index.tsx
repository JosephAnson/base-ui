'use client';
import * as React from 'react';
import { nothing, render as renderTemplate } from 'lit';
import { Input } from '@base-ui/lit/input';

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
    <label className="flex flex-col items-start gap-1">
      <span className="text-sm font-medium text-gray-900">Name</span>
      <LitInput
        placeholder="Enter your name"
        className="h-10 w-56 rounded-md border border-gray-200 pl-3.5 text-base text-gray-900 focus:outline-2 focus:-outline-offset-1 focus:outline-blue-800"
      />
    </label>
  );
}
