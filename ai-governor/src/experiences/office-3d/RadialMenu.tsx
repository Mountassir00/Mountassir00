/**
 * Radial action menu: 4–6 round buttons on a ring around the point that was
 * right-clicked / long-pressed / opened from the keyboard.
 *
 * Keyboard: arrows (or Tab) move around the ring, Enter / Space run the
 * action, Escape closes and gives focus back. The interaction passed to the
 * action is the real one ('click' or 'keyboard') so the command gateway can
 * apply its rules; nothing runs from a drag or a gesture.
 */
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { IconClose } from '@ds';

export interface RadialAction {
  id: string;
  label: string;
  icon: ReactNode;
  /** Disabled actions stay visible with the reason. */
  disabled?: string;
  tone?: 'accent' | 'warn';
  run: (interaction: 'click' | 'keyboard') => void;
}

export function RadialMenu({
  x, y, bounds, title, actions, onClose, restoreFocus,
}: {
  x: number;
  y: number;
  bounds: { w: number; h: number };
  title: string;
  actions: RadialAction[];
  onClose: () => void;
  /** Element focused again when the menu closes. */
  restoreFocus?: HTMLElement | null;
}) {
  const ring = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(() => Math.max(0, actions.findIndex((a) => !a.disabled)));
  const R = bounds.w < 480 ? 62 : 70;
  const pad = R + 34;
  const cx = Math.min(bounds.w - pad, Math.max(pad, x));
  const cy = Math.min(bounds.h - pad - 30, Math.max(pad, y));

  useLayoutEffect(() => {
    ring.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')[active]?.focus({ preventScroll: true });
  }, [active]);
  useEffect(() => {
    const prev = restoreFocus;
    return () => {
      if (prev && document.contains(prev)) prev.focus({ preventScroll: true });
    };
  }, [restoreFocus]);

  const move = (d: number) => setActive((i) => (i + d + actions.length) % actions.length);
  const onKey = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        move(1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        move(-1);
        break;
      case 'Tab':
        e.preventDefault();
        move(e.shiftKey ? -1 : 1);
        break;
      case 'Home':
        e.preventDefault();
        setActive(0);
        break;
      case 'End':
        e.preventDefault();
        setActive(actions.length - 1);
        break;
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        onClose();
        break;
    }
  };
  const cur = actions[active];
  return (
    <div className="o3-radial-layer" onPointerDown={(e) => e.target === e.currentTarget && onClose()} onContextMenu={(e) => e.preventDefault()}>
      <div ref={ring} className="o3-radial" style={{ left: cx, top: cy, ['--r' as string]: `${R}px` }} role="menu" aria-label={`Actions : ${title}`} onKeyDown={onKey}>
        <div className="o3-radial__disc" aria-hidden />
        {actions.map((a, i) => {
          const ang = -Math.PI / 2 + (i / actions.length) * Math.PI * 2;
          return (
            <button
              key={a.id}
              type="button"
              role="menuitem"
              tabIndex={i === active ? 0 : -1}
              className="o3-radial__item"
              data-tone={a.tone}
              data-active={i === active || undefined}
              aria-disabled={a.disabled ? true : undefined}
              aria-label={a.disabled ? `${a.label} — indisponible : ${a.disabled}` : a.label}
              style={{ transform: `translate(${Math.cos(ang) * R}px, ${Math.sin(ang) * R}px)`, ['--i' as string]: i }}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onClick={(e) => {
                if (a.disabled) return;
                const interaction = e.detail === 0 ? 'keyboard' : 'click';
                onClose();
                a.run(interaction);
              }}
            >
              {a.icon}
            </button>
          );
        })}
        <button type="button" className="o3-radial__close" onClick={onClose} aria-label="Fermer le menu" tabIndex={-1}>
          <IconClose size={14} />
        </button>
        {cur && (
          <div className="o3-radial__label" aria-hidden>
            <b>{cur.label}</b>
            {cur.disabled && <small>{cur.disabled}</small>}
          </div>
        )}
        <div className="o3-radial__title" aria-hidden>
          {title}
        </div>
      </div>
    </div>
  );
}
