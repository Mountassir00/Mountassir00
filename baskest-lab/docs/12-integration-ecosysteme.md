# 12 — Intégration à l'écosystème digital Bask'Est

> Code : `src/core/integration/contracts.ts` (connecteurs, garde-fou d'approbation), `src/core/scheduler/scheduler.ts` (`publicationPayload`), `supabase/migrations/` (base partagée, v0.4).
> Interface : **Intégrations et validations** (`#/ecosysteme`), **Espaces collaboratifs** (`#/collaboratif`). Statut : dépend d'une intégration.

Objectif (§20) : qu'un concept généré et validé devienne un **vrai projet** dans le dashboard administratif de l'association, et que les informations utiles partent vers les inscriptions, le budget, le planning, les ressources humaines et la communication — **sans** qu'aucune action sensible ne parte toute seule.

## 1. Principes non négociables

1. **Privé par défaut.** Concepts et projets naissent privés (`private: true`, `visibility: 'prive'`) et le restent jusqu'à une publication volontaire.
2. **Validation explicite des actions sensibles.** Publication, dépense, commande, réservation, modification opérationnelle sensible : une `ApprovalRequest` approuvée par le bon rôle est exigée **avant** tout envoi.
3. **Mode simulation par défaut.** Tant qu'un connecteur n'est pas branché, il prépare la charge utile (aperçu) et n'envoie rien.
4. **Minimisation des données.** On ne transmet que ce dont la destination a besoin ; aucune donnée de mineur n'est publiée sans autorisation des représentants légaux.
5. **Réversibilité.** Toute publication est versionnée (le planning porte un numéro de version) et peut être corrigée.

## 2. Connecteurs prévus

| Connecteur (`CONNECTORS`) | Destination | Action sensible | État |
|---|---|---|---|
| `site` | Site officiel Bask'Est (page événement, programme) | oui | à brancher (aucun site officiel trouvé publiquement — `docs/research/R1`) |
| `admin` | Dashboard administratif de l'association | oui | à brancher |
| `screens` | Écrans de l'événement (programme, scores) | oui | à brancher |
| `ticketing` | Billetterie / inscriptions (HelloAsso, Billetweb — utilisés par Bask'Est selon R1) | oui | à brancher |
| `crm` | CRM partenaires | non | à brancher |
| `accounting` | Comptabilité | oui | à brancher |
| `social` | Réseaux sociaux | oui | à brancher |
| `results` | Base de résultats / classements | non | à brancher |

Fonctionnement actuel (`dryRunConnector`) : un connecteur sensible appelé sans approbation lève `ApprovalRequiredError` ; avec une approbation valide, il renvoie l'aperçu de la charge utile. Chaque connecteur exige le type d'approbation correspondant à son action : « publication » (site, écrans, billetterie, réseaux sociaux), « modification opérationnelle » (dashboard administratif), « dépense » (comptabilité) ; le CRM et la base de résultats ne sont pas sensibles. Une approbation d'un autre type est refusée.

## 3. Flux de données

| Flux | Origine (outil) | Destination | Données | Validation |
|---|---|---|---|---|
| Concept validé → projet | Tableau de notation / Projets | Dashboard administratif (`AdminProjectHandoff`) | Concept, budget réaliste, rétroplanning, besoins bénévoles (nombre, rôles), lancement communication, paramètres d'inscription | Bureau |
| Inscriptions | Concept (format, équipes, tarif, clôture) | Billetterie / formulaire | Catégories, prix, date de clôture, champs obligatoires (décharge, droit à l'image, autorisations parentales) | Publication validée |
| Billetterie spectateurs | Simulateur financier (grille tarifaire) | Billetterie | Tarifs, quotas, prévente | Trésorerie + bureau |
| Budget | Simulateur financier | Comptabilité | Lignes de charges et produits **avec leur nature** (commerciale, don, subvention, apport, emprunt) | Trésorerie |
| Planning | Programmation sportive (`publicationPayload`) | Site, écrans, espaces joueurs | Version, matchs (heure, terrain, équipes), blocs | Responsable événement |
| Partenaires | Blueprint (offres) | CRM | Offres, contreparties, activations, bilans | — |
| Communication | Blueprint (calendrier éditorial, visuels) | Réseaux sociaux | Textes, visuels, dates | Responsable contenus |
| Résultats | Saisie jour J | Base de résultats / classements | Scores, classements, statistiques individuelles | — (données publiques), sauf mineurs |
| Billetterie immersive / 3D | Configurateur de salles (plan SVG, zones) | Prestataire éventuel | Plan, catégories de places | Bureau |

## 4. Modèle d'approbation

```ts
interface ApprovalRequest {
  action: 'publication' | 'depense' | 'commande' | 'reservation' | 'modification_operationnelle';
  payload: unknown;               // ce qui partira, visible avant décision
  requestedBy: string;
  requiredRole: 'president' | 'tresorier' | 'bureau' | 'responsable_evenement';
  status: 'en_attente' | 'approuve' | 'refuse';
}
```

| Action | Rôle requis recommandé |
|---|---|
| Publication du programme / planning | Responsable événement |
| Publication d'un dossier ou d'une page publique | Bureau |
| Dépense, commande | Trésorerie (au-delà d'un seuil fixé par le bureau : présidence) |
| Réservation d'un lieu, d'un prestataire | Bureau |
| Modification opérationnelle le jour J (replanification) | Responsable événement |

Dans l'interface, la programmation sportive envoie ses demandes dans la file de validation ; l'approbation est aujourd'hui locale (navigateur). Avec la base partagée, elle sera tracée (qui, quand) et protégée par les rôles.

## 5. Socle technique recommandé pour une petite association

Les options ci-dessous sont des **options à évaluer**, pas des décisions. Les coûts sont des ordres de grandeur à vérifier sur le site de chaque éditeur au moment du choix (offres et tarifs évoluent).

| Besoin | Option recommandée | Alternatives | Coût indicatif (à vérifier) | Pourquoi |
|---|---|---|---|---|
| Base partagée + authentification + rôles | Postgres managé type Supabase (schéma `supabase/migrations/`, socle v0.4) | Postgres auto-hébergé ; Firebase | offre gratuite pour démarrer ; offre payante ≈ quelques dizaines d'€/mois si besoin | SQL standard, sécurité par ligne (RLS), pas de serveur à maintenir |
| Hébergement du dashboard | Hébergement statique (Netlify, Vercel, Cloudflare Pages, GitHub Pages) | Fichier HTML unique (`npm run build:demo`) | gratuit à l'échelle associative | L'application est statique |
| Billetterie / inscriptions | Outils déjà utilisés par Bask'Est : HelloAsso (collectes) et Billetweb (ASG 2026) | — | HelloAsso : modèle à contribution volontaire du payeur ; Billetweb : commission par billet | Continuité, habitudes des publics |
| Documents partagés | Google Drive / Workspace ou Notion | Nextcloud | offres associatives souvent gratuites ou réduites (à vérifier) | Diffusion des Blueprints (Word, PDF) |
| Automatisations simples | Zapier ou Make (ex. nouvelle inscription → ligne CRM) | n8n auto-hébergé | offre gratuite limitée, puis abonnement | Sans code |
| Synthèses de veille, aide à la rédaction | API Claude (côté serveur) | — | paiement à l'usage | Résumés hebdomadaires, reformulation de pitch (voir `docs/08`, §10) |
| Réseaux sociaux | Planification native (Meta Business Suite) ou outil tiers | — | gratuit pour Meta | Publication validée |

Recommandation : commencer **uniquement** par la base partagée + authentification (phase P1). C'est elle qui débloque la collaboration, l'historique et les vraies données ; les autres intégrations viennent ensuite, une par une, selon l'usage réel.

## 6. Plan d'intégration par phases

| Phase | Contenu | Prérequis | Effort estimé |
|---|---|---|---|
| **P1 — Socle** (0-3 mois) | Base Postgres + authentification + rôles ; remplacement du stockage navigateur (`useLocal`) ; file d'approbation partagée ; saisie des éditions 2025-2026 | Choix de l'hébergeur ; un référent technique bénévole | 8-12 jours de développement |
| **P2 — Billetterie et site** (3-6 mois) | Connecteur inscriptions/billetterie (création d'événement, import des inscrits) ; page programme publiée sur le site après validation ; export comptable (CSV) | Site officiel existant ou à créer ; accès API des outils | 8-15 jours |
| **P2 bis — Veille automatisée** | Ingestion RSS des sources fiabilité 4-5, synthèse hebdomadaire planifiée | Planificateur + clé API côté serveur | 3-5 jours |
| **P3 — Écosystème joueurs** (6-12 mois) | Espace joueur (inscription, planning de son équipe, carte de performance), classements régionaux, écrans en direct | P1 + P2 ; consentements RGPD | 15-25 jours |

Détail et coûts : `docs/16-roadmap.md`.

## 7. Sécurité

- **Secrets** (clés API, mots de passe) : jamais dans le dépôt ni dans le navigateur ; variables d'environnement côté serveur ou coffre du fournisseur.
- **Sécurité par ligne (RLS)** : chaque table de la base filtre par rôle ; un partenaire ne voit que son dossier ; les budgets internes ne sont visibles que du bureau et de la trésorerie.
- **Journalisation** : qui a approuvé quoi, quand (table d'approbations horodatée).
- **Dépôt public** : le dépôt actuel est public ; aucune donnée personnelle (noms, adresses, coordonnées, données de joueurs ou bénévoles) ne doit y être ajoutée. Les données réelles vivront dans la base, pas dans le code.
- **Sauvegardes** : export régulier de la base (fonction native du fournisseur ou export CSV mensuel).

## 8. RGPD (information générale — à valider avec un professionnel si besoin)

- Registre simple des traitements : inscriptions, billetterie, bénévoles, partenaires, statistiques joueurs.
- Base légale par traitement (contrat pour l'inscription, consentement pour la newsletter et la diffusion d'images).
- **Mineurs** : autorisation des représentants légaux pour la participation et l'image ; consentement conjoint pour les traitements fondés sur le consentement en dessous de 15 ans ; pas de profil public de mineur sans accord ; floutage par défaut (`docs/research/R3-cadre-reglementaire-financements.md`).
- Durées de conservation définies ; statistiques de classement anonymisées ou pseudonymisées quand c'est possible ; droit d'opposition et de rectification sur les classements.
- Sous-traitants (hébergeur, billetterie, outils d'automatisation) : vérifier leurs engagements de conformité et la localisation des données.

## 9. Ce qui est déjà prêt

- Les **charges utiles** (planning publiable, passation au dashboard administratif, lignes de budget) sont produites par les moteurs.
- Le **garde-fou** d'approbation est codé et testé côté moteur.
- Le **schéma de base** est fourni (`supabase/migrations/`, testé localement par `npm run db:test`) ; il reste à l'appliquer sur un projet réel.
- Les **exports fichiers** (Word, Excel, PowerPoint, PDF, CSV) permettent de travailler dès aujourd'hui avec les outils existants de l'association, sans attendre les intégrations.
