/**
 * Autopilot — recurring jobs inferred from real `automation.run` events.
 * The schedule is never declared by a source: it is inferred from the
 * timestamps (median interval and time of day) and labelled as such. The
 * next run is a projection ("planifié"), not an observed fact.
 */
import type { DataNature, GovEvent } from '@sdk';

const MIN = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

export interface Schedule {
  label: string;
  periodMs?: number;
  /** Local minute of the day for daily/weekly jobs. */
  minuteOfDay?: number;
  weekdaysOnly?: boolean;
  regular: boolean;
}

export interface Job {
  key: string;
  name: string;
  departmentId?: string;
  actorId?: string;
  runs: GovEvent[];
  ok: number;
  failed: number;
  schedule: Schedule;
  last?: GovEvent;
  next?: number;
  nature: DataNature;
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const hhmm = (min: number) => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(Math.round(min % 60)).padStart(2, '0')}`;
const WEEKDAY = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

export function inferSchedule(ts: number[]): Schedule {
  if (ts.length < 2) return { label: 'Récurrence indéterminée : une seule exécution observée', regular: false };
  const gaps = ts.slice(1).map((t, i) => t - ts[i]);
  const m = median(gaps);
  const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  const sd = Math.sqrt(gaps.reduce((a, b) => a + (b - mean) ** 2, 0) / gaps.length);
  const irregular = mean > 0 && sd / mean > 0.35;
  const minutes = ts.map((t) => {
    const d = new Date(t);
    return d.getHours() * 60 + d.getMinutes();
  });
  const mod = median(minutes);
  const spread = Math.max(...minutes.map((x) => Math.abs(x - mod)));
  const prefix = irregular ? 'irrégulier, ' : '';
  if (Math.abs(m - DAY) < 3 * HOUR) {
    const days = ts.map((t) => new Date(t).getDay());
    const span = ts[ts.length - 1] - ts[0];
    const weekdaysOnly = span >= 10 * DAY && days.every((x) => x !== 0 && x !== 6);
    const when = spread <= 45 ? `vers ${hhmm(mod)}` : `autour de ${hhmm(mod)}`;
    return { label: `${prefix}${weekdaysOnly ? 'chaque jour ouvré' : 'chaque jour'} ${when}`, periodMs: DAY, minuteOfDay: mod, weekdaysOnly, regular: !irregular && spread <= 45 };
  }
  if (Math.abs(m - 7 * DAY) < 12 * HOUR) {
    const wd = median(ts.map((t) => new Date(t).getDay()));
    return { label: `${prefix}chaque semaine, le ${WEEKDAY[Math.round(wd)]} vers ${hhmm(mod)}`, periodMs: 7 * DAY, minuteOfDay: mod, regular: !irregular };
  }
  if (m < DAY) {
    const label = m >= HOUR ? `toutes les ${Math.round(m / HOUR)} h environ` : `toutes les ${Math.max(1, Math.round(m / MIN))} min environ`;
    return { label: `${prefix}${label}`, periodMs: m, regular: !irregular };
  }
  return { label: `${prefix}environ tous les ${Math.round(m / DAY)} jours`, periodMs: m, regular: !irregular };
}

export function nextRun(s: Schedule, last: number, now: number): number | undefined {
  if (!s.periodMs) return undefined;
  if (s.minuteOfDay != null && s.periodMs === DAY) {
    const d = new Date(Math.max(now, last));
    d.setHours(Math.floor(s.minuteOfDay / 60), Math.round(s.minuteOfDay % 60), 0, 0);
    while (d.getTime() <= now || d.getTime() <= last || (s.weekdaysOnly && (d.getDay() === 0 || d.getDay() === 6))) d.setDate(d.getDate() + 1);
    return d.getTime();
  }
  let n = last + s.periodMs;
  while (n <= now) n += s.periodMs;
  return n;
}

export function jobsOf(events: readonly GovEvent[], now: number): Job[] {
  const m = new Map<string, GovEvent[]>();
  for (const e of events) {
    if (e.ts > now) break;
    if (e.type !== 'automation.run') continue;
    const key = `${e.actor?.id ?? e.origin.id}::${e.summary ?? 'automatisation'}`;
    if (!m.has(key)) m.set(key, []);
    m.get(key)!.push(e);
  }
  const jobs: Job[] = [];
  for (const [key, runs] of m) {
    const last = runs[runs.length - 1];
    const schedule = inferSchedule(runs.map((r) => r.ts));
    const failed = runs.filter((r) => r.status === 'failed').length;
    jobs.push({
      key,
      name: last.summary ?? 'Automatisation',
      departmentId: last.department,
      actorId: last.actor?.id ?? last.origin.id,
      runs,
      ok: runs.length - failed,
      failed,
      schedule,
      last,
      next: nextRun(schedule, last.ts, now),
      nature: last.nature,
    });
  }
  return jobs.sort((a, b) => (b.last?.ts ?? 0) - (a.last?.ts ?? 0));
}

export function fmtNext(ts: number, now: number): string {
  const d = new Date(ts);
  const n = new Date(now);
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOf(d) - startOf(n)) / DAY);
  const time = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(ts);
  if (diff === 0) return `aujourd’hui ${time}`;
  if (diff === 1) return `demain ${time}`;
  return `${new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' }).format(ts)} ${time}`;
}
