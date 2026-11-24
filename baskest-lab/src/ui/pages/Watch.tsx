import { useState } from 'react';
import { Page, Panel, Table, Tabs, useLocal, SelectField, download } from '../ui';
import { feature } from '../features';
import { WATCH_SOURCES } from '../../data/watch-sources';
import { EL_WATCH_SOURCES, UNIFIED_WATCH, EVENTLAB_FILES } from '../../data/eventlab';
import { ORIGIN_LABEL, type UnifiedWatchSource } from '../../core/knowledge/unify';
import { scoreWatchItem, weeklyDigest } from '../../core/watch/relevance';
import type { Sector, WatchItem } from '../../core/model';
import { OriginBadges, SECTOR_LABEL } from '../eventlab-ui';

const SECTORS: Sector[] = ['basketball', 'f1', 'football', 'kings_league', 'combat', 'tennis', 'rugby', 'olympisme', 'esport', 'jeu_video', 'festival', 'television', 'concert', 'immersif', 'mode', 'luxe'];
type OriginFilter = 'toutes' | 'baskest' | 'eventlab' | 'deux';

function describe(d: UnifiedWatchSource) {
  return d.entries.map((x) =>
    x.origin === 'baskest'
      ? { origin: x.origin, name: x.src.name, url: x.src.url, type: x.src.kind.replace(/_/g, ' '), cadence: x.src.frequency, quality: `fiabilité ${x.src.reliability}/5`, topics: x.src.topics.join(', ') }
      : { origin: x.origin, name: x.src.name, url: x.src.url, type: x.src.type.replace(/_/g, ' '), cadence: x.src.cadence_suggeree, quality: x.src.verification === 'verifie' ? 'vérifiée (recherche)' : 'non vérifiée', topics: x.src.sector_families.map((s) => SECTOR_LABEL[s] ?? s).join(', ') },
  );
}

export function Watch() {
  const f = feature('veille');
  const [tab, setTab] = useState<'catalogue' | 'basket' | 'multisport' | 'signaux'>('catalogue');
  const [origin, setOrigin] = useState<OriginFilter>('toutes');
  const [q, setQ] = useState('');
  const [items, setItems] = useLocal<WatchItem[]>('watch-items', []);
  const [draft, setDraft] = useState({ title: '', url: '', summary: '', sector: 'basketball' as Sector, tags: '' });
  const basket = WATCH_SOURCES.filter((s) => s.topics.some((t) => /basket|nba|fiba|3x3|lnb|ffbb|euroleague|wnba|ncaa|dunk|street|grand-est|sluc|quai|tbt|big3/i.test(t)) || /basket|nba|fiba|3x3/i.test(s.name));
  const multi = WATCH_SOURCES.filter((s) => !basket.includes(s));
  const add = () => {
    const base = { title: draft.title, summary: draft.summary, sector: draft.sector, tags: draft.tags.split(',').map((t) => t.trim()).filter(Boolean) };
    setItems([{ id: `w${Date.now()}`, sourceId: 'manuel', url: draft.url, publishedAt: new Date().toISOString().slice(0, 10), status: 'nouveau', relevance: scoreWatchItem(base), ...base }, ...items]);
    setDraft({ ...draft, title: '', url: '', summary: '', tags: '' });
  };
  const srcRows = (list: typeof WATCH_SOURCES) => list.map((s) => [<a href={s.url} target="_blank" rel="noreferrer">{s.name}</a>, s.kind.replace(/_/g, ' '), s.topics.join(', '), s.frequency, `${s.reliability}/5`]);
  const both = UNIFIED_WATCH.filter((d) => d.origins.length === 2);
  const catalogue = UNIFIED_WATCH.filter(
    (d) =>
      (origin === 'toutes' || (origin === 'deux' ? d.origins.length === 2 : d.origins.length === 1 && d.origins[0] === origin)) &&
      (!q.trim() || `${d.domain} ${d.names.join(' ')} ${describe(d).map((x) => x.topics).join(' ')}`.toLowerCase().includes(q.trim().toLowerCase())),
  );
  return (
    <Page title="Veille et sources" intro="Catalogue unique des sources de veille de BASK’EST LAB et d’EVENT LAB, dédoublonné par domaine, avec cadence de consultation et qualification des signaux. La collecte automatique (RSS, API) et la synthèse planifiée dépendent d’une intégration." status={f.status}>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'catalogue', label: `Catalogue unifié (${UNIFIED_WATCH.length})` },
          { value: 'basket', label: `Basketball (${basket.length})` },
          { value: 'multisport', label: `Multisport BASK’EST (${multi.length})` },
          { value: 'signaux', label: `Signaux qualifiés (${items.length})` },
        ]}
      />
      {tab === 'catalogue' && (
        <>
          <p className="small">
            <b>{WATCH_SOURCES.length}</b> sources {ORIGIN_LABEL.baskest} + <b>{EL_WATCH_SOURCES.length}</b> sources {ORIGIN_LABEL.eventlab} = {WATCH_SOURCES.length + EL_WATCH_SOURCES.length} fiches → <b>{UNIFIED_WATCH.length} domaines</b> uniques. {both.length} domaines figurent dans les deux catalogues ({both.map((d) => d.domain).join(', ')}) ; un domaine regroupe parfois plusieurs rubriques, dont les adresses sont toutes conservées. Sources : <code>src/data/watch-sources.ts</code>, <code>{EVENTLAB_FILES.watch}</code>.
          </p>
          <div className="controls" style={{ marginBottom: 12 }}>
            <SelectField
              label="Origine"
              value={origin}
              onChange={setOrigin}
              options={[
                { value: 'toutes', label: `Toutes (${UNIFIED_WATCH.length})` },
                { value: 'baskest', label: `${ORIGIN_LABEL.baskest} seul (${UNIFIED_WATCH.filter((d) => d.origins.length === 1 && d.origins[0] === 'baskest').length})` },
                { value: 'eventlab', label: `${ORIGIN_LABEL.eventlab} seul (${UNIFIED_WATCH.filter((d) => d.origins.length === 1 && d.origins[0] === 'eventlab').length})` },
                { value: 'deux', label: `Les deux (${both.length})` },
              ]}
            />
            <label className="field">
              <span>Recherche</span>
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="nom, domaine, sujet" />
            </label>
          </div>
          <Table
            head={['Domaine', 'Source(s)', 'Origine', 'Type', 'Cadence', 'Qualité', 'Sujets / familles']}
            rows={catalogue.map((d) => {
              const xs = describe(d);
              return [
                <b>{d.domain}</b>,
                <span>
                  {xs.map((x, i) => (
                    <span key={i}>
                      {i > 0 && <br />}
                      <a href={x.url} target="_blank" rel="noreferrer">
                        {x.name}
                      </a>
                    </span>
                  ))}
                </span>,
                <OriginBadges origins={d.origins} />,
                [...new Set(xs.map((x) => x.type))].join(', '),
                [...new Set(xs.map((x) => x.cadence))].join(', '),
                xs.map((x) => x.quality).join(' ; '),
                <span className="small">{[...new Set(xs.map((x) => x.topics))].join(' ; ')}</span>,
              ];
            })}
          />
          <p className="muted small">Qualité : BASK’EST note la fiabilité de 1 à 5 (5 = source officielle primaire) ; EVENT LAB indique si l’adresse a été confirmée par recherche le 24/11/2026, sans ouverture des pages. Les deux échelles ne sont pas converties l’une dans l’autre.</p>
        </>
      )}
      {tab === 'basket' && <Table head={['Source', 'Type', 'Sujets', 'Cadence', 'Fiabilité']} rows={srcRows(basket)} />}
      {tab === 'multisport' && <Table head={['Source', 'Type', 'Sujets', 'Cadence', 'Fiabilité']} rows={srcRows(multi)} />}
      {tab === 'signaux' && (
        <div className="grid side">
          <Panel title="Ajouter un signal">
            <div className="form">
              <label className="field"><span>Titre</span><input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></label>
              <label className="field"><span>Lien</span><input value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} placeholder="https://" /></label>
              <label className="field"><span>Résumé</span><textarea rows={3} value={draft.summary} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} /></label>
              <SelectField label="Secteur" value={draft.sector} onChange={(v) => setDraft({ ...draft, sector: v })} options={SECTORS.map((s) => ({ value: s, label: s.replace('_', ' ') }))} />
              <label className="field"><span>Mots-clés</span><input value={draft.tags} onChange={(e) => setDraft({ ...draft, tags: e.target.value })} placeholder="3x3, inclusif, format" /></label>
              <button className="btn" disabled={!draft.title} onClick={add}>Ajouter et noter</button>
            </div>
          </Panel>
          <Panel title="Signaux qualifiés">
            {items.length === 0 && <p className="muted">Aucun signal pour l’instant. Ajoutez ce que vous repérez : la pertinence est calculée automatiquement (transposabilité, adéquation Bask’Est).</p>}
            {items.length > 0 && (
              <>
                <Table
                  head={['Pertinence', 'Signal', 'Secteur', 'Statut']}
                  rows={items.map((i) => [
                    `${Math.round(i.relevance * 100)} %`,
                    i.url ? <a href={i.url} target="_blank" rel="noreferrer">{i.title}</a> : i.title,
                    i.sector,
                    <select aria-label="Statut" value={i.status} onChange={(e) => setItems(items.map((x) => (x.id === i.id ? { ...x, status: e.target.value as WatchItem['status'] } : x)))}>
                      <option value="nouveau">nouveau</option>
                      <option value="qualifie">qualifié</option>
                      <option value="transpose">transposé</option>
                      <option value="ecarte">écarté</option>
                    </select>,
                  ])}
                />
                <div className="row" style={{ marginTop: 10 }}>
                  <button className="btn ghost" onClick={() => download('synthese-veille.md', weeklyDigest(items, `semaine du ${new Date().toLocaleDateString('fr-FR')}`), 'text/markdown')}>Télécharger la synthèse hebdomadaire</button>
                </div>
              </>
            )}
          </Panel>
        </div>
      )}
    </Page>
  );
}
