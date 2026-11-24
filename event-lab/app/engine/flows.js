// EVENT LAB — flux, files d'attente, occupation (docs/07-algorithmes.md §5)
// Modèle fluide minute par minute : aide au dimensionnement, PAS un outil de sécurité de foule.

export const DEFAULT_RATES = { qr_scan: 8, ticket_and_bag: 3, bar_till: 1.5 }; // pers/min/file [param]

/** Arrivées par minute à partir d'un profil [{from_min, to_min, share}] (minutes depuis l'ouverture). */
export function arrivalsFromProfile(total, profile, horizonMin) {
  const end = horizonMin ?? Math.max(...profile.map((p) => p.to_min));
  const arr = new Array(end).fill(0);
  const shareSum = profile.reduce((s, p) => s + p.share, 0) || 1;
  for (const p of profile) {
    const len = Math.max(1, p.to_min - p.from_min);
    const perMin = (total * (p.share / shareSum)) / len;
    for (let t = p.from_min; t < p.to_min && t < end; t++) arr[t] += perMin;
  }
  return arr;
}

/** File d'attente fluide : Q(t+1) = max(0, Q(t) + λ(t) − c·μ). */
export function queue(arrivals, lanes, mu) {
  const cap = lanes * mu;
  let q = 0, maxQ = 0, maxQAt = 0;
  const series = [];
  for (let t = 0; t < arrivals.length; t++) {
    q = Math.max(0, q + arrivals[t] - cap);
    series.push(q);
    if (q > maxQ) { maxQ = q; maxQAt = t; }
  }
  // Vidange après la dernière arrivée
  let drain = 0;
  while (q > 0 && drain < 1440) { q = Math.max(0, q - cap); drain++; }
  return { lanes, mu, capacityPerMin: cap, maxQueue: Math.round(maxQ), maxQueueAtMin: maxQAt, maxWaitMin: cap ? Math.round((maxQ / cap) * 10) / 10 : Infinity, drainAfterMin: drain, series };
}

export function lanesNeeded(arrivals, mu, targetWaitMin = 10, maxLanes = 50) {
  for (let c = 1; c <= maxLanes; c++) {
    const r = queue(arrivals, c, mu);
    if (r.maxWaitMin <= targetWaitMin) return { lanes: c, ...r };
  }
  return { lanes: null, note: `Plus de ${maxLanes} files nécessaires : revoir le profil d'arrivée ou le débit.` };
}

/** Présence simultanée : chaque arrivée reste dwell minutes. */
export function occupancy(arrivals, dwellMin) {
  const n = arrivals.length + dwellMin;
  const present = new Array(n).fill(0);
  // present[t] = Σ arrivées sur ]t − dwell ; t] (somme glissante)
  let window = 0;
  for (let t = 0; t < n; t++) {
    window += arrivals[t] ?? 0;
    if (t - dwellMin >= 0) window -= arrivals[t - dwellMin] ?? 0;
    present[t] = window;
  }
  let peak = 0, peakAt = 0;
  present.forEach((p, t) => { if (p > peak) { peak = p; peakAt = t; } });
  return { peak: Math.round(peak), peakAtMin: peakAt, series: present };
}

/** Densité et alertes indicatives d'une zone. */
export function densityCheck({ people, areaM2, standing = true, authorizedCapacity = null }) {
  const density = areaM2 > 0 ? people / areaM2 : Infinity;
  const alerts = [];
  if (standing && density > 2) alerts.push({ level: 'orange', message: `Densité ${density.toFixed(2)} pers/m² > 2 en zone debout (indicatif)` });
  if (authorizedCapacity != null && people > authorizedCapacity) alerts.push({ level: 'rouge', message: `Effectif ${Math.round(people)} > effectif autorisé ${authorizedCapacity} : bloquant` });
  return { density: Math.round(density * 100) / 100, alerts };
}
