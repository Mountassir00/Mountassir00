// EVENT LAB — besoins en personnel et chemin critique du montage (event-lab/docs/07-algorithmes.md §6)

export const DEFAULT_RATIOS = {
  orientation_per_spectators: 150, // 1 personne d'orientation pour N spectateurs présents [param]
  bar_staff_per_till: 2, // 1 caisse + 1 préparation [param]
};

export interface StaffNeedRow {
  fn: string;
  count: number | null;
  basis: string;
}

/**
 * Besoins indicatifs par fonction. La sécurité et le secours ne sont JAMAIS calculés ici :
 * ils relèvent d'un dimensionnement réglementaire externe (prestataire agréé, autorités).
 */
export function staffNeeds(p: { peakPresent?: number; entryLanes?: number; barTills?: number; competitionUnits?: number; officialsPerUnit?: number }): { rows: StaffNeedRow[]; totalExcludingSafety: number } {
  const rows: StaffNeedRow[] = [];
  rows.push({ fn: 'Accueil / contrôle', count: (p.entryLanes ?? 1) + 1, basis: `${p.entryLanes ?? 1} file(s) + 1 superviseur` });
  rows.push({ fn: 'Orientation / placement', count: Math.max(1, Math.ceil((p.peakPresent ?? 0) / DEFAULT_RATIOS.orientation_per_spectators)), basis: `1 pour ${DEFAULT_RATIOS.orientation_per_spectators} présents au pic (${p.peakPresent ?? 0})` });
  rows.push({ fn: 'Buvette', count: (p.barTills ?? 1) * DEFAULT_RATIOS.bar_staff_per_till, basis: `${p.barTills ?? 1} caisse(s) × ${DEFAULT_RATIOS.bar_staff_per_till}` });
  rows.push({ fn: 'Compétition (arbitrage, table, chrono)', count: (p.competitionUnits ?? 1) * (p.officialsPerUnit ?? 2), basis: `${p.competitionUnits ?? 1} unité(s) × ${p.officialsPerUnit ?? 2}` });
  rows.push({ fn: 'Sécurité / secours', count: null, basis: 'Dimensionnement réglementaire externe (prestataire agréé, référentiel applicable) — non calculé' });
  return { rows, totalExcludingSafety: rows.reduce((s, r) => s + (r.count ?? 0), 0) };
}

export interface CpmTask {
  id: string;
  duration: number;
  depends_on?: string[];
  label?: string;
}

export interface CpmRow {
  id: string;
  label: string;
  duration: number;
  earliestStart: number;
  earliestFinish: number;
  slack: number;
  critical: boolean;
}

/** Méthode du chemin critique. */
export function criticalPath(tasks: CpmTask[]): { totalDuration: number; rows: CpmRow[]; criticalPath: string[] } {
  const byId = new Map(tasks.map((t) => [t.id, { ...t, depends_on: t.depends_on ?? [] }]));
  for (const t of byId.values()) for (const d of t.depends_on) if (!byId.has(d)) throw new Error(`Dépendance inconnue ${d} pour ${t.id}`);
  // Tri topologique (Kahn)
  const indeg = new Map<string, number>([...byId.keys()].map((k) => [k, 0]));
  for (const t of byId.values()) for (let i = 0; i < t.depends_on.length; i++) indeg.set(t.id, indeg.get(t.id)! + 1);
  const order: string[] = [];
  const pending = [...[...indeg].filter(([, v]) => v === 0).map(([k]) => k)];
  const succ = new Map<string, string[]>([...byId.keys()].map((k) => [k, []]));
  for (const t of byId.values()) for (const d of t.depends_on) succ.get(d)!.push(t.id);
  while (pending.length) {
    const k = pending.shift()!;
    order.push(k);
    for (const s of succ.get(k)!) {
      indeg.set(s, indeg.get(s)! - 1);
      if (indeg.get(s) === 0) pending.push(s);
    }
  }
  if (order.length !== byId.size) throw new Error('Cycle détecté dans les dépendances');
  const es = new Map<string, number>();
  const ef = new Map<string, number>();
  for (const k of order) {
    const t = byId.get(k)!;
    const start = t.depends_on.length ? Math.max(...t.depends_on.map((d) => ef.get(d)!)) : 0;
    es.set(k, start);
    ef.set(k, start + t.duration);
  }
  const total = Math.max(0, ...ef.values());
  const ls = new Map<string, number>();
  const lf = new Map<string, number>();
  for (const k of [...order].reverse()) {
    const t = byId.get(k)!;
    const finish = succ.get(k)!.length ? Math.min(...succ.get(k)!.map((s) => ls.get(s)!)) : total;
    lf.set(k, finish);
    ls.set(k, finish - t.duration);
  }
  const rows = order.map((k) => ({
    id: k,
    label: byId.get(k)!.label ?? k,
    duration: byId.get(k)!.duration,
    earliestStart: es.get(k)!,
    earliestFinish: ef.get(k)!,
    slack: ls.get(k)! - es.get(k)!,
    critical: ls.get(k)! - es.get(k)! === 0,
  }));
  return { totalDuration: total, rows, criticalPath: rows.filter((r) => r.critical).map((r) => r.id) };
}
