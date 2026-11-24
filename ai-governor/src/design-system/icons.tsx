/** Minimal line icon set (1.5px strokes, 20px grid) drawn for this product. */
import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };

const base = (size = 18): SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: '0 0 20 20',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
});

const make = (d: React.ReactNode) =>
  function Icon({ size, ...rest }: P) {
    return (
      <svg {...base(size)} {...rest}>
        {d}
      </svg>
    );
  };

export const IconGovernor = make(
  <>
    <path d="M10 2.5 17 6.5v7L10 17.5 3 13.5v-7Z" />
    <path d="M10 2.5v15M3 6.5l7 4 7-4" />
  </>,
);
export const IconStage = make(
  <>
    <path d="M10 3 17 7 10 11 3 7Z" />
    <path d="M3 10.5 10 14.5 17 10.5M3 14 10 18 17 14" />
  </>,
);
export const IconDecision = make(
  <>
    <path d="M10 2.5v4M10 13.5v4M4 10h3M13 10h3" />
    <circle cx="10" cy="10" r="3" />
  </>,
);
export const IconGallery = make(
  <>
    <rect x="3" y="3" width="6" height="6" rx="1" />
    <rect x="11" y="3" width="6" height="6" rx="1" />
    <rect x="3" y="11" width="6" height="6" rx="1" />
    <rect x="11" y="11" width="6" height="6" rx="1" />
  </>,
);
export const IconStudio = make(
  <>
    <path d="M4 16c3 0 3-3 5.5-3S13 16 16 16" />
    <path d="m12.5 3.5 4 4-6 6-4-4Z" />
  </>,
);
export const IconBuilder = make(
  <>
    <path d="M10 3v14M3 10h14" />
    <rect x="3" y="3" width="14" height="14" rx="2" />
  </>,
);
export const IconData = make(
  <>
    <ellipse cx="10" cy="5" rx="6" ry="2.5" />
    <path d="M4 5v10c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V5M4 10c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5" />
  </>,
);
export const IconSettings = make(
  <>
    <circle cx="10" cy="10" r="2.5" />
    <path d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M4.7 15.3l1.4-1.4M13.9 6.1l1.4-1.4" />
  </>,
);
export const IconSearch = make(
  <>
    <circle cx="9" cy="9" r="5" />
    <path d="m13 13 4 4" />
  </>,
);
export const IconClose = make(<path d="M5 5l10 10M15 5 5 15" />);
export const IconPlay = make(<path d="M6.5 4.5v11l9-5.5Z" />);
export const IconPause = make(<path d="M7 4.5v11M13 4.5v11" />);
export const IconLive = make(
  <>
    <circle cx="10" cy="10" r="2.5" />
    <path d="M5.5 5.5a6.4 6.4 0 0 0 0 9M14.5 5.5a6.4 6.4 0 0 1 0 9" />
  </>,
);
export const IconRewind = make(<path d="M10 5 4 10l6 5M16 5l-6 5 6 5" />);
export const IconFilter = make(<path d="M3 5h14M6 10h8M8.5 15h3" />);
export const IconFullscreen = make(<path d="M3 7V3h4M13 3h4v4M17 13v4h-4M7 17H3v-4" />);
export const IconPresent = make(
  <>
    <rect x="3" y="3.5" width="14" height="10" rx="1" />
    <path d="M10 13.5v3M7 17h6" />
  </>,
);
export const IconZoomIn = make(
  <>
    <circle cx="9" cy="9" r="5" />
    <path d="m13 13 4 4M7 9h4M9 7v4" />
  </>,
);
export const IconZoomOut = make(
  <>
    <circle cx="9" cy="9" r="5" />
    <path d="m13 13 4 4M7 9h4" />
  </>,
);
export const IconFit = make(<path d="M4 8V4h4M12 4h4v4M16 12v4h-4M8 16H4v-4M8 8h4v4H8Z" />);
export const IconStar = make(<path d="m10 3 2.1 4.4 4.9.7-3.5 3.4.8 4.8L10 14l-4.3 2.3.8-4.8L3 8.1l4.9-.7Z" />);
export const IconEye = make(
  <>
    <path d="M2.5 10S5 4.5 10 4.5 17.5 10 17.5 10 15 15.5 10 15.5 2.5 10 2.5 10Z" />
    <circle cx="10" cy="10" r="2.2" />
  </>,
);
export const IconEyeOff = make(<path d="M3 3l14 14M8.3 5A7.3 7.3 0 0 1 10 4.5c5 0 7.5 5.5 7.5 5.5a12 12 0 0 1-2 2.8M5.4 6.6C3.6 8 2.5 10 2.5 10S5 15.5 10 15.5c1 0 2-.2 2.8-.6M8.4 8.5a2.2 2.2 0 0 0 3 3" />);
export const IconCopy = make(
  <>
    <rect x="6.5" y="6.5" width="10" height="10" rx="1.5" />
    <path d="M13.5 6.5v-2a1 1 0 0 0-1-1h-8a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h2" />
  </>,
);
export const IconTrash = make(<path d="M4 6h12M8 6V4h4v2M6 6l.8 10h6.4L14 6" />);
export const IconDownload = make(<path d="M10 3v10M6 9l4 4 4-4M4 16h12" />);
export const IconUpload = make(<path d="M10 14V4M6 8l4-4 4 4M4 16h12" />);
export const IconReset = make(<path d="M4.5 8A6 6 0 1 1 4 11M4.5 3.5V8H9" />);
export const IconAlert = make(
  <>
    <path d="M10 3 18 16.5H2Z" />
    <path d="M10 8v4M10 14.2v.1" />
  </>,
);
export const IconCheck = make(<path d="m4 10.5 4 4 8-9" />);
export const IconInfo = make(
  <>
    <circle cx="10" cy="10" r="7" />
    <path d="M10 9v5M10 6.2v.1" />
  </>,
);
export const IconLock = make(
  <>
    <rect x="4.5" y="9" width="11" height="8" rx="1.5" />
    <path d="M7 9V6.5a3 3 0 0 1 6 0V9" />
  </>,
);
export const IconMap = make(
  <>
    <path d="M3 5.5 7.5 3.5l5 2 4.5-2v11l-4.5 2-5-2-4.5 2Z" />
    <path d="M7.5 3.5v11M12.5 5.5v11" />
  </>,
);
export const IconChevron = make(<path d="m7 5 5 5-5 5" />);
export const IconMinimap = make(
  <>
    <rect x="3" y="3" width="14" height="14" rx="1.5" />
    <rect x="9" y="9" width="6" height="5" rx="0.5" />
  </>,
);
export const IconGroup = make(
  <>
    <rect x="3" y="3" width="6" height="6" rx="1" />
    <rect x="11" y="11" width="6" height="6" rx="1" />
    <path d="M9 6h3a1 1 0 0 1 1 1v4" />
  </>,
);
