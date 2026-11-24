/**
 * Canvas content of the glass boards — drawn from real state only:
 *  - kanban wall ↔ task queue (tasks by status, coloured by department)
 *  - whiteboard ↔ instruction audit / architecture (catalog topology with the
 *    edges that carried flows in the window highlighted, pending decisions)
 */
import type { Catalog, GovernorState } from '@sdk';
import type { ScenePalette } from '@ds/three';

export interface KanbanData {
  columns: Array<{ title: string; count: number; cards: Array<{ title: string; tone: string; agent: string }> }>;
  nature: string;
}

export function kanbanData(state: GovernorState, catalog: Catalog, now: number): KanbanData {
  const tone = new Map(catalog.departments.map((d) => [d.id, d.tone]));
  const agentName = new Map(catalog.agents.map((a) => [a.id, a.name]));
  const tasks = Object.values(state.tasks);
  const col = (title: string, list: typeof tasks) => ({
    title,
    count: list.length,
    cards: list
      .sort((a, b) => (b.startedAt ?? b.createdAt) - (a.startedAt ?? a.createdAt))
      .slice(0, 4)
      .map((t) => ({ title: t.title, tone: tone.get(t.departmentId ?? '') ?? 'p2', agent: agentName.get(t.agentId ?? '') ?? '' })),
  });
  return {
    columns: [
      col('À faire', tasks.filter((t) => t.status === 'pending')),
      col('En cours', tasks.filter((t) => t.status === 'running')),
      col('En pause', tasks.filter((t) => t.status === 'paused')),
      col('Terminé · 1 h', tasks.filter((t) => (t.status === 'succeeded' || t.status === 'failed') && (t.endedAt ?? 0) >= now - 3_600_000)),
    ],
    nature: tasks.some((t) => t.nature === 'real') ? 'mesuré' : 'démo',
  };
}

const font = (p: ScenePalette, w: number, size: number) => `${w} ${size}px ${p.css.font}`;

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function fitText(ctx: CanvasRenderingContext2D, text: string, max: number) {
  if (ctx.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > max) t = t.slice(0, -1);
  return `${t}…`;
}

/** Frosted background + title row common to both boards. */
function frame(ctx: CanvasRenderingContext2D, w: number, h: number, p: ScenePalette, title: string, right: string) {
  const dark = p.scheme === 'dark';
  rr(ctx, 2, 2, w - 4, h - 4, 14);
  ctx.fillStyle = dark ? 'rgba(18,22,30,0.55)' : 'rgba(255,255,255,0.58)';
  ctx.fill();
  ctx.fillStyle = dark ? '#e9edf6' : '#1c2230';
  ctx.font = font(p, 750, Math.round(h * 0.062));
  ctx.textBaseline = 'middle';
  ctx.fillText(title.toUpperCase(), 14, h * 0.075);
  ctx.font = font(p, 600, Math.round(h * 0.05));
  ctx.fillStyle = dark ? 'rgba(220,226,240,0.7)' : 'rgba(40,46,60,0.65)';
  const rw = ctx.measureText(right).width;
  ctx.fillText(right, w - 14 - rw, h * 0.075);
}

export function drawKanban(ctx: CanvasRenderingContext2D, w: number, h: number, p: ScenePalette, data: KanbanData) {
  const dark = p.scheme === 'dark';
  frame(ctx, w, h, p, 'File des tâches', `données ${data.nature}`);
  const n = data.columns.length;
  const pad = 10;
  const top = h * 0.16;
  const colW = (w - pad * (n + 1)) / n;
  data.columns.forEach((c, i) => {
    const x = pad + i * (colW + pad);
    rr(ctx, x, top, colW, h - top - pad, 10);
    ctx.fillStyle = dark ? 'rgba(255,255,255,0.05)' : 'rgba(20,30,50,0.05)';
    ctx.fill();
    ctx.font = font(p, 700, Math.round(h * 0.048));
    ctx.fillStyle = dark ? '#dfe5f2' : '#2a3142';
    ctx.textBaseline = 'middle';
    ctx.fillText(fitText(ctx, c.title, colW - 34), x + 8, top + h * 0.05);
    const cnt = String(c.count);
    ctx.font = font(p, 750, Math.round(h * 0.044));
    const cw = ctx.measureText(cnt).width + 12;
    rr(ctx, x + colW - cw - 6, top + h * 0.05 - h * 0.032, cw, h * 0.064, h * 0.032);
    ctx.fillStyle = dark ? 'rgba(255,255,255,0.12)' : 'rgba(20,30,50,0.09)';
    ctx.fill();
    ctx.fillStyle = dark ? '#eef2fa' : '#1c2230';
    ctx.fillText(cnt, x + colW - cw - 6 + 6, top + h * 0.05);
    const cardH = (h - top - pad - h * 0.11) / 4 - 6;
    c.cards.forEach((card, k) => {
      const y = top + h * 0.1 + k * (cardH + 6);
      rr(ctx, x + 6, y, colW - 12, cardH, 7);
      ctx.fillStyle = p.css.pastel[card.tone] ?? '#e8e8f0';
      ctx.globalAlpha = dark ? 0.9 : 1;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = dark ? '#f3f5fa' : '#1f2533';
      ctx.font = font(p, 650, Math.round(h * 0.04));
      ctx.textBaseline = 'top';
      const words = card.title.split(' ');
      let line = '';
      let ly = y + 6;
      let lines = 0;
      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > colW - 24 && line) {
          ctx.fillText(line, x + 12, ly);
          ly += h * 0.046;
          line = word;
          if (++lines >= 2) break;
        } else line = test;
      }
      if (lines < 2 && line) ctx.fillText(fitText(ctx, line, colW - 24), x + 12, ly);
      if (card.agent && cardH > h * 0.15) {
        ctx.font = font(p, 600, Math.round(h * 0.034));
        ctx.fillStyle = dark ? 'rgba(240,244,252,0.75)' : 'rgba(30,36,50,0.65)';
        ctx.fillText(fitText(ctx, card.agent, colW - 24), x + 12, y + cardH - h * 0.05);
      }
    });
    if (!c.cards.length) {
      ctx.font = font(p, 550, Math.round(h * 0.038));
      ctx.fillStyle = dark ? 'rgba(220,226,240,0.45)' : 'rgba(40,46,60,0.4)';
      ctx.textBaseline = 'top';
      ctx.fillText('—', x + 10, top + h * 0.11);
    }
  });
}

export interface ArchData {
  active: Set<string>;
  pendingInstructions: number;
  lastAudit: string;
}

const COLS: Array<{ ids: string[] }> = [
  { ids: ['you'] },
  { ids: ['governor'] },
  { ids: ['task-queue', 'event-bus'] },
  { ids: ['auditor', 'skillsmith', 'scout', 'scheduler'] },
  { ids: ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5'] },
];

export function drawArchitecture(ctx: CanvasRenderingContext2D, w: number, h: number, p: ScenePalette, catalog: Catalog, data: ArchData) {
  const dark = p.scheme === 'dark';
  frame(ctx, w, h, p, 'Architecture', data.pendingInstructions ? `${data.pendingInstructions} consigne(s) à arbitrer` : 'consignes à jour');
  const label = new Map<string, string>([...catalog.nodes.map((n) => [n.id, n.label] as const), ...catalog.agents.map((a) => [a.id, a.name] as const)]);
  const known = new Set(label.keys());
  const cols = COLS.map((c) => c.ids.filter((id) => known.has(id))).filter((c) => c.length);
  const top = h * 0.17;
  const bottom = h * 0.86;
  const pos = new Map<string, { x: number; y: number }>();
  const bw = Math.min(92, (w - 30) / cols.length - 14);
  const bh = h * 0.1;
  cols.forEach((ids, i) => {
    const x = 12 + (i + 0.5) * ((w - 24) / cols.length);
    ids.forEach((id, k) => pos.set(id, { x, y: top + ((k + 0.5) * (bottom - top)) / ids.length }));
  });
  // edges
  for (const e of catalog.edges) {
    const a = pos.get(e.from);
    const b = pos.get(e.to);
    if (!a || !b) continue;
    const on = data.active.has(`${e.from}>${e.to}`) || data.active.has(`${e.to}>${e.from}`);
    ctx.strokeStyle = on ? p.css.accent : dark ? 'rgba(220,226,240,0.25)' : 'rgba(40,50,70,0.22)';
    ctx.lineWidth = on ? 2.4 : 1.2;
    ctx.setLineDash(on ? [] : [4, 4]);
    ctx.beginPath();
    const mx = (a.x + b.x) / 2;
    ctx.moveTo(a.x + bw / 2, a.y);
    ctx.bezierCurveTo(mx, a.y, mx, b.y, b.x - bw / 2, b.y);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  // nodes
  for (const [id, q] of pos) {
    const isActive = [...data.active].some((k) => k.startsWith(`${id}>`) || k.endsWith(`>${id}`));
    rr(ctx, q.x - bw / 2, q.y - bh / 2, bw, bh, 8);
    ctx.fillStyle = dark ? 'rgba(30,36,48,0.85)' : 'rgba(255,255,255,0.92)';
    ctx.fill();
    ctx.lineWidth = isActive ? 2 : 1;
    ctx.strokeStyle = isActive ? p.css.accent : dark ? 'rgba(220,226,240,0.3)' : 'rgba(40,50,70,0.25)';
    ctx.stroke();
    ctx.fillStyle = dark ? '#e9edf6' : '#1c2230';
    ctx.font = font(p, 650, Math.round(h * 0.042));
    ctx.textBaseline = 'middle';
    const t = fitText(ctx, label.get(id) ?? id, bw - 10);
    ctx.fillText(t, q.x - ctx.measureText(t).width / 2, q.y);
  }
  ctx.font = font(p, 550, Math.round(h * 0.04));
  ctx.fillStyle = dark ? 'rgba(220,226,240,0.7)' : 'rgba(40,46,60,0.65)';
  ctx.textBaseline = 'middle';
  ctx.fillText(fitText(ctx, `Dernier audit des consignes : ${data.lastAudit}`, w - 28), 14, h * 0.93);
}
