import { useEffect, useId, useRef, type ReactNode } from 'react';
import { NATURE_LABEL, STATUS_LABEL, type AgentStatus, type DataNature } from '@core/events/schema';

/** Where a number comes from — shown next to every metric. Shape-coded, not colour-only. */
export function NatureBadge({ nature, label }: { nature: DataNature; label?: string }) {
  return (
    <span className="nat" data-n={nature} title={NATURE_DESCRIPTION[nature]}>
      <i className="nat__mark" aria-hidden />
      {label ?? NATURE_LABEL[nature]}
    </span>
  );
}

export const NATURE_DESCRIPTION: Record<DataNature, string> = {
  real: 'Mesuré à partir d’une source réelle',
  planned: 'Planifié, pas encore exécuté',
  estimated: 'Estimé (calcul ou prix catalogue), non vérifié',
  historical: 'Donnée historique enregistrée',
  demo: 'Donnée de démonstration générée — aucune opération réelle',
  unavailable: 'Donnée indisponible pour cette source',
};

export function StatusPill({ status, compact }: { status: AgentStatus; compact?: boolean }) {
  return (
    <span className="status" style={{ ['--sc' as string]: `var(--st-${status})` }}>
      <i className="status__dot" aria-hidden />
      {compact ? <span className="sr-only">{STATUS_LABEL[status]}</span> : STATUS_LABEL[status]}
    </span>
  );
}

export function Panel({ title, aside, children, className, id }: { title?: ReactNode; aside?: ReactNode; children: ReactNode; className?: string; id?: string }) {
  const hid = useId();
  return (
    <section className={`panel ${className ?? ''}`} aria-labelledby={title ? hid : undefined} id={id}>
      {(title || aside) && (
        <div className="panel__head">
          {title && (
            <h2 className="t-h3" id={hid}>
              {title}
            </h2>
          )}
          {aside}
        </div>
      )}
      <div className="panel__body">{children}</div>
    </section>
  );
}

export function Segmented<T extends string>({
  value, options, onChange, label, size,
}: { value: T; options: Array<{ value: T; label: ReactNode; title?: string }>; onChange: (v: T) => void; label: string; size?: 'sm' }) {
  return (
    <div className="seg" role="group" aria-label={label} data-size={size}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} title={o.title} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function CostDots({ level }: { level: 'low' | 'medium' | 'high' }) {
  const n = level === 'low' ? 1 : level === 'medium' ? 2 : 3;
  const label = level === 'low' ? 'faible' : level === 'medium' ? 'modérée' : 'élevée';
  return (
    <span className="cost-dots" role="img" aria-label={`Consommation graphique ${label}`} title={`Consommation graphique ${label}`}>
      {[1, 2, 3].map((i) => (
        <i key={i} className={i <= n ? 'on' : ''} />
      ))}
    </span>
  );
}

export function Notice({ children, tone, icon }: { children: ReactNode; tone?: 'warn'; icon?: ReactNode }) {
  return (
    <div className={`notice ${tone === 'warn' ? 'notice--warn' : ''}`} role="note">
      {icon}
      <div>{children}</div>
    </div>
  );
}

/** Accessible modal dialog with focus trap and Escape to close. */
export function Dialog({ title, onClose, children, labelledBy }: { title: string; onClose: () => void; children: ReactNode; labelledBy?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const hid = useId();
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const el = ref.current;
    const focusables = () => [...(el?.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') ?? [])].filter((x) => !x.hasAttribute('disabled'));
    (focusables()[0] ?? el)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
      if (e.key === 'Tab') {
        const f = focusables();
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [onClose]);
  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby={labelledBy ?? hid} ref={ref} tabIndex={-1}>
        <h2 className="t-h2" id={labelledBy ?? hid}>
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}

/** Horizontal meter for ratios (quota, cache hit, quality). */
export function Meter({ value, max = 1, label, tone }: { value: number; max?: number; label: string; tone?: string }) {
  const pct = Math.max(0, Math.min(1, value / max));
  return (
    <div role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} style={{ height: 8, borderRadius: 4, background: 'var(--c-sunken)', overflow: 'hidden' }}>
      <div style={{ width: `${pct * 100}%`, height: '100%', background: tone ?? 'var(--c-ink-soft)', borderRadius: 4 }} />
    </div>
  );
}

export function Sparkline({ values, width = 96, height = 24, color = 'var(--series-1)', label }: { values: number[]; width?: number; height?: number; color?: string; label: string }) {
  if (!values.length) return null;
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? width / (values.length - 1) : width;
  const pts = values.map((v, i) => `${(i * step).toFixed(1)},${(height - 2 - (v / max) * (height - 4)).toFixed(1)}`).join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} className="chart">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
