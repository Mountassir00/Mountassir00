#!/usr/bin/env node
// EVENT LAB — valide les fichiers JSON du dépôt contre les schémas.
// Usage : node scripts/validate.mjs   (depuis event-lab/ ou n'importe où : chemins résolus depuis ce script)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { validate } = await import(path.join(root, 'app', 'engine', 'validate.js'));
const load = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const schemas = Object.fromEntries(fs.readdirSync(path.join(root, 'schemas')).filter((f) => f.endsWith('.json')).map((f) => [f, load(path.join(root, 'schemas', f))]));

const walk = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)])) : []);

const targets = [
  ...walk(path.join(root, 'portfolio', 'concepts')).filter((f) => f.endsWith('.json')).map((f) => [f, 'event-config.schema.json', false]),
  ...walk(path.join(root, 'blueprints')).filter((f) => /event\.json$|@[0-9.]+\.json$/.test(f)).map((f) => [f, 'event-config.schema.json', false]),
  [path.join(root, 'knowledge', 'building-blocks.json'), 'building-block.schema.json', true],
  [path.join(root, 'knowledge', 'registre-erreurs.json'), 'error-entry.schema.json', true],
  ...walk(path.join(root, 'knowledge', 'veille')).filter((f) => /W-\d{8}-.+\.json$/.test(f)).map((f) => [f, 'watch-entry.schema.json', false]),
  ...walk(path.join(root, 'venues')).filter((f) => f.endsWith('.json')).map((f) => [f, 'venue.schema.json', false]),
].filter(([f]) => fs.existsSync(f));

let failures = 0, checked = 0;
for (const [file, schemaName, isArray] of targets) {
  const data = load(file);
  const items = isArray ? data : [data];
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
