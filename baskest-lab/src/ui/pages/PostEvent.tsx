import { useState } from 'react';
import { Page, Panel, Table, useLocal, Gate } from '../ui';
import { feature } from '../features';
import { auditEdition } from '../../core/audit/post-event';
import type { PostEventTargets } from '../../core/model';
import { EDITIONS, PROPERTIES } from '../../data/baskest-events';

const LABELS: Record<keyof PostEventTargets, string> = {
  attendance: 'Fréquentation',
  result: 'Résultat financier (€)',
  satisfaction: 'Satisfaction public (/10)',
  engagement: 'Engagement digital (vues)',
  sportQuality: 'Qualité sportive (/10)',
  maxWaitMin: 'Attente maximale (min)',
  incidents: 'Incidents',
  partnerSatisfaction: 'Satisfaction partenaires (/10)',
  volunteerHours: 'Charge bénévole (h)',
  organisationQuality: 'Qualité d’organisation (/10)',
};

const TARGETS: PostEventTargets = { attendance: 1500, result: 0, satisfaction: 8, engagement: 100000, sportQuality: 8, maxWaitMin: 75, incidents: 0, partnerSatisfaction: 8, volunteerHours: 240, organisationQuality: 8 };

export function PostEvent() {
  const f = feature('post-evenement');
  const [targets, setTargets] = useLocal<PostEventTargets>('audit-targets', TARGETS);
  const [actuals, setActuals] = useLocal<PostEventTargets>('audit-actuals', { ...TARGETS, attendance: 0, engagement: 0 });
  const [edition, setEdition] = useState(EDITIONS[0].id);
  const audit = auditEdition(targets, actuals);
  const ed = EDITIONS.find((e) => e.id === edition)!;
  const prop = PROPERTIES.find((p) => p.id === ed.propertyId);
  return (
    <Page title="Analyse post-événement" intro="Comparer objectifs et résultats réels, décider des priorités de l’édition suivante et nourrir l’intelligence événementielle propriétaire de Bask’Est." status={f.status}>
      <div className="grid two">
        <Panel title="Objectifs et réalisé">
          <p className="muted small">Saisissez les chiffres réels après l’événement. Les valeurs sont conservées dans ce navigateur.</p>
          <Table
            head={['Indicateur', 'Objectif', 'Réalisé']}
            rows={(Object.keys(LABELS) as (keyof PostEventTargets)[]).map((k) => [
              LABELS[k],
              <input type="number" aria-label={`Objectif ${LABELS[k]}`} value={targets[k]} onChange={(e) => setTargets({ ...targets, [k]: Number(e.target.value) })} />,
              <input type="number" aria-label={`Réalisé ${LABELS[k]}`} value={actuals[k]} onChange={(e) => setActuals({ ...actuals, [k]: Number(e.target.value) })} />,
            ])}
          />
        </Panel>
        <Panel title={`Audit : ${audit.score} % des objectifs atteints`}>
          <div className={`alert ${audit.meetsTargets ? 'ok' : ''}`}>
            {audit.meetsTargets ? 'Édition réussie : elle compte pour le passage au statut « format validé ».' : 'Moins de 70 % des objectifs atteints : l’édition ne compte pas encore comme réussie.'}
          </div>
          <Table head={['Indicateur', 'Écart', 'Statut']} rows={audit.lines.map((l) => [l.label, `${l.gapPct > 0 ? '+' : ''}${Math.round(l.gapPct * 100)} %`, <Gate s={l.status === 'atteint' ? 'ok' : l.status === 'proche' ? 'alerte' : 'bloquant'} label={l.status} />])} />
          <h3>Améliorations prioritaires</h3>
          <ol>
            {audit.priorities.map((p, i) => (
              <li key={i}>
                <b>{p.priority}</b> ({p.gap}) : {p.action}
              </li>
            ))}
          </ol>
        </Panel>
      </div>
      <Panel title="Base documentaire des éditions Bask’Est">
        <div className="row">
          <label className="field" style={{ maxWidth: 420 }}>
            <span>Édition</span>
            <select value={edition} onChange={(e) => setEdition(e.target.value)}>
              {EDITIONS.map((e) => (
                <option key={e.id} value={e.id}>
                  {PROPERTIES.find((p) => p.id === e.propertyId)?.name} — édition {e.number} {e.date ?? ''}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="small muted">{prop?.description}</p>
        <Table
          head={['Donnée', 'Disponibilité', 'Source / note']}
          rows={Object.entries(ed.dataCompleteness).map(([k, v]) => [k, <Gate s={v.confidence === 'verifie' ? 'ok' : v.confidence === 'probable' ? 'alerte' : 'non_evaluable'} label={v.confidence.replace('_', ' ')} />, v.source ? <a href={v.source} target="_blank" rel="noreferrer">{v.note ?? v.source}</a> : (v.note ?? '—')])}
        />
      </Panel>
    </Page>
  );
}
