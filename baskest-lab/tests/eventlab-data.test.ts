// Données EVENT LAB importées dans l'application et unification des bases (registre des erreurs, veille).
import { PORTFOLIO, BUILDING_BLOCKS, EL_ERRORS, EL_WATCH_SOURCES, UNIFIED_ERRORS, UNIFIED_WATCH, GRILLE_BLUEPRINT, GRILLE_SUMMARY_REF } from '../src/data/eventlab';
import { ERROR_CASES } from '../src/data/errors';
import { WATCH_SOURCES } from '../src/data/watch-sources';
import { domainOf } from '../src/core/knowledge/unify';
import { renderGenerated } from '../src/core/eventlab';

test('imports JSON : 10 concepts, 70 briques, 28 erreurs, 70 sources, blueprint v0.2.0', () => {
  expect(PORTFOLIO.length).toBe(10);
  expect(BUILDING_BLOCKS.length).toBe(70);
  expect(EL_ERRORS.length).toBe(28);
  expect(EL_WATCH_SOURCES.length).toBe(70);
  expect(GRILLE_BLUEPRINT.version).toBe('0.2.0');
  expect(GRILLE_SUMMARY_REF.version).toBe('0.2.0');
});

test('le moteur appliqué aux données importées redonne le résumé publié du blueprint', () => {
  expect(JSON.parse(JSON.stringify(renderGenerated(GRILLE_BLUEPRINT).summary))).toEqual(GRILLE_SUMMARY_REF.summary);
});

test('registre unique : chaque cas apparaît une fois, 4 fiches importées fusionnées avec 8 cas, 6 incidents communs', () => {
  expect(ERROR_CASES.length).toBe(45);
  const bkIds = UNIFIED_ERRORS.flatMap((u) => u.bk.map((c) => c.id));
  expect(bkIds.length).toBe(45);
  expect(new Set(bkIds).size).toBe(45);
  expect(UNIFIED_ERRORS.filter((u) => u.el).length).toBe(28);
  const imported = UNIFIED_ERRORS.filter((u) => u.merge?.reason === 'sources_communes');
  expect(imported.map((u) => u.el!.id).sort()).toEqual(['E-008', 'E-018', 'E-023', 'E-025']);
  expect(imported.reduce((s, u) => s + u.bk.length, 0)).toBe(8);
  expect(UNIFIED_ERRORS.filter((u) => u.merge?.reason === 'meme_incident').length).toBe(6);
  expect(UNIFIED_ERRORS.length).toBe(45 + 28 - 8 - 6);
});

test('registre unique : aucune source perdue lors des fusions', () => {
  const norm = (u: string) => u.replace(/^https?:\/\/(www\.)?/, '').replace(/\/+$/, '').toLowerCase();
  const original = new Set([...EL_ERRORS.flatMap((e) => e.sources.map((s) => s.url ?? s.internal_ref ?? '')), ...ERROR_CASES.map((c) => c.source.source ?? '')].filter(Boolean).map(norm));
  const unified = new Set(UNIFIED_ERRORS.flatMap((u) => u.sources.map((s) => s.url ?? '')).filter(Boolean).map(norm));
  expect(unified).toEqual(original);
});

test('veille unique : 50 + 70 sources, dédoublonnées par domaine, toutes conservées', () => {
  expect(WATCH_SOURCES.length).toBe(50);
  const all = [...WATCH_SOURCES.map((s) => s.url), ...EL_WATCH_SOURCES.map((s) => s.url)];
  expect(UNIFIED_WATCH.length).toBe(new Set(all.map(domainOf)).size);
  expect(UNIFIED_WATCH.reduce((s, d) => s + d.entries.length, 0)).toBe(120);
  expect(UNIFIED_WATCH.filter((d) => d.origins.length === 2).length).toBe(8);
});
