#!/usr/bin/env node
// EVENT LAB — export d'un document Markdown en DOCX (pandoc) et PDF (pandoc → HTML → Chromium).
// Usage : node scripts/export-docs.mjs <fichier.md> [--out <dossier>] [--title "Titre"]
// Les images SVG sont rasterisées en PNG (Chromium) pour le DOCX ; le PDF garde les SVG vectoriels.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright'); // installé globalement dans l'environnement

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const src = path.resolve(args[0]);
const outDir = path.resolve(args.includes('--out') ? args[args.indexOf('--out') + 1] : path.join(path.dirname(src), 'exports'));
const title = args.includes('--title') ? args[args.indexOf('--title') + 1] : path.basename(src, '.md');
const base = path.basename(src, '.md');
const cwd = path.dirname(src);
fs.mkdirSync(outDir, { recursive: true });
const css = path.join(here, 'export-style.css');

// 1. HTML autonome → PDF
const html = path.join(outDir, `${base}.html`);
execFileSync('pandoc', [src, '-f', 'gfm+attributes', '-t', 'html5', '--standalone', '--toc', '--toc-depth=2', '--metadata', `pagetitle=${title}`, '--css', css, '--embed-resources', '--resource-path', cwd, '-o', html], { cwd, stdio: 'inherit' });
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`file://${html}`, { waitUntil: 'load' });
await page.pdf({
  path: path.join(outDir, `${base}.pdf`), format: 'A4', printBackground: true,
  margin: { top: '18mm', bottom: '18mm', left: '15mm', right: '15mm' },
  displayHeaderFooter: true,
  headerTemplate: `<div style="font-size:7pt;color:#6B7280;width:100%;padding:0 15mm;font-family:Inter,sans-serif">${title}</div>`,
  footerTemplate: '<div style="font-size:7pt;color:#6B7280;width:100%;padding:0 15mm;text-align:right;font-family:Inter,sans-serif">EVENT LAB · page <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
});

// 2. DOCX : SVG → PNG pour compatibilité des traitements de texte
let md = fs.readFileSync(src, 'utf8');
const tmp = fs.mkdtempSync(path.join(outDir, '.docx-'));
const svgs = [...new Set([...md.matchAll(/!\[[^\]]*\]\(([^)\s]+\.svg)\)/g)].map((m) => m[1]))];
for (const rel of svgs) {
  const abs = path.resolve(cwd, rel);
  if (!fs.existsSync(abs)) continue;
  const png = path.join(tmp, rel.replace(/[\\/]/g, '_').replace(/\.svg$/, '.png'));
  const svg = fs.readFileSync(abs, 'utf8');
  const vb = svg.match(/viewBox="[\d.\s-]+?\s([\d.]+)\s([\d.]+)"/);
  const w = Math.min(2000, Math.round(Number(vb?.[1] ?? 1200))), h = Math.round(Number(vb?.[2] ?? 800) * (w / Number(vb?.[1] ?? 1200)));
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(`<html><body style="margin:0">${svg.replace(/<svg /, `<svg width="${w}" height="${h}" `)}</body></html>`);
  await page.screenshot({ path: png, clip: { x: 0, y: 0, width: w, height: h } });
  md = md.split(`](${rel})`).join(`](${png})`);
}
await browser.close();
const mdTmp = path.join(tmp, `${base}.md`);
fs.writeFileSync(mdTmp, md);
execFileSync('pandoc', [mdTmp, '-f', 'gfm+attributes', '-t', 'docx', '--toc', '--toc-depth=2', '--metadata', `title=${title}`, '--resource-path', `${cwd}:${tmp}`, '-o', path.join(outDir, `${base}.docx`)], { cwd, stdio: 'inherit' });
fs.rmSync(tmp, { recursive: true, force: true });
fs.rmSync(html);
console.log(`${path.join(outDir, `${base}.pdf`)}\n${path.join(outDir, `${base}.docx`)}`);
