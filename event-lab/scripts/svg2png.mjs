#!/usr/bin/env node
// EVENT LAB — rasterise des SVG en PNG (Chromium) : node scripts/svg2png.mjs <in.svg> <out.png> [largeur]
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const [, , input, output, width] = process.argv;
const svg = fs.readFileSync(input, 'utf8');
const vb = svg.match(/viewBox="\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)\s*"/);
const vw = Number(vb?.[1] ?? 1000), vh = Number(vb?.[2] ?? 1000);
const w = Number(width ?? 1600), h = Math.round(vh * (w / vw));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: w, height: h } });
await page.setContent(`<html><body style="margin:0;background:transparent">${svg.replace(/<svg\b/, `<svg width="${w}" height="${h}"`)}</body></html>`);
await page.screenshot({ path: output, omitBackground: true, clip: { x: 0, y: 0, width: w, height: h } });
await browser.close();
console.log(output);
