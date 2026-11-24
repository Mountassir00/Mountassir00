// EVENT LAB — flux, files d'attente, occupation (event-lab/docs/07-algorithmes.md §5)
// Modèle fluide minute par minute : aide au dimensionnement, PAS un outil de sécurité de foule.

export const DEFAULT_RATES = { qr_scan: 8, ticket_and_bag: 3, bar_till: 1.5 }; // pers/min/file [param]

export interface ArrivalSlot {
  from_min: number;
  to_min: number;
  share: number;
}

/** Arrivées par minute à partir d'un profil [{from_min, to_min, share}] (minutes depuis l'ouverture). */
export function arrivalsFromProfile(total: number, profile: ArrivalSlot[], horizonMin?: number): number[] {
  const end = horizonMin ?? Math.max(...profile.map((p) => p.to_min));
  const arr: number[] = new Array(end).fill(0);
  const shareSum = profile.reduce((s, p) => s + p.share, 0) || 1;
  for (const p of profile) {
    const len = Math.max(1, p.to_min - p.from_min);
    const perMin = (total * (p.share / shareSum)) / len;
    for (let t = p.from_min; t < p.to_min && t < end; t++) arr[t] += perMin;
  }
  return arr;
}

export interface QueueResult {
  lanes: number;
  mu: number;
  capacityPerMin: number;
  maxQueue: number;
  maxQueueAtMin: number;
  maxWaitMin: number;
  drainAfterMin: number;
  series: number[];
}

/** File d'attente fluide : Q(t+1) = max(0, Q(t) + λ(t) − c·μ). */
export function queue(arrivals: number[], lanes: number, mu: number): QueueResult {
  const cap = lanes * mu;
  let q = 0;
  let maxQ = 0;
  let maxQAt = 0;
  const series: number[] = [];
  for (let t = 0; t < arrivals.length; t++) {
    q = Math.max(0, q + arrivals[t] - cap);
    series.push(q);
    if (q > maxQ) {
      maxQ = q;
      maxQAt = t;
    }
  }
  // Vidange après la dernière arrivée
  let drain = 0;
  while (q > 0 && drain < 1440) {
    q = Math.max(0, q - cap);
    drain++;
  }
  return { lanes, mu, capacityPerMin: cap, maxQueue: Math.round(maxQ), maxQueueAtMin: maxQAt, maxWaitMin: cap ? Math.round((maxQ / cap) * 10) / 10 : Infinity, drainAfterMin: drain, series };
}

export type LanesResult = (QueueResult & { lanes: number; note?: undefined }) | { lanes: null; note: string };

export function lanesNeeded(arrivals: number[], mu: number, targetWaitMin = 10, maxLanes = 50): LanesResult {
  for (let c = 1; c <= maxLanes; c++) {
    const r = queue(arrivals, c, mu);
    // r.lanes === c : même objet (et même ordre de clés) que { lanes: c, ...r } du moteur d’origine
    if (r.maxWaitMin <= targetWaitMin) return { ...r };
  }
  return { lanes: null, note: `Plus de ${maxLanes} files nécessaires : revoir le profil d'arrivée ou le débit.` };
}

export interface OccupancyResult {
  peak: number;
  peakAtMin: number;
  series: number[];
}

/** Présence simultanée : chaque arrivée reste dwell minutes. */
export function occupancy(arrivals: number[], dwellMin: number): OccupancyResult {
  const n = arrivals.length + dwellMin;
  const present: number[] = new Array(n).fill(0);
  // present[t] = Σ arrivées sur ]t − dwell ; t] (somme glissante)
  let window = 0;
  for (let t = 0; t < n; t++) {
    window += arrivals[t] ?? 0;
    if (t - dwellMin >= 0) window -= arrivals[t - dwellMin] ?? 0;
    present[t] = window;
  }
  let peak = 0;
  let peakAt = 0;
  present.forEach((p, t) => {
    if (p > peak) {
      peak = p;
      peakAt = t;
    }
  });
  return { peak: Math.round(peak), peakAtMin: peakAt, series: present };
}

export interface DensityAlert {
  level: 'orange' | 'rouge';
  message: string;
}

/** Densité et alertes indicatives d'une zone. */
export function densityCheck({ people, areaM2, standing = true, authorizedCapacity = null }: { people: number; areaM2: number; standing?: boolean; authorizedCapacity?: number | null }): { density: number; alerts: DensityAlert[] } {
  const density = areaM2 > 0 ? people / areaM2 : Infinity;
  const alerts: DensityAlert[] = [];
  if (standing && density > 2) alerts.push({ level: 'orange', message: `Densité ${density.toFixed(2)} pers/m² > 2 en zone debout (indicatif)` });
  if (authorizedCapacity != null && people > authorizedCapacity) alerts.push({ level: 'rouge', message: `Effectif ${Math.round(people)} > effectif autorisé ${authorizedCapacity} : bloquant` });
  return { density: Math.round(density * 100) / 100, alerts };
}
