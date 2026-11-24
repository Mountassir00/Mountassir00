import { useEffect, useRef, useState } from 'react';
import type { RegistryEntry } from '@engine/registry';
import { IconChevron, IconStar } from '@ds';
import { registry } from './registryInstance';
import { switchTo } from './App';
import { ui } from './uiStore';

const thumbSrc = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

/**
 * Experience switcher, reachable from every view. Desktop: segmented control
 * of favourites + a menu with everything installed. Prefetches a renderer on
 * hover/focus (intent), never all of them up-front.
 */
export function ViewSwitcher({ entries, activeId }: { entries: RegistryEntry[]; activeId: string }) {
  const visible = entries.filter((e) => e.enabled && !e.hidden);
  const builtins = visible.filter((e) => e.origin === 'builtin').slice(0, 4);
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const active = entries.find((e) => e.id === activeId);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!menu.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => {
    if (open) (menu.current?.querySelectorAll<HTMLElement>('[role=option]')[cursor])?.focus();
  }, [open, cursor]);

  const choose = (id: string) => {
    switchTo(id);
    setOpen(false);
    btn.current?.focus();
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, position: 'relative' }}>
      <div className="seg hide-mobile" role="group" aria-label="Changer d’expérience">
        {builtins.map((e, i) => (
          <button
            key={e.id}
            type="button"
            aria-pressed={e.id === activeId}
            onClick={() => choose(e.id)}
            onMouseEnter={() => registry.prefetch(e.baseId)}
            onFocus={() => registry.prefetch(e.baseId)}
            title={`${e.manifest.name} (touche ${i + 1})`}
          >
            {e.manifest.name}
          </button>
        ))}
      </div>
      <button
        ref={btn}
        type="button"
        className="btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          setOpen((o) => !o);
          setCursor(Math.max(0, visible.findIndex((e) => e.id === activeId)));
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span className="only-mobile" style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {active?.manifest.name ?? 'Vue'}
        </span>
        <span className="hide-mobile">Toutes les vues</span>
        <IconChevron size={14} style={{ transform: 'rotate(90deg)' }} />
      </button>
      {open && (
        <div
          ref={menu}
          className="menu"
          role="listbox"
          aria-label="Expériences installées"
          style={{ top: 40, left: 0 }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setCursor((c) => Math.min(visible.length - 1, c + 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setCursor((c) => Math.max(0, c - 1));
            } else if (e.key === 'Escape') {
              setOpen(false);
              btn.current?.focus();
            }
          }}
        >
          {visible.map((e, i) => (
            <button
              key={e.id}
              type="button"
              role="option"
              aria-selected={e.id === activeId}
              className="menu__item"
              tabIndex={i === cursor ? 0 : -1}
              onClick={() => choose(e.id)}
              onMouseEnter={() => registry.prefetch(e.baseId)}
            >
              <img src={thumbSrc(e.manifest.thumbnail)} alt="" className="thumb" />
              <span>
                <b style={{ fontWeight: 600 }}>{e.manifest.name}</b>
                <span className="t-micro t-muted" style={{ display: 'block' }}>
                  {e.origin === 'variant' ? 'Variante personnalisée' : e.manifest.renderer === 'svg' ? 'Scène isométrique' : 'Vue analytique'}
                </span>
              </span>
              <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                {e.favorite && <IconStar size={14} aria-label="Favori" />}
                {i < 9 && <span className="kbd">{i + 1}</span>}
              </span>
            </button>
          ))}
          <hr className="hairline" />
          <button type="button" className="btn btn--ghost btn--sm" style={{ width: '100%' }} onClick={() => { ui.set({ route: 'gallery' }); setOpen(false); }}>
            Gérer les expériences dans la galerie
          </button>
        </div>
      )}
    </div>
  );
}
