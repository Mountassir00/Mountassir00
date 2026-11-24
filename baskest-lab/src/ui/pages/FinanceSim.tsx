import { useMemo, useState } from 'react';
import { Page, Panel, Table, SelectField, NumberField, LineChart, Kpi, eur, pct, download } from '../ui';
import { feature } from '../features';
import { allConcepts, analysisOf } from '../lab';
import { runScenarios, COST_LABELS, NATURE_LABELS, costAmount, revenueAmount, pricingGrid } from '../../core/finance/budget';
import type { Budget } from '../../core/model';

export function FinanceSim() {
  const f = feature('simulateur-financier');
  const concepts = allConcepts();
  const [id, setId] = useState(concepts[0].id);
  const base = useMemo(() => analysisOf(concepts.find((c) => c.id === id)!, 80).budget, [id]);
  const [edits, setEdits] = useState<Record<string, Budget>>({});
  const budget = edits[id] ?? base;
  const setBudget = (b: Budget) => setEdits({ ...edits, [id]: b });
  const scenarios = useMemo(() => runScenarios(budget), [budget]);
  const real = scenarios[1];
  const A = budget.assumptions;
  const exportCsv = () => {
    const lines = ['type;categorie;libelle;base;unitaire;quantite;montant', ...budget.costs.map((l) => `charge;${COST_LABELS[l.category]};${l.label};${l.basis};${l.unitCost};${l.quantity};${Math.round(costAmount(l, A))}`), ...budget.revenues.map((l) => `produit;${NATURE_LABELS[l.nature]};${l.label};${l.basis};${l.unitAmount};${l.quantity};${Math.round(revenueAmount(l, A))}`)];
    download(`budget-${id}.csv`, lines.join('\n'), 'text/csv');
  };
  return (
    <Page title="Simulateur financier" intro="Budget complet, trois scénarios, point mort et trésorerie avant l’événement. Recettes commerciales, dons, subventions, apports et emprunts ne sont jamais confondus. Montants unitaires : estimations à remplacer par des devis." status={f.status} actions={<button className="btn ghost" onClick={exportCsv}>Exporter en CSV</button>}>
      <div className="row" style={{ marginBottom: 14 }}>
        <SelectField label="Concept" value={id} onChange={setId} options={concepts.map((c) => ({ value: c.id, label: c.title }))} />
        <NumberField label="Spectateurs" value={A.spectators} onChange={(v) => setBudget({ ...budget, assumptions: { ...A, spectators: v } })} min={0} step={50} />
        <NumberField label="Part payante (%)" value={Math.round(A.paidShare * 100)} onChange={(v) => setBudget({ ...budget, assumptions: { ...A, paidShare: v / 100 } })} min={0} max={100} />
        <NumberField label="Imprévus (%)" value={Math.round(budget.contingencyRate * 100)} onChange={(v) => setBudget({ ...budget, contingencyRate: v / 100 })} min={0} max={30} />
        {edits[id] && (
          <button
            className="btn ghost"
            style={{ alignSelf: 'end' }}
            onClick={() => {
              const next = { ...edits };
              delete next[id];
              setEdits(next);
            }}
          >
            Réinitialiser
          </button>
        )}
      </div>
      <div className="grid two">
        <Panel title="Scénarios">
          <Table head={['Scénario', 'Charges', 'Produits', 'Résultat', 'Point mort', 'Trésorerie min.']} numeric={[1, 2, 3, 4, 5]} rows={scenarios.map((s) => [s.name, eur(s.totalCosts), eur(s.totalRevenues), <b style={{ color: s.result < 0 ? 'var(--rouge)' : 'var(--vert)' }}>{eur(s.result)}</b>, s.breakEvenSpectators ?? '—', eur(s.minCash)])} />
          <div className="kpis" style={{ marginTop: 12 }}>
            <Kpi value={pct(real.dependency.securedShare)} label="produits sécurisés" />
            <Kpi value={pct(real.dependency.subsidyShare)} label="part des subventions" />
            <Kpi value={pct(real.dependency.topSponsorShare)} label="premier partenaire" />
            <Kpi value={eur(Math.max(0, -real.minCash))} label="trésorerie à avancer" />
          </div>
          {real.alerts.map((a, i) => <div key={i} className="alert">{a}</div>)}
        </Panel>
        <Panel title="Trésorerie (scénario réaliste)">
          <LineChart points={real.cashflow.map((c) => ({ x: c.day, y: c.balance }))} format={eur} xLabel={(x) => (x === 0 ? 'J0' : x < 0 ? `J${x}` : `J+${x}`)} />
          <Table head={['Nature', 'Montant (réaliste)']} numeric={[1]} rows={Object.entries(real.revenuesByNature).map(([k, v]) => [NATURE_LABELS[k as keyof typeof NATURE_LABELS], eur(v)])} />
        </Panel>
      </div>
      <div className="grid two">
        <Panel title="Charges">
          <Table
            head={['Poste', 'Libellé', 'Unitaire (€)', 'Qté', 'Montant']}
            numeric={[4]}
            rows={budget.costs.map((l, i) => [
              COST_LABELS[l.category],
              <span title={l.note}>{l.label}{l.inKind ? ' (en nature)' : ''}</span>,
              <input type="number" aria-label={`Coût unitaire ${l.label}`} value={l.unitCost} onChange={(e) => setBudget({ ...budget, costs: budget.costs.map((x, j) => (j === i ? { ...x, unitCost: Number(e.target.value) } : x)) })} style={{ width: 90 }} />,
              l.quantity,
              eur(costAmount(l, A)),
            ])}
          />
        </Panel>
        <Panel title="Produits">
          <Table
            head={['Libellé', 'Nature', 'Unitaire (€)', 'Probabilité', 'Montant brut']}
            numeric={[4]}
            rows={budget.revenues.map((l, i) => [
              l.label,
              NATURE_LABELS[l.nature],
              <input type="number" aria-label={`Montant unitaire ${l.label}`} value={l.unitAmount} onChange={(e) => setBudget({ ...budget, revenues: budget.revenues.map((x, j) => (j === i ? { ...x, unitAmount: Number(e.target.value) } : x)) })} style={{ width: 90 }} />,
              <select aria-label={`Probabilité ${l.label}`} value={l.secured ? 'signe' : String(l.probability)} onChange={(e) => setBudget({ ...budget, revenues: budget.revenues.map((x, j) => (j === i ? { ...x, secured: e.target.value === 'signe', probability: e.target.value === 'signe' ? 1 : Number(e.target.value) } : x)) })}>
                <option value="signe">signé</option>
                {[0.9, 0.7, 0.6, 0.5, 0.3, 0.1].map((p) => <option key={p} value={String(p)}>{p * 100} %</option>)}
              </select>,
              eur(revenueAmount(l, A)),
            ])}
          />
          <h3>Grille tarifaire cohérente</h3>
          <Table head={['Tarif', 'Prix', 'Pourquoi']} rows={pricingGrid(budget.revenues.find((r) => r.stream === 'billetterie')?.unitAmount || 10).map((t) => [t.label, `${t.price} €`, t.note ?? ''])} />
        </Panel>
      </div>
    </Page>
  );
}
