/**
 * Génère un BASK'EST EVENT BLUEPRINT complet et ses exports.
 *   npm run blueprint                      → All Star Game Grand Est 2027 (dossier phare)
 *   npm run blueprint -- cpt-nuit-palais   → n'importe quel concept de src/data/concepts.ts
 *
 * Sorties (docs/blueprints/<id>/) : blueprint.md, blueprint.html, blueprint.pdf,
 * blueprint.json (données pour Word/Excel/PowerPoint), assets/*.svg + *.png.
 * Puis `npm run exports -- <id>` produit .docx, .xlsx, .pptx et le kit opérationnel.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { analyzeConcept } from '../src/core/pipeline';
import { buildBlueprint } from '../src/core/blueprint/blueprint';
import { blueprintToHtml, blueprintToMarkdown } from '../src/core/blueprint/render';
import { CONCEPTS } from '../src/data/concepts';
import { INNOVATIONS } from '../src/data/innovations';
import { ASG_2027, ASG_2027_EXTRAS } from '../src/data/flagship-asg-2027';

const arg = process.argv[2];
const concept = !arg || arg === ASG_2027.id ? ASG_2027 : CONCEPTS.find((c) => c.id === arg);
if (!concept) {
  console.error(`Concept inconnu : ${arg}. Disponibles : ${[ASG_2027.id, ...CONCEPTS.map((c) => c.id)].join(', ')}`);
  process.exit(1);
}
const extras = concept.id === ASG_2027.id ? ASG_2027_EXTRAS : {};

const analysis = analyzeConcept(concept, { runs: 500, seed: concept.id, innovations: INNOVATIONS });
const bp = buildBlueprint(analysis, extras, INNOVATIONS);
const dir = resolve('docs/blueprints', concept.id);
mkdirSync(join(dir, 'assets'), { recursive: true });

for (const a of bp.assets) writeFileSync(join(dir, 'assets', `${a.name}.svg`), a.svg);
writeFileSync(join(dir, 'blueprint.md'), blueprintToMarkdown(bp, (n) => `assets/${n}.svg`));
const html = blueprintToHtml(bp);
writeFileSync(join(dir, 'blueprint.html'), html);
writeFileSync(
  join(dir, 'blueprint.json'),
  JSON.stringify({ ...bp, sections: bp.sections.map((s) => ({ ...s, blocks: s.blocks.map((b) => (b.kind === 'svg' ? { ...b, svg: undefined, png: `assets/${b.name}.png` } : b)) })), assets: bp.assets.map((a) => ({ name: a.name, label: a.label, svg: `assets/${a.name}.svg`, png: `assets/${a.name}.png` })) }, null, 2),
);

console.log(`Blueprint « ${bp.title} » — ${bp.sections.length} sections, ${bp.assets.length} visuels`);
console.log(`Note ${analysis.evaluation.total}/100 (${analysis.evaluation.grade}) · éligible : ${analysis.evaluation.eligible} · maturité : ${analysis.evaluation.maturity}`);
console.log(`Portes : sécurité ${analysis.evaluation.gates.safety} · équité ${analysis.evaluation.gates.fairness} · conformité ${analysis.evaluation.gates.compliance}`);
console.log(`Règles non OK : ${analysis.rules.filter((r) => r.outcome !== 'ok').map((r) => `${r.ruleId}:${r.outcome}`).join(' ') || 'aucune'}`);
console.log(`Planning : ${analysis.schedule.matches.length} matchs, fin ${analysis.schedule.endsAt} min, ${analysis.schedule.conflicts.length} conflit(s)`);

// Rendu PNG des visuels + PDF imprimable (Chromium préinstallé)
const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let chromium: any;
try {
  chromium = require('playwright').chromium;
} catch {
  console.warn('Playwright indisponible : PNG et PDF non générés.');
}
if (chromium) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 2 });
  for (const a of bp.assets) {
    await page.setContent(`<html><body style="margin:0;background:transparent">${a.svg}</body></html>`);
    const el = await page.$('svg');
    if (el) await el.screenshot({ path: join(dir, 'assets', `${a.name}.png`), omitBackground: true });
  }
  await page.setContent(html, { waitUntil: 'load' });
  await page.pdf({ path: join(dir, 'blueprint.pdf'), format: 'A4', printBackground: true, margin: { top: '12mm', bottom: '14mm', left: '0', right: '0' } });
  await browser.close();
  console.log(`PNG + PDF générés dans ${dir}`);
}
