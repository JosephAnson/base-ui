import { svg } from 'lit';

export function checkIcon(className?: string) {
  return svg`<svg
    fill="currentcolor"
    width="10"
    height="10"
    viewBox="0 0 10 10"
    class=${className ?? ''}
  >
    <path
      d="M9.1603 1.12218C9.50684 1.34873 9.60427 1.81354 9.37792 2.16038L5.13603 8.66012C5.01614 8.8438 4.82192 8.96576 4.60451 8.99384C4.3871 9.02194 4.1683 8.95335 4.00574 8.80615L1.24664 6.30769C0.939709 6.02975 0.916013 5.55541 1.19372 5.24822C1.47142 4.94102 1.94536 4.91731 2.2523 5.19524L4.36085 7.10461L8.12299 1.33999C8.34934 0.993152 8.81376 0.895638 9.1603 1.12218Z"
    />
  </svg>`;
}

export function horizontalRuleIcon(className?: string) {
  return svg`<svg
    width="10"
    height="10"
    viewBox="0 0 24 24"
    fill="currentcolor"
    xmlns="http://www.w3.org/2000/svg"
    class=${className ?? ''}
  >
    <line
      x1="3"
      y1="12"
      x2="21"
      y2="12"
      stroke="currentColor"
      stroke-width="3"
      stroke-linecap="round"
    />
  </svg>`;
}
