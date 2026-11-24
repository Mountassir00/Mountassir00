/**
 * Mounts the active experience. The renderer module is lazy-loaded and cached;
 * the previous experience stays on screen until the next one is ready, so a
 * switch never shows a blank stage. Errors are contained to the stage.
 */
import { Component, useEffect, useLayoutEffect, useState, type ComponentType, type ReactNode } from 'react';
import type { ExperienceProps } from '@engine/contract';
import type { RegistryEntry } from '@engine/registry';
import type { QualitySettings } from '@engine/quality';
import type { AnimationClock, PerfMonitor } from '@engine/runtime';
import { useHost } from '@sdk';
import { ExperienceProviders } from './context';
import { useUi } from './uiStore';
import { registry } from './registryInstance';

class Boundary extends Component<{ children: ReactNode; name: string; onReset: () => void }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidUpdate(prev: { name: string }) {
    if (prev.name !== this.props.name && this.state.error) this.setState({ error: null });
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="stage__loading" role="alert">
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <h2 className="t-h2">« {this.props.name} » s’est arrêtée</h2>
          <p className="t-muted">L’erreur est restée confinée à cette vue : les tâches, les données et les autres expériences ne sont pas affectées.</p>
          <p className="mono t-muted">{this.state.error.message}</p>
          <button type="button" className="btn" onClick={() => { this.setState({ error: null }); this.props.onReset(); }}>
            Recharger la vue
          </button>
        </div>
      </div>
    );
  }
}

function Mount({ C, ...props }: Omit<ExperienceProps, 'host'> & { C: ComponentType<ExperienceProps> }) {
  const host = useHost();
  return <C host={host} {...props} />;
}

export function ExperienceHost({ entry, quality, clock, perf, configOverride, previewKey }: {
  entry: RegistryEntry;
  quality: QualitySettings;
  clock: AnimationClock;
  perf?: PerfMonitor;
  /** Studio preview: draft config instead of the saved one. */
  configOverride?: Record<string, unknown>;
  previewKey?: string;
}) {
  const device = useUi((s) => s.device);
  const [mod, setMod] = useState<{ id: string; C: ComponentType<ExperienceProps> } | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    setFailed(null);
    perf?.markSwitchStart(entry.id);
    const t0 = performance.now();
    registry
      .load(entry.baseId)
      .then((m) => {
        if (!alive) return;
        if (perf) perf.lastLoadMs = Math.round(performance.now() - t0);
        setMod({ id: entry.baseId, C: m.default });
      })
      .catch((e: Error) => alive && setFailed(e.message));
    return () => {
      alive = false;
    };
  }, [entry.baseId, entry.id, perf, nonce]);

  useLayoutEffect(() => {
    if (mod?.id === entry.baseId) perf?.markSwitchEnd(entry.id);
  }, [mod, entry.baseId, entry.id, perf]);

  if (failed) {
    return (
      <div className="stage__loading" role="alert">
        <div>
          <p>Impossible de charger « {entry.manifest.name} » : {failed}</p>
          <button className="btn" type="button" onClick={() => setNonce((n) => n + 1)}>
            Réessayer
          </button>
        </div>
      </div>
    );
  }
  if (!mod || mod.id !== entry.baseId) return <div className="stage__loading">Chargement de « {entry.manifest.name} »…</div>;
  const C = mod.C;
  return (
    <Boundary name={entry.manifest.name} onReset={() => setNonce((n) => n + 1)}>
      <ExperienceProviders experienceId={entry.id} quality={quality} clock={clock}>
        <Mount key={previewKey ?? entry.baseId} C={C} config={configOverride ?? entry.config} quality={quality} device={device} manifest={entry.manifest} />
      </ExperienceProviders>
    </Boundary>
  );
}
