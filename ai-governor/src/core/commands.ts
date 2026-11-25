/**
 * Command gateway — the ONLY way a visual layer can ask for a change.
 *
 * Every command is checked, in order, against:
 *   1. the time mode (Replay is strictly read-only),
 *   2. the source capabilities (an import is read-only),
 *   3. the role's permissions,
 *   4. the interaction that triggered it (no spend or durable change from an
 *      ambiguous gesture such as a drag or a double-click),
 *   5. a confirmation proportional to risk.
 * Experiences receive `host.request()`, which calls `dispatch()`. There is no
 * other mutation path, so a graphical interface cannot bypass authorisation.
 */
import type { GovEvent } from './events/schema';
import type { Priority, Verdict } from './projection';

export type Permission =
  | 'view'
  | 'view.confidential'
  | 'task.control'
  | 'task.rerun'
  | 'decision.resolve'
  | 'instructions.modify'
  | 'experience.manage'
  | 'experience.install-code';

export type Role = 'owner' | 'operator' | 'observer';

export const ROLE_LABEL: Record<Role, string> = {
  owner: 'Propriétaire',
  operator: 'Opérateur',
  observer: 'Observateur',
};

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: ['view', 'view.confidential', 'task.control', 'task.rerun', 'decision.resolve', 'instructions.modify', 'experience.manage', 'experience.install-code'],
  operator: ['view', 'task.control', 'experience.manage'],
  observer: ['view'],
};

export type Command =
  | { type: 'task.pause'; taskId: string }
  | { type: 'task.resume'; taskId: string }
  | { type: 'task.priority'; taskId: string; priority: Priority }
  | { type: 'task.rerun'; taskId: string; estimatedCostUsd?: number }
  | { type: 'decision.resolve'; decisionId: string; verdict: Verdict; durable?: boolean; costDeltaUsd?: number }
  | { type: 'instructions.modify'; target: string; summary: string };

export type Risk = 'low' | 'medium' | 'high' | 'critical';
export type ConfirmLevel = 'none' | 'simple' | 'explicit' | 'typed';
export type Interaction = 'click' | 'keyboard' | 'drag' | 'double-click' | 'gesture' | 'programmatic';

export interface CommandPolicy {
  permission: Permission;
  risk: Risk;
  /** May trigger provider spend. */
  spends: boolean;
  /** Durable change to user instructions/config. */
  durable: boolean;
  confirm: ConfirmLevel;
  label: string;
}

export function policyFor(cmd: Command): CommandPolicy {
  switch (cmd.type) {
    case 'task.pause':
      return { permission: 'task.control', risk: 'low', spends: false, durable: false, confirm: 'none', label: 'Suspendre la tâche' };
    case 'task.resume':
      return { permission: 'task.control', risk: 'medium', spends: true, durable: false, confirm: 'simple', label: 'Reprendre la tâche' };
    case 'task.priority':
      return { permission: 'task.control', risk: 'low', spends: false, durable: false, confirm: 'none', label: 'Modifier la priorité' };
    case 'task.rerun':
      return { permission: 'task.rerun', risk: 'high', spends: true, durable: false, confirm: 'explicit', label: 'Relancer la tâche' };
    case 'decision.resolve': {
      const durable = cmd.durable === true;
      const spends = (cmd.costDeltaUsd ?? 0) > 0;
      const risk: Risk = durable && cmd.verdict === 'go' ? 'critical' : spends && cmd.verdict !== 'nogo' ? 'high' : 'medium';
      const confirm: ConfirmLevel = risk === 'critical' ? 'typed' : risk === 'high' ? 'explicit' : 'simple';
      const label = cmd.verdict === 'go' ? 'Valider (GO)' : cmd.verdict === 'test' ? 'Tester (TEST)' : 'Refuser (NO GO)';
      return { permission: 'decision.resolve', risk, spends, durable, confirm, label };
    }
    case 'instructions.modify':
      return { permission: 'instructions.modify', risk: 'critical', spends: false, durable: true, confirm: 'typed', label: 'Modifier durablement les instructions' };
  }
}

export interface DispatchContext {
  role: Role;
  mode: 'live' | 'replay';
  /** Whether the active data source accepts commands. */
  sourceAcceptsCommands: boolean;
  sourceLabel: string;
  interaction: Interaction;
  confirmation?: { acknowledged: boolean; typed?: string };
}

export type DispatchResult =
  | { status: 'executed'; policy: CommandPolicy }
  | { status: 'needs-confirmation'; policy: CommandPolicy; expectedTyped?: string }
  | { status: 'denied'; policy: CommandPolicy; reason: string };

export const TYPED_CONFIRMATION = 'CONFIRMER';

const AMBIGUOUS: Interaction[] = ['drag', 'double-click', 'gesture'];

/** Decides whether a command may run now. Pure: no side effects. */
export function authorize(cmd: Command, ctx: DispatchContext): DispatchResult {
  const policy = policyFor(cmd);
  if (ctx.mode === 'replay') return { status: 'denied', policy, reason: 'Mode Replay : lecture seule. Revenez en direct pour agir.' };
  if (!ctx.sourceAcceptsCommands)
    return { status: 'denied', policy, reason: `La source « ${ctx.sourceLabel} » est en lecture seule : aucune action ne peut être transmise.` };
  if (!ROLE_PERMISSIONS[ctx.role].includes(policy.permission))
    return { status: 'denied', policy, reason: `Votre rôle (${ROLE_LABEL[ctx.role]}) n'autorise pas : ${policy.label.toLowerCase()}.` };
  if ((policy.spends || policy.durable) && AMBIGUOUS.includes(ctx.interaction))
    return { status: 'denied', policy, reason: 'Action engageante refusée : elle doit être déclenchée par un clic ou une touche explicite.' };
  if (policy.confirm === 'none') return { status: 'executed', policy };
  const c = ctx.confirmation;
  if (!c?.acknowledged) return { status: 'needs-confirmation', policy, expectedTyped: policy.confirm === 'typed' ? TYPED_CONFIRMATION : undefined };
  if (policy.confirm === 'typed' && c.typed?.trim().toUpperCase() !== TYPED_CONFIRMATION)
    return { status: 'needs-confirmation', policy, expectedTyped: TYPED_CONFIRMATION };
  return { status: 'executed', policy };
}

/** Port implemented by an operational backend (or the demo simulator). */
export interface OperationsPort {
  execute(cmd: Command, now: number): Promise<GovEvent[]>;
}
