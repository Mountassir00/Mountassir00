import { useState } from 'react';
import { Page, Panel, Table, Tabs, useLocal, SelectField, download } from '../ui';
import { feature } from '../features';
import { WATCH_SOURCES } from '../../data/watch-sources';
import { scoreWatchItem, weeklyDigest } from '../../core/watch/relevance';
import type { Sector, WatchItem } from '../../core/model';

const SECTORS: Sector[] = ['basketball', 'f1', 'football', 'kings_league', 'combat', 'tennis', 'rugby', 'olympisme', 'esport', 'jeu_video', 'festival', 'television', 'concert', 'immersif', 'mode', 'luxe'];

export function Watch() {
  const f = feature('veille');
  const [tab, setTab] = useState<'basket' | 'multisport' | 'signaux'>('basket');
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
  return (
    <Page title="Veille basket et multisport" intro="Sources qualifiées, cadence de consultation et qualification des signaux. La collecte automatique (RSS, API) et la synthèse hebdomadaire planifiée dépendent d’une intégration." status={f.status}>
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'basket', label: `Basketball (${basket.length})` }, { value: 'multisport', label: `Multisport et divertissement (${multi.length})` }, { value: 'signaux', label: `Signaux qualifiés (${items.length})` }]} />
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
