// EVENT LAB — génère les sections chiffrées d'un blueprint à partir de sa configuration (event.json)
// et assemble BLUEPRINT.md à partir du narratif (narrative.md) en remplaçant les marqueurs <!-- @gen:clé -->.
// Moteur : baskest-lab/src/core/eventlab/ (TypeScript, même code que l'application).
//
// Usage (depuis baskest-lab/) : npm run eventlab:blueprint -- ../event-lab/blueprints/<id>
// Sorties : <dir>/generated/summary.json, <dir>/generated/sections/<clé>.md, <dir>/generated/csv/*.csv, <dir>/BLUEPRINT.md
import fs from 'node:fs';
import path from 'node:path';
import { renderGenerated, assembleBlueprint, hhmm, simulateAll, cashflow, sensitivity, simulateCompetition, applyVariant, variantIds, evaluate, type EventConfig } from '../../baskest-lab/src/core/eventlab/index';

const dir = path.resolve(process.argv[2] ?? '.');
const config = JSON.parse(fs.readFileSync(path.join(dir, 'event.json'), 'utf8')) as EventConfig;
const out = path.join(dir, 'generated');
fs.mkdirSync(path.join(out, 'sections'), { recursive: true });
fs.mkdirSync(path.join(out, 'csv'), { recursive: true });

const { sections, summary } = renderGenerated(config);
for (const [k, v] of Object.entries(sections)) fs.writeFileSync(path.join(out, 'sections', `${k}.md`), v + '\n');

// Données complètes pour les exports XLSX / PPTX et pour l'application
const data = {
  id: config.id,
  version: config.version,
  name: config.identity.name,
  generated_at: new Date().toISOString().slice(0, 10),
  summary,
  evaluation: evaluate(config),
  scenarios: simulateAll(config),
  variants: Object.fromEntries(variantIds(config).map((id) => [id, simulateAll(applyVariant(config, id))])),
  cashflow: cashflow(config, 'central'),
  sensitivity: sensitivity(config),
  competition: simulateCompetition(config),
};
fs.writeFileSync(path.join(out, 'summary.json'), JSON.stringify(data, null, 2) + '\n');

// CSV (séparateur ; pour les tableurs français)
const csv = (rows: unknown[][]) =>
  rows
    .map((r) =>
      r
        .map((c) => {
          const s = String(c ?? '');
          return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(';'),
    )
    .join('\n') + '\n';
const budget = config.budget!;
const resources = config.resources!;
fs.writeFileSync(path.join(out, 'csv', 'budget.csv'), csv([['id', 'categorie', 'libelle', 'montant', 'base', 'certitude', 'optionnel', 'priorite', 'decalage_paiement_J'], ...budget.expenses.map((e) => [e.id, e.category, e.label, e.amount, e.basis, e.certainty, e.optional ? 'oui' : 'non', e.priority ?? 2, e.pay_offset_days ?? 0])]));
fs.writeFileSync(path.join(out, 'csv', 'recettes.csv'), csv([['id', 'flux', 'libelle', 'montant_unitaire', 'base', 'taux_marge', 'certitude', 'decalage_encaissement_J'], ...budget.revenues.map((r) => [r.id, r.stream, r.label, r.unit_amount, r.basis, r.margin_rate ?? 1, r.certainty, r.cash_offset_days ?? 0])]));
fs.writeFileSync(path.join(out, 'csv', 'conducteur.csv'), csv([['heure_debut', 'heure_fin', 'duree_min', 'sequence', 'type', 'espace', 'responsable', 'tops', 'critique'], ...[...(config.program ?? [])].sort((a, b) => a.start_min - b.start_min).map((p) => [hhmm(p.start_min), hhmm(p.start_min + p.duration_min), p.duration_min, p.label, p.kind, p.space ?? '', p.owner_role ?? '', (p.cues ?? []).join(' / '), p.critical ? 'oui' : ''])]));
fs.writeFileSync(path.join(out, 'csv', 'retroplanning.csv'), csv([['echeance_relative_J', 'jalon', 'responsable', 'livrable', 'go_no_go', 'statut'], ...[...(config.milestones ?? [])].sort((a, b) => a.offset_days - b.offset_days).map((m) => [m.offset_days, m.label, m.owner_role ?? '', m.deliverable ?? '', m.go_no_go ?? '', 'a_faire'])]));
fs.writeFileSync(path.join(out, 'csv', 'matrice-risques.csv'), csv([['id', 'categorie', 'description', 'probabilite_1_5', 'impact_1_5', 'criticite', 'critique', 'signes_precurseurs', 'prevention', 'plan_continuite', 'responsable', 'statut'], ...(config.risks ?? []).map((r) => [r.id, r.category, r.description, r.probability, r.impact, r.probability * r.impact, r.critical ? 'oui' : 'non', (r.warning_signs ?? []).join(' / '), (r.prevention ?? []).join(' / '), r.continuity_plan ?? '', r.owner_role ?? '', r.status ?? 'ouvert'])]));
fs.writeFileSync(path.join(out, 'csv', 'conformite.csv'), csv([['id', 'point', 'interlocuteur', 'obligatoire', 'statut', 'echeance_J'], ...(config.compliance ?? []).map((c) => [c.id, c.item, c.authority ?? '', c.mandatory ? 'oui' : 'non', c.status, c.deadline_offset_days ?? ''])]));
fs.writeFileSync(path.join(out, 'csv', 'ressources-humaines.csv'), csv([['role', 'effectif', 'statut', 'heures', 'note'], ...resources.staff.map((s) => [s.role, s.count, s.status, s.hours ?? '', s.ratio_note ?? ''])]));
fs.writeFileSync(path.join(out, 'csv', 'materiel.csv'), csv([['materiel', 'quantite', 'provenance', 'puissance_w', 'note'], ...resources.equipment.map((e) => [e.item, e.qty, e.source ?? '', e.power_w ?? '', e.notes ?? ''])]));

// Assemblage du blueprint
const narrativePath = path.join(dir, 'narrative.md');
if (fs.existsSync(narrativePath)) {
  const { markdown, missing } = assembleBlueprint(fs.readFileSync(narrativePath, 'utf8'), sections, summary, config);
  fs.writeFileSync(path.join(dir, 'BLUEPRINT.md'), markdown);
  if (missing.length) {
    console.error('Marqueurs non résolus :', [...new Set(missing)].join(', '));
    process.exitCode = 1;
  }
}

console.log(JSON.stringify({ dir: path.relative(process.cwd(), dir), sections: Object.keys(sections).length, summary: { score: summary.score, grade: summary.grade, verdict: summary.verdict, results: summary.results, breakevenCentral: summary.breakevenCentral, cashNeedCentral: summary.cashNeedCentral, variants: summary.variants } }, null, 2));
