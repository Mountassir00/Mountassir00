# Architecture UX/UI et wireframes

## Architecture de l'information

```
MOUNTASSIR AI GOVERNOR
├─ Vue (expérience active) ─────────── Control Center · Espace spatial · Kanban des tâches · AI Office · AI System Map · variantes
│   ├─ Inspecteur (tiroir) ─────────── agent · département · composant · flux · tâche
│   ├─ Décisions GO / NO GO / TEST ──── en attente · historique
│   └─ Chronologie & Replay ────────── direct · 1 h · 24 h · 7 j · 30 j · personnalisée
├─ Galerie ─────────────────────────── installer/activer/désactiver/dupliquer/masquer/favori/défaut/importer/exporter
├─ Studio ──────────────────────────── paramètres de vue · thème · aperçu · publier · variante · restaurer
├─ Créer (Builder) ─────────────────── références → analyse → catégorie A/B → variante ou brief
├─ Données ─────────────────────────── sources actives · import Claude Code · limites de visibilité
└─ Réglages ────────────────────────── thème · niveau de rendu · mouvements · vues par défaut · rôle · raccourcis
```

**Contexte persistant entre vues** : période, filtres (fournisseur, modèle, projet, département, agent, catégorie), sélection, position du replay, tiroir ouvert, décisions en attente.

## Wireframes

### 01 — Control Center
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Control Center                              ▣ Démo 100 %   ◌ Estimé  ○ Mesuré│
│ Période · 23 nov. 16:18 → 24 nov. 16:18 · 356 événements                     │
├───────────────────────────┬──────────┬──────────┬───────────┬────────────────┤
│ Tokens traités  1,5 M     │ Cache    │ Évités   │ Dépenses  │ Coût estimé    │  ← bande continue,
│ (héros)                   │ 652 k    │ 155 k    │ Indispo.  │ 3,30 $         │    nature sous
├──────────┬────────────────┼──────────┼──────────┼───────────┼────────────────┤    chaque chiffre
│ Écon.    │ Coûts évités   │ Qualité  │ Tâches   │ Erreurs   │ Quota          │
│ vérifiées│ estimés        │ 82 %     │ 41       │ 4         │ 62 %           │
│ Indispo. │                │          │          │           │                │
├──────────┴────────────────┴──────────┴──────────┼───────────┴────────────────┤
│ Consommation de tokens  [Tokens|Coût] [Tableau] │ Performance des modèles    │
│ ▁▃▅█▂  colonnes empilées entrée/sortie/cache    │ barres coût + latence/cache│
├──────────────────────────────┬──────────────────┴────────────────────────────┤
│ Avant / après optimisation    │ Tâches en cours, en attente, échecs           │
├──────────────┬───────────────┼───────────────┬───────────────────────────────┤
│ GO/NO GO/TEST│ Sécurité       │ Skills & conn. │                               │
├──────────────┴───────────────┴───────────────┴───────────────────────────────┤
│ Historique des modifications et interventions                                │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 02 — AI Office
```
┌ [Scène|Liste] [Légende] ─────────────────────────────────────── mini-carte ┐
│              Direction ◇ Executive Office  ◇ Evolution                       │
│        Optimisation ◇ Routing ◇ Tokens ◇ Context ◇ Finance                   │
│   Savoir-faire ◇ Skills ◇ Instructions ◇ Research ◇ Benchmark               │
│ Opérations ◇ Connectors ◇ Automation ◇ Archive    Contrôle ◇ Quality ◇ Secu │
│   pièces pastel · bureaux · personnages (LLM) · consoles (scripts)          │
│ [+][−][⤢]                                                     cartouche     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 03 — AI System Map
```
┌ Carte du système [ ] Mode technique ─────────────────────────── mini-carte ┐
│  Personnes → Agents IA → Services → Orchestration → Modèles → Fournisseurs │
│  aile arrière : outils, MCP, skills          aile avant : bases de données  │
│  ═══ flux actifs (bleu requête modèle, sarcelle outil, rouge erreur)       │
│  ┄┄┄ dépendances déclarées sans échange      ⬚ non observable              │
│ [+][−][⤢]   légende des liaisons                              cartouche     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 04–05 — Retirées en v0.4
AI Modular Office et le Journal opérationnel ont été retirés : seules les 5 vues en favori sont conservées (voir `AUDIT.md`, A13). L'Espace spatial et le Kanban des tâches sont montrés dans `SCREENS.md`.

### Mobile (390 px)
```
┌ ≡ [Vue ▾]  Démo  ⚲ ┐
│                     │
│   scène / liste     │   AI Office s'ouvre en mode adapté (2 colonnes,
│                     │   liste accessible) ; System Map en rangées verticales.
├ chronologie compacte┤
├ Vue Gal. Don. Rég. Déc.┤  navigation en bas · inspecteur en feuille glissante
└─────────────────────┘
```

## Interactions clés

| Besoin | Desktop | Tactile | Clavier |
|---|---|---|---|
| Changer de vue | sélecteur, galerie | menu « Toutes les vues » | `1`–`9` |
| Trouver un agent | recherche | recherche | `Ctrl+K`, `/` |
| Zoom / déplacement | molette, glisser, boutons | pincer, glisser | `+` `−` `0`, flèches |
| Inspecter | clic | appui | `Entrée` sur l'élément focalisé |
| Arbitrer | tiroir Décisions | feuille Décisions | `D` |
| Rejouer | clic sur la chronologie, ▶ | appui | flèches, `Espace`, `Fin` = direct |
| Présentation | bouton | — | `P`, `Échap` |
