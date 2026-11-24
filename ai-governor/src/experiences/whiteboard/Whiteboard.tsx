/**
 * Tableau blanc — infinite canvas mixing frames generated from the real data
 * (read-only, refreshed live) and the user's own objects (post-it, shapes,
 * arrows, text, comments). The board is presentation data: it is persisted
 * with host.setLocal and never triggers an operational command. The
 * "Assistance" panel only runs local, deterministic computations.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type FocusEvent as RFE, type KeyboardEvent as RKE, type MouseEvent as RME, type PointerEvent as RPE } from 'react';
import { fmtTime, useCatalogIndex, useGovernor, type ExperienceProps, type PeriodPreset } from '@sdk';
import { IconFit, IconMinimap, IconZoomIn, IconZoomOut } from '@ds';
import {
  arrange, boardBounds, boxOf, DEFAULT_DOC, DEFAULT_FRAMES, duplicate, emptyBoard, FRAME_IDS, FRAME_TITLE, frameKey, frameOf, intersects, isBox, isFrameKey,
  MIN_SIZE, newId, removeIds, resizeBox, sanitizeBoard, setBox, translate, unionBox,
  type Arrange, type Board, type Box, type Corner, type StickyColor, type Tool, type UserObj,
} from './model';
import { cycleCounts, linkedAgentIds, natureOfEvents, pendingDecisions, recoItems, routing, summarize, type BoardSummary } from './data';
import { CycleFrame, DecisionsFrame, DocFrame, RecosFrame, RISK_COLOR, RoutingFrame, type FrameMeta } from './frames';
import { BoxObjectView, kindLabel, LineLayer, SelectionOverlay, type Ghost } from './objects';
import { AssistPanel, type Activity, type LinkedAgent, type SelectedInfo } from './Panel';
import { GArrow, GComment, GHand, GPanel, GPen, GRect, GRedo, GSelect, GSticky, GText, GUndo } from './glyphs';
import './whiteboard.css';

type View = { x: number; y: number; k: number };

type Op =
  | { kind: 'pan'; sx: number; sy: number; v0: View }
  | { kind: 'pinch'; d: number; cx: number; cy: number; v0: View }
  | { kind: 'move'; sx: number; sy: number; wx: number; wy: number; ids: Set<string>; base: Board; moved: boolean; clickId: string | null }
  | { kind: 'resize'; id: string; corner: Corner; wx: number; wy: number; box0: Box; base: Board; min: { w: number; h: number } }
  | { kind: 'rect'; wx: number; wy: number }
  | { kind: 'arrow'; wx: number; wy: number; from?: string }
  | { kind: 'pen'; pts: number[] }
  | { kind: 'marquee'; wx: number; wy: number; base: Set<string> };

const TOOLS: Array<{ id: Tool; label: string; key: string; G: typeof GSelect }> = [
  { id: 'select', label: 'Sélection', key: 'V', G: GSelect },
  { id: 'hand', label: 'Main', key: 'H', G: GHand },
  { id: 'rect', label: 'Rectangle', key: 'R', G: GRect },
  { id: 'arrow', label: 'Crayon / flèche', key: 'P', G: GArrow },
  { id: 'text', label: 'Texte', key: 'T', G: GText },
  { id: 'sticky', label: 'Post-it', key: 'N', G: GSticky },
  { id: 'comment', label: 'Commentaire', key: 'C', G: GComment },
];
const TOOL_BY_KEY: Record<string, Tool> = { v: 'select', h: 'hand', r: 'rect', p: 'arrow', t: 'text', n: 'sticky', c: 'comment' };

const PERIOD_PHRASE: Record<PeriodPreset, string> = {
  live: 'les 15 dernières minutes',
  '1h': 'la dernière heure',
  '24h': 'les dernières 24 h',
  '7d': 'les 7 derniers jours',
  '30d': 'les 30 derniers jours',
  custom: 'la période choisie',
};

const BOARD_NAME = 'Tableau de gouvernance';
const clampK = (k: number) => Math.max(0.12, Math.min(4, k));
const isView = (v: unknown): v is View => !!v && typeof v === 'object' && ['x', 'y', 'k'].every((k) => Number.isFinite((v as Record<string, unknown>)[k]));

export default function Whiteboard({ host, config, device }: ExperienceProps) {
  const g = useGovernor();
  const idx = useCatalogIndex();
  const mobile = device === 'mobile';
  const showFrames = config.showFrames !== false;
  const gridStyle = config.grid === 'lines' || config.grid === 'none' ? (config.grid as string) : 'dots';
  const palette = config.palette === 'vivid' ? 'vivid' : 'pastel';
  const live = g.mode === 'live';

  /* ---------------- board + history ---------------- */
  const [board, setBoard] = useState<Board>(() => sanitizeBoard(host.getLocal<unknown>('board', null)));
  const boardRef = useRef(board);
  const hist = useRef<{ past: Board[]; future: Board[]; tag?: string; ts: number }>({ past: [], future: [], ts: 0 });
  const [, setHistTick] = useState(0);
  const [draft, setDraftState] = useState<Board | null>(null);
  const draftRef = useRef<Board | null>(null);
  const setDraft = useCallback((d: Board | null) => {
    draftRef.current = d;
    setDraftState(d);
  }, []);
  const shown = draft ?? board;
  const [sel, setSelState] = useState<Set<string>>(() => new Set());
  const selRef = useRef(sel);
  const setSel = useCallback((s: Set<string>) => {
    selRef.current = s;
    setSelState(s);
  }, []);
  const [editing, setEditing] = useState<string | null>(null);
  const [docEditing, setDocEditing] = useState(false);
  const [tool, setToolState] = useState<Tool>('select');
  const toolRef = useRef<Tool>('select');
  const [penMode, setPenMode] = useState<'arrow' | 'free'>('arrow');
  const penRef = useRef<'arrow' | 'free'>('arrow');
  const [stickyColor, setStickyColor] = useState<StickyColor>('yellow');
  const [ghost, setGhost] = useState<Ghost | null>(null);
  const [space, setSpace] = useState(false);
  const spaceRef = useRef(false);
  const [panning, setPanning] = useState(false);

  const activityRef = useRef<Activity[]>(sanitizeActivity(host.getLocal<unknown>('activity', [])));
  const [activity, setActivity] = useState<Activity[]>(activityRef.current);
  const log = useCallback(
    (text: string) => {
      const next = [{ ts: Date.now(), text }, ...activityRef.current].slice(0, 20);
      activityRef.current = next;
      setActivity(next);
      host.setLocal('activity', next);
    },
    [host],
  );

  const persist = useCallback((next: Board) => host.setLocal('board', next), [host]);

  /** Applies a change as one undoable step (`tag` coalesces quick repeats such as nudges). */
  const commit = useCallback(
    (next: Board, label: string, tag?: string) => {
      const h = hist.current;
      const now = Date.now();
      if (!(tag && h.tag === tag && now - h.ts < 900)) {
        h.past.push(boardRef.current);
        if (h.past.length > 80) h.past.shift();
        if (label) log(label);
      }
      h.future = [];
      h.tag = tag;
      h.ts = now;
      boardRef.current = next;
      setBoard(next);
      setDraft(null);
      persist(next);
      setHistTick((t) => t + 1);
    },
    [log, persist, setDraft],
  );

  const restore = (next: Board, label: string) => {
    boardRef.current = next;
    setBoard(next);
    setDraft(null);
    persist(next);
    setSel(new Set([...selRef.current].filter((id) => boxOf(next, id) || next.objects.some((o) => o.id === id))));
    setHistTick((t) => t + 1);
    log(label);
    host.announce(label);
  };
  const undo = () => {
    const h = hist.current;
    const prev = h.past.pop();
    if (!prev) return;
    h.future.push(boardRef.current);
    h.tag = undefined;
    restore(prev, 'Modification annulée');
  };
  const redo = () => {
    const h = hist.current;
    const next = h.future.pop();
    if (!next) return;
    h.past.push(boardRef.current);
    h.tag = undefined;
    restore(next, 'Modification rétablie');
  };

  const setTool = (t: Tool) => {
    toolRef.current = t;
    setToolState(t);
  };
  const choosePen = (m: 'arrow' | 'free') => {
    penRef.current = m;
    setPenMode(m);
  };

  /* ---------------- document ---------------- */
  const [doc, setDoc] = useState<string>(() => {
    const v = host.getLocal<unknown>('doc', DEFAULT_DOC);
    return typeof v === 'string' ? v.slice(0, 20_000) : DEFAULT_DOC;
  });
  const docTimer = useRef<number | undefined>(undefined);
  const docLogged = useRef(0);
  const onDocChange = useCallback(
    (t: string) => {
      setDoc(t);
      window.clearTimeout(docTimer.current);
      docTimer.current = window.setTimeout(() => host.setLocal('doc', t), 400);
      if (Date.now() - docLogged.current > 60_000) {
        docLogged.current = Date.now();
        log('Document modifié');
      }
    },
    [host, log],
  );
  useEffect(() => () => window.clearTimeout(docTimer.current), []);

  /* ---------------- view ---------------- */
  const root = useRef<HTMLDivElement>(null);
  const vp = useRef<HTMLDivElement>(null);
  const viewKey = `view-${device}`;
  const savedView = useRef<View | null>((() => {
    const v = host.getLocal<unknown>(viewKey, null);
    return isView(v) ? { x: v.x, y: v.y, k: clampK(v.k) } : null;
  })());
  const [view, setViewState] = useState<View>(savedView.current ?? { x: 40, y: 80, k: 0.7 });
  const viewRef = useRef(view);
  const sizeRef = useRef({ w: 800, h: 600 });
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [rootW, setRootW] = useState(1200);
  const viewTimer = useRef<number | undefined>(undefined);
  const setView = useCallback(
    (v: View) => {
      viewRef.current = v;
      setViewState(v);
      window.clearTimeout(viewTimer.current);
      viewTimer.current = window.setTimeout(() => host.setLocal(viewKey, viewRef.current), 700);
    },
    [host, viewKey],
  );
  useEffect(() => () => window.clearTimeout(viewTimer.current), []);

  const zoomAt = useCallback(
    (f: number, px: number, py: number) => {
      const v = viewRef.current;
      const k = clampK(v.k * f);
      const r = k / v.k;
      setView({ k, x: px - (px - v.x) * r, y: py - (py - v.y) * r });
    },
    [setView],
  );
  const zoomBy = (f: number) => zoomAt(f, sizeRef.current.w / 2, sizeRef.current.h / 2);

  const insets = useCallback(() => (mobile ? { top: 64, bottom: 84, left: 12, right: 12 } : { top: 72, bottom: 64, left: rootW >= 1000 ? 200 : 80, right: 24 }), [mobile, rootW]);

  const fitBox = useCallback(
    (b: Box, maxK = 1.1) => {
      const { w, h } = sizeRef.current;
      const ins = insets();
      const aw = Math.max(120, w - ins.left - ins.right);
      const ah = Math.max(120, h - ins.top - ins.bottom);
      const k = clampK(Math.min(aw / b.w, ah / b.h, maxK));
      setView({ k, x: ins.left + (aw - b.w * k) / 2 - b.x * k, y: ins.top + (ah - b.h * k) / 2 - b.y * k });
    },
    [insets, setView],
  );
  const fit = useCallback(() => {
    const b = boardBounds(boardRef.current, showFrames) ?? { x: 0, y: 0, w: 1200, h: 700 };
    fitBox(b);
  }, [fitBox, showFrames]);
  /** First view: fit, but never below a readable zoom (content then starts at the top-left). */
  const initialView = useCallback(() => {
    const b = boardBounds(boardRef.current, showFrames) ?? { x: 0, y: 0, w: 1200, h: 700 };
    const { w, h } = sizeRef.current;
    const ins = insets();
    const aw = Math.max(120, w - ins.left - ins.right);
    const ah = Math.max(120, h - ins.top - ins.bottom);
    const kFit = Math.min(aw / b.w, ah / b.h, 1);
    const k = clampK(Math.max(kFit, mobile ? 0.5 : 0.66));
    setView({
      k,
      x: ins.left - b.x * k + (b.w * k < aw ? (aw - b.w * k) / 2 : 0),
      y: ins.top - b.y * k + (b.h * k < ah ? (ah - b.h * k) / 2 : 0),
    });
  }, [insets, setView, showFrames, mobile]);

  const fitted = useRef(!!savedView.current);
  useLayoutEffect(() => {
    const el = vp.current;
    const r = root.current;
    if (!el || !r) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (!w || !h) return;
      sizeRef.current = { w, h };
      setSize({ w, h });
      setRootW(r.clientWidth);
      if (!fitted.current) {
        fitted.current = true;
        requestAnimationFrame(() => initialView());
      }
    });
    ro.observe(el);
    ro.observe(r);
    return () => ro.disconnect();
  }, [initialView]);

  const local = (e: { clientX: number; clientY: number }) => {
    const r = vp.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const toWorld = (p: { x: number; y: number }) => {
    const v = viewRef.current;
    return { x: (p.x - v.x) / v.k, y: (p.y - v.y) / v.k };
  };

  // Wheel: pan with a trackpad, zoom with Ctrl / pinch / a mouse wheel (non-passive listener).
  useEffect(() => {
    const el = vp.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const t = e.target as Element;
      if (!e.ctrlKey && t.closest('.wb-doc__view, .wb-doc__input, .wb-edit, .wb-recos, .wb-stickies')) {
        const sc = t.closest('.wb-doc__view, .wb-doc__input, .wb-edit, .wb-recos, .wb-stickies') as HTMLElement;
        if (sc.scrollHeight > sc.clientHeight + 1) return;
      }
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const px = e.clientX - r.left;
      const py = e.clientY - r.top;
      const mouseWheel = e.deltaMode === 1 || (Math.abs(e.deltaY) >= 50 && e.deltaX === 0);
      if (e.ctrlKey || e.metaKey || mouseWheel) zoomAt(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)), px, py);
      else {
        const v = viewRef.current;
        setView({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY });
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomAt, setView]);

  // Space held while the pointer is over the canvas = temporary hand (whatever has the focus).
  const hover = useRef(false);
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key !== ' ' || !hover.current || e.repeat) return;
      const t = e.target as HTMLElement;
      if (t.closest?.('textarea, input, select, [contenteditable="true"]')) return;
      e.preventDefault();
      spaceRef.current = true;
      setSpace(true);
    };
    const up = (e: KeyboardEvent) => {
      if (e.key !== ' ' || !spaceRef.current) return;
      e.preventDefault();
      spaceRef.current = false;
      setSpace(false);
    };
    window.addEventListener('keydown', down, true);
    window.addEventListener('keyup', up, true);
    return () => {
      window.removeEventListener('keydown', down, true);
      window.removeEventListener('keyup', up, true);
    };
  }, []);

  /* ---------------- live data for the generated frames ---------------- */
  const events = useMemo(() => g.rangeEvents(), [g.version, g.range.from, g.range.to, g.filters]); // eslint-disable-line react-hooks/exhaustive-deps
  const cycle = useMemo(() => cycleCounts(events, g.state, g.hasDemo), [events, g.state, g.version, g.hasDemo]); // eslint-disable-line react-hooks/exhaustive-deps
  const route = useMemo(() => routing(events, g.catalog, g.hasDemo), [events, g.catalog, g.hasDemo]);
  const decisions = useMemo(() => pendingDecisions(g.state), [g.state, g.version]); // eslint-disable-line react-hooks/exhaustive-deps
  const recos = useMemo(() => recoItems(g.state, 8), [g.state, g.version]); // eslint-disable-line react-hooks/exhaustive-deps
  const nature = useMemo(() => natureOfEvents(events, g.hasDemo), [events, g.hasDemo]);
  const meta = useMemo<FrameMeta>(() => ({ live, now: g.now }), [live, g.now]);
  const periodLabel = PERIOD_PHRASE[g.period.preset];
  const deptName = useCallback((id?: string) => (id ? idx.departments.get(id)?.name ?? id : 'Sans département'), [idx.departments]);
  const agentName = useCallback((id: string) => idx.agents.get(id)?.name ?? id, [idx.agents]);
  const openDecisions = useCallback(() => host.openDecisions(), [host]);

  const agents = useMemo<LinkedAgent[]>(
    () =>
      linkedAgentIds(g.catalog, decisions, recos, route, showFrames).map((id) => {
        const a = idx.agents.get(id)!;
        return { id, name: a.name, role: a.role, hue: a.avatar.hue, status: g.state.agents[id]?.status };
      }),
    [g.catalog, decisions, recos, route, showFrames, idx.agents, g.state, g.version], // eslint-disable-line react-hooks/exhaustive-deps
  );

  /* ---------------- object helpers ---------------- */
  const visibleFrames = FRAME_IDS.filter((f) => !shown.frames[f].hidden && (showFrames || f === 'doc'));

  const hitAt = (w: { x: number; y: number }): string | undefined => {
    const b = boardRef.current;
    for (let i = b.objects.length - 1; i >= 0; i--) {
      const o = b.objects[i];
      if (isBox(o) && w.x >= o.x && w.x <= o.x + o.w && w.y >= o.y && w.y <= o.y + o.h) return o.id;
    }
    for (const f of [...FRAME_IDS].reverse()) {
      const l = b.frames[f];
      if (l.hidden || (!showFrames && f !== 'doc')) continue;
      if (w.x >= l.x && w.x <= l.x + l.w && w.y >= l.y && w.y <= l.y + l.h) return frameKey(f);
    }
    return undefined;
  };

  /** Empty area to the right of everything on the board. */
  const freeSpot = (): { x: number; y: number } => {
    const b = boardBounds(boardRef.current, showFrames);
    return b ? { x: b.x + b.w + 80, y: b.y } : { x: 0, y: 0 };
  };

  const centerOn = (b: Box) => {
    const { w, h } = sizeRef.current;
    const ins = insets();
    const k = viewRef.current.k;
    if (b.w * k > w - ins.left - ins.right || b.h * k > h - ins.top - ins.bottom) fitBox(b, k);
    else setView({ k, x: ins.left + (w - ins.left - ins.right) / 2 - (b.x + b.w / 2) * k, y: ins.top + (h - ins.top - ins.bottom) / 2 - (b.y + b.h / 2) * k });
  };

  const add = (objs: UserObj[], label: string, opts: { edit?: boolean; center?: boolean } = {}) => {
    const next = { ...boardRef.current, objects: [...boardRef.current.objects, ...objs] };
    commit(next, label);
    setSel(new Set(objs.map((o) => o.id)));
    // Deferred so the pointer's own focus change does not end the edit at once.
    if (opts.edit && objs.length === 1) window.setTimeout(() => setEditing(objs[0].id), 0);
    if (opts.center) {
      const ub = unionBox(objs.map((o) => boxOf(next, o.id)).filter((x): x is Box => !!x));
      if (ub) requestAnimationFrame(() => centerOn(ub));
    }
    host.announce(label);
  };

  const deleteSel = () => {
    const ids = selRef.current;
    if (!ids.size) return;
    const frames = [...ids].filter(isFrameKey).length;
    const objs = ids.size - frames;
    commit(removeIds(boardRef.current, ids), frames && !objs ? `Cadre masqué : ${FRAME_TITLE[frameOf([...ids][0])]}` : `${ids.size} élément(s) supprimé(s)`);
    setSel(new Set());
    host.announce(frames ? 'Supprimé. Les cadres masqués se réaffichent depuis Propriétés ; Ctrl + Z pour annuler.' : 'Supprimé. Ctrl + Z pour annuler.');
  };

  const duplicateSel = () => {
    const ids = new Set([...selRef.current].filter((i) => !isFrameKey(i)));
    if (!ids.size) return;
    const r = duplicate(boardRef.current, ids);
    commit(r.board, `${r.ids.length} élément(s) dupliqué(s)`);
    setSel(new Set(r.ids));
  };

  const nudge = (dx: number, dy: number) => {
    const ids = selRef.current;
    if (!ids.size) return;
    commit(translate(boardRef.current, ids, dx, dy), 'Sélection déplacée au clavier', 'nudge');
  };

  const onEditDone = useCallback(
    (id: string, text: string) => {
      setEditing((cur) => (cur === id ? null : cur));
      const b = boardRef.current;
      const o = b.objects.find((x) => x.id === id);
      if (!o || !isBox(o)) return;
      const t = text.replace(/\s+$/, '');
      if ((o.kind === 'text' || o.kind === 'comment') && !t.trim()) {
        commit(removeIds(b, new Set([id])), `${kindLabel(o.kind)} vide retiré`);
        setSel(new Set());
        return;
      }
      if (t === o.text) return;
      commit({ ...b, objects: b.objects.map((x) => (x.id === id && isBox(x) ? { ...x, text: t } : x)) }, `${kindLabel(o.kind)} modifié`);
      vp.current?.focus({ preventScroll: true });
    },
    [commit, setSel],
  );

  /* ---------------- pointer interactions ---------------- */
  const op = useRef<Op | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());

  const startPinch = () => {
    const [a, b] = [...pointers.current.values()];
    if (op.current?.kind === 'move' || op.current?.kind === 'resize') setDraft(null);
    setGhost(null);
    op.current = { kind: 'pinch', d: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, v0: viewRef.current };
  };

  const onPointerDown = (e: RPE<HTMLDivElement>) => {
    const t = e.target as Element;
    if (t.closest('[data-nodrag], button, textarea, input, select, a')) return;
    if (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 1) return;
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    if (pointers.current.size === 2) {
      startPinch();
      return;
    }
    if (pointers.current.size > 2) return;
    const objEl = t.closest('[data-oid]') as HTMLElement | null;
    if (!objEl || !objEl.hasAttribute('tabindex')) vp.current?.focus({ preventScroll: true });
    e.currentTarget.setPointerCapture(e.pointerId);
    const w = toWorld(p);
    const tl = toolRef.current;
    if (e.button === 1 || tl === 'hand' || spaceRef.current) {
      e.preventDefault(); // no focus change on the object under the hand
      vp.current?.focus({ preventScroll: true });
      op.current = { kind: 'pan', sx: p.x, sy: p.y, v0: viewRef.current };
      setPanning(true);
      return;
    }
    if (tl === 'select') {
      const handle = t.closest('[data-handle]') as HTMLElement | null;
      const single = selRef.current.size === 1 ? [...selRef.current][0] : null;
      if (handle && single) {
        const b0 = boxOf(boardRef.current, single);
        if (b0) {
          const o = boardRef.current.objects.find((x) => x.id === single);
          op.current = { kind: 'resize', id: single, corner: handle.dataset.handle as Corner, wx: w.x, wy: w.y, box0: { ...b0 }, base: boardRef.current, min: isFrameKey(single) ? MIN_SIZE.frame : MIN_SIZE[o?.kind ?? 'rect'] ?? MIN_SIZE.rect };
          return;
        }
      }
      const id = objEl?.dataset.oid ?? null;
      if (id) {
        let next = selRef.current;
        if (e.shiftKey) {
          next = new Set(next);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          setSel(next);
          if (!next.has(id)) return;
        } else if (!next.has(id)) {
          next = new Set([id]);
          setSel(next);
        }
        op.current = { kind: 'move', sx: p.x, sy: p.y, wx: w.x, wy: w.y, ids: new Set(next), base: boardRef.current, moved: false, clickId: e.shiftKey ? null : id };
        return;
      }
      if (e.pointerType !== 'mouse') {
        if (!e.shiftKey && selRef.current.size) setSel(new Set());
        op.current = { kind: 'pan', sx: p.x, sy: p.y, v0: viewRef.current };
        setPanning(true);
        return;
      }
      const base = e.shiftKey ? new Set(selRef.current) : new Set<string>();
      if (!e.shiftKey) setSel(new Set());
      op.current = { kind: 'marquee', wx: w.x, wy: w.y, base };
      return;
    }
    if (tl === 'rect') op.current = { kind: 'rect', wx: w.x, wy: w.y };
    else if (tl === 'arrow') op.current = penRef.current === 'free' ? { kind: 'pen', pts: [w.x, w.y] } : { kind: 'arrow', wx: w.x, wy: w.y, from: hitAt(w) };
    else {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
      pointers.current.delete(e.pointerId);
      if (tl === 'sticky') add([{ id: newId(), kind: 'sticky', x: w.x - 90, y: w.y - 70, w: 180, h: 150, text: '', color: stickyColor }], 'Post-it ajouté', { edit: true });
      else if (tl === 'text') add([{ id: newId(), kind: 'text', x: w.x, y: w.y - 18, w: 240, h: 40, text: '' }], 'Texte ajouté', { edit: true });
      else if (tl === 'comment') add([{ id: newId(), kind: 'comment', x: w.x - 14, y: w.y - 14, w: 28, h: 28, text: '', ts: Date.now() }], 'Commentaire ajouté', { edit: true });
      setTool('select');
    }
  };

  const onPointerMove = (e: RPE<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    const o = op.current;
    if (!o) return;
    if (o.kind === 'pinch') {
      if (pointers.current.size < 2) return;
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const k = clampK(o.v0.k * (d / o.d));
      const c = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const wx = (o.cx - o.v0.x) / o.v0.k;
      const wy = (o.cy - o.v0.y) / o.v0.k;
      setView({ k, x: c.x - wx * k, y: c.y - wy * k });
      return;
    }
    if (o.kind === 'pan') {
      setView({ ...o.v0, x: o.v0.x + p.x - o.sx, y: o.v0.y + p.y - o.sy });
      return;
    }
    const w = toWorld(p);
    switch (o.kind) {
      case 'move': {
        if (!o.moved && Math.hypot(p.x - o.sx, p.y - o.sy) < 4) return;
        o.moved = true;
        setDraft(translate(o.base, o.ids, Math.round(w.x - o.wx), Math.round(w.y - o.wy)));
        break;
      }
      case 'resize':
        setDraft(setBox(o.base, o.id, resizeBox(o.box0, o.corner, w.x - o.wx, w.y - o.wy, o.min)));
        break;
      case 'rect':
        setGhost({ rect: { x: Math.min(o.wx, w.x), y: Math.min(o.wy, w.y), w: Math.abs(w.x - o.wx), h: Math.abs(w.y - o.wy) } });
        break;
      case 'arrow':
        setGhost({ line: { x1: o.wx, y1: o.wy, x2: w.x, y2: w.y } });
        break;
      case 'pen': {
        const lx = o.pts[o.pts.length - 2];
        const ly = o.pts[o.pts.length - 1];
        if (Math.hypot(w.x - lx, w.y - ly) * viewRef.current.k < 3) return;
        o.pts.push(Math.round(w.x * 10) / 10, Math.round(w.y * 10) / 10);
        setGhost({ pts: o.pts.slice() });
        break;
      }
      case 'marquee': {
        const m = { x: Math.min(o.wx, w.x), y: Math.min(o.wy, w.y), w: Math.abs(w.x - o.wx), h: Math.abs(w.y - o.wy) };
        setGhost({ marquee: m });
        const hits = new Set(o.base);
        const b = boardRef.current;
        for (const ob of b.objects) {
          const bb = boxOf(b, ob.id);
          if (bb && intersects(m, bb)) hits.add(ob.id);
        }
        for (const f of FRAME_IDS) {
          const l = b.frames[f];
          if (l.hidden || (!showFrames && f !== 'doc')) continue;
          if (m.x <= l.x && m.y <= l.y && m.x + m.w >= l.x + l.w && m.y + m.h >= l.y + l.h) hits.add(frameKey(f));
        }
        setSel(hits);
        break;
      }
    }
  };

  const onPointerUp = (e: RPE<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    const p = local(e);
    pointers.current.delete(e.pointerId);
    const o = op.current;
    if (!o) return;
    if (o.kind === 'pinch') {
      if (pointers.current.size < 2) op.current = null;
      return;
    }
    op.current = null;
    const w = toWorld(p);
    switch (o.kind) {
      case 'pan':
        setPanning(false);
        break;
      case 'move':
        if (o.moved) {
          const dx = Math.round(w.x - o.wx);
          const dy = Math.round(w.y - o.wy);
          const n = o.ids.size;
          commit(translate(o.base, o.ids, dx, dy), n === 1 ? `${labelOf(o.base, [...o.ids][0])} déplacé` : `${n} éléments déplacés`);
        } else if (o.clickId && selRef.current.size > 1) setSel(new Set([o.clickId]));
        break;
      case 'resize':
        if (draftRef.current) commit(draftRef.current, `${labelOf(o.base, o.id)} redimensionné`);
        else setDraft(null);
        break;
      case 'rect': {
        setGhost(null);
        const r = { x: Math.min(o.wx, w.x), y: Math.min(o.wy, w.y), w: Math.abs(w.x - o.wx), h: Math.abs(w.y - o.wy) };
        const small = r.w * viewRef.current.k < 8 && r.h * viewRef.current.k < 8;
        add([{ id: newId(), kind: 'rect', ...(small ? { x: o.wx - 100, y: o.wy - 60, w: 200, h: 120 } : { ...r, w: Math.max(MIN_SIZE.rect.w, r.w), h: Math.max(MIN_SIZE.rect.h, r.h) }), text: '' }], 'Rectangle ajouté');
        setTool('select');
        break;
      }
      case 'arrow': {
        setGhost(null);
        if (Math.hypot(w.x - o.wx, w.y - o.wy) * viewRef.current.k < 10) break;
        const to = hitAt(w);
        add([{ id: newId(), kind: 'arrow', x1: o.wx, y1: o.wy, x2: w.x, y2: w.y, from: o.from, to: to !== o.from ? to : undefined }], o.from || to ? 'Connecteur ajouté' : 'Flèche ajoutée');
        break;
      }
      case 'pen':
        setGhost(null);
        if (o.pts.length >= 4) add([{ id: newId(), kind: 'pen', pts: o.pts }], 'Tracé ajouté');
        break;
      case 'marquee':
        setGhost(null);
        if (selRef.current.size) host.announce(`${selRef.current.size} élément(s) sélectionné(s)`);
        break;
    }
  };

  const onPointerCancel = (e: RPE<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    if (op.current?.kind === 'move' || op.current?.kind === 'resize') setDraft(null);
    op.current = null;
    setGhost(null);
    setPanning(false);
  };

  const onDoubleClick = (e: RME) => {
    const t = e.target as Element;
    if (t.closest('[data-nodrag], button, textarea')) return;
    const id = (t.closest('[data-oid]') as HTMLElement | null)?.dataset.oid;
    if (!id) return;
    if (id === frameKey('doc')) setDocEditing(true);
    const o = boardRef.current.objects.find((x) => x.id === id);
    if (o && isBox(o)) {
      setSel(new Set([id]));
      setEditing(id);
    }
  };

  /* ---------------- keyboard ---------------- */
  const onKeyDown = (e: RKE<HTMLDivElement>) => {
    const t = e.target as HTMLElement;
    if (t.closest('textarea, input, select, [contenteditable="true"]')) return;
    const onCanvas = !!vp.current?.contains(t) && !t.closest('button');
    const mod = e.ctrlKey || e.metaKey;
    const k = e.key.toLowerCase();
    let handled = true;
    if (mod && k === 'z') {
      if (e.shiftKey) redo();
      else undo();
    } else if (mod && k === 'y') redo();
    else if (mod && k === 'd') duplicateSel();
    else if (mod && k === 'a' && onCanvas) setSel(new Set(boardRef.current.objects.map((o) => o.id)));
    else if (mod && (k === '=' || k === '+')) zoomBy(1.2);
    else if (mod && k === '-') zoomBy(1 / 1.2);
    else if (mod && k === '0') zoomAt(1 / viewRef.current.k, sizeRef.current.w / 2, sizeRef.current.h / 2);
    else if (mod || e.altKey) handled = false;
    else if (e.shiftKey && e.code === 'Digit1') fit();
    else if (TOOL_BY_KEY[k] && !e.shiftKey) {
      const tl = TOOL_BY_KEY[k];
      if (tl === 'arrow' && toolRef.current === 'arrow') choosePen(penRef.current === 'arrow' ? 'free' : 'arrow');
      setTool(tl);
    } else if (!onCanvas) handled = false;
    else if (k === 'delete' || k === 'backspace') deleteSel();
    else if (k.startsWith('arrow')) {
      const s = e.shiftKey ? 10 : 1;
      if (!selRef.current.size) {
        const v = viewRef.current;
        const d = 40;
        setView({ ...v, x: v.x + (k === 'arrowleft' ? d : k === 'arrowright' ? -d : 0), y: v.y + (k === 'arrowup' ? d : k === 'arrowdown' ? -d : 0) });
      } else nudge(k === 'arrowleft' ? -s : k === 'arrowright' ? s : 0, k === 'arrowup' ? -s : k === 'arrowdown' ? s : 0);
    } else if (k === 'enter') {
      const single = selRef.current.size === 1 ? [...selRef.current][0] : null;
      if (single === frameKey('doc')) setDocEditing(true);
      else if (single && boardRef.current.objects.some((o) => o.id === single && isBox(o))) setEditing(single);
      else handled = false;
    } else if (k === 'escape') {
      if (selRef.current.size) setSel(new Set());
      else if (toolRef.current !== 'select') setTool('select');
      else handled = false;
    } else if (k === ' ') {
      spaceRef.current = true;
      setSpace(true);
    } else if (k === '+' || k === '=') zoomBy(1.2);
    else if (k === '-') zoomBy(1 / 1.2);
    else handled = false;
    if (handled) {
      e.preventDefault();
      e.stopPropagation();
    }
  };
  const onKeyUp = (e: RKE<HTMLDivElement>) => {
    if (e.key === ' ') {
      spaceRef.current = false;
      setSpace(false);
    }
  };

  const onFocusCapture = (e: RFE) => {
    if (pointers.current.size) return;
    const id = (e.target as HTMLElement).dataset?.oid;
    if (id && !selRef.current.has(id)) setSel(new Set([id]));
  };

  /* ---------------- assistance actions (local, deterministic) ---------------- */
  const [summary, setSummary] = useState<BoardSummary | null>(null);
  const runSummary = () => {
    const s = summarize({ cycle, route, decisions, recos, board: boardRef.current, periodLabel, deptName });
    setSummary(s);
    host.announce('Résumé du tableau calculé');
  };
  const placeSummary = () => {
    if (!summary) return;
    const text = [`Résumé du tableau — ${fmtTime(g.now, true)}`, ...summary.lines].join('\n');
    const h = 40 + summary.lines.length * 30;
    const at = freeSpot();
    add([{ id: newId(), kind: 'text', x: at.x, y: at.y, w: 460, h, text }], 'Résumé placé sur le tableau', { center: true });
  };
  const copySummary = () => {
    if (!summary) return;
    const text = summary.lines.join('\n');
    navigator.clipboard?.writeText(text).then(
      () => host.announce('Résumé copié'),
      () => host.announce('Copie impossible dans ce navigateur'),
    );
  };
  const stickiesFromDecisions = () => {
    if (!decisions.length) return;
    const list = decisions.slice(0, 12);
    const at = freeSpot();
    const objs: UserObj[] = list.map((d, i) => ({
      id: newId(),
      kind: 'sticky',
      x: at.x + (i % 3) * 210,
      y: at.y + Math.floor(i / 3) * 190,
      w: 190,
      h: 170,
      color: RISK_COLOR[d.risk],
      text: `${d.title}\n— ${deptName(d.departmentId)} · risque ${d.risk === 'high' ? 'élevé' : d.risk === 'medium' ? 'modéré' : 'faible'}`,
    }));
    add(objs, `${objs.length} post-it créés depuis les décisions`, { center: true });
  };
  const doArrange = (m: Arrange) => {
    const ids = [...selRef.current];
    if (ids.length < 2) return;
    commit(arrange(boardRef.current, ids, m), m === 'top' ? 'Sélection alignée en haut' : m === 'row' ? 'Sélection rangée en ligne' : 'Sélection rangée en grille');
  };
  const generateCycle = () => {
    const b = boardBounds(boardRef.current, showFrames) ?? { x: 0, y: 0, w: 0, h: 0 };
    const x0 = b.x;
    const y0 = b.y + b.h + 120;
    const W = 180;
    const H = 96;
    const G = 70;
    const ids = Array.from({ length: 5 }, () => newId());
    const node = (i: number, x: number, y: number, title: string, n: number, sub: string): UserObj => ({ id: ids[i], kind: 'rect', x, y, w: W, h: H, text: `${title}\n${n}\n${sub}` });
    const objs: UserObj[] = [
      { id: newId(), kind: 'text', x: x0, y: y0 - 56, w: 640, h: 40, text: `Cycle des tâches — copie du ${fmtTime(g.now, true)} (${periodLabel})` },
      node(0, x0, y0, 'Créée', cycle.created, `${cycle.pending} en attente`),
      node(1, x0 + (W + G), y0, 'En cours', cycle.running + cycle.paused, 'maintenant'),
      node(2, x0 + 2 * (W + G), y0, 'Contrôle qualité', cycle.checks, 'contrôles'),
      node(3, x0 + 3 * (W + G), y0, 'Terminée', cycle.done, 'sur la période'),
      node(4, x0 + 1.5 * (W + G), y0 + H + 90, 'Échouée', cycle.failed, 'sur la période'),
    ];
    const link = (a: number, z: number): UserObj => ({ id: newId(), kind: 'arrow', x1: 0, y1: 0, x2: 0, y2: 0, from: ids[a], to: ids[z] });
    objs.push(link(0, 1), link(1, 2), link(2, 3), link(1, 4), link(2, 4));
    add(objs, 'Diagramme du cycle des tâches généré', { center: true });
  };

  /* ---------------- commands palette ---------------- */
  const actionsRef = useRef({ fit, runSummary, stickiesFromDecisions, generateCycle });
  actionsRef.current = { fit, runSummary, stickiesFromDecisions, generateCycle };
  useEffect(
    () =>
      host.provideCommands([
        { id: 'fit', label: 'Tableau blanc : ajuster la vue', keyword: 'Maj 1', run: () => actionsRef.current.fit() },
        { id: 'summary', label: 'Tableau blanc : résumer le tableau', run: () => actionsRef.current.runSummary() },
        { id: 'stickies', label: 'Tableau blanc : post-it depuis les décisions', run: () => actionsRef.current.stickiesFromDecisions() },
        { id: 'cycle', label: 'Tableau blanc : générer le diagramme du cycle', run: () => actionsRef.current.generateCycle() },
      ]),
    [host],
  );

  /* ---------------- panel ---------------- */
  const wide = rootW >= 980 && !mobile;
  const [panelPref, setPanelPref] = useState<boolean>(() => host.getLocal<boolean>('panel', true) !== false);
  const [panelOverlay, setPanelOverlay] = useState(false);
  const panelOpen = wide ? panelPref : panelOverlay;
  const togglePanel = (on: boolean) => {
    if (wide) {
      setPanelPref(on);
      host.setLocal('panel', on);
    } else setPanelOverlay(on);
  };
  const [panelTab, setPanelTab] = useState<'assist' | 'props'>('assist');
  const [minimap, setMinimap] = useState<boolean>(() => host.getLocal<boolean>('minimap', config.minimap !== false));

  /* ---------------- derived UI ---------------- */
  const selIds = [...sel];
  const selKinds = selIds.map((id) => (isFrameKey(id) ? 'cadre' : kindLabel(shown.objects.find((o) => o.id === id)?.kind ?? '').toLowerCase()));
  const selectionText = !selIds.length
    ? 'Aucune sélection'
    : selIds.length === 1
      ? isFrameKey(selIds[0])
        ? `Cadre « ${FRAME_TITLE[frameOf(selIds[0])]} » sélectionné`
        : `1 ${selKinds[0]} sélectionné`
      : `${selIds.length} éléments sélectionnés : ${summarizeKinds(selKinds)}`;

  const selectedInfo: SelectedInfo = (() => {
    if (!selIds.length) return { kind: 'none', title: 'Aucune sélection', detail: 'Sélectionnez un élément pour voir ses propriétés.' };
    if (selIds.length > 1) return { kind: 'many', title: `${selIds.length} éléments`, detail: summarizeKinds(selKinds), count: selIds.length };
    const id = selIds[0];
    if (isFrameKey(id)) {
      const f = frameOf(id);
      return {
        kind: 'frame',
        title: `Cadre « ${FRAME_TITLE[f]} »`,
        detail: f === 'doc' ? 'Vos notes, enregistrées sur cet appareil.' : `Généré depuis le journal d’événements (${periodLabel}), actualisé ${live ? 'en continu' : 'au point de lecture du replay'}. Seules sa position et sa taille vous appartiennent.`,
        box: shown.frames[f],
        editable: f === 'doc',
        generated: f !== 'doc',
      };
    }
    const o = shown.objects.find((x) => x.id === id);
    if (!o) return { kind: 'none', title: 'Aucune sélection' };
    const b = boxOf(shown, id) ?? undefined;
    return {
      kind: 'object',
      title: kindLabel(o.kind),
      detail: o.kind === 'arrow' ? (o.from || o.to ? `Relie ${o.from ? labelOf(shown, o.from) : 'un point'} à ${o.to ? labelOf(shown, o.to) : 'un point'}` : 'Flèche libre') : undefined,
      color: o.kind === 'sticky' ? o.color : undefined,
      editable: isBox(o),
      box: b,
    };
  })();

  const setColor = (c: StickyColor) => {
    setStickyColor(c);
    const ids = selRef.current;
    const b = boardRef.current;
    if (!b.objects.some((o) => ids.has(o.id) && o.kind === 'sticky')) return;
    commit({ ...b, objects: b.objects.map((o) => (ids.has(o.id) && o.kind === 'sticky' ? { ...o, color: c } : o)) }, 'Couleur du post-it modifiée');
  };
  const hiddenFrames = FRAME_IDS.filter((f) => board.frames[f].hidden).length;
  const showAllFrames = () => {
    const frames = { ...board.frames };
    for (const f of FRAME_IDS) frames[f] = { ...frames[f], hidden: undefined };
    commit({ ...board, frames }, 'Cadres réaffichés');
  };
  const resetLayout = () => {
    commit({ ...board, frames: structuredClone(DEFAULT_FRAMES) }, 'Disposition des cadres réinitialisée');
    requestAnimationFrame(() => fit());
  };
  const clearMine = () => {
    commit({ ...emptyBoard(), frames: board.frames }, 'Objets retirés du tableau');
    setSel(new Set());
    host.announce('Objets retirés. Ctrl + Z pour annuler.');
  };
  const editSelected = () => {
    const single = selIds.length === 1 ? selIds[0] : null;
    if (single === frameKey('doc')) setDocEditing(true);
    else if (single) setEditing(single);
  };

  const movableSelected = selIds.filter((id) => !!boxOf(shown, id)).length;
  const objectCount = board.objects.length;

  // Background grid follows the view.
  const gridSize = 24 * view.k * (view.k < 0.45 ? 4 : 1);
  const bgStyle =
    gridStyle === 'none'
      ? undefined
      : { backgroundSize: `${gridSize}px ${gridSize}px`, backgroundPosition: `${view.x}px ${view.y}px` };

  const lineBounds = useMemo(() => {
    const b = boardBounds(shown, true) ?? { x: 0, y: 0, w: 100, h: 100 };
    const gl = ghost?.line;
    const gb = gl ? { x: Math.min(gl.x1, gl.x2), y: Math.min(gl.y1, gl.y2), w: Math.abs(gl.x2 - gl.x1), h: Math.abs(gl.y2 - gl.y1) } : null;
    const u = unionBox(gb ? [b, gb] : [b])!;
    return { x: u.x - 400, y: u.y - 400, w: u.w + 800, h: u.h + 800 };
  }, [shown, ghost]);

  const boxObjects = shown.objects.filter(isBox);
  const srSummary = `${BOARD_NAME}. ${showFrames ? `Cadres générés depuis les données (${periodLabel}) : cycle des tâches — ${cycle.created} créées, ${cycle.running + cycle.paused} en cours, ${cycle.checks} contrôles qualité, ${cycle.done} terminées, ${cycle.failed} échouées ; routage — ${route.totalCalls} appels modèle répartis sur ${route.rows.length} modèle(s) ; ${decisions.length} décision(s) en attente ; ${recos.length} recommandation(s) ou mise(s) à jour. ` : 'Cadres générés masqués. '}${objectCount} objet(s) ajouté(s) par vous.`;

  const cursor = panning ? 'grabbing' : space || tool === 'hand' ? 'grab' : tool === 'select' ? 'default' : tool === 'text' ? 'text' : 'crosshair';
  const zoomPct = `${Math.round(view.k * 100)} %`;
  const canUndo = hist.current.past.length > 0;
  const canRedo = hist.current.future.length > 0;

  const toolButtons = (variant: 'bar' | 'palette' | 'mobile') =>
    TOOLS.map((tl) => {
      const G = tl.id === 'arrow' && penMode === 'free' ? GPen : tl.G;
      const label = tl.id === 'arrow' ? (penMode === 'free' ? 'Crayon (trait libre)' : 'Flèche / connecteur') : tl.label;
      return (
        <button
          key={tl.id}
          type="button"
          className={`wb-tool wb-tool--${variant}`}
          aria-pressed={tool === tl.id}
          aria-label={`${label} (${tl.key})`}
          title={`${label} — ${tl.key}`}
          onClick={() => {
            if (tl.id === 'arrow' && tool === 'arrow') choosePen(penMode === 'arrow' ? 'free' : 'arrow');
            setTool(tl.id);
          }}
        >
          <G size={variant === 'palette' ? 17 : 18} />
          {variant === 'palette' && <span className="wb-tool__label">{tl.id === 'arrow' ? (penMode === 'free' ? 'Crayon' : 'Flèche') : tl.label}</span>}
          {variant === 'palette' && <span className="wb-tool__key">{tl.key}</span>}
        </button>
      );
    });

  const panel = panelOpen && (
    <AssistPanel
      tab={panelTab}
      onTab={setPanelTab}
      onClose={() => togglePanel(false)}
      sheet={mobile}
      boardName={BOARD_NAME}
      selectionText={selectionText}
      periodLabel={`Période : ${periodLabel}`}
      live={live}
      nature={nature}
      summary={summary}
      onSummarize={runSummary}
      onPlaceSummary={placeSummary}
      onCopySummary={copySummary}
      onCloseSummary={() => setSummary(null)}
      pendingCount={decisions.length}
      onStickiesFromDecisions={stickiesFromDecisions}
      movableSelected={movableSelected}
      onArrange={doArrange}
      onGenerateCycle={generateCycle}
      onOpenDecisions={openDecisions}
      agents={agents}
      onSelectAgent={(id) => host.select({ kind: 'agent', id })}
      activity={activity}
      now={g.now}
      selected={selectedInfo}
      hiddenFrames={hiddenFrames}
      onColor={setColor}
      onDuplicate={duplicateSel}
      onDelete={deleteSel}
      onEdit={editSelected}
      onShowFrames={showAllFrames}
      onResetLayout={resetLayout}
      onClear={clearMine}
      objectCount={objectCount}
    />
  );

  return (
    <div
      ref={root}
      className="wb"
      data-device={device}
      data-panel={panelOpen && wide ? 'docked' : panelOpen ? 'overlay' : 'closed'}
      data-palette={palette}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
    >
      <div className="wb-canvas">
        <div
          ref={vp}
          className="wb-viewport"
          data-grid={gridStyle}
          data-tool={tool}
          style={{ ...bgStyle, cursor }}
          tabIndex={0}
          role="application"
          aria-roledescription="tableau blanc"
          aria-label={`${BOARD_NAME}. Outils : V sélection, H main, R rectangle, P flèche ou crayon, T texte, N post-it, C commentaire. Flèches pour déplacer, Suppr pour supprimer.`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onDoubleClick={onDoubleClick}
          onFocusCapture={onFocusCapture}
          onContextMenu={(e) => e.preventDefault()}
          onPointerEnter={() => (hover.current = true)}
          onPointerLeave={() => (hover.current = false)}
        >
          <div className="wb-world" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`, ['--k' as string]: view.k }}>
            {visibleFrames.includes('cycle') && <CycleFrame layout={shown.frames.cycle} c={cycle} meta={meta} periodLabel={periodLabel} />}
            {visibleFrames.includes('decisions') && <DecisionsFrame layout={shown.frames.decisions} decisions={decisions} meta={meta} deptName={deptName} onOpen={openDecisions} nature={nature} />}
            {visibleFrames.includes('doc') && <DocFrame layout={shown.frames.doc} text={doc} onChange={onDocChange} meta={meta} editing={docEditing} onEditing={setDocEditing} />}
            {visibleFrames.includes('routing') && <RoutingFrame layout={shown.frames.routing} r={route} meta={meta} agentName={agentName} periodLabel={periodLabel} />}
            {visibleFrames.includes('recos') && <RecosFrame layout={shown.frames.recos} items={recos} meta={meta} deptName={deptName} nature={nature} />}
            {boxObjects
              .filter((o) => o.kind !== 'comment')
              .map((o) => (
                <BoxObjectView key={o.id} o={o} selected={sel.has(o.id)} editing={editing === o.id} onEditDone={onEditDone} now={g.now} />
              ))}
            <LineLayer board={shown} selected={sel} bounds={lineBounds} ghost={ghost} />
            {boxObjects
              .filter((o) => o.kind === 'comment')
              .map((o) => (
                <BoxObjectView key={o.id} o={o} selected={sel.has(o.id)} editing={editing === o.id} onEditDone={onEditDone} now={g.now} />
              ))}
            <SelectionOverlay board={shown} selected={sel} editing={editing} />
            {ghost?.rect && <div className="wb-ghost-rect" style={{ left: ghost.rect.x, top: ghost.rect.y, width: ghost.rect.w, height: ghost.rect.h }} />}
            {ghost?.marquee && <div className="wb-marquee" style={{ left: ghost.marquee.x, top: ghost.marquee.y, width: ghost.marquee.w, height: ghost.marquee.h }} />}
          </div>
        </div>

        <p className="sr-only" aria-live="off">
          {srSummary}
        </p>

        {/* top bar */}
        <div className="wb-top">
          <div className="wb-title wb-float">
            <div className="wb-title__text">
              <b>{BOARD_NAME}</b>
              <small>{live ? 'Enregistré sur cet appareil' : `Replay · données au ${fmtTime(g.now, true)}`}</small>
            </div>
            <span className="wb-sep" aria-hidden />
            <button type="button" className="wb-icon" onClick={undo} disabled={!canUndo} aria-label="Annuler (Ctrl Z)" title="Annuler — Ctrl Z">
              <GUndo size={17} />
            </button>
            <button type="button" className="wb-icon" onClick={redo} disabled={!canRedo} aria-label="Rétablir (Ctrl Maj Z)" title="Rétablir — Ctrl Maj Z">
              <GRedo size={17} />
            </button>
          </div>
          {!mobile && (
            <div className="wb-toolbar wb-float" role="toolbar" aria-label="Outils du tableau">
              {toolButtons('bar')}
            </div>
          )}
          <div className="wb-top__end">
            {mobile && (
              <button type="button" className="wb-float wb-zoom-chip" onClick={fit} aria-label={`Zoom ${zoomPct}. Ajuster la vue`}>
                {zoomPct}
              </button>
            )}
            {!panelOpen && (
              <button type="button" className="wb-float wb-panel-toggle" onClick={() => togglePanel(true)} aria-label="Ouvrir le panneau Assistance">
                <GPanel size={17} />
                <span>Assistance</span>
              </button>
            )}
          </div>
        </div>

        {tool === 'arrow' && (
          <div className="wb-subtool wb-float" role="group" aria-label="Mode du crayon">
            <button type="button" aria-pressed={penMode === 'arrow'} onClick={() => choosePen('arrow')}>
              <GArrow size={15} /> Flèche
            </button>
            <button type="button" aria-pressed={penMode === 'free'} onClick={() => choosePen('free')}>
              <GPen size={15} /> Trait libre
            </button>
            <span className="wb-subtool__hint">{penMode === 'arrow' ? 'Partir d’un objet pour créer un connecteur' : 'Dessinez à main levée'}</span>
          </div>
        )}
        {tool === 'sticky' && (
          <div className="wb-subtool wb-float" role="radiogroup" aria-label="Couleur du prochain post-it">
            {(['yellow', 'pink', 'green', 'blue', 'violet', 'orange'] as StickyColor[]).map((c) => (
              <button key={c} type="button" role="radio" aria-checked={stickyColor === c} className="wb-swatch wb-swatch--sm" data-color={c} aria-label={`Couleur ${c}`} onClick={() => setStickyColor(c)} />
            ))}
            <span className="wb-subtool__hint">Cliquez sur le tableau pour poser le post-it</span>
          </div>
        )}

        {!mobile && (
          <nav className="wb-palette wb-float" aria-label="Palette d’outils">
            {toolButtons('palette')}
          </nav>
        )}

        {!mobile && (
          <div className="wb-zoom wb-float" role="group" aria-label="Zoom">
            <button type="button" className="wb-icon" onClick={() => zoomBy(1 / 1.2)} aria-label="Zoom arrière">
              <IconZoomOut size={16} />
            </button>
            <button type="button" className="wb-zoom__pct" onClick={() => zoomAt(1 / viewRef.current.k, sizeRef.current.w / 2, sizeRef.current.h / 2)} title="Revenir à 100 %" aria-label={`Zoom ${zoomPct}. Revenir à 100 %`}>
              {zoomPct}
            </button>
            <button type="button" className="wb-icon" onClick={() => zoomBy(1.2)} aria-label="Zoom avant">
              <IconZoomIn size={16} />
            </button>
            <span className="wb-sep" aria-hidden />
            <button type="button" className="wb-icon" onClick={fit} aria-label="Ajuster la vue (Maj 1)" title="Ajuster — Maj 1">
              <IconFit size={16} />
            </button>
            <button
              type="button"
              className="wb-icon"
              aria-pressed={minimap}
              onClick={() => {
                setMinimap(!minimap);
                host.setLocal('minimap', !minimap);
              }}
              aria-label="Afficher la mini-carte"
              title="Mini-carte"
            >
              <IconMinimap size={16} />
            </button>
          </div>
        )}

        {minimap && !mobile && <Minimap board={shown} showFrames={showFrames} view={view} size={size} onJump={(x, y) => setView({ ...viewRef.current, x: size.w / 2 - x * viewRef.current.k, y: size.h / 2 - y * viewRef.current.k })} />}

        {mobile && (
          <div className="wb-mbar wb-float" role="toolbar" aria-label="Outils du tableau">
            {toolButtons('mobile')}
          </div>
        )}

        {!wide && panelOpen && <div className="wb-scrim" onClick={() => togglePanel(false)} aria-hidden />}
        {!wide && panel}
      </div>
      {wide && panel}
    </div>
  );
}

function labelOf(b: Board, id: string) {
  if (isFrameKey(id)) return `Cadre « ${FRAME_TITLE[frameOf(id)]} »`;
  return kindLabel(b.objects.find((o) => o.id === id)?.kind ?? 'élément');
}

function summarizeKinds(kinds: string[]) {
  const m = new Map<string, number>();
  for (const k of kinds) m.set(k, (m.get(k) ?? 0) + 1);
  return [...m].map(([k, n]) => `${n} ${k}`).join(', ');
}

function sanitizeActivity(v: unknown): Activity[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((a): a is Activity => !!a && typeof a === 'object' && Number.isFinite((a as Activity).ts) && typeof (a as Activity).text === 'string')
    .slice(0, 20)
    .map((a) => ({ ts: a.ts, text: a.text.slice(0, 120) }));
}

/* ---------------- minimap ---------------- */

function Minimap({ board, showFrames, view, size, onJump }: { board: Board; showFrames: boolean; view: View; size: { w: number; h: number }; onJump: (x: number, y: number) => void }) {
  const b = boardBounds(board, showFrames) ?? { x: 0, y: 0, w: 1000, h: 600 };
  const vr = { x: -view.x / view.k, y: -view.y / view.k, w: size.w / view.k, h: size.h / view.k };
  const u = unionBox([b, vr])!;
  const pad = 40;
  const ux = u.x - pad;
  const uy = u.y - pad;
  const uw = u.w + pad * 2;
  const uh = u.h + pad * 2;
  const W = 168;
  const H = Math.max(70, Math.min(116, (W * uh) / uw));
  const s = Math.min(W / uw, H / uh);
  const jump = (e: RPE<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    onJump(ux + (e.clientX - r.left) / s, uy + (e.clientY - r.top) / s);
  };
  return (
    <div className="wb-minimap wb-float">
      <svg
        width={W}
        height={H}
        role="img"
        aria-label="Mini-carte du tableau : cliquez pour vous y rendre"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          jump(e);
        }}
        onPointerMove={(e) => e.buttons && jump(e)}
      >
        {FRAME_IDS.filter((f) => !board.frames[f].hidden && (showFrames || f === 'doc')).map((f) => {
          const l = board.frames[f];
          return <rect key={f} x={(l.x - ux) * s} y={(l.y - uy) * s} width={l.w * s} height={l.h * s} rx={3} className="wb-mm-frame" />;
        })}
        {board.objects.filter(isBox).map((o) => (
          <rect key={o.id} x={(o.x - ux) * s} y={(o.y - uy) * s} width={Math.max(2, o.w * s)} height={Math.max(2, o.h * s)} rx={1} className="wb-mm-obj" data-color={o.kind === 'sticky' ? o.color : undefined} />
        ))}
        <rect x={(vr.x - ux) * s} y={(vr.y - uy) * s} width={vr.w * s} height={vr.h * s} rx={3} className="wb-mm-view" />
      </svg>
    </div>
  );
}
