# EVENT LAB — Journal des modifications

Toutes les évolutions du projet sont consignées ici **avant** de passer à la version suivante.
Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) ; numérotation [SemVer](https://semver.org/lang/fr/) (`MAJEUR.MINEUR.CORRECTIF`).

## Règle de versionnement (demandée par le porteur du projet)

1. Chaque version est documentée ici (ajouts, modifications, décisions, statut réel des fonctionnalités).
2. Le contenu est commité, puis **figé** dans une archive zip `event-lab/archives/event-lab-vX.Y.Z.zip` (empreinte SHA-256 dans `archives/SHA256SUMS`).
3. Un tag git annoté `vX.Y.Z` pointe sur la version figée.
4. Seulement ensuite, le travail de la version suivante commence.
5. Une version publiée n'est jamais modifiée : toute correction crée une nouvelle version.

Procédure automatisée : `event-lab/scripts/release.sh X.Y.Z "Titre"` (refuse de versionner si l'entrée du journal manque).

Légende des statuts de fonctionnalités :
- **Opérationnel** : fonctionne réellement dans l'environnement actuel.
- **Simulé** : logique réelle, mais données ou intégrations de démonstration.
- **Externe requis** : nécessite une intégration, un compte ou un service tiers non branché.

## Registre des versions

| Version | Date | Titre | Archive |
|---|---|---|---|
| 0.0.0 | 2026-11-24 | Socle de versionnement | `archives/event-lab-v0.0.0.zip` |

---

## [0.0.0] — 2026-11-24 — Socle de versionnement

### État de départ
- Dépôt `Mountassir00/Mountassir00` : uniquement le `README.md` du profil GitHub (non modifié).
- Le projet est isolé dans le dossier `event-lab/` pour ne pas toucher au profil et pouvoir être déplacé tel quel vers un dépôt privé.

### Ajouté
- `CHANGELOG.md` (ce journal) et la règle de versionnement.
- `scripts/release.sh` : commit → archive zip → empreinte SHA-256 → tag annoté → push, avec garde-fous (entrée de journal obligatoire, tag et archive non réécrivables).
- Arborescence vide : `docs/`, `schemas/`, `knowledge/`, `portfolio/`, `blueprints/`, `app/`, `archives/`.

### Décisions et hypothèses de travail (validées par « FONCE »)
- **H1 — Positionnement** : EVENT LAB est un *studio de formats événementiels* utilisé d'abord en interne, puis commercialisé sous licence.
- **H2 — Premier blueprint** : format sportif amateur urbain, ville française moyenne, lieu existant, budget 10–30 k€.
- **H3 — Technique MVP** : documentation + application web statique sans serveur ; veille réalisée par des tâches planifiées plutôt que par un moteur de collecte développé.

### Risque signalé
- Le dépôt de profil est **public** : concepts, modèle économique et blueprints y sont visibles. Recommandation : migrer `event-lab/` vers un dépôt privé avant toute diffusion commerciale.
