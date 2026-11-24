# 11 — Fusion EVENT LAB × BASK'EST LAB et application v0.3

> Décisions du porteur (2026-11-24) : **un seul outil** ; prochaine étape **application v0.3** ; pilote terrain : **LA GRILLE 3x3 avec Bask'Est (Nancy)**.

## 1. Principe

| | Rôle dans l'outil unique |
|---|---|
| **EVENT LAB** | Produit et méthode : schémas multisectoriels (`event-lab/schemas`), moteur générique fondé sur `EventConfig` (notation, finance, compétition générique, flux, personnel, incidents, variantes, versions, générateur sur 70 briques), portefeuille multisectoriel, registre, veille, blueprints. |
| **BASK'EST LAB** | Verticale basket et **base applicative** : application React/TypeScript (Vite, Vitest), moteurs spécialisés basket (simulation par possessions, Monte-Carlo d'équité, programmation sous contraintes, salles 2D/3D, règles de conception), données Bask'Est. |

Le moteur générique d'EVENT LAB est **porté en TypeScript** dans le cœur de l'application (`baskest-lab/src/core/eventlab/`) : c'est la généralisation multisectorielle du cœur TypeScript. Les moteurs basket restent spécialisés et coexistent. Il n'y a plus qu'**une** implémentation de chaque moteur : la version JavaScript de `event-lab/app/engine/` est retirée, et les scripts d'EVENT LAB utilisent la version TypeScript.

## 2. Emplacement (v0.3)

- L'application reste dans `baskest-lab/` pour v0.3 (éviter un déplacement massif de fichiers sans valeur pour l'utilisateur). Son interface s'intitule **EVENT LAB**, avec deux espaces : *Basket — Bask'Est* (modules existants) et *Multisectoriel* (nouveaux modules).
- Les données d'EVENT LAB restent dans `event-lab/` (source unique) et sont importées par l'application.
- Renommage du dossier applicatif (`baskest-lab/` → `event-lab/app/`) : reporté, à décider quand la structure sera stabilisée.

## 3. Périmètre de v0.3

1. Moteur EVENT LAB porté en TypeScript + tests portés (Vitest), scripts EVENT LAB rebranchés (régénération du blueprint identique).
2. Modules multisectoriels : portefeuille (10 concepts), studio de configuration (variantes, scénarios, simulateurs et incidents en direct, versions locales immuables, diff), générateur sur 70 briques, bibliothèque de briques.
3. Unification : registre des erreurs (45 + 28, doublons fusionnés), catalogue de veille (50 + 70, doublons fusionnés).
4. Tableau de bord commun et statut réel de chaque module.
5. Démo en un fichier (publiable en page privée).

Hors périmètre v0.3 : backend, comptes, intégrations, collecte automatique de veille (v0.4), déplacement du dossier applicatif.

## 4. Critères d'acceptation

- `npx tsc --noEmit`, `npx vitest run` (31 tests existants + tests portés), `npx vite build` et `npm run build:demo` passent.
- `node scripts/validate.mjs` (ou son équivalent TypeScript) : 0 objet invalide.
- Le blueprint LA GRILLE régénéré est identique à la v0.2.0.
- Chaque nouveau module s'affiche sans erreur console, sans débordement horizontal à 400 px, en thème clair et sombre.
- Les chiffres affichés par le studio de configuration pour LA GRILLE égalent ceux du blueprint v0.2.0.
