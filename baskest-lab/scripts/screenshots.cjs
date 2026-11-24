// Captures d'écran + contrôles automatiques (erreurs console, débordement horizontal, zones tactiles).
// Préalable : npx vite build && npx vite preview --port 4173 &
// Usage :
//   node scripts/screenshots.cjs [dossier] [échelle]           → tous les modules en 1440 px (comme avant) + accueil mobile
//   node scripts/screenshots.cjs [dossier] [échelle] --matrix  → modules nouveaux et modifiés en 1440 / 400 / 360 px,
//                                                                 thèmes clair et sombre ; contrôle de tous les modules en 360 px
// Chromium et Playwright sont préinstallés dans l'environnement (ne pas lancer `playwright install`).
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const BASE = process.env.BASE_URL || 'http://localhost:4173/';
const ALL = ['accueil', 'notation', 'projets', 'post-evenement', 'tendances', 'veille', 'innovations', 'erreurs', 'generateur', 'labo', 'studio', 'salles', 'simulateur-sportif', 'simulateur-financier', 'programmation', 'dossiers', 'ecosysteme', 'notifications', 'collaboratif', 'portefeuille', 'studio-config', 'generateur-multi', 'briques', 'application'];
const TARGETS = ['accueil', 'portefeuille', 'studio-config', 'generateur-multi', 'briques', 'erreurs', 'veille', 'application'];
const WIDTHS = [1440, 400, 360];
const THEMES = ['light', 'dark'];
// Onglets supplémentaires capturés pour le studio de configuration
const EXTRA = { 'studio-config': ['Trésorerie et sensibilité', 'Compétition et flux', 'Incidents', 'Notation et portes', 'Versions'] };

async function open(browser, width, theme, scale) {
  const ctx = await browser.newContext({ viewport: { width, height: width > 900 ? 900 : 800 }, deviceScaleFactor: scale, colorScheme: theme, hasTouch: width <= 900, isMobile: width <= 900 });
  await ctx.addInitScript((t) => {
    try {
      localStorage.setItem('baskest-lab:theme', JSON.stringify(t));
    } catch {}
  }, theme);
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
      const els = [...document.querySelectorAll('button, select, input:not([type="checkbox"]):not([type="radio"]):not([type="range"]), [role="tab"], .drawer a, .mobile-nav button')];
      small = els
        .filter((e) => {
          const r = e.getBoundingClientRect();
          const st = getComputedStyle(e);
          return r.width > 0 && r.height > 0 && st.visibility !== 'hidden' && (r.height < 44 || r.width < 44) && !e.classList.contains('linkbtn');
        })
        .map((e) => `${e.tagName.toLowerCase()}${e.className ? '.' + String(e.className).split(' ')[0] : ''} ${Math.round(e.getBoundingClientRect().width)}×${Math.round(e.getBoundingClientRect().height)}`);
    }
    return { overflow, small };
  }, width);
}

async function goto(page, route) {
  await page.goto(`${BASE}#/${route}`);
  await page.waitForTimeout(route === 'generateur' ? 300 : 700);
  if (route === 'generateur') {
    await page.click('text=Générer et évaluer');
    await page.waitForTimeout(2500);
  }
}

(async () => {
  const out = process.argv[2] || 'docs/screenshots';
  const scale = Number(process.argv[3] || 1);
  const matrix = process.argv.includes('--matrix');
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const report = [];

  if (!matrix) {
    const { ctx, page, errors } = await open(browser, 1440, 'light', scale);
    for (const r of ALL) {
      await goto(page, r);
      await page.screenshot({ path: `${out}/${r}.jpg`, type: 'jpeg', quality: 78, fullPage: false });
    }
    await ctx.close();
    const m = await open(browser, 390, 'light', 2);
    await m.page.goto(`${BASE}#/accueil`);
    await m.page.waitForTimeout(800);
    await m.page.screenshot({ path: `${out}/mobile-accueil.jpg`, type: 'jpeg', quality: 78 });
    const c = await checks(m.page, 390);
    console.log('mobile horizontal overflow:', c.overflow > 0);
    console.log(errors.concat(m.errors).length ? errors.concat(m.errors).join('\n') : 'no console errors');
    await browser.close();
    return;
  }

  // 1) Modules nouveaux et modifiés : 3 largeurs × 2 thèmes
  for (const width of WIDTHS) {
    for (const theme of THEMES) {
      const { ctx, page, errors } = await open(browser, width, theme, 1);
      for (const r of TARGETS) {
        const before = errors.length;
        await goto(page, r);
        const file = `${r}-${width}-${theme}.jpg`;
        await page.screenshot({ path: path.join(out, file), type: 'jpeg', quality: 72, fullPage: width <= 900 });
        const c = await checks(page, width);
        report.push({ route: r, width, theme, file, overflowPx: c.overflow, smallTargets: c.small, errors: errors.slice(before) });
        for (const label of (EXTRA[r] || [])) {
          if (!(width === 1440 || (width === 400 && theme === 'dark') || (width === 360 && theme === 'light'))) continue;
          const b2 = errors.length;
          await page.getByRole('tab', { name: label }).click();
          await page.waitForTimeout(400);
          await page.evaluate(() => window.scrollTo(0, 0));
          const slug = label.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]+/g, '-').replace(/-$/, '');
          const f2 = `${r}-${slug}-${width}-${theme}.jpg`;
          await page.screenshot({ path: path.join(out, f2), type: 'jpeg', quality: 72, fullPage: width <= 900 });
          const c2 = await checks(page, width);
          report.push({ route: `${r} › ${label}`, width, theme, file: f2, overflowPx: c2.overflow, smallTargets: c2.small, errors: errors.slice(b2) });
        }
      }
      // Menu mobile ouvert
      if (width <= 900) {
        await goto(page, 'accueil');
        await page.getByRole('button', { name: 'Menu' }).click();
        await page.waitForTimeout(300);
        const fm = `menu-${width}-${theme}.jpg`;
        await page.screenshot({ path: path.join(out, fm), type: 'jpeg', quality: 80 });
        const cm = await checks(page, width);
        report.push({ route: 'menu mobile', width, theme, file: fm, overflowPx: cm.overflow, smallTargets: cm.small, errors: [] });
        await page.keyboard.press('Escape');
      }
      await ctx.close();
    }
  }

  // 2) Non-régression : tous les modules, sans capture, en 1440 px et 360 px (thème clair)
  for (const width of [1440, 360]) {
    const { ctx, page, errors } = await open(browser, width, 'light', 1);
    for (const r of ALL) {
      const before = errors.length;
      await goto(page, r);
      const c = await checks(page, width);
      report.push({ route: r, width, theme: 'light', file: null, overflowPx: c.overflow, smallTargets: width <= 900 ? c.small : [], errors: errors.slice(before), regression: true });
    }
    await ctx.close();
  }
  await browser.close();

  fs.writeFileSync(path.join(out, 'rapport.json'), JSON.stringify(report, null, 2));
  const bad = report.filter((x) => x.errors.length || x.overflowPx > 0);
  const smallNew = report.filter((x) => !x.regression && x.smallTargets.length);
  console.log(`${report.filter((x) => x.file).length} captures, ${report.length} contrôles`);
  console.log(`erreurs console ou débordement horizontal : ${bad.length}`);
  for (const b of bad) console.log(` - ${b.route} ${b.width}px ${b.theme} : débordement ${b.overflowPx}px ; ${b.errors.join(' | ')}`);
  console.log(`pages (nouvelles/modifiées) avec zones tactiles < 44 px : ${smallNew.length}`);
  for (const s of smallNew.slice(0, 20)) console.log(` - ${s.route} ${s.width}px ${s.theme} : ${s.smallTargets.slice(0, 6).join(', ')}${s.smallTargets.length > 6 ? ' …' : ''}`);
  const smallOld = report.filter((x) => x.regression && x.smallTargets.length).map((x) => x.route);
  if (smallOld.length) console.log(`(modules existants avec zones < 44 px à 360 px : ${[...new Set(smallOld)].join(', ')})`);
})();
