/** Line icons for the editor tools (20 px grid, 1.5 px strokes, same style as the design-system icons). */
import type { ReactNode, SVGProps } from 'react';

const make = (d: ReactNode) =>
  function Icon({ size = 16, ...rest }: SVGProps<SVGSVGElement> & { size?: number }) {
    return (
      <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden focusable={false} {...rest}>
        {d}
      </svg>
    );
  };

export const IcoCursor = make(<path d="M5 3.5 15 9.2l-4.4 1.2-2.2 4.3Z" />);
export const IcoMove = make(<path d="M10 2.5v15M2.5 10h15M10 2.5 7.8 4.7M10 2.5l2.2 2.2M10 17.5l-2.2-2.2M10 17.5l2.2-2.2M2.5 10l2.2-2.2M2.5 10l2.2 2.2M17.5 10l-2.2-2.2M17.5 10l-2.2 2.2" />);
export const IcoRotate = make(<path d="M15.5 10a5.5 5.5 0 1 1-1.8-4.1M15.6 3.2v3.3h-3.3" />);
export const IcoUndo = make(<path d="M7.5 5.5 4 9l3.5 3.5M4.5 9h7a4 4 0 0 1 0 8H9" />);
export const IcoRedo = make(<path d="M12.5 5.5 16 9l-3.5 3.5M15.5 9h-7a4 4 0 0 0 0 8H11" />);
export const IcoGrid = make(<path d="M3.5 3.5h13v13h-13ZM7.8 3.5v13M12.2 3.5v13M3.5 7.8h13M3.5 12.2h13" />);
export const IcoPlan = make(<path d="M3 5.5 7.5 3.5l5 2 4.5-2v11l-4.5 2-5-2L3 16.5ZM7.5 3.5v11M12.5 5.5v11" />);
export const IcoCube = make(<path d="m10 2.8 6.3 3.6v7.2L10 17.2l-6.3-3.6V6.4ZM3.7 6.4 10 10l6.3-3.6M10 10v7.2" />);
export const IcoDuplicate = make(<path d="M7 7h9.5v9.5H7ZM13 7V3.5H3.5V13H7" />);
export const IcoTrash = make(<path d="M4 6h12M8 6V4h4v2M6 6l.8 10h6.4L14 6" />);
export const IcoTurnL = make(<path d="M6.5 7.5H12a4.5 4.5 0 0 1 0 9H9M6.5 7.5 9.5 4.5M6.5 7.5l3 3" />);
export const IcoTurnR = make(<path d="M13.5 7.5H8a4.5 4.5 0 0 0 0 9h3M13.5 7.5l-3-3M13.5 7.5l-3 3" />);
export const IcoUpload = make(<path d="M10 13.5V3.5M6 7.5l4-4 4 4M3.5 13v3.5h13V13" />);
export const IcoFocus = make(<path d="M4 7.5V4h3.5M12.5 4H16v3.5M16 12.5V16h-3.5M7.5 16H4v-3.5M10 8v4M8 10h4" />);
export const IcoLayers = make(<path d="m10 3 7 3.5-7 3.5-7-3.5ZM3 10.2l7 3.5 7-3.5M3 13.8l7 3.5 7-3.5" />);
