/**
 * Assistant — conversational page where every answer is computed LOCALLY and
 * deterministically from the event log (intent parser + SDK selectors). No
 * model is called, nothing is sent anywhere, nothing is spent. Each answer is
 * a short sentence plus data artefacts, and every figure shows its nature.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fmtRelative, fmtTime, fmtUsd, PERIOD_LABEL, sumUsage, useGovernor, type ExperienceProps, type PeriodPreset } from '@sdk';
import { IconCheck, IconClose, IconCopy, IconReset, NatureBadge } from '@ds';
import { answer, answerToText, understood, type Answer } from './answer';
import { Artefact } from './Artefacts';
import { buildEntityIndex, parse, startOfDay, SUGGESTIONS } from './parse';
import './assistant.css';

const PERIOD_PHRASE: Record<PeriodPreset, string> = {
  live: 'les 15 dernières minutes',
  '1h': 'la dernière heure',
  '24h': 'les dernières 24 h',
  '7d': 'les 7 derniers jours',
  '30d': 'les 30 derniers jours',
  custom: 'la période choisie',
};

const MAX_HISTORY = 20;
const MAX_PINS = 6;

function sanitizeAnswers(v: unknown, max: number): Answer[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((a): a is Answer => !!a && typeof a === 'object' && typeof (a as Answer).id === 'string' && typeof (a as Answer).q === 'string' && Array.isArray((a as Answer).blocks) && typeof (a as Answer).text === 'string')
    .slice(-max);
}

function PinGlyph({ on }: { on: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill={on ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M7.5 3.5h5l-.8 4.2 2.8 2.8v1.5h-9v-1.5l2.8-2.8Z" />
      <path d="M10 12v4.5" fill="none" />
    </svg>
  );
}

function SendGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M10 16V4M5 9l5-5 5 5" />
    </svg>
  );
}

function Orb({ size = 'lg' }: { size?: 'lg' | 'sm' }) {
  return (
    <span className="as-orb" data-size={size} aria-hidden>
      <i />
    </span>
  );
}

export default function Assistant({ host, config, device }: ExperienceProps) {
  const g = useGovernor();
  const keep = config.keepHistory !== false;
  const showUnderstood = config.showUnderstood !== false;
  const density = config.density === 'compact' ? 'compact' : 'comfortable';
  const ents = useMemo(() => buildEntityIndex(g.catalog), [g.catalog]);

  const [history, setHistory] = useState<Answer[]>(() => (keep ? sanitizeAnswers(host.getLocal<unknown>('history', []), MAX_HISTORY) : []));
  const [pins, setPins] = useState<Answer[]>(() => sanitizeAnswers(host.getLocal<unknown>('pins', []), MAX_PINS));
  const [input, setInput] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [fresh, setFresh] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const ta = useRef<HTMLTextAreaElement>(null);

  const saveHistory = useCallback(
    (h: Answer[]) => {
      if (keep) host.setLocal('history', h.slice(-MAX_HISTORY));
    },
    [host, keep],
  );
  const savePins = useCallback((p: Answer[]) => host.setLocal('pins', p.slice(0, MAX_PINS)), [host]);

  const filterCount = g.filters.providers.length + g.filters.models.length + g.filters.projects.length + g.filters.departments.length + g.filters.agents.length + g.filters.categories.length;
  const fallbackPeriod = useMemo(
    () => ({ from: g.range.from, to: g.range.to, label: PERIOD_PHRASE[g.period.preset], short: PERIOD_LABEL[g.period.preset] }),
    [g.range.from, g.range.to, g.period.preset],
  );

  const firstTs = useMemo(() => g.allEvents()[0]?.ts ?? g.now, [g.version]); // eslint-disable-line react-hooks/exhaustive-deps
  const compute = useCallback(
    (q: string): Answer => {
      const parsed = parse(q, g.now, ents, fallbackPeriod);
      const a = answer(parsed, { now: g.now, mode: g.mode, window: g.windowEvents, state: g.state, catalog: g.catalog, hasDemo: g.hasDemo, canViewConfidential: g.canViewConfidential, firstTs });
      if (filterCount) a.understood.push(`filtres actifs (${filterCount})`);
      return a;
    },
    [g, ents, fallbackPeriod, filterCount, firstTs],
  );

  const reveal = (id: string) => {
    setFresh(id);
    requestAnimationFrame(() => {
      const el = document.getElementById(`as-${id}`);
      const smooth = document.documentElement.dataset.motion !== 'none';
      el?.scrollIntoView({ block: 'start', behavior: smooth ? 'smooth' : 'auto' });
    });
  };

  const ask = useCallback(
    (q: string) => {
      const text = q.trim();
      if (!text) return;
      const a = compute(text);
      const next = [...history, a].slice(-MAX_HISTORY);
      setHistory(next);
      saveHistory(next);
      setInput('');
      host.announce(a.text);
      reveal(a.id);
    },
    [compute, history, host, saveHistory],
  );

  const recompute = (a: Answer) => {
    const b = { ...compute(a.q), id: a.id };
    const next = history.map((x) => (x.id === a.id ? b : x));
    setHistory(next);
    saveHistory(next);
    if (pins.some((p) => p.id === a.id)) {
      const np = pins.map((p) => (p.id === a.id ? b : p));
      setPins(np);
      savePins(np);
    }
    host.announce('Réponse recalculée avec les données actuelles');
  };
  const refreshPin = (a: Answer) => {
    const b = { ...compute(a.q), id: a.id };
    const np = pins.map((p) => (p.id === a.id ? b : p));
    setPins(np);
    savePins(np);
    if (history.some((x) => x.id === a.id)) {
      const nh = history.map((x) => (x.id === a.id ? b : x));
      setHistory(nh);
      saveHistory(nh);
    }
  };
  const togglePin = (a: Answer) => {
    const on = pins.some((p) => p.id === a.id);
    const np = on ? pins.filter((p) => p.id !== a.id) : [a, ...pins].slice(0, MAX_PINS);
    setPins(np);
    savePins(np);
    host.announce(on ? 'Réponse retirée des épingles' : 'Réponse épinglée en haut de la page');
  };
  const copy = (a: Answer) => {
    navigator.clipboard?.writeText(answerToText(a)).then(
      () => {
        setCopied(a.id);
        host.announce('Réponse copiée');
        window.setTimeout(() => setCopied((c) => (c === a.id ? null : c)), 1600);
      },
      () => host.announce('Copie impossible dans ce navigateur'),
    );
  };
  const clear = () => {
    setHistory([]);
    saveHistory([]);
    host.announce('Conversation effacée');
    ta.current?.focus();
  };
  const openPin = (a: Answer) => {
    if (history.some((x) => x.id === a.id)) reveal(a.id);
    else ask(a.q);
  };

  const actionsRef = useRef({ clear, focus: () => ta.current?.focus() });
  actionsRef.current = { clear, focus: () => ta.current?.focus() };
  useEffect(
    () =>
      host.provideCommands([
        { id: 'ask', label: 'Assistant : poser une question', run: () => actionsRef.current.focus() },
        { id: 'clear', label: 'Assistant : nouvelle conversation', run: () => actionsRef.current.clear() },
      ]),
    [host],
  );

  // Auto-grow composer.
  useEffect(() => {
    const el = ta.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(140, el.scrollHeight)}px`;
  }, [input]);

  // Live preview of what the parser understood (cheap: regexes only).
  const preview = useMemo(() => {
    if (!input.trim()) return null;
    const p = parse(input, g.now, ents, fallbackPeriod);
    return p.intent ? understood(p, g.catalog) : null;
  }, [input, g.now, ents, fallbackPeriod, g.catalog]);

  /* ---------------- greeting status (real data) ---------------- */
  const status = useMemo(() => {
    const agents = Object.values(g.state.agents);
    const active = agents.filter((a) => a.status !== 'idle' && a.status !== 'offline').length;
    const errors = agents.filter((a) => a.status === 'error').length;
    const pending = Object.values(g.state.decisions).filter((d) => d.status === 'pending').length;
    const today = sumUsage(g.windowEvents(startOfDay(g.now), g.now));
    return { active, errors, pending, cost: today.costEstimated + today.costMeasured };
  }, [g.version, g.now]); // eslint-disable-line react-hooks/exhaustive-deps
  const hour = new Date(g.now).getHours();
  const hello = hour >= 18 || hour < 5 ? 'Bonsoir' : 'Bonjour';
  const nature = g.hasDemo ? 'demo' : 'real';

  const empty = history.length === 0;
  const mobile = device === 'mobile';

  return (
    <div className="as" data-device={device} data-density={density} data-empty={empty || undefined}>
      <div className="as-scroll" ref={scroller}>
        <div className="as-col">
          {pins.length > 0 && (
            <section className="as-pins" aria-label="Réponses épinglées">
              {pins.map((p) => {
                const k = p.blocks.find((b) => b.kind === 'kpis');
                const head = k && k.kind === 'kpis' ? k.items[0] : null;
                return (
                  <article key={p.id} className="as-pin">
                    <button type="button" className="as-pin__open" onClick={() => openPin(p)} aria-label={`Afficher la réponse épinglée : ${p.q}`}>
                      <span className="as-pin__q">{p.q}</span>
                      {head ? (
                        <span className="as-pin__v">
                          <b className="num">{head.value}</b> <small>{head.label}</small>
                        </span>
                      ) : (
                        <span className="as-pin__t">{p.text}</span>
                      )}
                    </button>
                    <div className="as-pin__foot">
                      <NatureBadge nature={head?.nature ?? p.nature} />
                      <span className="t-micro t-muted">{fmtRelative(p.at, g.now)}</span>
                      <button type="button" className="as-mini" onClick={() => refreshPin(p)} aria-label={`Actualiser : ${p.q}`} title="Actualiser avec les données actuelles">
                        <IconReset size={14} />
                      </button>
                      <button type="button" className="as-mini" onClick={() => togglePin(p)} aria-label={`Retirer l’épingle : ${p.q}`} title="Retirer">
                        <IconClose size={14} />
                      </button>
                    </div>
                  </article>
                );
              })}
            </section>
          )}

          {empty ? (
            <section className="as-hero" aria-labelledby="as-hello">
              <Orb />
              <h2 id="as-hello" className="as-hero__title">
                {hello}
              </h2>
              <p className="as-hero__status">
                <button type="button" className="as-stat" onClick={() => ask('Décisions en attente')}>
                  <b className="num">{status.pending}</b> décision(s) en attente
                </button>
                <button type="button" className="as-stat" onClick={() => ask('Agents actifs')}>
                  <b className="num">{status.active}</b> agent(s) actif(s)
                </button>
                <button type="button" className="as-stat" data-alert={status.errors > 0 || undefined} onClick={() => ask('Agents en erreur')}>
                  <b className="num">{status.errors}</b> en erreur
                </button>
                <button type="button" className="as-stat" onClick={() => ask('Coût aujourd’hui')}>
                  <b className="num">{fmtUsd(status.cost)}</b> estimés aujourd’hui
                </button>
                <NatureBadge nature={nature} />
              </p>
              <p className="as-local">
                <IconCheck size={14} /> Réponses calculées localement à partir de vos données, sans modèle d’IA
              </p>
              <div className="as-hero__grid" role="group" aria-label="Questions suggérées">
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" className="as-suggest" onClick={() => ask(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </section>
          ) : (
            <>
              <div className="as-thread-head">
                <span className="t-small t-muted">{history.length} réponse(s) · conservées sur cet appareil{keep ? '' : ' le temps de la session'}</span>
                <button type="button" className="btn btn--sm btn--ghost" onClick={clear}>
                  Nouvelle conversation
                </button>
              </div>
              <ol className="as-thread" aria-label="Conversation">
                {history.map((a) => {
                  const pinned = pins.some((p) => p.id === a.id);
                  return (
                    <li key={a.id} id={`as-${a.id}`} className="as-turn" data-fresh={fresh === a.id || undefined}>
                      <div className="as-q">
                        <p>{a.q}</p>
                        <time className="t-micro">{fmtTime(a.at)}</time>
                      </div>
                      <article className="as-a" aria-label={`Réponse à : ${a.q}`} data-fallback={a.intent === 'fallback' || undefined}>
                        <div className="as-a__head">
                          <Orb size="sm" />
                          {showUnderstood && (
                            <span className="as-understood" aria-label="Ce que j’ai compris">
                              {a.intent === 'fallback' ? (
                                <span className="as-tag as-tag--warn">Question non reconnue</span>
                              ) : (
                                a.understood.map((t) => (
                                  <span key={t} className="as-tag">
                                    {t}
                                  </span>
                                ))
                              )}
                            </span>
                          )}
                        </div>
                        <p className="as-a__text">{a.text}</p>
                        <div className="as-blocks">
                          {a.blocks.map((b, i) => (
                            <Artefact key={i} b={b} host={host} onAsk={ask} />
                          ))}
                        </div>
                        <div className="as-a__foot">
                          <span className="as-a__meta">
                            {a.intent !== 'fallback' && <NatureBadge nature={a.nature} />}
                            <span className="t-micro t-muted">
                              {a.mode === 'replay' ? `État au ${fmtTime(a.at, true)}` : `Calculé à ${fmtTime(a.at)}`} · local, sans modèle
                            </span>
                          </span>
                          <span className="as-a__actions">
                            <button type="button" className="as-act" onClick={() => copy(a)} aria-label="Copier la réponse">
                              {copied === a.id ? <IconCheck size={15} /> : <IconCopy size={15} />}
                              <span>{copied === a.id ? 'Copié' : 'Copier'}</span>
                            </button>
                            {a.intent !== 'fallback' && (
                              <button type="button" className="as-act" aria-pressed={pinned} onClick={() => togglePin(a)} aria-label={pinned ? 'Retirer l’épingle' : 'Épingler la réponse'}>
                                <PinGlyph on={pinned} />
                                <span>{pinned ? 'Épinglée' : 'Épingler'}</span>
                              </button>
                            )}
                            {a.intent !== 'fallback' && (
                              <button type="button" className="as-act" onClick={() => recompute(a)} aria-label="Recalculer avec les données actuelles">
                                <IconReset size={15} />
                                <span>Recalculer</span>
                              </button>
                            )}
                          </span>
                        </div>
                        {a.followUps.length > 0 && (
                          <div className="as-follow" aria-label="Questions liées">
                            {a.followUps.map((f) => (
                              <button key={f} type="button" className="chip" onClick={() => ask(f)}>
                                {f}
                              </button>
                            ))}
                          </div>
                        )}
                      </article>
                    </li>
                  );
                })}
              </ol>
            </>
          )}
        </div>
      </div>

      <div className="as-dock">
        <div className="as-dock__inner">
          {!empty && (
            <div className="as-chips" role="group" aria-label="Questions suggérées">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" className="chip" onClick={() => ask(s)}>
                  {s}
                </button>
              ))}
            </div>
          )}
          <form
            className="as-composer"
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
          >
            <label htmlFor="as-input" className="sr-only">
              Votre question
            </label>
            <textarea
              id="as-input"
              ref={ta}
              rows={1}
              value={input}
              maxLength={300}
              placeholder={mobile ? 'Posez une question…' : 'Posez une question : « coût de la semaine », « agents en erreur »…'}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  ask(input);
                } else if (e.key === 'ArrowUp' && !input && history.length) {
                  e.preventDefault();
                  setInput(history[history.length - 1].q);
                } else if (e.key === 'Escape' && input) {
                  e.stopPropagation();
                  setInput('');
                }
              }}
              aria-describedby="as-hint"
            />
            <button type="submit" className="as-send" disabled={!input.trim()} aria-label="Envoyer la question">
              <SendGlyph />
            </button>
          </form>
          <p id="as-hint" className="as-hint" aria-live="polite">
            {preview ? (
              <>
                <span className="as-hint__label">Compris :</span> {preview.join(' · ')}
              </>
            ) : input.trim() ? (
              'Question non reconnue pour l’instant — Entrée pour voir ce que je sais calculer.'
            ) : mobile ? (
              'Calculé localement à partir de vos données, sans modèle d’IA'
            ) : (
              'Réponses calculées localement à partir de vos données, sans modèle d’IA · Entrée pour envoyer'
            )}
          </p>
        </div>
      </div>
      <span className="sr-only">{g.mode === 'replay' ? `Mode replay : les réponses décrivent l’état au ${fmtTime(g.now, true)}.` : ''}</span>
    </div>
  );
}
