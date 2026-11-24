import { useState } from 'react';
import { Page, Panel, Table } from '../ui';
import { feature } from '../features';
import { BUILDING_BLOCKS, EVENTLAB_FILES } from '../../data/eventlab';
import type { BlockAttributes, Direction } from '../../core/eventlab';
import { BLOCK_TYPE_LABEL, DIRECTION_LABEL, SECTOR_LABEL, TECH_LABEL, TIER_HINT, hashParam, tier, useScrollOnSelect } from '../eventlab-ui';

const ATTR_LABEL: Record<keyof BlockAttributes, string> = {
  novelty: 'Nouveauté',
  ux_gain: 'Gain d’expérience',
  complexity: 'Complexité',
  cost: 'Coût',
  media: 'Potentiel médiatique',
  revenue: 'Potentiel de recettes',
  inclusion: 'Inclusion',
  eco_impact: 'Sobriété (5 = impact très faible)',
  portability: 'Portabilité',
};
const DIRS = Object.keys(DIRECTION_LABEL) as Direction[];
const SETTING: Record<string, string> = { interieur: 'intérieur', exterieur: 'extérieur', indifferent: 'indifférent' };
/** Règle de filtre par direction : adéquation déclarée ≥ 4 sur 5. */
const FIT_MIN = 4;

export function Blocks() {
  const f = feature('briques');
  const [type, setType] = useState('');
  const [dir, setDir] = useState<'' | Direction>('');
  const [tierMax, setTierMax] = useState('');
  const [origin, setOrigin] = useState('');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<string>(() => hashParam('b') ?? BUILDING_BLOCKS[0].id);
  const origins = [...new Set(BUILDING_BLOCKS.map((b) => b.origin.sector_family))];
  const list = BUILDING_BLOCKS.filter(
    (b) =>
      (!type || b.type === type) &&
      (!dir || (b.direction_fit?.[dir] ?? 0) >= FIT_MIN) &&
      (tierMax === '' || (b.requirements.budget_tier_min ?? 0) <= Number(tierMax)) &&
      (!origin || b.origin.sector_family === origin) &&
      (!q.trim() || `${b.name} ${b.mechanic} ${b.id}`.toLowerCase().includes(q.trim().toLowerCase())),
  );
  const b = BUILDING_BLOCKS.find((x) => x.id === sel) ?? list[0] ?? BUILDING_BLOCKS[0];
  const detailRef = useScrollOnSelect<HTMLDivElement>(sel);
  const byId = new Map(BUILDING_BLOCKS.map((x) => [x.id, x]));
  const link = (id: string) => {
    const t = byId.get(id);
    return t ? (
      <button className="linkbtn" onClick={() => setSel(id)}>
        {t.name}
      </button>
    ) : (
      <span>{id} (absente de la bibliothèque)</span>
    );
  };
  const strong = (x: typeof b) => DIRS.filter((d) => (x.direction_fit?.[d] ?? 0) >= FIT_MIN).map((d) => DIRECTION_LABEL[d]);
  return (
    <Page title="Bibliothèque de briques" intro="Briques fonctionnelles issues de la décomposition d’événements existants : chacune décrit une logique transposable, jamais une marque ni un élément protégé. Le générateur multisectoriel les combine." status={f.status}>
      <Panel>
        <div className="controls">
          <label className="field">
            <span>Type</span>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">tous ({BUILDING_BLOCKS.length})</option>
              {Object.entries(BLOCK_TYPE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v} ({BUILDING_BLOCKS.filter((x) => x.type === k).length})
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Direction (adéquation ≥ {FIT_MIN}/5)</span>
            <select value={dir} onChange={(e) => setDir(e.target.value as '' | Direction)}>
              <option value="">toutes</option>
              {DIRS.map((d) => (
                <option key={d} value={d}>
                  {DIRECTION_LABEL[d]}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Palier budgétaire disponible</span>
            <select value={tierMax} onChange={(e) => setTierMax(e.target.value)}>
              <option value="">tous</option>
              {TIER_HINT.map((h, i) => (
                <option key={i} value={i}>
                  {h}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Origine</span>
            <select value={origin} onChange={(e) => setOrigin(e.target.value)}>
              <option value="">toutes</option>
              {origins.map((o) => (
                <option key={o} value={o}>
                  {SECTOR_LABEL[o] ?? o} ({BUILDING_BLOCKS.filter((x) => x.origin.sector_family === o).length})
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Recherche</span>
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="mot-clé" />
          </label>
        </div>
        <p className="status-line">
          <span>
            {list.length} brique(s) sur {BUILDING_BLOCKS.length}
          </span>
          <span>
            Source : <code>{EVENTLAB_FILES.blocks}</code>
          </span>
          <span>Palier : une brique est retenue si son palier minimal est inférieur ou égal au palier choisi.</span>
        </p>
      </Panel>
      <div className="grid two" style={{ marginTop: 18 }}>
        <Panel title="Briques">
          {list.length === 0 ? (
            <p className="muted">Aucune brique ne correspond à ces filtres.</p>
          ) : (
            <Table head={['Brique', 'Type', 'Origine', 'Palier min.', 'Directions fortes']} rows={list.map((x) => [<b>{x.name}</b>, BLOCK_TYPE_LABEL[x.type], SECTOR_LABEL[x.origin.sector_family], tier(x.requirements.budget_tier_min ?? 0), strong(x).join(', ') || '—'])} onRowClick={(i) => setSel(list[i].id)} selected={list.findIndex((x) => x.id === b.id)} />
          )}
        </Panel>
        <div ref={detailRef} style={{ minWidth: 0, scrollMarginTop: 72 }}>
        <Panel title={b.name}>
          <p className="muted small" style={{ marginTop: -4 }}>
            <code>{b.id}</code> · {BLOCK_TYPE_LABEL[b.type]} · origine : {SECTOR_LABEL[b.origin.sector_family]}
          </p>
          <h3>Mécanique</h3>
          <p>{b.mechanic}</p>
          {b.origin.examples?.length ? (
            <>
              <h3>Où la logique est observée</h3>
              <ul className="mini-list">
                {b.origin.examples.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </>
          ) : null}
          <h3>Exigences</h3>
          <dl className="kv">
            <dt>Palier budgétaire minimal</dt>
            <dd>
              {tier(b.requirements.budget_tier_min ?? 0)} ({TIER_HINT[b.requirements.budget_tier_min ?? 0]})
            </dd>
            <dt>Effectif minimal</dt>
            <dd>{b.requirements.staff_min ?? '—'} personne(s)</dd>
            <dt>Technique</dt>
            <dd>{(b.requirements.tech ?? []).map((t) => TECH_LABEL[t] ?? t).join(', ') || '—'}</dd>
            <dt>Cadre</dt>
            <dd>{SETTING[b.requirements.setting ?? ''] ?? '—'}</dd>
            <dt>Surface minimale</dt>
            <dd>{b.requirements.min_area_m2 != null ? `${b.requirements.min_area_m2.toLocaleString('fr-FR')} m²` : '—'}</dd>
          </dl>
          <h3>Attributs (0 à 5)</h3>
          {(Object.keys(ATTR_LABEL) as (keyof BlockAttributes)[]).map((k) => (
            <div className="attr" key={k}>
              <span>{ATTR_LABEL[k]}</span>
              <div className="bar" aria-hidden="true">
                <span style={{ width: `${((b.attributes[k] ?? 0) / 5) * 100}%` }} />
              </div>
              <span className="pts">{b.attributes[k] ?? '—'}</span>
            </div>
          ))}
          <h3>Adéquation aux directions</h3>
          <p className="small">{DIRS.map((d) => `${DIRECTION_LABEL[d]} ${b.direction_fit?.[d] ?? '—'}/5`).join(' · ')}</p>
          <h3>Compatibilités</h3>
          {b.compatible_with?.length ? (
            <ul className="mini-list">
              {b.compatible_with.map((id) => (
                <li key={id}>{link(id)}</li>
              ))}
            </ul>
          ) : (
            <p className="muted small">Aucune compatibilité déclarée.</p>
          )}
          <h3>Incompatibilités</h3>
          {b.incompatible_with?.length ? (
            <ul className="mini-list">
              {b.incompatible_with.map((id) => (
                <li key={id}>{link(id)}</li>
              ))}
            </ul>
          ) : (
            <p className="muted small">Aucune incompatibilité déclarée.</p>
          )}
          {b.risks?.length ? (
            <>
              <h3>Risques</h3>
              <ul className="mini-list">
                {b.risks.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </>
          ) : null}
          <h3>Propriété intellectuelle</h3>
          <p className="notice" style={{ color: 'var(--ink)' }}>
            {b.ip_note}
          </p>
        </Panel>
        </div>
      </div>
    </Page>
  );
}
