// Capture d'écran de chaque module (docs/screenshots) + détection d'erreurs console.
// Usage : npx vite preview --port 4173 &  puis  node scripts/screenshots.cjs [dossier]
const { chromium } = require('playwright');
const routes = ['accueil','notation','projets','post-evenement','tendances','veille','innovations','erreurs','generateur','labo','studio','salles','simulateur-sportif','simulateur-financier','programmation','dossiers','ecosysteme','notifications','collaboratif'];
(async () => {
  const out = process.argv[2] || 'docs/screenshots';
  const scale = Number(process.argv[3] || 1);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: scale });
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  for (const r of routes) {
    await page.goto(`http://localhost:4173/#/${r}`);
    await page.waitForTimeout(r === 'generateur' ? 300 : 600);
    if (r === 'generateur') { await page.click('text=Générer et évaluer'); await page.waitForTimeout(2500); }
    await page.screenshot({ path: `${out}/${r}.jpg`, type: 'jpeg', quality: 78, fullPage: false });
  }
  const m = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await m.goto('http://localhost:4173/#/accueil'); await m.waitForTimeout(800);
  await m.screenshot({ path: `${out}/mobile-accueil.jpg`, type: 'jpeg', quality: 78 });
  const overflow = await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  console.log('mobile horizontal overflow:', overflow);
  console.log(errors.length ? errors.join('\n') : 'no console errors');
  await browser.close();
})();
