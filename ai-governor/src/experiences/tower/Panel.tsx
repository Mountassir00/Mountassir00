/**
 * Side panel of the « Siège »: the selected floor (tasks, decisions to
 * arbitrate, cost of the period) or the list of floors, and the autopilot
 * block (recurring automations deduced from `automation.run`).
 */
import { NatureBadge, IconChevron } from '@ds';
import {
  fmtCompact, fmtInt, fmtRelative, fmtTime, fmtUsd,
  type DataNature, type Decision, type DepartmentDef, type TaskRuntime, type UsageTotals,
} from '@sdk';
import type { FloorTally } from './Building';
import { levelLabel, levelLong, type Automation, type Floor } from './model';

export interface FloorUsage {
  totals: UsageTotals;
  nature: DataNature;
  periodLabel: string;
}

export interface PanelProps {
  floor: Floor | null;
  floors: Floor[];
  tallies: Map<string, FloorTally>;
  tasks: TaskRuntime[];
  decisions: Decision[];
  usage: FloorUsage | null;
  automations: Automation[];
  now: number;
  replay: boolean;
  agentName: (id?: string) => string;
  deptName: (id?: string) => string;
  selectedDept?: string;
  onOpenFloor: (id: string) => void;
  onSelectDept: (id: string) => void;
  onSelectTask: (id: string) => void;
  onOpenDecisions: () => void;
}

const TASK_STATUS: Record<string, { label: string; cls: string }> = {
  running: { label: 'En cours', cls: 'pill pill--accent' },
  paused: { label: 'Suspendue', cls: 'pill' },
  pending: { label: 'En file', cls: 'pill' },
};
const RISK: Record<Decision['risk'], string> = { low: 'Risque faible', medium: 'Risque moyen', high: 'Risque élevé' };

export function TallyDots({ t }: { t: FloorTally }) {
  const parts: Array<[string, number, string]> = [
    ['work', t.work, t.work > 1 ? 'actifs' : 'actif'],
    ['wait', t.wait, 'en attente'],
    ['error', t.error, 'en erreur'],
  ];
  const shown = parts.filter(([, n]) => n > 0);
  return (
    <span className="tw-tally">
      {shown.length ? (
        shown.map(([k, n, label]) => (
          <span key={k} className="tw-tally__seg" data-k={k}>
            <i aria-hidden />
            {n} {label}
          </span>
        ))
      ) : (
        <span className="tw-tally__seg" data-k="off">
          <i aria-hidden />
          au repos
        </span>
      )}
      {t.pending > 0 && (
        <span className="tw-tally__seg" data-k="dec">
          ◆ {t.pending} à arbitrer
        </span>
      )}
    </span>
  );
}

function Section({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="tw-sec">
      <div className="tw-sec__head">
        <h3>{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

function deptSwatch(d: DepartmentDef) {
  return <i className="tw-swatch" style={{ background: `var(--${d.tone})` }} aria-hidden />;
}

export function AutopilotBlock({ automations, now }: { automations: Automation[]; now: number }) {
  return (
    <Section title="Autopilote" aside={<span className="t-micro t-muted">{automations.length ? `${automations.length} récurrente${automations.length > 1 ? 's' : ''}` : ''}</span>}>
      {automations.length === 0 ? (
        <p className="tw-empty">Aucune automatisation récurrente observée. Il faut au moins deux exécutions « automation.run » pour déduire une cadence.</p>
      ) : (
        <ul className="tw-auto">
          {automations.slice(0, 6).map((a) => {
            const overdue = a.nextTs != null && a.nextTs < now;
            return (
              <li key={a.key} className="tw-auto__item">
                <div className="tw-auto__top">
                  <b>{a.name}</b>
                  <NatureBadge nature={a.nature} />
                </div>
                <div className="tw-auto__meta">
                  {a.engine?.name ?? 'Moteur inconnu'}
                  {a.dept ? ` · ${a.dept.name}` : ''}
                </div>
                <div className="tw-auto__cad">{a.cadence}</div>
                <dl className="tw-auto__kv">
                  <dt>Dernière</dt>
                  <dd>
                    {fmtRelative(a.lastTs, now)} · <span data-failed={a.lastFailed || undefined} className="tw-auto__res">{a.lastFailed ? 'échec' : 'réussie'}</span>
                  </dd>
                  <dt>Prochaine</dt>
                  <dd>
                    {a.nextTs == null ? (
                      <span className="t-muted">Non déductible</span>
                    ) : (
                      <>
                        <span className={overdue ? 'tw-auto__late' : undefined}>
                          {overdue ? `attendue ${fmtTime(a.nextTs, true)}, non observée` : fmtTime(a.nextTs, true)}
                        </span>{' '}
                        <NatureBadge nature="planned" label="Planifié (déduit)" />
                      </>
                    )}
                  </dd>
                  <dt>Historique</dt>
                  <dd>
                    {fmtInt(a.runs)} exécution{a.runs > 1 ? 's' : ''}
                    {a.failed ? `, ${a.failed} échec${a.failed > 1 ? 's' : ''}` : ', aucun échec'}
                  </dd>
                </dl>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}

export function FloorDetails(p: PanelProps) {
  const f = p.floor;
  if (!f) {
    return (
      <>
        <Section title="Pôles de l’immeuble">
          <ul className="tw-floors">
            {[...p.floors].reverse().map((fl) => (
              <li key={fl.id}>
                <button type="button" className="tw-floorrow" onClick={() => p.onOpenFloor(fl.id)} aria-label={`Ouvrir ${levelLong(fl)} : ${fl.id}`}>
                  <span className="tw-floorrow__lvl">{levelLabel(fl)}</span>
                  <span className="tw-floorrow__main">
                    <b>{fl.id}</b>
                    <TallyDots t={p.tallies.get(fl.id) ?? { work: 0, wait: 0, error: 0, pending: 0 }} />
                  </span>
                  <IconChevron size={16} />
                </button>
              </li>
            ))}
          </ul>
        </Section>
        <AutopilotBlock automations={p.automations} now={p.now} />
      </>
    );
  }
  const running = p.tasks.filter((t) => t.status !== 'pending');
  const pending = p.tasks.filter((t) => t.status === 'pending');
  const listed = [...running, ...pending].slice(0, 6);
  const u = p.usage;
  return (
    <>
      <Section title="Départements">
        <div className="tw-depts">
          {f.depts.map((d) => (
            <button key={d.id} type="button" className="tw-dept" aria-pressed={p.selectedDept === d.id} onClick={() => p.onSelectDept(d.id)}>
              {deptSwatch(d)}
              {d.name}
            </button>
          ))}
        </div>
      </Section>
      <Section title="Tâches en cours" aside={<span className="t-micro t-muted">{running.length} en cours · {pending.length} en file</span>}>
        {listed.length === 0 ? (
          <p className="tw-empty">Aucune tâche en cours ni en file pour ce pôle.</p>
        ) : (
          <ul className="tw-list">
            {listed.map((t) => (
              <li key={t.id}>
                <button type="button" className="tw-row" onClick={() => p.onSelectTask(t.id)} aria-label={`Tâche ${t.title}, ${TASK_STATUS[t.status]?.label ?? t.status}, ${p.agentName(t.agentId)}, ${p.deptName(t.departmentId)}`}>
                  <span className="tw-row__main">
                    <span className="tw-row__title">{t.title}</span>
                    <span className="tw-row__meta">
                      {p.agentName(t.agentId)} · {p.deptName(t.departmentId)}
                    </span>
                  </span>
                  <span className={TASK_STATUS[t.status]?.cls ?? 'pill'}>{TASK_STATUS[t.status]?.label ?? t.status}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {running.length + pending.length > listed.length && <p className="t-micro t-muted tw-more">+{running.length + pending.length - listed.length} autres (voir Kanban des tâches)</p>}
      </Section>
      <Section title="Décisions en attente" aside={p.decisions.length ? <span className="badge-count">{p.decisions.length}</span> : undefined}>
        {p.decisions.length === 0 ? (
          <p className="tw-empty">Aucune décision en attente pour ce pôle.</p>
        ) : (
          <ul className="tw-list">
            {p.decisions.slice(0, 4).map((d) => (
              <li key={d.id} className="tw-dec">
                <div className="tw-dec__main">
                  <span className="tw-row__title">{d.title}</span>
                  <span className="tw-row__meta">
                    {p.deptName(d.departmentId)} · proposée {fmtRelative(d.proposedAt, p.now)}
                  </span>
                  <span className="tw-dec__tags">
                    <span className={`pill pill--risk-${d.risk}`}>{RISK[d.risk]}</span>
                    {d.costDeltaUsd != null && <span className="pill">{fmtUsd(d.costDeltaUsd)}</span>}
                    <NatureBadge nature={d.nature} />
                  </span>
                </div>
                <button type="button" className="btn btn--sm btn--primary" onClick={p.onOpenDecisions} aria-label={`Arbitrer : ${d.title}`}>
                  Arbitrer
                </button>
              </li>
            ))}
          </ul>
        )}
        {p.replay && p.decisions.length > 0 && <p className="t-micro t-muted tw-more">Relecture : le centre de décisions s’ouvre en lecture seule.</p>}
      </Section>
      <Section title="Coût et tokens" aside={<span className="t-micro t-muted">{u?.periodLabel}</span>}>
        {!u || (u.totals.llmCalls === 0 && u.totals.toolCalls === 0) ? (
          <p className="tw-empty">
            <NatureBadge nature="unavailable" /> Aucun appel modèle ni outil enregistré pour ce pôle sur la période : rien à chiffrer.
          </p>
        ) : (
          <dl className="tw-usage">
            <div>
              <dt>Coût</dt>
              <dd>
                <b className="num">{fmtUsd(u.totals.costUsd)}</b>
                <NatureBadge nature={u.nature} />
              </dd>
            </div>
            <div>
              <dt>Tokens (entrée / sortie)</dt>
              <dd>
                <b className="num">
                  {fmtCompact(u.totals.tokensIn)} / {fmtCompact(u.totals.tokensOut)}
                </b>
                <NatureBadge nature={u.nature === 'demo' ? 'demo' : 'real'} />
              </dd>
            </div>
            <div>
              <dt>Lus depuis le cache</dt>
              <dd className="num">{fmtCompact(u.totals.cacheRead)}</dd>
            </div>
            <div>
              <dt>Appels modèle · outils</dt>
              <dd className="num">
                {fmtInt(u.totals.llmCalls)} · {fmtInt(u.totals.toolCalls)}
              </dd>
            </div>
          </dl>
        )}
      </Section>
      <AutopilotBlock automations={p.automations} now={p.now} />
    </>
  );
}
