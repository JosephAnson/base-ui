import { vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';

afterEach(() => {
  vi.resetAllMocks();
});

if (typeof window !== 'undefined' && window?.navigator?.userAgent?.includes('jsdom')) {
  globalThis.requestAnimationFrame = (cb) => {
    setTimeout(() => cb(0), 0);
    return 0;
  };
}
