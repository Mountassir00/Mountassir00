import { useMemo, useState } from 'react';
import { Page, Panel, Scoreboard, Criteria, Table, Gate, useLocal, NumberField, SelectField } from '../ui';
import { feature } from '../features';
import { allConcepts, analysisOf } from '../lab';
import { evaluateConcept, CRITERIA } from '../../core/scoring/evaluate';
import { MATURITY_LEVELS, maturityLabel } from '../../core/scoring/maturity';
import type { CriterionKey, Evaluation } from '../../core/model';
import { INNOVATIONS } from '../../data/innovations';

export function Scoring() {
  const f = feature('notation');
  const analyses = useMemo(() => allConcepts().map((c) => analysisOf(c, 100)), []);
  const ranked = analyses.slice().sort((a, b) => Number(b.evaluation.eligible) - Number(a.evaluation.eligible) || b.evaluation.total - a.evaluation.total);
  const [sel, setSel] = useState(0);
  const [overrides, setOverrides] = useLocal<Record<string, NonNullable<Evaluation['overrides']>>>('overrides', {});
  const a = ranked[sel];
  const ov = overrides[a.concept.id] ?? [];
  const ev = ov.length ? evaluateConcept({ concept: a.concept, fairness: a.fairness, scenarios: a.scenarios, rules: a.rules, layout: a.layout, innovations: INNOVATIONS, overrides: ov }) : a.evaluation;
  const [key, setKey] = useState<CriterionKey>('faisabilite');
  const [pts, setPts] = useState(10);
  const [reason, setReason] = useState('');
  return (
    <Page title="Tableau de notation" intro="Chaque concept est noté sur 100. Sécurité, équité et conformité sont des conditions préalables, hors note. La maturité n’avance que sur preuves." status={f.status}>
      <Table
        head={['Concept', 'Note', 'Grade', 'Sécurité', 'Équité', 'Conformité', 'Maturité']}
        numeric={[1]}
        selected={sel}
        onRowClick={setSel}
        rows={ranked.map((x) => [x.concept.title, x.evaluation.total, x.evaluation.grade, <Gate s={x.evaluation.gates.safety} />, <Gate s={x.evaluation.gates.fairness} />, <Gate s={x.evaluation.gates.compliance} />, maturityLabel(x.evaluation.maturity)])}
      />
      <div className="grid two" style={{ marginTop: 18 }}>
        <Panel title="Détail de la note">
          <Scoreboard ev={ev} title={a.concept.title} />
          <div style={{ marginTop: 14 }}>
            <Criteria ev={ev} />
          </div>
          {ev.gates.details.map((d, i) => (
            <div key={i} className="alert">{d}</div>
          ))}
        </Panel>
        <Panel title="Justifications et jury">
          {ev.criteria.map((c) => (
            <p key={c.key} className="small">
              <b>{c.label}</b> : {c.reasons.join(' ; ') || '—'}
            </p>
          ))}
          <h3>Ajuster une note (jury)</h3>
          <p className="muted small">Toute surcharge est motivée et tracée dans le dossier.</p>
          <div className="grid two">
            <SelectField label="Critère" value={key} onChange={setKey} options={CRITERIA.map((c) => ({ value: c.key, label: `${c.label} (/${c.max})` }))} />
            <NumberField label="Points" value={pts} onChange={setPts} min={0} max={15} step={0.5} />
          </div>
          <label className="field" style={{ marginTop: 8 }}>
            <span>Motif</span>
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex. salle confirmée par la Métropole" />
          </label>
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn" disabled={!reason.trim()} onClick={() => setOverrides({ ...overrides, [a.concept.id]: [...ov.filter((o) => o.key !== key), { key, points: pts, by: 'jury Bask’Est', reason }] })}>
              Enregistrer l’ajustement
            </button>
            {ov.length > 0 && (
              <button className="btn ghost" onClick={() => setOverrides({ ...overrides, [a.concept.id]: [] })}>
                Revenir à la note calculée
              </button>
            )}
          </div>
          <h3>Échelle de maturité</h3>
          <Table head={['Niveau', 'Preuve exigée']} rows={MATURITY_LEVELS.map((m) => [m.level === ev.maturity ? <b>{m.label}</b> : m.label, m.requirement])} />
          <p className="small">Prochaine étape : {ev.nextMaturitySteps[0]}</p>
        </Panel>
      </div>
    </Page>
  );
}
