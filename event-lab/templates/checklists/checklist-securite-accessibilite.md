# Checklist sécurité et accessibilité — prévisionnelle

> **CETTE CHECKLIST NE VAUT PAS VALIDATION.** Elle prépare le dossier. La validation de l'effectif admissible, de l'implantation, des dégagements, du dispositif de sécurité et de secours appartient à l'exploitant du lieu, au chargé de sécurité, aux prestataires et associations agréés, et aux autorités compétentes (mairie, préfecture, commission de sécurité). EVENT LAB ne calcule aucun dimensionnement de sécurité ou de secours.

<!--
MODÈLE — utilisé pour la section 32 du blueprint et pour renseigner compliance[] (item, authority, mandatory, status, deadline_offset_days, source_ref).
Format d'un point : - [ ] Action vérifiable — responsable (rôle) — preuve attendue — référence.
Règle : un seuil ou un délai légal n'est cité que s'il a été vérifié dans une source officielle datée (§N) ; sinon « à vérifier auprès de … ».
Les sources du §N ont été consultées le 2026-11-24 au moyen d'un moteur de recherche (extraits des pages officielles) ; les pages n'ont pas pu être ouvertes en entier depuis l'environnement de rédaction. RELIRE LE TEXTE EN VIGUEUR avant chaque usage et noter la date de consultation dans sources[].accessed_at.
Les règles varient selon la commune, le département, la fédération et le lieu : toujours confirmer auprès de l'autorité locale.
-->

| Élément | Valeur |
|---|---|
| Événement | |
| Version du blueprint | |
| Lieu | |
| Date de J | |
| Responsable de la checklist (rôle) | |
| Dernière mise à jour | |

## A. Lieu — données de l'exploitant

- [ ] Obtenir de l'exploitant le type et la catégorie ERP du lieu et l'effectif maximal autorisé, par écrit — directeur de projet — document de l'exploitant référencé dans `venue.erp.document_ref` — section 32.1
- [ ] Faire préciser ce que couvre l'effectif autorisé (public seul, ou public + personnel) — directeur de projet — réponse écrite — C4
- [ ] Vérifier que la présence simultanée maximale prévue (public + participants + personnel) reste inférieure à l'effectif autorisé dans les trois scénarios — directeur de projet — `sim.peak_presence` — C4
- [ ] Obtenir le plan d'évacuation, la position des issues de secours, des moyens de secours et des accès pompiers — régisseur général — plan de l'exploitant — section 21
- [ ] Obtenir les consignes de sécurité du lieu et le nom de la fonction responsable de la sécurité pendant l'événement — directeur de projet — consignes écrites
- [ ] Vérifier si l'événement constitue une utilisation du lieu différente de son exploitation habituelle (voir B6) — directeur de projet — réponse de l'exploitant
- [ ] Réaliser un état des lieux d'entrée contradictoire — régisseur général — état des lieux signé

## B. Démarches administratives à vérifier

<!-- Une ligne par démarche applicable → une entrée compliance[]. Colonne « Délai relevé » : délai lu dans la source citée à la date de consultation ; le délai à retenir est celui confirmé par l'autorité locale. -->

| N° | Démarche | S'applique si (à confirmer) | Autorité | Délai relevé dans la source | Source (§N) | Statut | Responsable | Preuve |
|---|---|---|---|---|---|---|---|---|
| B1 | Déclaration d'une manifestation sportive, récréative ou culturelle à but lucratif | Public + personnel prévisible > 1 500 personnes | Maire (Paris : préfet de police) | Entre un an et un mois avant | N2 | | | Récépissé |
| B2 | Déclaration ou autorisation d'une manifestation sportive sur la voie publique | Tout ou partie de l'épreuve sur la voie publique ou ouverte à la circulation | Maire (une commune ; Paris : préfet de police) ou préfet (plusieurs communes) | Course ou marche : 1 mois avant sans classement ; 2 mois avec chronométrage ou classement ; 3 mois sur plusieurs départements ; avis préalable de la fédération délégataire | N3 | | | Récépissé ou arrêté |
| B3 | Déclaration d'une manifestation sur la voie publique (cortège, défilé, rassemblement) | Rassemblement ou défilé sur la voie publique hors sorties conformes aux usages locaux | Mairie (Paris : préfecture de police) | 3 jours francs au moins, 15 jours francs au plus avant | N1 | | | Récépissé |
| B4 | Déclaration d'un rassemblement festif à caractère musical | Conditions cumulatives du texte, dont un effectif prévisible > 500 personnes | Préfet du département (Paris : préfet de police) | Au plus tard un mois avant (15 jours en cas d'engagement de bonnes pratiques) | N4 | | | Récépissé |
| B5 | Occupation temporaire du domaine public (place, rue, parc, parking public) | Installation sur l'espace public | Gestionnaire de la voie : commune, département ou État | À vérifier auprès du gestionnaire ; la fiche consultée indique une instruction de deux mois au plus, le silence valant refus | N10 | | | Permis de stationnement ou permission de voirie |
| B6 | Utilisation exceptionnelle d'un ERP (exploitation autre que celle autorisée, ou démonstration présentant des risques) | Activité différente de l'exploitation habituelle du lieu | Demande présentée par l'exploitant (conjointement avec l'organisateur s'il est distinct) ; destinataire à vérifier auprès de la mairie | Au moins deux mois avant, selon la version consultée de l'article GN 6 | N6 | | | Autorisation |
| B7 | Buvette temporaire tenue par une association | Vente de boissons au public | Maire de la commune | À vérifier localement (Paris : en ligne, au moins 3 mois avant) ; 5 autorisations par an et par association ; boissons des groupes 1 et 3 | N7 | | | Arrêté ou autorisation |
| B8 | Dérogation pour boissons alcooliques dans un établissement d'activités physiques et sportives | Buvette dans un stade, gymnase ou autre établissement sportif | Maire, par arrêté | Demande au plus tard 3 mois avant (15 jours pour une manifestation exceptionnelle) ; dérogation de 48 h au plus ; plafond annuel selon le demandeur | N8 | | | Arrêté de dérogation |
| B9 | Autorisation de diffusion d'œuvres musicales | Musique diffusée ou jouée en public | Sacem | Demande au moins 15 jours avant ; programme des œuvres dans les 10 jours après | N9 | | | Autorisation et facture |
| B10 | Assurance responsabilité civile de l'organisateur | Obligatoire pour les manifestations sportives ouvertes aux licenciés ; à souscrire dans tous les cas (vérifier avec l'assureur) | Assureur ; attestation à produire aux autorités qui instruisent B2 | Attestation au plus tard 6 jours avant pour les manifestations soumises à B2 | N5, N3 | | | Attestation d'assurance |
| B11 | Autorisation de la fédération délégataire | Manifestation ouverte aux licenciés d'une discipline délégataire et remise de prix > 3 000 € | Fédération délégataire | À vérifier auprès de la fédération | N11 | | | Autorisation de la fédération |
| B12 | Conditions médicales de participation | Compétition ouverte à des non-licenciés | Règlement de la fédération concernée | À vérifier : selon la fédération, certificat médical pour les majeurs non licenciés ; questionnaire de santé pour les mineurs | N12 | | | Règlement publié |
| B13 | Dispositif prévisionnel de secours | Rassemblement de personnes | Association agréée de sécurité civile ; autorité de police | À vérifier auprès de l'association et de la mairie | N13 | | | Convention + grille cosignée |

Démarches dont les règles n'ont pas été vérifiées pour ce modèle : voir §O.

## C. Dispositif prévisionnel de secours (DPS)

- [ ] Déclarer l'effectif prévisible du public (l'organisateur en est responsable) — directeur de projet — valeur écrite et justifiée (scénario retenu) — N13
- [ ] Contacter une association agréée de sécurité civile titulaire de l'agrément adapté et lui transmettre programme, plans, effectifs et activités — responsable sécurité — courriel daté — N13
- [ ] Faire établir par l'association la grille d'évaluation des risques et le dimensionnement ; la cosigner — responsable sécurité — grille cosignée — N13
- [ ] Ne reporter dans le blueprint que le dimensionnement fourni par l'association (aucun calcul EVENT LAB) — rédacteur — section 32.4
- [ ] Prévoir l'emplacement du poste de secours (espace `secours`), son accès pour les véhicules de secours et son alimentation — régisseur général — plan section 21
- [ ] Signer la convention avec l'association et l'inscrire au budget (D-11) — trésorier — convention signée — section 28
- [ ] Définir la procédure d'alerte des secours publics et la diffuser aux responsables — responsable sécurité — fiche réflexe

## D. Incendie, évacuation, implantation

- [ ] Faire valider le plan d'implantation par l'exploitant et, le cas échéant, par le chargé de sécurité — directeur de projet — plan visé — section 21
- [ ] Vérifier qu'aucun élément (stand, décor, câble, file d'attente) n'obstrue une issue, un dégagement ou un moyen de secours — régisseur général — contrôle signé à J-1 et à l'ouverture
- [ ] Demander à l'exploitant les exigences de réaction au feu applicables aux décors et matériaux apportés, et réunir les justificatifs des fournisseurs — régisseur général — procès-verbaux ou attestations — section 20
- [ ] Vérifier avec l'exploitant les règles applicables aux structures provisoires (tribunes, chapiteaux, podiums, ponts lumière) — à vérifier auprès de l'exploitant et de la mairie — régisseur général
- [ ] Désigner et briefer les personnes chargées de l'évacuation de chaque zone — responsable sécurité — liste et émargement

## E. Jauge et flux

- [ ] Plafonner la billetterie et les inscriptions sous l'effectif autorisé, personnel compris si le document de l'exploitant l'inclut — responsable billetterie — paramétrage de la billetterie — C4
- [ ] Prévoir un comptage des entrées et sorties en temps réel — responsable accueil — outil de comptage
- [ ] Ouvrir au moins `sim.flow.lanes_required` files de contrôle à l'ouverture (dimensionnement indicatif, non réglementaire) — responsable accueil — conducteur — section 14
- [ ] Délimiter les files d'attente hors des dégagements et de la voie publique non autorisée — régisseur général — plan
- [ ] Définir avec l'exploitant la procédure de fermeture des entrées lorsque la jauge est atteinte — directeur de projet — procédure écrite — RSK-08

## F. Sûreté et contrôle d'accès

- [ ] Définir le niveau de contrôle d'accès (billet seul, billet et sacs) avec l'exploitant — directeur de projet — consigne écrite
- [ ] Si des agents de sécurité privée sont employés : vérifier les obligations applicables au prestataire et à ses agents — à vérifier auprès du CNAPS et du prestataire — directeur de projet
- [ ] Si un service d'ordre est requis (B1) : décrire son organisation dans la déclaration — directeur de projet — déclaration — N2
- [ ] Prévoir un point de rendez-vous pour personnes égarées et la procédure associée — responsable accueil — RSK-16

## G. Sécurité des participants

- [ ] Publier les conditions médicales de participation conformes au règlement de la fédération concernée — responsable compétition — règlement — B12, N12
- [ ] Vérifier l'état et la conformité du matériel de compétition et des surfaces de jeu avant chaque phase — responsable compétition — contrôle signé
- [ ] Prévoir eau, ombre ou zones tempérées et temps de récupération entre les passages — responsable compétition — conducteur
- [ ] Recueillir l'autorisation des responsables légaux pour les participants mineurs — à vérifier auprès de la fédération et de l'assureur pour le contenu exact — responsable compétition
- [ ] Vérifier que l'assurance couvre les participants et les bénévoles — directeur de projet — attestation — B10, N5

## H. Alimentation et boissons

- [ ] Obtenir les autorisations B7 et, en enceinte sportive, B8 avant toute vente de boissons alcooliques — directeur de projet — arrêtés — N7, N8
- [ ] Vérifier les règles d'hygiène applicables à la vente de denrées et l'éventuelle déclaration — à vérifier auprès de la direction départementale chargée de la protection des populations — responsable buvette
- [ ] Afficher les boissons proposées et les prix ; prévoir des boissons sans alcool — responsable buvette
- [ ] Vérifier les éventuelles obligations déclaratives liées aux recettes de buvette — à vérifier auprès du service des impôts de la structure — trésorier

## I. Électricité, technique, structures

- [ ] Comparer la puissance appelée (`sim.power_kw_total`) à la puissance disponible déclarée par l'exploitant — régisseur général — C8, section 23
- [ ] Faire vérifier les installations électriques provisoires par une personne compétente — à vérifier auprès de l'exploitant pour les exigences exactes — régisseur général
- [ ] Protéger et baliser les câbles au sol dans les zones de passage — régisseur général — contrôle à J-1
- [ ] Respecter les limites sonores du lieu et de la commune — à vérifier auprès de l'exploitant et de la mairie — régisseur son — `venue.constraints.noise_limits`
- [ ] Prises de vue par drone : à vérifier auprès de la Direction générale de l'aviation civile avant toute utilisation — chargé de communication

## J. Météo (lieux extérieurs ou mixtes)

- [ ] Écrire le critère de bascule en configuration de secours et le critère d'annulation — directeur de projet — décision dans `history[].decisions` — RSK-06
- [ ] Consulter les bulletins météo à J-3, J-1 et J et consigner la décision — directeur de projet — journal de décision
- [ ] Prévoir lestage ou démontage des structures sensibles au vent selon les consignes des fournisseurs — régisseur général — consignes fournisseurs

## K. Accessibilité

- [ ] Obtenir de l'exploitant le registre public d'accessibilité du lieu — directeur de projet — registre — N14
- [ ] Vérifier un cheminement accessible depuis le stationnement ou le transport public jusqu'à chaque espace ouvert au public — responsable accueil — plan annoté — section 21
- [ ] Vérifier que les installations temporaires (podiums, stands, files, câbles) ne rompent pas ce cheminement — régisseur général — contrôle J-1
- [ ] Réserver des places accessibles en tribune ou en zone de spectacle, avec visibilité, et des places pour accompagnants — responsable accueil — plan
- [ ] Vérifier le nombre et l'accessibilité des sanitaires (`venue.utilities.toilets_pmr`) et leur signalisation — régisseur général
- [ ] Rendre l'information accessible : programme et règles en langage simple, gros caractères, pictogrammes, sous-titrage des vidéos — chargé de communication — supports
- [ ] Indiquer sur la billetterie un contact pour les besoins spécifiques et les modalités d'accueil — responsable billetterie
- [ ] Former les bénévoles d'accueil à l'accueil des personnes handicapées — coordinateur bénévoles — émargement
- [ ] Prévoir une zone calme pour les personnes sensibles au bruit ou à la foule — régisseur général — plan
- [ ] Concevoir la participation inclusive dans le format (catégories, règles adaptées, accompagnement) — responsable compétition — section 12

## L. Alerte et communication de crise

- [ ] Établir la liste des contacts d'urgence (exploitant, association de secours, mairie, référent sécurité) — annexe à diffusion restreinte — directeur de projet
- [ ] Définir qui décide d'une interruption, d'une évacuation ou d'une annulation, et son suppléant — directeur de projet — fiches réflexes section 34
- [ ] Préparer les messages types (sonorisation, écrans, réseaux sociaux) — chargé de communication — fiches réflexes
- [ ] Vérifier le fonctionnement des moyens de communication internes (radios, téléphones) à J-1 — régisseur général

## M. Visas

| Rôle | Nom | Date | Visa |
|---|---|---|---|
| Organisateur (directeur de projet) | | | |
| Exploitant du lieu | | | |
| Chargé de sécurité | | | |
| Association de secours | | | |

## N. Sources officielles consultées

Consultées le 2026-11-24 par moteur de recherche (extraits) ; pages complètes non ouvertes depuis l'environnement de rédaction. Relire le texte en vigueur avant usage.

| Réf. | Sujet | Ce qui a été relevé | Source |
|---|---|---|---|
| N1 | Manifestations sur la voie publique | Déclaration en mairie (Paris : préfecture de police) 3 jours francs au moins et 15 jours francs au plus avant ; récépissé ; dispense pour les sorties conformes aux usages locaux (Code de la sécurité intérieure, art. L211-1 à L211-4) | https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000025503132/LEGISCTA000025505131/ · https://www.service-public.gouv.fr/particuliers/vosdroits/F21899 |
| N2 | Manifestations sportives, récréatives ou culturelles à but lucratif | Déclaration au maire (Paris : préfet de police) lorsque public et personnel prévisibles dépassent 1 500 personnes ; dépôt entre un an et un mois avant ; description du service d'ordre ; l'autorité peut imposer un service d'ordre ou son renforcement (CSI, art. R211-22 à R211-26) | https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000025503132/LEGISCTA000028285073/ |
| N3 | Manifestations sportives sur la voie publique | Démarche en ligne ; course ou marche : déclaration si chronométrage ou classement, ou plus de 100 participants ; avis préalable de la fédération délégataire (réponse sous un mois) ; dossier 1 mois avant (sans classement), 2 mois (chronométrée ou classée), 3 mois (plusieurs départements) ; maire si une commune, préfet si plusieurs ; attestation d'assurance au plus tard six jours avant (Code du sport, art. R331-6 et suivants) | https://www.service-public.gouv.fr/particuliers/vosdroits/R70556 · https://www.service-public.gouv.fr/particuliers/vosdroits/F34326 · https://www.legifrance.gouv.fr/codes/id/LEGISCTA000025450711 · https://www.sports.gouv.fr/organiser-une-manifestation-sportive-1243 |
| N4 | Rassemblements festifs à caractère musical | Déclaration au préfet lorsque l'effectif prévisible dépasse 500 personnes et que les autres conditions cumulatives du texte sont réunies ; au plus tard un mois avant, 15 jours en cas d'engagement de bonnes pratiques (CSI, art. R211-2 et suivants) | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000028285031 · https://www.legifrance.gouv.fr/codes/id/LEGISCTA000028287385 |
| N5 | Assurance de l'organisateur de manifestations sportives | Manifestations ouvertes aux licenciés : garanties couvrant la responsabilité civile de l'organisateur, des personnes qui prêtent leur concours et des participants (Code du sport, art. L331-9) ; défaut d'assurance pénalement sanctionné (art. L331-12) | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006547714 · https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006547718 · https://www.sports.gouv.fr/sites/default/files/2023-02/-organiser-une-manifestation-t-l-charger-ici-la-fiche-de-synth-se-des-obligations-de-l-organisateurs-de-manifestations-sportives--3915.pdf |
| N6 | Utilisation exceptionnelle d'un ERP | Demande de l'exploitant, conjointe avec l'utilisateur occasionnel s'il est distinct ; au moins deux mois avant selon la version en vigueur relevée (modifiée par arrêté du 30 octobre 2023) ; une version antérieure prévoyait quinze jours (arrêté du 25 juin 1980, art. GN 6) | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000020303862 |
| N7 | Buvette temporaire d'une association | Autorisation du maire ; boissons des groupes 1 et 3 ; 5 autorisations par an au maximum ; à Paris, demande en ligne au moins 3 mois avant | https://www.service-public.gouv.fr/particuliers/vosdroits/F24345 · https://www.service-public.gouv.fr/demarches-silence-vaut-accord/demarches/1495 |
| N8 | Boissons dans les établissements sportifs | Vente et distribution des boissons des groupes 3 à 5 interdites dans les établissements d'activités physiques et sportives ; dérogations temporaires du maire de 48 h au plus, dans la limite de 10 par an pour les associations sportives agréées et de 4 pour les organisateurs de manifestations touristiques ; demande au plus tard 3 mois avant, 15 jours pour une manifestation exceptionnelle (Code de la santé publique, art. L3335-4 et D3335-15-1 et suivants). Les versions successives du texte diffèrent : relire la version en vigueur | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000039650350 · https://www.legifrance.gouv.fr/codes/id/LEGISCTA000039650348 |
| N9 | Droits musicaux | Autorisation de la Sacem et paiement des droits pour toute diffusion publique ; demande au moins 15 jours avant (réduction indiquée) ; programme des œuvres à remettre dans les 10 jours suivant la manifestation. Site sacem.fr non accessible depuis l'environnement de rédaction : tarifs et formulaires à vérifier sur sacem.fr | https://www.service-public.gouv.fr/particuliers/vosdroits/F31621 · https://associations.gouv.fr/la-sacem-et-la-diffusion-doeuvres-musicales |
| N10 | Occupation du domaine public | Permis de stationnement (sans emprise au sol) ou permission de voirie (avec emprise) ; interlocuteur selon la voie (commune, département, État) ; instruction de deux mois au plus, silence valant refus selon la fiche ; redevance possible ; modèle de lettre pour une association | https://entreprendre.service-public.gouv.fr/vosdroits/F23509 · https://www.service-public.gouv.fr/particuliers/vosdroits/R2237 · https://www.service-public.gouv.fr/particuliers/vosdroits/F31613 |
| N11 | Autorisation de la fédération délégataire | Manifestation ouverte aux licenciés d'une discipline délégataire avec remise de prix supérieure à 3 000 € : autorisation de la fédération délégataire (Code du sport, art. L331-5 et A331-1) | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000025276085 · https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018760696 |
| N12 | Conditions médicales | Depuis la loi n° 2022-296 : pour un majeur non licencié, l'inscription à une compétition peut être subordonnée à un certificat médical selon les règles de la fédération ; pour un mineur non licencié, questionnaire de santé (Code du sport, art. L231-2-1) | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000045293843 · https://www.sports.gouv.fr/le-certificat-medical-pour-le-sport-676 |
| N13 | Dispositifs prévisionnels de secours | Référentiel national fixé par arrêté du 7 novembre 2006 ; DPS mis en place par des associations agréées de sécurité civile (agrément « D », arrêté du 27 février 2017) ; grille d'évaluation des risques fondée notamment sur l'effectif déclaré par l'organisateur sous sa responsabilité, cosignée par l'organisateur et l'association ; niveaux : point d'alerte et de premiers secours, DPS de petite, moyenne et grande envergure | https://www.legifrance.gouv.fr/affichTexte.do?cidTexte=JORFTEXT000000640977 · https://www.interieur.gouv.fr/content/download/94241/736020/file/RNMSC%202006_10%20-%20DPS.pdf · https://www.legifrance.gouv.fr/loda/id/JORFTEXT000034097500/2021-02-13 |
| N14 | ERP : classement et accessibilité | Catégories : 1re au-delà de 1 500 personnes, 2e de 701 à 1 500, 3e de 301 à 700 ; seuils des 4e et 5e catégories à vérifier (la 5e dépend du type d'établissement) ; accessibilité exigée pour tous les types de handicap ; registre public d'accessibilité tenu par l'exploitant | https://entreprendre.service-public.gouv.fr/vosdroits/F32351 · https://entreprendre.service-public.gouv.fr/vosdroits/F31684 · https://entreprendre.service-public.gouv.fr/vosdroits/F32873 · https://www.ecologie.gouv.fr/politiques-publiques/laccessibilite-etablissements-recevant-du-public-erp |

## O. Points non vérifiés pour ce modèle (à vérifier auprès de …)

| Sujet | À vérifier auprès de |
|---|---|
| Seuils des 4e et 5e catégories ERP et règles propres au type du lieu | Exploitant, mairie, service départemental d'incendie et de secours |
| Structures provisoires (tribunes démontables, chapiteaux, podiums) | Exploitant, mairie, commission de sécurité |
| Obligations des agents de sécurité privée | CNAPS, prestataire |
| Hygiène et déclaration pour la vente de denrées | Direction départementale chargée de la protection des populations |
| Obligations fiscales ou déclaratives liées à la buvette | Service des impôts de la structure organisatrice |
| Droits sur la musique enregistrée autres que les droits d'auteur | Sacem |
| Droit à l'image, collecte de données personnelles des participants et des publics | CNIL, conseil juridique |
| Autorisation parentale et conditions d'accueil des mineurs | Fédération concernée, assureur |
| Prises de vue par drone | Direction générale de l'aviation civile |
| Niveaux sonores autorisés | Exploitant, mairie |
| Couverture d'assurance des bénévoles hors manifestation sportive ouverte aux licenciés | Assureur |
| Tombola, loterie ou jeu concours associé à l'événement | Service-public.fr, conseil juridique |
