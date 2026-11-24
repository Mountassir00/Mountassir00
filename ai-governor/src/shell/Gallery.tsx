/**
 * Experience Gallery: every installed experience and variant, with lifecycle
 * actions. Import/export moves data only (validated variants and themes):
 * no file can bring executable code into the app.
 */
import { useRef, useState } from 'react';
import { ops, exportBundle, importBundle, type RegistryEntry } from '@engine/registry';
import { CostDots, IconCopy, IconDownload, IconEye, IconEyeOff, IconStar, IconStudio, IconTrash, IconUpload, Notice, IconInfo } from '@ds';
import { registry } from './registryInstance';
import { switchTo } from './App';
import { setPrefs, toast, ui, useUi } from './uiStore';

const DEVICE = { full: 'Complet', adapted: 'Adapté', fallback: 'Repli', unsupported: 'Non pris en charge' } as const;
const STATUS = { stable: 'Stable', prototype: 'Prototype', 'pending-validation': 'À valider' } as const;
const thumb = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

function guard(fn: () => void) {
  try {
    fn();
  } catch (e) {
    toast((e as Error).message, 'denied');
  }
}

export function Gallery({ entries, activeId }: { entries: RegistryEntry[]; activeId?: string }) {
  const [showHidden, setShowHidden] = useState(false);
  const device = useUi((s) => s.device);
  const project = useUi((s) => (s.filters.projects.length === 1 ? s.filters.projects[0] : ''));
  const file = useRef<HTMLInputElement>(null);
  const list = entries.filter((e) => showHidden || !e.hidden);
  const hiddenCount = entries.filter((e) => e.hidden).length;

  const doExport = () => {
    const bundle = exportBundle(ui.get().prefs);
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `governor-experiences-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast(`${bundle.variants.length} variante(s) et ${bundle.themes.length} thème(s) exportés.`);
  };

  const doImport = async (f: File) => {
    if (f.size > 512_000) return toast('Fichier refusé : 500 Ko maximum.', 'denied');
    try {
      const raw = JSON.parse(await f.text());
      const r = importBundle(ui.get().prefs, registry, raw);
      setPrefs(() => r.prefs);
      toast(`Importé : ${r.added.length} variante(s), ${r.themes.length} thème(s). Les variantes arrivent en brouillon, à valider.${r.rejected.length ? ` Refusé : ${r.rejected.join(' ; ')}` : ''}`, r.rejected.length ? 'denied' : 'ok');
    } catch (e) {
      toast((e as Error).message || 'Fichier illisible.', 'denied');
    }
  };

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1 className="t-h1">Galerie des expériences</h1>
          <p className="t-muted" style={{ margin: '4px 0 0' }}>
            {entries.length} expérience(s) installée(s). Toutes lisent les mêmes données et respectent les mêmes permissions.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {hiddenCount > 0 && (
            <button type="button" className="btn" aria-pressed={showHidden} onClick={() => setShowHidden((v) => !v)}>
              {showHidden ? <IconEyeOff size={16} /> : <IconEye size={16} />} {showHidden ? 'Masquer les vues cachées' : `Afficher les vues cachées (${hiddenCount})`}
            </button>
          )}
          <button type="button" className="btn" onClick={() => file.current?.click()}>
            <IconUpload size={16} /> Importer
          </button>
          <button type="button" className="btn" onClick={doExport}>
            <IconDownload size={16} /> Exporter
          </button>
          <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void doImport(f); e.target.value = ''; }} />
        </div>
      </div>
      <div className="page__body">
        <Notice icon={<IconInfo size={16} />}>
          L’import accepte uniquement des configurations déclaratives (variantes, thèmes) validées par schéma. Une expérience qui nécessite du code s’installe par revue de code
          dans le dépôt (voir docs/CREATING_AN_EXPERIENCE.md), jamais depuis un fichier.
        </Notice>
        <div className="grid-cards" style={{ marginTop: 14 }}>
          {list.map((e) => (
            <article key={e.id} className="xp-card" data-active={e.id === activeId} aria-label={e.manifest.name}>
              <div className="xp-card__thumb">
                <img src={thumb(e.manifest.thumbnail)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div className="xp-card__body">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                  <h2 className="t-h3">{e.manifest.name}</h2>
                  <span className="t-micro t-muted num">v{e.manifest.version}</span>
                </div>
                <p className="t-small t-soft" style={{ margin: 0 }}>
                  {e.manifest.description}
                </p>
                <div className="xp-card__meta">
                  <span className="pill">{e.origin === 'variant' ? (e.variant?.status === 'published' ? 'Variante publiée' : 'Variante en brouillon') : STATUS[e.manifest.status]}</span>
                  {e.isDefault && <span className="pill pill--risk-low">Par défaut</span>}
                  {!e.enabled && <span className="pill pill--risk-high">Désactivée</span>}
                  {e.hidden && <span className="pill">Masquée</span>}
                </div>
                <dl className="kv" style={{ fontSize: '0.8rem', gridTemplateColumns: 'auto 1fr' }}>
                  <dt>Rendu</dt>
                  <dd>
                    {e.manifest.renderer.toUpperCase()} · consommation <CostDots level={e.manifest.performance.cost} />
                  </dd>
                  <dt>Appareils</dt>
                  <dd>
                    Bureau {DEVICE[e.manifest.devices.desktop].toLowerCase()}, tablette {DEVICE[e.manifest.devices.tablet].toLowerCase()}, mobile {DEVICE[e.manifest.devices.mobile].toLowerCase()}
                  </dd>
                  <dt>Paramètres</dt>
                  <dd>
                    {e.manifest.graphics.length} réglables{Object.keys(e.overrides).length ? `, ${Object.keys(e.overrides).length} personnalisé(s)` : ''}
                  </dd>
                  <dt>Créée le</dt>
                  <dd>{new Date(e.manifest.createdAt).toLocaleDateString('fr-FR')}</dd>
                </dl>
              </div>
              <div className="xp-card__actions">
                <button type="button" className="btn btn--primary btn--sm" disabled={!e.enabled} onClick={() => switchTo(e.id)} onMouseEnter={() => registry.prefetch(e.baseId)}>
                  Ouvrir
                </button>
                <button type="button" className="btn btn--sm btn--icon" aria-pressed={e.favorite} aria-label={e.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'} title="Favori" onClick={() => setPrefs((p) => ops.setFavorite(p, e.id, !e.favorite))}>
                  <IconStar size={15} fill={e.favorite ? 'currentColor' : 'none'} />
                </button>
                <button type="button" className="btn btn--sm btn--icon" aria-label={e.hidden ? 'Afficher dans le sélecteur' : 'Masquer du sélecteur'} title={e.hidden ? 'Afficher' : 'Masquer'} onClick={() => setPrefs((p) => ops.setHidden(p, e.id, !e.hidden))}>
                  {e.hidden ? <IconEye size={15} /> : <IconEyeOff size={15} />}
                </button>
                <button type="button" className="btn btn--sm btn--icon" aria-label="Personnaliser dans le Studio" title="Personnaliser" onClick={() => ui.set({ route: 'studio', studioTarget: e.id })}>
                  <IconStudio size={15} />
                </button>
                <button
                  type="button"
                  className="btn btn--sm btn--icon"
                  aria-label="Dupliquer"
                  title="Dupliquer"
                  onClick={() =>
                    setPrefs((p) => {
                      const r = ops.duplicate(p, e, `${e.manifest.name} (copie)`);
                      toast('Variante créée en brouillon.');
                      return r.prefs;
                    })
                  }
                >
                  <IconCopy size={15} />
                </button>
                <select
                  className="select"
                  style={{ height: 26, fontSize: '0.8rem' }}
                  aria-label="Définir comme vue par défaut"
                  value=""
                  onChange={(ev) => {
                    const v = ev.target.value;
                    guard(() =>
                      setPrefs((p) =>
                        v === 'global' ? ops.setDefault(p, e.id) : v.startsWith('project:') ? ops.setDefault(p, e.id, { project: v.slice(8) }) : ops.setDefault(p, e.id, { device: v as 'desktop' | 'tablet' | 'mobile' }),
                      ),
                    );
                    toast('Préférence enregistrée.');
                  }}
                >
                  <option value="" disabled>
                    Par défaut…
                  </option>
                  <option value="global">Partout</option>
                  <option value={device}>Sur cet appareil ({device === 'mobile' ? 'mobile' : device === 'tablet' ? 'tablette' : 'ordinateur'})</option>
                  {project && <option value={`project:${project}`}>Pour le projet « {project} »</option>}
                </select>
                {e.origin === 'variant' && e.variant?.status === 'draft' && (
                  <button type="button" className="btn btn--sm" onClick={() => { setPrefs((p) => ops.publish(p, e.id)); toast('Variante validée et publiée.'); }}>
                    Valider
                  </button>
                )}
                <button type="button" className="btn btn--sm" onClick={() => guard(() => setPrefs((p) => ops.setEnabled(p, e.id, !e.enabled)))}>
                  {e.enabled ? 'Désactiver' : 'Activer'}
                </button>
                {e.origin !== 'builtin' && <DeleteButton name={e.manifest.name} onConfirm={() => guard(() => setPrefs((p) => ops.remove(p, e)))} />}
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Two-step delete inside the page (native confirm dialogs are not reliable in every host). */
function DeleteButton({ name, onConfirm }: { name: string; onConfirm: () => void }) {
  const [armed, setArmed] = useState(false);
  if (!armed)
    return (
      <button type="button" className="btn btn--sm btn--icon btn--danger" aria-label={`Supprimer la variante ${name}`} title="Supprimer" onClick={() => setArmed(true)}>
        <IconTrash size={15} />
      </button>
    );
  return (
    <span style={{ display: 'inline-flex', gap: 4 }} role="group" aria-label="Confirmer la suppression">
      <button type="button" className="btn btn--sm btn--danger" onClick={onConfirm} autoFocus>
        Supprimer « {name} »
      </button>
      <button type="button" className="btn btn--sm" onClick={() => setArmed(false)}>
        Annuler
      </button>
    </span>
  );
}
