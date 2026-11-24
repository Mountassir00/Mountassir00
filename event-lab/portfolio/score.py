#!/usr/bin/env python3
"""EVENT LAB — notation du portefeuille (contrat : docs/07-algorithmes.md §1 et §7.1).

Usage : python3 score.py [dossier_concepts] [dossier_schemas]

Pour chaque concepts/*.json :
  1. valide le document contre schemas/event-config.schema.json (jsonschema, draft 2020-12) ;
  2. contrôle les notes (0–5, pas de 0,5, justification présente) ;
  3. calcule score, grade, confiance (§1.2–1.4) ;
  4. évalue les portes éliminatoires (§1.5) et le verdict ;
  5. calcule les gains potentiels par critère (§1.6) ;
  6. calcule un contrôle financier simplifié par scénario (§7.1) pour vérifier la cohérence
     de la note « viabilité économique » (le résultat n'est PAS écrit dans le concept) ;
  7. réécrit evaluation.gates.*.status et evaluation.computed dans le fichier ;
  8. écrit scores-summary.json et scores-table.md à côté du script.

Règle de stade pour la porte « conformité » : le portefeuille sert de porte d'entrée au
blueprint, on applique donc la règle « au stade blueprint » (§1.5) : un point obligatoire
encore « a_verifier » donne le statut a_verifier. Paramètre STAGE ci-dessous.
"""
import glob
import json
import os
import sys
from decimal import Decimal, ROUND_HALF_UP

HERE = os.path.dirname(os.path.abspath(__file__))
CONCEPTS_DIR = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "concepts")
SCHEMAS_DIR = sys.argv[2] if len(sys.argv) > 2 else "/home/user/Mountassir00/event-lab/schemas"

STAGE = "blueprint"  # [param] règle §1.5 appliquée au stade du portefeuille

WEIGHTS = {
    "originalite": 12,
    "experience_utilisateur": 15,
    "faisabilite_technique": 15,
    "viabilite_economique": 15,
    "potentiel_mediatique": 10,
    "reproductibilite": 10,
    "adaptabilite_lieux": 8,
    "accessibilite_inclusion": 5,
    "potentiel_commercial": 5,
    "responsabilite_environnementale": 5,
}
EVIDENCE = {"donnees_reelles": 1.0, "benchmark_source": 0.6, "jugement_expert": 0.3}
REALIZATION = {  # §7.1 [param]
    "prudent": {"secured": 1.0, "probable": 0.5, "hypothetical": 0.0},
    "central": {"secured": 1.0, "probable": 0.8, "hypothetical": 0.3},
    "ambitieux": {"secured": 1.0, "probable": 1.0, "hypothetical": 0.7},
}
DRIFT = {"prudent": 0.15, "central": 0.05, "ambitieux": 0.0}  # §7.1 [param]
SCENARIOS = ("prudent", "central", "ambitieux")


def half_up(x, nd=0):
    q = Decimal(1).scaleb(-nd)
    return float(Decimal(str(x)).quantize(q, rounding=ROUND_HALF_UP))


def grade_of(score):
    if score >= 80:
        return "A"
    if score >= 65:
        return "B"
    if score >= 50:
        return "C"
    return "D"


def build_validator():
    try:
        import jsonschema
        from referencing import Registry, Resource
    except ImportError:
        return None, "jsonschema/referencing indisponibles : contrôle manuel des champs requis"
    resources = []
    main = None
    for path in glob.glob(os.path.join(SCHEMAS_DIR, "*.schema.json")):
        with open(path, encoding="utf-8") as f:
            sch = json.load(f)
        resources.append((sch["$id"], Resource.from_contents(sch)))
        if path.endswith("event-config.schema.json"):
            main = sch
    registry = Registry().with_resources(resources)
    validator = jsonschema.Draft202012Validator(
        main, registry=registry, format_checker=jsonschema.FormatChecker()
    )
    return validator, "jsonschema %s (draft 2020-12, format_checker actif)" % _jsv()


def _jsv():
    try:
        from importlib.metadata import version
        return version("jsonschema")
    except Exception:
        return "?"


def manual_required_check(doc):
    errors = []
    for k in ["id", "version", "status", "identity", "format", "evaluation"]:
        if k not in doc:
            errors.append("champ requis manquant : %s" % k)
    return errors


def check_ratings(ratings):
    errors = []
    for crit in WEIGHTS:
        r = ratings.get(crit)
        if r is None:
            errors.append("critère manquant : %s" % crit)
            continue
        val = r.get("rating")
        if not isinstance(val, (int, float)) or val < 0 or val > 5 or (val * 2) != int(val * 2):
            errors.append("%s : note %r hors grille (0–5, pas 0,5)" % (crit, val))
        if not r.get("justification", "").strip():
            errors.append("%s : justification vide" % crit)
    return errors


def compute_gates(doc):
    risks = doc.get("risks", [])
    compliance = doc.get("compliance", [])
    # Sécurité
    sec_block = [r["id"] for r in risks
                 if r.get("category") in ("securite", "sante") and r.get("impact") == 5
                 and r.get("probability", 0) >= 3 and not r.get("prevention")]
    sec_watch = [r["id"] for r in risks
                 if r.get("category") in ("securite", "sante") and r.get("impact", 0) >= 4]
    securite = {
        "status": "bloquant" if sec_block else "ok",
        "notes": ("Risques bloquants : %s" % ", ".join(sec_block)) if sec_block else
                 "Aucun risque sécurité/santé d'impact 5 et de probabilité ≥ 3 sans prévention. "
                 "Risques sécurité/santé d'impact ≥ 4 suivis : %s. Le dimensionnement des secours "
                 "et de la jauge relève d'acteurs externes agréés." % (", ".join(sec_watch) or "aucun"),
    }
    # Conformité
    mand = [c for c in compliance if c.get("mandatory")]
    non_conf = [c["id"] for c in mand if c.get("status") == "non_conforme"]
    pending = [c["id"] for c in mand if c.get("status") in ("a_verifier", "en_cours")]
    if non_conf:
        conf_status = "bloquant"
        conf_notes = "Points obligatoires non conformes : %s" % ", ".join(non_conf)
    elif pending and STAGE in ("blueprint", "j-30"):
        conf_status = "a_verifier"
        conf_notes = ("%d point(s) obligatoire(s) à vérifier (%s) ; règle §1.5 appliquée au stade "
                      "blueprint, le portefeuille servant de porte d'entrée au blueprint."
                      % (len(pending), ", ".join(pending)))
    else:
        conf_status = "ok"
        conf_notes = "Aucun point obligatoire non conforme ou en attente."
    # Risques critiques
    crit_block = [r["id"] for r in risks if r.get("critical") and not r.get("continuity_plan")]
    crit_all = [r["id"] for r in risks if r.get("critical")]
    critiques = {
        "status": "bloquant" if crit_block else "ok",
        "notes": ("Risques critiques sans plan de continuité : %s" % ", ".join(crit_block)) if crit_block
                 else "Risques critiques identifiés (%s), tous dotés d'un plan de continuité."
                      % (", ".join(crit_all) or "aucun"),
    }
    return {"securite": securite, "conformite_reglementaire": {"status": conf_status, "notes": conf_notes},
            "risques_critiques": critiques}


def verdict_of(gates):
    statuses = [g["status"] for g in gates.values()]
    if "bloquant" in statuses:
        return "elimine"
    if "a_verifier" in statuses:
        return "sous_reserve"
    return "eligible"


def finance(doc, variant=None):
    """Contrôle financier simplifié §7.1 (sans trésorerie ni sensibilité)."""
    budget = doc.get("budget", {})
    expenses = [dict(e) for e in budget.get("expenses", [])]
    revenues = [dict(r) for r in budget.get("revenues", [])]
    if variant:
        ov = variant.get("expense_overrides", {}) or {}
        expenses = [dict(e, amount=ov[e["id"]]) if e["id"] in ov else e
                    for e in expenses if not (e["id"] in ov and ov[e["id"]] is None)]
        expenses += [dict(e) for e in variant.get("expense_additions", []) or []]
        rov = variant.get("revenue_overrides", {}) or {}
        revenues = [dict(r, unit_amount=rov[r["id"]]) if r["id"] in rov else r
                    for r in revenues if not (r["id"] in rov and rov[r["id"]] is None)]
        revenues += [dict(r) for r in variant.get("revenue_additions", []) or []]
    cont = budget.get("contingency_rate", 0.1)
    att = doc.get("audience", {}).get("attendance", {})
    share = doc.get("audience", {}).get("paying_share", 1.0)
    part = doc.get("participants", {}).get("count", {})
    out = {}
    for s in SCENARIOS:
        A = att.get(s, 0)
        P = part.get(s, 0)
        rev_total = 0.0
        secured = 0.0
        for r in revenues:
            m = r.get("margin_rate", 1.0)
            b = r["basis"]
            if b == "fixed":
                v = r["unit_amount"] * REALIZATION[s][r["certainty"]] * m
            elif b == "per_paying_attendee":
                v = r["unit_amount"] * A * share * m
            elif b == "per_attendee":
                v = r["unit_amount"] * A * m
            else:
                v = r["unit_amount"] * P * m
            rev_total += v
            if r["certainty"] == "secured":
                secured += v
        exp_total = 0.0
        for e in expenses:
            b = e["basis"]
            vol = 1 if b == "fixed" else (A if b == "per_attendee" else P)
            drift = 0 if e.get("certainty") == "devis" else DRIFT[s]
            exp_total += e["amount"] * vol * (1 + drift)
        exp_with_cont = exp_total * (1 + cont)
        res = rev_total - exp_with_cont
        out[s] = {
            "recettes": round(rev_total), "depenses_avec_contingence": round(exp_with_cont),
            "resultat": round(res),
            "resultat_pct_depenses": round(100 * res / exp_with_cont, 1) if exp_with_cont else None,
            "recettes_securisees": round(secured),
        }
    base = sum(e["amount"] for e in expenses if e["basis"] == "fixed")
    out["depenses_fixes_base"] = round(base)
    return out


def improvements(ratings):
    gains = []
    for crit, w in WEIGHTS.items():
        r = ratings[crit]["rating"]
        gains.append((crit, round(w * (5 - r) / 5, 2)))
    gains.sort(key=lambda x: -x[1])
    plus_one = sum(w * min(5, ratings[c]["rating"] + 1) / 5 for c, w in WEIGHTS.items())
    return gains[:3], half_up(plus_one)


def main():
    validator, vmode = build_validator()
    files = sorted(glob.glob(os.path.join(CONCEPTS_DIR, "*.json")))
    summary = {"validation": vmode, "stage_rule": STAGE, "concepts": []}
    ok_all = True
    for path in files:
        with open(path, encoding="utf-8") as f:
            doc = json.load(f)
        ev = doc["evaluation"]
        ratings = ev["ratings"]
        errs = check_ratings(ratings)
        # Calculs §1
        raw = sum(w * ratings[c]["rating"] / 5 for c, w in WEIGHTS.items())
        score = int(half_up(raw))
        conf = half_up(sum(w * EVIDENCE[ratings[c].get("evidence", "jugement_expert")]
                           for c, w in WEIGHTS.items()) / 100, 2)
        gates = compute_gates(doc)
        # Conserver les notes rédigées à la main en les préfixant aux notes calculées
        for g, val in gates.items():
            manual = (ev.get("gates", {}).get(g, {}) or {}).get("notes", "")
            manual = manual.split(" || calcul : ")[0].strip()
            if manual:
                val["notes"] = manual + " || calcul : " + val["notes"]
        ev["gates"] = gates
        verdict = verdict_of(gates)
        top3, plus1 = improvements(ratings)
        gains_all = {c: round(w * (5 - ratings[c]["rating"]) / 5, 2) for c, w in WEIGHTS.items()}
        ev["computed"] = {"score": score, "grade": grade_of(score), "confidence": conf, "verdict": verdict,
                          "gains": gains_all, "score_if_plus_one": plus1}
        # Validation schéma (après écriture des champs calculés)
        if validator is not None:
            errs += ["schéma : %s (à %s)" % (e.message, "/".join(map(str, e.absolute_path)))
                     for e in validator.iter_errors(doc)]
        else:
            errs += manual_required_check(doc)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(doc, f, ensure_ascii=False, indent=2)
            f.write("\n")
        fin = finance(doc)
        variants = {v["id"]: finance(doc, v) for v in doc.get("variants", [])}
        entry = {
            "id": doc["id"], "name": doc["identity"]["name"],
            "directions": doc["identity"]["directions"], "disciplines": doc["identity"]["disciplines"],
            "score_exact": round(raw, 2), "score": score, "grade": grade_of(score), "confidence": conf,
            "verdict": verdict, "gates": {k: v["status"] for k, v in gates.items()},
            "ratings": {c: ratings[c]["rating"] for c in WEIGHTS},
            "top3_gains": top3, "score_si_plus_1_partout": plus1,
            "finance_check": fin, "finance_variants": variants,
            "errors": errs,
        }
        if errs:
            ok_all = False
        summary["concepts"].append(entry)
    summary["concepts"].sort(key=lambda e: (-e["score_exact"], e["id"]))
    with open(os.path.join(HERE, "scores-summary.json"), "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
        f.write("\n")
    # Tableau markdown
    lines = ["| Rang | id | Nom | Directions | Discipline | Score | Grade | Confiance | Verdict |",
             "|---|---|---|---|---|---|---|---|---|"]
    for i, e in enumerate(summary["concepts"], 1):
        lines.append("| %d | `%s` | %s | %s | %s | %d (%.1f) | %s | %.2f | %s |" % (
            i, e["id"], e["name"], ", ".join(e["directions"]),
            ", ".join(e["disciplines"]) or "aucune (hors sport)",
            e["score"], e["score_exact"], e["grade"], e["confidence"], e["verdict"]))
    lines += ["", "| id | Résultat prudent | Résultat central | Résultat ambitieux | Dépenses fixes (base) |",
              "|---|---|---|---|---|"]
    for e in summary["concepts"]:
        f_ = e["finance_check"]
        lines.append("| `%s` | %+d € (%s %%) | %+d € (%s %%) | %+d € (%s %%) | %d € |" % (
            e["id"], f_["prudent"]["resultat"], f_["prudent"]["resultat_pct_depenses"],
            f_["central"]["resultat"], f_["central"]["resultat_pct_depenses"],
            f_["ambitieux"]["resultat"], f_["ambitieux"]["resultat_pct_depenses"],
            f_["depenses_fixes_base"]))
        for vid, vf in e["finance_variants"].items():
            lines.append("| `%s` [%s] | %+d € | %+d € | %+d € | %d € |" % (
                e["id"], vid, vf["prudent"]["resultat"], vf["central"]["resultat"],
                vf["ambitieux"]["resultat"], vf["depenses_fixes_base"]))
    with open(os.path.join(HERE, "scores-table.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    # Sortie console
    print("Validation :", vmode, "| règle de stade :", STAGE)
    for e in summary["concepts"]:
        print("%-16s score %3d (%.1f) %s conf %.2f %-12s gates %s | central %+d €%s" % (
            e["id"], e["score"], e["score_exact"], e["grade"], e["confidence"], e["verdict"],
            e["gates"], e["finance_check"]["central"]["resultat"],
            "" if not e["errors"] else "  ERREURS: " + " ; ".join(e["errors"][:5])))
    sys.exit(0 if ok_all else 1)


if __name__ == "__main__":
    main()
