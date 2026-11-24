import type { RegistryEntry } from '@engine/registry';
import { QUALITY_LABEL, type QualityLevel } from '@engine/quality';
import { fmtTime, useGovernor } from '@sdk';
import { useUi } from './uiStore';

/**
 * The cartouche: like the title block of a technical drawing, it states what
 * this sheet is — experience, time mode and the nature of the data shown.
 */
export function TitleBlock({ entry, quality }: { entry: RegistryEntry; quality: QualityLevel }) {
  const g = useGovernor();
  const device = useUi((s) => s.device);
  const real = g.sources.some((s) => s.nature === 'real');
  // Analytical and list layouts carry this information in their own header.
  if (entry.manifest.layout.kind !== 'scene') return null;
  const data = g.hasDemo && real ? 'Démo + mesurées' : g.hasDemo ? 'Démonstration' : real ? 'Mesurées' : 'Aucune source';
  return (
    <dl className="titleblock" data-compact={device === 'mobile'} aria-label="Cartouche de la vue">
      <div>
        <dt>Vue</dt>
        <dd>
          {entry.manifest.name} <span className="t-muted" style={{ fontWeight: 500 }}>v{entry.manifest.version}</span>
        </dd>
      </div>
      <div className="tb-mode" data-mode={g.mode}>
        <dt>{g.mode === 'live' ? 'Temps' : 'Replay'}</dt>
        <dd>{g.mode === 'live' ? 'En direct' : fmtTime(g.now, true)}</dd>
      </div>
      <div className="tb-data" data-demo={g.hasDemo}>
        <dt>Données · rendu</dt>
        <dd>
          {data} · {QUALITY_LABEL[quality]}
        </dd>
      </div>
    </dl>
  );
}
