/**
 * End-to-end checks: view switching (context kept, no reload, no LLM call),
 * lazy renderers, replay read-only, performance budgets, accessibility (axe),
 * reduced motion, idle suspension, mobile layouts.
 * Usage: npm run build && npm run test:e2e   (serves dist/ with vite preview)
 */
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../..');
const OUT = join(here, 'output');
mkdirSync(OUT, { recursive: true });
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const PORT = 4199;
const URL = `http://localhost:${PORT}/`;
// The view list is read from the running app, so adding or removing a view
// needs no test change. WebGL views get their own (looser) budget: their
// renderer is a separate lazy chunk and software GL is slow in CI.
let EXPERIENCES = [];
const BUDGET = { switchMs: 400, longTasks: 6, domNodes: 6000 };
const BUDGET_3D = { switchMs: 1500, longTasks: 12, domNodes: 6000 };

/** Opens a view through the launcher (G → search → Enter), like a user would. */
async function openView(page, name) {
  await page.keyboard.press('g');
  const box = page.getByRole('textbox', { name: 'Rechercher une vue' });
  await box.waitFor({ timeout: 3000 });
  await box.fill(name);
  await page.keyboard.press('Enter');
  await page.waitForFunction((n) => !document.querySelector('.stage__loading') && document.querySelector('main')?.getAttribute('aria-label')?.includes(n), name, { timeout: 8000 });
}

const results = { checks: [], perf: [], a11y: [] };
const check = (name, ok, detail = '') => {
  results.checks.push({ name, ok, detail });
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: root, stdio: 'pipe' });
await new Promise((res) => {
  server.stdout.on('data', (d) => String(d).includes(String(PORT)) && res());
  setTimeout(res, 4000);
});

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  const llmRequests = [];
  const chunks = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('request', (r) => {
    const u = r.url();
    if (/anthropic\.com|openai\.com|generativelanguage|mistral\.ai/.test(u)) llmRequests.push(u);
    const m = /assets\/([A-Za-z]+)-[\w-]+\.js$/.exec(u);
    if (m) chunks.push(m[1]);
  });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  EXPERIENCES = (await page.evaluate(() => window.__mag.views())).map((v) => [v.id, v.name, v.renderer]);
  check('Vues installées découvertes', EXPERIENCES.length >= 5, `${EXPERIENCES.length} vues`);

  check('Seul le moteur de rendu actif est chargé au démarrage', !chunks.some((c) => /AiOffice|SystemMap|Kanban|SpatialWorkspace|three/i.test(c)), `chunks: ${[...new Set(chunks)].join(', ')}`);

  // Establish context: period 7 j, a filter, a selected agent.
  await page.locator('.timeline').getByRole('button', { name: '7 j', exact: true }).click();
  await page.locator('.header').getByRole('button', { name: /^Filtres/ }).click();
  await page.getByRole('dialog', { name: 'Filtres' }).getByRole('button', { name: 'Sonnet 5.5' }).click();
  await page.getByRole('button', { name: 'Fermer', exact: true }).click();
  await page.keyboard.press('Control+k');
  await page.getByRole('combobox', { name: 'Rechercher' }).fill('Auditrice');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  const eventsBefore = await page.evaluate(() => window.__mag.eventCount());
  const navs = [];
  page.on('framenavigated', (f) => f === page.mainFrame() && navs.push(f.url()));

  for (let i = 0; i < EXPERIENCES.length; i++) {
    const [id, name, renderer] = EXPERIENCES[i];
    // Leaving a WebGL scene includes releasing its context; with the software rasteriser used here
    // (SwiftShader) the frame in flight alone takes ~300 ms, so the 3D switch budget applies.
    const afterWebgl = i > 0 && EXPERIENCES[i - 1][2] === 'webgl';
    const B = renderer === 'webgl' || afterWebgl ? BUDGET_3D : BUDGET;
    await page.keyboard.press('g');
    await page.getByRole('textbox', { name: 'Rechercher une vue' }).fill(name);
    const t0 = Date.now();
    await page.keyboard.press('Enter');
    await page.waitForFunction((n) => !document.querySelector('.stage__loading') && document.querySelector('main')?.getAttribute('aria-label')?.includes(n), name, { timeout: 8000 });
    const wall = Date.now() - t0;
    await page.waitForTimeout(1500);
    const inspector = await page.getByRole('complementary', { name: /Inspecteur : Auditrice/ }).count();
    const period = await page.locator('.timeline').getByRole('button', { name: '7 j', exact: true }).getAttribute('aria-pressed');
    const filters = await page.locator('.header').getByRole('button', { name: /Filtres, 1 actifs/ }).count();
    check(`${name} : contexte conservé (agent, période, filtre)`, inspector === 1 && period === 'true' && filters === 1, `inspecteur=${inspector} période=${period} filtres=${filters}`);
    // Performance sample (3 s).
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Performance.enable');
    const m0 = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
    const sample = await page.evaluate(async () => {
      let frames = 0;
      let long = 0;
      const obs = new PerformanceObserver((l) => (long += l.getEntries().length));
      try { obs.observe({ type: 'longtask' }); } catch {}
      const t0 = performance.now();
      await new Promise((res) => {
        const f = () => { frames++; performance.now() - t0 < 3000 ? requestAnimationFrame(f) : res(); };
        requestAnimationFrame(f);
      });
      obs.disconnect();
      return { fps: Math.round(frames / 3), long, dom: document.getElementsByTagName('*').length, heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : null, switchMs: window.__mag.lastSwitchMs() };
    });
    const m1 = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
    const cpu = Math.round(((m1.TaskDuration - m0.TaskDuration) / (m1.Timestamp - m0.Timestamp)) * 100);
    await cdp.detach();
    results.perf.push({ id, wallSwitchMs: wall, ...sample, cpuBusyPct: cpu });
    check(`${name} : bascule < ${B.switchMs} ms${afterWebgl && renderer !== 'webgl' ? ' (depuis une scène 3D)' : ''}`, wall < B.switchMs, `${wall} ms (mesure interne ${sample.switchMs ?? '—'} ms)`);
    check(`${name} : DOM < ${B.domNodes} nœuds`, sample.dom < B.domNodes, `${sample.dom}`);
    check(`${name} : tâches longues ≤ ${B.longTasks} sur 3 s`, sample.long <= B.longTasks, `${sample.long}, CPU ${cpu} %`);
    await page.screenshot({ path: join(OUT, `desktop-${id}.png`) });
    await page.addScriptTag({ content: AXE });
    const ax = await page.evaluate(async () => {
      const r = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] }, resultTypes: ['violations'] });
      return r.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help }));
    });
    results.a11y.push({ page: id, violations: ax });
    const serious = ax.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    check(`${name} : aucune violation axe grave`, serious.length === 0, serious.map((v) => `${v.id}×${v.nodes}`).join(', '));
  }
  const eventsAfter = await page.evaluate(() => window.__mag.eventCount());
  check('Aucun rechargement de page pendant les bascules', navs.length === 0, `${navs.length} navigation(s)`);
  check('Le journal d’événements continue (aucune perte, aucun redémarrage)', eventsAfter >= eventsBefore, `${eventsBefore} → ${eventsAfter}`);
  check('Aucun appel LLM depuis l’interface', llmRequests.length === 0 && (await page.evaluate(() => window.__mag.uiModelCalls())) === 0, llmRequests.join(', '));

  // Drawers accessibility (decisions + inspector).
  await page.keyboard.press('d');
  await page.waitForTimeout(300);
  await page.addScriptTag({ content: AXE });
  {
    const ax = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] }, resultTypes: ['violations'] })).violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help })));
    results.a11y.push({ page: 'decisions-drawer', violations: ax });
    const serious = ax.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    check('Centre de décision : aucune violation axe grave', serious.length === 0, serious.map((v) => `${v.id}×${v.nodes}`).join(', '));
  }
  await page.keyboard.press('Escape');

  // Admin pages accessibility.
  for (const [label, id] of [['Galerie', 'gallery'], ['Studio', 'studio'], ['Créer une expérience', 'builder'], ['Données', 'sources'], ['Réglages', 'settings']]) {
    await page.locator('.sidebar').getByRole('button', { name: label, exact: true }).click();
    await page.waitForTimeout(600);
    await page.addScriptTag({ content: AXE });
    const ax = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] }, resultTypes: ['violations'] })).violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help })));
    results.a11y.push({ page: id, violations: ax });
    const serious = ax.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    check(`${label} : aucune violation axe grave`, serious.length === 0, serious.map((v) => `${v.id}×${v.nodes}`).join(', '));
    await page.screenshot({ path: join(OUT, `desktop-${id}.png`) });
  }
  await page.locator('.sidebar').getByRole('button', { name: 'Vues', exact: true }).click();

  // Replay is read-only.
  await openView(page, 'Control Center');
  await page.waitForTimeout(400);
  const box = await page.locator('.timeline__track').boundingBox();
  await page.mouse.click(box.x + box.width * 0.5, box.y + 8);
  await page.waitForTimeout(400);
  await page.keyboard.press('d');
  await page.waitForTimeout(200);
  const goDisabled = await page.getByRole('button', { name: 'GO', exact: true }).first().isDisabled().catch(() => true);
  check('Replay : arbitrages désactivés (lecture seule)', goDisabled);
  await page.keyboard.press('l');
  await page.waitForTimeout(200);
  check('Retour au direct', (await page.getByRole('button', { name: /Revenir au direct/ }).isDisabled()) === true);

  // Idle / hidden tab suspends animations.
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(200);
  const anim = await page.evaluate(() => document.documentElement.dataset.anim);
  check('Onglet masqué : animations suspendues', anim === 'paused', `data-anim=${anim}`);
  check('Onglet masqué : horloge d’animation arrêtée', (await page.evaluate(() => window.__mag.clockRunning())) === false);
  await ctx.close();

  // Dark theme accessibility on every experience.
  const dark = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
  const pd = await dark.newPage();
  await pd.goto(URL, { waitUntil: 'networkidle' });
  for (let i = 0; i < EXPERIENCES.length; i++) {
    const [id, name] = EXPERIENCES[i];
    await openView(pd, name);
    await pd.waitForTimeout(1000);
    await pd.addScriptTag({ content: AXE });
    const ax = await pd.evaluate(async () => (await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] }, resultTypes: ['violations'] })).violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help })));
    results.a11y.push({ page: `dark-${id}`, violations: ax });
    const serious = ax.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    check(`Thème sombre ${name} : aucune violation axe grave`, serious.length === 0, serious.map((v) => `${v.id}×${v.nodes}`).join(', '));
    await pd.screenshot({ path: join(OUT, `dark-${id}.png`) });
  }
  await dark.close();

  // Reduced motion.
  const rm = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  const p2 = await rm.newPage();
  await p2.goto(URL, { waitUntil: 'networkidle' });
  check('Préférence « réduire les mouvements » respectée', (await p2.evaluate(() => document.documentElement.dataset.motion)) !== 'ambient');
  await rm.close();

  // Mobile layouts.
  const mob = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const pm = await mob.newPage();
  pm.on('pageerror', (e) => errors.push(`[mobile] ${e.message}`));
  await pm.goto(URL, { waitUntil: 'networkidle' });
  for (const [id, name] of EXPERIENCES) {
    // The bottom bar's current "Vue" tab opens the launcher in every view (immersive ones hide the header switcher).
    await pm.locator('.mobile-nav').getByRole('button', { name: 'Vue, changer de vue' }).click();
    await pm.getByRole('textbox', { name: 'Rechercher une vue' }).fill(name);
    await pm.locator('.launcher__open').first().click();
    await pm.waitForFunction((n) => !document.querySelector('.stage__loading') && document.querySelector('main')?.getAttribute('aria-label')?.includes(n), name, { timeout: 8000 });
    await pm.waitForTimeout(1200);
    const overflow = await pm.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    check(`Mobile ${name} : pas de défilement horizontal`, !overflow);
    await pm.screenshot({ path: join(OUT, `mobile-${id}.png`) });
  }
  await mob.close();
  check('Aucune erreur JavaScript', errors.length === 0, errors.slice(0, 3).join(' | '));
} finally {
  await browser.close();
  server.kill();
}

writeFileSync(join(OUT, 'report.json'), JSON.stringify(results, null, 2));
const failed = results.checks.filter((c) => !c.ok);
console.log(`\n${results.checks.length - failed.length}/${results.checks.length} vérifications réussies.`);
console.table(results.perf);
process.exit(failed.length ? 1 : 0);
