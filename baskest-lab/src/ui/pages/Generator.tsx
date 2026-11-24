import { VERDICT_LABELS } from '../../core/simulation/analysis';
import { useState } from 'react';
import { Page, Panel, Scoreboard, Criteria, Checks, SelectField, NumberField, Gate, useLocal, eur } from '../ui';
import { feature } from '../features';
import { generateConcepts, type Brief } from '../../core/generator/generator';
import { AUDIENCE_LABELS } from '../../core/generator/library';
import type { ConceptAnalysis } from '../../core/pipeline';
import type { Audience, Concept, Notification, Objective, TeamSize, VenueType } from '../../core/model';
import { LIB } from '../lab';
import { STATUS_LABEL } from '../ui';

const OBJECTIVES: { value: Objective; label: string }[] = [
  { value: 'spectacle', label: 'Spectacle' },
  { value: 'inclusion', label: 'Inclusion' },
  { value: 'jeunesse', label: 'Jeunesse' },
  { value: 'detection', label: 'Détection de talents' },
  { value: 'communaute', label: 'Communauté' },
  { value: 'revenus', label: 'Revenus' },
  { value: 'visibilite_partenaires', label: 'Visibilité partenaires' },
  { value: 'territoire', label: 'Territoire' },
];
const VENUES: { value: VenueType; label: string }[] = [
  { value: 'gymnase', label: 'Gymnase municipal' },
  { value: 'city_stade', label: 'City-stade' },
  { value: 'terrain_exterieur', label: 'Terrain extérieur' },
  { value: 'complexe_sportif', label: 'Complexe sportif' },
  { value: 'palais_des_sports', label: 'Palais des sports' },
  { value: 'arena', label: 'Arena' },
  { value: 'place_publique', label: 'Place publique' },
  { value: 'centre_commercial', label: 'Centre commercial' },
  { value: 'campus', label: 'Campus' },
  { value: 'espace_temporaire', label: 'Espace temporaire' },
];

export function Generator() {
  const f = feature('generateur');
  const [brief, setBrief] = useLocal<Brief>('brief', {
    objectives: ['spectacle', 'communaute', 'inclusion'],
    audiences: ['familles', 'jeunes', 'femmes', 'pmr'],
    venueType: 'gymnase',
    budgetTier: 'limite',
    scale: 'locale',
    innovationLevel: 3,
    expectedSpectators: 300,
    durationHours: 6,
    teamSizes: [1, 2, 3, 4, 5],
    candidates: 8,
    count: 3,
    seed: 1,
  });
  const [results, setResults] = useState<ConceptAnalysis[]>([]);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useLocal<Concept[]>('concepts', []);
  const [notes, setNotes] = useLocal<Notification[]>('notifications', []);
  const set = <K extends keyof Brief>(k: K, v: Brief[K]) => setBrief({ ...brief, [k]: v });

  const run = () => {
    setBusy(true);
    setTimeout(() => {
      setResults(generateConcepts({ ...brief, seed: brief.seed ?? 1 }, LIB));
      setBusy(false);
    }, 20);
  };
  const save = (c: Concept) => {
    setSaved([...saved.filter((x) => x.id !== c.id), c]);
    setNotes([{ id: `n${Date.now()}`, at: new Date().toISOString(), level: 'info', message: `Concept « ${c.title} » enregistré (privé).`, link: '#/notation', read: false }, ...notes]);
  };

  return (
    <Page title="Générateur de concepts" intro="Décrivez l’événement voulu : le générateur combine formats, mécaniques et innovations, puis simule, planifie, budgète, implante et note chaque candidat. Seuls les meilleurs sont proposés, défauts compris." status={f.status}>
      <div className="grid side">
        <Panel title="Brief">
          <div className="form">
            <Checks label="Objectifs" values={brief.objectives} onChange={(v) => set('objectives', v)} options={OBJECTIVES} />
            <Checks label="Publics" values={brief.audiences} onChange={(v) => set('audiences', v)} options={(Object.keys(AUDIENCE_LABELS) as Audience[]).map((a) => ({ value: a, label: AUDIENCE_LABELS[a] }))} />
            <SelectField label="Lieu" value={brief.venueType} onChange={(v) => set('venueType', v)} options={VENUES} />
            <SelectField label="Budget" value={brief.budgetTier} onChange={(v) => set('budgetTier', v)} options={[{ value: 'micro', label: 'Micro (< 2 k€)' }, { value: 'limite', label: 'Limité (2-8 k€)' }, { value: 'standard', label: 'Standard (8-30 k€)' }, { value: 'premium', label: 'Premium (> 30 k€)' }]} />
            <SelectField label="Échelle" value={brief.scale} onChange={(v) => set('scale', v)} options={[{ value: 'locale', label: 'Locale' }, { value: 'regionale', label: 'Régionale' }, { value: 'nationale', label: 'Nationale' }]} />
            <Checks label="Formats autorisés" values={(brief.teamSizes ?? []).map(String) as ('1' | '2' | '3' | '4' | '5')[]} onChange={(v) => set('teamSizes', v.map(Number) as TeamSize[])} options={['1', '2', '3', '4', '5'].map((s) => ({ value: s as '1', label: `${s}c${s}` }))} />
            <div className="grid two">
              <NumberField label="Spectateurs attendus" value={brief.expectedSpectators} onChange={(v) => set('expectedSpectators', v)} min={0} step={50} />
              <NumberField label="Durée (heures)" value={brief.durationHours} onChange={(v) => set('durationHours', v)} min={2} max={14} />
            </div>
            <label className="field">
              <span>Audace : {brief.innovationLevel}/5</span>
              <input type="range" min={1} max={5} value={brief.innovationLevel} onChange={(e) => set('innovationLevel', Number(e.target.value) as Brief['innovationLevel'])} />
              <small>1 = règles classiques, 5 = mécaniques inédites (toujours limitées à 2 par match pour rester lisibles).</small>
            </label>
            <NumberField label="Variante (graine)" value={Number(brief.seed ?? 1)} onChange={(v) => set('seed', v)} hint="Changer la graine propose d’autres combinaisons." />
            <button className="btn" onClick={run} disabled={busy || !brief.objectives.length || !(brief.teamSizes ?? []).length}>
              {busy ? 'Simulation en cours…' : 'Générer et évaluer'}
            </button>
          </div>
        </Panel>
        <div className="grid">
          {results.length === 0 && (
            <Panel title="Prêt à générer">
              <p className="muted">Chaque candidat passe par toute la chaîne : 80 tournois simulés, un planning complet, trois scénarios budgétaires, une implantation et 26 règles de conception. Comptez une seconde.</p>
            </Panel>
          )}
          {results.map((r) => (
            <Panel key={r.concept.id} title={r.concept.title}>
              <Scoreboard ev={r.evaluation} title={r.concept.identity.tagline} />
              <p style={{ marginTop: 12 }}>{r.concept.pitch}</p>
              <div className="kpis">
                <div className="kpi"><b>{VERDICT_LABELS[r.fairness.verdict]}</b><span>verdict de simulation</span></div>
                <div className="kpi"><b>{r.schedule.matches.length}</b><span>matchs, {r.ops.courts} terrain(s)</span></div>
                <div className="kpi"><b>{eur(r.scenarios[1].result)}</b><span>résultat réaliste</span></div>
                <div className="kpi"><b>{r.concept.volunteersNeeded}</b><span>bénévoles</span></div>
              </div>
              <div style={{ marginTop: 12 }}>
                <Criteria ev={r.evaluation} />
              </div>
              <p className="small" style={{ marginTop: 8 }}>
                {r.rules.filter((x) => x.outcome !== 'ok' && x.outcome !== 'non_evaluable').map((x) => (
                  <span key={x.ruleId} style={{ marginRight: 6 }}>
                    <Gate s={x.outcome} label={x.ruleId} />
                  </span>
                ))}
              </p>
              <div className="row">
                <button className="btn" onClick={() => save(r.concept)}>{saved.some((s) => s.id === r.concept.id) ? 'Enregistré' : 'Enregistrer le concept'}</button>
                <a href="#/dossiers">Générer son Blueprint</a>
              </div>
            </Panel>
          ))}
          {results.length > 0 && <p className="muted small">Statut du module : {STATUS_LABEL[f.status]}. Les concepts enregistrés restent privés dans ce navigateur jusqu’à leur publication volontaire.</p>}
        </div>
      </div>
    </Page>
  );
}
