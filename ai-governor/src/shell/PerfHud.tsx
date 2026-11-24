import { useEffect, useState } from 'react';
import type { QualitySettings } from '@engine/quality';
import { clock, perf, runtime } from './App';

/** Live resource meter. Sampling runs only while this HUD is visible. */
export function PerfHud({ quality }: { quality: QualitySettings }) {
  const [snap, setSnap] = useState(() => perf.snapshot(clock.running));
  useEffect(() => {
    perf.startSampling();
    const id = setInterval(() => setSnap(perf.snapshot(clock.running)), 1000);
    return () => {
      clearInterval(id);
      perf.stopSampling();
    };
  }, []);
  return (
    <div className="perf-hud" aria-label="Mesures de performance">
      <span>Rendu</span><span>{quality.level} · {quality.fpsCap || '—'} i/s max</span>
      <span>Images/s</span><span>{snap.fps ?? '…'}</span>
      <span>Horloge anim.</span><span>{snap.clockRunning ? 'active' : 'arrêtée'}{quality.suspended ? ' (veille)' : ''}</span>
      <span>Tâches longues</span><span>{snap.longTasks}</span>
      <span>Mémoire JS</span><span>{snap.heapMb != null ? `${snap.heapMb} Mo` : 'non exposée'}</span>
      <span>Nœuds DOM</span><span>{snap.domNodes}</span>
      <span>Bascule de vue</span><span>{snap.lastSwitchMs != null ? `${snap.lastSwitchMs} ms` : '—'}</span>
      <span>Événements</span><span>{runtime.store.getEvents().length}</span>
      <span>Appels LLM par l’UI</span><span>{runtime.uiInitiatedModelCalls}</span>
      <span>GPU</span><span>non mesurable</span>
    </div>
  );
}
