// EVENT LAB v0.4 — graine des connaissances partagées (briques, erreurs, veille, portefeuille).
// Lit les JSON d'event-lab/ (source unique) et écrit supabase/seed.sql.
// Usage (depuis baskest-lab/) :
//   npm run db:seed:generate            écrit supabase/seed.sql
//   npm run db:seed:generate -- --check vérifie que supabase/seed.sql est à jour (code 1 sinon)
// La graine est rejouable : chaque ligne est insérée ou mise à jour (on conflict do update).
// Elle s'exécute avec un rôle qui contourne RLS (éditeur SQL du projet Supabase, ou
// service_role) : les utilisateurs de l'application n'ont qu'un droit de lecture.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type Json = Record<string, unknown>;

const here = path.dirname(fileURLToPath(import.meta.url));
export const APP_ROOT = path.resolve(here, '..');
export const EVENT_LAB = path.resolve(APP_ROOT, '../event-lab');
export const SEED_FILE = path.join(APP_ROOT, 'supabase', 'seed.sql');

const readJson = (p: string) => JSON.parse(fs.readFileSync(p, 'utf8')) as unknown;
const walk = (dir: string): string[] =>
  fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)])) : [];

/** Littéral SQL standard (apostrophes doublées) ; refuse les caractères nuls. */
export function sqlText(v: unknown): string {
  if (v === null || v === undefined) return 'null';
  const s = String(v);
  if (s.includes('\u0000')) throw new Error('Caractère nul interdit dans la graine');
  return `'${s.replace(/'/g, "''")}'`;
}
const sqlJson = (v: unknown) => `${sqlText(JSON.stringify(v))}::jsonb`;

export interface SeedData {
  blocks: Json[];
  errors: Json[];
  sources: Json[];
  watch: Json[];
  concepts: Json[];
}

export function loadSeedData(root = EVENT_LAB): SeedData {
  const arr = (p: string) => {
    const d = readJson(path.join(root, p));
    if (!Array.isArray(d)) throw new Error(`${p} : tableau attendu`);
    return d as Json[];
  };
  const byId = (a: Json, b: Json) => String(a.id).localeCompare(String(b.id), 'en');
  return {
    blocks: arr('knowledge/building-blocks.json').sort(byId),
    errors: arr('knowledge/registre-erreurs.json').sort(byId),
    sources: arr('knowledge/veille/sources.json').sort(byId),
    watch: walk(path.join(root, 'knowledge', 'veille'))
      .filter((f) => /W-\d{8}-[a-z0-9-]+\.json$/.test(f))
      .map((f) => readJson(f) as Json)
      .sort(byId),
    concepts: walk(path.join(root, 'portfolio', 'concepts'))
      .filter((f) => f.endsWith('.json'))
      .map((f) => readJson(f) as Json)
      .sort(byId),
  };
}

function upsert(table: string, cols: string[], rows: string[][], updateCols: string[]): string {
  if (!rows.length) return `-- ${table} : aucune ligne dans le dépôt\n`;
  const values = rows.map((r) => `  (${r.join(', ')})`).join(',\n');
  const set = [...updateCols.map((c) => `${c} = excluded.${c}`), 'updated_at = now()'].join(', ');
  return `insert into public.${table} (${cols.join(', ')}) values\n${values}\non conflict (id) do update set ${set};\n`;
}

export function buildSeedSql(data: SeedData = loadSeedData()): string {
  const s = (o: Json, k: string) => sqlText(o[k]);
  const parts = [
    '-- =============================================================================',
    '-- EVENT LAB — graine des connaissances partagées. FICHIER GÉNÉRÉ : ne pas éditer.',
    '-- Source : event-lab/knowledge/ et event-lab/portfolio/concepts/',
    '-- Régénérer : npm run db:seed:generate (depuis baskest-lab/).',
    '-- À exécuter après les migrations, avec un rôle qui contourne RLS (éditeur SQL du',
    '-- projet ou service_role). Rejouable sans doublon.',
    `-- Contenu : ${data.blocks.length} briques, ${data.errors.length} erreurs, ${data.sources.length} sources de veille, ${data.watch.length} fiches de veille, ${data.concepts.length} concepts.`,
    '-- =============================================================================',
    'begin;',
    '',
    upsert('kb_building_blocks', ['id', 'type', 'name', 'data'], data.blocks.map((b) => [s(b, 'id'), s(b, 'type'), s(b, 'name'), sqlJson(b)]), ['type', 'name', 'data']),
    upsert('kb_errors', ['id', 'domain', 'severity', 'title', 'data'], data.errors.map((e) => [s(e, 'id'), s(e, 'domain'), s(e, 'severity'), s(e, 'title'), sqlJson(e)]), ['domain', 'severity', 'title', 'data']),
    upsert('kb_watch_sources', ['id', 'name', 'url', 'type', 'verification', 'data'], data.sources.map((x) => [s(x, 'id'), s(x, 'name'), s(x, 'url'), s(x, 'type'), s(x, 'verification'), sqlJson(x)]), ['name', 'url', 'type', 'verification', 'data']),
    upsert(
      'kb_watch_entries',
      ['id', 'dedupe_key', 'reliability', 'sector_family', 'data'],
      // Statut de validation : décisions humaines de knowledge/veille/validations.json, non reprises en v0.4 (a_valider par défaut)
      data.watch.map((w) => [s(w, 'id'), s(w, 'dedupe_key'), s(w, 'reliability'), s(w, 'sector_family'), sqlJson(w)]),
      ['dedupe_key', 'reliability', 'sector_family', 'data'],
    ),
    upsert(
      'kb_portfolio_concepts',
      ['id', 'version', 'name', 'data'],
      data.concepts.map((c) => [s(c, 'id'), s(c, 'version'), sqlText((c.identity as Json | undefined)?.name ?? c.id), sqlJson(c)]),
      ['version', 'name', 'data'],
    ),
    'commit;',
    '',
  ];
  return parts.join('\n');
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const data = loadSeedData();
  const sql = buildSeedSql(data);
  if (process.argv.includes('--check')) {
    const current = fs.existsSync(SEED_FILE) ? fs.readFileSync(SEED_FILE, 'utf8') : '';
    if (current !== sql) {
      console.error('supabase/seed.sql n’est pas à jour : lancer npm run db:seed:generate');
      process.exitCode = 1;
    } else console.log('supabase/seed.sql est à jour.');
  } else {
    fs.mkdirSync(path.dirname(SEED_FILE), { recursive: true });
    fs.writeFileSync(SEED_FILE, sql);
    console.log(`${path.relative(APP_ROOT, SEED_FILE)} : ${data.blocks.length} briques, ${data.errors.length} erreurs, ${data.sources.length} sources, ${data.watch.length} fiches de veille, ${data.concepts.length} concepts (${(sql.length / 1024).toFixed(0)} Kio).`);
  }
}
