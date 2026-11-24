import { useState } from 'react';
import { Page, Panel, Svg, SelectField, download, Table } from '../ui';
import { feature } from '../features';
import { allConcepts } from '../lab';
import { ASSET_KINDS } from '../../core/studio/assets';
import { NAME_PARTS } from '../../core/generator/library';
import { BASKEST_BRAND, PROPERTIES } from '../../data/baskest-events';
import type { ConceptIdentity } from '../../core/model';

export function Studio() {
  const f = feature('studio');
  const concepts = allConcepts();
  const [id, setId] = useState(concepts[0].id);
  const c = concepts.find((x) => x.id === id)!;
  const [identity, setIdentity] = useState<ConceptIdentity>(c.identity);
  const [date, setDate] = useState('Samedi 12 juin 2027');
  const [venue, setVenue] = useState('Palais des Sports Jean-Weille');
  const input = { identity, date, venue, city: 'Nancy', price: '10 €' };
  const pick = (v: string) => {
    setId(v);
    setIdentity(concepts.find((x) => x.id === v)!.identity);
  };
  return (
    <Page title="Studio de design" intro="Une identité propre pour chaque format, toujours reconnaissable comme une création Bask’Est. Ces maquettes servent de direction artistique : un graphiste les finalise." status={f.status}>
      <div className="grid side">
        <Panel title="Identité">
          <div className="form">
            <SelectField label="Concept" value={id} onChange={pick} options={concepts.map((x) => ({ value: x.id, label: x.title }))} />
            <label className="field"><span>Nom</span><input value={identity.name} onChange={(e) => setIdentity({ ...identity, name: e.target.value })} /></label>
            <label className="field"><span>Signature</span><input value={identity.tagline} onChange={(e) => setIdentity({ ...identity, tagline: e.target.value })} /></label>
            <SelectField label="Motif" value={identity.motif} onChange={(v) => setIdentity({ ...identity, motif: v })} options={[...new Set([identity.motif, ...NAME_PARTS.motifs])].map((m) => ({ value: m, label: m }))} />
            <div className="row">
              {identity.palette.map((col, i) => (
                <label key={i} className="field" style={{ width: 70 }}>
                  <span className="small">{['Fond', 'Accent', 'Accent 2', 'Clair'][i] ?? `C${i + 1}`}</span>
                  <input type="color" value={col} onChange={(e) => setIdentity({ ...identity, palette: identity.palette.map((p, j) => (j === i ? e.target.value : p)) })} style={{ height: 36, padding: 2 }} />
                </label>
              ))}
            </div>
            <label className="field"><span>Date affichée</span><input value={date} onChange={(e) => setDate(e.target.value)} /></label>
            <label className="field"><span>Lieu affiché</span><input value={venue} onChange={(e) => setVenue(e.target.value)} /></label>
          </div>
          <h3>Vérifications avant commercialisation</h3>
          <ul className="small">{identity.nameChecks.map((n, i) => <li key={i}>{n}</li>)}</ul>
        </Panel>
        <div className="grid two">
          {ASSET_KINDS.map((k) => {
            const svg = k.render(input);
            return (
              <Panel key={k.id} title={k.label}>
                <Svg svg={svg} label={`${k.label} ${identity.name}`} />
                <div className="row" style={{ marginTop: 8 }}>
                  <button className="btn ghost" onClick={() => download(`${identity.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${k.id}.svg`, svg, 'image/svg+xml')}>Télécharger le SVG</button>
                </div>
              </Panel>
            );
          })}
        </div>
      </div>
      <Panel title="Système de marque modulaire (proposition)">
        <p className="muted small">Aucune charte officielle Bask’Est n’a été trouvée publiquement : ce système est une proposition à valider ou à remplacer par la charte existante.</p>
        <div className="row" style={{ marginBottom: 10 }}>
          {Object.entries(BASKEST_BRAND.palette).map(([k, v]) => (
            <div key={k} style={{ textAlign: 'center' }}>
              <div style={{ width: 64, height: 40, background: v, borderRadius: 4, border: '1px solid var(--line)' }} />
              <div className="small">{k}<br />{v}</div>
            </div>
          ))}
        </div>
        <ul>{BASKEST_BRAND.invariants.map((x, i) => <li key={i}>{x}</li>)}</ul>
        <Table head={['Propriété', 'Couleur d’accent', 'Motif']} rows={PROPERTIES.map((p) => [p.name, <span><span style={{ display: 'inline-block', width: 14, height: 14, background: p.brand.accent, verticalAlign: 'middle', marginRight: 6, borderRadius: 3 }} />{p.brand.accent}</span>, p.brand.motif ?? '—'])} />
      </Panel>
    </Page>
  );
}
