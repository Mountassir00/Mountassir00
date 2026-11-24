import { ROLE_LABEL, ROLE_PERMISSIONS, type Role } from '@core/commands';
import { QUALITY_HINT, QUALITY_LABEL, type QualityPreference } from '@engine/quality';
import type { RegistryEntry } from '@engine/registry';
import { ops } from '@engine/registry';
import { BUILTIN_THEMES } from '@engine/themes';
import { Segmented } from '@ds';
import { setPrefs, useUi } from './uiStore';

const PERM_LABEL: Record<string, string> = {
  view: 'Consulter',
  'view.confidential': 'Voir les détails confidentiels',
  'task.control': 'Suspendre, reprendre, prioriser',
  'task.rerun': 'Relancer (dépense)',
  'decision.resolve': 'Arbitrer GO / NO GO / TEST',
  'instructions.modify': 'Modifier les instructions',
  'experience.manage': 'Gérer les expériences',
  'experience.install-code': 'Installer du code d’expérience',
};

const SHORTCUTS: Array<[string, string]> = [
  ['1 à 9', 'Changer d’expérience'],
  ['Ctrl+K ou /', 'Rechercher un agent, un département, une vue'],
  ['D', 'Centre de décision'],
  ['I', 'Inspecteur'],
  ['L', 'Revenir au direct'],
  ['P', 'Mode présentation'],
  ['Échap', 'Fermer le panneau / quitter la présentation'],
  ['Flèches, + / −, 0', 'Se déplacer, zoomer, recadrer (scène active)'],
  ['Espace (chronologie)', 'Lecture / pause du replay'],
];

export function Settings({ entries }: { entries: RegistryEntry[] }) {
  const prefs = useUi((s) => s.prefs);
  const device = useUi((s) => s.device);
  const themes = [...BUILTIN_THEMES, ...prefs.customThemes];
  const usable = entries.filter((e) => e.enabled);
  return (
    <div className="page">
      <div className="page__head">
        <h1 className="t-h1">Réglages</h1>
      </div>
      <div className="page__body" style={{ display: 'grid', gap: 14, maxWidth: 900 }}>
        <section className="panel" style={{ padding: 14, display: 'grid', gap: 12 }}>
          <h2 className="t-h2">Apparence et sobriété</h2>
          <label className="field">
            <span>Thème</span>
            <select className="select" value={prefs.themeId} onChange={(e) => setPrefs((p) => ({ ...p, themeId: e.target.value }))}>
              <option value="auto">Automatique (suit le système)</option>
              {themes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <div className="field">
            <span>Niveau de rendu</span>
            <Segmented<QualityPreference>
              label="Niveau de rendu"
              value={prefs.quality}
              onChange={(v) => setPrefs((p) => ({ ...p, quality: v }))}
              options={[{ value: 'auto', label: 'Auto' }, ...(['minimal', 'eco', 'standard', 'high'] as const).map((q) => ({ value: q, label: QUALITY_LABEL[q], title: QUALITY_HINT[q] }))]}
            />
            <span className="t-small t-muted">{prefs.quality === 'auto' ? 'Choisi selon l’appareil (mémoire, économie de données).' : QUALITY_HINT[prefs.quality]}</span>
          </div>
          <div className="field">
            <span>Réduction des mouvements</span>
            <Segmented
              label="Réduction des mouvements"
              value={prefs.reducedMotion}
              onChange={(v) => setPrefs((p) => ({ ...p, reducedMotion: v }))}
              options={[
                { value: 'system', label: 'Selon le système' },
                { value: 'on', label: 'Toujours' },
                { value: 'off', label: 'Jamais' },
              ]}
            />
          </div>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" checked={prefs.perfHud} onChange={(e) => setPrefs((p) => ({ ...p, perfHud: e.target.checked }))} />
            Afficher les mesures de performance (images/s, mémoire, nœuds, bascule de vue)
          </label>
        </section>

        <section className="panel" style={{ padding: 14, display: 'grid', gap: 12 }}>
          <h2 className="t-h2">Expérience par défaut</h2>
          <label className="field">
            <span>Partout</span>
            <select className="select" value={prefs.defaultExperience} onChange={(e) => setPrefs((p) => ops.setDefault(p, e.target.value))}>
              {usable.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.manifest.name}
                </option>
              ))}
            </select>
          </label>
          {(['desktop', 'tablet', 'mobile'] as const).map((d) => (
            <label key={d} className="field">
              <span>
                Sur {d === 'desktop' ? 'ordinateur' : d === 'tablet' ? 'tablette' : 'smartphone'}
                {d === device ? ' (cet appareil)' : ''}
              </span>
              <select
                className="select"
                value={prefs.perDevice[d] ?? ''}
                onChange={(e) => setPrefs((p) => ({ ...p, perDevice: { ...p.perDevice, [d]: e.target.value || undefined } }))}
              >
                <option value="">Comme partout</option>
                {usable.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.manifest.name}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </section>

        <section className="panel" style={{ padding: 14, display: 'grid', gap: 10 }}>
          <h2 className="t-h2">Rôle et permissions</h2>
          <p className="t-small t-muted">
            Toutes les expériences appliquent les mêmes permissions : aucune vue ne peut contourner la passerelle de commandes. Changez de rôle pour vérifier ce comportement.
          </p>
          <Segmented<Role>
            label="Rôle"
            value={prefs.role}
            onChange={(v) => setPrefs((p) => ({ ...p, role: v }))}
            options={(['owner', 'operator', 'observer'] as const).map((r) => ({ value: r, label: ROLE_LABEL[r] }))}
          />
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.88rem' }}>
            {Object.entries(PERM_LABEL).map(([k, l]) => (
              <li key={k} style={{ color: ROLE_PERMISSIONS[prefs.role].includes(k as never) ? undefined : 'var(--c-ink-muted)', textDecoration: ROLE_PERMISSIONS[prefs.role].includes(k as never) ? undefined : 'line-through' }}>
                {l}
              </li>
            ))}
          </ul>
        </section>

        <section className="panel" style={{ padding: 14 }}>
          <h2 className="t-h2" style={{ marginBottom: 8 }}>
            Raccourcis clavier
          </h2>
          <table className="table">
            <tbody>
              {SHORTCUTS.map(([k, v]) => (
                <tr key={k}>
                  <td style={{ width: 200 }}>
                    <span className="kbd">{k}</span>
                  </td>
                  <td>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
