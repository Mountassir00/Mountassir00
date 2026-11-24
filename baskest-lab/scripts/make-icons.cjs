// Génère les icônes PNG de l'application installable (PWA) à partir d'un dessin SVG original.
// Usage : node scripts/make-icons.cjs   (Chromium + Playwright préinstallés)
// Dessin : anneau orange (le lieu, l'événement), « E » formé de traits arrondis, point or (le moment fort).
// Aucune reprise de marque existante.
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const out = path.join(__dirname, '..', 'public', 'icons');
/** @param {number} scale taille relative du motif (1 = plein cadre, 0.8 pour la zone sûre « maskable ») */
function svg({ rounded = true, scale = 1 } = {}) {
  const s = 512;
  const k = scale;
  const c = s / 2;
  const t = (v) => c + (v - c) * k;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s} ${s}" width="${s}" height="${s}">
  <rect width="${s}" height="${s}" rx="${rounded ? 112 : 0}" fill="#0b1a33"/>
  <circle cx="${c}" cy="${c}" r="${176 * k}" fill="none" stroke="#f26b1d" stroke-width="${30 * k}"/>
  <rect x="${t(168)}" y="${t(178)}" width="${34 * k}" height="${156 * k}" rx="${17 * k}" fill="#ffffff"/>
  <rect x="${t(168)}" y="${t(178)}" width="${176 * k}" height="${34 * k}" rx="${17 * k}" fill="#ffffff"/>
  <rect x="${t(168)}" y="${t(239)}" width="${120 * k}" height="${34 * k}" rx="${17 * k}" fill="#ffffff"/>
  <rect x="${t(168)}" y="${t(300)}" width="${176 * k}" height="${34 * k}" rx="${17 * k}" fill="#ffffff"/>
  <circle cx="${t(330)}" cy="${t(256)}" r="${21 * k}" fill="#c9a227"/>
</svg>`;
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'icon.svg'), svg());
  fs.writeFileSync(path.join(out, 'icon-maskable.svg'), svg({ rounded: false, scale: 0.78 }));
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const shots = [
    ['icon-192.png', 192, svg()],
    ['icon-512.png', 512, svg()],
    ['icon-maskable-512.png', 512, svg({ rounded: false, scale: 0.78 })],
    ['apple-touch-icon.png', 180, svg({ rounded: false, scale: 0.9 })],
  ];
  for (const [name, size, markup] of shots) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<html><body style="margin:0;background:transparent">${markup.replace('width="512" height="512"', `width="${size}" height="${size}"`)}</body></html>`);
    await page.screenshot({ path: path.join(out, name), omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
  }
  await browser.close();
  console.log(fs.readdirSync(out).join('\n'));
})();
