import { useMemo } from 'react';
import { Page, Panel, Scoreboard, Table, Kpi, Gate, eur } from '../ui';
import { feature, FEATURES } from '../features';
import { analysisOf, allConcepts } from '../lab';
import { ASG_2027 } from '../../data/flagship-asg-2027';
import { INNOVATIONS } from '../../data/innovations';
import { ERROR_CASES } from '../../data/errors';
import { WATCH_SOURCES } from '../../data/watch-sources';
import { PROPERTIES, DATA_REQUESTS } from '../../data/baskest-events';
import { maturityLabel } from '../../core/scoring/maturity';

export function Home() {
  const f = feature('accueil');
  const flagship = useMemo(() => analysisOf(ASG_2027, 150), []);
  const concepts = allConcepts();
  const real = flagship.scenarios[1];
  const counts = { operationnel: 0, prototype: 0, integration: 0 };
  FEATURES.forEach((x) => counts[x.status]++);
  return (
    <Page title="Tableau de bord" intro="De l’idée à l’événement documenté : l’état du laboratoire, le dossier phare et ce qu’il reste à fournir." status={f.status}>
      <div className="grid two">
        <Panel title="Dossier phare : All Star Game Grand Est 2027">
          <Scoreboard ev={flagship.evaluation} title="Édition 2, Palais des Sports Jean-Weille" meta="Hypothèses à recaler sur les chiffres réels de l’édition 2026" />
          <div className="kpis" style={{ marginTop: 16 }}>
            <Kpi value={flagship.concept.expectedSpectators} label="spectateurs visés (hypothèse)" />
            <Kpi value={eur(real.result)} label="résultat, scénario réaliste" />
            <Kpi value={real.breakEvenSpectators ?? '—'} label="spectateurs au point mort" />
            <Kpi value={flagship.schedule.conflicts.length} label="conflits de planning" />
          </div>
          <p className="row" style={{ marginTop: 14 }}>
            <a href="#/dossiers">Ouvrir le Blueprint</a>
            <a href="#/simulateur-financier">Ajuster le budget</a>
            <a href="#/salles">Voir l’implantation</a>
          </p>
        </Panel>
        <Panel title="Données que l’association doit fournir">
          <p className="muted small">Sans ces données, l’audit des événements existants reste partiel. Priorité 1 d’abord.</p>
          <ul className="list-plain">
            {DATA_REQUESTS.map((d, i) => (
              <li key={i}>
                <span className={`tag ${d.priority === 1 ? 'hot' : ''}`}>priorité {d.priority}</span> {d.item}
                <div className="muted small">{d.why}</div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="grid three" style={{ marginTop: 18 }}>
        <Panel title="Le laboratoire en chiffres">
          <div className="kpis">
            <Kpi value={concepts.length} label="concepts documentés" />
            <Kpi value={INNOVATIONS.length} label="innovations transposées" />
            <Kpi value={ERROR_CASES.length} label="erreurs documentées" />
            <Kpi value={WATCH_SOURCES.length} label="sources de veille" />
          </div>
        </Panel>
        <Panel title="Propriétés Bask’Est">
          <ul className="list-plain">
            {PROPERTIES.map((p) => (
              <li key={p.id}>
                <b>{p.name}</b> <span className="tag">{maturityLabel(p.maturity)}</span>
                <div className="muted small">{p.description.slice(0, 150)}…</div>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="État des modules">
          <p>
            {counts.operationnel} opérationnels, {counts.prototype} prototypes, {counts.integration} dépendant d’une intégration.
          </p>
          <p className="muted small">Chaque page affiche son statut en en-tête. Aucune publication, dépense ou réservation n’est déclenchée sans validation explicite.</p>
        </Panel>
      </div>

      <Panel title="Règles de conception du dossier phare" className="">
        <Table
          head={['Règle', 'Résultat', 'Constat', 'Correction proposée']}
          rows={flagship.rules
            .filter((r) => r.outcome !== 'ok')
            .concat(flagship.rules.filter((r) => r.outcome === 'ok').slice(0, 3))
            .map((r) => [`${r.ruleId} ${r.label}`, <Gate s={r.outcome} />, r.message, r.fix ?? '—'])}
        />
      </Panel>
    </Page>
  );
}
