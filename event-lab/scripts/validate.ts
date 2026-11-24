// EVENT LAB — valide les fichiers JSON du dépôt contre les schémas.
// Moteur : baskest-lab/src/core/eventlab/validate.ts (même validateur que l'application).
// Usage (depuis baskest-lab/) : npm run eventlab:validate   (chemins résolus depuis ce script)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate } from '../../baskest-lab/src/core/eventlab/validate';

type Json = Record<string, unknown>;
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = (p: string) => JSON.parse(fs.readFileSync(p, 'utf8')) as unknown;
const schemas = Object.fromEntries(
  fs
    .readdirSync(path.join(root, 'schemas'))
    .filter((f) => f.endsWith('.json'))
    .map((f) => [f, load(path.join(root, 'schemas', f)) as Json]),
);

const walk = (dir: string): string[] => (fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)])) : []);

const targets: [string, string, boolean][] = (
  [
    ...walk(path.join(root, 'portfolio', 'concepts'))
      .filter((f) => f.endsWith('.json'))
      .map((f) => [f, 'event-config.schema.json', false]),
    ...walk(path.join(root, 'blueprints'))
      .filter((f) => /event\.json$|@[0-9.]+\.json$/.test(f))
      .map((f) => [f, 'event-config.schema.json', false]),
    [path.join(root, 'knowledge', 'building-blocks.json'), 'building-block.schema.json', true],
    [path.join(root, 'knowledge', 'registre-erreurs.json'), 'error-entry.schema.json', true],
    ...walk(path.join(root, 'knowledge', 'veille'))
      .filter((f) => /W-\d{8}-.+\.json$/.test(f))
      .map((f) => [f, 'watch-entry.schema.json', false]),
    ...walk(path.join(root, 'venues'))
      .filter((f) => f.endsWith('.json'))
      .map((f) => [f, 'venue.schema.json', false]),
  ] as [string, string, boolean][]
).filter(([f]) => fs.existsSync(f));

let failures = 0;
let checked = 0;
for (const [file, schemaName, isArray] of targets) {
  const data = load(file);
  const items = isArray ? (data as Json[]) : [data as Json];
  items.forEach((item, i) => {
    checked++;
    const r = validate(schemas[schemaName], item, schemas);
    if (!r.valid) {
      failures++;
      console.log(`✗ ${path.relative(root, file)}${isArray ? `[${i}] ${item.id ?? ''}` : ''} (${schemaName})`);
      for (const e of r.errors.slice(0, 8)) console.log(`    ${e.path || '/'} : ${e.message}`);
      if (r.errors.length > 8) console.log(`    … ${r.errors.length - 8} autre(s)`);
    }
  });
}
console.log(`${checked} objet(s) contrôlé(s), ${failures} invalide(s).`);
process.exitCode = failures ? 1 : 0;
