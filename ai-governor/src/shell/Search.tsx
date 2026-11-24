import { useEffect, useMemo, useRef, useState } from 'react';
import type { RegistryEntry } from '@engine/registry';
import type { Selection } from '@engine/contract';
import { IconSearch } from '@ds';
import { useGovernor } from '@sdk';
import { switchTo } from './App';
import { ui, useUi } from './uiStore';

interface Hit {
  key: string;
  label: string;
  hint: string;
  run: () => void;
}

const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

/** Command palette: agents, departments, system nodes, experiences. */
export function Search({ entries }: { entries: RegistryEntry[] }) {
  const open = useUi((s) => s.searchOpen);
  const viewCommands = useUi((s) => s.viewCommands);
  const g = useGovernor();
  const [q, setQ] = useState('');
  const [cursor, setCursor] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) {
      setQ('');
      setCursor(0);
      setTimeout(() => input.current?.focus(), 0);
    }
  }, [open]);
  const hits = useMemo<Hit[]>(() => {
    const select = (sel: Selection) => () => ui.set({ selection: sel, drawer: 'inspector', searchOpen: false, route: 'stage' });
    const all: Hit[] = [
      ...viewCommands.map((c) => ({ key: `c:${c.id}`, label: c.label, hint: `Commande de la vue${c.keyword ? ` · ${c.keyword}` : ''}${c.hint ? ` · ${c.hint}` : ''}`, run: () => { ui.set({ searchOpen: false }); c.run(); } })),
      ...g.catalog.agents.map((a) => ({ key: `a:${a.id}`, label: a.name, hint: `Agent · ${a.role}`, run: select({ kind: 'agent', id: a.id }) })),
      ...g.catalog.departments.map((d) => ({ key: `d:${d.id}`, label: d.name, hint: `Département · ${d.mission}`, run: select({ kind: 'department', id: d.id }) })),
      ...g.catalog.nodes.filter((n) => n.kind !== 'agent' && n.kind !== 'service' && n.kind !== 'user').map((n) => ({ key: `n:${n.id}`, label: n.label, hint: `Composant · ${n.kind}`, run: select({ kind: 'node', id: n.id }) })),
      ...entries.filter((e) => e.enabled).map((e) => ({ key: `x:${e.id}`, label: e.manifest.name, hint: 'Ouvrir l’expérience', run: () => { switchTo(e.id); ui.set({ searchOpen: false }); } })),
    ];
    const nq = norm(q.trim());
    if (!nq) return all.slice(0, 12);
    // Label matches outrank hint matches (typing « Vision » must not surface
    // every department whose mission mentions « supervision » first).
    const score = (h: Hit) => {
      const l = norm(h.label);
      if (l === nq) return 0;
      if (l.startsWith(nq)) return 1;
      if (l.includes(nq)) return 2;
      return norm(h.hint).includes(nq) ? 3 : -1;
    };
    return all
      .map((h, i) => ({ h, i, s: score(h) }))
      .filter((x) => x.s >= 0)
      .sort((a, b) => a.s - b.s || a.i - b.i)
      .map((x) => x.h)
      .slice(0, 20);
  }, [g.catalog, entries, q, viewCommands]);
  if (!open) return null;
  return (
    <div className="scrim" style={{ alignItems: 'start', paddingTop: '12vh' }} onMouseDown={(e) => e.target === e.currentTarget && ui.set({ searchOpen: false })}>
      <div className="dialog" role="dialog" aria-modal="true" aria-label="Recherche" style={{ width: 'min(560px, 100%)', padding: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 6px 8px' }}>
          <IconSearch size={18} />
          <input
            ref={input}
            className="input"
            style={{ flex: 1, border: 0, boxShadow: 'none' }}
            placeholder="Agent, département, composant ou vue…"
            value={q}
            role="combobox"
            aria-label="Rechercher"
            aria-expanded="true"
            aria-controls="search-results"
            aria-activedescendant={hits[cursor] ? `hit-${cursor}` : undefined}
            onChange={(e) => { setQ(e.target.value); setCursor(0); }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(hits.length - 1, c + 1)); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(0, c - 1)); }
              else if (e.key === 'Enter') hits[cursor]?.run();
              else if (e.key === 'Escape') ui.set({ searchOpen: false });
            }}
          />
          <span className="kbd">Échap</span>
        </div>
        <div id="search-results" role="listbox" style={{ maxHeight: '50vh', overflow: 'auto' }}>
          {hits.map((h, i) => (
            <button key={h.key} id={`hit-${i}`} type="button" role="option" aria-selected={i === cursor} className="menu__item" style={{ gridTemplateColumns: '1fr' }} onMouseEnter={() => setCursor(i)} onClick={h.run}>
              <span>
                <b style={{ fontWeight: 600 }}>{h.label}</b>
                <span className="t-micro t-muted" style={{ display: 'block' }}>{h.hint}</span>
              </span>
            </button>
          ))}
          {!hits.length && <div className="empty">Aucun résultat pour « {q} ».</div>}
        </div>
      </div>
    </div>
  );
}
