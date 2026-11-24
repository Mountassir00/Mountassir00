import { useMemo, useState } from 'react';
import { Page, Panel, Svg, Table, SelectField, NumberField, download, Kpi } from '../ui';
import { feature } from '../features';
import { ALL_VENUES } from '../../data/venues';
import { generateLayout, type LayoutRequest, ZONE_LABELS } from '../../core/venue/layout';
import { renderLayoutSvg } from '../../core/venue/svg';

export function Venues() {
  const f = feature('salles');
  const [venueId, setVenueId] = useState('palais-jean-weille');
  const venue = ALL_VENUES.find((v) => v.id === venueId)!;
  const [req, setReq] = useState<LayoutRequest>({ variant: 'show', fullCourts: 1, halfCourts: 0, runOffM: 2, spectators: 1500, participants: 64, teams: 8, volunteers: 40, partners: 8, vipGuests: 60 });
  const [view3d, setView3d] = useState(false);
  const layout = useMemo(() => generateLayout(venue, req), [venue, req]);
  const svg = useMemo(() => renderLayoutSvg(layout, { title: venue.name }), [layout, venue]);
  const set = <K extends keyof LayoutRequest>(k: K, v: LayoutRequest[K]) => setReq({ ...req, [k]: v });
  return (
    <Page title="Configurateur de salles" intro="Implantation automatique des terrains et des zones (joueurs, bénévoles, partenaires, restauration, VIP, contenus, médias, secours, flux). Les règles de capacité et d’évacuation sont indicatives : tout plan reste à valider par le gestionnaire et la sécurité." status={f.status}>
      <div className="grid side">
        <Panel title="Paramètres">
          <div className="form">
            <SelectField label="Lieu" value={venueId} onChange={setVenueId} options={ALL_VENUES.map((v) => ({ value: v.id, label: v.name }))} />
            <SelectField label="Configuration" value={req.variant} onChange={(v) => set('variant', v)} options={[{ value: 'show', label: 'Show (un terrain central)' }, { value: 'tournoi', label: 'Tournoi (multi-terrains)' }, { value: 'hybride', label: 'Hybride' }, { value: 'festival', label: 'Festival (animation)' }]} />
            <div className="grid two">
              <NumberField label="Terrains 5x5" value={req.fullCourts} onChange={(v) => set('fullCourts', v)} min={0} max={4} />
              <NumberField label="Terrains 3x3" value={req.halfCourts} onChange={(v) => set('halfCourts', v)} min={0} max={12} />
              <NumberField label="Dégagement (m)" value={req.runOffM} onChange={(v) => set('runOffM', v)} min={0} max={4} step={0.5} />
              <NumberField label="Spectateurs" value={req.spectators} onChange={(v) => set('spectators', v)} min={0} step={100} />
              <NumberField label="Participants" value={req.participants} onChange={(v) => set('participants', v)} min={0} />
              <NumberField label="Bénévoles" value={req.volunteers} onChange={(v) => set('volunteers', v)} min={0} />
              <NumberField label="Stands partenaires" value={req.partners} onChange={(v) => set('partners', v)} min={0} />
              <NumberField label="Invités VIP" value={req.vipGuests} onChange={(v) => set('vipGuests', v)} min={0} />
            </div>
          </div>
          <h3>Fiche du lieu</h3>
          <p className="small">
            Aire {venue.floor.length} × {venue.floor.width} m ({venue.floor.provenance.confidence}), {venue.fixedSeats} places fixes{venue.seatsProvenance ? ` (${venue.seatsProvenance.confidence})` : ''}, {venue.lockerRooms} vestiaires, {venue.accesses.length} accès.
          </p>
          <ul className="small">{venue.constraints.map((c, i) => <li key={i}>{c}</li>)}</ul>
        </Panel>
        <div className="grid">
          <Panel title="Plan d’implantation">
            <div className="row" style={{ marginBottom: 8 }}>
              <button className="btn ghost" onClick={() => setView3d(!view3d)}>{view3d ? 'Vue 2D' : 'Vue 3D simplifiée'}</button>
              <button className="btn ghost" onClick={() => download(`plan-${venue.id}-${req.variant}.svg`, svg, 'image/svg+xml')}>Télécharger le plan (SVG)</button>
            </div>
            <div className={view3d ? 'plan-3d' : ''}>
              <Svg svg={svg} label={`Plan ${venue.name}`} />
            </div>
          </Panel>
          <Panel title="Capacités et contrôles">
            <div className="kpis">
              <Kpi value={layout.capacity.seated} label="places assises" />
              <Kpi value={layout.capacity.standing} label="places debout (zones ouvertes)" />
              <Kpi value={layout.capacity.pmrPlacesRequired} label="places PMR à prévoir" />
              <Kpi value={`${layout.egress.availableUP}/${layout.egress.requiredUP}`} label="unités de passage dispo/requises" />
            </div>
            {layout.warnings.map((w, i) => (
              <div key={i} className={`alert ${w.startsWith('BLOQUANT') ? 'block' : ''}`}>{w}</div>
            ))}
            {!layout.warnings.length && <div className="alert ok">Aucune alerte sur cette configuration (contrôles indicatifs).</div>}
            <h3>Zones</h3>
            <Table head={['Zone', 'Espace', 'Surface', 'Dimensions']} rows={layout.zones.filter((z) => z.type !== 'tribune').map((z) => [z.label || ZONE_LABELS[z.type], layout.spaces.find((s) => s.id === z.spaceId)?.name ?? '', `${Math.round(z.w * z.h)} m²`, `${z.w.toFixed(1)} × ${z.h.toFixed(1)} m`])} />
          </Panel>
        </div>
      </div>
    </Page>
  );
}
