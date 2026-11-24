/**
 * Side panel on large screens, draggable bottom sheet on phones:
 * drag the grip/header down to dismiss, release early to snap back.
 */
import { useRef, type ReactNode } from 'react';
import { IconClose } from '@ds';
import { useUi } from './uiStore';

export function Drawer({ label, title, onClose, children, actions }: { label: string; title: ReactNode; onClose: () => void; children: ReactNode; actions?: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const device = useUi((s) => s.device);
  const drag = useRef<{ y0: number; dy: number } | null>(null);

  const onDown = (e: React.PointerEvent) => {
    if (device !== 'mobile' || (e.target as Element).closest('button')) return;
    drag.current = { y0: e.clientY, dy: 0 };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    if (ref.current) ref.current.style.transition = 'none';
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current || !ref.current) return;
    drag.current.dy = Math.max(0, e.clientY - drag.current.y0);
    ref.current.style.transform = `translateY(${drag.current.dy}px)`;
  };
  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    const el = ref.current;
    if (!d || !el) return;
    el.style.transition = 'transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1)';
    if (d.dy > Math.min(160, el.offsetHeight * 0.3)) {
      el.style.transform = 'translateY(110%)';
      setTimeout(onClose, 180);
    } else el.style.transform = '';
  };

  return (
    <aside ref={ref} className="drawer" aria-label={label}>
      <div onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} style={{ touchAction: 'none' }}>
        <div className="drawer__grip" aria-hidden />
        <div className="drawer__head">
          <h2 className="t-h2" style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {title}
          </h2>
          {actions}
          <button type="button" className="btn btn--icon" onClick={onClose} aria-label={`Fermer : ${label}`}>
            <IconClose size={18} />
          </button>
        </div>
      </div>
      <div className="drawer__body">{children}</div>
    </aside>
  );
}
