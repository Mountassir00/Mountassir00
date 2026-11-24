import { useMemo, useState } from 'react';
import { Page, Panel, Table, SelectField, useLocal } from '../ui';
import { feature } from '../features';
import { allConcepts, LIB } from '../lab';
import { mutateConcept } from '../../core/generator/generator';
import { compareFormats, VERDICT_LABELS } from '../../core/simulation/analysis';
import type { Concept } from '../../core/model';

/** Laboratoire créatif : une modification à la fois, effet mesuré en simulation. */
export function Lab() {
  const f = feature('labo');
  const concepts = allConcepts();
  const [id, setId] = useState(concepts[1]?.id ?? concepts[0].id);
  const [seed, setSeed] = useState(1);
  const [saved, setSaved] = useLocal<Concept[]>('concepts', []);
  const base = concepts.find((c) => c.id === id)!;
  const { concept: variant, change } = useMemo(() => mutateConcept(base, LIB, seed), [base, seed]);
  const cmp = useMemo(() => compareFormats(base.format, variant.format, { runs: 200, seed: 'labo' }), [base, variant]);
  const fmt = (k: string, v: number) => (k === 'avgMatchMinutes' ? `${v} min` : k === 'kendallTau' ? v.toFixed(2) : `${Math.round(v * 100)} %`);
  const rows = [
    ['Probabilité que la meilleure équipe gagne', 'pBestWins'],
    ['Méritocratie (τ de Kendall)', 'kendallTau'],
    ['Taux de surprises', 'upsetRate'],
    ['Matchs serrés (suspense)', 'closeGameRate'],
    ['Durée moyenne d’un match', 'avgMatchMinutes'],
  ] as const;
  return (
    <Page title="Laboratoire créatif" intro="Tester une idée de règle avant le terrain : une seule modification à la fois, comparée au format d’origine sur 200 tournois simulés." status={f.status}>
      <div className="row" style={{ marginBottom: 14 }}>
        <SelectField label="Concept de départ" value={id} onChange={(v) => { setId(v); setSeed(1); }} options={concepts.map((c) => ({ value: c.id, label: c.title }))} />
        <button className="btn" style={{ alignSelf: 'end' }} onClick={() => setSeed(seed + 1)}>Proposer une autre variante</button>
      </div>
      <div className="grid two">
        <Panel title={`Variante : ${change}`}>
          <Table
            head={['Indicateur', 'Original', 'Variante', 'Écart']}
            rows={rows.map(([label, k]) => [label, fmt(k, cmp.base[k]), fmt(k, cmp.variant[k]), `${cmp.delta[k] > 0 ? '+' : ''}${k === 'avgMatchMinutes' ? cmp.delta[k] + ' min' : k === 'kendallTau' ? cmp.delta[k].toFixed(2) : Math.round(cmp.delta[k] * 100) + ' pts'}`])}
          />
          <p className="small" style={{ marginTop: 10 }}>
            Verdict : {VERDICT_LABELS[cmp.base.verdict]} → <b>{VERDICT_LABELS[cmp.variant.verdict]}</b>
          </p>
          {[...cmp.variant.manipulationRisks, ...cmp.variant.unfairSituations, ...cmp.variant.notes].map((n, i) => (
            <div className="alert" key={i}>{n}</div>
          ))}
          <div className="row">
            <button className="btn" onClick={() => setSaved([...saved.filter((s) => s.id !== variant.id), { ...variant, title: `${base.title} (variante)` }])}>Garder cette variante</button>
          </div>
        </Panel>
        <Panel title="Comment lire ces résultats">
          <ul>
            <li>Une variante qui fait monter le suspense sans effondrer la méritocratie (τ &gt; 0,3) est un bon candidat.</li>
            <li>Si le taux de surprises dépasse 35 %, les meilleurs joueurs risquent de se sentir lésés.</li>
            <li>Une durée qui augmente impacte directement le planning : vérifier ensuite dans Programmation.</li>
            <li>Toute stratégie dominante détectée bloque le concept (porte d’équité).</li>
          </ul>
          <p className="muted small">Le simulateur compare des règles entre elles ; il ne prédit pas un résultat réel. Un test terrain (prototype) reste obligatoire avant toute édition.</p>
        </Panel>
      </div>
    </Page>
  );
}
