import { useState } from 'react';
import { Page, Panel, Table, Tabs, SelectField } from '../ui';
import { feature } from '../features';
import { ERROR_CASES, errorCoverage } from '../../data/errors';
import { DESIGN_RULES } from '../../core/rules/design-rules';
import type { ErrorCategory } from '../../core/model';

export function Errors() {
  const f = feature('erreurs');
  const [tab, setTab] = useState<'cas' | 'regles'>('cas');
  const [cat, setCat] = useState<'toutes' | ErrorCategory>('toutes');
  const [sel, setSel] = useState(0);
  const cov = errorCoverage();
  const list = ERROR_CASES.filter((e) => cat === 'toutes' || e.category === cat);
  const e = list[Math.min(sel, list.length - 1)];
  return (
    <Page title="Registre des erreurs" intro="Les causes d’échec des événements sportifs, documentées et converties en règles de conception vérifiées automatiquement sur chaque nouveau concept." status={f.status}>
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'cas', label: `Cas documentés (${ERROR_CASES.length})` }, { value: 'regles', label: `Règles de conception (${DESIGN_RULES.length})` }]} />
      {tab === 'cas' && (
        <>
          <div className="row" style={{ marginBottom: 12 }}>
            <SelectField
              label="Catégorie"
              value={cat}
              onChange={(v) => { setCat(v); setSel(0); }}
              options={[{ value: 'toutes', label: 'Toutes' }, ...(Object.keys(cov) as ErrorCategory[]).map((k) => ({ value: k, label: `${k.replace(/_/g, ' ')} (${cov[k]})` }))]}
            />
          </div>
          <div className="grid two">
            <Table head={['Erreur', 'Catégorie', 'Fiabilité']} selected={Math.min(sel, list.length - 1)} onRowClick={setSel} rows={list.map((x) => [x.title, x.category.replace(/_/g, ' '), x.source.confidence])} />
            {e && (
              <Panel title={e.title}>
                <p>{e.observed}</p>
                {e.source.source && <p className="small"><a href={e.source.source} target="_blank" rel="noreferrer">Source</a></p>}
                <h3>Causes probables</h3>
                <ul>{e.causes.map((c, i) => <li key={i}>{c}</li>)}</ul>
                <h3>Conséquences</h3>
                <ul>{e.consequences.map((c, i) => <li key={i}>{c}</li>)}</ul>
                <h3>Mesures préventives</h3>
                <ul>{e.prevention.map((c, i) => <li key={i}>{c}</li>)}</ul>
                <p>
                  Règles appliquées automatiquement : {e.ruleIds.map((r) => <span className="tag hot" key={r}>{r} {DESIGN_RULES.find((d) => d.id === r)?.label}</span>)}
                </p>
              </Panel>
            )}
          </div>
        </>
      )}
      {tab === 'regles' && (
        <Table
          head={['Règle', 'Catégorie d’erreur', 'Seuil appliqué', 'Cas qui la justifient']}
          rows={DESIGN_RULES.map((r) => [<b>{r.id} {r.label}</b>, r.category.replace(/_/g, ' '), r.threshold, ERROR_CASES.filter((x) => x.ruleIds.includes(r.id)).length])}
          numeric={[3]}
        />
      )}
    </Page>
  );
}
