/**
 * View launcher: every installed presentation as a thumbnail grid, grouped by
 * family, searchable, keyboard-driven, with favourites. Juggling between many
 * views stays one keystroke away (G, or the grid button).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { RegistryEntry } from '@engine/registry';
import { ops } from '@engine/registry';
import { IconClose, IconSearch, IconStar } from '@ds';
import { registry } from './registryInstance';
import { switchTo } from './App';
import { setPrefs, ui, useUi } from './uiStore';

const FAMILY_LABEL: Record<string, string> = {
  dashboard: 'Tableaux de bord',
  workspace: 'Espaces de travail',
  'scene-3d': 'Scènes 3D',
  'scene-2d': 'Scènes 2D',
  tool: 'Outils',
  other: 'Autres',
};
const ORDER = ['dashboard', 'workspace', 'scene-3d', 'scene-2d', 'tool', 'other'];
const thumb = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

/** Views reachable with keys 1–9: favourites first, then the rest. */
export function quickList(entries: RegistryEntry[], favorites: string[]): RegistryEntry[] {
  const usable = entries.filter((e) => e.enabled && !e.hidden);
  const fav = favorites.map((id) => usable.find((e) => e.id === id)).filter(Boolean) as RegistryEntry[];
  return [...fav, ...usable.filter((e) => !favorites.includes(e.id))];
}

export function Launcher({ entries, activeId }: { entries: RegistryEntry[]; activeId: string }) {
  const open = useUi((s) => s.launcherOpen);
  const favorites = useUi((s) => s.prefs.favorites);
  const [q, setQ] = useState('');
  const [cursor, setCursor] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const grid = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQ('');
      setTimeout(() => input.current?.focus(), 0);
    }
  }, [open]);

  const list = useMemo(() => {
    const nq = norm(q.trim());
    return entries
      .filter((e) => e.enabled && !e.hidden)
      .filter((e) => !nq || norm(`${e.manifest.name} ${e.manifest.description} ${FAMILY_LABEL[e.manifest.family ?? 'other']}`).includes(nq));
  }, [entries, q]);

  const groups = useMemo(() => {
    const m = new Map<string, RegistryEntry[]>();
    if (!q.trim()) {
      const fav = favorites.map((id) => list.find((e) => e.id === id)).filter(Boolean) as RegistryEntry[];
      if (fav.length) m.set('favorites', fav);
    }
    for (const e of list) {
      const f = e.manifest.family ?? 'other';
      if (!m.has(f)) m.set(f, []);
      m.get(f)!.push(e);
    }
    return [...m.entries()].sort((a, b) => (a[0] === 'favorites' ? -1 : b[0] === 'favorites' ? 1 : ORDER.indexOf(a[0]) - ORDER.indexOf(b[0])));
  }, [list, favorites, q]);

  const flat = useMemo(() => groups.flatMap(([, es]) => es), [groups]);
  useEffect(() => setCursor(0), [q]);
  useEffect(() => {
    grid.current?.querySelector<HTMLElement>(`[data-idx="${cursor}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  if (!open) return null;
  const close = () => ui.set({ launcherOpen: false });
  const go = (id: string) => {
    close();
    switchTo(id);
  };
  const quick = quickList(entries, favorites);

  const onKey = (e: React.KeyboardEvent) => {
    const cols = Math.max(1, Math.floor((grid.current?.clientWidth ?? 800) / 230));
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight') setCursor((c) => Math.min(flat.length - 1, c + 1));
    else if (e.key === 'ArrowLeft') setCursor((c) => Math.max(0, c - 1));
    else if (e.key === 'ArrowDown') setCursor((c) => Math.min(flat.length - 1, c + cols));
    else if (e.key === 'ArrowUp') setCursor((c) => Math.max(0, c - cols));
    else if (e.key === 'Enter' && flat[cursor]) go(flat[cursor].id);
    else return;
    e.preventDefault();
  };

  let idx = -1;
  return (
    <div className="scrim launcher-scrim" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className="launcher" role="dialog" aria-modal="true" aria-label="Toutes les vues" onKeyDown={onKey}>
        <div className="launcher__head">
          <div className="launcher__search">
            <IconSearch size={18} />
            <input
              ref={input}
              className="input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={`Rechercher parmi ${entries.filter((e) => e.enabled && !e.hidden).length} vues…`}
              aria-label="Rechercher une vue"
            />
          </div>
          <span className="t-micro t-muted hide-mobile">Flèches pour naviguer, Entrée pour ouvrir, ☆ pour épingler</span>
          <button type="button" className="btn btn--icon" onClick={close} aria-label="Fermer">
            <IconClose size={18} />
          </button>
        </div>
        <div ref={grid} className="launcher__body">
          {groups.map(([fam, es]) => (
            <section key={fam} aria-label={fam === 'favorites' ? 'Favoris' : FAMILY_LABEL[fam]}>
              <h2 className="launcher__group">{fam === 'favorites' ? 'Favoris' : FAMILY_LABEL[fam]}</h2>
              <div className="launcher__grid">
                {es.map((e) => {
                  idx++;
                  const i = idx;
                  const k = quick.findIndex((x) => x.id === e.id);
                  const fav = favorites.includes(e.id);
                  return (
                    <div key={`${fam}-${e.id}`} className="launcher__tile" data-active={e.id === activeId} data-cursor={i === cursor} data-idx={i}>
                      <button type="button" className="launcher__open" onClick={() => go(e.id)} onMouseEnter={() => { setCursor(i); registry.prefetch(e.baseId); }} onFocus={() => setCursor(i)}>
                        <img src={thumb(e.manifest.thumbnail)} alt="" />
                        <span className="launcher__name">{e.manifest.name}</span>
                        <span className="launcher__desc">{e.manifest.description}</span>
                      </button>
                      <div className="launcher__meta">
                        {k >= 0 && k < 9 && <span className="kbd">{k + 1}</span>}
                        {e.manifest.renderer === 'webgl' && <span className="pill">3D</span>}
                        {e.origin === 'variant' && <span className="pill pill--accent">Variante</span>}
                        <button
                          type="button"
                          className="btn btn--sm btn--icon btn--ghost"
                          aria-pressed={fav}
                          aria-label={fav ? `Retirer ${e.manifest.name} des favoris` : `Épingler ${e.manifest.name} en favori`}
                          onClick={() => setPrefs((p) => ops.setFavorite(p, e.id, !fav))}
                        >
                          <IconStar size={15} fill={fav ? 'currentColor' : 'none'} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
          {!flat.length && <div className="empty">Aucune vue ne correspond à « {q} ».</div>}
        </div>
      </div>
    </div>
  );
}
