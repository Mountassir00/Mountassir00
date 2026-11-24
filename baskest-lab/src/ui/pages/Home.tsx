import { useMemo } from 'react';
import { Page, Panel, Scoreboard, Table, Kpi, Gate, eur } from '../ui';
import { feature, FEATURES, SPACES } from '../features';
import { GRILLE_BLUEPRINT, PORTFOLIO, BUILDING_BLOCKS, UNIFIED_ERRORS, UNIFIED_WATCH } from '../../data/eventlab';
import { renderGenerated, evaluate, eur as eurEl, num } from '../../core/eventlab';
import { Money, VerdictLabel, DIRECTION_LABEL } from '../eventlab-ui';
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
  const grille = useMemo(() => renderGenerated(GRILLE_BLUEPRINT).summary, []);
  const top = useMemo(() => PORTFOLIO.map((c) => ({ c, e: evaluate(c) })).sort((a, b) => b.e.score - a.e.score), []);
  const bySpace = (id: string) => FEATURES.filter((x) => x.space === id);
  return (
    <Page title="Tableau de bord" intro="EVENT LAB réunit deux espaces : la verticale basket de Bask’Est (Nancy) et l’espace multisectoriel du moteur EVENT LAB. L’état de chaque module est affiché tel qu’il est." status={f.status}>
      <div className="grid two">
        <Panel title="Espace Basket — Bask’Est">
          <p className="muted small" style={{ marginTop: -4 }}>Moteurs spécialisés basket : simulation par possessions, équité Monte-Carlo, programmation, salles 2D/3D, règles de conception.</p>
          <div className="kpis">
            <Kpi value={concepts.length} label="concepts basket documentés" />
            <Kpi value={Math.round(flagship.evaluation.total)} label="note du dossier phare (All Star Game 2027)" />
            <Kpi value={bySpace('basket').length} label="modules de l’espace" />
          </div>
          <p className="row" style={{ marginTop: 12 }}>
            <a href="#/notation">Tableau de notation</a>
            <a href="#/generateur">Générateur de concepts</a>
            <a href="#/dossiers">Dossiers</a>
          </p>
        </Panel>
        <Panel title="Espace Multisectoriel">
          <p className="muted small" style={{ marginTop: -4 }}>
            Pilote terrain : <b>LA GRILLE 3x3</b>, blueprint v{GRILLE_BLUEPRINT.version} (brouillon), chiffres recalculés par le moteur.
          </p>
          <div className="kpis">
            <Kpi value={`${grille.score}/100`} label={`grade ${grille.grade}, ${grille.verdictLabel.toLowerCase()}`} />
            <Kpi value={<Money v={grille.results.central} />} label="résultat central (configuration standard)" />
            <Kpi value={grille.breakevenCentral == null ? '—' : num(grille.breakevenCentral)} label="spectateurs au seuil (central)" />
            <Kpi value={eurEl(grille.cashNeedCentral)} label={`besoin de trésorerie (${grille.cashNeedDay})`} />
          </div>
          <p className="small">
            Configuration économique : résultat central <Money v={grille.variants.economique?.results.central} />, seuil {grille.variants.economique?.breakevenCentral ?? '—'} spectateurs. Portefeuille : {PORTFOLIO.length} concepts, meilleur score {top[0].e.score} ({top[0].c.identity.name}) ; {BUILDING_BLOCKS.length} briques.
          </p>
          <p className="row">
            <a href="#/studio-config">Studio de configuration</a>
            <a href="#/portefeuille">Portefeuille</a>
            <a href="#/generateur-multi">Générateur</a>
            <a href="#/briques">Briques</a>
          </p>
        </Panel>
      </div>

      <div className="grid three" style={{ marginTop: 18 }}>
        <Panel title="Portefeuille : trois premiers">
          <ol className="mini-list">
            {top.slice(0, 3).map(({ c, e }) => (
              <li key={c.id}>
                <a href={`#/portefeuille?c=${c.id}`}>{c.identity.name}</a> — {e.score}/100 ({e.grade}), <VerdictLabel v={e.verdict} />
                <div className="muted small">{c.identity.directions.map((d) => DIRECTION_LABEL[d]).join(', ')}</div>
              </li>
            ))}
          </ol>
          <p className="muted small">Évaluations prévisionnelles (confiance 0,30 à 0,37) : des écarts de quelques points ne sont pas significatifs.</p>
        </Panel>
        <Panel title="Connaissances communes">
          <div className="kpis">
            <Kpi value={UNIFIED_ERRORS.length} label="erreurs (registre unifié)" />
            <Kpi value={UNIFIED_WATCH.length} label="domaines de veille" />
          </div>
          <p className="row" style={{ marginTop: 12 }}>
            <a href="#/erreurs">Registre des erreurs</a>
            <a href="#/veille">Veille</a>
          </p>
        </Panel>
        <Panel title="État des modules">
          <p>
            {counts.operationnel} opérationnels, {counts.prototype} prototypes, {counts.integration} dépendant d’une intégration ({FEATURES.length} modules).
          </p>
          <ul className="mini-list small">
            {SPACES.map((sp) => {
              const xs = bySpace(sp.id);
              return (
                <li key={sp.id}>
                  {sp.label} : {xs.filter((x) => x.status === 'operationnel').length} opérationnel(s), {xs.filter((x) => x.status === 'prototype').length} prototype(s), {xs.filter((x) => x.status === 'integration').length} intégration(s)
                </li>
              );
            })}
          </ul>
          <p className="muted small">Chaque page affiche son statut en en-tête. Aucune publication, dépense ou réservation n’est déclenchée sans validation explicite. <a href="#/application">Application mobile</a>.</p>
        </Panel>
      </div>

      <h2 className="sr-only">Espace Basket — détail</h2>
      <div className="grid two" style={{ marginTop: 18 }}>
        <Panel title="Basket — dossier phare : All Star Game Grand Est 2027">
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
        <Panel title="Le laboratoire basket en chiffres">
          <div className="kpis">
            <Kpi value={concepts.length} label="concepts documentés" />
            <Kpi value={INNOVATIONS.length} label="innovations transposées" />
            <Kpi value={ERROR_CASES.length} label="cas d’erreurs BASK’EST" />
            <Kpi value={WATCH_SOURCES.length} label="sources de veille BASK’EST" />
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
