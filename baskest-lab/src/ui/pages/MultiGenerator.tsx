import { useMemo, useState } from 'react';
import { Page, Panel } from '../ui';
import { feature } from '../features';
import { BUILDING_BLOCKS } from '../../data/eventlab';
import { generate, DIRECTIONS, budgetTier, type Brief, type Direction, type EventConfig, type SectorFamily } from '../../core/eventlab';
import { BLOCK_TYPE_LABEL, DIRECTION_LABEL, SECTOR_LABEL, TIER_HINT } from '../eventlab-ui';
import { addGeneratedConcept, generatedConcepts } from '../local-portfolio';
import { useRepo } from '../workspace';

interface Form {
  discipline: string;
  sector_family: '' | SectorFamily;
  budget: string;
  capacity: string;
  staff: string;
  setting: '' | 'interieur' | 'exterieur' | 'mixte';
  area_m2: string;
  innovation: string;
  objective: string;
  seed: string;
}

const EMPTY: Form = { discipline: '', sector_family: '', budget: '', capacity: '', staff: '', setting: '', area_m2: '', innovation: '', objective: '', seed: '42' };
const num = (s: string) => (s.trim() === '' || Number.isNaN(Number(s)) ? null : Number(s));

function NumberInput({ label, value, onChange, hint, min = 0, step = 1 }: { label: string; value: string; onChange: (v: string) => void; hint?: string; min?: number; step?: number }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type="number" inputMode="numeric" min={min} step={step} value={value} placeholder="non précisé" onChange={(e) => onChange(e.target.value)} />
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function MultiGenerator() {
  const f = feature('generateur-multi');
  const [form, setForm] = useState<Form>(EMPTY);
  const { repo: store, workspace } = useRepo();
  const added = generatedConcepts(store).map((c) => String(c.generation?.seed ?? '') + '|' + c.format.summary);
  const [msg, setMsg] = useState<string | null>(null);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((p) => ({ ...p, [k]: v }));
  const brief: Brief = useMemo(
    () => ({
      discipline: form.discipline.trim() || null,
      sector_family: form.sector_family || null,
      budget: num(form.budget),
      capacity: num(form.capacity),
      staff: num(form.staff),
      setting: form.setting || null,
      area_m2: num(form.area_m2),
      innovation: num(form.innovation),
      objective: form.objective.trim() || null,
    }),
    [form],
  );
  const seed = Math.trunc(num(form.seed) ?? 42);
  const res = useMemo(() => generate(brief, BUILDING_BLOCKS, { seed }), [brief, seed]);
  const byDir = new Map(res.concepts.map((c) => [c.identity.directions[0], c]));
  const blockName = new Map(BUILDING_BLOCKS.map((b) => [b.id, b]));
  const tierNow = budgetTier(brief.budget ?? 15000);
  const addLocal = (c: EventConfig) => {
    const copy: EventConfig = { ...structuredClone(c), id: `${c.id}-${Date.now().toString(36)}` };
    const err = addGeneratedConcept(store, copy);
    setMsg(err ?? `« ${c.identity.name} » ajouté au portefeuille ${workspace === 'local' ? 'local (ce navigateur)' : 'de l’organisation'} (identifiant ${copy.id}).`);
  };
  return (
    <Page
      title="Générateur multisectoriel"
      intro="Un brief, même incomplet, donne six directions créatives construites à partir des 70 briques. Les données absentes sont remplacées par des hypothèses explicites ; le tirage est reproductible pour une graine donnée. Le résultat est un squelette : pas de nom, pas de chiffres de marché, pré-notes à revoir."
      status={f.status}
    >
      <div className="grid side">
        <Panel title="Brief">
          <div className="form">
            <label className="field">
              <span>Discipline</span>
              <input value={form.discipline} onChange={(e) => set('discipline', e.target.value)} placeholder="aucune (événement sans discipline)" />
            </label>
            <label className="field">
              <span>Famille de secteur cible</span>
              <select value={form.sector_family} onChange={(e) => set('sector_family', e.target.value as Form['sector_family'])}>
                <option value="">non précisée (sport par défaut)</option>
                {Object.entries(SECTOR_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              <small>Sert à mesurer la distance de transfert des briques (07 §3).</small>
            </label>
            <NumberInput label="Budget (€)" value={form.budget} onChange={(v) => set('budget', v)} step={500} hint={`Palier appliqué : ${TIER_HINT[tierNow ?? 1]}${brief.budget == null ? ' (hypothèse médiane)' : ''}`} />
            <NumberInput label="Capacité (personnes simultanées)" value={form.capacity} onChange={(v) => set('capacity', v)} step={50} />
            <NumberInput label="Effectif disponible (personnes)" value={form.staff} onChange={(v) => set('staff', v)} />
            <label className="field">
              <span>Cadre</span>
              <select value={form.setting} onChange={(e) => set('setting', e.target.value as Form['setting'])}>
                <option value="">non précisé</option>
                <option value="interieur">intérieur</option>
                <option value="exterieur">extérieur</option>
                <option value="mixte">mixte</option>
              </select>
            </label>
            <NumberInput label="Surface (m²)" value={form.area_m2} onChange={(v) => set('area_m2', v)} step={100} />
            <label className="field">
              <span>Niveau d’innovation souhaité</span>
              <select value={form.innovation} onChange={(e) => set('innovation', e.target.value)}>
                <option value="">non précisé</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}/5
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Objectif principal</span>
              <input value={form.objective} onChange={(e) => set('objective', e.target.value)} placeholder="ex. faire venir un public familial" />
            </label>
            <NumberInput label="Graine du tirage" value={form.seed} onChange={(v) => set('seed', v)} hint="Même brief + même graine = mêmes propositions." />
            <div className="row">
              <button className="btn ghost" onClick={() => setForm(EMPTY)}>
                Brief vide
              </button>
              <button className="btn ghost" onClick={() => set('seed', String(seed + 1))}>
                Autre tirage (graine {seed + 1})
              </button>
            </div>
          </div>
        </Panel>
        <div className="grid" style={{ alignContent: 'start' }}>
          <Panel title="Hypothèses posées">
            {res.hypotheses.length ? (
              <ul className="mini-list">
                {res.hypotheses.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            ) : (
              <p className="muted">Aucune : toutes les données utilisées par le moteur sont renseignées.</p>
            )}
            <p className="status-line">
              <span>
                Briques admissibles : <b>{res.admissibleBlocks}</b> / {BUILDING_BLOCKS.length}
              </span>
              <span>Graine : {res.seed}</span>
              <span>
                Directions proposées : {res.concepts.length} / 6
              </span>
            </p>
            {msg && <div className="alert ok">{msg}</div>}
          </Panel>
          <div className="cards">
            {(Object.keys(DIRECTIONS) as Direction[]).map((d) => {
              const c = byDir.get(d);
              if (!c)
                return (
                  <div key={d} className="card muted-card">
                    <h3>{DIRECTION_LABEL[d]}</h3>
                    <p className="small" style={{ margin: 0 }}>
                      <b>Sans proposition distincte.</b> Le moteur n’a trouvé aucun candidat assez différent des concepts déjà retenus (similarité de Jaccard &gt; 0,5) ou n’a pas pu remplir un emplacement obligatoire ({DIRECTIONS[d].slots.map((s) => BLOCK_TYPE_LABEL[s]).join(', ')}) avec les briques admissibles.
                    </p>
                  </div>
                );
              const key = `${seed}|${c.format.summary}`;
              return (
                <div key={d} className="card">
                  <div className="space-head">
                    <h3>{DIRECTION_LABEL[d]}</h3>
                    <span className="prescore" aria-label={`pré-note ${c.x_prescore} sur 100`}>
                      {c.x_prescore}
                      <small>/100</small>
                    </span>
                  </div>
                  <div className="muted small">Pré-note automatique (jugement expert, confiance 0,30) — à revoir par un humain.</div>
                  <ul className="mini-list">
                    {c.format.building_blocks.map((b) => (
                      <li key={b.block_id}>
                        <span className="muted">{BLOCK_TYPE_LABEL[b.type]} :</span> <a href={`#/briques?b=${b.block_id}`}>{b.label}</a>
                        {blockName.get(b.block_id!)?.origin.sector_family && blockName.get(b.block_id!)!.origin.sector_family !== (brief.sector_family ?? 'sport') && <span className="tag">{SECTOR_LABEL[blockName.get(b.block_id!)!.origin.sector_family]}</span>}
                      </li>
                    ))}
                  </ul>
                  <div className="row" style={{ marginTop: 'auto' }}>
                    <button className="btn" disabled={added.includes(key)} onClick={() => addLocal(c)}>
                      {added.includes(key) ? 'Ajouté au portefeuille local' : 'Ajouter au portefeuille local'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="notice">
            Non implémentés dans le moteur actuel (à faire avant tout usage décisionnel) : contrôles de cohérence durée / personnel / capacité et réparation (07 §2.6), remplissage des emplacements facultatifs selon le budget et les heures disponibles (07 §2.5 : le moteur s’arrête à 7 briques), couche rédactionnelle (07 §2.9). Les étiquettes de secteur signalent les briques empruntées à une autre famille.
          </p>
        </div>
      </div>
    </Page>
  );
}
