/**
 * Generated frames: their content is computed from the event log and the
 * projected state (read-only, refreshed live). Only their position and size
 * belong to the user. The Document frame is the user's own text.
 */
import { memo, useEffect, useRef, useState, type ReactNode } from 'react';
import { fmtCompact, fmtInt, fmtPct, fmtRelative, fmtTime, fmtUsd, type DataNature, type Decision } from '@sdk';
import { NatureBadge, useCountUp } from '@ds';
import type { CycleCounts, RecoItem, Routing } from './data';
import { applyFormat, frameKey, parseDoc, type FrameId, type FrameLayout, type MdInline } from './model';
import { GBold, GEdit, GHeading, GItalic, GList, GListNum, GLock } from './glyphs';

export interface FrameMeta {
  live: boolean;
  now: number;
}

function FrameShell({ id, layout, title, sub, nature, meta, generated, children, action, count }: {
  id: FrameId;
  layout: FrameLayout;
  title: string;
  sub?: string;
  nature?: DataNature;
  meta: FrameMeta;
  generated: boolean;
  children: ReactNode;
  action?: ReactNode;
  count?: number;
}) {
  return (
    <section
      className="wb-frame"
      data-oid={frameKey(id)}
      data-frame={id}
      data-generated={generated || undefined}
      style={{ left: layout.x, top: layout.y, width: layout.w, height: layout.h }}
      tabIndex={0}
      aria-label={`${generated ? 'Cadre généré, lecture seule' : 'Cadre'} : ${title}`}
    >
      <span className="wb-frame__tag">{generated ? `Généré · ${title}` : title}</span>
      <header className="wb-frame__head">
        <div className="wb-frame__titles">
          <h3>
            {title}
            {count != null && (
              <span className="badge-count" aria-label={`${count} en attente`}>
                {count}
              </span>
            )}
          </h3>
          {sub && <p>{sub}</p>}
          {(generated || nature) && (
            <div className="wb-frame__badges">
              {generated && (
                <span className="wb-chip" title="Contenu calculé depuis le journal d’événements : il ne se modifie pas à la main">
                  <GLock size={12} /> Lecture seule
                </span>
              )}
              {generated && (
                <span className="wb-chip" data-live={meta.live || undefined} title={meta.live ? 'Actualisé à chaque nouvel événement' : 'État au point de lecture du replay'}>
                  <i className={meta.live ? 'live-dot' : 'wb-replay-dot'} aria-hidden /> {meta.live ? 'En direct' : `Replay · ${fmtTime(meta.now)}`}
                </span>
              )}
              {nature && <NatureBadge nature={nature} />}
            </div>
          )}
        </div>
        {action}
      </header>
      <div className="wb-frame__body">{children}</div>
    </section>
  );
}

/* ---------------- Cycle des tâches ---------------- */

function SvgCount({ value, x, y, size = 30 }: { value: number; x: number; y: number; size?: number }) {
  const v = useCountUp(value);
  return (
    <text x={x} y={y} className="wb-svg-count" style={{ fontSize: size }}>
      {fmtInt(v)}
    </text>
  );
}

const NODE_W = 150;
const NODE_H = 104;

function CycleNode({ x, y, fill, stroke, title, value, sub, glyph }: { x: number; y: number; fill: string; stroke: string; title: string; value: number; sub: string; glyph: ReactNode }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width={NODE_W} height={NODE_H} rx={16} fill={fill} stroke={stroke} strokeWidth={1.5} />
      <g transform="translate(14 14)" stroke={stroke} fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        {glyph}
      </g>
      <text x={40} y={28} className="wb-svg-title">
        {title}
      </text>
      <SvgCount value={value} x={14} y={72} />
      <text x={14} y={92} className="wb-svg-sub">
        {sub}
      </text>
    </g>
  );
}

export const CycleFrame = memo(function CycleFrame({ layout, c, meta, periodLabel }: { layout: FrameLayout; c: CycleCounts; meta: FrameMeta; periodLabel: string }) {
  const X = [14, 214, 414, 614];
  const Y = 10;
  const mid = Y + NODE_H / 2;
  const arrow = (x1: number, y1: number, x2: number, y2: number, dashed?: boolean) => (
    <path d={`M${x1},${y1} L${x2},${y2}`} className="wb-svg-link" data-dashed={dashed || undefined} markerEnd="url(#wb-cyc-ah)" />
  );
  return (
    <FrameShell id="cycle" layout={layout} title="Cycle des tâches" sub={`Créées, contrôlées et terminées sur ${periodLabel} · en cours maintenant`} nature={c.nature} meta={meta} generated>
      <svg className="wb-diagram" viewBox="0 0 780 262" preserveAspectRatio="xMidYMid meet" aria-hidden>
        <defs>
          <marker id="wb-cyc-ah" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 Z" fill="var(--c-ink-muted)" />
          </marker>
        </defs>
        {arrow(X[0] + NODE_W + 4, mid, X[1] - 6, mid)}
        {arrow(X[1] + NODE_W + 4, mid, X[2] - 6, mid)}
        {arrow(X[2] + NODE_W + 4, mid, X[3] - 6, mid)}
        {arrow(X[1] + NODE_W / 2, Y + NODE_H + 4, 352, 148)}
        {arrow(X[2] + NODE_W / 2, Y + NODE_H + 4, 428, 148, true)}
        <text x={470} y={142} className="wb-svg-note">
          rejet
        </text>
        <path d={`M314,214 H${X[0] + NODE_W / 2} V${Y + NODE_H + 8}`} className="wb-svg-link" data-dashed markerEnd="url(#wb-cyc-ah)" />
        <text x={X[0] + NODE_W / 2 + 8} y={236} className="wb-svg-note">
          Relance : sur action confirmée
        </text>
        <CycleNode x={X[0]} y={Y} fill="var(--p2)" stroke="var(--st-working)" title="Créée" value={c.created} sub={`${fmtInt(c.pending)} en attente`}
          glyph={<><rect x="0" y="0" width="16" height="16" rx="3" /><path d="M8 4.5v7M4.5 8h7" /></>} />
        <CycleNode x={X[1]} y={Y} fill="var(--p4)" stroke="var(--st-waiting)" title="En cours" value={c.running + c.paused} sub={c.paused ? `${fmtInt(c.paused)} suspendue(s)` : 'maintenant'}
          glyph={<><circle cx="8" cy="8" r="7.5" /><path d="M8 3.5V8l3 2" /></>} />
        <CycleNode x={X[2]} y={Y} fill="var(--p3)" stroke="var(--c-accent)" title="Contrôle qualité" value={c.checks}
          sub={c.qualityAvg != null ? `qualité moy. ${fmtPct(c.qualityAvg)}` : 'aucun contrôle'}
          glyph={<><path d="M8 0.5 14.5 3v5c0 3.8-2.8 6.6-6.5 7.5C4.3 14.6 1.5 11.8 1.5 8V3Z" /><path d="m5 8 2.2 2.2L11 6" /></>} />
        <CycleNode x={X[3]} y={Y} fill="var(--p1)" stroke="var(--st-validating)" title="Terminée" value={c.done} sub={c.successRate != null ? `réussite ${fmtPct(c.successRate)}` : 'aucune fin'}
          glyph={<><circle cx="8" cy="8" r="7.5" /><path d="m4.5 8.2 2.4 2.4L11.8 5.6" /></>} />
        <CycleNode x={314} y={152} fill="var(--p6)" stroke="var(--st-error)" title="Échouée" value={c.failed} sub="sur la période"
          glyph={<><circle cx="8" cy="8" r="7.5" /><path d="m5.2 5.2 5.6 5.6M10.8 5.2l-5.6 5.6" /></>} />
        {c.validating > 0 && (
          <text x={X[3]} y={Y + NODE_H + 24} className="wb-svg-note">
            {c.validating} agent(s) en validation maintenant
          </text>
        )}
      </svg>
      <p className="sr-only">
        Cycle des tâches sur {periodLabel} : {c.created} créées, {c.pending} en attente maintenant, {c.running + c.paused} en cours, {c.checks} contrôles qualité, {c.done} terminées, {c.failed} échouées.
      </p>
    </FrameShell>
  );
});

/* ---------------- Routage des modèles ---------------- */

const SERIES = ['var(--series-1)', 'var(--series-4)', 'var(--series-3)', 'var(--series-2)'];

export const RoutingFrame = memo(function RoutingFrame({ layout, r, meta, agentName, periodLabel }: { layout: FrameLayout; r: Routing; meta: FrameMeta; agentName: (id: string) => string; periodLabel: string }) {
  const rows = r.rows.length > 4 ? [...r.rows.slice(0, 3), { model: 'autres', label: 'Autres', calls: r.rows.slice(3).reduce((s, x) => s + x.calls, 0), tokens: 0, costUsd: r.rows.slice(3).reduce((s, x) => s + x.costUsd, 0), share: r.rows.slice(3).reduce((s, x) => s + x.share, 0), agents: [], departments: [] }] : r.rows;
  const n = Math.max(1, rows.length);
  const W = 540;
  const bw = Math.min(150, (W - 20 - (n - 1) * 12) / n);
  const total = (n - 1) * 12 + n * bw;
  const x0 = (W - total) / 2;
  const totalCost = r.rows.reduce((s, x) => s + x.costUsd, 0);
  return (
    <FrameShell id="routing" layout={layout} title="Routage des modèles" sub={`Quel travail va vers quel modèle · ${periodLabel}`} nature={r.nature} meta={meta} generated>
      <svg className="wb-diagram" viewBox="0 0 540 300" preserveAspectRatio="xMidYMid meet" aria-hidden>
        <defs>
          <marker id="wb-rt-ah" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 Z" fill="var(--c-ink-muted)" />
          </marker>
        </defs>
        <rect x={190} y={4} width={160} height={34} rx={12} className="wb-svg-box" />
        <text x={270} y={26} textAnchor="middle" className="wb-svg-title">
          Tâche à traiter
        </text>
        <path d="M270,40 V52" className="wb-svg-link" markerEnd="url(#wb-rt-ah)" />
        <path d="M270,54 L348,88 L270,122 L192,88 Z" className="wb-svg-diamond" />
        <text x={270} y={86} textAnchor="middle" className="wb-svg-title">
          Modèle
        </text>
        <text x={270} y={101} textAnchor="middle" className="wb-svg-title">
          nécessaire ?
        </text>
        {/* Non → deterministic */}
        <path d="M190,88 H160" className="wb-svg-link" markerEnd="url(#wb-rt-ah)" />
        <text x={176} y={80} textAnchor="middle" className="wb-svg-note">
          Non
        </text>
        <rect x={4} y={58} width={152} height={62} rx={12} className="wb-svg-box" data-tone="script" />
        <text x={14} y={77} className="wb-svg-sub">
          Règles déterministes
        </text>
        <SvgCount value={r.deterministicTasks} x={14} y={104} size={22} />
        <text x={150} y={104} textAnchor="end" className="wb-svg-sub">
          tâches
        </text>
        {/* summary right */}
        <rect x={384} y={58} width={152} height={62} rx={12} className="wb-svg-box" />
        <text x={394} y={77} className="wb-svg-sub">
          Appels modèle
        </text>
        <SvgCount value={r.totalCalls} x={394} y={104} size={22} />
        <text x={530} y={104} textAnchor="end" className="wb-svg-sub">
          {fmtUsd(totalCost)}
        </text>
        {/* Oui → models */}
        <path d="M270,124 V150" className="wb-svg-link" />
        <text x={280} y={142} className="wb-svg-note">
          Oui
        </text>
        {rows.length > 0 && <path d={`M${x0 + bw / 2},150 H${x0 + total - bw / 2}`} className="wb-svg-link" />}
        {rows.map((m, i) => {
          const x = x0 + i * (bw + 12);
          const color = SERIES[i % SERIES.length];
          const names = m.agents.map(agentName).join(', ');
          return (
            <g key={m.model}>
              <path d={`M${x + bw / 2},150 V166`} className="wb-svg-link" markerEnd="url(#wb-rt-ah)" />
              <rect x={x} y={168} width={bw} height={124} rx={14} className="wb-svg-box" />
              <rect x={x} y={168} width={6} height={124} rx={3} fill={color} />
              <text x={x + 16} y={190} className="wb-svg-title">
                {m.label}
              </text>
              <SvgCount value={m.calls} x={x + 16} y={222} size={24} />
              <text x={x + 16} y={242} className="wb-svg-sub">
                appels · {fmtPct(m.share)}
              </text>
              <text x={x + 16} y={260} className="wb-svg-sub">
                {fmtCompact(m.tokens)} tokens · {fmtUsd(m.costUsd)}
              </text>
              <text x={x + 16} y={280} className="wb-svg-note">
                {names.length > 22 ? `${names.slice(0, 21)}…` : names || '—'}
              </text>
            </g>
          );
        })}
        {!rows.length && (
          <text x={270} y={200} textAnchor="middle" className="wb-svg-sub">
            Aucun appel modèle sur la période
          </text>
        )}
      </svg>
      <p className="sr-only">
        Routage sur {periodLabel} : {r.totalCalls} appels modèle. {r.rows.map((m) => `${m.label} : ${m.calls} appels (${fmtPct(m.share)}), agents ${m.agents.map(agentName).join(', ')}`).join(' ; ')}. {r.deterministicTasks} tâches traitées sans modèle.
      </p>
    </FrameShell>
  );
});

/* ---------------- Décisions en attente ---------------- */

const RISK_LABEL: Record<Decision['risk'], string> = { low: 'Risque faible', medium: 'Risque modéré', high: 'Risque élevé' };
export const RISK_COLOR: Record<Decision['risk'], 'green' | 'yellow' | 'pink'> = { low: 'green', medium: 'yellow', high: 'pink' };

export const DecisionsFrame = memo(function DecisionsFrame({ layout, decisions, meta, deptName, onOpen, nature }: { layout: FrameLayout; decisions: Decision[]; meta: FrameMeta; deptName: (id?: string) => string; onOpen: () => void; nature: DataNature }) {
  const shown = decisions.slice(0, 6);
  return (
    <FrameShell
      id="decisions"
      layout={layout}
      title="Décisions en attente"
      sub="Couleur selon le risque · cliquer ouvre le centre GO / NO GO"
      nature={decisions.length ? (decisions.some((d) => d.nature === 'demo') ? 'demo' : 'real') : nature}
      meta={meta}
      generated
      count={decisions.length}
    >
      <div className="wb-stickies">
        {shown.map((d) => (
          <button key={d.id} type="button" className="wb-note" data-color={RISK_COLOR[d.risk]} onClick={onOpen} aria-label={`${d.title}, ${RISK_LABEL[d.risk]}, ${deptName(d.departmentId)}. Ouvrir le centre GO / NO GO`}>
            <b>{d.title}</b>
            <span className="wb-note__meta">{deptName(d.departmentId)}</span>
            <span className="wb-note__foot">
              <span className={`pill pill--risk-${d.risk}`}>{RISK_LABEL[d.risk]}</span>
              {d.costDeltaUsd != null && d.costDeltaUsd > 0 && <span className="wb-note__cost">+{fmtUsd(d.costDeltaUsd)} estimé</span>}
              {d.durable && <span className="wb-note__cost">Durable</span>}
            </span>
            <span className="wb-note__time">{fmtRelative(d.proposedAt, meta.now)}</span>
          </button>
        ))}
        {!decisions.length && <div className="wb-note wb-note--empty">Aucune décision en attente d’arbitrage.</div>}
        {decisions.length > shown.length && (
          <button type="button" className="wb-note wb-note--more" onClick={onOpen}>
            +{decisions.length - shown.length} autre(s)
          </button>
        )}
      </div>
    </FrameShell>
  );
});

/* ---------------- Recommandations & mises à jour ---------------- */

export const RecosFrame = memo(function RecosFrame({ layout, items, meta, deptName, nature }: { layout: FrameLayout; items: RecoItem[]; meta: FrameMeta; deptName: (id?: string) => string; nature: DataNature }) {
  return (
    <FrameShell id="recos" layout={layout} title="Recommandations & mises à jour" sub="Les plus récentes d’abord" nature={items[0]?.nature ?? nature} meta={meta} generated>
      <ul className="wb-recos">
        {items.map((r) => (
          <li key={r.id} className="wb-note wb-note--flat" data-color={r.feed === 'reco' ? 'violet' : 'blue'}>
            <span className="wb-note__kind">{r.feed === 'reco' ? 'Recommandation' : 'Mise à jour'}</span>
            <b>{r.summary}</b>
            <span className="wb-note__meta">
              {r.departmentId ? `${deptName(r.departmentId)} · ` : ''}
              {fmtRelative(r.ts, meta.now)}
            </span>
          </li>
        ))}
        {!items.length && <li className="wb-note wb-note--empty">Aucune recommandation ni mise à jour enregistrée.</li>}
      </ul>
    </FrameShell>
  );
});

/* ---------------- Document (user text) ---------------- */

function Inline({ parts }: { parts: MdInline[] }) {
  return (
    <>
      {parts.map((p, i) => (p.b ? <strong key={i}>{p.t}</strong> : p.i ? <em key={i}>{p.t}</em> : <span key={i}>{p.t}</span>))}
    </>
  );
}

export const DocFrame = memo(function DocFrame({ layout, text, onChange, meta, editing, onEditing }: { layout: FrameLayout; text: string; onChange: (t: string) => void; meta: FrameMeta; editing: boolean; onEditing: (on: boolean) => void }) {
  const ta = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState(text);
  useEffect(() => setValue(text), [text]);
  useEffect(() => {
    if (editing) ta.current?.focus({ preventScroll: true });
  }, [editing]);
  const fmt = (f: 'b' | 'i' | 'ul' | 'ol' | 'h') => {
    const el = ta.current;
    if (!el) {
      onEditing(true);
      return;
    }
    const r = applyFormat(value, el.selectionStart, el.selectionEnd, f);
    setValue(r.value);
    onChange(r.value);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(r.start, r.end);
    });
  };
  const blocks = parseDoc(value);
  return (
    <FrameShell
      id="doc"
      layout={layout}
      title="Document"
      sub="Vos notes · enregistrées sur cet appareil"
      meta={meta}
      generated={false}
      action={
        <button type="button" className="wb-mini-btn" data-nodrag onClick={() => onEditing(!editing)} aria-pressed={editing}>
          <GEdit size={14} /> {editing ? 'Terminer' : 'Modifier'}
        </button>
      }
    >
      <div className="wb-doc" data-nodrag={editing || undefined}>
        <div className="wb-doc__bar" role="toolbar" aria-label="Mise en forme" data-nodrag>
          {([
            ['h', 'Titre', GHeading],
            ['b', 'Gras', GBold],
            ['i', 'Italique', GItalic],
            ['ul', 'Liste à puces', GList],
            ['ol', 'Liste numérotée', GListNum],
          ] as const).map(([k, label, G]) => (
            <button key={k} type="button" className="wb-doc__btn" aria-label={label} title={label} disabled={!editing} onMouseDown={(e) => e.preventDefault()} onClick={() => fmt(k)}>
              <G size={15} />
            </button>
          ))}
          <span className="wb-doc__hint">{editing ? '**gras**, _italique_, - liste' : 'Double-cliquez pour écrire'}</span>
        </div>
        {editing ? (
          <textarea
            ref={ta}
            className="wb-doc__input"
            value={value}
            aria-label="Texte du document"
            onChange={(e) => {
              setValue(e.target.value);
              onChange(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.stopPropagation();
                onEditing(false);
              }
              if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'i')) {
                e.preventDefault();
                fmt(e.key === 'b' ? 'b' : 'i');
              }
            }}
          />
        ) : (
          <div className="wb-doc__view" onDoubleClick={() => onEditing(true)}>
            {blocks.map((b, i) =>
              b.kind === 'h' ? (
                <h4 key={i}>
                  <Inline parts={b.text} />
                </h4>
              ) : b.kind === 'p' ? (
                <p key={i}>
                  <Inline parts={b.text} />
                </p>
              ) : b.kind === 'ul' ? (
                <ul key={i}>
                  {b.items.map((it, j) => (
                    <li key={j}>
                      <Inline parts={it} />
                    </li>
                  ))}
                </ul>
              ) : (
                <ol key={i}>
                  {b.items.map((it, j) => (
                    <li key={j}>
                      <Inline parts={it} />
                    </li>
                  ))}
                </ol>
              ),
            )}
            {!blocks.length && <p className="t-muted">Document vide.</p>}
          </div>
        )}
      </div>
    </FrameShell>
  );
});
