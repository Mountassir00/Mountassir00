/**
 * Éditeur spatial — edits the SHARED spatial layout used by every 3D view
 * (Espace spatial, Bureau 3D, QG 3D).
 *
 *  left    Bibliothèque (click = add at the centre of the view, or drag onto the floor) + list of elements
 *  centre  3D room (bake: false), tools (select / move / rotate), plan / 3-4 view, grid snapping, undo / redo, minimap
 *  right   properties of the selection (x, y, rotation, size, department, label) or of the room
 *  bottom  problems (overlaps, outside the room, departments without a station) and unpublished changes
 *
 * Every edit goes to a local DRAFT (host.setLocal('draft')). Only « Publier la
 * disposition » writes the shared layout (setLayout), never a gesture.
 * Presentation data only: no operational command is involved.
 */
import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type KeyboardEvent as RKeyboardEvent, type ReactNode } from 'react';
import { Dialog, DockLayout, IconClose, IconFit, IconReset, Segmented, type DockSizes } from '@ds';
import { DEFAULT_SPATIAL_LAYOUT, normalizeLayout, useSpatialLayout, type SpatialLayout, type SpatialPrimitive } from '@ds/three';
import { useGovernor, type ExperienceProps } from '@sdk';
import { EditorScene, type CommitMove, type EditorSceneHandle, type Tool, type ViewPreset } from './EditorScene';
import {
  LIBRARY, canon, clampToRoom, diffLayouts, insideRoom, kindLabel, normDeg, placeFree, round2, unboundDepartment, validate, type LibraryItem,
} from './model';
import { ElementList, Journal, LIB_MIME, LibraryPanel, PropsPanel, RoomPanel, type PropsActions } from './Panels';
import { IcoCube, IcoCursor, IcoGrid, IcoLayers, IcoMove, IcoPlan, IcoRedo, IcoRotate, IcoUndo, IcoUpload } from './toolIcons';
import './spatial-editor.css';

/* ---------------- draft + history ---------------- */

interface Hist {
  draft: SpatialLayout;
  past: SpatialLayout[];
  future: SpatialLayout[];
}
type Act = { t: 'edit'; f: (d: SpatialLayout) => SpatialLayout | null } | { t: 'undo' } | { t: 'redo' } | { t: 'replace'; layout: SpatialLayout };

function reducer(s: Hist, a: Act): Hist {
  switch (a.t) {
    case 'edit': {
      const next = a.f(s.draft);
      if (!next || next === s.draft) return s;
      const norm = normalizeLayout(next);
      if (!norm || canon(norm) === canon(s.draft)) return s;
      return { draft: norm, past: [...s.past.slice(-79), s.draft], future: [] };
    }
    case 'undo':
      if (!s.past.length) return s;
      return { draft: s.past[s.past.length - 1], past: s.past.slice(0, -1), future: [s.draft, ...s.future].slice(0, 80) };
    case 'redo':
      if (!s.future.length) return s;
      return { draft: s.future[0], past: [...s.past, s.draft].slice(-80), future: s.future.slice(1) };
    case 'replace':
      return { ...s, draft: a.layout };
  }
}

const mapPrim = (d: SpatialLayout, id: string, f: (p: SpatialPrimitive) => SpatialPrimitive): SpatialLayout => ({ ...d, primitives: d.primitives.map((p) => (p.id === id ? f(p) : p)) });
let seq = 0;
const uid = (kind = 'el') => `${kind}-${Date.now().toString(36)}${(seq++).toString(36)}`;
const TOOL_LABEL: Record<Tool, string> = { select: 'Sélection', move: 'Déplacer', rotate: 'Pivoter' };

export default function SpatialEditor({ host, config, quality, device }: ExperienceProps) {
  const { catalog } = useGovernor();
  const { layout: published, setLayout, resetLayout, isCustom } = useSpatialLayout(host);
  const [hist, dispatch] = useReducer(reducer, null, (): Hist => ({ draft: normalizeLayout(host.getLocal<unknown>('draft', null)) ?? published, past: [], future: [] }));
  const draft = hist.draft;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>(() => host.getLocal<Tool>('tool', 'move'));
  const step = Number(config.gridStep ?? '0.5') || 0.5;
  const [snapOn, setSnapOn] = useState<boolean>(config.snap !== false);
  const [preset, setPreset] = useState<ViewPreset>((config.defaultView as ViewPreset) === 'top' ? 'top' : 'iso');
  const showDims = config.showDims !== false;
  const [tab, setTab] = useState<'issues' | 'changes'>('issues');
  const [confirmReset, setConfirmReset] = useState(false);
  const [publishedAt, setPublishedAt] = useState<number | null>(null);
  const [sheet, setSheet] = useState<null | 'lib' | 'list' | 'issues'>(null);
  const [leftTab, setLeftTab] = useState<'lib' | 'list'>('lib');
  const scene = useRef<EditorSceneHandle | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Studio changes apply live
  useEffect(() => setSnapOn(config.snap !== false), [config.snap]);
  useEffect(() => setPreset((config.defaultView as ViewPreset) === 'top' ? 'top' : 'iso'), [config.defaultView]);

  // narrow container → phone editing (selection + numeric fields + publish)
  const [narrow, setNarrow] = useState(device === 'mobile');
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setNarrow(e.contentRect.width < 640));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const mobile = narrow || device === 'mobile';
  const simplified = mobile || quality.level === 'minimal';

  /* ---------------- published ↔ draft ---------------- */
  const dirty = useMemo(() => canon(draft) !== canon(published), [draft, published]);
  // when the published layout changes elsewhere and the draft had no edits, follow it
  const prevPub = useRef(published);
  useEffect(() => {
    if (prevPub.current === published) return;
    const wasClean = canon(draft) === canon(prevPub.current);
    prevPub.current = published;
    if (wasClean) dispatch({ t: 'replace', layout: published });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [published]);
  // persist the draft (debounced), cleared when identical to the published layout
  useEffect(() => {
    const id = setTimeout(() => host.setLocal('draft', dirty ? draft : null), 400);
    return () => clearTimeout(id);
  }, [draft, dirty, host]);
  useEffect(() => host.setLocal('tool', tool), [tool, host]);

  const validation = useMemo(() => validate(draft, catalog), [draft, catalog]);
  const label = useCallback((p: SpatialPrimitive) => `${p.name}`, []);
  const changes = useMemo(() => (dirty ? diffLayouts(published, draft, label) : []), [dirty, published, draft, label]);
  const selected = draft.primitives.find((p) => p.id === selectedId) ?? null;
  useEffect(() => {
    if (selectedId && !selected) setSelectedId(null);
  }, [selectedId, selected]);

  /* ---------------- operations ---------------- */
  const edit = useCallback((f: (d: SpatialLayout) => SpatialLayout | null, msg?: string) => {
    dispatch({ t: 'edit', f });
    if (msg) host.announce(msg);
  }, [host]);

  const select = useCallback((id: string | null) => {
    setSelectedId(id);
  }, []);

  const commitMove = useCallback((m: CommitMove) => {
    edit((d) => mapPrim(d, m.id, (p) => ({ ...p, position: { ...p.position, x: m.x, y: m.y }, rotation: { ...p.rotation, z: m.rotZ } })));
    const p = draft.primitives.find((x) => x.id === m.id);
    if (p) host.announce(`${p.name} : X ${String(m.x).replace('.', ',')} m, Y ${String(m.y).replace('.', ',')} m, ${Math.round(m.rotZ)}° (brouillon)`);
  }, [edit, draft, host]);

  const actions: PropsActions = useMemo(() => ({
    patch: (id, patch, msg) => edit((d) => mapPrim(d, id, (p) => ({ ...p, ...patch })), msg),
    moveTo: (id, x, y) =>
      edit((d) => mapPrim(d, id, (p) => {
        const c = clampToRoom(d, p, x, y);
        return { ...p, position: { ...p.position, x: round2(c.x), y: round2(c.y) } };
      }), 'Position modifiée (brouillon)'),
    rotateTo: (id, deg) =>
      edit((d) => mapPrim(d, id, (p) => {
        const z = normDeg(deg);
        const q = { ...p, rotation: { ...p.rotation, z } };
        const c = clampToRoom(d, q, p.position.x, p.position.y);
        return { ...q, position: { ...p.position, x: round2(c.x), y: round2(c.y) } };
      }), `Rotation : ${Math.round(normDeg(deg))}°`),
    rebind: (id, value) =>
      edit((d) => mapPrim(d, id, (p) => {
        if (!value) return { ...p, binding: null };
        const [kind, ...rest] = value.split(':');
        const bid = rest.join(':');
        const next: SpatialPrimitive = { ...p, binding: { kind: kind === 'department' ? 'department' : 'node', id: bid } };
        if (kind === 'department') {
          const nd = catalog.departments.find((x) => x.id === bid);
          const od = p.binding?.kind === 'department' ? catalog.departments.find((x) => x.id === p.binding!.id) : undefined;
          // the name follows the department when it was the department's (or the default) name
          if (nd && (!od || p.name === od.name || p.name === kindLabel(p.kind) || p.name === 'Poste')) next.name = nd.name;
          if (nd && p.kind === 'station') next.equipment = nd.equipment[0] ?? p.equipment;
        }
        return next;
      }), 'Liaison modifiée'),
    duplicate: (id) => {
      const src = draft.primitives.find((p) => p.id === id);
      if (!src) return;
      const copy: SpatialPrimitive = { ...src, id: uid(src.kind), position: { ...src.position, x: src.position.x + step * 2, y: src.position.y + step * 2 } };
      if (src.binding?.kind === 'department') {
        const d = unboundDepartment(draft, catalog);
        copy.binding = d ? { kind: 'department', id: d.id } : null;
        copy.name = d ? d.name : `${src.name} (copie)`;
        if (d && src.kind === 'station') copy.equipment = d.equipment[0] ?? src.equipment;
      } else copy.name = src.label === false ? src.name : `${src.name} (copie)`;
      const [placed] = placeFree(draft, [copy], step);
      edit((d) => ({ ...d, primitives: [...d.primitives, placed] }), `Dupliqué : ${placed.name}`);
      setSelectedId(placed.id);
    },
    remove: (id) => {
      const p = draft.primitives.find((x) => x.id === id);
      edit((d) => ({ ...d, primitives: d.primitives.filter((x) => x.id !== id) }), p ? `Supprimé : ${p.name} (Ctrl + Z pour annuler)` : undefined);
      setSelectedId(null);
    },
    focus: (id) => scene.current?.focus(id),
  }), [edit, draft, catalog, step]);

  const add = useCallback((item: LibraryItem, at?: { x: number; y: number } | null) => {
    const anchor = at ?? scene.current?.viewCenter() ?? { x: draft.room.width / 2, y: draft.room.depth / 2 };
    const made = item.make({ at: anchor, catalog, layout: draft, uid: () => uid(item.key) });
    const placed = placeFree(draft, made, step);
    edit((d) => ({ ...d, primitives: [...d.primitives, ...placed] }), `Ajouté : ${item.label} en X ${String(placed[0].position.x).replace('.', ',')} m, Y ${String(placed[0].position.y).replace('.', ',')} m (brouillon)`);
    setSelectedId(placed[0].id);
    setSheet(null);
  }, [draft, catalog, step, edit]);

  const addMissing = useCallback((deptId: string) => {
    const d = catalog.departments.find((x) => x.id === deptId);
    if (!d) return;
    const anchor = scene.current?.viewCenter() ?? { x: draft.room.width / 2, y: draft.room.depth / 2 };
    const prim: SpatialPrimitive = {
      id: uid('station'), kind: 'station', name: d.name, position: { x: anchor.x, y: anchor.y, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 },
      material: 'auto', opacity: 1, edgeGlow: null, binding: { kind: 'department', id: d.id }, equipment: d.equipment[0] ?? 'desk',
    };
    const [placed] = placeFree(draft, [prim], step);
    edit((x) => ({ ...x, primitives: [...x.primitives, placed] }), `Poste ajouté pour ${d.name}`);
    setSelectedId(placed.id);
  }, [catalog, draft, step, edit]);

  const nudge = useCallback((dx: number, dy: number, big: boolean) => {
    if (!selected) return;
    const k = step * (big ? 4 : 1);
    const c = clampToRoom(draft, selected, selected.position.x + dx * k, selected.position.y + dy * k);
    edit((d) => mapPrim(d, selected.id, (p) => ({ ...p, position: { ...p.position, x: round2(c.x), y: round2(c.y) } })), `${selected.name} : X ${String(round2(c.x)).replace('.', ',')}, Y ${String(round2(c.y)).replace('.', ',')}${c.clamped ? ' (bord de la pièce)' : ''}`);
  }, [selected, step, draft, edit]);

  const onRoom = useCallback((patch: Partial<SpatialLayout['room']> & { gridSize?: number }): string | null => {
    const { gridSize, ...room } = patch;
    const next: SpatialLayout = { ...draft, gridSize: gridSize ?? draft.gridSize, room: { ...draft.room, ...room } };
    const out = draft.primitives.filter((p) => insideRoom(draft, p) && !insideRoom(next, p));
    if (out.length) return `Refusé : ${out.length} élément(s) sortiraient de la pièce (${out.slice(0, 3).map((p) => p.name).join(', ')}${out.length > 3 ? '…' : ''}). Déplacez-les d’abord.`;
    edit(() => next, 'Pièce modifiée');
    return null;
  }, [draft, edit]);

  const undo = useCallback(() => {
    if (!hist.past.length) return;
    dispatch({ t: 'undo' });
    host.announce('Annulé');
  }, [hist.past.length, host]);
  const redo = useCallback(() => {
    if (!hist.future.length) return;
    dispatch({ t: 'redo' });
    host.announce('Rétabli');
  }, [hist.future.length, host]);

  const publish = useCallback(() => {
    if (!dirty) return;
    setLayout(draft);
    setPublishedAt(Date.now());
    host.setLocal('draft', null);
    host.announce(`Disposition publiée : ${changes.length} modification(s) visibles dans l’Espace spatial, le Bureau 3D et le QG 3D.`);
  }, [dirty, draft, setLayout, host, changes.length]);
  const revert = useCallback(() => {
    edit(() => published, 'Modifications annulées : retour à la disposition publiée (Ctrl + Z pour retrouver le brouillon)');
  }, [edit, published]);
  const doReset = useCallback(() => {
    setConfirmReset(false);
    resetLayout();
    edit(() => DEFAULT_SPATIAL_LAYOUT);
    setSelectedId(null);
    setPublishedAt(Date.now());
    host.setLocal('draft', null);
    host.announce('Disposition par défaut rétablie et publiée dans toutes les vues 3D.');
  }, [resetLayout, edit, host]);
  const togglePreset = useCallback(() => setPreset((p) => (p === 'top' ? 'iso' : 'top')), []);

  /* ---------------- keyboard ---------------- */
  const K = useRef({ undo, redo, actions, selected, nudge, togglePreset });
  K.current = { undo, redo, actions, selected, nudge, togglePreset };
  const onKeyDown = (e: RKeyboardEvent) => {
    const t = e.target as HTMLElement;
    const typing = !!t.closest('input, textarea, select, [contenteditable="true"]');
    const mod = e.ctrlKey || e.metaKey;
    const k = e.key.toLowerCase();
    if (mod && k === 'z' && !typing) {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
      return;
    }
    if (mod && k === 'y' && !typing) {
      e.preventDefault();
      redo();
      return;
    }
    if (typing || e.altKey) return;
    if (mod && k === 'd' && selected) {
      e.preventDefault();
      actions.duplicate(selected.id);
      return;
    }
    if (mod) return;
    if (t.closest('[role="dialog"]')) return;
    // keys handled here are marked (preventDefault) so the shell's global shortcuts skip them
    const done = () => e.preventDefault();
    switch (k) {
      case 'delete':
      case 'backspace':
        if (selected) {
          done();
          actions.remove(selected.id);
        }
        break;
      case 'q':
      case 'e':
        if (selected) {
          done();
          actions.rotateTo(selected.id, selected.rotation.z + (k === 'q' ? 1 : -1) * (e.shiftKey ? 90 : 15));
        }
        break;
      case 'v':
        done();
        setTool('select');
        host.announce('Outil Sélection');
        break;
      case 'm':
        done();
        setTool('move');
        host.announce('Outil Déplacer');
        break;
      case 'r':
        done();
        setTool('rotate');
        host.announce('Outil Pivoter');
        break;
      case 's':
        done();
        setSnapOn((v) => {
          host.announce(v ? 'Aimantation désactivée' : 'Aimantation activée');
          return !v;
        });
        break;
      case 't':
        done();
        togglePreset();
        break;
      case 'f':
        done();
        if (selected) scene.current?.focus(selected.id);
        else scene.current?.fit();
        break;
      case 'escape':
        if (selected) {
          done();
          setSelectedId(null);
          host.announce('Sélection retirée');
        }
        break;
    }
  };
  // arrows on the canvas move the selection (capture: before the camera rig pans)
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (!t.classList?.contains('t3-canvas') || !K.current.selected || e.shiftKey || e.ctrlKey || e.metaKey) return;
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      e.preventDefault();
      e.stopPropagation();
      const dir = scene.current?.arrowToPlan(e.key) ?? { dx: 0, dy: 0 };
      K.current.nudge(dir.dx, dir.dy, e.altKey);
    };
    el.addEventListener('keydown', onKey, true);
    return () => el.removeEventListener('keydown', onKey, true);
  }, [mobile]);

  /* ---------------- command palette ---------------- */
  const C = useRef({ publish, revert, add, fit: () => scene.current?.fit(), togglePreset, reset: () => setConfirmReset(true) });
  C.current = { publish, revert, add, fit: () => scene.current?.fit(), togglePreset, reset: () => setConfirmReset(true) };
  useEffect(
    () =>
      host.provideCommands([
        { id: 'publish', label: 'Publier la disposition', keyword: 'spatial:publier', run: () => C.current.publish() },
        { id: 'revert', label: 'Annuler les modifications du brouillon', keyword: 'spatial:annuler', run: () => C.current.revert() },
        { id: 'add-station', label: 'Ajouter un poste de département', keyword: 'spatial:ajouter', run: () => C.current.add(LIBRARY[0]) },
        { id: 'fit', label: 'Recadrer la vue', keyword: 'vue:recadrer', run: () => C.current.fit() },
        { id: 'plan', label: 'Basculer vue plan / 3-4', keyword: 'vue:plan', run: () => C.current.togglePreset() },
        { id: 'reset', label: 'Rétablir la disposition par défaut…', keyword: 'spatial:défaut', run: () => C.current.reset() },
      ]),
    [host],
  );

  /* ---------------- pieces ---------------- */
  const issues = validation.issues;
  const errors = issues.filter((i) => i.kind === 'overlap' || i.kind === 'outside' || i.kind === 'binding').length;
  const pickFromJournal = (id: string) => {
    setSelectedId(id);
    scene.current?.focus(id);
    setSheet(null);
  };
  const status = (
    <span className="se-pub__state" data-state={dirty ? 'draft' : 'published'}>
      <i aria-hidden />
      {dirty ? 'Brouillon non publié' : 'Publié'}
    </span>
  );
  const meta = dirty
    ? `${changes.length} modification${changes.length > 1 ? 's' : ''}`
    : publishedAt
      ? `à ${new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(publishedAt)}`
      : isCustom
        ? 'disposition personnalisée'
        : 'disposition par défaut';

  const sceneEl = (
    <EditorScene
      layout={draft}
      catalog={catalog}
      quality={quality}
      simplified={simplified}
      selectedId={selected?.id ?? null}
      flagged={validation.flagged}
      tool={tool}
      snapStep={step}
      snapOn={snapOn}
      showDims={showDims}
      preset={preset}
      showLabels
      onSelect={select}
      onCommit={commitMove}
      handleRef={scene}
      rootRef={rootRef}
    />
  );
  const summary = `Éditeur de disposition. Pièce ${draft.room.width} × ${draft.room.depth} m, ${draft.primitives.length} éléments. ${dirty ? `Brouillon non publié : ${changes.length} modification(s).` : 'Identique à la disposition publiée.'} ${issues.length} problème(s)${errors ? ` dont ${errors} erreur(s)` : ''}. ${selected ? `Sélection : ${selected.name}, X ${selected.position.x} m, Y ${selected.position.y} m, rotation ${Math.round(selected.rotation.z)}°.` : 'Aucune sélection.'} Outil : ${TOOL_LABEL[tool]}.`;

  const resetDialog = confirmReset && (
    <Dialog title="Rétablir la disposition par défaut ?" onClose={() => setConfirmReset(false)}>
      <p className="t-small">
        L’espace d’origine (18 × 14 m, {DEFAULT_SPATIAL_LAYOUT.primitives.length} éléments) sera publié immédiatement et remplacera la disposition actuelle dans l’Espace spatial, le Bureau 3D et le QG 3D.
      </p>
      <p className="t-small t-muted">Votre brouillon reste récupérable avec Ctrl + Z tant que l’éditeur est ouvert.</p>
      <div className="se-dialog__actions">
        <button type="button" className="btn" onClick={() => setConfirmReset(false)}>
          Annuler
        </button>
        <button type="button" className="btn btn--danger" onClick={doReset}>
          Rétablir et publier
        </button>
      </div>
    </Dialog>
  );

  /* ---------------- phone ---------------- */
  if (mobile) {
    return (
      <div ref={rootRef} className="se se--mobile" onKeyDown={onKeyDown}>
        <div className="se-center">{sceneEl}</div>
        <div className="se-mbar se-avoid">
          <div className="se-mbar__status">
            {status}
            <small>
              {meta}
              {issues.length ? ` · ${issues.length} problème${issues.length > 1 ? 's' : ''}` : ''}
            </small>
          </div>
          <button type="button" className="btn btn--sm btn--icon btn--ghost" onClick={undo} disabled={!hist.past.length} aria-label="Annuler (Ctrl + Z)">
            <IcoUndo />
          </button>
          <button type="button" className="btn btn--sm btn--primary" disabled={!dirty} onClick={publish}>
            Publier
          </button>
        </div>
        {selected ? (
          <Sheet title={selected.name} onClose={() => setSelectedId(null)} closeLabel="Fermer la fiche et désélectionner">
            <PropsPanel prim={selected} layout={draft} catalog={catalog} issues={issues} step={step} actions={actions} compact />
            <div className="se-nudge" role="group" aria-label="Déplacer d’un pas de grille">
              <button type="button" className="btn btn--sm" onClick={() => nudge(-1, 0, false)} aria-label="Vers la gauche du plan (X −)">X −</button>
              <button type="button" className="btn btn--sm" onClick={() => nudge(1, 0, false)} aria-label="Vers la droite du plan (X +)">X +</button>
              <button type="button" className="btn btn--sm" onClick={() => nudge(0, -1, false)} aria-label="Vers le fond (Y −)">Y −</button>
              <button type="button" className="btn btn--sm" onClick={() => nudge(0, 1, false)} aria-label="Vers l’avant (Y +)">Y +</button>
            </div>
          </Sheet>
        ) : sheet ? (
          <Sheet title={sheet === 'lib' ? 'Bibliothèque' : sheet === 'list' ? `Éléments (${draft.primitives.length})` : 'Problèmes et modifications'} onClose={() => setSheet(null)}>
            {sheet === 'lib' && <LibraryPanel onAdd={(i) => add(i)} compact />}
            {sheet === 'list' && <ElementList layout={draft} selectedId={null} flagged={validation.flagged} catalog={catalog} onSelect={(id) => pickFromJournal(id)} />}
            {sheet === 'issues' && <Journal issues={issues} changes={changes} tab={tab} setTab={setTab} onPick={pickFromJournal} onAddMissing={addMissing} />}
          </Sheet>
        ) : (
          <div className="se-mdock se-avoid" role="toolbar" aria-label="Éditeur">
            <button type="button" className="se-mdock__btn" onClick={() => setSheet('lib')}>
              <IcoCube size={18} />
              Ajouter
            </button>
            <button type="button" className="se-mdock__btn" onClick={() => setSheet('list')}>
              <IcoLayers size={18} />
              Éléments
            </button>
            <button type="button" className="se-mdock__btn" onClick={() => setSheet('issues')}>
              <span className="se-mdock__count" data-tone={errors ? 'error' : issues.length ? 'warn' : 'ok'}>{issues.length}</span>
              Problèmes
            </button>
            <button type="button" className="se-mdock__btn" disabled={!dirty} onClick={revert} aria-label="Annuler les modifications (revenir à la disposition publiée)">
              <IcoRedo size={18} style={{ transform: 'scaleX(-1)' }} />
              Annuler
            </button>
          </div>
        )}
        {!selected && !sheet && <p className="se-mnote">Sur téléphone : toucher un élément, puis régler sa position et sa rotation dans la fiche. Glisser-déposer sur ordinateur.</p>}
        <p className="sr-only">{summary}</p>
        {resetDialog}
      </div>
    );
  }

  /* ---------------- desktop / tablet ---------------- */
  const sizes = host.getLocal<Partial<DockSizes>>('dock', {});
  return (
    <div ref={rootRef} className="se" onKeyDown={onKeyDown}>
      <DockLayout
        className="se-dock"
        sizes={sizes}
        onSizes={(s) => queueMicrotask(() => host.setLocal('dock', s))}
        centerLabel="Scène"
        left={{
          id: 'library',
          label: 'Bibliothèque',
          size: 236,
          content: (
            <div className="se-left">
              <Segmented
                className="se-left__seg"
                size="sm"
                label="Contenu du panneau"
                value={leftTab}
                onChange={setLeftTab}
                options={[
                  { value: 'lib', label: 'Ajouter' },
                  { value: 'list', label: `Éléments · ${draft.primitives.length}` },
                ]}
              />
              {leftTab === 'lib' ? (
                <LibraryPanel onAdd={(i) => add(i)} />
              ) : (
                <ElementList layout={draft} selectedId={selected?.id ?? null} flagged={validation.flagged} catalog={catalog} onSelect={(id) => { setSelectedId(id); scene.current?.focus(id); }} />
              )}
            </div>
          ),
        }}
        right={{
          id: 'props',
          label: 'Propriétés',
          size: 292,
          content: selected ? (
            <PropsPanel prim={selected} layout={draft} catalog={catalog} issues={issues} step={step} actions={actions} />
          ) : (
            <RoomPanel layout={draft} onRoom={onRoom} onName={(v) => edit((d) => ({ ...d, name: v }), 'Nom de l’espace modifié')} onReset={() => setConfirmReset(true)} isCustom={isCustom} dirty={dirty} changes={changes.length} issuesCount={issues.length} />
          ),
        }}
        bottom={{
          id: 'journal',
          label: 'Journal',
          size: 138,
          content: <Journal issues={issues} changes={changes} tab={tab} setTab={setTab} onPick={pickFromJournal} onAddMissing={addMissing} />,
        }}
        center={
          <div
            className="se-center"
            onDragOver={(e) => {
              if (e.dataTransfer.types.includes(LIB_MIME)) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
              }
            }}
            onDrop={(e) => {
              const key = e.dataTransfer.getData(LIB_MIME);
              const item = LIBRARY.find((i) => i.key === key);
              if (!item) return;
              e.preventDefault();
              add(item, scene.current?.planAt(e.clientX, e.clientY));
            }}
          >
            {sceneEl}
            <div className="se-pub se-avoid" role="region" aria-label="Publication">
              <div className="se-pub__info">
                {status}
                <small>
                  {meta}
                  {issues.length ? (
                    <button type="button" className="se-pub__issues" data-tone={errors ? 'error' : 'warn'} onClick={() => setTab('issues')}>
                      {issues.length} problème{issues.length > 1 ? 's' : ''}
                    </button>
                  ) : null}
                </small>
              </div>
              <div className="se-pub__actions">
                <button type="button" className="btn btn--sm btn--ghost" disabled={!dirty} onClick={revert}>
                  Annuler les modifications
                </button>
                <button type="button" className="btn btn--sm btn--primary" disabled={!dirty} onClick={publish}>
                  <IcoUpload size={15} /> Publier la disposition
                </button>
                <button type="button" className="btn btn--sm btn--icon btn--ghost" onClick={() => setConfirmReset(true)} aria-label="Rétablir la disposition par défaut…" title="Rétablir la disposition par défaut…">
                  <IconReset size={15} />
                </button>
              </div>
            </div>
            <Toolbar
              tool={tool}
              setTool={(t) => setTool(t)}
              preset={preset}
              togglePreset={togglePreset}
              snapOn={snapOn}
              setSnapOn={setSnapOn}
              step={step}
              canUndo={hist.past.length > 0}
              canRedo={hist.future.length > 0}
              undo={undo}
              redo={redo}
              fit={() => scene.current?.fit()}
            />
          </div>
        }
      />
      <p className="sr-only">{summary}</p>
      {resetDialog}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Toolbar({
  tool, setTool, preset, togglePreset, snapOn, setSnapOn, step, canUndo, canRedo, undo, redo, fit,
}: {
  tool: Tool;
  setTool: (t: Tool) => void;
  preset: ViewPreset;
  togglePreset: () => void;
  snapOn: boolean;
  setSnapOn: (v: boolean) => void;
  step: number;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  fit: () => void;
}) {
  const tools: Array<[Tool, string, string, ReactNode]> = [
    ['select', 'Sélection', 'V', <IcoCursor key="s" />],
    ['move', 'Déplacer', 'M', <IcoMove key="m" />],
    ['rotate', 'Pivoter', 'R', <IcoRotate key="r" />],
  ];
  return (
    <div className="se-toolbar se-avoid" role="toolbar" aria-label="Outils de l’éditeur">
      <div className="se-toolbar__group" role="radiogroup" aria-label="Outil actif">
        {tools.map(([id, l, key, icon]) => (
          <button key={id} type="button" role="radio" aria-checked={tool === id} className="se-tool" onClick={() => setTool(id)} title={`${l} (${key})`} aria-label={`${l} (${key})`}>
            {icon}
          </button>
        ))}
      </div>
      <span className="se-toolbar__sep" aria-hidden />
      <button type="button" className="se-tool" aria-pressed={preset === 'top'} onClick={togglePreset} title={preset === 'top' ? 'Vue 3/4 (T)' : 'Vue plan (T)'} aria-label={preset === 'top' ? 'Passer en vue 3/4 (T)' : 'Passer en vue plan (T)'}>
        {preset === 'top' ? <IcoCube /> : <IcoPlan />}
      </button>
      <button type="button" className="se-tool se-tool--text" aria-pressed={snapOn} onClick={() => setSnapOn(!snapOn)} title="Aimanter à la grille (S)" aria-label={`Aimanter à la grille de ${String(step).replace('.', ',')} m (S)`}>
        <IcoGrid />
        <span>{String(step).replace('.', ',')} m</span>
      </button>
      <span className="se-toolbar__sep" aria-hidden />
      <button type="button" className="se-tool" onClick={undo} disabled={!canUndo} title="Annuler (Ctrl + Z)" aria-label="Annuler (Ctrl + Z)">
        <IcoUndo />
      </button>
      <button type="button" className="se-tool" onClick={redo} disabled={!canRedo} title="Rétablir (Ctrl + Maj + Z)" aria-label="Rétablir (Ctrl + Maj + Z)">
        <IcoRedo />
      </button>
      <button type="button" className="se-tool" onClick={fit} title="Recadrer (F)" aria-label="Recadrer la vue (F)">
        <IconFit size={16} />
      </button>
    </div>
  );
}

function Sheet({ title, onClose, children, closeLabel }: { title: string; onClose: () => void; children: ReactNode; closeLabel?: string }) {
  return (
    <section className="se-sheet se-avoid" role="dialog" aria-label={title}>
      <div className="se-sheet__grip" aria-hidden />
      <header className="se-sheet__head">
        <h2 className="t-h3">{title}</h2>
        <button type="button" className="btn btn--sm btn--icon btn--ghost" onClick={onClose} aria-label={closeLabel ?? `Fermer : ${title}`}>
          <IconClose size={14} />
        </button>
      </header>
      <div className="se-sheet__body">{children}</div>
    </section>
  );
}
