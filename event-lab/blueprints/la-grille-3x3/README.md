# EVENT BLUEPRINT — LA GRILLE 3x3 (v0.2.0, brouillon)

Tournoi de basket 3x3 amateur d'une journée : le matin, des qualifications chronométrées en trois manches éliminatoires produisent une grille de départ ; la grille fixe les têtes de série des poules de l'après-midi.

**Verdict EVENT LAB : 62/100 (C), sous réserve** (points réglementaires à vérifier). Recommandation : première édition en configuration économique uniquement, confirmée au go/no-go de J-60 si son scénario prudent revient à l'équilibre grâce à des recettes signées ; sinon report.

> Implantations, jauges et dispositifs de sécurité : aides à la décision, **non validées réglementairement**. Les montants sont des estimations et hypothèses à remplacer par des devis. Les sources réglementaires ont été vérifiées par moteur de recherche, sans lecture intégrale des textes : à relire avant usage.

## Fichiers

| Fichier | Rôle |
|---|---|
| `event.json` | **Source de vérité** : format, programme minute par minute, compétition, ressources, budget, recettes, variantes (économique, premium, secours), risques, conformité, KPIs, jalons, sources, historique |
| `narrative.md` | Textes rédigés des 40 sections, avec marqueurs `<!-- @gen:… -->` et `{{summary.…}}` |
| `BLUEPRINT.md` | Dossier assemblé (généré — ne pas éditer) |
| `generated/` | Tableaux générés par le moteur, `summary.json`, CSV (budget, recettes, conducteur, rétroplanning, risques, conformité, RH, matériel) |
| `exports/BLUEPRINT.pdf`, `.docx` | Dossier complet (117 pages) |
| `exports/*.xlsx` | Modèle financier **à formules** (paramètres modifiables) + tableaux opérationnels ; feuille « Contrôle » = écart avec le moteur |
| `exports/*-dossier-partenaires-*.pptx` | Dossier de sponsoring 16:9 |
| `assets/identite/` | Logos (5 déclinaisons), moodboard, palette et typographies, signalétique, maquettes digitales (SVG) |
| `assets/plans/` | Plans d'implantation (standard, économique, premium, capacité max, secours), circulation, parcours de qualification ; `generer-plans.mjs` les régénère depuis `event.json` |
| `annexes/` | Fiches de poste, checklist du jour J, fiche technique du parcours de qualification |
| `sources/` | Sources citées par chaque partie rédigée (fusionnées dans `event.json → sources`) |

## Régénérer

Depuis `event-lab/` :

```bash
node scripts/build-blueprint.mjs blueprints/la-grille-3x3      # tableaux + BLUEPRINT.md
node blueprints/la-grille-3x3/assets/plans/generer-plans.mjs   # plans SVG
python3 scripts/export_xlsx.py blueprints/la-grille-3x3        # XLSX
node scripts/svg2png.mjs blueprints/la-grille-3x3/assets/identite/logo-inverse.svg blueprints/la-grille-3x3/assets/identite/logo-inverse.png 1200
python3 scripts/export_pptx.py blueprints/la-grille-3x3 --logo blueprints/la-grille-3x3/assets/identite/logo-inverse.png
node scripts/export-docs.mjs blueprints/la-grille-3x3/BLUEPRINT.md --title "EVENT BLUEPRINT — LA GRILLE 3x3"
```

Toute modification passe par `event.json` (chiffres) ou `narrative.md` (textes), puis régénération. Une version validée ne se modifie pas : créer une nouvelle version (voir `docs/02` §5).
