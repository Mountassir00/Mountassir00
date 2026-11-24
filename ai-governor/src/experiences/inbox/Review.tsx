/** Decision detail styled like a code review: conversation, changes, checks, touched objects, verdict. */
import { useMemo, type MouseEvent, type ReactNode } from 'react';
import { IconAlert, IconCheck, IconInfo, NatureBadge } from '@ds';
import {
  displaySummary, fmtDuration, fmtRelative, fmtTime,
  type AgentDef, type Catalog, type Decision, type GovEvent, type GovernorState, type HostApi, type Interaction,
} from '@sdk';
import {
  changesOf, checksOf, confirmationFor, objectsOf, REV_LABEL, RISK_LABEL, shortDecisionId, VERDICT_LABEL,
  type Changes, type Check, type TouchedObject,
} from './review';

export type SubTab = 'conv' | 'changes' | 'checks' | 'objects';

const TYPE_LABEL: Partial<Record<GovEvent['type'], string>> = {
  recommendation: 'Recommandation', 'connector.status': 'Connecteur', 'security.incident': 'Sécurité', 'update.detected': 'Mise à jour',
  'config.changed': 'Configuration', 'optimization.applied': 'Optimisation', 'task.failed': 'Échec de tâche', 'skill.updated': 'Skill',
};

export function Avatar({ agent, name, size = 26 }: { agent?: AgentDef; name: string; size?: number }) {
  const bg = agent ? `hsl(${agent.avatar.hue} 58% 40%)` : 'var(--c-ink-muted)';
  return (
    <span className="ib-avatar" style={{ width: size, height: size, background: bg, fontSize: size * 0.46 }} aria-hidden>
      {(name.trim()[0] ?? '?').toUpperCase()}
    </span>
  );
}

const how = (e: MouseEvent): Interaction => (e.detail === 0 ? 'keyboard' : 'click');

export interface ReviewProps {
  d: Decision;
  catalog: Catalog;
  state: GovernorState;
  related: { before: GovEvent[]; resolution?: GovEvent };
  now: number;
  replay: boolean;
  canViewConfidential: boolean;
  host: HostApi;
  tab: SubTab;
  onTab: (t: SubTab) => void;
  onBack?: () => void;
  showRelated: boolean;
}

export function Review({ d, catalog, state, related, now, replay, canViewConfidential, host, tab, onTab, onBack, showRelated }: ReviewProps) {
  const agent = catalog.agents.find((a) => a.id === d.proposedBy);
  const dept = catalog.departments.find((x) => x.id === d.departmentId);
  const proposer = agent?.name ?? d.proposedBy ?? 'Système';
  const changes = useMemo(() => changesOf(d, catalog, state), [d, catalog, state]);
  const checks = useMemo(() => checksOf(d), [d]);
  const objects = useMemo(() => objectsOf(d, catalog, state), [d, catalog, state]);
  const pending = d.status === 'pending';
  const before = showRelated ? related.before.filter((e) => e.ts < d.proposedAt) : [];
  const after = showRelated ? related.before.filter((e) => e.ts >= d.proposedAt) : [];
  const convCount = 1 + before.length + after.length + (related.resolution ? 1 : 0);
  const changeCount = changes.kind === 'params' ? changes.params.length : changes.added + changes.removed;

  const decide = (verdict: 'go' | 'test' | 'nogo', e: MouseEvent) =>
    void host.request({ type: 'decision.resolve', decisionId: d.id, verdict, durable: d.durable, costDeltaUsd: d.costDeltaUsd }, how(e));

  const tabs: Array<{ id: SubTab; label: string; n: number }> = [
    { id: 'conv', label: 'Conversation', n: convCount },
    { id: 'changes', label: 'Changements', n: changeCount },
    { id: 'checks', label: 'Contrôles', n: checks.length },
    { id: 'objects', label: 'Objets touchés', n: objects.length },
  ];

  return (
    <article className="ib-review" aria-label={`Proposition ${shortDecisionId(d.id)} : ${d.title}`}>
      <header className="ib-review__head">
        {onBack && (
          <button type="button" className="btn btn--sm btn--ghost ib-back" onClick={onBack}>
            <svg width="14" height="14" viewBox="0 0 20 20" aria-hidden focusable="false"><path d="m12 5-5 5 5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Boîte de réception
          </button>
        )}
        <div className="ib-review__kicker">
          <ReviewGlyph />
          <span>Proposition</span>
          <span className="ib-mono">#{shortDecisionId(d.id)}</span>
          <StatePill d={d} />
          <span className="ib-review__nat">
            <NatureBadge nature={d.nature} />
          </span>
        </div>
        <h2 className="ib-review__title">{d.title}</h2>
        <p className="ib-review__branch">
          <button type="button" className="ib-who" onClick={() => d.proposedBy && host.select({ kind: 'agent', id: d.proposedBy })} disabled={!d.proposedBy} title="Voir l’agent dans l’inspecteur">
            <Avatar agent={agent} name={proposer} size={20} />
            {proposer}
          </button>
          <span className="t-muted">propose</span>
          <span className="ib-branch" style={dept ? { ['--tone' as string]: `var(--${dept.tone})` } : undefined}>{dept?.name ?? 'Sans département'}</span>
          <svg width="14" height="14" viewBox="0 0 20 20" aria-hidden focusable="false" className="t-muted"><path d="M4 10h11M11 6l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span className="ib-branch ib-branch--main">Direction · arbitrage</span>
          <span className="t-muted t-micro">{fmtRelative(d.proposedAt, now)}</span>
        </p>
      </header>

      <div className="ib-subtabs" role="tablist" aria-label="Sections de la proposition">
        {tabs.map((t) => (
          <button key={t.id} type="button" role="tab" id={`ib-tab-${t.id}`} aria-controls="ib-tabpanel" aria-selected={tab === t.id} onClick={() => onTab(t.id)}>
            {t.label}
            <span className="ib-subtabs__n num">{t.n}</span>
          </button>
        ))}
      </div>

      <div className="ib-review__body" role="tabpanel" id="ib-tabpanel" aria-labelledby={`ib-tab-${tab}`} tabIndex={0}>
        {tab === 'conv' && (
          <ol className="ib-thread">
            {before.length > 0 && <li className="ib-thread__sep t-micro">Contexte · 72 h avant la proposition</li>}
            {before.map((e) => (
              <EventItem key={e.id} e={e} now={now} conf={canViewConfidential} />
            ))}
            <li className="ib-msg">
              <Avatar agent={agent} name={proposer} size={30} />
              <div className="ib-msg__card">
                <div className="ib-msg__head">
                  <b>{proposer}</b> <span className="t-muted">a ouvert la proposition</span>
                  <time className="t-micro t-muted" dateTime={new Date(d.proposedAt).toISOString()}>
                    {fmtTime(d.proposedAt, true)}
                  </time>
                </div>
                <p>{d.rationale || <span className="t-muted">Aucune justification fournie.</span>}</p>
                <dl className="ib-msg__kv">
                  <dt>Impact annoncé</dt>
                  <dd>{d.impact || '—'}</dd>
                  <dt>Évaluation</dt>
                  <dd>
                    {RISK_LABEL[d.risk]} · {REV_LABEL[d.reversibility]}
                    {d.durable ? ' · modifie les instructions' : ''}
                  </dd>
                </dl>
              </div>
            </li>
            {after.map((e) => (
              <EventItem key={e.id} e={e} now={now} conf={canViewConfidential} />
            ))}
            {related.resolution && (
              <li className="ib-event ib-event--verdict" data-v={String(related.resolution.attrs?.verdict ?? '')}>
                <i aria-hidden />
                <span>
                  {related.resolution.origin.kind === 'user' ? 'Vous avez' : 'Arbitrage :'} arbitré <b>{VERDICT_LABEL[(related.resolution.attrs?.verdict as 'go') ?? 'go'] ?? '—'}</b>
                </span>
                <time className="t-micro t-muted">{fmtRelative(related.resolution.ts, now)}</time>
              </li>
            )}
            {pending && (
              <li className="ib-event ib-event--wait">
                <i aria-hidden />
                <span>En attente de votre arbitrage depuis {fmtDuration(now - d.proposedAt)}</span>
              </li>
            )}
            {!showRelated && <li className="t-micro t-muted ib-thread__sep">Événements liés masqués (réglage de la vue).</li>}
          </ol>
        )}
        {tab === 'changes' && <ChangesView c={changes} />}
        {tab === 'checks' && <ChecksView checks={checks} />}
        {tab === 'objects' && <ObjectsView objects={objects} />}
      </div>

      {pending ? (
        <footer className="ib-actions">
          <div className="ib-commit">
            <div className="ib-commit__title">
              <span className="ib-mono">#{shortDecisionId(d.id)}</span>
              <span className="ib-commit__target">{changes.target}</span>
              <span className="ib-plus num">+{changes.added}</span>
              <span className="ib-minus num">−{changes.removed}</span>
            </div>
            <p className="ib-commit__sub t-micro">
              {replay ? (
                'Replay : lecture seule, aucun arbitrage possible.'
              ) : (
                <>
                  GO demandera : {confirmationFor(d, 'go')}
                  <span className="ib-commit__more"> · TEST : {confirmationFor(d, 'test')}. La passerelle vérifie aussi la permission.</span>
                </>
              )}
            </p>
          </div>
          <div className="ib-verdict">
            <button type="button" className="btn ib-nogo" disabled={replay} onClick={(e) => decide('nogo', e)}>
              NO GO
            </button>
            <button type="button" className="btn ib-test" disabled={replay} onClick={(e) => decide('test', e)}>
              TEST
            </button>
            <button type="button" className="ib-go" disabled={replay} onClick={(e) => decide('go', e)}>
              <IconCheck size={16} /> GO
            </button>
          </div>
        </footer>
      ) : (
        <footer className="ib-resolved" data-v={d.status}>
          <StatePill d={d} />
          <span>
            Arbitrée {d.resolvedAt ? fmtRelative(d.resolvedAt, now) : ''}
            {d.resolvedAt ? ` · ${fmtTime(d.resolvedAt, true)}` : ''}
          </span>
          <span className="t-micro t-muted">Pour revenir sur ce choix, une nouvelle proposition est nécessaire.</span>
        </footer>
      )}
    </article>
  );
}

export function StatePill({ d }: { d: Decision }) {
  const label = d.status === 'pending' ? 'Ouverte' : VERDICT_LABEL[d.status];
  return (
    <span className="ib-state" data-s={d.status}>
      <i aria-hidden />
      {label}
    </span>
  );
}

function EventItem({ e, now, conf }: { e: GovEvent; now: number; conf: boolean }) {
  return (
    <li className="ib-event" data-s={e.status}>
      <i aria-hidden />
      <span>
        <b>{TYPE_LABEL[e.type] ?? e.type}</b> · {displaySummary(e, conf)}
      </span>
      <time className="t-micro t-muted" dateTime={new Date(e.ts).toISOString()} title={fmtTime(e.ts, true)}>
        {fmtRelative(e.ts, now)}
      </time>
    </li>
  );
}

function ChangesView({ c }: { c: Changes }) {
  return (
    <div className="ib-files">
      <section className="ib-file" aria-label={`Changements : ${c.target}`}>
        <header className="ib-file__head">
          <FileGlyph />
          <span className="ib-mono ib-file__name">{c.target}</span>
          <span className="ib-plus num">+{c.added}</span>
          <span className="ib-minus num">−{c.removed}</span>
          {c.simulated && <span className="pill pill--accent ib-file__sim">Diff simulé pour la démo</span>}
        </header>
        {c.kind === 'text' && c.unavailable && (
          <div className="ib-file__na">
            <NatureBadge nature="unavailable" />
            <p>{c.unavailable}</p>
          </div>
        )}
        {c.kind === 'text' && !c.unavailable && (
          <div className="ib-diff" role="table" aria-label="Différences des consignes">
            {c.diff.map((l, i) => (
              <div key={i} className="ib-diff__line" data-k={l.kind} role="row">
                <span className="ib-diff__n" role="cell">{l.a ?? ''}</span>
                <span className="ib-diff__n" role="cell">{l.b ?? ''}</span>
                <span className="ib-diff__sign" role="cell" aria-label={l.kind === 'add' ? 'ajout' : l.kind === 'del' ? 'suppression' : undefined}>
                  {l.kind === 'add' ? '+' : l.kind === 'del' ? '−' : ''}
                </span>
                <span className="ib-diff__txt" role="cell">{l.text}</span>
              </div>
            ))}
          </div>
        )}
        {c.kind === 'params' && (
          <div className="ib-params" role="table" aria-label="Paramètres modifiés">
            <div className="ib-params__head" role="row">
              <span role="columnheader">Paramètre</span>
              <span role="columnheader">Avant</span>
              <span role="columnheader">Après</span>
            </div>
            {c.params.map((p) => (
              <div key={p.label} className="ib-params__row" role="row">
                <span className="ib-params__k" role="cell">
                  {p.label}
                  {p.nature && p.nature !== 'demo' && <NatureBadge nature={p.nature} />}
                </span>
                <span className="ib-params__v ib-params__v--del" role="cell">
                  <span className="sr-only">avant : </span>− {p.before}
                </span>
                <span className="ib-params__v ib-params__v--add" role="cell">
                  <span className="sr-only">après : </span>+ {p.after}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
      <p className="ib-source t-micro">{c.source}</p>
    </div>
  );
}

const CHECK_ICON: Record<Check['state'], ReactNode> = {
  pass: <IconCheck size={13} />,
  warn: <IconAlert size={13} />,
  fail: <IconAlert size={13} />,
  info: <IconInfo size={13} />,
  unknown: <span aria-hidden>?</span>,
};
const CHECK_SR: Record<Check['state'], string> = { pass: 'réussi', warn: 'avertissement', fail: 'bloquant', info: 'information', unknown: 'indisponible' };

function ChecksView({ checks }: { checks: Check[] }) {
  const n = (s: Check['state']) => checks.filter((c) => c.state === s).length;
  return (
    <div className="ib-checks">
      <p className="ib-checks__sum t-small">
        {checks.length} contrôles · <b className="ib-c-pass">{n('pass')} réussi(s)</b> · <b className="ib-c-warn">{n('warn') + n('fail')} à surveiller</b> · {n('unknown')} indisponible(s)
      </p>
      <ul>
        {checks.map((c) => (
          <li key={c.id} data-s={c.state}>
            <span className="ib-checks__ic">
              {CHECK_ICON[c.state]}
              <span className="sr-only">{CHECK_SR[c.state]}</span>
            </span>
            <span className="ib-checks__main">
              <span className="ib-checks__label">{c.label}</span>
              {c.detail && <span className="ib-checks__detail t-micro">{c.detail}</span>}
            </span>
            <span className="ib-checks__val">
              {c.value}
              {c.nature && <NatureBadge nature={c.nature} />}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const MARK_LABEL = { M: 'modifié', A: 'ajouté', L: 'lu / dépendance' } as const;

function ObjectsView({ objects }: { objects: TouchedObject[] }) {
  const groups = [...new Set(objects.map((o) => o.group))];
  return (
    <div className="ib-objects">
      <p className="ib-objects__legend t-micro">
        <span data-m="M">M</span> modifié <span data-m="A">A</span> ajouté <span data-m="L">L</span> lu ou dépendance · déduit du catalogue et du texte de la proposition
      </p>
      {groups.map((gname) => (
        <section key={gname}>
          <h3 className="ib-objects__group">{gname}</h3>
          <ul>
            {objects
              .filter((o) => o.group === gname)
              .map((o) => (
                <li key={o.id}>
                  <ObjGlyph kind={o.kind} />
                  <span className="ib-objects__label">
                    {o.label}
                    <span className="t-micro t-muted"> · {o.kind}{o.note ? ` · ${o.note}` : ''}</span>
                  </span>
                  <span className="ib-objects__mark" data-m={o.mark} title={MARK_LABEL[o.mark]}>
                    {o.mark}
                    <span className="sr-only"> ({MARK_LABEL[o.mark]})</span>
                  </span>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function ReviewGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" aria-hidden focusable="false">
      <circle cx="5.5" cy="4.5" r="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="5.5" cy="15.5" r="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="14.5" cy="15.5" r="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5.5 6.5v7M14.5 13.5V8.5a3 3 0 0 0-3-3H9M10.5 3.5 8.5 5.5l2 2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FileGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" aria-hidden focusable="false">
      <path d="M5 2.5h6.5L15.5 6.5v11H5Z M11.5 2.5v4h4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M7.5 10.5h5M7.5 13.5h3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function ObjGlyph({ kind }: { kind: string }) {
  const k = kind.includes('agent') || kind === 'script' || kind === 'service' ? 'agent' : kind === 'département' ? 'dept' : kind === 'base' ? 'db' : 'node';
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" aria-hidden focusable="false" className="ib-objects__ic">
      {k === 'agent' && <><rect x="4" y="6" width="12" height="9" rx="3" fill="none" stroke="currentColor" strokeWidth="1.4" /><circle cx="8" cy="10.5" r="1" fill="currentColor" /><circle cx="12" cy="10.5" r="1" fill="currentColor" /><path d="M10 6V3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></>}
      {k === 'dept' && <><path d="M3.5 16.5V8l6.5-4.5L16.5 8v8.5Z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /><path d="M8 16.5v-4h4v4" fill="none" stroke="currentColor" strokeWidth="1.4" /></>}
      {k === 'db' && <><ellipse cx="10" cy="5" rx="5.5" ry="2" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="M4.5 5v10c0 1.1 2.5 2 5.5 2s5.5-.9 5.5-2V5M4.5 10c0 1.1 2.5 2 5.5 2s5.5-.9 5.5-2" fill="none" stroke="currentColor" strokeWidth="1.4" /></>}
      {k === 'node' && <><circle cx="10" cy="10" r="3" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="M10 3v4M10 13v4M3 10h4M13 10h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></>}
    </svg>
  );
}
