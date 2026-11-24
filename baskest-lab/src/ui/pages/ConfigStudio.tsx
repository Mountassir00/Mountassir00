import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Page, Panel, Table, Tabs, Kpi, Gate, download } from '../ui';
import { feature } from '../features';
import { GRILLE_BLUEPRINT, GRILLE_SUMMARY_REF, PORTFOLIO, EVENTLAB_FILES } from '../../data/eventlab';
import {
  SCENARIOS,
  CRITERIA,
  INCIDENT_TYPES,
  EVIDENCE_LABEL,
  SC_LABEL,
  STAGE_TYPE_LABEL,
  EQUIPMENT_SOURCE_LABEL,
  CERT_LABEL,
  TRANSITIONS,
  applyVariant,
  variantIds,
  variantLabel,
  variantSummaries,
  simulateAll,
  breakeven,
  cashByDay,
  sensitivity,
  simulateCompetition,
  flowAnalysis,
  evaluate,
  runIncident,
  standardIncidents,
  renderGenerated,
  edit,
  newVersion,
  transition,
  diff,
  hhmm,
  dayLabel,
  eur,
  num,
  pct,
  type EventConfig,
  type ScenarioKey,
  type Incident,
  type IncidentType,
  type EquipmentSource,
  type TransitionAction,
  type GateKey,
  type BreakevenResult,
} from '../../core/eventlab';
import { CashChart, Tornado, Money, VerdictLabel, hashParam, readStore, writeStore, shortJson, copyText } from '../eventlab-ui';

// ---------------------------------------------------------------- sources de configuration
interface SourceDef {
  key: string;
  label: string;
  config: EventConfig;
}
const SOURCES: SourceDef[] = [
  { key: 'blueprint:la-grille-3x3', label: `LA GRILLE 3x3 — blueprint v${GRILLE_BLUEPRINT.version}`, config: GRILLE_BLUEPRINT },
  ...[...PORTFOLIO].sort((a, b) => a.identity.name.localeCompare(b.identity.name, 'fr')).map((c) => ({ key: `concept:${c.id}`, label: `${c.identity.name} — concept v${c.version}`, config: c })),
];

const STATUS_TEXT: Record<string, string> = { draft: 'brouillon', review: 'en revue', validated: 'validée (immuable)', archived: 'archivée (immuable)' };
const ACTION_TEXT: Record<TransitionAction, string> = { submit: 'Soumettre en revue', request_changes: 'Demander des modifications', approve: 'Approuver (valider)', archive: 'Archiver' };
const GATE_NAMES: Record<GateKey, string> = { securite: 'Sécurité', conformite_reglementaire: 'Conformité réglementaire', risques_critiques: 'Risques critiques' };
const PROG_KIND: Record<string, string> = { montage: 'montage', accueil: 'accueil', competition: 'compétition', show: 'show', ceremonie: 'cérémonie', pause: 'pause', animation: 'animation', demontage: 'démontage', media: 'média' };

const cmpVer = (a: string, b: string) => {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i];
  return 0;
};
const today = () => new Date().toISOString().slice(0, 10);
const storeKey = (k: string) => `eventlab:versions:${k}`;
const beText = (b: BreakevenResult) => (b.attendance == null ? 'inatteignable' : b.attendance === 0 ? 'aucun (couvert)' : `${num(b.attendance)} spectateurs`);
/** Exécute un calcul du moteur ; une configuration incomplète renvoie un message au lieu de casser la page. */
function safe<T>(f: () => T): { ok: true; v: T } | { ok: false; err: string } {
  try {
    return { ok: true, v: f() };
  } catch (e) {
    return { ok: false, err: e instanceof Error ? e.message : String(e) };
  }
}

function NumIn({ label, value, onChange, step = 1, min, hint, disabled }: { label: string; value: number; onChange: (v: number) => void; step?: number; min?: number; hint?: ReactNode; disabled?: boolean }) {
  const [txt, setTxt] = useState(String(value));
  useEffect(() => setTxt(String(value)), [value]);
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="number"
        inputMode="decimal"
        step={step}
        min={min}
        value={txt}
        disabled={disabled}
        onChange={(e) => {
          setTxt(e.target.value);
          const n = Number(e.target.value);
          if (e.target.value.trim() !== '' && Number.isFinite(n)) onChange(n);
        }}
      />
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function ConfigStudio() {
  const f = feature('studio-config');
  const initial = (() => {
    const c = hashParam('c');
    return SOURCES.find((s) => s.key === c || s.key === `concept:${c}`)?.key ?? SOURCES[0].key;
  })();
  const [srcKey, setSrcKey] = useState(initial);
  const source = SOURCES.find((s) => s.key === srcKey)!;
  const [versions, setVersions] = useState<EventConfig[]>(() => readStore<EventConfig[]>(storeKey(initial), []));
  const [selVer, setSelVer] = useState('depot');
  const [work, setWork] = useState<EventConfig | null>(null);
  const [variant, setVariant] = useState('standard');
  const [scenario, setScenario] = useState<ScenarioKey>('central');
  const [tab, setTab] = useState<'synthese' | 'tresorerie' | 'competition' | 'incidents' | 'notation' | 'versions'>('synthese');
  const [msg, setMsg] = useState<{ kind: 'ok' | 'block' | 'warn'; text: string; frozen?: boolean } | null>(null);
  const [author, setAuthor] = useState('porteur');
  const [summaryTxt, setSummaryTxt] = useState('');
  const [lineId, setLineId] = useState('');
  const [diffA, setDiffA] = useState('depot');
  const [diffB, setDiffB] = useState('travail');
  const [paramsOpen] = useState(() => {
    try {
      return window.matchMedia('(min-width: 901px)').matches;
    } catch {
      return true;
    }
  });

  const changeSource = (k: string) => {
    setSrcKey(k);
    setVersions(readStore<EventConfig[]>(storeKey(k), []));
    setSelVer('depot');
    setWork(null);
    setVariant('standard');
    setMsg(null);
    setLineId('');
  };
  const persist = (list: EventConfig[]) => {
    setVersions(list);
    const err = writeStore(storeKey(srcKey), list);
    if (err) setMsg({ kind: 'block', text: err });
  };

  const base: EventConfig = selVer === 'depot' ? source.config : (versions.find((v) => v.version === selVer) ?? source.config);
  const current = work ?? base;
  const vIds = variantIds(current);
  const activeVariant = vIds.includes(variant) ? variant : 'standard';
  const cfg = useMemo(() => applyVariant(current, activeVariant), [current, activeVariant]);
  const variantDef = (current.variants ?? []).find((v) => v.id === activeVariant);

  // ------------------------------------------------------------ calculs du moteur (recalculés à chaque modification)
  const all = useMemo(() => simulateAll(cfg), [cfg]);
  const bes = useMemo(() => SCENARIOS.map((s) => breakeven(cfg, s)), [cfg]);
  const cash = useMemo(() => cashByDay(cfg, scenario), [cfg, scenario]);
  const sens = useMemo(() => sensitivity(cfg, scenario), [cfg, scenario]);
  const comp = useMemo(() => safe(() => simulateCompetition(cfg)), [cfg]);
  const flows = useMemo(() => safe(() => flowAnalysis(cfg)), [cfg]);
  const ev = useMemo(() => safe(() => evaluate(cfg)), [cfg]);
  const variants = useMemo(() => variantSummaries(current), [current]);
  const regression = useMemo(() => {
    if (srcKey !== SOURCES[0].key || selVer !== 'depot' || work || activeVariant !== 'standard') return null;
    const s = renderGenerated(current).summary;
    return JSON.stringify(JSON.parse(JSON.stringify(s))) === JSON.stringify(GRILLE_SUMMARY_REF.summary);
  }, [srcKey, selVer, work, activeVariant, current]);

  // ------------------------------------------------------------ édition (moteur : edit() refuse une version figée)
  const mutate = (fn: (d: EventConfig) => void) => {
    try {
      setWork(edit(current, fn));
      setMsg(null);
    } catch (e) {
      setMsg({ kind: 'block', text: e instanceof Error ? e.message : String(e), frozen: true });
    }
  };
  const ticketLines = (current.budget?.revenues ?? []).filter((r) => r.stream === 'billetterie' && r.basis === 'per_paying_attendee');
  const ticketPrice = Math.round(ticketLines.reduce((s, r) => s + r.unit_amount, 0) * 100) / 100;
  const lines = [...(current.budget?.expenses ?? []).map((e) => ({ id: e.id, label: `${e.id} — ${e.label}`, kind: 'expense' as const, value: e.amount })), ...(current.budget?.revenues ?? []).map((r) => ({ id: r.id, label: `${r.id} — ${r.label}`, kind: 'revenue' as const, value: r.unit_amount }))];
  const line = lines.find((l) => l.id === lineId) ?? lines[0];
  const lineOverridden = line && variantDef && ((line.kind === 'expense' && variantDef.expense_overrides && line.id in variantDef.expense_overrides) || (line.kind === 'revenue' && variantDef.revenue_overrides && line.id in variantDef.revenue_overrides));

  const createFromFrozen = () => {
    const nextVer = [source.config.version, ...versions.map((v) => v.version)].sort(cmpVer).at(-1)!;
    const n = newVersion({ ...base, version: nextVer }, { author, summary: `Nouvelle version depuis ${base.version} (version figée non modifiable)`, date: today() });
    n.parent = { id: base.id, version: base.version, relation: 'new_version' };
    persist([...versions, n]);
    setSelVer(n.version);
    setWork(null);
    setMsg({ kind: 'ok', text: `Version ${n.version} créée en brouillon à partir de ${base.version}, qui reste inchangée.` });
  };
  const save = () => {
    const nextVer = [source.config.version, ...versions.map((v) => v.version)].sort(cmpVer).at(-1)!;
    const n = newVersion({ ...current, version: nextVer }, { author: author || 'inconnu', summary: summaryTxt.trim() || `Nouvelle version depuis ${current.version}`, date: today() });
    n.parent = { id: current.id, version: current.version, relation: 'new_version' };
    persist([...versions, n]);
    setSelVer(n.version);
    setWork(null);
    setSummaryTxt('');
    setDiffA(current.version === source.config.version && selVer === 'depot' ? 'depot' : current.version);
    setDiffB(n.version);
    setMsg({ kind: 'ok', text: `Version ${n.version} enregistrée en brouillon (parent : ${current.version}). La version de départ n’est pas modifiée.` });
  };
  const doTransition = (a: TransitionAction) => {
    try {
      const t = transition(base, a, { actor: author || 'inconnu', date: today() });
      persist(versions.map((v) => (v.version === base.version ? t : v)));
      setMsg({ kind: 'ok', text: `Version ${t.version} : ${STATUS_TEXT[t.status]}.` });
    } catch (e) {
      setMsg({ kind: 'block', text: e instanceof Error ? e.message : String(e) });
    }
  };
  const removeVersion = () => {
    persist(versions.filter((v) => v.version !== base.version));
    setSelVer('depot');
    setWork(null);
  };
  const exportName = `${current.id}-v${current.version}${work ? '-modifie' : ''}.json`;
  const exportJson = () => JSON.stringify(current, null, 2);

  // ------------------------------------------------------------ incidents
  const program = [...(cfg.program ?? [])].sort((a, b) => a.start_min - b.start_min);
  const defaultFrom = (program.find((p) => p.kind === 'competition' && p.start_min >= 780) ?? program.find((p) => p.kind === 'competition') ?? program[0])?.start_min ?? 0;
  const sourcesEq = [...new Set((cfg.resources?.equipment ?? []).map((e) => e.source).filter(Boolean))] as EquipmentSource[];
  const [inc, setInc] = useState<{ type: IncidentType; minutes: number; fromMin: number; count: number; source: EquipmentSource | ''; rate: number }>({ type: 'delay', minutes: 30, fromMin: defaultFrom, count: 3, source: '', rate: -40 });
  useEffect(() => setInc((p) => ({ ...p, fromMin: defaultFrom, source: '' })), [srcKey, defaultFrom]);
  const incident: Incident = useMemo(() => {
    switch (inc.type) {
      case 'delay':
        return { type: 'delay', minutes: inc.minutes, fromMin: inc.fromMin };
      case 'dropout':
        return { type: 'dropout', count: inc.count };
      case 'supplier_absence':
        return { type: 'supplier_absence', source: (inc.source || sourcesEq[0]) as EquipmentSource };
      case 'attendance_change':
        return { type: 'attendance_change', rate: inc.rate / 100 };
      case 'budget_cut':
        return { type: 'budget_cut', rate: Math.abs(inc.rate) / 100 };
      default:
        return { type: inc.type };
    }
  }, [inc, sourcesEq]);
  const incRes = useMemo(() => safe(() => runIncident(cfg, incident, scenario)), [cfg, incident, scenario]);
  const stdInc = useMemo(() => (cfg.program?.length && cfg.competition?.stages?.length ? safe(() => standardIncidents(cfg)) : null), [cfg]);

  // ------------------------------------------------------------ rendu
  const sc = all[scenario];
  const be = bes[SCENARIOS.indexOf(scenario)];
  const optionsVersions = [{ value: 'depot', label: `Dépôt v${source.config.version} (fichier, ${STATUS_TEXT[source.config.status]})` }, ...[...versions].sort((a, b) => cmpVer(a.version, b.version)).map((v) => ({ value: v.version, label: `Locale v${v.version} — ${STATUS_TEXT[v.status]}` }))];
  const diffOptions = [...optionsVersions, ...(work ? [{ value: 'travail', label: 'Modifications en cours (non enregistrées)' }] : [])];
  const getDiffCfg = (k: string) => (k === 'travail' ? work : k === 'depot' ? source.config : versions.find((v) => v.version === k)) ?? null;
  const dA = getDiffCfg(diffA);
  const dB = getDiffCfg(diffB);
  const diffs = dA && dB ? diff(dA, dB) : [];
  const cur = (s: ScenarioKey) => (s === scenario ? 'current' : '');
  const scRow = (label: ReactNode, fmt: (s: ScenarioKey) => ReactNode) => (
    <tr>
      <th scope="row" style={{ textAlign: 'left', background: 'transparent', color: 'var(--ink)', fontWeight: 400, position: 'static', whiteSpace: 'normal', minWidth: 140 }}>
        {label}
      </th>
      {SCENARIOS.map((s) => (
        <td key={s} className={`num ${cur(s)}`}>
          {fmt(s)}
        </td>
      ))}
    </tr>
  );

  return (
    <Page
      title="Studio de configuration"
      intro="Charger LA GRILLE 3x3 ou un concept du portefeuille, choisir une variante et un scénario, modifier quelques paramètres : tous les chiffres sont recalculés par le moteur EVENT LAB (le même que celui qui produit les blueprints). Les versions enregistrées restent dans ce navigateur."
      status={f.status}
    >
      <Panel>
        <div className="controls">
          <label className="field">
            <span>Configuration</span>
            <select value={srcKey} onChange={(e) => changeSource(e.target.value)}>
              {SOURCES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Version</span>
            <select
              value={selVer}
              onChange={(e) => {
                setSelVer(e.target.value);
                setWork(null);
                setMsg(null);
              }}
            >
              {optionsVersions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Variante</span>
            <select value={activeVariant} onChange={(e) => setVariant(e.target.value)}>
              {vIds.map((id) => (
                <option key={id} value={id}>
                  {variantLabel(current, id)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Scénario</span>
            <select value={scenario} onChange={(e) => setScenario(e.target.value as ScenarioKey)}>
              {SCENARIOS.map((s) => (
                <option key={s} value={s}>
                  {SC_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="status-line">
          <span>
            <b>{current.identity.name}</b> v{current.version} · {STATUS_TEXT[current.status] ?? current.status} · maturité {current.maturity ?? 'concept'}
          </span>
          {work && <span className="badge local">modifications non enregistrées</span>}
          {variantDef?.description && <span>Variante : {variantDef.description}</span>}
          {srcKey === SOURCES[0].key && (
            <span>
              Source : <code>{EVENTLAB_FILES.blueprint}</code>
            </span>
          )}
        </p>
        {regression !== null && (
          <div className={`alert ${regression ? 'ok' : 'block'}`}>
            {regression
              ? `Contrôle : les chiffres calculés ici sont identiques au résumé publié du blueprint v${GRILLE_SUMMARY_REF.version} (generated/summary.json du ${GRILLE_SUMMARY_REF.generatedAt}) — score, 3 scénarios, 4 variantes, seuil, trésorerie.`
              : 'Contrôle : écart entre le calcul et le résumé publié du blueprint — à signaler.'}
          </div>
        )}
        {msg && (
          <div className={`alert ${msg.kind === 'ok' ? 'ok' : msg.kind === 'block' ? 'block' : ''}`} role="status">
            {msg.text}
            {msg.frozen && (
              <div className="row" style={{ marginTop: 8 }}>
                <button className="btn" onClick={createFromFrozen}>
                  Créer une nouvelle version brouillon depuis v{base.version}
                </button>
              </div>
            )}
          </div>
        )}
      </Panel>

      <div className="grid side" style={{ marginTop: 18 }}>
        <details className="panel" open={paramsOpen}>
          <summary>Paramètres modifiables</summary>
          <div className="form">
            {current.audience?.attendance ? (
              <fieldset className="field" style={{ border: 'none', padding: 0, margin: 0 }}>
                <legend style={{ fontWeight: 600, padding: 0 }}>Fréquentation (spectateurs uniques)</legend>
                {SCENARIOS.map((s) => (
                  <NumIn key={s} label={SC_LABEL[s]} value={current.audience!.attendance[s]} step={10} min={0} onChange={(v) => mutate((d) => void (d.audience!.attendance[s] = Math.max(0, Math.round(v))))} />
                ))}
                {variantDef?.audience_overrides?.attendance && <small className="muted">La variante « {variantDef.label} » impose sa propre fréquentation : ces valeurs ne s’y appliquent pas.</small>}
              </fieldset>
            ) : (
              <p className="muted small">Pas de fréquentation par scénario dans cette configuration.</p>
            )}
            <NumIn
              label="Prix moyen encaissé par spectateur payant (€)"
              value={ticketPrice}
              step={0.5}
              min={0}
              disabled={ticketPrice <= 0}
              hint={ticketPrice > 0 ? `Somme des ${ticketLines.length} ligne(s) de billetterie par spectateur payant (${ticketLines.map((r) => r.id).join(', ')}) ; une modification les ajuste en proportion. Les libellés ne sont pas réécrits.` : 'Aucune recette de billetterie par spectateur payant dans cette configuration.'}
              onChange={(v) =>
                mutate((d) => {
                  const ls = (d.budget?.revenues ?? []).filter((r) => r.stream === 'billetterie' && r.basis === 'per_paying_attendee');
                  const tot = ls.reduce((s, r) => s + r.unit_amount, 0);
                  if (tot > 0) for (const r of ls) r.unit_amount = Math.round(((r.unit_amount * Math.max(0, v)) / tot) * 100) / 100;
                })
              }
            />
            {lines.length > 0 && line && (
              <>
                <label className="field">
                  <span>Ligne budgétaire</span>
                  <select value={line.id} onChange={(e) => setLineId(e.target.value)}>
                    <optgroup label="Dépenses">
                      {lines
                        .filter((l) => l.kind === 'expense')
                        .map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.label}
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label="Recettes">
                      {lines
                        .filter((l) => l.kind === 'revenue')
                        .map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.label}
                          </option>
                        ))}
                    </optgroup>
                  </select>
                </label>
                <NumIn
                  label={line.kind === 'expense' ? 'Montant de la dépense (€, forfait ou unitaire)' : 'Montant de la recette (€, forfait ou unitaire)'}
                  value={line.value}
                  step={10}
                  min={0}
                  hint={lineOverridden ? `Ligne surchargée par la variante « ${variantDef!.label} » : sans effet dans cette variante.` : undefined}
                  onChange={(v) =>
                    mutate((d) => {
                      if (line.kind === 'expense') {
                        const x = d.budget!.expenses.find((e) => e.id === line.id);
                        if (x) x.amount = Math.max(0, v);
                      } else {
                        const x = d.budget!.revenues.find((r) => r.id === line.id);
                        if (x) x.unit_amount = Math.max(0, v);
                      }
                    })
                  }
                />
              </>
            )}
            <div className="row">
              <button className="btn ghost" disabled={!work} onClick={() => setWork(null)}>
                Annuler les modifications
              </button>
              <button className="btn ghost" onClick={() => setTab('versions')}>
                Enregistrer une version…
              </button>
            </div>
            <p className="muted small">Les modifications passent par la fonction d’édition du moteur, qui refuse toute modification d’une version validée ou archivée.</p>
          </div>
        </details>

        <div style={{ minWidth: 0 }}>
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { value: 'synthese', label: 'Finances' },
              { value: 'tresorerie', label: 'Trésorerie et sensibilité' },
              { value: 'competition', label: 'Compétition et flux' },
              { value: 'incidents', label: 'Incidents' },
              { value: 'notation', label: 'Notation et portes' },
              { value: 'versions', label: `Versions (${versions.length})` },
            ]}
          />

          {tab === 'synthese' && (
            <div className="grid">
              <div className="kpis">
                <Kpi value={<Money v={sc.totals.result} />} label={`résultat, scénario ${SC_LABEL[scenario].toLowerCase()}`} />
                <Kpi value={beText(be)} label="seuil de rentabilité" />
                <Kpi value={eur(cash.maxNeed)} label={`besoin de trésorerie (${dayLabel(cash.maxNeedDay)})`} />
                <Kpi value={ev.ok ? `${ev.v.score}/100` : '—'} label={ev.ok ? `grade ${ev.v.grade}, ${ev.v.verdict === 'eligible' ? 'éligible' : ev.v.verdict === 'sous_reserve' ? 'sous réserve' : 'éliminé'}` : 'notation impossible'} />
              </div>
              <Panel title="Trois scénarios">
                <div className="table-wrap">
                  <table className="t">
                    <thead>
                      <tr>
                        <th scope="col">{variantLabel(current, activeVariant)}</th>
                        {SCENARIOS.map((s) => (
                          <th key={s} scope="col" className={`num ${cur(s)}`}>
                            {SC_LABEL[s]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {scRow('Spectateurs uniques', (s) => num(all[s].volumes.attendance))}
                      {scRow('Équipes / participants', (s) => num(all[s].volumes.participants))}
                      {scRow('Recettes sécurisées', (s) => eur(all[s].revenueByCertainty.secured))}
                      {scRow('Recettes probables (après taux de réalisation)', (s) => eur(all[s].revenueByCertainty.probable))}
                      {scRow('Recettes hypothétiques (après taux de réalisation)', (s) => eur(all[s].revenueByCertainty.hypothetical))}
                      {scRow(<b>Total recettes</b>, (s) => <b>{eur(all[s].totals.revenue)}</b>)}
                      {scRow('Dépenses (dérive incluse)', (s) => eur(all[s].totals.expenses_before_contingency))}
                      {scRow('Provision pour aléas', (s) => eur(all[s].totals.contingency))}
                      {scRow(<b>Total dépenses</b>, (s) => <b>{eur(all[s].totals.expenses)}</b>)}
                      {scRow(<b>Résultat</b>, (s) => <Money v={all[s].totals.result} strong />)}
                      {scRow('Seuil de rentabilité', (s) => beText(bes[SCENARIOS.indexOf(s)]))}
                    </tbody>
                  </table>
                </div>
                <p className="muted small">Taux de réalisation appliqués aux seules recettes forfaitaires (sponsors, subventions) ; dérive des coûts non devisés prudent +15 %, central +5 %, ambitieux 0 % ; provision 10 % (07 §7.1, paramètres de la configuration).</p>
              </Panel>
              <Panel title={`Recettes par certitude — scénario ${SC_LABEL[scenario].toLowerCase()}`}>
                {(['secured', 'probable', 'hypothetical'] as const).map((k) => {
                  const ls = sc.revenues.filter((r) => r.certainty === k);
                  return (
                    <div key={k}>
                      <h3>
                        {CERT_LABEL[k]} : {eur(sc.revenueByCertainty[k])}
                      </h3>
                      {ls.length ? (
                        <ul className="mini-list">
                          {ls.map((r) => (
                            <li key={r.id}>
                              {r.label} — {eur(r.amount)}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="muted small">Aucune.</p>
                      )}
                    </div>
                  );
                })}
              </Panel>
              <Panel title="Comparaison des variantes (scénario central pour le seuil et la trésorerie)">
                <Table
                  head={['Configuration', 'Dépenses (central)', 'Résultat prudent', 'Résultat central', 'Résultat ambitieux', 'Seuil (central)', 'Besoin de trésorerie (central)']}
                  numeric={[1, 2, 3, 4, 5, 6]}
                  selected={variants.findIndex((v) => v.id === activeVariant)}
                  onRowClick={(i) => setVariant(variants[i].id)}
                  rows={variants.map((v) => [v.label, eur(v.expensesCentral), <Money v={v.results.prudent} />, <Money v={v.results.central} />, <Money v={v.results.ambitieux} />, v.breakevenCentral == null ? 'inatteignable' : v.breakevenCentral === 0 ? 'aucun (couvert)' : num(v.breakevenCentral), eur(v.cashNeedCentral)])}
                />
              </Panel>
            </div>
          )}

          {tab === 'tresorerie' && (
            <div className="grid">
              <Panel title={`Plan de trésorerie — scénario ${SC_LABEL[scenario].toLowerCase()}`}>
                <p className="muted small">Solde cumulé en fin de jour (ligne) et point bas de la journée (cercle creux, décaissements comptés avant encaissements). Dates relatives au jour J, échelle de temps proportionnelle.</p>
                <CashChart days={cash.days} maxNeed={cash.maxNeed} maxNeedDay={cash.maxNeedDay} label={`Plan de trésorerie, scénario ${SC_LABEL[scenario].toLowerCase()}`} />
                <Table
                  head={['Date', 'Décaissements', 'Encaissements', 'Point bas du jour', 'Solde en fin de jour']}
                  numeric={[1, 2, 3, 4]}
                  rows={cash.days.map((d) => [dayLabel(d.day), eur(Math.abs(d.out)), eur(d.in), <Money v={d.low} />, <Money v={d.cum} />])}
                />
                <p className="small">
                  Besoin de trésorerie maximal : <b>{eur(cash.maxNeed)}</b> ({dayLabel(cash.maxNeedDay)}) · solde final {eur(cash.final)}.
                </p>
              </Panel>
              <Panel title={`Sensibilité du résultat — scénario ${SC_LABEL[scenario].toLowerCase()} (base ${eur(sens.base)})`}>
                <Tornado items={sens.items} />
                <Table
                  head={['Facteur', 'Variation', 'Si baisse', 'Si hausse', 'Amplitude', 'Élasticité']}
                  numeric={[2, 3, 4, 5]}
                  rows={sens.items.map((i) => [i.label, `± ${pct(i.range)}`, <Money v={i.low} />, <Money v={i.high} />, eur(i.swing), i.elasticity == null ? '—' : num(i.elasticity, 2)])}
                />
              </Panel>
            </div>
          )}

          {tab === 'competition' && (
            <div className="grid">
              <Panel title="Durées de compétition">
                {!comp.ok ? (
                  <div className="alert block">Calcul impossible : {comp.err}</div>
                ) : comp.v.stages.length === 0 ? (
                  <p className="muted">Aucune étape de compétition dans cette configuration.</p>
                ) : (
                  <>
                    <Table
                      head={['Étape', 'Type', 'Matchs / passages', 'Tours', 'Créneaux', 'Créneau', 'Durée nette', 'Avec marge 15 %', 'Occupation']}
                      numeric={[2, 3, 4, 5, 6, 7, 8]}
                      rows={comp.v.stages.map((s) => [s.label, STAGE_TYPE_LABEL[s.type] ?? s.type, num(s.matches), num(s.rounds), num(s.slots), `${num(s.slotMin, 1)} min`, `${num(s.netMin, 1)} min`, `${num(s.withMarginMin)} min`, pct(s.utilization)])}
                    />
                    <p className="small">
                      Total : <b>{num(comp.v.totalNetMin, 1)} min</b> nettes, <b>{num(comp.v.totalWithMarginMin)} min</b> avec la marge de 15 % (07 §4).
                    </p>
                  </>
                )}
              </Panel>
              <Panel title="Flux : présence, files d’attente">
                {!flows.ok ? (
                  <div className="alert block">Calcul impossible : {flows.err}</div>
                ) : !flows.v ? (
                  <p className="muted">Profil d’arrivée non renseigné dans cette configuration : flux non simulés.</p>
                ) : (
                  <>
                    <Table
                      head={['Scénario', 'Spectateurs', 'Pic de spectateurs présents', 'Heure du pic', 'Pic total (avec joueurs et équipe)', 'Part de l’effectif autorisé', 'Files QR (attente ≤ 10 min)', 'Files paiement', 'Alertes']}
                      numeric={[1, 2, 4, 5]}
                      selected={flows.v.findIndex((r) => r.scenario === scenario)}
                      rows={flows.v.map((r) => [SC_LABEL[r.scenario], num(r.attendance), num(r.peakSpectators), hhmm(r.peakClockMin), num(r.peakTotal), r.authorizedCapacity ? `${pct(r.peakTotal / r.authorizedCapacity)} de ${num(r.authorizedCapacity)}` : '—', r.qrLanes ?? '> 50', r.cashLanes ?? '> 50', r.alerts.length ? r.alerts.map((a) => a.message).join(' ; ') : 'aucune'])}
                    />
                    <p className="notice">Modèle fluide minute par minute, indicatif (07 §5) : il aide au dimensionnement et ne remplace ni l’avis du chargé de sécurité ni la réglementation (ERP, préfecture). L’effectif autorisé du lieu est une hypothèse tant que l’exploitant ne l’a pas confirmé.</p>
                  </>
                )}
              </Panel>
            </div>
          )}

          {tab === 'incidents' && (
            <div className="grid">
              <Panel title="Simulateur d’incidents">
                <div className="controls">
                  <label className="field">
                    <span>Incident</span>
                    <select value={inc.type} onChange={(e) => setInc({ ...inc, type: e.target.value as IncidentType })}>
                      {(Object.keys(INCIDENT_TYPES) as IncidentType[]).map((t) => (
                        <option key={t} value={t}>
                          {INCIDENT_TYPES[t]}
                        </option>
                      ))}
                    </select>
                  </label>
                  {inc.type === 'delay' && (
                    <>
                      <NumIn label="Retard (minutes)" value={inc.minutes} min={0} step={5} onChange={(v) => setInc({ ...inc, minutes: Math.max(0, v) })} />
                      <label className="field">
                        <span>À partir de</span>
                        <select value={inc.fromMin} disabled={!program.length} onChange={(e) => setInc({ ...inc, fromMin: Number(e.target.value) })}>
                          {program.length === 0 && <option value={0}>programme non renseigné</option>}
                          {[...new Map(program.map((p) => [p.start_min, p])).values()].map((p) => (
                            <option key={p.id} value={p.start_min}>
                              {hhmm(p.start_min)} — {p.label} ({PROG_KIND[p.kind] ?? p.kind})
                            </option>
                          ))}
                        </select>
                      </label>
                    </>
                  )}
                  {inc.type === 'dropout' && <NumIn label="Équipes ou participants forfait" value={inc.count} min={0} onChange={(v) => setInc({ ...inc, count: Math.max(0, Math.round(v)) })} />}
                  {inc.type === 'supplier_absence' && (
                    <label className="field">
                      <span>Provenance du matériel indisponible</span>
                      <select value={inc.source || sourcesEq[0] || ''} disabled={!sourcesEq.length} onChange={(e) => setInc({ ...inc, source: e.target.value as EquipmentSource })}>
                        {sourcesEq.length === 0 && <option value="">aucun matériel renseigné</option>}
                        {sourcesEq.map((s) => (
                          <option key={s} value={s}>
                            {EQUIPMENT_SOURCE_LABEL[s]}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  {inc.type === 'attendance_change' && <NumIn label="Variation de l’affluence (%)" value={inc.rate} step={5} min={-100} onChange={(v) => setInc({ ...inc, rate: Math.max(-100, v) })} />}
                  {inc.type === 'budget_cut' && <NumIn label="Réduction du budget (%)" value={Math.abs(inc.rate)} step={5} min={0} onChange={(v) => setInc({ ...inc, rate: Math.min(100, Math.max(0, v)) })} />}
                </div>
                {!incRes.ok ? (
                  <div className="alert block">Simulation impossible : {incRes.err}</div>
                ) : (
                  <>
                    <div className="kpis" style={{ marginTop: 14 }}>
                      <Kpi value={<Money v={incRes.v.impact.financialResultDelta} />} label={`impact sur le résultat (${SC_LABEL[scenario].toLowerCase()})`} />
                      <Kpi value={`${incRes.v.impact.competitionDurationDeltaMin >= 0 ? '+' : ''}${incRes.v.impact.competitionDurationDeltaMin} min`} label="impact sur la durée de compétition" />
                      {incRes.v.details.residualDelayMin != null && <Kpi value={`${incRes.v.details.residualDelayMin} min`} label="retard résiduel sur les phases finales" />}
                      {incRes.v.details.uncovered != null && <Kpi value={eur(incRes.v.details.uncovered)} label="réduction non couverte" />}
                    </div>
                    <h3>Réponse générée par le moteur</h3>
                    {incRes.v.actions.length ? (
                      <ul className="mini-list">
                        {incRes.v.actions.map((a, i) => (
                          <li key={i}>{a}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="muted">Aucune action : rien dans la configuration n’est touché par cet incident.</p>
                    )}
                    {inc.type === 'weather' && (current.variants ?? []).some((v) => v.kind === 'secours') && (
                      <button className="btn ghost" onClick={() => setVariant((current.variants ?? []).find((v) => v.kind === 'secours')!.id)}>
                        Afficher la variante de secours
                      </button>
                    )}
                    <h3>Plans de continuité liés</h3>
                    {incRes.v.continuity.length ? (
                      <ul className="list-plain small">
                        {incRes.v.continuity.map((c) => (
                          <li key={c.risk}>
                            <b>{c.risk}</b> : {c.plan ?? 'aucun plan de continuité renseigné'}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="muted small">Aucun risque de la configuration n’est rattaché à cet incident (rattachement par mot-clé de la description, 07 §8).</p>
                    )}
                  </>
                )}
              </Panel>
              {stdInc && stdInc.ok && (
                <Panel title="Incidents types du blueprint (paramètres fixes, scénario central)">
                  <Table head={['Incident simulé', 'Réponse générée par le moteur', 'Impact sur le résultat', 'Impact sur la durée']} numeric={[2, 3]} rows={stdInc.v.map((x) => [x.incident.label, <span className="small">{x.summary}</span>, <Money v={x.result.impact.financialResultDelta} />, `${x.result.impact.competitionDurationDeltaMin >= 0 ? '+' : ''}${x.result.impact.competitionDurationDeltaMin} min`])} />
                  <p className="muted small">Mêmes cas et mêmes paramètres que la section « Incidents » du blueprint (retards à partir de 13:00).</p>
                </Panel>
              )}
            </div>
          )}

          {tab === 'notation' && (
            <div className="grid">
              {!ev.ok ? (
                <div className="alert block">Notation impossible : {ev.err}</div>
              ) : (
                <>
                  <div className="kpis">
                    <Kpi value={`${ev.v.score}/100`} label={`grade ${ev.v.grade}`} />
                    <Kpi value={ev.v.confidence.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} label="indice de confiance (0,3 à 1)" />
                    <Kpi value={<VerdictLabel v={ev.v.verdict} />} label="verdict" />
                    <Kpi value={`${ev.v.improvements.scoreIfPlusOne}/100`} label="atteignable si chaque note +1" />
                  </div>
                  <Panel title="Portes éliminatoires">
                    <ul className="list-plain">
                      {(Object.keys(GATE_NAMES) as GateKey[]).map((k) => (
                        <li key={k}>
                          <Gate s={ev.v.gates[k].status} label={GATE_NAMES[k]} />
                          {ev.v.gates[k].notes && <div className="muted small">{ev.v.gates[k].notes}</div>}
                        </li>
                      ))}
                    </ul>
                    <p className="muted small">Portes indépendantes du score (07 §1.5) : un statut bloquant élimine le concept quel que soit son score.</p>
                  </Panel>
                  <Panel title="Notation /100">
                    <Table
                      head={['Critère', 'Poids', 'Note /5', 'Points', 'Preuve', 'Justification']}
                      numeric={[1, 2, 3]}
                      rows={CRITERIA.map((c) => {
                        const r = current.evaluation.ratings[c.key];
                        return [c.label, c.weight, num(r.rating, 1), num((c.weight * r.rating) / 5, 1), EVIDENCE_LABEL[r.evidence ?? 'jugement_expert'], <span className="small">{r.justification ?? '—'}</span>];
                      })}
                    />
                    <h3>Améliorations prioritaires</h3>
                    <ol className="mini-list">
                      {ev.v.improvements.top.map((t) => (
                        <li key={t.key}>
                          {t.label} (gain {t.gain.toLocaleString('fr-FR')} pts){t.actions.length ? ` : ${t.actions.join(' ; ')}` : ''}
                        </li>
                      ))}
                    </ol>
                  </Panel>
                </>
              )}
            </div>
          )}

          {tab === 'versions' && (
            <div className="grid">
              <Panel title="Enregistrer une nouvelle version">
                <p className="muted small">
                  Chaque enregistrement crée une <b>nouvelle version brouillon</b> (moteur : <code>newVersion</code>) avec sa filiation ; la version de départ n’est jamais modifiée. Stockage : ce navigateur uniquement.
                </p>
                <div className="controls">
                  <label className="field">
                    <span>Auteur</span>
                    <input value={author} onChange={(e) => setAuthor(e.target.value)} />
                  </label>
                  <label className="field">
                    <span>Résumé des changements</span>
                    <input value={summaryTxt} onChange={(e) => setSummaryTxt(e.target.value)} placeholder="ex. prix du billet à 6 €" />
                  </label>
                </div>
                <div className="row" style={{ marginTop: 10 }}>
                  <button className="btn" onClick={save}>
                    Enregistrer (nouvelle version brouillon)
                  </button>
                  <button
                    className="btn ghost"
                    onClick={async () => {
                      const ok = await copyText(exportJson());
                      setMsg({ kind: ok ? 'ok' : 'block', text: ok ? 'JSON copié dans le presse-papiers.' : 'Copie impossible dans ce navigateur : utilisez le téléchargement.' });
                    }}
                  >
                    Copier le JSON
                  </button>
                  <button className="btn ghost" onClick={() => download(exportName, exportJson(), 'application/json')}>
                    Télécharger le JSON
                  </button>
                </div>
                {work && <p className="small">Export et enregistrement incluent les modifications en cours (non enregistrées).</p>}
              </Panel>
              <Panel title={`Version affichée : v${base.version} (${STATUS_TEXT[base.status]})`}>
                {selVer === 'depot' ? (
                  <p className="muted small">Version du dépôt (fichier) : elle ne change que dans le dépôt. Les transitions de statut s’appliquent aux versions locales.</p>
                ) : (
                  <>
                    <div className="row">
                      {(Object.keys(TRANSITIONS) as TransitionAction[])
                        .filter((a) => TRANSITIONS[a].from.includes(base.status))
                        .map((a) => (
                          <button key={a} className="btn ghost" disabled={!!work} onClick={() => doTransition(a)}>
                            {ACTION_TEXT[a]}
                          </button>
                        ))}
                      {base.status === 'draft' && (
                        <button className="btn ghost" disabled={!!work} onClick={removeVersion}>
                          Supprimer ce brouillon
                        </button>
                      )}
                    </div>
                    {work && <p className="muted small">Enregistrez ou annulez les modifications en cours avant de changer le statut.</p>}
                    {base.parent && (
                      <p className="small">
                        Filiation : {base.parent.id} v{base.parent.version} ({base.parent.relation})
                      </p>
                    )}
                  </>
                )}
                <h3>Historique</h3>
                <Table head={['Version', 'Date', 'Auteur', 'Résumé', 'Approuvé par']} rows={(base.history ?? []).map((h) => [h.version, h.date, h.author ?? '—', h.summary, h.approved_by ?? 'non approuvée'])} />
              </Panel>
              <Panel title="Différences entre deux versions">
                <div className="controls">
                  <label className="field">
                    <span>Version A</span>
                    <select value={diffA} onChange={(e) => setDiffA(e.target.value)}>
                      {diffOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Version B</span>
                    <select value={diffB} onChange={(e) => setDiffB(e.target.value)}>
                      {!diffOptions.some((o) => o.value === diffB) && <option value={diffB}>(à choisir)</option>}
                      {diffOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                {!dA || !dB ? (
                  <p className="muted small">Choisissez deux versions existantes.</p>
                ) : diffs.length === 0 ? (
                  <p className="muted small">Aucune différence (l’historique n’est pas comparé).</p>
                ) : (
                  <>
                    <p className="small">{diffs.length} différence(s), champ par champ (l’historique n’est pas comparé).</p>
                    <Table head={['Chemin', 'A', 'B']} rows={diffs.slice(0, 200).map((d) => [<code className="diff-val">{d.path}</code>, <span className="diff-val">{shortJson(d.before)}</span>, <span className="diff-val">{shortJson(d.after)}</span>])} />
                    {diffs.length > 200 && <p className="muted small">… {diffs.length - 200} autre(s) non affichée(s).</p>}
                  </>
                )}
              </Panel>
            </div>
          )}
        </div>
      </div>
    </Page>
  );
}
