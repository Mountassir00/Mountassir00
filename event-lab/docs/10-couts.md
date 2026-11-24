# 10 — Estimation des coûts de développement et d'exploitation

> Version du document : 0.1 — rédigé le 2026-11-24. Feuille de route associée : [`09-roadmap.md`](09-roadmap.md).
> Tous les montants sont **hors taxes**, en euros, arrondis. Les calculs ont été faits par script, pour éviter les erreurs d'arithmétique. Les hypothèses sont listées dans les tableaux, avec leur statut.
> Fiscalité, statut juridique et TVA : ce document donne une **information générale**. Le choix du statut et le traitement de la TVA se valident avec un **expert-comptable** ; les contrats de licence et la protection de la marque avec un **avocat** (propriété intellectuelle et contrats).

---

## 0. Synthèse

1. **Le coût du code domine tout le reste.**
   - Dans les scénarios central et accéléré, le développement représente environ 80 % du coût total sur 2 ans.
   - Hébergement, base de données et API Claude restent sous 200 €/mois en V1.
   - La décision économique porte donc sur **qui écrit le code et quand**, pas sur le choix d'un hébergeur.
2. **La veille par LLM ne coûte presque rien** : environ 21 €/mois en configuration centrale, 4,5 €/mois en frugal, 113 €/mois en intensif. Son vrai coût est le temps de validation humaine.
3. **Coût total sur 2 ans** :

   | Scénario | Coût total sur 2 ans |
   |---|---|
   | Frugal | ≈ 8,4 k€ |
   | Variante recommandée | ≈ 21,4 k€ |
   | Central | ≈ 49,8 k€ |
   | Accéléré | ≈ 197 k€ |

   Avec des revenus centraux (hypothèse), seuls le frugal et la variante recommandée sont à l'équilibre ou proches de l'équilibre sur 2 ans.
4. **Point mort de la variante recommandée.**
   - Hors rémunération du porteur : ≈ 2 « lots » par an (1 lot = 1 prestation + 2 licences), soit ≈ 12,5 k€ de CA.
   - Pour dégager 2 000 €/mois pour le porteur : ≈ 8,6 lots, soit ≈ 51 k€ de CA. À ce niveau, la franchise en base de TVA est dépassée.
5. **Recommandation** : le porteur développe avec Claude Code, et des freelances interviennent sur des points précis (scripts d'export, revue de sécurité, intégration billetterie). On économise sur le code, pas sur les contrats, la marque et l'assurance. Détail au §11.

---

## 1. Conventions et statuts de fiabilité

| Statut | Signification |
|---|---|
| **Vérifié** | Page officielle chargée directement et lue le 2026-11-24 |
| **Vérifié (R)** | Source officielle consultée le 2026-11-24 via un moteur de recherche (extrait indexé de la page). L'environnement d'exécution bloquait le chargement direct de la plupart des sites. **À reconfirmer sur la page avant tout engagement.** |
| **Secondaire (C)** | Source tierce (blog, comparateur, forum) non recoupée par une source officielle |
| **Estimation** | Fourchette construite par raisonnement, explicité dans la ligne |
| **Hypothèse** | Paramètre de modèle choisi a priori, à tester sur le terrain |
| **Non vérifié — à confirmer** | Aucune source trouvée dans le temps imparti |

Conversion des prix en dollars : **1 € = 1,11 $**. Les parités quotidiennes de la Banque de France du 9 au 13/11/2026 allaient de 1,1052 à 1,1214 $ ([banque-france.fr](https://www.banque-france.fr/fr/statistiques/taux-et-cours/taux-de-change-parites-quotidiennes-2026-11-13), Vérifié (R)). Un écart de change de ±5 % ne change aucune conclusion.

---

## 2. Registre des prix publics relevés (consultés le 2026-11-24)

| # | Poste | Prix relevé | Statut | Source |
|---|---|---|---|---|
| 1 | Claude Pro | 20 $/mois (mensuel) ; 17 $/mois en annuel (200 $/an) ; Claude Code inclus ; taxes non incluses | Vérifié | [claude.com/pricing](https://claude.com/pricing) |
| 2 | Claude Max / Ultra | Max 100 $/mois ; Ultra 200 $/mois ; Claude Code inclus | Vérifié | [claude.com/pricing](https://claude.com/pricing) |
| 3 | Claude Team | Siège standard 25 $/mois (mensuel) ou 20 $ (annuel) ; premium 125 $ ou 100 $ | Vérifié | [claude.com/pricing](https://claude.com/pricing) |
| 4 | API Claude Haiku 5.5 | 0,10 $ en entrée / 0,50 $ en sortie par million de tokens (prompts ≤ 100 000 tokens ; 0,50 / 2,50 $ au-delà) ; lecture de cache 0,01 $ | Vérifié | [platform.claude.com/docs/en/about-claude/pricing](https://platform.claude.com/docs/en/about-claude/pricing) |
| 5 | API Claude Sonnet 5.5 | 2 $ / 10 $ par million de tokens ; lecture de cache 0,10 $ | Vérifié | idem |
| 6 | API Claude Opus 5.5 | 4 $ / 20 $ par million de tokens ; lecture de cache 0,20 $ ; écriture de cache (5 min) 5 $ | Vérifié | idem |
| 7 | API — traitement par lots | −50 % en entrée et en sortie (Opus 5.5 : 2 / 10 $ ; Sonnet 5.5 : 1 / 5 $ ; Haiku 5.5 : 0,05 / 0,25 $) | Vérifié | idem |
| 8 | API — recherche web | 10 $ pour 1 000 recherches, plus les tokens des résultats | Vérifié | idem |
| 9 | API — lecture de page (web fetch) | Pas de surcoût, tokens seulement ; exemple Anthropic : page de 10 kB ≈ 2 500 tokens | Vérifié | idem |
| 10 | Tokeniseur | Les modèles Claude 4.7 et suivants produisent environ 30 % de tokens en plus pour un même texte | Vérifié | idem |
| 11 | Supabase Free | 0 $ ; base de 500 MB par projet ; 50 000 utilisateurs actifs par mois ; mise en pause après 1 semaine d'inactivité ; 2 projets actifs | Vérifié (R) | [supabase.com/pricing](https://supabase.com/pricing) |
| 12 | Supabase Pro | 25 $/mois, dont 10 $ de crédits de calcul (une instance Micro) ; 100 000 utilisateurs actifs par mois ; pas de mise en pause ; projet supplémentaire ≈ 10 $/mois | Vérifié (R) | [supabase.com/pricing](https://supabase.com/pricing), [billing FAQ](https://supabase.com/docs/guides/platform/billing-faq), [coût d'un projet](https://supabase.com/kb/faqs/platform/database-only-cost) |
| 13 | Supabase, dépassements | Facturation au-delà de 8 GB de disque et de 250 GB de bande passante sortante | Secondaire (C) | [activepieces.com](https://www.activepieces.com/blog/supabase-pricing-free-tier-limits-pro-costs-egress) |
| 14 | GitHub Pages | Gratuit ; limite souple de 100 GB/mois de bande passante ; interdit comme hébergement gratuit d'une activité principalement commerciale ou d'un SaaS | Vérifié (R) | [docs.github.com — limites de GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) |
| 15 | GitHub Pages sur dépôt privé | Nécessite un plan payant (Pro, Team ou Enterprise) ; prix de GitHub Pro **non vérifié — à confirmer** (4 $/mois annoncé en 2020, donnée ancienne) | Secondaire (C) | [forum GitHub](https://github.com/orgs/community/discussions/167331), [github.com/pricing](https://github.com/pricing) |
| 16 | GitHub Free | Dépôts publics et privés illimités ; 2 000 minutes d'Actions par mois | Vérifié (R) | [github.com/pricing](https://github.com/pricing), [docs — plans GitHub](https://docs.github.com/en/get-started/learning-about-github/githubs-plans) |
| 17 | Cloudflare Pages Free | 500 builds/mois, 1 build simultané, délai maximal 20 min. Bande passante non plafonnée selon le forum seulement. | Vérifié (R) / forum (C) | [developers.cloudflare.com — limites Pages](https://developers.cloudflare.com/pages/platform/limits/) |
| 18 | Cloudflare Workers Paid | 5 $/mois minimum ; 10 millions de requêtes incluses, 0,30 $ par million au-delà ; fichiers statiques gratuits et illimités | Vérifié (R) | [developers.cloudflare.com — tarifs Workers](https://developers.cloudflare.com/workers/platform/pricing/) |
| 19 | Netlify | Free : 300 crédits/mois, limite stricte. Personal : 9 $/mois (1 000 crédits). Pro : 20 $/mois (3 000 crédits). | Vérifié (R) | [netlify.com/pricing](https://www.netlify.com/pricing/), [docs Netlify](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/) |
| 20 | Vercel | Hobby 0 $ (conçu pour les projets personnels) ; Pro 20 $/mois avec 20 $ d'usage inclus. Pour une activité commerciale, prévoir Pro, à confirmer dans les CGU. | Vérifié (R) | [vercel.com/pricing](https://vercel.com/pricing), [docs — plans Vercel](https://vercel.com/docs/plans) |
| 21 | Brevo | Gratuit : 300 emails/jour, sans limite de durée. Starter : 9 $/mois (5 000 emails/mois). Prix en € et offre Business **non vérifiés — à confirmer**. | Vérifié (R) | [aide Brevo — limites du plan gratuit](https://help.brevo.com/hc/en-us/articles/208580669-FAQs-What-are-the-limits-of-the-Free-plan), [brevo.com](https://www.brevo.com/features/email-marketing/) |
| 22 | HelloAsso (billetterie associative) | 0 commission sur les billets ; contribution volontaire proposée à l'acheteur ; frais de paiement pris en charge par HelloAsso (déclaration de l'éditeur) | Vérifié (R) | [info.helloasso.com/modele-economique](https://info.helloasso.com/modele-economique) |
| 23 | Weezevent | 2,5 % par billet vendu en ligne, minimum 0,99 € TTC ; gratuit pour les événements gratuits ; sans abonnement. Plafond de 9,95 € (document de 2016) **non confirmé**. | Vérifié (R) | [weezevent.com/fr/nos-tarifs](https://weezevent.com/fr/nos-tarifs/) |
| 24 | Billetweb | 0,29 € + 1 % par billet payé en ligne par carte, frais bancaires inclus ; gratuit pour les événements gratuits et les ventes sur place ; PayPal 0,29 € + 5 % ; placement numéroté +0,10 € | Vérifié (R) | [billetweb.fr/fr-fr/tarifs](https://www.billetweb.fr/fr-fr/tarifs/), [fiche tarifaire PDF](https://www.billetweb.fr/images/tarifs_billetweb.pdf) |
| 25 | Marque INPI | Dépôt électronique 190 € pour 1 classe, +40 € par classe supplémentaire (tarifs applicables au 2 juillet 2026) | Vérifié (R) | [inpi.fr — tarifs](https://www.inpi.fr/ressources/propriete-intellectuelle/tarifs-procedures-et-prestations-de-linpi), [inpi.fr — coût d'une marque](https://www.inpi.fr/realiser-demarches/propriete-intellectuelle/deposant-et-cout-dune-marque) |
| 26 | Marque de l'UE (EUIPO) | 850 € pour 1 classe (dépôt en ligne) ; 50 € pour la 2e ; 150 € par classe à partir de la 3e. SME Fund 2026 : remboursement de 75 % pour les PME éligibles. | Vérifié (R) | [euipo.europa.eu — fees](https://www.euipo.europa.eu/en/trade-marks/before-applying/fees-payments), [SME Fund 2026](https://www.euipo.europa.eu/en/sme-corner/sme-fund/2026/vouchers/trademarks-and-designs) |
| 27 | Domaine .fr (OVHcloud) | 8,49 $ la première année ; renouvellement 8,59 $/an (page anglaise, en USD, HT non précisé). Prix du .com **non vérifié**. | Vérifié (R) | [ovhcloud.com — .fr](https://www.ovhcloud.com/en/domains/tld/fr/) |
| 28 | Hetzner Cloud CX23 | Dès 5,99 € HT/mois (2 vCPU, 4 Go de RAM, 40 Go NVMe). La mention « not available » sur la page est ambiguë. | Vérifié (R) | [hetzner.com/cloud/cost-optimized](https://www.hetzner.com/cloud/cost-optimized/) |
| 29 | Figma Professional | Siège Full 16 $/mois (annuel) ou 20 $ (mensuel) ; Dev 12 $ ; Collab 3 $. Instantané d'index ancien. | Vérifié (R) | [figma.com/pricing](https://www.figma.com/pricing/) |
| 30 | Expert-comptable en ligne (Dougs) | SASU dès 79 € HT/mois (Vérifié (R)). Entreprise individuelle en BNC dès 49 € HT/mois (Secondaire (C)). | Vérifié (R) / (C) | [dougs.fr — tarifs SASU](https://www.dougs.fr/tarifs/?section=sasu), [dixmilleheures.fr](https://www.dixmilleheures.fr/avis/dougs) |
| 31 | RC Pro « organisateur événementiel / communication » | « À partir de 15 €/mois » : prix d'appel commercial, pas un devis | Vérifié (R) | [sidecare.com](https://www.sidecare.com/assurance-rc-metier/organisateur-evenementiel-communication) |
| 32 | TJM freelance fullstack (Malt) | 556 € en moyenne (profils expérimentés actifs sur 3 mois). Par ville : Paris 599 €, Lyon 545 €, Bordeaux 540 €, Lille 520 €, Marseille 517 €. | Vérifié (R) | [malt.fr — fullstack](https://www.malt.fr/t/barometre-tarifs/tech/developpeur-backend/developpeur-fullstack), [malt.fr — back-end](https://www.malt.fr/t/barometre-tarifs/tech/developpeur-backend) |
| 33 | TJM développeur par ancienneté (d'après Malt) | 311 € (0–2 ans), 426 € (3–7 ans), 557 € (8–15 ans), 599 € (15 ans et plus) | Secondaire (C) | [launch-pad.fr](https://launch-pad.fr/tjm/developpeur) (consultation de Malt déclarée le 28/09/2026) |
| 34 | TJM fullstack (Free-Work) | 413 € en moyenne « en direct » (déclarations des membres) ; 550 €/j en moyenne affichée sur la page des missions | Vérifié (R) | [free-work.com — TJM fullstack](https://free-work.com/fr/tech-it/developpeur-fullstack/rate-tjm-freelance), [free-work.com — missions](https://www.free-work.com/fr/tech-it/jobs/developpeur-fullstack) |
| 35 | TJM développeurs (TJMètre) | Médiane de 520 €/j sur 2 956 TJM déclarés en 12 mois | Secondaire (C) | [tjmetre.fr/barometre](https://tjmetre.fr/barometre) |
| 36 | TJM agence | Taux moyen d'équipe de 500 à 750 € HT ; senior en agence 850 € ; MVP d'application web sur mesure à Paris dès 15 000 € HT | Secondaire (C, blog d'agence) | [kolonell.com](https://kolonell.com/fr/blog/tjm-developpeur-web-agence-benchmark-2026) |
| 37 | Cotisations sociales micro-entrepreneur 2026 | BNC 25,6 % du CA (24,6 % en 2025) ; prestations BIC 21,2 % | Vérifié (R) | [autoentrepreneur.urssaf.fr](https://www.autoentrepreneur.urssaf.fr/portail/accueil/sinformer-sur-le-statut/toutes-les-actualites/evolution-des-taux-de-cotisation.html), [service-public](https://entreprendre.service-public.gouv.fr/vosdroits/F36232) |
| 38 | Plafond de la micro-entreprise 2026 (prestations de services) | 83 600 € | Vérifié (R) | [autoentrepreneur.urssaf.fr — seuils 2026](https://www.autoentrepreneur.urssaf.fr/portail/accueil/sinformer-sur-le-statut/toutes-les-actualites/2026--modification-des-seuils-de.html) |
| 39 | Franchise en base de TVA (prestations de services) | 37 500 € ; seuil majoré 41 250 € | Vérifié (R) | [impots.gouv.fr](https://www.impots.gouv.fr/professionnel/questions/en-tant-que-micro-entrepreneur-puis-je-etre-redevable-de-la-tva) |
| 40 | TJM graphiste ou designer UX freelance | Recherche non aboutie (quota de recherche épuisé) | Non vérifié — à confirmer | — |
| 41 | Frais Stripe (paiement d'abonnements, V2) | Recherche non aboutie | Non vérifié — à confirmer | — |

---

## 3. Charge de développement par phase

La charge est exprimée en **jours-homme (JH) d'un développeur fullstack confirmé**. C'est une estimation par module, construite à partir du périmètre défini dans [07-algorithmes.md](07-algorithmes.md) et [09-roadmap.md](09-roadmap.md). Elle n'a pas été mesurée.

| Phase | Module | JH | Statut |
|---|---|---|---|
| MVP | Socle : navigation, store JSON/localStorage, validation par schémas, import/export JSON-MD | 6 | Estimation |
| MVP | Dashboard | 2 | Estimation |
| MVP | Observatoire : fiches, filtres, déduplication (07 §9) | 3 | Estimation |
| MVP | Bibliothèque de briques ; registre des erreurs | 2 + 2 | Estimation |
| MVP | Générateur de concepts (07 §2) | 5 | Estimation |
| MVP | Notation, portes, confiance (07 §1) | 3 | Estimation |
| MVP | Simulateur logistique : compétition, flux, personnel, chemin critique (07 §4–6) | 7 | Estimation |
| MVP | Simulateur financier (07 §7) | 6 | Estimation |
| MVP | Configurateur de lieu 2D simplifié | 6 | Estimation |
| MVP | Bibliothèque documentaire ; versionnement local | 2 + 2 | Estimation |
| MVP | Exports PDF/DOCX/XLSX/PPTX par scripts | 5 | Estimation |
| MVP | Tests, recette, documentation | 6 | Estimation |
| **MVP** | **Total** | **57** (fourchette 43–77) | Estimation |
| **V1a** | Backend, Auth, RLS, Storage (10) ; rôles (6) ; file de validation de la veille (6) ; administration et audit (4) ; migration (3) ; sécurité, RGPD, intégration continue (6) | **35** | Estimation |
| **V1b** | Projet et calendrier (8) ; notifications (3) ; pipeline API (4) ; rédaction LLM (6) ; 3 billetteries (12) ; CRM, compta, emailing (8) ; import de plans (4) ; studio visuel (8) ; recette (4) | **57** | Estimation |
| **V2** | 3D (35) ; recalibrage (10) ; SaaS multi-organisation (30) ; place de marché (30) ; analyse post-événement (15) ; durcissement (15) | **135** | Estimation |

La fourchette appliquée va de −25 % à +35 %. Elle est asymétrique parce que les projets logiciels dépassent plus souvent leur estimation qu'ils ne la battent.

---

## 4. Trois options de réalisation, par phase

### 4.1 Paramètres

| Paramètre | Bas | Central | Haut | Statut et justification |
|---|---|---|---|---|
| TJM freelance fullstack | 415 € | 555 € | 600 € | Bas : Free-Work « en direct » (413 €). Central : Malt fullstack (556 €). Haut : Malt Paris (599 €). Vérifié (R). Les frais de plateforme éventuels ne sont pas inclus (non vérifiés). |
| TJM agence (taux moyen d'équipe) | 550 € | 650 € | 800 € | Secondaire (C) : fourchette de 500 à 750 €, senior 850 €. Estimation à reconfirmer par 3 devis. |
| Surcoût agence (chef de projet, recette, design) | ×1,3 | ×1,3 | ×1,3 | Estimation : une agence facture le pilotage et la recette en plus des JH de développement |
| Temps du porteur avec Claude Code | 0,6 × JH | — | 1,0 × JH | Hypothèse : Claude Code accélère l'écriture du code, mais le porteur n'est pas développeur de métier et doit relire, tester et corriger |

### 4.2 Coût cash par phase (€ HT)

| Phase (JH) | (a) Porteur + Claude Code | (b) Freelance : bas / central / haut | (c) Agence : bas / central / haut | Statut |
|---|---|---|---|---|
| **MVP** (57) | ≈ 270 € d'abonnement Max sur 3 mois + 34 à 57 jours du porteur ; option : 5 JH freelance pour les scripts d'export et la recette (≈ 2 800 €) | 23 700 / 31 600 / 34 200 | 40 800 / 48 200 / 59 300 | Estimation × prix Vérifié (R) / (C) |
| **V1a** (35) | ≈ 2 800 € (5 JH de binôme et de revue de sécurité) + 18 à 30 jours du porteur | 14 500 / 19 400 / 21 000 | 25 000 / 29 600 / 36 400 | idem |
| **V1b** (57) | ≈ 5 600 € (10 JH ciblés) + 28 à 47 jours du porteur | 23 700 / 31 600 / 34 200 | 40 800 / 48 200 / 59 300 | idem |
| **V1** complète (92) | — | 38 200 / 51 100 / 55 200 | 65 800 / 77 700 / 95 700 | idem |
| **V2** (135) | Non recommandé : multi-organisation, paiement, 3D | 56 000 / 74 900 / 81 000 | 96 500 / 114 100 / 140 400 | idem |

Avec la fourchette de charge (−25 % / +35 %) au TJM central, le MVP confié à un freelance coûte 23 700 à 42 700 €, V1 38 300 à 68 900 €, V2 56 200 à 101 100 €.

### 4.3 Comparaison qualitative

| Critère | (a) Porteur + Claude Code | (b) Freelance(s) | (c) Agence |
|---|---|---|---|
| Cash engagé avant la preuve de marché | Minimal | Élevé | Très élevé |
| Délai | Le plus long : le porteur partage son temps avec la vente | Moyen | Le plus court sur un périmètre figé |
| Maîtrise du produit et du code | Totale ; le porteur comprend son outil | Bonne si le code est remis et documenté | Faible à moyenne ; dépendance au prestataire |
| Risque de sécurité (V1 : authentification, RLS, données personnelles) | **Élevé sans revue externe** | Moyen | Faible à moyen |
| Coût d'opportunité | Élevé : chaque jour à coder est un jour sans vendre | Faible | Faible |
| Adapté à | MVP, V1a avec revue de sécurité | V1b ciblé, V2 par lots | V2 si financement dédié ; rarement justifié avant |

### 4.4 Ce que coûte vraiment le temps du porteur

L'option (a) n'est pas gratuite. Elle remplace du cash par du temps. Sans appui freelance, le MVP et V1a demandent 55 à 92 jours du porteur (hypothèse §4.1). Pour les valoriser, on retient un paramètre V librement choisi par le porteur. **V n'est pas un salaire de marché.**

| V (€ par jour du porteur, paramètre) | Coût d'opportunité MVP + V1a | Statut |
|---|---|---|
| 200 € | 11 000 – 18 400 € | Hypothèse |
| 300 € | 16 500 – 27 600 € | Hypothèse |
| 400 € | 22 000 – 36 800 € | Hypothèse |

Ce coût est du même ordre que l'option (b). L'avantage de (a) n'est donc pas d'être moins cher : c'est que **l'argent n'est pas dépensé si le marché ne répond pas**. Le temps investi produit en outre une connaissance fine de l'outil. La condition est que le porteur consacre au moins 50 % de son temps au marché (09 §3.5).

---

## 5. Coûts d'exploitation

### 5.1 Hébergement de l'application statique (MVP)

| Option | Coût | Limite décisive pour EVENT LAB | Statut |
|---|---|---|---|
| Usage local (fichier ouvert dans le navigateur ou petit serveur local) | 0 € | Mono-utilisateur, aucune exposition publique : suffisant pour le MVP | Fait (architecture H3) |
| Cloudflare Pages Free | 0 € | 500 builds/mois ; à combiner avec un dépôt privé (compatibilité à confirmer) | Vérifié (R) |
| GitHub Pages | 0 € | Gratuit seulement depuis un dépôt public avec le plan Free ; or le dépôt doit devenir privé (risque signalé dans le CHANGELOG) | Vérifié (R) / (C) |
| Netlify Free / Personal | 0 € / 9 $ par mois | Le plan Free met le site en pause quand les crédits sont épuisés | Vérifié (R) |
| Vercel Hobby / Pro | 0 $ / 20 $ par mois | Hobby est conçu pour les projets personnels : prévoir Pro pour un usage commercial | Vérifié (R) |

**Choix MVP** : usage local, et Cloudflare Pages Free si une démonstration en ligne est nécessaire, sans données réelles exposées. Coût : 0 €. Une protection par contrôle d'accès est possible, mais son offre et son coût n'ont pas été vérifiés.

### 5.2 Backend V1 : managé ou auto-hébergé

| Option | Coût mensuel | Statut | Commentaire |
|---|---|---|---|
| Supabase Free | 0 € | Vérifié (R) | Développement uniquement : mise en pause après 1 semaine d'inactivité |
| Supabase Pro | ≈ 22,5 €/mois (25 $) | Vérifié (R) | Production ; inclut une instance Micro |
| Supabase Pro + projet de recette | ≈ 31,5 €/mois (35 $) | Vérifié (R) | Configuration retenue en central |
| Auto-hébergé (Hetzner CX23 + Supabase open source) | 5,99 € de serveur **+ 0,5 à 2 JH/mois d'administration** (mises à jour, sauvegardes, surveillance) ≈ 210 à 1 110 €/mois si ce temps est valorisé à 415–555 €/j | Serveur Vérifié (R) ; administration : Estimation | Pertinent seulement si un client exige un hébergement maîtrisé. Sinon, plus cher que l'offre managée une fois le temps compté. |

La localisation des données (région UE) chez Supabase n'a pas été vérifiée ; à confirmer si une collectivité l'exige.

### 5.3 Abonnement Claude / Claude Code

| Usage | Formule | Coût | Statut |
|---|---|---|---|
| Construction intensive (S1–S13) | Max | ≈ 90 €/mois (100 $) | Vérifié |
| Exploitation, documents, veille par tâches planifiées (MVP) | Pro | ≈ 18 €/mois en mensuel, ≈ 180 €/an en annuel | Vérifié |
| Collaboration à plusieurs (V2) | Team | 20 à 25 $ par siège et par mois (standard) | Vérifié |

En MVP, la veille tourne dans les tâches planifiées de Claude Code, comprises dans l'abonnement. Le coût marginal est nul, mais ces tâches consomment le quota d'usage de la formule. En V1, le pipeline passe par l'API (§6) pour environ 21 €/mois. C'est moins cher que de garder Max pour la seule veille.

Pour une entreprise française, les prix affichés s'entendent hors taxes ; le traitement de la TVA sur un service étranger est à valider avec l'expert-comptable.

### 5.4 Récapitulatif mensuel et annuel par phase (configuration centrale)

| Poste | MVP €/mois | V1 €/mois | V2 €/mois | Statut |
|---|---|---|---|---|
| Abonnement Claude (Pro ; Max en V2) | 18,0 | 18,0 | 90,1 | Vérifié |
| Domaines .fr + .com (20 €/an) | 1,7 | 1,7 | 1,7 | .fr Vérifié (R) ; .com Estimation |
| Hébergement du front | 0 | 0 | 4,5 (Workers Paid) | Vérifié (R) |
| Backend managé | 0 | 31,5 | 150 | V1 Vérifié (R) ; V2 Estimation (calcul supérieur, plus de stockage) |
| Emailing | 0 (Brevo gratuit) | 8,1 (Starter) | 30 | V1 Vérifié (R) ; V2 Estimation |
| API Claude (veille + rédaction, §6) | 0 | 29,6 | 133,6 | Calcul sur hypothèses de volume |
| Figma (seulement si un designer interne en a besoin) | 0 | 0 | 14,4 | Vérifié (R) |
| RC Pro (annuel ÷ 12) | 33,3 | 33,3 | 58,3 | Estimation (prix d'appel vérifié : 15 €/mois) |
| Comptabilité en ligne | 49 | 49 | 79 (société) | Vérifié (R) / (C) |
| **Total mensuel** | **≈ 102** | **≈ 171** | **≈ 562** | |
| **Total annuel** | **≈ 1 220** | **≈ 2 060** | **≈ 6 740** | |

Avec Max pendant la construction, le MVP coûte ≈ 174 €/mois. Variante frugale du MVP (Pro annuel, comptabilité tenue par le porteur, RC Pro bas de fourchette) : ≈ 38 €/mois, soit ≈ 450 €/an. En V2, ajouter un test d'intrusion ponctuel estimé à 5 000 € (non vérifié : à obtenir par devis).

---

## 6. Coût de la veille et de la rédaction par LLM (V1)

### 6.1 Hypothèses de volume par passage (scénario central)

Les hypothèses sont exprimées en tokens du modèle.
- Résultat de recherche (liste et extraits) : 3 000 tokens (hypothèse).
- Page lue : 4 000 tokens. Hypothèse prudente au-dessus de l'exemple Anthropic de 2 500 tokens pour 10 kB.
- Prompt système, schéma et taxonomie : 8 000 tokens.
- Fiche de veille : 900 tokens.
- **Facteur de boucle** : un agent relit son contexte à chaque étape. On compte donc chaque token nouveau 3 fois (2 fois pour les passages longs).

| Passage | Fréquence | Recherches | Pages lues | Fiches relues | Tokens d'entrée facturés | Tokens de sortie (fiches + raisonnement) | Statut |
|---|---|---|---|---|---|---|---|
| Quotidien | 30 / mois | 15 | 10 | 0 | 279 000 | 17 000 | Hypothèse |
| Hebdomadaire | 4,33 / mois | 10 | 5 | 60 | 336 000 | 25 000 | Hypothèse |
| Mensuel | 1 / mois | 20 | 10 | 250 | 666 000 | 50 000 | Hypothèse |
| Trimestriel | 1 / 3 mois | 30 | — | — | 800 000 | 80 000 | Hypothèse |
| Annuel | 1 / an | 50 | — | — | 1 500 000 | 150 000 | Hypothèse |

### 6.2 Coût d'un passage selon le modèle (volumes centraux, en $)

| Passage | Haiku 5.5 | Sonnet 5.5 | Opus 5.5 | Sonnet 5.5, 60 % de l'entrée en cache | Opus 5.5, 60 % en cache | Statut |
|---|---|---|---|---|---|---|
| Quotidien | 0,19 | 0,88 | 1,61 | 0,56 | 0,97 | Calcul (prix Vérifié × volumes Hypothèse) |
| Hebdomadaire | 0,15 | 1,02 | 1,94 | 0,64 | 1,18 | idem |
| Mensuel | 0,29 | 2,03 | 3,86 | 1,27 | 2,35 | idem |
| Trimestriel | 0,42 | 2,70 | 5,10 | 1,79 | 3,28 | idem |
| Annuel | 0,72 | 5,00 | 9,50 | 3,29 | 6,08 | idem |

Le tarif bas de Haiku 5.5 suppose que chaque requête reste sous 100 000 tokens. Le passage quotidien doit donc être découpé en plusieurs requêtes.

### 6.3 Coût mensuel de la veille par scénario

| Scénario | Configuration | €/mois | €/an | Statut |
|---|---|---|---|---|
| Frugal | Volumes ×0,5 ; Haiku 5.5 au quotidien, Sonnet 5.5 pour les synthèses ; 60 % de l'entrée en cache | ≈ 4,5 | ≈ 54 | Calcul sur hypothèses |
| Central | Volumes ×1 ; Sonnet 5.5 au quotidien et à l'hebdomadaire, Opus 5.5 au-delà ; 60 % en cache | ≈ 21 | ≈ 254 | Calcul sur hypothèses |
| Intensif | Volumes ×2 ; Opus 5.5 partout ; sans cache | ≈ 113 | ≈ 1 360 | Calcul sur hypothèses |

En central, le passage quotidien représente 70 % du coût (≈ 0,50 € par passage).

Le coût qui compte est **la validation humaine**, obligatoire selon le brief §4 et 07 §9. À raison de 20 à 30 minutes par jour (hypothèse), cela représente 1 à 1,5 jour par mois, bien plus que la facture API.

### 6.4 Couche rédactionnelle (V1, 07 §2.9)

| Tâche | Volume (hypothèse) | Coût unitaire avec Opus 5.5 | Statut |
|---|---|---|---|
| Rédiger un concept (nom, pitch, description) | 30 000 tokens en entrée, 6 000 en sortie | ≈ 0,22 € | Calcul |
| Rédiger un blueprint (40 sections) | 400 000 tokens en entrée, 80 000 en sortie | ≈ 2,1 € avec cache, 2,9 € sans | Calcul |
| Mensuel central : 20 concepts + 2 blueprints | — | ≈ 8,5 €/mois | Calcul |

---

## 7. Billetterie : modèle de frais

Ces frais sont **à la charge de l'événement**, pas du studio. Ils entrent dans le simulateur financier (07 §7) comme dépenses par billet. Le partage du frais entre acheteur et organisateur dépend du paramétrage de chaque plateforme (à confirmer).

| Prix du billet | HelloAsso | Billetweb (0,29 € + 1 %) | Weezevent (2,5 %, minimum 0,99 €) | Statut |
|---|---|---|---|---|
| 5 € | 0 € (contribution volontaire de l'acheteur) | 0,34 € (6,8 %) | 0,99 € (19,8 %) | Calcul sur prix Vérifié (R) |
| 8 € | 0 € | 0,37 € (4,6 %) | 0,99 € (12,4 %) | idem |
| 10 € | 0 € | 0,39 € (3,9 %) | 0,99 € (9,9 %) | idem |
| 15 € | 0 € | 0,44 € (2,9 %) | 0,99 € (6,6 %) | idem |
| 25 € | 0 € | 0,54 € (2,2 %) | 0,99 € (4,0 %) | idem |
| **500 billets à 8 €** | 0 € | 185 € | 495 € | idem |
| **800 billets à 10 €** | 0 € | 312 € | 792 € | idem |

**Lecture.**
- Pour un format amateur à petit prix (5–10 €), le minimum de 0,99 € de Weezevent pèse lourd : il ne se justifie que par des services supplémentaires (sur place, cashless : non chiffrés ici).
- HelloAsso est le premier choix quand l'organisateur est une association, à condition d'accepter que la contribution volontaire soit proposée aux acheteurs.
- Billetweb est le choix par défaut dans les autres cas.

---

## 8. Coûts ponctuels et cadre administratif

| Poste | Montant | Statut | Raisonnement |
|---|---|---|---|
| Marque INPI, 3 classes (par exemple 41 organisation d'événements, 35 services commerciaux, 42 logiciel : classes à valider avec un conseil) | 270 € | Vérifié (R) | 190 € + 2 × 40 € |
| Marque de l'UE (EUIPO), 3 classes | 1 050 € ; ≈ 262 € avec le SME Fund si éligible | Vérifié (R) | 850 + 50 + 150 € ; à envisager en V2 seulement (expansion) |
| Contrat de licence de format, CGV, convention de pilote (avocat) | 800 à 4 000 € | **Estimation — non vérifié** | De la relecture d'un modèle (bas) à la rédaction sur mesure avec CGU et contrat de sous-traitance (haut). Obtenir 2 à 3 devis. |
| Identité visuelle du format (logo, charte) | 500 à 3 000 € | **Estimation — non vérifié** | Environ 1 à 6 jours de graphiste ; TJM non vérifié |
| RC Pro du studio | 250 à 700 €/an | **Estimation** (prix d'appel vérifié : 180 €/an) | La prime dépend des garanties, des franchises et du CA. Le studio n'étant pas organisateur (09 §0), la RC organisateur relève du partenaire. 2 devis en S2. |
| Comptabilité | 0 à 948 €/an | Vérifié (R) / (C) | 0 € si micro-entreprise tenue par le porteur ; ≈ 588 €/an pour une offre en ligne EI ; ≈ 948 €/an pour une SASU |
| Frais de création de société, compte bancaire professionnel | Non chiffrés | Non vérifié — à confirmer | Dépend du statut retenu |

### 8.1 Statut et TVA : information générale (à valider avec un expert-comptable)

- **Micro-entreprise** : cotisations proportionnelles au CA. En 2026, elles s'élèvent à 25,6 % pour une activité BNC et 21,2 % pour des prestations BIC. Le plafond de CA pour les prestations de services est de 83 600 € en 2026. La qualification de l'activité dépend de sa nature :
  - concession de licence et conseil : plutôt BNC ;
  - production événementielle : éventuellement BIC.
  Cette qualification **doit être tranchée par l'expert-comptable**.
- **Franchise en base de TVA** : 37 500 € de CA de prestations, seuil majoré 41 250 €. Au-delà, il faut facturer la TVA. Point commercial important : la plupart des associations ne récupèrent pas la TVA, donc un prix HT inchangé leur coûte 20 % de plus. Le point mort « avec rémunération du porteur » (§10) se situe au-dessus de ce seuil.
- **SASU ou autre société** : à envisager si le CA dépasse durablement les seuils, si des associés entrent au capital, ou si l'activité d'organisation est un jour assumée. L'arbitrage se fait avec l'expert-comptable et l'avocat.
- Les aides à la création (ACRE, prêts d'honneur, Bpifrance) n'ont **pas été vérifiées** et ne sont pas intégrées aux calculs.

---

## 9. Coût total de possession (TCO), année 1 et année 2

Années de référence :
- **A1** : décembre 2026 à novembre 2027.
- **A2** : décembre 2027 à novembre 2028.

Calendrier commun : les portes de la roadmap s'appliquent. Les coûts V1 n'apparaissent qu'après G3.

### 9.1 Définition des scénarios

| Scénario | Réalisation | Calendrier |
|---|---|---|
| **Frugal** | MVP et V1a par le porteur avec Claude Code ; 3 JH de revue de sécurité (A1) ; V1b en interne + 5 JH freelance (A2) ; offres gratuites partout ; micro-entreprise sans expert en A1 | V1a en M10–M12 |
| **Central** | MVP par le porteur + 5 JH freelance ; V1a confiée à un freelance (35 JH) + 3 JH de revue indépendante ; V1b ciblé confié à un freelance (28 JH) en A2 | V1a en M10–M12 |
| **Accéléré** | MVP par un freelance (57 JH) ; V1 complète par une agence (92 JH) en A1 ; V2 partielle (3D + multi-organisation, 65 JH) par une agence en A2 ; EUIPO, test d'intrusion, SASU | Portes franchies au plus tôt |
| **Variante recommandée** | Technique frugale + protection centrale : MVP et V1a par le porteur, 10 JH freelance en A1 (scripts d'export, recette, binôme V1a et revue de sécurité), 10 JH en A2 (intégration billetterie, revue) ; contrats, marque, identité et assurance au niveau central | V1a en M10–M12 |

### 9.2 Résultats (€ HT, arrondis)

| Catégorie | Frugal A1 | Frugal A2 | Recommandée A1 | Recommandée A2 | Central A1 | Central A2 | Accéléré A1 | Accéléré A2 | Statut |
|---|---|---|---|---|---|---|---|---|---|
| Développement (cash) | 1 245 | 2 075 | 5 550 | 5 550 | 23 865 | 15 540 | 109 375 | 54 925 | Estimation (JH) × TJM Vérifié (R) / (C) |
| Abonnements, infra, API | 254 | 575 | 506 | 1 067 | 623 | 1 067 | 2 390 | 5 091 | Vérifié / Vérifié (R) + calcul |
| Assurance, comptabilité | 250 | 838 | 988 | 988 | 988 | 988 | 1 648 | 1 648 | Estimation / Vérifié (R) |
| Marque, juridique, identité, sécurité | 1 530 | 300 | 3 770 | 500 | 3 770 | 500 | 7 270 | 9 550 | Marque Vérifié (R) ; reste Estimation |
| Terrain, prospection | 500 | 800 | 1 000 | 1 500 | 1 000 | 1 500 | 2 000 | 3 000 | Hypothèse |
| **Total** | **3 779** | **4 588** | **11 814** | **9 605** | **30 246** | **19 595** | **122 683** | **74 214** | |
| **Cumul sur 2 ans** | **≈ 8 400** | | **≈ 21 400** | | **≈ 49 800** | | **≈ 196 900** | | |
| Part du développement sur 2 ans | 40 % | | 52 % | | 79 % | | 83 % | | Calcul |
| Jours du porteur consacrés au code | 90 à 150 j | | 60 à 100 j | | 30 à 52 j | | ≈ 20 j (pilotage) | | Hypothèse (§4.1) |

Ces totaux n'incluent pas la rémunération du porteur, son coût d'opportunité (§4.4), les cotisations sociales ni l'impôt.

---

## 10. Modèle de revenus et point mort

### 10.1 Hypothèses de revenus

| Paramètre | Valeur | Statut | Raisonnement |
|---|---|---|---|
| **Prestation de production / accompagnement** (conception, rétroplanning, coordination de J−90 à J+30) | 3 000 € HT ; prix pilote 1 500 à 2 500 € | Hypothèse | Représente 10 à 15 % d'un budget d'événement de 20 à 30 k€ ; au-delà, inaccessible pour un club. À tester avec 3 ancres en entretien (09 §7). |
| **Licence de format par édition** (manuel de reproduction, kit documentaire, droit d'usage du nom, 2 points d'accompagnement) | 1 500 € HT | Hypothèse | 5 à 15 % d'un budget de 10 à 30 k€ ; doit coûter moins cher que la conception en interne par l'organisateur. **Aucun barème public de licence de format n'a été trouvé.** |
| Abonnement à l'outil (V2) | 79 €/mois par organisation | Hypothèse | Sans revenu en A1–A2 dans tous les scénarios (V2 au plus tôt mi-2028) |
| Coûts variables | Prestation 15 %, licence 10 %, SaaS 10 % du prix | Hypothèse | Déplacements, impressions, kit, sous-traitance ponctuelle |
| Jours de production du studio | Prestation 12 j, licence 2,5 j | Hypothèse | À mesurer dès le pilote (09 §4.8) |
| Capacité de production du porteur | ≈ 150 j/an | Hypothèse | Le reste du temps : vente, administration, R&D |
| Cotisations (micro-entreprise BNC) | 25,6 % du CA | Vérifié (R) | Information générale ; statut à valider |

| Volumes | A1 | A2 | Statut |
|---|---|---|---|
| Prudent | 1 pilote à 1 500 € | 2 prestations + 3 licences (10 500 €) | Hypothèse |
| Central | 1 pilote à 2 000 € + 1 prestation + 1 licence (6 500 €) | 3 prestations + 8 licences (21 000 €) | Hypothèse |
| Ambitieux | 1 pilote à 2 500 € + 2 prestations + 3 licences (13 000 €) | 5 prestations + 15 licences (37 500 €) | Hypothèse |

### 10.2 Résultat avant rémunération du porteur et impôts (€)

Formule : résultat = CA − coûts variables − TCO. Entre parenthèses : le même résultat après cotisations de micro-entreprise (25,6 % du CA).

| Coût \ Revenus | Prudent A1 | Prudent A2 | Prudent cumul | Central A1 | Central A2 | Central cumul | Ambitieux A1 | Ambitieux A2 | Ambitieux cumul | Statut |
|---|---|---|---|---|---|---|---|---|---|---|
| Frugal | −2 504 (−2 888) | 4 562 (1 874) | 2 058 (−1 014) | 1 821 (157) | 13 862 (8 486) | 15 683 (8 643) | 7 496 (4 168) | 28 412 (18 812) | 35 908 (22 980) | Calcul sur hypothèses |
| **Recommandée** | −10 539 (−10 923) | −455 (−3 143) | −10 995 (−14 067) | −6 214 (−7 878) | 8 845 (3 469) | **2 630 (−4 410)** | −539 (−3 867) | 23 395 (13 795) | 22 855 (9 927) | idem |
| Central | −28 971 (−29 355) | −10 445 (−13 133) | −39 416 (−42 488) | −24 646 (−26 310) | −1 145 (−6 521) | −25 791 (−32 831) | −18 971 (−22 299) | 13 405 (3 805) | −5 566 (−18 494) | idem |
| Accéléré | −121 408 | −65 064 | −186 473 | −117 083 | −55 764 | −172 848 | −111 408 | −41 214 | −152 623 | idem |

**Besoin de financement maximal de la variante recommandée** : ≈ 10,5 k€ en A1 avec des revenus prudents. Il est couvrable sur fonds propres, ce qui évite d'avoir à lever des fonds.

### 10.3 Point mort (régime de croisière)

Définitions :
- **Charges fixes de croisière** = charges hors développement de l'A2 + développement cumulé A1+A2 amorti sur 3 ans (hypothèse).
- **Lot** = 1 prestation + 2 licences, soit 6 000 € de CA et 17 jours de production.
- **R** = rémunération mensuelle visée par le porteur, nette de cotisations micro, avant impôt. C'est un **paramètre** choisi par le porteur, pas une donnée de marché.
- **Marge par unité** après coûts variables et cotisations BNC : 1 782 € par prestation, 966 € par licence.

| Scénario | R (€/mois) | Charges fixes à couvrir | Licences seules | Prestations seules | Lots | CA au point mort | Jours de production | Statut |
|---|---|---|---|---|---|---|---|---|
| Frugal | 0 | 3 620 | 3,7 | 2,0 | 1,0 | ≈ 5 800 | 17 | Calcul sur hypothèses |
| Frugal | 2 000 | 27 620 | 28,6 | 15,5 | 7,4 | ≈ 44 600 | 126 | idem |
| **Recommandée** | **0** | **7 755** | **8,0** | **4,4** | **2,1** | **≈ 12 500** | **35** | idem |
| Recommandée | 1 000 | 19 755 | 20,5 | 11,1 | 5,3 | ≈ 31 900 | 90 | idem |
| **Recommandée** | **2 000** | **31 755** | **32,9** | **17,8** | **8,6** | **≈ 51 300** | **145** | idem |
| Recommandée | 3 000 | 43 755 | 45,3 | 24,6 | 11,8 | ≈ 70 700 | 200 (au-delà de la capacité) | idem |
| Central | 0 | 17 190 | 17,8 | 9,6 | 4,6 | ≈ 27 800 | 79 | idem |
| Central | 2 000 | 41 190 | 42,6 | 23,1 | 11,1 | ≈ 66 500 | 189 (au-delà de la capacité) | idem |
| Accéléré | 0 | 74 056 | 76,7 | 41,6 | 19,9 | ≈ 119 600 | 339 (impossible sans équipe) | idem |

**Lecture.**
- Le studio couvre ses frais avec environ 2 lots par an.
- Il fait vivre le porteur à 2 000 €/mois avec environ 8 à 9 lots par an, ce qui exige environ 145 jours de production, proche de la capacité estimée.
- Une licence mobilise environ 5 fois moins de jours qu'une prestation pour une marge supérieure à la moitié de celle d'une prestation. La croissance passe donc par **la licence, pas par la prestation**, ce qui justifie V1 (baisser les jours d'accompagnement par licence) seulement une fois la licence vendue.

### 10.4 Sensibilité

**a) Licences par an au point mort (R = 0), selon le prix de la licence et le scénario de coûts**

| Prix de la licence | Frugal | Recommandée | Central | Accéléré | Statut |
|---|---|---|---|---|---|
| 800 € | 7,0 | 15,1 | 33,4 | 143,7 | Calcul |
| 1 200 € | 4,7 | 10,0 | 22,2 | 95,8 | Calcul |
| 1 500 € | 3,7 | 8,0 | 17,8 | 76,7 | Calcul |
| 2 000 € | 2,8 | 6,0 | 13,3 | 57,5 | Calcul |
| 2 500 € | 2,2 | 4,8 | 10,7 | 46,0 | Calcul |

**b) Lots par an au point mort (variante recommandée), selon le prix de la licence et la rémunération visée**

| Prix de la licence | R = 0 | R = 1 000 | R = 2 000 | R = 3 000 | Statut |
|---|---|---|---|---|---|
| 800 € | 2,8 | 7,0 | 11,3 | 15,6 | Calcul |
| 1 200 € | 2,3 | 5,9 | 9,5 | 13,1 | Calcul |
| 1 500 € | 2,1 | 5,3 | 8,6 | 11,8 | Calcul |
| 2 000 € | 1,8 | 4,5 | 7,3 | 10,0 | Calcul |
| 2 500 € | 1,6 | 3,9 | 6,3 | 8,7 | Calcul |

**c) Facteurs qui font varier le point mort (variante recommandée, R = 1 500 €/mois ; référence : 6,9 lots, ≈ 41,6 k€ de CA)**

| Facteur testé | Lots (favorable / défavorable) | Écart | Statut |
|---|---|---|---|
| Rémunération visée 1 000 / 2 000 €/mois | 5,3 / 8,6 | 3,2 | Calcul |
| Coûts variables divisés par 2 / multipliés par 2 | 6,3 / 8,7 | 2,4 | Calcul |
| Prix de la licence ±20 % | 6,3 / 7,7 | 1,5 | Calcul |
| Prix de la prestation ±20 % | 6,3 / 7,7 | 1,3 | Calcul |
| Coût de développement ±50 % | 6,4 / 7,4 | 1,0 | Calcul |
| Cotisations 21,2 % (BIC) / 25,6 % (BNC) | 6,5 / 6,9 | 0,5 | Calcul |
| Charges hors développement ±20 % | 6,7 / 7,2 | 0,4 | Calcul |

Dans la variante recommandée, les leviers décisifs sont **le prix et la maîtrise des coûts variables** (jours et frais par licence), pas l'infrastructure. Dans les scénarios central et accéléré, en revanche, le développement est le premier facteur (sensibilité a).

**d) Abonnement V2.** À 79 €/mois, une organisation dégage environ 611 € par an de marge après coûts variables et cotisations. Amortir V2 (freelance, valeur centrale 74 900 € sur 3 ans) demande donc environ **41 organisations abonnées**. C'est une raison supplémentaire de conditionner V2 à G4.

---

## 11. Recommandation

**Option** : (a) porteur + Claude Code pour le MVP et V1a, complétée par des freelances sur des interventions courtes (≈ 10 JH par an) là où une erreur coûte cher : revue de sécurité avant toute ouverture à des tiers, scripts d'export, intégration billetterie. (b) freelance pour V1b seulement si un module est financé par des clients. (c) agence : non, sauf si V2 est financée par un client ou un financement dédié.

**Scénario** : la **variante recommandée** (≈ 11,8 k€ en A1, ≈ 9,6 k€ en A2, ≈ 21,4 k€ cumulés).

Pourquoi :
1. **Le risque dominant est commercial, pas technique.** Tant que G1 et G3 ne sont pas franchies, chaque euro de développement externe est perdu si le marché ne répond pas. La variante recommandée limite le besoin de financement maximal à ≈ 10,5 k€.
2. **L'infrastructure et l'IA ne sont pas des postes de décision** (< 200 €/mois en V1). Négocier un hébergeur ne change rien ; décaler 20 k€ de développement change tout.
3. **On économise sur le code, pas sur la protection.**
   - Le contrat de licence, la marque, l'identité du format et l'assurance sont l'actif licenciable lui-même.
   - Une licence sans contrat solide ni marque déposée ne vaut rien.
   - C'est pourquoi la variante recommandée dépense davantage que le frugal sur ces postes (≈ 3,8 k€ contre 1,5 k€ en A1).
4. **Le point mort sans rémunération est atteignable dès l'A2** (≈ 2 lots). Avec des revenus centraux, la variante est à +2,6 k€ cumulés avant cotisations.
5. **Le temps du porteur est la vraie ressource rare.** La règle « ≥ 50 % du temps sur le marché » (09 §3.5) conditionne toute la recommandation. Si elle n'est pas tenue, l'option (a) devient la plus chère, car elle fait perdre des ventes.

**Ce qui ferait changer la recommandation**

| Signal observé | Nouvelle décision |
|---|---|
| G1 échoue (pas de pilote signé à J+90+45) | Arrêt de toute dépense de développement ; seuls la méthode et les documents sont maintenus |
| Le porteur ne livre pas le simulateur financier fin S2, ou la part de temps marché tombe sous 50 % deux semaines de suite | Confier le reste du MVP à un freelance (≈ 15 à 25 k€) et recentrer le porteur sur la vente |
| G3 franchie avec ≥ 20 k€ HT signés et des clients pressés | Passer au scénario central pour V1a (freelance) et gagner 1 à 2 mois |
| Prix de licence validés ≥ 2 000 € et ≥ 10 licences signées sur 12 mois | Le scénario central devient finançable : V1b complète en freelance |
| Une collectivité ou une agence finance un développement spécifique | Option (b) ou (c) sur son budget, avec maintien de la propriété du code par le studio (clause à négocier avec l'avocat) |
| Exigence client d'hébergement maîtrisé ou de localisation des données | Revue d'architecture : offre managée en région UE (à vérifier) ou auto-hébergement avec contrat de maintenance |
| Prix de licence acceptés seulement sous 1 000 € | Revoir le modèle : prestation plus formation plutôt que licence ; V1 non justifiée |

---

## 12. Limites de ce chiffrage et éléments à reconfirmer avant engagement

1. Pendant cette étude, l'environnement bloquait le chargement direct de la plupart des sites tiers. Seules les pages Anthropic (`platform.claude.com`, `claude.com`) ont été lues directement. Les autres prix proviennent d'extraits officiels indexés par un moteur de recherche (statut « Vérifié (R) ») et doivent être **relus sur la page** avant signature ou commande. Pour le faire depuis une session cloud, les domaines concernés doivent être autorisés dans les paramètres réseau de l'environnement : supabase.com, netlify.com, vercel.com, cloudflare.com, brevo.com, weezevent.com, billetweb.fr, inpi.fr, euipo.europa.eu, malt.fr, free-work.com, etc.
2. Le quota de recherche web a été épuisé avant d'avoir vérifié le TJM des graphistes et designers UX, les frais Stripe et le prix de GitHub Pro. Ces postes sont marqués « non vérifié ».
3. Tous les montants juridiques (avocat), d'identité visuelle, d'assurance et de test d'intrusion sont des **estimations** : obtenir 2 à 3 devis.
4. Toutes les charges en JH et tous les revenus sont des **hypothèses**. Les premières se recalent après le MVP (temps réellement passé), les secondes après les 15 entretiens et les premiers devis (G1, G3). Ce document se met à jour par nouvelle version, conformément à la règle de versionnement du projet.
