import { useMemo, useState } from 'react';
import { Page, Panel, Table, Gate, Kpi } from '../ui';
import { feature } from '../features';
import { PORTFOLIO, EVENTLAB_FILES } from '../../data/eventlab';
import { evaluate, CRITERIA, EVIDENCE_LABEL, type EventConfig, type EvaluationResult, type GateKey } from '../../core/eventlab';
import { DIRECTION_LABEL, VerdictLabel, hashParam, useScrollOnSelect } from '../eventlab-ui';
import { generatedConcepts, removeGeneratedConcept } from '../local-portfolio';
import { useRepo } from '../workspace';

const GATE_NAMES: Record<GateKey, string> = { securite: 'Sécurité', conformite_reglementaire: 'Conformité réglementaire', risques_critiques: 'Risques critiques' };

interface Row {
  c: EventConfig;
  e: EvaluationResult;
  local: boolean;
  /** Aucun risque ni point de conformité saisi : les portes ne peuvent pas être évaluées. */
  gatesUnknown: boolean;
}

const fr2 = (x: number) => x.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function rowsOf(list: EventConfig[], local: boolean): Row[] {
  return list
    .map((c) => ({ c, e: evaluate(c), local, gatesUnknown: !(c.risks?.length || c.compliance?.length) }))
    .sort((a, b) => b.e.score - a.e.score || a.c.identity.name.localeCompare(b.c.identity.name, 'fr'));
}

export function Portfolio() {
  const f = feature('portefeuille');
  const { repo: store, app, workspace } = useRepo();
  const [msg, setMsg] = useState<string | null>(null);
  const repo = useMemo(() => rowsOf(PORTFOLIO, false), []);
  // Recalcul à chaque modification de l'espace actif (app.rev change à chaque écriture ou synchronisation)
  const loc = useMemo(() => rowsOf(generatedConcepts(store), true), [store, app.rev]);
  const all = [...repo, ...loc];
  const [sel, setSel] = useState<string>(() => hashParam('c') ?? repo[0].c.id);
  const r = all.find((x) => x.c.id === sel) ?? repo[0];
  const detailRef = useScrollOnSelect<HTMLDivElement>(sel);
  const remove = (id: string) => {
    const err = removeGeneratedConcept(store, id);
    setMsg(err);
    if (!err && sel === id) setSel(repo[0].c.id);
  };
  const tableRows = (rows: Row[]) =>
    rows.map((x) => [
      <b>{x.c.identity.name}</b>,
      x.c.identity.directions.map((d) => DIRECTION_LABEL[d]).join(', '),
      x.c.identity.disciplines.length ? x.c.identity.disciplines.join(', ') : 'aucune',
      x.e.score,
      x.e.grade,
      fr2(x.e.confidence),
      x.gatesUnknown ? <VerdictLabel v="non_evaluable" /> : <VerdictLabel v={x.e.verdict} />,
    ]);
  const head = ['Nom', 'Directions', 'Discipline', 'Score /100', 'Grade', 'Confiance', 'Verdict'];
  const ratings = r.c.evaluation.ratings;
  return (
    <Page
      title="Portefeuille multisectoriel"
      intro="Concepts d’EVENT LAB triés par score. Chaque score est recalculé par le moteur à partir des dix notes justifiées : il n’est jamais saisi. Évaluations prévisionnelles, sans données réelles."
      status={f.status}
    >
      <Panel title={`Concepts du dépôt (${repo.length})`}>
        <p className="muted small">
          Source : <code>{EVENTLAB_FILES.portfolio}</code>. Verdict « sous réserve » pour tous : aucun point réglementaire obligatoire n’est encore vérifié (règle 07 §1.5 appliquée au stade blueprint). Des écarts de 1 à 3 points ne sont pas significatifs (confiance 0,30 à 0,37 sur 1).
        </p>
        <Table head={head} numeric={[3, 5]} rows={tableRows(repo)} onRowClick={(i) => setSel(repo[i].c.id)} selected={repo.findIndex((x) => x.c.id === r.c.id)} />
      </Panel>

      {loc.length > 0 && (
        <Panel title={`Ajouts du générateur (${loc.length})`} className="">
          <p className="muted small">Squelettes générés, conservés {workspace === 'local' ? 'dans ce navigateur uniquement (mode local)' : 'dans l’organisation active (synchronisés)'}. Pré-notes automatiques (jugement expert) à revoir ; sans risques ni conformité saisis, leurs portes ne sont pas évaluables.</p>
          <Table head={[...head, 'Action']} numeric={[3, 5]} rows={tableRows(loc).map((row, i) => [...row, <button className="btn ghost" onClick={(e) => { e.stopPropagation(); remove(loc[i].c.id); }}>Retirer</button>])} onRowClick={(i) => setSel(loc[i].c.id)} selected={loc.findIndex((x) => x.c.id === r.c.id)} />
          {msg && <div className="alert">{msg}</div>}
        </Panel>
      )}

      <div className="grid two" style={{ marginTop: 18, scrollMarginTop: 72 }} ref={detailRef}>
        <Panel title={r.c.identity.name}>
          <p className="muted" style={{ marginTop: -4 }}>
            {r.c.identity.tagline} · version {r.c.version} ({r.c.status}) · maturité {r.c.maturity ?? 'concept'}
            {r.local && <span className="badge local">ajout local</span>}
          </p>
          <div className="kpis">
            <Kpi value={`${r.e.score}/100`} label={`grade ${r.e.grade}`} />
            <Kpi value={fr2(r.e.confidence)} label="indice de confiance (0,3 à 1)" />
            <Kpi value={r.gatesUnknown ? <VerdictLabel v="non_evaluable" /> : <VerdictLabel v={r.e.verdict} />} label="verdict (portes éliminatoires)" />
            <Kpi value={`${r.e.improvements.scoreIfPlusOne}/100`} label="score atteignable si chaque note gagne +1" />
          </div>
          {r.c.identity.pitch && (
            <>
              <h3>Pitch</h3>
              <p>{r.c.identity.pitch}</p>
            </>
          )}
          <p className="small">
            Directions : {r.c.identity.directions.map((d) => DIRECTION_LABEL[d]).join(', ')} · discipline : {r.c.identity.disciplines.join(', ') || 'aucune'}
          </p>
          {!r.local && (
            <p className="row">
              <a href={`#/studio-config?c=concept:${r.c.id}`}>Ouvrir dans le studio de configuration</a>
            </p>
          )}
          <h3>Portes éliminatoires</h3>
          {r.gatesUnknown ? (
            <p className="notice">Aucun risque ni point de conformité saisi : les portes ne peuvent pas être évaluées (le moteur les afficherait « OK » par absence de données).</p>
          ) : (
            <ul className="list-plain">
              {(Object.keys(GATE_NAMES) as GateKey[]).map((k) => (
                <li key={k}>
                  <Gate s={r.e.gates[k].status === 'ok' ? 'ok' : r.e.gates[k].status === 'a_verifier' ? 'a_verifier' : 'bloquant'} label={GATE_NAMES[k]} />
                  {r.e.gates[k].notes && <div className="muted small">{r.e.gates[k].notes}</div>}
                </li>
              ))}
            </ul>
          )}
          <h3>Améliorations prioritaires</h3>
          <ol className="mini-list">
            {r.e.improvements.top.map((t) => (
              <li key={t.key}>
                <b>{t.label}</b> — gain potentiel {t.gain.toLocaleString('fr-FR')} points
                {t.actions.length > 0 ? (
                  <ul className="mini-list">
                    {t.actions.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="muted small">Aucune action renseignée dans la fiche.</div>
                )}
              </li>
            ))}
          </ol>
        </Panel>
        <Panel title="Dix critères notés">
          <Table
            head={['Critère', 'Poids', 'Note /5', 'Points', 'Preuve', 'Justification']}
            numeric={[1, 2, 3]}
            rows={CRITERIA.map((c) => [c.label, c.weight, ratings[c.key].rating.toLocaleString('fr-FR'), ((c.weight * ratings[c.key].rating) / 5).toLocaleString('fr-FR', { maximumFractionDigits: 1 }), EVIDENCE_LABEL[ratings[c.key].evidence ?? 'jugement_expert'], <span className="small">{ratings[c.key].justification ?? '—'}</span>])}
          />
          <p className="muted small">Score = Σ poids × note / 5, arrondi à l’entier (07 §1.2). Confiance = Σ poids × niveau de preuve / 100 (données réelles 1 ; benchmark sourcé 0,6 ; jugement expert 0,3).</p>
        </Panel>
      </div>

      <div className="grid two" style={{ marginTop: 18 }}>
        <Panel title={`Hypothèses (${r.c.hypotheses?.length ?? 0})`}>
          {r.c.hypotheses?.length ? (
            <ul className="mini-list">
              {r.c.hypotheses.map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ul>
          ) : (
            <p className="muted">Aucune hypothèse listée.</p>
          )}
        </Panel>
        <Panel title={`Sources (${r.c.sources?.length ?? 0})`}>
          {r.c.sources?.length ? (
            <ul className="list-plain small">
              {r.c.sources.map((s) => (
                <li key={s.id}>
                  <b>[{s.id}]</b> {s.url ? <a href={s.url} target="_blank" rel="noreferrer">{s.title}</a> : s.title}
                  {s.publisher ? ` — ${s.publisher}` : ''}
                  {s.reliability ? ` · fiabilité ${s.reliability}` : ''}
                  {s.accessed_at ? ` · consulté le ${s.accessed_at}` : ''}
                  {typeof s.verification === 'string' && <div className="muted">{s.verification}</div>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Aucune source enregistrée (squelette généré : la veille doit l’alimenter).</p>
          )}
        </Panel>
      </div>
    </Page>
  );
}
