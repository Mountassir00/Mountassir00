import type { ConceptIdentity } from '../model';

/**
 * Studio d'identité visuelle (exigence §12) : génère des maquettes SVG
 * cohérentes à partir de l'identité d'un concept — toujours signées
 * « by Bask'Est » (système de marque modulaire : la marque mère endosse
 * chaque propriété). Ce sont des MAQUETTES de direction artistique, à
 * finaliser par un graphiste ; les noms doivent passer les vérifications PI.
 */

export interface AssetInput {
  identity: ConceptIdentity;
  date?: string;
  venue?: string;
  city?: string;
  price?: string;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const FONT = "'Archivo Black', 'Arial Black', 'Helvetica Neue', Arial, sans-serif\" font-weight=\"900";
/** Taille de police qui fait tenir `text` dans `maxWidth` (estimation 0,62 em / caractère en capitales grasses). */
export function fitSize(text: string, maxWidth: number, maxSize: number, minSize = 10): number {
  return Math.max(minSize, Math.min(maxSize, Math.floor(maxWidth / Math.max(1, text.length * 0.66))));
}
/** Coupe un nom en deux lignes équilibrées. */
export function splitTwo(text: string): [string, string] {
  const w = text.split(' ');
  if (w.length < 2) return [text, ''];
  let best = 1;
  let bestDiff = Infinity;
  for (let i = 1; i < w.length; i++) {
    const d = Math.abs(w.slice(0, i).join(' ').length - w.slice(i).join(' ').length);
    if (d < bestDiff) {
      bestDiff = d;
      best = i;
    }
  }
  return [w.slice(0, best).join(' '), w.slice(best).join(' ')];
}
const TEXT = "Inter, 'Helvetica Neue', Arial, sans-serif";

function colors(id: ConceptIdentity) {
  const [bg = '#0B1F3A', accent = '#F26B1D', third = '#C9A227', light = '#F5F1E8'] = id.palette;
  return { bg, accent, third, light };
}

/** Motif graphique signature (chardon / Art nouveau / flèche Est) en SVG. */
function motif(id: ConceptIdentity, color: string, x: number, y: number, s: number, opacity = 0.18): string {
  const m = id.motif.toLowerCase();
  if (m.includes('chardon'))
    return `<g transform="translate(${x},${y}) scale(${s})" opacity="${opacity}" fill="none" stroke="${color}" stroke-width="3">
      <circle cx="50" cy="40" r="18"/><path d="M50 22 L50 2 M36 28 L22 12 M64 28 L78 12 M32 40 L12 36 M68 40 L88 36"/>
      <path d="M50 58 L50 120 M50 80 C30 72 20 90 8 84 M50 92 C70 84 80 102 92 96"/></g>`;
  if (m.includes('art nouveau') || m.includes('arabesque'))
    return `<g transform="translate(${x},${y}) scale(${s})" opacity="${opacity}" fill="none" stroke="${color}" stroke-width="3">
      <path d="M0 100 C30 20 70 20 100 100 M10 100 C40 40 60 40 90 100 M50 100 C50 60 80 50 90 10 M50 100 C50 60 20 50 10 10"/></g>`;
  if (m.includes('croix'))
    return `<g transform="translate(${x},${y}) scale(${s})" opacity="${opacity}" fill="${color}">
      <rect x="44" y="0" width="12" height="120"/><rect x="24" y="22" width="52" height="10"/><rect x="14" y="52" width="72" height="10"/></g>`;
  if (m.includes('grille') || m.includes('stanislas'))
    return `<g transform="translate(${x},${y}) scale(${s})" opacity="${opacity}" fill="none" stroke="${color}" stroke-width="3">
      ${Array.from({ length: 6 }, (_, i) => `<line x1="${i * 20}" y1="0" x2="${i * 20}" y2="120"/>`).join('')}
      <path d="M0 30 C25 0 75 0 100 30"/><circle cx="50" cy="60" r="14"/></g>`;
  return `<g transform="translate(${x},${y}) scale(${s})" opacity="${opacity}" fill="${color}"><path d="M0 40 L70 40 L70 10 L120 60 L70 110 L70 80 L0 80 Z"/></g>`;
}

export function logoSvg(i: AssetInput, w = 600, h = 300): string {
  const c = colors(i.identity);
  const [line1, line2] = splitTwo(i.identity.name.toUpperCase());
  const fs = fitSize(line1.length > line2.length ? line1 : line2, w - 200, 54);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <rect width="${w}" height="${h}" rx="24" fill="${c.bg}"/>
  ${motif(i.identity, c.accent, w - 170, 40, 1.4, 0.35)}
  <circle cx="90" cy="${h / 2}" r="52" fill="${c.accent}"/>
  <path d="M38 ${h / 2} H142 M90 ${h / 2 - 52} V${h / 2 + 52} M55 ${h / 2 - 38} C75 ${h / 2 - 10} 75 ${h / 2 + 10} 55 ${h / 2 + 38} M125 ${h / 2 - 38} C105 ${h / 2 - 10} 105 ${h / 2 + 10} 125 ${h / 2 + 38}" stroke="${c.bg}" stroke-width="5" fill="none"/>
  <text x="170" y="${h / 2 - (line2 ? 8 : -18)}" font-family="${FONT}" font-size="${fs}" fill="${c.light}" letter-spacing="1">${esc(line1)}</text>
  ${line2 ? `<text x="170" y="${h / 2 + fs - 4}" font-family="${FONT}" font-size="${fs}" fill="${c.accent}" letter-spacing="1">${esc(line2)}</text>` : ''}
  <text x="172" y="${h - 28}" font-family="${TEXT}" font-size="16" fill="${c.light}" opacity="0.8" letter-spacing="3">BY BASK’EST</text>
</svg>`;
}

export function posterSvg(i: AssetInput, w = 595, h = 842): string {
  const c = colors(i.identity);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.bg}"/><stop offset="1" stop-color="#05101F"/></linearGradient>
  <radialGradient id="spot" cx="0.5" cy="0.45" r="0.5"><stop offset="0" stop-color="${c.accent}" stop-opacity="0.55"/><stop offset="1" stop-color="${c.accent}" stop-opacity="0"/></radialGradient></defs>
  <rect width="${w}" height="${h}" fill="url(#g)"/>
  <rect width="${w}" height="${h}" fill="url(#spot)"/>
  ${motif(i.identity, c.light, w / 2 - 150, 120, 3, 0.12)}
  <circle cx="${w / 2}" cy="380" r="120" fill="${c.accent}"/>
  <path d="M${w / 2 - 120} 380 H${w / 2 + 120} M${w / 2} 260 V500 M${w / 2 - 85} 295 C${w / 2 - 40} 350 ${w / 2 - 40} 410 ${w / 2 - 85} 465 M${w / 2 + 85} 295 C${w / 2 + 40} 350 ${w / 2 + 40} 410 ${w / 2 + 85} 465" stroke="${c.bg}" stroke-width="8" fill="none"/>
  <text x="40" y="80" font-family="${TEXT}" font-size="16" fill="${c.light}" letter-spacing="4">BASK’EST PRÉSENTE</text>
  <rect x="${w - 110}" y="44" width="70" height="70" fill="${c.light}"/><text x="${w - 75}" y="84" text-anchor="middle" font-family="${TEXT}" font-size="11" fill="${c.bg}">QR</text>
  ${(() => {
    const [l1, l2] = i.identity.name.length > 14 ? splitTwo(i.identity.name.toUpperCase()) : [i.identity.name.toUpperCase(), ''];
    const fs = fitSize(l1.length > l2.length ? l1 : l2, w - 80, 64);
    return `<text x="40" y="${l2 ? 560 : 600}" font-family="${FONT}" font-size="${fs}" fill="${c.light}">${esc(l1)}</text>${l2 ? `<text x="40" y="${560 + fs}" font-family="${FONT}" font-size="${fs}" fill="${c.accent}">${esc(l2)}</text>` : ''}`;
  })()}
  <text x="40" y="660" font-family="${TEXT}" font-size="22" fill="${c.third}" font-style="italic">${esc(i.identity.tagline)}</text>
  <rect x="40" y="685" width="${w - 80}" height="2" fill="${c.accent}"/>
  <text x="40" y="722" font-family="${FONT}" font-size="${fitSize(i.date ?? 'DATE À ANNONCER', w - 80, 26)}" fill="${c.light}">${esc(i.date ?? 'DATE À ANNONCER')}</text>
  <text x="40" y="754" font-family="${TEXT}" font-size="${fitSize(`${i.venue ?? ''} · ${i.city ?? ''}`, (w - 80) * 1.25, 18)}" fill="${c.light}" opacity="0.85">${esc(i.venue ?? 'Lieu à annoncer')}${i.city && !(i.venue ?? '').includes(i.city) ? ' · ' + esc(i.city) : ''}</text>
  <text x="40" y="800" font-family="${TEXT}" font-size="14" fill="${c.light}" opacity="0.7">Billetterie en ligne${i.price ? ' · dès ' + esc(i.price) : ''} · Accès PMR · Gratuit -12 ans</text>
</svg>`;
}

export function jerseySvg(i: AssetInput, number = 23, player = 'NOM', variant: 'home' | 'away' = 'home'): string {
  const c = colors(i.identity);
  const body = variant === 'home' ? c.bg : c.light;
  const ink = variant === 'home' ? c.light : c.bg;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 360" width="300" height="360">
  <path d="M90 20 Q150 60 210 20 L270 60 L250 120 L225 110 L225 340 L75 340 L75 110 L50 120 L30 60 Z" fill="${body}" stroke="${c.accent}" stroke-width="6"/>
  <path d="M90 20 Q150 70 210 20" fill="none" stroke="${c.accent}" stroke-width="10"/>
  ${motif(i.identity, c.accent, 80, 150, 1.4, 0.25)}
  <text x="150" y="120" text-anchor="middle" font-family="${FONT}" font-size="${fitSize(i.identity.name, 140, 20, 9)}" fill="${ink}">${esc(i.identity.name.toUpperCase())}</text>
  <text x="150" y="235" text-anchor="middle" font-family="${FONT}" font-size="96" fill="${c.accent}">${number}</text>
  <text x="150" y="300" text-anchor="middle" font-family="${TEXT}" font-size="14" fill="${ink}" letter-spacing="3">${esc(player)}</text>
  <rect x="75" y="318" width="150" height="10" fill="${c.third}"/>
</svg>`;
}

export function ticketSvg(i: AssetInput, category = 'PLEIN TARIF', seat = 'Placement libre'): string {
  const c = colors(i.identity);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 240" width="640" height="240">
  <rect width="640" height="240" rx="18" fill="${c.bg}"/>
  <rect x="470" width="170" height="240" rx="18" fill="${c.accent}"/>
  <line x1="470" y1="10" x2="470" y2="230" stroke="${c.light}" stroke-dasharray="6 6"/>
  ${motif(i.identity, c.light, 300, 40, 1.4, 0.12)}
  <text x="30" y="50" font-family="${TEXT}" font-size="12" fill="${c.light}" letter-spacing="3" opacity="0.8">BILLET · BY BASK’EST</text>
  <text x="30" y="100" font-family="${FONT}" font-size="${fitSize(i.identity.name, 420, 34)}" fill="${c.light}">${esc(i.identity.name.toUpperCase())}</text>
  <text x="30" y="135" font-family="${TEXT}" font-size="${fitSize(i.date ?? 'Date', 520, 16)}" fill="${c.accent}">${esc(i.date ?? 'Date')}</text>
  <text x="30" y="160" font-family="${TEXT}" font-size="${fitSize(i.venue ?? 'Lieu', 540, 14)}" fill="${c.light}" opacity="0.85">${esc(i.venue ?? 'Lieu')}</text>
  <text x="30" y="200" font-family="${TEXT}" font-size="13" fill="${c.light}" opacity="0.8">${esc(seat)} · Billet nominatif — contrôle QR à l’entrée</text>
  <text x="555" y="60" text-anchor="middle" font-family="${FONT}" font-size="18" fill="${c.bg}">${esc(category)}</text>
  <rect x="505" y="85" width="100" height="100" fill="${c.light}"/><text x="555" y="140" text-anchor="middle" font-family="${TEXT}" font-size="12" fill="${c.bg}">QR</text>
</svg>`;
}

export function badgeSvg(i: AssetInput, role = 'BÉNÉVOLE', zones = ['Terrain', 'Coulisses']): string {
  const c = colors(i.identity);
  const roleColor: Record<string, string> = { 'BÉNÉVOLE': '#3BA272', 'JOUEUR': c.accent, 'MÉDIA': '#2E86AB', 'STAFF': '#8E7CC3', 'VIP': c.third, 'SECOURS': '#E63946' };
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 420" width="280" height="420">
  <rect width="280" height="420" rx="16" fill="${c.light}"/>
  <rect width="280" height="120" rx="16" fill="${c.bg}"/>
  <text x="140" y="60" text-anchor="middle" font-family="${FONT}" font-size="${fitSize(i.identity.name, 250, 22, 9)}" fill="${c.light}">${esc(i.identity.name.toUpperCase())}</text>
  <text x="140" y="90" text-anchor="middle" font-family="${TEXT}" font-size="11" fill="${c.light}" letter-spacing="3" opacity="0.8">ACCRÉDITATION</text>
  <circle cx="140" cy="185" r="50" fill="#D9DDE3"/><text x="140" y="190" text-anchor="middle" font-family="${TEXT}" font-size="11" fill="#6C757D">PHOTO</text>
  <text x="140" y="265" text-anchor="middle" font-family="${TEXT}" font-size="16" fill="${c.bg}">Prénom NOM</text>
  <rect x="0" y="290" width="280" height="56" fill="${roleColor[role] ?? c.accent}"/>
  <text x="140" y="327" text-anchor="middle" font-family="${FONT}" font-size="26" fill="#FFFFFF">${esc(role)}</text>
  <text x="140" y="372" text-anchor="middle" font-family="${TEXT}" font-size="12" fill="${c.bg}">Accès : ${esc(zones.join(' · '))}</text>
  <text x="140" y="400" text-anchor="middle" font-family="${TEXT}" font-size="10" fill="${c.bg}" opacity="0.6">by Bask’Est</text>
</svg>`;
}

export function socialSvg(i: AssetInput, headline = 'J-7', sub = 'Billetterie ouverte'): string {
  const c = colors(i.identity);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" width="540" height="540">
  <rect width="1080" height="1080" fill="${c.bg}"/>
  ${motif(i.identity, c.accent, 560, 80, 4, 0.2)}
  <text x="80" y="420" font-family="${FONT}" font-size="260" fill="${c.accent}">${esc(headline)}</text>
  <text x="80" y="560" font-family="${FONT}" font-size="${fitSize(i.identity.name, 920, 72)}" fill="${c.light}">${esc(i.identity.name.toUpperCase())}</text>
  <text x="80" y="640" font-family="${TEXT}" font-size="44" fill="${c.light}" opacity="0.85">${esc(sub)}</text>
  <rect x="80" y="900" width="920" height="6" fill="${c.third}"/>
  <text x="80" y="980" font-family="${TEXT}" font-size="34" fill="${c.light}" letter-spacing="6">BY BASK’EST</text>
</svg>`;
}

export function screenSvg(i: AssetInput, home = 'ÉQUIPE A', away = 'ÉQUIPE B', score = '15 – 13', clock = '02:41'): string {
  const c = colors(i.identity);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="640" height="360">
  <rect width="1280" height="720" fill="#05101F"/>
  ${motif(i.identity, c.accent, 900, 200, 3, 0.12)}
  <rect x="80" y="520" width="1120" height="140" rx="20" fill="${c.bg}" stroke="${c.accent}" stroke-width="4"/>
  <text x="140" y="610" font-family="${FONT}" font-size="48" fill="${c.light}">${esc(home)}</text>
  <text x="640" y="615" text-anchor="middle" font-family="${FONT}" font-size="72" fill="${c.accent}">${esc(score)}</text>
  <text x="1140" y="610" text-anchor="end" font-family="${FONT}" font-size="48" fill="${c.light}">${esc(away)}</text>
  <text x="640" y="500" text-anchor="middle" font-family="${TEXT}" font-size="36" fill="${c.third}">${esc(clock)}</text>
  <text x="80" y="110" font-family="${FONT}" font-size="${fitSize(i.identity.name, 1100, 56)}" fill="${c.light}">${esc(i.identity.name.toUpperCase())}</text>
  <text x="80" y="160" font-family="${TEXT}" font-size="28" fill="${c.light}" opacity="0.7">Vote MVP du public : scanne le QR</text>
</svg>`;
}

export const ASSET_KINDS = [
  { id: 'logo', label: 'Logo / logotype', render: (i: AssetInput) => logoSvg(i) },
  { id: 'poster', label: 'Affiche A4', render: (i: AssetInput) => posterSvg(i) },
  { id: 'jersey', label: 'Maillot', render: (i: AssetInput) => jerseySvg(i) },
  { id: 'ticket', label: 'Billet', render: (i: AssetInput) => ticketSvg(i) },
  { id: 'badge', label: 'Accréditation', render: (i: AssetInput) => badgeSvg(i) },
  { id: 'social', label: 'Visuel réseaux (1:1)', render: (i: AssetInput) => socialSvg(i) },
  { id: 'screen', label: 'Habillage écran géant', render: (i: AssetInput) => screenSvg(i) },
] as const;
