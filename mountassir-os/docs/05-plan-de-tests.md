# 05 — Plan de tests et couverture des scénarios critiques

Lancement : `python -m pytest -q`. **État au 2026-11-24 : 41 tests, 41 réussis** (Python 3.13, SQLite 3.53,
SDK `mcp` 2.3.0).

Ce que couvrent les tests :
- la bibliothèque, en direct ;
- la passerelle, via un vrai client MCP en mémoire ;
- le chemin de déploiement réel : la CLI en sous-processus et le serveur MCP lancé en **stdio** comme le fait
  Claude Desktop.

Ce qui n'est **pas** testé :
- des exports réels ChatGPT ou Claude. Seules des fixtures synthétiques, construites d'après les formats
  communautaires (doc 04 §D), ont servi ;
- macOS et Windows ;
- la tenue en charge au-delà de quelques centaines d'éléments.

## 1. Critères MVP 1 (spec §126)

| Critère | Test(s) | État |
|---|---|---|
| Information importée depuis une IA, enregistrée | `test_1_ai_import_is_stored_with_authorship`, `test_1b_…incremental`, `test_1c_split_chatgpt_export…` | ✅ |
| Provenance conservée | `test_2_provenance_is_preserved` | ✅ |
| Une seconde IA autorisée la retrouve | `test_3_second_authorized_ai_can_retrieve`, `test_two_ais_share_memory_through_mcp` | ✅ |
| Une IA non autorisée ne peut pas | `test_4_unauthorized_ai_cannot_read`, `test_invalid_token_and_live_revocation_over_mcp` | ✅ |
| Correction | `test_5_correction_is_versioned` | ✅ |
| Suppression | `test_6_deletion_and_7_derived_data`, avec vérification d'**absence physique** dans le fichier et le WAL | ✅ |
| Données dérivées traitées | idem + `test_7b_deleting_a_source_cascades…` | ✅ |
| Accès journalisés | `test_8_accesses_are_logged_without_content`, `test_8b_audit_tampering_is_detected` | ✅ |
| Export | `test_9_export_open_formats` | ✅ |
| Restauration d'une sauvegarde | `test_10_backup_restore_carries_forward…` (mauvaise phrase de passe, falsification, report des suppressions et révocations), `test_cli_full_cycle` | ✅ |

## 2. Scénarios critiques (spec §106)

| # | Scénario | Couverture | Test / justification |
|---|---|---|---|
| 1 | Un inconnu demande l'adresse personnelle | ⏳ Phase 6 | Représentant non construit. Base déjà là : C3 par défaut, invisible pour un agent C2 (`test_4`) |
| 2 | Un ami demande des infos médicales | 🟡 | plancher C4 santé (`test_no_write_down…`). Le canal ami et Représentant arrive en Phase 6 |
| 3 | Un collaborateur demande les finances d'une autre structure | ⏳ Phase 7 | séparation par structure non construite |
| 4 | Quelqu'un prétend être moi | ✅ | `test_s04_someone_claiming_to_be_the_owner…` |
| 5 | Injection de prompt dans un document | ✅ | `test_s05_…quarantined`, `test_s05b_…refused` |
| 6 | Deux sources se contredisent | ✅ | `test_s06_contradicting_values…` |
| 7 | Le représentant ignore mon opinion | 🟡 | séparation épistémique (`test_s07_and_19`). Refus d'attribuer une opinion : Phase 6 |
| 8 | Engagement contractuel | ⏳ Phase 6 | — |
| 9 | Supprimer une information | ✅ | `test_6_…`, `test_s20_…` |
| 10 | Fournisseur d'IA indisponible | ✅ par conception | CORE n'appelle aucun LLM. Tous les tests passent sans réseau |
| 11 | Recommandation comportementale inadaptée | ⏳ Phase 4 | — |
| 12 | Divulgation cumulative | 🟡 | quotas et plafond de résultats (`test_s14`, `test_s14b`). Analyse d'historique : Phase 6 |
| 13 | IA non autorisée tente d'accéder à CORE | ✅ | `test_4_…`, `test_invalid_token…over_mcp` |
| 14 | Agent dépasse son budget | ✅ (quota de requêtes) | `test_s14_…`. Budget monétaire : CORE ne consomme pas de tokens |
| 15 | Agent tente de modifier ses permissions | ✅ | `test_s15_…` (principal forgé compris) |
| 16 | Automatisation interrompue | ✅ (import) | `test_s16_interrupted_import_resumes…` |
| 17 | Prédiction émotionnelle incorrecte | ⏳ Phase 4/10 | — |
| 18 | Info de tiers attribuée à moi | ✅ | `test_s18_…`, `test_1_…` (réponse d'IA ≠ propriétaire) |
| 19 | Aspiration confondue avec un trait | ✅ | `test_s07_and_19_…` |
| 20 | Donnée supprimée restée dans l'index vectoriel | ✅ | `test_s20_…` |
| 21 | Connecteur révoqué | ✅ | `test_s21_…`, `test_s21b_…purging`, révocation en cours de session MCP |
| 22 | Réponse contenant indirectement une info privée | 🟡 | secrets jamais stockés (`test_s22`), pas d'écriture descendante, paquets revérifiés en direct (`test_reclassification…`) |
| 23 | Approbation ancienne réutilisée | 🟡 | approbation de candidat liée à un identifiant et à une version. Approval Center : Phase 3 |
| 24 | Restaurer une sauvegarde | ✅ | `test_10_…`, `test_cli_full_cycle` |
| 25 | Nouveau fournisseur de LLM | ✅ par conception | contrat MCP générique, testé avec un client MCP standard en stdio (`test_mcp_over_real_stdio`) |

**Bilan** : 15 ✅, 5 🟡, 5 ⏳.

Règle (spec §106) : **aucune autonomie supérieure au niveau 2 ne sera activée** tant que les scénarios
⏳ et 🟡 correspondants ne sont pas ✅.

## 3. Tests complémentaires (au-delà de la spec)

- Pas d'écriture descendante et héritage des classifications ; emotional → C4 ; sujets sensibles → C4.
- Un agent ne peut pas affirmer de `verified_fact`.
- Une répétition par une IA ne devient pas un fait ; un contenu rejeté n'est pas reproposable.
- Arrêt d'urgence et pause d'apprentissage ; la suppression reste possible quand les écritures sont gelées.
- Les paquets de contexte sont revérifiés à chaque lecture (reclassification), expirent et restent liés à
  leur agent.
- Les mémoires expirées sont masquées aux agents.
- C5 n'est jamais accordable ; C4 exige un accord explicite.

## 4. À ajouter avant usage réel

1. Un **test sur vos vrais exports** ChatGPT et Claude, en local, sans les commiter.
   - Critère : 0 erreur de parseur, et ratio de messages propriétaire / IA cohérent avec l'historique.
2. Des tests **macOS** (votre machine) et un test de performance à 10 000 conversations.
   - Objectif : recherche en moins de 300 ms.
3. Pour la Phase 2 : tests OAuth, TLS et transport HTTP, plus un test d'intrusion de l'endpoint public
   avant toute exposition.
