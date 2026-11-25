/** Kanban card and small shared bits (avatar, priority mark, progress). */
import { memo, type DragEvent, type KeyboardEvent } from 'react';
import { NatureBadge } from '@ds';
import type { AgentDef, DepartmentDef, TaskRuntime } from '@sdk';
import { avatarBg, initialOf, PRIORITY_LABEL, shortId, STATUS_LABEL, type Col, type StepInfo } from './data';

export function Avatar({ agent, id, size = 22 }: { agent?: AgentDef; id?: string; size?: number }) {
  const name = agent?.name ?? id ?? '?';
  return (
    <span className="kb-avatar" style={{ width: size, height: size, background: avatarBg(agent?.avatar.hue), fontSize: size * 0.48 }} aria-hidden>
      {initialOf(name)}
    </span>
  );
}

export function PriorityMark({ p, withLabel }: { p: TaskRuntime['priority']; withLabel?: boolean }) {
  return (
    <span className="kb-prio" data-p={p} title={`Priorité ${PRIORITY_LABEL[p].toLowerCase()}`}>
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden focusable="false">
        {p === 'critical' && <path d="M6 1.5v9M2.5 5 6 1.5 9.5 5M2.5 9 6 5.5 9.5 9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />}
        {p === 'high' && <path d="M6 10.5v-9M2.5 5 6 1.5 9.5 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />}
        {p === 'normal' && <path d="M2.5 4.5h7M2.5 7.5h7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />}
        {p === 'low' && <path d="M6 1.5v9M2.5 7 6 10.5 9.5 7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />}
      </svg>
      {withLabel ? PRIORITY_LABEL[p] : <span className="sr-only">Priorité {PRIORITY_LABEL[p].toLowerCase()}</span>}
    </span>
  );
}

export function Progress({ steps, status, compact }: { steps: StepInfo; status: TaskRuntime['status']; compact?: boolean }) {
  if (steps.total == null || steps.done == null) {
    return <div className="kb-progress kb-progress--unknown t-micro">Progression indéterminée</div>;
  }
  const pct = steps.total ? steps.done / steps.total : 0;
  const tone = status === 'failed' || status === 'cancelled' ? 'var(--st-error)' : status === 'succeeded' ? 'var(--st-validating)' : status === 'paused' ? 'var(--st-paused)' : 'var(--st-working)';
  return (
    <div className="kb-progress" data-compact={compact || undefined}>
      <div className="kb-progress__bar" role="meter" aria-label="Étapes réalisées" aria-valuemin={0} aria-valuemax={steps.total} aria-valuenow={steps.done}>
        <i style={{ width: `${Math.round(pct * 100)}%`, background: tone }} />
      </div>
      <span className="kb-progress__txt num">
        {steps.done}/{steps.total}
      </span>
    </div>
  );
}

const ToolGlyph = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden focusable="false">
    <path d="M7.6 1.6a2.6 2.6 0 0 0-2.9 3.5L1.6 8.2a1.1 1.1 0 0 0 1.6 1.6l3.1-3.1a2.6 2.6 0 0 0 3.5-2.9L8.3 5.3 6.9 5 6.6 3.6Z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
  </svg>
);
const ModelGlyph = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden focusable="false">
    <path d="M6 1.2 7.2 4.8 10.8 6 7.2 7.2 6 10.8 4.8 7.2 1.2 6 4.8 4.8Z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
  </svg>
);

export interface CardProps {
  t: TaskRuntime;
  col: Col;
  agent?: AgentDef;
  dept?: DepartmentDef;
  steps: StepInfo;
  compact: boolean;
  selected: boolean;
  picked: boolean;
  canDrag: boolean;
  onOpen: (id: string) => void;
  onKey: (e: KeyboardEvent<HTMLDivElement>, t: TaskRuntime, col: Col) => void;
  onDragStart: (e: DragEvent<HTMLDivElement>, t: TaskRuntime, col: Col) => void;
  onDragEnd: () => void;
}

export const Card = memo(function Card({ t, col, agent, dept, steps, compact, selected, picked, canDrag, onOpen, onKey, onDragStart, onDragEnd }: CardProps) {
  const id = shortId(t.id);
  const progress = steps.total != null && steps.done != null ? `${steps.done} étape(s) sur ${steps.total}` : 'progression indéterminée';
  const label = `${id}, ${t.title}. ${STATUS_LABEL[t.status]}${dept ? `, ${dept.name}` : ''}${agent ? `, assignée à ${agent.name}` : ''}, priorité ${PRIORITY_LABEL[t.priority].toLowerCase()}, ${progress}${t.nature === 'demo' ? ', donnée de démonstration' : ''}.`;
  return (
    <div
      role="button"
      tabIndex={0}
      className="kb-card"
      data-id={t.id}
      data-col={col}
      data-selected={selected || undefined}
      data-picked={picked || undefined}
      data-compact={compact || undefined}
      draggable={canDrag}
      aria-label={label}
      aria-pressed={selected}
      aria-describedby="kb-move-help"
      onClick={() => onOpen(t.id)}
      onKeyDown={(e) => onKey(e, t, col)}
      onDragStart={(e) => onDragStart(e, t, col)}
      onDragEnd={onDragEnd}
    >
      <div className="kb-card__top">
        <span className="kb-card__id">{id}</span>
        {t.project && !compact && <span className="kb-card__proj">{t.project}</span>}
        {t.priority !== 'normal' && <PriorityMark p={t.priority} withLabel={!compact && (t.priority === 'critical' || t.priority === 'high')} />}
        {t.nature === 'demo' && <span className="kb-card__nat">{compact ? <span className="nat" data-n="demo" title="Donnée de démonstration"><i className="nat__mark" aria-hidden /></span> : <NatureBadge nature="demo" />}</span>}
      </div>
      <div className="kb-card__title">{t.title}</div>
      {!compact && (
        <div className="kb-card__labels">
          {dept && (
            <span className="kb-label" style={{ ['--tone' as string]: `var(--${dept.tone})` }}>
              {dept.name}
            </span>
          )}
        </div>
      )}
      <div className="kb-card__foot">
        <span className="kb-card__who">
          <Avatar agent={agent} id={t.agentId} size={compact ? 18 : 22} />
          <span className="kb-card__agent">{agent?.name ?? t.agentId ?? 'Non assignée'}</span>
        </span>
        <span className="kb-card__counts" title={`${t.toolCalls} appel(s) d’outil · ${t.llmCalls} appel(s) modèle`}>
          <span>
            <ToolGlyph />
            <span className="num">{t.toolCalls}</span>
          </span>
          <span>
            <ModelGlyph />
            <span className="num">{t.llmCalls}</span>
          </span>
          {t.errors.length > 0 && (
            <span className="kb-card__err" title={`${t.errors.length} erreur(s)`}>
              !<span className="num">{t.errors.length}</span>
            </span>
          )}
        </span>
      </div>
      {(!compact || col === 'running' || col === 'paused') && <Progress steps={steps} status={t.status} compact={compact} />}
    </div>
  );
});
