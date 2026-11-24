import { useMemo, useState } from 'react';
import { Page, Panel, Table, SelectField } from '../ui';
import { feature } from '../features';
import { INNOVATIONS } from '../../data/innovations';
import { innovationPriority } from '../../core/watch/relevance';
import type { Innovation, Sector } from '../../core/model';

const COST: Record<Innovation['cost']['tier'], string> = { tres_faible: 'très faible', faible: 'faible', moyen: 'moyen', eleve: 'élevé' };
const EVENTS: Record<string, string> = { 'asg-grand-est': 'ASG', 'bask-cup': 'Bask’Cup', 'king-of-the-court': 'KOTC', 'nouveaux-formats': 'Nouveaux' };

export function Innovations() {
  const f = feature('innovations');
  const [sector, setSector] = useState<'tous' | Sector>('tous');
  const [event, setEvent] = useState('tous');
  const [cost, setCost] = useState('tous');
  const [onlyNow, setOnlyNow] = useState(false);
  const [sel, setSel] = useState(0);
  const list = useMemo(
    () =>
      INNOVATIONS.filter((i) => (sector === 'tous' || i.sector === sector) && (event === 'tous' || i.applicableTo.includes(event)) && (cost === 'tous' || i.cost.tier === cost) && (!onlyNow || i.immediate)).sort(
        (a, b) => innovationPriority(b) - innovationPriority(a),
      ),
    [sector, event, cost, onlyNow],
  );
  const i = list[Math.min(sel, list.length - 1)];
  const sectors = [...new Set(INNOVATIONS.map((x) => x.sector))];
  return (
    <Page title="Bibliothèque des innovations" intro="Matrice de transposition intersectorielle : ce qui marche ailleurs, comment l’adapter au basket et aux moyens réels de Bask’Est, à quel coût et avec quels risques." status={f.status}>
      <div className="row" style={{ marginBottom: 14 }}>
        <SelectField label="Secteur d’origine" value={sector} onChange={(v) => { setSector(v); setSel(0); }} options={[{ value: 'tous', label: 'Tous' }, ...sectors.map((s) => ({ value: s, label: s.replace('_', ' ') }))]} />
        <SelectField label="Événement Bask’Est" value={event} onChange={(v) => { setEvent(v); setSel(0); }} options={[{ value: 'tous', label: 'Tous' }, ...Object.entries(EVENTS).map(([k, v]) => ({ value: k, label: v }))]} />
        <SelectField label="Coût" value={cost} onChange={(v) => { setCost(v); setSel(0); }} options={[{ value: 'tous', label: 'Tous' }, ...Object.entries(COST).map(([k, v]) => ({ value: k, label: v }))]} />
        <label className="checks" style={{ alignSelf: 'end' }}>
          <input type="checkbox" checked={onlyNow} onChange={(e) => { setOnlyNow(e.target.checked); setSel(0); }} /> Applicables dès la prochaine édition
        </label>
      </div>
      <div className="grid two">
        <Table
          head={['Priorité', 'Innovation', 'Origine', 'Coût', 'Média']}
          numeric={[0]}
          selected={Math.min(sel, list.length - 1)}
          onRowClick={setSel}
          rows={list.map((x) => [Math.round(innovationPriority(x) * 100), <>{x.title} {x.immediate && <span className="tag hot">immédiat</span>}</>, x.origin.split('(')[0], COST[x.cost.tier], '★'.repeat(x.mediaPotential)])}
        />
        {i ? (
          <Panel title={i.title}>
            <p className="muted small">
              {i.sector.replace('_', ' ')}, {i.origin}. Fiabilité : {i.provenance.confidence}
              {i.provenance.source && (
                <>
                  , <a href={i.provenance.source} target="_blank" rel="noreferrer">source</a>
                </>
              )}
            </p>
            <h3>Fonctionnement</h3>
            <p>{i.howItWorks}</p>
            <h3>Valeur ajoutée</h3>
            <p>{i.valueAdded}</p>
            <h3>Adaptation au basket</h3>
            <p>{i.basketballAdaptation}</p>
            <Table
              head={['Coût estimé', 'Ressources', 'Limites', 'Risques', 'Événements']}
              rows={[[`${COST[i.cost.tier]} (${i.cost.range.min}–${i.cost.range.max} €)`, i.resources.join(' ; '), i.limits.join(' ; '), i.risks.join(' ; '), i.applicableTo.map((e) => EVENTS[e] ?? e).join(', ')]]}
            />
          </Panel>
        ) : (
          <Panel title="Aucun résultat">
            <p className="muted">Aucune innovation ne correspond à ces filtres. Élargissez le secteur ou le coût.</p>
          </Panel>
        )}
      </div>
    </Page>
  );
}
