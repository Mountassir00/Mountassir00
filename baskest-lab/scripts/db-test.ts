// EVENT LAB v0.4 — tests SQL locaux du socle SaaS (npm run db:test).
//
// 1. Vérifie que supabase/seed.sql correspond aux JSON d'event-lab/.
// 2. Crée un cluster PostgreSQL TEMPORAIRE (initdb dans un dossier temporaire, socket
//    Unix privée, aucune écoute réseau), applique la SIMULATION locale de Supabase
//    (db/tests/00-simulation-auth-supabase.sql — ce n'est pas Supabase), les migrations
//    supabase/migrations/*.sql dans l'ordre, la graine, puis les fichiers db/tests/*.test.sql.
// 3. Arrête le cluster et supprime le dossier, même en cas d'échec ou d'interruption.
//
// Prérequis : binaires PostgreSQL 15+ (initdb, pg_ctl, postgres, psql). Chemin détecté
// automatiquement (pg_config, /usr/lib/postgresql/*/bin) ou fourni par PG_BIN.
// Exécuté en root, le cluster tourne sous l'utilisateur système `postgres` (initdb refuse root).
import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { APP_ROOT, SEED_FILE, buildSeedSql } from './generate-seed';

const MIGRATIONS = path.join(APP_ROOT, 'supabase', 'migrations');
const TESTS = path.join(APP_ROOT, 'db', 'tests');

function findPgBin(): string {
  const candidates: string[] = [];
  if (process.env.PG_BIN) candidates.push(process.env.PG_BIN);
  const cfg = spawnSync('pg_config', ['--bindir'], { encoding: 'utf8' });
  if (cfg.status === 0) candidates.push(cfg.stdout.trim());
  if (fs.existsSync('/usr/lib/postgresql')) {
    for (const v of fs.readdirSync('/usr/lib/postgresql').sort((a, b) => Number(b) - Number(a))) candidates.push(`/usr/lib/postgresql/${v}/bin`);
  }
  candidates.push('/usr/local/bin', '/opt/homebrew/bin', '/usr/bin');
  const ok = candidates.find((d) => fs.existsSync(path.join(d, 'initdb')) && fs.existsSync(path.join(d, 'pg_ctl')));
  if (!ok) throw new Error('Binaires PostgreSQL introuvables (initdb, pg_ctl). Installer PostgreSQL 15+ ou définir PG_BIN.');
  return ok;
}

const freePort = () =>
  new Promise<number>((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      srv.close(() => resolve(port));
    });
  });

const isRoot = typeof process.getuid === 'function' && process.getuid() === 0;

function run(cmd: string, args: string[], opts: { asPg?: boolean; input?: string } = {}): SpawnSyncReturns<string> {
  const [c, a] = opts.asPg && isRoot ? ['runuser', ['-u', 'postgres', '--', cmd, ...args]] : [cmd, args];
  return spawnSync(c, a, { encoding: 'utf8', input: opts.input, maxBuffer: 64 * 1024 * 1024 });
}

function must(r: SpawnSyncReturns<string>, what: string) {
  if (r.error) throw new Error(`${what} : ${r.error.message}`);
  if (r.status !== 0) throw new Error(`${what} a échoué (code ${r.status})\n${r.stdout}\n${r.stderr}`);
  return r;
}

async function main() {
  const t0 = Date.now();
  // ---------------------------------------------------------------- 1. graine à jour
  const seed = buildSeedSql();
  const committed = fs.existsSync(SEED_FILE) ? fs.readFileSync(SEED_FILE, 'utf8') : '';
  if (committed !== seed) throw new Error('supabase/seed.sql n’est pas à jour par rapport à event-lab/ : lancer npm run db:seed:generate');
  console.log('✓ supabase/seed.sql à jour par rapport aux JSON d’event-lab/');

  // ---------------------------------------------------------------- 2. cluster temporaire
  const bin = findPgBin();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'eventlab-pg-'));
  const data = path.join(tmp, 'data');
  const port = await freePort();
  let started = false;
  const cleanup = () => {
    try {
      if (started) run(path.join(bin, 'pg_ctl'), ['-D', data, '-m', 'immediate', '-w', 'stop'], { asPg: true });
    } catch {
      /* déjà arrêté */
    }
    started = false;
    try {
      fs.rmSync(tmp, { recursive: true, force: true });
    } catch {
      /* rien à supprimer */
    }
  };
  const onSignal = (sig: NodeJS.Signals) => {
    cleanup();
    process.exit(sig === 'SIGINT' ? 130 : 143);
  };
  process.once('SIGINT', onSignal);
  process.once('SIGTERM', onSignal);

  try {
    if (isRoot) {
      const id = spawnSync('id', ['-u', 'postgres'], { encoding: 'utf8' });
      const gid = spawnSync('id', ['-g', 'postgres'], { encoding: 'utf8' });
      if (id.status !== 0) throw new Error('Exécuté en root sans utilisateur système « postgres » : lancer en utilisateur normal.');
      fs.chownSync(tmp, Number(id.stdout.trim()), Number(gid.stdout.trim()));
    }
    must(run(path.join(bin, 'initdb'), ['-D', data, '-U', 'postgres', '-A', 'trust', '-E', 'UTF8', '--no-locale', '--no-sync'], { asPg: true }), 'initdb');
    fs.appendFileSync(
      path.join(data, 'postgresql.conf'),
      `\n# EVENT LAB db:test — cluster jetable\nport = ${port}\nlisten_addresses = ''\nunix_socket_directories = '${tmp}'\nfsync = off\nsynchronous_commit = off\nfull_page_writes = off\n`,
    );
    must(run(path.join(bin, 'pg_ctl'), ['-D', data, '-l', path.join(tmp, 'postgres.log'), '-w', '-t', '60', 'start'], { asPg: true }), 'pg_ctl start');
    started = true;
    const ver = must(run(path.join(bin, 'psql'), ['-X', '-A', '-t', '-h', tmp, '-p', String(port), '-U', 'postgres', '-d', 'postgres', '-c', 'show server_version']), 'psql').stdout.trim();
    console.log(`✓ cluster PostgreSQL ${ver} temporaire démarré (port ${port}, socket privée, aucune écoute réseau)`);

    const psqlFile = (file: string) =>
      run(path.join(bin, 'psql'), ['-X', '-q', '-v', 'ON_ERROR_STOP=1', '-h', tmp, '-p', String(port), '-U', 'postgres', '-d', 'postgres', '-f', file]);

    const apply = (file: string, label: string) => {
      const r = psqlFile(file);
      if (r.status !== 0) throw new Error(`${label} : échec\n${r.stderr}`);
    };
    apply(path.join(TESTS, '00-simulation-auth-supabase.sql'), 'simulation auth');
    console.log('✓ simulation locale de Supabase (rôles, auth.users, auth.uid(), auth.jwt()) — ce n’est pas Supabase réel');
    const migrations = fs.readdirSync(MIGRATIONS).filter((f) => /^\d+_.+\.sql$/.test(f)).sort();
    for (const m of migrations) apply(path.join(MIGRATIONS, m), m);
    console.log(`✓ ${migrations.length} migrations appliquées : ${migrations.join(', ')}`);
    apply(SEED_FILE, 'graine');
    apply(SEED_FILE, 'graine (seconde exécution, doit être rejouable)');
    console.log('✓ graine chargée deux fois (rejouable)');

    // ---------------------------------------------------------------- 3. tests
    let ok = 0;
    const failures: string[] = [];
    for (const f of fs.readdirSync(TESTS).filter((x) => x.endsWith('.test.sql')).sort()) {
      const r = psqlFile(path.join(TESTS, f));
      const lines = `${r.stdout}\n${r.stderr}`.split('\n');
      let section = '';
      for (const line of lines) {
        const sec = /NOTICE:\s+## (.*)$/.exec(line);
        const pass = /NOTICE:\s+ok - (.*)$/.exec(line);
        const fail = /WARNING:\s+ECHEC - (.*)$/.exec(line);
        if (sec) {
          section = sec[1];
          console.log(`\n${section}`);
        } else if (pass) {
          ok++;
          console.log(`  ✓ ${pass[1]}`);
        } else if (fail) {
          failures.push(`${section} › ${fail[1]}`);
          console.log(`  ✗ ${fail[1]}`);
        }
      }
      if (r.status !== 0) {
        failures.push(`${f} : arrêt sur erreur SQL`);
        console.log(r.stderr.split('\n').filter((l) => /ERROR|DETAIL|CONTEXT|LINE/.test(l)).join('\n'));
      }
    }
    console.log(`\n${ok} vérification(s) réussie(s), ${failures.length} échec(s) — ${((Date.now() - t0) / 1000).toFixed(1)} s`);
    if (failures.length) {
      console.log(failures.map((x) => `  ✗ ${x}`).join('\n'));
      process.exitCode = 1;
    }
    console.log('Rappel : ces tests portent sur le schéma et les règles RLS avec une simulation de l’authentification ; ils ne remplacent pas une vérification sur un vrai projet Supabase.');
  } finally {
    cleanup();
    console.log('✓ cluster arrêté et dossier temporaire supprimé');
  }
}

main().catch((e: unknown) => {
  console.error(`✗ ${e instanceof Error ? e.message : String(e)}`);
  process.exitCode = 1;
});
