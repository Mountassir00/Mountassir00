/**
 * Small flat agent portraits drawn for this view (robots for engines, a
 * silhouette for people). Colour comes from the catalog avatar hue; the ring
 * reflects `state.agents[id].status` only.
 */
import type { AgentDef, AgentStatus } from '@sdk';

const FALLBACK: AgentDef['avatar'] = { hue: 220, accessory: 'none', shape: 'square' };

export function AgentAvatar({ def, kind, status, size = 36, pulse }: { def?: AgentDef; kind: AgentDef['kind']; status: AgentStatus | null; size?: number; pulse?: boolean }) {
  const av = def?.avatar ?? FALLBACK;
  const style = { ['--ab-h' as string]: String(av.hue), ['--sc' as string]: status ? `var(--st-${status})` : 'var(--c-line)', width: size, height: size };
  return (
    <span className="ab-av" style={style} data-pulse={pulse ? 'true' : undefined} aria-hidden>
      <svg viewBox="0 0 40 40" width={size} height={size} focusable="false">
        <circle cx="20" cy="20" r="19" className="ab-av__bg" />
        {kind === 'human' ? <Person /> : <Robot shape={av.shape} accessory={av.accessory} antenna={kind !== 'llm'} />}
      </svg>
    </span>
  );
}

function Person() {
  return (
    <g className="ab-av__fig">
      <circle cx="20" cy="15.5" r="6" />
      <path d="M8.5 33c1.2-6.4 5.6-9.5 11.5-9.5S30.3 26.6 31.5 33" />
    </g>
  );
}

function Robot({ shape, accessory, antenna }: { shape: AgentDef['avatar']['shape']; accessory: AgentDef['avatar']['accessory']; antenna: boolean }) {
  const head =
    shape === 'round' ? <circle cx="20" cy="21" r="10" /> : shape === 'tall' ? <rect x="12" y="9.5" width="16" height="21" rx="7" /> : <rect x="10.5" y="12" width="19" height="17" rx="4.5" />;
  const eyeY = shape === 'tall' ? 18.5 : 20.5;
  return (
    <g className="ab-av__fig">
      {antenna && (
        <>
          <path d="M20 12V7.5" />
          <circle cx="20" cy="6.5" r="1.6" className="ab-av__led" />
        </>
      )}
      {head}
      {accessory === 'visor' ? (
        <rect x="13.5" y={eyeY - 2.2} width="13" height="4.4" rx="2.2" className="ab-av__solid" />
      ) : (
        <>
          <circle cx="16.4" cy={eyeY} r="1.5" className="ab-av__solid" />
          <circle cx="23.6" cy={eyeY} r="1.5" className="ab-av__solid" />
        </>
      )}
      {accessory === 'glasses' && <path d={`M13 ${eyeY}a3.3 3.3 0 1 0 6.6 0a3.3 3.3 0 1 0-6.6 0M20.4 ${eyeY}a3.3 3.3 0 1 0 6.6 0a3.3 3.3 0 1 0-6.6 0M19.6 ${eyeY}h.8`} />}
      {accessory === 'headset' && <path d={`M10 ${eyeY + 1}a10 10 0 0 1 20 0M10 ${eyeY + 1}v3M30 ${eyeY + 1}v3l-5 4.5`} />}
      {accessory === 'cap' && <path d="M11 13.5c2-4.5 16-4.5 18 0M27 13.5h5" />}
      {accessory === 'badge' && <path d="m26.5 25.5.9 1.8 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3Z" className="ab-av__solid" />}
      <path d={`M17 ${eyeY + 5}h6`} />
    </g>
  );
}
