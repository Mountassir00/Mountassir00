import { useMemo, useState } from 'react';
import { Page, Panel, Table, SelectField, NumberField, Kpi, Tabs, Gate } from '../ui';
import { feature } from '../features';
import { ARCHETYPES, rulesFor } from '../../core/generator/library';
import { analyzeFormat, VERDICT_LABELS } from '../../core/simulation/analysis';
import { MECHANICS } from '../../data/mechanics';
import type { CompetitionFormat, MatchRules, TeamSize } from '../../core/model';

type EndKind = MatchRules['end']['type'];

export function SportSim() {
  const f = feature('simulateur-sportif');
  const [tab, setTab] = useState<'simulateur' | 'bibliotheque'>('simulateur');
  const [archetype, setArchetype] = useState('poules_tableau');
  const [size, setSize] = useState<TeamSize>(3);
  const [teams, setTeams] = useState(16);
  const [endKind, setEndKind] = useState<EndKind>('time_or_target');
  const [minutes, setMinutes] = useState(10);
  const [points, setPoints] = useState(21);
  const [plus, setPlus] = useState(7);
  const [shotClock, setShotClock] = useState(12);
  const [zonePts, setZonePts] = useState<Record<string, number>>({});
  const [mechs, setMechs] = useState<string[]>([]);
  const [spread, setSpread] = useState(150);
  const [runs, setRuns] = useState(300);

  const arch = ARCHETYPES.find((a) => a.id === archetype)!;
  const format: CompetitionFormat = useMemo(() => {
    const s = arch.sizes.includes(size) ? size : arch.sizes[0];
    const fm = arch.build(s, teams);
    const base = rulesFor(s);
    const end: MatchRules['end'] =
      endKind === 'time' ? { type: 'time', minutes } : endKind === 'target' ? { type: 'target', points, maxMinutes: minutes * 2 } : endKind === 'elam' ? { type: 'elam', minutes, plus } : { type: 'time_or_target', minutes, points };
    fm.match = {
      ...base,
      end,
      shotClockSec: shotClock,
      zones: base.zones.map((z) => ({ ...z, points: zonePts[z.id] ?? z.points })),
      mechanics: mechs.map((id) => ({ id, params: Object.fromEntries((MECHANICS.find((m) => m.id === id)?.params ?? []).map((p) => [p.key, p.default])) })),
      official: false,
    };
    return fm;
  }, [arch, size, teams, endKind, minutes, points, plus, shotClock, zonePts, mechs]);
  const report = useMemo(() => analyzeFormat(format, { runs, ratingSpread: spread, seed: 'ui' }), [format, runs, spread]);
  const simulated = MECHANICS.filter((m) => m.simulated);

  return (
    <Page title="Simulateur sportif" intro="Tester une mécanique avant le terrain : des centaines de tournois simulés mesurent équité, suspense, durée, stratégies qui exploitent la règle et risques de manipulation." status={f.status}>
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'simulateur', label: 'Simulateur' }, { value: 'bibliotheque', label: `Bibliothèque de mécaniques (${MECHANICS.length})` }]} />
      {tab === 'simulateur' && (
        <div className="grid side">
          <Panel title="Format">
            <div className="form">
              <SelectField label="Structure" value={archetype} onChange={setArchetype} options={ARCHETYPES.map((a) => ({ value: a.id, label: a.label }))} />
              <SelectField label="Joueurs par équipe" value={String(arch.sizes.includes(size) ? size : arch.sizes[0]) as '1'} onChange={(v) => setSize(Number(v) as TeamSize)} options={arch.sizes.map((s) => ({ value: String(s) as '1', label: `${s} contre ${s}` }))} />
              <NumberField label="Équipes (ou joueurs)" value={teams} onChange={setTeams} min={3} max={64} />
              <SelectField label="Fin de match" value={endKind} onChange={setEndKind} options={[{ value: 'time_or_target', label: 'Temps ou score (le premier)' }, { value: 'time', label: 'Temps' }, { value: 'target', label: 'Score cible' }, { value: 'elam', label: 'Temps puis score cible (Elam)' }]} />
              <div className="grid two">
                <NumberField label="Minutes" value={minutes} onChange={setMinutes} min={2} max={40} />
                {(endKind === 'target' || endKind === 'time_or_target') && <NumberField label="Score cible" value={points} onChange={setPoints} min={5} max={100} />}
                {endKind === 'elam' && <NumberField label="Cible = leader +" value={plus} onChange={setPlus} min={3} max={15} />}
                <NumberField label="Possession (s)" value={shotClock} onChange={setShotClock} min={8} max={30} />
              </div>
              <h3>Valeur des tirs</h3>
              <div className="grid two">
                {rulesFor(arch.sizes.includes(size) ? size : arch.sizes[0]).zones.map((z) => (
                  <NumberField key={z.id} label={z.label.split('(')[0]} value={zonePts[z.id] ?? z.points} onChange={(v) => setZonePts({ ...zonePts, [z.id]: v })} min={0} max={6} />
                ))}
              </div>
              <h3>Mécaniques de match</h3>
              <div className="checks">
                {simulated.map((m) => (
                  <label key={m.id} title={m.description}>
                    <input type="checkbox" checked={mechs.includes(m.id)} onChange={(e) => setMechs(e.target.checked ? [...mechs, m.id] : mechs.filter((x) => x !== m.id))} />
                    {m.name}
                  </label>
                ))}
              </div>
              <div className="grid two">
                <NumberField label="Hétérogénéité des niveaux" value={spread} onChange={setSpread} min={20} max={400} step={10} hint="Écart-type Elo ; 150 ≈ open amateur" />
                <NumberField label="Tournois simulés" value={runs} onChange={setRuns} min={50} max={2000} step={50} />
              </div>
            </div>
          </Panel>
          <div className="grid">
            <Panel title={`Verdict : ${VERDICT_LABELS[report.verdict]}`}>
              <div className="kpis">
                <Kpi value={`${Math.round(report.pBestWins * 100)} %`} label="la meilleure équipe gagne" />
                <Kpi value={report.kendallTau.toFixed(2)} label="méritocratie (τ)" />
                <Kpi value={`${Math.round(report.closeGameRate * 100)} %`} label="matchs serrés" />
                <Kpi value={`${report.avgMatchMinutes} min`} label={`durée réelle moyenne (p95 ${report.p95MatchMinutes})`} />
                <Kpi value={`${report.gamesPerTeam.min}–${report.gamesPerTeam.max}`} label="matchs par équipe" />
                <Kpi value={`${Math.round(report.upsetRate * 100)} %`} label="surprises" />
              </div>
              {report.dominantStrategies.map((d) => (
                <div key={d.strategy} className="alert block">Stratégie dominante « {d.strategy.replace(/_/g, ' ')} » : {Math.round(d.winRateVsBalanced * 100)} % de victoires contre un jeu équilibré à niveau égal. La règle est exploitable.</div>
              ))}
              {[...report.manipulationRisks, ...report.unfairSituations, ...report.notes].map((n, i) => (
                <div key={i} className="alert">{n}</div>
              ))}
              {!report.dominantStrategies.length && !report.manipulationRisks.length && !report.unfairSituations.length && !report.notes.length && <div className="alert ok">Aucun déséquilibre, exploitation ni risque de manipulation structurel détecté.</div>}
            </Panel>
            <Panel title="Lecture">
              <p className="small">Le modèle joue chaque possession (choix de zone, réussite selon l’écart de niveau, rebonds, pertes de balle, adaptation défensive). Il sert à comparer des règles entre elles, pas à prédire un résultat. Hypothèses détaillées : docs/05-moteur-simulation.md.</p>
            </Panel>
          </div>
        </div>
      )}
      {tab === 'bibliotheque' && (
        <Table
          head={['Mécanique', 'Famille', 'Description', 'Risques', 'Simulée', 'Compatible officiel']}
          rows={MECHANICS.map((m) => [<b>{m.name}</b>, m.category, m.description, m.risks.join(' ; '), <Gate s={m.simulated ? 'ok' : 'non_evaluable'} label={m.simulated ? 'oui' : 'qualitative'} />, m.officialCompatible ? 'oui' : 'non'])}
        />
      )}
    </Page>
  );
}
