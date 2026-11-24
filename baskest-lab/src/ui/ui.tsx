import { useEffect, useState, type ReactNode } from 'react';
import type { Evaluation, FeatureStatus, GateStatus, RuleOutcome } from '../core/model';
import { maturityLabel } from '../core/scoring/maturity';

export const STATUS_LABEL: Record<FeatureStatus, string> = {
  operationnel: 'Opérationnel',
  prototype: 'Prototype',
  integration: 'Dépend d’une intégration',
};

export function Status({ s }: { s: FeatureStatus }) {
  return <span className={`status ${s}`}>{STATUS_LABEL[s]}</span>;
}

export function Page({ title, intro, status, children, actions }: { title: string; intro: string; status: FeatureStatus; children: ReactNode; actions?: ReactNode }) {
  useEffect(() => {
    document.title = `${title} — EVENT LAB`;
  }, [title]);
  return (
    <>
      <header className="page-head">
        <div>
          <h1>{title}</h1>
          <p>{intro}</p>
        </div>
        <div className="row">
          {actions}
          <Status s={status} />
        </div>
      </header>
      {children}
    </>
  );
}

export function Panel({ title, children, className = '' }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`panel ${className}`}>
      {title && <h2>{title}</h2>}
      {children}
    </section>
  );
}

const GATE_LABEL: Record<GateStatus | RuleOutcome, string> = {
  conforme: 'conforme',
  a_verifier: 'à vérifier',
  non_conforme: 'non conforme',
  ok: 'ok',
  alerte: 'alerte',
  bloquant: 'bloquant',
  non_evaluable: 'non évaluable',
};

export function Gate({ s, label }: { s: GateStatus | RuleOutcome; label?: string }) {
  return <span className={`gate ${s}`}>{label ? `${label} : ` : ''}{GATE_LABEL[s]}</span>;
}

/** Élément signature : la note affichée comme un tableau de score de salle. */
export function Scoreboard({ ev, title, meta }: { ev: Evaluation; title: string; meta?: string }) {
  return (
    <div className="scoreboard" role="group" aria-label={`Note ${ev.total} sur 100`}>
      <div className="digits">
        {Math.round(ev.total)}
        <small>/100</small>
      </div>
      <div>
        <div className="title">{title}</div>
        <div className="meta">
          Grade {ev.grade}, {ev.eligible ? 'éligible' : 'non éligible en l’état'}, maturité : {maturityLabel(ev.maturity)}
          {meta ? `. ${meta}` : ''}
        </div>
        <div className="gates">
          <Gate s={ev.gates.safety} label="Sécurité" />
          <Gate s={ev.gates.fairness} label="Équité" />
          <Gate s={ev.gates.compliance} label="Conformité" />
        </div>
      </div>
    </div>
  );
}

export function Criteria({ ev }: { ev: Evaluation }) {
  return (
    <div>
      {ev.criteria.map((c) => (
        <div className="crit" key={c.key} title={c.reasons.join(' ; ')}>
          <span>{c.label}</span>
          <div className="bar" aria-hidden>
            <span style={{ width: `${(c.points / c.max) * 100}%` }} />
          </div>
          <span className="pts">
            {c.points}/{c.max}
          </span>
        </div>
      ))}
    </div>
  );
}

export function Table({ head, rows, numeric = [], onRowClick, selected }: { head: string[]; rows: ReactNode[][]; numeric?: number[]; onRowClick?: (i: number) => void; selected?: number }) {
  return (
    <div className="table-wrap">
      <table className="t">
        <thead>
          <tr>
            {head.map((h, i) => (
              <th key={i} scope="col" className={numeric.includes(i) ? 'num' : ''}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={i}
              className={`${onRowClick ? 'clickable' : ''} ${selected === i ? 'selected' : ''}`}
              onClick={onRowClick ? () => onRowClick(i) : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              onKeyDown={onRowClick ? (e) => e.key === 'Enter' && onRowClick(i) : undefined}
            >
              {r.map((c, j) => (
                <td key={j} className={numeric.includes(j) ? 'num' : ''}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function NumberField({ label, value, onChange, min, max, step = 1, hint }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; hint?: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type="number" value={value} min={min} max={max} step={step} onChange={(e) => onChange(Number(e.target.value))} />
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function SelectField<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Checks<T extends string>({ label, values, options, onChange }: { label: string; values: T[]; options: { value: T; label: string }[]; onChange: (v: T[]) => void }) {
  return (
    <fieldset className="field" style={{ border: 'none', padding: 0, margin: 0 }}>
      <span style={{ fontWeight: 600 }}>{label}</span>
      <div className="checks">
        {options.map((o) => (
          <label key={o.value}>
            <input
              type="checkbox"
              checked={values.includes(o.value)}
              onChange={(e) => onChange(e.target.checked ? [...values, o.value] : values.filter((v) => v !== o.value))}
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function Tabs<T extends string>({ value, tabs, onChange }: { value: T; tabs: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.value} role="tab" aria-selected={value === t.value} onClick={() => onChange(t.value)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Kpi({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="kpi">
      <b>{value}</b>
      <span>{label}</span>
    </div>
  );
}

export function Svg({ svg, label }: { svg: string; label: string }) {
  return <div className="svg-box" role="img" aria-label={label} dangerouslySetInnerHTML={{ __html: svg }} />;
}

/** Courbe simple (trésorerie, etc.). */
export function LineChart({ points, width = 640, height = 200, format = (v: number) => String(v), xLabel = (x: number) => String(x) }: { points: { x: number; y: number }[]; width?: number; height?: number; format?: (v: number) => string; xLabel?: (x: number) => string }) {
  if (!points.length) return null;
  const pad = { l: 64, r: 12, t: 12, b: 28 };
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(0, ...ys);
  const y1 = Math.max(0, ...ys);
  const X = (x: number) => pad.l + ((x - x0) / Math.max(1, x1 - x0)) * (width - pad.l - pad.r);
  const Y = (y: number) => pad.t + (1 - (y - y0) / Math.max(1, y1 - y0)) * (height - pad.t - pad.b);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${X(p.x)},${Y(p.y)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label="Courbe">
      <line x1={pad.l} x2={width - pad.r} y1={Y(0)} y2={Y(0)} stroke="currentColor" strokeOpacity={0.35} strokeDasharray="4 4" />
      <path d={d} fill="none" stroke="var(--orange)" strokeWidth={2.5} />
      {points.map((p, i) => (
        <circle key={i} cx={X(p.x)} cy={Y(p.y)} r={3} fill={p.y < 0 ? 'var(--rouge)' : 'var(--orange)'}>
          <title>{`${xLabel(p.x)} : ${format(p.y)}`}</title>
        </circle>
      ))}
      <text x={4} y={Y(y1) + 4} fontSize={11} fill="currentColor">{format(y1)}</text>
      <text x={4} y={Y(y0)} fontSize={11} fill="currentColor">{format(y0)}</text>
      <text x={pad.l} y={height - 6} fontSize={11} fill="currentColor">{xLabel(x0)}</text>
      <text x={width - pad.r} y={height - 6} fontSize={11} fill="currentColor" textAnchor="end">{xLabel(x1)}</text>
    </svg>
  );
}

export function useLocal<T>(key: string, initial: T): [T, (v: T | ((p: T) => T)) => void] {
  const [v, setV] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(`baskest-lab:${key}`);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(`baskest-lab:${key}`, JSON.stringify(v));
    } catch {
      /* stockage indisponible : l'état reste en mémoire */
    }
  }, [key, v]);
  return [v, setV];
}

export function download(name: string, content: string, type = 'text/plain') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const eur = (x: number) => `${Math.round(x).toLocaleString('fr-FR')} €`;
export const pct = (x: number) => `${Math.round(x * 100)} %`;
