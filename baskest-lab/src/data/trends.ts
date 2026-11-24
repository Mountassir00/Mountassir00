/**
 * Observatoire des tendances — synthèse du benchmark (docs/research/R2-benchmark-mondial.md,
 * relevé du 2026-11-24). Chaque tendance porte ses preuves et sa traduction pour Bask'Est.
 */
export interface Trend {
  id: string;
  title: string;
  evidence: string;
  forBaskest: string;
  strength: 1 | 2 | 3; // 3 = forte, multi-sources
  innovationIds: string[];
}

export const TRENDS: Trend[] = [
  { id: 'tr-score-cible', title: 'La fin au score cible devient la norme des formats courts', evidence: 'All-Star NBA 2025 (cible 40) et 2026 (prolongation à 5), TBT, G League, Unrivaled, Jordan The One.', forBaskest: 'Adopter une fin à score cible standard sur les matchs à enjeu.', strength: 3, innovationIds: ['inn-elam-score-cible'] },
  { id: 'tr-nous-eux', title: 'Mini-tournois à identités fortes (« nous contre eux »)', evidence: 'USA vs World (NBA 2026, +87 % d’audience), WNBA 2026, France contre Monde (LNB, basket fauteuil), Laver Cup.', forBaskest: '« Est contre Monde », « Anciens contre Jeunes », équipes de quartiers.', strength: 3, innovationIds: ['inn-mini-tournoi-3-equipes'] },
  { id: 'tr-1c1', title: 'Le 1 contre 1 devient un produit à part entière', evidence: '1c1 d’Unrivaled, Jordan The One, skills 1c1 de l’All-Star LNB, Hoop Gambit.', forBaskest: 'Circuit de duels en qualification locale, finale lors d’un grand événement.', strength: 2, innovationIds: ['inn-1v1-circuit', 'inn-skills-1v1-meneurs'] },
  { id: 'tr-dunk', title: 'Le dunk se professionnalise et devient collectif', evidence: 'Dunkman (500 000 $, équipes en 2027), Dunk Mania FIBA (Varsovie 2026).', forBaskest: 'Dunk contest par équipes avec jury mixte et vote plafonné.', strength: 2, innovationIds: ['inn-dunk-mania-equipes'] },
  { id: 'tr-lieux', title: 'Retour aux salles patrimoniales et au « home court »', evidence: 'Finale NBA Cup au Hinkle Fieldhouse (2026), demi-finales à domicile, finale TBT chez le champion.', forBaskest: 'Finales dans des lieux emblématiques de Nancy ; qualifications « à domicile » dans les quartiers.', strength: 2, innovationIds: ['inn-finale-lieu-patrimonial', 'inn-lieu-insolite'] },
  { id: 'tr-feminin', title: 'Croissance et professionnalisation du basket féminin', evidence: 'Convention WNBA 2026-2032, Unrivaled (+204 % billetterie), Women’s Series record, NCAA féminine à 76 équipes.', forBaskest: 'Tableau féminin au même format, en prime time, même scène.', strength: 3, innovationIds: ['inn-feminin-prime-time'] },
  { id: 'tr-createurs', title: 'Créateurs partout, mais les ligues de créateurs s’essoufflent', evidence: '200+ créateurs à l’All-Star NBA 2026 ; Kings League France suspendue, Baller League Allemagne en pause (2026).', forBaskest: 'Le créateur est un amplificateur (co-streaming, invités), pas un modèle économique.', strength: 3, innovationIds: ['inn-co-streaming', 'inn-creator-cup'] },
  { id: 'tr-arbitrage', title: 'Transparence de l’arbitrage et technologie contestées', evidence: 'Micro de l’arbitre en Ligue 1 (2025-26), arbitrage électronique à Wimbledon, challenge vidéo en 3x3 (règles 2026).', forBaskest: 'Speaker / arbitre qui explique les décisions au micro.', strength: 2, innovationIds: ['inn-micro-arbitre-speaker'] },
  { id: 'tr-public-decor', title: 'Le public devient le décor (lumière, son, déguisements)', evidence: 'PixMob (Super Bowl LX, Milan-Cortina), accoudoirs LED Intuit Dome, record de décibels au 3x3 de Paris 2024.', forBaskest: 'Bracelets par quartier, lumière pilotée, consignes de couleur.', strength: 2, innovationIds: ['inn-public-lumiere', 'inn-bracelets-zones'] },
  { id: 'tr-climat', title: 'Le climat devient une contrainte d’organisation', evidence: 'Quai 54 2026 déplacé en salle (canicule) ; Open Plus 3x3 de Nancy annulé pour chaleur en 2026.', forBaskest: 'Plan de repli intérieur obligatoire pour tout événement d’été (règle R26).', strength: 3, innovationIds: [] },
];

export interface WeakSignal {
  title: string;
  where: string;
  why: string;
  status: 'vérifié' | 'source unique' | 'annonce';
  url: string;
}

export const WEAK_SIGNALS: WeakSignal[] = [
  { title: 'All Star Game Basket Fauteuil (FFH) : journée 3x3 + All-Star, billet à 5 €', where: 'Bobigny, 2e édition le 5 décembre 2026', why: 'Mécanique All-Star appliquée au handisport, à très bas coût, reproductible en région.', status: 'vérifié', url: 'https://www.paris.fr/evenements/all-star-game-de-basket-fauteuil-2026-127162' },
  { title: 'Hoop Gambit : basket et échecs en alternance', where: 'Le Chesnay et Nanterre, août 2026', why: 'Format hybride sport + jeu de l’esprit, dans des gymnases modestes.', status: 'annonce', url: 'https://info.fr/wembanyama-hoop-gambit-2026-basket-echecs-chesnay-nanterre/' },
  { title: 'The Crown Games : tournoi, dunk, 1c1 et showcases musicaux', where: 'Orléans, juillet 2026', why: 'Le format « street + musique » en région, en salle moderne.', status: 'source unique', url: 'https://the-crown-games.com/' },
  { title: 'Superleague Open 3x3 FFBB, dont l’Open Plus de Nancy', where: 'France, 16 étapes prévues en 2027 (appel à candidatures)', why: 'Levier local direct : candidater ou s’associer à l’étape nancéienne.', status: 'vérifié', url: 'https://www.ffbb.com/actualites/les-opens-plus-de-pau-et-nancy-annules' },
  { title: 'Paris Basketball : soirées à thème, places clubs à 12 €, covoiturage', where: 'Adidas Arena, 2025-2026', why: 'Le club français le plus innovant en expérience de match ; idées reproductibles à petit coût.', status: 'vérifié', url: 'https://www.parisbasketball.com' },
  { title: 'Young Star Game LNB : les espoirs traités comme des stars', where: 'Levallois, depuis 2025', why: 'Transposable aux U17-U20 lorrains (format Vitrine).', status: 'vérifié', url: 'https://lnb.fr/fr/news/premiere-edition-du-young-star-game-ce-mardi-21-janvier-a-levallois-un-evenement-unique-en-europe' },
  { title: 'Playin’ Paris : 3x3 en accès libre dans un gymnase', where: 'Paris 18e, mai 2026', why: 'Le micro-événement de quartier comme modèle.', status: 'annonce', url: 'https://playin-paris.com/' },
  { title: 'Dunk Mania (FIBA) : le dunk par équipes', where: 'Varsovie, juin 2026', why: 'Format européen récent, peu copié en France.', status: 'vérifié', url: 'https://www.fiba.basketball/en/news/team-grabo-wins-inaugural-dunk-mania-at-fiba-3x3-world-cup-2026' },
  { title: 'Signal négatif : modèles « créateurs » coûteux fragiles', where: 'Kings League France suspendue (2026)', why: 'Privilégier des formats légers ; la nouveauté s’use vite.', status: 'vérifié', url: 'https://en.ara.cat/economy/gerard-pique-s-kings-league-wants-to-lay-off-half-of-its-workers_1_5764708.html' },
];
