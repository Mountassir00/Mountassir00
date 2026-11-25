/** Small line glyphs used only by the Control Center (20 px grid, 1.6 stroke). */
import type { ReactNode, SVGProps } from 'react';

const make = (d: ReactNode) =>
  function Glyph({ size = 18, ...rest }: SVGProps<SVGSVGElement> & { size?: number }) {
    return (
      <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden focusable={false} {...rest}>
        {d}
      </svg>
    );
  };

export const GArrowUp = make(<path d="M6 14 14 6M8 6h6v6" />);
export const GArrowDown = make(<path d="M6 6l8 8M14 8v6H8" />);
export const GReplay = make(
  <>
    <path d="M4.5 8A6 6 0 1 1 4 11" />
    <path d="M4.5 3.5V8H9" />
    <path d="m9 8 3.5 2.2L9 12.4Z" />
  </>,
);
export const GLayers = make(
  <>
    <path d="M10 3 17 7l-7 4-7-4Z" />
    <path d="m3 10.5 7 4 7-4" />
  </>,
);
export const GCoin = make(
  <>
    <circle cx="10" cy="10" r="7" />
    <path d="M12.2 7.6c-.4-.7-1.2-1.1-2.2-1.1-1.3 0-2.2.7-2.2 1.6 0 2.2 4.6 1.2 4.6 3.6 0 1-1 1.7-2.4 1.7-1.1 0-2-.5-2.4-1.3M10 5v1.5M10 13.4V15" />
  </>,
);
export const GSpark = make(<path d="M10 2.5 11.7 8.3 17.5 10l-5.8 1.7L10 17.5l-1.7-5.8L2.5 10l5.8-1.7Z" />);
export const GAlert = make(
  <>
    <path d="M10 3 18 16.5H2Z" />
    <path d="M10 8v4M10 14.2v.1" />
  </>,
);
export const GShield = make(
  <>
    <path d="M10 2.5 16 5v4.6c0 3.7-2.6 6.4-6 7.9-3.4-1.5-6-4.2-6-7.9V5Z" />
    <path d="m7.3 10 2 2 3.6-3.8" />
  </>,
);
export const GRefresh = make(<path d="M15.5 8A6 6 0 0 0 4.6 6.2M4.5 12a6 6 0 0 0 10.9 1.8M15.6 3.5V8h-4.5M4.4 16.5V12h4.5" />);
export const GPuzzle = make(<path d="M8 3.5h4v2a1.5 1.5 0 1 0 3 0v-.2h1.5v4.2h-2a1.5 1.5 0 1 0 0 3h2v4h-4v-1.8a1.5 1.5 0 1 0-3 0v1.8H3.5v-4h1.8a1.5 1.5 0 1 0 0-3H3.5V5.3H8Z" />);
export const GPlug = make(<path d="M7 3v4M13 3v4M5 7h10v2.5a5 5 0 0 1-10 0ZM10 14.5V17" />);
export const GHistory = make(
  <>
    <circle cx="10" cy="10" r="7" />
    <path d="M10 6v4l2.7 1.6" />
  </>,
);
export const GChevron = make(<path d="m8 5 5 5-5 5" />);
export const GTable = make(
  <>
    <rect x="3" y="4" width="14" height="12" rx="2" />
    <path d="M3 8.5h14M3 12.5h14M8 8.5V16" />
  </>,
);
export const GChart = make(
  <>
    <rect x="3.5" y="9" width="3" height="7" rx="1.5" />
    <rect x="8.5" y="4" width="3" height="12" rx="1.5" />
    <rect x="13.5" y="7" width="3" height="9" rx="1.5" />
  </>,
);
