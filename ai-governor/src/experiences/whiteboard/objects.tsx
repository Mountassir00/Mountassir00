/** User objects (post-it, shapes, text, comments, arrows, strokes) and the selection overlay. */
import { memo, useEffect, useRef, useState } from 'react';
import { fmtRelative } from '@sdk';
import { arrowEnds, boxOf, isBox, isFrameKey, type ArrowObj, type Board, type Box, type BoxObject, type Corner, type PenObj } from './model';

const KIND_LABEL: Record<string, string> = { sticky: 'Post-it', rect: 'Rectangle', text: 'Texte', comment: 'Commentaire', arrow: 'Flèche', pen: 'Tracé' };
export const kindLabel = (k: string) => KIND_LABEL[k] ?? k;

function EditArea({ initial, onDone, label, className }: { initial: string; onDone: (text: string) => void; label: string; className?: string }) {
  const [v, setV] = useState(initial);
  const ref = useRef<HTMLTextAreaElement>(null);
  const done = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    el.setSelectionRange(el.value.length, el.value.length);
  }, []);
  const finish = (text: string) => {
    if (done.current) return;
    done.current = true;
    onDone(text);
  };
  return (
    <textarea
      ref={ref}
      className={`wb-edit ${className ?? ''}`}
      value={v}
      aria-label={label}
      data-nodrag
      maxLength={2000}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => finish(v)}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Escape' || ((e.ctrlKey || e.metaKey) && e.key === 'Enter')) {
          e.preventDefault();
          finish(v);
        }
      }}
    />
  );
}

export const BoxObjectView = memo(function BoxObjectView({ o, selected, editing, onEditDone, now }: { o: BoxObject; selected: boolean; editing: boolean; onEditDone: (id: string, text: string) => void; now: number }) {
  const style = { left: o.x, top: o.y, width: o.w, height: o.h };
  const label = `${kindLabel(o.kind)}${o.text ? ` : ${o.text.slice(0, 80)}` : ' vide'}`;
  const done = (t: string) => onEditDone(o.id, t);
  if (o.kind === 'comment') {
    return (
      <div className="wb-obj wb-comment" data-oid={o.id} data-selected={selected || undefined} style={{ left: o.x, top: o.y }} tabIndex={0} role="button" aria-label={`${label}. Entrée pour modifier`}>
        <span className="wb-comment__pin" aria-hidden>
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4.5h12a1 1 0 0 1 1 1v7.5a1 1 0 0 1-1 1H9l-3.5 2.8V14H4a1 1 0 0 1-1-1V5.5a1 1 0 0 1 1-1Z" />
          </svg>
        </span>
        {(selected || editing) && (
          <div className="wb-comment__bubble" data-nodrag={editing || undefined}>
            <span className="wb-comment__who">Vous · {fmtRelative(o.ts, now)}</span>
            {editing ? <EditArea initial={o.text} onDone={done} label="Texte du commentaire" className="wb-edit--comment" /> : <p>{o.text || <i>Commentaire vide</i>}</p>}
          </div>
        )}
      </div>
    );
  }
  const cls = o.kind === 'sticky' ? 'wb-sticky' : o.kind === 'rect' ? 'wb-rect' : 'wb-text';
  return (
    <div
      className={`wb-obj ${cls}`}
      data-oid={o.id}
      data-color={o.kind === 'sticky' ? o.color : undefined}
      data-selected={selected || undefined}
      data-editing={editing || undefined}
      style={style}
      tabIndex={0}
      role="button"
      aria-label={`${label}. Entrée pour modifier`}
    >
      {editing ? <EditArea initial={o.text} onDone={done} label={`Texte du ${kindLabel(o.kind).toLowerCase()}`} /> : <div className="wb-obj__text">{o.text || (o.kind === 'text' ? 'Texte' : '')}</div>}
    </div>
  );
});

function penPath(p: PenObj) {
  const pts = p.pts;
  if (pts.length < 4) return '';
  let d = `M${pts[0].toFixed(1)},${pts[1].toFixed(1)}`;
  for (let i = 2; i < pts.length - 2; i += 2) {
    const mx = (pts[i] + pts[i + 2]) / 2;
    const my = (pts[i + 1] + pts[i + 3]) / 2;
    d += ` Q${pts[i].toFixed(1)},${pts[i + 1].toFixed(1)} ${mx.toFixed(1)},${my.toFixed(1)}`;
  }
  d += ` L${pts[pts.length - 2].toFixed(1)},${pts[pts.length - 1].toFixed(1)}`;
  return d;
}

export interface Ghost {
  rect?: Box;
  line?: { x1: number; y1: number; x2: number; y2: number };
  pts?: number[];
  marquee?: Box;
}

/** One SVG for every line-like object, sized to the content bounds. */
export function LineLayer({ board, selected, bounds, ghost }: { board: Board; selected: ReadonlySet<string>; bounds: Box; ghost: Ghost | null }) {
  const lines = board.objects.filter((o): o is ArrowObj | PenObj => o.kind === 'arrow' || o.kind === 'pen');
  return (
    <svg className="wb-lines" style={{ left: bounds.x, top: bounds.y, width: bounds.w, height: bounds.h }} viewBox={`${bounds.x} ${bounds.y} ${bounds.w} ${bounds.h}`} aria-hidden>
      <defs>
        <marker id="wb-ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 Z" fill="var(--wb-line)" />
        </marker>
        <marker id="wb-ah-sel" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 Z" fill="var(--c-accent)" />
        </marker>
      </defs>
      {lines.map((o) => {
        const sel = selected.has(o.id);
        if (o.kind === 'pen') {
          const d = penPath(o);
          return (
            <g key={o.id} data-oid={o.id} className="wb-line" data-selected={sel || undefined}>
              <path d={d} className="wb-line__hit" />
              <path d={d} className="wb-line__pen" />
            </g>
          );
        }
        const [a, b] = arrowEnds(board, o);
        const d = `M${a.x.toFixed(1)},${a.y.toFixed(1)} L${b.x.toFixed(1)},${b.y.toFixed(1)}`;
        return (
          <g key={o.id} data-oid={o.id} className="wb-line" data-selected={sel || undefined}>
            <path d={d} className="wb-line__hit" />
            <path d={d} className="wb-line__arrow" markerEnd={`url(#${sel ? 'wb-ah-sel' : 'wb-ah'})`} />
          </g>
        );
      })}
      {ghost?.line && <path d={`M${ghost.line.x1},${ghost.line.y1} L${ghost.line.x2},${ghost.line.y2}`} className="wb-line__arrow wb-ghost" markerEnd="url(#wb-ah-sel)" />}
      {ghost?.pts && ghost.pts.length >= 4 && <path d={penPath({ id: 'g', kind: 'pen', pts: ghost.pts })} className="wb-line__pen wb-ghost" />}
    </svg>
  );
}

const CORNERS: Corner[] = ['nw', 'ne', 'sw', 'se'];

/** Outlines for the selection; corner handles when a single resizable item is selected. */
export function SelectionOverlay({ board, selected, editing }: { board: Board; selected: ReadonlySet<string>; editing: string | null }) {
  const ids = [...selected];
  const single = ids.length === 1 ? ids[0] : null;
  const singleObj = single && !isFrameKey(single) ? board.objects.find((o) => o.id === single) : null;
  const resizable = single && (isFrameKey(single) || (singleObj && isBox(singleObj) && singleObj.kind !== 'comment'));
  return (
    <>
      {ids.map((id) => {
        const obj = isFrameKey(id) ? null : board.objects.find((o) => o.id === id);
        if (obj?.kind === 'arrow' || obj?.kind === 'comment') return null;
        const b = boxOf(board, id);
        if (!b) return null;
        return (
          <div key={id} className="wb-sel" data-frame={isFrameKey(id) || undefined} style={{ left: b.x, top: b.y, width: b.w, height: b.h }} aria-hidden>
            {resizable && id === single && editing !== id &&
              CORNERS.map((c) => <span key={c} className="wb-handle" data-handle={c} data-corner={c} />)}
          </div>
        );
      })}
    </>
  );
}
