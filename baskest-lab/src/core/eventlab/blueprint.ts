// EVENT LAB — rendu Markdown des sections générées d'un blueprint (event-lab/docs/08-modeles-documentaires.md)
// Les fonctions « structurées » (flowAnalysis, cashByDay, standardIncidents) alimentent à la fois le Markdown
// et l'application : un seul calcul, deux présentations.
import { simulateAll, breakeven, cashflow, sensitivity, SCENARIOS } from './finance';
import { simulateCompetition, type CompetitionResult } from './competition';
import { arrivalsFromProfile, occupancy, lanesNeeded, densityCheck, DEFAULT_RATES, type DensityAlert } from './flows';
import { criticalPath } from './staffing';
import { evaluate, CRITERIA, type EvaluationResult } from './scoring';
import { applyVariant, variantIds, variantLabel } from './variants';
import { runIncident, type Incident, type IncidentResult } from './incidents';
import type { Basis, Config, EquipmentSource, ScenarioKey } from './types';

const nf = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
export const eur = (x: number | null | undefined) => (x == null ? '—' : `${nf.format(Math.round(x))} €`);
export const num = (x: number | null | undefined, d = 0) => (x == null ? '—' : new Intl.NumberFormat('fr-FR', { maximumFractionDigits: d }).format(x));
export const pct = (x: number | null | undefined) => (x == null ? '—' : `${num(x * 100)} %`);
export const hhmm = (min: number) => {
  const day = Math.floor(min / 1440);
  const m = ((min % 1440) + 1440) % 1440;
  const s = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  return day < 0 ? `J${day} ${s}` : s;
};
export const dayLabel = (d: number | null | undefined) => (d == null ? '—' : `J${d >= 0 ? '+' : ''}${d}`);
const esc = (s: unknown) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
/** Équivalent exact de `x >= 0` du moteur d'origine pour une valeur éventuellement absente (undefined → faux). */
const nonNeg = (x: number | undefined) => x !== undefined && x >= 0;

export function table(headers: unknown[], rows: unknown[][], align?: ('l' | 'r' | 'c')[]): string {
  const a = align ?? headers.map(() => 'l');
  const sep = a.map((x) => (x === 'r' ? '---:' : x === 'c' ? ':---:' : '---'));
  return [`| ${headers.map(esc).join(' | ')} |`, `| ${sep.join(' | ')} |`, ...rows.map((r) => `| ${r.map(esc).join(' | ')} |`)].join('\n');
}

export const CERT_LABEL: Record<string, string> = { devis: 'Devis', estimation: 'Estimation', hypothese: 'Hypothèse', secured: 'Sécurisée', probable: 'Probable', hypothetical: 'Hypothétique' };
export const BASIS_LABEL: Record<Basis, string> = { fixed: 'Forfait', per_attendee: 'Par spectateur', per_paying_attendee: 'Par spectateur payant', per_participant: 'Par équipe/participant' };
export const SC_LABEL: Record<ScenarioKey, string> = { prudent: 'Prudent', central: 'Central', ambitieux: 'Ambitieux' };
export const STAGE_TYPE_LABEL: Record<string, string> = { time_trial: 'Passages chronométrés', round_robin: 'Poules', single_elimination: 'Élimination directe', double_elimination: 'Double élimination', swiss: 'Ronde suisse', battle_royale: 'Battle royale', custom: 'Personnalisé' };
export const EQUIPMENT_SOURCE_LABEL: Record<EquipmentSource, string> = { possede: 'Possédé', lieu: 'Fourni par le lieu', location: 'Location', achat: 'Achat', pret_partenaire: 'Prêt partenaire', sponsor: 'Sponsor' };
export const GATE_LABEL: Record<string, string> = { ok: 'OK', a_verifier: 'À vérifier', bloquant: 'BLOQUANT' };
export const VERDICT_LABEL: Record<string, string> = { eligible: 'Éligible', sous_reserve: 'Sous réserve', elimine: 'Éliminé' };
export const EVIDENCE_LABEL: Record<string, string> = { donnees_reelles: 'Données réelles', benchmark_source: 'Benchmark sourcé', jugement_expert: 'Jugement expert' };

export function budgetTable(config: Config): string {
  const rows = (config.budget?.expenses ?? []).map((e) => [e.id, e.category, e.label, e.basis === 'fixed' ? eur(e.amount) : `${num(e.amount, 2)} €`, BASIS_LABEL[e.basis], CERT_LABEL[e.certainty as string] ?? '—', e.priority ?? 2, e.optional ? 'oui' : 'non', `J${nonNeg(e.pay_offset_days) ? '+' : ''}${e.pay_offset_days ?? 0}`]);
  return table(['Id', 'Catégorie', 'Poste', 'Montant', 'Base', 'Certitude', 'Priorité', 'Optionnel', 'Paiement'], rows, ['l', 'l', 'l', 'r', 'l', 'l', 'c', 'c', 'c']);
}

export function revenueTable(config: Config): string {
  const rows = (config.budget?.revenues ?? []).map((r) => [r.id, r.stream, r.label, r.basis === 'fixed' ? eur(r.unit_amount) : `${num(r.unit_amount, 2)} €`, BASIS_LABEL[r.basis], CERT_LABEL[r.certainty], `J${(r.cash_offset_days ?? 0) >= 0 ? '+' : ''}${r.cash_offset_days ?? 0}`]);
  return table(['Id', 'Flux', 'Recette', 'Montant unitaire', 'Base', 'Certitude', 'Encaissement'], rows, ['l', 'l', 'l', 'r', 'l', 'l', 'c']);
}

export function scenarioTable(config: Config): string {
  const all = simulateAll(config);
  const line = (label: string, f: (s: (typeof all)[ScenarioKey]) => string) => [label, ...SCENARIOS.map((s) => f(all[s]))];
  return table(
    ['', ...SCENARIOS.map((s) => SC_LABEL[s])],
    [
      line('Spectateurs uniques', (s) => num(s.volumes.attendance)),
      line('Équipes', (s) => num(s.volumes.participants)),
      line('Recettes sécurisées', (s) => eur(s.revenueByCertainty.secured)),
      line('Recettes probables (après taux de réalisation)', (s) => eur(s.revenueByCertainty.probable)),
      line('Recettes hypothétiques (après taux de réalisation)', (s) => eur(s.revenueByCertainty.hypothetical)),
      line('**Total recettes**', (s) => `**${eur(s.totals.revenue)}**`),
      line('Dépenses (dérive incluse)', (s) => eur(s.totals.expenses_before_contingency)),
      line('Provision pour aléas', (s) => eur(s.totals.contingency)),
      line('**Total dépenses**', (s) => `**${eur(s.totals.expenses)}**`),
      line('**Résultat**', (s) => `**${eur(s.totals.result)}**`),
    ],
    ['l', 'r', 'r', 'r'],
  );
}

export interface VariantSummary {
  id: string;
  label: string;
  expensesCentral: number;
  results: Record<ScenarioKey, number>;
  breakevenCentral: number | null;
  cashNeedCentral: number;
}

/** Comparaison chiffrée des variantes (scénario central pour le seuil et la trésorerie). */
export function variantSummaries(config: Config): VariantSummary[] {
  return variantIds(config).map((id) => {
    const cfg = applyVariant(config, id);
    const all = simulateAll(cfg);
    return {
      id,
      label: variantLabel(config, id),
      expensesCentral: all.central.totals.expenses,
      results: Object.fromEntries(SCENARIOS.map((s) => [s, all[s].totals.result])) as Record<ScenarioKey, number>,
      breakevenCentral: breakeven(cfg, 'central').attendance,
      cashNeedCentral: cashflow(cfg, 'central').maxNeed,
    };
  });
}

export function variantComparisonTable(config: Config): string {
  const rows = variantSummaries(config).map((v) => [
    v.label,
    eur(v.expensesCentral),
    ...SCENARIOS.map((s) => eur(v.results[s])),
    v.breakevenCentral == null ? 'inatteignable' : v.breakevenCentral === 0 ? 'aucun (couvert)' : num(v.breakevenCentral),
    eur(v.cashNeedCentral),
  ]);
  return table(['Configuration', 'Dépenses (central)', 'Résultat prudent', 'Résultat central', 'Résultat ambitieux', 'Seuil (spectateurs, central)', 'Besoin de trésorerie (central)'], rows, ['l', 'r', 'r', 'r', 'r', 'r', 'r']);
}

export function breakevenText(config: Config): string {
  return SCENARIOS.map((s) => {
    const b = breakeven(config, s);
    const label = SC_LABEL[s];
    if (b.attendance == null || (b.attendance === 0 && b.note)) return `- **${label}** : ${b.attendance === 0 ? 'pas de seuil — les recettes indépendantes de la fréquentation couvrent déjà les coûts fixes' : b.note} (écart fixe ${eur(b.fixedGap)}).`;
    return `- **${label}** : seuil à **${num(b.attendance)} spectateurs uniques** (écart fixe à couvrir ${eur(b.fixedGap)}, marge par spectateur ${num(b.unitMargin, 2)} €).`;
  }).join('\n');
}

export interface CashDay {
  day: number;
  out: number;
  in: number;
  low: number;
  cum: number;
}

/**
 * Trésorerie agrégée par jour. Point bas intra-journée : les décaissements d'un jour sont comptés
 * avant ses encaissements (hypothèse prudente, ordre du plan de trésorerie).
 */
export function cashByDay(config: Config, scenario: ScenarioKey = 'central'): { days: CashDay[]; maxNeed: number; maxNeedDay: number | null; final: number } {
  const c = cashflow(config, scenario);
  const byDay = new Map<number, { out: number; in: number; cum: number; low: number }>();
  for (const f of c.timeline) {
    const k = f.day;
    const cur = byDay.get(k) ?? { out: 0, in: 0, cum: 0, low: Infinity };
    if (f.amount < 0) cur.out += f.amount;
    else cur.in += f.amount;
    cur.cum = f.cumulative;
    cur.low = Math.min(cur.low, f.cumulative);
    byDay.set(k, cur);
  }
  return { days: [...byDay.entries()].map(([day, v]) => ({ day, ...v })), maxNeed: c.maxNeed, maxNeedDay: c.maxNeedDay, final: c.final };
}

export function cashTable(config: Config, scenario: ScenarioKey = 'central'): { table: string; maxNeed: number; maxNeedDay: number | null } {
  const c = cashByDay(config, scenario);
  const rows = c.days.map((v) => [dayLabel(v.day), eur(-v.out), eur(v.in), eur(v.low), eur(v.cum)]);
  return { table: table(['Date', 'Décaissements', 'Encaissements', 'Point bas du jour', 'Solde en fin de jour'], rows, ['c', 'r', 'r', 'r', 'r']), maxNeed: c.maxNeed, maxNeedDay: c.maxNeedDay };
}

export function sensitivityTable(config: Config): string {
  const s = sensitivity(config);
  return table(['Facteur', 'Variation testée', 'Impact si baisse', 'Impact si hausse', 'Amplitude'], s.items.map((i) => [i.label, `± ${pct(i.range)}`, eur(i.low), eur(i.high), eur(i.swing)]), ['l', 'c', 'r', 'r', 'r']);
}

export function competitionTable(config: Config): { table: string; total: CompetitionResult } {
  const c = simulateCompetition(config);
  const rows = c.stages.map((s) => [s.label, STAGE_TYPE_LABEL[s.type] ?? s.type, num(s.matches), num(s.rounds), num(s.slots), `${num(s.slotMin, 1)} min`, `${num(s.netMin, 1)} min`, `${num(s.withMarginMin)} min`, pct(s.utilization)]);
  return { table: table(['Étape', 'Type', 'Matchs / passages', 'Tours', 'Créneaux', 'Créneau', 'Durée nette', 'Avec marge 15 %', 'Occupation des unités'], rows, ['l', 'l', 'r', 'r', 'r', 'r', 'r', 'r', 'r']), total: c };
}

export interface FlowRow {
  scenario: ScenarioKey;
  attendance: number;
  peakSpectators: number;
  peakAtMin: number;
  /** Heure du pic en minutes depuis 00:00 de J. */
  peakClockMin: number;
  peakTotal: number;
  participantsPresent: number;
  staffCount: number;
  authorizedCapacity: number | null;
  qrLanes: number | null;
  cashLanes: number | null;
  qrMaxWaitMin: number | null;
  alerts: DensityAlert[];
}

/**
 * Flux par scénario (07 §5) : pic de présence, files nécessaires (attente ≤ 10 min), alertes indicatives.
 * Renvoie null si la configuration n'a pas de profil d'arrivée.
 */
export function flowAnalysis(config: Config): FlowRow[] | null {
  if (!config.audience?.arrival_profile) return null;
  const out: FlowRow[] = [];
  const staffCount = (config.resources?.staff ?? []).reduce((s, x) => s + (x.count ?? 0), 0);
  for (const s of SCENARIOS) {
    const A = config.audience?.attendance?.[s] ?? 0;
    const arr = arrivalsFromProfile(A, config.audience.arrival_profile);
    const occ = occupancy(arr, config.audience.avg_dwell_min ?? 120);
    const qr = lanesNeeded(arr, DEFAULT_RATES.qr_scan, 10);
    const cashLanes = lanesNeeded(arr, 2, 10);
    const teamsP = (config.participants?.count?.[s] ?? 0) * (config.participants?.team_size ?? 1);
    const total = occ.peak + teamsP + staffCount;
    const cap = config.venue?.erp?.effectif_autorise ?? null;
    const dens = densityCheck({ people: total, areaM2: (config.venue?.dimensions?.width_m ?? 0) * (config.venue?.dimensions?.length_m ?? 0), authorizedCapacity: cap, standing: false });
    out.push({
      scenario: s,
      attendance: A,
      peakSpectators: occ.peak,
      peakAtMin: occ.peakAtMin,
      peakClockMin: (config.audience?.doors_open_min ?? 570) + occ.peakAtMin,
      peakTotal: total,
      participantsPresent: teamsP,
      staffCount,
      authorizedCapacity: cap,
      qrLanes: qr.lanes,
      cashLanes: cashLanes.lanes,
      qrMaxWaitMin: qr.lanes == null ? null : qr.maxWaitMin,
      alerts: dens.alerts,
    });
  }
  return out;
}

export function flowSummary(config: Config): string {
  const rows = (flowAnalysis(config) ?? []).map((r) => [
    SC_LABEL[r.scenario],
    num(r.attendance),
    num(r.peakSpectators),
    hhmm(r.peakClockMin),
    num(r.peakTotal),
    r.authorizedCapacity ? `${pct(r.peakTotal / r.authorizedCapacity)} de ${num(r.authorizedCapacity)}` : '—',
    r.qrLanes ?? '> 50',
    r.cashLanes ?? '> 50',
    r.alerts.length ? r.alerts.map((a) => a.level).join(', ') : 'aucune',
  ]);
  return table(['Scénario', 'Spectateurs uniques', 'Pic de spectateurs présents', 'Heure du pic', 'Pic total (spectateurs + joueurs + staff)', 'Part de l’effectif autorisé (hypothèse)', 'Files QR nécessaires (attente ≤ 10 min)', 'Files paiement sur place', 'Alertes'], rows, ['l', 'r', 'r', 'c', 'r', 'r', 'c', 'c', 'l']);
}

export function staffTable(config: Config): { table: string; volunteers: number; professionals: number } {
  const ST: Record<string, string> = { salarie: 'Salarié', prestataire: 'Prestataire', benevole: 'Bénévole', partenaire: 'Partenaire' };
  const rows = (config.resources?.staff ?? []).map((s) => [s.role, s.count === 0 && s.ratio_note ? 'externe' : num(s.count), ST[s.status as string] ?? '—', s.hours ? `${num(s.hours)} h` : '—', s.ratio_note ?? '']);
  const vol = (config.resources?.staff ?? []).filter((s) => s.status === 'benevole').reduce((a, s) => a + s.count, 0);
  const pro = (config.resources?.staff ?? []).filter((s) => s.status !== 'benevole').reduce((a, s) => a + s.count, 0);
  return { table: table(['Rôle', 'Effectif', 'Statut', 'Heures', 'Note'], rows, ['l', 'c', 'l', 'r', 'l']), volunteers: vol, professionals: pro };
}

export function equipmentTable(config: Config): { table: string; powerW: number } {
  const rows = (config.resources?.equipment ?? []).map((e) => [e.item, num(e.qty), EQUIPMENT_SOURCE_LABEL[e.source as EquipmentSource] ?? '—', e.power_w ? `${num(e.power_w)} W` : '—', e.notes ?? '']);
  const power = (config.resources?.equipment ?? []).reduce((s, e) => s + (e.power_w ?? 0) * (e.qty ?? 0), 0);
  return { table: table(['Matériel', 'Qté', 'Provenance', 'Puissance', 'Note'], rows, ['l', 'r', 'l', 'r', 'l']), powerW: power };
}

export function setupCriticalPath(config: Config): { table: string; total: number } | null {
  const tasks = (config.program ?? [])
    .filter((p) => p.kind === 'montage')
    .map((p) => ({ id: p.id, label: p.label, duration: p.duration_min, depends_on: (p.depends_on ?? []).filter((d) => (config.program ?? []).find((x) => x.id === d && x.kind === 'montage')) }));
  if (!tasks.length) return null;
  const r = criticalPath(tasks);
  return { table: table(['Tâche', 'Durée', 'Début au plus tôt', 'Marge', 'Critique'], r.rows.map((x) => [x.label, `${x.duration} min`, `+${x.earliestStart} min`, `${x.slack} min`, x.critical ? 'oui' : 'non']), ['l', 'r', 'r', 'r', 'c']), total: r.totalDuration };
}

export function conducteurTable(config: Config): string {
  const KIND: Record<string, string> = { montage: 'Montage', accueil: 'Accueil', competition: 'Compétition', show: 'Show', ceremonie: 'Cérémonie', pause: 'Pause', animation: 'Animation', demontage: 'Démontage', media: 'Média' };
  const spaces = Object.fromEntries((config.venue?.spaces ?? []).map((s) => [s.id, s.label]));
  const rows = [...(config.program ?? [])]
    .sort((a, b) => a.start_min - b.start_min)
    .map((p) => [hhmm(p.start_min), hhmm(p.start_min + p.duration_min), `${p.duration_min} min`, p.label, KIND[p.kind] ?? p.kind, spaces[p.space as string] ?? p.space ?? '—', p.owner_role ?? '—', (p.cues ?? []).join(' · '), p.critical ? 'oui' : '']);
  return table(['Début', 'Fin', 'Durée', 'Séquence', 'Type', 'Espace', 'Responsable', 'Tops', 'Critique'], rows, ['c', 'c', 'r', 'l', 'l', 'l', 'l', 'l', 'c']);
}

export function milestonesTable(config: Config): string {
  const rows = [...(config.milestones ?? [])].sort((a, b) => a.offset_days - b.offset_days).map((m) => [`J${m.offset_days >= 0 ? '+' : ''}${m.offset_days}`, m.label, m.owner_role ?? '—', m.deliverable ?? '—', m.go_no_go ?? '']);
  return table(['Échéance', 'Jalon', 'Responsable', 'Livrable', 'Critère go / no-go'], rows, ['c', 'l', 'l', 'l', 'l']);
}

export const RISK_CATEGORY_LABEL: Record<string, string> = { securite: 'Sécurité', reglementaire: 'Réglementaire', operationnel: 'Opérationnel', financier: 'Financier', meteo: 'Météo', technique: 'Technique', reputationnel: 'Réputation', juridique: 'Juridique', sante: 'Santé', environnement: 'Environnement' };

export function riskMatrix(config: Config): { table: string; grid: string } {
  const CAT = RISK_CATEGORY_LABEL;
  const risks = [...(config.risks ?? [])].sort((a, b) => b.probability * b.impact - a.probability * a.impact);
  const rows = risks.map((r) => [r.id, CAT[r.category] ?? r.category, r.description, r.probability, r.impact, r.probability * r.impact, r.critical ? 'oui' : '', (r.prevention ?? []).join(' ; '), r.owner_role ?? '—']);
  // Grille 5 × 5
  const grid: string[][] = [];
  for (let i = 5; i >= 1; i--) {
    grid.push([`Impact ${i}`, ...[1, 2, 3, 4, 5].map((p) => risks.filter((r) => r.impact === i && r.probability === p).map((r) => r.id).join(', ') || '·')]);
  }
  return {
    table: table(['Id', 'Catégorie', 'Risque', 'P', 'I', 'P×I', 'Critique', 'Prévention', 'Responsable'], rows, ['l', 'l', 'l', 'c', 'c', 'c', 'c', 'l', 'l']),
    grid: table(['', 'Proba 1', 'Proba 2', 'Proba 3', 'Proba 4', 'Proba 5'], grid, ['l', 'c', 'c', 'c', 'c', 'c']),
  };
}

export function continuityTable(config: Config): string {
  const rows = (config.risks ?? []).filter((r) => r.continuity_plan).map((r) => [r.id, r.description, (r.warning_signs ?? []).join(' ; ') || '—', r.continuity_plan, r.owner_role ?? '—']);
  return table(['Id', 'Situation', 'Signes précurseurs', 'Plan de continuité', 'Décideur'], rows);
}

/** Les huit incidents types simulés dans chaque blueprint (paramètres fixes, documentés dans le tableau). */
export const STANDARD_INCIDENTS: (Incident & { label: string })[] = [
  { type: 'delay', minutes: 30, fromMin: 780, label: 'Retard de 30 min au début des poules' },
  { type: 'delay', minutes: 60, fromMin: 780, label: 'Retard de 60 min au début des poules' },
  { type: 'dropout', count: 3, label: '3 équipes forfait' },
  { type: 'it_failure', label: 'Panne informatique (écran, chronométrage numérique)' },
  { type: 'power_failure', label: 'Défaillance électrique' },
  { type: 'attendance_change', rate: -0.4, label: 'Affluence −40 %' },
  { type: 'attendance_change', rate: 0.3, label: 'Affluence +30 %' },
  { type: 'budget_cut', rate: 0.25, label: 'Réduction de budget de 25 %' },
];

export function standardIncidents(config: Config): { incident: (typeof STANDARD_INCIDENTS)[number]; result: IncidentResult; summary: string }[] {
  return STANDARD_INCIDENTS.map((c) => {
    const r = runIncident(config, c);
    const extra = c.type === 'delay' ? ` (retard résiduel ${r.details.residualDelayMin} min)` : c.type === 'budget_cut' && r.details.uncovered ? ` (reste ${eur(r.details.uncovered)} non couverts)` : '';
    return { incident: c, result: r, summary: r.actions.slice(0, 4).join(' ; ') + (r.actions.length > 4 ? ' ; …' : '') + extra };
  });
}

export function incidentsTable(config: Config): string {
  const rows = standardIncidents(config).map(({ incident: c, result: r, summary }) => [c.label, summary, eur(r.impact.financialResultDelta), `${r.impact.competitionDurationDeltaMin >= 0 ? '+' : ''}${r.impact.competitionDurationDeltaMin} min`]);
  return table(['Incident simulé', 'Réponse générée par le moteur', 'Impact sur le résultat (central)', 'Impact sur la durée de compétition'], rows, ['l', 'l', 'r', 'r']);
}

export const COMPLIANCE_STATUS_LABEL: Record<string, string> = { a_verifier: 'À vérifier', en_cours: 'En cours', conforme: 'Conforme', non_conforme: 'Non conforme', non_applicable: 'Non applicable' };

export function complianceTable(config: Config): string {
  const ST = COMPLIANCE_STATUS_LABEL;
  const rows = [...(config.compliance ?? [])]
    .sort((a, b) => (a.deadline_offset_days ?? 0) - (b.deadline_offset_days ?? 0))
    .map((c) => [c.id, c.item, c.authority ?? '—', c.mandatory ? 'oui' : 'non', ST[c.status] ?? c.status, c.deadline_offset_days != null ? `J${c.deadline_offset_days}` : '—']);
  return table(['Id', 'Point', 'Interlocuteur', 'Obligatoire', 'Statut', 'Échéance'], rows, ['l', 'l', 'l', 'c', 'l', 'c']);
}

export function kpiTable(config: Config): string {
  const PH: Record<string, string> = { avant: 'Avant', pendant: 'Pendant', apres: 'Après' };
  const fmt = (k: { target: number | string; unit?: string }) => (typeof k.target !== 'number' ? k.target : /ratio|part/.test(k.unit ?? '') ? pct(k.target) : num(k.target, 2));
  const rows = (config.kpis ?? []).map((k) => [k.id, PH[k.phase as string] ?? '—', k.label, fmt(k), k.unit ?? '', k.measure ?? '', k.actual ?? '—']);
  return table(['Id', 'Phase', 'Indicateur', 'Cible', 'Unité', 'Mesure', 'Réel'], rows, ['l', 'l', 'l', 'r', 'l', 'l', 'r']);
}

export function scoreTable(config: Config): { table: string; gates: string; summary: EvaluationResult; verdictLabel: string } {
  const e = evaluate(config);
  const ratings = config.evaluation!.ratings;
  const rows = CRITERIA.map((c) => [c.label, c.weight, num(ratings[c.key].rating, 1), num((c.weight * ratings[c.key].rating) / 5, 1), EVIDENCE_LABEL[ratings[c.key].evidence ?? 'jugement_expert'], ratings[c.key].justification]);
  return {
    table: table(['Critère', 'Poids', 'Note /5', 'Points', 'Niveau de preuve', 'Justification'], rows, ['l', 'c', 'c', 'r', 'l', 'l']),
    gates: table(
      ['Porte éliminatoire', 'Statut', 'Notes'],
      [
        ['Sécurité', GATE_LABEL[e.gates.securite.status], e.gates.securite.notes ?? ''],
        ['Conformité réglementaire', GATE_LABEL[e.gates.conformite_reglementaire.status], e.gates.conformite_reglementaire.notes ?? ''],
        ['Risques critiques', GATE_LABEL[e.gates.risques_critiques.status], e.gates.risques_critiques.notes ?? ''],
      ],
    ),
    summary: e,
    verdictLabel: VERDICT_LABEL[e.verdict],
  };
}

export function sourcesList(config: Config): string {
  if (!config.sources?.length) return '_Aucune source enregistrée dans la configuration._';
  return config.sources.map((s) => `- [${s.id}] ${s.title}${s.publisher ? ` — ${s.publisher}` : ''}${s.url ? ` — <${s.url}>` : ''}${s.accessed_at ? ` (consulté le ${s.accessed_at})` : ''}${s.reliability ? ` · fiabilité ${s.reliability}` : ''}`).join('\n');
}

export function historyTable(config: Config): string {
  return table(['Version', 'Date', 'Auteur', 'Résumé', 'Décisions', 'Approuvé par'], (config.history ?? []).map((h) => [h.version, h.date, h.author ?? '—', h.summary, (h.decisions ?? []).join(' ; '), h.approved_by ?? 'non approuvée']));
}

export interface BlueprintSummary {
  score: number;
  grade: string;
  confidence: number;
  verdict: string;
  verdictLabel: string;
  results: Record<ScenarioKey, number>;
  revenueCentral: number;
  expensesCentral: number;
  breakevenCentral: number | null;
  cashNeedCentral: number;
  cashNeedDay: string;
  competitionNetMin: number;
  competitionWithMarginMin: number;
  volunteers: number;
  professionals: number;
  powerW: number;
  setupMin: number | null;
  variants: Record<string, { expensesCentral: number; results: Record<ScenarioKey, number>; breakevenCentral: number | null; cashNeedCentral: number }>;
}

/** Toutes les sections générées, indexées par clé, + un résumé chiffré. */
export function renderGenerated(config: Config): { sections: Record<string, string>; summary: BlueprintSummary } {
  const comp = competitionTable(config);
  const cash = cashTable(config);
  const staff = staffTable(config);
  const equip = equipmentTable(config);
  const setup = setupCriticalPath(config);
  const risk = riskMatrix(config);
  const score = scoreTable(config);
  const all = simulateAll(config);
  const sections: Record<string, string> = {
    score: score.table,
    gates: score.gates,
    scenarios: scenarioTable(config),
    variants: variantComparisonTable(config),
    breakeven: breakevenText(config),
    cash: cash.table,
    sensitivity: sensitivityTable(config),
    budget: budgetTable(config),
    revenues: revenueTable(config),
    competition: comp.table,
    flows: flowSummary(config),
    staff: staff.table,
    equipment: equip.table,
    setup: setup?.table ?? '',
    conducteur: conducteurTable(config),
    milestones: milestonesTable(config),
    risks: risk.table,
    riskGrid: risk.grid,
    continuity: continuityTable(config),
    incidents: incidentsTable(config),
    compliance: complianceTable(config),
    kpis: kpiTable(config),
    sources: sourcesList(config),
    history: historyTable(config),
  };
  const summary: BlueprintSummary = {
    score: score.summary.score,
    grade: score.summary.grade,
    confidence: score.summary.confidence,
    verdict: score.summary.verdict,
    verdictLabel: score.verdictLabel,
    results: Object.fromEntries(SCENARIOS.map((s) => [s, all[s].totals.result])) as Record<ScenarioKey, number>,
    revenueCentral: all.central.totals.revenue,
    expensesCentral: all.central.totals.expenses,
    breakevenCentral: breakeven(config, 'central').attendance,
    cashNeedCentral: cash.maxNeed,
    cashNeedDay: dayLabel(cash.maxNeedDay),
    competitionNetMin: comp.total.totalNetMin,
    competitionWithMarginMin: comp.total.totalWithMarginMin,
    volunteers: staff.volunteers,
    professionals: staff.professionals,
    powerW: equip.powerW,
    setupMin: setup?.total ?? null,
    variants: Object.fromEntries(variantSummaries(config).map((v) => [v.id, { expensesCentral: v.expensesCentral, results: v.results, breakevenCentral: v.breakevenCentral, cashNeedCentral: v.cashNeedCentral }])),
  };
  return { sections, summary };
}

/**
 * Assemble le dossier BLUEPRINT.md à partir du narratif : remplace les marqueurs <!-- @gen:clé --> par les sections
 * générées et les {{summary.…}} / {{config.…}} par les valeurs. Renvoie aussi les marqueurs non résolus.
 */
export function assembleBlueprint(narrative: string, sections: Record<string, string>, summary: BlueprintSummary, config: Config): { markdown: string; missing: string[] } {
  const missing: string[] = [];
  let md = narrative.replace(/<!--\s*@gen:([a-zA-Z]+)\s*-->/g, (_, k: string) => {
    if (!(k in sections)) {
      missing.push(k);
      return `> **Section générée introuvable : ${k}**`;
    }
    return `<!-- début section générée : ${k} (ne pas modifier à la main, régénérer depuis event.json) -->\n${sections[k]}\n<!-- fin section générée : ${k} -->`;
  });
  md = md.replace(/\{\{([a-zA-Z.]+)\}\}/g, (_, p: string) => {
    const v = p.split('.').reduce<unknown>((o, k) => (o == null ? undefined : (o as Record<string, unknown>)[k]), { summary, config });
    if (v === undefined) {
      missing.push(p);
      return `{{${p}}}`;
    }
    return typeof v === 'number' ? new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(v) : String(v);
  });
  return { markdown: md, missing };
}
