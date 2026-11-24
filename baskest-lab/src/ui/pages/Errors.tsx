import { useState } from 'react';
import { Page, Panel, Table, Tabs, SelectField } from '../ui';
import { feature } from '../features';
import { ERROR_CASES } from '../../data/errors';
import { EL_ERRORS, UNIFIED_ERRORS, EVENTLAB_FILES } from '../../data/eventlab';
import { DESIGN_RULES } from '../../core/rules/design-rules';
import { ORIGIN_LABEL, type UnifiedError } from '../../core/knowledge/unify';
import { OriginBadges, themeLabel, useScrollOnSelect } from '../eventlab-ui';

type OriginFilter = 'toutes' | 'baskest' | 'eventlab' | 'fusion';
const theme = themeLabel;
const CAUSE_STATUS: Record<string, string> = { etablie_rapport_officiel: 'établies par un rapport officiel', recoupee_presse: 'recoupées par la presse', probable: 'probables' };
const SEVERITY: Record<string, string> = { mineure: 'mineure', majeure: 'majeure', critique: 'critique' };

function List({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) return null;
  return (
    <>
      <h3>{title}</h3>
      <ul>
        {items.map((c, i) => (
          <li key={i}>{c}</li>
        ))}
      </ul>
    </>
  );
}

function Detail({ e }: { e: UnifiedError }) {
  return (
    <Panel title={e.title}>
      <p style={{ marginTop: -4 }}>
        <OriginBadges origins={e.origins} />
        {e.merge && <span className="badge merge">{e.merge.reason === 'sources_communes' ? 'fusion : sources communes' : 'fusion : même incident'}</span>}
        {e.severity && <span className="tag">gravité {SEVERITY[e.severity]}</span>}
      </p>
      {e.merge && <p className="notice">{e.merge.note}</p>}
      {e.el && (
        <>
          <h3>
            Fiche {ORIGIN_LABEL.eventlab} {e.el.id}
          </h3>
          {e.el.events?.length ? (
            <p className="small muted">
              {e.el.events.map((v) => [v.name, v.date, v.city, v.country].filter(Boolean).join(', ')).join(' · ')}
            </p>
          ) : null}
          <p>{e.el.description}</p>
          <List title={`Causes (${CAUSE_STATUS[e.el.cause_status] ?? e.el.cause_status})`} items={e.el.probable_causes} />
          <List title="Conséquences" items={e.el.consequences} />
          <List title="Signes précurseurs" items={e.el.warning_signs} />
          <List title="Mesures préventives" items={e.el.preventive_measures} />
          <List title="Plan correctif (pendant l’événement)" items={e.el.corrective_plan} />
          <List title="Points de contrôle injectés dans les checklists" items={e.el.checklist_items} />
        </>
      )}
      {e.bk.map((c) => (
        <div key={c.id}>
          <h3>
            {e.el ? 'Cas fusionné' : 'Cas'} {ORIGIN_LABEL.baskest} : {c.title}
          </h3>
          <p className="small muted">
            {c.id} · catégorie {theme(c.category)}
          </p>
          <p>{c.observed}</p>
          <List title="Causes probables" items={c.causes} />
          <List title="Conséquences" items={c.consequences} />
          <List title="Mesures préventives" items={c.prevention} />
          {c.ruleIds.length > 0 && (
            <p>
              Règles appliquées automatiquement :{' '}
              {c.ruleIds.map((r) => (
                <span className="tag hot" key={r}>
                  {r} {DESIGN_RULES.find((d) => d.id === r)?.label}
                </span>
              ))}
            </p>
          )}
        </div>
      ))}
      <h3>Sources ({e.sources.length})</h3>
      <ul className="list-plain small">
        {e.sources.map((s, i) => (
          <li key={i}>
            {s.url && /^https?:/.test(s.url) ? (
              <a href={s.url} target="_blank" rel="noreferrer">
                {s.title ?? s.url}
              </a>
            ) : (
              (s.title ?? s.url ?? '—')
            )}
            {s.publisher ? ` — ${s.publisher}` : ''}
            {s.reliability ? ` · ${s.reliability}` : ''}
            <div>
              <OriginBadges origins={s.origins} />
              {s.note && <span className="muted"> {s.note}</span>}
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export function Errors() {
  const f = feature('erreurs');
  const [tab, setTab] = useState<'cas' | 'regles'>('cas');
  const [origin, setOrigin] = useState<OriginFilter>('toutes');
  const [cat, setCat] = useState('toutes');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const themes = new Map<string, number>();
  UNIFIED_ERRORS.forEach((u) => u.themes.forEach((t) => themes.set(t, (themes.get(t) ?? 0) + 1)));
  const list = UNIFIED_ERRORS.filter(
    (u) =>
      (origin === 'toutes' || (origin === 'fusion' ? u.origins.length === 2 : u.origins.length === 1 && u.origins[0] === origin)) &&
      (cat === 'toutes' || u.themes.includes(cat)) &&
      (!q.trim() || `${u.title} ${u.el?.description ?? ''} ${u.bk.map((c) => `${c.title} ${c.observed}`).join(' ')}`.toLowerCase().includes(q.trim().toLowerCase())),
  );
  const e = list[Math.min(sel, list.length - 1)];
  const detailRef = useScrollOnSelect<HTMLDivElement>(e?.key);
  const merged = UNIFIED_ERRORS.filter((u) => u.origins.length === 2);
  const mergedBk = merged.reduce((s, u) => s + u.bk.length, 0);
  const byReason = (r: string) => merged.filter((u) => u.merge?.reason === r);
  return (
    <Page title="Registre des erreurs" intro="Les causes d’échec d’événements, documentées par BASK’EST LAB et EVENT LAB, dans une seule liste : origine visible, doublons fusionnés sans perte de source. Les cas basket sont convertis en règles de conception vérifiées automatiquement." status={f.status}>
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'cas', label: `Registre unifié (${UNIFIED_ERRORS.length})` }, { value: 'regles', label: `Règles de conception (${DESIGN_RULES.length})` }]} />
      {tab === 'cas' && (
        <>
          <p className="small">
            <b>{ERROR_CASES.length}</b> cas {ORIGIN_LABEL.baskest} + <b>{EL_ERRORS.length}</b> fiches {ORIGIN_LABEL.eventlab} = {ERROR_CASES.length + EL_ERRORS.length} fiches d’origine → <b>{UNIFIED_ERRORS.length} entrées</b>. {merged.length} fusions regroupent {merged.length} fiches EVENT LAB et {mergedBk} cas BASK’EST : {byReason('sources_communes').length} fiches importées de l’observatoire BASK’EST (tag <code>source:baskest-lab</code>, {byReason('sources_communes').reduce((s, u) => s + u.bk.length, 0)} cas aux sources communes) et {byReason('meme_incident').length} incidents documentés indépendamment dans les deux registres. Toutes les sources sont conservées. Sources : <code>src/data/errors.ts</code>, <code>{EVENTLAB_FILES.errors}</code>.
          </p>
          <div className="controls" style={{ marginBottom: 12 }}>
            <SelectField
              label="Origine"
              value={origin}
              onChange={(v) => {
                setOrigin(v);
                setSel(0);
              }}
              options={[
                { value: 'toutes', label: `Toutes (${UNIFIED_ERRORS.length})` },
                { value: 'baskest', label: `${ORIGIN_LABEL.baskest} seul (${UNIFIED_ERRORS.filter((u) => u.origins.length === 1 && u.origins[0] === 'baskest').length})` },
                { value: 'eventlab', label: `${ORIGIN_LABEL.eventlab} seul (${UNIFIED_ERRORS.filter((u) => u.origins.length === 1 && u.origins[0] === 'eventlab').length})` },
                { value: 'fusion', label: `Fusionnées (${merged.length})` },
              ]}
            />
            <SelectField
              label="Catégorie ou domaine"
              value={cat}
              onChange={(v) => {
                setCat(v);
                setSel(0);
              }}
              options={[{ value: 'toutes', label: 'Toutes' }, ...[...themes.entries()].sort((a, b) => a[0].localeCompare(b[0], 'fr')).map(([k, n]) => ({ value: k, label: `${theme(k)} (${n})` }))]}
            />
            <label className="field">
              <span>Recherche</span>
              <input
                type="search"
                value={q}
                onChange={(ev) => {
                  setQ(ev.target.value);
                  setSel(0);
                }}
                placeholder="mot-clé, événement"
              />
            </label>
          </div>
          <div className="grid two">
            {list.length === 0 ? (
              <p className="muted">Aucune entrée ne correspond.</p>
            ) : (
              <Table head={['Erreur', 'Origine', 'Catégorie / domaine', 'Gravité']} selected={Math.min(sel, list.length - 1)} onRowClick={setSel} rows={list.map((x) => [x.title, <OriginBadges origins={x.origins} />, x.themes.map(theme).join(', '), x.severity ? SEVERITY[x.severity] : x.bk[0]?.source.confidence === 'verifie' ? 'non cotée (vérifié)' : 'non cotée'])} />
            )}
            {e && (
              <div ref={detailRef} style={{ minWidth: 0, scrollMarginTop: 72 }}>
                <Detail e={e} />
              </div>
            )}
          </div>
        </>
      )}
      {tab === 'regles' && (
        <Table
          head={['Règle', 'Catégorie d’erreur', 'Seuil appliqué', 'Cas qui la justifient']}
          rows={DESIGN_RULES.map((r) => [<b>{r.id} {r.label}</b>, theme(r.category), r.threshold, ERROR_CASES.filter((x) => x.ruleIds.includes(r.id)).length])}
          numeric={[3]}
        />
      )}
    </Page>
  );
}
