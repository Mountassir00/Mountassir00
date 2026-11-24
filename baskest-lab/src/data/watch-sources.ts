import type { WatchSource } from '../core/model';

/**
 * BASK'EST LAB — Sources de veille (exigences §3 et §4).
 *
 * `reliability` : 5 = source officielle primaire ; 4 = média spécialisé
 * reconnu ; 3 = média secondaire, réseau social officiel ; 2 = communauté,
 * agrégateur ; 1 = rumeur (non utilisé ici).
 * `frequency` : cadence de consultation recommandée (pas la fréquence de
 * publication). Voir docs/06-strategie-veille.md pour le processus.
 */

export const WATCH_SOURCES: WatchSource[] = [
  // ---------------------------------------------------------------- Officiel
  { id: 'src-nba-news', name: 'NBA — actualités', url: 'https://www.nba.com/news', kind: 'officiel', topics: ['nba', 'all-star', 'nba-cup', 'formats'], frequency: 'quotidienne', reliability: 5 },
  { id: 'src-nba-pr', name: 'NBA Communications (communiqués)', url: 'https://pr.nba.com', kind: 'officiel', topics: ['nba', 'formats', 'audiences', 'partenariats'], frequency: 'hebdomadaire', reliability: 5 },
  { id: 'src-wnba', name: 'WNBA', url: 'https://www.wnba.com/news', kind: 'officiel', topics: ['basket-feminin', 'all-star', 'expansion'], frequency: 'hebdomadaire', reliability: 5 },
  { id: 'src-fiba', name: 'FIBA', url: 'https://www.fiba.basketball/en/news', kind: 'officiel', topics: ['fiba', 'competitions', 'regles', 'dunk-mania'], frequency: 'quotidienne', reliability: 5 },
  { id: 'src-fiba-3x3', name: 'FIBA 3x3 (règles, World Tour)', url: 'https://www.fiba3x3.basketball', kind: 'officiel', topics: ['3x3', 'regles', 'world-tour', 'women-series'], frequency: 'hebdomadaire', reliability: 5 },
  { id: 'src-fiba-3x3-play', name: 'FIBA 3x3 Play (base des tournois homologués)', url: 'https://play.fiba3x3.com', kind: 'base_de_donnees', topics: ['3x3', 'tournois', 'grand-est', 'classements'], frequency: 'hebdomadaire', reliability: 5 },
  { id: 'src-ffbb', name: 'Fédération Française de Basketball', url: 'https://www.ffbb.com/actualites', kind: 'officiel', topics: ['ffbb', 'reglementation', 'programmes', '3x3'], frequency: 'hebdomadaire', reliability: 5 },
  { id: 'src-ffbb-3x3', name: '3x3 FFBB (Superleague, Open Plus)', url: 'https://3x3ffbb.com', kind: 'officiel', topics: ['3x3', 'open-plus', 'appels-a-candidatures'], frequency: 'hebdomadaire', reliability: 5 },
  { id: 'src-lnb', name: 'LNB (Betclic Élite, All-Star Game, Young Star Game)', url: 'https://lnb.fr/fr/news', kind: 'officiel', topics: ['lnb', 'all-star', 'sluc'], frequency: 'hebdomadaire', reliability: 5 },
  { id: 'src-euroleague', name: 'EuroLeague Basketball', url: 'https://www.euroleaguebasketball.net', kind: 'officiel', topics: ['euroleague', 'final-four', 'fan-experience'], frequency: 'hebdomadaire', reliability: 4 },
  { id: 'src-lrgeb', name: 'Ligue Régionale Grand Est de Basketball', url: 'https://www.lrgeb.fr', kind: 'officiel', topics: ['grand-est', '3x3', 'calendrier', 'formations'], frequency: 'hebdomadaire', reliability: 5 },
  { id: 'src-cd54', name: 'Comité de Meurthe-et-Moselle de Basketball', url: 'https://basket54.fr', kind: 'officiel', topics: ['meurthe-et-moselle', 'open-plus', 'clubs', 'jeunes'], frequency: 'hebdomadaire', reliability: 5 },
  { id: 'src-ffh', name: 'Fédération Française Handisport', url: 'https://www.handisport.org', kind: 'officiel', topics: ['handibasket', 'basket-fauteuil', 'inclusion'], frequency: 'mensuelle', reliability: 5 },
  { id: 'src-sluc', name: 'SLUC Nancy Basket', url: 'https://sluc-basket.fr', kind: 'officiel', topics: ['nancy', 'palais-jean-weille', 'calendrier-salle'], frequency: 'hebdomadaire', reliability: 4 },
  { id: 'src-tbt', name: 'The Basketball Tournament (TBT)', url: 'https://www.thetournament.com', kind: 'officiel', topics: ['elam', 'formats', 'cash-prize'], frequency: 'mensuelle', reliability: 4 },
  { id: 'src-big3', name: 'BIG3', url: 'https://big3.com/news', kind: 'officiel', topics: ['3x3', 'regles', 'modele-economique'], frequency: 'mensuelle', reliability: 3 },
  { id: 'src-redbull-basket', name: 'Red Bull Basketball (Half Court)', url: 'https://www.redbull.com/int-en/event-series/half-court', kind: 'officiel', topics: ['3x3', 'streetball', 'court-design'], frequency: 'mensuelle', reliability: 3 },
  { id: 'src-kings-league', name: 'Kings League (règlements)', url: 'https://kingsleague.pro', kind: 'officiel', topics: ['gamification', 'createurs', 'regles'], frequency: 'mensuelle', reliability: 3 },
  { id: 'src-f1', name: 'Formula 1 — actualités', url: 'https://www.formula1.com/en/latest', kind: 'officiel', topics: ['sprint', 'fan-zone', 'storytelling'], frequency: 'mensuelle', reliability: 4 },
  { id: 'src-world-rugby', name: 'World Rugby (HSBC SVNS)', url: 'https://www.world.rugby/news', kind: 'officiel', topics: ['sevens', 'festival', 'mixite'], frequency: 'mensuelle', reliability: 4 },
  { id: 'src-olympics', name: 'Olympics.com — actualités', url: 'https://olympics.com/en/news', kind: 'officiel', topics: ['3x3', 'presentation-sportive', 'parc-urbain'], frequency: 'mensuelle', reliability: 4 },

  // -------------------------------------------- Institutionnel / réglementaire
  { id: 'src-ans', name: 'Agence nationale du Sport', url: 'https://www.agencedusport.fr', kind: 'officiel', topics: ['financements', 'psf', 'appels-a-projets'], frequency: 'mensuelle', reliability: 5 },
  { id: 'src-sports-gouv', name: 'Ministère des Sports', url: 'https://www.sports.gouv.fr', kind: 'officiel', topics: ['reglementation', 'honorabilite', 'equipements'], frequency: 'mensuelle', reliability: 5 },
  { id: 'src-associations-gouv', name: 'associations.gouv.fr / Le Compte Asso', url: 'https://www.associations.gouv.fr', kind: 'officiel', topics: ['fdva', 'subventions', 'vie-associative'], frequency: 'mensuelle', reliability: 5 },
  { id: 'src-service-public-asso', name: 'Service-Public.fr — Associations', url: 'https://www.service-public.gouv.fr/associations', kind: 'officiel', topics: ['buvette', 'assurance', 'domaine-public'], frequency: 'mensuelle', reliability: 5 },
  { id: 'src-legifrance', name: 'Légifrance (Code du sport, CSP, CGI)', url: 'https://www.legifrance.gouv.fr', kind: 'base_de_donnees', topics: ['reglementation', 'code-du-sport'], frequency: 'mensuelle', reliability: 5 },
  { id: 'src-cnil', name: 'CNIL — sport amateur', url: 'https://www.cnil.fr/fr/sport-amateur-hors-contrat/questions-reponses', kind: 'officiel', topics: ['rgpd', 'mineurs', 'droit-a-l-image'], frequency: 'mensuelle', reliability: 5 },
  { id: 'src-bofip', name: 'BOFiP (fiscalité des associations)', url: 'https://bofip.impots.gouv.fr', kind: 'base_de_donnees', topics: ['fiscalite', 'mecenat', 'tva'], frequency: 'mensuelle', reliability: 5 },
  { id: 'src-equipements-sportifs', name: 'Data ES — recensement des équipements sportifs', url: 'https://equipements.sports.gouv.fr', kind: 'base_de_donnees', topics: ['salles', 'dimensions', 'grand-est'], frequency: 'mensuelle', reliability: 5 },
  { id: 'src-region-grand-est', name: 'Région Grand Est — sport', url: 'https://www.grandest.fr', kind: 'officiel', topics: ['financements', 'manifestations-sportives'], frequency: 'mensuelle', reliability: 5 },
  { id: 'src-grand-nancy', name: 'Métropole du Grand Nancy', url: 'https://www.grandnancy.eu', kind: 'officiel', topics: ['equipements', 'politique-de-la-ville', 'evenements'], frequency: 'mensuelle', reliability: 5 },
  { id: 'src-ville-nancy', name: 'Ville de Nancy — vie associative et agenda', url: 'https://www.nancy.fr', kind: 'officiel', topics: ['subventions', 'agenda', 'espace-public'], frequency: 'hebdomadaire', reliability: 5 },

  // -------------------------------------------------------------------- Médias
  { id: 'src-bebasket', name: 'BeBasket', url: 'https://www.bebasket.fr', kind: 'media', topics: ['basket-france', 'evenements', 'basket-fauteuil'], frequency: 'quotidienne', reliability: 4 },
  { id: 'src-basketeurope', name: 'BasketEurope', url: 'https://www.basketeurope.com', kind: 'media', topics: ['basket-france', 'quai-54', 'lnb'], frequency: 'quotidienne', reliability: 4 },
  { id: 'src-est-republicain', name: 'L’Est Républicain', url: 'https://www.estrepublicain.fr/sport', kind: 'media', topics: ['nancy', 'sluc', 'evenements-locaux'], frequency: 'quotidienne', reliability: 4 },
  { id: 'src-france3-ge', name: 'France 3 Grand Est', url: 'https://france3-regions.francetvinfo.fr/grand-est', kind: 'media', topics: ['grand-est', 'sport', 'evenements'], frequency: 'hebdomadaire', reliability: 4 },
  { id: 'src-rcn', name: 'RCN Radio (Nancy)', url: 'http://www.rcn-radio.org', kind: 'media', topics: ['nancy', 'associations', 'baskest'], frequency: 'hebdomadaire', reliability: 3 },
  { id: 'src-planete-basket-national', name: 'Planète Basket National', url: 'https://www.planete-basket-national.fr', kind: 'media', topics: ['n1-n2-n3', 'bask-cup', 'joueurs'], frequency: 'hebdomadaire', reliability: 3 },
  { id: 'src-fos', name: 'Front Office Sports (newsletter)', url: 'https://frontofficesports.com', kind: 'newsletter', topics: ['business-du-sport', 'fan-experience', 'hospitalite'], frequency: 'hebdomadaire', reliability: 4 },
  { id: 'src-svg', name: 'Sports Video Group', url: 'https://www.sportsvideo.org', kind: 'media', topics: ['production', 'captation', 'dunkman'], frequency: 'hebdomadaire', reliability: 4 },
  { id: 'src-sportbusiness-club', name: 'Sport Business Club (FR)', url: 'https://www.sportbusiness.club', kind: 'newsletter', topics: ['business-du-sport-france', 'sponsoring', 'evenements'], frequency: 'hebdomadaire', reliability: 4 },
  { id: 'src-lolesports', name: 'LoL Esports (formats de draft)', url: 'https://lolesports.com', kind: 'officiel', topics: ['esport', 'draft', 'co-streaming'], frequency: 'mensuelle', reliability: 4 },
  { id: 'src-fullcourt', name: 'Fullcourt (podcast basket Alsace / Grand Est)', url: 'https://podcast.ausha.co/fullcourtalsace', kind: 'media', topics: ['grand-est', 'streetball', 'joueurs'], frequency: 'mensuelle', reliability: 3 },

  // --------------------------------------------------------- Réseaux sociaux
  { id: 'src-ig-fiba3x3', name: 'Instagram FIBA 3x3', url: 'https://www.instagram.com/fiba3x3/', kind: 'reseau_social', topics: ['3x3', 'formats-courts', 'tendances-video'], frequency: 'quotidienne', reliability: 3 },
  { id: 'src-tiktok-sluc', name: 'TikTok SLUC Nancy Basket (référence d’audience locale)', url: 'https://www.tiktok.com/@slucnancybasket', kind: 'reseau_social', topics: ['nancy', 'formats-courts', 'audience-locale'], frequency: 'hebdomadaire', reliability: 3 },
  { id: 'src-quai54', name: 'Quai 54 (site et réseaux)', url: 'https://www.livequai54.com/fr', kind: 'reseau_social', topics: ['streetball', 'show', 'culture'], frequency: 'mensuelle', reliability: 3 },
  { id: 'src-ballislife', name: 'Ballislife', url: 'https://ballislife.com', kind: 'media', topics: ['highlights', 'jeunes', 'evenements-insolites'], frequency: 'hebdomadaire', reliability: 3 },
  { id: 'src-asg-alsace', name: 'All Star Game Alsace (Beyond The Bounce)', url: 'https://beyondthebounce.fr', kind: 'reseau_social', topics: ['grand-est', 'comparable-regional', 'vote-public'], frequency: 'mensuelle', reliability: 3 },

  // ------------------------------------------------------------- Communauté
  { id: 'src-helloasso-ge', name: 'HelloAsso — événements basket du Grand Est', url: 'https://www.helloasso.com/e/reg/grand--est', kind: 'base_de_donnees', topics: ['benchmark-local', 'tarifs', 'calendrier-regional'], frequency: 'hebdomadaire', reliability: 4 },
  { id: 'src-scorenco-54', name: 'Clubs de basket du 54 (annuaire Score’n’co)', url: 'https://scorenco.com/basket/clubs?department=54', kind: 'communaute', topics: ['clubs', 'joueurs', 'partenariats'], frequency: 'mensuelle', reliability: 3 },
];
