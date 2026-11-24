/**
 * Whiteboard model — user objects, generated-frame layout, history and
 * geometry. Pure functions only: the board is presentation data owned by the
 * user (persisted with host.setLocal), never operational data.
 */

export type Tool = 'select' | 'hand' | 'rect' | 'arrow' | 'text' | 'sticky' | 'comment';
export type StickyColor = 'yellow' | 'pink' | 'green' | 'blue' | 'violet' | 'orange';
export type FrameId = 'cycle' | 'routing' | 'decisions' | 'recos' | 'doc';

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface BoxObj extends Box {
  id: string;
}
export interface StickyObj extends BoxObj {
  kind: 'sticky';
  text: string;
  color: StickyColor;
}
export interface RectObj extends BoxObj {
  kind: 'rect';
  text: string;
}
export interface TextObj extends BoxObj {
  kind: 'text';
  text: string;
}
export interface CommentObj extends BoxObj {
  kind: 'comment';
  text: string;
  ts: number;
}
export interface ArrowObj {
  id: string;
  kind: 'arrow';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Bound object ids (user object id or `frame:<id>`): the end follows the object. */
  from?: string;
  to?: string;
}
export interface PenObj {
  id: string;
  kind: 'pen';
  /** Flat list of world coordinates [x0, y0, x1, y1, …]. */
  pts: number[];
}

export type BoxObject = StickyObj | RectObj | TextObj | CommentObj;
export type UserObj = BoxObject | ArrowObj | PenObj;

export interface FrameLayout extends Box {
  hidden?: boolean;
}

export interface Board {
  v: 1;
  objects: UserObj[];
  frames: Record<FrameId, FrameLayout>;
}

export const FRAME_IDS: FrameId[] = ['cycle', 'decisions', 'doc', 'routing', 'recos'];

export const FRAME_TITLE: Record<FrameId, string> = {
  cycle: 'Cycle des tâches',
  routing: 'Routage des modèles',
  decisions: 'Décisions en attente',
  recos: 'Recommandations & mises à jour',
  doc: 'Document',
};

export const DEFAULT_FRAMES: Record<FrameId, FrameLayout> = {
  cycle: { x: 0, y: 0, w: 840, h: 370 },
  decisions: { x: 880, y: 0, w: 470, h: 370 },
  doc: { x: 0, y: 420, w: 400, h: 400 },
  routing: { x: 440, y: 420, w: 560, h: 400 },
  recos: { x: 1040, y: 420, w: 310, h: 400 },
};

export const MIN_SIZE: Record<string, { w: number; h: number }> = {
  sticky: { w: 90, h: 70 },
  rect: { w: 40, h: 30 },
  text: { w: 60, h: 28 },
  comment: { w: 28, h: 28 },
  frame: { w: 260, h: 200 },
};

export const emptyBoard = (): Board => ({ v: 1, objects: [], frames: structuredClone(DEFAULT_FRAMES) });

let seq = 0;
export const newId = (p = 'o') => `${p}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

export const isBox = (o: UserObj): o is BoxObject => o.kind === 'sticky' || o.kind === 'rect' || o.kind === 'text' || o.kind === 'comment';
export const isFrameKey = (id: string) => id.startsWith('frame:');
export const frameKey = (f: FrameId) => `frame:${f}`;
export const frameOf = (id: string) => id.slice(6) as FrameId;

/* ---------------- persistence (validated: storage may be stale or edited) ---------------- */

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const str = (v: unknown, max = 2000) => (typeof v === 'string' ? v.slice(0, max) : '');
const COLORS: StickyColor[] = ['yellow', 'pink', 'green', 'blue', 'violet', 'orange'];

export function sanitizeBoard(raw: unknown): Board {
  const b = emptyBoard();
  if (!raw || typeof raw !== 'object') return b;
  const r = raw as { objects?: unknown; frames?: unknown };
  if (r.frames && typeof r.frames === 'object') {
    for (const f of FRAME_IDS) {
      const l = (r.frames as Record<string, unknown>)[f] as Partial<FrameLayout> | undefined;
      if (l && finite(l.x) && finite(l.y) && finite(l.w) && finite(l.h)) {
        b.frames[f] = { x: l.x, y: l.y, w: Math.max(MIN_SIZE.frame.w, l.w), h: Math.max(MIN_SIZE.frame.h, l.h), hidden: l.hidden === true || undefined };
      }
    }
  }
  if (Array.isArray(r.objects)) {
    for (const o of r.objects.slice(0, 600) as Array<Record<string, unknown>>) {
      if (!o || typeof o !== 'object' || typeof o.id !== 'string') continue;
      const id = o.id.slice(0, 80);
      if (o.kind === 'arrow' && finite(o.x1) && finite(o.y1) && finite(o.x2) && finite(o.y2)) {
        b.objects.push({ id, kind: 'arrow', x1: o.x1, y1: o.y1, x2: o.x2, y2: o.y2, from: typeof o.from === 'string' ? o.from : undefined, to: typeof o.to === 'string' ? o.to : undefined });
      } else if (o.kind === 'pen' && Array.isArray(o.pts) && o.pts.length >= 4 && o.pts.every(finite)) {
        b.objects.push({ id, kind: 'pen', pts: (o.pts as number[]).slice(0, 4000) });
      } else if ((o.kind === 'sticky' || o.kind === 'rect' || o.kind === 'text' || o.kind === 'comment') && finite(o.x) && finite(o.y) && finite(o.w) && finite(o.h)) {
        const base = { id, x: o.x, y: o.y, w: Math.max(10, o.w), h: Math.max(10, o.h), text: str(o.text) };
        if (o.kind === 'sticky') b.objects.push({ ...base, kind: 'sticky', color: COLORS.includes(o.color as StickyColor) ? (o.color as StickyColor) : 'yellow' });
        else if (o.kind === 'comment') b.objects.push({ ...base, kind: 'comment', ts: finite(o.ts) ? o.ts : Date.now() });
        else b.objects.push({ ...base, kind: o.kind });
      }
    }
  }
  return b;
}

/* ---------------- geometry ---------------- */

export function penBox(p: PenObj): Box {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < p.pts.length; i += 2) {
    x0 = Math.min(x0, p.pts[i]);
    x1 = Math.max(x1, p.pts[i]);
    y0 = Math.min(y0, p.pts[i + 1]);
    y1 = Math.max(y1, p.pts[i + 1]);
  }
  return { x: x0, y: y0, w: Math.max(1, x1 - x0), h: Math.max(1, y1 - y0) };
}

/** Bounding box of anything on the board (frames resolve through `frames`). */
export function boxOf(board: Board, id: string): Box | null {
  if (isFrameKey(id)) {
    const f = board.frames[frameOf(id)];
    return f && !f.hidden ? f : null;
  }
  const o = board.objects.find((x) => x.id === id);
  if (!o) return null;
  if (isBox(o)) return o;
  if (o.kind === 'pen') return penBox(o);
  const [a, b] = arrowEnds(board, o);
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.max(1, Math.abs(a.x - b.x)), h: Math.max(1, Math.abs(a.y - b.y)) };
}

const center = (b: Box) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });

/** Point where the segment from the box centre toward `p` leaves the box (+ gap). */
export function anchor(b: Box, p: { x: number; y: number }, gap = 6) {
  const c = center(b);
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  if (!dx && !dy) return c;
  const sx = dx ? (b.w / 2 + gap) / Math.abs(dx) : Infinity;
  const sy = dy ? (b.h / 2 + gap) / Math.abs(dy) : Infinity;
  const s = Math.min(sx, sy, 1);
  return { x: c.x + dx * s, y: c.y + dy * s };
}

/** Resolved endpoints of an arrow (bound ends follow their objects). */
export function arrowEnds(board: Board, a: ArrowObj): [{ x: number; y: number }, { x: number; y: number }] {
  const fb = a.from ? boxOfShallow(board, a.from) : null;
  const tb = a.to ? boxOfShallow(board, a.to) : null;
  let p1 = { x: a.x1, y: a.y1 };
  let p2 = { x: a.x2, y: a.y2 };
  const target2 = tb ? center(tb) : p2;
  const target1 = fb ? center(fb) : p1;
  if (fb) p1 = anchor(fb, target2);
  if (tb) p2 = anchor(tb, target1);
  return [p1, p2];
}

function boxOfShallow(board: Board, id: string): Box | null {
  if (isFrameKey(id)) {
    const f = board.frames[frameOf(id)];
    return f && !f.hidden ? f : null;
  }
  const o = board.objects.find((x) => x.id === id);
  return o && isBox(o) ? o : null;
}

export function unionBox(boxes: Box[]): Box | null {
  if (!boxes.length) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const b of boxes) {
    x0 = Math.min(x0, b.x);
    y0 = Math.min(y0, b.y);
    x1 = Math.max(x1, b.x + b.w);
    y1 = Math.max(y1, b.y + b.h);
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

export function boardBounds(board: Board, showFrames: boolean): Box | null {
  const boxes: Box[] = [];
  for (const f of FRAME_IDS) {
    const l = board.frames[f];
    if (l.hidden || (!showFrames && f !== 'doc')) continue;
    boxes.push(l);
  }
  for (const o of board.objects) {
    const b = boxOf(board, o.id);
    if (b) boxes.push(b);
  }
  return unionBox(boxes);
}

export const intersects = (a: Box, b: Box) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/** Translates the given ids by (dx, dy). Arrows bound to moved objects follow by themselves. */
export function translate(board: Board, ids: ReadonlySet<string>, dx: number, dy: number): Board {
  const frames = { ...board.frames };
  for (const id of ids) {
    if (isFrameKey(id)) {
      const f = frameOf(id);
      frames[f] = { ...frames[f], x: frames[f].x + dx, y: frames[f].y + dy };
    }
  }
  const objects = board.objects.map((o) => {
    if (!ids.has(o.id)) return o;
    if (isBox(o)) return { ...o, x: o.x + dx, y: o.y + dy };
    if (o.kind === 'pen') return { ...o, pts: o.pts.map((v, i) => v + (i % 2 ? dy : dx)) };
    // A free-moving arrow detaches from objects that are not moving with it.
    const [a, b] = arrowEnds(board, o);
    return {
      ...o,
      x1: a.x + dx, y1: a.y + dy, x2: b.x + dx, y2: b.y + dy,
      from: o.from && ids.has(o.from) ? o.from : undefined,
      to: o.to && ids.has(o.to) ? o.to : undefined,
    };
  });
  return { ...board, frames, objects };
}

export type Corner = 'nw' | 'ne' | 'sw' | 'se';

export function resizeBox(b: Box, corner: Corner, dx: number, dy: number, min: { w: number; h: number }): Box {
  let { x, y, w, h } = b;
  if (corner.includes('e')) w = Math.max(min.w, w + dx);
  if (corner.includes('s')) h = Math.max(min.h, h + dy);
  if (corner.includes('w')) {
    const nw = Math.max(min.w, w - dx);
    x += w - nw;
    w = nw;
  }
  if (corner.includes('n')) {
    const nh = Math.max(min.h, h - dy);
    y += h - nh;
    h = nh;
  }
  return { x, y, w, h };
}

export function setBox(board: Board, id: string, box: Box): Board {
  if (isFrameKey(id)) {
    const f = frameOf(id);
    return { ...board, frames: { ...board.frames, [f]: { ...board.frames[f], ...box } } };
  }
  return { ...board, objects: board.objects.map((o) => (o.id === id && isBox(o) ? { ...o, ...box } : o)) };
}

export function removeIds(board: Board, ids: ReadonlySet<string>): Board {
  const frames = { ...board.frames };
  for (const id of ids) if (isFrameKey(id)) frames[frameOf(id)] = { ...frames[frameOf(id)], hidden: true };
  const objects = board.objects
    .filter((o) => !ids.has(o.id))
    .map((o) => {
      if (o.kind !== 'arrow' || (!(o.from && ids.has(o.from)) && !(o.to && ids.has(o.to)))) return o;
      const [a, b] = arrowEnds(board, o);
      return { ...o, x1: a.x, y1: a.y, x2: b.x, y2: b.y, from: o.from && ids.has(o.from) ? undefined : o.from, to: o.to && ids.has(o.to) ? undefined : o.to };
    });
  return { ...board, frames, objects };
}

/** Copies user objects (frames are generated and cannot be duplicated). */
export function duplicate(board: Board, ids: ReadonlySet<string>, offset = 24): { board: Board; ids: string[] } {
  const map = new Map<string, string>();
  for (const o of board.objects) if (ids.has(o.id)) map.set(o.id, newId());
  const copies: UserObj[] = [];
  for (const o of board.objects) {
    const nid = map.get(o.id);
    if (!nid) continue;
    if (isBox(o)) copies.push({ ...o, id: nid, x: o.x + offset, y: o.y + offset });
    else if (o.kind === 'pen') copies.push({ ...o, id: nid, pts: o.pts.map((v) => v + offset) });
    else {
      const [a, b] = arrowEnds(board, o);
      copies.push({ ...o, id: nid, x1: a.x + offset, y1: a.y + offset, x2: b.x + offset, y2: b.y + offset, from: o.from ? map.get(o.from) : undefined, to: o.to ? map.get(o.to) : undefined });
    }
  }
  return { board: { ...board, objects: [...board.objects, ...copies] }, ids: copies.map((c) => c.id) };
}

/* ---------------- arrange ---------------- */

export type Arrange = 'top' | 'row' | 'grid';

/** Deterministic arrangement of the selection (boxes and frames; lines/strokes move with their box). */
export function arrange(board: Board, ids: string[], mode: Arrange, gap = 32): Board {
  const items = ids.map((id) => ({ id, b: boxOf(board, id) })).filter((x): x is { id: string; b: Box } => !!x.b);
  if (items.length < 2) return board;
  const top = Math.min(...items.map((i) => i.b.y));
  const left = Math.min(...items.map((i) => i.b.x));
  let next = board;
  const moveTo = (id: string, b: Box, x: number, y: number) => {
    next = translate(next, new Set([id]), x - b.x, y - b.y);
  };
  if (mode === 'top') {
    for (const i of items) moveTo(i.id, i.b, i.b.x, top);
  } else if (mode === 'row') {
    const sorted = [...items].sort((a, b) => a.b.x - b.b.x);
    let x = left;
    for (const i of sorted) {
      moveTo(i.id, i.b, x, top);
      x += i.b.w + gap;
    }
  } else {
    const cols = Math.ceil(Math.sqrt(items.length));
    const sorted = [...items].sort((a, b) => a.b.y - b.b.y || a.b.x - b.b.x);
    const cw = Math.max(...sorted.map((i) => i.b.w));
    const ch = Math.max(...sorted.map((i) => i.b.h));
    sorted.forEach((i, n) => moveTo(i.id, i.b, left + (n % cols) * (cw + gap), top + Math.floor(n / cols) * (ch + gap)));
  }
  return next;
}

/* ---------------- light markdown (document block) ---------------- */

export type MdInline = { t: string; b?: boolean; i?: boolean };
export type MdBlock = { kind: 'h'; text: MdInline[] } | { kind: 'p'; text: MdInline[] } | { kind: 'ul' | 'ol'; items: MdInline[][] };

export function parseInline(s: string): MdInline[] {
  const out: MdInline[] = [];
  const re = /(\*\*[^*]+\*\*|_[^_]+_)/g;
  let last = 0;
  for (const m of s.matchAll(re)) {
    if (m.index! > last) out.push({ t: s.slice(last, m.index) });
    const tok = m[0];
    if (tok.startsWith('**')) out.push({ t: tok.slice(2, -2), b: true });
    else out.push({ t: tok.slice(1, -1), i: true });
    last = m.index! + tok.length;
  }
  if (last < s.length) out.push({ t: s.slice(last) });
  return out;
}

export function parseDoc(src: string): MdBlock[] {
  const blocks: MdBlock[] = [];
  for (const raw of src.split('\n')) {
    const line = raw.trimEnd();
    const ul = /^\s*[-•*]\s+(.*)$/.exec(line);
    const ol = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    const last = blocks[blocks.length - 1];
    if (ul) {
      if (last?.kind === 'ul') last.items.push(parseInline(ul[1]));
      else blocks.push({ kind: 'ul', items: [parseInline(ul[1])] });
    } else if (ol) {
      if (last?.kind === 'ol') last.items.push(parseInline(ol[1]));
      else blocks.push({ kind: 'ol', items: [parseInline(ol[1])] });
    } else if (/^#{1,3}\s+/.test(line)) blocks.push({ kind: 'h', text: parseInline(line.replace(/^#{1,3}\s+/, '')) });
    else if (line.trim()) blocks.push({ kind: 'p', text: parseInline(line) });
  }
  return blocks;
}

export const DEFAULT_DOC = `# Notes de gouvernance
Objectif de la semaine : **réduire le coût par tâche** sans baisser la qualité.
- Suivre le taux de cache du Gouverneur
- Arbitrer les décisions à _risque élevé_ avant vendredi
- Revoir le routage de la veille`;

/** Wraps the selection of a textarea with a markdown marker (bold/italic) or prefixes lines (list). */
export function applyFormat(value: string, start: number, end: number, fmt: 'b' | 'i' | 'ul' | 'ol' | 'h'): { value: string; start: number; end: number } {
  if (fmt === 'b' || fmt === 'i') {
    const m = fmt === 'b' ? '**' : '_';
    const sel = value.slice(start, end) || (fmt === 'b' ? 'texte en gras' : 'texte en italique');
    const next = value.slice(0, start) + m + sel + m + value.slice(end);
    return { value: next, start: start + m.length, end: start + m.length + sel.length };
  }
  const ls = value.lastIndexOf('\n', start - 1) + 1;
  const le = value.indexOf('\n', end);
  const stop = le === -1 ? value.length : le;
  const lines = value.slice(ls, stop).split('\n');
  const prefixed = lines.map((l, i) => {
    const bare = l.replace(/^(\s*[-•*]\s+|\s*\d+[.)]\s+|#{1,3}\s+)/, '');
    return fmt === 'ul' ? `- ${bare}` : fmt === 'ol' ? `${i + 1}. ${bare}` : `# ${bare}`;
  });
  const block = prefixed.join('\n');
  return { value: value.slice(0, ls) + block + value.slice(stop), start: ls, end: ls + block.length };
}
