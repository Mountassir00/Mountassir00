import type { Venue, VenueType } from '../core/model';

/**
 * Référentiel des lieux. Les données du Palais des Sports Jean-Weille sont
 * issues de sources publiques (voir docs/research/R1-baskest-et-territoire.md) ;
 * tout le reste est un GABARIT à remplacer par un relevé réel (visite technique).
 */

const ACCESSED = '2026-11-24';

export const PALAIS_JEAN_WEILLE: Venue = {
  id: 'palais-jean-weille',
  name: 'Palais des Sports Jean-Weille (Nancy-Gentilly)',
  type: 'palais_des_sports',
  city: 'Nancy',
  floor: {
    length: 44,
    width: 24,
    provenance: {
      confidence: 'probable',
      note: 'Salle principale 44 × 24 m selon deux annuaires d’équipements ; à confirmer par relevé ou plan du gestionnaire.',
      accessedAt: ACCESSED,
    },
  },
  courts: { full: 1, half: 2 },
  baskets: 6,
  fixedSeats: 6000,
  seatsProvenance: {
    confidence: 'verifie',
    source: 'https://www.sports.gouv.fr/palais-des-sports-jean-weille',
    note: '6 000 places (sports.gouv.fr) ; 6 027 selon Wikipédia. La jauge autorisée réelle dépend de la configuration validée.',
    accessedAt: ACCESSED,
  },
  authorizedGauge: undefined,
  lockerRooms: 6,
  accesses: [
    { label: 'Entrée principale public', widthM: 6, pmr: true },
    { label: 'Entrée secondaire public', widthM: 3.6, pmr: false },
    { label: 'Accès joueurs / logistique', widthM: 3, pmr: true },
    { label: 'Issue de secours tribune A', widthM: 1.8, pmr: false },
    { label: 'Issue de secours tribune B', widthM: 1.8, pmr: false },
  ],
  indoor: true,
  av: { scoreboard: true, giantScreen: false, sound: true, lightingShow: false, wifi: true },
  partnerSpacesM2: undefined,
  spaces: [
    {
      id: 'annexe',
      name: 'Salle annexe',
      kind: 'annexe',
      length: 36,
      width: 18,
      provenance: { confidence: 'probable', note: 'Salle annexe 36 × 18 m (annuaires) ; à confirmer.', accessedAt: ACCESSED },
    },
    {
      id: 'hall',
      name: 'Hall d’accueil / coursives',
      kind: 'hall',
      length: 30,
      width: 10,
      provenance: { confidence: 'hypothese', note: 'Dimensions supposées : à relever lors de la visite technique.' },
    },
  ],
  constraints: [
    'Salle de l’équipe professionnelle (SLUC Nancy, Betclic Élite + FIBA Europe Cup 2026-27) : disponibilités contraintes par le calendrier du club.',
    'Accès tram T2 arrêt « Palais des Sports – Gentilly » : prévoir la communication transports.',
    'Accès des entrées / issues : valeurs SUPPOSÉES pour le calcul, à remplacer par le plan d’évacuation officiel.',
    'Toute configuration doit être validée par le gestionnaire (Métropole du Grand Nancy) et la commission de sécurité le cas échéant.',
  ],
  notes:
    'Équipements de haut niveau (balnéo, kiné, sauna, musculation 250 m², salle de presse, salle antidopage) recensés comme Centre de Préparation aux Jeux.',
  sources: [
    { confidence: 'verifie', source: 'https://www.sports.gouv.fr/palais-des-sports-jean-weille', accessedAt: ACCESSED },
    { confidence: 'verifie', source: 'https://fr.wikipedia.org/wiki/Palais_des_Sports_Jean-Weille', accessedAt: ACCESSED },
  ],
};

const gabarit = (note: string) => ({ confidence: 'hypothese' as const, note });

function template(id: string, name: string, type: VenueType, L: number, W: number, extra: Partial<Venue> = {}): Venue {
  return {
    id,
    name,
    type,
    city: 'Grand Est',
    floor: { length: L, width: W, provenance: gabarit('Gabarit type — remplacer par les dimensions réelles du lieu.') },
    courts: { full: 0, half: 0 },
    baskets: 2,
    fixedSeats: 0,
    lockerRooms: 0,
    accesses: [{ label: 'Accès principal', widthM: 3, pmr: true }],
    indoor: true,
    av: { scoreboard: false, giantScreen: false, sound: false, lightingShow: false, wifi: false },
    constraints: [],
    ...extra,
  };
}

export const VENUE_TEMPLATES: Venue[] = [
  template('tpl-exterieur', 'Terrain extérieur municipal', 'terrain_exterieur', 32, 19, {
    indoor: false,
    courts: { full: 1, half: 2 },
    baskets: 2,
    constraints: ['Dépend de la météo : prévoir un repli couvert et un plan canicule (cf. annulation de l’Open Plus 3x3 de Nancy en 2026 pour chaleur).'],
  }),
  template('tpl-city-stade', 'City-stade de quartier', 'city_stade', 22, 12, {
    indoor: false,
    courts: { full: 0, half: 1 },
    baskets: 2,
    constraints: ['Surface synthétique / enrobé : vérifier l’état et l’adhérence.', 'Riverains : horaires et sonorisation encadrés par arrêté.'],
  }),
  template('tpl-gymnase', 'Gymnase municipal type C', 'gymnase', 44, 24, {
    courts: { full: 1, half: 2 },
    baskets: 6,
    fixedSeats: 300,
    lockerRooms: 4,
    accesses: [
      { label: 'Entrée principale', widthM: 1.8, pmr: true },
      { label: 'Issue de secours', widthM: 1.4, pmr: false },
    ],
    av: { scoreboard: true, giantScreen: false, sound: true, lightingShow: false, wifi: false },
  }),
  template('tpl-complexe', 'Complexe sportif (2 salles)', 'complexe_sportif', 44, 26, {
    courts: { full: 1, half: 2 },
    baskets: 6,
    fixedSeats: 800,
    lockerRooms: 6,
    accesses: [
      { label: 'Entrée principale', widthM: 3.6, pmr: true },
      { label: 'Issue de secours 1', widthM: 1.8, pmr: false },
      { label: 'Issue de secours 2', widthM: 1.8, pmr: false },
    ],
    spaces: [{ id: 'salle2', name: 'Salle n°2', kind: 'annexe', length: 32, width: 20, provenance: gabarit('Gabarit') }],
    av: { scoreboard: true, giantScreen: false, sound: true, lightingShow: false, wifi: true },
  }),
  template('tpl-arena', 'Arena (> 5 000 places)', 'arena', 60, 32, {
    courts: { full: 1, half: 0 },
    baskets: 4,
    fixedSeats: 8000,
    lockerRooms: 8,
    accesses: [
      { label: 'Portes A', widthM: 7.2, pmr: true },
      { label: 'Portes B', widthM: 7.2, pmr: true },
      { label: 'Portes C', widthM: 7.2, pmr: false },
      { label: 'Portes D', widthM: 7.2, pmr: false },
    ],
    av: { scoreboard: true, giantScreen: true, sound: true, lightingShow: true, wifi: true },
    spaces: [{ id: 'concourse', name: 'Coursives', kind: 'coursive', length: 80, width: 8, provenance: gabarit('Gabarit') }],
  }),
  template('tpl-place', 'Place publique (ex. place de centre-ville)', 'place_publique', 60, 40, {
    indoor: false,
    accesses: [
      { label: 'Accès nord', widthM: 8, pmr: true },
      { label: 'Accès sud', widthM: 8, pmr: true },
      { label: 'Accès est', widthM: 4, pmr: true },
    ],
    constraints: [
      'Autorisation d’occupation du domaine public + arrêté municipal.',
      'Site patrimonial possible : protections au sol, interdiction d’ancrage, avis des services compétents.',
      'Tribunes démontables = structures soumises à vérification (organisme agréé).',
    ],
  }),
  template('tpl-centre-commercial', 'Mail de centre commercial', 'centre_commercial', 40, 20, {
    accesses: [
      { label: 'Mail est', widthM: 6, pmr: true },
      { label: 'Mail ouest', widthM: 6, pmr: true },
    ],
    constraints: ['Horaires d’ouverture du centre ; sol non sportif (dalles de basket clipsables à prévoir).'],
  }),
  template('tpl-campus', 'Campus universitaire (esplanade + gymnase)', 'campus', 44, 24, {
    courts: { full: 1, half: 2 },
    baskets: 6,
    fixedSeats: 200,
    accesses: [
      { label: 'Entrée', widthM: 1.8, pmr: true },
      { label: 'Issue', widthM: 1.4, pmr: false },
    ],
    spaces: [{ id: 'esplanade', name: 'Esplanade', kind: 'exterieur', length: 40, width: 25, provenance: gabarit('Gabarit') }],
  }),
  template('tpl-temporaire', 'Espace temporaire (friche, parking, halle)', 'espace_temporaire', 50, 35, {
    indoor: false,
    accesses: [
      { label: 'Entrée', widthM: 6, pmr: true },
      { label: 'Sortie', widthM: 6, pmr: true },
    ],
    constraints: ['Tout est à apporter : sol, paniers, électricité, sanitaires, éclairage, eau.'],
  }),
];

export const ALL_VENUES: Venue[] = [PALAIS_JEAN_WEILLE, ...VENUE_TEMPLATES];
