/**
 * <ThreeStage> — React wrapper around Stage3D.
 *
 * Creates the renderer on mount, follows quality and theme changes, shows a
 * readable fallback when WebGL is unavailable or the context is lost, and
 * disposes everything on unmount. The view receives the Stage3D through
 * `onStage` (to build its scene in an effect) and can render overlays as
 * children (labels, hover cards).
 */
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import type { QualitySettings } from '@sdk';
import type { PickHit } from './picking';
import { Stage3D, webglAvailable, type StageOptions } from './stage';
import { observeTheme, readScenePalette, type ScenePalette } from './theme';
import './three.css';

export interface ThreeStageProps {
  quality: QualitySettings;
  /** Accessible name of the scene. */
  label: string;
  /** Keyboard help, read by screen readers (aria-describedby). */
  help?: string;
  camera?: StageOptions['camera'];
  environment?: boolean;
  onStage?: (stage: Stage3D | null) => void;
  onHover?: (hit: PickHit | null) => void;
  onClick?: (hit: PickHit | null, e: PointerEvent) => void;
  /** Called after the theme changed (the stage is already re-tinted): redraw canvases here. */
  onPalette?: (p: ScenePalette, stage: Stage3D) => void;
  fallback?: ReactNode;
  children?: ReactNode | ((stage: Stage3D) => ReactNode);
  className?: string;
}

export const DEFAULT_3D_HELP =
  'Glisser pour tourner, clic droit ou Maj + glisser pour déplacer, molette ou pincement pour zoomer. Au clavier : flèches pour déplacer, Maj + flèches pour tourner, + et − pour zoomer, 0 pour recadrer.';

export function ThreeStage({ quality, label, help = DEFAULT_3D_HELP, camera, environment, onStage, onHover, onClick, onPalette, fallback, children, className }: ThreeStageProps) {
  const host = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState<Stage3D | null>(null);
  const [failure, setFailure] = useState<null | 'unavailable' | 'lost' | 'error'>(null);
  const [slow, setSlow] = useState<null | { reason: 'software' | 'slow'; shown: boolean }>(null);
  const helpId = useId();
  const cb = useRef({ onStage, onHover, onClick, onPalette });
  cb.current = { onStage, onHover, onClick, onPalette };
  const initial = useRef({ quality, camera, label, environment });

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    if (!webglAvailable()) {
      setFailure('unavailable');
      return;
    }
    let s: Stage3D;
    try {
      s = new Stage3D(el, { ...initial.current, describedBy: helpId });
    } catch {
      setFailure('error');
      return;
    }
    s.onHover = (h) => cb.current.onHover?.(h);
    s.onClick = (h, e) => cb.current.onClick?.(h, e);
    s.onContextLost = () => setFailure('lost');
    s.onSlow = (reason) => setSlow({ reason, shown: true });
    if (s.slow) setSlow({ reason: s.slow, shown: true });
    const offTheme = observeTheme(() => {
      const p = readScenePalette();
      s.setPalette(p);
      cb.current.onPalette?.(p, s);
    });
    setStage(s);
    cb.current.onStage?.(s);
    return () => {
      offTheme();
      cb.current.onStage?.(null);
      setStage(null);
      s.dispose();
    };
  }, [helpId]);

  useEffect(() => {
    stage?.setQuality(quality);
  }, [stage, quality]);

  useEffect(() => {
    stage?.canvas.setAttribute('aria-label', label);
  }, [stage, label]);

  // The notice stays readable a few seconds, then remains for screen readers only.
  useEffect(() => {
    if (!slow?.shown) return;
    const t = setTimeout(() => setSlow((v) => (v ? { ...v, shown: false } : v)), 8000);
    return () => clearTimeout(t);
  }, [slow?.shown]);

  return (
    <div ref={host} className={`t3-stage ${className ?? ''}`}>
      <p id={helpId} className="sr-only">
        {help}
      </p>
      {failure && (
        <div className="t3-fallback" role="status">
          {fallback ?? (
            <div>
              <strong>{failure === 'lost' ? 'Le rendu 3D a été interrompu' : 'La 3D n’est pas disponible sur cet appareil'}</strong>
              <span className="t-small">
                {failure === 'lost'
                  ? 'Le navigateur a libéré le contexte graphique (mémoire ou onglet en arrière-plan). Rechargez la vue pour relancer la scène ; les panneaux restent utilisables.'
                  : 'WebGL est désactivé ou non pris en charge. Les panneaux, le journal et la revue restent utilisables ; choisissez une vue 2D pour une représentation spatiale.'}
              </span>
            </div>
          )}
        </div>
      )}
      {stage && !failure && (typeof children === 'function' ? children(stage) : children)}
      {slow && !failure && (
        <p className={slow.shown ? 't3-note' : 'sr-only'} role="status">
          {slow.reason === 'software'
            ? 'Rendu 3D sans accélération graphique : la scène ne s’anime qu’aux changements d’état, pour ménager le processeur.'
            : 'Rendu 3D trop lent sur cet appareil : animations limitées aux changements d’état.'}
        </p>
      )}
    </div>
  );
}
