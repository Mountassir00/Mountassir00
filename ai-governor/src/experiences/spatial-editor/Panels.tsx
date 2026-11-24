/**
 * Side panels of the spatial editor: library, element list, properties of the
 * selection (or of the room), problems and unpublished changes.
 * Every field commits on Enter / blur / arrow keys — one undo step each.
 */
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { Catalog } from '@sdk';
import type { EquipmentKind, SpatialLayout, SpatialPrimitive } from '@ds/three';
import { KindIcon } from './kindIcons';
import {
  LIBRARY, bindingLabel, fmtM, footprint, halfExtents, isBoard, isDecor, kindLabel, normDeg, type Change, type Issue, type LibraryItem,
} from './model';
import { IcoDuplicate, IcoFocus, IcoTrash, IcoTurnL, IcoTurnR } from './toolIcons';

const EQUIPMENT: Array<[EquipmentKind, string]> = [
  ['desk', 'Bureau'], ['meeting', 'Réunion'], ['lab', 'Laboratoire'], ['server', 'Serveurs'], ['database', 'Base de données'], ['board', 'Tableau'],
  ['shield', 'Bouclier'], ['archive', 'Archives'], ['router', 'Routeur'], ['gauge', 'Jauges'], ['antenna', 'Antenne'], ['conveyor', 'Convoyeur'],
];

const parseNum = (s: string) => Number(s.replace(/\s/g, '').replace(',', '.'));
const show = (v: number, digits = 2) => String(Math.round(v * 10 ** digits) / 10 ** digits).replace('.', ',');

/* ------------------------------------------------------------------ */
/* Numeric field                                                        */
/* ------------------------------------------------------------------ */

export function NumField({
  label, value, min, max, step, unit, onCommit, rangeText, compact,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onCommit: (v: number) => void;
  /** Explains the allowed range when a value is refused. */
  rangeText?: string;
  compact?: boolean;
}) {
  const id = useId();
  const [text, setText] = useState(show(value));
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    setText(show(value));
    setErr(null);
  }, [value]);
  const apply = (v: number) => {
    if (!Number.isFinite(v)) {
      setErr('Nombre attendu');
      return;
    }
    if (v < min - 1e-9 || v > max + 1e-9) {
      setErr(rangeText ?? `Refusé : entre ${show(min)} et ${show(max)}${unit ? ` ${unit}` : ''}`);
      return;
    }
    setErr(null);
    if (Math.abs(v - value) > 1e-9) onCommit(Math.round(v * 1000) / 1000);
    else setText(show(value));
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      apply(parseNum(text));
    } else if (e.key === 'Escape') {
      setText(show(value));
      setErr(null);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const k = (e.key === 'ArrowUp' ? 1 : -1) * step * (e.shiftKey ? 4 : 1);
      apply(Math.round((value + k) / step) * step);
    }
  };
  return (
    <label className={`se-num ${compact ? 'se-num--compact' : ''}`} data-invalid={err ? 'true' : undefined}>
      <span className="se-num__label">{label}</span>
      <span className="se-num__box">
        <input
          className="se-num__input num"
          type="text"
          inputMode="decimal"
          value={text}
          aria-invalid={err ? true : undefined}
          aria-describedby={err ? `${id}-err` : undefined}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => apply(parseNum(text))}
          onKeyDown={onKey}
        />
        {unit && <span className="se-num__unit" aria-hidden>{unit}</span>}
      </span>
      {err && (
        <span id={`${id}-err`} className="se-num__err" role="alert">
          {err}
        </span>
      )}
    </label>
  );
}

function TextField({ label, value, onCommit, placeholder, maxLength = 80 }: { label: string; value: string; onCommit: (v: string) => void; placeholder?: string; maxLength?: number }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  const apply = () => {
    const v = text.trim().slice(0, maxLength);
    if (v !== value) onCommit(v);
  };
  return (
    <label className="se-text">
      <span className="se-num__label">{label}</span>
      <input
        className="se-text__input"
        value={text}
        placeholder={placeholder}
        maxLength={maxLength}
        onChange={(e) => setText(e.target.value)}
        onBlur={apply}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            apply();
          } else if (e.key === 'Escape') setText(value);
        }}
      />
    </label>
  );
}

/* ------------------------------------------------------------------ */
/* Library                                                              */
/* ------------------------------------------------------------------ */

export const LIB_MIME = 'application/x-governor-primitive';

export function LibraryPanel({ onAdd, compact }: { onAdd: (item: LibraryItem) => void; compact?: boolean }) {
  const groups = ['Postes', 'Panneaux', 'Infrastructure', 'Salon et décor'] as const;
  return (
    <div className="se-lib" data-compact={compact || undefined}>
      {groups.map((g) => (
        <section key={g} className="se-lib__group" aria-label={g}>
          <h3 className="se-lib__title">{g}</h3>
          <ul className="se-lib__grid" data-cols={LIBRARY.filter((i) => i.group === g).length <= 2 ? 2 : 3}>
            {LIBRARY.filter((i) => i.group === g).map((item) => (
              <li key={item.key}>
                <button
                  type="button"
                  className="se-lib__item"
                  draggable={!compact}
                  onDragStart={(e) => {
                    e.dataTransfer.setData(LIB_MIME, item.key);
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  onClick={() => onAdd(item)}
                  aria-label={`Ajouter : ${item.label}. ${item.hint}`}
                  title={item.hint}
                >
                  <KindIcon kind={item.icon} size={compact ? 34 : 32} />
                  <span>{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {!compact && <p className="se-lib__note">Cliquer pour ajouter au centre de la vue (place libre la plus proche), ou glisser sur le sol.</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Element list                                                        */
/* ------------------------------------------------------------------ */

export function ElementList({ layout, selectedId, flagged, onSelect, catalog }: { layout: SpatialLayout; selectedId: string | null; flagged: Set<string>; onSelect: (id: string) => void; catalog: Catalog }) {
  const ref = useRef<HTMLUListElement>(null);
  const list = [...layout.primitives].sort((a, b) => Number(isDecor(a.kind)) - Number(isDecor(b.kind)) || a.position.y - b.position.y || a.position.x - b.position.x);
  const onKey = (e: KeyboardEvent<HTMLUListElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End') return;
    const items = [...(ref.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])];
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : Math.max(0, Math.min(items.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)));
    e.preventDefault();
    items[next]?.focus();
  };
  return (
    <ul ref={ref} className="se-elist" aria-label={`Éléments de la pièce (${list.length})`} onKeyDown={onKey}>
      {list.map((p) => (
        <li key={p.id}>
          <button type="button" className="se-elist__row" aria-pressed={p.id === selectedId} onClick={() => onSelect(p.id)}>
            <KindIcon kind={p.kind} size={24} />
            <span className="se-elist__main">
              <b>{p.name}</b>
              <small>{p.binding ? bindingLabel(p, catalog) : kindLabel(p.kind)}</small>
            </span>
            {flagged.has(p.id) && (
              <span className="se-flag" title="Problème signalé">
                <span className="sr-only">Problème signalé</span>
              </span>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Properties of the selection                                         */
/* ------------------------------------------------------------------ */

export interface PropsActions {
  patch: (id: string, patch: Partial<SpatialPrimitive>, label: string) => void;
  moveTo: (id: string, x: number, y: number) => void;
  rotateTo: (id: string, deg: number) => void;
  rebind: (id: string, value: string) => void;
  duplicate: (id: string) => void;
  remove: (id: string) => void;
  focus: (id: string) => void;
}

export function PropsPanel({
  prim, layout, catalog, issues, step, actions, compact,
}: {
  prim: SpatialPrimitive;
  layout: SpatialLayout;
  catalog: Catalog;
  issues: Issue[];
  step: number;
  actions: PropsActions;
  compact?: boolean;
}) {
  const { hx, hy } = halfExtents(prim);
  const W = layout.room.width;
  const D = layout.room.depth;
  const fp = footprint(prim);
  const mine = issues.filter((i) => ('a' in i && i.a === prim.id) || ('b' in i && i.b === prim.id));
  const decor = isDecor(prim.kind);
  const bindValue = prim.binding ? `${prim.binding.kind}:${prim.binding.id}` : '';
  const nodes = catalog.nodes.filter((n) => ['queue', 'provider', 'database', 'mcp', 'connector', 'skill', 'user', 'model'].includes(n.kind));
  return (
    <div className="se-props">
      <div className="se-props__head">
        <span className="se-props__ico">
          <KindIcon kind={prim.kind} size={36} />
        </span>
        <div>
          <h2 className="t-h3">{prim.name}</h2>
          <p className="t-micro t-muted">
            {kindLabel(prim.kind)} · <span className="mono">{prim.id}</span>
          </p>
        </div>
      </div>
      {mine.length > 0 && (
        <ul className="se-props__issues" aria-label="Problèmes de cet élément">
          {mine.map((i) => (
            <li key={i.id}>{i.text}</li>
          ))}
        </ul>
      )}

      <Section title="Position">
        <div className="se-grid2">
          <NumField
            label="X"
            unit="m"
            value={prim.position.x}
            min={Math.min(hx, W / 2)}
            max={Math.max(W - hx, W / 2)}
            step={step}
            rangeText={`Hors de la pièce : X entre ${show(hx)} et ${show(W - hx)} m`}
            onCommit={(v) => actions.moveTo(prim.id, v, prim.position.y)}
          />
          <NumField
            label="Y"
            unit="m"
            value={prim.position.y}
            min={Math.min(hy, D / 2)}
            max={Math.max(D - hy, D / 2)}
            step={step}
            rangeText={`Hors de la pièce : Y entre ${show(hy)} et ${show(D - hy)} m`}
            onCommit={(v) => actions.moveTo(prim.id, prim.position.x, v)}
          />
        </div>
        <div className="se-rot">
          <NumField label="Rotation" unit="°" value={normDeg(prim.rotation.z)} min={-180} max={180} step={15} onCommit={(v) => actions.rotateTo(prim.id, v)} />
          <div className="se-rot__btns" role="group" aria-label="Pivoter">
            <button type="button" className="btn btn--sm btn--icon" onClick={() => actions.rotateTo(prim.id, prim.rotation.z + 15)} aria-label="Pivoter de 15° (Q)" title="Pivoter de 15° (Q)">
              <IcoTurnL />
            </button>
            <button type="button" className="btn btn--sm btn--icon" onClick={() => actions.rotateTo(prim.id, prim.rotation.z - 15)} aria-label="Pivoter de −15° (E)" title="Pivoter de −15° (E)">
              <IcoTurnR />
            </button>
            <button type="button" className="btn btn--sm" onClick={() => actions.rotateTo(prim.id, prim.rotation.z + 90)} aria-label="Pivoter de 90° (Maj + Q)" title="Pivoter de 90° (Maj + Q)">
              90°
            </button>
          </div>
        </div>
      </Section>

      <Section title="Dimensions">
        {isBoard(prim.kind) ? (
          <div className="se-grid2">
            <NumField label="Largeur" unit="m" value={prim.scale.x} min={0.8} max={6} step={0.1} onCommit={(v) => actions.patch(prim.id, { scale: { ...prim.scale, x: v } }, 'Largeur modifiée')} />
            <NumField label="Hauteur" unit="m" value={prim.scale.y} min={0.6} max={3} step={0.1} onCommit={(v) => actions.patch(prim.id, { scale: { ...prim.scale, y: v } }, 'Hauteur modifiée')} />
          </div>
        ) : (
          <NumField label="Échelle" unit="×" value={prim.scale.x} min={0.5} max={2} step={0.05} onCommit={(v) => actions.patch(prim.id, { scale: { x: v, y: v, z: v } }, 'Échelle modifiée')} />
        )}
        <p className="se-hint">
          Emprise au sol : {fmtM(fp.w)} × {fmtM(fp.d)} m
        </p>
      </Section>

      {!decor && (
        <Section title="Liaison">
          <label className="se-text">
            <span className="se-num__label">Représente</span>
            <select className="select se-select" value={bindValue} onChange={(e) => actions.rebind(prim.id, e.target.value)}>
              <option value="">Aucune liaison</option>
              <optgroup label="Départements du catalogue">
                {catalog.departments.map((d) => (
                  <option key={d.id} value={`department:${d.id}`}>
                    {d.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Nœuds système">
                {nodes.map((n) => (
                  <option key={n.id} value={`node:${n.id}`}>
                    {n.label}
                  </option>
                ))}
              </optgroup>
              {prim.binding && !catalog.departments.some((d) => d.id === prim.binding!.id) && !nodes.some((n) => n.id === prim.binding!.id) && (
                <option value={bindValue}>{prim.binding.id} (absent du catalogue)</option>
              )}
            </select>
          </label>
          {prim.kind === 'station' && (
            <label className="se-text">
              <span className="se-num__label">Équipement</span>
              <select className="select se-select" value={prim.equipment ?? 'desk'} onChange={(e) => actions.patch(prim.id, { equipment: e.target.value as EquipmentKind }, 'Équipement modifié')}>
                {EQUIPMENT.map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
          )}
          <p className="se-hint">Les agents se placent au poste du département de leur tâche en cours ; les flux réels relient les postes.</p>
        </Section>
      )}

      <Section title="Étiquette">
        <TextField label="Nom affiché" value={prim.name} onCommit={(v) => actions.patch(prim.id, { name: v || kindLabel(prim.kind) }, 'Étiquette renommée')} />
        {!compact && <TextField label="Sous-titre" value={prim.subtitle ?? ''} placeholder="Facultatif" maxLength={120} onCommit={(v) => actions.patch(prim.id, { subtitle: v || undefined }, 'Sous-titre modifié')} />}
        <label className="se-check">
          <input type="checkbox" checked={prim.label !== false} onChange={(e) => actions.patch(prim.id, { label: e.target.checked ? undefined : false }, e.target.checked ? 'Étiquette affichée' : 'Étiquette masquée')} />
          <span>Afficher l’étiquette dans les vues 3D</span>
        </label>
      </Section>

      <div className="se-props__actions">
        <button type="button" className="btn btn--sm" onClick={() => actions.duplicate(prim.id)} title="Dupliquer (Ctrl + D)">
          <IcoDuplicate /> Dupliquer
        </button>
        <button type="button" className="btn btn--sm" onClick={() => actions.focus(prim.id)} title="Centrer la vue (F)">
          <IcoFocus /> Centrer
        </button>
        <button type="button" className="btn btn--sm btn--danger" onClick={() => actions.remove(prim.id)} title="Supprimer (Suppr)">
          <IcoTrash /> Supprimer
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="se-sec" aria-label={title}>
      <h3 className="se-sec__title">{title}</h3>
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Room                                                                 */
/* ------------------------------------------------------------------ */

export function RoomPanel({
  layout, onRoom, onName, onReset, isCustom, dirty, changes, issuesCount,
}: {
  layout: SpatialLayout;
  onRoom: (patch: Partial<SpatialLayout['room']> & { gridSize?: number }) => string | null;
  onName: (v: string) => void;
  onReset: () => void;
  isCustom: boolean;
  dirty: boolean;
  changes: number;
  issuesCount: number;
}) {
  const [err, setErr] = useState<string | null>(null);
  const tryRoom = (p: Partial<SpatialLayout['room']> & { gridSize?: number }) => setErr(onRoom(p));
  return (
    <div className="se-props">
      <div className="se-props__head">
        <span className="se-props__ico se-props__ico--room" aria-hidden>
          <svg viewBox="0 0 40 40" width={36} height={36}>
            <path d="M20 8 36 16 20 24 4 16Z" fill="var(--se-ico-top)" stroke="var(--c-accent)" strokeWidth={1.4} />
            <path d="M4 16v4l16 8v-4ZM36 16v4l-16 8v-4Z" fill="var(--se-ico-left)" stroke="var(--se-ico-line)" strokeWidth={1} />
          </svg>
        </span>
        <div>
          <h2 className="t-h3">Pièce</h2>
          <p className="t-micro t-muted">Aucun élément sélectionné</p>
        </div>
      </div>
      <Section title="Pièce">
        <TextField label="Nom de l’espace" value={layout.name} onCommit={(v) => onName(v || 'Espace')} />
        <div className="se-grid2">
          <NumField label="Largeur" unit="m" value={layout.room.width} min={6} max={40} step={0.5} onCommit={(v) => tryRoom({ width: v })} />
          <NumField label="Profondeur" unit="m" value={layout.room.depth} min={6} max={40} step={0.5} onCommit={(v) => tryRoom({ depth: v })} />
          <NumField label="Hauteur" unit="m" value={layout.room.height} min={2.2} max={6} step={0.1} onCommit={(v) => tryRoom({ height: v })} />
          <label className="se-text">
            <span className="se-num__label">Grille affichée</span>
            <select className="select se-select" value={String(layout.gridSize)} onChange={(e) => tryRoom({ gridSize: Number(e.target.value) })}>
              <option value="0.25">0,25 m</option>
              <option value="0.5">0,5 m</option>
              <option value="1">1 m</option>
            </select>
          </label>
        </div>
        {err && (
          <p className="se-num__err" role="alert">
            {err}
          </p>
        )}
      </Section>
      <Section title="État">
        <dl className="kv se-kv">
          <dt>Éléments</dt>
          <dd className="num">{layout.primitives.length}</dd>
          <dt>Brouillon</dt>
          <dd>{dirty ? `${changes} modification(s) non publiée(s)` : 'Identique à la disposition publiée'}</dd>
          <dt>Problèmes</dt>
          <dd className="num">{issuesCount}</dd>
          <dt>Disposition publiée</dt>
          <dd>{isCustom ? 'Personnalisée' : 'Par défaut'}</dd>
        </dl>
      </Section>
      <p className="se-hint">Sélectionnez un élément dans la scène, le plan ou la liste pour le modifier. Rien n’est visible dans les autres vues avant « Publier la disposition ».</p>
      <button type="button" className="btn btn--sm btn--ghost se-reset" onClick={onReset}>
        Rétablir la disposition par défaut…
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Journal: problems & changes                                          */
/* ------------------------------------------------------------------ */

export function Journal({
  issues, changes, tab, setTab, onPick, onAddMissing,
}: {
  issues: Issue[];
  changes: Change[];
  tab: 'issues' | 'changes';
  setTab: (t: 'issues' | 'changes') => void;
  onPick: (id: string) => void;
  onAddMissing: (deptId: string) => void;
}) {
  const sev = (i: Issue) => (i.kind === 'overlap' || i.kind === 'outside' || i.kind === 'binding' ? 'error' : 'warn');
  return (
    <div className="se-journal">
      <div className="se-journal__tabs" role="tablist" aria-label="Journal de l’éditeur">
        <button type="button" role="tab" aria-selected={tab === 'issues'} onClick={() => setTab('issues')}>
          Problèmes {issues.length > 0 && <span className="se-count" data-tone={issues.some((i) => sev(i) === 'error') ? 'error' : 'warn'}>{issues.length}</span>}
        </button>
        <button type="button" role="tab" aria-selected={tab === 'changes'} onClick={() => setTab('changes')}>
          Modifications non publiées {changes.length > 0 && <span className="se-count">{changes.length}</span>}
        </button>
      </div>
      <div className="se-journal__body" role="tabpanel">
        {tab === 'issues' ? (
          issues.length === 0 ? (
            <p className="se-journal__empty">Aucun problème : pas de chevauchement, tout est dans la pièce, chaque département a son poste.</p>
          ) : (
            <ul className="se-jlist">
              {issues.map((i) => (
                <li key={i.id} data-sev={sev(i)}>
                  <span className="se-jlist__sev">{sev(i) === 'error' ? 'Erreur' : 'Attention'}</span>
                  <span className="se-jlist__text">{i.text}</span>
                  {'a' in i && (
                    <button type="button" className="btn btn--sm btn--ghost" onClick={() => onPick(i.a)}>
                      Sélectionner
                    </button>
                  )}
                  {i.kind === 'missing' && (
                    <button type="button" className="btn btn--sm btn--ghost" onClick={() => onAddMissing(i.dept)}>
                      Ajouter un poste
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )
        ) : changes.length === 0 ? (
          <p className="se-journal__empty">Le brouillon est identique à la disposition publiée.</p>
        ) : (
          <ul className="se-jlist">
            {changes.map((c) => (
              <li key={c.id} data-verb={c.verb}>
                <span className="se-jlist__verb">{c.verb}</span>
                <span className="se-jlist__text">{c.text}</span>
                {c.target && (
                  <button type="button" className="btn btn--sm btn--ghost" onClick={() => onPick(c.target!)}>
                    Sélectionner
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
