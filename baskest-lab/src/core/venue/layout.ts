import type { Layout, LayoutSpace, LayoutZone, Rect, Venue, ZoneType } from '../model';

/**
 * Configurateur d'infrastructures (exigence §9).
 *
 * Génère une implantation 2D : terrains (avec zones de dégagement), tribunes,
 * puis toutes les zones fonctionnelles réparties par un algorithme de bandes
 * (« shelf packing ») selon les préférences d'espace de chaque zone.
 *
 * Les règles de capacité / évacuation / PMR implémentées sont INDICATIVES
 * (inspirées du règlement ERP) : toute implantation doit être validée par le
 * gestionnaire du lieu, un chargé de sécurité et, si requis, la commission
 * de sécurité. L'outil prépare la discussion, il ne la remplace pas.
 */

export const COURT_5X5 = { length: 28, width: 15 };
export const COURT_3X3 = { length: 15, width: 11 };

export interface LayoutRequest {
  variant: 'show' | 'tournoi' | 'hybride' | 'festival';
  fullCourts: number;
  halfCourts: number;
  runOffM: number;
  spectators: number;
  participants: number;
  teams: number;
  volunteers: number;
  partners: number;
  vipGuests: number;
  /** Zones à ne pas prévoir (ex. pas de VIP pour un tournoi de quartier). */
  exclude?: ZoneType[];
}

interface ZoneNeed {
  type: ZoneType;
  label: string;
  m2: number;
  minSide: number;
  prefer: string[]; // ordre de préférence d'espace : 'principal', 'annexe', 'hall', 'exterieur', 'coursive'
  capacity?: number;
}

export const ZONE_COLORS: Record<ZoneType, string> = {
  terrain: '#E8743B',
  tribune: '#5B6B8C',
  tribune_mobile: '#7A8AAE',
  echauffement: '#F2A65A',
  joueurs: '#3BA272',
  benevoles: '#8E7CC3',
  village_partenaires: '#2E86AB',
  restauration: '#D1495B',
  vip: '#C9A227',
  contenu: '#E056A0',
  medias: '#4F9DA6',
  animation: '#F4C542',
  accueil: '#7FB069',
  secours: '#E63946',
  regie: '#6C757D',
  stockage: '#A0A4A8',
  circulation: '#CFD4DA',
};

export const ZONE_LABELS: Record<ZoneType, string> = {
  terrain: 'Terrain',
  tribune: 'Tribune fixe',
  tribune_mobile: 'Tribune mobile',
  echauffement: 'Échauffement',
  joueurs: 'Espace joueurs',
  benevoles: 'Base bénévoles',
  village_partenaires: 'Village partenaires',
  restauration: 'Restauration',
  vip: 'Espace VIP',
  contenu: 'Zone création de contenu',
  medias: 'Espace médias',
  animation: 'Zone d’animation',
  accueil: 'Accueil / contrôle',
  secours: 'Poste de secours',
  regie: 'Régie / table de marque',
  stockage: 'Stockage',
  circulation: 'Circulation',
};

function needs(req: LayoutRequest, venue: Venue): ZoneNeed[] {
  const s = req.spectators;
  const foodPoints = Math.max(1, Math.ceil(s / 400));
  const fixed = venue.fixedSeats;
  const mobileSeats = Math.max(0, Math.min(s, Math.round(s * 0.7)) - fixed);
  const list: ZoneNeed[] = [
    { type: 'regie', label: 'Régie / table de marque', m2: 12, minSide: 2, prefer: ['principal'] },
    { type: 'secours', label: 'Poste de secours', m2: s > 1500 ? 30 : 15, minSide: 3, prefer: ['principal', 'hall', 'annexe', 'exterieur'] },
    { type: 'accueil', label: 'Accueil / billetterie / contrôle', m2: 20 + s * 0.01, minSide: 3, prefer: ['hall', 'exterieur', 'principal'] },
    { type: 'echauffement', label: 'Échauffement', m2: Math.max(60, Math.ceil(req.teams / 8) * 165), minSide: 8, prefer: ['annexe', 'principal', 'exterieur'] },
    { type: 'joueurs', label: 'Espace joueurs (check-in, repos)', m2: Math.max(30, req.participants * 1.5), minSide: 4, prefer: ['annexe', 'principal', 'hall'] },
    { type: 'benevoles', label: 'Base bénévoles', m2: Math.max(15, req.volunteers), minSide: 3, prefer: ['annexe', 'hall', 'principal'] },
    { type: 'restauration', label: `Restauration (${foodPoints} point${foodPoints > 1 ? 's' : ''})`, m2: foodPoints * 27, minSide: 3, prefer: ['hall', 'exterieur', 'coursive', 'principal'] },
    { type: 'village_partenaires', label: `Village partenaires (${req.partners} stands)`, m2: req.partners * 9 * 1.5, minSide: 4, prefer: ['hall', 'exterieur', 'coursive', 'annexe', 'principal'] },
    { type: 'contenu', label: 'Zone création de contenu (photocall, interviews)', m2: 30, minSide: 4, prefer: ['principal', 'hall', 'annexe'] },
    { type: 'medias', label: 'Espace médias', m2: s > 1000 ? 30 : 15, minSide: 3, prefer: ['principal', 'hall', 'annexe'] },
    { type: 'vip', label: `Espace VIP (${req.vipGuests} invités)`, m2: Math.max(20, req.vipGuests * 1.2), minSide: 4, prefer: ['principal', 'annexe', 'hall'], capacity: req.vipGuests },
    { type: 'animation', label: 'Zone d’animation (concours, enfants)', m2: req.variant === 'festival' ? 200 : 60, minSide: 5, prefer: ['exterieur', 'hall', 'annexe', 'principal'] },
    { type: 'stockage', label: 'Stockage matériel', m2: 20, minSide: 3, prefer: ['annexe', 'hall', 'principal'] },
  ];
  if (mobileSeats > 0)
    list.splice(2, 0, {
      type: 'tribune_mobile',
      label: `Tribunes mobiles (${mobileSeats} places)`,
      m2: mobileSeats * 0.5,
      minSide: 3,
      prefer: ['principal', 'exterieur'],
      capacity: mobileSeats,
    });
  const ex = new Set(req.exclude ?? []);
  if (req.vipGuests === 0) ex.add('vip');
  if (req.partners === 0) ex.add('village_partenaires');
  return list.filter((z) => !ex.has(z.type));
}

/** Unités de passage d'une largeur (règle ERP usuelle : 0,90 m = 1 UP, 1,40 m = 2 UP, n × 0,60 m au-delà). */
export function widthToUP(w: number): number {
  if (w >= 1.8) return Math.floor(w / 0.6);
  if (w >= 1.4) return 2;
  if (w >= 0.9) return 1;
  return 0;
}

export function requiredExits(people: number): number {
  if (people <= 19) return 1;
  if (people <= 1000) return 2;
  return 2 + Math.ceil((people - 1000) / 500);
}

export function requiredPmrPlaces(seats: number): number {
  if (seats <= 0) return 0;
  if (seats <= 50) return 2;
  if (seats <= 1000) return 2 + Math.ceil((seats - 50) / 50);
  return 20; // minimum ; au-delà de 1 000 places, fixé par arrêté municipal
}

export function generateLayout(venue: Venue, req: LayoutRequest): Layout {
  const warnings: string[] = [];
  const unplaced: string[] = [];
  const zones: LayoutZone[] = [];
  const gap = 2; // espace entre espaces sur le canevas

  // --- Canevas : espace principal à gauche, annexes empilées à droite ---
  const hasFixed = venue.fixedSeats > 0;
  const standBand = hasFixed ? 6 : 0; // représentation des tribunes fixes autour du parquet
  const spaces: LayoutSpace[] = [
    { id: 'principal', name: venue.type === 'place_publique' ? 'Emprise de l’événement' : 'Aire principale', kind: 'principal', x: standBand, y: standBand, w: venue.floor.length, h: venue.floor.width },
  ];
  let ax = standBand * 2 + venue.floor.length + gap * 3;
  let ay = 0;
  for (const sp of venue.spaces ?? []) {
    spaces.push({ id: sp.id, name: sp.name, kind: sp.kind, x: ax, y: ay, w: sp.length, h: sp.width });
    ay += sp.width + gap * 2;
  }
  const canvas = {
    width: Math.max(...spaces.map((s) => s.x + s.w)) + (hasFixed ? 0 : 0),
    height: Math.max(standBand * 2 + venue.floor.width, ...spaces.map((s) => s.y + s.h)),
  };
  if (hasFixed) {
    const L = venue.floor.length;
    const W = venue.floor.width;
    zones.push(
      { id: 'tribune-n', type: 'tribune', label: 'Tribune fixe', x: standBand, y: 0, w: L, h: standBand, spaceId: 'principal' },
      { id: 'tribune-s', type: 'tribune', label: 'Tribune fixe', x: standBand, y: standBand + W, w: L, h: standBand, spaceId: 'principal' },
      { id: 'tribune-o', type: 'tribune', label: 'Tribune fixe', x: 0, y: standBand, w: standBand, h: W, spaceId: 'principal' },
      { id: 'tribune-e', type: 'tribune', label: 'Tribune fixe', x: standBand + L, y: standBand, w: standBand, h: W, spaceId: 'principal' },
    );
  }

  // --- Espaces libres (rectangles) par espace ---
  const free = new Map<string, Rect[]>(spaces.map((s) => [s.id, [{ x: s.x, y: s.y, w: s.w, h: s.h }]]));

  // --- Terrains ---
  const ro = req.runOffM;
  if (ro < 2) warnings.push(`Zone de dégagement de ${ro} m : la pratique FIBA recommande au moins 2 m autour du terrain.`);
  if (ro < 1) warnings.push('BLOQUANT — dégagement inférieur à 1 m : risque de collision avec obstacles/public.');
  const courtRects: Rect[] = [];
  const fpFull = { w: COURT_5X5.length + ro * 2, h: COURT_5X5.width + ro * 2 };
  const fpHalf = { w: COURT_3X3.length + ro * 2, h: COURT_3X3.width + ro * 2 };
  let fullToPlace = req.fullCourts;
  let halfToPlace = req.halfCourts;

  const placeCourt = (fp: { w: number; h: number }, kind: '5x5' | '3x3', spaceOrder: string[], idx: number): boolean => {
    for (const sid of spaceOrder) {
      const rects = free.get(sid);
      if (!rects) continue;
      for (let i = 0; i < rects.length; i++) {
        const r = rects[i];
        for (const rot of [false, true]) {
          const w = rot ? fp.h : fp.w;
          const h = rot ? fp.w : fp.h;
          if (w <= r.w + 1e-6 && h <= r.h + 1e-6) {
            // Centré verticalement dans la bande pour le terrain principal "show"
            const y = req.variant === 'show' && kind === '5x5' ? r.y + (r.h - h) / 2 : r.y;
            const x = req.variant === 'show' && kind === '5x5' ? r.x + (r.w - w) / 2 : r.x;
            const rect = { x, y, w, h };
            courtRects.push(rect);
            zones.push({
              id: `terrain-${kind}-${idx}`,
              type: 'terrain',
              label: kind === '5x5' ? `Terrain 5x5 n°${idx}` : `Terrain 3x3 n°${idx}`,
              ...rect,
              spaceId: sid,
            });
            rects.splice(i, 1, ...splitAround(r, rect));
            return true;
          }
        }
      }
    }
    return false;
  };

  for (let i = 1; fullToPlace > 0; i++, fullToPlace--)
    if (!placeCourt(fpFull, '5x5', ['principal', 'annexe', 'exterieur'], i)) {
      warnings.push(`Terrain 5x5 n°${i} impossible à implanter avec ${ro} m de dégagement (emprise ${fpFull.w} × ${fpFull.h} m).`);
      unplaced.push(`Terrain 5x5 n°${i}`);
    }
  for (let i = 1; halfToPlace > 0; i++, halfToPlace--)
    if (!placeCourt(fpHalf, '3x3', ['principal', 'annexe', 'exterieur', 'hall'], i)) {
      warnings.push(`Terrain 3x3 n°${i} impossible à implanter (emprise ${fpHalf.w} × ${fpHalf.h} m).`);
      unplaced.push(`Terrain 3x3 n°${i}`);
    }

  // --- Zones fonctionnelles (bandes) ---
  const list = needs(req, venue);
  for (const n of list) {
    let placed = false;
    const order = [...n.prefer, ...spaces.map((s) => s.kind)].filter((v, i, a) => a.indexOf(v) === i);
    for (const kind of order) {
      const targetSpaces = spaces.filter((s) => s.id === kind || s.kind === kind);
      for (const sp of targetSpaces) {
        const rects = (free.get(sp.id) ?? []).slice().sort((a, b) => b.w * b.h - a.w * a.h);
        for (const r of rects) {
          if (Math.min(r.w, r.h) < n.minSide) continue;
          const vertical = r.w >= r.h; // bande sur toute la hauteur si le rectangle est large
          const side = vertical ? r.h : r.w;
          let depth = n.m2 / side;
          if (depth < n.minSide) depth = n.minSide;
          const avail = vertical ? r.w : r.h;
          if (depth > avail) depth = avail;
          const rect = vertical ? { x: r.x, y: r.y, w: depth, h: r.h } : { x: r.x, y: r.y, w: r.w, h: depth };
          const got = rect.w * rect.h;
          if (got < n.m2 * 0.6) continue;
          zones.push({ id: `${n.type}-${zones.length}`, type: n.type, label: n.label, ...rect, spaceId: sp.id, capacity: n.capacity, requestedM2: Math.round(n.m2) });
          const list2 = free.get(sp.id)!;
          list2.splice(list2.indexOf(r), 1, ...splitAround(r, rect));
          if (got < n.m2 * 0.95) warnings.push(`${n.label} : ${Math.round(got)} m² obtenus pour ${Math.round(n.m2)} m² souhaités.`);
          placed = true;
          break;
        }
        if (placed) break;
      }
      if (placed) break;
    }
    if (!placed) {
      unplaced.push(n.label);
      warnings.push(`${n.label} (${Math.round(n.m2)} m²) : pas de place — prévoir un espace extérieur, un chapiteau ou réduire le besoin.`);
    }
  }

  // --- Capacités ---
  const mobile = zones.filter((z) => z.type === 'tribune_mobile').reduce((s, z) => s + Math.floor((z.w * z.h) / 0.5), 0);
  const seated = venue.fixedSeats + mobile;
  const standingArea = zones.filter((z) => z.type === 'animation' || z.type === 'village_partenaires').reduce((s, z) => s + z.w * z.h, 0);
  const standing = Math.floor(standingArea * 1); // 1 pers/m² (prudent, indicatif)
  const total = seated + standing;
  const gauge = venue.authorizedGauge ?? total;
  if (req.spectators > total) warnings.push(`Capacité estimée (${total}) inférieure au public attendu (${req.spectators}).`);
  if (venue.authorizedGauge && req.spectators > venue.authorizedGauge) warnings.push(`BLOQUANT — public attendu supérieur à la jauge autorisée (${venue.authorizedGauge}).`);
  const people = Math.min(req.spectators, gauge) + req.participants + req.volunteers;
  const reqExits = requiredExits(people);
  const reqUP = Math.ceil(people / 100);
  const availUP = venue.accesses.reduce((s, a) => s + widthToUP(a.widthM), 0);
  if (venue.accesses.length < reqExits) warnings.push(`Évacuation : ${venue.accesses.length} dégagements recensés pour ${reqExits} requis (indicatif) pour ${people} personnes.`);
  if (availUP < reqUP) warnings.push(`Évacuation : ${availUP} UP disponibles pour ${reqUP} requises (indicatif, 1 UP / 100 personnes).`);
  if (!venue.accesses.some((a) => a.pmr)) warnings.push('Aucun accès PMR recensé : bloquant pour l’accueil du public.');
  const pmr = requiredPmrPlaces(Math.min(seated, req.spectators));
  const foodZones = zones.filter((z) => z.type === 'restauration');
  if (!foodZones.length) warnings.push('Aucune restauration implantée : risque de frustration et perte de recettes.');

  // --- Flux ---
  const accueil = zones.find((z) => z.type === 'accueil');
  const court = zones.find((z) => z.type === 'terrain');
  const joueurs = zones.find((z) => z.type === 'joueurs');
  const secours = zones.find((z) => z.type === 'secours');
  const c = (z?: Rect): [number, number] => (z ? [z.x + z.w / 2, z.y + z.h / 2] : [0, 0]);
  const flows: Layout['flows'] = [];
  if (accueil && court) flows.push({ from: [accueil.x, accueil.y + accueil.h / 2], to: c(court), kind: 'entree' });
  if (joueurs && court) flows.push({ from: c(joueurs), to: c(court), kind: 'joueurs' });
  if (secours && court) flows.push({ from: c(secours), to: c(court), kind: 'secours' });
  const mainSpace = spaces[0];
  if (court) flows.push({ from: c(court), to: [mainSpace.x + mainSpace.w / 2, canvas.height], kind: 'sortie' });

  return {
    venueId: venue.id,
    variant: req.variant,
    floor: { length: venue.floor.length, width: venue.floor.width },
    spaces,
    canvas,
    zones,
    flows,
    capacity: { seated, standing, total, pmrPlacesRequired: pmr },
    egress: { requiredExits: reqExits, availableExits: venue.accesses.length, requiredUP: reqUP, availableUP: availUP },
    warnings,
    unplaced,
  };
}

/** Découpe un rectangle libre après placement d'un rectangle dans son coin (guillotine). */
function splitAround(r: Rect, p: Rect): Rect[] {
  const out: Rect[] = [];
  // gauche / droite
  if (p.x > r.x + 0.01) out.push({ x: r.x, y: r.y, w: p.x - r.x, h: r.h });
  if (p.x + p.w < r.x + r.w - 0.01) out.push({ x: p.x + p.w, y: r.y, w: r.x + r.w - (p.x + p.w), h: r.h });
  // haut / bas (dans la colonne du rectangle placé)
  if (p.y > r.y + 0.01) out.push({ x: p.x, y: r.y, w: p.w, h: p.y - r.y });
  if (p.y + p.h < r.y + r.h - 0.01) out.push({ x: p.x, y: p.y + p.h, w: p.w, h: r.y + r.h - (p.y + p.h) });
  return out.filter((x) => x.w > 0.5 && x.h > 0.5);
}

/** Propose automatiquement les variantes pertinentes pour un lieu. */
export function suggestLayouts(venue: Venue, base: Omit<LayoutRequest, 'variant' | 'fullCourts' | 'halfCourts'>): Layout[] {
  const variants: LayoutRequest[] = [
    { ...base, variant: 'show', fullCourts: 1, halfCourts: 0 },
    { ...base, variant: 'tournoi', fullCourts: 0, halfCourts: Math.max(2, Math.floor((venue.floor.length * venue.floor.width) / 260)) },
    { ...base, variant: 'hybride', fullCourts: 1, halfCourts: (venue.spaces ?? []).some((s) => s.kind === 'annexe' || s.kind === 'exterieur') ? 2 : 0 },
  ];
  if (!venue.indoor || venue.type === 'place_publique') variants.push({ ...base, variant: 'festival', fullCourts: 0, halfCourts: 2 });
  return variants.map((v) => {
    // Réduit le nombre de terrains jusqu'à ce que tous tiennent (pas de terrain "fantôme")
    let l = generateLayout(venue, v);
    while (l.unplaced.some((u) => u.startsWith('Terrain')) && v.halfCourts + v.fullCourts > 1) {
      if (v.halfCourts > 0) v.halfCourts--;
      else v.fullCourts--;
      l = generateLayout(venue, v);
    }
    return l;
  });
}
