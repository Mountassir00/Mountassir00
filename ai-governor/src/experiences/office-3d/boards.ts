/**
 * Content of the office's glass boards, drawn from real state only:
 *  - kanban wall  ↔ task queue (tasks per status, tinted by department)
 *  - other boards ↔ pending decisions and the last audits
 */
import type { ScenePalette } from '@ds/three';
import type { AuditData, KanbanData } from './data';

const font = (p: ScenePalette, w: number, size: number) => `${w} ${Math.round(size)}px ${p.css.font}`;

function fit(ctx: CanvasRenderingContext2D, text: string, max: number) {
  if (ctx.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > max) t = t.slice(0, -1);
  return `${t}…`;
}

function frame(ctx: CanvasRenderingContext2D, w: number, h: number, p: ScenePalette, title: string, right: string) {
  const dark = p.scheme === 'dark';
  ctx.beginPath();
  ctx.roundRect(2, 2, w - 4, h - 4, 14);
  ctx.fillStyle = dark ? 'rgba(16,20,28,0.6)' : 'rgba(255,255,255,0.62)';
  ctx.fill();
  ctx.textBaseline = 'middle';
  ctx.fillStyle = dark ? '#eef2fa' : '#1a2030';
  ctx.font = font(p, 760, h * 0.064);
  ctx.fillText(title, 14, h * 0.08);
  ctx.font = font(p, 600, h * 0.05);
  ctx.fillStyle = dark ? 'rgba(222,228,242,0.72)' : 'rgba(40,46,60,0.66)';
  ctx.fillText(right, w - 14 - ctx.measureText(right).width, h * 0.08);
}

export function drawKanban(ctx: CanvasRenderingContext2D, w: number, h: number, p: ScenePalette, data: KanbanData) {
  const dark = p.scheme === 'dark';
  frame(ctx, w, h, p, 'File des tâches', `données ${data.nature}`);
  const n = data.columns.length;
  const pad = 9;
  const top = h * 0.17;
  const cw = (w - pad * (n + 1)) / n;
  data.columns.forEach((c, i) => {
    const x = pad + i * (cw + pad);
    ctx.beginPath();
    ctx.roundRect(x, top, cw, h - top - pad, 9);
    ctx.fillStyle = dark ? 'rgba(255,255,255,0.06)' : 'rgba(20,30,50,0.05)';
    ctx.fill();
    ctx.textBaseline = 'middle';
    ctx.font = font(p, 700, h * 0.047);
    ctx.fillStyle = dark ? '#e3e8f4' : '#283042';
    ctx.fillText(fit(ctx, c.title, cw - 30), x + 7, top + h * 0.05);
    const cnt = String(c.count);
    ctx.font = font(p, 760, h * 0.045);
    const tw = ctx.measureText(cnt).width + 11;
    ctx.beginPath();
    ctx.roundRect(x + cw - tw - 5, top + h * 0.05 - h * 0.032, tw, h * 0.064, h * 0.032);
    ctx.fillStyle = i === 1 && c.count ? p.css.accent : dark ? 'rgba(255,255,255,0.14)' : 'rgba(20,30,50,0.1)';
    ctx.fill();
    ctx.fillStyle = i === 1 && c.count ? '#ffffff' : dark ? '#eef2fa' : '#1c2230';
    ctx.fillText(cnt, x + cw - tw - 5 + 5.5, top + h * 0.05);
    const ch = (h - top - pad - h * 0.11) / 3 - 6;
    c.cards.forEach((card, k) => {
      const y = top + h * 0.1 + k * (ch + 6);
      ctx.beginPath();
      ctx.roundRect(x + 5, y, cw - 10, ch, 7);
      ctx.fillStyle = p.css.pastel[card.tone] ?? '#e8e8f0';
      ctx.globalAlpha = dark ? 0.88 : 1;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#1f2533';
      ctx.font = font(p, 650, h * 0.042);
      ctx.textBaseline = 'top';
      const words = card.title.split(' ');
      let line = '';
      let ly = y + 5;
      let lines = 0;
      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > cw - 20 && line) {
          ctx.fillText(line, x + 10, ly);
          ly += h * 0.048;
          line = word;
          if (++lines >= 2) break;
        } else line = test;
      }
      if (lines < 2 && line) ctx.fillText(fit(ctx, line, cw - 20), x + 10, ly);
      if (card.agent && ch > h * 0.16) {
        ctx.font = font(p, 600, h * 0.036);
        ctx.fillStyle = 'rgba(30,36,50,0.62)';
        ctx.fillText(fit(ctx, card.agent, cw - 20), x + 10, y + ch - h * 0.055);
      }
    });
    if (!c.cards.length) {
      ctx.font = font(p, 550, h * 0.04);
      ctx.fillStyle = dark ? 'rgba(220,226,240,0.45)' : 'rgba(40,46,60,0.4)';
      ctx.textBaseline = 'top';
      ctx.fillText('—', x + 9, top + h * 0.11);
    }
  });
}

const RISK = { low: 'faible', medium: 'moyen', high: 'élevé' } as Record<string, string>;

export function drawAudit(ctx: CanvasRenderingContext2D, w: number, h: number, p: ScenePalette, data: AuditData, title: string) {
  const dark = p.scheme === 'dark';
  frame(ctx, w, h, p, title, data.pendingCount ? `${data.pendingCount} à arbitrer` : 'rien à arbitrer');
  const x = 14;
  let y = h * 0.2;
  ctx.textBaseline = 'top';
  ctx.font = font(p, 700, h * 0.048);
  ctx.fillStyle = dark ? 'rgba(220,226,240,0.75)' : 'rgba(40,46,60,0.7)';
  ctx.fillText('PROPOSITIONS EN ATTENTE', x, y);
  y += h * 0.08;
  if (!data.pending.length) {
    ctx.font = font(p, 550, h * 0.05);
    ctx.fillText('Aucune', x, y);
    y += h * 0.09;
  }
  for (const d of data.pending) {
    ctx.beginPath();
    ctx.roundRect(x, y, w - 2 * x, h * 0.1, 8);
    ctx.fillStyle = dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.85)';
    ctx.fill();
    ctx.fillStyle = d.risk === 'high' ? p.css.status.error : d.risk === 'medium' ? p.css.status.waiting : p.css.status.validating;
    ctx.beginPath();
    ctx.arc(x + 12, y + h * 0.05, h * 0.018, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = font(p, 650, h * 0.046);
    ctx.fillStyle = dark ? '#eef2fa' : '#1c2230';
    ctx.textBaseline = 'middle';
    const r = `risque ${RISK[d.risk] ?? d.risk}`;
    ctx.fillText(fit(ctx, d.title, w - 2 * x - 40 - ctx.measureText(r).width), x + 24, y + h * 0.05);
    ctx.font = font(p, 600, h * 0.038);
    ctx.fillStyle = dark ? 'rgba(220,226,240,0.6)' : 'rgba(40,46,60,0.55)';
    ctx.fillText(r, w - x - 8 - ctx.measureText(r).width, y + h * 0.05);
    ctx.textBaseline = 'top';
    y += h * 0.125;
  }
  y += h * 0.02;
  ctx.font = font(p, 700, h * 0.048);
  ctx.fillStyle = dark ? 'rgba(220,226,240,0.75)' : 'rgba(40,46,60,0.7)';
  ctx.fillText('DERNIERS AUDITS', x, y);
  y += h * 0.08;
  ctx.font = font(p, 560, h * 0.046);
  ctx.fillStyle = dark ? '#dfe5f2' : '#2a3142';
  if (!data.recent.length) ctx.fillText('Aucun sur la période', x, y);
  for (const t of data.recent) {
    if (y > h - h * 0.1) break;
    ctx.fillText(`· ${fit(ctx, t, w - 2 * x - 10)}`, x, y);
    y += h * 0.075;
  }
}
