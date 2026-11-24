/**
 * Objectifs: targets set by the user (suggested defaults are labelled as
 * such). Persisted per experience via host.getLocal/setLocal.
 */
import { useState, type ReactNode } from 'react';
import { NatureBadge } from '@ds';
import { fmtPct, fmtUsd, type DataNature, type HostApi } from '@sdk';
import { GOALS, goalCurrent, goalProgress, type GoalDef, type GoalId, type GoalTargets, type PeriodFigures } from './data';
import { GAlert, GChevron, GCoin, GLayers, GSpark } from './glyphs';

const ICON: Record<GoalId, ReactNode> = {
  cache: <GLayers size={20} />,
  costPerTask: <GCoin size={20} />,
  quality: <GSpark size={20} />,
  errors: <GAlert size={20} />,
};
const TONE: Record<GoalId, string> = { cache: 'var(--p1)', costPerTask: 'var(--p5)', quality: 'var(--p3)', errors: 'var(--p6)' };
const BAR: Record<GoalId, string> = { cache: 'var(--st-validating)', costPerTask: 'var(--series-2)', quality: 'var(--c-accent)', errors: 'var(--st-error)' };

const fmt = (def: GoalDef, v: number) => (def.unit === 'usd' ? fmtUsd(v, v < 1 ? 3 : 2) : fmtPct(v, v < 0.1 ? 1 : 0));

export function Goals({ host, f, nature }: { host: HostApi; f: PeriodFigures; nature: DataNature }) {
  const [targets, setTargets] = useState<GoalTargets>(() => host.getLocal<GoalTargets>('goals', {}));
  const [editing, setEditing] = useState<GoalId | null>(null);
  const save = (id: GoalId, v: number | undefined) => {
    const next = { ...targets };
    if (v == null) delete next[id];
    else next[id] = v;
    setTargets(next);
    host.setLocal('goals', next);
  };
  return (
    <div className="cc-goals">
      {GOALS.map((def) => {
        const custom = targets[def.id];
        const target = custom ?? def.suggested;
        const cur = goalCurrent(def.id, f);
        const prog = goalProgress(def, cur, target);
        const met = prog === 1;
        const pctInput = def.unit === 'pct';
        return (
          <article key={def.id} className="cc-goal" data-met={met || undefined}>
            <header className="cc-goal__head">
              <span className="cc-goal__icon" style={{ background: TONE[def.id] }} aria-hidden>
                {ICON[def.id]}
              </span>
              <div className="cc-goal__title">
                <b>{def.title}</b>
                <span className="t-micro t-muted">
                  {custom != null ? 'Votre objectif' : 'Objectif suggéré'} : {def.direction === 'min' ? '≥' : '≤'} {fmt(def, target)}
                </span>
              </div>
              <button
                type="button"
                className="cc-goal__more"
                aria-expanded={editing === def.id}
                aria-label={`Modifier l’objectif ${def.title}`}
                onClick={() => setEditing(editing === def.id ? null : def.id)}
              >
                <GChevron size={16} style={{ transform: editing === def.id ? 'rotate(90deg)' : undefined, transition: 'transform 200ms' }} />
              </button>
            </header>
            <div className="cc-goal__figures">
              <b className="num">{cur == null ? 'Indisponible' : fmt(def, cur)}</b>
              <span className="num t-muted">{fmt(def, target)}</span>
            </div>
            <div className="cc-bar" role="meter" aria-label={`${def.title} : ${prog == null ? 'non mesurable' : `${Math.round(prog * 100)} % de l’objectif`}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={prog == null ? 0 : Math.round(prog * 100)}>
              <i style={{ width: `${(prog ?? 0) * 100}%`, background: BAR[def.id] }} />
            </div>
            <footer className="cc-goal__foot">
              <span className="t-micro t-muted">{cur == null ? 'Aucune donnée sur la période' : met ? 'Objectif atteint' : def.direction === 'min' ? 'En dessous de l’objectif' : 'Au-dessus de l’objectif'}</span>
              <span className="cc-goal__pct num">{prog == null ? '—' : `${Math.round(prog * 100)} %`}</span>
            </footer>
            <NatureBadge nature={cur == null ? 'unavailable' : nature} />
            {editing === def.id && (
              <form
                className="cc-goal__edit"
                onSubmit={(e) => {
                  e.preventDefault();
                  setEditing(null);
                }}
              >
                <label className="field">
                  <span>
                    Cible ({def.direction === 'min' ? 'minimum' : 'maximum'}, {pctInput ? '%' : '$'})
                  </span>
                  <input
                    className="input"
                    type="number"
                    inputMode="decimal"
                    min={pctInput ? def.min * 100 : def.min}
                    max={pctInput ? def.max * 100 : def.max}
                    step={pctInput ? def.step * 100 : def.step}
                    value={pctInput ? Math.round(target * 1000) / 10 : target}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      if (!Number.isFinite(n)) return;
                      const v = pctInput ? n / 100 : n;
                      save(def.id, Math.min(def.max, Math.max(def.min, v)));
                    }}
                  />
                </label>
                <div className="cc-goal__edit-actions">
                  <button type="button" className="btn btn--sm btn--ghost" onClick={() => save(def.id, undefined)} disabled={custom == null}>
                    Revenir à la suggestion
                  </button>
                  <button type="submit" className="btn btn--sm btn--primary">
                    OK
                  </button>
                </div>
              </form>
            )}
          </article>
        );
      })}
    </div>
  );
}
