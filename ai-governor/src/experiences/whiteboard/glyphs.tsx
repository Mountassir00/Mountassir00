/** Tool glyphs for the whiteboard (drawn for this view, 20px grid, 1.5px strokes). */
import type { ReactNode, SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };
const make = (d: ReactNode) =>
  function Glyph({ size = 18, ...rest }: P) {
    return (
      <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden focusable={false} {...rest}>
        {d}
      </svg>
    );
  };

export const GSelect = make(<path d="M5 3.5 15 9.2l-4.3 1.2L8.6 15Z" />);
export const GHand = make(
  <path d="M7 10V5.2a1.2 1.2 0 0 1 2.4 0V9m0-4.6V3.9a1.2 1.2 0 0 1 2.4 0V9m0-4.1a1.2 1.2 0 0 1 2.4 0V10m0-2.6a1.2 1.2 0 0 1 2.4 0v4.1c0 3-2 5-5 5h-.8c-1.8 0-2.8-.8-3.9-2.2L4.3 11.6a1.2 1.2 0 0 1 1.9-1.4L7 11.2" />,
);
export const GRect = make(<rect x="3.5" y="4.5" width="13" height="11" rx="2" />);
export const GArrow = make(<path d="M4 16 16 4M9.5 4H16v6.5" />);
export const GPen = make(<path d="M3.5 16.5c1.6-.2 2.8-.9 3.8-1.9l8.4-8.4a1.8 1.8 0 0 0-2.6-2.6L4.7 12c-1 1-1.6 2.3-1.2 4.5ZM12 5.2l2.6 2.6" />);
export const GText = make(<path d="M4.5 5V3.8h11V5M10 3.8v12.4M7.8 16.2h4.4" />);
export const GSticky = make(<path d="M4 3.5h12a.5.5 0 0 1 .5.5v8L12 16.5H4a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5ZM16.5 12H12v4.5" />);
export const GComment = make(<path d="M4 4.5h12a1 1 0 0 1 1 1v7.5a1 1 0 0 1-1 1H9l-3.5 2.8V14H4a1 1 0 0 1-1-1V5.5a1 1 0 0 1 1-1Z" />);
export const GUndo = make(<path d="M7.5 5.5 4 9l3.5 3.5M4.5 9h7a4.5 4.5 0 0 1 0 9H9" />);
export const GRedo = make(<path d="M12.5 5.5 16 9l-3.5 3.5M15.5 9h-7a4.5 4.5 0 0 0 0 9H11" />);
export const GPanel = make(
  <>
    <rect x="3" y="3.5" width="14" height="13" rx="2" />
    <path d="M12.5 3.5v13" />
  </>,
);
export const GSpark = make(<path d="M10 2.8 11.6 8.4 17.2 10l-5.6 1.6L10 17.2l-1.6-5.6L2.8 10l5.6-1.6Z" />);
export const GSummary = make(<path d="M4 5h12M4 9h12M4 13h7M4 17h4" />);
export const GAlign = make(
  <>
    <path d="M3.5 3.5h13" />
    <rect x="4.5" y="6" width="4" height="9" rx="1" />
    <rect x="11.5" y="6" width="4" height="5.5" rx="1" />
  </>,
);
export const GFlow = make(
  <>
    <rect x="2.5" y="7.5" width="4.5" height="5" rx="1" />
    <rect x="13" y="7.5" width="4.5" height="5" rx="1" />
    <path d="M7 10h6M11.2 8.3 13 10l-1.8 1.7" />
  </>,
);
export const GLock = make(
  <>
    <rect x="4.5" y="9" width="11" height="8" rx="1.5" />
    <path d="M7 9V6.5a3 3 0 0 1 6 0V9" />
  </>,
);
export const GBold = make(<path d="M6 4h5a3 3 0 0 1 0 6H6Zm0 6h6a3 3 0 0 1 0 6H6Z" />);
export const GItalic = make(<path d="M8.5 4H15M5 16h6.5M11.5 4l-3 12" />);
export const GList = make(<path d="M8 5.5h8.5M8 10h8.5M8 14.5h8.5M4 5.5h.01M4 10h.01M4 14.5h.01" strokeWidth={2} />);
export const GListNum = make(<path d="M8.5 5.5H17M8.5 10H17M8.5 14.5H17M3.5 4.5l1-.5v3M3.3 9.5c.3-.6 1.7-.7 1.7.2 0 .7-1.7 1.4-1.7 2.1H5" />);
export const GHeading = make(<path d="M4.5 4v12M11.5 4v12M4.5 10h7M14.5 9.5l1.5-1v7.5" />);
export const GEdit = make(<path d="m12.5 4 3.5 3.5-8.5 8.5H4v-3.5Z" />);
export const GDoc = make(<path d="M5 2.8h6.5l3.5 3.5v10.9H5ZM11.5 2.8v3.5H15M7.5 10h5M7.5 13h5" />);
