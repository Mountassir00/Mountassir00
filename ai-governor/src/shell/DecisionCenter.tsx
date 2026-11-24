/**
 * GO / NO GO / TEST center — available from every experience (rail, key D,
 * host.openDecisions()). Each verdict is a command: permissions, replay lock
 * and a confirmation proportional to risk apply.
 */
import { useState } from 'react';
import type { Decision, Verdict } from '@core/projection';
import { IconClose, NatureBadge } from '@ds';
import { fmtRelative, fmtUsd, useCatalogIndex, useGovernor } from '@sdk';
import { requestCommand, useRuntime } from './context';
import { ui } from './uiStore';

const REV = { reversible: 'Réversible', partial: 'Partiellement réversible', irreversible: 'Irréversible' } as const;
const RISK = { low: 'Risque faible', medium: 'Risque modéré', high: 'Risque élevé' } as const;
const VERDICT = { go: 'GO', nogo: 'NO GO', test: 'TEST' } as const;

export function DecisionCenter() {
  const g = useGovernor();
  const [tab, setTab] = useState<'pending' | 'history'>('pending');
  const all = Object.values(g.state.decisions).sort((a, b) => b.proposedAt - a.proposedAt);
  const pending = all.filter((d) => d.status === 'pending');
  const done = all.filter((d) => d.status !== 'pending');
  return (
    <aside className="drawer" aria-label="Centre de décision GO / NO GO / TEST">
      <div className="drawer__grip" aria-hidden />
      <div className="drawer__head">
        <h2 className="t-h2" style={{ flex: 1 }}>
          Décisions
        </h2>
        <button type="button" className="btn btn--icon btn--ghost" onClick={() => ui.set({ drawer: null })} aria-label="Fermer le centre de décision">
          <IconClose size={18} />
        </button>
      </div>
      <div className="drawer__body">
        <div className="seg" role="tablist" aria-label="Décisions" style={{ marginBottom: 12 }}>
          <button type="button" role="tab" aria-selected={tab === 'pending'} onClick={() => setTab('pending')}>
            En attente <span className="pill">{pending.length}</span>
          </button>
          <button type="button" role="tab" aria-selected={tab === 'history'} onClick={() => setTab('history')}>
            Historique
          </button>
        </div>
        {g.mode === 'replay' && <p className="notice">Replay : vous consultez l’état des décisions à cet instant. Aucun arbitrage possible.</p>}
        {tab === 'pending' && (pending.length ? pending.map((d) => <DecisionCard key={d.id} d={d} />) : <div className="empty">Aucune proposition en attente.</div>)}
        {tab === 'history' &&
          (done.length ? (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
              {done.map((d) => (
                <li key={d.id} className="panel" style={{ padding: '10px 12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <b style={{ fontWeight: 600 }}>{d.title}</b>
                    <span className={`pill ${d.status === 'go' ? 'pill--risk-low' : d.status === 'nogo' ? 'pill--risk-high' : 'pill--risk-medium'}`}>{VERDICT[d.status as Verdict]}</span>
                  </div>
                  <div className="t-micro t-muted">Arbitré {d.resolvedAt ? fmtRelative(d.resolvedAt, g.now) : ''}</div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty">Aucune décision arbitrée sur l’historique chargé.</div>
          ))}
      </div>
    </aside>
  );
}

function DecisionCard({ d }: { d: Decision }) {
  const g = useGovernor();
  const rt = useRuntime();
  const idx = useCatalogIndex();
  const decide = (verdict: Verdict, e: React.MouseEvent) =>
    requestCommand(rt, { type: 'decision.resolve', decisionId: d.id, verdict, durable: d.durable, costDeltaUsd: d.costDeltaUsd }, e.detail === 0 ? 'keyboard' : 'click');
  const disabled = g.mode === 'replay';
  return (
    <article className="panel" style={{ padding: 14, marginBottom: 10 }} aria-label={d.title}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
        <span className={`pill pill--risk-${d.risk}`}>{RISK[d.risk]}</span>
        <span className="pill">{REV[d.reversibility]}</span>
        {d.durable && <span className="pill pill--risk-high">Modifie les instructions</span>}
        <NatureBadge nature={d.nature} />
      </div>
      <h3 className="t-h3">{d.title}</h3>
      <p className="t-small t-soft" style={{ margin: '6px 0' }}>
        {d.rationale}
      </p>
      <dl className="kv" style={{ fontSize: '0.84rem' }}>
        <dt>Impact attendu</dt>
        <dd>{d.impact || '—'}</dd>
        {d.costDeltaUsd != null && (
          <>
            <dt>Coût supplémentaire</dt>
            <dd className="num">
              ≈ {fmtUsd(d.costDeltaUsd)} <NatureBadge nature="estimated" />
            </dd>
          </>
        )}
        <dt>Proposé par</dt>
        <dd>
          {d.proposedBy ? idx.agents.get(d.proposedBy)?.name ?? d.proposedBy : '—'} · {fmtRelative(d.proposedAt, g.now)}
        </dd>
        {d.departmentId && (
          <>
            <dt>Département</dt>
            <dd>{idx.departments.get(d.departmentId)?.name ?? d.departmentId}</dd>
          </>
        )}
      </dl>
      <div className="verdict" style={{ marginTop: 12 }}>
        <button type="button" className="btn go" disabled={disabled} onClick={(e) => decide('go', e)}>
          GO
        </button>
        <button type="button" className="btn test" disabled={disabled} onClick={(e) => decide('test', e)}>
          TEST
        </button>
        <button type="button" className="btn nogo" disabled={disabled} onClick={(e) => decide('nogo', e)}>
          NO GO
        </button>
      </div>
    </article>
  );
}
