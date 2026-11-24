import type { BrandSystem, Edition, EventProperty, Provenance } from '../core/model';

/**
 * Base documentaire des événements Bask'Est (exigence §8).
 *
 * Construite UNIQUEMENT à partir de faits publics (docs/research/R1-baskest-et-territoire.md,
 * extraits indexés au 2026-11-24). Tout ce qui n'est pas public est marqué
 * `non_trouve` dans `dataCompleteness` : ce sont les données que l'association
 * doit fournir elle-même pour un audit complet. Aucun chiffre n'est inventé.
 */

const ACCESSED = '2026-11-24';

const RCN = 'http://www.rcn-radio.org/index.php/le-all-star-game-grand-est-met-le-basket-a-lhonneur/';
const BILLETWEB_ASG = 'https://www.billetweb.fr/all-star-game-grand-est4';
const HELLOASSO_ASG = 'https://www.helloasso.com/associations/bask-est/collectes/le-all-star-game-debarque-a-nancy-1';
const HELLOASSO_CUP = 'https://www.helloasso.com/associations/bask-est/collectes/le-all-star-game-debarque-a-nancy';
const HELLOASSO_CUP_WIDGET = 'https://www.helloasso.com/associations/bask-est/collectes/le-all-star-game-debarque-a-nancy/widget/1';
const PBN_CUP_2025 = 'https://www.planete-basket-national.fr/copie-de-nf1/p-ezntkxmw/1/';
const ANNUAIRE = 'https://annuaire-entreprises.data.gouv.fr/entreprise/bask-est-940128069';
const JEVEUXAIDER = 'https://www.jeveuxaider.gouv.fr/organisations/34821-baskest';

const v = (source: string, note?: string): Provenance => ({ confidence: 'verifie', source, accessedAt: ACCESSED, note });
const p = (source: string, note?: string): Provenance => ({ confidence: 'probable', source, accessedAt: ACCESSED, note });
const nf = (note = 'Non trouvé publiquement : à fournir par l’association.'): Provenance => ({ confidence: 'non_trouve', note });

/** Identité publique de l'association (registre + JeVeuxAider). Aucune donnée personnelle. */
export const ORGANISATION = {
  name: "Bask'Est",
  legalName: "BASK'EST",
  siren: '940 128 069',
  legalForm: 'Association déclarée (loi 1901)',
  createdAt: '2024-10-19',
  city: 'Nancy (54)',
  mission:
    "« Bask'Est est une association sportive et citoyenne qui utilise le basketball comme outil de lien social, d'inclusion et de dynamisation locale. »",
  provenance: [v(ANNUAIRE, 'SIREN, forme juridique, date de création, ville du siège.'), v(JEVEUXAIDER, 'Citation de la mission.')],
  unknown: ['Numéro RNA / publication JOAFE', 'Site officiel', 'Comptes réseaux sociaux officiels', 'Statuts et composition du bureau', 'Affiliation FFBB'],
};

/**
 * Système de marque mère — PROPOSITION de BASK'EST LAB.
 * Aucune charte graphique officielle n'a été trouvée publiquement : ces choix
 * sont à valider (ou à remplacer par la charte existante) par l'association.
 */
export const BASKEST_BRAND: BrandSystem = {
  motherBrand: "Bask'Est",
  endorsement: "by Bask'Est",
  palette: {
    nuit: '#0B1A33', // bleu nuit — couleur commune à toutes les propriétés
    orange: '#F26B1D', // orange ballon — énergie, action
    or: '#C9A227', // or des grilles de la place Stanislas — prestige, Nancy
    mirabelle: '#F4C430', // jaune mirabelle — convivialité, Lorraine
    chardon: '#7B5EA7', // violet chardon — emblème de Nancy
    ivoire: '#F7F5F0', // fond clair
    ardoise: '#2B3445', // texte secondaire
  },
  typography: {
    display: 'Archivo Black (titres, chiffres de score) — libre de droits (Google Fonts)',
    text: 'Inter (texte courant, interfaces) — libre de droits',
    mono: 'JetBrains Mono (scores, chronos, données)',
  },
  invariants: [
    'Le "E" de Est prolongé d’un chevron → (la flèche Est), présent dans chaque logo de propriété.',
    'Signature "by Bask’Est" sous chaque logo de propriété événementielle.',
    'Bleu nuit #0B1A33 commun + UNE couleur d’accent par propriété (lecture immédiate de la famille).',
    'Motif de bordure inspiré des ferronneries dorées de la place Stanislas, simplifié en lignes géométriques.',
    'Chardon stylisé dont les épines dessinent les coutures d’un ballon (sceau de qualité Bask’Est).',
  ],
};

export const PROPERTIES: EventProperty[] = [
  {
    id: 'asg-grand-est',
    name: 'All Star Game Grand Est',
    shortName: 'ASG Grand Est',
    tagline: 'Proposition : « Les étoiles de l’Est »',
    kind: 'spectacle',
    brand: { accent: '#C9A227', motif: 'Étoile à 5 branches dont une branche forme la flèche Est' },
    status: 'existant',
    maturity: 'evenement_pilote',
    editions: ['asg-2026'],
    description:
      '1re édition le samedi 13 juin 2026 (18h-minuit) au Palais des Sports Jean-Weille, billetterie Billetweb. Programme annoncé dans la presse locale (source unique) : joueuses et joueurs de N2/N3, matchs féminin et masculin, concours de tirs et de dunks, animations, DJ. Édition réelle mais pas encore auditée (aucune donnée chiffrée publique). Attention : un autre « All Star Game Grand-Est » s’est tenu à Metz vers 2019 — le nom n’est pas exclusif.',
  },
  {
    id: 'bask-cup',
    name: "Bask'Cup",
    shortName: "Bask'Cup",
    tagline: 'Proposition : « La réunion du basket à Nancy »',
    kind: 'communautaire',
    brand: { accent: '#F26B1D', motif: 'Coupe stylisée en forme de panier, anses en flèche Est' },
    status: 'existant',
    maturity: 'evenement_pilote',
    editions: ['bask-cup-2025', 'bask-cup-2026'],
    description:
      'Tournoi présenté comme convivial, sportif et inclusif, ouvert aux plus de 16 ans. 1re édition rapportée en 2025 (vainqueur : « Team Cameroun », source unique). Une collecte « La Bask’Cup revient sur Nancy » annonce une nouvelle édition (date et lieu non trouvés). Le nom « Team Cameroun » suggère des équipes portant des noms de pays ou de communautés (hypothèse à confirmer).',
  },
  {
    id: 'king-of-the-court',
    name: 'King of the Court',
    shortName: 'KOTC',
    kind: 'competition',
    brand: { accent: '#7B5EA7', motif: 'Couronne dont les pointes sont des filets de panier' },
    status: 'existant',
    maturity: 'idee',
    editions: ['kotc-a-documenter'],
    description:
      'Propriété citée par l’association dans son propre cahier des charges. Aucune trace publique d’édition trouvée (ni date, ni lieu, ni règlement). Maturité laissée à "idée" tant que l’association ne fournit pas la documentation d’une édition réelle. Note PI : "King of the Court" est une expression générique utilisée par de nombreux événements dans le monde — une marque distinctive est à envisager avant toute exploitation commerciale.',
  },
];

const AUDIT_FIELDS = [
  'budget',
  'recettes',
  'depenses',
  'participants',
  'affluence',
  'billetterie',
  'partenaires',
  'benevoles',
  'programme',
  'resultats',
  'digital',
  'retours',
  'incidents',
  'materiel',
] as const;

function completeness(known: Partial<Record<(typeof AUDIT_FIELDS)[number], Provenance>>): Record<string, Provenance> {
  return Object.fromEntries(AUDIT_FIELDS.map((f) => [f, known[f] ?? nf()]));
}

export const EDITIONS: Edition[] = [
  {
    id: 'asg-2026',
    propertyId: 'asg-grand-est',
    number: 1,
    date: '2026-06-13',
    venueId: 'palais-jean-weille',
    revenues: [],
    expenses: [],
    partners: [],
    programme: [
      '18h00-00h00 (billetterie Billetweb)',
      'Matchs All-Star féminin et masculin — joueuses et joueurs de Nationale 2 et Nationale 3 (presse locale, source unique)',
      'Concours de tirs',
      'Concours de dunks',
      'Animations et DJ',
    ],
    incidents: [],
    dataCompleteness: completeness({
      budget: p(HELLOASSO_ASG, 'Seul indice : collecte HelloAsso avec objectif de 5 000 € présentée comme couvrant une partie du budget. Budget réel inconnu.'),
      recettes: p(HELLOASSO_ASG, 'Collecte HelloAsso terminée (1 contributeur sur un instantané d’indexation) ; montant final et recettes Billetweb inconnus.'),
      billetterie: v(BILLETWEB_ASG, 'Billetterie Billetweb existante (événement terminé). Tarifs, ventes et taux de remplissage non publics.'),
      programme: p(RCN, 'Programme décrit par la presse locale (source unique) ; horaires vérifiés sur Billetweb.'),
      materiel: p('https://www.sports.gouv.fr/palais-des-sports-jean-weille', 'Équipements de la salle connus (grande salle, annexe, vestiaires) ; matériel propre à l’événement inconnu.'),
    }),
  },
  {
    id: 'bask-cup-2025',
    propertyId: 'bask-cup',
    number: 1,
    revenues: [],
    expenses: [],
    partners: [],
    sportResults: [{ label: 'Vainqueur', winner: 'Team Cameroun' }],
    incidents: [],
    dataCompleteness: completeness({
      resultats: p(PBN_CUP_2025, 'Article du 27/07/2025 : « Team Cameroun » vainqueur en outsider (source unique, extraits divergents sur le lieu).'),
      programme: p(PBN_CUP_2025, 'Format, date exacte et lieu non trouvés.'),
    }),
  },
  {
    id: 'bask-cup-2026',
    propertyId: 'bask-cup',
    number: 2,
    revenues: [
      {
        label: 'Collecte HelloAsso « La Bask’Cup revient sur Nancy » — montant collecté (instantané, objectif 5 000 €)',
        amount: 130,
        provenance: v(HELLOASSO_CUP_WIDGET, 'Instantané d’indexation (4 contributeurs, financé à 3 %) : montant susceptible d’avoir évolué.'),
      },
    ],
    expenses: [],
    partners: [],
    programme: ['Journée ouverte aux personnes de plus de 16 ans', 'Fonds affectés à : location de matériel, sécurité, animations, récompenses des joueurs'],
    incidents: [],
    dataCompleteness: completeness({
      budget: p(HELLOASSO_CUP, 'Objectif de collecte : 5 000 € (ce n’est pas le budget total).'),
      recettes: v(HELLOASSO_CUP_WIDGET, '130 € collectés au moment de l’indexation.'),
      participants: p(HELLOASSO_CUP, 'Condition d’âge connue (16 ans et plus) ; nombre de participants inconnu.'),
      programme: p(HELLOASSO_CUP, 'Postes de dépense annoncés ; date, lieu et format non trouvés.'),
    }),
  },
  {
    id: 'kotc-a-documenter',
    propertyId: 'king-of-the-court',
    number: 1,
    revenues: [],
    expenses: [],
    partners: [],
    incidents: [],
    dataCompleteness: completeness({}),
  },
];

/** Données internes à demander en priorité à l'association (synthèse de l'audit). */
export const DATA_REQUESTS: { priority: 1 | 2 | 3; item: string; why: string }[] = [
  { priority: 1, item: 'ASG 2026 : affluence (billets scannés), recettes Billetweb par tarif, budget réalisé, liste des dépenses', why: 'Seule édition récente dans une grande salle : base de toute optimisation et de tout dossier partenaire.' },
  { priority: 1, item: 'Identité administrative : RNA, statuts, bureau, affiliation FFBB éventuelle, comptes sociaux officiels', why: 'Requis pour subventions, conventions de salle, homologations et mécénat.' },
  { priority: 1, item: 'Bask’Cup 2025 et 2026 : dates, lieux, format, nombre d’équipes, résultats, recettes', why: 'Base de l’audit du tournoi communautaire.' },
  { priority: 2, item: 'King of the Court : existe-t-il une édition réelle ? règlement, date, lieu, participants', why: 'Statut de la propriété à clarifier (idée ou événement réalisé).' },
  { priority: 2, item: 'Partenaires et conventions (Métropole / DESL, Ville, CD54, partenaires privés), contreparties livrées', why: 'Mesurer la valeur sponsoring et préparer les renouvellements.' },
  { priority: 2, item: 'Bénévoles mobilisés par événement : nombre, rôles, heures, taux de présence', why: 'Dimensionnement opérationnel et valorisation du bénévolat (comptes, dossiers).' },
  { priority: 3, item: 'Statistiques digitales (abonnés, portée, vues) avant / pendant / après chaque événement', why: 'Prouver la valeur média aux partenaires.' },
  { priority: 3, item: 'Retours (questionnaires, verbatims) et main courante des incidents', why: 'Alimenter l’observatoire des erreurs et les règles de conception.' },
];
