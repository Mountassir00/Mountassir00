// v0.4 — contrôles Playwright et captures de la page « Compte et organisation » et de la coquille.
//
// Préalables (deux constructions servies en parallèle) :
//   npx vite build && npx vite preview --port 4173 &                       # mode local (sans .env)
//   VITE_SUPABASE_URL=http://localhost:4174 VITE_SUPABASE_ANON_KEY=cle-de-test \
//     npx vite build --outDir dist-config --emptyOutDir && npx vite preview --outDir dist-config --port 4174 &
// Usage : node scripts/screenshots-v04.cjs [dossier]   (défaut docs/screenshots/v0.4)
//
// 1. Mode local : tous les modules en 1440 et 360 px, thèmes clair et sombre : erreurs console,
//    débordement horizontal, zones tactiles < 44 px (360 px). Captures : compte, accueil, studio (versions).
// 2. Serveur configuré : la construction 4174 pointe vers elle-même ; les réponses de l'API Supabase
//    (auth/v1, rest/v1) sont SIMULÉES par Playwright (page.route). Ce n'est pas un test d'intégration :
//    il vérifie seulement l'affichage des états « connexion » et « connecté ».
// Captures JPEG qualité 70 ; bureau 1440 px rendu à 1080 px de large (facteur 0,75) ; mobile 360 px.
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const LOCAL = process.env.BASE_URL || 'http://localhost:4173/';
const CONFIG = process.env.CONFIG_URL || 'http://localhost:4174/';
const OUT = process.argv[2] || 'docs/screenshots/v0.4';
const ALL = ['accueil', 'notation', 'projets', 'post-evenement', 'tendances', 'veille', 'innovations', 'erreurs', 'generateur', 'labo', 'studio', 'salles', 'simulateur-sportif', 'simulateur-financier', 'programmation', 'dossiers', 'ecosysteme', 'notifications', 'collaboratif', 'portefeuille', 'studio-config', 'generateur-multi', 'briques', 'application', 'compte'];
const WIDTHS = [1440, 360];
const THEMES = ['light', 'dark'];

async function open(browser, width, theme, init, blockSw = false) {
  const ctx = await browser.newContext({
    viewport: { width, height: width > 900 ? 900 : 780 },
    deviceScaleFactor: width > 900 ? 0.75 : 1,
    colorScheme: theme,
    hasTouch: width <= 900,
    isMobile: width <= 900,
    // Service workers bloqués seulement pour l'API simulée (interception fiable des requêtes)
    serviceWorkers: blockSw ? 'block' : 'allow',
  });
  await ctx.addInitScript(
    ([t, extra]) => {
      try {
        localStorage.setItem('baskest-lab:theme', JSON.stringify(t));
        for (const [k, v] of Object.entries(extra || {})) localStorage.setItem(k, v);
      } catch {}
    },
    [theme, init || {}],
  );
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });
  return { ctx, page, errors };
}

async function checks(page, width) {
  return page.evaluate((w) => {
    const overflow = document.documentElement.scrollWidth - window.innerWidth;
    let small = [];
    if (w <= 900) {
      const els = [...document.querySelectorAll('button, select, input:not([type="checkbox"]):not([type="radio"]):not([type="range"]), [role="tab"], .drawer a, .mobile-nav button, .mobile-nav .sync-pill')];
      small = els
        .filter((e) => {
          const r = e.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden' && (r.height < 44 || r.width < 44) && !e.classList.contains('linkbtn');
        })
        .map((e) => `${e.tagName.toLowerCase()}.${String(e.className).split(' ')[0]} ${Math.round(e.getBoundingClientRect().width)}×${Math.round(e.getBoundingClientRect().height)}`);
    }
    return { overflow, small };
  }, width);
}

const shot = (page, file, width) => page.screenshot({ path: path.join(OUT, file), type: 'jpeg', quality: 70, fullPage: width <= 900 });

// ---------------------------------------------------------------- simulation de l'API (mode configuré)
const UID = '7d3f3a9e-1111-4c1a-9a51-000000000001';
const ORG = '5b8c9d10-2222-4b2a-8c61-000000000002';
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const exp = Math.floor(Date.now() / 1000) + 3600 * 24;
const JWT = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: UID, email: 'alice@example.org', role: 'authenticated', aud: 'authenticated', exp })}.signature-simulee`;
const USER = { id: UID, aud: 'authenticated', role: 'authenticated', email: 'alice@example.org', app_metadata: { provider: 'email' }, user_metadata: {}, created_at: '2026-11-24T10:00:00Z' };
const SESSION = { access_token: JWT, token_type: 'bearer', expires_in: 3600 * 24, expires_at: exp, refresh_token: 'jeton-simule', user: USER };
const ROWS = {
  myMemberships: [{ role: 'proprietaire', function_label: 'présidente', display_name: 'Alice', row_version: 1, organization: { id: ORG, name: 'Bask’Est', city: 'Nancy' } }],
  members: [
    { user_id: UID, role: 'proprietaire', function_label: 'présidente', display_name: 'Alice', row_version: 1, created_at: '2026-11-24T10:00:00Z' },
    { user_id: 'u-2', role: 'administrateur', function_label: 'trésorier', display_name: 'Dave', row_version: 2, created_at: '2026-11-24T10:05:00Z' },
    { user_id: 'u-3', role: 'editeur', function_label: 'responsable événement', display_name: 'Bob', row_version: 1, created_at: '2026-11-24T10:06:00Z' },
    { user_id: 'u-4', role: 'lecteur', function_label: null, display_name: 'Carol', row_version: 1, created_at: '2026-11-24T10:07:00Z' },
  ],
  invitations: [{ id: 'inv-1', email: 'gina@example.org', role: 'editeur', function_label: 'bénévole référente', created_at: '2026-11-24T11:00:00Z', expires_at: '2026-12-08T11:00:00Z', accepted_at: null, revoked_at: null }],
  myInvitations: [{ id: 'inv-9', organization_id: 'org-x', organization_name: 'Club voisin', role: 'lecteur', function_label: null, created_at: '2026-11-24T09:00:00Z', expires_at: '2026-12-08T09:00:00Z' }],
  preview: [{ organization_id: ORG, organization_name: 'Bask’Est', my_role: 'proprietaire', other_members: 3, other_owners: 0, outcome: 'bloquant' }],
};
async function mockApi(page) {
  await page.route('**/auth/v1/**', (route) => {
    const u = route.request().url();
    if (/\/user/.test(u)) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(USER) });
    if (/\/token/.test(u)) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SESSION) });
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await page.route('**/rest/v1/**', (route) => {
    const u = decodeURIComponent(route.request().url());
    const json = (b) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(b) });
    if (u.includes('/rpc/my_invitations')) return json(ROWS.myInvitations);
    if (u.includes('/rpc/account_deletion_preview')) return json(ROWS.preview);
    if (u.includes('/memberships') && u.includes('organization:organizations')) return json(ROWS.myMemberships);
    if (u.includes('/memberships')) return json(ROWS.members);
    if (u.includes('/invitations')) return json(ROWS.invitations);
    if (u.includes('/events') || u.includes('/event_versions')) return json([]);
    return json([]);
  });
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const report = [];

  // ---------------------------------------------------------------- 1. mode local
  for (const width of WIDTHS) {
    for (const theme of THEMES) {
      const { ctx, page, errors } = await open(browser, width, theme);
      for (const r of ALL) {
        const before = errors.length;
        await page.goto(`${LOCAL}#/${r}`);
        await page.waitForTimeout(r === 'compte' || r === 'accueil' || r === 'studio-config' ? 700 : 350);
        const c = await checks(page, width);
        const entry = { mode: 'local', route: r, width, theme, overflowPx: c.overflow, smallTargets: c.small, errors: errors.slice(before) };
        if (['compte', 'accueil'].includes(r)) {
          entry.file = `${r}-local-${width}-${theme}.jpg`;
          await shot(page, entry.file, width);
        }
        if (r === 'studio-config') {
          await page.getByRole('tab', { name: /Versions/ }).click();
          await page.waitForTimeout(300);
          await page.evaluate(() => window.scrollTo(0, 0));
          entry.file = `studio-config-versions-local-${width}-${theme}.jpg`;
          await shot(page, entry.file, width);
          const c2 = await checks(page, width);
          entry.overflowPx = Math.max(entry.overflowPx, c2.overflow);
          entry.smallTargets.push(...c2.small);
        }
        report.push(entry);
      }
      if (width <= 900) {
        await page.goto(`${LOCAL}#/compte`);
        await page.waitForTimeout(300);
        await page.getByRole('button', { name: 'Menu' }).click();
        await page.waitForTimeout(300);
        const c = await checks(page, width);
        const file = `menu-${width}-${theme}.jpg`;
        await page.screenshot({ path: path.join(OUT, file), type: 'jpeg', quality: 70 });
        report.push({ mode: 'local', route: 'menu ouvert', width, theme, file, overflowPx: c.overflow, smallTargets: c.small, errors: [] });
      }
      await ctx.close();
    }
  }

  // ---------------------------------------------------------------- 2. serveur configuré (API simulée)
  let configured = true;
  try {
    const probe = await browser.newPage();
    await probe.goto(CONFIG, { timeout: 4000 });
    await probe.close();
  } catch {
    configured = false;
    console.log(`(construction configurée absente sur ${CONFIG} : partie 2 ignorée)`);
  }
  if (configured) {
    for (const width of WIDTHS) {
      for (const theme of THEMES) {
        for (const state of ['connexion', 'connecte']) {
          const init = state === 'connecte' ? { 'baskest-lab:eventlab:session': JSON.stringify(SESSION) } : {};
          const { ctx, page, errors } = await open(browser, width, theme, init, true);
          await mockApi(page);
          await page.goto(`${CONFIG}#/compte`);
          await page.waitForTimeout(1500);
          if (state === 'connecte') {
            await page.getByRole('button', { name: 'Vérifier ce qui sera supprimé' }).click();
            await page.waitForTimeout(400);
            await page.evaluate(() => window.scrollTo(0, 0));
          }
          const c = await checks(page, width);
          const file = `compte-${state}-${width}-${theme}.jpg`;
          await shot(page, file, width);
          const pill = await page.locator(width > 900 ? '.nav .sync-pill' : '.mobile-nav .sync-pill').getAttribute('aria-label');
          report.push({ mode: `configuré (API simulée) — ${state}`, route: 'compte', width, theme, file, overflowPx: c.overflow, smallTargets: c.small, errors: errors.slice(), indicator: pill });
          await ctx.close();
        }
      }
    }
  }

  await browser.close();
  fs.writeFileSync(path.join(OUT, 'controles.json'), JSON.stringify(report, null, 2));
  const bad = report.filter((x) => x.errors.length || x.overflowPx > 0 || (x.smallTargets && x.smallTargets.length));
  console.log(`${report.length} contrôles (${report.filter((x) => x.mode === 'local').length} en mode local, ${report.filter((x) => x.mode !== 'local').length} serveur configuré simulé), ${report.filter((x) => x.file).length} captures`);
  for (const x of report.filter((y) => y.indicator)) console.log(`  indicateur [${x.mode}, ${x.width}, ${x.theme}] : ${x.indicator}`);
  if (bad.length) {
    console.log('PROBLÈMES :');
    for (const x of bad) console.log(`  ${x.mode} ${x.route} ${x.width} ${x.theme} : débordement ${x.overflowPx} px ; cibles < 44 px : ${x.smallTargets.join(', ') || 'aucune'} ; erreurs : ${x.errors.join(' | ') || 'aucune'}`);
    process.exitCode = 1;
  } else console.log('Aucune erreur console, aucun débordement horizontal, aucune cible tactile < 44 px.');
})();
