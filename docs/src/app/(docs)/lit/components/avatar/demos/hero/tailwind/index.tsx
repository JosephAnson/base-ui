import * as React from 'react';
import { LitAvatar } from '../LitAvatar';

export default function ExampleAvatar() {
  return (
    <div style={{ display: 'flex', gap: 20 }}>
      <LitAvatar
        className="inline-flex size-12 items-center justify-center overflow-hidden rounded-full bg-gray-100 align-middle text-base font-medium text-gray-900 select-none"
        fallback="LT"
        fallbackClassName="flex size-full items-center justify-center text-base"
        height="48"
        imageClassName="size-full object-cover"
        src="https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?w=128&h=128&dpr=2&q=80"
        width="48"
      />
      <LitAvatar
        className="inline-flex size-12 items-center justify-center overflow-hidden rounded-full bg-gray-100 align-middle text-base font-medium text-gray-900 select-none"
        fallback="LT"
        fallbackClassName="flex size-full items-center justify-center text-base"
      />
    </div>
  );
}
