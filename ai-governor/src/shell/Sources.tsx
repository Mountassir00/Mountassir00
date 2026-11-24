/**
 * Data sources: what is connected, what each source can and cannot observe,
 * and the first real connection — Claude Code transcripts parsed locally.
 */
import { useRef, useState } from 'react';
import { parseClaudeCodeTranscripts, ClaudeCodeImportSource, type ParseStats } from '@core/sources/claudeCode';
import { DemoSource } from '@core/sources/demo';
import { PLANNED_SOURCES } from '@core/sources/types';
import { IconInfo, IconUpload, NatureBadge, Notice } from '@ds';
import { useGovernor } from '@sdk';
import { useRuntime } from './context';
import { setPrefs, toast, useUi } from './uiStore';

export function Sources() {
  const g = useGovernor();
  const rt = useRuntime();
  const prefs = useUi((s) => s.prefs);
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [stats, setStats] = useState<ParseStats | null>(null);
  const [busy, setBusy] = useState(false);

  const importFiles = async (list: FileList | File[]) => {
    const files = [...list].filter((f) => f.name.endsWith('.jsonl'));
    if (!files.length) return toast('Sélectionnez des fichiers .jsonl de Claude Code.', 'denied');
    setBusy(true);
    try {
      const texts = await Promise.all(files.map(async (f) => ({ name: f.name, text: await f.text() })));
      const parsed = parseClaudeCodeTranscripts(texts);
      const rep = await rt.addSource(new ClaudeCodeImportSource(parsed), { live: false });
      setStats(parsed.stats);
      toast(`${rep.accepted} événements réels importés (${parsed.stats.responses} réponses modèle, ${parsed.stats.sessions} session(s)).`);
    } catch (e) {
      toast(`Import impossible : ${(e as Error).message}`, 'denied');
    } finally {
      setBusy(false);
    }
  };

  const demo = g.sources.find((s) => s.id === 'demo');
  return (
    <div className="page">
      <div className="page__head">
        <div>
          <p className="t-muted" style={{ margin: '4px 0 0', maxWidth: '72ch' }}>
            Toutes les expériences lisent le même journal d’événements. Chaque source déclare ce qu’elle voit et ce qu’elle ne voit pas : l’interface n’invente rien pour combler un manque.
          </p>
        </div>
      </div>
      <div className="page__body" style={{ display: 'grid', gap: 14 }}>
        <section className="panel" style={{ padding: 14 }}>
          <h2 className="t-h2" style={{ marginBottom: 6 }}>
            Sources actives
          </h2>
          {g.sources.length === 0 && <p className="t-muted">Aucune source active : les vues sont vides.</p>}
          <div className="grid-cards">
            {g.sources.map((s) => (
              <article key={s.id} className="panel" style={{ padding: 12, display: 'grid', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                  <b>{s.label}</b>
                  <NatureBadge nature={s.nature} />
                </div>
                <div className="t-small t-muted">
                  {s.live ? 'Mises à jour en direct (poussées, sans interrogation périodique)' : 'Historique importé, pas de direct'} · {s.acceptsCommands ? 'accepte les commandes' : 'lecture seule'}
                </div>
                <div>
                  <div className="section-title" style={{ marginTop: 0 }}>Observable</div>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.84rem' }}>
                    {s.observable.map((o) => (
                      <li key={o}>{o}</li>
                    ))}
                  </ul>
                  <div className="section-title">Non observable</div>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.84rem' }}>
                    {s.notObservable.map((o) => (
                      <li key={o}>{o}</li>
                    ))}
                  </ul>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {s.id === 'demo' && (
                    <button
                      type="button"
                      className="btn btn--sm"
                      onClick={() => {
                        rt.setLive('demo', !s.live);
                        setPrefs((p) => ({ ...p, liveDemo: !s.live }));
                      }}
                    >
                      {s.live ? 'Arrêter la simulation en direct' : 'Reprendre la simulation en direct'}
                    </button>
                  )}
                  <button type="button" className="btn btn--sm btn--danger" onClick={() => rt.removeSource(s.id)}>
                    Retirer la source
                  </button>
                </div>
              </article>
            ))}
          </div>
          {!demo && (
            <button type="button" className="btn" style={{ marginTop: 10 }} onClick={() => void rt.addSource(new DemoSource(), { live: prefs.liveDemo })}>
              Recharger les données de démonstration
            </button>
          )}
        </section>

        <section className="panel" style={{ padding: 14 }}>
          <h2 className="t-h2" style={{ marginBottom: 6 }}>
            Connecter Claude Code (données réelles)
          </h2>
          <p className="t-small" style={{ maxWidth: '75ch' }}>
            Claude Code enregistre chaque session dans <span className="mono">~/.claude/projects/&lt;projet&gt;/&lt;session&gt;.jsonl</span>. Déposez ces fichiers :
            ils sont lus <b>dans ce navigateur uniquement</b>. Seules les métadonnées sont conservées (horodatage, modèle, tokens, nom des outils) ; les messages,
            les commandes et les résultats d’outils sont ignorés.
          </p>
          <div
            className="dropzone"
            data-over={over}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setOver(false);
              void importFiles(e.dataTransfer.files);
            }}
          >
            <IconUpload size={22} />
            <p style={{ margin: '6px auto' }}>Fichiers .jsonl de sessions Claude Code</p>
            <button type="button" className="btn btn--sm" disabled={busy} onClick={() => input.current?.click()}>
              {busy ? 'Lecture…' : 'Choisir des fichiers'}
            </button>
            <input ref={input} type="file" accept=".jsonl" multiple hidden onChange={(e) => e.target.files && void importFiles(e.target.files)} />
          </div>
          {stats && (
            <dl className="kv" style={{ marginTop: 10 }}>
              <dt>Fichiers</dt>
              <dd>{stats.files}</dd>
              <dt>Sessions</dt>
              <dd>{stats.sessions}</dd>
              <dt>Réponses modèle</dt>
              <dd>
                {stats.responses} (doublons ignorés : {stats.duplicatesSkipped})
              </dd>
              <dt>Lignes illisibles</dt>
              <dd>{stats.badLines}</dd>
              <dt>Période</dt>
              <dd>{stats.from ? `${new Date(stats.from).toLocaleString('fr-FR')} → ${new Date(stats.to!).toLocaleString('fr-FR')}` : '—'}</dd>
            </dl>
          )}
          {g.hasDemo && g.sources.some((s) => s.nature === 'real') && (
            <Notice icon={<IconInfo size={16} />}>
              Données réelles et de démonstration sont mélangées. Pour ne voir que le réel, retirez la source « Données de démonstration ».
            </Notice>
          )}
        </section>

        <section className="panel" style={{ padding: 14 }}>
          <h2 className="t-h2" style={{ marginBottom: 6 }}>
            Sources prévues et limites de visibilité
          </h2>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Source</th>
                  <th>État</th>
                  <th>Pourquoi</th>
                  <th>Visible</th>
                  <th>Invisible</th>
                </tr>
              </thead>
              <tbody>
                {PLANNED_SOURCES.map((p) => (
                  <tr key={p.id}>
                    <td>{p.label}</td>
                    <td>{p.status === 'requires-backend' ? 'Nécessite le moteur opérationnel' : 'À concevoir'}</td>
                    <td style={{ minWidth: 220 }}>{p.why}</td>
                    <td>{p.observable.join(', ') || '—'}</td>
                    <td>{p.notObservable.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
