import { PART_LABELS, type Block, type Blueprint, type PartId } from './types';

/** Rendus du Blueprint : Markdown (Word/Notion), HTML imprimable (PDF). */

const mdEsc = (s: string | number) => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');

function blockMd(b: Block, assetPath: (name: string) => string): string {
  switch (b.kind) {
    case 'p':
      return b.text;
    case 'list':
      return b.items.map((x, i) => `${b.ordered ? `${i + 1}.` : '-'} ${x}`).join('\n');
    case 'table':
      return [b.caption ? `*${b.caption}*\n` : '', `| ${b.head.map(mdEsc).join(' | ')} |`, `|${b.head.map(() => '---').join('|')}|`, ...b.rows.map((r) => `| ${r.map(mdEsc).join(' | ')} |`)].join('\n');
    case 'kv':
      return b.items.map(([k, v]) => `- **${k}** : ${v}`).join('\n');
    case 'svg':
      return `![${b.caption}](${assetPath(b.name)})\n\n*${b.caption}*`;
    case 'callout':
      return `> ${b.tone === 'warn' ? '⚠️' : b.tone === 'ok' ? '✅' : 'ℹ️'} ${b.text}`;
  }
}

export function blueprintToMarkdown(bp: Blueprint, assetPath = (n: string) => `assets/${n}.svg`): string {
  const out: string[] = [`# ${bp.title}`, '', `**${bp.subtitle}** — Statut : ${bp.status} — Généré le ${bp.generatedAt.slice(0, 10)} par BASK’EST LAB`, ''];
  out.push('## Sommaire', '');
  let part: PartId | null = null;
  for (const s of bp.sections) {
    if (s.part !== part) {
      part = s.part;
      out.push(`- **${PART_LABELS[part]}**`);
    }
    out.push(`  - ${s.title}`);
  }
  part = null;
  for (const s of bp.sections) {
    if (s.part !== part) {
      part = s.part;
      out.push('', `# ${PART_LABELS[part]}`, '');
    }
    out.push(`## ${s.title}`, '');
    for (const b of s.blocks) out.push(blockMd(b, assetPath), '');
  }
  return out.join('\n');
}

const h = (s: string | number) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function blockHtml(b: Block): string {
  switch (b.kind) {
    case 'p':
      return `<p>${h(b.text)}</p>`;
    case 'list':
      return `<${b.ordered ? 'ol' : 'ul'}>${b.items.map((x) => `<li>${h(x)}</li>`).join('')}</${b.ordered ? 'ol' : 'ul'}>`;
    case 'table':
      return `<table>${b.caption ? `<caption>${h(b.caption)}</caption>` : ''}<thead><tr>${b.head.map((x) => `<th>${h(x)}</th>`).join('')}</tr></thead><tbody>${b.rows.map((r) => `<tr>${r.map((x) => `<td>${h(x)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    case 'kv':
      return `<dl>${b.items.map(([k, v]) => `<dt>${h(k)}</dt><dd>${h(v)}</dd>`).join('')}</dl>`;
    case 'svg':
      return `<figure>${b.svg.replace(/width="\d+" height="\d+"/, 'style="max-width:100%;height:auto"')}<figcaption>${h(b.caption)}</figcaption></figure>`;
    case 'callout':
      return `<aside class="callout ${b.tone}">${h(b.text)}</aside>`;
  }
}

export function blueprintToHtml(bp: Blueprint): string {
  let part: PartId | null = null;
  const body: string[] = [];
  const toc: string[] = [];
  for (const s of bp.sections) {
    if (s.part !== part) {
      part = s.part;
      body.push(`<h1 class="part" id="part-${part}">${h(PART_LABELS[part])}</h1>`);
      toc.push(`<li class="toc-part"><a href="#part-${part}">${h(PART_LABELS[part])}</a></li>`);
    }
    body.push(`<section id="${s.id}"><h2>${h(s.title)}</h2>${s.blocks.map(blockHtml).join('\n')}</section>`);
    toc.push(`<li><a href="#${s.id}">${h(s.title)}</a></li>`);
  }
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${h(bp.title)}</title>
<style>
:root{--ink:#0B1F3A;--accent:#F26B1D;--muted:#5B6B8C;--line:#DDE3EC;--paper:#FFFFFF}
*{box-sizing:border-box}body{font-family:Inter,'Helvetica Neue',Arial,sans-serif;color:var(--ink);background:var(--paper);margin:0;line-height:1.5;font-size:11pt}
.cover{min-height:100vh;background:var(--ink);color:#fff;padding:12vh 8vw;display:flex;flex-direction:column;justify-content:space-between;page-break-after:always}
.cover h1{font-size:44pt;line-height:1;margin:0 0 12px;font-weight:900;letter-spacing:-.5px}.cover .sub{color:var(--accent);font-size:16pt}.cover .meta{opacity:.75}
main{max-width:900px;margin:0 auto;padding:24px}
h1.part{page-break-before:always;font-size:24pt;border-bottom:4px solid var(--accent);padding-bottom:6px;margin-top:48px}
h2{font-size:15pt;margin:28px 0 8px;color:var(--ink)}section{page-break-inside:auto}
table{border-collapse:collapse;width:100%;margin:10px 0;font-size:9.5pt}th{background:var(--ink);color:#fff;text-align:left;padding:6px}td{border-bottom:1px solid var(--line);padding:5px 6px;vertical-align:top}
caption{caption-side:top;text-align:left;font-style:italic;color:var(--muted);padding:4px 0}
dl{display:grid;grid-template-columns:minmax(180px,35%) 1fr;gap:4px 16px}dt{font-weight:700}dd{margin:0}
figure{margin:16px 0;text-align:center}figcaption{color:var(--muted);font-size:9pt}
.callout{border-left:4px solid var(--muted);background:#F4F6FA;padding:8px 12px;margin:10px 0}.callout.warn{border-color:#E0A100;background:#FFF8E5}.callout.ok{border-color:#3BA272;background:#EEF8F2}
.toc{columns:2;font-size:10pt}.toc-part{font-weight:700;margin-top:6px;list-style:none}
@media print{main{max-width:none;padding:0 12mm}a{color:inherit;text-decoration:none}}
@page{size:A4;margin:14mm}
</style></head><body>
<div class="cover"><div><div class="meta">BASK’EST · EVENT BLUEPRINT</div></div><div><h1>${h(bp.title.replace(' — BASK’EST EVENT BLUEPRINT', ''))}</h1><div class="sub">${h(bp.subtitle)}</div></div><div class="meta">Statut : ${h(bp.status)} · Version ${bp.version} · généré le ${bp.generatedAt.slice(0, 10)} par BASK’EST LAB<br>Document de travail — estimations à remplacer par des devis, plans à valider.</div></div>
<main><h1>Sommaire</h1><ul class="toc">${toc.join('')}</ul>${body.join('\n')}</main></body></html>`;
}
