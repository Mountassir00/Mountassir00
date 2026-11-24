import { useMemo, useState } from 'react';
import { Page, Panel, Table, SelectField, NumberField, Kpi, useLocal, download } from '../ui';
import { feature } from '../features';
import { allConcepts, analysisOf } from '../lab';
import { fmtTime, reschedule, publicationPayload, type RescheduleResult } from '../../core/scheduler/scheduler';
import type { ApprovalRequest, Disruption, Schedule } from '../../core/model';

function Gantt({ s, courts, opening, moved }: { s: Schedule; courts: { id: string; name: string }[]; opening: string; moved: Set<string> }) {
  const end = Math.max(60, s.endsAt);
  const pctX = (m: number) => `${(m / end) * 100}%`;
  return (
    <div className="gantt">
      {courts.map((c) => (
        <div className="gantt-row" key={c.id}>
          <div className="gantt-label">{c.name}</div>
          <div className="gantt-track">
            {s.blocks.filter((b) => b.courtId === c.id).map((b) => (
              <div key={b.id} className="gantt-item block" style={{ left: pctX(b.start), width: pctX(b.duration) }} title={`${fmtTime(b.start, opening)} ${b.label}`}>{b.label}</div>
            ))}
            {s.matches.filter((m) => m.courtId === c.id && m.start !== undefined).map((m) => (
              <div key={m.id} className={`gantt-item ${moved.has(m.id) ? 'moved' : ''}`} style={{ left: pctX(m.start!), width: pctX(m.duration) }} title={`${fmtTime(m.start!, opening)} ${m.label}`}>
                {fmtTime(m.start!, opening)} {m.label}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Scheduler() {
  const f = feature('programmation');
  const concepts = allConcepts();
  const [id, setId] = useState(concepts.find((c) => c.format.teams >= 8)?.id ?? concepts[0].id);
  const a = useMemo(() => analysisOf(concepts.find((c) => c.id === id)!, 80), [id]);
  const input = a.scheduleInput;
  const opening = input.opening ?? '13:00';
  const [kind, setKind] = useState<Disruption['kind']>('retard');
  const [court, setCourt] = useState('C1');
  const [from, setFrom] = useState(60);
  const [minutes, setMinutes] = useState(30);
  const [team, setTeam] = useState('T01');
  const [result, setResult] = useState<RescheduleResult | null>(null);
  const [approvals, setApprovals] = useLocal<ApprovalRequest[]>('approvals', []);
  const current = result?.schedule ?? a.schedule;
  const moved = new Set(result?.moved.map((m) => m.id) ?? []);

  const apply = () => {
    const d: Disruption =
      kind === 'retard' ? { kind, courtId: court, from, minutes } : kind === 'terrain_indisponible' ? { kind, courtId: court, from, to: from + minutes } : kind === 'absence_officiel' ? { kind, officialId: input.officials[0]?.id ?? 'O1', from } : { kind, teamId: team };
    setResult(reschedule(a.schedule, input, d, from));
  };
  const requestPublication = () =>
    setApprovals([{ id: `ap${Date.now()}`, action: 'publication', payload: publicationPayload(current, input), requestedBy: 'responsable sportif', requiredRole: 'responsable_evenement', status: 'en_attente' }, ...approvals]);

  return (
    <Page title="Programmation sportive" intro="Affectation des terrains, horaires et arbitres sous contraintes (repos, disponibilités, cérémonies, temps sponsors), détection des conflits et réorganisation en direct. Toute publication passe par une validation." status={f.status}>
      <div className="row" style={{ marginBottom: 14 }}>
        <SelectField label="Concept" value={id} onChange={(v) => { setId(v); setResult(null); }} options={concepts.map((c) => ({ value: c.id, label: c.title }))} />
      </div>
      <div className="kpis" style={{ marginBottom: 14 }}>
        <Kpi value={current.matches.filter((m) => m.start !== undefined).length} label="matchs programmés" />
        <Kpi value={fmtTime(current.endsAt, opening)} label={`fin (ouverture ${opening})`} />
        <Kpi value={`${current.stats.minRest} min`} label="repos minimum" />
        <Kpi value={`${current.stats.maxWait} min`} label="attente maximale" />
        <Kpi value={`${Math.round(current.stats.courtUtilization * 100)} %`} label="occupation des terrains" />
        <Kpi value={current.conflicts.length} label="conflits" />
      </div>
      <Panel title={result ? `Planning v${current.version} (réorganisé)` : 'Planning'}>
        <Gantt s={current} courts={input.courts} opening={opening} moved={moved} />
        {current.conflicts.map((c, i) => (
          <div key={i} className={`alert ${c.severity === 'bloquant' ? 'block' : ''}`}>{c.message}</div>
        ))}
      </Panel>
      <div className="grid two">
        <Panel title="Simuler un imprévu">
          <div className="form">
            <SelectField label="Imprévu" value={kind} onChange={setKind} options={[{ value: 'retard', label: 'Retard sur un terrain' }, { value: 'terrain_indisponible', label: 'Terrain indisponible' }, { value: 'absence_equipe', label: 'Absence d’une équipe (forfait)' }, { value: 'absence_officiel', label: 'Absence d’un arbitre' }]} />
            {(kind === 'retard' || kind === 'terrain_indisponible') && <SelectField label="Terrain" value={court} onChange={setCourt} options={input.courts.map((c) => ({ value: c.id, label: c.name }))} />}
            {kind === 'absence_equipe' && <SelectField label="Équipe" value={team} onChange={setTeam} options={input.teams.map((t) => ({ value: t.id, label: t.name }))} />}
            <div className="grid two">
              <NumberField label="À partir de (min après ouverture)" value={from} onChange={setFrom} min={0} />
              {(kind === 'retard' || kind === 'terrain_indisponible') && <NumberField label="Durée (min)" value={minutes} onChange={setMinutes} min={5} />}
            </div>
            <div className="row">
              <button className="btn" onClick={apply}>Réorganiser</button>
              {result && <button className="btn ghost" onClick={() => setResult(null)}>Revenir au planning initial</button>}
            </div>
          </div>
        </Panel>
        <Panel title="Modifications et publication">
          {!result && <p className="muted">Aucune modification. Simulez un imprévu : les matchs déjà commencés ne bougent pas, le reste est replanifié.</p>}
          {result && (
            <>
              <p>{result.moved.length} match(s) déplacé(s){result.forfeits.length ? `, ${result.forfeits.length} forfait(s)` : ''}.</p>
              <Table head={['Match', 'Avant', 'Après']} rows={result.moved.map((m) => [m.label, m.before, m.after])} />
            </>
          )}
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn" onClick={requestPublication}>Demander la publication</button>
            <button className="btn ghost" onClick={() => download(`planning-${id}.csv`, ['heure;terrain;match;equipe A;equipe B', ...publicationPayload(current, input).matches.map((m) => `${m.time};${m.court};${m.label};${m.home ?? ''};${m.away ?? ''}`)].join('\n'), 'text/csv')}>Exporter (CSV)</button>
          </div>
          <p className="small muted">La publication vers le site, les écrans et les espaces joueurs est envoyée dans la file de validation (Intégrations et validations).</p>
        </Panel>
      </div>
    </Page>
  );
}
