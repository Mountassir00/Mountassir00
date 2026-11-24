/** Category glyphs for the Journal (20 px grid). */
import type { ReactNode } from 'react';

export type Cat = 'tasks' | 'decisions' | 'security' | 'optimization' | 'skills' | 'connectors' | 'calls' | 'other';

const svg = (d: ReactNode) => (
  <svg width={18} height={18} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden focusable={false}>
    {d}
  </svg>
);

export const CATEGORY_ICON: Record<Cat, ReactNode> = {
  tasks: svg(
    <>
      <rect x="3.5" y="3.5" width="13" height="13" rx="3.5" />
      <path d="m7 10 2.2 2.2L13.5 8" />
    </>,
  ),
  decisions: svg(
    <>
      <path d="M10 3v14M5 6h10M3.5 12 5 6l1.5 6a1.6 1.6 0 0 1-3 0ZM13.5 12 15 6l1.5 6a1.6 1.6 0 0 1-3 0Z" />
    </>,
  ),
  security: svg(
    <>
      <path d="M10 2.5 16 5v4.6c0 3.7-2.6 6.4-6 7.9-3.4-1.5-6-4.2-6-7.9V5Z" />
      <path d="m7.3 10 2 2 3.6-3.8" />
    </>,
  ),
  optimization: svg(<path d="M11 2.5 4.5 11h5l-1 6.5L15.5 9h-5Z" />),
  skills: svg(<path d="M8 3.5h4v2a1.5 1.5 0 1 0 3 0v-.2h1.5v4.2h-2a1.5 1.5 0 1 0 0 3h2v4h-4v-1.8a1.5 1.5 0 1 0-3 0v1.8H3.5v-4h1.8a1.5 1.5 0 1 0 0-3H3.5V5.3H8Z" />),
  connectors: svg(<path d="M7 3v4M13 3v4M5 7h10v2.5a5 5 0 0 1-10 0ZM10 14.5V17" />),
  calls: svg(
    <>
      <rect x="4.5" y="4.5" width="11" height="11" rx="2.5" />
      <path d="M8 2.5v2M12 2.5v2M8 15.5v2M12 15.5v2M2.5 8h2M2.5 12h2M15.5 8h2M15.5 12h2" />
    </>,
  ),
  other: svg(
    <>
      <circle cx="10" cy="10" r="7" />
      <path d="M10 6v4l2.7 1.6" />
    </>,
  ),
};
